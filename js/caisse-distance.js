// =====================================================================
// DigiGesPro — paiements à distance et clôture de caisse
//  • Paiements déclarés : le parent déclare un paiement Mobile Money ou
//    virement ; le caissier vérifie puis valide → transaction créée.
//  • Clôture de caisse : totaux du jour par moyen de paiement, comparés
//    au montant réellement reçu (téléphone, relevé, caisse).
// Dépend des globales de DigiGesPro : students, transactions, MOIS…
// =====================================================================

function cdEsc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function cdFCFA(n) { return Math.round(Number(n) || 0).toLocaleString('fr-FR').replace(/ | /g, ' ') + ' FCFA'; }
function cdJour(iso) { return iso ? new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '-'; }
function cdQui() { try { const s = JSON.parse(sessionStorage.getItem('portail_session')) || {}; return (s.nom && s.nom !== s.role ? s.nom + ' — ' : '') + (s.role || 'Caisse'); } catch (e) { return 'Caisse'; } }
const CD_MOYEN_PILL = { mtn: 'warn', airtel: 'danger', virement: 'info', especes: 'ok' };
const CD_TYPES = { scolarite: 'Scolarité', inscription: 'Inscription', reinscription: 'Réinscription' };
const CD_MOIS_FR = { Fevrier: 'Février', Aout: 'Août', Decembre: 'Décembre' };

// ---------------------------------------------------------------
// Paiements déclarés
// ---------------------------------------------------------------
function majBadgeDeclares() {
    const b = document.getElementById('badgeDeclares'); if (!b) return;
    const n = Comptes.declarations().filter(d => d.status === 'en_attente').length;
    b.textContent = n; b.classList.toggle('hidden', !n);
}

function renderDeclares() {
    majBadgeDeclares();
    const f = document.getElementById('dpFiltre').value;
    const all = Comptes.declarations();
    const list = all.filter(d => f === 'tous' || d.status === f);
    const box = document.getElementById('dpList');
    if (!list.length) {
        box.innerHTML = `<div class="card"><div class="empty-mini"><i class="bi bi-phone"></i>${f === 'en_attente' ? 'Aucun paiement déclaré en attente de vérification.' : 'Aucun paiement dans cette liste.'}</div></div>`;
        return;
    }
    box.innerHTML = list.map(d => {
        const doublon = all.some(x => x.id !== d.id && x.status !== 'refuse' && x.moyen === d.moyen && (x.reference || '').trim().toLowerCase() === (d.reference || '').trim().toLowerCase());
        const st = d.status === 'valide' ? '<span class="ui-pill ok">Validé</span>' : d.status === 'refuse' ? '<span class="ui-pill danger">Refusé</span>' : '<span class="ui-pill warn">À vérifier</span>';
        return `<div class="card dp-card">
            <div class="dp-head">
                <div class="dp-amount"><span class="ui-pill ${CD_MOYEN_PILL[d.moyen] || ''}">${cdEsc(Comptes.MOYENS[d.moyen] || d.moyen)}</span><strong>${cdFCFA(d.montant)}</strong></div>
                <div class="text-end">${st}<div class="text-secondary small mt-1">Déclaré le ${cdJour(d.createdAt)}</div></div>
            </div>
            <div class="dp-grid">
                <div><small>Identifiant de transaction</small><strong class="dp-ref">${cdEsc(d.reference)}</strong>${doublon ? '<span class="ui-pill danger mt-1">Référence déjà utilisée</span>' : ''}</div>
                <div><small>Date du paiement</small><strong>${cdJour(d.date)}</strong></div>
                <div><small>Payé depuis le numéro</small><strong>${cdEsc(d.numeroPayeur || '-')}</strong></div>
                <div><small>Élève</small><strong>${cdEsc(d.eleveNom)}</strong><span class="text-secondary small">${cdEsc(d.classe || '')} · ${cdEsc(d.matricule || '')}</span></div>
                <div><small>Objet</small><strong>${cdEsc(CD_TYPES[d.type] || d.type)}</strong><span class="text-secondary small">${(d.mois || []).map(m => CD_MOIS_FR[m] || m).join(', ')}</span></div>
                <div><small>Parent</small><strong>${cdEsc(d.parentNom)}</strong><span class="text-secondary small">${cdEsc(d.parentTel || '')}</span></div>
            </div>
            ${d.note ? `<p class="req-msg">« ${cdEsc(d.note)} »</p>` : ''}
            ${d.status === 'en_attente' ? `<div class="dp-actions">
                <button class="btn btn-danger btn-sm" onclick="refuserDeclaration('${d.id}')"><i class="bi bi-x-lg"></i> Refuser</button>
                <button class="btn btn-success btn-sm" onclick="validerDeclaration('${d.id}')"><i class="bi bi-check-lg"></i> Vérifié : valider et enregistrer</button>
            </div>` : `<div class="text-secondary small mt-2">${d.status === 'valide' ? 'Validé' : 'Refusé'} par ${cdEsc(d.traitePar || '-')} le ${cdJour(d.traiteLe)}${d.motif ? ' — motif : ' + cdEsc(d.motif) : ''}${d.transactionRef ? ' — transaction ' + cdEsc(d.transactionRef) : ''}</div>`}
        </div>`;
    }).join('');
}

