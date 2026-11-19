// ===== Transactions : saisie, paiements, mois =====

function selectTransactionType(type) {
            transactionType = type;
            document.getElementById('typePaiement').classList.toggle('selected', type === 'paiement');
            document.getElementById('typeDepense').classList.toggle('selected', type === 'depense');
            
            document.getElementById('paiementSection').classList.toggle('hidden', type === 'depense');
            document.getElementById('depenseSection').classList.toggle('hidden', type === 'paiement');
            
            // Ajuster les champs requis
            document.getElementById('studentSelect').required = (type === 'paiement');
            document.getElementById('depenseNature').required = (type === 'depense');
            
            if (type === 'paiement') {
                updateTypeFraisDisplay();
            }
        }

function updateTypeFraisDisplay() {
            const typeFrais = document.getElementById('typeFrais').value;
            const showMonths = (typeFrais === 'scolarite');
            const showPrixFixe = (typeFrais === 'scolarite');
            const showTypesPaiement = (typeFrais === 'scolarite');

            const monthSection = document.querySelector('#paiementSection > div:has(#monthGrid)');
            const prixFixeSection = document.getElementById('prixFixeSection');
            const typesPaiementSection = document.querySelector('#paiementSection > div:has(#paiementComplet)');

            if (monthSection) monthSection.style.display = showMonths ? 'block' : 'none';
            if (prixFixeSection) prixFixeSection.style.display = showPrixFixe ? 'block' : 'none';
            if (typesPaiementSection) typesPaiementSection.style.display = showTypesPaiement ? 'block' : 'none';
        }

function createMonthGrid() {
            document.getElementById('monthGrid').innerHTML = MOIS.map(mois => `
                <div class="month-btn" onclick="toggleMonthSelection('${mois}')" id="month-${mois}">
                    ${mois}
                </div>
            `).join('');
        }

function selectPaymentType(type) {
            paymentType = type;
            document.getElementById('paiementComplet').classList.toggle('selected', type === 'complet');
            document.getElementById('paiementMultiple').classList.toggle('selected', type === 'multiple');
            document.getElementById('paiementEcheance').classList.toggle('selected', type === 'echeance');
            updateMontantInfo();
        }

function toggleMonthSelection(mois) {
            const btn = document.getElementById('month-' + mois);
            const idx = selectedMonths.indexOf(mois);
            
            if (idx > -1) {
                selectedMonths.splice(idx, 1);
                btn.classList.remove('selected');
            } else {
                selectedMonths.push(mois);
                btn.classList.add('selected');
            }
            
            updateMontantInfo();
        }

function updateMontantInfo() {
            const count = selectedMonths.length;
            
            if (count === 0) {
                document.getElementById('montantInfo').textContent = '';
                return;
            }
            
            const prixFixe = parseFloat(document.getElementById('prixFixeMensuel').value) || PRIX_FIXE;
            const totalPrixFixe = count * prixFixe;
            
            if (paymentType === 'echeance') {
                document.getElementById('montantInfo').textContent = `💡 ${count} mois × ${prixFixe.toLocaleString()} = ${totalPrixFixe.toLocaleString()} FCFA. Vous pouvez payer une avance.`;
            } else if (paymentType === 'multiple') {
                document.getElementById('montantInfo').textContent = `💡 ${count} mois × ${prixFixe.toLocaleString()} = ${totalPrixFixe.toLocaleString()} FCFA recommandés`;
            } else {
                document.getElementById('montantInfo').textContent = `💡 1 mois = ${prixFixe.toLocaleString()} FCFA`;
            }
        }

