// ===== Direction des études — pédagogie =====
const ELEVES_KEY = 'ecole_eleves';
const CLASSES_KEY = 'ecole_classes';
const MATIERES_KEY = 'ecole_matieres';
const ENSEIGNANTS_KEY = 'ecole_enseignants';
const NOTES_KEY = 'ecole_notes';
const EDT_KEY = 'ecole_edt';

let eleves = [], classes = [], matieres = [], enseignants = [], notes = {}, edt = {};
let editMatiereId = null, editEnseignantId = null;

const TRIMESTRES = ['1er Trimestre', '2e Trimestre', '3e Trimestre'];
const EDT_JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const EDT_CRENEAUX = ['07h-08h', '08h-09h', '09h-10h', '10h15-11h15', '11h15-12h15', '15h-16h', '16h-17h'];

const ETU_SECTIONS = {
    heures:      { titre: 'Validation des heures', icone: 'bi-clock-history' },
    dashboard:   { titre: 'Tableau de bord',  icone: 'bi-speedometer2' },
    matieres:    { titre: 'Matières',         icone: 'bi-journal-bookmark' },
    enseignants: { titre: 'Enseignants',      icone: 'bi-person-workspace' },
    notes:       { titre: 'Saisie des notes', icone: 'bi-pencil-square' },
    bulletins:   { titre: 'Bulletins',        icone: 'bi-file-earmark-text' },
    edt:         { titre: 'Emplois du temps', icone: 'bi-calendar3' },
    reporting:   { titre: 'Reporting',        icone: 'bi-bar-chart-line' }
};
let etuChartClasse = null, etuChartMention = null, etuChartMatiere = null;
const APPRECIATIONS_KEY = 'ecole_appreciations';
const NOTES_HISTO_KEY = 'ecole_notes_historique';
let notesHisto = [];
let appreciations = {};
let currentApprEleve = null;
const DECISIONS_CC = ['', 'Admis(e) en classe supérieure', 'Admis(e) — Félicitations', 'Redouble la classe', 'Exclu(e)', 'Réorienté(e)'];
const CONDUITES = ['', 'Excellente', 'Bonne', 'Assez bonne', 'Passable', 'Mauvaise'];

function eEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function eAttr(s) { return eEsc(s).replace(/"/g, '&quot;'); }

function getEcoleName() {
    if (typeof getEtab === 'function') { const e = getEtab(); if (e && e.nom) return e.nom; }
    try { const c = JSON.parse(localStorage.getItem('portail_config_v1')); if (c && c.name) return c.name; } catch (e) {}
    return localStorage.getItem('ecole_nom') || 'Établissement scolaire';
}
function anneeScolaireCourante() {
    const d = new Date(), y = d.getFullYear();
    return d.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

function loadEtudes() {
    const j = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) || def; } catch (e) { return def; } };
    eleves = j(ELEVES_KEY, []);
    classes = j(CLASSES_KEY, []);
    matieres = j(MATIERES_KEY, []);
    enseignants = j(ENSEIGNANTS_KEY, []);
    notes = j(NOTES_KEY, {});
    edt = j(EDT_KEY, {});
    appreciations = j(APPRECIATIONS_KEY, {});
    notesHisto = j(NOTES_HISTO_KEY, []);
}
function saveMatieres() { localStorage.setItem(MATIERES_KEY, JSON.stringify(matieres)); }
function saveEnseignants() { localStorage.setItem(ENSEIGNANTS_KEY, JSON.stringify(enseignants)); }
function saveNotesData() { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); }
function saveEdtData() { localStorage.setItem(EDT_KEY, JSON.stringify(edt)); }

