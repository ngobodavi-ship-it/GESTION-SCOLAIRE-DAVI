// =====================================================================
// Design system — comportements communs à toutes les pages
//  • mode clair / sombre (réglage mémorisé sur l'appareil)
//  • menu latéral coulissant sur téléphone
//  • remplacement des emojis par des icônes cohérentes
//  • notifications élégantes à la place des fenêtres « alert »
// Ce fichier ne touche ni aux données ni aux calculs de l'application.
// =====================================================================
(function () {
    'use strict';

    // ---------- 1. Thème (appliqué avant l'affichage pour éviter un flash) ----------
    var THEME_KEY = 'ui_theme';
    function preferredTheme() {
        var saved = null;
        try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
        if (saved === 'light' || saved === 'dark') return saved;
        return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }
    function applyTheme(t) {
        document.documentElement.setAttribute('data-bs-theme', t);
        document.querySelectorAll('[data-theme-icon]').forEach(function (i) {
            i.className = t === 'dark' ? 'bi bi-sun' : 'bi bi-moon-stars';
        });
        try { window.dispatchEvent(new CustomEvent('themechange', { detail: t })); } catch (e) {}
    }
    applyTheme(preferredTheme());
    window.toggleTheme = function () {
        var t = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
        try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
        applyTheme(t);
    };
    if (window.matchMedia) {
        var mq = window.matchMedia('(prefers-color-scheme: dark)');
        var onChange = function () {
            var saved = null; try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
            if (!saved) applyTheme(mq.matches ? 'dark' : 'light');
        };
        if (mq.addEventListener) mq.addEventListener('change', onChange);
    }

    // ---------- 2. Emojis → icônes ----------
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
    // Caractères typographiques gardés tels quels (coches, croix simples)
    var KEEP = { '✓': 1, '✔': 1, '✗': 1, '✖': 1, '✕': 1, '☐': 1, '☑': 1, '★': 1, '☆': 1, '♂': 1, '♀': 1 };
    function iconFor(e) {
        var k = e.replace(/️/g, '');
        return ICONS[k] || null;
    }
    function stripEmoji(str) {
        if (typeof str !== 'string') return str;
        return str.replace(EMOJI_RX, function (m) { return KEEP[m.replace(/️/g, '')] ? m : ''; }).replace(/^\s+/, '').replace(/ {2,}/g, ' ');
    }
    window.stripEmoji = stripEmoji;

    var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, CODE: 1, PRE: 1, TITLE: 1, NOSCRIPT: 1 };
    var PLAIN_TAGS = { OPTION: 1, OPTGROUP: 1, SELECT: 1 };
    function processTextNode(node) {
        var txt = node.nodeValue;
        if (!txt || !EMOJI_RX.test(txt)) { EMOJI_RX.lastIndex = 0; return; }
        EMOJI_RX.lastIndex = 0;
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
            var ic = iconFor(m[0]);
            if (ic) {
                var i = document.createElement('i');
                i.className = 'bi bi-' + ic + ' emo-i';
                i.setAttribute('aria-hidden', 'true');
                frag.appendChild(i);
            }
            last = m.index + m[0].length;
            // supprime l'espace qui suivait l'emoji quand l'icône est retirée
            if (!ic && txt.charAt(last) === ' ') last++;
        }
        if (!changed) return;
        if (last < txt.length) frag.appendChild(document.createTextNode(txt.slice(last)));
        parent.replaceChild(frag, node);
    }
    function processTree(root) {
        if (!root) return;
        if (root.nodeType === 3) { processTextNode(root); return; }
        if (root.nodeType !== 1 || SKIP_TAGS[root.nodeName]) return;
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), list = [], n;
        while ((n = walker.nextNode())) list.push(n);
        list.forEach(processTextNode);
        // attributs lisibles (infobulles, textes indicatifs)
        if (root.querySelectorAll) {
            var els = root.querySelectorAll('[title],[placeholder]');
            for (var k = 0; k < els.length; k++) {
                ['title', 'placeholder'].forEach(function (a) {
                    var v = els[k].getAttribute(a);
                    if (v && EMOJI_RX.test(v)) { EMOJI_RX.lastIndex = 0; els[k].setAttribute(a, stripEmoji(v)); }
                    EMOJI_RX.lastIndex = 0;
                });
            }
        }
    }
    window.uiProcessIcons = processTree;

    // ---------- 3. Notifications ----------
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
    var ICON_KIND = { ok: 'check-circle-fill', err: 'x-circle-fill', warn: 'exclamation-triangle-fill', info: 'info-circle-fill' };
    window.uiToast = function (msg, kind) {
        msg = stripEmoji(String(msg == null ? '' : msg)).trim();
        kind = kind || kindOf(msg);
        var show = function () {
            var stack = toastStack(); if (!stack) return;
            var el = document.createElement('div');
            el.className = 'app-toast ' + kind;
            var ic = document.createElement('i'); ic.className = 'bi bi-' + ICON_KIND[kind];
            var tx = document.createElement('div'); tx.textContent = msg;
            var cl = document.createElement('button'); cl.className = 't-close'; cl.setAttribute('aria-label', 'Fermer'); cl.innerHTML = '<i class="bi bi-x-lg"></i>';
            cl.onclick = function () { el.remove(); };
            el.appendChild(ic); el.appendChild(tx); el.appendChild(cl);
            stack.appendChild(el);
            var life = Math.min(9000, 3500 + msg.length * 45);
            setTimeout(function () { el.style.transition = 'opacity .25s'; el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 260); }, life);
        };
        if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
    };
    // Les « alert » deviennent des notifications ; « confirm » et « prompt » restent
    // des fenêtres bloquantes (la logique en dépend) mais sans emojis.
    var nativeAlert = window.alert.bind(window), nativeConfirm = window.confirm.bind(window), nativePrompt = window.prompt.bind(window);
    window.alert = function (msg) {
        // juste avant une redirection, la notification n'aurait pas le temps d'être lue
        if (!document.body) { nativeAlert(stripEmoji(String(msg))); return; }
        window.uiToast(msg);
    };
    window.confirm = function (msg) { return nativeConfirm(stripEmoji(String(msg))); };
    window.prompt = function (msg, def) { return nativePrompt(stripEmoji(String(msg)), def); };

    // ---------- 4. En-tête et menu mobile ----------
    function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; }
    function enhanceChrome() {
        var header = document.querySelector('.header, .portal-header');
        var sidebar = document.getElementById('sidebar');

        // bouton menu (téléphone)
        if (header && sidebar && !header.querySelector('.tb-menu')) {
            var mb = el('button', 'tb-icon-btn tb-menu', '<i class="bi bi-list"></i>');
            mb.type = 'button'; mb.setAttribute('aria-label', 'Ouvrir le menu');
            mb.onclick = openSidebar;
            header.insertBefore(mb, header.firstChild);
            var ov = el('div', 'sb-overlay'); ov.onclick = closeSidebar; document.body.appendChild(ov);
            var titleTxt = (header.querySelector('h1') || {}).textContent || 'Menu';
            var st = el('div', 'sb-title', '<span class="tb-logo" style="width:30px;height:30px;font-size:.9rem !important;">' +
                ((header.querySelector('.tb-logo') || {}).innerHTML || '<i class="bi bi-grid"></i>') + '</span><strong></strong>');
            st.querySelector('strong').textContent = titleTxt;
            var cb = el('button', 'tb-icon-btn', '<i class="bi bi-x-lg"></i>'); cb.type = 'button'; cb.setAttribute('aria-label', 'Fermer le menu'); cb.onclick = closeSidebar;
            st.appendChild(cb);
            sidebar.insertBefore(st, sidebar.firstChild);
            sidebar.addEventListener('click', function (ev) {
                var t = ev.target.closest && ev.target.closest('.tab');
                if (t && window.innerWidth <= 768) closeSidebar();
            });
        }
        // bouton mode sombre
        var actions = header && (header.querySelector('.ms-auto') || header.lastElementChild);
        if (header && actions && !header.querySelector('[data-theme-toggle]')) {
            var tb = el('button', 'tb-icon-btn', '<i data-theme-icon class="bi bi-moon-stars"></i>');
            tb.type = 'button'; tb.setAttribute('data-theme-toggle', ''); tb.setAttribute('aria-label', 'Changer de thème (clair / sombre)'); tb.title = 'Mode clair / sombre';
            tb.onclick = window.toggleTheme;
            if (actions === header.lastElementChild && actions.tagName === 'BUTTON') header.insertBefore(tb, actions);
            else actions.insertBefore(tb, actions.lastElementChild);
        }
        applyTheme(document.documentElement.getAttribute('data-bs-theme'));
    }
    function openSidebar() {
        var sb = document.getElementById('sidebar'); if (!sb) return;
        sb.classList.add('open'); var ov = document.querySelector('.sb-overlay'); if (ov) ov.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
    function closeSidebar() {
        var sb = document.getElementById('sidebar'); if (!sb) return;
        sb.classList.remove('open'); var ov = document.querySelector('.sb-overlay'); if (ov) ov.classList.remove('show');
        document.body.style.overflow = '';
    }
    window.uiOpenSidebar = openSidebar; window.uiCloseSidebar = closeSidebar;
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSidebar(); });

    // ---------- 5. Démarrage ----------
    function start() {
        enhanceChrome();
        processTree(document.body);
        if (window.MutationObserver) {
            var obs = new MutationObserver(function (muts) {
                for (var i = 0; i < muts.length; i++) {
                    var m = muts[i];
                    if (m.type === 'characterData') processTextNode(m.target);
                    else for (var j = 0; j < m.addedNodes.length; j++) processTree(m.addedNodes[j]);
                }
            });
            obs.observe(document.body, { childList: true, subtree: true, characterData: true });
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
