// ===== Données : chargement et calculs =====

function loadData() {
            const saved = localStorage.getItem('digigespro_students');
            students = saved ? JSON.parse(saved) : [
                {id: '1', nom: 'MBEMBA', prenom: 'Jean', classe: '6eme A', matricule: 'MAT-001'},
                {id: '2', nom: 'NZAMBI', prenom: 'Grace', classe: '5eme B', matricule: 'MAT-002'}
            ];

            syncStudentsFromScolarite(); // récupère les élèves créés en Scolarité

            const savedTrans = localStorage.getItem('digigespro_transactions');
            transactions = savedTrans ? JSON.parse(savedTrans) : [];

            const savedEmployees = localStorage.getItem('digigespro_employees');
            employees = savedEmployees ? JSON.parse(savedEmployees) : [];

            updateUI();
        }

// Récupère dans la caisse tous les élèves du registre Scolarité (ecole_eleves),
// pour que les élèves créés en Scolarité apparaissent aussi côté Gestion.
function syncStudentsFromScolarite() {
            let eco = [];
            try { eco = JSON.parse(localStorage.getItem('ecole_eleves')) || []; } catch (e) { eco = []; }
            if (!Array.isArray(eco) || eco.length === 0) return;
            let changed = false;
            eco.forEach(e => {
                if (!e || !e.id) return;
                const s = students.find(x => x.id === e.id || (e.matricule && x.matricule === e.matricule));
                if (s) {
                    if (s.nom !== e.nom || s.prenom !== e.prenom || s.classe !== e.classe || (e.matricule && s.matricule !== e.matricule)) {
                        s.nom = e.nom; s.prenom = e.prenom; s.classe = e.classe;
                        if (e.matricule) s.matricule = e.matricule;
                        changed = true;
                    }
                } else {
                    students.push({ id: e.id, nom: e.nom, prenom: e.prenom, classe: e.classe || '', matricule: e.matricule || '' });
                    changed = true;
                }
            });
            if (changed) localStorage.setItem('digigespro_students', JSON.stringify(students));
        }

// Ordre des mois de l'année scolaire (le calendrier congolais démarre en octobre)
const SCHOOL_MONTH_ORDER = ['Octobre', 'Novembre', 'Decembre', 'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre'];
function nbMoisScolarite() {
            let n = 9;
            try { const v = parseInt(localStorage.getItem('ecole_mois_scolarite'), 10); if (!isNaN(v)) n = v; } catch (e) { }
            if (n < 1) n = 1; if (n > 12) n = 12;
            return n;
        }
function moisFactures() { return SCHOOL_MONTH_ORDER.slice(0, nbMoisScolarite()); }

// ===== Réductions / bourses par élève =====
function reductionEleve(studentId) {
            try { const r = JSON.parse(localStorage.getItem('ecole_reductions')) || {}; return r[studentId] || null; } catch (e) { return null; }
        }
// Mensualité après application de la réduction de l'élève
function mensualiteEffective(studentId, mensBase) {
            const r = reductionEleve(studentId);
            if (!r || !r.mode || r.mode === 'aucune') return mensBase;
            if (r.mode === 'gratuite') return 0;
            if (r.mode === 'pourcentage') { const p = Math.max(0, Math.min(100, parseFloat(r.valeur) || 0)); return Math.round(mensBase * (1 - p / 100)); }
            if (r.mode === 'fixe') { const v = parseFloat(r.valeur); return (!isNaN(v) && v >= 0) ? v : mensBase; }
            return mensBase;
        }

function calculateMonthlyBalances(studentId) {
            const payments = transactions.filter(t => t.studentId === studentId && t.type === 'scolarite');
            const student = (typeof students !== 'undefined' && students) ? students.find(s => s.id === studentId) : null;
            let mensGrille = 0;
            if (student && typeof grilleTarif === 'function') { mensGrille = grilleTarif(student.classe).mensualite || 0; }
            mensGrille = mensualiteEffective(studentId, mensGrille); // appliquer la réduction / bourse de l'élève
            const factures = moisFactures();

            const balances = {};
            MOIS.forEach(mois => {
                const monthPayments = payments.filter(p => p.moisPayes && p.moisPayes.includes(mois));
                const totalPaye = monthPayments.reduce((sum, p) => sum + (p.montantParMois?.[mois] || 0), 0);

                // Montant attendu du mois : prix du paiement s'il existe, sinon mensualité de la grille
                // (uniquement pour les mois effectivement facturés dans l'année scolaire)
                const dernierPaiement = monthPayments[0];
                const attenduGrille = factures.indexOf(mois) >= 0 ? mensGrille : 0;
                const prixFixeMois = (dernierPaiement && dernierPaiement.prixFixe) ? dernierPaiement.prixFixe : attenduGrille;
                const reste = prixFixeMois - totalPaye;

                balances[mois] = {
                    paye: totalPaye,
                    prixFixe: prixFixeMois,
                    reste: reste,
                    status: prixFixeMois > 0 && totalPaye >= prixFixeMois ? 'complet' : totalPaye > 0 ? 'partiel' : 'impaye'
                };
            });

            return balances;
        }

function removeAccents(str) {
            return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        }
