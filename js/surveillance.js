// ===== Surveillance et discipline =====
const ELEVES_KEY = 'ecole_eleves';
const CLASSES_KEY = 'ecole_classes';
const PRESENCES_KEY = 'ecole_presences';
const RETARDS_KEY = 'ecole_retards';
const SANCTIONS_KEY = 'ecole_sanctions';
const PERMISSIONS_KEY = 'ecole_permissions';
const CONVOCATIONS_KEY = 'ecole_convocations';

let eleves = [], classes = [], presences = {}, retards = [], sanctions = [], permissions = [], convocations = [];

const SURV_SECTIONS = {
    dashboard:   { titre: 'Tableau de bord', icone: 'bi-speedometer2' },
    appel:       { titre: 'Appel / Absences', icone: 'bi-check2-square' },
    retards:     { titre: 'Retards',          icone: 'bi-clock-history' },
    sanctions:   { titre: 'Sanctions',        icone: 'bi-exclamation-triangle' },
    permissions: { titre: 'Permissions',      icone: 'bi-box-arrow-right' },
    convocations:{ titre: 'Convocations parents', icone: 'bi-envelope-paper' },
    reporting:   { titre: 'Reporting',         icone: 'bi-bar-chart-line' },
    heures:    { titre: 'Validation des heures', icone: 'bi-clock-history' },
};
let survChartAbs = null, survChartSanctions = null;
const TYPES_SANCTION = ['Avertissement', 'Blâme', 'Travail supplémentaire', 'Exclusion temporaire', 'Conseil de discipline', 'Exclusion définitive'];

function sEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function sAttr(s) { return sEsc(s).replace(/"/g, '&quot;'); }
function todayStr() { return new Date().toISOString().split('T')[0]; }
function moisCourant() { return new Date().toISOString().slice(0, 7); }
function eleveNom(id) { const e = eleves.find(x => x.id === id); return e ? `${e.nom} ${e.prenom}` : '(élève supprimé)'; }
function eleveClasse(id) { const e = eleves.find(x => x.id === id); return e ? e.classe : ''; }
function getEcoleName() {
    try { const c = JSON.parse(localStorage.getItem('portail_config_v1')); if (c && c.name) return c.name; } catch (e) {}
    return localStorage.getItem('ecole_nom') || 'Établissement scolaire';
}

function loadSurv() {
    const j = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) || def; } catch (e) { return def; } };
    eleves = j(ELEVES_KEY, []);
    classes = j(CLASSES_KEY, []);
    presences = j(PRESENCES_KEY, {});
    retards = j(RETARDS_KEY, []);
    sanctions = j(SANCTIONS_KEY, []);
    permissions = j(PERMISSIONS_KEY, []);
    convocations = j(CONVOCATIONS_KEY, []);
}
function savePresences() { localStorage.setItem(PRESENCES_KEY, JSON.stringify(presences)); }
function saveRetards() { localStorage.setItem(RETARDS_KEY, JSON.stringify(retards)); }
function saveSanctions() { localStorage.setItem(SANCTIONS_KEY, JSON.stringify(sanctions)); }
function savePermissions() { localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions)); }
function saveConvocations() { localStorage.setItem(CONVOCATIONS_KEY, JSON.stringify(convocations)); }