function loadStudentMonths() {
            const studentId = document.getElementById('studentSelect').value;
            if (!studentId) return;
            
            const student = students.find(s => s.id === studentId);
            if (student) {
                document.getElementById('studentClasse').value = student.classe;
                // Prix mensuel depuis la grille tarifaire de la classe
                if (typeof grilleTarif === 'function') {
                    const t = grilleTarif(student.classe);
                    if (t.mensualite > 0) document.getElementById('prixFixeMensuel').value = t.mensualite;
                }
            }
            
            const payments = transactions.filter(t => t.studentId === studentId && t.type === 'scolarite');
            
            MOIS.forEach(mois => {
                const btn = document.getElementById('month-' + mois);
                btn.classList.remove('paid', 'partial');
                
                const monthPayments = payments.filter(p => p.moisPayes && p.moisPayes.includes(mois));
                const totalPaye = monthPayments.reduce((sum, p) => sum + (p.montantParMois?.[mois] || 0), 0);
                
                const dernierPaiement = monthPayments[0];
                const prixFixeMois = dernierPaiement?.prixFixe || parseFloat(document.getElementById('prixFixeMensuel').value) || PRIX_FIXE;
                
                if (totalPaye >= prixFixeMois) {
                    btn.classList.add('paid');
                    btn.innerHTML = `${mois}<br><small style="font-size:0.75rem;">✓ Paye</small>`;
                } else if (totalPaye > 0) {
                    btn.classList.add('partial');
                    btn.innerHTML = `${mois}<br><small style="font-size:0.75rem;">${totalPaye.toLocaleString()}</small>`;
                } else {
                    btn.innerHTML = mois;
                }
            });
        }

function editMonthPayment(studentId, mois) {
            const student = students.find(s => s.id === studentId);
            
            // Pré-remplir le modal avec les informations
            document.getElementById('modalTitle').textContent = `Completer le paiement - ${mois}`;
            document.getElementById('studentSelect').value = studentId;
            document.getElementById('studentClasse').value = student.classe;
            
            // Sélectionner uniquement ce mois
            selectedMonths = [mois];
            createMonthGrid();
            document.getElementById('month-' + mois).classList.add('selected');
            
            // Définir comme échéance par défaut
            selectPaymentType('echeance');
            loadStudentMonths();
            
            document.getElementById('addTransactionModal').classList.remove('hidden');
        }

