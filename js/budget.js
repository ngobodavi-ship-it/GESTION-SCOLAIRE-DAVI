// ===== Suivi budgétaire : budget prévu par poste vs réalisé =====

function bgFCFA(n) { return (Math.round(n) || 0).toLocaleString('fr-FR') + ' FCFA'; }
function bgEsc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function bgAttr(s) { return String(s == null ? '' : s).replace(/"/g, '&quot;'); }
function bgEcoleNom() { return localStorage.getItem('digigespro_ecole') || localStorage.getItem('ecole_nom') || 'Établissement scolaire'; }

function bgRead() { try { return JSON.parse(localStorage.getItem('ecole_budget')) || {}; } catch (e) { return {}; } }
function bgSave(o) { localStorage.setItem('ecole_budget', JSON.stringify(o)); }

// Réalisé (dépenses) par poste sur la période choisie
function bgRealiseParPoste() {
    const debut = (document.getElementById('bgDebut') || {}).value || '';
    const fin = (document.getElementById('bgFin') || {}).value || '';
    const map = {};
    transactions.filter(t => t.type === 'depense').forEach(t => {
        const d = t.date || '';
        if (debut && d < debut) return;
        if (fin && d > fin) return;
        const cat = t.nature || t.categorie || 'Autre';
        map[cat] = (map[cat] || 0) + parseFloat(t.amount || 0);
    });
    return map;
}

function bgSetPrevu(poste, val) {
    const o = bgRead();
    const n = parseFloat(val);
    if (!n || n <= 0) delete o[poste]; else o[poste] = n;
    bgSave(o);
    renderBudget();
}

function bgAddPoste() {
    const nom = (prompt('Nom du poste de dépense (ex: Fournitures, Électricité, Transport) :') || '').trim();
    if (!nom) return;
    const o = bgRead();
    if (o[nom] === undefined) o[nom] = 0;
    bgSave(o);
    renderBudget();
    setTimeout(() => { const el = document.getElementById('bg_in_' + nom.replace(/[^0-9A-Za-z]/g, '_')); if (el) el.focus(); }, 50);
}

function bgSupprimer(poste) {
    if (!confirm('Retirer le budget du poste « ' + poste + ' » ? (les dépenses déjà saisies ne sont pas touchées)')) return;
    const o = bgRead(); delete o[poste]; bgSave(o); renderBudget();
}

function bgData() {
    const budget = bgRead();
    const realise = bgRealiseParPoste();
    const postes = [...new Set([...Object.keys(budget), ...Object.keys(realise)])].sort();
    const rows = postes.map(p => {
        const prevu = parseFloat(budget[p]) || 0;
        const reel = realise[p] || 0;
        const reste = prevu - reel;
        const pct = prevu > 0 ? Math.round(reel / prevu * 100) : (reel > 0 ? 999 : 0);
        return { poste: p, prevu, reel, reste, pct, planifie: budget[p] !== undefined };
    });
    return rows;
}

function bgStatutBadge(r) {
    if (!r.planifie) return '<span style="background:var(--surface-2,#f1f5f9);color:var(--muted,#64748b);border-radius:999px;padding:1px 9px;font-size:.76rem;font-weight:700;">Hors budget</span>';
    if (r.reel > r.prevu) return '<span style="background:var(--danger-bg,#fee2e2);color:var(--danger-strong,#991b1b);border-radius:999px;padding:1px 9px;font-size:.76rem;font-weight:700;">Dépassé</span>';
    if (r.pct >= 85) return '<span style="background:var(--warn-bg,#fff7ed);color:var(--warn-strong,#c2410c);border-radius:999px;padding:1px 9px;font-size:.76rem;font-weight:700;">Proche</span>';
    return '<span style="background:var(--ok-bg,#dcfce7);color:var(--ok-strong,#166534);border-radius:999px;padding:1px 9px;font-size:.76rem;font-weight:700;">OK</span>';
}

function bgBar(r) {
    const pct = Math.min(100, r.prevu > 0 ? Math.round(r.reel / r.prevu * 100) : (r.reel > 0 ? 100 : 0));
    const col = r.reel > r.prevu && r.planifie ? '#dc3545' : (r.pct >= 85 && r.planifie ? '#f59e0b' : '#1B6BFF');
    return `<div style="background:var(--surface-2,#eef2f7);border-radius:6px;height:8px;overflow:hidden;min-width:90px;"><div style="width:${pct}%;height:100%;background:${col};"></div></div>`;
}

function renderBudget() {
    const box = document.getElementById('budgetBox');
    if (!box) return;
    const rows = bgData();
    if (rows.length === 0) {
        box.innerHTML = '<p style="color:var(--muted,#64748b);padding:0.75rem;">Aucun poste pour l\'instant. Cliquez « ➕ Poste » pour définir un budget, ou saisissez des dépenses : elles apparaîtront ici automatiquement.</p>';
        return;
    }
    const totPrevu = rows.reduce((a, r) => a + r.prevu, 0);
    const totReel = rows.reduce((a, r) => a + r.reel, 0);
    const totReste = totPrevu - totReel;
    const lignes = rows.map(r => {
        const safe = r.poste.replace(/[^0-9A-Za-z]/g, '_');
        return `<tr>
            <td style="font-weight:600;">${bgEsc(r.poste)}</td>
            <td style="text-align:right;"><input type="number" min="0" step="1000" id="bg_in_${safe}" value="${r.planifie ? r.prevu : ''}" placeholder="—" onchange="bgSetPrevu('${bgAttr(r.poste)}',this.value)" style="width:130px;margin:0;padding:0.3rem;text-align:right;"></td>
            <td style="text-align:right;color:var(--danger,#dc3545);font-weight:600;">${bgFCFA(r.reel)}</td>
            <td style="text-align:right;font-weight:700;color:${r.reste < 0 ? '#dc3545' : '#16a34a'};">${r.planifie ? bgFCFA(r.reste) : '—'}</td>
            <td style="min-width:120px;">${r.planifie ? `<div style="display:flex;align-items:center;gap:6px;">${bgBar(r)}<span style="font-size:.76rem;color:var(--muted,#64748b);">${r.pct === 999 ? '∞' : r.pct + '%'}</span></div>` : ''}</td>
            <td>${bgStatutBadge(r)}</td>
            <td style="text-align:right;">${r.planifie ? `<button class="btn btn-danger" style="padding:.2rem .45rem;font-size:.76rem;" onclick="bgSupprimer('${bgAttr(r.poste)}')">🗑️</button>` : ''}</td>
        </tr>`;
    }).join('');
    const pctGlobal = totPrevu > 0 ? Math.round(totReel / totPrevu * 100) : 0;
    box.innerHTML = `
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-bottom:0.85rem;">
            <span style="background:var(--brand-bg,#eef2ff);color:var(--brand-strong,#4338ca);border-radius:999px;padding:.25rem .8rem;font-weight:600;">Budget prévu : ${bgFCFA(totPrevu)}</span>
            <span style="background:var(--danger-bg,#fee2e2);color:var(--danger-strong,#991b1b);border-radius:999px;padding:.25rem .8rem;font-weight:600;">Réalisé : ${bgFCFA(totReel)}</span>
            <span style="background:${totReste < 0 ? '#fee2e2' : '#dcfce7'};color:${totReste < 0 ? '#991b1b' : '#166534'};border-radius:999px;padding:.25rem .8rem;font-weight:600;">Reste : ${bgFCFA(totReste)}</span>
            <span style="background:linear-gradient(135deg,#1B6BFF,#28C6F5);color:#fff;border-radius:999px;padding:.25rem .9rem;font-weight:700;">Consommé : ${pctGlobal}%</span>
        </div>
        <table>
            <thead><tr><th>Poste de dépense</th><th style="text-align:right;">Budget prévu</th><th style="text-align:right;">Réalisé</th><th style="text-align:right;">Reste</th><th>Consommation</th><th>Statut</th><th></th></tr></thead>
            <tbody>${lignes}
                <tr style="font-weight:700;border-top:2px solid #1B6BFF;background:var(--surface-2,#f8fafc);">
                    <td>TOTAL</td><td style="text-align:right;">${bgFCFA(totPrevu)}</td><td style="text-align:right;color:var(--danger,#dc3545);">${bgFCFA(totReel)}</td><td style="text-align:right;color:${totReste < 0 ? '#dc3545' : '#16a34a'};">${bgFCFA(totReste)}</td><td colspan="3"></td>
                </tr>
            </tbody>
        </table>
        <p style="color:var(--muted,#64748b);font-size:.8rem;margin:.75rem 0 0;">💡 Saisissez le budget prévu dans la colonne (laissez vide pour retirer). Les postes « Hors budget » sont des dépenses sans budget défini. Utilisez les dates pour limiter le réalisé à une période.</p>`;
}

function bgImprimer() {
    const rows = bgData();
    if (!rows.length) { alert('Aucune donnée budgétaire à imprimer.'); return; }
    const ecole = bgEcoleNom();
    const debut = (document.getElementById('bgDebut') || {}).value || '';
    const fin = (document.getElementById('bgFin') || {}).value || '';
    const periode = (debut || fin) ? `Réalisé ${debut ? 'du ' + new Date(debut).toLocaleDateString('fr-FR') : ''} ${fin ? 'au ' + new Date(fin).toLocaleDateString('fr-FR') : ''}` : 'Réalisé : toutes périodes';
    const totPrevu = rows.reduce((a, r) => a + r.prevu, 0);
    const totReel = rows.reduce((a, r) => a + r.reel, 0);
    let i = 0;
    const lignes = rows.map(r => {
        i++;
        return `<tr><td style="border:1px solid #999;padding:4px 8px;text-align:center;">${i}</td><td style="border:1px solid #999;padding:4px 8px;">${bgEsc(r.poste)}</td><td style="border:1px solid #999;padding:4px 8px;text-align:right;">${r.planifie ? bgFCFA(r.prevu) : '—'}</td><td style="border:1px solid #999;padding:4px 8px;text-align:right;">${bgFCFA(r.reel)}</td><td style="border:1px solid #999;padding:4px 8px;text-align:right;">${r.planifie ? bgFCFA(r.reste) : '—'}</td><td style="border:1px solid #999;padding:4px 8px;text-align:center;">${r.planifie ? (r.pct === 999 ? '∞' : r.pct + '%') : ''}</td></tr>`;
    }).join('');
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Suivi budgétaire</title></head>
        <body style="font-family:Arial,sans-serif;padding:1.6rem;color:var(--ink,#111);">
        <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:.6rem;margin-bottom:1rem;">
            <p style="margin:0;font-size:.8rem;">RÉPUBLIQUE DU CONGO — Unité · Travail · Progrès</p>
            <h2 style="margin:.3rem 0;">${bgEsc(ecole)}</h2>
            <h3 style="margin:0;">Suivi budgétaire</h3>
            <p style="margin:.2rem 0;font-size:.85rem;">${bgEsc(periode)} — édité le ${new Date().toLocaleDateString('fr-FR')}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:.88rem;">
            <thead><tr style="background:var(--surface-2,#eee);"><th style="border:1px solid #999;padding:4px 8px;">N°</th><th style="border:1px solid #999;padding:4px 8px;text-align:left;">Poste</th><th style="border:1px solid #999;padding:4px 8px;">Budget prévu</th><th style="border:1px solid #999;padding:4px 8px;">Réalisé</th><th style="border:1px solid #999;padding:4px 8px;">Reste</th><th style="border:1px solid #999;padding:4px 8px;">Conso.</th></tr></thead>
            <tbody>${lignes}<tr style="font-weight:700;background:var(--surface-2,#f3f4f6);"><td colspan="2" style="border:1px solid #999;padding:4px 8px;text-align:right;">TOTAL</td><td style="border:1px solid #999;padding:4px 8px;text-align:right;">${bgFCFA(totPrevu)}</td><td style="border:1px solid #999;padding:4px 8px;text-align:right;">${bgFCFA(totReel)}</td><td style="border:1px solid #999;padding:4px 8px;text-align:right;">${bgFCFA(totPrevu - totReel)}</td><td style="border:1px solid #999;padding:4px 8px;"></td></tr></tbody>
        </table>
        <div style="margin-top:2rem;text-align:right;font-size:.9rem;">Le Gestionnaire<br><br>__________________</div>
        </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
}