function renderConvocations() {
    const sel = document.getElementById('convEleve');
    if (!sel.dataset.init) { sel.innerHTML = eleveOptions(); sel.dataset.init = '1'; }
    const d = document.getElementById('convDate');
    if (!d.value) d.value = todayStr();
    const tbody = document.getElementById('convTable');
    const list = convocations.slice().sort((a, b) => (b.dateRdv || '').localeCompare(a.dateRdv || ''));
    tbody.innerHTML = list.length === 0
        ? '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:#64748b;">Aucune convocation enregistrée.</td></tr>'
        : list.map(c => `<tr>
            <td style="font-weight:600;">${sEsc(eleveNom(c.eleveId))}</td>
            <td>${sEsc(eleveClasse(c.eleveId))}</td>
            <td>${sEsc(c.motif)}</td>
            <td>${c.dateRdv ? new Date(c.dateRdv).toLocaleDateString('fr-FR') : '-'}${c.heureRdv ? ' à ' + sEsc(c.heureRdv) : ''}</td>
            <td style="text-align:right;white-space:nowrap;">
                <button class="btn btn-primary" style="padding:0.3rem 0.6rem;font-size:0.85rem;" onclick="genererConvocation('${c.id}')"><i class="bi bi-printer"></i></button>
                <button class="btn btn-danger" style="padding:0.3rem 0.6rem;font-size:0.85rem;" onclick="deleteConvocation('${c.id}')">🗑️</button>
            </td></tr>`).join('');
}
function addConvocation() {
    const eleveId = document.getElementById('convEleve').value;
    if (!eleveId) { alert('Choisissez un élève.'); return; }
    const motif = document.getElementById('convMotif').value.trim();
    if (!motif) { alert('Indiquez le motif de la convocation.'); return; }
    convocations.push({
        id: 'conv' + Date.now(),
        eleveId: eleveId,
        motif: motif,
        dateRdv: document.getElementById('convDate').value,
        heureRdv: document.getElementById('convHeure').value,
        texte: document.getElementById('convTexte').value.trim()
    });
    saveConvocations();
    document.getElementById('convMotif').value = '';
    document.getElementById('convTexte').value = '';
    renderConvocations();
}
function deleteConvocation(id) {
    if (!confirm('Supprimer cette convocation ?')) return;
    convocations = convocations.filter(x => x.id !== id);
    saveConvocations(); renderConvocations();
}
function genererConvocation(id) {
    const c = convocations.find(x => x.id === id); if (!c) return;
    const e = eleves.find(x => x.id === c.eleveId) || {};
    const ecole = getEcoleName();
    const html = `
        <div style="font-family:Arial,sans-serif;max-width:760px;margin:0 auto;padding:2.5rem;color:#111;">
            <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:0.75rem;margin-bottom:0.5rem;">
                <p style="margin:0;font-size:0.8rem;">RÉPUBLIQUE DU CONGO &ndash; Unité, Travail, Progrès</p>
                <p style="margin:0.1rem 0;font-size:0.75rem;">Ministère de l'Enseignement Préscolaire, Primaire, Secondaire et de l'Alphabétisation</p>
                <h2 style="margin:0.3rem 0 0;text-transform:uppercase;">${sEsc(ecole)}</h2>
            </div>
            <p style="text-align:right;margin:0.5rem 0;">Fait le ${new Date().toLocaleDateString('fr-FR')}</p>
            <h1 style="text-align:center;font-size:1.3rem;letter-spacing:1px;margin:1rem 0;">CONVOCATION DES PARENTS</h1>
            <p style="line-height:1.9;font-size:1rem;text-align:justify;">
                Madame, Monsieur, parent/tuteur de l'élève <strong>${sEsc(e.nom || '')} ${sEsc(e.prenom || '')}</strong>,
                inscrit(e) en classe de <strong>${sEsc(e.classe || '')}</strong>${e.matricule ? ' (matricule ' + sEsc(e.matricule) + ')' : ''},
                êtes prié(e) de bien vouloir vous présenter au sein de l'établissement
                ${c.dateRdv ? 'le <strong>' + new Date(c.dateRdv).toLocaleDateString('fr-FR') + '</strong>' : ''}${c.heureRdv ? ' à <strong>' + sEsc(c.heureRdv) + '</strong>' : ''}.
            </p>
            <p style="line-height:1.9;font-size:1rem;"><strong>Motif :</strong> ${sEsc(c.motif)}</p>
            ${c.texte ? `<p style="line-height:1.9;font-size:1rem;text-align:justify;">${sEsc(c.texte)}</p>` : ''}
            <p style="line-height:1.9;font-size:1rem;">Comptant sur votre présence, veuillez agréer nos salutations distinguées.</p>
            <div style="margin-top:2.5rem;text-align:right;"><strong>Le Surveillant général</strong><div style="height:55px;"></div>(Signature et cachet)</div>
        </div>`;
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Convocation - ${sEsc(e.nom || '')}</title></head><body>${html}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
}

