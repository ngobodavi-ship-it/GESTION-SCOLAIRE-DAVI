// ===== Secrétariat =====
const COURRIER_KEY = 'ecole_courrier';
const DOCUMENTS_KEY = 'ecole_documents';
const NOTES_SERVICE_KEY = 'ecole_notes_service';
const SEC_ELEVES_KEY = 'ecole_eleves';
const SEC_CLASSES_KEY = 'ecole_classes';
const COMM_KEY = 'ecole_communications';

let courrier = [], documents = [], notesService = [], secEleves = [], secClasses = [], communications = [];

const SEC_SECTIONS = {
    dashboard: { titre: 'Tableau de bord', icone: 'bi-speedometer2' },
    courrier:  { titre: 'Courrier',         icone: 'bi-envelope' },
    documents: { titre: 'Documents & archives', icone: 'bi-folder2' },
    notes:     { titre: 'Notes de service', icone: 'bi-file-text' },
    communication: { titre: 'Communication parents', icone: 'bi-chat-dots' }
};
const DOC_CATEGORIES = ['Administratif', 'Pédagogique', 'Financier', 'Ressources humaines', 'Élèves', 'Correspondance', 'Autre'];

function secEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function secAttr(s) { return secEsc(s).replace(/"/g, '&quot;'); }
function todayStr() { return new Date().toISOString().split('T')[0]; }
function moisCourant() { return new Date().toISOString().slice(0, 7); }
function getEcoleName() {
    try { const c = JSON.parse(localStorage.getItem('portail_config_v1')); if (c && c.name) return c.name; } catch (e) {}
    return localStorage.getItem('ecole_nom') || 'Établissement scolaire';
}

function loadSec() {
    const j = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) || def; } catch (e) { return def; } };
    courrier = j(COURRIER_KEY, []);
    documents = j(DOCUMENTS_KEY, []);
    notesService = j(NOTES_SERVICE_KEY, []);
    secEleves = j(SEC_ELEVES_KEY, []);
    secClasses = j(SEC_CLASSES_KEY, []);
    communications = j(COMM_KEY, []);
}
function saveCourrier() { localStorage.setItem(COURRIER_KEY, JSON.stringify(courrier)); }
function saveDocuments() { localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(documents)); }
function saveNotesService() { localStorage.setItem(NOTES_SERVICE_KEY, JSON.stringify(notesService)); }
function saveCommunications() { localStorage.setItem(COMM_KEY, JSON.stringify(communications)); }