function renderTransactions() {
            const search = (document.getElementById('searchTrans')?.value || '').toLowerCase();
            let filtered = transactions.filter(t => 
                !search || 
                (t.studentName||'').toLowerCase().includes(search) ||
                (t.description||'').toLowerCase().includes(search) ||
                ((t.nature||'')+' '+(t.categorie||'')).toLowerCase().includes(search)
            );

            console.log('renderTransactions appelé, nombre de transactions:', transactions.length, 'filtrées:', filtered.length);

            if (filtered.length === 0) {
                document.getElementById('transactionsList').innerHTML = '<p style="text-align:center;color:var(--muted,#64748b);padding:2rem;">Aucune transaction</p>';
                return;
            }

            document.getElementById('transactionsList').innerHTML = filtered.map(t => {
                if (t.type === 'depense') {
                    // Affichage pour dépense
                    return `
                        <div style="padding:1rem;background:var(--danger-bg,#fff5f5);border-left:4px solid #ef4444;border-radius:10px;margin-bottom:0.75rem;">
                            <div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
                                <div style="flex:1;">
                                    <p style="font-weight:600;margin-bottom:0.5rem;">💸 ${t.nature || t.categorie || 'Dépense'}</p>
                                    <p style="margin:0.25rem 0;color:var(--muted,#475569);">${t.description}</p>
                                    <p style="font-size:0.875rem;color:var(--muted-2,#94a3b8);margin-top:0.5rem;">
                                        📅 ${new Date(t.date).toLocaleDateString('fr-FR')} ${t.time} • ${t.reference}
                                    </p>
                                </div>
                                <div style="text-align:right;display:flex;flex-direction:column;gap:0.5rem;align-items:flex-end;">
                                    <div>
                                        <p style="font-size:1.75rem;font-weight:700;color:var(--danger,#ef4444);">-${parseFloat(t.amount).toLocaleString()}</p>
                                        <p style="font-size:0.875rem;color:var(--muted,#64748b);">FCFA</p>
                                    </div>
                                    <button class="btn btn-danger" style="padding:0.5rem 1rem;font-size:0.875rem;" onclick="deleteTransaction('${t.id}')">
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    // Affichage pour paiement
                    const moisList = t.moisPayes ? t.moisPayes.join(', ') : '-';
                    const isPlusiersMois = t.moisPayes && t.moisPayes.length > 1;
                    
                    return `
                        <div style="padding:1rem;background:var(--surface-2,#f8fafc);border-left:4px solid #10b981;border-radius:10px;margin-bottom:0.75rem;">
                            <div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
                                <div style="flex:1;">
                                    <p style="font-weight:600;">${t.studentName || '-'}</p>
                                    <p style="margin:0.25rem 0;color:var(--brand,#1B6BFF);">Mois: ${moisList}</p>
                                    <p style="margin:0.25rem 0;color:var(--muted,#475569);">${t.description}</p>
                                    ${isPlusiersMois ? '<p style="font-size:0.875rem;color:var(--brand,#3b82f6);font-weight:600;">📅 Paiement sur plusieurs mois</p>' : ''}
                                    ${t.isEcheance ? '<p style="font-size:0.875rem;color:var(--warn,#f59e0b);font-weight:600;">⚡ Paiement par echeance</p>' : ''}
                                    <p style="font-size:0.875rem;color:var(--muted-2,#94a3b8);margin-top:0.5rem;">
                                        📅 ${new Date(t.date).toLocaleDateString('fr-FR')} ${t.time}
                                    </p>
                                </div>
                                <div style="text-align:right;display:flex;flex-direction:column;gap:0.5rem;align-items:flex-end;">
                                    <div>
                                        <p style="font-size:1.75rem;font-weight:700;color:var(--ok,#10b981);">+${parseFloat(t.amount).toLocaleString()}</p>
                                        <p style="font-size:0.875rem;color:var(--muted,#64748b);">FCFA</p>
                                    </div>
                                    <div style="display:flex;gap:0.5rem;">
                                        <button class="btn btn-primary" style="padding:0.5rem 1rem;font-size:0.875rem;" onclick='showReceipt(${JSON.stringify(t).replace(/'/g, "\\'")})'> 
                                            🖨️ Recu
                                        </button>
                                        <button class="btn btn-danger" style="padding:0.5rem 1rem;font-size:0.875rem;" onclick="deleteTransaction('${t.id}')">
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }
            }).join('');
        }

