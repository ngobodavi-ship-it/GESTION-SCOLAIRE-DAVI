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
    parInitPayer();
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
    document.getElementById('par-payer').classList.toggle('hidden', v !== 'payer');
    if (v === 'preoc') parRenderPreoc(true);
    if (v === 'payer') parRenderPayer(true);
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

// ---------- Paiement à distance ----------
const PD_MOIS_FR = { Fevrier: 'Février', Aout: 'Août', Decembre: 'Décembre' };
function parInitPayer() {
    document.getElementById('pdEleve').innerHTML = parParent.enfants.map(e => `<option value="${parEsc(e.id)}">${parEsc(e.prenom)} ${parEsc(e.nom)} (${parEsc(e.classe || '-')})</option>`).join('');
    document.getElementById('pdDate').value = new Date().toISOString().slice(0, 10);
    document.getElementById('pdDate').max = new Date().toISOString().slice(0, 10);
    pdMajMois();
    parRenderPayer(false);
}
function parRenderPayer(marquerVu) {
    const c = Comptes.paiementConfig();
    const carte = (cls, ico, titre, lignes) => `<div class="pay-num ${cls}"><span class="pn-ico"><i class="bi bi-${ico}"></i></span><div><small>${titre}</small>${lignes}</div></div>`;
    const items = [];
    if (c.mtn.numero) items.push(carte('mtn', 'phone', 'MTN Mobile Money', `<strong>${parEsc(c.mtn.numero)}</strong>${c.mtn.nom ? `<span>${parEsc(c.mtn.nom)}</span>` : ''}`));
    if (c.airtel.numero) items.push(carte('airtel', 'phone', 'Airtel Money', `<strong>${parEsc(c.airtel.numero)}</strong>${c.airtel.nom ? `<span>${parEsc(c.airtel.nom)}</span>` : ''}`));
    if (c.banque.rib) items.push(carte('banque', 'bank', 'Virement bancaire' + (c.banque.banque ? ' — ' + parEsc(c.banque.banque) : ''), `<strong class="rib">${parEsc(c.banque.rib)}</strong>${c.banque.titulaire ? `<span>${parEsc(c.banque.titulaire)}</span>` : ''}`));
    document.getElementById('payNumeros').innerHTML = items.length ? items.join('') :
        '<div class="empty-mini" style="grid-column:1/-1;"><i class="bi bi-info-circle"></i> L\'école n\'a pas encore communiqué ses numéros de paiement. Vous pouvez payer au guichet de l\'établissement.</div>';
    const all = Comptes.declarations(), mine = all.filter(d => d.parentKey === parParent.key);
    let nonVues = 0, changed = false;
    mine.forEach(d => { if (d.status !== 'en_attente' && !d.vuParent) { if (marquerVu) { d.vuParent = true; changed = true; } else nonVues++; } });
    if (changed) Comptes.sauverDeclarations(all);
    const b = document.getElementById('parCountPay'); b.textContent = nonVues; b.classList.toggle('hidden', !nonVues);
    const ST = { en_attente: ['En cours de vérification', 'warn'], valide: ['Validé par l\'école', 'ok'], refuse: ['Refusé', 'danger'] };
    document.getElementById('pdList').innerHTML = mine.length ? `<div style="overflow-x:auto;"><table><thead><tr><th>Date</th><th>Enfant</th><th>Objet</th><th>Moyen</th><th>Réf.</th><th style="text-align:right;">Montant</th><th>État</th></tr></thead><tbody>
        ${mine.map(d => `<tr><td>${new Date(d.date + 'T12:00:00').toLocaleDateString('fr-FR')}</td><td>${parEsc(d.eleveNom)}</td><td>${d.type === 'scolarite' ? 'Scolarité · ' + (d.mois || []).map(m => PD_MOIS_FR[m] || m).join(', ') : d.type === 'inscription' ? 'Inscription' : 'Réinscription'}</td>
            <td>${parEsc(Comptes.MOYENS[d.moyen] || d.moyen)}</td><td style="font-family:ui-monospace,monospace;font-size:.8rem;">${parEsc(d.reference)}</td><td style="text-align:right;">${fmtFCFA(d.montant)}</td>
            <td><span class="ui-pill ${ST[d.status][1]}">${ST[d.status][0]}</span>${d.motif ? `<div class="small text-secondary mt-1">${parEsc(d.motif)}</div>` : ''}</td></tr>`).join('')}
        </tbody></table></div>` : '<div class="empty-mini"><i class="bi bi-receipt"></i> Aucun paiement déclaré pour le moment.</div>';
}
function pdMajMois() {
    const type = document.getElementById('pdType').value, box = document.getElementById('pdMoisBox');
    box.classList.toggle('hidden', type !== 'scolarite');
    if (type !== 'scolarite') { document.getElementById('pdMontant').value = ''; return; }
    const e = parParent.enfants.find(x => x.id === document.getElementById('pdEleve').value);
    const sit = e && typeof situationEleve === 'function' ? situationEleve(e) : null;
    const lignes = sit ? sit.lignes.filter(l => l.prixFixe > 0) : [];
    const enAttente = Comptes.declarations().filter(d => d.status === 'en_attente' && e && d.eleveId === e.id).reduce((a, d) => a.concat(d.mois || []), []);
    document.getElementById('pdMois').innerHTML = lignes.length ? lignes.map(l => {
        const paye = l.status === 'complet', att = enAttente.indexOf(l.mois) !== -1;
        return `<label class="pd-m ${paye ? 'paye' : att ? 'attente' : ''}"><input type="checkbox" value="${l.mois}" data-reste="${Math.max(0, l.reste)}" ${paye || att ? 'disabled' : ''} onchange="pdMajMontant()">
            <span><strong>${PD_MOIS_FR[l.mois] || l.mois}</strong><small>${paye ? 'Payé' : att ? 'Déclaré, en vérification' : 'Reste ' + fmtFCFA(l.reste)}</small></span></label>`;
    }).join('') : '<div class="text-secondary small">Les mensualités ne sont pas encore définies par l\'école : indiquez simplement le montant payé.</div>';
}
function pdMajMontant() {
    const tot = [...document.querySelectorAll('#pdMois input:checked')].reduce((s, i) => s + Number(i.dataset.reste || 0), 0);
    if (tot) document.getElementById('pdMontant').value = tot;
}
function declarerPaiement() {
    const e = parParent.enfants.find(x => x.id === document.getElementById('pdEleve').value);
    const type = document.getElementById('pdType').value;
    const mois = type === 'scolarite' ? [...document.querySelectorAll('#pdMois input:checked')].map(i => i.value) : [];
    const montant = Number(document.getElementById('pdMontant').value);
    const moyen = document.getElementById('pdMoyen').value, date = document.getElementById('pdDate').value;
    const ref = document.getElementById('pdRef').value.trim(), num = document.getElementById('pdNumero').value.trim();
    if (!e) return uiToast('Choisissez l\'enfant concerné.', 'warn');
    if (type === 'scolarite' && !mois.length && document.querySelector('#pdMois input')) return uiToast('Cochez le ou les mois payés.', 'warn');
    if (!montant || montant <= 0) return uiToast('Indiquez le montant payé.', 'warn');
    if (!date) return uiToast('Indiquez la date du paiement.', 'warn');
    if (ref.length < 4) return uiToast('Saisissez l\'identifiant de la transaction reçu par SMS (ou la référence du virement).', 'warn');
    const all = Comptes.declarations();
    if (all.some(d => d.status !== 'refuse' && d.moyen === moyen && (d.reference || '').trim().toLowerCase() === ref.toLowerCase()))
        return uiToast('Ce paiement (même identifiant de transaction) a déjà été déclaré.', 'err');
    all.unshift({ id: 'pd' + Date.now(), createdAt: new Date().toISOString(), date, parentKey: parParent.key, parentNom: parParent.nom || 'Parent', parentTel: parParent.telephone,
        eleveId: e.id, eleveNom: e.prenom + ' ' + e.nom, eleveNomSeul: e.nom, elevePrenom: e.prenom, classe: e.classe || '', matricule: e.matricule || '',
        type, mois, montant, moyen, reference: ref, numeroPayeur: num, note: document.getElementById('pdNote').value.trim(), status: 'en_attente' });
    Comptes.sauverDeclarations(all);
    ['pdRef', 'pdNote', 'pdMontant'].forEach(i => document.getElementById(i).value = '');
    pdMajMois(); parRenderPayer(true);
    uiToast('Paiement déclaré. L\'école va le vérifier : vous verrez son état ci-dessous.', 'ok');
}