// ---------- Navigation ----------
function showSection(name) {
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    const sec = document.getElementById('sec-' + name);
    if (!sec) return;
    sec.classList.remove('hidden');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const btn = document.querySelector('.tab[data-tab="' + name + '"]');
    if (btn) btn.classList.add('active');
    const info = SURV_SECTIONS[name];
    if (info) {
        document.getElementById('moduleTitle').textContent = info.titre;
        document.getElementById('moduleIcon').className = 'bi ' + info.icone;
    }
    if (name === 'dashboard') renderDashboard();
    if (name === 'appel') renderAppelControls();
    if (name === 'retards') renderRetards();
    if (name === 'sanctions') renderSanctions();
    if (name === 'permissions') renderPermissions();
    if (name === 'convocations') renderConvocations();
    if (name === 'reporting') renderSurvReporting();
    if (name === 'heures') renderValidationHeures('surveillant', 'valHeuresBox');
    if (window.location.hash !== '#' + name) window.location.hash = name;
}
function survRouteFromHash() {
    const h = (window.location.hash || '').replace(/^#/, '');
    showSection(SURV_SECTIONS[h] ? h : 'dashboard');
}
function toggleSidebar() {
    const sb = document.getElementById('sidebar');
    const collapsed = sb.classList.toggle('collapsed');
    document.getElementById('sidebarToggleIcon').className = collapsed ? 'bi bi-list' : 'bi bi-chevron-left';
}
function logout() { window.location.href = 'portail.html'; }
window.applyHeaderDate = function (d) {
    if (!d) return;
    const s = document.getElementById('survDate'); if (s) s.value = d;
    const a = document.getElementById('appelDate'); if (a) a.value = d;
    if (typeof renderDashboard === 'function') renderDashboard();
};

function classeOptions(selected) {
    return ['<option value="">-- Classe --</option>'].concat(
        classes.map(c => `<option value="${sAttr(c.nom)}" ${selected === c.nom ? 'selected' : ''}>${sEsc(c.nom)}</option>`)).join('');
}
function eleveOptions() {
    return ['<option value="">-- Choisir un élève --</option>'].concat(
        eleves.slice().sort((a, b) => (a.nom + a.prenom).localeCompare(b.nom + b.prenom))
            .map(e => `<option value="${e.id}">${sEsc(e.nom)} ${sEsc(e.prenom)} (${sEsc(e.classe)})</option>`)).join('');
}

// ---------- Tableau de bord ----------
function renderDashboard() {
    const dEl = document.getElementById('survDate');
    if (!dEl.value) dEl.value = todayStr();
    const date = dEl.value;
    let abs = 0, just = 0, pres = 0;
    const absParClasse = {};
    classes.forEach(c => {
        const rec = presences[`${date}|${c.nom}`];
        if (!rec) return;
        let a = 0;
        Object.values(rec).forEach(st => {
            if (st === 'absent') { abs++; a++; }
            else if (st === 'justifie') just++;
            else pres++;
        });
        if (a > 0) absParClasse[c.nom] = a;
    });
    const retJour = retards.filter(r => r.date === date).length;
    const sancMois = sanctions.filter(s => (s.date || '').slice(0, 7) === moisCourant()).length;

    document.getElementById('survEleves').textContent = eleves.length;
    document.getElementById('survAbsJour').textContent = abs;
    document.getElementById('survRetJour').textContent = retJour;
    document.getElementById('survSancMois').textContent = sancMois;

    const keys = Object.keys(absParClasse);
    document.getElementById('survAbsParClasse').innerHTML = keys.length === 0
        ? '<p style="color:#64748b;padding:1rem;">Aucune absence enregistrée à cette date.</p>'
        : `<table><thead><tr><th>Classe</th><th style="text-align:right;">Absents</th></tr></thead><tbody>${keys.map(k => `<tr><td style="font-weight:600;">${sEsc(k)}</td><td style="text-align:right;color:#dc3545;font-weight:600;">${absParClasse[k]}</td></tr>`).join('')}</tbody></table>`;

    const derniers = sanctions.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5);
    document.getElementById('survDernieresSanctions').innerHTML = derniers.length === 0
        ? '<p style="color:#64748b;padding:1rem;">Aucune sanction enregistrée.</p>'
        : `<table><thead><tr><th>Date</th><th>Élève</th><th>Type</th></tr></thead><tbody>${derniers.map(s => `<tr><td>${s.date ? new Date(s.date).toLocaleDateString('fr-FR') : '-'}</td><td style="font-weight:600;">${sEsc(eleveNom(s.eleveId))}</td><td>${sEsc(s.type)}</td></tr>`).join('')}</tbody></table>`;
}

