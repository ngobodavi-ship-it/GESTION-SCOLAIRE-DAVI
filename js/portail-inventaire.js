// =====================================================================
// Espace admin — « Toutes les données » : inventaire complet de ce que
// contient l'application, avec accès au module qui gère chaque donnée,
// export et suppression (sauvegarde téléchargée automatiquement avant).
// =====================================================================
const INVENTAIRE = [
    ['Établissement et portail', [
        ['ecole_params', 'Identité de l\'établissement', 'Nom, logo, ville, coordonnées, chef d\'établissement', 'bi-building', 'admin:settings', false],
        ['portail_config_v1', 'Portail : directions et comptes du personnel', 'Modules affichés, comptes et rôles du personnel', 'bi-grid-1x2', 'admin:directions', false],
        ['ecole_comptes_parents', 'Comptes parents', 'Codes d\'accès des parents (chiffrés)', 'bi-person-hearts', 'admin:parents', true],
        ['ecole_demandes_reinit', 'Demandes de mot de passe oublié', 'Demandes en attente et historique', 'bi-key', 'admin:demandes', true],
        ['ecole_preoccupations', 'Préoccupations des parents', 'Messages des parents et réponses de l\'école', 'bi-chat-left-text', 'admin:preoc', true],
    ]],
    ['Direction de la scolarité', [
        ['ecole_eleves', 'Élèves', 'Registre des élèves (identité, classe, tuteur, téléphone)', 'bi-people', 'scolarite.html#eleves', true],
        ['ecole_classes', 'Classes', 'Préscolaire, primaire, secondaire', 'bi-grid-3x3-gap', 'scolarite.html#classes', true],
        ['ecole_dossiers', 'Dossiers d\'inscription', 'Suivi des pièces fournies', 'bi-folder-check', 'scolarite.html#dossiers', true],
        ['ecole_dossiers_pieces', 'Liste des pièces demandées', 'Pièces du dossier d\'inscription', 'bi-list-check', 'scolarite.html#dossiers', true],
        ['ecole_preinscriptions', 'Pré-inscriptions', '', 'bi-person-plus', 'scolarite.html#preinscription', true],
        ['ecole_plan_action', 'Plan d\'action', '', 'bi-list-task', 'scolarite.html#plan', true],
        ['ecole_conseils_maitres', 'Conseils de maîtres', '', 'bi-people-fill', 'scolarite.html#conseils', true],
        ['ecole_examens', 'Examens', '', 'bi-journal-check', 'scolarite.html#examens', true],
    ]],
    ['Direction des études', [
        ['ecole_matieres', 'Matières et coefficients', 'Primaire, collège, lycée', 'bi-journal-bookmark', 'etudes.html#matieres', true],
        ['ecole_enseignants', 'Enseignants', '', 'bi-person-workspace', 'etudes.html#enseignants', true],
        ['ecole_notes', 'Notes', 'Devoirs et compositions', 'bi-pencil-square', 'etudes.html#notes', true],
        ['ecole_notes_historique', 'Historique des modifications de notes', '', 'bi-clock-history', 'etudes.html#notes', true],
        ['ecole_appreciations', 'Appréciations et décisions du conseil', '', 'bi-chat-quote', 'etudes.html#bulletins', true],
        ['ecole_presco_config', 'Préscolaire : domaines, compétences, niveaux', 'Paramètres de l\'évaluation du préscolaire', 'bi-balloon', 'etudes.html#presco', true],
        ['ecole_presco_evals', 'Préscolaire : évaluations', 'Appréciations des élèves de P1, P2, P3', 'bi-check2-square', 'etudes.html#presco', true],
        ['ecole_archives', 'Archives des années', '', 'bi-archive', 'etudes.html#archives', true],
        ['ecole_cahier_textes', 'Cahier de textes', '', 'bi-journal-text', 'etudes.html#cahier', true],
        ['ecole_assiduite', 'Assiduité du personnel', '', 'bi-calendar2-check', 'etudes.html#assiduite', true],
        ['ecole_edt', 'Emplois du temps', '', 'bi-calendar3', 'etudes.html#edt', true],
        ['ecole_heures', 'Heures de cours déclarées', 'Déclarations et validations', 'bi-clock', 'etudes.html#heures', true],
    ]],
    ['Surveillance et discipline', [
        ['ecole_presences', 'Appels et absences', '', 'bi-check2-square', 'surveillance.html#appel', true],
        ['ecole_retards', 'Retards', '', 'bi-alarm', 'surveillance.html#retards', true],
        ['ecole_sanctions', 'Sanctions', '', 'bi-exclamation-triangle', 'surveillance.html#sanctions', true],
        ['ecole_permissions', 'Permissions', '', 'bi-box-arrow-right', 'surveillance.html#permissions', true],
        ['ecole_convocations', 'Convocations des parents', '', 'bi-envelope-paper', 'surveillance.html#convocations', true],
    ]],
    ['Secrétariat', [
        ['ecole_courrier', 'Courrier', 'Arrivée et départ', 'bi-envelope', 'secretariat.html#courrier', true],
        ['ecole_documents', 'Documents et archives', '', 'bi-folder2', 'secretariat.html#documents', true],
        ['ecole_notes_service', 'Notes de service', '', 'bi-file-text', 'secretariat.html#notes', true],
        ['ecole_communications', 'Communication avec les parents', '', 'bi-chat-dots', 'secretariat.html#communication', true],
    ]],
    ['Direction générale', [
        ['ecole_personnel', 'Personnel', '', 'bi-people-fill', 'direction.html#personnel', true],
        ['ecole_decisions', 'Décisions et circulaires', '', 'bi-megaphone', 'direction.html#decisions', true],
        ['ecole_conseils', 'Conseil de gestion', '', 'bi-people', 'direction.html#conseil', true],
    ]],
    ['Gestion financière (DigiGesPro)', [
        ['digigespro_transactions', 'Transactions', 'Paiements, frais et dépenses', 'bi-credit-card', 'app.html#transactions', true],
        ['digigespro_students', 'Élèves de la caisse', 'Synchronisés avec la scolarité', 'bi-mortarboard', 'app.html#eleves', true],
        ['ecole_grille_tarifaire', 'Grille tarifaire', 'Frais par classe', 'bi-cash-coin', 'app.html#tarifs', true],
        ['ecole_reductions', 'Réductions et bourses', '', 'bi-percent', 'app.html#reductions', true],
        ['ecole_echeanciers', 'Échéanciers de paiement', '', 'bi-calendar-check', 'app.html#echeancier', true],
        ['ecole_budget', 'Budget', '', 'bi-pie-chart', 'app.html#budget', true],
        ['ecole_paiements_declares', 'Paiements déclarés et en ligne', 'Mobile Money, virements', 'bi-phone', 'app.html#paiements-declares', true],
        ['ecole_clotures_caisse', 'Clôtures de caisse', 'Rapprochements de fin de journée', 'bi-calculator', 'app.html#cloture-caisse', true],
        ['ecole_paiement_distance', 'Moyens de paiement à distance', 'Numéros marchands, compte bancaire, activation en ligne', 'bi-wallet2', 'admin:settings', true],
        ['digigespro_employees', 'Employés', '', 'bi-briefcase', 'app.html#salaires', true],
        ['digigespro_salaires_enseignants', 'Salaires des enseignants', '', 'bi-cash-stack', 'app.html#enseignants', true],
        ['digigespro_primes_enseignants', 'Primes des enseignants', '', 'bi-gift', 'app.html#enseignants', true],
        ['ecole_frais_config', 'Configuration des frais', '', 'bi-gear', 'app.html#tarifs', true],
    ]],
    ['Calendrier', [
        ['ecole_evenements', 'Événements du calendrier', 'Rentrée, congés, examens, réunions', 'bi-calendar-event', 'calendrier.html', true],
    ]],
];

