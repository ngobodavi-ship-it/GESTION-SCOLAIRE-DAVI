// ===== Identité de l'établissement (partagé par toutes les pages) =====
function etabEsc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function getEtab() {
    let p = {};
    try { p = JSON.parse(localStorage.getItem('ecole_params')) || {}; } catch (e) { }
    if (!p.nom) p.nom = localStorage.getItem('digigespro_ecole') || localStorage.getItem('ecole_nom') || 'Établissement scolaire';
    return p;
}
function etabVille() { const e = getEtab(); return e.ville || ''; }

// En-tête HTML standard pour les documents imprimés (logo + RÉPUBLIQUE DU CONGO + école + coordonnées + titre)
function etabEnteteHTML(titre, soustitre) {
    const e = getEtab();
    const logo = e.logo ? `<img src="${e.logo}" alt="" style="height:62px;width:auto;object-fit:contain;margin-bottom:6px;">` : '';
    const coord = [e.bp ? ('BP ' + etabEsc(e.bp)) : '', e.telephone ? ('Tél : ' + etabEsc(e.telephone)) : '', e.email ? etabEsc(e.email) : ''].filter(Boolean).join(' · ');
    const villeCoord = [e.ville ? etabEsc(e.ville) : '', coord].filter(Boolean).join(' — ');
    return `<div style="text-align:center;border-bottom:2px solid #333;padding-bottom:.6rem;margin-bottom:1rem;">
        ${logo}
        <p style="margin:0;font-size:.8rem;">RÉPUBLIQUE DU CONGO — Unité · Travail · Progrès</p>
        <h2 style="margin:.3rem 0 0;text-transform:uppercase;">${etabEsc(e.nom)}</h2>
        ${villeCoord ? `<p style="margin:.15rem 0 0;font-size:.72rem;color:#444;">${villeCoord}</p>` : ''}
        ${titre ? `<h3 style="margin:.5rem 0 0;">${etabEsc(titre)}</h3>` : ''}
        ${soustitre ? `<p style="margin:.2rem 0 0;font-size:.85rem;">${etabEsc(soustitre)}</p>` : ''}
    </div>`;
}

// "Fait à [ville], le [date]"
function etabFaitA() {
    const v = etabVille();
    return 'Fait à ' + (v ? etabEsc(v) : '.......................') + ', le ' + new Date().toLocaleDateString('fr-FR');
}
// Nom du signataire (chef d'établissement)
function etabSignataire() { const e = getEtab(); return e.directeur ? etabEsc(e.directeur) : "Le Chef d'établissement"; }

// ===== Formulaire de réglages (utilisé dans le portail) =====
let etabLogoTemp = undefined; // undefined = inchangé ; '' = retiré ; data = nouveau
function chargerLogoEtab(event) {
    const f = event.target.files && event.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = ev => {
        const img = new Image();
        img.onload = () => {
            const max = 240; let w = img.width, h = img.height;
            if (w > max || h > max) { const r = Math.min(max / w, max / h); w = Math.round(w * r); h = Math.round(h * r); }
            const c = document.createElement('canvas'); c.width = w; c.height = h;
            c.getContext('2d').drawImage(img, 0, 0, w, h);
            etabLogoTemp = c.toDataURL('image/png');
            const prev = document.getElementById('etabLogoPreview');
            if (prev) { prev.src = etabLogoTemp; prev.style.display = 'inline-block'; }
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(f);
}
function retirerLogoEtab() {
    etabLogoTemp = '';
    const prev = document.getElementById('etabLogoPreview');
    if (prev) { prev.src = ''; prev.style.display = 'none'; }
}
function loadEtablissementForm() {
    const e = getEtab();
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
    set('etabNom', e.nom); set('etabVille', e.ville); set('etabBP', e.bp);
    set('etabTel', e.telephone); set('etabEmail', e.email); set('etabDirecteur', e.directeur);
    const prev = document.getElementById('etabLogoPreview');
    if (prev) { if (e.logo) { prev.src = e.logo; prev.style.display = 'inline-block'; } else { prev.src = ''; prev.style.display = 'none'; } }
    etabLogoTemp = undefined;
}
function saveEtablissement() {
    let p = {}; try { p = JSON.parse(localStorage.getItem('ecole_params')) || {}; } catch (e) { }
    const val = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
    p.nom = val('etabNom'); p.ville = val('etabVille'); p.bp = val('etabBP');
    p.telephone = val('etabTel'); p.email = val('etabEmail'); p.directeur = val('etabDirecteur');
    if (etabLogoTemp !== undefined) { if (etabLogoTemp === '') delete p.logo; else p.logo = etabLogoTemp; }
    localStorage.setItem('ecole_params', JSON.stringify(p));
    // Synchroniser le nom avec les clés existantes pour la compatibilité
    if (p.nom) { localStorage.setItem('ecole_nom', p.nom); localStorage.setItem('digigespro_ecole', p.nom); }
    etabLogoTemp = undefined;
    if (typeof alert === 'function') alert('Identité de l\'établissement enregistrée. Elle apparaîtra sur les documents imprimés.');
}