// ---------- Communication parents (SMS / e-mail) ----------
function telParent(e) { return e.telephoneParent || e.tel || e.telephone || ''; }
function destinatairesComm() {
    const classe = document.getElementById('commClasse').value;
    return (classe ? secEleves.filter(e => e.classe === classe) : secEleves)
        .filter(e => telParent(e));
}
function renderCommunication() {
    const sel = document.getElementById('commClasse');
    if (!sel.dataset.init) {
        sel.innerHTML = '<option value="">-- Tous les élèves --</option>' + secClasses.map(c => `<option value="${secAttr(c.nom)}">${secEsc(c.nom)}</option>`).join('');
        sel.dataset.init = '1';
    }
    const dest = destinatairesComm();
    const total = (document.getElementById('commClasse').value ? secEleves.filter(e => e.classe === document.getElementById('commClasse').value) : secEleves).length;
    document.getElementById('commInfo').innerHTML = `<strong>${dest.length}</strong> destinataire(s) avec numéro de téléphone parent${total > dest.length ? ` <span style="color:#b91c1c;">(${total - dest.length} sans numéro)</span>` : ''}.`;
    const tbody = document.getElementById('commTable');
    tbody.innerHTML = dest.length === 0
        ? '<tr><td colspan="3" style="text-align:center;padding:1rem;color:#64748b;">Aucun numéro de téléphone parent enregistré. Renseignez-les via les pré-inscriptions ou la fiche élève.</td></tr>'
        : dest.slice(0, 100).map(e => `<tr><td>${secEsc(e.nom)} ${secEsc(e.prenom)}</td><td>${secEsc(e.classe)}</td><td style="font-family:monospace;">${secEsc(telParent(e))}</td></tr>`).join('');
    renderHistoriqueComm();
}
function renderHistoriqueComm() {
    const box = document.getElementById('commHisto');
    if (!box) return;
    box.innerHTML = communications.length === 0
        ? '<p style="color:#64748b;padding:0.5rem;">Aucun message enregistré.</p>'
        : communications.slice().reverse().slice(0, 30).map(c => `<div style="border-bottom:1px solid #eee;padding:0.5rem 0;">
            <div style="font-size:0.8rem;color:#64748b;">${new Date(c.date).toLocaleString('fr-FR')} · ${secEsc(c.canal)} · ${c.nb} destinataire(s)${c.classe ? ' · ' + secEsc(c.classe) : ''}</div>
            <div>${secEsc(c.message)}</div></div>`).join('');
}
function messagePersonnalise(e, modele) {
    return modele.replace(/\{nom\}/gi, `${e.nom} ${e.prenom}`).replace(/\{classe\}/gi, e.classe || '').replace(/\{ecole\}/gi, getEcoleName());
}
function copierMessage() {
    const msg = document.getElementById('commMessage').value.trim();
    if (!msg) { alert('Saisissez un message.'); return; }
    navigator.clipboard ? navigator.clipboard.writeText(msg).then(() => alert('Message copié.'), () => alert('Copie impossible.')) : alert('Copie non disponible.');
}
function copierNumeros() {
    const nums = destinatairesComm().map(telParent).join('; ');
    if (!nums) { alert('Aucun numéro.'); return; }
    navigator.clipboard ? navigator.clipboard.writeText(nums).then(() => alert('Numéros copiés.'), () => alert('Copie impossible.')) : alert(nums);
}
function exporterContactsCSV() {
    const msg = document.getElementById('commMessage').value.trim();
    const dest = destinatairesComm();
    if (!dest.length) { alert('Aucun destinataire.'); return; }
    const rows = [['Nom', 'Prenom', 'Classe', 'Telephone', 'Message']];
    dest.forEach(e => rows.push([e.nom, e.prenom, e.classe || '', telParent(e), messagePersonnalise(e, msg)]));
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `contacts_parents_${todayStr()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}
function enregistrerMessageComm() {
    const msg = document.getElementById('commMessage').value.trim();
    if (!msg) { alert('Saisissez un message.'); return; }
    const dest = destinatairesComm();
    communications.push({
        date: new Date().toISOString(),
        canal: document.getElementById('commCanal').value,
        classe: document.getElementById('commClasse').value,
        message: msg,
        nb: dest.length
    });
    saveCommunications();
    alert(`Message enregistré (${dest.length} destinataire(s)). Utilisez l'export CSV ou la copie pour l'envoi via votre outil SMS/e-mail.`);
    renderHistoriqueComm();
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
    const info = SEC_SECTIONS[name];
    if (info) {
        document.getElementById('moduleTitle').textContent = info.titre;
        document.getElementById('moduleIcon').className = 'bi ' + info.icone;
    }
    if (name === 'dashboard') renderDashboard();
    if (name === 'courrier') renderCourrier();
    if (name === 'communication') renderCommunication();
    if (name === 'documents') renderDocuments();
    if (name === 'notes') renderNotes();
    if (window.location.hash !== '#' + name) window.location.hash = name;
}
function secRouteFromHash() {
    const h = (window.location.hash || '').replace(/^#/, '');
    showSection(SEC_SECTIONS[h] ? h : 'dashboard');
}
function toggleSidebar() {
    const sb = document.getElementById('sidebar');
    const collapsed = sb.classList.toggle('collapsed');
    document.getElementById('sidebarToggleIcon').className = collapsed ? 'bi bi-list' : 'bi bi-chevron-left';
}
function logout() { window.location.href = 'portail.html'; }

// ---------- Tableau de bord ----------
function renderDashboard() {
    const arr = courrier.filter(c => c.sens === 'Arrivée' && (c.date || '').slice(0, 7) === moisCourant()).length;
    const dep = courrier.filter(c => c.sens === 'Départ' && (c.date || '').slice(0, 7) === moisCourant()).length;
    document.getElementById('secArrivee').textContent = arr;
    document.getElementById('secDepart').textContent = dep;
    document.getElementById('secDocs').textContent = documents.length;
    document.getElementById('secNotes').textContent = notesService.length;

    const recents = courrier.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 6);
    document.getElementById('secRecents').innerHTML = recents.length === 0
        ? '<p style="color:#64748b;padding:1rem;">Aucun courrier enregistré.</p>'
        : `<table><thead><tr><th>Date</th><th>Sens</th><th>Correspondant</th><th>Objet</th><th>Statut</th></tr></thead><tbody>${recents.map(c => `
            <tr><td>${c.date ? new Date(c.date).toLocaleDateString('fr-FR') : '-'}</td>
            <td>${c.sens === 'Arrivée' ? '📥 Arrivée' : '📤 Départ'}</td>
            <td>${secEsc(c.correspondant)}</td><td>${secEsc(c.objet)}</td>
            <td><span style="color:${c.statut === 'Traité' ? '#16a34a' : '#f59e0b'};font-weight:600;">${secEsc(c.statut)}</span></td></tr>`).join('')}</tbody></table>`;
}

// ---------- Courrier ----------
function renderCourrier() {
    const d = document.getElementById('courDate');
    if (!d.value) d.value = todayStr();
    const filtre = document.getElementById('courrierFiltre').value;
    let list = courrier.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    if (filtre && filtre !== 'Tous') list = list.filter(c => c.sens === filtre);
    const tbody = document.getElementById('courrierTable');
    tbody.innerHTML = list.length === 0
        ? '<tr><td colspan="7" style="text-align:center;padding:1.5rem;color:#64748b;">Aucun courrier.</td></tr>'
        : list.map(c => `<tr>
            <td>${c.date ? new Date(c.date).toLocaleDateString('fr-FR') : '-'}</td>
            <td>${c.sens === 'Arrivée' ? '📥 Arrivée' : '📤 Départ'}</td>
            <td style="font-family:monospace;font-size:0.85rem;">${secEsc(c.reference)}</td>
            <td style="font-weight:600;">${secEsc(c.correspondant)}</td>
            <td>${secEsc(c.objet)}</td>
            <td><button class="btn ${c.statut === 'Traité' ? 'btn-secondary' : 'btn-primary'}" style="padding:0.25rem 0.6rem;font-size:0.8rem;" onclick="toggleCourrierStatut('${c.id}')">${secEsc(c.statut)}</button></td>
            <td style="text-align:right;"><button class="btn btn-danger" style="padding:0.3rem 0.6rem;font-size:0.85rem;" onclick="deleteCourrier('${c.id}')">🗑️</button></td>
        </tr>`).join('');
}
function addCourrier() {
    const correspondant = document.getElementById('courCorrespondant').value.trim();
    const objet = document.getElementById('courObjet').value.trim();
    if (!correspondant || !objet) { alert('Correspondant et objet obligatoires.'); return; }
    courrier.push({
        id: 'c' + Date.now(),
        sens: document.getElementById('courSens').value,
        date: document.getElementById('courDate').value || todayStr(),
        reference: document.getElementById('courRef').value.trim(),
        correspondant: correspondant,
        objet: objet,
        statut: document.getElementById('courStatut').value
    });
    saveCourrier();
    ['courRef', 'courCorrespondant', 'courObjet'].forEach(i => document.getElementById(i).value = '');
    renderCourrier();
}
function toggleCourrierStatut(id) {
    const c = courrier.find(x => x.id === id); if (!c) return;
    c.statut = c.statut === 'Traité' ? 'En attente' : 'Traité';
    saveCourrier(); renderCourrier();
}
function deleteCourrier(id) {
    if (!confirm('Supprimer ce courrier ?')) return;
    courrier = courrier.filter(x => x.id !== id);
    saveCourrier(); renderCourrier();
}

// ---------- Documents & archives ----------
function renderDocuments() {
    const d = document.getElementById('docDate');
    if (!d.value) d.value = todayStr();
    const cat = document.getElementById('docCategorie');
    if (!cat.innerHTML) cat.innerHTML = DOC_CATEGORIES.map(x => `<option>${x}</option>`).join('');
    const tbody = document.getElementById('documentsTable');
    const list = documents.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    tbody.innerHTML = list.length === 0
        ? '<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:#64748b;">Aucun document archivé.</td></tr>'
        : list.map(doc => `<tr>
            <td>${doc.date ? new Date(doc.date).toLocaleDateString('fr-FR') : '-'}</td>
            <td style="font-weight:600;">${secEsc(doc.titre)}</td>
            <td>${secEsc(doc.categorie)}</td>
            <td style="font-family:monospace;font-size:0.85rem;">${secEsc(doc.reference)}</td>
            <td>${secEsc(doc.emplacement)}</td>
            <td style="text-align:right;"><button class="btn btn-danger" style="padding:0.3rem 0.6rem;font-size:0.85rem;" onclick="deleteDocument('${doc.id}')">🗑️</button></td>
        </tr>`).join('');
}
function addDocument() {
    const titre = document.getElementById('docTitre').value.trim();
    if (!titre) { alert('Le titre du document est obligatoire.'); return; }
    documents.push({
        id: 'd' + Date.now(),
        titre: titre,
        categorie: document.getElementById('docCategorie').value,
        date: document.getElementById('docDate').value || todayStr(),
        reference: document.getElementById('docRef').value.trim(),
        emplacement: document.getElementById('docEmplacement').value.trim()
    });
    saveDocuments();
    ['docTitre', 'docRef', 'docEmplacement'].forEach(i => document.getElementById(i).value = '');
    renderDocuments();
}
function deleteDocument(id) {
    if (!confirm('Supprimer ce document des archives ?')) return;
    documents = documents.filter(x => x.id !== id);
    saveDocuments(); renderDocuments();
}

// ---------- Notes de service ----------
function renderNotes() {
    const d = document.getElementById('nsDate');
    if (!d.value) d.value = todayStr();
    const tbody = document.getElementById('notesTable');
    const list = notesService.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    tbody.innerHTML = list.length === 0
        ? '<tr><td colspan="5" style="text-align:center;padding:1.5rem;color:#64748b;">Aucune note de service.</td></tr>'
        : list.map(n => `<tr>
            <td style="font-weight:600;">${secEsc(n.numero)}</td>
            <td>${n.date ? new Date(n.date).toLocaleDateString('fr-FR') : '-'}</td>
            <td>${secEsc(n.objet)}</td>
            <td>${secEsc(n.destinataires)}</td>
            <td style="text-align:right;white-space:nowrap;">
                <button class="btn btn-primary" style="padding:0.3rem 0.6rem;font-size:0.85rem;" onclick="genererNote('${n.id}')"><i class="bi bi-printer"></i></button>
                <button class="btn btn-danger" style="padding:0.3rem 0.6rem;font-size:0.85rem;" onclick="deleteNote('${n.id}')">🗑️</button>
            </td>
        </tr>`).join('');
}
function addNote() {
    const objet = document.getElementById('nsObjet').value.trim();
    const contenu = document.getElementById('nsContenu').value.trim();
    if (!objet || !contenu) { alert('Objet et contenu obligatoires.'); return; }
    const date = document.getElementById('nsDate').value || todayStr();
    const year = date.slice(0, 4);
    const seq = notesService.filter(n => (n.date || '').slice(0, 4) === year).length + 1;
    notesService.push({
        id: 'n' + Date.now(),
        numero: `N°${String(seq).padStart(3, '0')}/${year}`,
        date: date,
        objet: objet,
        destinataires: document.getElementById('nsDestinataires').value.trim(),
        contenu: contenu
    });
    saveNotesService();
    ['nsObjet', 'nsDestinataires', 'nsContenu'].forEach(i => document.getElementById(i).value = '');
    renderNotes();
}
function deleteNote(id) {
    if (!confirm('Supprimer cette note de service ?')) return;
    notesService = notesService.filter(x => x.id !== id);
    saveNotesService(); renderNotes();
}
function genererNote(id) {
    const n = notesService.find(x => x.id === id); if (!n) return;
    const ecole = getEcoleName();
    const html = `
        <div style="font-family:Arial,sans-serif;max-width:780px;margin:0 auto;padding:2.5rem;color:#111;">
            <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:0.75rem;margin-bottom:1.5rem;">
                <p style="margin:0;font-size:0.85rem;">RÉPUBLIQUE DU CONGO &nbsp;–&nbsp; Unité, Travail, Progrès<br>Ministère de l'Enseignement Préscolaire, Primaire, Secondaire et de l'Alphabétisation</p>
                <h2 style="margin:0.4rem 0 0;text-transform:uppercase;">${secEsc(ecole)}</h2>
            </div>
            <p style="text-align:right;margin:0 0 1rem;">Le ${n.date ? new Date(n.date).toLocaleDateString('fr-FR') : ''}</p>
            <h1 style="text-align:center;font-size:1.3rem;letter-spacing:1px;margin:1rem 0 0.25rem;">NOTE DE SERVICE</h1>
            <p style="text-align:center;font-weight:bold;margin:0 0 1.5rem;">${secEsc(n.numero)}</p>
            <p style="margin:0.5rem 0;"><strong>Objet :</strong> ${secEsc(n.objet)}</p>
            <p style="margin:0.5rem 0;"><strong>Destinataires :</strong> ${secEsc(n.destinataires) || 'À tout le personnel'}</p>
            <hr style="margin:1.25rem 0;">
            <div style="line-height:1.8;font-size:1.02rem;text-align:justify;white-space:pre-wrap;">${secEsc(n.contenu)}</div>
            <div style="margin-top:3rem;text-align:right;">
                <p style="margin:0;font-weight:bold;">Le Chef d'établissement</p>
                <div style="height:70px;"></div>
                <p style="margin:0;color:#666;">(Signature et cachet)</p>
            </div>
        </div>`;
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Note de service ${secEsc(n.numero)}</title></head><body>${html}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
}

// ---------- Démarrage ----------
window.addEventListener('hashchange', secRouteFromHash);
window.addEventListener('DOMContentLoaded', function () {
    loadSec();
    secRouteFromHash();
});
