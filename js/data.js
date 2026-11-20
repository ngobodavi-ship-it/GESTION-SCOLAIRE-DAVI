// ===== Données : chargement et calculs =====

function loadData() {
            const saved = localStorage.getItem('digigespro_students');
            students = saved ? JSON.parse(saved) : [];
            const savedTx0 = localStorage.getItem('digigespro_transactions');
            transactions = savedTx0 ? JSON.parse(savedTx0) : [];

            syncStudentsFromScolarite(); // récupère les élèves créés en Scolarité

            const savedTrans = localStorage.getItem('digigespro_transactions');
            transactions = savedTrans ? JSON.parse(savedTrans) : [];

            const savedEmployees = localStorage.getItem('digigespro_employees');
            employees = savedEmployees ? JSON.parse(savedEmployees) : [];

            updateUI();
        }

// Synchronisation des deux registres d'élèves.
// Le registre principal (ecole_eleves, Scolarité) fait référence ; la caisse
// (digigespro_students) en est le reflet :
//  • élèves du registre → copiés / mis à jour dans la caisse ;
//  • élèves présents seulement dans la caisse (anciens imports Excel) → ajoutés
//    au registre, sauf s'ils ont été supprimés volontairement (liste ecole_eleves_supprimes) ;
//  • les 2 élèves de démonstration (MBEMBA, NZAMBI) sans paiement → retirés.
function syncStudentsFromScolarite() {
            let eco = [];
            try { eco = JSON.parse(localStorage.getItem('ecole_eleves')) || []; } catch (e) { eco = []; }
            if (!Array.isArray(eco)) eco = [];
            let supprimes = [];
            try { supprimes = JSON.parse(localStorage.getItem('ecole_eleves_supprimes')) || []; } catch (e) { supprimes = []; }
            const estSupprime = s => supprimes.some(x => x.id === s.id || (s.matricule && x.matricule === s.matricule));
            const aPaiement = s => (transactions || []).some(t => t.studentId === s.id);
            let changed = false, ecoChanged = false;
            // élèves de démonstration d'origine
            const demo = s => (s.id === '1' && s.matricule === 'MAT-001' && s.nom === 'MBEMBA') || (s.id === '2' && s.matricule === 'MAT-002' && s.nom === 'NZAMBI');
            const avantDemo = students.length;
            students = students.filter(s => !(demo(s) && !aPaiement(s)));
            if (students.length !== avantDemo) changed = true;
            // élèves supprimés volontairement : retirés de la caisse (leurs paiements restent dans la comptabilité)
            const avantSup = students.length;
            students = students.filter(s => !(estSupprime(s) && !eco.some(e => e.id === s.id)));
            if (students.length !== avantSup) changed = true;
            // élèves présents seulement dans la caisse → ajoutés au registre principal
            const anneeSco = (() => { const d = new Date(), y = d.getFullYear(); return d.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`; })();
            students.forEach(s => {
                if (eco.some(e => e.id === s.id || (s.matricule && e.matricule === s.matricule))) return;
                eco.push({ id: s.id, nom: s.nom, prenom: s.prenom, classe: s.classe || '', matricule: s.matricule || '', statut: 'Nouveau', anneeScolaire: anneeSco, dateInscription: new Date().toISOString().split('T')[0], source: 'caisse' });
                ecoChanged = true;
            });
            if (ecoChanged) localStorage.setItem('ecole_eleves', JSON.stringify(eco));
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

// Note qu'un élève a été supprimé volontairement (pour qu'il ne revienne pas par la synchronisation)
function noterEleveSupprime(id, matricule) {
            let l = [];
            try { l = JSON.parse(localStorage.getItem('ecole_eleves_supprimes')) || []; } catch (e) { l = []; }
            l.push({ id: id, matricule: matricule || '', le: new Date().toISOString() });
            localStorage.setItem('ecole_eleves_supprimes', JSON.stringify(l.slice(-2000)));
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
