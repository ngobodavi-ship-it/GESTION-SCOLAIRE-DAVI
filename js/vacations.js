// ===== Finances : paie des vacations enseignants (heures validées × tarif) =====
function vacEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function vacFCFA(n) { return Number(n || 0).toLocaleString('fr-FR') + ' FCFA'; }
function vacLoadHeures() { try { return JSON.parse(localStorage.getItem('ecole_heures')) || []; } catch (e) { return []; } }
function vacSaveHeures(a) { localStorage.setItem('ecole_heures', JSON.stringify(a)); }
function vacEnseignants() { try { return JSON.parse(localStorage.getItem('ecole_enseignants')) || []; } catch (e) { return []; } }
function vacMatieres() { try { return JSON.parse(localStorage.getItem('ecole_matieres')) || []; } catch (e) { return []; } }

function vacMatieresNoms(ens, mats) {
    if (ens.matieres && ens.matieres.length) {
        const noms = ens.matieres.map(id => { const m = mats.find(x => x.id === id); return m ? m.nom : null; }).filter(Boolean);
        if (noms.length) return noms.join(', ');
    }
    return ens.matiere || '—';
}

// Bornes de période rapides
function vacSetMois() {
    const n = new Date();
    document.getElementById('vacDebut').value = new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split('T')[0];
    document.getElementById('vacFin').value = new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().split('T')[0];
    renderVacations();
}
function vacSetTrimestre() {
    const n = new Date();
    const q = Math.floor(n.getMonth() / 3); // 0..3
    document.getElementById('vacDebut').value = new Date(n.getFullYear(), q * 3, 1).toISOString().split('T')[0];
    document.getElementById('vacFin').value = new Date(n.getFullYear(), q * 3 + 3, 0).toISOString().split('T')[0];
    renderVacations();
}
function vacSetAnnee() {
    const n = new Date();
    // année scolaire : septembre -> août
    const anneeDebut = n.getMonth() >= 8 ? n.getFullYear() : n.getFullYear() - 1;
    document.getElementById('vacDebut').value = anneeDebut + '-09-01';
    document.getElementById('vacFin').value = (anneeDebut + 1) + '-08-31';
    renderVacations();
}

let _vacRecap = [];
function vacCalcul() {
    const d1 = document.getElementById('vacDebut').value;
    const d2 = document.getElementById('vacFin').value;
    const nonPayees = document.getElementById('vacNonPayees').checked;
    const heures = vacLoadHeures().filter(h => h.statut === 'valide'
        && (!d1 || (h.date || '') >= d1) && (!d2 || (h.date || '') <= d2)
        && (!nonPayees || !h.paye));
    const ens = vacEnseignants(), mats = vacMatieres();
    const grp = {};
    heures.forEach(h => {
        if (!grp[h.enseignantId]) grp[h.enseignantId] = { nom: h.enseignantNom, heures: 0, ids: [] };
        grp[h.enseignantId].heures += parseFloat(h.heures) || 0;
        grp[h.enseignantId].ids.push(h.id);
    });
    return Object.keys(grp).map(id => {
        const e = ens.find(x => x.id === id) || {};
        const tarif = parseFloat(e.tauxHoraire) || 0;
        return {
            enseignantId: id, nom: grp[id].nom || (e.nom ? e.nom + ' ' + (e.prenom || '') : 'Enseignant'),
            matieres: vacMatieresNoms(e, mats), heures: grp[id].heures, tarif: tarif,
            montant: grp[id].heures * tarif, ids: grp[id].ids
        };
    }).sort((a, b) => b.montant - a.montant);
}

