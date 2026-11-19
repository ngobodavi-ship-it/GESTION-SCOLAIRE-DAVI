// ===== Échéancier de paiement : plan de versements par élève =====

function echFCFA(n) { return (Math.round(n) || 0).toLocaleString('fr-FR') + ' FCFA'; }
function echEsc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function echAttr(s) { return String(s == null ? '' : s).replace(/"/g, '&quot;'); }
function echEcoleNom() { return localStorage.getItem('digigespro_ecole') || localStorage.getItem('ecole_nom') || 'Établissement scolaire'; }
function echToday() { return new Date().toISOString().split('T')[0]; }
function echDateFr(d) { return d ? new Date(d).toLocaleDateString('fr-FR') : '—'; }

function echRead() { try { return JSON.parse(localStorage.getItem('ecole_echeanciers')) || {}; } catch (e) { return {}; } }
function echSave(o) { localStorage.setItem('ecole_echeanciers', JSON.stringify(o)); }
function echGet(id) { const e = echRead()[id]; return e && Array.isArray(e.tranches) ? e : { tranches: [] }; }

// Détails élève depuis le registre Scolarité
function echEleveInfo(id, matricule) {
    try { const eco = JSON.parse(localStorage.getItem('ecole_eleves')) || []; return eco.find(x => x.id === id || (matricule && x.matricule === matricule)) || {}; } catch (e) { return {}; }
}
// Total déjà payé en scolarité par l'élève
function echTotalPaye(id) {
    return transactions.filter(t => t.studentId === id && t.type === 'scolarite').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
}
// Scolarité annuelle due (grille × mois, après réduction) via calculateMonthlyBalances
function echDuAnnuel(id) {
    let du = 0;
    try { const b = calculateMonthlyBalances(id); Object.values(b).forEach(m => du += m.prixFixe); } catch (e) { }
    return du;
}

// Calcule le statut de chaque tranche par imputation FIFO du total payé
function echStatuts(id) {
    const ech = echGet(id);
    const tranches = ech.tranches.slice().sort((a, b) => (a.date || '9999') < (b.date || '9999') ? -1 : 1);
    let pool = echTotalPaye(id);
    const today = echToday();
    return tranches.map(t => {
        const montant = parseFloat(t.montant) || 0;
        let statut, restant = 0;
        if (pool >= montant) { statut = 'payee'; pool -= montant; }
        else if (pool > 0) { statut = 'partielle'; restant = montant - pool; pool = 0; }
        else { restant = montant; statut = (t.date && t.date < today) ? 'retard' : 'avenir'; }
        return { label: t.label || '', montant, date: t.date || '', statut, restant };
    });
}

function echBadge(st) {
    const map = {
        payee: ['Payée', '#dcfce7', '#166534'],
        partielle: ['Partielle', '#fff7ed', '#c2410c'],
        retard: ['En retard', '#fee2e2', '#991b1b'],
        avenir: ['À venir', '#eef2ff', '#4338ca']
    };
    const m = map[st] || map.avenir;
    return `<span style="background:${m[1]};color:${m[2]};border-radius:999px;padding:1px 9px;font-size:0.78rem;font-weight:700;">${m[0]}</span>`;
}

function renderEcheancier() {
    const sel = document.getElementById('echEleve');
    if (sel) {
        const cur = sel.value;
        const liste = students.slice().sort((a, b) => (`${a.nom} ${a.prenom}`).localeCompare(`${b.nom} ${b.prenom}`));
        sel.innerHTML = '<option value="">-- Choisir un élève --</option>' + liste.map(s => `<option value="${echAttr(s.id)}" ${s.id === cur ? 'selected' : ''}>${echEsc(s.nom)} ${echEsc(s.prenom)} — ${echEsc(s.classe || '')}</option>`).join('');
    }
    const box = document.getElementById('echBox');
    if (!box) return;
    const id = sel ? sel.value : '';
    if (!id) { box.innerHTML = '<p style="color:var(--muted,#64748b);padding:0.5rem;">Choisissez un élève pour créer ou consulter son échéancier.</p>'; return; }
    const s = students.find(x => x.id === id); if (!s) { box.innerHTML = ''; return; }
    const ech = echGet(id);
    const statuts = echStatuts(id);
    const totalPlan = ech.tranches.reduce((a, t) => a + (parseFloat(t.montant) || 0), 0);
    const du = echDuAnnuel(id);
    const paye = echTotalPaye(id);
    const tranchesTries = ech.tranches.slice().sort((a, b) => (a.date || '9999') < (b.date || '9999') ? -1 : 1);

    const lignes = tranchesTries.map((t, idx) => {
        const st = statuts[idx] || {};
        // index réel dans le tableau non trié pour l'édition
        const realIdx = ech.tranches.indexOf(t);
        return `<tr>
            <td><input type="text" value="${echAttr(t.label || '')}" placeholder="ex: 1er versement" oninput="echSetTranche(${realIdx},'label',this.value)" style="min-width:150px;margin:0;padding:0.3rem;"></td>
            <td><input type="number" min="0" step="500" value="${echAttr(t.montant || '')}" placeholder="0" oninput="echSetTranche(${realIdx},'montant',this.value)" style="width:120px;margin:0;padding:0.3rem;text-align:right;"></td>
            <td><input type="date" value="${echAttr(t.date || '')}" onchange="echSetTranche(${realIdx},'date',this.value)" style="width:160px;margin:0;padding:0.3rem;"></td>
            <td>${echBadge(st.statut)}${st.statut === 'partielle' ? `<br><span style="font-size:0.72rem;color:var(--warn-strong,#c2410c);">reste ${echFCFA(st.restant)}</span>` : ''}</td>
            <td style="text-align:right;"><button class="btn btn-danger" style="padding:0.25rem 0.5rem;font-size:0.78rem;" onclick="echDelTranche(${realIdx})">🗑️</button></td>
        </tr>`;
    }).join('');

    const coherence = totalPlan === 0 ? '' :
        (Math.abs(totalPlan - du) <= 1
            ? `<span style="color:var(--ok-strong,#166534);font-weight:600;">✓ Le plan correspond au montant dû (${echFCFA(du)}).</span>`
            : `<span style="color:var(--warn-strong,#c2410c);font-weight:600;">⚠️ Plan : ${echFCFA(totalPlan)} — Scolarité due : ${echFCFA(du)} (écart de ${echFCFA(Math.abs(totalPlan - du))}).</span>`);

    box.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.75rem;margin-bottom:0.75rem;">
            <div>
                <h4 style="margin:0;font-weight:700;">${echEsc(s.nom)} ${echEsc(s.prenom)} — ${echEsc(s.classe || '')}</h4>
                <div style="font-size:0.85rem;color:var(--muted,#64748b);margin-top:0.2rem;">Scolarité due : <strong>${echFCFA(du)}</strong> · Déjà payé : <strong style="color:var(--ok,#16a34a);">${echFCFA(paye)}</strong></div>
            </div>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                <button class="btn btn-secondary" onclick="echGenererAuto()">✨ Générer automatiquement</button>
                <button class="btn btn-primary" onclick="echImprimerEngagement()">🖨️ Imprimer l'engagement</button>
            </div>
        </div>
        <table>
            <thead><tr><th>Libellé</th><th style="text-align:right;">Montant</th><th>Date d'échéance</th><th>Statut</th><th></th></tr></thead>
            <tbody>${lignes || '<tr><td colspan="5" style="color:var(--muted,#64748b);padding:0.5rem;">Aucune tranche. Ajoutez-en une ci-dessous ou cliquez « Générer automatiquement ».</td></tr>'}</tbody>
        </table>
        <div style="margin-top:0.75rem;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
            <button class="btn btn-secondary" onclick="echAddTranche()">➕ Ajouter une tranche</button>
            <div style="font-size:0.9rem;">Total planifié : <strong>${echFCFA(totalPlan)}</strong></div>
        </div>
        <p style="margin:0.6rem 0 0;font-size:0.84rem;">${coherence}</p>`;
}

function echAddTranche() {
    const id = document.getElementById('echEleve').value; if (!id) return;
    const o = echRead();
    if (!o[id]) o[id] = { tranches: [] };
    o[id].tranches.push({ label: 'Versement ' + (o[id].tranches.length + 1), montant: '', date: '' });
    echSave(o); renderEcheancier();
}
function echDelTranche(idx) {
    const id = document.getElementById('echEleve').value; if (!id) return;
    const o = echRead(); if (!o[id]) return;
    o[id].tranches.splice(idx, 1); echSave(o); renderEcheancier();
}
function echSetTranche(idx, champ, val) {
    const id = document.getElementById('echEleve').value; if (!id) return;
    const o = echRead(); if (!o[id] || !o[id].tranches[idx]) return;
    o[id].tranches[idx][champ] = val; echSave(o);
    // recalcul léger des statuts/total sans tout reconstruire pour ne pas perdre le focus de saisie
    if (champ === 'date') renderEcheancier();
}

// Génère 3 tranches égales sur le montant dû, espacées (octobre, janvier, avril)
function echGenererAuto() {
    const id = document.getElementById('echEleve').value; if (!id) return;
    const du = echDuAnnuel(id);
    if (du <= 0) { alert('Définissez d\'abord la scolarité (grille tarifaire) pour la classe de cet élève.'); return; }
    if (!confirm('Générer un échéancier de 3 versements égaux ? Cela remplacera les tranches actuelles.')) return;
    const an = new Date().getFullYear();
    const part = Math.round(du / 3);
    const tranches = [
        { label: '1er versement', montant: part, date: an + '-10-05' },
        { label: '2e versement', montant: part, date: (an + 1) + '-01-10' },
        { label: '3e versement', montant: du - 2 * part, date: (an + 1) + '-04-10' }
    ];
    const o = echRead(); o[id] = { tranches }; echSave(o); renderEcheancier();
}

function echImprimerEngagement() {
    const id = document.getElementById('echEleve').value; if (!id) { alert('Choisissez un élève.'); return; }
    const s = students.find(x => x.id === id); if (!s) return;
    const ech = echGet(id);
    if (!ech.tranches.length) { alert('Aucune tranche à imprimer. Ajoutez des versements d\'abord.'); return; }
    const info = echEleveInfo(id, s.matricule);
    const ecole = echEcoleNom();
    const statuts = echStatuts(id);
    const total = ech.tranches.reduce((a, t) => a + (parseFloat(t.montant) || 0), 0);
    const rows = ech.tranches.slice().sort((a, b) => (a.date || '9999') < (b.date || '9999') ? -1 : 1).map((t, i) => {
        return `<tr><td style="border:1px solid #999;padding:5px 9px;">${i + 1}. ${echEsc(t.label || '')}</td><td style="border:1px solid #999;padding:5px 9px;text-align:right;">${echFCFA(parseFloat(t.montant) || 0)}</td><td style="border:1px solid #999;padding:5px 9px;">${echDateFr(t.date)}</td></tr>`;
    }).join('');
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Engagement de paiement - ${echEsc(s.nom)} ${echEsc(s.prenom)}</title></head>
        <body style="font-family:'Times New Roman',serif;padding:2.4rem;color:var(--ink,#111);max-width:780px;margin:0 auto;">
        <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:.7rem;margin-bottom:1.2rem;">
            <p style="margin:0;font-size:.85rem;">RÉPUBLIQUE DU CONGO — Unité · Travail · Progrès</p>
            <h2 style="margin:.4rem 0 0;text-transform:uppercase;">${echEsc(ecole)}</h2>
        </div>
        <h1 style="text-align:center;text-transform:uppercase;letter-spacing:2px;font-size:1.4rem;margin:1rem 0 1.4rem;">Engagement de paiement</h1>
        <p style="line-height:1.9;font-size:1.05rem;text-align:justify;">
            Je soussigné(e) <strong>${echEsc(info.tuteur) || '.................................'}</strong>, parent / tuteur de l'élève
            <strong>${echEsc(s.nom)} ${echEsc(s.prenom)}</strong> (matricule ${echEsc(s.matricule || '—')}),
            inscrit(e) en classe de <strong>${echEsc(s.classe || '—')}</strong>, m'engage à régler les frais de scolarité
            selon l'échéancier suivant :
        </p>
        <table style="width:100%;border-collapse:collapse;margin:1rem 0;font-size:1rem;">
            <thead><tr style="background:var(--surface-2,#eee);"><th style="border:1px solid #999;padding:5px 9px;text-align:left;">Versement</th><th style="border:1px solid #999;padding:5px 9px;">Montant</th><th style="border:1px solid #999;padding:5px 9px;text-align:left;">Date limite</th></tr></thead>
            <tbody>${rows}<tr style="font-weight:700;background:var(--surface-2,#f5f5f5);"><td style="border:1px solid #999;padding:5px 9px;text-align:right;">TOTAL</td><td style="border:1px solid #999;padding:5px 9px;text-align:right;">${echFCFA(total)}</td><td style="border:1px solid #999;padding:5px 9px;"></td></tr></tbody>
        </table>
        <p style="line-height:1.9;font-size:1.05rem;text-align:justify;">En cas de non-respect des échéances, l'établissement se réserve le droit d'appliquer son règlement intérieur.</p>
        <div style="display:flex;justify-content:space-between;margin-top:2.6rem;font-size:1rem;">
            <div>Fait à ......................., le ${new Date().toLocaleDateString('fr-FR')}</div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:2rem;font-size:1rem;">
            <div style="text-align:center;">Le parent / tuteur<div style="height:60px;"></div>(Signature)</div>
            <div style="text-align:center;">Le Chef d'établissement<div style="height:60px;"></div>(Signature et cachet)</div>
        </div>
        </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
}

// Vue globale : toutes les tranches en retard, tous élèves confondus
function echApercuRetards() {
    const o = echRead();
    const today = echToday();
    const retards = [];
    students.forEach(s => {
        const ech = o[s.id]; if (!ech || !Array.isArray(ech.tranches)) return;
        const statuts = echStatuts(s.id);
        const tries = ech.tranches.slice().sort((a, b) => (a.date || '9999') < (b.date || '9999') ? -1 : 1);
        tries.forEach((t, i) => {
            const st = statuts[i];
            if (st && (st.statut === 'retard' || (st.statut === 'partielle' && t.date && t.date < today))) {
                retards.push({ s, label: t.label, date: t.date, restant: st.restant });
            }
        });
    });
    if (!retards.length) { alert('Aucune échéance en retard. 👍'); return; }
    retards.sort((a, b) => (a.date || '') < (b.date || '') ? -1 : 1);
    const ecole = echEcoleNom();
    const totalRetard = retards.reduce((a, r) => a + r.restant, 0);
    const rows = retards.map((r, i) => {
        const info = echEleveInfo(r.s.id, r.s.matricule);
        return `<tr><td style="border:1px solid #999;padding:3px 8px;text-align:center;">${i + 1}</td><td style="border:1px solid #999;padding:3px 8px;">${echEsc(r.s.nom)} ${echEsc(r.s.prenom)}</td><td style="border:1px solid #999;padding:3px 8px;">${echEsc(r.s.classe || '')}</td><td style="border:1px solid #999;padding:3px 8px;">${echEsc(r.label || '')}</td><td style="border:1px solid #999;padding:3px 8px;">${echDateFr(r.date)}</td><td style="border:1px solid #999;padding:3px 8px;">${echEsc(info.telephone || '')}</td><td style="border:1px solid #999;padding:3px 8px;text-align:right;font-weight:700;">${echFCFA(r.restant)}</td></tr>`;
    }).join('');
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Échéances en retard</title></head>
        <body style="font-family:Arial,sans-serif;padding:1.6rem;color:var(--ink,#111);">
        <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:.6rem;margin-bottom:1rem;">
            <p style="margin:0;font-size:.8rem;">RÉPUBLIQUE DU CONGO — Unité · Travail · Progrès</p>
            <h2 style="margin:.3rem 0;">${echEsc(ecole)}</h2>
            <h3 style="margin:0;">Échéances de paiement en retard</h3>
            <p style="margin:.2rem 0;font-size:.85rem;">Édité le ${new Date().toLocaleDateString('fr-FR')}</p>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:.86rem;">
            <thead><tr style="background:var(--surface-2,#eee);"><th style="border:1px solid #999;padding:3px 8px;">N°</th><th style="border:1px solid #999;padding:3px 8px;text-align:left;">Élève</th><th style="border:1px solid #999;padding:3px 8px;">Classe</th><th style="border:1px solid #999;padding:3px 8px;">Versement</th><th style="border:1px solid #999;padding:3px 8px;">Échéance</th><th style="border:1px solid #999;padding:3px 8px;">Tél.</th><th style="border:1px solid #999;padding:3px 8px;">Reste dû</th></tr></thead>
            <tbody>${rows}<tr style="font-weight:700;background:var(--surface-2,#f5f5f5);"><td colspan="6" style="border:1px solid #999;padding:3px 8px;text-align:right;">TOTAL EN RETARD</td><td style="border:1px solid #999;padding:3px 8px;text-align:right;">${echFCFA(totalRetard)}</td></tr></tbody>
        </table>
        </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
}
