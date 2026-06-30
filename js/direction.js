// ===== Direction générale — pilotage de l'établissement =====
const ELEVES_KEY = 'ecole_eleves';
const CLASSES_KEY = 'ecole_classes';
const MATIERES_KEY = 'ecole_matieres';
const NOTES_KEY = 'ecole_notes';
const PRESENCES_KEY = 'ecole_presences';
const RETARDS_KEY = 'ecole_retards';
const SANCTIONS_KEY = 'ecole_sanctions';
const ENSEIGNANTS_KEY = 'ecole_enseignants';
const TRANS_KEY = 'digigespro_transactions';
const EMPLOYES_KEY = 'digigespro_employees';
const PERSONNEL_KEY = 'ecole_personnel';
const DECISIONS_KEY = 'ecole_decisions';
const CONSEILS_KEY = 'ecole_conseils';

let eleves = [], classes = [], matieres = [], notes = {}, presences = {}, retards = [], sanctions = [], enseignants = [];
let transactions = [], employes = [], personnel = [], decisions = [], conseils = [];
let editPersonnelId = null;

const TRIMESTRES = ['1er Trimestre', '2e Trimestre', '3e Trimestre'];
const DIR_SECTIONS = {
    dashboard: { titre: 'Tableau de bord global', icone: 'bi-speedometer2' },
    personnel: { titre: 'Personnel',              icone: 'bi-people-fill' },
    decisions: { titre: 'Décisions & circulaires', icone: 'bi-megaphone' },
    conseil:   { titre: 'Conseil de gestion',     icone: 'bi-people' },
    recouvrement: { titre: 'Recouvrement / Impayés', icone: 'bi-cash-stack' },
    sauvegarde:{ titre: 'Sauvegarde / Restauration', icone: 'bi-database' }
};
const FRAIS_KEY = 'ecole_frais_config';
let fraisConfig = {};
const TYPES_DECISION = ['Décision', 'Circulaire', 'Note de service'];

function dEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function dAttr(s) { return dEsc(s).replace(/"/g, '&quot;'); }
function todayStr() { return new Date().toISOString().split('T')[0]; }
function moisCourant() { return new Date().toISOString().slice(0, 7); }
function anneeCourante() { return String(new Date().getFullYear()); }
function fmtFCFA(n) { return Math.round(n || 0).toLocaleString('fr-FR') + ' FCFA'; }
function getEcoleName() {
    try { const c = JSON.parse(localStorage.getItem('portail_config_v1')); if (c && c.name) return c.name; } catch (e) {}
    return localStorage.getItem('ecole_nom') || 'Établissement scolaire';
}

function loadDir() {
    const j = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) || def; } catch (e) { return def; } };
    eleves = j(ELEVES_KEY, []); classes = j(CLASSES_KEY, []); matieres = j(MATIERES_KEY, []);
    notes = j(NOTES_KEY, {}); presences = j(PRESENCES_KEY, {}); retards = j(RETARDS_KEY, []);
    sanctions = j(SANCTIONS_KEY, []); enseignants = j(ENSEIGNANTS_KEY, []);
    transactions = j(TRANS_KEY, []); employes = j(EMPLOYES_KEY, []);
    personnel = j(PERSONNEL_KEY, []); decisions = j(DECISIONS_KEY, []); conseils = j(CONSEILS_KEY, []);
    fraisConfig = j(FRAIS_KEY, {});
}
function persistPersonnel() { localStorage.setItem(PERSONNEL_KEY, JSON.stringify(personnel)); }

