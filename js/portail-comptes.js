// =====================================================================
// Portail — comptes : connexion des parents, première connexion,
// changement de mot de passe, mot de passe oublié (validé par l'admin),
// comptes parents, demandes et préoccupations côté administration.
// Dépend de : js/comptes.js (Comptes) et du script du portail
// (config, saveConfig, setSession, currentSession, enterApp, escapeHtml…).
// =====================================================================

function pcEsc(s) { return escapeHtml(s == null ? '' : String(s)); }
function pcDate(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// ---------------------------------------------------------------
// Connexion
// ---------------------------------------------------------------
function loginErreur(msg) {
    document.getElementById('loginErrorText').textContent = msg;
    document.getElementById('loginError').classList.remove('hidden');
}

function loginParent(login, pass) {
    const p = Comptes.trouverParent(login);
    if (!p) return loginErreur("Ce numéro ne correspond à aucun parent enregistré dans l'établissement.");
    const acc = Comptes.compteParent(p.key);
    if (!acc) return loginErreur("Votre compte parent n'est pas encore activé. Demandez votre code d'accès à l'administration de l'école.");
    if (acc.active === false) return loginErreur("Ce compte parent est désactivé. Adressez-vous à l'administration.");
    if (!pass || !Comptes.verifier(acc, pass)) return loginErreur('Numéro de téléphone ou mot de passe incorrect.');
    acc.lastLogin = new Date().toISOString();
    Comptes.sauverCompteParent(p.key, acc);
    setSession({ nom: p.nom || 'Parent', role: 'Parent', login: p.key, type: 'parent' });
    apresConnexion(!!acc.mustChange);
}

// Après une connexion réussie : proposer de changer le mot de passe provisoire
function apresConnexion(mustChange) {
    const suite = () => { if (currentSession && currentSession.role === 'Parent') location.href = 'parent.html'; else enterApp(); };
    if (mustChange) openPwModal({ first: true, onDone: suite });
    else suite();
}

// Compte modifiable de la session en cours
function compteSession() {
    const s = currentSession || {};
    if (s.role === 'Parent') {
        const rec = Comptes.compteParent(s.login);
        return rec ? { rec, save: () => Comptes.sauverCompteParent(s.login, rec), label: 'parent' } : null;
    }
    if (s.login) {
        const u = config.users.find(x => (x.login || '').toLowerCase() === String(s.login).toLowerCase());
        return u ? { rec: u, save: saveConfig, label: 'personnel' } : null;
    }
    return null;
}

// ---------------------------------------------------------------
// Fenêtre comptes (changement de mot de passe / affichage d'un code)
// ---------------------------------------------------------------
function openAcctModal(html) {
    document.getElementById('acctModalBody').innerHTML = html;
    document.getElementById('acctModal').classList.remove('hidden');
}
function closeAcctModal() { document.getElementById('acctModal').classList.add('hidden'); }

let pwOpts = {};
function openPwModal(opts) {
    pwOpts = opts || {};
    const cpt = compteSession();
    if (!cpt) {
        openAcctModal(`<div class="acct-head"><span class="acct-ico"><i class="bi bi-info-lg"></i></span><div><h3>Mot de passe</h3>
            <p>Ce compte (compte d'essai ou mot de passe maître) ne se modifie pas ici. Le mot de passe maître se change dans Espace admin › Paramètres.</p></div></div>
            <div class="acct-actions"><button class="btn btn-primary" onclick="closeAcctModal();(pwOpts.onDone||function(){})()">Compris</button></div>`);
        return;
    }
    const first = !!pwOpts.first;
    openAcctModal(`
        <div class="acct-head"><span class="acct-ico"><i class="bi bi-shield-lock"></i></span><div>
            <h3>${first ? 'Bienvenue ! Choisissez votre mot de passe' : 'Changer mon mot de passe'}</h3>
            <p>${first ? 'Vous vous êtes connecté avec le code provisoire remis par l\'école. Remplacez-le par un mot de passe personnel que vous seul connaissez.' : 'Saisissez votre mot de passe actuel, puis le nouveau.'}</p>
        </div></div>
        ${first ? '' : '<label class="form-label">Mot de passe actuel</label><input type="password" id="pwActuel" class="form-control mb-3" autocomplete="current-password">'}
        <label class="form-label">Nouveau mot de passe <span class="text-secondary" style="font-weight:400;">(${Comptes.MIN_LONGUEUR} caractères minimum)</span></label>
        <input type="password" id="pwNouveau" class="form-control mb-3" autocomplete="new-password" oninput="pwForce()">
        <div class="pw-meter"><span id="pwMeter"></span></div>
        <label class="form-label">Confirmer le nouveau mot de passe</label>
        <input type="password" id="pwConfirme" class="form-control mb-2" autocomplete="new-password" onkeydown="if(event.key==='Enter')enregistrerMdp()">
        <p id="pwErreur" class="login-error hidden"><i class="bi bi-exclamation-circle"></i> <span></span></p>
        <div class="acct-actions">
            ${first ? '<button class="btn btn-secondary" onclick="closeAcctModal();(pwOpts.onDone||function(){})()">Plus tard</button>' : '<button class="btn btn-secondary" onclick="closeAcctModal()">Annuler</button>'}
            <button class="btn btn-primary" onclick="enregistrerMdp()"><i class="bi bi-check-lg"></i> Enregistrer</button>
        </div>
        ${first ? '<p class="text-secondary small mt-3 mb-0">Si vous choisissez « Plus tard », cette fenêtre vous sera proposée à chaque connexion.</p>' : ''}`);
    setTimeout(() => { const f = document.getElementById(first ? 'pwNouveau' : 'pwActuel'); if (f) f.focus(); }, 30);
}
function pwForce() {
    const v = document.getElementById('pwNouveau').value, m = document.getElementById('pwMeter');
    let sc = 0; if (v.length >= Comptes.MIN_LONGUEUR) sc++; if (v.length >= 10) sc++; if (/[A-Z]/.test(v) && /[a-z]/.test(v)) sc++; if (/\d/.test(v)) sc++; if (/[^A-Za-z0-9]/.test(v)) sc++;
    m.style.width = Math.min(100, sc * 20) + '%';
    m.className = sc <= 1 ? 'faible' : sc <= 3 ? 'moyen' : 'fort';
}
function enregistrerMdp() {
    const err = t => { const e = document.getElementById('pwErreur'); e.querySelector('span').textContent = t; e.classList.remove('hidden'); };
    const cpt = compteSession(); if (!cpt) return;
    const nv = document.getElementById('pwNouveau').value, cf = document.getElementById('pwConfirme').value;
    if (!pwOpts.first) {
        const act = document.getElementById('pwActuel').value;
        if (!Comptes.verifier(cpt.rec, act)) return err('Le mot de passe actuel est incorrect.');
    }
    if (nv.length < Comptes.MIN_LONGUEUR) return err(`Le mot de passe doit contenir au moins ${Comptes.MIN_LONGUEUR} caractères.`);
    if (Comptes.verifier(cpt.rec, nv)) return err("Le nouveau mot de passe doit être différent de l'actuel.");
    if (nv !== cf) return err('Les deux mots de passe ne sont pas identiques.');
    Comptes.definir(cpt.rec, nv, false);
    cpt.save();
    closeAcctModal();
    if (window.uiToast) uiToast('Mot de passe modifié avec succès.', 'ok');
    (pwOpts.onDone || function () {})();
}

// Code d'accès à remettre (parent ou personnel)
function afficherCode(o) {
    openAcctModal(`
        <div class="acct-head"><span class="acct-ico ok"><i class="bi bi-key"></i></span><div>
            <h3>${pcEsc(o.titre)}</h3><p>${pcEsc(o.nom)}</p></div></div>
        <div class="code-box">
            <div><small>Identifiant</small><strong>${pcEsc(o.identifiant)}</strong></div>
            <div><small>Code provisoire</small><strong class="code" id="codeValeur">${pcEsc(o.code)}</strong></div>
        </div>
        <p class="text-secondary small mb-0">Remettez ces informations à la personne. Le code n'est affiché qu'une seule fois : il est ensuite enregistré de façon chiffrée. À sa première connexion, elle pourra choisir son propre mot de passe.</p>
        <div class="acct-actions">
            <button class="btn btn-secondary" onclick="navigator.clipboard && navigator.clipboard.writeText(document.getElementById('codeValeur').textContent).then(()=>uiToast('Code copié.','ok'))"><i class="bi bi-clipboard"></i> Copier le code</button>
            <button class="btn btn-secondary" onclick="imprimerCode(${JSON.stringify(o).replace(/"/g, '&quot;')})"><i class="bi bi-printer"></i> Imprimer</button>
            <button class="btn btn-primary" onclick="closeAcctModal()">Terminé</button>
        </div>`);
}
function imprimerCode(o) {
    const etab = (typeof getEtab === 'function') ? getEtab() : { nom: config.name };
    const w = window.open('', '_blank', 'width=640,height=560');
    if (!w) return;
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Code d'accès</title>
        <style>body{font-family:Arial,sans-serif;padding:32px;color:#0F172A}h1{font-size:20px;margin:0 0 4px}p{color:#475569}
        .box{border:2px dashed #94A3B8;border-radius:12px;padding:20px;margin:20px 0}.box div{margin:8px 0}.code{font-size:26px;font-weight:700;letter-spacing:3px}</style></head>
        <body><h1>${pcEsc(etab.nom || config.name)}</h1><p>${pcEsc(o.titre)} — ${pcEsc(o.nom)}</p>
        <div class="box"><div>Adresse : ${pcEsc(location.href.split('?')[0])}</div><div>Identifiant : <strong>${pcEsc(o.identifiant)}</strong></div><div>Code provisoire : <span class="code">${pcEsc(o.code)}</span></div></div>
        <p>À la première connexion, choisissez votre propre mot de passe. Ne communiquez jamais votre mot de passe.</p>
        <p style="font-size:12px">Remis le ${new Date().toLocaleDateString('fr-FR')}</p><script>window.print()<\/script></body></html>`);
    w.document.close();
}

// ---------------------------------------------------------------
// Mot de passe oublié (écran de connexion)
// ---------------------------------------------------------------
let fgType = 'parent';
function showForgot() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('forgotDone').classList.add('hidden');
    document.getElementById('forgotForm').classList.remove('hidden');
    document.getElementById('fgError').classList.add('hidden');
    const id = (document.getElementById('loginUser').value || '').trim();
    if (id) { document.getElementById('fgLogin').value = id; setForgotType(Comptes.estTelephone(id) ? 'parent' : 'personnel'); }
}
function hideForgot() {
    ['forgotForm', 'forgotDone'].forEach(i => { const e = document.getElementById(i); if (e) e.classList.add('hidden'); });
    const lf = document.getElementById('loginForm'); if (lf) lf.classList.remove('hidden');
}
function setForgotType(t) {
    fgType = t;
    document.querySelectorAll('#fgType button').forEach(b => b.classList.toggle('on', b.dataset.v === t));
    document.getElementById('fgLoginLabel').textContent = t === 'parent' ? 'Numéro de téléphone' : 'Identifiant';
    document.getElementById('fgLogin').placeholder = t === 'parent' ? 'Ex : 06 555 12 34' : 'Votre identifiant de connexion';
}
function envoyerDemande() {
    const err = t => { document.getElementById('fgErrorText').textContent = t; document.getElementById('fgError').classList.remove('hidden'); };
    const login = document.getElementById('fgLogin').value.trim(), nom = document.getElementById('fgNom').value.trim(), msg = document.getElementById('fgMsg').value.trim();
    if (!login) return err(fgType === 'parent' ? 'Saisissez votre numéro de téléphone.' : 'Saisissez votre identifiant.');
    if (!nom) return err('Saisissez votre nom et prénom.');
    let key;
    // Le système n'accepte la demande que pour une personne existante
    if (fgType === 'parent') {
        const p = Comptes.trouverParent(login);
        if (!p) return err("Aucun parent n'est enregistré avec ce numéro. Vérifiez le numéro ou adressez-vous à l'école.");
        key = p.key;
    } else {
        const u = config.users.find(x => (x.login || '').toLowerCase() === login.toLowerCase());
        if (!u) return err("Aucun compte du personnel n'existe avec cet identifiant.");
        key = u.login;
    }
    const all = Comptes.demandes();
    if (all.some(d => d.status === 'en_attente' && d.type === fgType && String(d.login).toLowerCase() === String(key).toLowerCase()))
        return err('Une demande est déjà en attente de validation pour ce compte. L\'administration va la traiter.');
    all.unshift({ id: 'r' + Date.now(), type: fgType, login: key, loginSaisi: login, nomDeclare: nom, message: msg, date: new Date().toISOString(), status: 'en_attente' });
    Comptes.sauverDemandes(all);
    document.getElementById('forgotForm').classList.add('hidden');
    document.getElementById('forgotDone').classList.remove('hidden');
    ['fgLogin', 'fgNom', 'fgMsg'].forEach(i => document.getElementById(i).value = '');
}

// ---------------------------------------------------------------
// Administration : personnel
// ---------------------------------------------------------------
function etatMdp(u) {
    if (u.active === false) return '<span class="ui-pill danger">Désactivé</span>';
    if (u.hash) return u.mustChange ? '<span class="ui-pill warn">Code provisoire</span>' : '<span class="ui-pill ok">Personnel</span>';
    if (u.password) return '<span class="ui-pill info">Défini</span>';
    return '<span class="ui-pill">Aucun</span>';
}
function codeProvisoireUser(id) {
    const u = config.users.find(x => x.id === id); if (!u) return;
    if (!confirm(`Générer un nouveau code provisoire pour « ${u.nom} » ? Son mot de passe actuel ne fonctionnera plus.`)) return;
    const code = Comptes.genererCode();
    Comptes.definir(u, code, true);
    saveConfig(); renderUsers();
    afficherCode({ titre: 'Code provisoire du personnel', nom: u.nom + ' — ' + (u.role || ''), code, identifiant: u.login || '(à définir)' });
}

// ---------------------------------------------------------------
// Administration : comptes parents
// ---------------------------------------------------------------
function etatParent(acc) {
    if (!acc) return '<span class="ui-pill">Non activé</span>';
    if (acc.active === false) return '<span class="ui-pill danger">Désactivé</span>';
    if (acc.mustChange) return '<span class="ui-pill warn">Code provisoire</span>';
    return '<span class="ui-pill ok">Actif</span>';
}
function renderParents() {
    const body = document.getElementById('parentsBody'); if (!body) return;
    const q = (document.getElementById('parSearch').value || '').toLowerCase().trim(), qd = q.replace(/\D/g, '');
    const comptes = Comptes.comptesParents();
    let list = Object.values(Comptes.registreParents());
    if (q) list = list.filter(p => (p.nom || '').toLowerCase().includes(q) || (qd.length >= 3 && p.key.includes(qd)) ||
        p.enfants.some(e => (`${e.nom} ${e.prenom} ${e.matricule || ''}`).toLowerCase().includes(q)));
    list.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
    if (!list.length) {
        body.innerHTML = `<tr><td colspan="5" class="text-center text-secondary py-4">${q ? 'Aucun parent ne correspond à la recherche.' : 'Aucun parent pour le moment. Les parents apparaissent automatiquement quand un élève est enregistré avec le nom et le téléphone de son tuteur (Direction de la scolarité).'}</td></tr>`;
        return;
    }
    body.innerHTML = list.map(p => {
        const acc = comptes[p.key];
        const enf = p.enfants.map(e => `<div>${pcEsc(e.nom)} ${pcEsc(e.prenom)} <span class="text-secondary">· ${pcEsc(e.classe || '')}</span></div>`).join('');
        return `<tr>
            <td><strong>${pcEsc(p.nom || 'Tuteur sans nom')}</strong>${acc && acc.lastLogin ? `<div class="text-secondary small">Dernière connexion : ${pcDate(acc.lastLogin)}</div>` : ''}</td>
            <td style="white-space:nowrap;">${pcEsc(p.telephone)}</td>
            <td style="font-size:.85rem;">${enf}</td>
            <td>${etatParent(acc)}</td>
            <td style="text-align:right;white-space:nowrap;">
                <button class="btn btn-primary btn-sm" onclick="codeParent('${p.key}')"><i class="bi bi-key"></i> ${acc ? 'Nouveau code' : 'Créer le code'}</button>
                ${acc ? `<button class="btn btn-secondary btn-sm" onclick="basculerParent('${p.key}')" title="${acc.active === false ? 'Réactiver' : 'Désactiver'}"><i class="bi bi-${acc.active === false ? 'unlock' : 'lock'}"></i></button>` : ''}
            </td></tr>`;
    }).join('');
}
function codeParent(key) {
    const p = Comptes.trouverParent(key); if (!p) return uiToast('Ce parent n\'existe plus dans le registre des élèves.', 'err');
    const acc = Comptes.compteParent(key);
    if (acc && !confirm(`Générer un nouveau code pour « ${p.nom} » ? L'ancien mot de passe ne fonctionnera plus.`)) return;
    const code = Comptes.creerCodeParent(key);
    renderParents();
    afficherCode({ titre: 'Code d\'accès parent', nom: (p.nom || 'Parent') + ' — ' + p.enfants.map(e => e.prenom + ' ' + e.nom).join(', '), code, identifiant: p.telephone });
}
function basculerParent(key) {
    const acc = Comptes.compteParent(key); if (!acc) return;
    acc.active = acc.active === false;
    Comptes.sauverCompteParent(key, acc);
    renderParents();
    uiToast(acc.active ? 'Compte parent réactivé.' : 'Compte parent désactivé.', 'ok');
}

// ---------------------------------------------------------------
// Administration : demandes de réinitialisation
// ---------------------------------------------------------------
function verifDemande(d) {
    if (d.type === 'parent') {
        const p = Comptes.trouverParent(d.login);
        return p ? { ok: true, html: `<strong>${pcEsc(p.nom || 'Tuteur sans nom')}</strong> · ${pcEsc(p.telephone)}<br><span class="text-secondary">Tuteur de : ${p.enfants.map(e => pcEsc(e.prenom + ' ' + e.nom) + ' (' + pcEsc(e.classe || '-') + ')').join(', ')}</span>` }
            : { ok: false, html: 'Aucun parent avec ce numéro dans le registre des élèves.' };
    }
    const u = config.users.find(x => (x.login || '').toLowerCase() === String(d.login).toLowerCase());
    return u ? { ok: true, html: `<strong>${pcEsc(u.nom)}</strong> · identifiant ${pcEsc(u.login)}<br><span class="text-secondary">Rôle : ${pcEsc(u.role || '-')}</span>` }
        : { ok: false, html: "Aucun compte du personnel avec cet identifiant." };
}
function renderDemandes() {
    const all = Comptes.demandes();
    const att = all.filter(d => d.status === 'en_attente'), box = document.getElementById('demandesEnAttente');
    box.innerHTML = att.length ? att.map(d => {
        const v = verifDemande(d);
        return `<div class="req-card">
            <div class="req-main">
                <div class="req-top"><span class="ui-pill ${d.type === 'parent' ? 'info' : 'violet'}">${d.type === 'parent' ? 'Parent' : 'Personnel'}</span><span class="text-secondary small">${pcDate(d.date)}</span></div>
                <div class="req-grid">
                    <div><small>Déclare s'appeler</small><strong>${pcEsc(d.nomDeclare)}</strong></div>
                    <div><small>${d.type === 'parent' ? 'Téléphone saisi' : 'Identifiant'}</small><strong>${pcEsc(d.loginSaisi || d.login)}</strong></div>
                </div>
                ${d.message ? `<p class="req-msg">« ${pcEsc(d.message)} »</p>` : ''}
                <div class="req-check ${v.ok ? 'ok' : 'ko'}"><i class="bi bi-${v.ok ? 'person-check' : 'person-x'}"></i><div><small>Trouvé dans le système</small><div>${v.html}</div></div></div>
            </div>
            <div class="req-actions">
                <button class="btn btn-primary btn-sm" ${v.ok ? '' : 'disabled'} onclick="validerDemande('${d.id}')"><i class="bi bi-check-lg"></i> Valider et générer un code</button>
                <button class="btn btn-danger btn-sm" onclick="refuserDemande('${d.id}')"><i class="bi bi-x-lg"></i> Refuser</button>
            </div></div>`;
    }).join('') : '<div class="empty-mini"><i class="bi bi-check2-all"></i> Aucune demande en attente.</div>';
    const histo = all.filter(d => d.status !== 'en_attente').slice(0, 40);
    document.getElementById('demandesHisto').innerHTML = histo.length ? histo.map(d => `<tr><td>${pcDate(d.traiteLe || d.date)}</td><td>${d.type === 'parent' ? 'Parent' : 'Personnel'}</td><td>${pcEsc(d.loginSaisi || d.login)}</td><td>${pcEsc(d.nomDeclare)}</td><td>${d.status === 'validee' ? '<span class="ui-pill ok">Validée</span>' : '<span class="ui-pill danger">Refusée</span>'}</td></tr>`).join('')
        : '<tr><td colspan="5" class="text-center text-secondary py-3">Aucune demande traitée.</td></tr>';
}
function validerDemande(id) {
    const all = Comptes.demandes(), d = all.find(x => x.id === id); if (!d) return;
    const v = verifDemande(d);
    if (!v.ok) return uiToast('Impossible : cette personne n\'existe pas dans le système.', 'err');
    if (!confirm(`Confirmez-vous avoir vérifié l'identité de « ${d.nomDeclare} » ? Un nouveau code provisoire va être généré.`)) return;
    let code, info;
    if (d.type === 'parent') {
        const p = Comptes.trouverParent(d.login);
        code = Comptes.creerCodeParent(p.key);
        info = { titre: 'Nouveau code d\'accès parent', nom: (p.nom || 'Parent') + ' — ' + p.enfants.map(e => e.prenom + ' ' + e.nom).join(', '), identifiant: p.telephone };
    } else {
        const u = config.users.find(x => (x.login || '').toLowerCase() === String(d.login).toLowerCase());
        code = Comptes.genererCode(); Comptes.definir(u, code, true); saveConfig();
        info = { titre: 'Nouveau code du personnel', nom: u.nom + ' — ' + (u.role || ''), identifiant: u.login };
    }
    d.status = 'validee'; d.traiteLe = new Date().toISOString();
    Comptes.sauverDemandes(all);
    renderDemandes(); majCompteurs();
    afficherCode(Object.assign(info, { code }));
}
function refuserDemande(id) {
    if (!confirm('Refuser cette demande ? Le mot de passe actuel ne change pas.')) return;
    const all = Comptes.demandes(), d = all.find(x => x.id === id); if (!d) return;
    d.status = 'refusee'; d.traiteLe = new Date().toISOString();
    Comptes.sauverDemandes(all); renderDemandes(); majCompteurs();
}

// ---------------------------------------------------------------
// Administration : préoccupations des parents
// ---------------------------------------------------------------
const PREOC_STATUTS = { envoyee: ['Nouvelle', 'info'], lue: ['Lue', 'violet'], repondue: ['Répondue', 'ok'], traitee: ['Traitée', 'ok'] };
function pillPreoc(st) { const s = PREOC_STATUTS[st] || ['-', '']; return `<span class="ui-pill ${s[1]}">${s[0]}</span>`; }
// Qui reçoit les préoccupations : tous les profils administratifs, sauf les enseignants
function estEnseignant(role) {
    const d = (config.directions || []).find(x => x.name === role);
    return !!(d && (d.url || '').toLowerCase() === 'enseignant.html');
}
function recoitPreoc() {
    const s = currentSession || {};
    if (!s.role) return false;
    if (s.role === 'Parent') return false;
    return !estEnseignant(s.role);
}
function preocOuvertes() { return Comptes.preoccupations().filter(p => p.status === 'envoyee' || p.status === 'lue'); }

function renderPreocInto(listId, filtreId, px) {
    const box = document.getElementById(listId), sel = document.getElementById(filtreId);
    if (!box || !sel) return;
    const all = Comptes.preoccupations(), f = sel.value;
    const list = all.filter(p => f === 'toutes' ? true : f === 'traitee' ? p.status === 'traitee' : p.status !== 'traitee');
    box.innerHTML = list.length ? list.map(p => `
        <div class="preoc-card">
            <div class="preoc-head">
                <div><strong>${pcEsc(p.sujet)}</strong><div class="text-secondary small">${pcEsc(p.parentNom)}${p.parentTel ? ' · ' + pcEsc(p.parentTel) : ''} · pour ${pcEsc(p.eleveNom)} · ${pcEsc(p.service)}</div></div>
                <div class="text-end">${pillPreoc(p.status)}<div class="text-secondary small mt-1">${pcDate(p.date)}</div></div>
            </div>
            <div class="preoc-msg">${pcEsc(p.message)}</div>
            ${(p.reponses || []).map(r => `<div class="preoc-rep ${r.auteur === 'parent' ? 'par' : 'eco'}"><small>${r.auteur === 'parent' ? 'Parent' : 'École' + (r.nom ? ' · ' + pcEsc(r.nom) : '')} · ${pcDate(r.date)}</small><div>${pcEsc(r.texte)}</div></div>`).join('')}
            ${p.status === 'traitee' && p.traiteePar ? `<div class="text-secondary small mt-2"><i class="bi bi-check2-all"></i> Traitée par ${pcEsc(p.traiteePar)}</div>` : ''}
            ${p.status !== 'traitee' ? `<textarea class="form-control mt-2" rows="2" id="rep_${px}${p.id}" placeholder="Répondre au parent…"></textarea>
            <div class="d-flex gap-2 justify-content-end mt-2">
                <button class="btn btn-secondary btn-sm" onclick="statutPreoc('${p.id}','traitee')"><i class="bi bi-check2-all"></i> Marquer traitée</button>
                <button class="btn btn-primary btn-sm" onclick="repondrePreoc('${p.id}','${px}')"><i class="bi bi-send"></i> Répondre</button>
            </div>` : `<div class="text-end mt-2"><button class="btn btn-link btn-sm" onclick="statutPreoc('${p.id}','lue')">Rouvrir</button></div>`}
        </div>`).join('') : `<div class="empty-mini"><i class="bi bi-inbox"></i> ${f === 'traitee' ? 'Aucune préoccupation traitée.' : 'Aucune préoccupation à traiter.'}</div>`;
}
// marquerLu : les nouvelles préoccupations passent à « Lue » quand quelqu'un les affiche
function renderPreoc(marquerLu) {
    if (marquerLu !== false) {
        const all = Comptes.preoccupations(); let changed = false;
        all.forEach(p => { if (p.status === 'envoyee') { p.status = 'lue'; changed = true; } });
        if (changed) Comptes.sauverPreoccupations(all);
    }
    renderPreocInto('preocList', 'preocFiltre', 'a');
    const hb = document.getElementById('homePreocBody');
    if (hb && !hb.classList.contains('hidden')) renderPreocInto('preocListHome', 'preocFiltreHome', 'h');
    majCompteurs();
}
function signataire() { const s = currentSession || {}; return (s.nom && s.nom !== s.role ? s.nom + ' — ' : '') + (s.role || 'Administration'); }
function repondrePreoc(id, px) {
    const t = (document.getElementById('rep_' + (px || 'a') + id).value || '').trim();
    if (!t) return uiToast('Écrivez une réponse avant d\'envoyer.', 'warn');
    const all = Comptes.preoccupations(), p = all.find(x => x.id === id); if (!p) return;
    (p.reponses = p.reponses || []).push({ auteur: 'ecole', nom: signataire(), texte: t, date: new Date().toISOString() });
    p.status = 'repondue';
    Comptes.sauverPreoccupations(all); renderPreoc();
    uiToast('Réponse envoyée au parent.', 'ok');
}
function statutPreoc(id, st) {
    const all = Comptes.preoccupations(), p = all.find(x => x.id === id); if (!p) return;
    p.status = st;
    if (st === 'traitee') { p.traiteePar = signataire(); p.traiteeLe = new Date().toISOString(); }
    Comptes.sauverPreoccupations(all); renderPreoc();
}

// Encadré « Préoccupations des parents » sur l'accueil du portail
function majHomePreoc() {
    const box = document.getElementById('homePreoc'); if (!box) return;
    if (!recoitPreoc()) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    const all = Comptes.preoccupations(), nouv = all.filter(p => p.status === 'envoyee').length, ouv = preocOuvertes().length;
    const repondues = all.filter(p => p.status === 'repondue').length;
    const parts = [ouv ? ouv + ' en attente de réponse' : '', nouv ? nouv + ' nouvelle(s)' : '', repondues ? repondues + ' répondue(s), à clôturer' : ''].filter(Boolean);
    document.getElementById('homePreocSub').textContent = parts.length ? parts.join(' · ') : 'Tout est traité';
    const c = document.getElementById('homePreocCount'); c.textContent = ouv; c.classList.toggle('hidden', !ouv);
}
function toggleHomePreoc(forcer) {
    const body = document.getElementById('homePreocBody'), btn = document.getElementById('homePreocBtn');
    const ouvrir = forcer === true ? true : body.classList.contains('hidden');
    body.classList.toggle('hidden', !ouvrir);
    btn.innerHTML = ouvrir ? '<i class="bi bi-chevron-up"></i> Masquer' : '<i class="bi bi-chevron-down"></i> Afficher';
    if (ouvrir) { renderPreoc(true); renderPreocInto('preocListHome', 'preocFiltreHome', 'h'); }
    majHomePreoc();
}

// ---------------------------------------------------------------
// Compteurs et bouton « Mot de passe »
// ---------------------------------------------------------------
function majCompteurs() {
    const set = (id, n) => { const e = document.getElementById(id); if (!e) return; e.textContent = n; e.classList.toggle('hidden', !n); };
    set('countDemandes', Comptes.demandesEnAttente().length);
    set('countPreoc', preocOuvertes().length);
    majHomePreoc();
}
(function () {
    const base = enterApp;
    enterApp = function () {
        base();
        const b = document.getElementById('btnMonMdp');
        if (b) b.classList.toggle('hidden', !compteSession());
        majCompteurs();
        // rappels : demandes (administrateur) et préoccupations (tout le personnel administratif)
        const s = currentSession || {};
        const admin = s.role === 'Administrateur' || s.role === '*';
        const n = admin ? Comptes.demandesEnAttente().length : 0;
        const m = recoitPreoc() ? Comptes.preoccupations().filter(p => p.status === 'envoyee').length : 0;
        if (n || m) setTimeout(() => uiToast([n ? n + ' demande(s) de mot de passe à valider (Espace admin)' : '', m ? m + ' nouvelle(s) préoccupation(s) de parents (accueil du portail)' : ''].filter(Boolean).join(' · '), 'info'), 600);
        if (new URLSearchParams(location.search).get('preoc') === '1') { history.replaceState(null, '', location.pathname); if (recoitPreoc()) { toggleHomePreoc(true); setTimeout(() => document.getElementById('homePreoc').scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); } }
    };
})();
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !document.getElementById('acctModal').classList.contains('hidden') && !pwOpts.first) closeAcctModal(); });

