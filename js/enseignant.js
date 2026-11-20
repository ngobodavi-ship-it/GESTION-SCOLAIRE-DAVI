// ===== Espace enseignant : profil + saisie devoirs/compositions =====
const E_ELEVES = 'ecole_eleves', E_CLASSES = 'ecole_classes', E_MATIERES = 'ecole_matieres';
const E_ENSEIGNANTS = 'ecole_enseignants', E_NOTES = 'ecole_notes', E_HISTO = 'ecole_notes_historique';
const E_TRIMS = ['1er Trimestre', '2e Trimestre', '3e Trimestre'];
const E_EDT = 'ecole_edt';
const EDT_JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const EDT_CRENEAUX = ['07h-08h', '08h-09h', '09h-10h', '10h15-11h15', '11h15-12h15', '15h-16h', '16h-17h'];

let ensEleves = [], ensClasses = [], ensMatieres = [], ensList = [], ensNotes = {}, ensHisto = [];
let teacher = null;

function enEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function enAttr(s) { return enEsc(s).replace(/"/g, '&quot;'); }
function logout() { window.location.href = 'portail.html'; }
function getEcoleName() {
    try { const c = JSON.parse(localStorage.getItem('portail_config_v1')); if (c && c.name) return c.name; } catch (e) {}
    return localStorage.getItem('ecole_nom') || 'Établissement scolaire';
}
function loadEns() {
    const j = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
    ensEleves = j(E_ELEVES, []); ensClasses = j(E_CLASSES, []); ensMatieres = j(E_MATIERES, []);
    ensList = j(E_ENSEIGNANTS, []); ensNotes = j(E_NOTES, {}); ensHisto = j(E_HISTO, []);
}
function saveEnsList() { localStorage.setItem(E_ENSEIGNANTS, JSON.stringify(ensList)); }
function saveEnsNotes() { localStorage.setItem(E_NOTES, JSON.stringify(ensNotes)); }

function noteVal(v) {
    if (v === undefined || v === null || v === '') return null;
    if (typeof v === 'object') {
        const d = (v.d !== undefined && v.d !== null && v.d !== '') ? parseFloat(v.d) : null;
        const c = (v.c !== undefined && v.c !== null && v.c !== '') ? parseFloat(v.c) : null;
        if (d !== null && c !== null) return (d + c) / 2;
        if (c !== null) return c;
        if (d !== null) return d;
        return null;
    }
    return parseFloat(v);
}

// ---- sélection : d'abord la fonction, puis le nom ----
function ensMatchFonction(p, fonction) {
    const niv = p.niveau || '';
    if (!niv) return true; // enseignant sans niveau défini : visible partout
    if (fonction === 'Préscolaire') return niv === 'Préscolaire';
    if (fonction === 'Primaire') return niv === 'Primaire';
    if (fonction === 'Collège') return niv === 'Collège' || niv === 'Collège et Lycée';
    if (fonction === 'Lycée') return niv === 'Lycée' || niv === 'Collège et Lycée';
    return true;
}
function filtrerParFonction() {
    const fonction = document.getElementById('ensFonction').value;
    const sel = document.getElementById('ensSelect');
    document.getElementById('teacherApp').classList.add('hidden');
    teacher = null;
    if (!fonction) { sel.innerHTML = '<option value="">— Choisissez d\'abord la fonction —</option>'; return; }
    const list = ensList.filter(p => ensMatchFonction(p, fonction))
        .sort((a, b) => (a.nom + a.prenom).localeCompare(b.nom + b.prenom));
    if (!list.length) {
        sel.innerHTML = `<option value="">Aucun enseignant « ${enEsc(fonction)} » — à créer dans la Direction des études</option>`;
        return;
    }
    sel.innerHTML = '<option value="">— Sélectionnez votre nom —</option>' +
        list.map(p => `<option value="${p.id}">${enEsc(p.nom)} ${enEsc(p.prenom)}${p.matiere ? ' (' + enEsc(p.matiere) + ')' : ''}</option>`).join('');
}
function populateTeacherSelect() {
    if (!ensList.length) {
        document.getElementById('ensFonction').disabled = true;
        document.getElementById('ensSelect').innerHTML = '<option value="">Aucun enseignant — à créer dans la Direction des études</option>';
        document.getElementById('teacherApp').classList.add('hidden');
        return;
    }
    document.getElementById('ensSelect').innerHTML = '<option value="">— Choisissez d\'abord la fonction —</option>';
}
function selectTeacher() {
    const id = document.getElementById('ensSelect').value;
    teacher = ensList.find(x => x.id === id) || null;
    const app = document.getElementById('teacherApp');
    if (!teacher) { app.classList.add('hidden'); return; }
    app.classList.remove('hidden');
    remplirSelecteursNotes();
    remplirSelecteursHeures();
    remplirInfos();
    updateNotifBadge();
    updateCircBadge();
    ensTab('notes');
    const nc = window.Circulaires ? Circulaires.nonLues(teacher) : 0;
    if (nc && window.uiToast) uiToast(`Vous avez ${nc} note${nc > 1 ? 's' : ''} ou circulaire${nc > 1 ? 's' : ''} non lue${nc > 1 ? 's' : ''}.`, 'info');
}

// ---- onglets ----
function ensTab(name) {
    ['notes', 'resultats', 'heures', 'planning', 'circulaires', 'infos'].forEach(t => {
        document.getElementById('ens-' + t).classList.toggle('hidden', t !== name);
        document.getElementById('tab-' + t).className = 'btn ' + (t === name ? 'btn-primary' : 'btn-secondary');
    });
    if (name === 'resultats') renderResultatsEns();
    if (name === 'heures') renderMesHeures();
    if (name === 'planning') renderPlanning();
    if (name === 'circulaires') renderCirculairesEns();
}

// ---- matières / classes du prof ----
function mesMatieres() {
    if (teacher.matieres && teacher.matieres.length) return ensMatieres.filter(m => teacher.matieres.indexOf(m.id) >= 0 && ensMatiereCycle(m) === 'secondaire');
    if (teacher.matiere) { const m = ensMatieres.find(x => x.nom === teacher.matiere); if (m) return [m]; }
    return ensMatieres.filter(m => ensMatiereCycle(m) === 'secondaire');
}
function mesClasses() {
    if (teacher.classes && teacher.classes.length) return teacher.classes;
    // sinon, classes correspondant au niveau de l'enseignant
    const niv = teacher.niveau || '';
    const presco = c => window.Presco && Presco.estPrescolaire(c.nom);
    if (niv === 'Préscolaire') return ensClasses.filter(presco).map(c => c.nom);
    if (niv === 'Primaire') return ensClasses.filter(c => c.cycle === 'primaire' && !presco(c)).map(c => c.nom);
    if (niv === 'Collège' || niv === 'Lycée' || niv === 'Collège et Lycée') return ensClasses.filter(c => c.cycle !== 'primaire').map(c => c.nom);
    return ensClasses.map(c => c.nom);
}
// ---- cycle ----
function ensClasseCycle(nom) { const c = ensClasses.find(x => x.nom === nom); return (c && c.cycle === 'primaire') ? 'primaire' : 'secondaire'; }
function ensMatiereCycle(m) { return m.cycle === 'primaire' ? 'primaire' : 'secondaire'; }
function ensMatieresClasse(nom) { const cy = ensClasseCycle(nom); return ensMatieres.filter(m => ensMatiereCycle(m) === cy); }
const ENS_PRIM_GROUPES = ['Français', 'Calcul / Mathématiques', "Disciplines d'éveil", 'Éducation artistique, physique et manuelle', 'Langues et options'];

// Affiche/masque le sélecteur de matière selon le cycle de la classe
function majSaisieCycle() {
    const classe = document.getElementById('ensClasse').value;
    const col = document.getElementById('ensMatiereCol');
    if (!col) return;
    const prim = classe && ensClasseCycle(classe) === 'primaire';
    col.style.display = prim ? 'none' : '';
}

// ---- saisie des notes ----
function remplirSelecteursNotes() {
    document.getElementById('ensClasse').innerHTML = '<option value="">— Classe —</option>' + mesClasses().map(n => { const prim = ensClasseCycle(n) === 'primaire'; return `<option value="${enAttr(n)}">${enEsc(n)}${prim ? ' (primaire)' : ''}</option>`; }).join('');
    document.getElementById('ensMatiere').innerHTML = '<option value="">— Matière —</option>' + mesMatieres().map(m => `<option value="${m.id}">${enEsc(m.nom)} (coef ${enEsc(m.coefficient)})</option>`).join('');
    document.getElementById('ensTrim').innerHTML = E_TRIMS.map(t => `<option>${t}</option>`).join('');
    majSaisieCycle();
}
function chargerGrilleEns() {
    const classe = document.getElementById('ensClasse').value;
    const trim = document.getElementById('ensTrim').value;
    const grid = document.getElementById('ensGrille');
    if (!classe) { grid.innerHTML = '<p style="color:var(--danger,#dc3545);padding:0.5rem;">Choisissez une classe.</p>'; return; }
    const list = ensEleves.filter(e => e.classe === classe);
    if (!list.length) { grid.innerHTML = '<p style="color:var(--danger,#dc3545);padding:0.5rem;">Aucun élève dans cette classe.</p>'; return; }
    if (window.Presco && Presco.estPrescolaire(classe)) { ensPresco(classe, trim); return; }
    if (ensClasseCycle(classe) === 'primaire') {
        const mats = ensMatieresClasse(classe);
        if (!mats.length) { grid.innerHTML = '<p style="color:var(--danger,#dc3545);padding:0.5rem;">Aucune matière du primaire. Demandez à la Direction des études de les charger.</p>'; return; }
        grid.innerHTML = `<p style="color:var(--muted,#64748b);font-size:0.82rem;margin:0 0 0.5rem;">Classe du <strong>primaire</strong> : une note <strong>sur 10</strong> par discipline (bulletin complet).</p>
            <div style="overflow-x:auto;"><table>
            <thead><tr><th style="position:sticky;left:0;background:var(--surface-2,#f8fafc);">Élève</th>${mats.map(m => `<th style="text-align:center;min-width:70px;">${enEsc(m.nom)}<br><span style="font-weight:400;color:var(--muted-2,#94a3b8);font-size:0.7rem;">coef ${enEsc(m.coefficient)} /10</span></th>`).join('')}</tr></thead>
            <tbody>${list.map(e => `<tr>
                <td style="font-weight:600;position:sticky;left:0;background:var(--surface,#fff);white-space:nowrap;">${enEsc(e.nom)} ${enEsc(e.prenom)}</td>
                ${mats.map(m => { const v = noteVal(ensNotes[`${e.id}|${m.id}|${trim}`]); return `<td style="text-align:center;"><input type="number" min="0" max="10" step="0.25" value="${v === null ? '' : v}" id="ensP_${e.id}_${m.id}" style="width:56px;margin:0;padding:0.3rem 0.15rem;text-align:center;"></td>`; }).join('')}
            </tr>`).join('')}</tbody></table></div>`;
        return;
    }
    const matId = document.getElementById('ensMatiere').value;
    if (!matId) { grid.innerHTML = '<p style="color:var(--danger,#dc3545);padding:0.5rem;">Choisissez une matière.</p>'; return; }
    grid.innerHTML = `<div style="overflow-x:auto;"><table>
        <thead><tr><th>Élève</th><th style="text-align:center;">Devoir /20</th><th style="text-align:center;">Composition /20</th></tr></thead>
        <tbody>${list.map(e => {
            const raw = ensNotes[`${e.id}|${matId}|${trim}`];
            let dv = '', cv = '';
            if (raw && typeof raw === 'object') { dv = (raw.d == null ? '' : raw.d); cv = (raw.c == null ? '' : raw.c); }
            else if (raw !== undefined && raw !== null && raw !== '') { cv = raw; }
            return `<tr><td style="font-weight:600;">${enEsc(e.nom)} ${enEsc(e.prenom)}</td>
                <td style="text-align:center;"><input type="number" min="0" max="20" step="0.25" value="${dv}" id="ensD_${e.id}" style="width:70px;margin:0;text-align:center;"></td>
                <td style="text-align:center;"><input type="number" min="0" max="20" step="0.25" value="${cv}" id="ensC_${e.id}" style="width:70px;margin:0;text-align:center;"></td></tr>`;
        }).join('')}</tbody></table></div>`;
}
function ensLogNote(e, matNom, trim, ancien, nouveau) {
    ensHisto.unshift({
        date: new Date().toISOString(), eleve: `${e.nom} ${e.prenom}`, classe: e.classe,
        matiere: matNom, trimestre: trim,
        ancienne: noteVal(ancien) === null ? '—' : noteVal(ancien),
        nouvelle: noteVal(nouveau) === null ? '(supprimée)' : noteVal(nouveau),
        par: teacher ? `${teacher.nom} ${teacher.prenom}` : 'Enseignant'
    });
}
function enregistrerNotesEns() {
    const classe = document.getElementById('ensClasse').value;
    const trim = document.getElementById('ensTrim').value;
    if (!classe) { alert('Choisissez une classe.'); return; }
    const list = ensEleves.filter(e => e.classe === classe);
    let count = 0;
    if (ensClasseCycle(classe) === 'primaire') {
        const mats = ensMatieresClasse(classe);
        const clamp = (s) => { let n = parseFloat(s); if (isNaN(n)) return ''; if (n < 0) n = 0; if (n > 10) n = 10; return n; };
        list.forEach(e => mats.forEach(m => {
            const el = document.getElementById(`ensP_${e.id}_${m.id}`);
            if (!el) return;
            const key = `${e.id}|${m.id}|${trim}`;
            const ancien = ensNotes[key];
            const pv = clamp(el.value.trim());
            const nouveau = (pv === '') ? undefined : pv;
            if (JSON.stringify(ancien) !== JSON.stringify(nouveau)) ensLogNote(e, m.nom, trim, ancien, nouveau);
            if (nouveau === undefined) delete ensNotes[key];
            else { ensNotes[key] = nouveau; count++; }
        }));
    } else {
        const matId = document.getElementById('ensMatiere').value;
        if (!matId) { alert('Choisissez une matière.'); return; }
        const mat = ensMatieres.find(m => m.id === matId);
        const clamp = (s) => { let n = parseFloat(s); if (isNaN(n)) return ''; if (n < 0) n = 0; if (n > 20) n = 20; return n; };
        list.forEach(e => {
            const dEl = document.getElementById(`ensD_${e.id}`);
            const cEl = document.getElementById(`ensC_${e.id}`);
            if (!dEl || !cEl) return;
            const key = `${e.id}|${matId}|${trim}`;
            const ancien = ensNotes[key];
            const dv = clamp(dEl.value.trim()), cv = clamp(cEl.value.trim());
            const nouveau = (dv === '' && cv === '') ? undefined : { d: dv, c: cv };
            if (JSON.stringify(ancien) !== JSON.stringify(nouveau)) ensLogNote(e, mat ? mat.nom : matId, trim, ancien, nouveau);
            if (nouveau === undefined) delete ensNotes[key];
            else { ensNotes[key] = nouveau; count++; }
        });
    }
    if (ensHisto.length > 1000) ensHisto = ensHisto.slice(0, 1000);
    localStorage.setItem(E_HISTO, JSON.stringify(ensHisto));
    saveEnsNotes();
    alert(`Notes enregistrées (${count} note(s)). Elles sont disponibles dans la Direction des études.`);
}

// ---- mes résultats ----
function renderResultatsEns() {
    const classe = document.getElementById('ensClasse').value;
    const matId = document.getElementById('ensMatiere').value;
    const trim = document.getElementById('ensTrim').value || E_TRIMS[0];
    const box = document.getElementById('ensResultats');
    if (!classe || !matId) { box.innerHTML = '<p style="color:var(--muted,#64748b);padding:0.5rem;">Choisissez d\'abord une classe et une matière dans « Saisie des notes ».</p>'; return; }
    const mat = ensMatieres.find(m => m.id === matId);
    const list = ensEleves.filter(e => e.classe === classe);
    const vals = [];
    const rows = list.map(e => {
        const raw = ensNotes[`${e.id}|${matId}|${trim}`];
        let dv = '-', cv = '-';
        if (raw && typeof raw === 'object') { dv = (raw.d === '' || raw.d == null) ? '-' : raw.d; cv = (raw.c === '' || raw.c == null) ? '-' : raw.c; }
        else if (raw !== undefined && raw !== null && raw !== '') { cv = raw; }
        const moy = noteVal(raw);
        if (moy !== null) vals.push(moy);
        return `<tr><td style="font-weight:600;">${enEsc(e.nom)} ${enEsc(e.prenom)}</td>
            <td style="text-align:center;">${dv}</td><td style="text-align:center;">${cv}</td>
            <td style="text-align:center;font-weight:700;">${moy !== null ? moy.toFixed(2) : '-'}</td></tr>`;
    }).join('');
    const moyClasse = vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length) : null;
    const reussite = vals.length ? Math.round(vals.filter(v => v >= 10).length / vals.length * 100) : 0;
    box.innerHTML = `
        <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:0.5rem;">${enEsc(mat ? mat.nom : '')} — ${enEsc(classe)} — ${enEsc(trim)}</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0.75rem;margin-bottom:1rem;">
            <div style="background:var(--surface-2,#f8fafc);border:1px solid #e2e8f0;border-radius:10px;padding:0.8rem;text-align:center;"><div style="font-size:1.3rem;font-weight:700;color:var(--brand-strong,#2E2769);">${moyClasse !== null ? moyClasse.toFixed(2) + '/20' : '-'}</div><div style="font-size:0.8rem;color:var(--muted,#64748b);">Moyenne de la classe</div></div>
            <div style="background:var(--surface-2,#f8fafc);border:1px solid #e2e8f0;border-radius:10px;padding:0.8rem;text-align:center;"><div style="font-size:1.3rem;font-weight:700;color:var(--ok,#16a34a);">${reussite} %</div><div style="font-size:0.8rem;color:var(--muted,#64748b);">Taux de réussite (≥10)</div></div>
            <div style="background:var(--surface-2,#f8fafc);border:1px solid #e2e8f0;border-radius:10px;padding:0.8rem;text-align:center;"><div style="font-size:1.3rem;font-weight:700;color:var(--info,#0ea5e9);">${vals.length}/${list.length}</div><div style="font-size:0.8rem;color:var(--muted,#64748b);">Notés</div></div>
        </div>
        <div style="overflow-x:auto;"><table>
            <thead><tr><th>Élève</th><th style="text-align:center;">Devoir</th><th style="text-align:center;">Compo</th><th style="text-align:center;">Moyenne</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="4" style="text-align:center;color:var(--muted,#64748b);">Aucun élève</td></tr>'}</tbody>
        </table></div>`;
}

// ---- mes informations ----
function remplirInfos() {
    document.getElementById('infNom').value = teacher.nom || '';
    document.getElementById('infPrenom').value = teacher.prenom || '';
    document.getElementById('infTel').value = teacher.telephone || '';
    document.getElementById('infEmail').value = teacher.email || '';
    document.getElementById('infDiplome').value = teacher.diplome || '';
    const selMat = teacher.matieres || (teacher.matiere ? ensMatieres.filter(m => m.nom === teacher.matiere).map(m => m.id) : []);
    document.getElementById('infMatieres').innerHTML = ensMatieres.length === 0
        ? '<span style="color:var(--muted,#64748b);">Aucune matière définie. Demandez à l\'administration.</span>'
        : ensMatieres.map(m => `<label style="display:flex;align-items:center;gap:0.35rem;cursor:pointer;"><input type="checkbox" id="infMat_${m.id}" ${selMat.indexOf(m.id) >= 0 ? 'checked' : ''}> ${enEsc(m.nom)}</label>`).join('');
    const selCl = teacher.classes || [];
    document.getElementById('infClasses').innerHTML = ensClasses.length === 0
        ? '<span style="color:var(--muted,#64748b);">Aucune classe définie.</span>'
        : ensClasses.map((c, i) => `<label style="display:flex;align-items:center;gap:0.35rem;cursor:pointer;"><input type="checkbox" id="infCls_${i}" ${selCl.indexOf(c.nom) >= 0 ? 'checked' : ''}> ${enEsc(c.nom)}</label>`).join('');
}
function enregistrerInfos() {
    teacher.nom = document.getElementById('infNom').value.trim() || teacher.nom;
    teacher.prenom = document.getElementById('infPrenom').value.trim();
    teacher.telephone = document.getElementById('infTel').value.trim();
    teacher.email = document.getElementById('infEmail').value.trim();
    teacher.diplome = document.getElementById('infDiplome').value.trim();
    teacher.matieres = ensMatieres.filter(m => { const el = document.getElementById('infMat_' + m.id); return el && el.checked; }).map(m => m.id);
    if (teacher.matieres.length) { const m0 = ensMatieres.find(m => m.id === teacher.matieres[0]); if (m0) teacher.matiere = m0.nom; }
    teacher.classes = ensClasses.filter((c, i) => { const el = document.getElementById('infCls_' + i); return el && el.checked; }).map(c => c.nom);
    saveEnsList();
    remplirSelecteursNotes();
    const opt = Array.prototype.slice.call(document.getElementById('ensSelect').options).find(o => o.value === teacher.id);
    if (opt) opt.textContent = `${teacher.nom} ${teacher.prenom}${teacher.matiere ? ' (' + teacher.matiere + ')' : ''}`;
    alert('Vos informations ont été enregistrées.');
}

// ---- heures de cours : déclaration + suivi + rémunération ----
function remplirSelecteursHeures() {
    document.getElementById('hClasse').innerHTML = '<option value="">— Classe —</option>' + mesClasses().map(n => `<option value="${enAttr(n)}">${enEsc(n)}</option>`).join('');
    document.getElementById('hMatiere').innerHTML = '<option value="">— Matière —</option>' + mesMatieres().map(m => `<option value="${enAttr(m.nom)}">${enEsc(m.nom)}</option>`).join('');
    const d = document.getElementById('hDate'); if (!d.value) d.value = new Date().toISOString().split('T')[0];
}
function mesDeclarations() {
    return hLoad().filter(h => h.enseignantId === teacher.id);
}
function declarerHeures() {
    const date = document.getElementById('hDate').value;
    const classe = document.getElementById('hClasse').value;
    const matiere = document.getElementById('hMatiere').value;
    const heures = parseFloat(document.getElementById('hHeures').value);
    const sujet = document.getElementById('hSujet').value.trim();
    if (!date || !classe || !matiere || !heures || heures <= 0) { alert('Renseignez la date, la classe, la matière et un nombre d\'heures valide.'); return; }
    const arr = hLoad();
    arr.push({
        id: 'h' + Date.now(), enseignantId: teacher.id, enseignantNom: `${teacher.nom} ${teacher.prenom}`,
        date: date, classe: classe, matiere: matiere, heures: heures, sujet: sujet,
        declareLe: new Date().toISOString(), statut: 'attente_surveillant',
        surveillant: null, scolarite: null, etudes: null, rejet: null, lu: true
    });
    hSave(arr);
    document.getElementById('hHeures').value = ''; document.getElementById('hSujet').value = '';
    renderMesHeures();
    alert('Déclaration envoyée. Elle doit être validée par le Surveillant, le Chef de scolarité puis le Directeur des études.');
}
function updateNotifBadge() {
    const nb = mesDeclarations().filter(h => (h.statut === 'valide' || h.statut === 'rejete') && !h.lu).length;
    const b = document.getElementById('ensNotifBadge');
    if (!b) return;
    b.textContent = nb; b.classList.toggle('hidden', nb === 0);
}
function renderMesHeures() {
    const mine = mesDeclarations();
    const valNew = mine.filter(h => h.statut === 'valide' && !h.lu);
    const rejNew = mine.filter(h => h.statut === 'rejete' && !h.lu);
    let notif = '';
    if (valNew.length) notif += `<div style="background:var(--ok-bg,#dcfce7);border:1px solid #86efac;color:var(--ok-strong,#166534);border-radius:10px;padding:0.85rem 1rem;margin-bottom:0.75rem;"><strong>✓ ${valNew.length} déclaration(s) validée(s) !</strong> Vos heures ont été confirmées par le Surveillant, le Chef de scolarité et le Directeur des études. Elles sont désormais payables.</div>`;
    if (rejNew.length) notif += `<div style="background:var(--danger-bg,#fee2e2);border:1px solid #fca5a5;color:var(--danger-strong,#991b1b);border-radius:10px;padding:0.85rem 1rem;margin-bottom:0.75rem;"><strong>✗ ${rejNew.length} déclaration(s) rejetée(s).</strong> Consultez le motif dans le tableau ci-dessous.</div>`;
    document.getElementById('ensNotif').innerHTML = notif;

    const taux = parseFloat(teacher.tauxHoraire) || 0;
    const hVal = mine.filter(h => h.statut === 'valide').reduce((s, h) => s + (parseFloat(h.heures) || 0), 0);
    const hAtt = mine.filter(h => h.statut.indexOf('attente') === 0).reduce((s, h) => s + (parseFloat(h.heures) || 0), 0);
    const montant = hVal * taux;
    const fcfa = n => Number(n).toLocaleString('fr-FR') + ' FCFA';
    document.getElementById('ensRemu').innerHTML = `<div class="card"><h3 style="font-size:1.05rem;font-weight:700;margin-bottom:0.75rem;">Ma rémunération</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0.75rem;">
            <div style="background:var(--surface-2,#f8fafc);border:1px solid #e2e8f0;border-radius:10px;padding:0.85rem;text-align:center;"><div style="font-size:1.25rem;font-weight:700;color:var(--brand-strong,#2E2769);">${taux ? fcfa(taux) + '/h' : 'non défini'}</div><div style="font-size:0.8rem;color:var(--muted,#64748b);">Taux horaire</div></div>
            <div style="background:var(--surface-2,#f8fafc);border:1px solid #e2e8f0;border-radius:10px;padding:0.85rem;text-align:center;"><div style="font-size:1.25rem;font-weight:700;color:var(--ok,#16a34a);">${hVal} h</div><div style="font-size:0.8rem;color:var(--muted,#64748b);">Heures validées</div></div>
            <div style="background:var(--surface-2,#f8fafc);border:1px solid #e2e8f0;border-radius:10px;padding:0.85rem;text-align:center;"><div style="font-size:1.25rem;font-weight:700;color:var(--warn,#f59e0b);">${hAtt} h</div><div style="font-size:0.8rem;color:var(--muted,#64748b);">En attente</div></div>
            <div style="background:var(--brand-bg,#eef2ff);border:1px solid #c7d2fe;border-radius:10px;padding:0.85rem;text-align:center;"><div style="font-size:1.25rem;font-weight:700;color:var(--brand-strong,#4338ca);">${fcfa(montant)}</div><div style="font-size:0.8rem;color:var(--muted,#64748b);">Rémunération validée</div></div>
        </div>${taux ? '' : '<p style="color:var(--warn-strong,#b45309);font-size:0.82rem;margin:0.6rem 0 0;">Votre taux horaire n\'est pas encore défini par l\'administration (Direction des études).</p>'}</div>`;

    const list = mine.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    document.getElementById('ensHeuresList').innerHTML = list.length === 0
        ? '<p style="color:var(--muted,#64748b);padding:0.5rem;">Aucune déclaration pour le moment.</p>'
        : `<div style="overflow-x:auto;"><table>
            <thead><tr><th>Date</th><th>Classe</th><th>Matière</th><th style="text-align:center;">Heures</th><th>Sujet</th><th>Suivi de validation</th><th>Statut</th></tr></thead>
            <tbody>${list.map(h => `<tr>
                <td>${h.date ? new Date(h.date).toLocaleDateString('fr-FR') : '-'}</td>
                <td>${enEsc(h.classe)}</td><td>${enEsc(h.matiere)}</td>
                <td style="text-align:center;font-weight:700;">${enEsc(String(h.heures))}</td>
                <td>${enEsc(h.sujet)}</td>
                <td>${hProgress(h)}</td>
                <td style="color:${hStatutColor(h.statut)};font-weight:600;white-space:nowrap;">${hStatutLabel(h.statut)}</td>
            </tr>`).join('')}</tbody></table></div>`;

    if (valNew.length || rejNew.length) {
        const arr = hLoad();
        arr.forEach(h => { if (h.enseignantId === teacher.id && (h.statut === 'valide' || h.statut === 'rejete')) h.lu = true; });
        hSave(arr);
    }
    updateNotifBadge();
}

// ---- mon planning (dérivé de l'emploi du temps) ----
function renderPlanning() {
    const box = document.getElementById('ensPlanning');
    let edt = {};
    try { edt = JSON.parse(localStorage.getItem(E_EDT)) || {}; } catch (e) { edt = {}; }
    const mesClassesNoms = mesClasses();
    const mesMatNoms = mesMatieres().map(m => m.nom);
    const lignes = [];
    EDT_JOURS.forEach((jour, ji) => {
        EDT_CRENEAUX.forEach((cr, ci) => {
            mesClassesNoms.forEach(cl => {
                const data = edt[cl] || {};
                const mat = data[`${ji}|${ci}`];
                if (mat && mesMatNoms.indexOf(mat) >= 0) lignes.push({ jour, creneau: cr, classe: cl, matiere: mat, ji, ci });
            });
        });
    });
    lignes.sort((a, b) => a.ji - b.ji || a.ci - b.ci);
    const heuresSemaine = lignes.length;
    let html = `<h3 style="font-size:1.15rem;font-weight:700;margin-bottom:0.25rem;">Mon planning</h3>
        <p style="color:var(--muted,#64748b);margin:0 0 1rem;">Établi à partir des emplois du temps saisis par la Direction des études.</p>
        <div style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1rem;">
            <span style="background:var(--brand-bg,#eef2ff);color:var(--brand-strong,#4338ca);border-radius:999px;padding:0.3rem 0.8rem;font-size:0.85rem;"><strong>Classes :</strong> ${mesClassesNoms.length ? mesClassesNoms.map(enEsc).join(', ') : 'non définies'}</span>
            <span style="background:var(--brand-bg,#ecfeff);color:var(--info,#0e7490);border-radius:999px;padding:0.3rem 0.8rem;font-size:0.85rem;"><strong>Matières :</strong> ${mesMatNoms.length ? mesMatNoms.map(enEsc).join(', ') : 'non définies'}</span>
            <span style="background:var(--ok-bg,#f0fdf4);color:var(--ok-strong,#166534);border-radius:999px;padding:0.3rem 0.8rem;font-size:0.85rem;"><strong>${heuresSemaine}</strong> créneau(x)/semaine</span>
        </div>`;
    if (!lignes.length) {
        html += '<p style="color:var(--muted,#64748b);">Aucun créneau trouvé. L\'emploi du temps de vos classes n\'a pas encore été saisi, ou vos matières/classes ne sont pas renseignées (onglet « Mes informations »).</p>';
    } else {
        html += `<div style="overflow-x:auto;"><table>
            <thead><tr><th>Jour</th><th>Horaire</th><th>Classe</th><th>Matière</th></tr></thead>
            <tbody>${lignes.map(l => `<tr><td style="font-weight:600;">${l.jour}</td><td>${l.creneau}</td><td>${enEsc(l.classe)}</td><td>${enEsc(l.matiere)}</td></tr>`).join('')}</tbody>
        </table></div>`;
    }
    box.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', function () {
    loadEns();
    document.getElementById('ensEcole').textContent = getEcoleName();
    populateTeacherSelect();
});

