// ===== Enseignants (paie) : miroir de la Direction des études + calcul des salaires =====
// Lecture seule des enseignants définis par le DE (ecole_enseignants) + heures validées (ecole_heures).

function egRead(k, def) { try { return JSON.parse(localStorage.getItem(k)) || def; } catch (e) { return def; } }
function egEnseignants() { return egRead('ecole_enseignants', []); }
function egHeures() { return egRead('ecole_heures', []); }
function egPayes() { return egRead('digigespro_salaires_enseignants', []); }
function egSavePayes(a) { localStorage.setItem('digigespro_salaires_enseignants', JSON.stringify(a)); }
function egPrimes() { return egRead('digigespro_primes_enseignants', {}); }
function egSavePrimes(o) { localStorage.setItem('digigespro_primes_enseignants', JSON.stringify(o)); }
function egSetPrime(id, val) {
    const ym = egPeriodeCourante();
    const primes = egPrimes();
    const n = parseFloat(val);
    if (!n || n <= 0) delete primes[id + '|' + ym]; else primes[id + '|' + ym] = n;
    egSavePrimes(primes);
    renderEnseignantsGestion();
}
function egFCFA(n) { return Math.round(n || 0).toLocaleString('fr-FR') + ' FCFA'; }
function egEsc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function egNomComplet(e) { return `${e.nom || ''} ${e.prenom || ''}`.trim(); }

function egPeriodeCourante() {
    const el = document.getElementById('egPeriode');
    if (el && el.value) return el.value;
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); // YYYY-MM
}

// Heures validées NON payées de l'enseignant pour le mois (YYYY-MM)
function egHeuresMois(ensId, ym) {
    return egHeures().filter(h => h.enseignantId === ensId && h.statut === 'valide' && !h.paye && (h.date || '').slice(0, 7) === ym);
}
// Salaire fixe déjà payé pour ce mois ?
function egFixePaye(ensId, ym) {
    return egPayes().some(p => p.enseignantId === ensId && p.periode === ym);
}

function egLigneNiveauBadge(niv) {
    const prim = niv === 'Primaire';
    const tech = (niv || '').indexOf('technique') >= 0;
    const bg = prim ? '#ecfeff' : '#eef2ff', fg = prim ? '#0e7490' : '#4338ca';
    return `<span style="background:${bg};color:${fg};border-radius:999px;padding:0.1rem 0.55rem;font-size:0.78rem;">${egEsc(niv || 'Collège')}</span>`;
}

