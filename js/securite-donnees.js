// =====================================================================
// Sécurité des données (chargé sur toutes les pages, juste après theme.js)
//  1. Journal des actions : chaque modification ou suppression de données
//     est notée (qui, quand, quelle donnée, combien d'éléments avant/après).
//  2. Sauvegardes automatiques : une copie complète par jour, gardée
//     14 jours dans le navigateur (IndexedDB), restaurable par l'admin.
// Limite : ces copies restent sur cet appareil. Un navigateur vidé les
// efface aussi : télécharger régulièrement une sauvegarde reste nécessaire.
// =====================================================================
(function () {
    'use strict';
    var K_JOURNAL = 'ecole_journal', MAX_JOURNAL = 4000;
    var IGNORE = /^(ecole_journal|ecole_classes_cycles_v2|ui_|seed|spr|son|sp|spay|k)$/;
    var EST_DONNEE = /^(ecole_|digigespro_|portail_config_v1)/;
    var natifSet = Storage.prototype.setItem, natifRemove = Storage.prototype.removeItem;

    function compte(brut) {
        if (brut == null || brut === '') return 0;
        try { var v = JSON.parse(brut); return Array.isArray(v) ? v.length : (v && typeof v === 'object') ? Object.keys(v).length : 1; } catch (e) { return 1; }
    }
    function qui() {
        try { var s = JSON.parse(sessionStorage.getItem('portail_session')) || {}; return { nom: s.nom || '', role: s.role || '' }; } catch (e) { return { nom: '', role: '' }; }
    }
    function page() { return (location.pathname.split('/').pop() || 'portail.html').replace('.html', ''); }

    function noter(cle, avantBrut, apresBrut, suppression) {
        try {
            var av = compte(avantBrut), ap = suppression ? 0 : compte(apresBrut);
            if (!suppression && avantBrut === apresBrut) return;
            var j = []; try { j = JSON.parse(localStorage.getItem(K_JOURNAL)) || []; } catch (e) { j = []; }
            var q = qui(), now = Date.now(), dernier = j[0];
            // regroupe les enregistrements successifs d'une même donnée par la même personne (moins de 2 min)
            if (dernier && dernier.cle === cle && dernier.role === q.role && dernier.nom === q.nom && now - dernier.t < 120000 && !suppression && dernier.action !== 'vidage') {
                dernier.t = now; dernier.apres = ap; dernier.n = (dernier.n || 1) + 1;
            } else {
                j.unshift({ t: now, cle: cle, nom: q.nom, role: q.role || 'Non connecté', page: page(), avant: av, apres: ap, action: suppression ? 'vidage' : (ap > av ? 'ajout' : ap < av ? 'suppression' : 'modification') });
            }
            if (j.length > MAX_JOURNAL) j.length = MAX_JOURNAL;
            natifSet.call(localStorage, K_JOURNAL, JSON.stringify(j));
        } catch (e) { }
    }
    Storage.prototype.setItem = function (cle, val) {
        if (this === window.localStorage && EST_DONNEE.test(cle) && !IGNORE.test(cle)) {
            var avant = null; try { avant = natifGet.call(this, cle); } catch (e) { }
            natifSet.call(this, cle, val);
            noter(cle, avant, String(val), false);
            return;
        }
        return natifSet.call(this, cle, val);
    };
    var natifGet = Storage.prototype.getItem;
    Storage.prototype.removeItem = function (cle) {
        if (this === window.localStorage && EST_DONNEE.test(cle) && !IGNORE.test(cle)) {
            var avant = natifGet.call(this, cle);
            natifRemove.call(this, cle);
            if (avant != null) noter(cle, avant, null, true);
            return;
        }
        return natifRemove.call(this, cle);
    };

    // ---------- Sauvegardes automatiques (IndexedDB) ----------
    var DB = 'gsd_sauvegardes', STORE = 'copies', GARDER = 14;
    function ouvrir() {
        return new Promise(function (ok, ko) {
            if (!window.indexedDB) return ko(new Error('IndexedDB indisponible'));
            var r = indexedDB.open(DB, 1);
            r.onupgradeneeded = function () { r.result.createObjectStore(STORE, { keyPath: 'jour' }); };
            r.onsuccess = function () { ok(r.result); };
            r.onerror = function () { ko(r.error); };
        });
    }
    function tx(mode, fn) {
        return ouvrir().then(function (db) {
            return new Promise(function (ok, ko) {
                var t = db.transaction(STORE, mode), st = t.objectStore(STORE), res = fn(st);
                t.oncomplete = function () { ok(res && res.result !== undefined ? res.result : res); db.close(); };
                t.onerror = function () { ko(t.error); db.close(); };
            });
        });
    }
    function donneesActuelles() {
        var data = {};
        for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (EST_DONNEE.test(k)) data[k] = natifGet.call(localStorage, k); }
        return data;
    }
    function lister() {
        return ouvrir().then(function (db) {
            return new Promise(function (ok) {
                var out = [], t = db.transaction(STORE, 'readonly');
                t.objectStore(STORE).openCursor().onsuccess = function (e) { var c = e.target.result; if (c) { out.push(c.value); c.continue(); } };
                t.oncomplete = function () { db.close(); ok(out.sort(function (a, b) { return b.jour.localeCompare(a.jour); })); };
            });
        });
    }
    // Copie quotidienne (clé = date du jour). Avec « securite », copie à part prise juste
    // avant une restauration : elle n'écrase jamais la copie du jour.
    function copieDuJour(forcer, securite) {
        var maintenant = new Date(), jour = maintenant.toISOString().slice(0, 10);
        var cle = securite ? jour + '~avant-restauration-' + maintenant.toTimeString().slice(0, 8).replace(/:/g, '') : jour;
        return lister().then(function (liste) {
            if (!forcer && !securite && liste.some(function (c) { return c.jour === jour; })) return null;
            var data = donneesActuelles();
            if (!Object.keys(data).length) return null;
            var taille = JSON.stringify(data).length;
            return tx('readwrite', function (st) {
                st.put({ jour: cle, date: jour, securite: !!securite, le: maintenant.toISOString(), data: data, taille: taille, nb: Object.keys(data).length });
                var quotidiennes = liste.filter(function (c) { return !c.securite; }), secu = liste.filter(function (c) { return c.securite; });
                quotidiennes.slice(GARDER - 1).forEach(function (c) { if (c.jour !== cle) st.delete(c.jour); });
                secu.slice(4).forEach(function (c) { st.delete(c.jour); });
            });
        });
    }
    function restaurer(jour) {
        return tx('readonly', function (st) { return st.get(jour); }).then(function (c) {
            if (!c || !c.data) throw new Error('Copie introuvable');
            var actuelles = [];
            for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (EST_DONNEE.test(k)) actuelles.push(k); }
            actuelles.forEach(function (k) { natifRemove.call(localStorage, k); });
            Object.keys(c.data).forEach(function (k) { natifSet.call(localStorage, k, c.data[k]); });
            noter('ecole_restauration', null, JSON.stringify([jour]), false);
            return c;
        });
    }
    function lire(jour) { return tx('readonly', function (st) { return st.get(jour); }); }

    window.SecuriteDonnees = { lister: lister, copieDuJour: copieDuJour, restaurer: restaurer, lire: lire, compte: compte };
    // une copie par jour, au premier passage
    setTimeout(function () { copieDuJour(false).catch(function () { }); }, 1500);
})();
