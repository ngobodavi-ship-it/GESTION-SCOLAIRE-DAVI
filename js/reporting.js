// ===== Reporting : analyse financière détaillée =====

let repChartType = null;
let repChartPayment = null;
let repChartMonthly = null;
let repInitialized = false;

const REP_PAY_LABELS = {
    especes: 'Espèces',
    airtel: 'Airtel Money',
    mtn: 'MTN Mobile Money',
    virement: 'Virement bancaire'
};

function repFmt(n) {
    return Math.round(n || 0).toLocaleString('fr-FR') + ' FCFA';
}

function repGetRange() {
    return {
        debut: document.getElementById('repDateDebut').value || null,
        fin: document.getElementById('repDateFin').value || null
    };
}

function repInRange(dateStr, debut, fin) {
    if (!dateStr) return false;
    if (debut && dateStr < debut) return false;
    if (fin && dateStr > fin) return false;
    return true;
}

function repSetMonth() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const last = new Date(y, now.getMonth() + 1, 0).getDate();
    document.getElementById('repDateDebut').value = `${y}-${m}-01`;
    document.getElementById('repDateFin').value = `${y}-${m}-${String(last).padStart(2, '0')}`;
    renderReporting();
}

function repSetYear() {
    const y = new Date().getFullYear();
    document.getElementById('repDateDebut').value = `${y}-01-01`;
    document.getElementById('repDateFin').value = `${y}-12-31`;
    renderReporting();
}

function repSetAll() {
    document.getElementById('repDateDebut').value = '';
    document.getElementById('repDateFin').value = '';
    renderReporting();
}