// ---------- Navigation ----------
function showSection(name) {
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    const sec = document.getElementById('sec-' + name);
    if (!sec) return;
    sec.classList.remove('hidden');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const btn = document.querySelector('.tab[data-tab="' + name + '"]');
    if (btn) btn.classList.add('active');
    const info = ETU_SECTIONS[name];
    if (info) {
        document.getElementById('moduleTitle').textContent = info.titre;
        document.getElementById('moduleIcon').className = 'bi ' + info.icone;
    }
    if (name === 'dashboard') renderDashboard();
    if (name === 'matieres') renderMatieres();
    if (name === 'enseignants') renderEnseignants();
    if (name === 'notes') renderNotesControls();
    if (name === 'bulletins') renderBulletinsControls();
    if (name === 'passage') renderPassage();
    if (name === 'archives') renderArchives();
    if (name === 'examens') renderExamens();
    if (name === 'cahier') renderCahier();
    if (name === 'assiduite') renderAssiduite();
    if (name === 'edt') renderEdtControls();
    if (name === 'reporting') renderEtuReporting();
    if (name === 'heures') renderValidationHeures('etudes', 'valHeuresBox');
    if (window.location.hash !== '#' + name) window.location.hash = name;
}
function etuRouteFromHash() {
    const h = (window.location.hash || '').replace(/^#/, '');
    showSection(ETU_SECTIONS[h] ? h : 'dashboard');
}
function toggleSidebar() {
    const sb = document.getElementById('sidebar');
    const collapsed = sb.classList.toggle('collapsed');
    document.getElementById('sidebarToggleIcon').className = collapsed ? 'bi bi-list' : 'bi bi-chevron-left';
}
function logout() { window.location.href = 'portail.html'; }

function classeOptions(selected) {
    return ['<option value="">-- Choisir une classe --</option>'].concat(
        classes.map(c => `<option value="${eAttr(c.nom)}" ${selected === c.nom ? 'selected' : ''}>${eEsc(c.nom)}</option>`)).join('');
}
function trimestreOptions(selected) {
    return TRIMESTRES.map(t => `<option value="${eAttr(t)}" ${selected === t ? 'selected' : ''}>${eEsc(t)}</option>`).join('');
}

// ---------- Calculs ----------
function noteVal(v) {
    // v peut être un nombre (ancien format) ou un objet {d:devoir, c:composition}
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
function noteMatiere(eleveId, matiereId, trimestre) { return noteVal(notes[`${eleveId}|${matiereId}|${trimestre}`]); }
function moyenneEleve(eleveId, trimestre) {
    let sumWN = 0, sumC = 0;
    matieres.forEach(m => {
        const val = noteMatiere(eleveId, m.id, trimestre);
        if (val !== null) {
            const c = parseFloat(m.coefficient) || 1;
            sumWN += val * c; sumC += c;
        }
    });
    return sumC > 0 ? sumWN / sumC : null;
}
function moyenneAnnuelle(eleveId) {
    const ms = TRIMESTRES.map(t => moyenneEleve(eleveId, t)).filter(m => m !== null);
    return ms.length ? ms.reduce((s, m) => s + m, 0) / ms.length : null;
}
function saveElevesEtudes() { localStorage.setItem(ELEVES_KEY, JSON.stringify(eleves)); }

// Décision de passage calculée sur la moyenne annuelle (seuil 10/20 ou 5/10)
function decisionAuto(eleveId) {
    const e = eleves.find(x => x.id === eleveId); if (!e) return { moy: null, seuil: 10, decision: '' };
    const moy = moyenneAnnuelle(eleveId);
    const scale = scaleForClasse(e.classe);
    const seuil = scale === 10 ? 5 : 10;
    if (moy === null) return { moy: null, seuil: seuil, scale: scale, decision: '' };
    return { moy: moy, seuil: seuil, scale: scale, decision: moy >= seuil ? 'Admis(e) en classe supérieure' : 'Redouble la classe' };
}

// Suggestion de la classe supérieure (progression congolaise standard)
const PASS_ORDRE = ['cp1', 'cp2', 'ce1', 'ce2', 'cm1', 'cm2', '6eme', '5eme', '4eme', '3eme', '2nde', '1ere', 'terminale'];
function passNorm(s) { return (s || '').toString().toLowerCase().replace(/[éè]/g, 'e').replace(/è|é/g, 'e').replace(/ème|eme/g, 'eme').replace(/\s+/g, ''); }
function prochaineClasse(nom) {
    const n = passNorm(nom);
    let idx = -1;
    PASS_ORDRE.forEach((t, i) => { if (n.indexOf(t) >= 0) idx = i; });
    if (idx < 0 || idx >= PASS_ORDRE.length - 1) return '';
    const nextTok = PASS_ORDRE[idx + 1];
    const cand = classes.filter(c => passNorm(c.nom).indexOf(nextTok) >= 0);
    if (!cand.length) return '';
    // garder la même section (lettre finale) si possible
    const sect = (nom.match(/([A-Da-d])\s*$/) || [])[1];
    if (sect) { const ex = cand.find(c => new RegExp(sect + '\\s*$', 'i').test(c.nom)); if (ex) return ex.nom; }
    return cand[0].nom;
}
function classementClasse(classe, trimestre) {
    const list = eleves.filter(e => e.classe === classe)
        .map(e => ({ id: e.id, moy: moyenneEleve(e.id, trimestre) }))
        .filter(x => x.moy !== null)
        .sort((a, b) => b.moy - a.moy);
    const rang = {};
    list.forEach((x, i) => { rang[x.id] = i + 1; });
    return { rang, effectif: list.length };
}
function classementAnnuel(classe) {
    const list = eleves.filter(e => e.classe === classe)
        .map(e => ({ id: e.id, moy: moyenneAnnuelle(e.id) }))
        .filter(x => x.moy !== null)
        .sort((a, b) => b.moy - a.moy);
    const rang = {};
    list.forEach((x, i) => { rang[x.id] = i + 1; });
    return { rang, effectif: list.length };
}
function classStats(classe, trimestre) {
    const ms = eleves.filter(e => e.classe === classe).map(e => moyenneEleve(e.id, trimestre)).filter(m => m !== null);
    if (!ms.length) return { moy: null, max: null, min: null, n: 0 };
    return { moy: ms.reduce((s, m) => s + m, 0) / ms.length, max: Math.max(...ms), min: Math.min(...ms), n: ms.length };
}
function mentionFor(moy) {
    if (moy === null) return { label: '-', color: '#64748b' };
    if (moy >= 18) return { label: 'Excellent', color: '#16a34a' };
    if (moy >= 16) return { label: 'Très bien', color: '#16a34a' };
    if (moy >= 14) return { label: 'Bien', color: '#0ea5e9' };
    if (moy >= 12) return { label: 'Assez bien', color: '#0ea5e9' };
    if (moy >= 10) return { label: 'Passable', color: '#f59e0b' };
    return { label: 'Insuffisant', color: '#dc3545' };
}
function fmtMoy(m) { return m === null ? '-' : m.toFixed(2) + '/20'; }

// ---------- Cycle / niveau / filière ----------
function classeCycleNom(nom) { const c = classes.find(x => x.nom === nom); return (c && c.cycle === 'primaire') ? 'primaire' : 'secondaire'; }
function matiereCycle(m) { return m.cycle === 'primaire' ? 'primaire' : 'secondaire'; }
function normNom(s) { return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim(); }
// détection collège/lycée d'après le NOM (repli si le type n'est pas renseigné)
function niveauParNom(nom) {
    const n = String(nom || '').toLowerCase().replace(/\s+/g, '');
    if (['6e', '6è', '5e', '5è', '4e', '4è', '3e', '3è'].some(k => n.startsWith(k))) return 'college';
    if (['2nd', '2de', 'seconde', '1e', '1è', '1re', 'premiere', 'première', 'terminale', 'tle', 'tale'].some(k => n.startsWith(k))) return 'lycee';
    return 'secondaire';
}
// type complet d'une classe : primaire | college_general | college_technique | lycee_general | lycee_technique | secondaire(indéterminé)
function classeType(nom) {
    const c = classes.find(x => x.nom === nom);
    if (c && c.type) return c.type;
    if (c && c.cycle === 'primaire') return 'primaire';
    const lvl = niveauParNom(nom);
    if (lvl === 'college') return 'college_general';
    if (lvl === 'lycee') return 'lycee_general';
    return 'secondaire';
}
// filières de matières acceptées pour un type de classe
function filieresVisibles(type) {
    if (type === 'college_general') return ['commun_college', 'college_general'];
    if (type === 'college_technique') return ['commun_college', 'college_technique'];
    if (type === 'lycee_general') return ['commun_lycee', 'lycee_general'];
    if (type === 'lycee_technique') return ['commun_lycee', 'lycee_technique'];
    return [];
}
function matVisibleType(m, type) {
    if (matiereCycle(m) !== 'secondaire') return false;
    const f = m.filiere || '';
    if (f === '' || f === 'commun') return true; // legacy / commune à tout le secondaire
    return filieresVisibles(type).indexOf(f) >= 0;
}
const FILIERE_LABELS = { commun_college: 'Collège (tronc commun)', college_general: 'Collège général', college_technique: 'Collège technique', commun_lycee: 'Lycée (tronc commun)', lycee_general: 'Lycée général', lycee_technique: 'Lycée technique' };
function matiereNiveauLabel(m) {
    if (matiereCycle(m) === 'primaire') return 'Primaire';
    return FILIERE_LABELS[m.filiere || ''] || 'Secondaire';
}
function matieresPourClasse(nom) {
    const t = classeType(nom);
    if (t === 'primaire') return matieres.filter(m => matiereCycle(m) === 'primaire');
    if (t === 'secondaire') return matieres.filter(m => matiereCycle(m) === 'secondaire');
    return matieres.filter(m => matVisibleType(m, t));
}
function scaleForClasse(nom) { return classeCycleNom(nom) === 'primaire' ? 10 : 20; }
const PRIM_GROUPES = ['Français', 'Calcul / Mathématiques', "Disciplines d'éveil", 'Éducation artistique, physique et manuelle', 'Langues et options'];
function mentionForScale(moy, scale) {
    if (moy === null) return { label: '-', color: '#64748b' };
    if (scale === 10) {
        if (moy >= 9) return { label: 'Excellent', color: '#16a34a' };
        if (moy >= 8) return { label: 'Très bien', color: '#16a34a' };
        if (moy >= 7) return { label: 'Bien', color: '#0ea5e9' };
        if (moy >= 6) return { label: 'Assez bien', color: '#0ea5e9' };
        if (moy >= 5) return { label: 'Passable', color: '#f59e0b' };
        return { label: 'Insuffisant', color: '#dc3545' };
    }
    return mentionFor(moy);
}
function fmtMoyScale(m, scale) { return m === null ? '-' : m.toFixed(2) + '/' + scale; }

// ---------- Tableau de bord ----------
function renderDashboard() {
    document.getElementById('etuClasses').textContent = classes.length;
    document.getElementById('etuMatieres').textContent = matieres.length;
    document.getElementById('etuEnseignants').textContent = enseignants.length;
    document.getElementById('etuEleves').textContent = eleves.length;
    const sel = document.getElementById('dashTrimestre');
    if (!sel.innerHTML) sel.innerHTML = trimestreOptions(TRIMESTRES[0]);
    const trim = sel.value || TRIMESTRES[0];
    document.getElementById('dashMoyennes').innerHTML = `
        <table><thead><tr><th>Classe</th><th style="text-align:center;">Effectif noté</th><th style="text-align:right;">Moyenne générale</th></tr></thead><tbody>
        ${classes.map(c => {
            const moys = eleves.filter(e => e.classe === c.nom).map(e => moyenneEleve(e.id, trim)).filter(m => m !== null);
            const avg = moys.length ? moys.reduce((s, m) => s + m, 0) / moys.length : null;
            return `<tr><td style="font-weight:600;">${eEsc(c.nom)}</td><td style="text-align:center;">${moys.length}</td><td style="text-align:right;font-weight:600;color:${mentionFor(avg).color};">${fmtMoy(avg)}</td></tr>`;
        }).join('')}
        </tbody></table>`;
}

// ---------- Matières ----------
function renderMatieres() {
    const tbody = document.getElementById('matieresTable');
    tbody.innerHTML = matieres.length === 0
        ? '<tr><td colspan="4" style="text-align:center;padding:1.5rem;color:var(--muted,#64748b);">Aucune matière. Ajoutez-en ci-dessus.</td></tr>'
        : matieres.map(m => {
            const lbl = matiereNiveauLabel(m);
            const couleurs = { 'Primaire': ['#ecfeff', '#0e7490'], 'Collège': ['#eef2ff', '#4338ca'], 'Lycée': ['#f5f3ff', '#6d28d9'], 'Secondaire': ['#f1f5f9', '#475569'] };
            const cc = couleurs[lbl] || couleurs['Secondaire'];
            return `<tr>
            <td style="font-weight:600;">${eEsc(m.nom)}${m.optionnel ? ' <span style="color:var(--muted-2,#94a3b8);font-size:0.78rem;">(option)</span>' : ''}${m.groupe ? `<br><span style="color:var(--muted-2,#94a3b8);font-size:0.74rem;">${eEsc(m.groupe)}</span>` : ''}</td>
            <td style="text-align:center;">${eEsc(m.coefficient)}</td>
            <td><span style="background:${cc[0]};color:${cc[1]};border-radius:999px;padding:0.15rem 0.6rem;font-size:0.78rem;">${lbl}</span></td>
            <td style="text-align:right;white-space:nowrap;">
                <button class="btn btn-secondary" style="padding:0.3rem 0.6rem;font-size:0.85rem;" onclick="editMatiere('${m.id}')">✏️</button>
                <button class="btn btn-danger" style="padding:0.3rem 0.6rem;font-size:0.85rem;" onclick="deleteMatiere('${m.id}')">🗑️</button>
            </td></tr>`;
        }).join('');
}
function chargerMatieresPrimaire() {
    const G_FR = 'Français', G_CA = 'Calcul / Mathématiques', G_EV = "Disciplines d'éveil", G_AR = 'Éducation artistique, physique et manuelle', G_OP = 'Langues et options';
    const def = [
        { nom: 'Lecture', coefficient: 2, groupe: G_FR }, { nom: 'Récitation / Poésie', coefficient: 1, groupe: G_FR },
        { nom: 'Élocution / Langage', coefficient: 1, groupe: G_FR }, { nom: 'Vocabulaire', coefficient: 1, groupe: G_FR },
        { nom: 'Grammaire', coefficient: 2, groupe: G_FR }, { nom: 'Conjugaison', coefficient: 1, groupe: G_FR },
        { nom: 'Orthographe / Dictée', coefficient: 3, groupe: G_FR }, { nom: 'Expression écrite / Rédaction', coefficient: 2, groupe: G_FR },
        { nom: 'Écriture', coefficient: 1, groupe: G_FR },
        { nom: 'Calcul (numération, opérations)', coefficient: 2, groupe: G_CA }, { nom: 'Problèmes', coefficient: 3, groupe: G_CA },
        { nom: 'Système métrique / Mesures', coefficient: 1, groupe: G_CA }, { nom: 'Géométrie', coefficient: 1, groupe: G_CA },
        { nom: "Sciences d'observation", coefficient: 1, groupe: G_EV }, { nom: 'Histoire', coefficient: 1, groupe: G_EV },
        { nom: 'Géographie', coefficient: 1, groupe: G_EV }, { nom: 'Instruction civique et morale', coefficient: 1, groupe: G_EV },
        { nom: 'Dessin / Arts plastiques', coefficient: 1, groupe: G_AR }, { nom: 'Chant / Musique', coefficient: 1, groupe: G_AR },
        { nom: 'Éducation physique et sportive', coefficient: 1, groupe: G_AR }, { nom: 'Travaux manuels', coefficient: 1, groupe: G_AR },
        { nom: 'Anglais', coefficient: 1, groupe: G_OP, optionnel: true }, { nom: 'Informatique', coefficient: 1, groupe: G_OP, optionnel: true }
    ];
    let ajout = 0;
    def.forEach((d, i) => {
        if (!matieres.some(m => m.nom.toLowerCase() === d.nom.toLowerCase() && matiereCycle(m) === 'primaire')) {
            matieres.push({ id: 'mp' + Date.now() + i, nom: d.nom, coefficient: d.coefficient, cycle: 'primaire', groupe: d.groupe, optionnel: !!d.optionnel });
            ajout++;
        }
    });
    saveMatieres(); renderMatieres();
    alert(ajout ? `${ajout} matière(s) du primaire ajoutée(s). Anglais et Informatique sont marquées « option » — supprimez-les si votre école ne les utilise pas.` : 'Les matières du primaire existent déjà.');
}
const COMMUN_COLLEGE = [
    { nom: 'Français', coefficient: 3 }, { nom: 'Mathématiques', coefficient: 3 },
    { nom: 'Anglais (LV1)', coefficient: 2 }, { nom: 'Histoire-Géographie', coefficient: 2 },
    { nom: 'Éducation Civique et Morale (ECM)', coefficient: 1 }, { nom: 'Éducation Physique et Sportive (EPS)', coefficient: 1 }
];
const COLLEGE_GENERAL = [
    { nom: 'Sciences Physiques', coefficient: 2 }, { nom: 'Sciences de la Vie et de la Terre (SVT)', coefficient: 2 },
    { nom: 'Espagnol (LV2)', coefficient: 2 }, { nom: 'Éducation artistique (Dessin / Musique)', coefficient: 1, optionnel: true },
    { nom: 'Informatique', coefficient: 1, optionnel: true }
];
const COLLEGE_TECHNIQUE = [
    { nom: 'Sciences Physiques et Technologie', coefficient: 2 }, { nom: 'Technologie', coefficient: 2 },
    { nom: 'Dessin technique', coefficient: 2 }, { nom: "Travaux pratiques / Atelier", coefficient: 2 },
    { nom: 'Initiation professionnelle', coefficient: 1 }, { nom: 'Informatique', coefficient: 1, optionnel: true }
];
const COMMUN_LYCEE = [
    { nom: 'Français', coefficient: 3 }, { nom: 'Philosophie', coefficient: 2 },
    { nom: 'Anglais (LV1)', coefficient: 2 }, { nom: 'Histoire-Géographie', coefficient: 2 },
    { nom: 'Éducation Civique et Morale (ECM)', coefficient: 1 }, { nom: 'Éducation Physique et Sportive (EPS)', coefficient: 1 }
];
const LYCEE_GENERAL = [
    { nom: 'Mathématiques', coefficient: 4 }, { nom: 'Sciences Physiques (Physique-Chimie)', coefficient: 4 },
    { nom: 'Sciences de la Vie et de la Terre (SVT)', coefficient: 3 }, { nom: 'Espagnol (LV2)', coefficient: 2 }
];
const LYCEE_TECH_INDUS = [
    { nom: 'Mathématiques', coefficient: 3 }, { nom: 'Sciences Physiques', coefficient: 3 },
    { nom: 'Sciences et Techniques Industrielles (STI)', coefficient: 5 }, { nom: 'Dessin industriel', coefficient: 3 },
    { nom: 'Technologie industrielle', coefficient: 3 }, { nom: 'Travaux pratiques / Atelier', coefficient: 2 },
    { nom: 'Informatique', coefficient: 1, optionnel: true }
];
const LYCEE_TECH_COM = [
    { nom: 'Mathématiques', coefficient: 2 }, { nom: 'Comptabilité', coefficient: 5 },
    { nom: 'Économie générale', coefficient: 3 }, { nom: 'Économie d\'entreprise', coefficient: 3 },
    { nom: 'Droit', coefficient: 2 }, { nom: 'Techniques Quantitatives de Gestion', coefficient: 2 },
    { nom: 'Bureautique / Informatique', coefficient: 2 }
];

function pousserMatieres(liste, filiere, refType, compteur) {
    let ajout = 0;
    liste.forEach((d, i) => {
        const norm = normNom(d.nom);
        const dejaVisible = matieres.some(m => matiereCycle(m) === 'secondaire' && normNom(m.nom) === norm && matVisibleType(m, refType));
        if (!dejaVisible) {
            matieres.push({ id: 'ms' + filiere + Date.now() + compteur.n + i, nom: d.nom, coefficient: d.coefficient, cycle: 'secondaire', filiere: filiere, optionnel: !!d.optionnel });
            ajout++;
        }
    });
    compteur.n += liste.length;
    return ajout;
}
function chargerMatieresCollegeGeneral() {
    const c = { n: 0 }; let a = pousserMatieres(COMMUN_COLLEGE, 'commun_college', 'college_general', c) + pousserMatieres(COLLEGE_GENERAL, 'college_general', 'college_general', c);
    saveMatieres(); renderMatieres();
    alert(a ? `${a} matière(s) du collège général ajoutée(s) avec leurs coefficients (BEPC). Modifiables avec ✏️.` : 'Les matières du collège général existent déjà.');
}
function chargerMatieresCollegeTechnique() {
    const c = { n: 0 }; let a = pousserMatieres(COMMUN_COLLEGE, 'commun_college', 'college_technique', c) + pousserMatieres(COLLEGE_TECHNIQUE, 'college_technique', 'college_technique', c);
    saveMatieres(); renderMatieres();
    alert(a ? `${a} matière(s) du collège technique ajoutée(s) (tronc commun + disciplines techniques).` : 'Les matières du collège technique existent déjà.');
}
function chargerMatieresLyceeGeneral() {
    const c = { n: 0 }; let a = pousserMatieres(COMMUN_LYCEE, 'commun_lycee', 'lycee_general', c) + pousserMatieres(LYCEE_GENERAL, 'lycee_general', 'lycee_general', c);
    saveMatieres(); renderMatieres();
    alert(a ? `${a} matière(s) du lycée général ajoutée(s). Les coefficients varient selon la série (A, C, D, E) — ajustez-les avec ✏️.` : 'Les matières du lycée général existent déjà.');
}
function chargerMatieresLyceeTechInd() {
    const c = { n: 0 }; let a = pousserMatieres(COMMUN_LYCEE, 'commun_lycee', 'lycee_technique', c) + pousserMatieres(LYCEE_TECH_INDUS, 'lycee_technique', 'lycee_technique', c);
    saveMatieres(); renderMatieres();
    alert(a ? `${a} matière(s) du lycée technique industriel (série F) ajoutée(s).` : 'Ces matières existent déjà.');
}
function chargerMatieresLyceeTechCom() {
    const c = { n: 0 }; let a = pousserMatieres(COMMUN_LYCEE, 'commun_lycee', 'lycee_technique', c) + pousserMatieres(LYCEE_TECH_COM, 'lycee_technique', 'lycee_technique', c);
    saveMatieres(); renderMatieres();
    alert(a ? `${a} matière(s) du lycée technique commercial (série G) ajoutée(s).` : 'Ces matières existent déjà.');
}
function saveMatiere() {
    const nom = document.getElementById('matNom').value.trim();
    const coef = parseFloat(document.getElementById('matCoef').value) || 1;
    if (!nom) { alert('Saisissez le nom de la matière.'); return; }
    if (editMatiereId) {
        const m = matieres.find(x => x.id === editMatiereId);
        m.nom = nom; m.coefficient = coef; editMatiereId = null;
        document.getElementById('matBtn').textContent = '➕ Ajouter';
    } else {
        matieres.push({ id: 'm' + Date.now(), nom: nom, coefficient: coef });
    }
    saveMatieres();
    document.getElementById('matNom').value = '';
    document.getElementById('matCoef').value = '';
    renderMatieres();
}
function editMatiere(id) {
    const m = matieres.find(x => x.id === id); if (!m) return;
    editMatiereId = id;
    document.getElementById('matNom').value = m.nom;
    document.getElementById('matCoef').value = m.coefficient;
    document.getElementById('matBtn').textContent = '✓ Modifier';
}
function deleteMatiere(id) {
    if (!confirm('Supprimer cette matière ? Les notes associées seront aussi retirées.')) return;
    matieres = matieres.filter(x => x.id !== id);
    Object.keys(notes).forEach(k => { if (k.split('|')[1] === id) delete notes[k]; });
    saveMatieres(); saveNotesData(); renderMatieres();
}

// ---------- Enseignants ----------
function renderEnseignants() {
    const tbody = document.getElementById('enseignantsTable');
    tbody.innerHTML = enseignants.length === 0
        ? '<tr><td colspan="8" style="text-align:center;padding:1.5rem;color:var(--muted,#64748b);">Aucun enseignant enregistré.</td></tr>'
        : enseignants.map(p => {
            const niv = p.niveau || 'Collège';
            const prim = niv === 'Primaire';
            const cls = p.classe || ((p.classes && p.classes.length) ? p.classes.join(', ') : '');
            return `<tr>
            <td style="font-weight:600;"><span style="display:inline-flex;align-items:center;gap:0.5rem;">${p.photo ? `<img src="${p.photo}" alt="" style="width:32px;height:40px;object-fit:cover;border-radius:4px;border:1px solid #cbd5e1;">` : ''}<span>${eEsc(p.nom)} ${eEsc(p.prenom)}${p.adresse ? `<br><span style="font-weight:400;color:var(--muted,#64748b);font-size:0.78rem;">${eEsc(p.adresse)}</span>` : ''}</span></span></td>
            <td><span style="background:${prim ? '#ecfeff' : '#eef2ff'};color:${prim ? '#0e7490' : '#4338ca'};border-radius:999px;padding:0.15rem 0.6rem;font-size:0.78rem;">${eEsc(niv)}</span></td>
            <td>${eEsc(cls) || '-'}</td>
            <td>${eEsc(p.matiere)}</td>
            <td>${eEsc(p.telephone)}</td>
            <td style="text-align:right;white-space:nowrap;">${p.tauxHoraire ? Number(p.tauxHoraire).toLocaleString('fr-FR') + ' FCFA/h' : '-'}</td>
            <td style="text-align:right;white-space:nowrap;">${p.salaireFixe ? Number(p.salaireFixe).toLocaleString('fr-FR') + ' FCFA' : '-'}</td>
            <td style="text-align:right;white-space:nowrap;">
                <button class="btn btn-secondary" style="padding:0.3rem 0.6rem;font-size:0.85rem;" onclick="editEnseignant('${p.id}')">✏️</button>
                <button class="btn btn-danger" style="padding:0.3rem 0.6rem;font-size:0.85rem;" onclick="deleteEnseignant('${p.id}')">🗑️</button>
            </td></tr>`;
        }).join('');
    document.getElementById('enMatiere').innerHTML = '<option value="">-- Matière --</option>' +
        matieres.map(m => `<option value="${eAttr(m.nom)}">${eEsc(m.nom)}</option>`).join('') +
        '<option value="__autre">Autre / Plusieurs</option>';
    const clSel = document.getElementById('enClasse');
    if (clSel) {
        const cur = clSel.value;
        let listeClasses = [];
        try { listeClasses = JSON.parse(localStorage.getItem(CLASSES_KEY)) || []; } catch (e) { listeClasses = []; } // relecture en direct (classes créées en Scolarité incluses)
        const estPrimaire = c => (c.cycle === 'primaire') || (c.type === 'primaire') || /\b(cp1|cp2|ce1|ce2|cm1|cm2|maternelle|gs|ms|ps)\b/i.test(c.nom || '');
        const prim = listeClasses.filter(estPrimaire);
        const sec = listeClasses.filter(c => !estPrimaire(c));
        const opt = c => `<option value="${eAttr(c.nom)}">${eEsc(c.nom)}</option>`;
        let html = '<option value="">-- Classe --</option>';
        if (prim.length) html += '<optgroup label="🟦 Primaire">' + prim.map(opt).join('') + '</optgroup>';
        if (sec.length) html += '<optgroup label="🟪 Secondaire (collège / lycée)">' + sec.map(opt).join('') + '</optgroup>';
        if (!prim.length) html += '<optgroup label="Primaire"><option value="" disabled>Aucune classe primaire — créez-les en Scolarité</option></optgroup>';
        clSel.innerHTML = html;
        clSel.value = cur;
    }
}
let enPhotoTemp = '';
function chargerPhotoEnseignant(input) {
    const file = input.files && input.files[0]; if (!file) return;
    if (!/^image\//.test(file.type)) { alert('Choisissez une image.'); input.value = ''; return; }
    const reader = new FileReader();
    reader.onload = function (ev) {
        const img = new Image();
        img.onload = function () {
            const maxW = 150, maxH = 190; let w = img.width, h = img.height;
            const ratio = Math.min(maxW / w, maxH / h, 1); w = Math.round(w * ratio); h = Math.round(h * ratio);
            const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            enPhotoTemp = canvas.toDataURL('image/jpeg', 0.7);
            const prev = document.getElementById('enPhotoPreview'); prev.src = enPhotoTemp; prev.style.display = 'inline-block';
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
}
function retirerPhotoEnseignant() {
    enPhotoTemp = '';
    const p = document.getElementById('enPhoto'); if (p) p.value = '';
    const prev = document.getElementById('enPhotoPreview'); if (prev) prev.style.display = 'none';
}
function saveEnseignant() {
    const nom = document.getElementById('enNom').value.trim();
    const prenom = document.getElementById('enPrenom').value.trim();
    let matiere = document.getElementById('enMatiere').value;
    if (matiere === '__autre') matiere = document.getElementById('enMatiereAutre').value.trim();
    const tel = document.getElementById('enTel').value.trim();
    const taux = parseFloat(document.getElementById('enTaux').value) || 0;
    const fixe = parseFloat(document.getElementById('enFixe').value) || 0;
    const classeTit = document.getElementById('enClasse').value || '';
    const niveau = document.getElementById('enNiveau').value || 'Collège';
    const dateN = document.getElementById('enDateN').value || '';
    const adresse = document.getElementById('enAdresse').value.trim();
    if (!nom) { alert('Le nom est obligatoire.'); return; }
    const champs = { nom, prenom, matiere, telephone: tel, tauxHoraire: taux, salaireFixe: fixe, niveau: niveau, classe: classeTit, dateNaissance: dateN, adresse: adresse, photo: enPhotoTemp || '' };
    if (classeTit) champs.classes = [classeTit];
    if (editEnseignantId) {
        const p = enseignants.find(x => x.id === editEnseignantId);
        Object.assign(p, champs); editEnseignantId = null;
        document.getElementById('enBtn').textContent = '➕ Ajouter';
    } else {
        enseignants.push(Object.assign({ id: 'p' + Date.now() }, champs));
    }
    saveEnseignants();
    ['enNom', 'enPrenom', 'enTel', 'enMatiereAutre', 'enTaux', 'enFixe', 'enDateN', 'enAdresse'].forEach(i => document.getElementById(i).value = '');
    document.getElementById('enMatiere').value = '';
    document.getElementById('enClasse').value = '';
    retirerPhotoEnseignant();
    renderEnseignants();
}
function editEnseignant(id) {
    const p = enseignants.find(x => x.id === id); if (!p) return;
    editEnseignantId = id;
    document.getElementById('enNom').value = p.nom || '';
    document.getElementById('enPrenom').value = p.prenom || '';
    document.getElementById('enTel').value = p.telephone || '';
    document.getElementById('enTaux').value = p.tauxHoraire || '';
    document.getElementById('enFixe').value = p.salaireFixe || '';
    document.getElementById('enClasse').value = p.classe || ((p.classes && p.classes.length) ? p.classes[0] : '');
    document.getElementById('enNiveau').value = p.niveau || 'Collège';
    document.getElementById('enDateN').value = p.dateNaissance || '';
    document.getElementById('enAdresse').value = p.adresse || '';
    enPhotoTemp = p.photo || '';
    const prev = document.getElementById('enPhotoPreview');
    if (p.photo) { prev.src = p.photo; prev.style.display = 'inline-block'; } else { prev.style.display = 'none'; }
    const sel = document.getElementById('enMatiere');
    if (matieres.some(m => m.nom === p.matiere)) sel.value = p.matiere;
    else { sel.value = '__autre'; document.getElementById('enMatiereAutre').value = p.matiere || ''; }
    document.getElementById('enBtn').textContent = '✓ Modifier';
}
function deleteEnseignant(id) {
    if (!confirm('Supprimer cet enseignant ?')) return;
    enseignants = enseignants.filter(x => x.id !== id);
    saveEnseignants(); renderEnseignants();
}

// ---------- Saisie des notes ----------
function renderNotesControls() {
    const c = document.getElementById('notesClasse');
    if (!c.dataset.init) { c.innerHTML = classeOptions(''); c.dataset.init = '1'; }
    const t = document.getElementById('notesTrimestre');
    if (!t.innerHTML) t.innerHTML = trimestreOptions(TRIMESTRES[0]);
    document.getElementById('notesGrid').innerHTML = '<p style="color:var(--muted,#64748b);padding:1rem;">Choisissez une classe et un trimestre, puis cliquez sur « Charger ».</p>';
}
function chargerNotes() {
    const classe = document.getElementById('notesClasse').value;
    const trim = document.getElementById('notesTrimestre').value;
    const grid = document.getElementById('notesGrid');
    if (!classe) { grid.innerHTML = '<p style="color:var(--danger,#dc3545);padding:1rem;">Sélectionnez une classe.</p>'; return; }
    const cy = classeCycleNom(classe);
    const mats = matieresPourClasse(classe);
    if (!mats.length) { grid.innerHTML = `<p style="color:var(--danger,#dc3545);padding:1rem;">${cy === 'primaire' ? 'Aucune matière du primaire. Allez dans l\'onglet « Matières » et cliquez sur « Charger les matières du primaire ».' : 'Ajoutez d\'abord des matières (onglet Matières).'}</p>`; return; }
    const list = eleves.filter(e => e.classe === classe);
    if (!list.length) { grid.innerHTML = '<p style="color:var(--danger,#dc3545);padding:1rem;">Aucun élève dans cette classe.</p>'; return; }
    if (cy === 'primaire') {
        grid.innerHTML = `
            <p style="color:var(--muted,#64748b);font-size:0.82rem;margin:0 0 0.5rem;">Classe du <strong>primaire</strong> : une note <strong>sur 10</strong> par discipline.</p>
            <div style="overflow-x:auto;"><table>
                <thead><tr><th style="position:sticky;left:0;background:var(--surface-2,#f8fafc);">Élève</th>${mats.map(m => `<th style="text-align:center;min-width:74px;">${eEsc(m.nom)}<br><span style="font-weight:400;color:var(--muted-2,#94a3b8);font-size:0.72rem;">coef ${eEsc(m.coefficient)} · /10</span></th>`).join('')}</tr></thead>
                <tbody>${list.map(e => `<tr>
                    <td style="font-weight:600;position:sticky;left:0;background:var(--surface,#fff);white-space:nowrap;">${eEsc(e.nom)} ${eEsc(e.prenom)}</td>
                    ${mats.map(m => {
                        const v = noteVal(notes[`${e.id}|${m.id}|${trim}`]);
                        return `<td style="text-align:center;"><input type="number" min="0" max="10" step="0.25" value="${v === null ? '' : v}" id="note_p_${e.id}_${m.id}" style="width:58px;margin:0;padding:0.3rem 0.15rem;text-align:center;"></td>`;
                    }).join('')}
                </tr>`).join('')}</tbody>
            </table></div>`;
        return;
    }
    grid.innerHTML = `
        <p style="color:var(--muted,#64748b);font-size:0.82rem;margin:0 0 0.5rem;">Chaque matière : <strong>D</strong> = devoir, <strong>C</strong> = composition. La note du trimestre est la moyenne des deux (ou la seule saisie).</p>
        <div style="overflow-x:auto;"><table>
            <thead><tr><th style="position:sticky;left:0;background:var(--surface-2,#f8fafc);">Élève</th>${mats.map(m => `<th style="text-align:center;min-width:96px;" title="Coef ${eAttr(m.coefficient)}">${eEsc(m.nom)}<br><span style="font-weight:400;color:var(--muted-2,#94a3b8);font-size:0.72rem;">coef ${eEsc(m.coefficient)} · D | C</span></th>`).join('')}</tr></thead>
            <tbody>${list.map(e => `<tr>
                <td style="font-weight:600;position:sticky;left:0;background:var(--surface,#fff);white-space:nowrap;">${eEsc(e.nom)} ${eEsc(e.prenom)}</td>
                ${mats.map(m => {
                    const raw = notes[`${e.id}|${m.id}|${trim}`];
                    let dv = '', cv = '';
                    if (raw && typeof raw === 'object') { dv = (raw.d == null ? '' : raw.d); cv = (raw.c == null ? '' : raw.c); }
                    else if (raw !== undefined && raw !== null && raw !== '') { cv = raw; }
                    return `<td style="text-align:center;"><div style="display:flex;gap:3px;justify-content:center;">
                        <input type="number" min="0" max="20" step="0.25" value="${dv}" id="note_d_${e.id}_${m.id}" title="Devoir" placeholder="D" style="width:42px;margin:0;padding:0.3rem 0.15rem;text-align:center;">
                        <input type="number" min="0" max="20" step="0.25" value="${cv}" id="note_c_${e.id}_${m.id}" title="Composition" placeholder="C" style="width:42px;margin:0;padding:0.3rem 0.15rem;text-align:center;">
                    </div></td>`;
                }).join('')}
            </tr>`).join('')}</tbody>
        </table></div>`;
}
function logNoteChange(e, m, trim, ancien, nouveau) {
    notesHisto.unshift({
        date: new Date().toISOString(),
        eleve: `${e.nom} ${e.prenom}`,
        classe: e.classe,
        matiere: m.nom,
        trimestre: trim,
        ancienne: ancien === undefined ? '—' : ancien,
        nouvelle: nouveau === undefined ? '(supprimée)' : nouveau
    });
    if (notesHisto.length > 1000) notesHisto = notesHisto.slice(0, 1000);
    localStorage.setItem(NOTES_HISTO_KEY, JSON.stringify(notesHisto));
}
function afficherHistoriqueNotes() {
    const box = document.getElementById('notesHistoBox');
    if (!box) return;
    if (box.style.display === 'block') { box.style.display = 'none'; return; }
    box.style.display = 'block';
    box.innerHTML = notesHisto.length === 0
        ? '<p style="color:var(--muted,#64748b);padding:0.75rem;">Aucune modification de note enregistrée pour le moment.</p>'
        : `<div style="overflow:auto;max-height:340px;"><table>
            <thead><tr><th>Date</th><th>Élève</th><th>Matière</th><th>Trim.</th><th style="text-align:center;">Ancienne</th><th style="text-align:center;">Nouvelle</th><th>Saisi par</th></tr></thead>
            <tbody>${notesHisto.slice(0, 200).map(h => `<tr>
                <td style="white-space:nowrap;font-size:0.82rem;">${new Date(h.date).toLocaleString('fr-FR')}</td>
                <td>${eEsc(h.eleve)}</td><td>${eEsc(h.matiere)}</td><td>${eEsc(h.trimestre)}</td>
                <td style="text-align:center;">${eEsc(String(h.ancienne))}</td>
                <td style="text-align:center;font-weight:700;">${eEsc(String(h.nouvelle))}</td>
                <td style="font-size:0.82rem;color:var(--muted,#475569);">${eEsc(h.par || 'Direction')}</td>
            </tr>`).join('')}</tbody></table></div>`;
}
function saveNotes() {
    const classe = document.getElementById('notesClasse').value;
    const trim = document.getElementById('notesTrimestre').value;
    if (!classe) return;
    const cy = classeCycleNom(classe);
    const mats = matieresPourClasse(classe);
    if (!mats.length) return;
    const list = eleves.filter(e => e.classe === classe);
    const maxN = cy === 'primaire' ? 10 : 20;
    const clamp = (s) => { let n = parseFloat(s); if (isNaN(n)) return ''; if (n < 0) n = 0; if (n > maxN) n = maxN; return n; };
    let count = 0, modifs = 0;
    list.forEach(e => mats.forEach(m => {
        const key = `${e.id}|${m.id}|${trim}`;
        const ancien = notes[key];
        let nouveau;
        if (cy === 'primaire') {
            const pEl = document.getElementById(`note_p_${e.id}_${m.id}`);
            if (!pEl) return;
            const pv = clamp(pEl.value.trim());
            nouveau = (pv === '') ? undefined : pv;
        } else {
            const dEl = document.getElementById(`note_d_${e.id}_${m.id}`);
            const cEl = document.getElementById(`note_c_${e.id}_${m.id}`);
            if (!dEl || !cEl) return;
            const dv = clamp(dEl.value.trim());
            const cv = clamp(cEl.value.trim());
            nouveau = (dv === '' && cv === '') ? undefined : { d: dv, c: cv };
        }
        if (JSON.stringify(ancien) !== JSON.stringify(nouveau)) {
            logNoteChange(e, m, trim, noteVal(ancien), noteVal(nouveau));
            modifs++;
        }
        if (nouveau === undefined) delete notes[key];
        else { notes[key] = nouveau; count++; }
    }));
    saveNotesData();
    alert(`Notes enregistrées (${count} note(s)${modifs ? ', ' + modifs + ' modification(s) journalisée(s)' : ''}).`);
}

// ---------- Bulletins ----------
function renderBulletinsControls() {
    const c = document.getElementById('bulClasse');
    if (!c.dataset.init) { c.innerHTML = classeOptions(''); c.dataset.init = '1'; }
    const t = document.getElementById('bulTrimestre');
    if (!t.innerHTML) t.innerHTML = trimestreOptions(TRIMESTRES[0]);
    renderBulletinsList();
}
function renderBulletinsList() {
    const classe = document.getElementById('bulClasse').value;
    const trim = document.getElementById('bulTrimestre').value;
    const box = document.getElementById('bulletinsContent');
    if (!classe) { box.innerHTML = '<p style="color:var(--muted,#64748b);padding:1rem;">Choisissez une classe.</p>'; return; }
    const list = eleves.filter(e => e.classe === classe);
    if (!list.length) { box.innerHTML = '<p style="color:var(--muted,#64748b);padding:1rem;">Aucun élève dans cette classe.</p>'; return; }
    const { rang, effectif } = classementClasse(classe, trim);
    const scale = scaleForClasse(classe);
    const rows = list.map(e => ({ e, moy: moyenneEleve(e.id, trim) }))
        .sort((a, b) => (b.moy === null ? -1 : b.moy) - (a.moy === null ? -1 : a.moy));
    box.innerHTML = `
        <div style="overflow-x:auto;"><table>
            <thead><tr><th>Rang</th><th>Nom et prénom</th><th style="text-align:right;">Moyenne</th><th>Mention</th><th style="text-align:right;">Bulletin</th></tr></thead>
            <tbody>${rows.map(r => {
                const men = mentionForScale(r.moy, scale);
                return `<tr>
                    <td style="text-align:center;font-weight:600;">${r.moy !== null ? rang[r.e.id] + '/' + effectif : '-'}</td>
                    <td style="font-weight:600;">${eEsc(r.e.nom)} ${eEsc(r.e.prenom)}</td>
                    <td style="text-align:right;font-weight:600;color:${men.color};">${fmtMoyScale(r.moy, scale)}</td>
                    <td style="color:${men.color};">${men.label}</td>
                    <td style="text-align:right;white-space:nowrap;">
                        <button class="btn btn-secondary" style="padding:0.3rem 0.6rem;font-size:0.85rem;" title="Appréciation / décision du conseil" onclick="ouvrirAppreciation('${r.e.id}')">📝</button>
                        <button class="btn btn-primary" style="padding:0.3rem 0.7rem;font-size:0.85rem;" title="Bulletin du trimestre" onclick="genererBulletin('${r.e.id}')"><i class="bi bi-printer"></i></button>
                        <button class="btn btn-secondary" style="padding:0.3rem 0.6rem;font-size:0.85rem;" title="Bulletin annuel" onclick="genererBulletinAnnuel('${r.e.id}')">📅</button>
                    </td>
                </tr>`;
            }).join('')}</tbody>
        </table></div>`;
}
function persistAppreciations() { localStorage.setItem(APPRECIATIONS_KEY, JSON.stringify(appreciations)); }

function bulletinHTML(eleveId, trim) {
    const e = eleves.find(x => x.id === eleveId); if (!e) return '';
    const { rang, effectif } = classementClasse(e.classe, trim);
    const moy = moyenneEleve(eleveId, trim);
    const men = mentionFor(moy);
    const stats = classStats(e.classe, trim);
    const appr = appreciations[`${eleveId}|${trim}`] || {};
    const ecole = getEcoleName();
    let totalPoints = 0, totalCoef = 0;
    const lignes = matieresPourClasse(e.classe).map(m => {
        const c = parseFloat(m.coefficient) || 1;
        const note = noteMatiere(eleveId, m.id, trim);
        if (note !== null) { totalPoints += note * c; totalCoef += c; }
        return `<tr>
            <td style="border:1px solid #999;padding:4px 6px;">${eEsc(m.nom)}</td>
            <td style="border:1px solid #999;padding:4px 6px;text-align:center;">${note !== null ? note.toFixed(2) : '-'}</td>
            <td style="border:1px solid #999;padding:4px 6px;text-align:center;">${c}</td>
            <td style="border:1px solid #999;padding:4px 6px;text-align:center;">${note !== null ? (note * c).toFixed(2) : '-'}</td>
            <td style="border:1px solid #999;padding:4px 6px;">${note !== null ? mentionFor(note).label : ''}</td>
        </tr>`;
    }).join('');
    return `
        <div style="font-family:Arial,sans-serif;max-width:820px;margin:0 auto;padding:1.5rem;color:var(--ink,#111);">
            <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:0.6rem;margin-bottom:0.8rem;">
                <p style="margin:0;font-size:0.8rem;">RÉPUBLIQUE DU CONGO</p>
                <p style="margin:0;font-size:0.72rem;letter-spacing:1px;">Unité &ndash; Travail &ndash; Progrès</p>
                <p style="margin:0.15rem 0 0;font-size:0.72rem;">Ministère de l'Enseignement Préscolaire, Primaire, Secondaire et de l'Alphabétisation</p>
                <h2 style="margin:0.3rem 0 0;text-transform:uppercase;font-size:1.2rem;">${eEsc(ecole)}</h2>
            </div>
            <h1 style="text-align:center;font-size:1.15rem;letter-spacing:1px;margin:0.4rem 0 1rem;">BULLETIN DE NOTES &mdash; ${eEsc(trim).toUpperCase()}</h1>
            <table style="width:100%;margin-bottom:0.8rem;font-size:0.9rem;">
                <tr><td><strong>Élève :</strong> ${eEsc(e.nom)} ${eEsc(e.prenom)}</td><td><strong>Classe :</strong> ${eEsc(e.classe)}</td>${e.photo ? `<td rowspan="2" style="width:80px;text-align:right;"><img src="${e.photo}" alt="" style="width:64px;height:80px;object-fit:cover;border:1px solid #999;"></td>` : ''}</tr>
                <tr><td><strong>Matricule :</strong> ${eEsc(e.matricule || '-')}</td><td><strong>Année scolaire :</strong> ${eEsc(e.anneeScolaire || anneeScolaireCourante())}</td></tr>
            </table>
            <table style="width:100%;border-collapse:collapse;font-size:0.88rem;">
                <thead><tr style="background:var(--surface-2,#eee);">
                    <th style="border:1px solid #999;padding:4px 6px;text-align:left;">Matière</th>
                    <th style="border:1px solid #999;padding:4px 6px;">Note /20</th>
                    <th style="border:1px solid #999;padding:4px 6px;">Coef</th>
                    <th style="border:1px solid #999;padding:4px 6px;">Note &times; Coef</th>
                    <th style="border:1px solid #999;padding:4px 6px;text-align:left;">Appréciation</th>
                </tr></thead>
                <tbody>${lignes || '<tr><td colspan="5" style="border:1px solid #999;padding:8px;text-align:center;">Aucune matière</td></tr>'}</tbody>
                <tfoot><tr style="background:var(--surface-2,#f5f5f5);font-weight:bold;">
                    <td style="border:1px solid #999;padding:4px 6px;">TOTAUX</td>
                    <td style="border:1px solid #999;"></td>
                    <td style="border:1px solid #999;padding:4px 6px;text-align:center;">${totalCoef}</td>
                    <td style="border:1px solid #999;padding:4px 6px;text-align:center;">${totalPoints.toFixed(2)}</td>
                    <td style="border:1px solid #999;"></td>
                </tr></tfoot>
            </table>
            <table style="width:100%;border-collapse:collapse;margin-top:1rem;font-size:0.9rem;">
                <tr>
                    <td style="border:1px solid #999;padding:6px;"><strong>Moyenne générale :</strong> <span style="font-size:1.1rem;font-weight:bold;">${fmtMoy(moy)}</span></td>
                    <td style="border:1px solid #999;padding:6px;"><strong>Rang :</strong> ${moy !== null ? rang[eleveId] + ' / ' + effectif : '-'}</td>
                    <td style="border:1px solid #999;padding:6px;"><strong>Mention :</strong> ${men.label}</td>
                </tr>
                <tr>
                    <td style="border:1px solid #999;padding:6px;"><strong>Moyenne de la classe :</strong> ${fmtMoy(stats.moy)}</td>
                    <td style="border:1px solid #999;padding:6px;"><strong>Plus forte moyenne :</strong> ${fmtMoy(stats.max)}</td>
                    <td style="border:1px solid #999;padding:6px;"><strong>Plus faible moyenne :</strong> ${fmtMoy(stats.min)}</td>
                </tr>
                <tr>
                    <td style="border:1px solid #999;padding:6px;"><strong>Conduite :</strong> ${eEsc(appr.conduite) || '.....................'}</td>
                    <td colspan="2" style="border:1px solid #999;padding:6px;"><strong>Décision du conseil de classe :</strong> ${eEsc(appr.decision) || '.....................'}</td>
                </tr>
            </table>
            <div style="margin-top:0.8rem;border:1px solid #999;padding:6px;min-height:46px;font-size:0.9rem;">
                <strong>Appréciation générale :</strong> ${eEsc(appr.appreciation) || ''}
            </div>
            <div style="margin-top:1.4rem;display:flex;justify-content:space-between;font-size:0.9rem;">
                <div><strong>Visa des parents</strong><div style="height:48px;"></div></div>
                <div style="text-align:center;"><strong>Le Directeur des études</strong><div style="height:48px;"></div>(Signature et cachet)</div>
            </div>
        </div>`;
}

function bulletinFor(eleveId, trim) {
    const e = eleves.find(x => x.id === eleveId); if (!e) return '';
    return classeCycleNom(e.classe) === 'primaire' ? bulletinPrimaireHTML(eleveId, trim) : bulletinHTML(eleveId, trim);
}

function bulletinPrimaireHTML(eleveId, trim) {
    const e = eleves.find(x => x.id === eleveId); if (!e) return '';
    const ecole = getEcoleName();
    const appr = appreciations[`${eleveId}|${trim}`] || {};
    const mats = matieresPourClasse(e.classe);
    let totalPoints = 0, totalCoef = 0;
    let corps = '';
    PRIM_GROUPES.forEach(g => {
        const ms = mats.filter(m => (m.groupe || '') === g);
        if (!ms.length) return;
        corps += `<tr><td colspan="5" style="border:1px solid #999;padding:3px 6px;font-weight:bold;background:var(--surface-2,#eef2f7);">${eEsc(g)}</td></tr>`;
        ms.forEach(m => {
            const c = parseFloat(m.coefficient) || 1;
            const note = noteMatiere(eleveId, m.id, trim);
            if (note !== null) { totalPoints += note * c; totalCoef += c; }
            corps += `<tr>
                <td style="border:1px solid #999;padding:3px 6px;">${eEsc(m.nom)}${m.optionnel ? ' <span style="color:var(--muted,#777);font-size:0.85em;">(option)</span>' : ''}</td>
                <td style="border:1px solid #999;padding:3px 6px;text-align:center;">${note !== null ? note.toFixed(2) : '-'}</td>
                <td style="border:1px solid #999;padding:3px 6px;text-align:center;">${c}</td>
                <td style="border:1px solid #999;padding:3px 6px;text-align:center;">${note !== null ? (note * c).toFixed(2) : '-'}</td>
                <td style="border:1px solid #999;padding:3px 6px;">${note !== null ? mentionForScale(note, 10).label : ''}</td>
            </tr>`;
        });
    });
    mats.filter(m => !m.groupe || PRIM_GROUPES.indexOf(m.groupe) === -1).forEach(m => {
        const c = parseFloat(m.coefficient) || 1;
        const note = noteMatiere(eleveId, m.id, trim);
        if (note !== null) { totalPoints += note * c; totalCoef += c; }
        corps += `<tr>
            <td style="border:1px solid #999;padding:3px 6px;">${eEsc(m.nom)}</td>
            <td style="border:1px solid #999;padding:3px 6px;text-align:center;">${note !== null ? note.toFixed(2) : '-'}</td>
            <td style="border:1px solid #999;padding:3px 6px;text-align:center;">${c}</td>
            <td style="border:1px solid #999;padding:3px 6px;text-align:center;">${note !== null ? (note * c).toFixed(2) : '-'}</td>
            <td style="border:1px solid #999;padding:3px 6px;">${note !== null ? mentionForScale(note, 10).label : ''}</td>
        </tr>`;
    });
    const moy = totalCoef > 0 ? totalPoints / totalCoef : null;
    const men = mentionForScale(moy, 10);
    const { rang, effectif } = classementClasse(e.classe, trim);
    const stats = classStats(e.classe, trim);
    const estCM2 = (e.classe || '').toUpperCase().indexOf('CM2') >= 0;
    const decision = appr.decision || '';
    return `
        <div style="font-family:Arial,sans-serif;max-width:820px;margin:0 auto;padding:1.4rem;color:var(--ink,#111);">
            <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:0.5rem;margin-bottom:0.7rem;">
                <p style="margin:0;font-size:0.8rem;">RÉPUBLIQUE DU CONGO</p>
                <p style="margin:0;font-size:0.72rem;letter-spacing:1px;">Unité &ndash; Travail &ndash; Progrès</p>
                <p style="margin:0.15rem 0 0;font-size:0.72rem;">Ministère de l'Enseignement Préscolaire, Primaire, Secondaire et de l'Alphabétisation</p>
                <p style="margin:0;font-size:0.72rem;">Circonscription scolaire de Brazzaville</p>
                <h2 style="margin:0.3rem 0 0;text-transform:uppercase;font-size:1.15rem;">${eEsc(ecole)}</h2>
            </div>
            <h1 style="text-align:center;font-size:1.1rem;letter-spacing:1px;margin:0.3rem 0 0.8rem;">BULLETIN DE NOTES &mdash; ${eEsc(trim).toUpperCase()}</h1>
            <table style="width:100%;margin-bottom:0.7rem;font-size:0.88rem;">
                <tr><td><strong>Nom et prénom :</strong> ${eEsc(e.nom)} ${eEsc(e.prenom)}</td><td><strong>Classe :</strong> ${eEsc(e.classe)} (Effectif : ${effectif || eleves.filter(x => x.classe === e.classe).length})</td>${e.photo ? `<td rowspan="2" style="width:80px;text-align:right;"><img src="${e.photo}" alt="" style="width:64px;height:80px;object-fit:cover;border:1px solid #999;"></td>` : ''}</tr>
                <tr><td><strong>Matricule :</strong> ${eEsc(e.matricule || '-')}</td><td><strong>Année scolaire :</strong> ${eEsc(e.anneeScolaire || anneeScolaireCourante())}</td></tr>
            </table>
            <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                <thead><tr style="background:var(--surface-2,#eee);">
                    <th style="border:1px solid #999;padding:3px 6px;text-align:left;">Disciplines</th>
                    <th style="border:1px solid #999;padding:3px 6px;">Note /10</th>
                    <th style="border:1px solid #999;padding:3px 6px;">Coef.</th>
                    <th style="border:1px solid #999;padding:3px 6px;">Total</th>
                    <th style="border:1px solid #999;padding:3px 6px;text-align:left;">Appréciation</th>
                </tr></thead>
                <tbody>${corps || '<tr><td colspan="5" style="border:1px solid #999;padding:8px;text-align:center;">Aucune discipline</td></tr>'}</tbody>
                <tfoot><tr style="background:var(--surface-2,#f5f5f5);font-weight:bold;">
                    <td style="border:1px solid #999;padding:3px 6px;">TOTAUX</td>
                    <td style="border:1px solid #999;"></td>
                    <td style="border:1px solid #999;padding:3px 6px;text-align:center;">${totalCoef}</td>
                    <td style="border:1px solid #999;padding:3px 6px;text-align:center;">${totalPoints.toFixed(2)}</td>
                    <td style="border:1px solid #999;padding:3px 6px;">Moyenne : <strong>${fmtMoyScale(moy, 10)}</strong></td>
                </tr></tfoot>
            </table>
            <table style="width:100%;border-collapse:collapse;margin-top:0.9rem;font-size:0.88rem;">
                <tr>
                    <td style="border:1px solid #999;padding:6px;"><strong>Moyenne :</strong> <span style="font-size:1.05rem;font-weight:bold;">${fmtMoyScale(moy, 10)}</span></td>
                    <td style="border:1px solid #999;padding:6px;"><strong>Rang :</strong> ${moy !== null ? (rang[eleveId] || '-') + ' / ' + effectif : '-'}</td>
                    <td style="border:1px solid #999;padding:6px;"><strong>Mention :</strong> ${men.label}</td>
                </tr>
                <tr>
                    <td style="border:1px solid #999;padding:6px;"><strong>Moyenne de la classe :</strong> ${fmtMoyScale(stats.moy, 10)}</td>
                    <td style="border:1px solid #999;padding:6px;"><strong>Conduite :</strong> ${eEsc(appr.conduite) || '................'}</td>
                    <td style="border:1px solid #999;padding:6px;"><strong>Absences :</strong> ................</td>
                </tr>
                <tr>
                    <td colspan="3" style="border:1px solid #999;padding:6px;"><strong>Décision du conseil des maîtres :</strong> ${eEsc(decision) || (estCM2 ? "Admis(e) au CEPE / présenté(e) au concours d'entrée en 6e ............" : 'Passe en classe supérieure / Redouble ............')}</td>
                </tr>
            </table>
            <div style="margin-top:0.7rem;border:1px solid #999;padding:6px;min-height:42px;font-size:0.88rem;">
                <strong>Observation du maître :</strong> ${eEsc(appr.appreciation) || ''}
            </div>
            ${estCM2 ? '<p style="margin:0.5rem 0 0;font-size:0.8rem;color:var(--muted,#444);"><strong>Fin du cycle primaire :</strong> Certificat d\'Études Primaires Élémentaires (CEPE) et concours d\'entrée en 6e.</p>' : ''}
            <div style="margin-top:1.2rem;display:flex;justify-content:space-between;font-size:0.85rem;text-align:center;">
                <div><strong>Le Maître / La Maîtresse</strong><div style="height:46px;"></div></div>
                <div><strong>Le Directeur (visa)</strong><div style="height:46px;"></div></div>
                <div><strong>Les Parents</strong><div style="height:46px;"></div></div>
            </div>
        </div>`;
}

function genererBulletin(eleveId) {
    const e = eleves.find(x => x.id === eleveId); if (!e) return;
    const trim = document.getElementById('bulTrimestre').value || TRIMESTRES[0];
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Bulletin - ${eEsc(e.nom)} ${eEsc(e.prenom)}</title></head><body>${bulletinFor(eleveId, trim)}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
}

function genererTousBulletins() {
    const classe = document.getElementById('bulClasse').value;
    const trim = document.getElementById('bulTrimestre').value || TRIMESTRES[0];
    if (!classe) { alert('Choisissez une classe.'); return; }
    const list = eleves.filter(e => e.classe === classe)
        .map(e => ({ e, moy: moyenneEleve(e.id, trim) }))
        .sort((a, b) => (b.moy === null ? -1 : b.moy) - (a.moy === null ? -1 : a.moy));
    if (!list.length) { alert('Aucun élève dans cette classe.'); return; }
    const corps = list.map((r, i) => `<div style="${i < list.length - 1 ? 'page-break-after:always;' : ''}">${bulletinFor(r.e.id, trim)}</div>`).join('');
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Bulletins ${eEsc(classe)} - ${eEsc(trim)}</title></head><body>${corps}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
}

function genererTableauHonneur() {
    const classe = document.getElementById('bulClasse').value;
    const trim = document.getElementById('bulTrimestre').value || TRIMESTRES[0];
    if (!classe) { alert('Choisissez une classe.'); return; }
    const { rang } = classementClasse(classe, trim);
    const list = eleves.filter(e => e.classe === classe)
        .map(e => ({ e, moy: moyenneEleve(e.id, trim) }))
        .filter(x => x.moy !== null && x.moy >= 10)
        .sort((a, b) => b.moy - a.moy);
    const ecole = getEcoleName();
    const lignes = list.map(r => `<tr>
        <td style="border:1px solid #999;padding:5px;text-align:center;">${rang[r.e.id]}</td>
        <td style="border:1px solid #999;padding:5px;">${eEsc(r.e.nom)} ${eEsc(r.e.prenom)}</td>
        <td style="border:1px solid #999;padding:5px;text-align:center;font-weight:bold;">${r.moy.toFixed(2)}/20</td>
        <td style="border:1px solid #999;padding:5px;">${mentionFor(r.moy).label}</td>
    </tr>`).join('');
    const html = `<div style="font-family:Arial,sans-serif;max-width:760px;margin:0 auto;padding:2rem;color:var(--ink,#111);">
        <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:0.6rem;margin-bottom:1rem;">
            <p style="margin:0;font-size:0.78rem;">RÉPUBLIQUE DU CONGO &ndash; Unité, Travail, Progrès</p>
            <h2 style="margin:0.3rem 0 0;text-transform:uppercase;">${eEsc(ecole)}</h2>
        </div>
        <h1 style="text-align:center;font-size:1.4rem;letter-spacing:2px;margin:1rem 0 0.25rem;">TABLEAU D'HONNEUR</h1>
        <p style="text-align:center;margin:0 0 1.5rem;color:var(--muted,#444);">Classe de ${eEsc(classe)} &mdash; ${eEsc(trim)}</p>
        ${list.length ? `<table style="width:100%;border-collapse:collapse;font-size:0.95rem;">
            <thead><tr style="background:var(--surface-2,#eee);"><th style="border:1px solid #999;padding:5px;">Rang</th><th style="border:1px solid #999;padding:5px;text-align:left;">Nom et prénom</th><th style="border:1px solid #999;padding:5px;">Moyenne</th><th style="border:1px solid #999;padding:5px;text-align:left;">Mention</th></tr></thead>
            <tbody>${lignes}</tbody></table>` : '<p style="text-align:center;color:var(--muted,#666);">Aucun élève admis (moyenne &ge; 10) pour ce trimestre.</p>'}
        <div style="margin-top:2.5rem;text-align:right;"><strong>Le Directeur des études</strong><div style="height:55px;"></div>(Signature et cachet)</div>
    </div>`;
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Tableau d'honneur ${eEsc(classe)}</title></head><body>${html}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
}

// ---------- Bulletin annuel ----------
function bulletinAnnuelHTML(eleveId) {
    const e = eleves.find(x => x.id === eleveId); if (!e) return '';
    const { rang, effectif } = classementAnnuel(e.classe);
    const moyAn = moyenneAnnuelle(eleveId);
    const men = mentionFor(moyAn);
    const appr = appreciations[`${eleveId}|3e Trimestre`] || {};
    const ecole = getEcoleName();
    let totalPoints = 0, totalCoef = 0;
    const lignes = matieresPourClasse(e.classe).map(m => {
        const c = parseFloat(m.coefficient) || 1;
        const t1 = noteMatiere(eleveId, m.id, '1er Trimestre');
        const t2 = noteMatiere(eleveId, m.id, '2e Trimestre');
        const t3 = noteMatiere(eleveId, m.id, '3e Trimestre');
        const dispo = [t1, t2, t3].filter(x => x !== null);
        const moyM = dispo.length ? dispo.reduce((s, x) => s + x, 0) / dispo.length : null;
        if (moyM !== null) { totalPoints += moyM * c; totalCoef += c; }
        const cell = (x) => x !== null ? x.toFixed(2) : '-';
        return `<tr>
            <td style="border:1px solid #999;padding:4px 6px;">${eEsc(m.nom)}</td>
            <td style="border:1px solid #999;padding:4px 6px;text-align:center;">${cell(t1)}</td>
            <td style="border:1px solid #999;padding:4px 6px;text-align:center;">${cell(t2)}</td>
            <td style="border:1px solid #999;padding:4px 6px;text-align:center;">${cell(t3)}</td>
            <td style="border:1px solid #999;padding:4px 6px;text-align:center;font-weight:bold;">${cell(moyM)}</td>
            <td style="border:1px solid #999;padding:4px 6px;text-align:center;">${c}</td>
        </tr>`;
    }).join('');
    return `
        <div style="font-family:Arial,sans-serif;max-width:820px;margin:0 auto;padding:1.5rem;color:var(--ink,#111);">
            <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:0.6rem;margin-bottom:0.8rem;">
                <p style="margin:0;font-size:0.8rem;">RÉPUBLIQUE DU CONGO</p>
                <p style="margin:0;font-size:0.72rem;letter-spacing:1px;">Unité &ndash; Travail &ndash; Progrès</p>
                <p style="margin:0.15rem 0 0;font-size:0.72rem;">Ministère de l'Enseignement Préscolaire, Primaire, Secondaire et de l'Alphabétisation</p>
                <h2 style="margin:0.3rem 0 0;text-transform:uppercase;font-size:1.2rem;">${eEsc(ecole)}</h2>
            </div>
            <h1 style="text-align:center;font-size:1.15rem;letter-spacing:1px;margin:0.4rem 0 1rem;">BULLETIN ANNUEL &mdash; ${eEsc(e.anneeScolaire || anneeScolaireCourante())}</h1>
            <table style="width:100%;margin-bottom:0.8rem;font-size:0.9rem;">
                <tr><td><strong>Élève :</strong> ${eEsc(e.nom)} ${eEsc(e.prenom)}</td><td><strong>Classe :</strong> ${eEsc(e.classe)}</td></tr>
                <tr><td><strong>Matricule :</strong> ${eEsc(e.matricule || '-')}</td><td><strong>Effectif :</strong> ${effectif}</td></tr>
            </table>
            <table style="width:100%;border-collapse:collapse;font-size:0.88rem;">
                <thead><tr style="background:var(--surface-2,#eee);">
                    <th style="border:1px solid #999;padding:4px 6px;text-align:left;">Matière</th>
                    <th style="border:1px solid #999;padding:4px 6px;">1er Trim.</th>
                    <th style="border:1px solid #999;padding:4px 6px;">2e Trim.</th>
                    <th style="border:1px solid #999;padding:4px 6px;">3e Trim.</th>
                    <th style="border:1px solid #999;padding:4px 6px;">Moy. annuelle</th>
                    <th style="border:1px solid #999;padding:4px 6px;">Coef</th>
                </tr></thead>
                <tbody>${lignes || '<tr><td colspan="6" style="border:1px solid #999;padding:8px;text-align:center;">Aucune matière</td></tr>'}</tbody>
                <tfoot><tr style="background:var(--surface-2,#f5f5f5);font-weight:bold;">
                    <td style="border:1px solid #999;padding:4px 6px;" colspan="4">TOTAUX</td>
                    <td style="border:1px solid #999;padding:4px 6px;text-align:center;">${totalPoints.toFixed(2)} pts</td>
                    <td style="border:1px solid #999;padding:4px 6px;text-align:center;">${totalCoef}</td>
                </tr></tfoot>
            </table>
            <table style="width:100%;border-collapse:collapse;margin-top:1rem;font-size:0.95rem;">
                <tr>
                    <td style="border:1px solid #999;padding:6px;"><strong>Moyenne annuelle :</strong> <span style="font-size:1.15rem;font-weight:bold;">${fmtMoy(moyAn)}</span></td>
                    <td style="border:1px solid #999;padding:6px;"><strong>Rang annuel :</strong> ${moyAn !== null ? rang[eleveId] + ' / ' + effectif : '-'}</td>
                    <td style="border:1px solid #999;padding:6px;"><strong>Mention :</strong> ${men.label}</td>
                </tr>
                <tr>
                    <td style="border:1px solid #999;padding:6px;"><strong>Conduite :</strong> ${eEsc(appr.conduite) || '.................'}</td>
                    <td colspan="2" style="border:1px solid #999;padding:6px;"><strong>Décision finale du conseil :</strong> ${eEsc(appr.decision) || decisionAuto(eleveId).decision || '.................'}</td>
                </tr>
            </table>
            <div style="margin-top:0.8rem;border:1px solid #999;padding:6px;min-height:44px;font-size:0.9rem;"><strong>Appréciation générale :</strong> ${eEsc(appr.appreciation) || ''}</div>
            <div style="margin-top:1.4rem;display:flex;justify-content:space-between;font-size:0.9rem;">
                <div><strong>Visa des parents</strong><div style="height:48px;"></div></div>
                <div style="text-align:center;"><strong>Le Directeur des études</strong><div style="height:48px;"></div>(Signature et cachet)</div>
            </div>
        </div>`;
}
function genererBulletinAnnuel(eleveId) {
    const e = eleves.find(x => x.id === eleveId); if (!e) return;
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Bulletin annuel - ${eEsc(e.nom)} ${eEsc(e.prenom)}</title></head><body>${bulletinAnnuelHTML(eleveId)}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
}
function genererTousBulletinsAnnuels() {
    const classe = document.getElementById('bulClasse').value;
    if (!classe) { alert('Choisissez une classe.'); return; }
    const list = eleves.filter(e => e.classe === classe)
        .map(e => ({ e, moy: moyenneAnnuelle(e.id) }))
        .sort((a, b) => (b.moy === null ? -1 : b.moy) - (a.moy === null ? -1 : a.moy));
    if (!list.length) { alert('Aucun élève dans cette classe.'); return; }
    const corps = list.map((r, i) => `<div style="${i < list.length - 1 ? 'page-break-after:always;' : ''}">${bulletinAnnuelHTML(r.e.id)}</div>`).join('');
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Bulletins annuels - ${eEsc(classe)}</title></head><body>${corps}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
}

// ---------- Appréciation / décision du conseil de classe ----------
function ouvrirAppreciation(eleveId) {
    const e = eleves.find(x => x.id === eleveId); if (!e) return;
    currentApprEleve = eleveId;
    const trim = document.getElementById('bulTrimestre').value || TRIMESTRES[0];
    const appr = appreciations[`${eleveId}|${trim}`] || {};
    document.getElementById('apprEleveNom').textContent = `${e.nom} ${e.prenom} — ${e.classe} (${trim})`;
    document.getElementById('apprConduite').innerHTML = CONDUITES.map(c => `<option ${appr.conduite === c ? 'selected' : ''}>${c || '— Conduite —'}</option>`).join('');
    document.getElementById('apprDecision').innerHTML = DECISIONS_CC.map(d => `<option ${appr.decision === d ? 'selected' : ''}>${d || '— Décision —'}</option>`).join('');
    document.getElementById('apprTexte').value = appr.appreciation || '';
    document.getElementById('apprModal').classList.remove('hidden');
}
function hideApprModal() { document.getElementById('apprModal').classList.add('hidden'); }
function saveAppreciation() {
    if (!currentApprEleve) return;
    const trim = document.getElementById('bulTrimestre').value || TRIMESTRES[0];
    const conduite = document.getElementById('apprConduite').value;
    const decision = document.getElementById('apprDecision').value;
    appreciations[`${currentApprEleve}|${trim}`] = {
        conduite: conduite.charAt(0) === '—' ? '' : conduite,
        decision: decision.charAt(0) === '—' ? '' : decision,
        appreciation: document.getElementById('apprTexte').value.trim()
    };
    persistAppreciations();
    hideApprModal();
    renderBulletinsList();
}

// ---------- Emplois du temps ----------
function renderEdtControls() {
    const c = document.getElementById('edtClasse');
    if (!c.dataset.init) { c.innerHTML = classeOptions(''); c.dataset.init = '1'; }
    document.getElementById('edtGrid').innerHTML = '<p style="color:var(--muted,#64748b);padding:1rem;">Choisissez une classe puis cliquez sur « Charger ».</p>';
}
function chargerEdt() {
    const classe = document.getElementById('edtClasse').value;
    const grid = document.getElementById('edtGrid');
    if (!classe) { grid.innerHTML = '<p style="color:var(--danger,#dc3545);padding:1rem;">Sélectionnez une classe.</p>'; return; }
    const data = edt[classe] || {};
    const matOpts = sel => '<option value="">—</option>' + matieres.map(m => `<option value="${eAttr(m.nom)}" ${sel === m.nom ? 'selected' : ''}>${eEsc(m.nom)}</option>`).join('');
    grid.innerHTML = `
        <div style="overflow-x:auto;"><table>
            <thead><tr><th>Horaire</th>${EDT_JOURS.map(j => `<th style="text-align:center;min-width:110px;">${j}</th>`).join('')}</tr></thead>
            <tbody>${EDT_CRENEAUX.map((cr, ci) => `<tr>
                <td style="font-weight:600;white-space:nowrap;">${cr}</td>
                ${EDT_JOURS.map((j, ji) => `<td><select id="edt_${ji}_${ci}" style="margin:0;padding:0.25rem;font-size:0.85rem;">${matOpts(data[`${ji}|${ci}`])}</select></td>`).join('')}
            </tr>`).join('')}</tbody>
        </table></div>`;
}
function saveEdt() {
    const classe = document.getElementById('edtClasse').value;
    if (!classe) return;
    const data = {};
    EDT_CRENEAUX.forEach((cr, ci) => EDT_JOURS.forEach((j, ji) => {
        const sel = document.getElementById(`edt_${ji}_${ci}`);
        if (sel && sel.value) data[`${ji}|${ci}`] = sel.value;
    }));
    edt[classe] = data;
    saveEdtData();
    alert('Emploi du temps enregistré.');
}

// ---------- Reporting (résultats) ----------
function renderEtuReporting() {
    const tSel = document.getElementById('repEtuTrimestre');
    if (!tSel.innerHTML) tSel.innerHTML = trimestreOptions(TRIMESTRES[0]);
    const trim = tSel.value || TRIMESTRES[0];

    const elevesMoy = eleves.map(e => ({ e, moy: moyenneEleve(e.id, trim) })).filter(x => x.moy !== null);
    const moyEcole = elevesMoy.length ? elevesMoy.reduce((s, x) => s + x.moy, 0) / elevesMoy.length : null;
    const reussite = elevesMoy.length ? Math.round(elevesMoy.filter(x => x.moy >= 10).length / elevesMoy.length * 100) : 0;

    const parClasse = classes.map(c => {
        const ms = eleves.filter(e => e.classe === c.nom).map(e => moyenneEleve(e.id, trim)).filter(m => m !== null);
        return { nom: c.nom, moy: ms.length ? ms.reduce((s, m) => s + m, 0) / ms.length : null, n: ms.length };
    });
    const classesNotees = parClasse.filter(c => c.moy !== null).slice().sort((a, b) => b.moy - a.moy);
    const meilleure = classesNotees[0];

    document.getElementById('repEtuMoyenne').textContent = moyEcole === null ? '-' : moyEcole.toFixed(2) + '/20';
    document.getElementById('repEtuReussite').textContent = elevesMoy.length ? reussite + ' %' : '-';
    document.getElementById('repEtuMeilleureClasse').textContent = meilleure ? meilleure.nom : '-';
    document.getElementById('repEtuNotes').textContent = elevesMoy.length;

    document.getElementById('repEtuTableClasse').innerHTML = `
        <table><thead><tr><th>Classe</th><th style="text-align:center;">Élèves notés</th><th style="text-align:right;">Moyenne</th><th>Mention</th></tr></thead><tbody>
        ${parClasse.map(c => { const men = mentionFor(c.moy); return `<tr><td style="font-weight:600;">${eEsc(c.nom)}</td><td style="text-align:center;">${c.n}</td><td style="text-align:right;font-weight:600;color:${men.color};">${fmtMoy(c.moy)}</td><td style="color:${men.color};">${men.label}</td></tr>`; }).join('')}
        <tr style="font-weight:700;border-top:2px solid #1B6BFF;"><td>ÉCOLE</td><td style="text-align:center;">${elevesMoy.length}</td><td style="text-align:right;">${fmtMoy(moyEcole)}</td><td></td></tr>
        </tbody></table>`;

    const top = elevesMoy.slice().sort((a, b) => b.moy - a.moy).slice(0, 10);
    document.getElementById('repEtuTop').innerHTML = top.length === 0
        ? '<p style="color:var(--muted,#64748b);padding:1rem;">Aucune note saisie pour ce trimestre.</p>'
        : `<table><thead><tr><th>Rang</th><th>Nom et prénom</th><th>Classe</th><th style="text-align:right;">Moyenne</th></tr></thead><tbody>
        ${top.map((x, i) => `<tr><td style="text-align:center;font-weight:600;">${i + 1}</td><td style="font-weight:600;">${eEsc(x.e.nom)} ${eEsc(x.e.prenom)}</td><td>${eEsc(x.e.classe)}</td><td style="text-align:right;font-weight:600;color:${mentionFor(x.moy).color};">${fmtMoy(x.moy)}</td></tr>`).join('')}
        </tbody></table>`;

    const parMatiere = matieres.map(m => {
        const vals = eleves.map(e => noteMatiere(e.id, m.id, trim)).filter(v => v !== null);
        return { nom: m.nom, moy: vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null };
    });

    if (typeof Chart === 'undefined') return;
    if (etuChartClasse) etuChartClasse.destroy();
    etuChartClasse = new Chart(document.getElementById('repEtuChartClasse'), {
        type: 'bar',
        data: { labels: parClasse.map(c => c.nom), datasets: [{ label: 'Moyenne /20', data: parClasse.map(c => c.moy === null ? 0 : +c.moy.toFixed(2)), backgroundColor: 'rgba(27,107,255,0.8)' }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 20 } } }
    });
    const buckets = ['Excellent', 'Très bien', 'Bien', 'Assez bien', 'Passable', 'Insuffisant'];
    const counts = buckets.map(b => elevesMoy.filter(x => mentionFor(x.moy).label === b).length);
    if (etuChartMention) etuChartMention.destroy();
    etuChartMention = new Chart(document.getElementById('repEtuChartMention'), {
        type: 'doughnut',
        data: { labels: buckets, datasets: [{ data: counts, backgroundColor: ['#16a34a', '#22c55e', '#0ea5e9', '#3b82f6', '#f59e0b', '#dc3545'] }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom' } } }
    });
    if (etuChartMatiere) etuChartMatiere.destroy();
    etuChartMatiere = new Chart(document.getElementById('repEtuChartMatiere'), {
        type: 'bar',
        data: { labels: parMatiere.map(m => m.nom), datasets: [{ label: 'Moyenne /20', data: parMatiere.map(m => m.moy === null ? 0 : +m.moy.toFixed(2)), backgroundColor: 'rgba(16,185,129,0.8)' }] },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, max: 20 } } }
    });
}

function exporterResultatsExcel() {
    if (typeof XLSX === 'undefined') { alert('Librairie Excel non chargée.'); return; }
    const trim = document.getElementById('repEtuTrimestre').value || TRIMESTRES[0];
    const rows = eleves.map(e => {
        const m = moyenneEleve(e.id, trim);
        return { Matricule: e.matricule || '', Nom: e.nom, Prénom: e.prenom, Classe: e.classe, Moyenne: m === null ? '' : +m.toFixed(2), Mention: m === null ? '' : mentionFor(m).label };
    }).sort((a, b) => (b.Moyenne === '' ? -1 : b.Moyenne) - (a.Moyenne === '' ? -1 : a.Moyenne));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Résultats');
    XLSX.writeFile(wb, 'resultats_' + trim.replace(/\s+/g, '_') + '.xlsx');
}

// ---------- Démarrage ----------
window.addEventListener('hashchange', etuRouteFromHash);
window.addEventListener('DOMContentLoaded', function () {
    loadEtudes();
    etuRouteFromHash();
});

// ---------- Passage de classe / Fin d'année ----------
function renderPassage() {
    const sel = document.getElementById('passClasse');
    if (sel && !sel.dataset.init) {
        sel.innerHTML = '<option value="">-- Choisir une classe --</option>' + classes.map(c => `<option value="${eAttr(c.nom)}">${eEsc(c.nom)}</option>`).join('');
        sel.dataset.init = '1';
    }
    const box = document.getElementById('passageBox');
    if (!box) return;
    const classe = sel ? sel.value : '';
    if (!classe) { box.innerHTML = '<p style="color:var(--muted,#64748b);padding:0.5rem;">Choisissez une classe pour voir les décisions de passage.</p>'; return; }
    const liste = eleves.filter(e => e.classe === classe).slice().sort((a, b) => (`${a.nom} ${a.prenom}`).localeCompare(`${b.nom} ${b.prenom}`));
    if (!liste.length) { box.innerHTML = '<p style="color:var(--muted,#64748b);padding:0.5rem;">Aucun élève dans cette classe.</p>'; return; }
    const suiv = prochaineClasse(classe);
    const optClasses = (selVal) => '<option value="">— (rester / non défini) —</option>' + classes.map(c => `<option value="${eAttr(c.nom)}" ${c.nom === selVal ? 'selected' : ''}>${eEsc(c.nom)}</option>`).join('');
    const decisionsSel = ['Admis(e) en classe supérieure', 'Redouble la classe', 'Exclu(e)', 'Réorienté(e)'];
    let nbAdmis = 0, nbRed = 0;
    const lignes = liste.map(e => {
        const d = decisionAuto(e.id);
        const estAdmis = d.decision.indexOf('Admis') === 0;
        if (d.decision) { if (estAdmis) nbAdmis++; else if (d.decision.indexOf('Redouble') === 0) nbRed++; }
        const cibleDefaut = estAdmis ? (suiv || '') : classe; // admis → classe sup ; sinon même classe
        return `<tr>
            <td style="font-weight:600;">${eEsc(e.nom)} ${eEsc(e.prenom)}</td>
            <td style="text-align:center;font-weight:700;">${d.moy !== null ? d.moy.toFixed(2) : '<span style="color:var(--muted-2,#94a3b8);">—</span>'}</td>
            <td style="text-align:center;color:var(--muted,#64748b);font-size:0.82rem;">≥ ${d.seuil}</td>
            <td>
                <select id="pass_dec_${e.id}" onchange="passSyncCible('${e.id}','${eAttr(suiv)}','${eAttr(classe)}')" style="margin:0;min-width:210px;">
                    ${decisionsSel.map(x => `<option value="${eAttr(x)}" ${x === d.decision ? 'selected' : ''}>${eEsc(x)}</option>`).join('')}
                </select>
            </td>
            <td><select id="pass_cls_${e.id}" style="margin:0;min-width:160px;">${optClasses(cibleDefaut)}</select></td>
        </tr>`;
    }).join('');
    box.innerHTML = `
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-bottom:0.75rem;">
            <span style="background:var(--ok-bg,#dcfce7);color:var(--ok-strong,#166534);border-radius:999px;padding:0.2rem 0.7rem;font-size:0.85rem;">Admis proposés : <strong>${nbAdmis}</strong></span>
            <span style="background:var(--danger-bg,#fee2e2);color:var(--danger-strong,#991b1b);border-radius:999px;padding:0.2rem 0.7rem;font-size:0.85rem;">Redoublants proposés : <strong>${nbRed}</strong></span>
            <span style="background:var(--brand-bg,#eef2ff);color:var(--brand-strong,#4338ca);border-radius:999px;padding:0.2rem 0.7rem;font-size:0.85rem;">Classe supérieure suggérée : <strong>${suiv ? eEsc(suiv) : 'à définir'}</strong></span>
        </div>
        <table>
            <thead><tr><th>Élève</th><th style="text-align:center;">Moy. annuelle</th><th style="text-align:center;">Seuil</th><th>Décision</th><th>Classe d'arrivée</th></tr></thead>
            <tbody>${lignes}</tbody>
        </table>
        <p style="color:var(--muted,#64748b);font-size:0.8rem;margin:0.75rem 0 0;">💡 « Classe d'arrivée » s'applique aux admis. Pour un redoublant, laissez sa classe actuelle. Vérifiez bien avant d'appliquer (action sur le registre des élèves).</p>`;
}

function passSyncCible(id, suiv, classe) {
    const dec = document.getElementById('pass_dec_' + id);
    const cls = document.getElementById('pass_cls_' + id);
    if (!dec || !cls) return;
    const estAdmis = dec.value.indexOf('Admis') === 0;
    cls.value = estAdmis ? (suiv || '') : classe;
}

function appliquerPassage() {
    const sel = document.getElementById('passClasse');
    const classe = sel ? sel.value : '';
    if (!classe) { alert('Choisissez d\'abord une classe.'); return; }
    const liste = eleves.filter(e => e.classe === classe);
    if (!liste.length) { alert('Aucun élève dans cette classe.'); return; }
    let admis = 0, redouble = 0, autre = 0, sansCible = 0;
    const actions = [];
    liste.forEach(e => {
        const decEl = document.getElementById('pass_dec_' + e.id);
        const clsEl = document.getElementById('pass_cls_' + e.id);
        if (!decEl) return;
        const dec = decEl.value;
        const cible = clsEl ? clsEl.value : '';
        if (dec.indexOf('Admis') === 0) { if (!cible) { sansCible++; } else { admis++; actions.push({ e, cible, statut: 'Admis(e)' }); } }
        else if (dec.indexOf('Redouble') === 0) { redouble++; actions.push({ e, cible: e.classe, statut: 'Redouble' }); }
        else { autre++; actions.push({ e, cible: e.classe, statut: dec }); }
    });
    let msg = `Appliquer le passage pour « ${classe} » ?\n\n• ${admis} admis → classe supérieure\n• ${redouble} redoublant(s) → même classe\n`;
    if (autre) msg += `• ${autre} autre(s) décision(s)\n`;
    if (sansCible) msg += `\n⚠️ ${sansCible} admis SANS classe d'arrivée seront ignorés (choisissez leur classe).`;
    msg += `\n\nCette action modifie le registre des élèves.`;
    if (!confirm(msg)) return;
    actions.forEach(a => {
        const el = eleves.find(x => x.id === a.e.id); if (!el) return;
        el.classe = a.cible || el.classe;
        el.statut = a.statut;
    });
    saveElevesEtudes();
    alert(`Passage appliqué : ${admis} admis, ${redouble} redoublant(s).` + (sansCible ? `\n${sansCible} admis ignorés (sans classe d'arrivée).` : ''));
    renderPassage();
    if (typeof renderElevesEtudes === 'function') renderElevesEtudes();
}

// ---------- Archives des années scolaires ----------
const ARCHIVES_KEY = 'ecole_archives';
function arRead() { try { return JSON.parse(localStorage.getItem(ARCHIVES_KEY)) || {}; } catch (e) { return {}; } }
function arSave(o) { localStorage.setItem(ARCHIVES_KEY, JSON.stringify(o)); }

function archiverAnnee() {
    const champ = document.getElementById('arAnnee');
    let annee = (champ && champ.value.trim()) || anneeScolaireCourante();
    if (!annee) { alert('Indiquez l\'année scolaire (ex: 2025-2026).'); return; }
    const arch = arRead();
    if (arch[annee] && !confirm(`L'année ${annee} est déjà archivée. La remplacer par l'état actuel ?`)) return;
    if (!confirm(`Archiver l'année ${annee} ?\n\nUn instantané des élèves, classes, notes, appréciations et effectifs sera conservé, et un fichier de sauvegarde sera téléchargé.`)) return;
    const snap = {
        annee: annee,
        date: new Date().toISOString(),
        data: {
            eleves: JSON.parse(JSON.stringify(eleves)),
            classes: JSON.parse(JSON.stringify(classes)),
            matieres: JSON.parse(JSON.stringify(matieres)),
            enseignants: JSON.parse(JSON.stringify(enseignants)),
            notes: JSON.parse(JSON.stringify(notes)),
            appreciations: JSON.parse(JSON.stringify(appreciations)),
            notesHisto: JSON.parse(JSON.stringify(notesHisto))
        }
    };
    arch[annee] = snap;
    arSave(arch);
    // Téléchargement de sécurité
    try {
        const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'archive_' + annee.replace(/[^0-9A-Za-z\-]/g, '_') + '.json';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (e) { }
    if (champ) champ.value = '';
    alert(`Année ${annee} archivée (${snap.data.eleves.length} élève(s)).`);
    renderArchives();
}

function renderArchives() {
    const champ = document.getElementById('arAnnee');
    if (champ && !champ.value) champ.value = anneeScolaireCourante();
    const box = document.getElementById('archivesBox');
    if (!box) return;
    const arch = arRead();
    const annees = Object.keys(arch).sort().reverse();
    if (annees.length === 0) {
        box.innerHTML = '<p style="color:var(--muted,#64748b);padding:0.5rem;">Aucune année archivée pour le moment. Archivez l\'année en cours avant le passage de classe.</p>';
        return;
    }
    const lignes = annees.map(an => {
        const s = arch[an];
        const d = s.date ? new Date(s.date).toLocaleDateString('fr-FR') : '';
        const nbE = (s.data && s.data.eleves) ? s.data.eleves.length : 0;
        const nbC = (s.data && s.data.classes) ? s.data.classes.length : 0;
        return `<tr>
            <td style="font-weight:700;">${eEsc(an)}</td>
            <td>${d}</td>
            <td style="text-align:center;">${nbE}</td>
            <td style="text-align:center;">${nbC}</td>
            <td style="text-align:right;white-space:nowrap;">
                <button class="btn btn-primary" style="padding:0.3rem 0.6rem;font-size:0.8rem;" onclick="rapportArchive('${eAttr(an)}')">📄 Rapport</button>
                <button class="btn btn-secondary" style="padding:0.3rem 0.6rem;font-size:0.8rem;" onclick="telechargerArchive('${eAttr(an)}')">⬇️ JSON</button>
                <button class="btn btn-danger" style="padding:0.3rem 0.6rem;font-size:0.8rem;" onclick="supprimerArchive('${eAttr(an)}')">🗑️</button>
            </td>
        </tr>`;
    }).join('');
    box.innerHTML = `
        <table>
            <thead><tr><th>Année scolaire</th><th>Archivée le</th><th style="text-align:center;">Élèves</th><th style="text-align:center;">Classes</th><th style="text-align:right;">Actions</th></tr></thead>
            <tbody>${lignes}</tbody>
        </table>
        <p style="color:var(--muted,#64748b);font-size:0.8rem;margin:0.75rem 0 0;">📄 Rapport = effectifs + résultats de fin d'année (imprimable). ⬇️ JSON = fichier de sauvegarde à conserver hors de l'ordinateur.</p>`;
}

function telechargerArchive(annee) {
    const arch = arRead(); const s = arch[annee]; if (!s) return;
    const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'archive_' + annee.replace(/[^0-9A-Za-z\-]/g, '_') + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function supprimerArchive(annee) {
    if (!confirm(`Supprimer définitivement l'archive de l'année ${annee} ?\n(Pensez à télécharger le fichier JSON avant si besoin.)`)) return;
    const arch = arRead(); delete arch[annee]; arSave(arch); renderArchives();
}

// Rapport imprimable d'une année archivée (effectifs + résultats), en basculant temporairement les données
function rapportArchive(annee) {
    const arch = arRead(); const s = arch[annee]; if (!s || !s.data) { alert('Archive introuvable.'); return; }
    // Sauvegarde des données vivantes
    const bk = { eleves: eleves, classes: classes, matieres: matieres, notes: notes, appreciations: appreciations };
    let html = '';
    try {
        // Bascule sur les données archivées (lecture seule, le temps de générer le rapport)
        eleves = s.data.eleves || []; classes = s.data.classes || []; matieres = s.data.matieres || [];
        notes = s.data.notes || {}; appreciations = s.data.appreciations || {};
        const ecole = getEcoleName();
        const total = eleves.length;
        const g = eleves.filter(e => e.sexe === 'M').length;
        const f = eleves.filter(e => e.sexe === 'F').length;
        const estPrim = c => (c.cycle === 'primaire') || (c.type === 'primaire') || /\b(cp1|cp2|ce1|ce2|cm1|cm2|maternelle|gs|ms|ps)\b/i.test(c.nom || '');
        const ordered = classes.slice().sort((a, b) => (estPrim(b) - estPrim(a)) || (a.nom || '').localeCompare(b.nom || ''));
        // Effectifs
        let effRows = ''; let i = 0;
        ordered.forEach(c => {
            const cg = eleves.filter(e => e.classe === c.nom && e.sexe === 'M').length;
            const cf = eleves.filter(e => e.classe === c.nom && e.sexe === 'F').length;
            i++;
            effRows += `<tr><td style="border:1px solid #999;padding:3px 7px;text-align:center;">${i}</td><td style="border:1px solid #999;padding:3px 7px;">${eEsc(c.nom)}</td><td style="border:1px solid #999;padding:3px 7px;text-align:center;">${cg}</td><td style="border:1px solid #999;padding:3px 7px;text-align:center;">${cf}</td><td style="border:1px solid #999;padding:3px 7px;text-align:center;font-weight:700;">${cg + cf}</td></tr>`;
        });
        // Résultats de fin d'année par classe
        let resBlocks = '';
        ordered.forEach(c => {
            const els = eleves.filter(e => e.classe === c.nom).sort((a, b) => (`${a.nom} ${a.prenom}`).localeCompare(`${b.nom} ${b.prenom}`));
            if (!els.length) return;
            const rows = els.map(e => {
                const d = decisionAuto(e.id);
                const appr = appreciations[e.id + '|annuel'] || {};
                const decision = (appr && appr.decision) || d.decision || '—';
                return `<tr><td style="border:1px solid #999;padding:3px 7px;">${eEsc(e.nom)} ${eEsc(e.prenom)}</td><td style="border:1px solid #999;padding:3px 7px;text-align:center;">${d.moy !== null ? d.moy.toFixed(2) : '—'}</td><td style="border:1px solid #999;padding:3px 7px;">${eEsc(decision)}</td></tr>`;
            }).join('');
            resBlocks += `<h3 style="margin:1rem 0 0.3rem;font-size:1rem;">Classe : ${eEsc(c.nom)}</h3>
                <table style="width:100%;border-collapse:collapse;font-size:0.85rem;"><thead><tr style="background:var(--surface-2,#eee);"><th style="border:1px solid #999;padding:3px 7px;text-align:left;">Élève</th><th style="border:1px solid #999;padding:3px 7px;">Moy. annuelle</th><th style="border:1px solid #999;padding:3px 7px;text-align:left;">Décision</th></tr></thead><tbody>${rows}</tbody></table>`;
        });
        html = `<div style="text-align:center;border-bottom:2px solid #333;padding-bottom:0.6rem;margin-bottom:1rem;">
                <p style="margin:0;font-size:0.8rem;">RÉPUBLIQUE DU CONGO — Unité · Travail · Progrès</p>
                <h2 style="margin:0.3rem 0;">${eEsc(ecole)}</h2>
                <h3 style="margin:0;">Rapport de l'année scolaire ${eEsc(annee)}</h3>
                <p style="margin:0.2rem 0;font-size:0.82rem;">Document d'archive — édité le ${new Date().toLocaleDateString('fr-FR')}</p></div>
            <h3 style="margin:0 0 0.3rem;font-size:1.05rem;">Effectifs</h3>
            <table style="width:100%;border-collapse:collapse;font-size:0.88rem;">
                <thead><tr style="background:var(--surface-2,#eee);"><th style="border:1px solid #999;padding:3px 7px;">N°</th><th style="border:1px solid #999;padding:3px 7px;text-align:left;">Classe</th><th style="border:1px solid #999;padding:3px 7px;">Garçons</th><th style="border:1px solid #999;padding:3px 7px;">Filles</th><th style="border:1px solid #999;padding:3px 7px;">Total</th></tr></thead>
                <tbody>${effRows}<tr style="font-weight:700;background:var(--surface-2,#f3f4f6);"><td colspan="2" style="border:1px solid #999;padding:3px 7px;text-align:right;">TOTAL</td><td style="border:1px solid #999;padding:3px 7px;text-align:center;">${g}</td><td style="border:1px solid #999;padding:3px 7px;text-align:center;">${f}</td><td style="border:1px solid #999;padding:3px 7px;text-align:center;">${total}</td></tr></tbody>
            </table>
            <h2 style="margin:1.4rem 0 0.2rem;font-size:1.15rem;">Résultats de fin d'année</h2>
            ${resBlocks || '<p>Aucune note enregistrée pour cette année.</p>'}`;
    } catch (err) {
        alert('Erreur lors de la génération du rapport : ' + err.message);
    } finally {
        // Restauration impérative des données vivantes
        eleves = bk.eleves; classes = bk.classes; matieres = bk.matieres; notes = bk.notes; appreciations = bk.appreciations;
    }
    if (!html) return;
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Archive ${eEsc(annee)}</title></head><body style="font-family:Arial,sans-serif;padding:1.6rem;color:var(--ink,#111);">${html}<div style="margin-top:2rem;text-align:right;font-size:0.9rem;">Le Chef d'établissement<br><br>__________________</div></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
}

// ---------- Examens officiels (CEPE / BEPC / BAC) ----------
const EXAMENS_KEY = 'ecole_examens';
const EX_RESULTATS = ['', 'Admis(e)', 'Ajourné(e)', 'Absent(e)'];
const EX_MENTIONS = ['', 'Passable', 'Assez bien', 'Bien', 'Très bien', 'Excellent'];
function exRead() { try { return JSON.parse(localStorage.getItem(EXAMENS_KEY)) || {}; } catch (e) { return {}; } }
function exSaveAll(o) { localStorage.setItem(EXAMENS_KEY, JSON.stringify(o)); }
function exKey(exam, annee, eleveId) { return exam + '|' + annee + '|' + eleveId; }
function exGet(exam, annee, eleveId) { return exRead()[exKey(exam, annee, eleveId)] || { resultat: '', mention: '' }; }

// Classes pertinentes par examen (heuristique, mais on liste toutes les classes)
function exClassesPertinentes(exam) {
    const re = exam === 'CEPE' ? /\b(cm2)\b/i : exam === 'BEPC' ? /\b(3.?e?me|3eme)\b/i : /\b(t.?le|terminale|tle)\b/i;
    return classes.filter(c => re.test((c.nom || '').replace(/è/g, 'e')));
}

function exParams() {
    const exam = (document.getElementById('exExam') || {}).value || 'CEPE';
    let annee = ((document.getElementById('exAnnee') || {}).value || '').trim();
    if (!annee) { annee = String(new Date().getFullYear()); }
    const classe = (document.getElementById('exClasse') || {}).value || '';
    return { exam, annee, classe };
}

function exSet(eleveId, field, value) {
    const { exam, annee } = exParams();
    const o = exRead();
    const k = exKey(exam, annee, eleveId);
    const cur = o[k] || { resultat: '', mention: '' };
    cur[field] = value;
    if (field === 'resultat' && value !== 'Admis(e)') cur.mention = '';
    o[k] = cur; exSaveAll(o);
    exMajResume();
    if (field === 'resultat') renderExamens(); // pour afficher/masquer la mention
}

function exStats(exam, annee, liste) {
    let presentes = 0, admis = 0, ajournes = 0, absents = 0, saisis = 0;
    liste.forEach(e => {
        const r = exGet(exam, annee, e.id).resultat;
        if (!r) return;
        saisis++;
        if (r === 'Absent(e)') { absents++; return; }
        presentes++;
        if (r === 'Admis(e)') admis++; else if (r === 'Ajourné(e)') ajournes++;
    });
    const taux = presentes ? Math.round(admis / presentes * 100) : 0;
    return { presentes, admis, ajournes, absents, saisis, taux, inscrits: liste.length };
}

function exMajResume() {
    const { exam, annee, classe } = exParams();
    const box = document.getElementById('exResume');
    if (!box) return;
    const liste = eleves.filter(e => e.classe === classe);
    const s = exStats(exam, annee, liste);
    box.innerHTML = `
        <span style="background:var(--brand-bg,#eef2ff);color:var(--brand-strong,#4338ca);border-radius:999px;padding:.25rem .8rem;font-weight:600;">Présentés : ${s.presentes}/${s.inscrits}</span>
        <span style="background:var(--ok-bg,#dcfce7);color:var(--ok-strong,#166534);border-radius:999px;padding:.25rem .8rem;font-weight:600;">Admis : ${s.admis}</span>
        <span style="background:var(--danger-bg,#fee2e2);color:var(--danger-strong,#991b1b);border-radius:999px;padding:.25rem .8rem;font-weight:600;">Ajournés : ${s.ajournes}</span>
        <span style="background:linear-gradient(135deg,#1B6BFF,#28C6F5);color:#fff;border-radius:999px;padding:.25rem .9rem;font-weight:700;">Taux de réussite : ${s.taux}%</span>`;
}

function renderExamens() {
    const sel = document.getElementById('exClasse');
    const exam = (document.getElementById('exExam') || {}).value || 'CEPE';
    const annInput = document.getElementById('exAnnee');
    if (annInput && !annInput.value) annInput.value = String(new Date().getFullYear());
    if (sel) {
        const cur = sel.value;
        const pert = exClassesPertinentes(exam);
        const liste = (pert.length ? pert : classes).slice().sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
        sel.innerHTML = '<option value="">-- Choisir une classe --</option>' + liste.map(c => `<option value="${eAttr(c.nom)}" ${c.nom === cur ? 'selected' : ''}>${eEsc(c.nom)}</option>`).join('');
        // si la classe courante n'est plus dans la liste (changement d'examen), prendre la 1re
        if (cur && !liste.some(c => c.nom === cur)) sel.value = '';
    }
    const { annee, classe } = exParams();
    const box = document.getElementById('examensBox');
    if (!box) return;
    if (!classe) { box.innerHTML = '<p style="color:var(--muted,#64748b);padding:.5rem;">Choisissez une classe pour saisir les résultats.</p>'; return; }
    const liste = eleves.filter(e => e.classe === classe).slice().sort((a, b) => (`${a.nom} ${a.prenom}`).localeCompare(`${b.nom} ${b.prenom}`));
    if (!liste.length) { box.innerHTML = '<p style="color:var(--muted,#64748b);padding:.5rem;">Aucun élève dans cette classe.</p>'; return; }
    const withMention = (exam === 'BEPC' || exam === 'BAC');
    const lignes = liste.map(e => {
        const r = exGet(exam, annee, e.id);
        const showMention = withMention && r.resultat === 'Admis(e)';
        return `<tr>
            <td style="font-weight:600;">${eEsc(e.nom)} ${eEsc(e.prenom)}<br><span style="color:var(--muted,#64748b);font-size:.78rem;font-family:monospace;">${eEsc(e.matricule || '')}</span></td>
            <td><select onchange="exSet('${e.id}','resultat',this.value)" style="margin:0;min-width:140px;">
                ${EX_RESULTATS.map(x => `<option value="${eAttr(x)}" ${x === r.resultat ? 'selected' : ''}>${x || '— non saisi —'}</option>`).join('')}
            </select></td>
            <td>${showMention ? `<select onchange="exSet('${e.id}','mention',this.value)" style="margin:0;min-width:130px;">${EX_MENTIONS.map(m => `<option value="${eAttr(m)}" ${m === r.mention ? 'selected' : ''}>${m || '—'}</option>`).join('')}</select>` : '<span style="color:var(--muted-2,#cbd5e1);">—</span>'}</td>
        </tr>`;
    }).join('');
    box.innerHTML = `
        <div id="exResume" style="display:flex;gap:.6rem;flex-wrap:wrap;margin-bottom:.85rem;"></div>
        <table>
            <thead><tr><th>Candidat</th><th>Résultat</th><th>Mention ${withMention ? '' : '(non applicable)'}</th></tr></thead>
            <tbody>${lignes}</tbody>
        </table>
        <p style="color:var(--muted,#64748b);font-size:.8rem;margin:.75rem 0 0;">💡 Taux de réussite = Admis ÷ Présentés (les « Absent(e) » ne comptent pas comme présentés). Saisie enregistrée automatiquement.</p>`;
    exMajResume();
}

function exImprimer() {
    const { exam, annee, classe } = exParams();
    if (!classe) { alert('Choisissez une classe.'); return; }
    const liste = eleves.filter(e => e.classe === classe).slice().sort((a, b) => (`${a.nom} ${a.prenom}`).localeCompare(`${b.nom} ${b.prenom}`));
    if (!liste.length) { alert('Aucun élève dans cette classe.'); return; }
    const s = exStats(exam, annee, liste);
    const ecole = getEcoleName();
    let i = 0;
    const rows = liste.map(e => {
        const r = exGet(exam, annee, e.id);
        i++;
        return `<tr><td style="border:1px solid #999;padding:3px 7px;text-align:center;">${i}</td><td style="border:1px solid #999;padding:3px 7px;">${eEsc(e.nom)} ${eEsc(e.prenom)}</td><td style="border:1px solid #999;padding:3px 7px;">${eEsc(r.resultat || '—')}</td><td style="border:1px solid #999;padding:3px 7px;">${eEsc(r.mention || '')}</td></tr>`;
    }).join('');
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Résultats ${exam} ${annee} - ${eEsc(classe)}</title></head>
        <body style="font-family:Arial,sans-serif;padding:1.6rem;color:var(--ink,#111);">
        <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:.6rem;margin-bottom:1rem;">
            <p style="margin:0;font-size:.8rem;">RÉPUBLIQUE DU CONGO — Unité · Travail · Progrès</p>
            <h2 style="margin:.3rem 0;">${eEsc(ecole)}</h2>
            <h3 style="margin:0;">Résultats ${eEsc(exam)} — Session ${eEsc(annee)}</h3>
            <p style="margin:.2rem 0;font-size:.85rem;">Classe : ${eEsc(classe)} — édité le ${new Date().toLocaleDateString('fr-FR')}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:.88rem;">
            <thead><tr style="background:var(--surface-2,#eee);"><th style="border:1px solid #999;padding:3px 7px;">N°</th><th style="border:1px solid #999;padding:3px 7px;text-align:left;">Candidat</th><th style="border:1px solid #999;padding:3px 7px;">Résultat</th><th style="border:1px solid #999;padding:3px 7px;">Mention</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:1rem;font-size:.95rem;">
            <p style="margin:.2rem 0;">Présentés : <strong>${s.presentes}</strong> &nbsp;•&nbsp; Admis : <strong>${s.admis}</strong> &nbsp;•&nbsp; Ajournés : <strong>${s.ajournes}</strong> &nbsp;•&nbsp; Absents : <strong>${s.absents}</strong></p>
            <p style="margin:.2rem 0;font-size:1.1rem;">Taux de réussite : <strong>${s.taux}%</strong></p>
        </div>
        <div style="margin-top:2.2rem;text-align:right;font-size:.9rem;">Le Chef d'établissement<br><br>__________________</div>
        </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
}

function exGlobal() {
    const { exam, annee } = exParams();
    const pert = exClassesPertinentes(exam);
    const cls = (pert.length ? pert : classes).slice().sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
    const ecole = getEcoleName();
    let totPres = 0, totAdm = 0;
    const rows = cls.map(c => {
        const liste = eleves.filter(e => e.classe === c.nom);
        const s = exStats(exam, annee, liste);
        totPres += s.presentes; totAdm += s.admis;
        return `<tr><td style="border:1px solid #999;padding:3px 7px;">${eEsc(c.nom)}</td><td style="border:1px solid #999;padding:3px 7px;text-align:center;">${s.presentes}</td><td style="border:1px solid #999;padding:3px 7px;text-align:center;">${s.admis}</td><td style="border:1px solid #999;padding:3px 7px;text-align:center;font-weight:700;">${s.taux}%</td></tr>`;
    }).join('');
    const tauxGlobal = totPres ? Math.round(totAdm / totPres * 100) : 0;
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Taux de réussite ${exam} ${annee}</title></head>
        <body style="font-family:Arial,sans-serif;padding:1.6rem;color:var(--ink,#111);">
        <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:.6rem;margin-bottom:1rem;">
            <p style="margin:0;font-size:.8rem;">RÉPUBLIQUE DU CONGO — Unité · Travail · Progrès</p>
            <h2 style="margin:.3rem 0;">${eEsc(ecole)}</h2>
            <h3 style="margin:0;">Taux de réussite ${eEsc(exam)} — Session ${eEsc(annee)}</h3>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:.9rem;">
            <thead><tr style="background:var(--surface-2,#eee);"><th style="border:1px solid #999;padding:4px 8px;text-align:left;">Classe</th><th style="border:1px solid #999;padding:4px 8px;">Présentés</th><th style="border:1px solid #999;padding:4px 8px;">Admis</th><th style="border:1px solid #999;padding:4px 8px;">Taux</th></tr></thead>
            <tbody>${rows}<tr style="font-weight:700;background:var(--surface-2,#f3f4f6);"><td style="border:1px solid #999;padding:4px 8px;text-align:right;">TOTAL ÉTABLISSEMENT</td><td style="border:1px solid #999;padding:4px 8px;text-align:center;">${totPres}</td><td style="border:1px solid #999;padding:4px 8px;text-align:center;">${totAdm}</td><td style="border:1px solid #999;padding:4px 8px;text-align:center;">${tauxGlobal}%</td></tr></tbody>
        </table>
        <div style="margin-top:2.2rem;text-align:right;font-size:.9rem;">Le Chef d'établissement<br><br>__________________</div>
        </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
}

// ---------- Cahier de textes (journal des leçons) ----------
const CAHIER_KEY = 'ecole_cahier_textes';
function ctRead() { try { return JSON.parse(localStorage.getItem(CAHIER_KEY)) || []; } catch (e) { return []; } }
function ctSave(a) { localStorage.setItem(CAHIER_KEY, JSON.stringify(a)); }
function ctMatNom(id) { const m = matieres.find(x => x.id === id); return m ? m.nom : (id || ''); }
function ctEnsNom(id) { const e = enseignants.find(x => x.id === id); return e ? (e.nom + ' ' + (e.prenom || '')) : ''; }

function ctRemplirSelects() {
    const optClasses = '<option value="">-- Classe --</option>' + classes.slice().sort((a, b) => (a.nom || '').localeCompare(b.nom || '')).map(c => `<option value="${eAttr(c.nom)}">${eEsc(c.nom)}</option>`).join('');
    const optMat = '<option value="">-- Matière --</option>' + matieres.slice().sort((a, b) => (a.nom || '').localeCompare(b.nom || '')).map(m => `<option value="${eAttr(m.id)}">${eEsc(m.nom)}</option>`).join('');
    const optEns = '<option value="">-- (optionnel) --</option>' + enseignants.slice().sort((a, b) => (a.nom || '').localeCompare(b.nom || '')).map(e => `<option value="${eAttr(e.id)}">${eEsc(e.nom)} ${eEsc(e.prenom || '')}</option>`).join('');
    const set = (id, html, keep) => { const el = document.getElementById(id); if (el) { const v = keep ? el.value : ''; el.innerHTML = html; if (keep) el.value = v; } };
    set('ctClasse', optClasses); set('ctMatiere', optMat); set('ctEnseignant', optEns);
    set('ctFiltreClasse', '<option value="">Toutes les classes</option>' + classes.slice().sort((a, b) => (a.nom || '').localeCompare(b.nom || '')).map(c => `<option value="${eAttr(c.nom)}">${eEsc(c.nom)}</option>`).join(''), true);
    set('ctFiltreMatiere', '<option value="">Toutes les matières</option>' + matieres.slice().sort((a, b) => (a.nom || '').localeCompare(b.nom || '')).map(m => `<option value="${eAttr(m.id)}">${eEsc(m.nom)}</option>`).join(''), true);
}

function ctEnregistrer() {
    const date = document.getElementById('ctDate').value;
    const classe = document.getElementById('ctClasse').value;
    const matiere = document.getElementById('ctMatiere').value;
    const lecon = document.getElementById('ctLecon').value.trim();
    if (!date || !classe || !matiere) { alert('Renseignez au moins la date, la classe et la matière.'); return; }
    if (!lecon) { alert('Indiquez le contenu de la leçon.'); return; }
    const entry = {
        date, classe, matiere,
        enseignant: document.getElementById('ctEnseignant').value,
        lecon,
        devoirs: document.getElementById('ctDevoirs').value.trim()
    };
    const arr = ctRead();
    const editId = document.getElementById('ctEditId').value;
    if (editId) { const i = arr.findIndex(x => x.id === editId); if (i >= 0) arr[i] = Object.assign(arr[i], entry); }
    else { entry.id = 'ct_' + Date.now() + '_' + Math.floor(Math.random() * 1000); arr.push(entry); }
    ctSave(arr);
    ctReset();
    renderCahier();
    alert('Leçon enregistrée.');
}

function ctReset() {
    ['ctDate', 'ctClasse', 'ctMatiere', 'ctEnseignant', 'ctLecon', 'ctDevoirs', 'ctEditId'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const d = document.getElementById('ctDate'); if (d) d.value = new Date().toISOString().split('T')[0];
}

function ctEditer(id) {
    const e = ctRead().find(x => x.id === id); if (!e) return;
    document.getElementById('ctDate').value = e.date || '';
    document.getElementById('ctClasse').value = e.classe || '';
    document.getElementById('ctMatiere').value = e.matiere || '';
    document.getElementById('ctEnseignant').value = e.enseignant || '';
    document.getElementById('ctLecon').value = e.lecon || '';
    document.getElementById('ctDevoirs').value = e.devoirs || '';
    document.getElementById('ctEditId').value = id;
    const sec = document.getElementById('sec-cahier'); if (sec) sec.scrollIntoView({ behavior: 'smooth' });
}

function ctSupprimer(id) {
    if (!confirm('Supprimer cette leçon du cahier de textes ?')) return;
    ctSave(ctRead().filter(x => x.id !== id));
    renderCahier();
}

function ctListeFiltree() {
    const fc = (document.getElementById('ctFiltreClasse') || {}).value || '';
    const fm = (document.getElementById('ctFiltreMatiere') || {}).value || '';
    return ctRead()
        .filter(e => (!fc || e.classe === fc) && (!fm || e.matiere === fm))
        .sort((a, b) => (a.date || '') < (b.date || '') ? 1 : -1);
}

function renderCahier() {
    if (!document.getElementById('ctDate').value) document.getElementById('ctDate').value = new Date().toISOString().split('T')[0];
    ctRemplirSelects();
    const box = document.getElementById('cahierBox');
    if (!box) return;
    const liste = ctListeFiltree();
    if (!liste.length) { box.innerHTML = '<p style="color:var(--muted,#64748b);padding:0.5rem;">Aucune leçon enregistrée pour cette sélection.</p>'; return; }
    const lignes = liste.map(e => `<tr>
        <td style="white-space:nowrap;">${eEsc(new Date(e.date).toLocaleDateString('fr-FR'))}</td>
        <td>${eEsc(e.classe)}</td>
        <td>${eEsc(ctMatNom(e.matiere))}</td>
        <td>${eEsc(e.lecon)}${e.enseignant ? `<br><span style="color:var(--muted,#64748b);font-size:0.78rem;">👤 ${eEsc(ctEnsNom(e.enseignant))}</span>` : ''}</td>
        <td>${eEsc(e.devoirs || '') || '<span style="color:var(--muted-2,#cbd5e1);">—</span>'}</td>
        <td style="text-align:right;white-space:nowrap;">
            <button class="btn btn-secondary" style="padding:0.25rem 0.5rem;font-size:0.78rem;" onclick="ctEditer('${e.id}')">✏️</button>
            <button class="btn btn-danger" style="padding:0.25rem 0.5rem;font-size:0.78rem;" onclick="ctSupprimer('${e.id}')">🗑️</button>
        </td>
    </tr>`).join('');
    box.innerHTML = `<table>
        <thead><tr><th>Date</th><th>Classe</th><th>Matière</th><th>Leçon</th><th>Devoirs</th><th style="text-align:right;">Actions</th></tr></thead>
        <tbody>${lignes}</tbody>
    </table><p style="color:var(--muted,#64748b);font-size:0.8rem;margin:0.6rem 0 0;">${liste.length} leçon(s).</p>`;
}

function ctImprimer() {
    const liste = ctListeFiltree();
    if (!liste.length) { alert('Aucune leçon à imprimer pour cette sélection.'); return; }
    const fc = (document.getElementById('ctFiltreClasse') || {}).value || '';
    const fm = (document.getElementById('ctFiltreMatiere') || {}).value || '';
    const ecole = getEcoleName();
    // chronologique pour l'impression
    const tries = liste.slice().sort((a, b) => (a.date || '') < (b.date || '') ? -1 : 1);
    const rows = tries.map(e => `<tr>
        <td style="border:1px solid #999;padding:4px 8px;white-space:nowrap;">${eEsc(new Date(e.date).toLocaleDateString('fr-FR'))}</td>
        <td style="border:1px solid #999;padding:4px 8px;">${eEsc(e.classe)}</td>
        <td style="border:1px solid #999;padding:4px 8px;">${eEsc(ctMatNom(e.matiere))}</td>
        <td style="border:1px solid #999;padding:4px 8px;">${eEsc(e.lecon)}</td>
        <td style="border:1px solid #999;padding:4px 8px;">${eEsc(e.devoirs || '')}</td>
    </tr>`).join('');
    const sousTitre = [fc ? 'Classe ' + fc : '', fm ? 'Matière ' + ctMatNom(fm) : ''].filter(Boolean).join(' — ') || 'Toutes classes / matières';
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Cahier de textes</title></head>
        <body style="font-family:Arial,sans-serif;padding:1.6rem;color:var(--ink,#111);">
        <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:.6rem;margin-bottom:1rem;">
            <p style="margin:0;font-size:.8rem;">RÉPUBLIQUE DU CONGO — Unité · Travail · Progrès</p>
            <h2 style="margin:.3rem 0;">${eEsc(ecole)}</h2>
            <h3 style="margin:0;">Cahier de textes</h3>
            <p style="margin:.2rem 0;font-size:.85rem;">${eEsc(sousTitre)} — édité le ${new Date().toLocaleDateString('fr-FR')}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:.85rem;">
            <thead><tr style="background:var(--surface-2,#eee);"><th style="border:1px solid #999;padding:4px 8px;">Date</th><th style="border:1px solid #999;padding:4px 8px;">Classe</th><th style="border:1px solid #999;padding:4px 8px;">Matière</th><th style="border:1px solid #999;padding:4px 8px;text-align:left;">Leçon</th><th style="border:1px solid #999;padding:4px 8px;text-align:left;">Devoirs</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:2rem;text-align:right;font-size:.9rem;">Visa du responsable pédagogique<br><br>__________________</div>
        </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
}

// ---------- Assiduité du personnel ----------
const ASSIDUITE_KEY = 'ecole_assiduite';
const AS_STATUTS = ['', 'Présent', 'Absent', 'Retard', 'Congé', 'Mission'];
function asRead() { try { return JSON.parse(localStorage.getItem(ASSIDUITE_KEY)) || {}; } catch (e) { return {}; } }
function asSaveAll(o) { localStorage.setItem(ASSIDUITE_KEY, JSON.stringify(o)); }
function asKey(pid, date) { return pid + '|' + date; }
function asGet(pid, date) { return asRead()[asKey(pid, date)] || { statut: '', obs: '' }; }

// Personnel = enseignants + employés de la paie (digigespro_employees), dédupliqués
function asPersonnel() {
    const list = [];
    (enseignants || []).forEach(e => list.push({ id: 'ens_' + e.id, nom: (e.nom || '') + ' ' + (e.prenom || ''), role: e.matiere || 'Enseignant' }));
    try {
        const emps = JSON.parse(localStorage.getItem('digigespro_employees')) || [];
        emps.forEach(e => list.push({ id: 'emp_' + e.id, nom: e.nom || '', role: e.poste || 'Agent' }));
    } catch (e) { }
    // dédup par nom (au cas où un enseignant serait aussi dans la paie)
    const seen = {}; const out = [];
    list.forEach(p => { const k = (p.nom || '').trim().toLowerCase(); if (k && !seen[k]) { seen[k] = 1; out.push(p); } });
    return out.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
}

function asSet(pid, date, field, value) {
    const o = asRead(); const k = asKey(pid, date);
    const cur = o[k] || { statut: '', obs: '' };
    cur[field] = value; o[k] = cur; asSaveAll(o);
    if (field === 'statut') asMajResume();
}

function asTousPresents() {
    const date = document.getElementById('asDate').value; if (!date) return;
    if (!confirm('Marquer tout le personnel « Présent » pour cette date ?')) return;
    const o = asRead();
    asPersonnel().forEach(p => { const k = asKey(p.id, date); const cur = o[k] || { obs: '' }; cur.statut = 'Présent'; o[k] = cur; });
    asSaveAll(o); renderAssiduite();
}

function asStatsJour(date) {
    const pers = asPersonnel();
    let present = 0, absent = 0, retard = 0, autre = 0, saisis = 0;
    pers.forEach(p => { const s = asGet(p.id, date).statut; if (!s) return; saisis++; if (s === 'Présent') present++; else if (s === 'Absent') absent++; else if (s === 'Retard') retard++; else autre++; });
    return { total: pers.length, present, absent, retard, autre, saisis };
}

function asMajResume() {
    const date = (document.getElementById('asDate') || {}).value || '';
    const box = document.getElementById('asResume'); if (!box) return;
    const s = asStatsJour(date);
    box.innerHTML = `
        <span style="background:var(--ok-bg,#dcfce7);color:var(--ok-strong,#166534);border-radius:999px;padding:.25rem .8rem;font-weight:600;">Présents : ${s.present}</span>
        <span style="background:var(--danger-bg,#fee2e2);color:var(--danger-strong,#991b1b);border-radius:999px;padding:.25rem .8rem;font-weight:600;">Absents : ${s.absent}</span>
        <span style="background:var(--warn-bg,#fff7ed);color:var(--warn-strong,#c2410c);border-radius:999px;padding:.25rem .8rem;font-weight:600;">Retards : ${s.retard}</span>
        <span style="background:var(--brand-bg,#eef2ff);color:var(--brand-strong,#4338ca);border-radius:999px;padding:.25rem .8rem;font-weight:600;">Congé/Mission : ${s.autre}</span>
        <span style="background:var(--surface-2,#f1f5f9);color:var(--muted,#475569);border-radius:999px;padding:.25rem .8rem;font-weight:600;">Effectif : ${s.total}</span>`;
}

function renderAssiduite() {
    const dEl = document.getElementById('asDate'); if (dEl && !dEl.value) dEl.value = new Date().toISOString().split('T')[0];
    const date = dEl ? dEl.value : '';
    const box = document.getElementById('assiduiteBox'); if (!box) return;
    const pers = asPersonnel();
    if (!pers.length) { box.innerHTML = '<p style="color:var(--muted,#64748b);padding:.5rem;">Aucun membre du personnel. Ajoutez des enseignants (Direction des études) ou des employés (Gestion → Salaires).</p>'; asMajResume(); return; }
    const lignes = pers.map(p => {
        const a = asGet(p.id, date);
        return `<tr>
            <td style="font-weight:600;">${eEsc(p.nom)}<br><span style="color:var(--muted,#64748b);font-size:0.78rem;">${eEsc(p.role)}</span></td>
            <td><select onchange="asSet('${p.id}','${date}','statut',this.value)" style="margin:0;min-width:130px;">
                ${AS_STATUTS.map(x => `<option value="${eAttr(x)}" ${x === a.statut ? 'selected' : ''}>${x || '— non pointé —'}</option>`).join('')}
            </select></td>
            <td><input type="text" value="${eAttr(a.obs || '')}" placeholder="observation (optionnel)" oninput="asSet('${p.id}','${date}','obs',this.value)" style="min-width:200px;margin:0;padding:0.3rem;"></td>
        </tr>`;
    }).join('');
    box.innerHTML = `<table>
        <thead><tr><th>Personnel</th><th>Statut</th><th>Observation</th></tr></thead>
        <tbody>${lignes}</tbody>
    </table>`;
    asMajResume();
}

function asImprimerJour() {
    const date = (document.getElementById('asDate') || {}).value; if (!date) { alert('Choisissez une date.'); return; }
    const pers = asPersonnel(); if (!pers.length) { alert('Aucun personnel.'); return; }
    const ecole = getEcoleName();
    let i = 0;
    const rows = pers.map(p => { const a = asGet(p.id, date); i++; return `<tr><td style="border:1px solid #999;padding:4px 8px;text-align:center;">${i}</td><td style="border:1px solid #999;padding:4px 8px;">${eEsc(p.nom)}</td><td style="border:1px solid #999;padding:4px 8px;">${eEsc(p.role)}</td><td style="border:1px solid #999;padding:4px 8px;">${eEsc(a.statut || '')}</td><td style="border:1px solid #999;padding:4px 8px;">${eEsc(a.obs || '')}</td></tr>`; }).join('');
    const s = asStatsJour(date);
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Assiduité ${date}</title></head>
        <body style="font-family:Arial,sans-serif;padding:1.6rem;color:var(--ink,#111);">
        <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:.6rem;margin-bottom:1rem;">
            <p style="margin:0;font-size:.8rem;">RÉPUBLIQUE DU CONGO — Unité · Travail · Progrès</p>
            <h2 style="margin:.3rem 0;">${eEsc(ecole)}</h2>
            <h3 style="margin:0;">Feuille de présence du personnel</h3>
            <p style="margin:.2rem 0;font-size:.85rem;">Date : ${new Date(date).toLocaleDateString('fr-FR')}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:.88rem;">
            <thead><tr style="background:var(--surface-2,#eee);"><th style="border:1px solid #999;padding:4px 8px;">N°</th><th style="border:1px solid #999;padding:4px 8px;text-align:left;">Nom</th><th style="border:1px solid #999;padding:4px 8px;">Fonction</th><th style="border:1px solid #999;padding:4px 8px;">Statut</th><th style="border:1px solid #999;padding:4px 8px;text-align:left;">Observation</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
        <p style="margin-top:.8rem;font-size:.92rem;">Présents : <strong>${s.present}</strong> · Absents : <strong>${s.absent}</strong> · Retards : <strong>${s.retard}</strong> · Congé/Mission : <strong>${s.autre}</strong> · Effectif : <strong>${s.total}</strong></p>
        <div style="margin-top:2rem;text-align:right;font-size:.9rem;">Le Chef d'établissement<br><br>__________________</div>
        </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
}

function asRecapData() {
    const debut = (document.getElementById('asDebut') || {}).value || '';
    const fin = (document.getElementById('asFin') || {}).value || '';
    const o = asRead();
    const pers = asPersonnel();
    const map = {};
    pers.forEach(p => map[p.id] = { nom: p.nom, role: p.role, Présent: 0, Absent: 0, Retard: 0, autre: 0 });
    Object.keys(o).forEach(k => {
        const idx = k.lastIndexOf('|'); if (idx < 0) return;
        const pid = k.slice(0, idx), date = k.slice(idx + 1);
        if (debut && date < debut) return; if (fin && date > fin) return;
        if (!map[pid]) return;
        const st = o[k].statut;
        if (st === 'Présent') map[pid]['Présent']++; else if (st === 'Absent') map[pid]['Absent']++; else if (st === 'Retard') map[pid]['Retard']++; else if (st) map[pid].autre++;
    });
    return { debut, fin, rows: Object.values(map) };
}

function asRecap() {
    const box = document.getElementById('asRecapBox'); if (!box) return;
    const d = asRecapData();
    const lignes = d.rows.map(r => `<tr>
        <td style="font-weight:600;">${eEsc(r.nom)}<br><span style="color:var(--muted,#64748b);font-size:0.78rem;">${eEsc(r.role)}</span></td>
        <td style="text-align:center;color:var(--ok-strong,#166534);font-weight:600;">${r['Présent']}</td>
        <td style="text-align:center;color:var(--danger-strong,#991b1b);font-weight:600;">${r['Absent']}</td>
        <td style="text-align:center;color:var(--warn-strong,#c2410c);font-weight:600;">${r['Retard']}</td>
        <td style="text-align:center;">${r.autre}</td>
    </tr>`).join('');
    const periode = (d.debut || d.fin) ? `du ${d.debut ? new Date(d.debut).toLocaleDateString('fr-FR') : '…'} au ${d.fin ? new Date(d.fin).toLocaleDateString('fr-FR') : '…'}` : 'toute la période enregistrée';
    box.innerHTML = `<p style="color:var(--muted,#64748b);font-size:0.85rem;margin:0 0 0.5rem;">Récapitulatif ${periode} :</p>
        <table><thead><tr><th>Personnel</th><th style="text-align:center;">Présences</th><th style="text-align:center;">Absences</th><th style="text-align:center;">Retards</th><th style="text-align:center;">Congé/Mission</th></tr></thead>
        <tbody>${lignes || '<tr><td colspan="5" style="color:var(--muted,#64748b);">Aucune donnée.</td></tr>'}</tbody></table>`;
}

function asImprimerRecap() {
    const d = asRecapData();
    if (!d.rows.length) { alert('Aucune donnée à imprimer.'); return; }
    const ecole = getEcoleName();
    let i = 0;
    const rows = d.rows.map(r => { i++; return `<tr><td style="border:1px solid #999;padding:4px 8px;text-align:center;">${i}</td><td style="border:1px solid #999;padding:4px 8px;">${eEsc(r.nom)}</td><td style="border:1px solid #999;padding:4px 8px;">${eEsc(r.role)}</td><td style="border:1px solid #999;padding:4px 8px;text-align:center;">${r['Présent']}</td><td style="border:1px solid #999;padding:4px 8px;text-align:center;">${r['Absent']}</td><td style="border:1px solid #999;padding:4px 8px;text-align:center;">${r['Retard']}</td><td style="border:1px solid #999;padding:4px 8px;text-align:center;">${r.autre}</td></tr>`; }).join('');
    const periode = (d.debut || d.fin) ? `du ${d.debut ? new Date(d.debut).toLocaleDateString('fr-FR') : '…'} au ${d.fin ? new Date(d.fin).toLocaleDateString('fr-FR') : '…'}` : 'toute la période';
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Récapitulatif assiduité</title></head>
        <body style="font-family:Arial,sans-serif;padding:1.6rem;color:var(--ink,#111);">
        <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:.6rem;margin-bottom:1rem;">
            <p style="margin:0;font-size:.8rem;">RÉPUBLIQUE DU CONGO — Unité · Travail · Progrès</p>
            <h2 style="margin:.3rem 0;">${eEsc(ecole)}</h2>
            <h3 style="margin:0;">Récapitulatif d'assiduité du personnel</h3>
            <p style="margin:.2rem 0;font-size:.85rem;">Période : ${eEsc(periode)} — édité le ${new Date().toLocaleDateString('fr-FR')}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:.88rem;">
            <thead><tr style="background:var(--surface-2,#eee);"><th style="border:1px solid #999;padding:4px 8px;">N°</th><th style="border:1px solid #999;padding:4px 8px;text-align:left;">Nom</th><th style="border:1px solid #999;padding:4px 8px;">Fonction</th><th style="border:1px solid #999;padding:4px 8px;">Présences</th><th style="border:1px solid #999;padding:4px 8px;">Absences</th><th style="border:1px solid #999;padding:4px 8px;">Retards</th><th style="border:1px solid #999;padding:4px 8px;">Congé/Mission</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:2rem;text-align:right;font-size:.9rem;">Le Chef d'établissement<br><br>__________________</div>
        </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
}