// ---------- Appel / Absences ----------
function renderAppelControls() {
    const c = document.getElementById('appelClasse');
    if (!c.dataset.init) { c.innerHTML = classeOptions(''); c.dataset.init = '1'; }
    const d = document.getElementById('appelDate');
    if (!d.value) d.value = todayStr();
    document.getElementById('appelContent').innerHTML = '<p style="color:#64748b;padding:1rem;">Choisissez une classe et une date, puis cliquez sur « Faire l\'appel ».</p>';
}
function chargerAppel() {
    const classe = document.getElementById('appelClasse').value;
    const date = document.getElementById('appelDate').value;
    const box = document.getElementById('appelContent');
    if (!classe) { box.innerHTML = '<p style="color:#dc3545;padding:1rem;">Sélectionnez une classe.</p>'; return; }
    const list = eleves.filter(e => e.classe === classe);
    if (!list.length) { box.innerHTML = '<p style="color:#dc3545;padding:1rem;">Aucun élève dans cette classe.</p>'; return; }
    const rec = presences[`${date}|${classe}`] || {};
    box.innerHTML = `
        <div style="overflow-x:auto;"><table>
            <thead><tr><th>Élève</th><th style="text-align:center;">Statut</th></tr></thead>
            <tbody>${list.map(e => {
                const st = rec[e.id] || 'present';
                return `<tr><td style="font-weight:600;">${sEsc(e.nom)} ${sEsc(e.prenom)}</td>
                    <td style="text-align:center;"><select id="pres_${e.id}" style="margin:0;width:auto;">
                        <option value="present" ${st === 'present' ? 'selected' : ''}>✅ Présent</option>
                        <option value="absent" ${st === 'absent' ? 'selected' : ''}>❌ Absent</option>
                        <option value="justifie" ${st === 'justifie' ? 'selected' : ''}>📄 Absence justifiée</option>
                    </select></td></tr>`;
            }).join('')}</tbody>
        </table></div>`;
}
function saveAppel() {
    const classe = document.getElementById('appelClasse').value;
    const date = document.getElementById('appelDate').value;
    if (!classe) return;
    const list = eleves.filter(e => e.classe === classe);
    const rec = {};
    list.forEach(e => { const sel = document.getElementById(`pres_${e.id}`); if (sel) rec[e.id] = sel.value; });
    presences[`${date}|${classe}`] = rec;
    savePresences();
    const abs = Object.values(rec).filter(s => s === 'absent').length;
    const just = Object.values(rec).filter(s => s === 'justifie').length;
    alert(`Appel enregistré : ${abs} absent(s), ${just} justifié(s).`);
}

