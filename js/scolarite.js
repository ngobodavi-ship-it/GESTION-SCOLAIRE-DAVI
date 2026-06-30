// ===== Direction de la scolarité — registre des élèves =====
const SCOL_ELEVES_KEY = 'ecole_eleves';
const PREINSCR_KEY = 'ecole_preinscriptions';
let preinscriptions = [];
let photoTemp = '';
const SCOL_CLASSES_KEY = 'ecole_classes';

let eleves = [];
let classes = [];
let editEleveId = null;

const SCOL_SECTIONS = {
    heures:    { titre: 'Validation des heures', icone: 'bi-clock-history' },
    dashboard:    { titre: 'Tableau de bord', icone: 'bi-speedometer2' },
    eleves:       { titre: 'Élèves',          icone: 'bi-people' },
    inscriptions: { titre: 'Inscriptions',    icone: 'bi-pencil-square' },
    preinscription:{ titre: 'Pré-inscriptions', icone: 'bi-person-plus' },
    classes:      { titre: 'Classes',         icone: 'bi-grid-3x3-gap' },
    certificats:  { titre: 'Certificats',     icone: 'bi-file-earmark-text' },
    plan:         { titre: "Plan d'action",   icone: 'bi-list-check' },
    conseils:     { titre: 'Conseils de maîtres', icone: 'bi-people-fill' },
    examens:      { titre: 'Examens',          icone: 'bi-journal-check' },
    cartes:       { titre: 'Cartes scolaires', icone: 'bi-person-vcard' },
    reporting:    { titre: 'Reporting',       icone: 'bi-bar-chart-line' },
    donnees:      { titre: 'Import / Export',  icone: 'bi-file-earmark-spreadsheet' }
};
let scolChartClasse = null, scolChartSexe = null, scolChartStatut = null;
const PLAN_KEY = 'ecole_plan_action', CONSEILS_M_KEY = 'ecole_conseils_maitres', EXAMENS_KEY = 'ecole_examens';
let planActions = [], conseilsMaitres = [], examens = [];
let editPlanId = null;
const PLAN_PERIODES = ['Annuel', '1er trimestre', '2e trimestre', '3e trimestre'];
const PLAN_STATUTS = ['À faire', 'En cours', 'Réalisé'];
const EXAM_TYPES = ['Composition trimestrielle', 'Examen blanc', 'Évaluation', "Examen de fin d'année"];

function scEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function scAttr(s) { return scEsc(s).replace(/"/g, '&quot;'); }

function getEcoleName() {
    if (typeof getEtab === 'function') { const e = getEtab(); if (e && e.nom) return e.nom; }
    try { const c = JSON.parse(localStorage.getItem('portail_config_v1')); if (c && c.name) return c.name; } catch (e) {}
    return localStorage.getItem('ecole_nom') || 'Établissement scolaire';
}

function anneeScolaireCourante() {
    const d = new Date(), y = d.getFullYear();
    return d.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

function loadScol() {
    try { eleves = JSON.parse(localStorage.getItem(SCOL_ELEVES_KEY)) || []; } catch (e) { eleves = []; }
    try { classes = JSON.parse(localStorage.getItem(SCOL_CLASSES_KEY)) || []; } catch (e) { classes = []; }
    if (!classes.length) {
        classes = ['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale'].map((n, i) => ({ id: 'c' + i, nom: n }));
        saveClasses();
    }
    try { planActions = JSON.parse(localStorage.getItem(PLAN_KEY)) || []; } catch (e) { planActions = []; }
    try { conseilsMaitres = JSON.parse(localStorage.getItem(CONSEILS_M_KEY)) || []; } catch (e) { conseilsMaitres = []; }
    try { examens = JSON.parse(localStorage.getItem(EXAMENS_KEY)) || []; } catch (e) { examens = []; }
    try { preinscriptions = JSON.parse(localStorage.getItem(PREINSCR_KEY)) || []; } catch (e) { preinscriptions = []; }
}
function saveEleves() { localStorage.setItem(SCOL_ELEVES_KEY, JSON.stringify(eleves)); }
function saveClasses() { localStorage.setItem(SCOL_CLASSES_KEY, JSON.stringify(classes)); }

// ---------- Navigation ----------
function showSection(name) {
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    const sec = document.getElementById('sec-' + name);
    if (!sec) return;
    sec.classList.remove('hidden');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const btn = document.querySelector('.tab[data-tab="' + name + '"]');
    if (btn) btn.classList.add('active');
    const info = SCOL_SECTIONS[name];
    if (info) {
        document.getElementById('moduleTitle').textContent = info.titre;
        document.getElementById('moduleIcon').className = 'bi ' + info.icone;
    }
    if (name === 'dashboard') renderDashboard();
    if (name === 'eleves') renderEleves();
    if (name === 'inscriptions') renderInscriptions();
    if (name === 'classes') renderClasses();
    if (name === 'certificats') renderCertificats();
    if (name === 'dossiers') renderDossiers();
    if (name === 'plan') renderPlan();
    if (name === 'conseils') renderConseilsM();
    if (name === 'examens') renderExamens();
    if (name === 'heures') renderValidationHeures('scolarite', 'valHeuresBox');
    if (name === 'cartes') renderCartes();
    if (name === 'preinscription') renderPreinscriptions();
    if (name === 'reporting') renderScolReporting();
    if (name === 'donnees') renderDonnees();
    if (window.location.hash !== '#' + name) window.location.hash = name;
}
function scolRouteFromHash() {
    const h = (window.location.hash || '').replace(/^#/, '');
    showSection(SCOL_SECTIONS[h] ? h : 'dashboard');
}
function toggleSidebar() {
    const sb = document.getElementById('sidebar');
    const ic = document.getElementById('sidebarToggleIcon');
    const collapsed = sb.classList.toggle('collapsed');
    ic.className = collapsed ? 'bi bi-list' : 'bi bi-chevron-left';
}
function logout() { window.location.href = 'portail.html'; }

// ---------- Tableau de bord ----------
function renderDashboard() {
    const total = eleves.length;
    const g = eleves.filter(e => e.sexe === 'M').length;
    const f = eleves.filter(e => e.sexe === 'F').length;
    document.getElementById('scolTotal').textContent = total;
    document.getElementById('scolGarcons').textContent = g;
    document.getElementById('scolFilles').textContent = f;
    document.getElementById('scolAnnee').textContent = anneeScolaireCourante();

    const parClasse = classes.map(c => ({ nom: c.nom, n: eleves.filter(e => e.classe === c.nom).length }));
    document.getElementById('scolParClasse').innerHTML = `
        <table><thead><tr><th>Classe</th><th style="text-align:right;">Effectif</th></tr></thead>
        <tbody>${parClasse.map(c => `<tr><td>${scEsc(c.nom)}</td><td style="text-align:right;font-weight:600;">${c.n}</td></tr>`).join('')}
        <tr style="font-weight:700;border-top:2px solid #1B6BFF;"><td>TOTAL</td><td style="text-align:right;">${total}</td></tr></tbody></table>`;

    const statuts = ['Nouveau', 'Réinscrit', 'Sortant'];
    document.getElementById('scolParStatut').innerHTML = `
        <table><thead><tr><th>Statut</th><th style="text-align:right;">Nombre</th></tr></thead>
        <tbody>${statuts.map(s => `<tr><td>${s}</td><td style="text-align:right;font-weight:600;">${eleves.filter(e => e.statut === s).length}</td></tr>`).join('')}</tbody></table>`;
}

// ---------- Élèves ----------
function classeOptions(selected) {
    return ['<option value="">-- Classe --</option>'].concat(
        classes.map(c => `<option value="${scAttr(c.nom)}" ${selected === c.nom ? 'selected' : ''}>${scEsc(c.nom)}</option>`)
    ).join('');
}

function renderEleves() {
    const search = (document.getElementById('scolSearch').value || '').toLowerCase();
    const list = eleves.filter(e =>
        (`${e.nom} ${e.prenom} ${e.matricule} ${e.classe}`).toLowerCase().includes(search));
    const tbody = document.getElementById('elevesTableBody');
    if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:#64748b;">Aucun élève. Cliquez sur « Nouvel élève » pour commencer.</td></tr>';
        return;
    }
    tbody.innerHTML = list.map(e => `
        <tr>
            <td style="font-family:monospace;">${scEsc(e.matricule)}</td>
            <td style="font-weight:600;">${scEsc(e.nom)} ${scEsc(e.prenom)}</td>
            <td>${e.sexe === 'M' ? 'M' : e.sexe === 'F' ? 'F' : '-'}</td>
            <td>${scEsc(e.classe)}</td>
            <td>${scEsc(e.statut)}</td>
            <td>${scEsc(e.tuteur)} ${e.telephone ? '<br><span style="color:#64748b;font-size:0.85rem;">' + scEsc(e.telephone) + '</span>' : ''}</td>
            <td style="white-space:nowrap;">
                <button class="btn btn-primary" style="padding:0.3rem 0.6rem;font-size:0.85rem;" onclick="ficheEleve('${e.id}')">👁️</button>
                <button class="btn btn-secondary" style="padding:0.3rem 0.6rem;font-size:0.85rem;" onclick="editEleve('${e.id}')">✏️</button>
                <button class="btn btn-danger" style="padding:0.3rem 0.6rem;font-size:0.85rem;" onclick="deleteEleve('${e.id}')">🗑️</button>
            </td>
        </tr>`).join('');
}

function openEleveModal() {
    document.getElementById('eleveModal').classList.remove('hidden');
}
function hideEleveModal() {
    document.getElementById('eleveModal').classList.add('hidden');
}

function addEleve() {
    editEleveId = null;
    document.getElementById('eleveModalTitle').textContent = 'Nouvel élève';
    document.getElementById('elNom').value = '';
    document.getElementById('elPrenom').value = '';
    document.getElementById('elSexe').value = 'M';
    document.getElementById('elDateN').value = '';
    document.getElementById('elLieuN').value = '';
    document.getElementById('elClasse').innerHTML = classeOptions('');
    document.getElementById('elAnnee').value = anneeScolaireCourante();
    document.getElementById('elStatut').value = 'Nouveau';
    document.getElementById('elTuteur').value = '';
    document.getElementById('elTel').value = '';
    document.getElementById('elAdresse').value = '';
    photoTemp = '';
    document.getElementById('elPhoto').value = '';
    document.getElementById('elPhotoPreview').style.display = 'none';
    openEleveModal();
}

function editEleve(id) {
    const e = eleves.find(x => x.id === id);
    if (!e) return;
    editEleveId = id;
    document.getElementById('eleveModalTitle').textContent = 'Modifier l\'élève';
    document.getElementById('elNom').value = e.nom || '';
    document.getElementById('elPrenom').value = e.prenom || '';
    document.getElementById('elSexe').value = e.sexe || 'M';
    document.getElementById('elDateN').value = e.dateNaissance || '';
    document.getElementById('elLieuN').value = e.lieuNaissance || '';
    document.getElementById('elClasse').innerHTML = classeOptions(e.classe);
    document.getElementById('elAnnee').value = e.anneeScolaire || anneeScolaireCourante();
    document.getElementById('elStatut').value = e.statut || 'Nouveau';
    document.getElementById('elTuteur').value = e.tuteur || '';
    document.getElementById('elTel').value = e.telephone || '';
    document.getElementById('elAdresse').value = e.adresse || '';
    photoTemp = e.photo || '';
    document.getElementById('elPhoto').value = '';
    const prev = document.getElementById('elPhotoPreview');
    if (photoTemp) { prev.src = photoTemp; prev.style.display = 'block'; } else { prev.style.display = 'none'; }
    openEleveModal();
}

function saveEleve(event) {
    event.preventDefault();
    const nom = document.getElementById('elNom').value.trim();
    const prenom = document.getElementById('elPrenom').value.trim();
    if (!nom || !prenom) { alert('Nom et prénom obligatoires.'); return; }
    const data = {
        nom: nom, prenom: prenom,
        sexe: document.getElementById('elSexe').value,
        dateNaissance: document.getElementById('elDateN').value,
        lieuNaissance: document.getElementById('elLieuN').value.trim(),
        classe: document.getElementById('elClasse').value,
        anneeScolaire: document.getElementById('elAnnee').value.trim(),
        statut: document.getElementById('elStatut').value,
        tuteur: document.getElementById('elTuteur').value.trim(),
        telephone: document.getElementById('elTel').value.trim(),
        adresse: document.getElementById('elAdresse').value.trim(),
        photo: photoTemp || ''
    };
    if (editEleveId) {
        const e = eleves.find(x => x.id === editEleveId);
        Object.assign(e, data);
    } else {
        const year = new Date().getFullYear();
        const seq = eleves.length + 1;
        data.id = 'e' + Date.now();
        data.matricule = `MAT-${year}-${String(seq).padStart(4, '0')}`;
        data.dateInscription = new Date().toISOString().split('T')[0];
        eleves.push(data);
    }
    saveEleves();
    hideEleveModal();
    renderEleves();
}

function deleteEleve(id) {
    // Vérifier s'il a des paiements enregistrés en caisse (information avant suppression)
    let aPaiements = false;
    try {
        const tx = JSON.parse(localStorage.getItem('digigespro_transactions')) || [];
        aPaiements = tx.some(t => t.studentId === id && t.type !== 'depense');
    } catch (e) { }
    let msg = 'Supprimer cet élève du registre ?\nIl sera aussi retiré de la caisse (Gestion).';
    if (aPaiements) msg += '\n\n⚠️ Cet élève a déjà des paiements enregistrés : ils resteront dans la comptabilité, mais l\'élève disparaîtra des listes.';
    if (!confirm(msg)) return;
    eleves = eleves.filter(x => x.id !== id);
    saveEleves();
    // Retirer aussi l'élève de la caisse (digigespro_students)
    try {
        let dg = JSON.parse(localStorage.getItem('digigespro_students')) || [];
        const avant = dg.length;
        dg = dg.filter(s => s.id !== id);
        if (dg.length !== avant) localStorage.setItem('digigespro_students', JSON.stringify(dg));
    } catch (e) { }
    renderEleves();
}

// ---------- Inscriptions ----------
function renderInscriptions() {
    const annees = [...new Set(eleves.map(e => e.anneeScolaire).filter(Boolean))].sort().reverse();
    const sel = document.getElementById('inscAnnee');
    const current = sel.value || anneeScolaireCourante();
    sel.innerHTML = (annees.length ? annees : [anneeScolaireCourante()])
        .map(a => `<option value="${scAttr(a)}" ${a === current ? 'selected' : ''}>${scEsc(a)}</option>`).join('');
    const annee = sel.value;
    const list = eleves.filter(e => e.anneeScolaire === annee);
    const nouveaux = list.filter(e => e.statut === 'Nouveau').length;
    const reinscrits = list.filter(e => e.statut === 'Réinscrit').length;
    document.getElementById('inscContent').innerHTML = `
        <div class="grid-2" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:1.5rem;">
            <div style="background:#d1fae5;padding:1rem;border-radius:8px;border-left:4px solid #10b981;"><p style="color:#64748b;font-size:0.8rem;margin-bottom:0.25rem;">Nouvelles inscriptions</p><h3 style="margin:0;font-weight:700;">${nouveaux}</h3></div>
            <div style="background:#ede9fe;padding:1rem;border-radius:8px;border-left:4px solid #8b5cf6;"><p style="color:#64748b;font-size:0.8rem;margin-bottom:0.25rem;">Réinscriptions</p><h3 style="margin:0;font-weight:700;">${reinscrits}</h3></div>
            <div style="background:#f0f9ff;padding:1rem;border-radius:8px;border-left:4px solid #0ea5e9;"><p style="color:#64748b;font-size:0.8rem;margin-bottom:0.25rem;">Total inscrits</p><h3 style="margin:0;font-weight:700;">${list.length}</h3></div>
        </div>
        <div style="overflow-x:auto;"><table>
            <thead><tr><th>Matricule</th><th>Nom et prénom</th><th>Classe</th><th>Statut</th><th>Date</th></tr></thead>
            <tbody>${list.length === 0 ? '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:#64748b;">Aucune inscription pour cette année.</td></tr>' :
                list.map(e => `<tr><td style="font-family:monospace;">${scEsc(e.matricule)}</td><td style="font-weight:600;">${scEsc(e.nom)} ${scEsc(e.prenom)}</td><td>${scEsc(e.classe)}</td><td>${scEsc(e.statut)}</td><td>${scEsc(e.dateInscription || '-')}</td></tr>`).join('')}
            </tbody></table></div>`;
}

// ---------- Classes ----------
const TYPE_LABELS = { primaire: 'Primaire', college_general: 'Collège général', college_technique: 'Collège technique', lycee_general: 'Lycée général', lycee_technique: 'Lycée technique', secondaire: 'Secondaire' };
function classeTypeOf(c) { return c.type || (c.cycle === 'primaire' ? 'primaire' : 'secondaire'); }
function cycleLabel(c) { return TYPE_LABELS[classeTypeOf(c)] || 'Secondaire'; }
function renderClasses() {
    document.getElementById('classesContent').innerHTML = `
        <div style="overflow-x:auto;"><table>
            <thead><tr><th>Classe</th><th>Type</th><th style="text-align:right;">Effectif</th><th style="text-align:right;">Action</th></tr></thead>
            <tbody>${classes.map(c => {
                const n = eleves.filter(e => e.classe === c.nom).length;
                const t = classeTypeOf(c);
                const prim = t === 'primaire';
                const tech = t.indexOf('technique') >= 0;
                const bg = prim ? '#ecfeff' : (tech ? '#fef3c7' : '#eef2ff');
                const fg = prim ? '#0e7490' : (tech ? '#92400e' : '#4338ca');
                return `<tr><td style="font-weight:600;">${scEsc(c.nom)}</td>
                    <td><span style="background:${bg};color:${fg};border-radius:999px;padding:0.15rem 0.6rem;font-size:0.8rem;">${cycleLabel(c)}</span></td>
                    <td style="text-align:right;">${n}</td>
                    <td style="text-align:right;"><button class="btn btn-danger" style="padding:0.3rem 0.6rem;font-size:0.85rem;" onclick="deleteClasse('${c.id}')">🗑️</button></td></tr>`;
            }).join('')}</tbody></table></div>`;
}
function addClasse() {
    const nom = document.getElementById('newClasseNom').value.trim();
    if (!nom) { alert('Saisissez le nom de la classe.'); return; }
    if (classes.some(c => c.nom.toLowerCase() === nom.toLowerCase())) { alert('Cette classe existe déjà.'); return; }
    const type = document.getElementById('newClasseCycle').value || 'college_general';
    const cycle = type === 'primaire' ? 'primaire' : 'secondaire';
    classes.push({ id: 'c' + Date.now(), nom: nom, type: type, cycle: cycle });
    saveClasses();
    document.getElementById('newClasseNom').value = '';
    renderClasses();
}
function ajouterClassesPrimaire() {
    const primaires = ['CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'];
    let ajout = 0;
    primaires.forEach((n, i) => {
        if (!classes.some(c => c.nom.toLowerCase() === n.toLowerCase())) {
            classes.push({ id: 'cp' + Date.now() + i, nom: n, type: 'primaire', cycle: 'primaire' });
            ajout++;
        }
    });
    saveClasses();
    renderClasses();
    alert(ajout ? `${ajout} classe(s) du primaire ajoutée(s) : CP1 à CM2.` : 'Les classes du primaire existent déjà.');
}
function deleteClasse(id) {
    const c = classes.find(x => x.id === id);
    if (!c) return;
    const n = eleves.filter(e => e.classe === c.nom).length;
    if (n > 0) { alert(`Impossible : ${n} élève(s) sont dans cette classe.`); return; }
    if (!confirm('Supprimer cette classe ?')) return;
    classes = classes.filter(x => x.id !== id);
    saveClasses();
    renderClasses();
}

// ---------- Certificats ----------
function renderCertificats() {
    const sel = document.getElementById('certEleve');
    sel.innerHTML = ['<option value="">-- Choisir un élève --</option>'].concat(
        eleves.slice().sort((a, b) => (a.nom + a.prenom).localeCompare(b.nom + b.prenom))
            .map(e => `<option value="${e.id}">${scEsc(e.nom)} ${scEsc(e.prenom)} — ${scEsc(e.classe)}</option>`)
    ).join('');
    const selC = document.getElementById('carteClasse');
    if (selC) {
        const cls = [...new Set(eleves.map(e => e.classe).filter(Boolean))].sort();
        const opts = '<option value="">-- Choisir une classe --</option>' + cls.map(c => `<option value="${scAttr(c)}">${scEsc(c)}</option>`).join('');
        selC.innerHTML = opts;
        const selT = document.getElementById('tromboClasse');
        if (selT) selT.innerHTML = opts;
    }
}

function genererCertificat() {
    const id = document.getElementById('certEleve').value;
    if (!id) { alert('Choisissez un élève.'); return; }
    const e = eleves.find(x => x.id === id);
    if (!e) return;
    const ecole = getEcoleName();
    const aujourd = new Date().toLocaleDateString('fr-FR');
    const sexeMot = e.sexe === 'F' ? "l'élève" : "l'élève";
    const ne = e.sexe === 'F' ? 'née' : 'né';
    const inscrit = e.sexe === 'F' ? 'inscrite' : 'inscrit';
    const html = `
        <div style="font-family:'Times New Roman',serif;max-width:800px;margin:0 auto;padding:3rem;">
            <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:1rem;margin-bottom:2rem;">
                ${(typeof getEtab === 'function' && getEtab().logo) ? `<img src="${getEtab().logo}" alt="" style="height:64px;object-fit:contain;margin-bottom:6px;">` : ''}
                <p style="margin:0;font-size:0.9rem;">RÉPUBLIQUE DU CONGO</p>
                <p style="margin:0;font-size:0.78rem;letter-spacing:1px;">Unité &ndash; Travail &ndash; Progrès</p>
                <p style="margin:0.25rem 0;font-size:0.85rem;">Ministère de l'Enseignement Préscolaire, Primaire, Secondaire et de l'Alphabétisation</p>
                <h2 style="margin:0.75rem 0 0;text-transform:uppercase;">${scEsc(ecole)}</h2>
                ${(typeof getEtab === 'function' && [getEtab().ville, getEtab().bp ? 'BP ' + getEtab().bp : '', getEtab().telephone ? 'Tél : ' + getEtab().telephone : ''].filter(Boolean).length) ? `<p style="margin:0.2rem 0 0;font-size:0.72rem;color:#444;">${[getEtab().ville, getEtab().bp ? 'BP ' + scEsc(getEtab().bp) : '', getEtab().telephone ? 'Tél : ' + scEsc(getEtab().telephone) : '', getEtab().email ? scEsc(getEtab().email) : ''].filter(Boolean).join(' · ')}</p>` : ''}
            </div>
            <h1 style="text-align:center;text-transform:uppercase;letter-spacing:2px;margin:2rem 0;font-size:1.6rem;">Certificat de scolarité</h1>
            <p style="line-height:2;font-size:1.05rem;text-align:justify;">
                Je soussigné, le Chef d'établissement de <strong>${scEsc(ecole)}</strong>, certifie que ${sexeMot}
                <strong>${scEsc(e.nom)} ${scEsc(e.prenom)}</strong>,
                ${ne} le <strong>${e.dateNaissance ? new Date(e.dateNaissance).toLocaleDateString('fr-FR') : '.....................'}</strong>
                à <strong>${scEsc(e.lieuNaissance) || '.....................'}</strong>,
                matricule <strong>${scEsc(e.matricule)}</strong>,
                est régulièrement ${inscrit} dans notre établissement en classe de
                <strong>${scEsc(e.classe) || '.....................'}</strong>
                pour l'année scolaire <strong>${scEsc(e.anneeScolaire) || anneeScolaireCourante()}</strong>.
            </p>
            <p style="line-height:2;font-size:1.05rem;">En foi de quoi, le présent certificat lui est délivré pour servir et valoir ce que de droit.</p>
            <div style="margin-top:3rem;text-align:right;">
                <p style="margin:0;">Fait à ........................., le ${aujourd}</p>
                <div style="height:80px;"></div>
                <p style="margin:0;font-weight:bold;">Le Chef d'établissement</p>
                <p style="margin:0;color:#666;">(Signature et cachet)</p>
            </div>
        </div>`;
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Certificat de scolarité - ${scEsc(e.nom)} ${scEsc(e.prenom)}</title></head><body>${html}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
}

function genererAttestation() {
    const id = document.getElementById('certEleve').value;
    if (!id) { alert('Choisissez un élève.'); return; }
    const e = eleves.find(x => x.id === id);
    if (!e) return;
    const ecole = getEcoleName();
    const aujourd = new Date().toLocaleDateString('fr-FR');
    const ne = e.sexe === 'F' ? 'née' : 'né';
    const inscrit = e.sexe === 'F' ? 'inscrite' : 'inscrit';
    const frequente = e.sexe === 'F' ? 'fréquente' : 'fréquente';
    const photo = e.photo ? `<img src="${e.photo}" alt="" style="width:90px;height:110px;object-fit:cover;border:1px solid #999;float:right;margin-left:1rem;">` : '';
    const html = `
        <div style="font-family:'Times New Roman',serif;max-width:800px;margin:0 auto;padding:3rem;">
            <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:1rem;margin-bottom:1.5rem;">
                ${(typeof getEtab === 'function' && getEtab().logo) ? `<img src="${getEtab().logo}" alt="" style="height:64px;object-fit:contain;margin-bottom:6px;">` : ''}
                <p style="margin:0;font-size:0.9rem;">RÉPUBLIQUE DU CONGO</p>
                <p style="margin:0;font-size:0.78rem;letter-spacing:1px;">Unité &ndash; Travail &ndash; Progrès</p>
                <p style="margin:0.25rem 0;font-size:0.85rem;">Ministère de l\'Enseignement Préscolaire, Primaire, Secondaire et de l\'Alphabétisation</p>
                <h2 style="margin:0.75rem 0 0;text-transform:uppercase;">${scEsc(ecole)}</h2>
                ${(typeof getEtab === 'function' && [getEtab().ville, getEtab().bp, getEtab().telephone].filter(Boolean).length) ? `<p style="margin:0.2rem 0 0;font-size:0.72rem;color:#444;">${[getEtab().ville, getEtab().bp ? 'BP ' + scEsc(getEtab().bp) : '', getEtab().telephone ? 'Tél : ' + scEsc(getEtab().telephone) : '', getEtab().email ? scEsc(getEtab().email) : ''].filter(Boolean).join(' · ')}</p>` : ''}
            </div>
            ${photo}
            <h1 style="text-align:center;text-transform:uppercase;letter-spacing:2px;margin:1.5rem 0;font-size:1.5rem;">Attestation de fréquentation scolaire</h1>
            <p style="line-height:2;font-size:1.05rem;text-align:justify;">
                Je soussigné, le Chef d\'établissement de <strong>${scEsc(ecole)}</strong>, atteste que l\'élève
                <strong>${scEsc(e.nom)} ${scEsc(e.prenom)}</strong>,
                ${ne} le <strong>${e.dateNaissance ? new Date(e.dateNaissance).toLocaleDateString('fr-FR') : '.....................'}</strong>
                à <strong>${scEsc(e.lieuNaissance) || '.....................'}</strong>,
                matricule <strong>${scEsc(e.matricule) || '.....................'}</strong>,
                est régulièrement ${inscrit} et ${frequente} les cours dans notre établissement,
                en classe de <strong>${scEsc(e.classe) || '.....................'}</strong>,
                au titre de l\'année scolaire <strong>${scEsc(e.anneeScolaire) || anneeScolaireCourante()}</strong>.
            </p>
            <p style="line-height:2;font-size:1.05rem;">La présente attestation est délivrée à l\'intéressé(e) pour servir et valoir ce que de droit.</p>
            <div style="margin-top:3rem;text-align:right;">
                <p style="margin:0;">Fait à ........................., le ${aujourd}</p>
                <div style="height:80px;"></div>
                <p style="margin:0;font-weight:bold;">Le Chef d\'établissement</p>
                <p style="margin:0;color:#666;">(Signature et cachet)</p>
            </div>
        </div>`;
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Attestation de fréquentation - ${scEsc(e.nom)} ${scEsc(e.prenom)}</title></head><body>${html}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
}

// ---------- Carte scolaire ----------
function carteScolaireCSS() {
    return `
    .cs-wrap{display:flex;flex-wrap:wrap;gap:10px;}
    .cs{width:340px;height:212px;border:1px solid #1450C8;border-radius:14px;overflow:hidden;
        font-family:Arial,sans-serif;color:#0E1E3A;display:flex;flex-direction:column;
        box-shadow:0 2px 6px rgba(0,0,0,.15);page-break-inside:avoid;background:#fff;}
    .cs-band{background:linear-gradient(135deg,#1B6BFF,#28C6F5);color:#fff;padding:8px 12px;
        font-weight:800;font-size:.82rem;text-transform:uppercase;letter-spacing:.3px;line-height:1.2;}
    .cs-band small{display:block;font-weight:600;font-size:.6rem;opacity:.9;letter-spacing:1px;}
    .cs-body{display:flex;gap:10px;padding:10px 12px;flex:1;}
    .cs-photo{width:78px;height:96px;border:1px solid #cbd5e1;border-radius:8px;object-fit:cover;flex-shrink:0;background:#eef4fc;display:flex;align-items:center;justify-content:center;font-size:1.6rem;color:#94a3b8;}
    .cs-info{flex:1;min-width:0;font-size:.74rem;line-height:1.5;}
    .cs-titre{font-weight:800;color:#1450C8;font-size:.7rem;letter-spacing:1px;margin-bottom:2px;}
    .cs-nom{font-weight:800;font-size:.92rem;margin-bottom:4px;text-transform:uppercase;}
    .cs-info b{color:#475569;font-weight:700;}
    .cs-foot{display:flex;justify-content:space-between;align-items:center;background:#F1F6FF;padding:5px 12px;font-size:.66rem;color:#1450C8;font-weight:700;}
    @media print{ body{margin:0;} }
    `;
}
function carteScolaireHTML(e, ecole, annee) {
    const nom = (scEsc(e.nom) + ' ' + scEsc(e.prenom || '')).trim();
    const initiales = ((e.nom || ' ')[0] || '') + ((e.prenom || ' ')[0] || '');
    const photo = e.photo
        ? `<img class="cs-photo" src="${e.photo}" alt="">`
        : `<div class="cs-photo">${scEsc(initiales.toUpperCase())}</div>`;
    const ddn = e.dateNaissance ? new Date(e.dateNaissance).toLocaleDateString('fr-FR') : '—';
    return `
    <div class="cs">
        <div class="cs-band">${scEsc(ecole)}<small>République du Congo — Carte scolaire</small></div>
        <div class="cs-body">
            ${photo}
            <div class="cs-info">
                <div class="cs-titre">ÉLÈVE</div>
                <div class="cs-nom">${nom}</div>
                <div><b>Matricule :</b> ${scEsc(e.matricule || '—')}</div>
                <div><b>Classe :</b> ${scEsc(e.classe || '—')}</div>
                <div><b>Né(e) le :</b> ${ddn}</div>
            </div>
        </div>
        <div class="cs-foot"><span>Année ${scEsc(annee)}</span><span>Signature / cachet</span></div>
    </div>`;
}
function genererCarteScolaire() {
    const id = document.getElementById('certEleve').value;
    if (!id) { alert('Choisissez un élève dans la liste ci-dessus.'); return; }
    const e = eleves.find(x => x.id === id); if (!e) return;
    const ecole = getEcoleName();
    const annee = e.anneeScolaire || anneeScolaireCourante();
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Carte scolaire - ${scEsc(e.nom)} ${scEsc(e.prenom)}</title><style>${carteScolaireCSS()}</style></head>
        <body style="padding:1.5rem;"><div class="cs-wrap">${carteScolaireHTML(e, ecole, annee)}</div></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
}
function imprimerCartesClasse() {
    const classe = document.getElementById('carteClasse').value;
    if (!classe) { alert('Choisissez une classe.'); return; }
    const ecole = getEcoleName();
    const liste = eleves.filter(e => e.classe === classe).slice().sort((a, b) => (a.nom + a.prenom).localeCompare(b.nom + b.prenom));
    if (!liste.length) { alert('Aucun élève dans cette classe.'); return; }
    const cartes = liste.map(e => carteScolaireHTML(e, ecole, e.anneeScolaire || anneeScolaireCourante())).join('');
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Cartes scolaires - ${scEsc(classe)}</title><style>${carteScolaireCSS()}</style></head>
        <body style="padding:1rem;"><div class="cs-wrap">${cartes}</div></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
}

// ---------- Trombinoscope & feuille d'appel ----------
function imprimerTrombinoscope() {
    const classe = document.getElementById('tromboClasse').value;
    if (!classe) { alert('Choisissez une classe.'); return; }
    const ecole = getEcoleName();
    const liste = eleves.filter(e => e.classe === classe).slice().sort((a, b) => (a.nom + a.prenom).localeCompare(b.nom + b.prenom));
    if (!liste.length) { alert('Aucun élève dans cette classe.'); return; }
    const annee = (liste[0] && liste[0].anneeScolaire) || anneeScolaireCourante();
    const g = liste.filter(e => e.sexe === 'M').length, f = liste.filter(e => e.sexe === 'F').length;
    const cells = liste.map(e => {
        const nom = (scEsc(e.nom) + ' ' + scEsc(e.prenom || '')).trim();
        const initiales = (((e.nom || ' ')[0] || '') + ((e.prenom || ' ')[0] || '')).toUpperCase();
        const photo = e.photo ? `<img src="${e.photo}" alt="">` : `<div class="ph">${scEsc(initiales)}</div>`;
        return `<div class="tb-cell">${photo}<div class="tb-nom">${nom}</div><div class="tb-mat">${scEsc(e.matricule || '')}</div></div>`;
    }).join('');
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Trombinoscope ${scEsc(classe)}</title>
        <style>
        body{font-family:Arial,sans-serif;color:#111;padding:1.2rem;margin:0;}
        .hd{text-align:center;border-bottom:2px solid #333;padding-bottom:.5rem;margin-bottom:1rem;}
        .grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;}
        .tb-cell{border:1px solid #cbd5e1;border-radius:10px;padding:8px;text-align:center;page-break-inside:avoid;}
        .tb-cell img,.tb-cell .ph{width:100%;height:120px;object-fit:cover;border-radius:8px;background:#eef4fc;display:flex;align-items:center;justify-content:center;font-size:2rem;color:#94a3b8;}
        .tb-nom{font-weight:700;font-size:.78rem;margin-top:5px;line-height:1.2;}
        .tb-mat{font-size:.68rem;color:#64748b;font-family:monospace;}
        @media print{ body{margin:0;} .grid{grid-template-columns:repeat(5,1fr);} }
        </style></head>
        <body>
        <div class="hd"><p style="margin:0;font-size:.8rem;">RÉPUBLIQUE DU CONGO — Unité · Travail · Progrès</p>
        <h2 style="margin:.3rem 0;">${scEsc(ecole)}</h2>
        <h3 style="margin:0;">Trombinoscope — Classe ${scEsc(classe)}</h3>
        <p style="margin:.2rem 0;font-size:.85rem;">Année ${scEsc(annee)} — ${liste.length} élève(s) (${g} G / ${f} F)</p></div>
        <div class="grid">${cells}</div>
        </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
}

function imprimerFeuilleAppel() {
    const classe = document.getElementById('tromboClasse').value;
    if (!classe) { alert('Choisissez une classe.'); return; }
    const ecole = getEcoleName();
    const liste = eleves.filter(e => e.classe === classe).slice().sort((a, b) => (a.nom + a.prenom).localeCompare(b.nom + b.prenom));
    if (!liste.length) { alert('Aucun élève dans cette classe.'); return; }
    const annee = (liste[0] && liste[0].anneeScolaire) || anneeScolaireCourante();
    // 12 colonnes vides pour pointer la présence
    const cols = Array.from({ length: 12 }, () => '<th style="border:1px solid #999;width:26px;height:26px;"></th>').join('');
    let i = 0;
    const rows = liste.map(e => {
        i++;
        const cells = Array.from({ length: 12 }, () => '<td style="border:1px solid #999;height:26px;"></td>').join('');
        return `<tr><td style="border:1px solid #999;padding:3px 6px;text-align:center;">${i}</td><td style="border:1px solid #999;padding:3px 8px;">${scEsc(e.nom)} ${scEsc(e.prenom || '')}</td>${cells}</tr>`;
    }).join('');
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Feuille d'appel ${scEsc(classe)}</title></head>
        <body style="font-family:Arial,sans-serif;color:#111;padding:1.2rem;">
        <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:.5rem;margin-bottom:1rem;">
            <p style="margin:0;font-size:.8rem;">RÉPUBLIQUE DU CONGO — Unité · Travail · Progrès</p>
            <h2 style="margin:.3rem 0;">${scEsc(ecole)}</h2>
            <h3 style="margin:0;">Feuille d'appel — Classe ${scEsc(classe)}</h3>
            <p style="margin:.2rem 0;font-size:.85rem;">Année ${scEsc(annee)} — ${liste.length} élève(s)</p>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:.82rem;">
            <thead><tr style="background:#eee;"><th style="border:1px solid #999;padding:3px 6px;">N°</th><th style="border:1px solid #999;padding:3px 8px;text-align:left;">Nom et prénom</th>${cols}</tr></thead>
            <tbody>${rows}</tbody>
        </table>
        <p style="font-size:.75rem;color:#555;margin-top:.5rem;">Cochez la présence dans les colonnes (une colonne par jour ou par séance).</p>
        </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
}

// ---------- Dossiers d'inscription (checklist des pièces) ----------
const DOS_PIECES_DEFAUT = ['Acte de naissance', 'Photos d\'identité', 'Bulletin / certificat précédent', 'Fiche d\'inscription', 'Certificat médical', 'Pièce du parent', 'Frais d\'inscription payés'];
function dosPieces() { try { const a = JSON.parse(localStorage.getItem('ecole_dossiers_pieces')); if (Array.isArray(a) && a.length) return a; } catch (e) { } return DOS_PIECES_DEFAUT.slice(); }
function dosSavePieces(a) { localStorage.setItem('ecole_dossiers_pieces', JSON.stringify(a)); }
function dosRead() { try { return JSON.parse(localStorage.getItem('ecole_dossiers')) || {}; } catch (e) { return {}; } }
function dosSave(o) { localStorage.setItem('ecole_dossiers', JSON.stringify(o)); }
function dosGet(id) { return dosRead()[id] || {}; }
function dosComplet(id) { const d = dosGet(id); return dosPieces().every(p => d[p]); }
function dosManquantes(id) { const d = dosGet(id); return dosPieces().filter(p => !d[p]); }

function dosSet(id, piece, ok) {
    const o = dosRead();
    if (!o[id]) o[id] = {};
    if (ok) o[id][piece] = true; else delete o[id][piece];
    if (Object.keys(o[id]).length === 0) delete o[id];
    dosSave(o);
    dosMajResume();
    // mettre à jour la cellule "complet" de la ligne
    const cell = document.getElementById('dos_stat_' + id);
    if (cell) cell.innerHTML = dosComplet(id) ? '<span style="background:#dcfce7;color:#166534;border-radius:999px;padding:1px 9px;font-size:.76rem;font-weight:700;">Complet</span>' : `<span style="background:#fee2e2;color:#991b1b;border-radius:999px;padding:1px 9px;font-size:.76rem;font-weight:700;">${dosManquantes(id).length} manquante(s)</span>`;
}

function dosGererPieces() {
    const cur = dosPieces();
    const txt = prompt('Liste des pièces requises (une par ligne) :', cur.join('\n'));
    if (txt === null) return;
    const arr = txt.split('\n').map(x => x.trim()).filter(Boolean);
    if (!arr.length) { alert('La liste ne peut pas être vide.'); return; }
    dosSavePieces(arr); renderDossiers();
}

function dosClassesListe() { return [...new Set(eleves.map(e => e.classe).filter(Boolean))].sort(); }

function dosMajResume() {
    const classe = (document.getElementById('dosClasse') || {}).value || '';
    const box = document.getElementById('dosResume'); if (!box) return;
    const liste = eleves.filter(e => !classe || e.classe === classe);
    const complets = liste.filter(e => dosComplet(e.id)).length;
    const incomplets = liste.length - complets;
    box.innerHTML = `
        <span style="background:#dcfce7;color:#166534;border-radius:999px;padding:.25rem .8rem;font-weight:600;">Complets : ${complets}</span>
        <span style="background:#fee2e2;color:#991b1b;border-radius:999px;padding:.25rem .8rem;font-weight:600;">Incomplets : ${incomplets}</span>
        <span style="background:#f1f5f9;color:#475569;border-radius:999px;padding:.25rem .8rem;font-weight:600;">Total : ${liste.length}</span>`;
}

function renderDossiers() {
    const sel = document.getElementById('dosClasse');
    if (sel) {
        const cur = sel.value;
        sel.innerHTML = '<option value="">-- Toutes les classes --</option>' + dosClassesListe().map(c => `<option value="${scAttr(c)}" ${c === cur ? 'selected' : ''}>${scEsc(c)}</option>`).join('');
    }
    const box = document.getElementById('dossiersBox'); if (!box) return;
    const classe = sel ? sel.value : '';
    const pieces = dosPieces();
    const liste = eleves.filter(e => !classe || e.classe === classe).slice().sort((a, b) => (a.nom + a.prenom).localeCompare(b.nom + b.prenom));
    if (!liste.length) { box.innerHTML = '<p style="color:#64748b;padding:.5rem;">Aucun élève sur cette sélection.</p>'; dosMajResume(); return; }
    const th = pieces.map(p => `<th style="font-size:.72rem;text-align:center;writing-mode:initial;">${scEsc(p)}</th>`).join('');
    const lignes = liste.map(e => {
        const d = dosGet(e.id);
        const cases = pieces.map(p => `<td style="text-align:center;"><input type="checkbox" ${d[p] ? 'checked' : ''} onchange="dosSet('${e.id}','${scAttr(p)}',this.checked)" style="width:18px;height:18px;margin:0;cursor:pointer;"></td>`).join('');
        const complet = pieces.every(p => d[p]);
        const stat = complet ? '<span style="background:#dcfce7;color:#166534;border-radius:999px;padding:1px 9px;font-size:.76rem;font-weight:700;">Complet</span>' : `<span style="background:#fee2e2;color:#991b1b;border-radius:999px;padding:1px 9px;font-size:.76rem;font-weight:700;">${pieces.filter(p => !d[p]).length} manquante(s)</span>`;
        return `<tr><td style="font-weight:600;white-space:nowrap;">${scEsc(e.nom)} ${scEsc(e.prenom)}<br><span style="color:#64748b;font-size:.72rem;">${scEsc(e.classe || '')}</span></td>${cases}<td id="dos_stat_${e.id}">${stat}</td></tr>`;
    }).join('');
    box.innerHTML = `<table>
        <thead><tr><th style="text-align:left;">Élève</th>${th}<th>Statut</th></tr></thead>
        <tbody>${lignes}</tbody>
    </table>
    <p style="color:#64748b;font-size:.8rem;margin:.6rem 0 0;">Cochez les pièces fournies. « ⚙️ Pièces requises » permet de modifier la liste des documents demandés.</p>`;
    dosMajResume();
}

function dosImprimerIncomplets() {
    const classe = (document.getElementById('dosClasse') || {}).value || '';
    const pieces = dosPieces();
    const liste = eleves.filter(e => (!classe || e.classe === classe) && !dosComplet(e.id)).slice().sort((a, b) => (a.classe + a.nom).localeCompare(b.classe + b.nom));
    if (!liste.length) { alert('Aucun dossier incomplet sur cette sélection. 👍'); return; }
    const ecole = getEcoleName();
    let i = 0;
    const rows = liste.map(e => { i++; const manq = dosManquantes(e.id); return `<tr><td style="border:1px solid #999;padding:4px 8px;text-align:center;">${i}</td><td style="border:1px solid #999;padding:4px 8px;">${scEsc(e.nom)} ${scEsc(e.prenom)}</td><td style="border:1px solid #999;padding:4px 8px;">${scEsc(e.classe || '')}</td><td style="border:1px solid #999;padding:4px 8px;color:#b91c1c;">${manq.map(scEsc).join(', ')}</td></tr>`; }).join('');
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Dossiers incomplets</title></head>
        <body style="font-family:Arial,sans-serif;padding:1.6rem;color:#111;">
        <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:.6rem;margin-bottom:1rem;">
            <p style="margin:0;font-size:.8rem;">RÉPUBLIQUE DU CONGO — Unité · Travail · Progrès</p>
            <h2 style="margin:.3rem 0;">${scEsc(ecole)}</h2>
            <h3 style="margin:0;">Dossiers d'inscription incomplets${classe ? ' — Classe ' + scEsc(classe) : ''}</h3>
            <p style="margin:.2rem 0;font-size:.85rem;">${liste.length} dossier(s) — édité le ${new Date().toLocaleDateString('fr-FR')}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:.88rem;">
            <thead><tr style="background:#eee;"><th style="border:1px solid #999;padding:4px 8px;">N°</th><th style="border:1px solid #999;padding:4px 8px;text-align:left;">Élève</th><th style="border:1px solid #999;padding:4px 8px;">Classe</th><th style="border:1px solid #999;padding:4px 8px;text-align:left;">Pièces manquantes</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
        </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
}

// ---------- Détection des doublons ----------
function dblNorm(s) { return String(s == null ? '' : s).toLowerCase().replace(/[éèê]/g, 'e').replace(/[àâ]/g, 'a').replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o').replace(/[ûü]/g, 'u').replace(/\s+/g, ' ').trim(); }

function renderDoublons() {
    const box = document.getElementById('doublonsBox'); if (!box) return;
    const groupes = {};
    eleves.forEach(e => {
        const cle = dblNorm(e.nom) + '|' + dblNorm(e.prenom);
        if (!cle || cle === '|') return;
        (groupes[cle] = groupes[cle] || []).push(e);
    });
    const doublons = Object.values(groupes).filter(g => g.length > 1);
    if (!doublons.length) {
        box.innerHTML = '<p style="color:#16a34a;font-weight:600;padding:.5rem;">✓ Aucun doublon détecté (aucun élève avec le même nom et prénom).</p>';
        return;
    }
    const blocs = doublons.map(g => {
        const lignes = g.map(e => `<tr>
            <td style="font-weight:600;">${scEsc(e.nom)} ${scEsc(e.prenom)}</td>
            <td style="font-family:monospace;font-size:.82rem;">${scEsc(e.matricule || '—')}</td>
            <td>${scEsc(e.classe || '—')}</td>
            <td>${e.dateNaissance ? new Date(e.dateNaissance).toLocaleDateString('fr-FR') : '—'}</td>
            <td>${e.dateInscription ? new Date(e.dateInscription).toLocaleDateString('fr-FR') : '—'}</td>
            <td style="text-align:right;"><button class="btn btn-danger" style="padding:.2rem .5rem;font-size:.78rem;" onclick="dblSupprimer('${e.id}')">🗑️ Supprimer</button></td>
        </tr>`).join('');
        return `<div style="border:1px solid #fecaca;border-radius:10px;padding:.75rem;margin-bottom:.75rem;background:#fff7f7;">
            <p style="margin:0 0 .5rem;font-weight:700;color:#b91c1c;">⚠️ ${g.length} fiches : ${scEsc(g[0].nom)} ${scEsc(g[0].prenom)}</p>
            <table style="width:100%;"><thead><tr><th>Nom</th><th>Matricule</th><th>Classe</th><th>Naissance</th><th>Inscrit le</th><th></th></tr></thead><tbody>${lignes}</tbody></table>
        </div>`;
    }).join('');
    box.innerHTML = `<p style="font-weight:600;color:#b91c1c;margin:0 0 .75rem;">${doublons.length} cas de doublon détecté(s) :</p>${blocs}
        <p style="color:#64748b;font-size:.8rem;margin:.25rem 0 0;">Vérifiez chaque cas (un homonyme peut être un vrai cas différent). Supprimez uniquement les fiches réellement en double — la suppression retire aussi l'élève de la caisse.</p>`;
}

function dblSupprimer(id) {
    // réutilise la suppression synchronisée existante puis rafraîchit la liste des doublons
    deleteEleve(id);
    renderDoublons();
}

// ---------- Fiche élève (vue 360°) ----------
function ficheResteAPayer(id) {
    const e = eleves.find(x => x.id === id) || {};
    let mens = 0, mois = 9;
    try { const g = JSON.parse(localStorage.getItem('ecole_grille_tarifaire')) || {}; if (g[e.classe]) mens = parseFloat(g[e.classe].mensualite) || 0; } catch (x) { }
    try { const m = parseInt(localStorage.getItem('ecole_mois_scolarite'), 10); if (!isNaN(m)) mois = m; } catch (x) { } if (mois < 1) mois = 1; if (mois > 12) mois = 12;
    // réduction
    try {
        const r = (JSON.parse(localStorage.getItem('ecole_reductions')) || {})[id];
        if (r && r.mode && r.mode !== 'aucune') {
            if (r.mode === 'gratuite') mens = 0;
            else if (r.mode === 'pourcentage') mens = Math.round(mens * (1 - (Math.max(0, Math.min(100, parseFloat(r.valeur) || 0)) / 100)));
            else if (r.mode === 'fixe') { const v = parseFloat(r.valeur); if (!isNaN(v) && v >= 0) mens = v; }
        }
    } catch (x) { }
    const du = mens * mois;
    let paye = 0;
    try { const tx = JSON.parse(localStorage.getItem('digigespro_transactions')) || []; paye = tx.filter(t => t.studentId === id && t.type === 'scolarite').reduce((a, t) => a + parseFloat(t.amount || 0), 0); } catch (x) { }
    return { du: du, paye: paye, reste: du - paye };
}
function ficheReductionLabel(id) {
    try {
        const r = (JSON.parse(localStorage.getItem('ecole_reductions')) || {})[id];
        if (!r || !r.mode || r.mode === 'aucune') return 'Aucune';
        if (r.mode === 'gratuite') return 'Gratuité totale';
        if (r.mode === 'pourcentage') return '−' + (parseFloat(r.valeur) || 0) + '%' + (r.motif ? ' (' + scEsc(r.motif) + ')' : '');
        if (r.mode === 'fixe') return 'Forfait ' + (parseFloat(r.valeur) || 0).toLocaleString('fr-FR') + ' FCFA/mois' + (r.motif ? ' (' + scEsc(r.motif) + ')' : '');
    } catch (x) { }
    return 'Aucune';
}
function ficheEleve(id) {
    const e = eleves.find(x => x.id === id); if (!e) return;
    const fc = ficheResteAPayer(id);
    const fmt = n => (Math.round(n) || 0).toLocaleString('fr-FR') + ' FCFA';
    const complet = (typeof dosComplet === 'function') ? dosComplet(id) : true;
    const manq = (typeof dosManquantes === 'function') ? dosManquantes(id) : [];
    const photo = e.photo ? `<img src="${e.photo}" alt="" style="width:96px;height:120px;object-fit:cover;border:1px solid #cbd5e1;border-radius:10px;">` : `<div style="width:96px;height:120px;border:1px solid #cbd5e1;border-radius:10px;background:#eef4fc;display:flex;align-items:center;justify-content:center;font-size:2rem;color:#94a3b8;">${scEsc(((e.nom||' ')[0]||'')+((e.prenom||' ')[0]||'')).toUpperCase()}</div>`;
    const info = (lbl, val) => `<div style="margin-bottom:.4rem;"><span style="color:#64748b;font-size:.8rem;">${lbl}</span><br><strong>${val || '—'}</strong></div>`;
    document.getElementById('ficheContent').innerHTML = `
        <div style="display:flex;gap:1.2rem;flex-wrap:wrap;">
            ${photo}
            <div style="flex:1;min-width:220px;">
                <h2 style="margin:0 0 .2rem;font-size:1.3rem;">${scEsc(e.nom)} ${scEsc(e.prenom)}</h2>
                <div style="font-family:monospace;color:#64748b;margin-bottom:.6rem;">${scEsc(e.matricule || '')}</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:.3rem 1rem;">
                    ${info('Classe', scEsc(e.classe))}
                    ${info('Statut', scEsc(e.statut))}
                    ${info('Sexe', e.sexe === 'M' ? 'Masculin' : e.sexe === 'F' ? 'Féminin' : '—')}
                    ${info('Né(e) le', e.dateNaissance ? new Date(e.dateNaissance).toLocaleDateString('fr-FR') : '')}
                    ${info('Lieu de naissance', scEsc(e.lieuNaissance))}
                    ${info('Année scolaire', scEsc(e.anneeScolaire))}
                </div>
            </div>
        </div>
        <div style="border-top:1px solid #e2e8f0;margin:1rem 0;padding-top:1rem;display:grid;grid-template-columns:1fr 1fr;gap:.3rem 1rem;">
            ${info('Parent / tuteur', scEsc(e.tuteur))}
            ${info('Téléphone', scEsc(e.telephone))}
            ${info('Adresse', scEsc(e.adresse))}
            ${info('Réduction / bourse', ficheReductionLabel(id))}
        </div>
        <div style="border-top:1px solid #e2e8f0;margin:1rem 0;padding-top:1rem;">
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.75rem;margin-bottom:1rem;">
                <div style="background:#eef2ff;border-radius:10px;padding:.6rem .8rem;"><div style="color:#64748b;font-size:.78rem;">Scolarité due</div><strong style="font-size:1.05rem;">${fmt(fc.du)}</strong></div>
                <div style="background:#dcfce7;border-radius:10px;padding:.6rem .8rem;"><div style="color:#166534;font-size:.78rem;">Payé</div><strong style="font-size:1.05rem;color:#166534;">${fmt(fc.paye)}</strong></div>
                <div style="background:${fc.reste > 0 ? '#fee2e2' : '#dcfce7'};border-radius:10px;padding:.6rem .8rem;"><div style="color:${fc.reste > 0 ? '#991b1b' : '#166534'};font-size:.78rem;">Reste à payer</div><strong style="font-size:1.05rem;color:${fc.reste > 0 ? '#b91c1c' : '#166534'};">${fmt(fc.reste)}</strong></div>
            </div>
            <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;">
                <span style="color:#64748b;font-size:.85rem;">Dossier d'inscription :</span>
                ${complet ? '<span style="background:#dcfce7;color:#166534;border-radius:999px;padding:2px 10px;font-weight:700;font-size:.8rem;">Complet</span>' : `<span style="background:#fee2e2;color:#991b1b;border-radius:999px;padding:2px 10px;font-weight:700;font-size:.8rem;">Incomplet</span> <span style="color:#b91c1c;font-size:.82rem;">manque : ${manq.map(scEsc).join(', ')}</span>`}
            </div>
        </div>
        <div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-top:.5rem;">
            <button class="btn btn-secondary" onclick="fermerFiche();editEleve('${e.id}')">✏️ Modifier</button>
            <button class="btn btn-secondary" onclick="document.getElementById('certEleve')&&(document.getElementById('certEleve').value='${e.id}');fermerFiche();showSection('certificats')">📄 Documents</button>
        </div>`;
    document.getElementById('ficheModal').classList.remove('hidden');
}
function fermerFiche() { document.getElementById('ficheModal').classList.add('hidden'); }

// ---------- Import / Export Excel ----------
function updateHeaderDate() {
    const el = document.getElementById('headerDate');
    if (el && !el.value) el.value = new Date().toISOString().split('T')[0];
}

function renderDonnees() {
    const el = document.getElementById('donneesCount');
    if (el) el.textContent = eleves.length;
}

function dateNorm(v) {
    if (!v) return '';
    v = String(v).trim();
    let m = v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/); // JJ/MM/AAAA
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
    return v;
}

function importerEleves(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    if (typeof XLSX === 'undefined') { alert('La librairie de lecture Excel n\'est pas chargée.'); return; }
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
            if (!rows.length) { alert('Le fichier ne contient aucune ligne.'); return; }
            const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
            let added = 0;
            const year = new Date().getFullYear();
            rows.forEach(r => {
                const m = {}; Object.keys(r).forEach(k => { m[norm(k)] = r[k]; });
                const get = (...keys) => { for (const k of keys) { if (m[k] !== undefined && String(m[k]).trim() !== '') return String(m[k]).trim(); } return ''; };
                const nom = get('nom'); const prenom = get('prenom', 'prenoms', 'prénom');
                if (!nom && !prenom) return;
                let sexe = get('sexe').toUpperCase(); sexe = sexe.startsWith('F') ? 'F' : 'M';
                eleves.push({
                    id: 'e' + Date.now() + '_' + added,
                    matricule: get('matricule') || `MAT-${year}-${String(eleves.length + 1 + added).padStart(4, '0')}`,
                    nom: nom, prenom: prenom, sexe: sexe,
                    dateNaissance: dateNorm(get('date de naissance', 'naissance', 'datenaissance', 'ne le', 'nee le')),
                    lieuNaissance: get('lieu de naissance', 'lieu', 'lieunaissance'),
                    classe: get('classe'),
                    anneeScolaire: get('annee scolaire', 'annee', 'anneescolaire') || anneeScolaireCourante(),
                    statut: get('statut') || 'Nouveau',
                    tuteur: get('tuteur', 'parent', 'parent / tuteur', 'parent/tuteur'),
                    telephone: get('telephone', 'tel', 'contact', 'téléphone'),
                    dateInscription: new Date().toISOString().split('T')[0]
                });
                added++;
            });
            saveEleves();
            input.value = '';
            alert(`${added} élève(s) importé(s) avec succès.`);
            renderDonnees();
            showSection('eleves');
        } catch (err) {
            alert('Erreur de lecture du fichier : ' + err.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

function telechargerModeleEleves() {
    if (typeof XLSX === 'undefined') { alert('Librairie Excel non chargée.'); return; }
    const rows = [{
        Nom: 'NGOBO', 'Prénom': 'Aline', Sexe: 'F', 'Date de naissance': '2010-09-15',
        'Lieu de naissance': 'Brazzaville', Classe: '6ème', 'Année scolaire': anneeScolaireCourante(),
        Statut: 'Nouveau', Tuteur: 'M. NGOBO', 'Téléphone': '06 000 00 00'
    }];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modèle');
    XLSX.writeFile(wb, 'modele_import_eleves.xlsx');
}

function exporterElevesExcel() {
    if (typeof XLSX === 'undefined') { alert('Librairie Excel non chargée.'); return; }
    if (!eleves.length) { alert('Aucun élève à exporter.'); return; }
    const rows = eleves.map(e => ({
        Matricule: e.matricule, Nom: e.nom, 'Prénom': e.prenom, Sexe: e.sexe,
        'Date de naissance': e.dateNaissance, 'Lieu de naissance': e.lieuNaissance,
        Classe: e.classe, 'Année scolaire': e.anneeScolaire, Statut: e.statut,
        Tuteur: e.tuteur, 'Téléphone': e.telephone
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Élèves');
    XLSX.writeFile(wb, 'liste_eleves.xlsx');
}

function exporterEffectifsExcel() {
    if (typeof XLSX === 'undefined') { alert('Librairie Excel non chargée.'); return; }
    const rows = classes.map(c => ({
        Classe: c.nom,
        Effectif: eleves.filter(e => e.classe === c.nom).length,
        'Garçons': eleves.filter(e => e.classe === c.nom && e.sexe === 'M').length,
        Filles: eleves.filter(e => e.classe === c.nom && e.sexe === 'F').length
    }));
    rows.push({ Classe: 'TOTAL', Effectif: eleves.length, 'Garçons': eleves.filter(e => e.sexe === 'M').length, Filles: eleves.filter(e => e.sexe === 'F').length });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Effectifs');
    XLSX.writeFile(wb, 'rapport_effectifs.xlsx');
}

// ---------- Plan d'action annuel / activités trimestrielles ----------
function savePlanActions() { localStorage.setItem(PLAN_KEY, JSON.stringify(planActions)); }
function renderPlan() {
    const f = document.getElementById('planFiltre');
    if (!f.innerHTML) f.innerHTML = '<option value="">Toutes les périodes</option>' + PLAN_PERIODES.map(p => `<option>${p}</option>`).join('');
    if (!document.getElementById('planPeriode').innerHTML) document.getElementById('planPeriode').innerHTML = PLAN_PERIODES.map(p => `<option>${p}</option>`).join('');
    if (!document.getElementById('planStatutSel').innerHTML) document.getElementById('planStatutSel').innerHTML = PLAN_STATUTS.map(s => `<option>${s}</option>`).join('');
    const done = planActions.filter(a => a.statut === 'Réalisé').length;
    const pct = planActions.length ? Math.round(done / planActions.length * 100) : 0;
    document.getElementById('planProgress').textContent = `${pct} % réalisé (${done}/${planActions.length})`;

    let list = planActions.slice();
    const filtre = f.value;
    if (filtre) list = list.filter(a => a.periode === filtre);
    const tbody = document.getElementById('planTable');
    tbody.innerHTML = list.length === 0
        ? '<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:#64748b;">Aucune action. Définissez votre plan d\'action ci-dessus.</td></tr>'
        : list.map(a => {
            const col = a.statut === 'Réalisé' ? '#16a34a' : (a.statut === 'En cours' ? '#0ea5e9' : '#f59e0b');
            return `<tr>
                <td>${scEsc(a.axe)}</td>
                <td style="font-weight:600;">${scEsc(a.action)}</td>
                <td>${scEsc(a.responsable)}</td>
                <td>${scEsc(a.periode)}${a.echeance ? '<br><span style="color:#64748b;font-size:0.8rem;">' + new Date(a.echeance).toLocaleDateString('fr-FR') + '</span>' : ''}</td>
                <td><button class="btn" style="padding:0.25rem 0.6rem;font-size:0.8rem;background:${col};color:#fff;" onclick="togglePlanStatut('${a.id}')">${scEsc(a.statut)}</button></td>
                <td style="text-align:right;white-space:nowrap;">
                    <button class="btn btn-secondary" style="padding:0.3rem 0.6rem;font-size:0.85rem;" onclick="editPlan('${a.id}')">✏️</button>
                    <button class="btn btn-danger" style="padding:0.3rem 0.6rem;font-size:0.85rem;" onclick="deletePlan('${a.id}')">🗑️</button>
                </td></tr>`;
        }).join('');
}
function addOrUpdatePlan() {
    const action = document.getElementById('planAction').value.trim();
    if (!action) { alert("Décrivez l'action à mener."); return; }
    const data = {
        axe: document.getElementById('planAxe').value.trim(),
        action: action,
        responsable: document.getElementById('planResponsable').value.trim(),
        periode: document.getElementById('planPeriode').value,
        echeance: document.getElementById('planEcheance').value,
        statut: document.getElementById('planStatutSel').value
    };
    if (editPlanId) { Object.assign(planActions.find(x => x.id === editPlanId), data); editPlanId = null; document.getElementById('planBtn').textContent = '➕ Ajouter'; }
    else { data.id = 'pa' + Date.now(); planActions.push(data); }
    savePlanActions();
    ['planAxe', 'planAction', 'planResponsable', 'planEcheance'].forEach(i => document.getElementById(i).value = '');
    renderPlan();
}
function editPlan(id) {
    const a = planActions.find(x => x.id === id); if (!a) return;
    editPlanId = id;
    document.getElementById('planAxe').value = a.axe || '';
    document.getElementById('planAction').value = a.action || '';
    document.getElementById('planResponsable').value = a.responsable || '';
    document.getElementById('planPeriode').value = a.periode || 'Annuel';
    document.getElementById('planEcheance').value = a.echeance || '';
    document.getElementById('planStatutSel').value = a.statut || 'À faire';
    document.getElementById('planBtn').textContent = '✓ Modifier';
}
function togglePlanStatut(id) {
    const a = planActions.find(x => x.id === id); if (!a) return;
    const i = PLAN_STATUTS.indexOf(a.statut);
    a.statut = PLAN_STATUTS[(i + 1) % PLAN_STATUTS.length];
    savePlanActions(); renderPlan();
}
function deletePlan(id) {
    if (!confirm('Supprimer cette action ?')) return;
    planActions = planActions.filter(x => x.id !== id);
    savePlanActions(); renderPlan();
}
function exporterPlanExcel() {
    if (typeof XLSX === 'undefined') { alert('Librairie Excel non chargée.'); return; }
    const rows = planActions.map(a => ({ Axe: a.axe, Action: a.action, Responsable: a.responsable, Période: a.periode, Échéance: a.echeance, Statut: a.statut }));
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Axe: '', Action: '', Responsable: '', Période: '', Échéance: '', Statut: '' }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plan d'action");
    XLSX.writeFile(wb, 'plan_action.xlsx');
}

// ---------- Conseils de maîtres ----------
function saveConseilsM() { localStorage.setItem(CONSEILS_M_KEY, JSON.stringify(conseilsMaitres)); }
function renderConseilsM() {
    const d = document.getElementById('cmDate');
    if (!d.value) d.value = new Date().toISOString().split('T')[0];
    const tbody = document.getElementById('cmTable');
    const list = conseilsMaitres.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    tbody.innerHTML = list.length === 0
        ? '<tr><td colspan="4" style="text-align:center;padding:1.5rem;color:#64748b;">Aucun conseil de maîtres enregistré.</td></tr>'
        : list.map(c => `<tr>
            <td>${c.date ? new Date(c.date).toLocaleDateString('fr-FR') : '-'}</td>
            <td style="font-weight:600;">${scEsc(c.objet)}</td>
            <td>${scEsc(c.participants)}</td>
            <td style="text-align:right;white-space:nowrap;">
                <button class="btn btn-primary" style="padding:0.3rem 0.6rem;font-size:0.85rem;" onclick="genererPVMaitres('${c.id}')"><i class="bi bi-printer"></i></button>
                <button class="btn btn-danger" style="padding:0.3rem 0.6rem;font-size:0.85rem;" onclick="deleteConseilM('${c.id}')">🗑️</button>
            </td></tr>`).join('');
}
function addConseilM() {
    const objet = document.getElementById('cmObjet').value.trim();
    if (!objet) { alert("L'objet du conseil est obligatoire."); return; }
    conseilsMaitres.push({
        id: 'cm' + Date.now(),
        date: document.getElementById('cmDate').value || new Date().toISOString().split('T')[0],
        objet: objet,
        ordre: document.getElementById('cmOrdre').value.trim(),
        participants: document.getElementById('cmParticipants').value.trim(),
        decisions: document.getElementById('cmDecisions').value.trim()
    });
    saveConseilsM();
    ['cmObjet', 'cmOrdre', 'cmParticipants', 'cmDecisions'].forEach(i => document.getElementById(i).value = '');
    renderConseilsM();
}
function deleteConseilM(id) {
    if (!confirm('Supprimer ce conseil ?')) return;
    conseilsMaitres = conseilsMaitres.filter(x => x.id !== id);
    saveConseilsM(); renderConseilsM();
}
function genererPVMaitres(id) {
    const c = conseilsMaitres.find(x => x.id === id); if (!c) return;
    const ecole = getEcoleName();
    const html = `
        <div style="font-family:Arial,sans-serif;max-width:780px;margin:0 auto;padding:2.5rem;color:#111;">
            <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:0.75rem;margin-bottom:1.5rem;"><h2 style="margin:0;text-transform:uppercase;">${scEsc(ecole)}</h2></div>
            <h1 style="text-align:center;font-size:1.3rem;letter-spacing:1px;margin:1rem 0;">PROCÈS-VERBAL — CONSEIL DES MAÎTRES</h1>
            <p style="margin:0.5rem 0;"><strong>Date :</strong> ${c.date ? new Date(c.date).toLocaleDateString('fr-FR') : ''}</p>
            <p style="margin:0.5rem 0;"><strong>Objet :</strong> ${scEsc(c.objet)}</p>
            <p style="margin:0.5rem 0;"><strong>Participants :</strong> ${scEsc(c.participants) || '-'}</p>
            ${c.ordre ? `<p style="margin:0.75rem 0 0.25rem;"><strong>Ordre du jour :</strong></p><div style="white-space:pre-wrap;line-height:1.7;">${scEsc(c.ordre)}</div>` : ''}
            <hr style="margin:1.25rem 0;">
            <h3 style="margin:0 0 0.5rem;">Décisions et résolutions</h3>
            <div style="line-height:1.8;font-size:1.02rem;text-align:justify;white-space:pre-wrap;">${scEsc(c.decisions) || '(à compléter)'}</div>
            <div style="margin-top:3rem;display:flex;justify-content:space-between;">
                <div><strong>Le Secrétaire de séance</strong><div style="height:60px;"></div></div>
                <div style="text-align:right;"><strong>Le Chef de service de la scolarité</strong><div style="height:60px;"></div></div>
            </div>
        </div>`;
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>PV Conseil des maîtres</title></head><body>${html}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
}

// ---------- Examens ----------
function saveExamens() { localStorage.setItem(EXAMENS_KEY, JSON.stringify(examens)); }
function renderExamens() {
    if (!document.getElementById('exType').innerHTML) document.getElementById('exType').innerHTML = EXAM_TYPES.map(t => `<option>${t}</option>`).join('');
    if (!document.getElementById('exTrimestre').innerHTML) document.getElementById('exTrimestre').innerHTML = ['1er trimestre', '2e trimestre', '3e trimestre'].map(t => `<option>${t}</option>`).join('');
    const tbody = document.getElementById('exTable');
    const list = examens.slice().sort((a, b) => (b.debut || '').localeCompare(a.debut || ''));
    tbody.innerHTML = list.length === 0
        ? '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:#64748b;">Aucune session d\'examen planifiée.</td></tr>'
        : list.map(x => `<tr>
            <td style="font-weight:600;">${scEsc(x.intitule)}</td>
            <td>${scEsc(x.type)}</td>
            <td>${x.debut ? new Date(x.debut).toLocaleDateString('fr-FR') : '-'}${x.fin ? ' → ' + new Date(x.fin).toLocaleDateString('fr-FR') : ''}</td>
            <td>${scEsc(x.classes)}</td>
            <td style="text-align:right;white-space:nowrap;">
                <button class="btn btn-primary" style="padding:0.3rem 0.6rem;font-size:0.85rem;" onclick="genererPlanningExamen('${x.id}')"><i class="bi bi-printer"></i></button>
                <button class="btn btn-danger" style="padding:0.3rem 0.6rem;font-size:0.85rem;" onclick="deleteExamen('${x.id}')">🗑️</button>
            </td></tr>`).join('');
}
function addExamen() {
    const intitule = document.getElementById('exIntitule').value.trim();
    if (!intitule) { alert("L'intitulé de l'examen est obligatoire."); return; }
    examens.push({
        id: 'ex' + Date.now(),
        intitule: intitule,
        type: document.getElementById('exType').value,
        trimestre: document.getElementById('exTrimestre').value,
        debut: document.getElementById('exDebut').value,
        fin: document.getElementById('exFin').value,
        classes: document.getElementById('exClasses').value.trim(),
        planning: document.getElementById('exPlanning').value.trim(),
        responsable: document.getElementById('exResponsable').value.trim()
    });
    saveExamens();
    ['exIntitule', 'exClasses', 'exPlanning', 'exResponsable'].forEach(i => document.getElementById(i).value = '');
    renderExamens();
}
function deleteExamen(id) {
    if (!confirm("Supprimer cette session d'examen ?")) return;
    examens = examens.filter(x => x.id !== id);
    saveExamens(); renderExamens();
}
function genererPlanningExamen(id) {
    const x = examens.find(e => e.id === id); if (!x) return;
    const ecole = getEcoleName();
    const html = `
        <div style="font-family:Arial,sans-serif;max-width:780px;margin:0 auto;padding:2.5rem;color:#111;">
            <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:0.75rem;margin-bottom:1.5rem;"><h2 style="margin:0;text-transform:uppercase;">${scEsc(ecole)}</h2></div>
            <h1 style="text-align:center;font-size:1.3rem;letter-spacing:1px;margin:1rem 0 0.25rem;">${scEsc(x.intitule).toUpperCase()}</h1>
            <p style="text-align:center;margin:0 0 1.5rem;color:#444;">${scEsc(x.type)} — ${scEsc(x.trimestre)}</p>
            <p style="margin:0.5rem 0;"><strong>Période :</strong> ${x.debut ? new Date(x.debut).toLocaleDateString('fr-FR') : '...'}${x.fin ? ' au ' + new Date(x.fin).toLocaleDateString('fr-FR') : ''}</p>
            <p style="margin:0.5rem 0;"><strong>Classes concernées :</strong> ${scEsc(x.classes) || '-'}</p>
            <p style="margin:0.5rem 0;"><strong>Responsable / Surveillance :</strong> ${scEsc(x.responsable) || '-'}</p>
            <hr style="margin:1.25rem 0;">
            <h3 style="margin:0 0 0.5rem;">Planning des épreuves</h3>
            <div style="line-height:1.8;font-size:1.02rem;white-space:pre-wrap;">${scEsc(x.planning) || '(à compléter : jours, horaires, matières)'}</div>
            <div style="margin-top:3rem;text-align:right;"><strong>Le Chef de service de la scolarité</strong><div style="height:60px;"></div>(Signature)</div>
        </div>`;
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${scEsc(x.intitule)}</title></head><body>${html}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
}

// ---------- Pré-inscriptions (demandes d'admission) ----------
function savePreinscriptions() { localStorage.setItem(PREINSCR_KEY, JSON.stringify(preinscriptions)); }
function renderPreinscriptions() {
    const sel = document.getElementById('preClasse');
    if (!sel.dataset.init) { sel.innerHTML = '<option value="">-- Classe souhaitée --</option>' + classes.map(c => `<option value="${scAttr(c.nom)}">${scEsc(c.nom)}</option>`).join(''); sel.dataset.init = '1'; }
    const tbody = document.getElementById('preTable');
    const list = preinscriptions.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    document.getElementById('preCount').textContent = preinscriptions.length + ' demande(s) en attente';
    tbody.innerHTML = list.length === 0
        ? '<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:#64748b;">Aucune demande de pré-inscription.</td></tr>'
        : list.map(p => `<tr>
            <td style="font-weight:600;">${scEsc(p.nom)} ${scEsc(p.prenom)}</td>
            <td>${scEsc(p.sexe || '-')}</td>
            <td>${scEsc(p.classe)}</td>
            <td>${scEsc(p.parent || '-')}</td>
            <td>${scEsc(p.tel || '-')}</td>
            <td style="text-align:right;white-space:nowrap;">
                <button class="btn btn-primary" style="padding:0.3rem 0.6rem;font-size:0.82rem;" title="Valider l'inscription" onclick="validerPreinscription('${p.id}')"><i class="bi bi-check2-circle"></i> Inscrire</button>
                <button class="btn btn-danger" style="padding:0.3rem 0.6rem;font-size:0.82rem;" onclick="deletePreinscription('${p.id}')">🗑️</button>
            </td></tr>`).join('');
}
function addPreinscription() {
    const nom = document.getElementById('preNom').value.trim();
    const prenom = document.getElementById('prePrenom').value.trim();
    if (!nom || !prenom) { alert('Nom et prénom obligatoires.'); return; }
    preinscriptions.push({
        id: 'pre' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        nom: nom, prenom: prenom,
        sexe: document.getElementById('preSexe').value,
        dateNaissance: document.getElementById('preNaiss').value,
        classe: document.getElementById('preClasse').value,
        parent: document.getElementById('preParent').value.trim(),
        tel: document.getElementById('preTel').value.trim()
    });
    savePreinscriptions();
    ['preNom', 'prePrenom', 'preNaiss', 'preParent', 'preTel'].forEach(i => document.getElementById(i).value = '');
    renderPreinscriptions();
}
function deletePreinscription(id) {
    if (!confirm('Supprimer cette demande ?')) return;
    preinscriptions = preinscriptions.filter(x => x.id !== id);
    savePreinscriptions(); renderPreinscriptions();
}
function validerPreinscription(id) {
    const p = preinscriptions.find(x => x.id === id); if (!p) return;
    if (!confirm(`Inscrire définitivement ${p.nom} ${p.prenom} ? Un matricule sera attribué.`)) return;
    const year = new Date().getFullYear();
    const seq = eleves.length + 1;
    eleves.push({
        id: 'e' + Date.now(),
        matricule: `MAT-${year}-${String(seq).padStart(4, '0')}`,
        nom: p.nom, prenom: p.prenom, sexe: p.sexe || '',
        dateNaissance: p.dateNaissance || '',
        classe: p.classe || '',
        parent: p.parent || '', telephoneParent: p.tel || '',
        statut: 'Inscrit', anneeScolaire: anneeScolaireCourante(),
        dateInscription: new Date().toISOString().split('T')[0]
    });
    saveEleves();
    preinscriptions = preinscriptions.filter(x => x.id !== id);
    savePreinscriptions();
    renderPreinscriptions();
    alert(`${p.nom} ${p.prenom} inscrit(e) avec succès. Retrouvez-le/la dans « Élèves ».`);
}

// ---------- Photo d'identité ----------
function chargerPhotoEleve(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) { alert('Choisissez une image.'); input.value = ''; return; }
    const reader = new FileReader();
    reader.onload = function (ev) {
        const img = new Image();
        img.onload = function () {
            const maxW = 150, maxH = 190;
            let w = img.width, h = img.height;
            const ratio = Math.min(maxW / w, maxH / h, 1);
            w = Math.round(w * ratio); h = Math.round(h * ratio);
            const canvas = document.createElement('canvas');
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            photoTemp = canvas.toDataURL('image/jpeg', 0.7);
            const prev = document.getElementById('elPhotoPreview');
            prev.src = photoTemp; prev.style.display = 'block';
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
}
function retirerPhotoEleve() {
    photoTemp = '';
    document.getElementById('elPhoto').value = '';
    document.getElementById('elPhotoPreview').style.display = 'none';
}

// ---------- Cartes scolaires ----------
function renderCartes() {
    const sel = document.getElementById('cartesClasse');
    if (!sel.dataset.init) {
        sel.innerHTML = '<option value="">-- Toutes les classes --</option>' + classes.map(c => `<option value="${scAttr(c.nom)}">${scEsc(c.nom)}</option>`).join('');
        sel.dataset.init = '1';
    }
    const classe = sel.value;
    const list = (classe ? eleves.filter(e => e.classe === classe) : eleves).slice()
        .sort((a, b) => (a.classe + a.nom).localeCompare(b.classe + b.nom));
    const tbody = document.getElementById('cartesTable');
    tbody.innerHTML = list.length === 0
        ? '<tr><td colspan="4" style="text-align:center;padding:1.5rem;color:#64748b;">Aucun élève. Enregistrez des élèves dans la section « Élèves ».</td></tr>'
        : list.map(e => `<tr>
            <td style="font-weight:600;">${scEsc(e.nom)} ${scEsc(e.prenom)}</td>
            <td>${scEsc(e.matricule || '-')}</td>
            <td>${scEsc(e.classe)}</td>
            <td style="text-align:right;"><button class="btn btn-primary" style="padding:0.3rem 0.7rem;font-size:0.85rem;" onclick="genererCarteEleve('${e.id}')"><i class="bi bi-printer"></i> Carte</button></td>
        </tr>`).join('');
}
function carteEleveHTML(e) {
    const ecole = getEcoleName();
    const annee = e.anneeScolaire || anneeScolaireCourante();
    return `
    <div style="width:340px;height:215px;border:2px solid #2E2769;border-radius:12px;font-family:Arial,sans-serif;color:#111;display:inline-block;margin:8px;overflow:hidden;vertical-align:top;">
        <div style="background:#2E2769;color:#fff;padding:6px 10px;text-align:center;">
            <div style="font-size:0.62rem;letter-spacing:0.5px;">RÉPUBLIQUE DU CONGO &ndash; Unité, Travail, Progrès</div>
            <div style="font-weight:bold;font-size:0.82rem;text-transform:uppercase;line-height:1.1;">${scEsc(ecole)}</div>
            <div style="font-size:0.68rem;letter-spacing:2px;">CARTE SCOLAIRE</div>
        </div>
        <div style="display:flex;padding:8px 10px;gap:10px;">
            <div style="width:74px;height:92px;border:1px solid #999;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:0.6rem;text-align:center;flex-shrink:0;overflow:hidden;">${e.photo ? `<img src="${e.photo}" alt="" style="width:100%;height:100%;object-fit:cover;">` : 'PHOTO'}</div>
            <div style="font-size:0.74rem;line-height:1.5;">
                <div><strong>${scEsc(e.nom)} ${scEsc(e.prenom)}</strong></div>
                <div>Matricule : ${scEsc(e.matricule || '-')}</div>
                <div>Classe : ${scEsc(e.classe)}</div>
                ${e.dateNaissance ? `<div>Né(e) le : ${new Date(e.dateNaissance).toLocaleDateString('fr-FR')}</div>` : ''}
                <div>Année : ${scEsc(annee)}</div>
            </div>
        </div>
        <div style="text-align:right;padding:0 10px;font-size:0.6rem;color:#555;">Le Directeur ____________</div>
    </div>`;
}
function genererCarteEleve(id) {
    const e = eleves.find(x => x.id === id); if (!e) return;
    imprimerCartes(carteEleveHTML(e), `Carte - ${e.nom} ${e.prenom}`);
}
function genererToutesCartes() {
    const classe = document.getElementById('cartesClasse').value;
    const list = (classe ? eleves.filter(e => e.classe === classe) : eleves).slice()
        .sort((a, b) => (a.classe + a.nom).localeCompare(b.classe + b.nom));
    if (!list.length) { alert('Aucun élève à imprimer.'); return; }
    imprimerCartes(list.map(carteEleveHTML).join(''), `Cartes scolaires${classe ? ' - ' + classe : ''}`);
}
function imprimerCartes(contenu, titre) {
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${scEsc(titre)}</title></head><body style="text-align:center;">${contenu}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
}

// ---------- Reporting (effectifs) ----------
function renderScolReporting() {
    const total = eleves.length;
    const g = eleves.filter(e => e.sexe === 'M').length;
    const f = eleves.filter(e => e.sexe === 'F').length;
    const pctF = total ? Math.round(f / total * 100) : 0;
    document.getElementById('repTotal').textContent = total;
    document.getElementById('repGarcons').textContent = g;
    document.getElementById('repFilles').textContent = f;
    document.getElementById('repPctFilles').textContent = pctF + ' %';
    document.getElementById('repNbClasses').textContent = classes.length;

    // Tableau par classe
    const parClasse = classes.map(c => ({ nom: c.nom, n: eleves.filter(e => e.classe === c.nom).length }));
    document.getElementById('repTableClasse').innerHTML = `
        <table><thead><tr><th>Classe</th><th style="text-align:center;">Garçons</th><th style="text-align:center;">Filles</th><th style="text-align:right;">Total</th></tr></thead><tbody>
        ${classes.map(c => {
            const cg = eleves.filter(e => e.classe === c.nom && e.sexe === 'M').length;
            const cf = eleves.filter(e => e.classe === c.nom && e.sexe === 'F').length;
            return `<tr><td style="font-weight:600;">${scEsc(c.nom)}</td><td style="text-align:center;">${cg}</td><td style="text-align:center;">${cf}</td><td style="text-align:right;font-weight:600;">${cg + cf}</td></tr>`;
        }).join('')}
        <tr style="font-weight:700;border-top:2px solid #1B6BFF;"><td>TOTAL</td><td style="text-align:center;">${g}</td><td style="text-align:center;">${f}</td><td style="text-align:right;">${total}</td></tr>
        </tbody></table>`;

    if (typeof Chart === 'undefined') return;
    // Effectifs par classe (barres)
    if (scolChartClasse) scolChartClasse.destroy();
    scolChartClasse = new Chart(document.getElementById('repChartClasse'), {
        type: 'bar',
        data: { labels: parClasse.map(c => c.nom), datasets: [{ label: 'Effectif', data: parClasse.map(c => c.n), backgroundColor: 'rgba(27,107,255,0.8)' }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } }
    });
    // Répartition par sexe (anneau)
    if (scolChartSexe) scolChartSexe.destroy();
    scolChartSexe = new Chart(document.getElementById('repChartSexe'), {
        type: 'doughnut',
        data: { labels: ['Garçons', 'Filles'], datasets: [{ data: [g, f], backgroundColor: ['#0ea5e9', '#ec4899'] }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom' } } }
    });
    // Répartition par statut (anneau)
    const statuts = ['Nouveau', 'Réinscrit', 'Sortant'];
    if (scolChartStatut) scolChartStatut.destroy();
    scolChartStatut = new Chart(document.getElementById('repChartStatut'), {
        type: 'doughnut',
        data: { labels: statuts, datasets: [{ data: statuts.map(s => eleves.filter(e => e.statut === s).length), backgroundColor: ['#10b981', '#8b5cf6', '#f59e0b'] }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom' } } }
    });
}

function imprimerRapportEffectifs() {
    const ecole = getEcoleName();
    const total = eleves.length;
    const g = eleves.filter(e => e.sexe === 'M').length;
    const f = eleves.filter(e => e.sexe === 'F').length;
    const pctF = total ? Math.round(f / total * 100) : 0;
    // Regrouper par cycle (primaire / secondaire) si l'info existe
    const estPrim = c => (c.cycle === 'primaire') || (c.type === 'primaire') || /\b(cp1|cp2|ce1|ce2|cm1|cm2|maternelle|gs|ms|ps)\b/i.test(c.nom || '');
    const ordered = classes.slice().sort((a, b) => (estPrim(b) - estPrim(a)) || (a.nom || '').localeCompare(b.nom || ''));
    let i = 0;
    const lignes = ordered.map(c => {
        const cg = eleves.filter(e => e.classe === c.nom && e.sexe === 'M').length;
        const cf = eleves.filter(e => e.classe === c.nom && e.sexe === 'F').length;
        i++;
        return `<tr>
            <td style="border:1px solid #999;padding:4px 8px;text-align:center;">${i}</td>
            <td style="border:1px solid #999;padding:4px 8px;">${scEsc(c.nom)}${estPrim(c) ? ' <span style=\'font-size:0.7rem;color:#0e7490;\'>(primaire)</span>' : ''}</td>
            <td style="border:1px solid #999;padding:4px 8px;text-align:center;">${cg}</td>
            <td style="border:1px solid #999;padding:4px 8px;text-align:center;">${cf}</td>
            <td style="border:1px solid #999;padding:4px 8px;text-align:center;font-weight:700;">${cg + cf}</td></tr>`;
    }).join('');
    const annee = (eleves[0] && eleves[0].anneeScolaire) || (typeof anneeScolaireCourante === 'function' ? anneeScolaireCourante() : '');
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Rapport des effectifs</title></head>
        <body style="font-family:Arial,sans-serif;padding:1.8rem;color:#111;">
        <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:0.8rem;margin-bottom:1rem;">
            <p style="margin:0;font-size:0.82rem;">RÉPUBLIQUE DU CONGO</p>
            <p style="margin:0;font-size:0.74rem;letter-spacing:1px;">Unité &ndash; Travail &ndash; Progrès</p>
            <p style="margin:0.15rem 0 0;font-size:0.74rem;">Ministère de l\'Enseignement Préscolaire, Primaire, Secondaire et de l\'Alphabétisation</p>
            <h2 style="margin:0.4rem 0 0;text-transform:uppercase;">${scEsc(ecole)}</h2>
        </div>
        <h1 style="text-align:center;font-size:1.25rem;letter-spacing:1px;margin:0.6rem 0 0.2rem;">RAPPORT DES EFFECTIFS</h1>
        <p style="text-align:center;margin:0 0 1rem;font-size:0.9rem;">Année scolaire ${scEsc(annee)} &mdash; Édité le ${new Date().toLocaleDateString('fr-FR')}</p>
        <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
            <thead><tr style="background:#eee;">
                <th style="border:1px solid #999;padding:5px 8px;">N°</th>
                <th style="border:1px solid #999;padding:5px 8px;text-align:left;">Classe</th>
                <th style="border:1px solid #999;padding:5px 8px;">Garçons</th>
                <th style="border:1px solid #999;padding:5px 8px;">Filles</th>
                <th style="border:1px solid #999;padding:5px 8px;">Total</th>
            </tr></thead>
            <tbody>
                ${lignes || '<tr><td colspan="5" style="border:1px solid #999;padding:8px;text-align:center;">Aucun élève</td></tr>'}
                <tr style="font-weight:700;background:#f3f4f6;">
                    <td colspan="2" style="border:1px solid #999;padding:5px 8px;text-align:right;">TOTAL GÉNÉRAL</td>
                    <td style="border:1px solid #999;padding:5px 8px;text-align:center;">${g}</td>
                    <td style="border:1px solid #999;padding:5px 8px;text-align:center;">${f}</td>
                    <td style="border:1px solid #999;padding:5px 8px;text-align:center;">${total}</td>
                </tr>
            </tbody>
        </table>
        <div style="margin-top:1rem;font-size:0.92rem;">
            <p style="margin:0.2rem 0;">Effectif total : <strong>${total}</strong> élève(s) répartis dans <strong>${classes.length}</strong> classe(s).</p>
            <p style="margin:0.2rem 0;">Garçons : <strong>${g}</strong> &nbsp;&bull;&nbsp; Filles : <strong>${f}</strong> &nbsp;&bull;&nbsp; Taux de filles : <strong>${pctF} %</strong></p>
        </div>
        <div style="margin-top:2.5rem;display:flex;justify-content:space-between;font-size:0.9rem;">
            <div>Fait à ........................., le ${new Date().toLocaleDateString('fr-FR')}</div>
            <div style="text-align:center;"><strong>Le Chef d\'établissement</strong><div style="height:60px;"></div>(Signature et cachet)</div>
        </div>
        </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
}

// ---------- Démarrage ----------
window.addEventListener('hashchange', scolRouteFromHash);
window.addEventListener('DOMContentLoaded', function () {
    loadScol();
    updateHeaderDate();
    scolRouteFromHash();
});