function renderEnseignantsGestion() {
    // Initialise le mois si vide
    const pEl = document.getElementById('egPeriode');
    if (pEl && !pEl.value) pEl.value = egPeriodeCourante();
    const ym = egPeriodeCourante();
    const ens = egEnseignants();

    // ---- Liste du corps enseignant (miroir DE) ----
    const liste = document.getElementById('egListeBox');
    if (liste) {
        liste.innerHTML = `
            <h4 style="font-weight:700;margin:0 0 0.75rem;">👥 Corps enseignant (${ens.length})</h4>
            ${ens.length === 0 ? '<p style="color:#64748b;">Aucun enseignant. Ils sont créés par la Direction des études.</p>' : `
            <table>
                <thead><tr><th>Nom</th><th>Niveau</th><th>Classe</th><th>Matière</th><th style="text-align:right;">Salaire fixe</th><th style="text-align:right;">Taux horaire</th></tr></thead>
                <tbody>${ens.map(e => `<tr>
                    <td style="font-weight:600;">${egEsc(egNomComplet(e))}</td>
                    <td>${egLigneNiveauBadge(e.niveau)}</td>
                    <td>${egEsc(e.classe || (e.classes && e.classes.length ? e.classes.join(', ') : '') || '-')}</td>
                    <td>${egEsc(e.matiere || '-')}</td>
                    <td style="text-align:right;white-space:nowrap;">${e.salaireFixe ? egFCFA(e.salaireFixe) : '-'}</td>
                    <td style="text-align:right;white-space:nowrap;">${e.tauxHoraire ? egFCFA(e.tauxHoraire) + '/h' : '-'}</td>
                </tr>`).join('')}</tbody>
            </table>`}`;
    }

    // ---- État de paie du mois ----
    const primes = egPrimes();
    const recap = ens.map(e => {
        const fixe = parseFloat(e.salaireFixe) || 0;
        const taux = parseFloat(e.tauxHoraire) || 0;
        const hs = egHeuresMois(e.id, ym);
        const heures = hs.reduce((s, h) => s + (parseFloat(h.heures) || 0), 0);
        const vac = heures * taux;
        const dejaFixe = egFixePaye(e.id, ym);
        const fixeDu = dejaFixe ? 0 : fixe;
        const prime = parseFloat(primes[e.id + '|' + ym]) || 0;
        const primeDu = dejaFixe ? 0 : prime;
        return { id: e.id, nom: egNomComplet(e), niveau: e.niveau || '', fixe: fixe, fixeDu: fixeDu, dejaFixe: dejaFixe, prime: prime, primeDu: primeDu, taux: taux, heures: heures, vac: vac, ids: hs.map(h => h.id), total: fixeDu + vac + primeDu };
    }).filter(r => r.fixe > 0 || r.heures > 0 || r.prime > 0 || r.dejaFixe);

    _egRecap = recap;
    const totFixe = recap.reduce((s, r) => s + r.fixeDu, 0);
    const totPrime = recap.reduce((s, r) => s + r.primeDu, 0);
    const totVac = recap.reduce((s, r) => s + r.vac, 0);
    const totGen = totFixe + totPrime + totVac;

    const box = document.getElementById('egPaieBox');
    if (!box) return;
    const moisLisible = (function () { const [y, m] = ym.split('-'); const noms = ['', 'janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']; return `${noms[parseInt(m, 10)] || ''} ${y}`; })();

    box.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.75rem;margin-bottom:0.75rem;">
            <h4 style="font-weight:700;margin:0;">💰 État de paie — ${moisLisible}</h4>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
                <button class="btn btn-secondary" onclick="egExportExcel()">📊 Excel</button>
                <button class="btn btn-secondary" onclick="egImprimer()">🖨️ Imprimer</button>
                <button class="btn btn-primary" onclick="egPayerTout()">✓ Payer tout</button>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:0.75rem;margin-bottom:1rem;">
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:0.9rem;text-align:center;"><div style="font-size:1.3rem;font-weight:700;color:#0e7490;">${egFCFA(totFixe)}</div><div style="color:#64748b;font-size:0.82rem;">Salaires fixes</div></div>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:0.9rem;text-align:center;"><div style="font-size:1.3rem;font-weight:700;color:#16a34a;">${egFCFA(totPrime)}</div><div style="color:#64748b;font-size:0.82rem;">Primes</div></div>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:0.9rem;text-align:center;"><div style="font-size:1.3rem;font-weight:700;color:#7c3aed;">${egFCFA(totVac)}</div><div style="color:#64748b;font-size:0.82rem;">Vacations (heures)</div></div>
            <div style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:12px;padding:0.9rem;text-align:center;"><div style="font-size:1.3rem;font-weight:700;color:#4338ca;">${egFCFA(totGen)}</div><div style="color:#64748b;font-size:0.82rem;">Total à payer</div></div>
        </div>
        ${recap.length === 0 ? '<p style="color:#64748b;">Aucun salaire, prime ni vacation à payer pour ce mois.</p>' : `
        <table>
            <thead><tr><th>Enseignant</th><th>Niveau</th><th style="text-align:right;">Salaire fixe</th><th style="text-align:center;">Heures</th><th style="text-align:right;">Vacations</th><th style="text-align:right;">Prime</th><th style="text-align:right;">Total</th><th style="text-align:center;">Statut</th><th style="text-align:right;">Action</th></tr></thead>
            <tbody>${recap.map(r => {
                const paye = r.dejaFixe && r.heures === 0;
                return `<tr>
                    <td style="font-weight:600;">${egEsc(r.nom)}</td>
                    <td>${egLigneNiveauBadge(r.niveau)}</td>
                    <td style="text-align:right;white-space:nowrap;">${r.dejaFixe ? '<span style="color:#16a34a;">payé</span>' : (r.fixe ? egFCFA(r.fixe) : '-')}</td>
                    <td style="text-align:center;">${r.heures || '-'}</td>
                    <td style="text-align:right;white-space:nowrap;">${r.vac ? egFCFA(r.vac) : '-'}</td>
                    <td style="text-align:right;">${r.dejaFixe
                        ? (r.prime ? egFCFA(r.prime) : '-')
                        : `<input type="number" min="0" step="500" value="${r.prime || ''}" placeholder="0" onchange="egSetPrime('${r.id}', this.value)" style="width:90px;margin:0;padding:0.25rem;text-align:right;">`}</td>
                    <td style="text-align:right;font-weight:700;white-space:nowrap;">${egFCFA(r.total)}</td>
                    <td style="text-align:center;">${paye ? '<span style="color:#16a34a;font-weight:600;">✓ Payé</span>' : '<span style="color:#f59e0b;font-weight:600;">À payer</span>'}</td>
                    <td style="text-align:right;">${r.total > 0 ? `<button class="btn btn-primary" style="padding:0.3rem 0.7rem;font-size:0.82rem;" onclick="egPayer('${r.id}')">Payer</button>` : '—'}</td>
                </tr>`;
            }).join('')}
            <tr style="background:#f8fafc;font-weight:700;"><td colspan="6" style="text-align:right;">TOTAL GÉNÉRAL</td><td style="text-align:right;">${egFCFA(totGen)}</td><td colspan="2"></td></tr>
            </tbody>
        </table>`}`;
}

var _egRecap = [];

function egPayerUn(r, ym, today, time) {
    if (r.total <= 0) return false;
    transactions.push({
        id: Date.now().toString() + '_' + r.id,
        date: today, time: time, type: 'depense', categorie: 'Salaire enseignant',
        amount: r.total, beneficiaire: r.nom, enseignantId: r.id, periode: ym,
        description: `Paie ${ym} — ${r.nom}` + (r.fixeDu > 0 ? ` — fixe ${egFCFA(r.fixeDu)}` : '') + (r.primeDu > 0 ? ` — prime ${egFCFA(r.primeDu)}` : '') + (r.vac > 0 ? ` — vacations ${r.heures}h` : ''),
        reference: `SAL-${String(transactions.filter(t => t.type === 'depense').length + 1).padStart(3, '0')}`
    });
    // marquer le salaire fixe + la prime payés pour ce mois
    if (r.fixeDu > 0 || r.primeDu > 0) {
        const payes = egPayes();
        payes.push({ enseignantId: r.id, periode: ym, montantFixe: r.fixeDu, montantPrime: r.primeDu, le: today });
        egSavePayes(payes);
    }
    // marquer les heures payées
    if (r.ids.length) {
        const heures = egHeures();
        heures.forEach(h => { if (r.ids.indexOf(h.id) >= 0) { h.paye = true; h.payeLe = today; } });
        localStorage.setItem('ecole_heures', JSON.stringify(heures));
    }
    return true;
}

function egPayer(ensId) {
    const ym = egPeriodeCourante();
    const r = _egRecap.find(x => x.id === ensId);
    if (!r || r.total <= 0) { alert('Rien à payer pour cet enseignant.'); return; }
    if (!confirm(`Payer ${egFCFA(r.total)} à ${r.nom} pour ${ym} ?\n(Salaire fixe : ${egFCFA(r.fixeDu)} + Vacations : ${egFCFA(r.vac)})\nEnregistré en dépense.`)) return;
    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    egPayerUn(r, ym, today, time);
    localStorage.setItem('digigespro_transactions', JSON.stringify(transactions));
    if (typeof updateUI === 'function') updateUI();
    renderEnseignantsGestion();
    alert('Paiement enregistré en dépense.');
}

function egPayerTout() {
    const ym = egPeriodeCourante();
    const aPayer = _egRecap.filter(r => r.total > 0);
    if (!aPayer.length) { alert('Aucun montant à payer pour ce mois.'); return; }
    const tot = aPayer.reduce((s, r) => s + r.total, 0);
    if (!confirm(`Payer l'ensemble du corps enseignant pour ${ym} : ${egFCFA(tot)} ?\nEnregistré en dépenses.`)) return;
    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    aPayer.forEach(r => egPayerUn(r, ym, today, time));
    localStorage.setItem('digigespro_transactions', JSON.stringify(transactions));
    if (typeof updateUI === 'function') updateUI();
    renderEnseignantsGestion();
    alert('Paie du mois enregistrée en dépenses.');
}