// ---------- Retards ----------
function renderRetards() {
    const sel = document.getElementById('retEleve');
    if (!sel.dataset.init || sel.dataset.count != eleves.length) { sel.innerHTML = eleveOptions(); sel.dataset.init = '1'; sel.dataset.count = eleves.length; }
    const d = document.getElementById('retDate');
    if (!d.value) d.value = todayStr();
    const tbody = document.getElementById('retardsTable');
    const list = retards.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    tbody.innerHTML = list.length === 0
        ? '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:#64748b;">Aucun retard enregistré.</td></tr>'
        : list.map(r => `<tr>
            <td>${r.date ? new Date(r.date).toLocaleDateString('fr-FR') : '-'}</td>
            <td style="font-weight:600;">${sEsc(eleveNom(r.eleveId))}</td>
            <td>${sEsc(eleveClasse(r.eleveId))}</td>
            <td>${sEsc(r.heure)} ${r.motif ? '— ' + sEsc(r.motif) : ''}</td>
            <td style="text-align:right;"><button class="btn btn-danger" style="padding:0.3rem 0.6rem;font-size:0.85rem;" onclick="deleteRetard('${r.id}')">🗑️</button></td>
        </tr>`).join('');
}
function addRetard() {
    const eleveId = document.getElementById('retEleve').value;
    if (!eleveId) { alert('Choisissez un élève.'); return; }
    retards.push({
        id: 'r' + Date.now(), eleveId: eleveId,
        date: document.getElementById('retDate').value || todayStr(),
        heure: document.getElementById('retHeure').value,
        motif: document.getElementById('retMotif').value.trim()
    });
    saveRetards();
    document.getElementById('retHeure').value = '';
    document.getElementById('retMotif').value = '';
    renderRetards();
}
function deleteRetard(id) {
    if (!confirm('Supprimer ce retard ?')) return;
    retards = retards.filter(x => x.id !== id);
    saveRetards(); renderRetards();
}

// ---------- Sanctions ----------
function renderSanctions() {
    const sel = document.getElementById('sancEleve');
    if (!sel.dataset.init || sel.dataset.count != eleves.length) { sel.innerHTML = eleveOptions(); sel.dataset.init = '1'; sel.dataset.count = eleves.length; }
    const t = document.getElementById('sancType');
    if (!t.innerHTML) t.innerHTML = TYPES_SANCTION.map(x => `<option>${x}</option>`).join('');
    const d = document.getElementById('sancDate');
    if (!d.value) d.value = todayStr();
    const tbody = document.getElementById('sanctionsTable');
    const list = sanctions.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    tbody.innerHTML = list.length === 0
        ? '<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:#64748b;">Aucune sanction enregistrée.</td></tr>'
        : list.map(s => `<tr>
            <td>${s.date ? new Date(s.date).toLocaleDateString('fr-FR') : '-'}</td>
            <td style="font-weight:600;">${sEsc(eleveNom(s.eleveId))}</td>
            <td>${sEsc(eleveClasse(s.eleveId))}</td>
            <td><span style="color:#dc3545;font-weight:600;">${sEsc(s.type)}</span></td>
            <td>${sEsc(s.motif)}${s.decisionPar ? '<br><span style="color:#64748b;font-size:0.85rem;">par ' + sEsc(s.decisionPar) + '</span>' : ''}</td>
            <td style="text-align:right;"><button class="btn btn-danger" style="padding:0.3rem 0.6rem;font-size:0.85rem;" onclick="deleteSanction('${s.id}')">🗑️</button></td>
        </tr>`).join('');
}
function addSanction() {
    const eleveId = document.getElementById('sancEleve').value;
    if (!eleveId) { alert('Choisissez un élève.'); return; }
    sanctions.push({
        id: 's' + Date.now(), eleveId: eleveId,
        date: document.getElementById('sancDate').value || todayStr(),
        type: document.getElementById('sancType').value,
        motif: document.getElementById('sancMotif').value.trim(),
        decisionPar: document.getElementById('sancPar').value.trim()
    });
    saveSanctions();
    document.getElementById('sancMotif').value = '';
    document.getElementById('sancPar').value = '';
    renderSanctions();
}
function deleteSanction(id) {
    if (!confirm('Supprimer cette sanction ?')) return;
    sanctions = sanctions.filter(x => x.id !== id);
    saveSanctions(); renderSanctions();
}

