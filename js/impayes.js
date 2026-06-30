// ===== Impayés / Relances : débiteurs par classe + avis d'impayé =====

function imFCFA(n) { return (Math.round(n) || 0).toLocaleString('fr-FR') + ' FCFA'; }
function imEsc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function imAttr(s) { return String(s == null ? '' : s).replace(/"/g, '&quot;'); }
function imEcoleNom() { return localStorage.getItem('digigespro_ecole') || localStorage.getItem('ecole_nom') || 'Établissement scolaire'; }

// Détails du registre Scolarité (parent, téléphone, adresse)
function imEleveInfo(studentId, matricule) {
    try {
        const eco = JSON.parse(localStorage.getItem('ecole_eleves')) || [];
        return eco.find(x => x.id === studentId || (matricule && x.matricule === matricule)) || {};
    } catch (e) { return {}; }
}

// Calcule la situation (dû / payé / reste) d'un élève
function imSituation(s) {
    const b = calculateMonthlyBalances(s.id);
    let du = 0, paye = 0, reste = 0;
    Object.values(b).forEach(m => { du += m.prixFixe; paye += m.paye; reste += m.reste; });
    return { du, paye, reste };
}

// Liste des débiteurs (reste > 0), filtrée par classe
function imDebiteurs() {
    const cl = document.getElementById('imClasse') ? document.getElementById('imClasse').value : '';
    const arr = [];
    students.forEach(s => {
        if (cl && s.classe !== cl) return;
        const sit = imSituation(s);
        if (sit.reste > 0) arr.push({ s, ...sit });
    });
    arr.sort((a, b) => b.reste - a.reste);
    return arr;
}

function renderImpayes() {
    // Remplir la liste des classes (depuis les élèves de la caisse)
    const sel = document.getElementById('imClasse');
    if (sel) {
        const cur = sel.value;
        const classes = [...new Set(students.map(s => s.classe).filter(Boolean))].sort();
        sel.innerHTML = '<option value="">-- Toutes les classes --</option>' + classes.map(c => `<option value="${imAttr(c)}">${imEsc(c)}</option>`).join('');
        sel.value = cur;
    }
    const box = document.getElementById('imBox');
    if (!box) return;
    const deb = imDebiteurs();
    const totalReste = deb.reduce((s, d) => s + d.reste, 0);
    if (deb.length === 0) {
        box.innerHTML = '<p style="color:#16a34a;padding:0.75rem;font-weight:600;">🎉 Aucun impayé sur cette sélection.</p>';
        return;
    }
    box.innerHTML = `
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-bottom:0.85rem;">
            <span style="background:#fee2e2;color:#991b1b;border-radius:999px;padding:0.25rem 0.8rem;font-weight:600;">${deb.length} élève(s) avec impayé</span>
            <span style="background:#eef2ff;color:#4338ca;border-radius:999px;padding:0.25rem 0.8rem;font-weight:600;">Total à recouvrer : ${imFCFA(totalReste)}</span>
        </div>
        <table>
            <thead><tr><th>Élève</th><th>Classe</th><th>Parent / Tél.</th><th style="text-align:right;">Dû (an)</th><th style="text-align:right;">Payé</th><th style="text-align:right;">Reste</th><th style="text-align:right;">Action</th></tr></thead>
            <tbody>${deb.map(d => {
                const info = imEleveInfo(d.s.id, d.s.matricule);
                const contact = (info.tuteur || '') + (info.telephone ? ' · ' + info.telephone : '');
                return `<tr>
                    <td style="font-weight:600;">${imEsc(d.s.nom)} ${imEsc(d.s.prenom)}<br><span style="color:#64748b;font-size:0.78rem;font-family:monospace;">${imEsc(d.s.matricule || '')}</span></td>
                    <td>${imEsc(d.s.classe || '-')}</td>
                    <td style="font-size:0.85rem;">${imEsc(contact) || '<span style="color:#94a3b8;">—</span>'}</td>
                    <td style="text-align:right;">${imFCFA(d.du)}</td>
                    <td style="text-align:right;color:#16a34a;">${imFCFA(d.paye)}</td>
                    <td style="text-align:right;font-weight:700;color:#dc3545;">${imFCFA(d.reste)}</td>
                    <td style="text-align:right;"><button class="btn btn-secondary" style="padding:0.3rem 0.6rem;font-size:0.8rem;" onclick="imAvis('${d.s.id}')">📄 Avis</button></td>
                </tr>`;
            }).join('')}
                <tr style="font-weight:700;background:#f8fafc;border-top:2px solid #dc3545;"><td colspan="5" style="text-align:right;">TOTAL À RECOUVRER</td><td style="text-align:right;color:#dc3545;">${imFCFA(totalReste)}</td><td></td></tr>
            </tbody>
        </table>`;
}

function imImprimerListe() {
    const deb = imDebiteurs();
    if (deb.length === 0) { alert('Aucun impayé à imprimer sur cette sélection.'); return; }
    const cl = document.getElementById('imClasse') ? document.getElementById('imClasse').value : '';
    const ecole = imEcoleNom();
    const totalReste = deb.reduce((s, d) => s + d.reste, 0);
    const lignes = deb.map((d, i) => {
        const info = imEleveInfo(d.s.id, d.s.matricule);
        return `<tr>
            <td style="border:1px solid #999;padding:4px 8px;text-align:center;">${i + 1}</td>
            <td style="border:1px solid #999;padding:4px 8px;">${imEsc(d.s.nom)} ${imEsc(d.s.prenom)}</td>
            <td style="border:1px solid #999;padding:4px 8px;">${imEsc(d.s.classe || '')}</td>
            <td style="border:1px solid #999;padding:4px 8px;">${imEsc(info.tuteur || '')}${info.telephone ? ' (' + imEsc(info.telephone) + ')' : ''}</td>
            <td style="border:1px solid #999;padding:4px 8px;text-align:right;">${imFCFA(d.paye)}</td>
            <td style="border:1px solid #999;padding:4px 8px;text-align:right;font-weight:700;">${imFCFA(d.reste)}</td></tr>`;
    }).join('');
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Liste des impayés</title></head>
        <body style="font-family:Arial,sans-serif;padding:1.5rem;color:#111;">
        <div style="text-align:center;margin-bottom:0.5rem;"><p style="margin:0;font-size:0.8rem;">RÉPUBLIQUE DU CONGO — Unité · Travail · Progrès</p>
        <h2 style="margin:0.3rem 0;">${imEsc(ecole)}</h2>
        <h3 style="margin:0;">Liste des impayés${cl ? ' — Classe ' + imEsc(cl) : ' (toutes classes)'}</h3>
        <p style="margin:0.2rem 0;font-size:0.85rem;">Éditée le ${new Date().toLocaleDateString('fr-FR')}</p></div>
        <table style="width:100%;border-collapse:collapse;font-size:0.88rem;margin-top:0.8rem;">
        <thead><tr style="background:#eee;"><th style="border:1px solid #999;padding:4px 8px;">#</th><th style="border:1px solid #999;padding:4px 8px;">Élève</th><th style="border:1px solid #999;padding:4px 8px;">Classe</th><th style="border:1px solid #999;padding:4px 8px;">Parent / Tél.</th><th style="border:1px solid #999;padding:4px 8px;">Payé</th><th style="border:1px solid #999;padding:4px 8px;">Reste à payer</th></tr></thead>
        <tbody>${lignes}<tr style="font-weight:700;background:#f5f5f5;"><td colspan="5" style="border:1px solid #999;padding:4px 8px;text-align:right;">TOTAL À RECOUVRER (${deb.length} élève(s))</td><td style="border:1px solid #999;padding:4px 8px;text-align:right;">${imFCFA(totalReste)}</td></tr></tbody></table>
        <div style="margin-top:2rem;text-align:right;font-size:0.9rem;">Le Gestionnaire<br><br>__________________</div>
        </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
}

function imAvis(studentId) {
    const s = students.find(x => x.id === studentId); if (!s) return;
    const sit = imSituation(s);
    const info = imEleveInfo(s.id, s.matricule);
    const ecole = imEcoleNom();
    const photo = info.photo ? `<img src="${info.photo}" alt="" style="width:80px;height:100px;object-fit:cover;border:1px solid #999;float:right;">` : '';
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Avis d'impayé - ${imEsc(s.nom)} ${imEsc(s.prenom)}</title></head>
        <body style="font-family:'Times New Roman',serif;padding:2.5rem;color:#111;max-width:780px;margin:0 auto;">
        <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:0.8rem;margin-bottom:1.2rem;">
            <p style="margin:0;font-size:0.85rem;">RÉPUBLIQUE DU CONGO — Unité · Travail · Progrès</p>
            <h2 style="margin:0.4rem 0 0;text-transform:uppercase;">${imEsc(ecole)}</h2>
        </div>
        ${photo}
        <h1 style="text-align:center;text-transform:uppercase;letter-spacing:2px;font-size:1.4rem;margin:1rem 0 1.5rem;">Avis d'impayé</h1>
        <p style="line-height:1.9;font-size:1.05rem;">À l'attention de <strong>${imEsc(info.tuteur) || 'Monsieur / Madame le parent'}</strong>${info.telephone ? ' (' + imEsc(info.telephone) + ')' : ''},</p>
        <p style="line-height:1.9;font-size:1.05rem;text-align:justify;">
            Nous vous informons que la situation des frais de scolarité de l'élève
            <strong>${imEsc(s.nom)} ${imEsc(s.prenom)}</strong> (matricule ${imEsc(s.matricule || '—')}),
            inscrit(e) en classe de <strong>${imEsc(s.classe || '—')}</strong>, présente un solde restant dû.
        </p>
        <table style="width:100%;border-collapse:collapse;margin:1rem 0;font-size:1rem;">
            <tr><td style="border:1px solid #999;padding:8px;">Total scolarité dû (année)</td><td style="border:1px solid #999;padding:8px;text-align:right;">${imFCFA(sit.du)}</td></tr>
            <tr><td style="border:1px solid #999;padding:8px;">Déjà payé</td><td style="border:1px solid #999;padding:8px;text-align:right;color:#15803d;">${imFCFA(sit.paye)}</td></tr>
            <tr style="font-weight:700;background:#fff5f5;"><td style="border:1px solid #999;padding:8px;">Reste à payer</td><td style="border:1px solid #999;padding:8px;text-align:right;color:#b91c1c;">${imFCFA(sit.reste)}</td></tr>
        </table>
        <p style="line-height:1.9;font-size:1.05rem;text-align:justify;">
            Nous vous prions de bien vouloir régulariser cette situation dans les meilleurs délais auprès de la caisse de l'établissement.
            Nous vous remercions de votre compréhension et restons à votre disposition pour tout arrangement.
        </p>
        <div style="margin-top:2.5rem;text-align:right;font-size:1rem;">
            <p style="margin:0;">Fait à ........................., le ${new Date().toLocaleDateString('fr-FR')}</p>
            <div style="height:70px;"></div>
            <p style="margin:0;font-weight:bold;">Le Gestionnaire / Le Chef d'établissement</p>
            <p style="margin:0;color:#666;">(Signature et cachet)</p>
        </div>
        </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
}
