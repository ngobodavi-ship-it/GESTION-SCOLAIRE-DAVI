// ===== Réductions / Bourses : remise de scolarité par élève =====

function redFCFA(n) { return (Math.round(n) || 0).toLocaleString('fr-FR') + ' FCFA'; }
function redEsc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function redAttr(s) { return String(s == null ? '' : s).replace(/"/g, '&quot;'); }

function redRead() { try { return JSON.parse(localStorage.getItem('ecole_reductions')) || {}; } catch (e) { return {}; } }
function redSave(o) { localStorage.setItem('ecole_reductions', JSON.stringify(o)); }

function redGet(id) { return redRead()[id] || { mode: 'aucune', valeur: '', motif: '' }; }

// Mensualité de base (grille) pour la classe d'un élève
function redMensBase(classe) { return (typeof grilleTarif === 'function') ? (grilleTarif(classe).mensualite || 0) : 0; }

function redSetMode(id, mode) {
    const o = redRead();
    const cur = o[id] || {};
    cur.mode = mode;
    if (mode === 'aucune' || mode === 'gratuite') cur.valeur = '';
    o[id] = cur; redSave(o);
    renderReductions(); // re-rendu pour afficher/masquer le champ valeur et recalculer
}
function redSetValeur(id, v) {
    const o = redRead(); const cur = o[id] || { mode: 'aucune' };
    cur.valeur = v; o[id] = cur; redSave(o);
    redMajLigne(id);
}
function redSetMotif(id, v) {
    const o = redRead(); const cur = o[id] || { mode: 'aucune' };
    cur.motif = v; o[id] = cur; redSave(o);
}
// Met à jour la cellule "mensualité effective" d'une ligne sans tout reconstruire
function redMajLigne(id) {
    const cell = document.getElementById('redEff_' + id);
    if (!cell) return;
    const s = students.find(x => x.id === id); if (!s) return;
    const base = redMensBase(s.classe);
    const eff = (typeof mensualiteEffective === 'function') ? mensualiteEffective(id, base) : base;
    cell.textContent = redFCFA(eff);
    cell.style.color = eff < base ? '#16a34a' : '#0E1E3A';
}

function redLabelReduction(r, base) {
    if (!r || !r.mode || r.mode === 'aucune') return '<span style="color:#94a3b8;">—</span>';
    if (r.mode === 'gratuite') return '<span style="background:#dcfce7;color:#166534;border-radius:999px;padding:1px 9px;font-size:0.78rem;font-weight:700;">Gratuité</span>';
    if (r.mode === 'pourcentage') return `<span style="background:#eef2ff;color:#4338ca;border-radius:999px;padding:1px 9px;font-size:0.78rem;font-weight:700;">−${parseFloat(r.valeur) || 0}%</span>`;
    if (r.mode === 'fixe') return `<span style="background:#fff7ed;color:#c2410c;border-radius:999px;padding:1px 9px;font-size:0.78rem;font-weight:700;">Forfait ${redFCFA(parseFloat(r.valeur) || 0)}</span>`;
    return '—';
}

function renderReductions() {
    // Filtre par classe
    const sel = document.getElementById('redClasse');
    if (sel) {
        const cur = sel.value;
        const cls = [...new Set(students.map(s => s.classe).filter(Boolean))].sort();
        sel.innerHTML = '<option value="">-- Toutes les classes --</option>' + cls.map(c => `<option value="${redAttr(c)}">${redEsc(c)}</option>`).join('');
        sel.value = cur;
    }
    const box = document.getElementById('redBox');
    if (!box) return;
    const filtreCl = sel ? sel.value : '';
    const liste = students.filter(s => !filtreCl || s.classe === filtreCl)
        .slice().sort((a, b) => (`${a.nom} ${a.prenom}`).localeCompare(`${b.nom} ${b.prenom}`));
    if (liste.length === 0) { box.innerHTML = '<p style="color:#64748b;padding:0.75rem;">Aucun élève sur cette sélection.</p>'; return; }

    const modeOpts = (m) => {
        const opts = [['aucune', 'Aucune'], ['pourcentage', 'Pourcentage (%)'], ['fixe', 'Montant fixe / mois'], ['gratuite', 'Gratuité totale']];
        return opts.map(o => `<option value="${o[0]}" ${m === o[0] ? 'selected' : ''}>${o[1]}</option>`).join('');
    };

    let nbReduits = 0;
    const lignes = liste.map(s => {
        const r = redGet(s.id);
        const base = redMensBase(s.classe);
        const eff = (typeof mensualiteEffective === 'function') ? mensualiteEffective(s.id, base) : base;
        if (r.mode && r.mode !== 'aucune') nbReduits++;
        const showVal = (r.mode === 'pourcentage' || r.mode === 'fixe');
        const valPlaceholder = r.mode === 'pourcentage' ? 'ex: 50' : 'ex: 15000';
        return `<tr>
            <td style="font-weight:600;">${redEsc(s.nom)} ${redEsc(s.prenom)}<br><span style="color:#64748b;font-size:0.78rem;font-family:monospace;">${redEsc(s.matricule || '')}</span></td>
            <td>${redEsc(s.classe || '-')}</td>
            <td style="text-align:right;color:#64748b;">${redFCFA(base)}</td>
            <td><select onchange="redSetMode('${s.id}',this.value)" style="margin:0;min-width:160px;">${modeOpts(r.mode || 'aucune')}</select></td>
            <td><input type="number" min="0" value="${showVal ? redAttr(r.valeur) : ''}" placeholder="${valPlaceholder}" ${showVal ? '' : 'disabled style="background:#f1f5f9;"'} oninput="redSetValeur('${s.id}',this.value)" style="width:110px;margin:0;padding:0.3rem;text-align:right;${showVal ? '' : 'background:#f1f5f9;'}"></td>
            <td style="text-align:right;font-weight:700;" id="redEff_${s.id}">${redFCFA(eff)}</td>
            <td><input type="text" value="${redAttr(r.motif || '')}" placeholder="ex: fratrie, bourse…" oninput="redSetMotif('${s.id}',this.value)" style="min-width:150px;margin:0;padding:0.3rem;"></td>
        </tr>`;
    }).join('');

    box.innerHTML = `
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-bottom:0.85rem;">
            <span style="background:#eef2ff;color:#4338ca;border-radius:999px;padding:0.25rem 0.8rem;font-weight:600;">${liste.length} élève(s) affiché(s)</span>
            <span style="background:#dcfce7;color:#166534;border-radius:999px;padding:0.25rem 0.8rem;font-weight:600;">${nbReduits} avec réduction</span>
        </div>
        <table>
            <thead><tr>
                <th>Élève</th><th>Classe</th><th style="text-align:right;">Scolarité / mois (base)</th><th>Type de réduction</th><th>Valeur</th><th style="text-align:right;">Scolarité / mois (après)</th><th>Motif</th>
            </tr></thead>
            <tbody>${lignes}</tbody>
        </table>
        <p style="color:#64748b;font-size:0.82rem;margin:0.75rem 0 0;">💡 La réduction s'applique à la <strong>scolarité mensuelle</strong>. Elle est enregistrée automatiquement et se répercute aussitôt sur le reste à payer, les impayés et le reporting. Les frais d'inscription ne sont pas modifiés.</p>`;
}