function egExportExcel() {
    if (typeof XLSX === 'undefined') { alert('Export indisponible.'); return; }
    const ym = egPeriodeCourante();
    const rows = _egRecap.map(r => ({
        'Enseignant': r.nom, 'Niveau': r.niveau,
        'Salaire fixe (FCFA)': r.fixeDu, 'Heures': r.heures, 'Taux (FCFA/h)': r.taux,
        'Vacations (FCFA)': r.vac, 'Prime (FCFA)': r.primeDu, 'Total (FCFA)': r.total
    }));
    rows.push({ 'Enseignant': 'TOTAL', 'Niveau': '', 'Salaire fixe (FCFA)': _egRecap.reduce((s, r) => s + r.fixeDu, 0), 'Heures': _egRecap.reduce((s, r) => s + r.heures, 0), 'Taux (FCFA/h)': '', 'Vacations (FCFA)': _egRecap.reduce((s, r) => s + r.vac, 0), 'Prime (FCFA)': _egRecap.reduce((s, r) => s + r.primeDu, 0), 'Total (FCFA)': _egRecap.reduce((s, r) => s + r.total, 0) });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Paie ' + ym);
    XLSX.writeFile(wb, `paie_enseignants_${ym}.xlsx`);
}

function egImprimer() {
    const ym = egPeriodeCourante();
    const ecole = localStorage.getItem('digigespro_ecole') || '';
    const lignes = _egRecap.map(r => `<tr>
        <td style="border:1px solid #999;padding:4px 8px;">${egEsc(r.nom)}</td>
        <td style="border:1px solid #999;padding:4px 8px;">${egEsc(r.niveau)}</td>
        <td style="border:1px solid #999;padding:4px 8px;text-align:right;">${r.fixeDu ? egFCFA(r.fixeDu) : '-'}</td>
        <td style="border:1px solid #999;padding:4px 8px;text-align:center;">${r.heures || '-'}</td>
        <td style="border:1px solid #999;padding:4px 8px;text-align:right;">${r.vac ? egFCFA(r.vac) : '-'}</td>
        <td style="border:1px solid #999;padding:4px 8px;text-align:right;">${r.primeDu ? egFCFA(r.primeDu) : '-'}</td>
        <td style="border:1px solid #999;padding:4px 8px;text-align:right;font-weight:700;">${egFCFA(r.total)}</td></tr>`).join('');
    const tot = _egRecap.reduce((s, r) => s + r.total, 0);
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>État de paie ${ym}</title></head>
        <body style="font-family:Arial,sans-serif;padding:1.5rem;color:#111;">
        <div style="text-align:center;margin-bottom:0.5rem;"><p style="margin:0;font-size:0.8rem;">RÉPUBLIQUE DU CONGO — Unité · Travail · Progrès</p>
        <h2 style="margin:0.3rem 0;">${egEsc(ecole) || 'Établissement scolaire'}</h2>
        <h3 style="margin:0;">État de paie du corps enseignant — ${egEsc(ym)}</h3></div>
        <table style="width:100%;border-collapse:collapse;font-size:0.9rem;margin-top:1rem;">
        <thead><tr style="background:#eee;"><th style="border:1px solid #999;padding:4px 8px;">Enseignant</th><th style="border:1px solid #999;padding:4px 8px;">Niveau</th><th style="border:1px solid #999;padding:4px 8px;">Salaire fixe</th><th style="border:1px solid #999;padding:4px 8px;">Heures</th><th style="border:1px solid #999;padding:4px 8px;">Vacations</th><th style="border:1px solid #999;padding:4px 8px;">Prime</th><th style="border:1px solid #999;padding:4px 8px;">Total</th></tr></thead>
        <tbody>${lignes}<tr style="font-weight:700;background:#f5f5f5;"><td colspan="6" style="border:1px solid #999;padding:4px 8px;text-align:right;">TOTAL GÉNÉRAL</td><td style="border:1px solid #999;padding:4px 8px;text-align:right;">${egFCFA(tot)}</td></tr></tbody></table>
        <div style="margin-top:2.5rem;display:flex;justify-content:space-between;font-size:0.9rem;"><div>Le Gestionnaire<br><br>__________________</div><div>Le Directeur<br><br>__________________</div></div>
        </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
}