function showAddTransactionModal() {
            selectedMonths = [];
            paymentType = 'complet';
            transactionType = 'paiement';
            editingTransactionId = null;
            
            document.getElementById('modalTitle').textContent = 'Nouvelle transaction';
            document.getElementById('editTransactionId').value = '';
            
            // Réinitialiser le type de transaction
            selectTransactionType('paiement');
            
            createMonthGrid();
            selectPaymentType('complet');
            
            // Réinitialiser les champs manuellement
            document.getElementById('transDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('nomEcole').value = localStorage.getItem('digigespro_ecole') || '';
            document.getElementById('studentSelect').value = '';
            document.getElementById('studentClasse').value = '';
            document.getElementById('prixFixeMensuel').value = '';
            document.getElementById('transAmount').value = '';
            document.getElementById('transDescription').value = '';
            document.getElementById('depenseNature').value = '';
            
            document.getElementById('addTransactionModal').classList.remove('hidden');
        }

function hideModal() {
            document.getElementById('addTransactionModal').classList.add('hidden');
        }

function saveTransaction(event) {
            event.preventDefault();

            if (transactionType === 'paiement') {
                const typeFrais = document.getElementById('typeFrais').value;
                const studentId = document.getElementById('studentSelect').value;

                if (!studentId) {
                    alert('❌ Selectionnez un eleve');
                    return;
                }

                const student = students.find(s => s.id === studentId);
                const amount = parseFloat(document.getElementById('transAmount').value);
                const nomEcole = document.getElementById('nomEcole').value;
                const paymentMethod = document.getElementById('paymentMethod').value;

                // Pour inscription et réinscription, pas besoin de mois
                if (typeFrais === 'inscription' || typeFrais === 'reinscription') {
                    const newTrans = {
                        id: Date.now().toString(),
                        date: document.getElementById('transDate').value,
                        time: new Date().toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'}),
                        type: typeFrais,
                        nomEcole: nomEcole,
                        paymentMethod: paymentMethod,
                        studentId: student.id,
                        studentName: `${student.nom} ${student.prenom}`,
                        studentClasse: document.getElementById('studentClasse').value,
                        studentMatricule: student.matricule,
                        amount: amount,
                        description: document.getElementById('transDescription').value || `Frais de ${typeFrais}`,
                        reference: `${typeFrais.substring(0,3).toUpperCase()}-${String(transactions.filter(t => t.type === typeFrais).length+1).padStart(3,'0')}`
                    };

                    transactions.unshift(newTrans);
                    localStorage.setItem('digigespro_transactions', JSON.stringify(transactions));
                    localStorage.setItem('digigespro_ecole', nomEcole); // Sauvegarder pour la prochaine fois
                    alert('✅ Paiement enregistre !');
                } else {
                    // Frais scolaires - avec mois
                    if (selectedMonths.length === 0) {
                        alert('❌ Selectionnez au moins un mois');
                        return;
                    }

                    const prixFixe = parseFloat(document.getElementById('prixFixeMensuel').value);
                    const montantParMois = {};
                    const montantParMoisReparti = amount / selectedMonths.length;
                    selectedMonths.forEach(mois => {
                        montantParMois[mois] = montantParMoisReparti;
                    });

                    const newTrans = {
                        id: Date.now().toString(),
                        date: document.getElementById('transDate').value,
                        time: new Date().toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'}),
                        type: 'scolarite',
                        nomEcole: nomEcole,
                        paymentMethod: paymentMethod,
                        studentId: student.id,
                        studentName: `${student.nom} ${student.prenom}`,
                        studentClasse: document.getElementById('studentClasse').value,
                        studentMatricule: student.matricule,
                        moisPayes: selectedMonths,
                        montantParMois: montantParMois,
                        prixFixe: prixFixe,
                        isEcheance: paymentType === 'echeance',
                        amount: amount,
                        description: document.getElementById('transDescription').value || `Paiement ${selectedMonths.join(', ')}`,
                        reference: `SCO-${String(transactions.filter(t => t.type === 'scolarite').length+1).padStart(3,'0')}`
                    };

                    transactions.unshift(newTrans);
                    localStorage.setItem('digigespro_transactions', JSON.stringify(transactions));
                    localStorage.setItem('digigespro_ecole', nomEcole); // Sauvegarder pour la prochaine fois
                    alert('✅ Paiement enregistre !');
                }
            } else {
                // Dépense
                const nature = document.getElementById('depenseNature').value;
                if (!nature) {
                    alert('❌ Renseignez la nature de la depense');
                    return;
                }

                const newDepense = {
                    id: Date.now().toString(),
                    date: document.getElementById('transDate').value,
                    time: new Date().toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'}),
                    type: 'depense',
                    nature: nature,
                    amount: parseFloat(document.getElementById('transAmount').value),
                    description: document.getElementById('transDescription').value || '-',
                    reference: `DEP-${String(transactions.filter(t => t.type === 'depense').length + 1).padStart(3,'0')}`
                };

                transactions.unshift(newDepense);
                localStorage.setItem('digigespro_transactions', JSON.stringify(transactions));
                alert('✅ Depense enregistree !');
            }

            // Fermer le modal d'abord
            hideModal();
            
            // Forcer le rafraîchissement complet
            setTimeout(() => {
                updateUI();
                renderTransactions();
                renderDepenses();
                if (chartRepartition) updateCharts();
            }, 100);
        }

function deleteTransaction(id) {
            if (!confirm('Voulez-vous vraiment supprimer cette transaction ?')) return;
            
            transactions = transactions.filter(t => t.id !== id);
            localStorage.setItem('digigespro_transactions', JSON.stringify(transactions));
            updateUI();
            alert('✅ Transaction supprimee');
        }
