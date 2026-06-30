// ===== Tableau de bord : indicateurs, sélecteurs, graphiques =====

function updateUI() {
            const selectedDate = new Date(document.getElementById('dashboardDate').value);
            selectedDate.setHours(0,0,0,0);
            
            const dayTrans = transactions.filter(t => {
                const d = new Date(t.date);
                d.setHours(0,0,0,0);
                return d.getTime() === selectedDate.getTime();
            });

            // Calculer par type
            const inscriptions = dayTrans.filter(t => t.type === 'inscription').reduce((s,t) => s + parseFloat(t.amount||0), 0);
            const reinscriptions = dayTrans.filter(t => t.type === 'reinscription').reduce((s,t) => s + parseFloat(t.amount||0), 0);
            const fraisScolaires = dayTrans.filter(t => t.type === 'scolarite').reduce((s,t) => s + parseFloat(t.amount||0), 0);
            const depenses = dayTrans.filter(t => t.type === 'depense').reduce((s,t) => s + parseFloat(t.amount||0), 0);
            
            const totalEntrees = inscriptions + reinscriptions + fraisScolaires;
            const solde = totalEntrees - depenses;

            document.getElementById('inscriptionsJour').textContent = inscriptions.toLocaleString();
            document.getElementById('reinscriptionsJour').textContent = reinscriptions.toLocaleString();
            document.getElementById('fraisScolairesJour').textContent = fraisScolaires.toLocaleString();
            document.getElementById('depensesJour').textContent = depenses.toLocaleString();
            document.getElementById('soldeJour').textContent = solde.toLocaleString();
            document.getElementById('soldeJour').style.color = solde >= 0 ? '#1B6BFF' : '#ef4444';

            renderStudents();
            renderTransactions();
            renderDepenses();
            updateSelects();
            updateCharts();
            document.getElementById('studentCount').textContent = students.length;
            document.getElementById('studentCount2').textContent = students.length;
        }