// Retrouve (ou crée) l'élève dans la caisse
function cdEleveCaisse(d) {
    let s = students.find(x => x.id === d.eleveId) || students.find(x => d.matricule && x.matricule === d.matricule);
    if (!s) {
        s = { id: d.eleveId, nom: d.eleveNomSeul || d.eleveNom, prenom: d.elevePrenom || '', classe: d.classe || '', matricule: d.matricule || '' };
        students.push(s);
        localStorage.setItem('digigespro_students', JSON.stringify(students));
    }
    return s;
}

function validerDeclaration(id) {
    const all = Comptes.declarations(), d = all.find(x => x.id === id);
    if (!d || d.status !== 'en_attente') return;
    if (!confirm(`Avez-vous vérifié sur ${Comptes.MOYENS[d.moyen] || d.moyen} la réception de ${cdFCFA(d.montant)} (réf. ${d.reference}) ?\n\nLa transaction sera enregistrée à la date du paiement (${cdJour(d.date)}).`)) return;
    const t = Paiement.creerTransaction(d);
    d.status = 'valide'; d.traitePar = cdQui(); d.traiteLe = new Date().toISOString(); d.transactionId = t.id; d.transactionRef = t.reference;
    Comptes.sauverDeclarations(all);
    if (typeof updateUI === 'function') { try { updateUI(); } catch (e) { } }
    renderDeclares();
    uiToast(`Paiement validé et enregistré (${t.reference}).`, 'ok');
}

function refuserDeclaration(id) {
    const all = Comptes.declarations(), d = all.find(x => x.id === id);
    if (!d || d.status !== 'en_attente') return;
    const motif = prompt('Motif du refus (visible par le parent) :', 'Paiement introuvable sur le téléphone marchand');
    if (motif === null) return;
    if (!motif.trim()) return uiToast('Indiquez un motif de refus.', 'warn');
    d.status = 'refuse'; d.motif = motif.trim(); d.traitePar = cdQui(); d.traiteLe = new Date().toISOString();
    Comptes.sauverDeclarations(all);
    renderDeclares();
    uiToast('Paiement refusé. Le parent verra le motif dans son espace.', 'ok');
}

// ---------------------------------------------------------------
// Clôture de caisse
// ---------------------------------------------------------------
const CL_ORDRE = ['especes', 'mtn', 'airtel', 'virement'];
const CL_ICON = { especes: 'cash-coin', mtn: 'phone', airtel: 'phone', virement: 'bank' };
const CL_SOURCE = { especes: 'Comptez la caisse', mtn: 'Solde reçu sur le téléphone MTN', airtel: 'Solde reçu sur le téléphone Airtel', virement: 'Relevé bancaire' };