// ---------- Permissions ----------
function renderPermissions() {
    const sel = document.getElementById('permEleve');
    if (!sel.dataset.init || sel.dataset.count != eleves.length) { sel.innerHTML = eleveOptions(); sel.dataset.init = '1'; sel.dataset.count = eleves.length; }
    const d = document.getElementById('permDate');
    if (!d.value) d.value = todayStr();
    const tbody = document.getElementById('permissionsTable');
    const list = permissions.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    tbody.innerHTML = list.length === 0
        ? '<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:#64748b;">Aucune permission enregistrée.</td></tr>'
        : list.map(p => `<tr>
            <td>${p.date ? new Date(p.date).toLocaleDateString('fr-FR') : '-'}</td>
            <td style="font-weight:600;">${sEsc(eleveNom(p.eleveId))}</td>
            <td>${sEsc(eleveClasse(p.eleveId))}</td>
            <td>${sEsc(p.motif)}</td>
            <td>${sEsc(p.autorisePar)}${p.dateRetour ? '<br><span style="color:#64748b;font-size:0.85rem;">retour : ' + sEsc(p.dateRetour) + '</span>' : ''}</td>
            <td style="text-align:right;"><button class="btn btn-danger" style="padding:0.3rem 0.6rem;font-size:0.85rem;" onclick="deletePermission('${p.id}')">🗑️</button></td>
        </tr>`).join('');
}
function addPermission() {
    const eleveId = document.getElementById('permEleve').value;
    if (!eleveId) { alert('Choisissez un élève.'); return; }
    permissions.push({
        id: 'pm' + Date.now(), eleveId: eleveId,
        date: document.getElementById('permDate').value || todayStr(),
        motif: document.getElementById('permMotif').value.trim(),
        autorisePar: document.getElementById('permPar').value.trim(),
        dateRetour: document.getElementById('permRetour').value
    });
    savePermissions();
    document.getElementById('permMotif').value = '';
    document.getElementById('permPar').value = '';
    document.getElementById('permRetour').value = '';
    renderPermissions();
}
function deletePermission(id) {
    if (!confirm('Supprimer cette permission ?')) return;
    permissions = permissions.filter(x => x.id !== id);
    savePermissions(); renderPermissions();
}

