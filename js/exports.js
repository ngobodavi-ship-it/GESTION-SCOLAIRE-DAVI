// ===== Exports : Excel, PDF et reçus =====

function exportExcel() {
            const today = new Date().toLocaleDateString('fr-FR');
            
            // Calculs pour le rapport
            const allTrans = transactions;
            const inscriptions = allTrans.filter(t => t.type === 'inscription').reduce((s,t) => s + parseFloat(t.amount||0), 0);
            const reinscriptions = allTrans.filter(t => t.type === 'reinscription').reduce((s,t) => s + parseFloat(t.amount||0), 0);
            const fraisScolaires = allTrans.filter(t => t.type === 'scolarite').reduce((s,t) => s + parseFloat(t.amount||0), 0);
            const depenses = allTrans.filter(t => t.type === 'depense').reduce((s,t) => s + parseFloat(t.amount||0), 0);
            const totalEntrees = inscriptions + reinscriptions + fraisScolaires;
            const solde = totalEntrees - depenses;

            // Créer le workbook
            const wb = XLSX.utils.book_new();
            
            // === PAGE 1: RESUME ===
            const resumeData = [];
            
            // En-tête principal (ligne 1-3)
            resumeData.push(['DIGIGESPRO']);
            resumeData.push(['RAPPORT DE GESTION SCOLAIRE']);
            resumeData.push(['Congo Brazzaville']);
            resumeData.push([]);
            resumeData.push(['Date du rapport:', today]);
            resumeData.push(['Nombre d\'eleves:', students.length]);
            resumeData.push(['Nombre de transactions:', transactions.length]);
            resumeData.push([]);
            
            // Résumé financier
            resumeData.push(['RESUME FINANCIER']);
            resumeData.push([]);
            resumeData.push(['Type de revenu', 'Montant (FCFA)']);
            resumeData.push(['Inscriptions', inscriptions]);
            resumeData.push(['Reinscriptions', reinscriptions]);
            resumeData.push(['Frais scolaires', fraisScolaires]);
            resumeData.push(['TOTAL ENTREES', totalEntrees]);
            resumeData.push([]);
            resumeData.push(['TOTAL DEPENSES', depenses]);
            resumeData.push([]);
            resumeData.push(['SOLDE GENERAL', solde]);
            
            const wsResume = XLSX.utils.aoa_to_sheet(resumeData);
            
            // Styles pour le résumé
            wsResume['!cols'] = [{wch: 25}, {wch: 18}];
            wsResume['!rows'] = [
                {hpt: 30}, // Ligne 1: titre principal
                {hpt: 25}, // Ligne 2: sous-titre
                {hpt: 20}  // Ligne 3
            ];
            
            // Fusion des cellules pour l'en-tête
            wsResume['!merges'] = [
                {s: {r: 0, c: 0}, e: {r: 0, c: 1}}, // DIGIGESPRO
                {s: {r: 1, c: 0}, e: {r: 1, c: 1}}, // RAPPORT DE GESTION
                {s: {r: 2, c: 0}, e: {r: 2, c: 1}}  // Congo Brazzaville
            ];
            
            XLSX.utils.book_append_sheet(wb, wsResume, 'Resume');
            
            // === PAGE 2: TRANSACTIONS DÉTAILLÉES ===
            const transData = [];
            
            // En-tête du tableau
            transData.push(['HISTORIQUE COMPLET DES TRANSACTIONS']);
            transData.push([]);
            transData.push(['Date', 'Heure', 'Reference', 'Type', 'Eleve', 'Matricule', 'Classe', 'Mois', 'Montant', 'Type Paiement', 'Description']);
            
            // Données des transactions
            transactions.forEach(t => {
                const typeLabels = {
                    'inscription': 'Inscription',
                    'reinscription': 'Reinscription',
                    'scolarite': 'Frais scolaires',
                    'depense': 'Depense'
                };
                
                const moisList = t.moisPayes ? t.moisPayes.join(' + ') : (t.nature || t.categorie || '-');
                let typePaiement = '-';
                if (t.type !== 'depense') {
                    if (t.isEcheance) typePaiement = 'Echeance';
                    else if (t.moisPayes && t.moisPayes.length > 1) typePaiement = 'Plusieurs mois';
                    else typePaiement = 'Complet';
                }
                
                transData.push([
                    t.date,
                    t.time,
                    t.reference,
                    typeLabels[t.type] || t.type,
                    removeAccents(t.studentName || '-'),
                    t.studentMatricule || '-',
                    removeAccents(t.studentClasse || '-'),
                    removeAccents(moisList),
                    t.amount,
                    typePaiement,
                    removeAccents(t.description || '-')
                ]);
            });
            
            // Ligne de total
            transData.push([]);
            transData.push(['', '', '', '', '', '', '', 'TOTAL GENERAL', totalEntrees - depenses, '', '']);
            
            const wsTrans = XLSX.utils.aoa_to_sheet(transData);
            
            // Largeur des colonnes
            wsTrans['!cols'] = [
                {wch: 12}, // Date
                {wch: 8},  // Heure
                {wch: 12}, // Reference
                {wch: 18}, // Type
                {wch: 25}, // Eleve
                {wch: 15}, // Matricule
                {wch: 12}, // Classe
                {wch: 30}, // Mois
                {wch: 15}, // Montant
                {wch: 18}, // Type Paiement
                {wch: 40}  // Description
            ];
            
            // Hauteur de l'en-tête
            wsTrans['!rows'] = [
                {hpt: 30}, // Titre
                {hpt: 5},  // Espace
                {hpt: 25}  // En-têtes colonnes
            ];
            
            // Fusion pour le titre
            wsTrans['!merges'] = [
                {s: {r: 0, c: 0}, e: {r: 0, c: 10}} // HISTORIQUE COMPLET
            ];
            
            XLSX.utils.book_append_sheet(wb, wsTrans, 'Transactions');
            
            // === PAGE 3: LISTE DES ÉLÈVES ===
            const elevesData = [];
            
            elevesData.push(['LISTE DES ELEVES']);
            elevesData.push([]);
            elevesData.push(['Matricule', 'Nom', 'Prenom', 'Classe', 'Reste a payer (FCFA)']);
            
            students.forEach(s => {
                const balances = calculateMonthlyBalances(s.id);
                const totalReste = Object.values(balances).reduce((sum, b) => sum + b.reste, 0);
                
                elevesData.push([
                    s.matricule,
                    removeAccents(s.nom),
                    removeAccents(s.prenom),
                    removeAccents(s.classe),
                    totalReste
                ]);
            });
            
            elevesData.push([]);
            elevesData.push(['', '', 'TOTAL ELEVES:', students.length, '']);
            
            const wsEleves = XLSX.utils.aoa_to_sheet(elevesData);
            
            wsEleves['!cols'] = [
                {wch: 15}, // Matricule
                {wch: 20}, // Nom
                {wch: 20}, // Prenom
                {wch: 15}, // Classe
                {wch: 20}  // Reste
            ];
            
            wsEleves['!rows'] = [
                {hpt: 30}, // Titre
                {hpt: 5},  // Espace
                {hpt: 25}  // En-têtes
            ];
            
            wsEleves['!merges'] = [
                {s: {r: 0, c: 0}, e: {r: 0, c: 4}} // LISTE DES ELEVES
            ];
            
            XLSX.utils.book_append_sheet(wb, wsEleves, 'Eleves');
            
            // Télécharger le fichier
            XLSX.writeFile(wb, `Rapport_DigiGesPro_${new Date().toISOString().split('T')[0]}.xlsx`);
        }