function clTotaux(date) {
    const jour = transactions.filter(t => t.date === date);
    const tot = {}, nb = {}, det = {};
    CL_ORDRE.forEach(m => { tot[m] = 0; nb[m] = 0; det[m] = []; });
    let depenses = 0, nbDep = 0;
    jour.forEach(t => {
        const a = Number(t.amount) || 0;
        if (t.type === 'depense') { depenses += a; nbDep++; return; }
        const m = CL_ORDRE.indexOf(t.paymentMethod) >= 0 ? t.paymentMethod : 'especes';
        tot[m] += a; nb[m]++; det[m].push(t);
    });
    // Espèces attendues en caisse = encaissements en espèces − dépenses du jour
    const attendu = Object.assign({}, tot); attendu.especes = tot.especes - depenses;
    return { tot, nb, det, depenses, nbDep, attendu };
}

function renderCloture() {
    const inp = document.getElementById('clDate');
    if (!inp.value) inp.value = (document.getElementById('dashboardDate') && document.getElementById('dashboardDate').value) || new Date().toISOString().slice(0, 10);
    const date = inp.value, T = clTotaux(date), clo = Comptes.clotures()[date];
    const attente = Comptes.declarations().filter(d => d.status === 'en_attente' && d.date === date);
    const modifie = clo && CL_ORDRE.some(m => Math.round(clo.attendu ? clo.attendu[m] : clo.totaux[m]) !== Math.round(T.attendu[m]));
    const lignes = CL_ORDRE.map(m => {
        const c = clo && clo.constate && clo.constate[m] != null ? clo.constate[m] : '';
        return `<tr>
            <td><div class="cl-moyen"><span class="cl-ico ${m}"><i class="bi bi-${CL_ICON[m]}"></i></span><div><strong>${Comptes.MOYENS[m]}</strong><small>${CL_SOURCE[m]}</small></div></div></td>
            <td style="text-align:center;">${T.nb[m]}</td>
            <td style="text-align:right;"><strong>${cdFCFA(T.attendu[m])}</strong>${m === 'especes' && T.depenses ? `<div class="text-secondary small">${cdFCFA(T.tot.especes)} encaissés − ${cdFCFA(T.depenses)} de dépenses</div>` : ''}</td>
            <td style="min-width:170px;"><input type="number" step="1" min="0" class="cl-input" id="cl_${m}" value="${c}" placeholder="Montant constaté" oninput="clEcarts()" style="margin:0;"></td>
            <td style="text-align:right;" id="clEcart_${m}"></td>
        </tr>`;
    }).join('');
    const totalApp = CL_ORDRE.reduce((s, m) => s + T.attendu[m], 0);
    const details = CL_ORDRE.filter(m => T.det[m].length).map(m => `
        <details class="cl-det"><summary><span class="ui-pill ${CD_MOYEN_PILL[m]}">${Comptes.MOYENS[m]}</span> ${T.nb[m]} opération(s) · ${cdFCFA(T.tot[m])}</summary>
        <div style="overflow-x:auto;"><table><thead><tr><th>Heure</th><th>Élève</th><th>Objet</th><th>Réf. interne</th><th>Réf. opérateur</th><th style="text-align:right;">Montant</th></tr></thead>
        <tbody>${T.det[m].map(t => `<tr><td>${cdEsc(t.time || '-')}</td><td>${cdEsc(t.studentName || '-')}</td><td>${cdEsc(CD_TYPES[t.type] || t.type)}${t.source === 'parent' ? ' <span class="ui-pill info">déclaré</span>' : t.source === 'en_ligne' ? ' <span class="ui-pill ok">en ligne</span>' : ''}</td><td>${cdEsc(t.reference || '-')}</td><td>${cdEsc(t.refOperateur || '-')}</td><td style="text-align:right;">${cdFCFA(t.amount)}</td></tr>`).join('')}</tbody></table></div></details>`).join('');
    document.getElementById('clContenu').innerHTML = `
        ${clo ? `<div class="alert ${modifie ? 'alert-warning' : 'alert-success'}"><i class="bi bi-${modifie ? 'exclamation-triangle' : 'lock'}"></i> Journée clôturée par ${cdEsc(clo.par)} le ${cdJour(clo.le)}.${modifie ? ' <strong>Des opérations ont été ajoutées ou modifiées depuis : vérifiez et clôturez à nouveau.</strong>' : ''}</div>` : ''}
        ${attente.length ? `<div class="alert alert-warning"><i class="bi bi-hourglass-split"></i> ${attente.length} paiement(s) déclaré(s) par des parents pour cette journée sont encore <strong>en attente de vérification</strong> et ne sont pas comptés. <a href="#paiements-declares" onclick="showTab('declares');return false;">Les vérifier</a></div>` : ''}
        <div class="card">
            <div class="cl-summary">
                <div><small>Total enregistré dans l'application</small><strong>${cdFCFA(totalApp)}</strong></div>
                <div><small>Total constaté</small><strong id="clTotConst">—</strong></div>
                <div><small>Écart global</small><strong id="clTotEcart">—</strong></div>
            </div>
            <div style="overflow-x:auto;"><table class="cl-table">
                <thead><tr><th>Moyen de paiement</th><th style="text-align:center;">Opérations</th><th style="text-align:right;">Selon l'application</th><th>Constaté réellement</th><th style="text-align:right;">Écart</th></tr></thead>
                <tbody>${lignes}</tbody>
            </table></div>
            <label class="form-label mt-3" for="clNote">Observation <span class="text-secondary" style="font-weight:400;">(facultatif)</span></label>
            <textarea id="clNote" rows="2" style="margin:0;" placeholder="Ex : écart de 500 FCFA expliqué par la monnaie rendue…">${cdEsc(clo ? clo.note || '' : '')}</textarea>
            <div class="d-flex gap-2 justify-content-end flex-wrap mt-3">
                <button class="btn btn-secondary" onclick="imprimerCloture()"><i class="bi bi-printer"></i> Imprimer</button>
                <button class="btn btn-primary" onclick="cloturerJournee()"><i class="bi bi-lock"></i> ${clo ? 'Mettre à jour la clôture' : 'Clôturer la journée'}</button>
            </div>
        </div>
        ${details ? `<div class="card"><h3 style="margin-bottom:.75rem;">Détail des opérations du jour</h3><p class="text-secondary small">En cas d'écart, comparez ici chaque opération avec l'historique du téléphone ou du relevé.</p>${details}</div>` : ''}`;
    clEcarts();
    renderClHisto();
}