// ---------- Préscolaire : évaluation par appréciations (P1, P2, P3) ----------
let ensPrEleve = null, ensPrTimer = null;
function ensPresco(classe, trim, eleveId) {
    const grid = document.getElementById('ensGrille');
    const list = ensEleves.filter(e => e.classe === classe).sort((a, b) => (a.nom + a.prenom).localeCompare(b.nom + b.prenom));
    const e = list.find(x => x.id === (eleveId || ensPrEleve)) || list[0];
    if (!e) return;
    ensPrEleve = e.id;
    const c = Presco.config(), rec = Presco.evals()[e.id + '|' + trim] || {}, ev = rec.items || {}, b = Presco.bilan(e.id, trim);
    const idx = list.indexOf(e);
    grid.innerHTML = `
        <p class="text-secondary small"><i class="bi bi-balloon"></i> Préscolaire : pas de notes. Appréciez chaque compétence ; tout est enregistré automatiquement et transmis à la Direction des études.</p>
        <div class="d-flex gap-2 align-items-end flex-wrap mb-3">
            <div style="flex:1;min-width:220px;"><label class="form-label">Élève (${idx + 1}/${list.length})</label><select style="margin:0;" onchange="ensPresco('${enAttr(classe)}','${enAttr(trim)}',this.value)">${list.map(x => `<option value="${enAttr(x.id)}" ${x.id === e.id ? 'selected' : ''}>${enEsc(x.nom)} ${enEsc(x.prenom)}</option>`).join('')}</select></div>
            <button class="btn btn-secondary" ${idx === 0 ? 'disabled' : ''} onclick="ensPresco('${enAttr(classe)}','${enAttr(trim)}','${enAttr((list[idx - 1] || {}).id || '')}')"><i class="bi bi-chevron-left"></i></button>
            <button class="btn btn-primary" ${idx === list.length - 1 ? 'disabled' : ''} onclick="ensPresco('${enAttr(classe)}','${enAttr(trim)}','${enAttr((list[idx + 1] || {}).id || '')}')">Suivant <i class="bi bi-chevron-right"></i></button>
        </div>
        <div class="pr-bilan mb-3">${c.niveaux.map(n => `<span class="pr-chip" style="--c:${enAttr(n.couleur)}">${enEsc(n.libelle)} : <strong>${b.parNiv[n.code] || 0}</strong></span>`).join('')}<span class="text-secondary small">${b.evalues}/${b.total} évaluée(s)</span></div>
        ${c.domaines.map(d => `<div class="pr-cons-dom"><strong>${enEsc(d.nom)}</strong>${d.items.map(i => `<div class="pr-item"><span>${enEsc(i.nom)}</span><div class="pr-niv">${c.niveaux.map(n => `<button type="button" class="${ev[i.id] === n.code ? 'on' : ''}" style="--c:${enAttr(n.couleur)}" onclick="ensPrNoter('${enAttr(classe)}','${enAttr(trim)}','${i.id}','${enAttr(n.code)}')">${enEsc(n.libelle)}</button>`).join('')}</div></div>`).join('')}</div>`).join('')}
        <label class="form-label mt-2">Observation</label>
        <textarea rows="3" style="margin:0;" oninput="ensPrObs('${enAttr(trim)}',this.value)">${enEsc(rec.observation || '')}</textarea>`;
}
function ensPrRec(trim, fn) {
    const all = Presco.evals(), k = ensPrEleve + '|' + trim;
    all[k] = all[k] || { items: {} }; all[k].items = all[k].items || {};
    fn(all[k]); all[k].maj = new Date().toISOString(); all[k].par = teacher ? ((teacher.nom || '') + ' ' + (teacher.prenom || '')).trim() : 'Enseignant';
    Presco.sauverEvals(all);
}
function ensPrNoter(classe, trim, itemId, code) {
    ensPrRec(trim, r => { if (r.items[itemId] === code) delete r.items[itemId]; else r.items[itemId] = code; });
    ensPresco(classe, trim, ensPrEleve);
}
function ensPrObs(trim, v) { clearTimeout(ensPrTimer); ensPrTimer = setTimeout(() => ensPrRec(trim, r => { r.observation = v; }), 500); }