function exportExcelStyled() {
            const today = new Date().toLocaleDateString('fr-FR');
            
            // Calculs
            const inscriptions = transactions.filter(t => t.type === 'inscription').reduce((s,t) => s + parseFloat(t.amount||0), 0);
            const reinscriptions = transactions.filter(t => t.type === 'reinscription').reduce((s,t) => s + parseFloat(t.amount||0), 0);
            const fraisScolaires = transactions.filter(t => t.type === 'scolarite').reduce((s,t) => s + parseFloat(t.amount||0), 0);
            const depenses = transactions.filter(t => t.type === 'depense').reduce((s,t) => s + parseFloat(t.amount||0), 0);
            const totalEntrees = inscriptions + reinscriptions + fraisScolaires;
            const solde = totalEntrees - depenses;

            // Créer le HTML stylé
            let html = `
<html xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th { background: var(--brand,#1B6BFF); color: white; padding: 12px; text-align: left; font-weight: bold; border: 1px solid #4c5fd5; }
        td { padding: 10px; border: 1px solid #ddd; }
        tr:nth-child(even) { background: var(--surface-2,#f8f9fa); }
        .header { background: linear-gradient(135deg, #1B6BFF 0%, #28C6F5 100%); color: white; padding: 30px; text-align: center; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 32px; }
        .header p { margin: 5px 0 0 0; font-size: 14px; opacity: 0.9; }
        .section-title { background: var(--brand,#1B6BFF); color: white; padding: 15px; font-size: 18px; font-weight: bold; margin: 30px 0 10px 0; }
        .total-row { background: #10b981 !important; color: white; font-weight: bold; }
        .depense-row { background: #ef4444 !important; color: white; font-weight: bold; }
        .solde-row { background: var(--brand,#1B6BFF) !important; color: white; font-weight: bold; font-size: 16px; }
        .info-box { background: var(--brand-bg,#f0f4ff); padding: 15px; margin: 20px 0; border-left: 4px solid #1B6BFF; }
    </style>
</head>
<body>
    <div class="header">
        <h1>DigiGesPro</h1>
        <p>Rapport de Gestion Scolaire - Congo Brazzaville</p>
        <p>Date: ${today}</p>
    </div>

    <div class="info-box">
        <strong>Informations générales:</strong><br>
        Nombre d'élèves: ${students.length} | Nombre de transactions: ${transactions.length}
    </div>

    <div class="section-title">📊 RÉSUMÉ FINANCIER</div>
    <table>
        <tr>
            <th style="width: 60%;">Type de revenu</th>
            <th style="width: 40%; text-align: right;">Montant (FCFA)</th>
        </tr>
        <tr>
            <td>📝 Inscriptions</td>
            <td style="text-align: right; font-weight: bold;">${inscriptions.toLocaleString()}</td>
        </tr>
        <tr>
            <td>🔄 Réinscriptions</td>
            <td style="text-align: right; font-weight: bold;">${reinscriptions.toLocaleString()}</td>
        </tr>
        <tr>
            <td>📚 Frais scolaires</td>
            <td style="text-align: right; font-weight: bold;">${fraisScolaires.toLocaleString()}</td>
        </tr>
        <tr class="total-row">
            <td>TOTAL ENTRÉES</td>
            <td style="text-align: right;">${totalEntrees.toLocaleString()}</td>
        </tr>
        <tr class="depense-row">
            <td>💸 TOTAL DÉPENSES</td>
            <td style="text-align: right;">${depenses.toLocaleString()}</td>
        </tr>
        <tr class="solde-row">
            <td>💰 SOLDE GÉNÉRAL</td>
            <td style="text-align: right;">${solde.toLocaleString()}</td>
        </tr>
    </table>

    <div class="section-title">📋 HISTORIQUE DES TRANSACTIONS</div>
    <table>
        <tr>
            <th>Date</th>
            <th>Référence</th>
            <th>Type</th>
            <th>Élève</th>
            <th>Classe</th>
            <th>Mois</th>
            <th style="text-align: right;">Montant</th>
        </tr>`;

            transactions.forEach(t => {
                const typeLabels = {
                    'inscription': 'Inscription',
                    'reinscription': 'Réinscription',
                    'scolarite': 'Frais scolaires',
                    'depense': 'Dépense'
                };
                const moisList = t.moisPayes ? t.moisPayes.join(', ') : (t.nature || t.categorie || '-');
                const rowStyle = t.type === 'depense' ? 'color: var(--danger,#ef4444); font-weight: bold;' : '';
                
                html += `
        <tr>
            <td>${t.date}</td>
            <td>${t.reference}</td>
            <td>${typeLabels[t.type] || t.type}</td>
            <td>${removeAccents(t.studentName || '-')}</td>
            <td>${removeAccents(t.studentClasse || '-')}</td>
            <td>${removeAccents(moisList)}</td>
            <td style="text-align: right; ${rowStyle}">${t.amount.toLocaleString()}</td>
        </tr>`;
            });

            html += `
    </table>

    <div class="section-title">👨‍🎓 LISTE DES ÉLÈVES</div>
    <table>
        <tr>
            <th>Matricule</th>
            <th>Nom</th>
            <th>Prénom</th>
            <th>Classe</th>
            <th style="text-align: right;">Reste à payer</th>
        </tr>`;

            students.forEach(s => {
                const balances = calculateMonthlyBalances(s.id);
                const totalReste = Object.values(balances).reduce((sum, b) => sum + b.reste, 0);
                const resteStyle = totalReste > 0 ? 'color: var(--danger,#ef4444); font-weight: bold;' : 'color: var(--ok,#10b981); font-weight: bold;';
                
                html += `
        <tr>
            <td>${s.matricule}</td>
            <td>${removeAccents(s.nom)}</td>
            <td>${removeAccents(s.prenom)}</td>
            <td>${removeAccents(s.classe)}</td>
            <td style="text-align: right; ${resteStyle}">${totalReste.toLocaleString()}</td>
        </tr>`;
            });

            html += `
    </table>
</body>
</html>`;

            // Télécharger
            const blob = new Blob([html], {type: 'application/vnd.ms-excel'});
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `Rapport_DigiGesPro_Style_${new Date().toISOString().split('T')[0]}.xls`;
            a.click();
        }

