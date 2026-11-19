// =====================================================================
// Préscolaire (P1, P2, P3) — évaluation par appréciations, sans note ni rang
//  • Domaines d'activités et compétences : entièrement modifiables
//  • Niveaux d'appréciation : modifiables (Acquis, En cours, Non acquis…)
//  • Évaluation par élève et par trimestre, suivi de la classe, bulletin
// Stockage :
//   ecole_presco_config  { domaines:[{id,nom,items:[{id,nom}]}], niveaux:[{code,libelle,couleur}] }
//   ecole_presco_evals   { 'eleveId|trimestre': { items:{itemId:code}, observation, maj, par } }
// Proposition de départ inspirée des programmes préscolaires francophones :
// aucun programme officiel congolais n'était accessible en ligne (à ajuster
// selon le programme remis par l'INRAP ou l'inspection).
// =====================================================================
(function () {
    'use strict';
    var K_CFG = 'ecole_presco_config', K_EVAL = 'ecole_presco_evals';
    var TRIMS = ['1er Trimestre', '2e Trimestre', '3e Trimestre'];

    var PROPOSITION = [
        ['Langage et communication', ['S\'exprime clairement dans une phrase simple', 'Comprend et exécute une consigne', 'Raconte une histoire ou un événement vécu']],
        ['Pré-lecture', ['Reconnaît son prénom écrit', 'Distingue les sons et les syllabes', 'Reconnaît des lettres de l\'alphabet']],
        ['Graphisme et pré-écriture', ['Tient correctement le crayon', 'Reproduit des tracés (traits, ronds, boucles)', 'Écrit son prénom']],
        ['Pré-mathématiques', ['Compte et dénombre des objets', 'Reconnaît les formes et les couleurs', 'Classe, trie et range des objets']],
        ['Découverte du monde', ['Se repère dans le temps (jour, nuit, saisons)', 'Connaît son corps et les règles d\'hygiène', 'Observe la nature et son environnement']],
        ['Éducation sensorielle', ['Distingue les sons, les goûts et les odeurs', 'Reconnaît les objets au toucher']],
        ['Activités artistiques', ['Dessine, colorie et peint', 'Chante des chants et récite des comptines', 'Participe aux activités manuelles']],
        ['Motricité et éducation physique', ['Court, saute et lance avec aisance', 'Garde l\'équilibre', 'Réalise des gestes fins (découper, enfiler)']],
        ['Vie pratique, vie sociale et comportement', ['Respecte les règles de la classe', 'Partage et joue avec les autres', 'Devient autonome (s\'habiller, ranger)']]
    ];
    var NIVEAUX = [
        { code: 'A', libelle: 'Acquis', couleur: '#059669' },
        { code: 'EC', libelle: 'En cours d\'acquisition', couleur: '#D97706' },
        { code: 'NA', libelle: 'Non acquis', couleur: '#DC2626' }
    ];

    function uid(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
    function lire(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
    function ecrire(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    function configParDefaut() {
        return {
            domaines: PROPOSITION.map(function (d) { return { id: uid('d'), nom: d[0], items: d[1].map(function (n) { return { id: uid('i'), nom: n }; }) }; }),
            niveaux: NIVEAUX.map(function (n) { return Object.assign({}, n); })
        };
    }
    function config() {
        var c = lire(K_CFG, null);
        if (!c || !Array.isArray(c.domaines) || !Array.isArray(c.niveaux)) { c = configParDefaut(); ecrire(K_CFG, c); }
        return c;
    }
    function sauverConfig(c) { ecrire(K_CFG, c); }
    function evals() { return lire(K_EVAL, {}); }
    function sauverEvals(e) { ecrire(K_EVAL, e); }

    // Une classe est du préscolaire si son type l'indique, ou d'après son nom (P1–P3, maternelle, sections)
    function estPrescolaire(nomClasse) {
        var classes = lire('ecole_classes', []);
        var c = (Array.isArray(classes) ? classes : []).find(function (x) { return x.nom === nomClasse; });
        if (c && c.type === 'prescolaire') return true;
        if (c && c.type) return false;
        return /^(p[1-3]\b|maternelle|petite section|moyenne section|grande section|ps\b|ms\b|gs\b)/i.test(String(nomClasse || '').trim());
    }

    // Bilan d'un élève pour un trimestre : nombre d'items par niveau
    function bilan(eleveId, trim) {
        var c = config(), ev = (evals()[eleveId + '|' + trim] || {}).items || {}, total = 0, parNiv = {}, evalues = 0;
        c.niveaux.forEach(function (n) { parNiv[n.code] = 0; });
        c.domaines.forEach(function (d) { d.items.forEach(function (i) { total++; if (ev[i.id] && parNiv[ev[i.id]] != null) { parNiv[ev[i.id]]++; evalues++; } }); });
        return { total: total, evalues: evalues, parNiv: parNiv };
    }

    // ---------- Bulletin (HTML imprimable) ----------
    function bulletinHTML(eleve, trim) {
        var c = config(), rec = evals()[eleve.id + '|' + trim] || {}, ev = rec.items || {};
        var entete = (typeof etabEnteteHTML === 'function') ? etabEnteteHTML('Bulletin d\'évaluation — Préscolaire', trim) : '<h2 style="text-align:center">Bulletin d\'évaluation — Préscolaire<br><small>' + esc(trim) + '</small></h2>';
        var th = c.niveaux.map(function (n) { return '<th style="border:1px solid #999;padding:5px;width:70px;font-size:11px;">' + esc(n.libelle) + '</th>'; }).join('');
        var corps = c.domaines.map(function (d) {
            var lignes = d.items.map(function (i) {
                return '<tr><td style="border:1px solid #999;padding:5px 8px;">' + esc(i.nom) + '</td>' + c.niveaux.map(function (n) {
                    return '<td style="border:1px solid #999;text-align:center;font-size:16px;color:' + n.couleur + ';">' + (ev[i.id] === n.code ? '&#10004;' : '') + '</td>';
                }).join('') + '</tr>';
            }).join('');
            return '<tr><td colspan="' + (c.niveaux.length + 1) + '" style="border:1px solid #999;padding:5px 8px;font-weight:bold;background:#eef2f7;">' + esc(d.nom) + '</td></tr>' + lignes;
        }).join('');
        var b = bilan(eleve.id, trim);
        var resume = c.niveaux.map(function (n) { return esc(n.libelle) + ' : ' + (b.parNiv[n.code] || 0); }).join(' &nbsp;·&nbsp; ');
        return '<div style="font-family:Arial,sans-serif;color:#111;padding:18px;max-width:800px;margin:auto;page-break-after:always;">' + entete +
            '<table style="width:100%;font-size:13px;margin-bottom:10px;"><tr><td><strong>Élève :</strong> ' + esc(eleve.nom) + ' ' + esc(eleve.prenom) + '</td><td><strong>Classe :</strong> ' + esc(eleve.classe) + '</td><td><strong>Matricule :</strong> ' + esc(eleve.matricule || '-') + '</td></tr>' +
            '<tr><td colspan="3"><strong>Année scolaire :</strong> ' + esc(eleve.anneeScolaire || '') + '</td></tr></table>' +
            '<table style="width:100%;border-collapse:collapse;font-size:12.5px;"><thead><tr><th style="border:1px solid #999;padding:5px;text-align:left;">Domaines et compétences</th>' + th + '</tr></thead><tbody>' + corps + '</tbody></table>' +
            '<p style="font-size:12px;margin:8px 0;">Bilan : ' + resume + ' (' + b.evalues + ' compétence(s) évaluée(s) sur ' + b.total + ')</p>' +
            '<div style="border:1px solid #999;padding:8px;min-height:60px;font-size:13px;margin-top:6px;"><strong>Observation de l\'enseignant(e) :</strong><br>' + esc(rec.observation || '') + '</div>' +
            '<table style="width:100%;margin-top:28px;font-size:13px;"><tr><td>L\'enseignant(e)</td><td style="text-align:center;">' + ((typeof etabFaitA === 'function') ? etabFaitA() : '') + '<br>' + ((typeof etabSignataire === 'function') ? etabSignataire() : 'Le Directeur') + '</td><td style="text-align:right;">Le parent</td></tr></table></div>';
    }

    window.Presco = { TRIMS: TRIMS, config: config, sauverConfig: sauverConfig, evals: evals, sauverEvals: sauverEvals, estPrescolaire: estPrescolaire, bilan: bilan, bulletinHTML: bulletinHTML, configParDefaut: configParDefaut, uid: uid, esc: esc };
})();