function renderVacations() {
    const box = document.getElementById('vacTable');
    if (!box) return;
    if (!document.getElementById('vacDebut').value) {
        const n = new Date();
        document.getElementById('vacDebut').value = new Date(n.getFullYear(), n.getMonth(), 1).toISOString().split('T')[0];
        document.getElementById('vacFin').value = new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().split('T')[0];
    }
    _vacRecap = vacCalcul();
    const totH = _vacRecap.reduce((s, r) => s + r.heures, 0);
    const totM = _vacRecap.reduce((s, r) => s + r.montant, 0);

    document.getElementById('vacKpis').innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:0.75rem;margin-bottom:1rem;">
            <div style="background:var(--surface-2,#f8fafc);border:1px solid #e2e8f0;border-radius:12px;padding:1rem;text-align:center;"><div style="font-size:1.4rem;font-weight:700;color:var(--brand-strong,#2E2769);">${_vacRecap.length}</div><div style="color:var(--muted,#64748b);font-size:0.85rem;">Enseignants</div></div>
            <div style="background:var(--surface-2,#f8fafc);border:1px solid #e2e8f0;border-radius:12px;padding:1rem;text-align:center;"><div style="font-size:1.4rem;font-weight:700;color:var(--ok,#16a34a);">${totH} h</div><div style="color:var(--muted,#64748b);font-size:0.85rem;">Heures validées</div></div>
            <div style="background:var(--brand-bg,#eef2ff);border:1px solid #c7d2fe;border-radius:12px;padding:1rem;text-align:center;"><div style="font-size:1.4rem;font-weight:700;color:var(--brand-strong,#4338ca);">${vacFCFA(totM)}</div><div style="color:var(--muted,#64748b);font-size:0.85rem;">Total à payer</div></div>
        </div>`;

    box.innerHTML = _vacRecap.length === 0
        ? '<p style="color:var(--muted,#64748b);padding:1rem;text-align:center;">Aucune heure validée sur cette période. Les heures doivent être validées par le Directeur des études (module Direction des études → Validation des heures).</p>'
        : `<div style="overflow-x:auto;"><table>
            <thead><tr><th>Enseignant</th><th>Matières enseignées</th><th style="text-align:center;">Heures effectuées</th><th style="text-align:right;">Tarif horaire</th><th style="text-align:right;">Montant à payer</th></tr></thead>
            <tbody>${_vacRecap.map(r => `<tr>
                <td style="font-weight:600;">${vacEsc(r.nom)}</td>
                <td>${vacEsc(r.matieres)}</td>
                <td style="text-align:center;font-weight:700;">${r.heures}</td>
                <td style="text-align:right;">${r.tarif ? vacFCFA(r.tarif) : '<span style="color:var(--danger,#dc3545);">à définir</span>'}</td>
                <td style="text-align:right;font-weight:700;color:var(--brand-strong,#4338ca);">${vacFCFA(r.montant)}</td>
            </tr>`).join('')}
            <tr style="background:var(--surface-2,#f8fafc);font-weight:700;"><td colspan="2">TOTAL</td><td style="text-align:center;">${totH} h</td><td></td><td style="text-align:right;color:var(--brand-strong,#4338ca);">${vacFCFA(totM)}</td></tr>
            </tbody></table></div>`;
}

function exportVacationsExcel() {
    if (!_vacRecap.length) { alert('Aucune donnée à exporter.'); return; }
    if (typeof XLSX === 'undefined') { alert('Module Excel indisponible.'); return; }
    const d1 = document.getElementById('vacDebut').value, d2 = document.getElementById('vacFin').value;
    const rows = _vacRecap.map(r => ({
        'Enseignant': r.nom, 'Matières enseignées': r.matieres, 'Heures effectuées': r.heures,
        'Tarif horaire (FCFA)': r.tarif, 'Montant à payer (FCFA)': r.montant
    }));
    rows.push({ 'Enseignant': 'TOTAL', 'Matières enseignées': '', 'Heures effectuées': _vacRecap.reduce((s, r) => s + r.heures, 0), 'Tarif horaire (FCFA)': '', 'Montant à payer (FCFA)': _vacRecap.reduce((s, r) => s + r.montant, 0) });
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 26 }, { wch: 30 }, { wch: 16 }, { wch: 18 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Vacations');
    XLSX.writeFile(wb, `vacations_enseignants_${d1}_${d2}.xlsx`);
}

function imprimerVacations() {
    if (!_vacRecap.length) { alert('Aucune donnée à imprimer.'); return; }
    const d1 = document.getElementById('vacDebut').value, d2 = document.getElementById('vacFin').value;
    let ecole = 'Établissement scolaire';
    try { const c = JSON.parse(localStorage.getItem('portail_config_v1')); if (c && c.name) ecole = c.name; } catch (e) {}
    const totH = _vacRecap.reduce((s, r) => s + r.heures, 0), totM = _vacRecap.reduce((s, r) => s + r.montant, 0);
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>État de paie des vacations</title><style>
        body{font-family:Arial,sans-serif;padding:24px;color:var(--ink,#1e293b);}
        h1{font-size:1.2rem;text-align:center;margin:0;} .sub{text-align:center;color:var(--muted,#64748b);margin:0.25rem 0 1.25rem;}
        table{width:100%;border-collapse:collapse;font-size:0.85rem;} th,td{border:1px solid #cbd5e1;padding:6px 8px;}
        th{background:var(--surface-2,#f1f5f9);text-align:left;} .r{text-align:right;} .c{text-align:center;} tfoot td{font-weight:700;background:var(--surface-2,#f8fafc);}
    </style></head><body>
        <h1>RÉPUBLIQUE DU CONGO – Unité, Travail, Progrès</h1>
        <p class="sub">${vacEsc(ecole)}<br>État de paie des vacations enseignants — Période du ${d1 ? new Date(d1).toLocaleDateString('fr-FR') : '...'} au ${d2 ? new Date(d2).toLocaleDateString('fr-FR') : '...'}</p>
        <table><thead><tr><th>Enseignant</th><th>Matières</th><th class="c">Heures</th><th class="r">Tarif/h</th><th class="r">Montant</th></tr></thead>
        <tbody>${_vacRecap.map(r => `<tr><td>${vacEsc(r.nom)}</td><td>${vacEsc(r.matieres)}</td><td class="c">${r.heures}</td><td class="r">${vacFCFA(r.tarif)}</td><td class="r">${vacFCFA(r.montant)}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td colspan="2">TOTAL</td><td class="c">${totH} h</td><td></td><td class="r">${vacFCFA(totM)}</td></tr></tfoot></table>
        <p style="margin-top:2.5rem;text-align:right;">Le Directeur des Études / La Comptabilité<br><br>__________________________</p>
        </body></html>`);
    w.document.close(); w.print();
}

function payerVacations() {
    if (!_vacRecap.length) { alert('Aucune vacation à payer sur cette période.'); return; }
    const totM = _vacRecap.reduce((s, r) => s + r.montant, 0);
    if (!confirm(`Enregistrer le paiement des vacations (${vacFCFA(totM)}) en dépenses ?\nLes heures concernées seront marquées comme payées.`)) return;
    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const idsPayes = [];
    _vacRecap.forEach(r => {
        if (r.montant <= 0) return;
        transactions.push({
            id: Date.now().toString() + '_' + r.enseignantId,
            date: today, time: time, type: 'depense', categorie: 'Vacation enseignant',
            amount: r.montant, beneficiaire: r.nom, enseignantId: r.enseignantId,
            description: `Vacation ${r.nom} — ${r.heures} h × ${vacFCFA(r.tarif)}`,
            reference: `VAC-${String(transactions.filter(t => t.type === 'depense').length + 1).padStart(3, '0')}`
        });
        r.ids.forEach(id => idsPayes.push(id));
    });
    localStorage.setItem('digigespro_transactions', JSON.stringify(transactions));
    const heures = vacLoadHeures();
    heures.forEach(h => { if (idsPayes.indexOf(h.id) >= 0) { h.paye = true; h.payeLe = today; } });
    vacSaveHeures(heures);
    if (typeof updateUI === 'function') updateUI();
    renderVacations();
    alert('Paiement des vacations enregistré en dépenses.');
}
