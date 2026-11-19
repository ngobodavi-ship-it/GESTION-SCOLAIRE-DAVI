// ===== Calendrier scolaire =====
const EVT_KEY = 'ecole_evenements';
let evenements = [];
let curYear, curMonth; // mois 0-11
let editEvtId = null;

const EVT_TYPES = {
    'Rentrée': '#16a34a',
    'Congés / Vacances': '#f59e0b',
    'Examen': '#dc3545',
    'Conseil de classe': '#8b5cf6',
    'Réunion': '#0ea5e9',
    'Fête / Événement': '#ec4899',
    'Autre': '#64748b'
};
const MOIS_NOMS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function cEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function cAttr(s) { return cEsc(s).replace(/"/g, '&quot;'); }
function todayStr() { return new Date().toISOString().split('T')[0]; }
function pad2(n) { return String(n).padStart(2, '0'); }

function loadCal() {
    try { evenements = JSON.parse(localStorage.getItem(EVT_KEY)) || []; } catch (e) { evenements = []; }
    const now = new Date();
    curYear = now.getFullYear();
    curMonth = now.getMonth();
}
function saveCal() { localStorage.setItem(EVT_KEY, JSON.stringify(evenements)); }
function logout() { window.location.href = 'portail.html'; }

function evenementsDuJour(dateStr) {
    return evenements.filter(e => e.date === dateStr).sort((a, b) => (a.titre || '').localeCompare(b.titre || ''));
}

// ---------- Navigation mois ----------
function moisPrecedent() { curMonth--; if (curMonth < 0) { curMonth = 11; curYear--; } renderCalendrier(); }
function moisSuivant() { curMonth++; if (curMonth > 11) { curMonth = 0; curYear++; } renderCalendrier(); }
function moisCourant() { const n = new Date(); curYear = n.getFullYear(); curMonth = n.getMonth(); renderCalendrier(); }
window.applyHeaderDate = function (d) {
    const dt = new Date(d); if (isNaN(dt.getTime())) return;
    curYear = dt.getFullYear(); curMonth = dt.getMonth();
    if (typeof renderCalendrier === 'function') renderCalendrier();
};

// ---------- Rendu ----------
function renderCalendrier() {
    document.getElementById('calMois').textContent = MOIS_NOMS[curMonth] + ' ' + curYear;

    const premier = new Date(curYear, curMonth, 1);
    const decalage = (premier.getDay() + 6) % 7; // Lundi = 0
    const nbJours = new Date(curYear, curMonth + 1, 0).getDate();
    const today = todayStr();

    let cells = '';
    JOURS.forEach(j => { cells += `<div class="cal-head">${j}</div>`; });
    for (let i = 0; i < decalage; i++) cells += '<div class="cal-cell cal-empty"></div>';
    for (let d = 1; d <= nbJours; d++) {
        const dateStr = `${curYear}-${pad2(curMonth + 1)}-${pad2(d)}`;
        const evs = evenementsDuJour(dateStr);
        const isToday = dateStr === today;
        const chips = evs.slice(0, 3).map(e => `<div class="cal-chip" style="background:${EVT_TYPES[e.type] || '#64748b'};" title="${cAttr(e.titre)}">${cEsc(e.titre)}</div>`).join('');
        const more = evs.length > 3 ? `<div class="cal-more">+${evs.length - 3}</div>` : '';
        cells += `<div class="cal-cell${isToday ? ' cal-today' : ''}" onclick="ouvrirEvtModal('${dateStr}')">
            <div class="cal-day">${d}</div>${chips}${more}</div>`;
    }
    document.getElementById('calGrid').innerHTML = cells;

    // Liste des événements du mois
    const prefix = `${curYear}-${pad2(curMonth + 1)}`;
    const list = evenements.filter(e => (e.date || '').slice(0, 7) === prefix).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    document.getElementById('calListe').innerHTML = list.length === 0
        ? '<p style="color:var(--muted,#64748b);padding:1rem;">Aucun événement ce mois-ci. Cliquez sur un jour pour en ajouter un.</p>'
        : list.map(e => `
            <div style="display:flex;align-items:center;gap:0.75rem;padding:0.6rem 0;border-bottom:1px solid #eef2f7;">
                <div style="width:10px;height:38px;border-radius:4px;background:${EVT_TYPES[e.type] || '#64748b'};flex-shrink:0;"></div>
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:600;">${cEsc(e.titre)}</div>
                    <div style="font-size:0.85rem;color:var(--muted,#64748b);">${new Date(e.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} • ${cEsc(e.type)}${e.description ? ' — ' + cEsc(e.description) : ''}</div>
                </div>
                <button class="btn btn-secondary" style="padding:0.3rem 0.6rem;font-size:0.85rem;" onclick="editEvt('${e.id}')">✏️</button>
                <button class="btn btn-danger" style="padding:0.3rem 0.6rem;font-size:0.85rem;" onclick="deleteEvt('${e.id}')">🗑️</button>
            </div>`).join('');
}

// ---------- Légende ----------
function renderLegende() {
    document.getElementById('calLegende').innerHTML = Object.keys(EVT_TYPES).map(t =>
        `<span style="display:inline-flex;align-items:center;gap:0.35rem;font-size:0.8rem;color:var(--muted,#475569);margin-right:0.75rem;"><span style="width:12px;height:12px;border-radius:3px;background:${EVT_TYPES[t]};display:inline-block;"></span>${t}</span>`
    ).join('');
}

// ---------- Modal événement ----------
function typeOptions(selected) {
    return Object.keys(EVT_TYPES).map(t => `<option ${selected === t ? 'selected' : ''}>${t}</option>`).join('');
}
function ouvrirEvtModal(dateStr) {
    editEvtId = null;
    document.getElementById('evtModalTitle').textContent = 'Nouvel événement';
    document.getElementById('evtDate').value = dateStr || todayStr();
    document.getElementById('evtTitre').value = '';
    document.getElementById('evtType').innerHTML = typeOptions('Autre');
    document.getElementById('evtDesc').value = '';
    document.getElementById('evtModal').classList.remove('hidden');
}
function nouvelEvt() { ouvrirEvtModal(todayStr()); }
function editEvt(id) {
    const e = evenements.find(x => x.id === id); if (!e) return;
    editEvtId = id;
    document.getElementById('evtModalTitle').textContent = 'Modifier l\'événement';
    document.getElementById('evtDate').value = e.date || todayStr();
    document.getElementById('evtTitre').value = e.titre || '';
    document.getElementById('evtType').innerHTML = typeOptions(e.type || 'Autre');
    document.getElementById('evtDesc').value = e.description || '';
    document.getElementById('evtModal').classList.remove('hidden');
}
function hideEvtModal() { document.getElementById('evtModal').classList.add('hidden'); }
function saveEvt(event) {
    event.preventDefault();
    const titre = document.getElementById('evtTitre').value.trim();
    const date = document.getElementById('evtDate').value;
    if (!titre || !date) { alert('Le titre et la date sont obligatoires.'); return; }
    const data = { date: date, titre: titre, type: document.getElementById('evtType').value, description: document.getElementById('evtDesc').value.trim() };
    if (editEvtId) {
        Object.assign(evenements.find(x => x.id === editEvtId), data);
    } else {
        data.id = 'ev' + Date.now();
        evenements.push(data);
    }
    saveCal();
    hideEvtModal();
    // se positionner sur le mois de l'événement
    const dt = new Date(date);
    curYear = dt.getFullYear(); curMonth = dt.getMonth();
    renderCalendrier();
}
function deleteEvt(id) {
    if (!confirm('Supprimer cet événement ?')) return;
    evenements = evenements.filter(x => x.id !== id);
    saveCal();
    renderCalendrier();
}

// ---------- Démarrage ----------
window.addEventListener('DOMContentLoaded', function () {
    loadCal();
    renderLegende();
    renderCalendrier();
});