function renderDepenses() {
            const selectedDate = new Date(document.getElementById('dashboardDate').value);
            selectedDate.setHours(0,0,0,0);
            
            const dayDepenses = transactions.filter(t => {
                if (t.type !== 'depense') return false;
                const d = new Date(t.date);
                d.setHours(0,0,0,0);
                return d.getTime() === selectedDate.getTime();
            });

            if (dayDepenses.length === 0) {
                document.getElementById('depensesContent').innerHTML = '<p style="text-align:center;color:#64748b;padding:2rem;">Aucune dépense aujourd\'hui</p>';
                return;
            }

            document.getElementById('depensesContent').innerHTML = dayDepenses.map(d => `
                <div style="padding:1rem;background:#fff5f5;border-left:4px solid #ef4444;border-radius:10px;margin-bottom:0.75rem;">
                    <div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
                        <div style="flex:1;">
                            <p style="font-weight:600;margin-bottom:0.5rem;">🏷️ ${d.nature || d.categorie || 'Dépense'}</p>
                            <p style="font-size:0.875rem;color:#64748b;">${d.description || '-'}</p>
                            <p style="font-size:0.875rem;color:#94a3b8;margin-top:0.5rem;">
                                📅 ${new Date(d.date).toLocaleDateString('fr-FR')} ${d.time}
                            </p>
                        </div>
                        <div style="text-align:right;display:flex;flex-direction:column;gap:0.5rem;">
                            <div>
                                <p style="font-size:1.5rem;font-weight:700;color:#ef4444;">-${parseFloat(d.amount).toLocaleString()}</p>
                                <p style="font-size:0.875rem;color:#64748b;">FCFA</p>
                            </div>
                            <button class="btn btn-danger" style="padding:0.35rem 0.75rem;font-size:0.75rem;" onclick="deleteTransaction('${d.id}')">
                                🗑️ Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        }

function updateSelects() {
            const studentSelect = document.getElementById('studentSelect');
            studentSelect.innerHTML = '<option value="">-- Choisir --</option>' + 
                students.map(s => `<option value="${s.id}">${s.nom} ${s.prenom} - ${s.classe}</option>`).join('');

            const histoSelect = document.getElementById('selectStudentHisto');
            histoSelect.innerHTML = '<option value="">-- Selectionner --</option>' + 
                students.map(s => `<option value="${s.id}">${s.nom} ${s.prenom} - ${s.classe}</option>`).join('');
        }

function initCharts() {
            // Graphique de répartition (Barres)
            const ctxRepartition = document.getElementById('chartRepartition');
            if (ctxRepartition) {
                chartRepartition = new Chart(ctxRepartition, {
                    type: 'bar',
                    data: {
                        labels: ['Inscriptions', 'Reinscriptions', 'Frais scolaires', 'Depenses'],
                        datasets: [{
                            label: 'Montant (FCFA)',
                            data: [0, 0, 0, 0],
                            backgroundColor: [
                                'rgba(102, 126, 234, 0.8)',  // Bleu
                                'rgba(139, 92, 246, 0.8)',   // Violet
                                'rgba(16, 185, 129, 0.8)',   // Vert
                                'rgba(239, 68, 68, 0.8)'     // Rouge
                            ],
                            borderColor: [
                                'rgb(102, 126, 234)',
                                'rgb(139, 92, 246)',
                                'rgb(16, 185, 129)',
                                'rgb(239, 68, 68)'
                            ],
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return Math.round(context.parsed.y).toLocaleString() + ' FCFA';
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return Math.round(value).toLocaleString();
                                    }
                                }
                            }
                        }
                    }
                });
            }

            // Graphique d'évolution (Ligne)
            const ctxEvolution = document.getElementById('chartEvolution');
            if (ctxEvolution) {
                chartEvolution = new Chart(ctxEvolution, {
                    type: 'line',
                    data: {
                        labels: [],
                        datasets: [{
                            label: 'Entrees',
                            data: [],
                            borderColor: 'rgb(16, 185, 129)',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            tension: 0.4,
                            fill: true
                        }, {
                            label: 'Depenses',
                            data: [],
                            borderColor: 'rgb(239, 68, 68)',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            tension: 0.4,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: true,
                        plugins: {
                            legend: {
                                display: true,
                                position: 'top'
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return context.dataset.label + ': ' + Math.round(context.parsed.y).toLocaleString() + ' FCFA';
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return Math.round(value).toLocaleString();
                                    }
                                }
                            }
                        }
                    }
                });
            }
        }

function updateCharts() {
            const selectedDate = new Date(document.getElementById('dashboardDate').value);
            selectedDate.setHours(0,0,0,0);
            
            const dayTrans = transactions.filter(t => {
                const d = new Date(t.date);
                d.setHours(0,0,0,0);
                return d.getTime() === selectedDate.getTime();
            });

            // Mettre à jour le graphique de répartition
            if (chartRepartition) {
                const inscriptions = dayTrans.filter(t => t.type === 'inscription').reduce((s,t) => s + parseFloat(t.amount||0), 0);
                const reinscriptions = dayTrans.filter(t => t.type === 'reinscription').reduce((s,t) => s + parseFloat(t.amount||0), 0);
                const fraisScolaires = dayTrans.filter(t => t.type === 'scolarite').reduce((s,t) => s + parseFloat(t.amount||0), 0);
                const depenses = dayTrans.filter(t => t.type === 'depense').reduce((s,t) => s + parseFloat(t.amount||0), 0);

                chartRepartition.data.datasets[0].data = [inscriptions, reinscriptions, fraisScolaires, depenses];
                chartRepartition.update();
            }

            // Mettre à jour le graphique d'évolution (7 derniers jours)
            if (chartEvolution) {
                const labels = [];
                const entreesData = [];
                const depensesData = [];

                for (let i = 6; i >= 0; i--) {
                    const date = new Date(selectedDate);
                    date.setDate(date.getDate() - i);
                    date.setHours(0,0,0,0);

                    const dayTransactions = transactions.filter(t => {
                        const d = new Date(t.date);
                        d.setHours(0,0,0,0);
                        return d.getTime() === date.getTime();
                    });

                    const entrees = dayTransactions.filter(t => t.type !== 'depense').reduce((s,t) => s + parseFloat(t.amount||0), 0);
                    const depenses = dayTransactions.filter(t => t.type === 'depense').reduce((s,t) => s + parseFloat(t.amount||0), 0);

                    labels.push(date.toLocaleDateString('fr-FR', {day: '2-digit', month: '2-digit'}));
                    entreesData.push(entrees);
                    depensesData.push(depenses);
                }

                chartEvolution.data.labels = labels;
                chartEvolution.data.datasets[0].data = entreesData;
                chartEvolution.data.datasets[1].data = depensesData;
                chartEvolution.update();
            }
        }

        // ============================================
        // GESTION DES SALAIRES
        // ============================================