// ---------- Reporting (assiduité & discipline) ----------
function renderSurvReporting() {
    const mEl = document.getElementById('repSurvMois');
    if (!mEl.value) mEl.value = moisCourant();
    const mois = mEl.value;

    let present = 0, absent = 0, justifie = 0;
    const absParClasse = {}, absParEleve = {};
    Object.keys(presences).forEach(k => {
        const parts = k.split('|');
        if (parts[0].slice(0, 7) !== mois) return;
        const classe = parts[1];
        const rec = presences[k];
        Object.keys(rec).forEach(eleveId => {
            const st = rec[eleveId];
            if (st === 'absent') { absent++; absParClasse[classe] = (absParClasse[classe] || 0) + 1; absParEleve[eleveId] = (absParEleve[eleveId] || 0) + 1; }
            else if (st === 'justifie') justifie++;
            else present++;
        });
    });
    const totalAppels = present + absent + justifie;
    const tauxPresence = totalAppels ? Math.round(present / totalAppels * 100) : null;

    const retMois = retards.filter(r => (r.date || '').slice(0, 7) === mois);
    const retParClasse = {};
    retMois.forEach(r => { const c = eleveClasse(r.eleveId) || '—'; retParClasse[c] = (retParClasse[c] || 0) + 1; });
    const sancMois = sanctions.filter(s => (s.date || '').slice(0, 7) === mois);
    const sancParType = {};
    TYPES_SANCTION.forEach(t => { sancParType[t] = 0; });
    sancMois.forEach(s => { sancParType[s.type] = (sancParType[s.type] || 0) + 1; });

    document.getElementById('repSurvPresence').textContent = tauxPresence === null ? '-' : tauxPresence + ' %';
    document.getElementById('repSurvAbsences').textContent = absent;
    document.getElementById('repSurvRetards').textContent = retMois.length;
    document.getElementById('repSurvSanctions').textContent = sancMois.length;

    // Tableau absences / retards par classe
    const classesNoms = classes.map(c => c.nom);
    document.getElementById('repSurvAbsClasse').innerHTML = `
        <table><thead><tr><th>Classe</th><th style="text-align:center;">Absences</th><th style="text-align:center;">Retards</th></tr></thead><tbody>
        ${classesNoms.map(c => `<tr><td style="font-weight:600;">${sEsc(c)}</td><td style="text-align:center;color:#dc3545;font-weight:600;">${absParClasse[c] || 0}</td><td style="text-align:center;color:#f59e0b;font-weight:600;">${retParClasse[c] || 0}</td></tr>`).join('')}
        <tr style="font-weight:700;border-top:2px solid #1B6BFF;"><td>TOTAL</td><td style="text-align:center;">${absent}</td><td style="text-align:center;">${retMois.length}</td></tr>
        </tbody></table>`;

    // Top élèves absentéistes
    const topAbs = Object.keys(absParEleve).map(id => ({ id, n: absParEleve[id] })).sort((a, b) => b.n - a.n).slice(0, 10);
    document.getElementById('repSurvTopAbs').innerHTML = topAbs.length === 0
        ? '<p style="color:#64748b;padding:1rem;">Aucune absence sur ce mois.</p>'
        : `<table><thead><tr><th>Élève</th><th>Classe</th><th style="text-align:right;">Absences</th></tr></thead><tbody>
        ${topAbs.map(x => `<tr><td style="font-weight:600;">${sEsc(eleveNom(x.id))}</td><td>${sEsc(eleveClasse(x.id))}</td><td style="text-align:right;color:#dc3545;font-weight:600;">${x.n}</td></tr>`).join('')}
        </tbody></table>`;

    if (typeof Chart === 'undefined') return;
    if (survChartAbs) survChartAbs.destroy();
    survChartAbs = new Chart(document.getElementById('repSurvChartAbs'), {
        type: 'bar',
        data: { labels: classesNoms, datasets: [
            { label: 'Absences', data: classesNoms.map(c => absParClasse[c] || 0), backgroundColor: 'rgba(220,53,69,0.8)' },
            { label: 'Retards', data: classesNoms.map(c => retParClasse[c] || 0), backgroundColor: 'rgba(245,158,11,0.8)' }
        ] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'top' } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
    });
    const typesNonNuls = TYPES_SANCTION.filter(t => sancParType[t] > 0);
    if (survChartSanctions) survChartSanctions.destroy();
    survChartSanctions = new Chart(document.getElementById('repSurvChartSanctions'), {
        type: 'doughnut',
        data: { labels: typesNonNuls.length ? typesNonNuls : ['Aucune sanction'], datasets: [{ data: typesNonNuls.length ? typesNonNuls.map(t => sancParType[t]) : [1], backgroundColor: ['#dc3545', '#f59e0b', '#8b5cf6', '#0ea5e9', '#ec4899', '#64748b'] }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom' } } }
    });
}

function exporterAssiduiteExcel() {
    if (typeof XLSX === 'undefined') { alert('Librairie Excel non chargée.'); return; }
    const mois = document.getElementById('repSurvMois').value || moisCourant();
    const absParClasse = {}, retParClasse = {};
    Object.keys(presences).forEach(k => {
        const parts = k.split('|'); if (parts[0].slice(0, 7) !== mois) return;
        Object.values(presences[k]).forEach(st => { if (st === 'absent') absParClasse[parts[1]] = (absParClasse[parts[1]] || 0) + 1; });
    });
    retards.filter(r => (r.date || '').slice(0, 7) === mois).forEach(r => { const c = eleveClasse(r.eleveId) || '—'; retParClasse[c] = (retParClasse[c] || 0) + 1; });
    const rows = classes.map(c => ({ Classe: c.nom, Absences: absParClasse[c.nom] || 0, Retards: retParClasse[c.nom] || 0 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Par classe');
    const sancRows = sanctions.filter(s => (s.date || '').slice(0, 7) === mois).map(s => ({ Date: s.date, Élève: eleveNom(s.eleveId), Classe: eleveClasse(s.eleveId), Type: s.type, Motif: s.motif }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sancRows.length ? sancRows : [{ Date: '', Élève: '', Classe: '', Type: '', Motif: '' }]), 'Sanctions');
    XLSX.writeFile(wb, 'assiduite_' + mois + '.xlsx');
}

// ---------- Démarrage ----------
window.addEventListener('hashchange', survRouteFromHash);
window.addEventListener('DOMContentLoaded', function () {
    loadSurv();
    survRouteFromHash();
});
