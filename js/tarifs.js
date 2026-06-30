// ===== Grille tarifaire : frais par classe (inscription / réinscription / mensualité) =====
// Stockée dans 'ecole_grille_tarifaire' = { [nomClasse]: {inscription, reinscription, mensualite} }
// Partagée : utilisée pour pré-remplir les montants à l'inscription et aux paiements mensuels.

const TARIF_KEY = 'ecole_grille_tarifaire';
function tfRead() { try { return JSON.parse(localStorage.getItem(TARIF_KEY)) || {}; } catch (e) { return {}; } }
function tfSave(o) { localStorage.setItem(TARIF_KEY, JSON.stringify(o)); }
function tfClasses() { try { return JSON.parse(localStorage.getItem('ecole_classes')) || []; } catch (e) { return []; } }
function tfFCFA(n) { return (Number(n) || 0).toLocaleString('fr-FR'); }
function tfEsc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function tfAttr(s) { return String(s == null ? '' : s).replace(/"/g, '&quot;'); }

// Helper public : tarifs d'une classe (toujours un objet complet)
function grilleTarif(classe) {
    const g = tfRead()[classe] || {};
    return { inscription: parseFloat(g.inscription) || 0, reinscription: parseFloat(g.reinscription) || 0, mensualite: parseFloat(g.mensualite) || 0 };
}

function tfSet(classe, champ, val) {
    const g = tfRead();
    if (!g[classe]) g[classe] = {};
    const n = parseFloat(val);
    if (!n || n <= 0) delete g[classe][champ]; else g[classe][champ] = n;
    if (Object.keys(g[classe]).length === 0) delete g[classe];
    tfSave(g);
    // mettre à jour le total annuel affiché
    const tot = document.getElementById('tf_total_' + cssId(classe));
    if (tot) { const t = grilleTarif(classe); tot.textContent = tfFCFA(t.mensualite * tfNbMois()) + ' FCFA'; }
}

function cssId(s) { return String(s).replace(/[^a-zA-Z0-9]/g, '_'); }

function tfNbMois() { let n = 9; try { const v = parseInt(localStorage.getItem('ecole_mois_scolarite'), 10); if (!isNaN(v)) n = v; } catch (e) { } if (n < 1) n = 1; if (n > 12) n = 12; return n; }
function tfSetNbMois(val) { let n = parseInt(val, 10); if (isNaN(n) || n < 1) n = 1; if (n > 12) n = 12; localStorage.setItem('ecole_mois_scolarite', String(n)); renderTarifs(); }

function renderTarifs() {
    const box = document.getElementById('tarifsBox');
    if (!box) return;
    const classes = tfClasses();
    if (classes.length === 0) {
        box.innerHTML = '<p style="color:#64748b;padding:0.5rem;">Aucune classe. Créez les classes en Scolarité, puis définissez leurs tarifs ici.</p>';
        return;
    }
    const nbMois = tfNbMois();
    const estPrimaire = c => (c.cycle === 'primaire') || (c.type === 'primaire') || /\b(cp1|cp2|ce1|ce2|cm1|cm2|maternelle|gs|ms|ps)\b/i.test(c.nom || '');
    const ordered = classes.slice().sort((a, b) => (estPrimaire(b) - estPrimaire(a)) || (a.nom || '').localeCompare(b.nom || ''));
    const g = tfRead();
    const ligne = c => {
        const t = g[c.nom] || {};
        const insc = t.inscription || '', rein = t.reinscription || '', mens = t.mensualite || '';
        const annuel = (parseFloat(mens) || 0) * nbMois;
        return `<tr>
            <td style="font-weight:600;white-space:nowrap;">${tfEsc(c.nom)} ${estPrimaire(c) ? '<span style="background:#ecfeff;color:#0e7490;border-radius:999px;padding:0.05rem 0.45rem;font-size:0.72rem;">primaire</span>' : ''}</td>
            <td style="text-align:right;"><input type="number" min="0" step="500" value="${insc}" placeholder="0" onchange="tfSet('${tfAttr(c.nom)}','inscription',this.value)" style="width:110px;margin:0;padding:0.25rem;text-align:right;"></td>
            <td style="text-align:right;"><input type="number" min="0" step="500" value="${rein}" placeholder="0" onchange="tfSet('${tfAttr(c.nom)}','reinscription',this.value)" style="width:110px;margin:0;padding:0.25rem;text-align:right;"></td>
            <td style="text-align:right;"><input type="number" min="0" step="500" value="${mens}" placeholder="0" onchange="tfSet('${tfAttr(c.nom)}','mensualite',this.value)" style="width:110px;margin:0;padding:0.25rem;text-align:right;"></td>
            <td style="text-align:right;white-space:nowrap;color:#4338ca;font-weight:600;" id="tf_total_${cssId(c.nom)}">${tfFCFA(annuel)} FCFA</td>
        </tr>`;
    };
    box.innerHTML = `
        <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap;margin-bottom:0.85rem;padding:0.75rem;background:#f8fafc;border-radius:8px;">
            <label style="font-weight:600;margin:0;">Nombre de mois de scolarité dans l'année :</label>
            <input type="number" min="1" max="12" value="${nbMois}" onchange="tfSetNbMois(this.value)" style="width:80px;margin:0;padding:0.25rem;text-align:center;">
            <span style="color:#64748b;font-size:0.85rem;">(au Congo, l'année scolaire va d'octobre à juin ≈ 9 mois)</span>
        </div>
        <table>
            <thead><tr>
                <th>Classe</th>
                <th style="text-align:right;">Inscription</th>
                <th style="text-align:right;">Réinscription</th>
                <th style="text-align:right;">Scolarité / mois</th>
                <th style="text-align:right;">Total scolarité / an (${nbMois} mois)</th>
            </tr></thead>
            <tbody>${ordered.map(ligne).join('')}</tbody>
        </table>
        <p style="color:#64748b;font-size:0.82rem;margin:0.75rem 0 0;">💡 Montants en FCFA. La mensualité × ${nbMois} mois donne le total de scolarité dû par an, utilisé pour le « reste à payer » de chaque élève.</p>`;
}
