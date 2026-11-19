// ===== Contrôle d'accès par rôle (à inclure dans chaque module) =====
(function () {
    var page = (window.location.pathname.split('/').pop() || '').toLowerCase();
    var raw = sessionStorage.getItem('portail_session');
    if (!raw) { window.location.replace('portail.html'); return; }
    var sess;
    try { sess = JSON.parse(raw); } catch (e) { sess = null; }
    // Ancienne session ('1') ou format inattendu : accès complet (compatibilité)
    if (typeof sess !== 'object' || sess === null) return;
    var role = sess.role || '';

    // Profil Parent : uniquement son espace
    if (role === 'Parent') {
        if (page !== 'parent.html') window.location.replace('portail.html?refus=' + encodeURIComponent(page));
        return;
    }
    // L'espace parent est réservé aux parents
    if (page === 'parent.html') { window.location.replace('portail.html'); return; }

    if (role === 'Administrateur' || role === '*') return; // accès complet
    if (!page || page === 'portail.html' || page === 'consultation.html') return; // recherche élève & famille : tout le personnel

    var allowed = [];
    try {
        var cfg = JSON.parse(localStorage.getItem('portail_config_v1')) || {};
        (cfg.directions || []).forEach(function (d) {
            if (d.name === role && d.url) allowed.push(d.url.toLowerCase());
        });
    } catch (e) {}

    if (allowed.indexOf(page) === -1) {
        // Le portail affiche un message clair avec un bouton « Changer de compte »
        window.location.replace('portail.html?refus=' + encodeURIComponent(page));
    }
})();
