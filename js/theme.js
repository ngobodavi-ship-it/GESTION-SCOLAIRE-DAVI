// =====================================================================
// Design system « Nuit & Lumière » — comportements communs à toutes les pages
//  1. Thème clair / sombre et couleur d'établissement (mémorisés sur l'appareil)
//  2. Emojis remplacés par des icônes
//  3. Notifications à la place des fenêtres « alert »
//  4. Coquille d'application : barre latérale groupée, marque, utilisateur,
//     fil d'Ariane, menu coulissant sur téléphone
//  5. Recherche globale (Ctrl + K)
//  6. Pastilles de statut et états vides dans les tableaux
// Ce fichier ne touche ni aux données ni aux calculs de l'application.
// =====================================================================
(function () {
    'use strict';
    var root = document.documentElement;
    function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

    // ---------------------------------------------------------------
    // 1. Thème et couleur d'établissement (appliqués avant l'affichage)
    // ---------------------------------------------------------------
    var THEME_KEY = 'ui_theme', ACCENT_KEY = 'ui_accent';
    var ACCENTS = [
        { id: 'indigo',   nom: 'Indigo',   c: '#5B4CF0', c2: '#8B5CF6' },
        { id: 'emerald',  nom: 'Émeraude', c: '#059669', c2: '#22C55E' },
        { id: 'ocean',    nom: 'Océan',    c: '#0284C7', c2: '#06B6D4' },
        { id: 'bordeaux', nom: 'Bordeaux', c: '#BE123C', c2: '#F43F5E' },
        { id: 'amber',    nom: 'Ambre',    c: '#D97706', c2: '#F59E0B' }
    ];
    window.UI_ACCENTS = ACCENTS;
    function preferredTheme() {
        var s = store(THEME_KEY);
        if (s === 'light' || s === 'dark') return s;
        return (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }
    function emitChange() { try { window.dispatchEvent(new CustomEvent('themechange')); } catch (e) {} }
    function applyTheme(t) {
        root.setAttribute('data-bs-theme', t);
        document.querySelectorAll('[data-theme-icon]').forEach(function (i) { i.className = t === 'dark' ? 'bi bi-sun' : 'bi bi-moon-stars'; });
        emitChange();
    }
    function applyAccent(a) {
        if (!ACCENTS.some(function (x) { return x.id === a; })) a = 'indigo';
        root.setAttribute('data-accent', a);
        document.querySelectorAll('.accent-picker button').forEach(function (b) { b.classList.toggle('on', b.dataset.accent === a); });
        emitChange();
    }
    applyTheme(preferredTheme());
    applyAccent(store(ACCENT_KEY) || 'indigo');
    window.toggleTheme = function () {
        var t = root.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
        store(THEME_KEY, t); applyTheme(t);
    };
    window.uiSetAccent = function (a) { store(ACCENT_KEY, a); applyAccent(a); };
    if (window.matchMedia) {
        var mq = matchMedia('(prefers-color-scheme: dark)');
        if (mq.addEventListener) mq.addEventListener('change', function () { if (!store(THEME_KEY)) applyTheme(mq.matches ? 'dark' : 'light'); });
    }

    // ---------------------------------------------------------------
    // 2. Emojis → icônes
    // ---------------------------------------------------------------
    var ICONS = {
        '🗑': 'trash3', '➕': 'plus-lg', '📅': 'calendar3', '❌': 'x-circle', '💰': 'wallet2', '✅': 'check-circle',
        '✏': 'pencil', '📝': 'pencil-square', '⚠': 'exclamation-triangle', '💡': 'lightbulb', '📊': 'bar-chart',
        '🖨': 'printer', '💸': 'cash-stack', '📄': 'file-earmark-text', '🔄': 'arrow-repeat', '📚': 'book',
        '📥': 'download', '👨‍🎓': 'mortarboard', '⏰': 'alarm', '📤': 'upload', '⚡': 'lightning-charge',
        '👦': 'gender-male', '👧': 'gender-female', '📋': 'clipboard', '📈': 'graph-up-arrow', '🔍': 'search',
        '👔': 'person-badge', '🏦': 'bank', '📱': 'phone', '👨‍🏫': 'person-video3', '🏫': 'building',
        '👍': 'hand-thumbs-up', '👁': 'eye', '👤': 'person', '🎉': 'stars', '⚙': 'gear', '💼': 'briefcase',
        '🧾': 'receipt', '🎯': 'bullseye', '🎨': 'palette', '💵': 'cash', '🧑‍💼': 'person-workspace',
        '🏆': 'trophy', '🏷': 'tag', '✨': 'stars', '🚨': 'exclamation-octagon', '🎓': 'mortarboard',
        '📜': 'file-earmark-richtext', '👥': 'people', '🟦': 'square-fill', '🟪': 'square-fill', '⚖': 'clipboard-check',
        '📁': 'folder', '📌': 'pin-angle', '🔒': 'lock', '🔓': 'unlock', '📞': 'telephone', '✉': 'envelope',
        '📧': 'envelope', '⭐': 'star', '🔔': 'bell', '📆': 'calendar-week', '🗓': 'calendar3', '⬆': 'arrow-up',
        '⬇': 'arrow-down', '↩': 'arrow-return-left', '🔙': 'arrow-left', '💳': 'credit-card', '🧮': 'calculator',
        '📦': 'box', '🛑': 'sign-stop', '❓': 'question-circle', 'ℹ': 'info-circle', '🕐': 'clock', '⏱': 'stopwatch'
    };
    var EMOJI_RX = /(?:[\u{1F300}-\u{1FAFF}]|[☀-➿]|[⭐⬆⬇ℹ↩⌚-⏿])️?(?:‍(?:[\u{1F300}-\u{1FAFF}]|[☀-➿])️?)*/gu;
    var KEEP = { '✓': 1, '✔': 1, '✗': 1, '✖': 1, '✕': 1, '☐': 1, '☑': 1, '★': 1, '☆': 1, '♂': 1, '♀': 1 };
    function hasEmoji(s) { EMOJI_RX.lastIndex = 0; var r = EMOJI_RX.test(s); EMOJI_RX.lastIndex = 0; return r; }
    function stripEmoji(str) {
        if (typeof str !== 'string') return str;
        return str.replace(EMOJI_RX, function (m) { return KEEP[m.replace(/️/g, '')] ? m : ''; }).replace(/^\s+/, '').replace(/ {2,}/g, ' ');
    }
    window.stripEmoji = stripEmoji;
    var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, CODE: 1, PRE: 1, TITLE: 1, NOSCRIPT: 1 };
    var PLAIN_TAGS = { OPTION: 1, OPTGROUP: 1, SELECT: 1 };
    function processTextNode(node) {
        var txt = node.nodeValue;
        if (!txt || !hasEmoji(txt)) return;
        var parent = node.parentNode;
        if (!parent || SKIP_TAGS[parent.nodeName]) return;
        if (PLAIN_TAGS[parent.nodeName] || (parent.closest && parent.closest('svg'))) { node.nodeValue = stripEmoji(txt); return; }
        var frag = document.createDocumentFragment(), last = 0, m, changed = false;
        EMOJI_RX.lastIndex = 0;
        while ((m = EMOJI_RX.exec(txt))) {
            var key = m[0].replace(/️/g, '');
            if (KEEP[key]) continue;
            changed = true;
            if (m.index > last) frag.appendChild(document.createTextNode(txt.slice(last, m.index)));
            var ic = ICONS[key];
            if (ic) { var i = document.createElement('i'); i.className = 'bi bi-' + ic + ' emo-i'; i.setAttribute('aria-hidden', 'true'); frag.appendChild(i); }
            last = m.index + m[0].length;
            if (!ic && txt.charAt(last) === ' ') last++;
        }
        EMOJI_RX.lastIndex = 0;
        if (!changed) return;
        if (last < txt.length) frag.appendChild(document.createTextNode(txt.slice(last)));
        parent.replaceChild(frag, node);
    }

    // ---------------------------------------------------------------
    // 6. Pastilles de statut et états vides (appelé sur chaque ajout au DOM)
    // ---------------------------------------------------------------
    function norm(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim(); }
    var PILLS = {};
    [['ok', 'paye,payee,regle,reglee,solde,soldee,valide,validee,present,presente,actif,active,admis,admise,reinscrit,reinscrite,inscrit,inscrite,complet,complete,termine,terminee,traite,traitee,justifie,justifiee,accorde,accordee,approuve,approuvee,envoye,envoyee,recu,recue,confirme,confirmee,disponible,a jour,publie,publiee,cloture,cloturee,realise,realisee'],
     ['warn', 'partiel,partielle,en attente,en cours,retard,en retard,brouillon,a valider,a traiter,convoque,convoquee,programme,programmee,planifie,planifiee,a venir,provisoire,incomplet,incomplete,suspendu,suspendue'],
     ['danger', 'impaye,impayee,non paye,non payee,absent,absente,refuse,refusee,rejete,rejetee,exclu,exclue,sortant,sortante,annule,annulee,non justifie,non justifiee,echoue,echouee,expire,expiree,non regle,en defaut,bloque,bloquee'],
     ['info', 'nouveau,nouvelle,pre-inscrit,pre-inscrite,preinscrit,preinscrite,arrivee,depart,entrant,entrante,transfere,transferee'],
     ['violet', 'redoublant,redoublante,boursier,boursiere']
    ].forEach(function (g) { g[1].split(',').forEach(function (w) { PILLS[w] = g[0]; }); });
    function enhanceCells(rootEl) {
        if (!rootEl.querySelectorAll) return;
        var tds = rootEl.nodeName === 'TD' ? [rootEl] : rootEl.querySelectorAll('td');
        for (var i = 0; i < tds.length; i++) {
            var td = tds[i];
            if (td.dataset.uiDone) continue;
            var tr = td.parentNode;
            // état vide : une seule cellule fusionnée qui dit « Aucun… »
            if (tr && tr.cells && tr.cells.length === 1 && td.colSpan > 1 && !td.querySelector('button,input,select,a')) {
                var t = norm(td.textContent);
                if (/^(aucun|aucune|pas de|pas d'|vide|rien)/.test(t)) {
                    td.dataset.uiDone = '1'; td.classList.add('ui-empty');
                    var ic = document.createElement('span'); ic.className = 'ui-empty-ico'; ic.innerHTML = '<i class="bi bi-inbox"></i>';
                    td.insertBefore(ic, td.firstChild);
                    continue;
                }
            }
            // pastille : cellule qui ne contient que le mot du statut
            if (td.children.length === 0) {
                var k = norm(td.textContent);
                if (k && k.length < 26 && PILLS[k]) {
                    td.dataset.uiDone = '1';
                    var sp = document.createElement('span'); sp.className = 'ui-pill ' + PILLS[k]; sp.textContent = td.textContent.trim();
                    td.textContent = ''; td.appendChild(sp);
                }
            }
        }
    }

    function processTree(el) {
        if (!el) return;
        if (el.nodeType === 3) { processTextNode(el); return; }
        if (el.nodeType !== 1 || SKIP_TAGS[el.nodeName]) return;
        var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null), list = [], n;
        while ((n = walker.nextNode())) list.push(n);
        list.forEach(processTextNode);
        if (el.querySelectorAll) {
            var els = el.querySelectorAll('[title],[placeholder]');
            for (var k = 0; k < els.length; k++) {
                ['title', 'placeholder'].forEach(function (a) { var v = els[k].getAttribute(a); if (v && hasEmoji(v)) els[k].setAttribute(a, stripEmoji(v)); });
            }
            enhanceCells(el);
        }
    }
    window.uiProcessIcons = processTree;

    // ---------------------------------------------------------------
    // 3. Notifications
    // ---------------------------------------------------------------
    function toastStack() {
        var s = document.querySelector('.toast-stack');
        if (!s && document.body) { s = document.createElement('div'); s.className = 'toast-stack'; s.setAttribute('role', 'status'); s.setAttribute('aria-live', 'polite'); document.body.appendChild(s); }
        return s;
    }
    function kindOf(msg) {
        var t = (msg || '').toLowerCase();
        if (/erreur|impossible|incorrect|invalide|échec|refus|non autoris|introuvable|manquant/.test(t)) return 'err';
        if (/attention|veuillez|obligatoire|aucun|aucune|déjà|dépass|sélectionnez|choisissez|renseignez|saisissez/.test(t)) return 'warn';
        if (/succès|enregistr|ajouté|modifié|supprimé|import|export|sauvegard|restaur|validé|mis à jour|effectué|terminé/.test(t)) return 'ok';
        return 'info';
    }
    var ICON_KIND = { ok: 'check-lg', err: 'x-lg', warn: 'exclamation-lg', info: 'info-lg' };
    window.uiToast = function (msg, kind) {
        msg = stripEmoji(String(msg == null ? '' : msg)).trim();
        kind = kind || kindOf(msg);
        var show = function () {
            var stack = toastStack(); if (!stack) return;
            var el = document.createElement('div'); el.className = 'app-toast ' + kind;
            var life = Math.min(9000, 3500 + msg.length * 45);
            el.style.setProperty('--life', life + 'ms');
            var ic = document.createElement('i'); ic.className = 'bi bi-' + ICON_KIND[kind];
            var tx = document.createElement('div'); tx.textContent = msg;
            var cl = document.createElement('button'); cl.className = 't-close'; cl.setAttribute('aria-label', 'Fermer'); cl.innerHTML = '<i class="bi bi-x-lg"></i>';
            cl.onclick = function () { el.remove(); };
            el.appendChild(ic); el.appendChild(tx); el.appendChild(cl); stack.appendChild(el);
            setTimeout(function () { el.style.transition = 'opacity .25s, transform .25s'; el.style.opacity = '0'; el.style.transform = 'translateY(6px)'; setTimeout(function () { el.remove(); }, 260); }, life);
        };
        if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
    };
    var nativeAlert = window.alert.bind(window), nativeConfirm = window.confirm.bind(window), nativePrompt = window.prompt.bind(window);
    window.alert = function (msg) { if (!document.body) { nativeAlert(stripEmoji(String(msg))); return; } window.uiToast(msg); };
    window.confirm = function (msg) { return nativeConfirm(stripEmoji(String(msg))); };
    window.prompt = function (msg, def) { return nativePrompt(stripEmoji(String(msg)), def); };

    // ---------------------------------------------------------------
    // 4. Coquille d'application
    // ---------------------------------------------------------------
    var PAGE = (location.pathname.split('/').pop() || 'portail.html').toLowerCase();
    var GROUPS = {
        'app.html':          [['Pilotage', 'dashboard,reports,historique'], ['Caisse & élèves', 'transactions,students,tarifs,impayes,reductions,echeancier,budget'], ['Personnel', 'salaires,enseignants,vacations']],
        'scolarite.html':    [['Pilotage', 'dashboard,reporting'], ['Élèves', 'eleves,inscriptions,dossiers,preinscription,classes'], ['Documents', 'certificats,cartes,examens'], ['Vie de l\'établissement', 'plan,conseils,heures'], ['Données', 'donnees']],
        'etudes.html':       [['Pilotage', 'dashboard,reporting'], ['Pédagogie', 'matieres,enseignants,edt,cahier'], ['Évaluations', 'notes,bulletins,examens,passage,archives'], ['Personnel', 'assiduite,heures']],
        'surveillance.html': [['Pilotage', 'dashboard,reporting'], ['Vie scolaire', 'appel,retards,permissions'], ['Discipline', 'sanctions,convocations'], ['Personnel', 'heures']],
        'secretariat.html':  [['Pilotage', 'dashboard'], ['Courrier & documents', 'courrier,documents,notes'], ['Communication', 'communication']],
        'direction.html':    [['Pilotage', 'dashboard,recouvrement'], ['Gouvernance', 'decisions,conseil'], ['Ressources', 'personnel'], ['Système', 'sauvegarde']]
    };
    var MODULES = [
        { url: 'direction.html',    name: 'Direction générale',           icon: 'bi-building' },
        { url: 'etudes.html',       name: 'Direction des études',         icon: 'bi-book' },
        { url: 'scolarite.html',    name: 'Direction de la scolarité',    icon: 'bi-person-vcard' },
        { url: 'app.html',          name: 'Gestion financière',           icon: 'bi-cash-coin' },
        { url: 'surveillance.html', name: 'Surveillance et discipline',   icon: 'bi-shield-check' },
        { url: 'secretariat.html',  name: 'Secrétariat',                  icon: 'bi-folder' },
        { url: 'calendrier.html',   name: 'Calendrier scolaire',          icon: 'bi-calendar-event' },
        { url: 'consultation.html', name: 'Consultation parents / élèves', icon: 'bi-search' },
        { url: 'enseignant.html',   name: 'Espace enseignant',            icon: 'bi-person-workspace' }
    ];
    function session() { try { return JSON.parse(sessionStorage.getItem('portail_session')) || null; } catch (e) { return null; } }
    function allowedModules() {
        var cfg = null; try { cfg = JSON.parse(store('portail_config_v1')); } catch (e) {}
        var dirs = (cfg && cfg.directions && cfg.directions.length) ? cfg.directions : MODULES;
        var s = session(), role = s && typeof s === 'object' ? s.role : 'Administrateur';
        return dirs.filter(function (d) {
            if (!d.url || d.status === 'hidden') return false;
            if (!role || role === 'Administrateur' || role === '*') return true;
            return d.name === role || d.url.toLowerCase() === 'consultation.html';
        }).map(function (d) {
            var m = MODULES.filter(function (x) { return x.url === (d.url || '').toLowerCase(); })[0];
            return { url: d.url, name: d.name, icon: d.icon || (m && m.icon) || 'bi-grid' };
        });
    }
    function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function initials(n) { n = (n || '').trim(); if (!n) return 'U'; var p = n.split(/\s+/); return ((p[0][0] || '') + (p[1] ? p[1][0] : (p[0][1] || ''))).toUpperCase(); }
    function schoolName() {
        try { var p = JSON.parse(store('ecole_params')) || {}; if (p.nom) return p.nom; } catch (e) {}
        return store('digigespro_ecole') || store('ecole_nom') || 'Établissement scolaire';
    }

    function buildShell() {
        var header = document.querySelector('.header, .portal-header');
        var sidebar = document.getElementById('sidebar');
        var title = header && header.querySelector('h1') ? header.querySelector('h1').textContent.trim() : document.title;
        var logoHtml = header && header.querySelector('.tb-logo') ? header.querySelector('.tb-logo').innerHTML : '<i class="bi bi-grid"></i>';

        if (sidebar && !sidebar.dataset.uiShell) {
            sidebar.dataset.uiShell = '1';
            document.body.classList.add('ui-shell');
            if (sidebar.classList.contains('collapsed')) document.body.classList.add('ui-collapsed');
            // suit le bouton « Réduire » d'origine
            new MutationObserver(function () { document.body.classList.toggle('ui-collapsed', sidebar.classList.contains('collapsed')); })
                .observe(sidebar, { attributes: true, attributeFilter: ['class'] });

            // marque
            var brand = el('div', 'sb-brand', '<div class="sb-logo">' + logoHtml + '</div><div class="sb-txt"><strong></strong><small></small></div>');
            brand.querySelector('strong').textContent = title;
            brand.querySelector('small').textContent = schoolName();
            var close = el('button', 'tb-icon-btn sb-close', '<i class="bi bi-x-lg"></i>'); close.type = 'button'; close.setAttribute('aria-label', 'Fermer le menu'); close.onclick = closeSidebar;
            brand.appendChild(close);
            sidebar.insertBefore(brand, sidebar.firstChild);

            // groupes
            var groups = GROUPS[PAGE];
            if (groups) {
                var toggle = sidebar.querySelector('.sidebar-toggle');
                var placed = {};
                groups.forEach(function (g) {
                    var lab = el('div', 'sb-group'); lab.textContent = g[0];
                    var anchorEl = toggle || null;
                    sidebar.insertBefore(lab, anchorEl);
                    g[1].split(',').forEach(function (id) {
                        var b = sidebar.querySelector('.tab[data-tab="' + id + '"]');
                        if (b && !placed[id]) { placed[id] = 1; sidebar.insertBefore(b, anchorEl); }
                    });
                });
                // onglets non classés : à la fin
                var rest = [].slice.call(sidebar.querySelectorAll('.tab')).filter(function (b) { return !placed[b.dataset.tab]; });
                if (rest.length) { var lab2 = el('div', 'sb-group'); lab2.textContent = 'Autres'; sidebar.insertBefore(lab2, toggle || null); rest.forEach(function (b) { sidebar.insertBefore(b, toggle || null); }); }
                if (toggle) sidebar.appendChild(toggle);
            }
            [].forEach.call(sidebar.querySelectorAll('.tab'), function (b) { var l = b.querySelector('.nav-label'); if (l && !b.title) b.title = l.textContent; });

            // utilisateur
            var s = session() || {};
            var who = (s && s.role) ? s.role : 'Administrateur';
            var foot = el('div', 'sb-foot', '<div class="sb-avatar"></div><div class="sb-who"><strong></strong><small></small></div>' +
                '<a href="portail.html" title="Portail d\'accueil" aria-label="Portail d\'accueil"><i class="bi bi-grid-3x3-gap"></i></a>' +
                '<a href="portail.html?logout=1" title="Changer de compte" aria-label="Changer de compte"><i class="bi bi-box-arrow-right"></i></a>');
            foot.querySelector('.sb-avatar').textContent = initials(s.nom && s.nom !== who ? s.nom : who);
            foot.querySelector('strong').textContent = s.nom && s.nom !== who ? s.nom : who;
            foot.querySelector('small').textContent = who === 'Administrateur' ? 'Accès complet' : who;
            sidebar.appendChild(foot);

            // fond pour le menu mobile
            var ov = el('div', 'sb-overlay'); ov.onclick = closeSidebar; document.body.appendChild(ov);
            sidebar.addEventListener('click', function (ev) { var t = ev.target.closest && ev.target.closest('.tab'); if (t && innerWidth <= 768) closeSidebar(); });

            // fil d'Ariane au-dessus du titre de section
            var mh = document.querySelector('.content-area .module-header');
            if (mh && !document.querySelector('.ui-crumbs')) {
                var cr = el('nav', 'ui-crumbs', '<a href="portail.html"><i class="bi bi-house-door" style="font-size:.8rem;opacity:1"></i> Portail</a><i class="bi bi-chevron-right"></i><span></span>');
                cr.setAttribute('aria-label', 'Fil d\'Ariane');
                cr.querySelector('span').textContent = title;
                mh.parentNode.insertBefore(cr, mh);
            }
        }

        if (header && !header.dataset.uiShell) {
            header.dataset.uiShell = '1';
            if (sidebar) {
                var mb = el('button', 'tb-icon-btn tb-menu', '<i class="bi bi-list"></i>'); mb.type = 'button'; mb.setAttribute('aria-label', 'Ouvrir le menu'); mb.onclick = openSidebar;
                header.insertBefore(mb, header.firstChild);
            }
            var actions = header.querySelector('.ms-auto') || header.lastElementChild;
            var srch = el('button', 'tb-search', '<i class="bi bi-search"></i><span class="ts-txt">Rechercher…</span><kbd>Ctrl K</kbd>');
            srch.type = 'button'; srch.setAttribute('aria-label', 'Recherche globale (Ctrl + K)'); srch.onclick = openPalette;
            var tb = el('button', 'tb-icon-btn', '<i data-theme-icon class="bi bi-moon-stars"></i>');
            tb.type = 'button'; tb.setAttribute('data-theme-toggle', ''); tb.setAttribute('aria-label', 'Mode clair / sombre'); tb.title = 'Mode clair / sombre'; tb.onclick = window.toggleTheme;
            if (actions && actions !== header.firstElementChild && actions.tagName !== 'BUTTON') {
                actions.insertBefore(tb, actions.lastElementChild);
                actions.insertBefore(srch, actions.firstChild);
            } else { header.appendChild(srch); header.appendChild(tb); }
        }
        applyTheme(root.getAttribute('data-bs-theme'));
    }
    function openSidebar() { var sb = document.getElementById('sidebar'); if (!sb) return; sb.classList.add('open'); var o = document.querySelector('.sb-overlay'); if (o) o.classList.add('show'); document.body.style.overflow = 'hidden'; }
    function closeSidebar() { var sb = document.getElementById('sidebar'); if (!sb) return; sb.classList.remove('open'); var o = document.querySelector('.sb-overlay'); if (o) o.classList.remove('show'); document.body.style.overflow = ''; }
    window.uiOpenSidebar = openSidebar; window.uiCloseSidebar = closeSidebar;

    // ---------------------------------------------------------------
    // 5. Recherche globale (Ctrl + K)
    // ---------------------------------------------------------------
    var pal = null;
    function paletteItems() {
        var items = [];
        [].forEach.call(document.querySelectorAll('#sidebar .tab[data-tab]'), function (b) {
            var lab = b.querySelector('.nav-label'), ic = b.querySelector('i');
            items.push({ g: 'Dans ce module', label: lab ? lab.textContent.trim() : b.textContent.trim(), icon: ic ? ic.className.replace(/\s*emo-i/, '') : 'bi bi-dot', run: function () { b.click(); } });
        });
        allowedModules().forEach(function (m) {
            if (m.url.toLowerCase() === PAGE) return;
            items.push({ g: 'Modules', label: m.name, icon: 'bi ' + m.icon, hint: 'Ouvrir', run: function () { location.href = m.url; } });
        });
        items.push({ g: 'Actions', label: 'Portail d\'accueil', icon: 'bi bi-grid-3x3-gap', run: function () { location.href = 'portail.html'; } });
        items.push({ g: 'Actions', label: root.getAttribute('data-bs-theme') === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre', icon: 'bi bi-circle-half', run: window.toggleTheme });
        ACCENTS.forEach(function (a) { items.push({ g: 'Couleur de l\'interface', label: 'Couleur ' + a.nom, swatch: a, run: function () { window.uiSetAccent(a.id); } }); });
        if (session()) items.push({ g: 'Actions', label: 'Changer de compte', icon: 'bi bi-box-arrow-right', run: function () { location.href = 'portail.html?logout=1'; } });
        return items;
    }
    function openPalette() {
        if (pal) return;
        var items = paletteItems(), sel = 0, shown = [];
        pal = el('div', 'cmdk-overlay');
        pal.innerHTML = '<div class="cmdk" role="dialog" aria-modal="true" aria-label="Recherche globale">' +
            '<div class="cmdk-input"><i class="bi bi-search"></i><input type="text" placeholder="Rechercher une section, un module, une action…" aria-label="Rechercher"><kbd>Échap</kbd></div>' +
            '<div class="cmdk-list" role="listbox"></div>' +
            '<div class="cmdk-foot"><span><kbd>↑</kbd><kbd>↓</kbd>naviguer</span><span><kbd>Entrée</kbd>ouvrir</span><span><kbd>Ctrl K</kbd>ouvrir / fermer</span></div></div>';
        document.body.appendChild(pal);
        var input = pal.querySelector('input'), list = pal.querySelector('.cmdk-list');
        function render() {
            var q = norm(input.value);
            shown = items.filter(function (it) { return !q || norm(it.label + ' ' + it.g).indexOf(q) !== -1; });
            if (sel >= shown.length) sel = Math.max(0, shown.length - 1);
            if (!shown.length) { list.innerHTML = '<div class="cmdk-empty">Aucun résultat pour « ' + esc(input.value) + ' »</div>'; return; }
            var html = '', g = null;
            shown.forEach(function (it, i) {
                if (it.g !== g) { g = it.g; html += '<div class="cmdk-group">' + esc(g) + '</div>'; }
                var ico = it.swatch ? '<span class="ci"><span class="sw" style="background:linear-gradient(135deg,' + it.swatch.c + ',' + it.swatch.c2 + ')"></span></span>' : '<span class="ci"><i class="' + esc(it.icon) + '"></i></span>';
                html += '<div class="cmdk-item' + (i === sel ? ' on' : '') + '" role="option" data-i="' + i + '">' + ico + '<span>' + esc(it.label) + '</span>' + (it.hint ? '<small>' + esc(it.hint) + '</small>' : '') + '</div>';
            });
            list.innerHTML = html;
            var on = list.querySelector('.on'); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest' });
        }
        function run(i) { var it = shown[i]; if (!it) return; closePalette(); setTimeout(it.run, 10); }
        input.addEventListener('input', function () { sel = 0; render(); });
        input.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown') { sel = Math.min(shown.length - 1, sel + 1); render(); e.preventDefault(); }
            else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); render(); e.preventDefault(); }
            else if (e.key === 'Enter') { run(sel); e.preventDefault(); }
        });
        list.addEventListener('mousemove', function (e) { var t = e.target.closest('.cmdk-item'); if (t && +t.dataset.i !== sel) { sel = +t.dataset.i; render(); } });
        list.addEventListener('click', function (e) { var t = e.target.closest('.cmdk-item'); if (t) run(+t.dataset.i); });
        pal.addEventListener('mousedown', function (e) { if (e.target === pal) closePalette(); });
        render(); input.focus();
    }
    function closePalette() { if (pal) { pal.remove(); pal = null; } }
    window.uiOpenPalette = openPalette;
    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); if (pal) closePalette(); else openPalette(); }
        else if (e.key === 'Escape') { if (pal) closePalette(); else closeSidebar(); }
    });

    // ---------------------------------------------------------------
    // Démarrage
    // ---------------------------------------------------------------
    function start() {
        buildShell();
        processTree(document.body);
        if (window.MutationObserver) {
            new MutationObserver(function (muts) {
                for (var i = 0; i < muts.length; i++) {
                    var m = muts[i];
                    if (m.type === 'characterData') processTextNode(m.target);
                    else for (var j = 0; j < m.addedNodes.length; j++) {
                        var nd = m.addedNodes[j];
                        processTree(nd);
                        // texte remplacé dans une cellule déjà traitée : on la réévalue
                        if (nd.nodeType === 3 && nd.parentNode && nd.parentNode.nodeName === 'TD') { delete nd.parentNode.dataset.uiDone; enhanceCells(nd.parentNode); }
                    }
                }
            }).observe(document.body, { childList: true, subtree: true, characterData: true });
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
