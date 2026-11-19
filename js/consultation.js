// ===== Espace Consultation parents / élèves (lecture seule) =====
const C_ELEVES = 'ecole_eleves', C_CLASSES = 'ecole_classes', C_MATIERES = 'ecole_matieres';
const C_NOTES = 'ecole_notes', C_PRESENCES = 'ecole_presences', C_RETARDS = 'ecole_retards';
const C_SANCTIONS = 'ecole_sanctions', C_APPR = 'ecole_appreciations', C_TRANS = 'digigespro_transactions';
const TRIMS = ['1er Trimestre', '2e Trimestre', '3e Trimestre'];

let cEleves = [], cClasses = [], cMatieres = [], cNotes = {}, cPresences = {}, cRetards = [], cSanctions = [], cAppr = {}, cTrans = [];
let currentEleve = null, currentTrim = TRIMS[0];

function cEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function getEcoleName() {
    try { const c = JSON.parse(localStorage.getItem('portail_config_v1')); if (c && c.name) return c.name; } catch (e) {}
    return localStorage.getItem('ecole_nom') || 'Établissement scolaire';
}
function loadConsult() {
    const j = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
    cEleves = j(C_ELEVES, []); cClasses = j(C_CLASSES, []); cMatieres = j(C_MATIERES, []); cNotes = j(C_NOTES, {});
    cPresences = j(C_PRESENCES, {}); cRetards = j(C_RETARDS, []); cSanctions = j(C_SANCTIONS, []);
    cAppr = j(C_APPR, {}); cTrans = j(C_TRANS, []);
}

// ---- calculs (compatibles double note devoir/composition) ----
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
function noteMatiere(eleveId, matiereId, trim) { return noteVal(cNotes[`${eleveId}|${matiereId}|${trim}`]); }
function moyenneEleve(eleveId, trim) {
    let sw = 0, sc = 0;
    cMatieres.forEach(m => { const v = noteMatiere(eleveId, m.id, trim); if (v !== null) { const c = parseFloat(m.coefficient) || 1; sw += v * c; sc += c; } });
    return sc > 0 ? sw / sc : null;
}
function moyenneAnnuelle(eleveId) {
    const ms = TRIMS.map(t => moyenneEleve(eleveId, t)).filter(m => m !== null);
    return ms.length ? ms.reduce((s, m) => s + m, 0) / ms.length : null;
}
function classement(classe, trim) {
    const list = cEleves.filter(e => e.classe === classe).map(e => ({ id: e.id, moy: moyenneEleve(e.id, trim) })).filter(x => x.moy !== null).sort((a, b) => b.moy - a.moy);
    const rang = {}; list.forEach((x, i) => rang[x.id] = i + 1); return { rang, effectif: list.length };
}
function mentionFor(m, scale) {
    if (m === null) return '-';
    if ((scale || 20) === 10) {
        if (m >= 9) return 'Excellent'; if (m >= 8) return 'Très bien'; if (m >= 7) return 'Bien';
        if (m >= 6) return 'Assez bien'; if (m >= 5) return 'Passable'; return 'Insuffisant';
    }
    if (m >= 18) return 'Excellent'; if (m >= 16) return 'Très bien'; if (m >= 14) return 'Bien';
    if (m >= 12) return 'Assez bien'; if (m >= 10) return 'Passable'; return 'Insuffisant';
}
function fmtMoy(m, scale) { return m === null ? '-' : m.toFixed(2) + '/' + (scale || 20); }
function cClasseCycle(nom) { const c = (cClasses || []).find(x => x.nom === nom); return (c && c.cycle === 'primaire') ? 'primaire' : 'secondaire'; }
function cScale(nom) { return cClasseCycle(nom) === 'primaire' ? 10 : 20; }
function cNiveauParNom(nom) {
    const n = String(nom || '').toLowerCase().replace(/\s+/g, '');
    if (['6e', '6è', '5e', '5è', '4e', '4è', '3e', '3è'].some(k => n.startsWith(k))) return 'college';
    if (['2nd', '2de', 'seconde', '1e', '1è', '1re', 'premiere', 'première', 'terminale', 'tle', 'tale'].some(k => n.startsWith(k))) return 'lycee';
    return 'secondaire';
}
function cClasseType(nom) {
    const c = (cClasses || []).find(x => x.nom === nom);
    if (c && c.type) return c.type;
    if (c && c.cycle === 'primaire') return 'primaire';
    const lvl = cNiveauParNom(nom);
    if (lvl === 'college') return 'college_general';
    if (lvl === 'lycee') return 'lycee_general';
    return 'secondaire';
}
function cFilieresVisibles(type) {
    if (type === 'college_general') return ['commun_college', 'college_general'];
    if (type === 'college_technique') return ['commun_college', 'college_technique'];
    if (type === 'lycee_general') return ['commun_lycee', 'lycee_general'];
    if (type === 'lycee_technique') return ['commun_lycee', 'lycee_technique'];
    return [];
}
function cMatieresClasse(nom) {
    const t = cClasseType(nom);
    if (t === 'primaire') return cMatieres.filter(m => m.cycle === 'primaire');
    if (t === 'secondaire') return cMatieres.filter(m => m.cycle !== 'primaire');
    return cMatieres.filter(m => { if (m.cycle === 'primaire') return false; const f = m.filiere || ''; return f === '' || f === 'commun' || cFilieresVisibles(t).indexOf(f) >= 0; });
}
function fmtFCFA(n) { return Math.round(n || 0).toLocaleString('fr-FR') + ' FCFA'; }

