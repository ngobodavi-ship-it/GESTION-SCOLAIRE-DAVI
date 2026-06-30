// ===== Contrôle d'accès par rôle (à inclure dans chaque module) =====
(function () {
    var raw = sessionStorage.getItem('portail_session');
    if (!raw) { window.location.replace('portail.html'); return; }
    var sess;
    try { sess = JSON.parse(raw); } catch (e) { sess = null; }
    // Ancienne session ('1') ou format inattendu : accès complet (compatibilité)
    if (typeof sess !== 'object' || sess === null) return;
    var role = sess.role || '';
    if (role === 'Administrateur' || role === '*') return; // accès complet

    var page = (window.location.pathname.split('/').pop() || '').toLowerCase();
    if (!page || page === 'portail.html' || page === 'consultation.html') return; // consultation autorisée à tous

    var allowed = [];
    try {
        var cfg = JSON.parse(localStorage.getItem('portail_config_v1')) || {};
        (cfg.directions || []).forEach(function (d) {
            if (d.name === role && d.url) allowed.push(d.url.toLowerCase());
        });
    } catch (e) {}

    if (allowed.indexOf(page) === -1) {
        alert("Accès non autorisé pour votre profil (« " + role + " »). Vous allez être redirigé vers le portail.");
        window.location.replace('portail.html');
    }
})();
