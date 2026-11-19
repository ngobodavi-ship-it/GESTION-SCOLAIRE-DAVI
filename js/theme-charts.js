// =====================================================================
// Design system — réglages communs des graphiques (Chart.js)
// À charger juste après vendor/chartjs/chart.umd.min.js
//  • police, couleurs des axes et des légendes alignées sur le thème
//  • graphique vide : message « Aucune donnée » au lieu d'axes 1, 1, 1
// =====================================================================
(function () {
    'use strict';
    if (typeof window.Chart === 'undefined') return;
    var Chart = window.Chart;

    function cssVar(name, fallback) {
        var v = getComputedStyle(document.documentElement).getPropertyValue(name);
        return (v && v.trim()) || fallback;
    }
    function applyDefaults() {
        Chart.defaults.font.family = 'Inter, "Segoe UI", system-ui, sans-serif';
        Chart.defaults.font.size = 12;
        Chart.defaults.color = cssVar('--muted', '#64748B');
        Chart.defaults.borderColor = cssVar('--line', '#E2E8F0');
        Chart.defaults.plugins.legend.labels.usePointStyle = true;
        Chart.defaults.plugins.legend.labels.pointStyle = 'circle';
        Chart.defaults.plugins.legend.labels.boxWidth = 8;
        Chart.defaults.plugins.legend.labels.boxHeight = 8;
        Chart.defaults.plugins.legend.labels.padding = 14;
        var tt = Chart.defaults.plugins.tooltip;
        tt.backgroundColor = '#0F172A'; tt.titleColor = '#fff'; tt.bodyColor = '#E2E8F0';
        tt.padding = 10; tt.cornerRadius = 8; tt.boxPadding = 4; tt.usePointStyle = true;
        tt.titleFont = { weight: '600' };
        Chart.defaults.elements.bar.borderRadius = 6;
        Chart.defaults.elements.bar.borderSkipped = false;
        Chart.defaults.elements.line.tension = 0.35;
        Chart.defaults.elements.line.borderWidth = 2;
        Chart.defaults.elements.point.radius = 0;
        Chart.defaults.elements.point.hoverRadius = 5;
        Chart.defaults.elements.arc.borderWidth = 2;
        Chart.defaults.elements.arc.borderColor = cssVar('--surface', '#fff');
    }
    applyDefaults();

    function isEmpty(chart) {
        var ds = (chart.data && chart.data.datasets) || [];
        if (!ds.length) return true;
        for (var i = 0; i < ds.length; i++) {
            var d = ds[i].data || [];
            for (var j = 0; j < d.length; j++) {
                var v = d[j];
                if (v && typeof v === 'object') v = (v.y != null ? v.y : v.x);
                if (typeof v === 'number' && isFinite(v) && v !== 0) return false;
                if (typeof v === 'string' && parseFloat(v)) return false;
            }
        }
        return true;
    }

    Chart.register({
        id: 'uiEmptyState',
        beforeUpdate: function (chart) {
            var empty = isEmpty(chart);
            chart.$uiEmpty = empty;
            var sc = chart.options.scales || {};
            Object.keys(sc).forEach(function (k) {
                var s = sc[k]; if (!s) return;
                if (empty) { if (s.$uiDisplay === undefined) s.$uiDisplay = s.display; s.display = false; }
                else if (s.$uiDisplay !== undefined) { s.display = s.$uiDisplay; delete s.$uiDisplay; }
            });
            var lg = chart.options.plugins && chart.options.plugins.legend;
            if (lg) {
                if (empty) { if (lg.$uiDisplay === undefined) lg.$uiDisplay = lg.display; lg.display = false; }
                else if (lg.$uiDisplay !== undefined) { lg.display = lg.$uiDisplay; delete lg.$uiDisplay; }
            }
        },
        afterDraw: function (chart) {
            if (!chart.$uiEmpty) return;
            var ctx = chart.ctx, a = chart.chartArea || { left: 0, top: 0, right: chart.width, bottom: chart.height };
            var cx = (a.left + a.right) / 2, cy = (a.top + a.bottom) / 2;
            ctx.save();
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = cssVar('--surface-3', '#F1F5F9');
            ctx.beginPath(); ctx.arc(cx, cy - 18, 18, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = cssVar('--muted-2', '#94A3B8'); ctx.lineWidth = 1.6; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(cx - 8, cy - 12); ctx.lineTo(cx - 8, cy - 18);
            ctx.moveTo(cx, cy - 12); ctx.lineTo(cx, cy - 25); ctx.moveTo(cx + 8, cy - 12); ctx.lineTo(cx + 8, cy - 21); ctx.stroke();
            ctx.fillStyle = cssVar('--ink-2', '#334155');
            ctx.font = '600 13px Inter, "Segoe UI", sans-serif';
            ctx.fillText('Aucune donnée pour le moment', cx, cy + 14);
            ctx.fillStyle = cssVar('--muted', '#64748B');
            ctx.font = '12px Inter, "Segoe UI", sans-serif';
            ctx.fillText('Le graphique se remplira avec les premières saisies', cx, cy + 32);
            ctx.restore();
        }
    });

    // Mise à jour des couleurs quand on change de thème
    window.addEventListener('themechange', function () {
        applyDefaults();
        var inst = Chart.instances || {};
        Object.keys(inst).forEach(function (k) {
            var c = inst[k]; if (!c) return;
            var sc = c.options.scales || {};
            Object.keys(sc).forEach(function (n) {
                var s = sc[n]; if (!s) return;
                if (s.ticks) s.ticks.color = Chart.defaults.color;
                if (s.grid) s.grid.color = Chart.defaults.borderColor;
            });
            if (c.options.plugins && c.options.plugins.legend && c.options.plugins.legend.labels) c.options.plugins.legend.labels.color = Chart.defaults.color;
            c.update('none');
        });
    });
})();
