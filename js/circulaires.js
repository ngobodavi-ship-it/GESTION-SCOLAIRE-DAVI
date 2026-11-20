// ===== Notes & circulaires : publication par les services, lecture par les enseignants =====
// Données : localStorage 'ecole_circulaires'
//   { id, numero, type, service, auteur, date, objet, contenu,
//     cible: { mode: 'tous'|'personnel'|'niveau'|'classe'|'enseignant', valeur },
//     lectures: { <idEnseignant>: { le, nom } } }
// Côté administration : le script s'installe seul (onglet + section) quand la balise porte
//   data-service="Direction des études" (par exemple).
(function () {
    const CLE = 'ecole_circulaires';
    const TYPES = ['Note de service', 'Circulaire', "Note d'information", 'Communiqué', 'Convocation'];
    const NIVEAUX = ['Préscolaire', 'Primaire', 'Collège', 'Lycée'];
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const lire = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } };
    const toast = (m, k) => (window.uiToast ? window.uiToast(m, k) : alert(m));
    const aujourdhui = () => new Date().toISOString().slice(0, 10);
    const fr = d => d ? new Date(d).toLocaleDateString('fr-FR') : '';

    function liste() { return lire(CLE, []); }
    function sauver(arr) { localStorage.setItem(CLE, JSON.stringify(arr)); }
    function enseignants() { return lire('ecole_enseignants', []); }
    function classesConnues() { return lire('ecole_classes', []).map(c => c.nom).filter(Boolean); }

    // Le niveau d'un enseignant correspond-il au niveau visé ?
    function niveauCorrespond(niv, vise) {
        if (!niv) return true;                       // enseignant sans niveau : il reçoit tout
        if (niv === 'Collège et Lycée') return vise === 'Collège' || vise === 'Lycée';
        return niv === vise;
    }
    const estPourParents = c => !!(c.cible && /^parents/.test(c.cible.mode));
    function concerne(c, e) {
        const m = c.cible ? c.cible.mode : 'tous', v = c.cible ? c.cible.valeur : '';
        if (m === 'tous' || m === 'personnel') return true;
        if (m === 'niveau') return niveauCorrespond(e.niveau || '', v);
        if (m === 'classe') return (e.classes || []).indexOf(v) >= 0;
        if (m === 'enseignant') return e.id === v;
        return false;
    }
    // ---- familles : un parent = un numéro de téléphone de tuteur (même règle que les comptes parents) ----
    function normTel(t) {
        let d = String(t || '').replace(/\D/g, '');
        if (d.length > 9 && d.indexOf('242') === 0) d = d.slice(3);
        if (d.length > 9 && d.indexOf('00242') === 0) d = d.slice(5);
        return d;
    }
    function familles() {
        const map = {};
        lire('ecole_eleves', []).forEach(e => {
            if (!e || !e.telephone) return;
            const key = normTel(e.telephone); if (key.length < 8) return;
            if (!map[key]) map[key] = { key, telephone: e.telephone, nom: (e.tuteur || '').trim(), enfants: [] };
            if (!map[key].nom && e.tuteur) map[key].nom = e.tuteur.trim();
            map[key].enfants.push(e);
        });
        return Object.values(map);
    }
    function concerneFamille(c, f) {
        const m = c.cible ? c.cible.mode : '', v = c.cible ? c.cible.valeur : '';
        if (m === 'parents_tous') return true;
        if (m === 'parents_classe') return f.enfants.some(e => e.classe === v);
        return false;
    }
    // Destinataires uniformisés : { id (clé des lectures), nom, info }
    function destinataires(c) {
        if (estPourParents(c)) return familles().filter(f => concerneFamille(c, f)).map(f => ({
            id: 'p:' + f.key, nom: f.nom || ('Parent ' + f.telephone),
            info: f.enfants.map(e => (e.prenom || '') + ' (' + (e.classe || '-') + ')').join(', ')
        }));
        return enseignants().filter(e => concerne(c, e)).map(e => ({ id: e.id, nom: (e.nom + ' ' + (e.prenom || '')).trim(), info: e.matiere || e.niveau || '' }));
    }
    function libelleCible(c) {
        const m = c.cible ? c.cible.mode : 'tous', v = c.cible ? c.cible.valeur : '';
        if (m === 'parents_tous') return 'Tous les parents';
        if (m === 'parents_classe') return 'Parents de la ' + v;
        if (m === 'tous') return 'Tous les enseignants';
        if (m === 'personnel') return 'Tout le personnel';
        if (m === 'niveau') return 'Enseignants du ' + v.toLowerCase().replace('préscolaire', 'préscolaire');
        if (m === 'classe') return 'Professeurs de la ' + v;
        if (m === 'enseignant') { const e = enseignants().find(x => x.id === v); return e ? (e.nom + ' ' + (e.prenom || '')) : 'Un enseignant'; }
        return '';
    }
    function auteurSession() {
        try { const s = JSON.parse(sessionStorage.getItem('portail_session')); if (s && (s.nom || s.role)) return s.nom || s.role; } catch (e) {}
        return '';
    }
    function nomEcole() {
        try { const p = JSON.parse(localStorage.getItem('ecole_params')); if (p && p.nom) return p.nom; } catch (e) {}
        try { const c = JSON.parse(localStorage.getItem('portail_config_v1')); if (c && c.subtitle) return c.subtitle; } catch (e) {}
        return 'Établissement scolaire';
    }

    function publier(d) {
        const arr = liste();
        const annee = (d.date || aujourdhui()).slice(0, 4);
        const seq = arr.filter(x => (x.date || '').slice(0, 4) === annee).length + 1;
        const c = {
            id: 'nc' + Date.now() + Math.random().toString(36).slice(2, 6),
            numero: 'NC-' + String(seq).padStart(3, '0') + '/' + annee,
            type: d.type || 'Note de service', service: d.service || '', auteur: d.auteur || auteurSession(),
            date: d.date || aujourdhui(), objet: d.objet, contenu: d.contenu,
            cible: d.cible || { mode: 'tous', valeur: '' }, lectures: {}
        };
        arr.push(c); sauver(arr); return c;
    }
    function supprimer(id) { sauver(liste().filter(c => c.id !== id)); }
    function marquerLu(id, ens) {
        const arr = liste(); const c = arr.find(x => x.id === id); if (!c) return;
        c.lectures = c.lectures || {};
        if (!c.lectures[ens.id]) c.lectures[ens.id] = { le: new Date().toISOString(), nom: (ens.nom + ' ' + (ens.prenom || '')).trim() };
        sauver(arr);
    }
    const recent = (a, b) => (b.date || '').localeCompare(a.date || '') || b.id.localeCompare(a.id);
    function pourEnseignant(e) { return liste().filter(c => !estPourParents(c) && concerne(c, e)).sort(recent); }
    function nonLues(e) { return pourEnseignant(e).filter(c => !(c.lectures && c.lectures[e.id])).length; }
    // côté parent : p = { key, nom, enfants } (registre des comptes parents)
    function pourParent(p) { return liste().filter(c => estPourParents(c) && concerneFamille(c, p)).sort(recent); }
    function nonLuesParent(p) { return pourParent(p).filter(c => !(c.lectures && c.lectures['p:' + p.key])).length; }
    function marquerLuParent(id, p) { marquerLu(id, { id: 'p:' + p.key, nom: p.nom || 'Parent' }); }

    function imprimer(id) {
        const c = liste().find(x => x.id === id); if (!c) return;
        const html = `<div style="font-family:Arial,sans-serif;max-width:780px;margin:0 auto;padding:2.5rem;color:#111;">
            <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:0.75rem;margin-bottom:1.5rem;">
              <p style="margin:0;font-size:0.85rem;">RÉPUBLIQUE DU CONGO &nbsp;–&nbsp; Unité, Travail, Progrès<br>Ministère de l'Enseignement Préscolaire, Primaire, Secondaire et de l'Alphabétisation</p>
              <h2 style="margin:0.4rem 0 0;text-transform:uppercase;">${esc(nomEcole())}</h2>
              <p style="margin:0.2rem 0 0;font-weight:bold;">${esc(c.service)}</p>
            </div>
            <p style="text-align:right;margin:0 0 1rem;">Le ${fr(c.date)}</p>
            <h1 style="text-align:center;font-size:1.3rem;letter-spacing:1px;margin:1rem 0 0.25rem;text-transform:uppercase;">${esc(c.type)}</h1>
            <p style="text-align:center;font-weight:bold;margin:0 0 1.5rem;">N° ${esc(c.numero)}</p>
            <p style="margin:0.4rem 0;"><strong>Objet :</strong> ${esc(c.objet)}</p>
            <p style="margin:0.4rem 0;"><strong>Destinataires :</strong> ${esc(libelleCible(c))}</p>
            <hr style="margin:1.25rem 0;">
            <div style="line-height:1.8;font-size:1.02rem;text-align:justify;white-space:pre-wrap;">${esc(c.contenu)}</div>
            <div style="margin-top:3rem;text-align:right;"><p style="margin:0;font-weight:bold;">${esc(c.service)}</p><div style="height:70px;"></div><p style="margin:0;color:#666;">(Signature et cachet)</p></div>
          </div>`;
        const w = window.open('', '_blank'); if (!w) { toast("Autorisez les fenêtres pour imprimer.", 'warning'); return; }
        w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${esc(c.type)} ${esc(c.numero)}</title></head><body>${html}</body></html>`);
        w.document.close(); setTimeout(() => w.print(), 400);
    }

    // ---------- Côté administration ----------
    let SERVICE = '';
    function optionsValeur(mode) {
        if (mode === 'niveau') return NIVEAUX.map(n => `<option>${n}</option>`).join('');
        if (mode === 'classe' || mode === 'parents_classe') { const cl = classesConnues(); return cl.length ? cl.map(n => `<option>${esc(n)}</option>`).join('') : '<option value="">Aucune classe</option>'; }
        if (mode === 'enseignant') {
            const e = enseignants().slice().sort((a, b) => (a.nom + a.prenom).localeCompare(b.nom + b.prenom));
            return e.length ? e.map(x => `<option value="${esc(x.id)}">${esc(x.nom)} ${esc(x.prenom || '')}${x.matiere ? ' (' + esc(x.matiere) + ')' : ''}</option>`).join('') : '<option value="">Aucun enseignant</option>';
        }
        return '';
    }
    function majValeur() {
        const mode = document.getElementById('ncMode').value, col = document.getElementById('ncValeurCol');
        col.style.display = (mode === 'tous' || mode === 'personnel' || mode === 'parents_tous') ? 'none' : '';
        document.getElementById('ncValeur').innerHTML = optionsValeur(mode);
        document.getElementById('ncValeurLbl').textContent = ({ niveau: 'Niveau', classe: 'Classe', enseignant: 'Enseignant', parents_classe: 'Classe des enfants' })[mode] || '';
        apercuDest();
    }
    function cibleForm() {
        const mode = document.getElementById('ncMode').value;
        return { mode, valeur: (mode === 'tous' || mode === 'personnel' || mode === 'parents_tous') ? '' : document.getElementById('ncValeur').value };
    }
    function apercuDest() {
        const c = { cible: cibleForm() }, n = destinataires(c).length, par = estPourParents(c);
        const qui = par ? `famille${n > 1 ? 's' : ''}` : `enseignant${n > 1 ? 's' : ''}`;
        document.getElementById('ncApercu').innerHTML = n
            ? `<i class="bi bi-people"></i> ${n} ${qui} recevr${n > 1 ? 'ont' : 'a'} ce document dans ${par ? "l'espace parent" : 'leur espace'}.`
            : (par ? `<i class="bi bi-exclamation-triangle"></i> Aucune famille ne correspond (il faut un numéro de téléphone du tuteur dans la fiche de l'élève).`
                   : `<i class="bi bi-exclamation-triangle"></i> Aucun enseignant ne correspond pour l'instant (vérifiez les enseignants dans la Direction des études).`);
    }
    function envoyer() {
        const objet = document.getElementById('ncObjet').value.trim(), contenu = document.getElementById('ncContenu').value.trim();
        if (!objet || !contenu) { toast("L'objet et le contenu sont obligatoires.", 'warning'); return; }
        const cible = cibleForm();
        if (['tous', 'personnel', 'parents_tous'].indexOf(cible.mode) < 0 && !cible.valeur) { toast('Choisissez le destinataire.', 'warning'); return; }
        const c = publier({ type: document.getElementById('ncType').value, service: SERVICE, date: document.getElementById('ncDate').value || aujourdhui(), objet, contenu, cible });
        ['ncObjet', 'ncContenu'].forEach(i => document.getElementById(i).value = '');
        toast(`${c.type} ${c.numero} envoyée à : ${libelleCible(c)}.`, 'success');
        rendreAdmin();
    }
    function detailLecture(id) {
        const c = liste().find(x => x.id === id); if (!c) return;
        const dest = destinataires(c), lu = c.lectures || {};
        const lignes = dest.map(e => {
            const l = lu[e.id];
            return `<tr><td style="font-weight:600;">${esc(e.nom)}</td><td>${esc(e.info)}</td>
              <td>${l ? `<span class="pill pill-success" style="background:#dcfce7;color:#166534;padding:0.15rem 0.55rem;border-radius:999px;font-size:0.8rem;font-weight:600;">Lu le ${new Date(l.le).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>` : '<span style="background:#fef3c7;color:#92400e;padding:0.15rem 0.55rem;border-radius:999px;font-size:0.8rem;font-weight:600;">Pas encore lu</span>'}</td></tr>`;
        }).join('');
        const box = document.getElementById('ncDetail');
        box.innerHTML = `<div class="card" style="border:1px solid var(--line,#e2e8f0);">
            <div style="display:flex;justify-content:space-between;gap:1rem;align-items:flex-start;flex-wrap:wrap;">
              <div><h3 style="font-size:1.05rem;font-weight:700;margin:0;">${esc(c.type)} ${esc(c.numero)} — ${esc(c.objet)}</h3>
              <p style="color:var(--muted,#64748b);margin:0.25rem 0 0;font-size:0.88rem;">${esc(libelleCible(c))} · publié par ${esc(c.service)}${c.auteur ? ' (' + esc(c.auteur) + ')' : ''} le ${fr(c.date)}</p></div>
              <button class="btn btn-secondary" onclick="Circulaires.fermerDetail()"><i class="bi bi-x-lg"></i> Fermer</button>
            </div>
            <div style="white-space:pre-wrap;line-height:1.6;margin:1rem 0;padding:0.9rem 1rem;border-radius:12px;background:var(--surface-2,#f8fafc);">${esc(c.contenu)}</div>
            <div style="overflow-x:auto;"><table><thead><tr><th>${estPourParents(c) ? 'Parent' : 'Enseignant'}</th><th>${estPourParents(c) ? 'Enfant(s)' : 'Matière / niveau'}</th><th>Lecture</th></tr></thead>
            <tbody>${lignes || '<tr><td colspan="3" style="text-align:center;color:var(--muted,#64748b);">Aucun destinataire.</td></tr>'}</tbody></table></div></div>`;
        box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function rendreAdmin() {
        const tb = document.getElementById('ncTable'); if (!tb) return;
        const toutes = document.getElementById('ncFiltre') && document.getElementById('ncFiltre').value === 'tous';
        const arr = liste().filter(c => toutes || c.service === SERVICE).sort((a, b) => (b.date || '').localeCompare(a.date || '') || b.id.localeCompare(a.id));
        tb.innerHTML = arr.length ? arr.map(c => {
            const dest = destinataires(c), lus = dest.filter(e => c.lectures && c.lectures[e.id]).length;
            const pct = dest.length ? Math.round(lus * 100 / dest.length) : 0;
            const couleur = !dest.length ? '#94a3b8' : (lus === dest.length ? '#16a34a' : '#f59e0b');
            return `<tr>
              <td style="font-weight:600;white-space:nowrap;">${esc(c.numero)}</td><td>${fr(c.date)}</td>
              <td><div style="font-weight:600;">${esc(c.objet)}</div><div style="font-size:0.8rem;color:var(--muted,#64748b);">${esc(c.type)} · ${esc(c.service)}</div></td>
              <td>${esc(libelleCible(c))}</td>
              <td style="min-width:130px;"><div style="font-weight:700;color:${couleur};">${lus} / ${dest.length} lu${lus > 1 ? 's' : ''}</div>
                <div style="height:6px;border-radius:6px;background:var(--line,#e2e8f0);margin-top:4px;"><div style="height:6px;border-radius:6px;width:${pct}%;background:${couleur};"></div></div></td>
              <td style="text-align:right;white-space:nowrap;">
                <button class="btn btn-secondary" style="padding:0.3rem 0.6rem;font-size:0.85rem;" title="Qui a lu ?" onclick="Circulaires.detail('${c.id}')"><i class="bi bi-eye"></i></button>
                <button class="btn btn-primary" style="padding:0.3rem 0.6rem;font-size:0.85rem;" title="Imprimer" onclick="Circulaires.imprimer('${c.id}')"><i class="bi bi-printer"></i></button>
                ${c.service === SERVICE || estAdmin() ? `<button class="btn btn-danger" style="padding:0.3rem 0.6rem;font-size:0.85rem;" title="Supprimer" onclick="Circulaires.supprimerUI('${c.id}')"><i class="bi bi-trash"></i></button>` : ''}
              </td></tr>`;
        }).join('') : `<tr><td colspan="6" style="text-align:center;padding:1.5rem;color:var(--muted,#64748b);">Aucune note ou circulaire ${toutes ? '' : 'publiée par ce service'}.</td></tr>`;
    }
    function estAdmin() {
        try { const s = JSON.parse(sessionStorage.getItem('portail_session')); return s && s.role === 'Administrateur'; } catch (e) { return false; }
    }
    function supprimerUI(id) {
        const c = liste().find(x => x.id === id); if (!c) return;
        if (!confirm(`Supprimer ${c.type.toLowerCase()} ${c.numero} ? Elle disparaîtra aussi de l'espace des enseignants.`)) return;
        supprimer(id); document.getElementById('ncDetail').innerHTML = ''; rendreAdmin(); toast('Document supprimé.', 'success');
    }
    function sectionHTML() {
        return `<div id="sec-circulaires" class="section hidden">
          <div class="card">
            <h3 style="font-size:1.2rem;font-weight:700;margin-bottom:0.25rem;">Envoyer une note ou une circulaire</h3>
            <p style="color:var(--muted,#64748b);margin:0 0 1rem;font-size:0.9rem;">Le document arrive dans l'espace des enseignants (onglet « Notes & circulaires ») ou dans l'espace des parents (onglet « Communiqués »). Vous voyez ensuite qui l'a lu.</p>
            <div class="row g-2">
              <div class="col-md-4"><label class="form-label" style="font-weight:600;">Type</label><select id="ncType" style="margin:0;">${TYPES.map(t => `<option>${t}</option>`).join('')}</select></div>
              <div class="col-md-4"><label class="form-label" style="font-weight:600;">Date</label><input type="date" id="ncDate" style="margin:0;"></div>
              <div class="col-md-4"><label class="form-label" style="font-weight:600;">Service émetteur</label><input type="text" value="${esc(SERVICE)}" disabled style="margin:0;"></div>
              <div class="col-md-6"><label class="form-label" style="font-weight:600;">Destinataires</label>
                <select id="ncMode" onchange="Circulaires.majValeur()" style="margin:0;">
                  <option value="tous">Tous les enseignants</option><option value="niveau">Les enseignants d'un niveau</option>
                  <option value="classe">Les professeurs d'une classe</option><option value="enseignant">Un enseignant précis</option>
                  <option value="personnel">Tout le personnel</option>
                  <optgroup label="Parents d'élèves"><option value="parents_tous">Tous les parents</option><option value="parents_classe">Les parents d'une classe</option></optgroup></select></div>
              <div class="col-md-6" id="ncValeurCol" style="display:none;"><label class="form-label" style="font-weight:600;" id="ncValeurLbl"></label><select id="ncValeur" onchange="Circulaires.apercuDest()" style="margin:0;"></select></div>
              <div class="col-md-12"><label class="form-label" style="font-weight:600;">Objet</label><input type="text" id="ncObjet" placeholder="Ex : Réunion pédagogique du vendredi" style="margin:0;"></div>
              <div class="col-md-12"><label class="form-label" style="font-weight:600;">Contenu</label><textarea id="ncContenu" rows="6" style="margin:0;"></textarea></div>
            </div>
            <p id="ncApercu" style="margin:0.75rem 0 0;font-size:0.88rem;color:var(--brand,#4f46e5);font-weight:600;"></p>
            <button class="btn btn-primary mt-3" onclick="Circulaires.envoyer()"><i class="bi bi-send"></i> Envoyer aux destinataires</button>
          </div>
          <div class="card" style="overflow-x:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap;margin-bottom:0.75rem;">
              <h3 style="font-size:1.1rem;font-weight:700;margin:0;">Documents envoyés</h3>
              <select id="ncFiltre" onchange="Circulaires.rendreAdmin()" style="margin:0;max-width:260px;"><option value="service">Ceux de mon service</option><option value="tous">Tous les services</option></select>
            </div>
            <table><thead><tr><th>Numéro</th><th>Date</th><th>Objet</th><th>Destinataires</th><th>Lecture</th><th style="text-align:right;">Actions</th></tr></thead>
            <tbody id="ncTable"></tbody></table>
          </div>
          <div id="ncDetail"></div>
        </div>`;
    }
    function installerAdmin(service) {
        SERVICE = service;
        const nav = document.querySelector('nav .tab') ? document.querySelector('nav .tab').parentElement : null;
        const derniere = Array.from(document.querySelectorAll('.section')).pop();
        if (!nav || !derniere || document.getElementById('sec-circulaires')) return;
        const btn = document.createElement('button');
        btn.className = 'tab'; btn.setAttribute('data-tab', 'circulaires');
        btn.setAttribute('onclick', "showSection('circulaires')");
        btn.innerHTML = '<i class="bi bi-send"></i><span class="nav-label">Notes & circulaires</span>';
        nav.appendChild(btn);
        derniere.insertAdjacentHTML('afterend', sectionHTML());
        // déclarer la section dans la liste de la page (titre, icône, accès par l'adresse #circulaires)
        const info = { titre: 'Notes & circulaires', icone: 'bi-send' };
        /* global DIR_SECTIONS, ETU_SECTIONS, SURV_SECTIONS, SCOL_SECTIONS, SEC_SECTIONS */
        if (typeof DIR_SECTIONS !== 'undefined') DIR_SECTIONS.circulaires = info;
        if (typeof ETU_SECTIONS !== 'undefined') ETU_SECTIONS.circulaires = info;
        if (typeof SURV_SECTIONS !== 'undefined') SURV_SECTIONS.circulaires = info;
        if (typeof SCOL_SECTIONS !== 'undefined') SCOL_SECTIONS.circulaires = info;
        if (typeof SEC_SECTIONS !== 'undefined') SEC_SECTIONS.circulaires = info;
        const orig = window.showSection;
        if (typeof orig === 'function') {
            window.showSection = function (name) {
                orig.apply(this, arguments);
                if (name === 'circulaires') {
                    const t = document.getElementById('moduleTitle'), i = document.getElementById('moduleIcon');
                    if (t) t.textContent = 'Notes & circulaires'; if (i) i.className = 'bi bi-send';
                    const d = document.getElementById('ncDate'); if (!d.value) d.value = aujourdhui();
                    majValeur(); rendreAdmin();
                }
            };
        }
    }
    function fermerDetail() { document.getElementById('ncDetail').innerHTML = ''; }

    window.Circulaires = { CLE, liste, publier, supprimer, marquerLu, pourEnseignant, nonLues, pourParent, nonLuesParent, marquerLuParent, destinataires, libelleCible, imprimer,
        installerAdmin, envoyer, majValeur, apercuDest, rendreAdmin, detail: detailLecture, fermerDetail, supprimerUI };

    // installation automatique sur les pages des services
    const moi = document.currentScript;
    if (moi && moi.dataset.service) installerAdmin(moi.dataset.service);
})();
