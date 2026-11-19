// =====================================================================
// Espace parent : suivi des enfants (notes, assiduité, paiements, reste
// à payer) et préoccupations envoyées à l'école.
// Le parent ne voit que les enfants dont il est le tuteur enregistré.
// Réutilise js/consultation.js (renderEleve) et js/comptes.js.
// =====================================================================
let parSession = null, parParent = null;

function parEsc(s) { return cEsc(s == null ? '' : String(s)); }
function parDateH(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function parInit() {
    try { parSession = JSON.parse(sessionStorage.getItem('portail_session')); } catch (e) { parSession = null; }
    if (!parSession || parSession.role !== 'Parent') { location.replace('portail.html'); return; }
    parParent = Comptes.trouverParent(parSession.login);
    const nom = (parParent && parParent.nom) || parSession.nom || 'Parent';
    document.getElementById('parNom').textContent = nom;
    const h = new Date().getHours();
    document.getElementById('parHello').textContent = (h < 18 ? 'Bonjour' : 'Bonsoir') + ', ' + nom;
    const d = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('parDate').textContent = d.charAt(0).toUpperCase() + d.slice(1);

    if (!parParent || !parParent.enfants.length) {
        document.getElementById('parKids').innerHTML = '';
        document.getElementById('cResult').innerHTML = '<div class="card"><p class="text-secondary mb-0">Aucun enfant n\'est actuellement rattaché à votre numéro. Contactez l\'administration de l\'école.</p></div>';
        return;
    }
    // Les fiches affichées viennent du registre de l'école : on recharge pour avoir les dernières données
    loadConsult();
    parRenderKids(parParent.enfants[0].id);
    parInitPreoc();
}

function parRenderKids(activeId) {
    const box = document.getElementById('parKids');
    box.innerHTML = parParent.enfants.map(e => {
        const sit = (typeof situationEleve === 'function') ? situationEleve(e) : null;
        return `<button class="par-kid ${e.id === activeId ? 'on' : ''}" onclick="parChoisir('${e.id}')">
            <span class="pk-av">${parEsc((e.prenom || e.nom || '?').charAt(0))}</span>
            <span class="pk-txt"><strong>${parEsc(e.prenom)} ${parEsc(e.nom)}</strong><small>${parEsc(e.classe || '-')}${sit && sit.reste > 0 ? ' · reste ' + fmtFCFA(sit.reste) : sit ? ' · scolarité à jour' : ''}</small></span>
        </button>`;
    }).join('');
    parChoisir(activeId, true);
}
function parChoisir(id, sansRendu) {
    // sécurité : uniquement un enfant de ce parent
    if (!parParent.enfants.some(e => e.id === id)) return;
    document.querySelectorAll('.par-kid').forEach(b => b.classList.toggle('on', b.getAttribute('onclick').indexOf(id) !== -1));
    afficherEleve(id);
    if (!sansRendu) parTab('suivi');
}

function parTab(v) {
    document.querySelectorAll('#parTabs .tab').forEach(b => b.classList.toggle('active', b.dataset.v === v));
    document.getElementById('par-suivi').classList.toggle('hidden', v !== 'suivi');
    document.getElementById('par-preoc').classList.toggle('hidden', v !== 'preoc');
    if (v === 'preoc') parRenderPreoc(true);
}

// ---------- Préoccupations ----------
function parInitPreoc() {
    document.getElementById('pqEleve').innerHTML = parParent.enfants.map(e => `<option value="${parEsc(e.id)}">${parEsc(e.prenom)} ${parEsc(e.nom)} (${parEsc(e.classe || '-')})</option>`).join('') + '<option value="">Toute la famille</option>';
    document.getElementById('pqService').innerHTML = Comptes.SERVICES.map(s => `<option>${parEsc(s)}</option>`).join('');
    parRenderPreoc(false);
}
function mesPreoc(all) { return all.filter(p => p.parentKey === parParent.key); }
function parRenderPreoc(marquerVu) {
    const all = Comptes.preoccupations(), mine = mesPreoc(all);
    let nonLues = 0, changed = false;
    mine.forEach(p => {
        const nbEcole = (p.reponses || []).filter(r => r.auteur !== 'parent').length;
        if (marquerVu && (p.vuParent || 0) < nbEcole) { p.vuParent = nbEcole; changed = true; }
        if ((p.vuParent || 0) < nbEcole) nonLues++;
    });
    if (changed) Comptes.sauverPreoccupations(all);
    const badge = document.getElementById('parCountRep');
    badge.textContent = nonLues; badge.classList.toggle('hidden', !nonLues);
    const ST = { envoyee: ['Envoyée', 'info'], lue: ['Lue par l\'école', 'violet'], repondue: ['Réponse reçue', 'ok'], traitee: ['Traitée', 'ok'] };
    document.getElementById('pqList').innerHTML = mine.length ? mine.map(p => {
        const st = ST[p.status] || ['-', ''];
        return `<div class="preoc-card">
            <div class="preoc-head">
                <div><strong>${parEsc(p.sujet)}</strong><div class="text-secondary small">${parEsc(p.eleveNom)} · ${parEsc(p.service)} · ${parDateH(p.date)}</div></div>
                <span class="ui-pill ${st[1]}">${st[0]}</span>
            </div>
            <div class="preoc-msg">${parEsc(p.message)}</div>
            ${(p.reponses || []).map(r => `<div class="preoc-rep ${r.auteur === 'parent' ? 'par' : 'eco'}"><small>${r.auteur === 'parent' ? 'Vous' : 'École'} · ${parDateH(r.date)}</small><div>${parEsc(r.texte)}</div></div>`).join('')}
            ${p.status !== 'traitee' ? `<div class="d-flex gap-2 mt-2"><input type="text" id="pqRep_${p.id}" style="margin:0;" placeholder="Ajouter un message…"><button class="btn btn-secondary btn-sm" onclick="parRelancer('${p.id}')"><i class="bi bi-send"></i></button></div>` : ''}
        </div>`;
    }).join('') : '<div class="empty-mini"><i class="bi bi-chat-dots"></i> Vous n\'avez encore envoyé aucun message.</div>';
}
function envoyerPreoc() {
    const sujet = document.getElementById('pqSujet').value.trim(), message = document.getElementById('pqMessage').value.trim();
    if (!sujet) return uiToast('Indiquez le sujet de votre message.', 'warn');
    if (message.length < 5) return uiToast('Écrivez votre message.', 'warn');
    const eid = document.getElementById('pqEleve').value;
    const e = parParent.enfants.find(x => x.id === eid);
    const all = Comptes.preoccupations();
    all.unshift({
        id: 'pq' + Date.now(), parentKey: parParent.key, parentNom: parParent.nom || 'Parent', parentTel: parParent.telephone,
        eleveId: e ? e.id : '', eleveNom: e ? (e.prenom + ' ' + e.nom + ' (' + (e.classe || '-') + ')') : 'Toute la famille',
        service: document.getElementById('pqService').value, sujet, message, date: new Date().toISOString(), status: 'envoyee', reponses: []
    });
    Comptes.sauverPreoccupations(all);
    document.getElementById('pqSujet').value = ''; document.getElementById('pqMessage').value = '';
    parRenderPreoc(true);
    uiToast('Message envoyé à l\'école. Vous verrez la réponse ici.', 'ok');
}
function parRelancer(id) {
    const inp = document.getElementById('pqRep_' + id), t = (inp.value || '').trim();
    if (!t) return;
    const all = Comptes.preoccupations(), p = all.find(x => x.id === id && x.parentKey === parParent.key); if (!p) return;
    (p.reponses = p.reponses || []).push({ auteur: 'parent', texte: t, date: new Date().toISOString() });
    p.status = 'envoyee';
    Comptes.sauverPreoccupations(all); parRenderPreoc(true);
}

document.addEventListener('DOMContentLoaded', parInit);