// ---- assiduité & frais ----
function statsAssiduite(e) {
    let abs = 0, justif = 0;
    Object.keys(cPresences).forEach(k => {
        const v = cPresences[k] && cPresences[k][e.id];
        if (v === 'absent') abs++; else if (v === 'justifie') justif++;
    });
    const ret = cRetards.filter(r => r.eleveId === e.id).length;
    const san = cSanctions.filter(s => s.eleveId === e.id).length;
    return { abs, justif, ret, san };
}
function fraisEleve(e) {
    const tx = cTrans.filter(t => t.type !== 'depense' && (t.studentId === e.id || (e.matricule && t.studentMatricule === e.matricule)));
    const total = tx.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
    return { total, tx };
}

// ---- recherche ----
function rechercher() {
    const q = (document.getElementById('cSearch').value || '').trim().toLowerCase();
    const box = document.getElementById('cResult');
    if (!q) { box.innerHTML = '<p style="color:var(--muted,#64748b);padding:1rem;">Saisissez un matricule ou un nom.</p>'; return; }
    const found = cEleves.filter(e =>
        (e.matricule || '').toLowerCase() === q ||
        (`${e.nom} ${e.prenom}`).toLowerCase().includes(q) ||
        (`${e.prenom} ${e.nom}`).toLowerCase().includes(q)
    );
    if (!found.length) { box.innerHTML = '<div class="card"><p style="color:var(--danger,#dc3545);margin:0;">Aucun élève trouvé pour « ' + cEsc(q) + ' ».</p></div>'; return; }
    if (found.length > 1) {
        box.innerHTML = '<div class="card"><p style="font-weight:600;margin-bottom:0.75rem;">Plusieurs élèves correspondent :</p>' +
            found.map(e => `<button class="btn btn-secondary" style="margin:0.25rem;" onclick="afficherEleve('${e.id}')">${cEsc(e.nom)} ${cEsc(e.prenom)} — ${cEsc(e.classe)} (${cEsc(e.matricule || '')})</button>`).join('') + '</div>';
        return;
    }
    afficherEleve(found[0].id);
}
function afficherEleve(id) {
    currentEleve = cEleves.find(e => e.id === id);
    if (!currentEleve) return;
    renderEleve();
}
function changerTrim() { currentTrim = document.getElementById('cTrim').value || TRIMS[0]; renderEleve(); }
function renderEleve() {
    const e = currentEleve; if (!e) return;
    const trim = currentTrim;
    const moy = moyenneEleve(e.id, trim);
    const { rang, effectif } = classement(e.classe, trim);
    const stats = statsAssiduite(e);
    const frais = fraisEleve(e);
    const appr = cAppr[`${e.id}|${trim}`] || {};
    const scale = cScale(e.classe);
    const lignes = cMatieresClasse(e.classe).map(m => {
        const n = noteMatiere(e.id, m.id, trim);
        return `<tr><td>${cEsc(m.nom)}</td><td style="text-align:center;">${cEsc(String(m.coefficient || 1))}</td><td style="text-align:center;font-weight:600;">${n !== null ? n.toFixed(2) : '-'}</td><td>${n !== null ? mentionFor(n, scale) : ''}</td></tr>`;
    }).join('');
    document.getElementById('cResult').innerHTML = `
        <div class="card" style="border-left:4px solid #2E2769;">
            <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:0.5rem;align-items:center;">
                <div style="display:flex;align-items:center;gap:0.85rem;">
                    ${e.photo ? `<img src="${e.photo}" alt="" style="width:54px;height:68px;object-fit:cover;border-radius:6px;border:1px solid #cbd5e1;">` : ''}
                    <div>
                        <h2 style="font-size:1.3rem;font-weight:700;margin:0;">${cEsc(e.nom)} ${cEsc(e.prenom)}</h2>
                        <p style="color:var(--muted,#64748b);margin:0.25rem 0 0;">Classe ${cEsc(e.classe)} · Matricule ${cEsc(e.matricule || '-')} · ${cEsc(e.anneeScolaire || '')}</p>
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:0.5rem;">
                    <label style="font-weight:600;margin:0;">Trimestre :</label>
                    <select id="cTrim" onchange="changerTrim()" style="width:auto;margin:0;">${TRIMS.map(t => `<option ${t === trim ? 'selected' : ''}>${t}</option>`).join('')}</select>
                </div>
            </div>
        </div>
        <div class="card">
            <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:0.75rem;">Résultats — ${cEsc(trim)}</h3>
            <div style="overflow-x:auto;"><table>
                <thead><tr><th>Matière</th><th style="text-align:center;">Coef</th><th style="text-align:center;">Note /${scale}</th><th>Mention</th></tr></thead>
                <tbody>${lignes || '<tr><td colspan="4" style="text-align:center;color:var(--muted,#64748b);">Aucune matière</td></tr>'}</tbody>
            </table></div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0.75rem;margin-top:1rem;">
                ${kpi('Moyenne', fmtMoy(moy, scale))}
                ${kpi('Rang', moy !== null ? rang[e.id] + ' / ' + effectif : '-')}
                ${kpi('Mention', mentionFor(moy, scale))}
                ${kpi('Moyenne annuelle', fmtMoy(moyenneAnnuelle(e.id), scale))}
            </div>
            ${appr.decision || appr.appreciation ? `<div style="margin-top:1rem;background:var(--surface-2,#f8fafc);border:1px solid #e2e8f0;border-radius:8px;padding:0.75rem;">
                ${appr.decision ? `<div><strong>Décision du conseil :</strong> ${cEsc(appr.decision)}</div>` : ''}
                ${appr.conduite ? `<div><strong>Conduite :</strong> ${cEsc(appr.conduite)}</div>` : ''}
                ${appr.appreciation ? `<div><strong>Appréciation :</strong> ${cEsc(appr.appreciation)}</div>` : ''}
            </div>` : ''}
        </div>
        <div class="card">
            <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:0.75rem;">Assiduité & discipline</h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0.75rem;">
                ${kpi('Absences', stats.abs, '#dc3545')}
                ${kpi('Absences justifiées', stats.justif, '#0ea5e9')}
                ${kpi('Retards', stats.ret, '#f59e0b')}
                ${kpi('Sanctions', stats.san, '#dc3545')}
            </div>
        </div>
        <div class="card">
            <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:0.75rem;">Frais scolaires</h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:0.75rem;margin-bottom:1rem;">
                ${kpi('Total versé', fmtFCFA(frais.total), '#16a34a')}
                ${kpi('Nombre de paiements', frais.tx.length)}
            </div>
            ${frais.tx.length ? `<div style="overflow-x:auto;"><table>
                <thead><tr><th>Date</th><th>Type</th><th style="text-align:right;">Montant</th></tr></thead>
                <tbody>${frais.tx.slice(0, 20).map(t => `<tr><td>${t.date ? new Date(t.date).toLocaleDateString('fr-FR') : '-'}</td><td>${cEsc(t.type || '')}</td><td style="text-align:right;">${fmtFCFA(parseFloat(t.amount) || 0)}</td></tr>`).join('')}</tbody>
            </table></div>` : '<p style="color:var(--muted,#64748b);margin:0;">Aucun paiement enregistré.</p>'}
        </div>`;
}
function kpi(label, value, color) {
    return `<div style="background:var(--surface-2,#f8fafc);border:1px solid #e2e8f0;border-radius:10px;padding:0.85rem;text-align:center;">
        <div style="font-size:1.35rem;font-weight:700;color:${color || '#2E2769'};">${value}</div>
        <div style="font-size:0.8rem;color:var(--muted,#64748b);">${label}</div></div>`;
}

document.addEventListener('DOMContentLoaded', () => {
    loadConsult();
    document.getElementById('cEcole').textContent = getEcoleName();
    const inp = document.getElementById('cSearch');
    inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') rechercher(); });
});