function exportPDF() {
            const today = new Date().toLocaleDateString('fr-FR');
            
            // Calculs
            const inscriptions = transactions.filter(t => t.type === 'inscription').reduce((s,t) => s + parseFloat(t.amount||0), 0);
            const reinscriptions = transactions.filter(t => t.type === 'reinscription').reduce((s,t) => s + parseFloat(t.amount||0), 0);
            const fraisScolaires = transactions.filter(t => t.type === 'scolarite').reduce((s,t) => s + parseFloat(t.amount||0), 0);
            const depenses = transactions.filter(t => t.type === 'depense').reduce((s,t) => s + parseFloat(t.amount||0), 0);
            const totalEntrees = inscriptions + reinscriptions + fraisScolaires;
            const solde = totalEntrees - depenses;

            // Créer le HTML pour PDF
            let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        @page { margin: 2cm; }
        body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; }
        .header { background: linear-gradient(135deg, #1B6BFF 0%, #28C6F5 100%); color: white; padding: 30px; text-align: center; margin-bottom: 30px; border-radius: 10px; }
        .header h1 { margin: 0; font-size: 36px; }
        .header p { margin: 8px 0 0 0; font-size: 14px; opacity: 0.95; }
        .section { margin: 30px 0; page-break-inside: avoid; }
        .section-title { background: var(--brand,#1B6BFF); color: white; padding: 12px 15px; font-size: 16px; font-weight: bold; border-radius: 5px; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th { background: var(--brand,#1B6BFF); color: white; padding: 10px; text-align: left; font-weight: bold; border: 1px solid #4c5fd5; font-size: 11px; }
        td { padding: 8px; border: 1px solid #ddd; font-size: 11px; }
        tr:nth-child(even) { background: var(--surface-2,#f8f9fa); }
        .total-row { background: #10b981 !important; color: white; font-weight: bold; }
        .depense-row { background: #ef4444 !important; color: white; font-weight: bold; }
        .solde-row { background: var(--brand,#1B6BFF) !important; color: white; font-weight: bold; font-size: 14px; }
        .info-box { background: var(--brand-bg,#f0f4ff); padding: 15px; margin: 20px 0; border-left: 4px solid #1B6BFF; border-radius: 5px; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #ddd; color: var(--muted,#666); font-size: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>DigiGesPro</h1>
        <p>Rapport de Gestion Scolaire</p>
        <p>Congo Brazzaville - ${today}</p>
    </div>

    <div class="info-box">
        <strong>📊 Informations générales</strong><br>
        Nombre d'élèves: <strong>${students.length}</strong> | 
        Nombre de transactions: <strong>${transactions.length}</strong>
    </div>

    <div class="section">
        <div class="section-title">💰 RÉSUMÉ FINANCIER</div>
        <table>
            <tr>
                <th style="width: 60%;">Type de revenu</th>
                <th style="width: 40%; text-align: right;">Montant (FCFA)</th>
            </tr>
            <tr>
                <td>📝 Inscriptions</td>
                <td style="text-align: right; font-weight: bold;">${inscriptions.toLocaleString()}</td>
            </tr>
            <tr>
                <td>🔄 Réinscriptions</td>
                <td style="text-align: right; font-weight: bold;">${reinscriptions.toLocaleString()}</td>
            </tr>
            <tr>
                <td>📚 Frais scolaires</td>
                <td style="text-align: right; font-weight: bold;">${fraisScolaires.toLocaleString()}</td>
            </tr>
            <tr class="total-row">
                <td>TOTAL ENTRÉES</td>
                <td style="text-align: right;">${totalEntrees.toLocaleString()}</td>
            </tr>
            <tr class="depense-row">
                <td>💸 TOTAL DÉPENSES</td>
                <td style="text-align: right;">${depenses.toLocaleString()}</td>
            </tr>
            <tr class="solde-row">
                <td>💰 SOLDE GÉNÉRAL</td>
                <td style="text-align: right;">${solde.toLocaleString()}</td>
            </tr>
        </table>
    </div>

    <div class="section">
        <div class="section-title">📋 DERNIÈRES TRANSACTIONS (${Math.min(transactions.length, 20)})</div>
        <table>
            <tr>
                <th>Date</th>
                <th>Réf</th>
                <th>Type</th>
                <th>Élève</th>
                <th>Mois</th>
                <th style="text-align: right;">Montant</th>
            </tr>`;

            transactions.slice(0, 20).forEach(t => {
                const typeLabels = {
                    'inscription': 'Inscription',
                    'reinscription': 'Réinscription',
                    'scolarite': 'Frais scol.',
                    'depense': 'Dépense'
                };
                const moisList = t.moisPayes ? t.moisPayes.join(', ') : (t.nature || t.categorie || '-');
                const rowStyle = t.type === 'depense' ? 'color: var(--danger,#ef4444); font-weight: bold;' : '';
                
                html += `
            <tr>
                <td>${t.date}</td>
                <td>${t.reference}</td>
                <td>${typeLabels[t.type] || t.type}</td>
                <td>${removeAccents(t.studentName || '-')}</td>
                <td>${removeAccents(moisList).substring(0, 20)}</td>
                <td style="text-align: right; ${rowStyle}">${t.amount.toLocaleString()}</td>
            </tr>`;
            });

            html += `
        </table>
    </div>

    <div class="footer">
        <p><strong>DigiGesPro</strong> - Gestion digitale de caisse scolaire</p>
        <p>Rapport généré le ${new Date().toLocaleString('fr-FR')}</p>
    </div>
</body>
</html>`;

            // Ouvrir dans une nouvelle fenêtre pour impression en PDF
            const printWindow = window.open('', '_blank');
            printWindow.document.write(html);
            printWindow.document.close();
            
            // Attendre le chargement puis déclencher l'impression
            setTimeout(() => {
                printWindow.print();
            }, 500);
        }

function showReceipt(transaction) {
            const moisList = transaction.moisPayes ? transaction.moisPayes.join(', ') : '-';
            const prixFixe = transaction.prixFixe || PRIX_FIXE;
            const estScolarite = (transaction.type === 'scolarite');
            const typeLabel = transaction.type === 'inscription' ? "Frais d'inscription"
                : transaction.type === 'reinscription' ? 'Frais de réinscription'
                : 'Frais scolaires';
            // Photo de l'élève depuis le registre Scolarité
            let photoEleve = '';
            try {
                const eco = JSON.parse(localStorage.getItem('ecole_eleves')) || [];
                const el = eco.find(x => x.id === transaction.studentId || (transaction.studentMatricule && x.matricule === transaction.studentMatricule));
                if (el && el.photo) photoEleve = el.photo;
            } catch (e) { }

            document.getElementById('receiptContent').innerHTML = `
                <div style="text-align:center;margin-bottom:2rem;border-bottom:3px solid #1B6BFF;padding-bottom:1rem;">
                    ${(typeof getEtab === 'function' && getEtab().logo) ? `<img src="${getEtab().logo}" alt="" style="height:60px;object-fit:contain;margin-bottom:8px;">` : ''}
                    <h2 style="font-size:2rem;font-weight:700;color:var(--brand,#1B6BFF);margin:0 0 0.5rem 0;">📄 REÇU DE PAIEMENT</h2>
                    <p style="color:var(--brand,#1B6BFF); font-weight: 700; font-size: 1.25rem; margin: 0.5rem 0;">${transaction.nomEcole || (typeof getEtab === 'function' ? getEtab().nom : '') || 'École'}</p>
                    ${(typeof getEtab === 'function' && [getEtab().ville, getEtab().bp, getEtab().telephone].filter(Boolean).length) ? `<p style="color:var(--muted,#64748b);font-size:0.82rem;margin:0;">${[getEtab().ville, getEtab().bp ? 'BP ' + getEtab().bp : '', getEtab().telephone ? 'Tél : ' + getEtab().telephone : ''].filter(Boolean).join(' · ')}</p>` : '<p style="color:var(--muted,#64748b);font-size:0.875rem;">Congo Brazzaville</p>'}
                </div>

                <div style="background:var(--surface-2,#f8fafc);padding:1.5rem;border-radius:12px;margin-bottom:1.5rem;">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem;">
                        <div>
                            <p style="font-size:0.875rem;color:var(--muted,#64748b);margin:0 0 0.25rem 0;">Reference</p>
                            <p style="font-size:1.125rem;font-weight:700;margin:0;font-family:monospace;">${transaction.reference}</p>
                        </div>
                        <div>
                            <p style="font-size:0.875rem;color:var(--muted,#64748b);margin:0 0 0.25rem 0;">Date</p>
                            <p style="font-size:1.125rem;font-weight:700;margin:0;">${new Date(transaction.date).toLocaleDateString('fr-FR')}</p>
                        </div>
                    </div>
                    
                    <div style="border-top:1px solid #e2e8f0;padding-top:1rem;margin-top:1rem;">
                        <p style="font-size:0.875rem;color:var(--muted,#64748b);margin:0 0 0.5rem 0;">Eleve</p>
                        <div style="display:flex;gap:1rem;align-items:flex-start;">
                            ${photoEleve ? `<img src="${photoEleve}" alt="" style="width:64px;height:80px;object-fit:cover;border:1px solid #cbd5e1;border-radius:8px;flex-shrink:0;">` : ''}
                            <div style="flex:1;">
                                <p style="font-size:1.25rem;font-weight:700;margin:0 0 0.5rem 0;">${transaction.studentName}</p>
                                <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                                    <div>
                                        <p style="font-size:0.875rem;color:var(--muted,#64748b);margin:0 0 0.25rem 0;">Matricule</p>
                                        <p style="font-weight:600;margin:0;font-family:monospace;">${transaction.studentMatricule || '-'}</p>
                                    </div>
                                    <div>
                                        <p style="font-size:0.875rem;color:var(--muted,#64748b);margin:0 0 0.25rem 0;">Classe</p>
                                        <p style="font-weight:600;margin:0;">${transaction.studentClasse || '-'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="background:var(--brand,#1B6BFF);color:white;padding:1.5rem;border-radius:12px;margin-bottom:1.5rem;">
                    <p style="font-size:0.875rem;opacity:0.9;margin:0 0 0.5rem 0;">${typeLabel}</p>
                    ${estScolarite ? `<p style="font-size:1rem;margin:0 0 0.5rem 0;">Mois: ${moisList}</p>` : ''}
                    ${transaction.isEcheance ? '<p style="font-size:0.875rem;margin:0 0 0.5rem 0;">⚡ Paiement par echeance</p>' : ''}
                    <p style="font-size:0.875rem;margin:0.5rem 0;">${transaction.description}</p>
                    <div style="border-top:1px solid rgba(255,255,255,0.3);padding-top:1rem;margin-top:1rem;">
                        <div style="display:grid;grid-template-columns:${estScolarite ? '1fr 1fr' : '1fr'};gap:1rem;margin-bottom:1rem;">
                            ${estScolarite ? `<div>
                                <p style="font-size:0.875rem;opacity:0.9;margin:0;">Prix fixe mensuel</p>
                                <p style="font-size:1.25rem;font-weight:700;margin:0.25rem 0 0 0;">${prixFixe.toLocaleString()} FCFA</p>
                            </div>` : ''}
                            <div>
                                <p style="font-size:0.875rem;opacity:0.9;margin:0;">Montant paye</p>
                                <p style="font-size:1.25rem;font-weight:700;margin:0.25rem 0 0 0;">${parseFloat(transaction.amount).toLocaleString()} FCFA</p>
                            </div>
                        </div>
                        ${transaction.isEcheance ? `
                            <div style="background:rgba(255,255,255,0.2);padding:0.75rem;border-radius:8px;">
                                <p style="font-size:0.875rem;margin:0;">Reste a payer: <strong>${(prixFixe * (transaction.moisPayes?.length || 1) - transaction.amount).toLocaleString()} FCFA</strong></p>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div style="border-top:2px dashed #e2e8f0;padding-top:1rem;font-size:0.875rem;color:var(--muted,#64748b);">
                    <p style="margin:0.25rem 0;">⏰ Heure: ${transaction.time}</p>
                    <p style="margin:0.25rem 0;">👤 Enregistre par: Gestionnaire</p>
                </div>

                <div style="margin-top:2rem;text-align:center;font-size:0.75rem;color:var(--muted-2,#94a3b8);">
                    <p style="margin:0;">Merci pour votre confiance</p>
                    <p style="margin:0.25rem 0 0 0;">Ce recu fait foi de paiement</p>
                </div>
            `;
            
            document.getElementById('receiptModal').style.display = 'flex';
            document.getElementById('receiptModal').classList.remove('hidden');
        }

function hideReceipt() {
            document.getElementById('receiptModal').style.display = 'none';
            document.getElementById('receiptModal').classList.add('hidden');
        }