// ---- Notes & circulaires reçues ----
function updateCircBadge() {
    const b = document.getElementById('ensCircBadge');
    if (!b || !teacher || !window.Circulaires) return;
    const nb = Circulaires.nonLues(teacher);
    b.textContent = nb; b.classList.toggle('hidden', nb === 0);
}
function renderCirculairesEns() {
    const box = document.getElementById('ensCircListe');
    if (!box || !teacher || !window.Circulaires) return;
    const list = Circulaires.pourEnseignant(teacher);
    if (!list.length) { box.innerHTML = '<div class="card" style="text-align:center;color:var(--muted,#64748b);padding:2rem;"><i class="bi bi-inbox" style="font-size:1.6rem;"></i><p style="margin:0.5rem 0 0;">Aucune note ni circulaire pour le moment.</p></div>'; return; }
    box.innerHTML = list.map(c => {
        const lu = c.lectures && c.lectures[teacher.id];
        return `<div class="card" style="border-left:4px solid ${lu ? 'var(--line,#e2e8f0)' : 'var(--brand,#4f46e5)'};">
            <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap;">
                <div>
                    <div style="font-size:0.8rem;font-weight:700;color:var(--brand,#4f46e5);text-transform:uppercase;letter-spacing:0.04em;">${enEsc(c.type)} · ${enEsc(c.numero)}</div>
                    <h4 style="font-size:1.05rem;font-weight:700;margin:0.2rem 0;">${enEsc(c.objet)}</h4>
                    <div style="font-size:0.85rem;color:var(--muted,#64748b);">De : <strong>${enEsc(c.service)}</strong> · le ${c.date ? new Date(c.date).toLocaleDateString('fr-FR') : ''} · pour : ${enEsc(Circulaires.libelleCible(c))}</div>
                </div>
                ${lu ? `<span style="background:#dcfce7;color:#166534;padding:0.2rem 0.65rem;border-radius:999px;font-size:0.8rem;font-weight:600;white-space:nowrap;"><i class="bi bi-check2"></i> Lu le ${new Date(lu.le).toLocaleDateString('fr-FR')}</span>`
                     : '<span style="background:#ede9fe;color:#5b21b6;padding:0.2rem 0.65rem;border-radius:999px;font-size:0.8rem;font-weight:700;white-space:nowrap;">Nouveau</span>'}
            </div>
            <div style="white-space:pre-wrap;line-height:1.6;margin:0.9rem 0;padding:0.9rem 1rem;border-radius:12px;background:var(--surface-2,#f8fafc);">${enEsc(c.contenu)}</div>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                ${lu ? '' : `<button class="btn btn-primary" onclick="lireCirculaire('${c.id}')"><i class="bi bi-check2-circle"></i> J'ai lu</button>`}
                <button class="btn btn-secondary" onclick="Circulaires.imprimer('${c.id}')"><i class="bi bi-printer"></i> Imprimer</button>
            </div>
        </div>`;
    }).join('');
}
function lireCirculaire(id) {
    Circulaires.marquerLu(id, teacher);
    renderCirculairesEns(); updateCircBadge();
    if (window.uiToast) uiToast('Lecture confirmée. Le service émetteur le voit.', 'success');
}