// ---------- Recouvrement / Impayés ----------
function saveFraisConfig() { localStorage.setItem(FRAIS_KEY, JSON.stringify(fraisConfig)); }
function payeEleve(e) {
    return transactions.filter(t => t.type !== 'depense' && (t.studentId === e.id || (e.matricule && t.studentMatricule === e.matricule)))
        .reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
}
function renderRecouvrement() {
    // Grille des frais attendus par classe
    const cfgBox = document.getElementById('fraisConfigBox');
    if (cfgBox) cfgBox.innerHTML = classes.map(c => `
        <div style="display:flex;align-items:center;gap:0.5rem;">
            <label style="flex:1;font-weight:600;margin:0;">${dEsc(c.nom)}</label>
            <input type="number" min="0" step="1000" value="${fraisConfig[c.nom] || ''}" placeholder="0" onchange="setFrais('${dAttr(c.nom)}', this.value)" style="width:130px;margin:0;"> <span style="color:#64748b;">FCFA / an</span>
        </div>`).join('') || '<p style="color:#64748b;">Ajoutez d\'abord des classes.</p>';

    const filtre = document.getElementById('recClasse');
    if (filtre && !filtre.dataset.init) { filtre.innerHTML = '<option value="">Toutes les classes</option>' + classes.map(c => `<option value="${dAttr(c.nom)}">${dEsc(c.nom)}</option>`).join(''); filtre.dataset.init = '1'; }
    const fclasse = filtre ? filtre.value : '';
    const seulImpayes = document.getElementById('recImpayes') && document.getElementById('recImpayes').checked;

    let list = (fclasse ? eleves.filter(e => e.classe === fclasse) : eleves).slice();
    let totAttendu = 0, totPaye = 0;
    const rows = list.map(e => {
        const attendu = parseFloat(fraisConfig[e.classe]) || 0;
        const paye = payeEleve(e);
        const reste = Math.max(0, attendu - paye);
        totAttendu += attendu; totPaye += paye;
        return { e, attendu, paye, reste };
    }).filter(r => !seulImpayes || r.reste > 0)
      .sort((a, b) => b.reste - a.reste);

    const totReste = Math.max(0, totAttendu - totPaye);
    const taux = totAttendu > 0 ? Math.round(totPaye / totAttendu * 100) : 0;
    const kbox = document.getElementById('recKpis');
    if (kbox) kbox.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0.75rem;">
            ${dirKpi('Attendu', fmtFCFA(totAttendu))}
            ${dirKpi('Recouvré', fmtFCFA(totPaye), '#16a34a')}
            ${dirKpi('Reste à recouvrer', fmtFCFA(totReste), '#dc3545')}
            ${dirKpi('Taux de recouvrement', taux + ' %', '#0ea5e9')}
        </div>`;

    const tbody = document.getElementById('recTable');
    if (tbody) tbody.innerHTML = rows.length === 0
        ? '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:#64748b;">Aucune donnée. Renseignez les frais par classe ci-dessus.</td></tr>'
        : rows.map(r => `<tr>
            <td style="font-weight:600;">${dEsc(r.e.nom)} ${dEsc(r.e.prenom)}</td>
            <td>${dEsc(r.e.classe)}</td>
            <td style="text-align:right;">${fmtFCFA(r.attendu)}</td>
            <td style="text-align:right;color:#16a34a;">${fmtFCFA(r.paye)}</td>
            <td style="text-align:right;font-weight:700;color:${r.reste > 0 ? '#dc3545' : '#16a34a'};">${fmtFCFA(r.reste)}</td>
        </tr>`).join('');
}
function dirKpi(label, value, color) {
    return `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:0.85rem;text-align:center;">
        <div style="font-size:1.25rem;font-weight:700;color:${color || '#2E2769'};">${value}</div>
        <div style="font-size:0.8rem;color:#64748b;">${label}</div></div>`;
}
function setFrais(classe, val) {
    const n = parseFloat(val);
    if (!val || isNaN(n) || n <= 0) delete fraisConfig[classe];
    else fraisConfig[classe] = n;
    saveFraisConfig();
    renderRecouvrement();
}

// ---------- Carte professionnelle ----------
function genererCartePersonnel(id) {
    const p = personnel.find(x => x.id === id); if (!p) return;
    const ecole = getEcoleName();
    const html = `
    <div style="width:340px;height:215px;border:2px solid #2E2769;border-radius:12px;font-family:Arial,sans-serif;color:#111;margin:8px auto;overflow:hidden;">
        <div style="background:#2E2769;color:#fff;padding:6px 10px;text-align:center;">
            <div style="font-size:0.62rem;letter-spacing:0.5px;">RÉPUBLIQUE DU CONGO &ndash; Unité, Travail, Progrès</div>
            <div style="font-weight:bold;font-size:0.82rem;text-transform:uppercase;line-height:1.1;">${dEsc(ecole)}</div>
            <div style="font-size:0.68rem;letter-spacing:2px;">CARTE PROFESSIONNELLE</div>
        </div>
        <div style="display:flex;padding:8px 10px;gap:10px;">
            <div style="width:74px;height:92px;border:1px solid #999;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:0.6rem;flex-shrink:0;">PHOTO</div>
            <div style="font-size:0.76rem;line-height:1.6;">
                <div><strong>${dEsc(p.nom)} ${dEsc(p.prenom)}</strong></div>
                <div>Fonction : ${dEsc(p.fonction || '-')}</div>
                <div>Statut : ${dEsc(p.statut || '-')}</div>
                ${p.telephone ? `<div>Tél : ${dEsc(p.telephone)}</div>` : ''}
                <div>Année : ${anneeCourante()}</div>
            </div>
        </div>
        <div style="text-align:right;padding:0 10px;font-size:0.6rem;color:#555;">Le Directeur ____________</div>
    </div>`;
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Carte - ${dEsc(p.nom)}</title></head><body style="text-align:center;">${html}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
}

// ---------- Sauvegarde / Restauration ----------
function collecterDonnees() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (/^(ecole_|digigespro_|portail_config)/.test(k)) data[k] = localStorage.getItem(k);
    }
    return data;
}
function compterEntrees(raw) {
    try { const v = JSON.parse(raw); return Array.isArray(v) ? v.length : (v && typeof v === 'object' ? Object.keys(v).length : (raw ? 1 : 0)); } catch (e) { return raw ? 1 : 0; }
}
function renderSauvegarde() {
    const el = (k) => localStorage.getItem(k) || '';
    const box = document.getElementById('sauvegardeStats');
    if (box) box.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:0.75rem;">
            ${[['Élèves', 'ecole_eleves'], ['Notes', 'ecole_notes'], ['Personnel', 'ecole_personnel'], ['Transactions', 'digigespro_transactions'], ['Sanctions', 'ecole_sanctions'], ['Convocations', 'ecole_convocations']]
                .map(([lbl, k]) => `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:0.75rem;text-align:center;"><div style="font-size:1.4rem;font-weight:700;color:#2E2769;">${compterEntrees(el(k))}</div><div style="font-size:0.8rem;color:#64748b;">${lbl}</div></div>`).join('')}
        </div>`;
}
function exporterSauvegarde() {
    const payload = { _meta: { app: 'Portail de gestion scolaire', pays: 'République du Congo', date: new Date().toISOString() }, data: collecterDonnees() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sauvegarde_ecole_${todayStr()}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
function importerSauvegarde(evt) {
    const file = evt.target.files && evt.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
        try {
            const parsed = JSON.parse(ev.target.result);
            const data = parsed.data || parsed;
            if (!data || typeof data !== 'object') throw new Error('format');
            const keys = Object.keys(data).filter(k => /^(ecole_|digigespro_|portail_config)/.test(k));
            if (!keys.length) throw new Error('vide');
            if (!confirm('Restaurer cette sauvegarde ? Les données actuelles seront remplacées par celles du fichier.')) { evt.target.value = ''; return; }
            keys.forEach(k => localStorage.setItem(k, data[k]));
            alert('Sauvegarde restaurée avec succès. La page va se recharger.');
            window.location.reload();
        } catch (e) { alert('Fichier de sauvegarde invalide ou illisible.'); }
        evt.target.value = '';
    };
    reader.readAsText(file);
}
function persistDecisions() { localStorage.setItem(DECISIONS_KEY, JSON.stringify(decisions)); }
function persistConseils() { localStorage.setItem(CONSEILS_KEY, JSON.stringify(conseils)); }

// ---------- Navigation ----------
function showSection(name) {
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    const sec = document.getElementById('sec-' + name);
    if (!sec) return;
    sec.classList.remove('hidden');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const btn = document.querySelector('.tab[data-tab="' + name + '"]');
    if (btn) btn.classList.add('active');
    const info = DIR_SECTIONS[name];
    if (info) {
        document.getElementById('moduleTitle').textContent = info.titre;
        document.getElementById('moduleIcon').className = 'bi ' + info.icone;
    }
    if (name === 'dashboard') renderDashboard();
    if (name === 'personnel') renderPersonnel();
    if (name === 'decisions') renderDecisions();
    if (name === 'conseil') renderConseils();
    if (name === 'sauvegarde') renderSauvegarde();
    if (name === 'recouvrement') renderRecouvrement();
    if (window.location.hash !== '#' + name) window.location.hash = name;
}
function dirRouteFromHash() {
    const h = (window.location.hash || '').replace(/^#/, '');
    showSection(DIR_SECTIONS[h] ? h : 'dashboard');
}
function toggleSidebar() {
    const sb = document.getElementById('sidebar');
    const collapsed = sb.classList.toggle('collapsed');
    document.getElementById('sidebarToggleIcon').className = collapsed ? 'bi bi-list' : 'bi bi-chevron-left';
}
function logout() { window.location.href = 'portail.html'; }

function noteValDir(v) {
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
function moyenneEleveDir(eleveId, trimestre) {
    let sumWN = 0, sumC = 0;
    matieres.forEach(m => {
        const val = noteValDir(notes[`${eleveId}|${m.id}|${trimestre}`]);
        if (val !== null) {
            const c = parseFloat(m.coefficient) || 1;
            sumWN += val * c; sumC += c;
        }
    });
    return sumC > 0 ? sumWN / sumC : null;
}

// ---------- Tableau de bord global ----------
function renderDashboard() {
    // Effectifs
    const total = eleves.length;
    document.getElementById('dgTotal').textContent = total;
    document.getElementById('dgGarcons').textContent = eleves.filter(e => e.sexe === 'M').length;
    document.getElementById('dgFilles').textContent = eleves.filter(e => e.sexe === 'F').length;

    // Résultats
    const tSel = document.getElementById('dgTrimestre');
    if (!tSel.innerHTML) tSel.innerHTML = TRIMESTRES.map(t => `<option>${t}</option>`).join('');
    const trim = tSel.value || TRIMESTRES[0];
    const moys = eleves.map(e => moyenneEleveDir(e.id, trim)).filter(m => m !== null);
    const moyEcole = moys.length ? moys.reduce((s, m) => s + m, 0) / moys.length : null;
    const reussite = moys.length ? Math.round(moys.filter(m => m >= 10).length / moys.length * 100) : 0;
    document.getElementById('dgMoyenne').textContent = moyEcole === null ? '-' : moyEcole.toFixed(2) + '/20';
    document.getElementById('dgReussite').textContent = moys.length ? reussite + ' %' : '-';

    // Vie scolaire (mois courant)
    let absMois = 0;
    Object.keys(presences).forEach(k => {
        if (k.split('|')[0].slice(0, 7) !== moisCourant()) return;
        Object.values(presences[k]).forEach(st => { if (st === 'absent') absMois++; });
    });
    document.getElementById('dgAbsences').textContent = absMois;
    document.getElementById('dgRetards').textContent = retards.filter(r => (r.date || '').slice(0, 7) === moisCourant()).length;
    document.getElementById('dgSanctions').textContent = sanctions.filter(s => (s.date || '').slice(0, 7) === moisCourant()).length;

    // Finances (année courante)
    const an = anneeCourante();
    const txAn = transactions.filter(t => (t.date || '').slice(0, 4) === an);
    const recettes = txAn.filter(t => t.type !== 'depense').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
    const depenses = txAn.filter(t => t.type === 'depense').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
    const masse = employes.reduce((s, e) => s + (parseFloat(e.salaire) || 0), 0);
    document.getElementById('dgRecettes').textContent = fmtFCFA(recettes);
    document.getElementById('dgDepenses').textContent = fmtFCFA(depenses);
    const resEl = document.getElementById('dgResultat');
    resEl.textContent = fmtFCFA(recettes - depenses);
    resEl.style.color = (recettes - depenses) >= 0 ? '#16a34a' : '#dc3545';
    document.getElementById('dgMasse').textContent = fmtFCFA(masse);

    // Personnel
    document.getElementById('dgEnseignants').textContent = enseignants.length;
    document.getElementById('dgPersonnel').textContent = personnel.length;

    // Effectifs par classe
    document.getElementById('dgParClasse').innerHTML = classes.length === 0
        ? '<p style="color:#64748b;padding:1rem;">Aucune classe enregistrée.</p>'
        : `<table><thead><tr><th>Classe</th><th style="text-align:center;">Effectif</th><th style="text-align:right;">Moyenne (${dEsc(trim)})</th></tr></thead><tbody>${classes.map(c => {
            const eff = eleves.filter(e => e.classe === c.nom).length;
            const cm = eleves.filter(e => e.classe === c.nom).map(e => moyenneEleveDir(e.id, trim)).filter(m => m !== null);
            const avg = cm.length ? (cm.reduce((s, m) => s + m, 0) / cm.length).toFixed(2) + '/20' : '-';
            return `<tr><td style="font-weight:600;">${dEsc(c.nom)}</td><td style="text-align:center;">${eff}</td><td style="text-align:right;font-weight:600;">${avg}</td></tr>`;
        }).join('')}<tr style="font-weight:700;border-top:2px solid #1B6BFF;"><td>TOTAL</td><td style="text-align:center;">${total}</td><td style="text-align:right;">${moyEcole === null ? '-' : moyEcole.toFixed(2) + '/20'}</td></tr></tbody></table>`;
}

// ---------- Personnel ----------
function renderPersonnel() {
    const tbody = document.getElementById('personnelTable');
    tbody.innerHTML = personnel.length === 0
        ? '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:#64748b;">Aucun membre du personnel enregistré.</td></tr>'
        : personnel.map(p => `<tr>
            <td style="font-weight:600;">${dEsc(p.nom)} ${dEsc(p.prenom)}</td>
            <td>${dEsc(p.fonction)}</td>
            <td>${dEsc(p.telephone)}</td>
            <td>${dEsc(p.statut)}</td>
            <td style="text-align:right;white-space:nowrap;">
                <button class="btn btn-primary" style="padding:0.3rem 0.6rem;font-size:0.85rem;" title="Carte professionnelle" onclick="genererCartePersonnel('${p.id}')"><i class="bi bi-person-vcard"></i></button>
                <button class="btn btn-secondary" style="padding:0.3rem 0.6rem;font-size:0.85rem;" onclick="editPersonnel('${p.id}')">✏️</button>
                <button class="btn btn-danger" style="padding:0.3rem 0.6rem;font-size:0.85rem;" onclick="deletePersonnel('${p.id}')">🗑️</button>
            </td></tr>`).join('');
}
function addOrUpdatePersonnel() {
    const nom = document.getElementById('pNom').value.trim();
    if (!nom) { alert('Le nom est obligatoire.'); return; }
    const data = {
        nom: nom,
        prenom: document.getElementById('pPrenom').value.trim(),
        fonction: document.getElementById('pFonction').value.trim(),
        telephone: document.getElementById('pTel').value.trim(),
        statut: document.getElementById('pStatut').value
    };
    if (editPersonnelId) {
        Object.assign(personnel.find(x => x.id === editPersonnelId), data);
        editPersonnelId = null;
        document.getElementById('pBtn').textContent = '➕ Ajouter';
    } else {
        data.id = 'pe' + Date.now();
        personnel.push(data);
    }
    persistPersonnel();
    ['pNom', 'pPrenom', 'pFonction', 'pTel'].forEach(i => document.getElementById(i).value = '');
    renderPersonnel();
}
function editPersonnel(id) {
    const p = personnel.find(x => x.id === id); if (!p) return;
    editPersonnelId = id;
    document.getElementById('pNom').value = p.nom || '';
    document.getElementById('pPrenom').value = p.prenom || '';
    document.getElementById('pFonction').value = p.fonction || '';
    document.getElementById('pTel').value = p.telephone || '';
    document.getElementById('pStatut').value = p.statut || 'Actif';
    document.getElementById('pBtn').textContent = '✓ Modifier';
}
function deletePersonnel(id) {
    if (!confirm('Supprimer ce membre du personnel ?')) return;
    personnel = personnel.filter(x => x.id !== id);
    persistPersonnel(); renderPersonnel();
}

// ---------- Décisions & circulaires ----------
function renderDecisions() {
    const t = document.getElementById('decType');
    if (!t.innerHTML) t.innerHTML = TYPES_DECISION.map(x => `<option>${x}</option>`).join('');
    const d = document.getElementById('decDate');
    if (!d.value) d.value = todayStr();
    const tbody = document.getElementById('decisionsTable');
    const list = decisions.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    tbody.innerHTML = list.length === 0
        ? '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:#64748b;">Aucune décision enregistrée.</td></tr>'
        : list.map(x => `<tr>
            <td style="font-weight:600;">${dEsc(x.numero)}</td>
            <td>${x.date ? new Date(x.date).toLocaleDateString('fr-FR') : '-'}</td>
            <td>${dEsc(x.type)}</td>
            <td>${dEsc(x.objet)}</td>
            <td style="text-align:right;white-space:nowrap;">
                <button class="btn btn-primary" style="padding:0.3rem 0.6rem;font-size:0.85rem;" onclick="genererDecision('${x.id}')"><i class="bi bi-printer"></i></button>
                <button class="btn btn-danger" style="padding:0.3rem 0.6rem;font-size:0.85rem;" onclick="deleteDecision('${x.id}')">🗑️</button>
            </td></tr>`).join('');
}
function addDecision() {
    const objet = document.getElementById('decObjet').value.trim();
    const contenu = document.getElementById('decContenu').value.trim();
    if (!objet || !contenu) { alert('Objet et contenu obligatoires.'); return; }
    const date = document.getElementById('decDate').value || todayStr();
    const year = date.slice(0, 4);
    const type = document.getElementById('decType').value;
    const seq = decisions.filter(x => (x.date || '').slice(0, 4) === year && x.type === type).length + 1;
    const prefix = type === 'Circulaire' ? 'C' : (type === 'Note de service' ? 'NS' : 'D');
    decisions.push({
        id: 'dec' + Date.now(),
        numero: `${prefix}-${String(seq).padStart(3, '0')}/${year}`,
        type: type, date: date, objet: objet, contenu: contenu
    });
    persistDecisions();
    ['decObjet', 'decContenu'].forEach(i => document.getElementById(i).value = '');
    renderDecisions();
}
function deleteDecision(id) {
    if (!confirm('Supprimer ?')) return;
    decisions = decisions.filter(x => x.id !== id);
    persistDecisions(); renderDecisions();
}
function genererDecision(id) {
    const x = decisions.find(d => d.id === id); if (!x) return;
    const ecole = getEcoleName();
    const html = `
        <div style="font-family:Arial,sans-serif;max-width:780px;margin:0 auto;padding:2.5rem;color:#111;">
            <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:0.75rem;margin-bottom:1.5rem;">
                <p style="margin:0;font-size:0.85rem;">RÉPUBLIQUE DU CONGO &nbsp;–&nbsp; Unité, Travail, Progrès<br>Ministère de l'Enseignement Préscolaire, Primaire, Secondaire et de l'Alphabétisation</p>
                <h2 style="margin:0.4rem 0 0;text-transform:uppercase;">${dEsc(ecole)}</h2>
            </div>
            <p style="text-align:right;margin:0 0 1rem;">Le ${x.date ? new Date(x.date).toLocaleDateString('fr-FR') : ''}</p>
            <h1 style="text-align:center;font-size:1.3rem;letter-spacing:1px;margin:1rem 0 0.25rem;text-transform:uppercase;">${dEsc(x.type)}</h1>
            <p style="text-align:center;font-weight:bold;margin:0 0 1.5rem;">${dEsc(x.numero)}</p>
            <p style="margin:0.5rem 0;"><strong>Objet :</strong> ${dEsc(x.objet)}</p>
            <hr style="margin:1.25rem 0;">
            <div style="line-height:1.8;font-size:1.02rem;text-align:justify;white-space:pre-wrap;">${dEsc(x.contenu)}</div>
            <div style="margin-top:3rem;text-align:right;">
                <p style="margin:0;font-weight:bold;">Le Chef d'établissement</p>
                <div style="height:70px;"></div>
                <p style="margin:0;color:#666;">(Signature et cachet)</p>
            </div>
        </div>`;
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${dEsc(x.type)} ${dEsc(x.numero)}</title></head><body>${html}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
}

// ---------- Conseil de gestion ----------
function renderConseils() {
    const d = document.getElementById('conDate');
    if (!d.value) d.value = todayStr();
    const tbody = document.getElementById('conseilsTable');
    const list = conseils.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    tbody.innerHTML = list.length === 0
        ? '<tr><td colspan="4" style="text-align:center;padding:1.5rem;color:#64748b;">Aucune réunion enregistrée.</td></tr>'
        : list.map(c => `<tr>
            <td>${c.date ? new Date(c.date).toLocaleDateString('fr-FR') : '-'}</td>
            <td style="font-weight:600;">${dEsc(c.objet)}</td>
            <td>${dEsc(c.participants)}</td>
            <td style="text-align:right;white-space:nowrap;">
                <button class="btn btn-primary" style="padding:0.3rem 0.6rem;font-size:0.85rem;" onclick="genererPV('${c.id}')"><i class="bi bi-printer"></i></button>
                <button class="btn btn-danger" style="padding:0.3rem 0.6rem;font-size:0.85rem;" onclick="deleteConseil('${c.id}')">🗑️</button>
            </td></tr>`).join('');
}
function addConseil() {
    const objet = document.getElementById('conObjet').value.trim();
    if (!objet) { alert('L\'objet de la réunion est obligatoire.'); return; }
    conseils.push({
        id: 'co' + Date.now(),
        date: document.getElementById('conDate').value || todayStr(),
        objet: objet,
        participants: document.getElementById('conParticipants').value.trim(),
        pv: document.getElementById('conPv').value.trim()
    });
    persistConseils();
    ['conObjet', 'conParticipants', 'conPv'].forEach(i => document.getElementById(i).value = '');
    renderConseils();
}
function deleteConseil(id) {
    if (!confirm('Supprimer cette réunion ?')) return;
    conseils = conseils.filter(x => x.id !== id);
    persistConseils(); renderConseils();
}
function genererPV(id) {
    const c = conseils.find(x => x.id === id); if (!c) return;
    const ecole = getEcoleName();
    const html = `
        <div style="font-family:Arial,sans-serif;max-width:780px;margin:0 auto;padding:2.5rem;color:#111;">
            <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:0.75rem;margin-bottom:1.5rem;">
                <h2 style="margin:0;text-transform:uppercase;">${dEsc(ecole)}</h2>
            </div>
            <h1 style="text-align:center;font-size:1.3rem;letter-spacing:1px;margin:1rem 0;">PROCÈS-VERBAL — CONSEIL DE GESTION</h1>
            <p style="margin:0.5rem 0;"><strong>Date :</strong> ${c.date ? new Date(c.date).toLocaleDateString('fr-FR') : ''}</p>
            <p style="margin:0.5rem 0;"><strong>Objet :</strong> ${dEsc(c.objet)}</p>
            <p style="margin:0.5rem 0;"><strong>Participants :</strong> ${dEsc(c.participants) || '-'}</p>
            <hr style="margin:1.25rem 0;">
            <h3 style="margin:0 0 0.5rem;">Délibérations et décisions</h3>
            <div style="line-height:1.8;font-size:1.02rem;text-align:justify;white-space:pre-wrap;">${dEsc(c.pv) || '(à compléter)'}</div>
            <div style="margin-top:3rem;display:flex;justify-content:space-between;">
                <div><strong>Le Secrétaire de séance</strong><div style="height:60px;"></div></div>
                <div style="text-align:right;"><strong>Le Président (Chef d'établissement)</strong><div style="height:60px;"></div></div>
            </div>
        </div>`;
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>PV Conseil de gestion</title></head><body>${html}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
}

// ---------- Démarrage ----------
window.addEventListener('hashchange', dirRouteFromHash);
window.addEventListener('DOMContentLoaded', function () {
    loadDir();
    dirRouteFromHash();
});
