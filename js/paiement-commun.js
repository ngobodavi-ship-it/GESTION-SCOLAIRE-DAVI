// =====================================================================
// Paiement — fonctions communes (caisse, espace parent, administration)
//  • creerTransaction(decl) : enregistre dans la caisse un paiement
//    déclaré ou confirmé en ligne (même format qu'un paiement au guichet)
//  • PaiementEnLigne : dialogue avec les fichiers PHP du dossier api/
// =====================================================================
(function () {
    'use strict';
    function lireTx() { try { return JSON.parse(localStorage.getItem('digigespro_transactions')) || []; } catch (e) { return []; } }
    function lireEleves() { try { return JSON.parse(localStorage.getItem('digigespro_students')) || []; } catch (e) { return []; } }

    // Utilise les tableaux de la page s'ils existent (DigiGesPro, espace parent), sinon le stockage
    function tableaux() {
        const tx = (typeof transactions !== 'undefined' && Array.isArray(transactions)) ? transactions : lireTx();
        const st = (typeof students !== 'undefined' && Array.isArray(students)) ? students : lireEleves();
        return { tx, st };
    }

    function creerTransaction(d, extra) {
        const { tx, st } = tableaux();
        // déjà enregistré ? (une seule transaction par déclaration)
        const deja = tx.find(t => t.declarationId === d.id);
        if (deja) return deja;
        let s = st.find(x => x.id === d.eleveId) || st.find(x => d.matricule && x.matricule === d.matricule);
        if (!s) {
            s = { id: d.eleveId, nom: d.eleveNomSeul || d.eleveNom, prenom: d.elevePrenom || '', classe: d.classe || '', matricule: d.matricule || '' };
            st.push(s);
            localStorage.setItem('digigespro_students', JSON.stringify(st));
        }
        const montant = Number(d.montant) || 0;
        const nomMoyen = (window.Comptes && Comptes.MOYENS[d.moyen]) || d.moyen;
        const t = Object.assign({
            id: Date.now().toString() + Math.floor(Math.random() * 1000), date: d.date,
            time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            type: d.type, nomEcole: localStorage.getItem('digigespro_ecole') || localStorage.getItem('ecole_nom') || '',
            paymentMethod: d.moyen, studentId: s.id, studentName: `${s.nom} ${s.prenom}`.trim(), studentClasse: s.classe, studentMatricule: s.matricule,
            amount: montant, refOperateur: d.reference, source: d.source || 'parent', declarationId: d.id,
            description: `Paiement à distance (${nomMoyen}) — réf. ${d.reference}`
        }, extra || {});
        if (d.type === 'scolarite' && d.mois && d.mois.length) {
            const mois = d.mois.slice();
            const bal = typeof calculateMonthlyBalances === 'function' ? calculateMonthlyBalances(s.id) : {};
            const mens = (typeof mensualiteEffective === 'function' && typeof grilleTarif === 'function') ? mensualiteEffective(s.id, grilleTarif(s.classe).mensualite || 0) : 0;
            let reste = montant; const parMois = {};
            mois.forEach((m, i) => {
                const du = bal[m] ? Math.max(0, bal[m].reste) : mens;
                const part = i === mois.length - 1 ? reste : Math.min(reste, du || reste / (mois.length - i));
                parMois[m] = part; reste -= part;
            });
            Object.assign(t, { moisPayes: mois, montantParMois: parMois, prixFixe: mens || (montant / mois.length), isEcheance: false,
                reference: `SCO-${String(tx.filter(x => x.type === 'scolarite').length + 1).padStart(3, '0')}` });
        } else {
            t.reference = `${String(d.type || 'PAY').substring(0, 3).toUpperCase()}-${String(tx.filter(x => x.type === d.type).length + 1).padStart(3, '0')}`;
        }
        tx.unshift(t);
        localStorage.setItem('digigespro_transactions', JSON.stringify(tx));
        return t;
    }

    // ---------- Paiement en ligne (serveur PHP) ----------
    const API = 'api/';
    async function appel(chemin, options) {
        let r;
        try { r = await fetch(API + chemin, Object.assign({ cache: 'no-store', headers: { 'Content-Type': 'application/json' } }, options || {})); }
        catch (e) { return { ok: false, horsLigne: true, erreur: "Le serveur de paiement est injoignable. Le paiement en ligne n'est disponible que sur l'hébergement de l'école (LWS)." }; }
        const txt = await r.text();
        try { return JSON.parse(txt); } catch (e) { return { ok: false, horsLigne: true, erreur: "Le serveur de paiement ne répond pas correctement (PHP absent ? Sur GitHub Pages, c'est normal)." }; }
    }
    function actifs() {
        const c = window.Comptes ? Comptes.paiementConfig() : {};
        const e = c.enLigne || {};
        return { mtn: !!e.mtn, airtel: !!e.airtel, un: !!(e.mtn || e.airtel) };
    }

    window.Paiement = {
        creerTransaction,
        enLigne: {
            actifs,
            statutServeur: () => appel('statut-serveur.php'),
            lancer: (corps) => appel('payer.php', { method: 'POST', body: JSON.stringify(corps) }),
            verifier: (ref) => appel('verifier.php?ref=' + encodeURIComponent(ref))
        }
    };
})();