// ---------------------------------------------------------------
// Paramètres : moyens de paiement à distance
// ---------------------------------------------------------------
function fillPaiementDistance() {
    const c = Comptes.paiementConfig(), set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v || ''; };
    set('payMtnNum', c.mtn.numero); set('payMtnNom', c.mtn.nom); set('payAirtelNum', c.airtel.numero); set('payAirtelNom', c.airtel.nom);
    set('payBanque', c.banque.banque); set('payTitulaire', c.banque.titulaire); set('payRib', c.banque.rib);
    renderEnLigne(null);
}
function savePaiementDistance() {
    const v = id => document.getElementById(id).value.trim();
    const old = Comptes.paiementConfig();
    Comptes.sauverPaiementConfig({ mtn: { numero: v('payMtnNum'), nom: v('payMtnNom') }, airtel: { numero: v('payAirtelNum'), nom: v('payAirtelNom') }, banque: { banque: v('payBanque'), titulaire: v('payTitulaire'), rib: v('payRib') }, enLigne: old.enLigne || {} });
    uiToast('Moyens de paiement enregistrés : ils sont affichés aux parents.', 'ok');
}

// ---------------------------------------------------------------
// Paramètres : paiement en ligne (activation par opérateur)
// ---------------------------------------------------------------
let srvEtat = null;
function renderEnLigne(etat) {
    if (etat !== undefined) srvEtat = etat;
    const box = document.getElementById('enLigneEtat'); if (!box) return;
    const act = (Comptes.paiementConfig().enLigne) || {};
    const ligne = (id, nom) => {
        const st = srvEtat && srvEtat.ok ? srvEtat[id] : null;
        const pret = !!(st && st.actif && st.configure);
        let info;
        if (!srvEtat) info = 'Cliquez sur « Vérifier le serveur » pour contrôler la configuration.';
        else if (!srvEtat.ok) info = 'Serveur non vérifié.';
        else if (!st.configure) info = 'Clés manquantes dans la configuration du serveur : ' + st.manquant.join(', ') + '.';
        else if (!st.actif) info = 'Clés présentes mais « actif » vaut false dans la configuration du serveur.';
        else info = 'Prêt — mode ' + (st.environnement === 'sandbox' ? 'TEST (sandbox, aucun vrai argent)' : 'PRODUCTION') + (st.devise ? ' · devise ' + st.devise : '') + '.';
        return `<div class="srv-op">
            <div class="srv-op-txt"><strong>${nom}</strong><small>${pcEsc(info)}</small></div>
            <label class="switch" title="${pret || act[id] ? '' : 'Disponible quand le serveur est prêt'}">
                <input type="checkbox" ${act[id] ? 'checked' : ''} ${pret || act[id] ? '' : 'disabled'} onchange="basculerEnLigne('${id}', this.checked)"><span></span>
            </label>
            <span class="ui-pill ${act[id] ? 'ok' : ''}">${act[id] ? 'Activé pour les parents' : 'Désactivé'}</span>
        </div>`;
    };
    const tete = !srvEtat ? '' : srvEtat.ok
        ? `<div class="srv-ok"><i class="bi bi-hdd-network"></i> Serveur joignable · PHP ${pcEsc(srvEtat.php)} · ${srvEtat.configuration_trouvee ? 'fichier de configuration trouvé' : '<strong>aucun fichier de configuration</strong> (voir api/LISEZ-MOI-PAIEMENT.txt)'}</div>`
        : `<div class="srv-ko"><i class="bi bi-plug"></i> ${pcEsc(srvEtat.erreur || 'Serveur injoignable.')}</div>`;
    box.innerHTML = tete + ligne('mtn', 'MTN Mobile Money') + ligne('airtel', 'Airtel Money');
}
async function verifierServeurPaiement() {
    const box = document.getElementById('enLigneEtat');
    box.insertAdjacentHTML('afterbegin', '<div class="srv-ok" id="srvChk"><span class="spin"></span> Vérification…</div>');
    const r = await Paiement.enLigne.statutServeur();
    renderEnLigne(r);
}
function basculerEnLigne(id, on) {
    const c = Comptes.paiementConfig();
    c.enLigne = c.enLigne || {};
    if (on && !(srvEtat && srvEtat.ok && srvEtat[id] && srvEtat[id].actif && srvEtat[id].configure)) { uiToast('Le serveur n\'est pas prêt pour cet opérateur.', 'err'); renderEnLigne(); return; }
    if (on && srvEtat[id].environnement === 'sandbox' && !confirm('Ce serveur est en mode TEST (sandbox) : aucun vrai argent ne sera prélevé. Activer quand même pour les essais ?')) { renderEnLigne(); return; }
    c.enLigne[id] = on;
    Comptes.sauverPaiementConfig(c);
    renderEnLigne();
    uiToast(on ? 'Paiement en ligne activé : les parents voient « Payer maintenant ».' : 'Paiement en ligne désactivé. La déclaration manuelle reste disponible.', 'ok');
}
