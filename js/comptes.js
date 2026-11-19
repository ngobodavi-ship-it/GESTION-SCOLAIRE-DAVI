// =====================================================================
// Comptes : mots de passe, comptes parents, demandes de réinitialisation,
// préoccupations des parents. Partagé par le portail, l'espace parent et
// la recherche élève & famille.
//
// Clés de stockage :
//   ecole_comptes_parents   { [téléphone normalisé]: { nom, salt, hash, mustChange, active, createdAt, lastLogin } }
//   ecole_demandes_reinit   [ { id, type:'parent'|'personnel', login, nomDeclare, message, date, status, traiteLe } ]
//   ecole_preoccupations    [ { id, parentKey, parentNom, eleveId, eleveNom, service, sujet, message, date, status, reponses:[] } ]
// Les mots de passe ne sont jamais stockés en clair : empreinte SHA-256 salée.
// =====================================================================
(function () {
    'use strict';
    var K_PARENTS = 'ecole_comptes_parents', K_DEMANDES = 'ecole_demandes_reinit', K_PREOC = 'ecole_preoccupations';

    function lire(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
    function ecrire(k, v) { localStorage.setItem(k, JSON.stringify(v)); }

    // ---------- SHA-256 (synchrone, fonctionne aussi hors connexion sécurisée) ----------
    function sha256(ascii) {
        function rr(v, a) { return (v >>> a) | (v << (32 - a)); }
        var maxWord = Math.pow(2, 32), result = '', words = [], i, j;
        var bitLen = ascii.length * 8, hash = [], k = [], primeCounter = 0, isComposite = {};
        for (var c = 2; primeCounter < 64; c++) {
            if (!isComposite[c]) {
                for (i = 0; i < 313; i += c) isComposite[i] = c;
                hash[primeCounter] = (Math.pow(c, .5) * maxWord) | 0;
                k[primeCounter++] = (Math.pow(c, 1 / 3) * maxWord) | 0;
            }
        }
        hash = hash.slice(0, 8);
        ascii += '\x80';
        while (ascii.length % 64 - 56) ascii += '\x00';
        for (i = 0; i < ascii.length; i++) { j = ascii.charCodeAt(i); words[i >> 2] |= j << ((3 - i) % 4) * 8; }
        words[words.length] = ((bitLen / maxWord) | 0);
        words[words.length] = (bitLen);
        for (j = 0; j < words.length;) {
            var w = words.slice(j, j += 16), oldHash = hash;
            hash = hash.slice(0, 8);
            for (i = 0; i < 64; i++) {
                var w15 = w[i - 15], w2 = w[i - 2], a = hash[0], e = hash[4];
                var temp1 = hash[7] + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & hash[5]) ^ ((~e) & hash[6])) + k[i] +
                    (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3)) + w[i - 7] + (rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10))) | 0);
                var temp2 = (rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
                hash = [(temp1 + temp2) | 0].concat(hash);
                hash[4] = (hash[4] + temp1) | 0;
            }
            for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
        }
        for (i = 0; i < 8; i++) for (j = 3; j + 1; j--) { var b = (hash[i] >> (j * 8)) & 255; result += ((b < 16) ? 0 : '') + b.toString(16); }
        return result;
    }
    function utf8(s) { return unescape(encodeURIComponent(String(s))); }
    function empreinte(salt, pass) { return sha256(utf8(salt + '|' + pass)); }
    function aleatoire(n, alphabet) {
        var out = '', arr = new Uint32Array(n);
        if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(arr); else for (var i = 0; i < n; i++) arr[i] = Math.floor(Math.random() * 4294967296);
        for (var j = 0; j < n; j++) out += alphabet.charAt(arr[j] % alphabet.length);
        return out;
    }
    // Code lisible : sans 0/O, 1/I/L
    function genererCode() { var a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; return aleatoire(4, a) + '-' + aleatoire(4, a); }

    // Vérifie un mot de passe sur un enregistrement (empreinte, ou ancien mot de passe en clair)
    function verifier(rec, pass) {
        if (!rec) return false;
        if (rec.hash && rec.salt) return empreinte(rec.salt, pass) === rec.hash;
        return (rec.password || '') !== '' && rec.password === pass;
    }
    // Définit un mot de passe (supprime l'éventuel mot de passe en clair)
    function definir(rec, pass, mustChange) {
        rec.salt = aleatoire(16, 'abcdefghijklmnopqrstuvwxyz0123456789');
        rec.hash = empreinte(rec.salt, pass);
        delete rec.password;
        rec.mustChange = !!mustChange;
        rec.pwdChangedAt = new Date().toISOString();
        return rec;
    }

    // ---------- Parents (déduits du registre des élèves) ----------
    function normTel(t) {
        var d = String(t || '').replace(/\D/g, '');
        if (d.length > 9 && d.indexOf('242') === 0) d = d.slice(3); // indicatif Congo
        if (d.length > 9 && d.indexOf('00242') === 0) d = d.slice(5);
        return d;
    }
    function estTelephone(s) { return normTel(s).length >= 8 && /^[\d\s+().-]+$/.test(String(s).trim()); }
    function eleves() { var e = lire('ecole_eleves', []); return Array.isArray(e) ? e : []; }
    // Registre des parents : un parent = un numéro de téléphone de tuteur
    function registreParents() {
        var map = {};
        eleves().forEach(function (e) {
            if (!e || !e.telephone) return;
            var key = normTel(e.telephone); if (key.length < 8) return;
            if (!map[key]) map[key] = { key: key, telephone: e.telephone, nom: (e.tuteur || '').trim(), enfants: [] };
            if (!map[key].nom && e.tuteur) map[key].nom = e.tuteur.trim();
            map[key].enfants.push(e);
        });
        return map;
    }
    function trouverParent(telOuKey) { return registreParents()[normTel(telOuKey)] || null; }
    function comptesParents() { return lire(K_PARENTS, {}); }
    function compteParent(key) { return comptesParents()[normTel(key)] || null; }
    function sauverCompteParent(key, rec) { var all = comptesParents(); all[normTel(key)] = rec; ecrire(K_PARENTS, all); }

    // Crée ou régénère le code d'accès d'un parent existant ; renvoie le code en clair (à remettre au parent)
    function creerCodeParent(key) {
        var p = trouverParent(key); if (!p) return null;
        var rec = compteParent(key) || { createdAt: new Date().toISOString(), active: true };
        rec.nom = p.nom; rec.active = rec.active !== false;
        var code = genererCode();
        definir(rec, code, true);
        sauverCompteParent(p.key, rec);
        return code;
    }

    // ---------- Demandes de réinitialisation ----------
    function demandes() { var d = lire(K_DEMANDES, []); return Array.isArray(d) ? d : []; }
    function sauverDemandes(d) { ecrire(K_DEMANDES, d); }
    function demandesEnAttente() { return demandes().filter(function (d) { return d.status === 'en_attente'; }); }

    // ---------- Préoccupations ----------
    function preoccupations() { var p = lire(K_PREOC, []); return Array.isArray(p) ? p : []; }
    function sauverPreoccupations(p) { ecrire(K_PREOC, p); }

    window.Comptes = {
        sha256: sha256, empreinte: empreinte, genererCode: genererCode, verifier: verifier, definir: definir,
        normTel: normTel, estTelephone: estTelephone, eleves: eleves,
        registreParents: registreParents, trouverParent: trouverParent,
        comptesParents: comptesParents, compteParent: compteParent, sauverCompteParent: sauverCompteParent, creerCodeParent: creerCodeParent,
        demandes: demandes, sauverDemandes: sauverDemandes, demandesEnAttente: demandesEnAttente,
        preoccupations: preoccupations, sauverPreoccupations: sauverPreoccupations,
        SERVICES: ['Scolarité (inscription, documents)', 'Études (notes, bulletins)', 'Finances (paiements, frais)', 'Surveillance (absences, discipline)', 'Direction', 'Autre'],
        MIN_LONGUEUR: 6
    };
})();