function clEcarts() {
    const date = document.getElementById('clDate').value, T = clTotaux(date);
    let totC = 0, totE = 0, saisi = 0;
    CL_ORDRE.forEach(m => {
        const v = document.getElementById('cl_' + m).value, cell = document.getElementById('clEcart_' + m);
        if (v === '') { cell.innerHTML = T.attendu[m] || T.nb[m] ? '<span class="ui-pill">À vérifier</span>' : '<span class="text-secondary">—</span>'; return; }
        const e = Number(v) - T.attendu[m]; saisi++; totC += Number(v); totE += e;
        cell.innerHTML = Math.round(e) === 0 ? '<span class="ui-pill ok">Conforme</span>' : `<span class="ui-pill danger">${e > 0 ? '+' : ''}${cdFCFA(e)}</span>`;
    });
    document.getElementById('clTotConst').textContent = saisi ? cdFCFA(totC) : '—';
    const te = document.getElementById('clTotEcart');
    te.innerHTML = saisi ? (Math.round(totE) === 0 ? '<span style="color:var(--ok)">Conforme</span>' : `<span style="color:var(--danger)">${totE > 0 ? '+' : ''}${cdFCFA(totE)}</span>`) : '—';
}

function cloturerJournee() {
    const date = document.getElementById('clDate').value, T = clTotaux(date);
    const constate = {}, ecart = {}; let manque = [];
    CL_ORDRE.forEach(m => {
        const v = document.getElementById('cl_' + m).value;
        if (v === '') { if (T.attendu[m] || T.nb[m]) manque.push(Comptes.MOYENS[m]); constate[m] = null; ecart[m] = null; return; }
        constate[m] = Number(v); ecart[m] = Number(v) - T.attendu[m];
    });
    if (manque.length && !confirm(`Montant constaté non saisi pour : ${manque.join(', ')}.\nClôturer quand même ?`)) return;
    const all = Comptes.clotures();
    all[date] = { date, totaux: T.tot, attendu: T.attendu, depenses: T.depenses, nb: T.nb, constate, ecart, note: document.getElementById('clNote').value.trim(), par: cdQui(), le: new Date().toISOString() };
    Comptes.sauverClotures(all);
    renderCloture();
    const totE = CL_ORDRE.reduce((s, m) => s + (ecart[m] || 0), 0);
    uiToast(Math.round(totE) === 0 ? 'Journée clôturée : tout est conforme.' : `Journée clôturée avec un écart de ${cdFCFA(totE)}.`, Math.round(totE) === 0 ? 'ok' : 'warn');
}

