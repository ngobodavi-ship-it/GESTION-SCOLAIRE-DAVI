// ===== Configuration & état global =====

// ============================================
        // DigiGesPro - Application locale
        // © 2026 Tous droits réservés
        // ============================================

// Animation de vibration pour code incorrect
        const style = document.createElement('style');
        style.textContent = `
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
                20%, 40%, 60%, 80% { transform: translateX(10px); }
            }
        `;
        document.head.appendChild(style);

        let students = [];
        let transactions = [];
        let employees = []; // Liste des employés
        let salaires = []; // Historique des salaires calculés
        const PRIX_FIXE = 75000;
        const MOIS = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];
        let selectedMonths = [];
        let paymentType = 'complet';
        let editingTransactionId = null;
        let transactionType = 'paiement'; // 'paiement' ou 'depense'
        let chartRepartition = null;
        let chartEvolution = null;
