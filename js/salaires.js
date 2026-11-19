// ===== Salaires : employés et bulletins =====

function importSalairesExcel(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, {type: 'array'});
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const rows = XLSX.utils.sheet_to_json(firstSheet);

                    if (rows.length === 0) {
                        alert('❌ Le fichier Excel est vide');
                        return;
                    }

                    // Import des employés
                    employees = rows.map((row, index) => ({
                        id: Date.now().toString() + index,
                        nom: row.Nom || row.nom || '',
                        poste: row.Poste || row.poste || '',
                        salaire: parseFloat(row.Salaire || row.salaire || 0)
                    })).filter(e => e.nom && e.salaire > 0);

                    // Sauvegarder
                    localStorage.setItem('digigespro_employees', JSON.stringify(employees));

                    alert(`✅ ${employees.length} employés importés !`);
                    renderSalaires();

                } catch (error) {
                    console.error(error);
                    alert('❌ Erreur lors de la lecture du fichier Excel');
                }
            };
            reader.readAsArrayBuffer(file);
            event.target.value = '';
        }

function renderSalaires() {
            const tbody = document.getElementById('salairesTableBody');
            const mois = document.getElementById('salaireMois').value;
            
            if (employees.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="4" style="text-align: center; padding: 2rem; color: var(--muted,#64748b);">
                            📥 Importez un fichier Excel avec les colonnes : <strong>Nom | Poste | Salaire</strong>
                        </td>
                    </tr>
                `;
                document.getElementById('totalEmployees').textContent = '0';
                document.getElementById('masseSalarialeTotale').textContent = '0 FCFA';
                return;
            }

            // Afficher les employés
            tbody.innerHTML = employees.map(e => `
                <tr>
                    <td><strong>${e.nom}</strong></td>
                    <td>${e.poste}</td>
                    <td style="text-align: right;">${e.salaire.toLocaleString()} FCFA</td>
                    <td>
                        <button class="btn btn-primary" onclick="printBulletinSalaire('${e.id}')" style="padding: 0.25rem 0.75rem; font-size: 0.875rem;">
                            🖨️ Bulletin
                        </button>
                        <button class="btn btn-secondary" onclick="deleteEmployee('${e.id}')" style="padding: 0.25rem 0.75rem; font-size: 0.875rem; background: #ef4444;">
                            🗑️
                        </button>
                    </td>
                </tr>
            `).join('');

            // Calcul total
            const total = employees.reduce((sum, e) => sum + e.salaire, 0);
            document.getElementById('totalEmployees').textContent = employees.length;
            document.getElementById('masseSalarialeTotale').textContent = total.toLocaleString() + ' FCFA';
        }

function deleteEmployee(id) {
            if (!confirm('Supprimer cet employé ?')) return;
            employees = employees.filter(e => e.id !== id);
            localStorage.setItem('digigespro_employees', JSON.stringify(employees));
            renderSalaires();
        }

function printBulletinSalaire(employeeId) {
            const employee = employees.find(e => e.id === employeeId);
            if (!employee) return;

            const mois = document.getElementById('salaireMois').value;
            const moisNom = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'][parseInt(mois)];
            const annee = new Date().getFullYear();
            const nomEcole = localStorage.getItem('digigespro_ecole') || 'École';

            const bulletinHTML = `
                <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem;">
                    <div style="text-align: center; margin-bottom: 2rem; border-bottom: 3px solid #1B6BFF; padding-bottom: 1rem;">
                        <h1 style="color: var(--brand,#1B6BFF); margin: 0;">📄 BULLETIN DE PAIE</h1>
                        <h2 style="margin: 0.5rem 0; color: var(--ink,#1e293b);">${nomEcole}</h2>
                        <p style="color: var(--muted,#64748b); margin: 0;">Congo Brazzaville</p>
                    </div>

                    <div style="background: var(--surface-2,#f8fafc); padding: 1.5rem; border-radius: 10px; margin-bottom: 1.5rem;">
                        <h3 style="margin: 0 0 1rem 0; color: var(--ink,#1e293b);">Période : ${moisNom} ${annee}</h3>
                        <p style="margin: 0.5rem 0;"><strong>Employé :</strong> ${employee.nom}</p>
                        <p style="margin: 0.5rem 0;"><strong>Poste :</strong> ${employee.poste}</p>
                        <p style="margin: 0.5rem 0;"><strong>Date d'émission :</strong> ${new Date().toLocaleDateString('fr-FR')}</p>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 1.5rem;">
                        <thead>
                            <tr style="background: var(--brand,#1B6BFF); color: white;">
                                <th style="padding: 1rem; text-align: left; border: 1px solid #ddd;">Description</th>
                                <th style="padding: 1rem; text-align: right; border: 1px solid #ddd;">Montant (FCFA)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding: 1rem; border: 1px solid #ddd;"><strong>Salaire de base</strong></td>
                                <td style="padding: 1rem; text-align: right; border: 1px solid #ddd;"><strong>${employee.salaire.toLocaleString()}</strong></td>
                            </tr>
                        </tbody>
                    </table>

                    <div style="background: linear-gradient(135deg, #1B6BFF 0%, #28C6F5 100%); color: white; padding: 1.5rem; border-radius: 10px; text-align: center;">
                        <p style="margin: 0; font-size: 0.875rem; opacity: 0.9;">NET À PAYER</p>
                        <h2 style="margin: 0.5rem 0; font-size: 2.5rem;">${employee.salaire.toLocaleString()} FCFA</h2>
                    </div>

                    <div style="margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #ddd; display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                        <div>
                            <p style="margin: 0; color: var(--muted,#64748b);">Signature de l'employeur</p>
                            <div style="height: 60px;"></div>
                            <div style="border-top: 1px solid #000; padding-top: 0.5rem;">Date et cachet</div>
                        </div>
                        <div>
                            <p style="margin: 0; color: var(--muted,#64748b);">Signature de l'employé</p>
                            <div style="height: 60px;"></div>
                            <div style="border-top: 1px solid #000; padding-top: 0.5rem;">Date</div>
                        </div>
                    </div>

                    <div style="text-align: center; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #ddd; color: var(--muted-2,#94a3b8); font-size: 0.875rem;">
                        <p style="margin: 0;">DigiGesPro - Gestion digitale de caisse scolaire</p>
                        <p style="margin: 0.25rem 0;">© ${annee} Tous droits réservés</p>
                    </div>
                </div>
            `;

            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Bulletin de paie - ${employee.nom}</title>
                    <meta charset="UTF-8">
                </head>
                <body>
                    ${bulletinHTML}
                </body>
                </html>
            `);
            printWindow.document.close();
            setTimeout(() => printWindow.print(), 500);
        }

function exportSalairesExcel() {
            if (employees.length === 0) {
                alert('❌ Aucun employé à exporter');
                return;
            }

            const mois = document.getElementById('salaireMois').value;
            const moisNom = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'][parseInt(mois)];
            const annee = new Date().getFullYear();

            // Préparer les données
            const data = employees.map(e => ({
                'Nom': e.nom,
                'Poste': e.poste,
                'Salaire Net (FCFA)': e.salaire
            }));

            // Ajouter ligne total
            data.push({
                'Nom': '',
                'Poste': 'TOTAL',
                'Salaire Net (FCFA)': employees.reduce((sum, e) => sum + e.salaire, 0)
            });

            // Créer le workbook
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, `Salaires ${moisNom}`);

            // Télécharger
            XLSX.writeFile(wb, `Salaires_${moisNom}_${annee}.xlsx`);
        }