function renderClHisto() {
    const all = Object.values(Comptes.clotures()).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 60);
    document.getElementById('clHisto').innerHTML = all.length ? `<table><thead><tr><th>Journée</th>${CL_ORDRE.map(m => `<th style="text-align:right;">${Comptes.MOYENS[m]}</th>`).join('')}<th style="text-align:right;">Écart total</th><th>Clôturée par</th></tr></thead><tbody>
        ${all.map(c => {
            const tot = CL_ORDRE.reduce((s, m) => s + (c.ecart[m] || 0), 0);
            return `<tr style="cursor:pointer;" onclick="document.getElementById('clDate').value='${c.date}';renderCloture();window.scrollTo({top:0,behavior:'smooth'})">
                <td><strong>${cdJour(c.date)}</strong></td>
                ${CL_ORDRE.map(m => `<td style="text-align:right;">${cdFCFA((c.attendu || c.totaux)[m])}${c.ecart[m] ? `<div class="small" style="color:var(--danger)">écart ${c.ecart[m] > 0 ? '+' : ''}${cdFCFA(c.ecart[m])}</div>` : ''}</td>`).join('')}
                <td style="text-align:right;">${Math.round(tot) === 0 ? '<span class="ui-pill ok">Conforme</span>' : `<span class="ui-pill danger">${tot > 0 ? '+' : ''}${cdFCFA(tot)}</span>`}</td>
                <td class="small">${cdEsc(c.par)}</td></tr>`;
        }).join('')}</tbody></table>` : '<div class="empty-mini"><i class="bi bi-calculator"></i> Aucune journée clôturée pour le moment.</div>';
}

function imprimerCloture() {
    const date = document.getElementById('clDate').value, T = clTotaux(date);
    const ecole = (typeof etabEnteteHTML === 'function') ? etabEnteteHTML('Clôture de caisse', cdJour(date)) : `<h2>Clôture de caisse — ${cdJour(date)}</h2>`;
    const rows = CL_ORDRE.map(m => {
        const v = document.getElementById('cl_' + m).value, e = v === '' ? null : Number(v) - T.attendu[m];
        return `<tr><td>${Comptes.MOYENS[m]}</td><td style="text-align:center">${T.nb[m]}</td><td style="text-align:right">${cdFCFA(T.attendu[m])}</td><td style="text-align:right">${v === '' ? '-' : cdFCFA(v)}</td><td style="text-align:right">${e === null ? '-' : Math.round(e) === 0 ? 'Conforme' : cdFCFA(e)}</td></tr>`;
    }).join('');
    const w = window.open('', '_blank', 'width=820,height=700'); if (!w) return;
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Clôture de caisse ${date}</title>
        <style>body{font-family:Arial,sans-serif;padding:28px;color:#111}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #999;padding:8px;font-size:13px}th{background:#eee}.sig{display:flex;justify-content:space-between;margin-top:48px}</style></head>
        <body>${ecole}<table><thead><tr><th>Moyen</th><th>Opérations</th><th>Selon l'application</th><th>Constaté</th><th>Écart</th></tr></thead><tbody>${rows}</tbody></table>
        ${T.depenses ? `<p>Dépenses du jour (déduites des espèces) : ${cdFCFA(T.depenses)}</p>` : ''}
        <p>Observation : ${cdEsc(document.getElementById('clNote').value || '-')}</p>
        <div class="sig"><div>Le caissier</div><div>Le responsable</div></div><script>window.print()<\/script></body></html>`);
    w.document.close();
}

document.addEventListener('DOMContentLoaded', () => { majBadgeDeclares(); setInterval(majBadgeDeclares, 30000); });
window.addEventListener('storage', e => { if (e.key === 'ecole_paiements_declares') { majBadgeDeclares(); const t = document.getElementById('declares'); if (t && !t.classList.contains('hidden')) renderDeclares(); } });