function invCompter(cle) {
    const brut = localStorage.getItem(cle);
    if (brut == null || brut === '') return { n: 0, taille: 0 };
    let n = 1;
    try { const v = JSON.parse(brut); n = Array.isArray(v) ? v.length : (v && typeof v === 'object') ? Object.keys(v).length : (v === '' ? 0 : 1); } catch (e) { n = 1; }
    return { n, taille: brut.length };
}
function invTaille(o) { return o < 1024 ? o + ' o' : o < 1048576 ? (o / 1024).toFixed(1) + ' Ko' : (o / 1048576).toFixed(2) + ' Mo'; }

function renderInventaire() {
    const box = document.getElementById('inventaireListe'); if (!box) return;
    let total = 0, totalTaille = 0;
    const connues = new Set();
    box.innerHTML = INVENTAIRE.map(([cat, lignes]) => `<div class="inv-cat">${pcEsc(cat)}</div>` + lignes.map(([cle, nom, desc, ico, lien, vidable]) => {
        connues.add(cle);
        const c = invCompter(cle); total += c.n; totalTaille += c.taille;
        const ouvrir = lien.indexOf('admin:') === 0 ? `showAdminSection('${lien.slice(6)}')` : `location.href='${lien}'`;
        return `<div class="inv-row ${c.n ? '' : 'vide'}">
            <span class="inv-ico"><i class="bi ${ico}"></i></span>
            <div class="inv-txt"><strong>${pcEsc(nom)}</strong><small>${pcEsc(desc || '')}${desc ? ' · ' : ''}${invTaille(c.taille)}</small></div>
            <span class="inv-n">${c.n}</span>
            <div class="d-flex gap-2">
                <button class="btn btn-secondary btn-sm" onclick="${ouvrir}" title="Ouvrir pour consulter, modifier ou supprimer"><i class="bi bi-box-arrow-up-right"></i> Gérer</button>
                <button class="btn btn-secondary btn-sm" ${c.n ? '' : 'disabled'} onclick="invExporter('${cle}','${pcEsc(nom).replace(/'/g, '&#39;')}')" title="Télécharger"><i class="bi bi-download"></i></button>
                ${vidable ? `<button class="btn btn-danger btn-sm" ${c.n ? '' : 'disabled'} onclick="invVider('${cle}','${pcEsc(nom).replace(/'/g, '&#39;')}')" title="Tout supprimer"><i class="bi bi-trash3"></i></button>` : ''}
            </div></div>`;
    }).join('')).join('');
    // données présentes mais non répertoriées (sécurité : rien n'est caché à l'administrateur)
    const autres = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (/^(ecole_|digigespro_)/.test(k) && !connues.has(k) && k !== 'ecole_classes_cycles_v2' && k !== 'ecole_nom' && k !== 'ecole_mois_scolarite' && k !== 'digigespro_ecole') autres.push(k); }
    if (autres.length) box.innerHTML += '<div class="inv-cat">Autres données</div>' + autres.map(k => { const c = invCompter(k); return `<div class="inv-row"><span class="inv-ico"><i class="bi bi-database"></i></span><div class="inv-txt"><strong>${pcEsc(k)}</strong><small>${invTaille(c.taille)}</small></div><span class="inv-n">${c.n}</span><div class="d-flex gap-2"><button class="btn btn-secondary btn-sm" onclick="invExporter('${k}','${k}')"><i class="bi bi-download"></i></button><button class="btn btn-danger btn-sm" onclick="invVider('${k}','${k}')"><i class="bi bi-trash3"></i></button></div></div>`; }).join('');
    document.getElementById('inventaireResume').textContent = `${total} élément(s) au total · ${invTaille(totalTaille)} utilisés sur cet appareil`;
}
function invTelecharger(nomFichier, contenu) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([contenu], { type: 'application/json' }));
    a.download = nomFichier; document.body.appendChild(a); a.click(); a.remove();
}
function invExporter(cle, nom) {
    const d = new Date().toISOString().slice(0, 10);
    invTelecharger(`sauvegarde_${cle}_${d}.json`, JSON.stringify({ _type: 'sauvegarde_partielle', _date: new Date().toISOString(), _version: 1, noms: { [cle]: nom }, data: { [cle]: localStorage.getItem(cle) } }));
}
function invVider(cle, nom) {
    const c = invCompter(cle);
    const rep = prompt(`Supprimer définitivement « ${nom} » (${c.n} élément(s)) ?\n\nUne sauvegarde de ces données va être téléchargée avant la suppression.\nPour confirmer, tapez : SUPPRIMER`);
    if (rep === null) return;
    if (rep.trim().toUpperCase() !== 'SUPPRIMER') return uiToast('Suppression annulée : le mot de confirmation ne correspond pas.', 'warn');
    invExporter(cle, nom);
    localStorage.removeItem(cle);
    renderInventaire();
    uiToast(`« ${nom} » a été vidé. La sauvegarde a été téléchargée : « Restaurer une catégorie » permet de la remettre.`, 'ok');
}
// Restaure seulement les catégories contenues dans le fichier (le reste n'est pas touché)
function invRestaurer(event) {
    const f = event.target.files && event.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = e => {
        try {
            const p = JSON.parse(e.target.result);
            if (!p || p._type !== 'sauvegarde_partielle' || !p.data) throw new Error('Ce fichier n\'est pas la sauvegarde d\'une catégorie (pour une sauvegarde complète, utilisez « Données et sauvegardes »).');
            const cles = Object.keys(p.data).filter(k => /^(ecole_|digigespro_|portail_)/.test(k));
            if (!cles.length) throw new Error('Aucune donnée reconnue dans ce fichier.');
            const noms = cles.map(k => (p.noms && p.noms[k]) || k);
            if (!confirm(`Restaurer : ${noms.join(', ')} ?\n\nLes données actuelles de ${cles.length > 1 ? 'ces catégories' : 'cette catégorie'} seront remplacées. Les autres données ne changent pas.`)) return;
            cles.forEach(k => { if (p.data[k] == null) localStorage.removeItem(k); else localStorage.setItem(k, p.data[k]); });
            renderInventaire();
            uiToast('Restauration effectuée : ' + noms.join(', ') + '.', 'ok');
        } catch (err) { uiToast(err.message, 'err'); }
    };
    r.readAsText(f); event.target.value = '';
}

