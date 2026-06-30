// ===== Sélecteur de date de l'en-tête (partagé par tous les modules) =====
(function () {
    function init() {
        var inp = document.getElementById('headerDate');
        if (inp && !inp.value) inp.value = new Date().toISOString().split('T')[0];
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
    // Appelé quand l'utilisateur change la date ; chaque module peut définir applyHeaderDate.
    window.onHeaderDate = function (val) {
        window.refDate = val;
        if (typeof window.applyHeaderDate === 'function') window.applyHeaderDate(val);
    };
})();
