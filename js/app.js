// ===== Application : navigation, barre latérale et démarrage =====

function logout() {
            // Retour direct au portail d'accueil (comme les autres modules)
            window.location.href = 'portail.html';
        }

const MODULE_INFO = {
            dashboard:    { titre: 'Tableau de bord', icone: 'bi-speedometer2' },
            transactions: { titre: 'Transactions',    icone: 'bi-credit-card' },
            students:     { titre: 'Élèves',          icone: 'bi-mortarboard' },
            tarifs:       { titre: 'Grille tarifaire', icone: 'bi-cash-coin' },
            impayes:      { titre: 'Impayés / Relances', icone: 'bi-exclamation-octagon' },
            reductions:   { titre: 'Réductions / Bourses', icone: 'bi-percent' },
            echeancier:   { titre: 'Échéancier de paiement', icone: 'bi-calendar-check' },
            budget:       { titre: 'Budget', icone: 'bi-pie-chart' },
            historique:   { titre: 'État général',    icone: 'bi-file-earmark-text' },
            salaires:     { titre: 'Salaires',        icone: 'bi-briefcase' },
            enseignants:  { titre: 'Enseignants (paie)', icone: 'bi-person-badge' },
            vacations:    { titre: 'Vacations enseignants', icone: 'bi-clock-history' },
            reports:      { titre: 'Reporting',       icone: 'bi-bar-chart-line' },
            declares:     { titre: 'Paiements déclarés', icone: 'bi-phone' },
            cloture:      { titre: 'Clôture de caisse', icone: 'bi-calculator' }
        };

        function setModuleTitle(tabName) {
            const info = MODULE_INFO[tabName];
            if (!info) return;
            const t = document.getElementById('moduleTitle');
            const ic = document.getElementById('moduleIcon');
            if (t) t.textContent = info.titre;
            if (ic) ic.className = 'bi ' + info.icone;
        }

const SLUG = {
            dashboard: 'tableau-de-bord',
            transactions: 'transactions',
            students: 'eleves',
            tarifs: 'tarifs',
            impayes: 'impayes',
            reductions: 'reductions',
            echeancier: 'echeancier',
            budget: 'budget',
            historique: 'etat-general',
            salaires: 'salaires',
            enseignants: 'enseignants',
            vacations: 'vacations',
            reports: 'reporting',
            declares: 'paiements-declares',
            cloture: 'cloture-caisse'
        };
        const TAB_BY_SLUG = {};
        Object.keys(SLUG).forEach(function(k){ TAB_BY_SLUG[SLUG[k]] = k; });

        function showTab(tabName, updateHash) {
            const el = document.getElementById(tabName);
            if (!el) return;
            document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            el.classList.remove('hidden');
            const btn = document.querySelector('.tab[data-tab="' + tabName + '"]');
            if (btn) btn.classList.add('active');
            setModuleTitle(tabName);
            if (tabName === 'reports' && typeof renderReporting === 'function') renderReporting();
            if (tabName === 'vacations' && typeof renderVacations === 'function') renderVacations();
            if (tabName === 'enseignants' && typeof renderEnseignantsGestion === 'function') renderEnseignantsGestion();
            if (tabName === 'tarifs' && typeof renderTarifs === 'function') renderTarifs();
            if (tabName === 'impayes' && typeof renderImpayes === 'function') renderImpayes();
            if (tabName === 'reductions' && typeof renderReductions === 'function') renderReductions();
            if (tabName === 'echeancier' && typeof renderEcheancier === 'function') renderEcheancier();
            if (tabName === 'budget' && typeof renderBudget === 'function') renderBudget();
            if (tabName === 'declares' && typeof renderDeclares === 'function') renderDeclares();
            if (tabName === 'cloture' && typeof renderCloture === 'function') renderCloture();
            if (updateHash !== false) {
                const slug = SLUG[tabName] || tabName;
                if (location.hash !== '#' + slug) location.hash = slug;
            }
        }

        function routeFromHash() {
            const slug = (location.hash || '').replace(/^#/, '');
            showTab(TAB_BY_SLUG[slug] || 'dashboard', false);
        }

        window.addEventListener('hashchange', routeFromHash);

function toggleSidebar(){
            var sb=document.getElementById('sidebar');
            var ic=document.getElementById('sidebarToggleIcon');
            var collapsed=sb.classList.toggle('collapsed');
            ic.className = collapsed ? 'bi bi-list' : 'bi bi-chevron-left';
        }

window.onload = function() {
            loadData();
            document.getElementById('transDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('dashboardDate').value = new Date().toISOString().split('T')[0];
            createMonthGrid();
            initCharts();
            routeFromHash();
        };