// =====================================================================
// Journal des actions (qui a modifié quoi, quand)
// =====================================================================
function invNomCle(cle) {
    for (const [, lignes] of INVENTAIRE) for (const l of lignes) if (l[0] === cle) return l[1];
    if (cle === 'ecole_restauration') return 'Restauration d\'une sauvegarde';
    return cle;
}
function journal() { try { return JSON.parse(localStorage.getItem('ecole_journal')) || []; } catch (e) { return []; } }
const JN_ACTIONS = { ajout: ['Ajout', 'ok'], modification: ['Modification', 'info'], suppression: ['Suppression', 'warn'], vidage: ['Vidage complet', 'danger'] };
function renderJournal() {
    const j = journal(), per = document.getElementById('jnPeriode').value, prof = document.getElementById('jnProfil').value, q = (document.getElementById('jnRecherche').value || '').toLowerCase();
    const profils = [...new Set(j.map(e => e.role).filter(Boolean))].sort();
    const sel = document.getElementById('jnProfil');
    if (sel.options.length !== profils.length + 1) { sel.innerHTML = '<option value="">Tous les profils</option>' + profils.map(p => `<option>${pcEsc(p)}</option>`).join(''); sel.value = prof; }
    const depuis = per === 'jour' ? new Date(new Date().toDateString()).getTime() : per === '7' ? Date.now() - 7 * 864e5 : per === '30' ? Date.now() - 30 * 864e5 : 0;
    const list = j.filter(e => e.t >= depuis && (!prof || e.role === prof) && (!q || (invNomCle(e.cle) + ' ' + e.nom + ' ' + e.role + ' ' + e.page).toLowerCase().includes(q)));
    document.getElementById('jnResume').textContent = `${list.length} action(s) affichée(s) · ${j.length} enregistrée(s) au total (les 4000 plus récentes sont gardées)`;
    document.getElementById('jnCorps').innerHTML = list.length ? list.slice(0, 500).map(e => {
        const a = JN_ACTIONS[e.action] || ['-', ''];
        return `<tr><td style="white-space:nowrap;">${pcDate(new Date(e.t).toISOString())}</td>
            <td><strong>${pcEsc(e.role)}</strong>${e.nom && e.nom !== e.role ? `<div class="text-secondary small">${pcEsc(e.nom)}</div>` : ''}</td>
            <td><span class="ui-pill ${a[1]}">${a[0]}</span>${e.n > 1 ? ` <span class="text-secondary small">×${e.n}</span>` : ''}</td>
            <td>${pcEsc(invNomCle(e.cle))}</td><td class="text-secondary small">${pcEsc(e.page)}</td>
            <td style="text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;">${e.avant} → <strong>${e.apres}</strong></td></tr>`;
    }).join('') : '<tr><td colspan="6"><div class="empty-mini"><i class="bi bi-journal"></i> Aucune action pour ces critères.</div></td></tr>';
}
function exporterJournal() {
    const lignes = [['Date', 'Profil', 'Nom', 'Action', 'Donnée', 'Page', 'Avant', 'Après', 'Regroupées']].concat(journal().map(e => [new Date(e.t).toLocaleString('fr-FR'), e.role, e.nom, (JN_ACTIONS[e.action] || [''])[0], invNomCle(e.cle), e.page, e.avant, e.apres, e.n || 1]));
    const csv = '﻿' + lignes.map(l => l.map(v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"').join(';')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'journal_actions_' + new Date().toISOString().slice(0, 10) + '.csv'; document.body.appendChild(a); a.click(); a.remove();
}
function viderJournal() {
    const rep = prompt('Effacer tout le journal des actions ? Il est conseillé de l\'exporter avant.\nPour confirmer, tapez : EFFACER');
    if (rep === null) return;
    if (rep.trim().toUpperCase() !== 'EFFACER') return uiToast('Annulé : le mot de confirmation ne correspond pas.', 'warn');
    localStorage.setItem('ecole_journal', JSON.stringify([{ t: Date.now(), cle: 'ecole_journal', role: (currentSession || {}).role || 'Administrateur', nom: (currentSession || {}).nom || '', page: 'portail', avant: 0, apres: 0, action: 'vidage' }]));
    renderJournal(); uiToast('Journal effacé (cette action reste notée).', 'ok');
}

// =====================================================================
// Copies automatiques et rappel de sauvegarde
// =====================================================================
function marquerSauvegardeTelechargee() { try { localStorage.setItem('ui_derniere_sauvegarde', String(Date.now())); } catch (e) { } }
function joursDepuisSauvegarde() { const t = Number(localStorage.getItem('ui_derniere_sauvegarde') || 0); return t ? Math.floor((Date.now() - t) / 864e5) : null; }
async function renderCopies() {
    const box = document.getElementById('copiesListe'); if (!box) return;
    const j = joursDepuisSauvegarde(), rappel = document.getElementById('rappelSauvegarde');
    rappel.innerHTML = j === null ? '<i class="bi bi-exclamation-triangle"></i> Aucune sauvegarde n\'a encore été téléchargée sur cet appareil. Téléchargez-en une et gardez-la sur une clé USB ou par e-mail.'
        : j >= 7 ? `<i class="bi bi-exclamation-triangle"></i> Dernière sauvegarde téléchargée il y a ${j} jours. Pensez à en télécharger une nouvelle.`
        : `<i class="bi bi-check-circle"></i> Dernière sauvegarde téléchargée il y a ${j === 0 ? 'moins d\'un jour' : j + ' jour(s)'}.`;
    rappel.className = 'alert ' + (j === null || j >= 7 ? 'alert-warning' : 'alert-success');
    if (!window.SecuriteDonnees) { box.innerHTML = '<div class="empty-mini">Copies automatiques indisponibles sur ce navigateur.</div>'; return; }
    let liste = [];
    try { liste = await SecuriteDonnees.lister(); } catch (e) { box.innerHTML = '<div class="empty-mini">Copies automatiques indisponibles sur ce navigateur (navigation privée ?).</div>'; return; }
    box.innerHTML = liste.length ? liste.map(c => `<div class="inv-row">
        <span class="inv-ico"><i class="bi bi-clock-history"></i></span>
        <div class="inv-txt"><strong>${new Date(c.le).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}${c.securite ? ' <span class="ui-pill info">copie de sécurité avant restauration</span>' : ''}</strong><small>Faite à ${new Date(c.le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · ${c.nb} catégorie(s) · ${invTaille(c.taille || 0)}</small></div>
        <div class="d-flex gap-2"><button class="btn btn-secondary btn-sm" onclick="telechargerCopie('${c.jour}')"><i class="bi bi-download"></i> Télécharger</button>
        <button class="btn btn-danger btn-sm" onclick="restaurerCopie('${c.jour}')"><i class="bi bi-arrow-counterclockwise"></i> Revenir à cette date</button></div></div>`).join('')
        : '<div class="empty-mini"><i class="bi bi-clock-history"></i> Pas encore de copie automatique (elle est faite au premier passage de la journée).</div>';
}
async function copieMaintenant() {
    try { await SecuriteDonnees.copieDuJour(true); uiToast('Copie du jour enregistrée.', 'ok'); renderCopies(); } catch (e) { uiToast('Copie impossible : ' + e.message, 'err'); }
}
async function telechargerCopie(jour) {
    const c = await SecuriteDonnees.lire(jour); if (!c) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ _type: 'sauvegarde_ecole', _date: c.le, _version: 1, data: c.data })], { type: 'application/json' }));
    a.download = 'sauvegarde_ecole_' + jour + '.json'; document.body.appendChild(a); a.click(); a.remove();
    marquerSauvegardeTelechargee(); renderCopies();
}
async function restaurerCopie(jour) {
    const c0 = await SecuriteDonnees.lire(jour);
    const rep = prompt(`Revenir aux données du ${new Date(c0 ? c0.le : Date.now()).toLocaleString('fr-FR')} ?\n\nToutes les modifications faites depuis seront perdues (une copie de sécurité de l'état actuel est faite avant, pour pouvoir annuler).\nPour confirmer, tapez : RESTAURER`);
    if (rep === null) return;
    if (rep.trim().toUpperCase() !== 'RESTAURER') return uiToast('Annulé : le mot de confirmation ne correspond pas.', 'warn');
    try { await SecuriteDonnees.copieDuJour(true, true); await SecuriteDonnees.restaurer(jour); alert('Données restaurées. La page va se recharger.'); location.reload(); }
    catch (e) { uiToast('Restauration impossible : ' + e.message, 'err'); }
}