function renderReporting() {
    // Période par défaut au premier affichage : année en cours
    if (!repInitialized) {
        repInitialized = true;
        if (!document.getElementById('repDateDebut').value && !document.getElementById('repDateFin').value) {
            const y = new Date().getFullYear();
            document.getElementById('repDateDebut').value = `${y}-01-01`;
            document.getElementById('repDateFin').value = `${y}-12-31`;
        }
    }

    const { debut, fin } = repGetRange();
    const tx = transactions.filter(t => repInRange(t.date, debut, fin));
    const sumType = ty => tx.filter(t => t.type === ty).reduce((s, t) => s + parseFloat(t.amount || 0), 0);
    const cntType = ty => tx.filter(t => t.type === ty).length;

    const insc = sumType('inscription');
    const reinsc = sumType('reinscription');
    const scol = sumType('scolarite');
    const dep = sumType('depense');
    const recettes = insc + reinsc + scol;
    const resultat = recettes - dep;
    const masse = employees.reduce((s, e) => s + (parseFloat(e.salaire) || 0), 0);

    // ---- Recouvrement scolarité (situation globale, tous élèves) ----
    let totalDu = 0, totalPaye = 0, totalReste = 0;
    const debiteurs = [];
    students.forEach(s => {
        const b = calculateMonthlyBalances(s.id);
        let du = 0, pa = 0, re = 0;
        Object.values(b).forEach(m => { du += m.prixFixe; pa += m.paye; re += m.reste; });
        totalDu += du; totalPaye += pa; totalReste += re;
        if (re > 0) debiteurs.push({ nom: `${s.nom} ${s.prenom}`, classe: s.classe || '-', reste: re });
    });
    const tauxRecouv = totalDu > 0 ? Math.round(totalPaye / totalDu * 100) : 0;
    debiteurs.sort((a, b) => b.reste - a.reste);

    // ---- Modes de paiement (sur les encaissements) ----
    const methods = { especes: 0, airtel: 0, mtn: 0, virement: 0 };
    tx.filter(t => t.type !== 'depense').forEach(t => {
        const m = t.paymentMethod || 'especes';
        methods[m] = (methods[m] || 0) + parseFloat(t.amount || 0);
    });

    // ---- Dépenses par nature ----
    const natures = {};
    tx.filter(t => t.type === 'depense').forEach(t => {
        const n = t.nature || t.categorie || 'Autre';
        natures[n] = (natures[n] || 0) + parseFloat(t.amount || 0);
    });

    // ================= Mise à jour des indicateurs =================
    document.getElementById('repRecettes').textContent = repFmt(recettes);
    document.getElementById('repDepenses').textContent = repFmt(dep);
    const resEl = document.getElementById('repResultat');
    resEl.textContent = repFmt(resultat);
    resEl.style.color = resultat >= 0 ? '#198754' : '#dc3545';
    document.getElementById('repMasse').textContent = repFmt(masse);
    document.getElementById('repNbTx').textContent = tx.length;
    document.getElementById('repTauxRecouv').textContent = tauxRecouv + ' %';

    // ================= Solde de caisse (livre de caisse) =================
    // Solde actuel = toutes recettes - toutes dépenses (toutes périodes confondues)
    const allRecettes = transactions.filter(t => t.type !== 'depense').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
    const allDepenses = transactions.filter(t => t.type === 'depense').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
    const soldeActuel = allRecettes - allDepenses;
    const elSolde = document.getElementById('repSoldeCaisse');
    if (elSolde) { elSolde.textContent = repFmt(soldeActuel); elSolde.style.color = soldeActuel >= 0 ? '#198754' : '#dc3545'; }

    // Solde initial = net de toutes les transactions AVANT le début de la période filtrée
    const avant = transactions.filter(t => debut && (t.date || '') < debut);
    let soldeInitial = avant.filter(t => t.type !== 'depense').reduce((s, t) => s + parseFloat(t.amount || 0), 0)
        - avant.filter(t => t.type === 'depense').reduce((s, t) => s + parseFloat(t.amount || 0), 0);

    // Regrouper les transactions de la période par mois (YYYY-MM)
    const parMois = {};
    tx.forEach(t => {
        const ym = (t.date || '').slice(0, 7); if (!ym) return;
        if (!parMois[ym]) parMois[ym] = { rec: 0, dep: 0 };
        if (t.type === 'depense') parMois[ym].dep += parseFloat(t.amount || 0);
        else parMois[ym].rec += parseFloat(t.amount || 0);
    });
    const moisNoms = ['', 'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    const moisLbl = ym => { const [y, m] = ym.split('-'); return `${moisNoms[parseInt(m, 10)] || m} ${y}`; };
    const cle = Object.keys(parMois).sort();
    let cumul = soldeInitial;
    const caisseBox = document.getElementById('repCaisseTable');
    if (caisseBox) {
        if (cle.length === 0) {
            caisseBox.innerHTML = '<p style="color:var(--muted,#64748b);padding:0.5rem;">Aucun mouvement de caisse sur la période.</p>';
        } else {
            const lignes = cle.map(ym => {
                const m = parMois[ym];
                const soldeMois = m.rec - m.dep;
                cumul += soldeMois;
                return `<tr>
                    <td style="font-weight:600;">${moisLbl(ym)}</td>
                    <td style="text-align:right;color:var(--ok,#198754);">${repFmt(m.rec)}</td>
                    <td style="text-align:right;color:var(--danger,#dc3545);">${repFmt(m.dep)}</td>
                    <td style="text-align:right;font-weight:600;color:${soldeMois >= 0 ? '#198754' : '#dc3545'};">${repFmt(soldeMois)}</td>
                    <td style="text-align:right;font-weight:700;color:${cumul >= 0 ? '#4338ca' : '#dc3545'};">${repFmt(cumul)}</td>
                </tr>`;
            }).join('');
            const totRec = cle.reduce((s, ym) => s + parMois[ym].rec, 0);
            const totDep = cle.reduce((s, ym) => s + parMois[ym].dep, 0);
            caisseBox.innerHTML = `
                <table>
                    <thead><tr><th>Mois</th><th style="text-align:right;">Recettes</th><th style="text-align:right;">Dépenses</th><th style="text-align:right;">Solde du mois</th><th style="text-align:right;">Solde cumulé</th></tr></thead>
                    <tbody>
                        ${soldeInitial !== 0 ? `<tr style="color:var(--muted,#64748b);"><td>Solde au début de période</td><td></td><td></td><td></td><td style="text-align:right;font-weight:600;">${repFmt(soldeInitial)}</td></tr>` : ''}
                        ${lignes}
                        <tr style="font-weight:700;border-top:2px solid #198754;background:var(--surface-2,#f8fafc);"><td>TOTAL période</td><td style="text-align:right;color:var(--ok,#198754);">${repFmt(totRec)}</td><td style="text-align:right;color:var(--danger,#dc3545);">${repFmt(totDep)}</td><td style="text-align:right;">${repFmt(totRec - totDep)}</td><td style="text-align:right;">${repFmt(cumul)}</td></tr>
                    </tbody>
                </table>`;
        }
    }

    // ================= Détail des recettes =================
    const pct = v => recettes > 0 ? Math.round(v / recettes * 100) : 0;
    document.getElementById('repRecettesTable').innerHTML = `
        <table>
            <thead><tr><th>Type de recette</th><th style="text-align:right;">Nombre</th><th style="text-align:right;">Montant</th><th style="text-align:right;">%</th></tr></thead>
            <tbody>
                <tr><td>📝 Inscriptions</td><td style="text-align:right;">${cntType('inscription')}</td><td style="text-align:right;">${repFmt(insc)}</td><td style="text-align:right;">${pct(insc)} %</td></tr>
                <tr><td>🔄 Réinscriptions</td><td style="text-align:right;">${cntType('reinscription')}</td><td style="text-align:right;">${repFmt(reinsc)}</td><td style="text-align:right;">${pct(reinsc)} %</td></tr>
                <tr><td>📚 Frais scolaires</td><td style="text-align:right;">${cntType('scolarite')}</td><td style="text-align:right;">${repFmt(scol)}</td><td style="text-align:right;">${pct(scol)} %</td></tr>
                <tr style="font-weight:700;border-top:2px solid #1B6BFF;"><td>TOTAL RECETTES</td><td style="text-align:right;">${cntType('inscription') + cntType('reinscription') + cntType('scolarite')}</td><td style="text-align:right;color:var(--ok,#198754);">${repFmt(recettes)}</td><td style="text-align:right;">100 %</td></tr>
            </tbody>
        </table>`;

    // ================= Modes de paiement =================
    const totalEnc = methods.especes + methods.airtel + methods.mtn + methods.virement;
    const pctM = v => totalEnc > 0 ? Math.round(v / totalEnc * 100) : 0;
    document.getElementById('repPaymentTable').innerHTML = `
        <table>
            <thead><tr><th>Mode</th><th style="text-align:right;">Montant</th><th style="text-align:right;">%</th></tr></thead>
            <tbody>
                ${Object.keys(REP_PAY_LABELS).map(k => `
                    <tr><td>${REP_PAY_LABELS[k]}</td><td style="text-align:right;">${repFmt(methods[k])}</td><td style="text-align:right;">${pctM(methods[k])} %</td></tr>
                `).join('')}
                <tr style="font-weight:700;border-top:2px solid #1B6BFF;"><td>TOTAL ENCAISSÉ</td><td style="text-align:right;">${repFmt(totalEnc)}</td><td style="text-align:right;">100 %</td></tr>
            </tbody>
        </table>`;

    // ================= Recouvrement =================
    document.getElementById('repDu').textContent = repFmt(totalDu);
    document.getElementById('repPaye').textContent = repFmt(totalPaye);
    document.getElementById('repReste').textContent = repFmt(totalReste);
    document.getElementById('repTaux2').textContent = tauxRecouv + ' %';
    document.getElementById('repDebiteurs').innerHTML = debiteurs.length === 0
        ? '<p style="color:var(--muted,#64748b);text-align:center;padding:1rem;">Aucun reste à recouvrer 🎉</p>'
        : `<table>
            <thead><tr><th>Élève</th><th>Classe</th><th style="text-align:right;">Reste à payer</th></tr></thead>
            <tbody>${debiteurs.slice(0, 10).map(d => `
                <tr><td style="font-weight:600;">${d.nom}</td><td>${d.classe}</td><td style="text-align:right;color:var(--danger,#dc3545);font-weight:600;">${repFmt(d.reste)}</td></tr>
            `).join('')}</tbody>
           </table>`;

    // ================= Dépenses par nature =================
    const natArr = Object.entries(natures).sort((a, b) => b[1] - a[1]);
    document.getElementById('repDepensesNature').innerHTML = natArr.length === 0
        ? '<p style="color:var(--muted,#64748b);text-align:center;padding:1rem;">Aucune dépense sur la période.</p>'
        : `<table>
            <thead><tr><th>Nature</th><th style="text-align:right;">Montant</th><th style="text-align:right;">%</th></tr></thead>
            <tbody>${natArr.map(([n, v]) => `
                <tr><td>${n}</td><td style="text-align:right;color:var(--danger,#dc3545);">${repFmt(v)}</td><td style="text-align:right;">${dep > 0 ? Math.round(v / dep * 100) : 0} %</td></tr>
            `).join('')}
            <tr style="font-weight:700;border-top:2px solid #1B6BFF;"><td>TOTAL DÉPENSES</td><td style="text-align:right;color:var(--danger,#dc3545);">${repFmt(dep)}</td><td style="text-align:right;">100 %</td></tr>
            </tbody></table>`;

    // ================= Détail des transactions =================
    const typeLabel = { inscription: 'Inscription', reinscription: 'Réinscription', scolarite: 'Frais scolaires', depense: 'Dépense' };
    const txSorted = [...tx].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    document.getElementById('repTxTable').innerHTML = txSorted.length === 0
        ? '<p style="color:var(--muted,#64748b);text-align:center;padding:2rem;">Aucune transaction sur cette période.</p>'
        : `<table>
            <thead><tr><th>Date</th><th>Réf.</th><th>Type</th><th>Élève / Nature</th><th>Mode</th><th style="text-align:right;">Montant</th></tr></thead>
            <tbody>${txSorted.map(t => `
                <tr>
                    <td>${t.date ? new Date(t.date).toLocaleDateString('fr-FR') : '-'}</td>
                    <td style="font-family:monospace;font-size:0.85rem;">${t.reference || '-'}</td>
                    <td>${typeLabel[t.type] || t.type}</td>
                    <td>${t.type === 'depense' ? (t.nature || t.categorie || '-') : (t.studentName || '-')}</td>
                    <td>${t.type === 'depense' ? '-' : (REP_PAY_LABELS[t.paymentMethod] || '-')}</td>
                    <td style="text-align:right;font-weight:600;color:${t.type === 'depense' ? '#dc3545' : '#198754'};">${t.type === 'depense' ? '-' : '+'}${repFmt(t.amount)}</td>
                </tr>
            `).join('')}</tbody></table>`;

    repRenderCharts(insc, reinsc, scol, methods, fin);
}

function repRenderCharts(insc, reinsc, scol, methods, fin) {
    if (typeof Chart === 'undefined') return;

    // Camembert recettes par type
    if (repChartType) repChartType.destroy();
    repChartType = new Chart(document.getElementById('repChartType'), {
        type: 'doughnut',
        data: {
            labels: ['Inscriptions', 'Réinscriptions', 'Frais scolaires'],
            datasets: [{ data: [insc, reinsc, scol], backgroundColor: ['#1B6BFF', '#8b5cf6', '#10b981'] }]
        },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom' } } }
    });

    // Camembert modes de paiement
    if (repChartPayment) repChartPayment.destroy();
    repChartPayment = new Chart(document.getElementById('repChartPayment'), {
        type: 'doughnut',
        data: {
            labels: Object.values(REP_PAY_LABELS),
            datasets: [{ data: [methods.especes, methods.airtel, methods.mtn, methods.virement], backgroundColor: ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'] }]
        },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { position: 'bottom' } } }
    });

    // Évolution mensuelle (année de la date de fin, sinon année en cours)
    const year = fin ? parseInt(fin.substring(0, 4)) : new Date().getFullYear();
    document.getElementById('repYear').textContent = year;
    const moisCourt = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const recettesMois = new Array(12).fill(0);
    const depensesMois = new Array(12).fill(0);
    transactions.forEach(t => {
        if (!t.date || parseInt(t.date.substring(0, 4)) !== year) return;
        const mi = parseInt(t.date.substring(5, 7)) - 1;
        if (mi < 0 || mi > 11) return;
        if (t.type === 'depense') depensesMois[mi] += parseFloat(t.amount || 0);
        else recettesMois[mi] += parseFloat(t.amount || 0);
    });
    if (repChartMonthly) repChartMonthly.destroy();
    repChartMonthly = new Chart(document.getElementById('repChartMonthly'), {
        type: 'bar',
        data: {
            labels: moisCourt,
            datasets: [
                { label: 'Recettes', data: recettesMois, backgroundColor: 'rgba(16,185,129,0.8)' },
                { label: 'Dépenses', data: depensesMois, backgroundColor: 'rgba(239,68,68,0.8)' }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: true,
            plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: c => c.dataset.label + ': ' + Math.round(c.parsed.y).toLocaleString('fr-FR') + ' FCFA' } } },
            scales: { y: { beginAtZero: true, ticks: { callback: v => Math.round(v).toLocaleString('fr-FR') } } }
        }
    });
}
