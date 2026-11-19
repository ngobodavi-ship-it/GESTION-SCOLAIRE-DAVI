// =====================================================================
// Direction des études — onglet « Préscolaire »
// Évaluation par appréciations, suivi de la classe, bulletins,
// paramètres (domaines, compétences, niveaux) : tout est modifiable.
// Dépend de js/prescolaire.js (Presco) et des globales du module
// Études (eleves, classes).
// =====================================================================
let prVue = 'eval', prObsTimer = null;
const prE = s => Presco.esc(s);

function prClasses() { return (classes || []).filter(c => Presco.estPrescolaire(c.nom)); }
function prEleves(classe) { return (eleves || []).filter(e => e.classe === classe).sort((a, b) => (a.nom + a.prenom).localeCompare(b.nom + b.prenom)); }
function prQui() { try { const s = JSON.parse(sessionStorage.getItem('portail_session')) || {}; return s.role || 'Direction des études'; } catch (e) { return 'Direction des études'; } }

function renderPresco() {
    const cs = prClasses();
    const selC = document.getElementById('prClasse'), selT = document.getElementById('prTrim');
    const cur = selC.value;
    selC.innerHTML = cs.length ? cs.map(c => `<option value="${prE(c.nom)}">${prE(c.nom)} (${prEleves(c.nom).length} élève(s))</option>`).join('') : '<option value="">Aucune classe du préscolaire</option>';
    if (cur && cs.some(c => c.nom === cur)) selC.value = cur;
    if (!selT.innerHTML) selT.innerHTML = Presco.TRIMS.map(t => `<option>${prE(t)}</option>`).join('');
    prMajEleves();
    prTab(prVue);
}
function prTab(v) {
    prVue = v;
    document.querySelectorAll('#prTabs .tab').forEach(b => b.classList.toggle('active', b.dataset.v === v));
    ['eval', 'suivi', 'params'].forEach(x => document.getElementById('pr-' + x).classList.toggle('hidden', x !== v));
    document.getElementById('prFiltres').classList.toggle('hidden', v === 'params');
    document.getElementById('prEleveBox').classList.toggle('hidden', v !== 'eval');
    if (v === 'eval') prRenderEval();
    if (v === 'suivi') prRenderSuivi();
    if (v === 'params') prRenderParams();
}
function prMajEleves() {
    const classe = document.getElementById('prClasse').value, sel = document.getElementById('prEleve'), cur = sel.value;
    const list = prEleves(classe);
    sel.innerHTML = list.length ? list.map(e => `<option value="${prE(e.id)}">${prE(e.nom)} ${prE(e.prenom)}</option>`).join('') : '<option value="">Aucun élève</option>';
    if (cur && list.some(e => e.id === cur)) sel.value = cur;
}
function prChange() { prMajEleves(); prTab(prVue); }
function prDecaler(d) {
    const sel = document.getElementById('prEleve'); const i = sel.selectedIndex + d;
    if (i >= 0 && i < sel.options.length) { sel.selectedIndex = i; prRenderEval(); }
}

// ---------- Évaluation d'un élève ----------
function prRenderEval() {
    const box = document.getElementById('pr-eval');
    if (!prClasses().length) { box.innerHTML = '<div class="card"><div class="empty-mini"><i class="bi bi-balloon"></i> Aucune classe du préscolaire. Créez P1, P2, P3 dans Direction de la scolarité › Classes (bouton « Ajouter le préscolaire »).</div></div>'; return; }
    const eid = document.getElementById('prEleve').value, trim = document.getElementById('prTrim').value;
    const e = (eleves || []).find(x => x.id === eid);
    if (!e) { box.innerHTML = '<div class="card"><div class="empty-mini"><i class="bi bi-people"></i> Aucun élève dans cette classe. Inscrivez les élèves dans la Direction de la scolarité.</div></div>'; return; }
    const c = Presco.config(), rec = Presco.evals()[e.id + '|' + trim] || {}, ev = rec.items || {};
    const b = Presco.bilan(e.id, trim);
    box.innerHTML = `
        <div class="card pr-head">
            <div><h3 style="margin:0;">${prE(e.nom)} ${prE(e.prenom)}</h3><small class="text-secondary">${prE(e.classe)} · ${prE(trim)} · ${b.evalues}/${b.total} compétence(s) évaluée(s)</small></div>
            <div class="pr-bilan">${c.niveaux.map(n => `<span class="pr-chip" style="--c:${prE(n.couleur)}">${prE(n.libelle)} : <strong>${b.parNiv[n.code] || 0}</strong></span>`).join('')}</div>
            <div class="d-flex gap-2 flex-wrap">
                <button class="btn btn-secondary btn-sm" onclick="prRemplirTout()" title="Mettre le même niveau aux compétences non évaluées"><i class="bi bi-ui-checks"></i> Compléter</button>
                <button class="btn btn-secondary btn-sm" onclick="prImprimer('${prE(e.id)}')"><i class="bi bi-printer"></i> Bulletin</button>
                <button class="btn btn-danger btn-sm" onclick="prEffacer()"><i class="bi bi-eraser"></i> Effacer</button>
            </div>
        </div>
        ${c.domaines.map(d => `<div class="card pr-domaine">
            <h4>${prE(d.nom)}</h4>
            ${d.items.length ? d.items.map(i => `<div class="pr-item"><span>${prE(i.nom)}</span><div class="pr-niv">
                ${c.niveaux.map(n => `<button type="button" class="${ev[i.id] === n.code ? 'on' : ''}" style="--c:${prE(n.couleur)}" onclick="prNoter('${i.id}','${prE(n.code)}')">${prE(n.libelle)}</button>`).join('')}
            </div></div>`).join('') : '<p class="text-secondary small mb-0">Aucune compétence dans ce domaine (Paramètres).</p>'}
        </div>`).join('')}
        <div class="card"><label class="form-label" for="prObs">Observation de l'enseignant(e)</label>
            <textarea id="prObs" rows="3" style="margin:0;" placeholder="Ex : Élève attentif, progrès en graphisme, doit encore travailler le langage…" oninput="prObsChange()">${prE(rec.observation || '')}</textarea>
            <small class="text-secondary" id="prObsEtat">${rec.maj ? 'Enregistré le ' + new Date(rec.maj).toLocaleString('fr-FR') + (rec.par ? ' par ' + prE(rec.par) : '') : 'Enregistrement automatique'}</small>
        </div>
        <div class="d-flex justify-content-between"><button class="btn btn-secondary" onclick="prDecaler(-1)"><i class="bi bi-chevron-left"></i> Élève précédent</button><button class="btn btn-primary" onclick="prDecaler(1)">Élève suivant <i class="bi bi-chevron-right"></i></button></div>`;
}
function prRec(fn) {
    const eid = document.getElementById('prEleve').value, trim = document.getElementById('prTrim').value; if (!eid) return;
    const all = Presco.evals(), k = eid + '|' + trim;
    all[k] = all[k] || { items: {} }; all[k].items = all[k].items || {};
    fn(all[k]); all[k].maj = new Date().toISOString(); all[k].par = prQui();
    Presco.sauverEvals(all);
}
function prNoter(itemId, code) {
    prRec(r => { if (r.items[itemId] === code) delete r.items[itemId]; else r.items[itemId] = code; });
    prRenderEval();
}
function prObsChange() {
    clearTimeout(prObsTimer);
    document.getElementById('prObsEtat').textContent = 'Enregistrement…';
    prObsTimer = setTimeout(() => { const v = document.getElementById('prObs').value; prRec(r => { r.observation = v; }); document.getElementById('prObsEtat').textContent = 'Enregistré'; }, 500);
}
function prRemplirTout() {
    const c = Presco.config();
    const choix = prompt('Niveau à mettre aux compétences non encore évaluées :\n' + c.niveaux.map(n => n.code + ' = ' + n.libelle).join('\n'), c.niveaux[0].code);
    if (choix === null) return;
    const n = c.niveaux.find(x => x.code.toLowerCase() === choix.trim().toLowerCase());
    if (!n) return uiToast('Code inconnu.', 'warn');
    prRec(r => c.domaines.forEach(d => d.items.forEach(i => { if (!r.items[i.id]) r.items[i.id] = n.code; })));
    prRenderEval();
}
function prEffacer() {
    if (!confirm('Effacer toute l\'évaluation de cet élève pour ce trimestre ?')) return;
    const eid = document.getElementById('prEleve').value, trim = document.getElementById('prTrim').value;
    const all = Presco.evals(); delete all[eid + '|' + trim]; Presco.sauverEvals(all);
    prRenderEval(); uiToast('Évaluation effacée.', 'ok');
}

// ---------- Suivi de la classe ----------
function prRenderSuivi() {
    const box = document.getElementById('pr-suivi');
    const classe = document.getElementById('prClasse').value, trim = document.getElementById('prTrim').value;
    const list = prEleves(classe), c = Presco.config();
    if (!list.length) { box.innerHTML = '<div class="card"><div class="empty-mini"><i class="bi bi-people"></i> Aucun élève dans cette classe.</div></div>'; return; }
    const ev = Presco.evals(), acq = c.niveaux[0];
    const cell = (e, d) => {
        const r = (ev[e.id + '|' + trim] || {}).items || {};
        if (!d.items.length) return '<td>—</td>';
        const n = d.items.filter(i => r[i.id] === acq.code).length, f = d.items.filter(i => r[i.id]).length;
        if (!f) return '<td class="text-secondary" style="text-align:center;">—</td>';
        const p = Math.round(n / d.items.length * 100);
        return `<td style="text-align:center;"><span class="pr-pct" style="--p:${p}">${n}/${d.items.length}</span></td>`;
    };
    box.innerHTML = `<div class="card">
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
            <div><h3 style="margin:0;">Suivi de la classe ${prE(classe)}</h3><small class="text-secondary">${prE(trim)} · nombre de compétences « ${prE(acq.libelle)} » par domaine</small></div>
            <button class="btn btn-primary" onclick="prImprimerClasse()"><i class="bi bi-printer"></i> Imprimer tous les bulletins</button>
        </div>
        <div style="overflow-x:auto;"><table><thead><tr><th>Élève</th>${c.domaines.map(d => `<th style="text-align:center;white-space:normal;min-width:90px;">${prE(d.nom)}</th>`).join('')}<th style="text-align:center;">Évaluées</th><th style="text-align:right;">Action</th></tr></thead>
        <tbody>${list.map(e => { const b = Presco.bilan(e.id, trim); return `<tr><td><strong>${prE(e.nom)} ${prE(e.prenom)}</strong></td>${c.domaines.map(d => cell(e, d)).join('')}
            <td style="text-align:center;">${b.evalues}/${b.total}</td>
            <td style="text-align:right;white-space:nowrap;"><button class="btn btn-secondary btn-sm" onclick="document.getElementById('prEleve').value='${prE(e.id)}';prTab('eval')"><i class="bi bi-pencil"></i></button> <button class="btn btn-primary btn-sm" onclick="prImprimer('${prE(e.id)}')"><i class="bi bi-printer"></i></button></td></tr>`; }).join('')}</tbody></table></div></div>`;
}
function prFenetre(html, titre) {
    const w = window.open('', '_blank'); if (!w) return uiToast('Autorisez les fenêtres pour imprimer.', 'warn');
    w.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>${prE(titre)}</title></head><body style="margin:0">${html}<script>setTimeout(function(){window.print()},300)<\/script></body></html>`);
    w.document.close();
}
function prImprimer(eid) {
    const e = (eleves || []).find(x => x.id === eid); if (!e) return;
    prFenetre(Presco.bulletinHTML(e, document.getElementById('prTrim').value), 'Bulletin ' + e.nom + ' ' + e.prenom);
}
function prImprimerClasse() {
    const classe = document.getElementById('prClasse').value, trim = document.getElementById('prTrim').value;
    const list = prEleves(classe); if (!list.length) return;
    prFenetre(list.map(e => Presco.bulletinHTML(e, trim)).join(''), 'Bulletins ' + classe);
}

// ---------- Paramètres (administrateur / Direction des études) ----------
function prRenderParams() {
    const c = Presco.config(), box = document.getElementById('pr-params');
    box.innerHTML = `
        <div class="card">
            <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
                <div><h3 style="margin:0 0 .25rem;">Domaines d'activités et compétences</h3>
                <p class="text-secondary small mb-0">Modifiez librement les noms, l'ordre, ajoutez ou supprimez. Supprimer une compétence efface aussi ses évaluations.</p></div>
                <button class="btn btn-secondary btn-sm" onclick="prRetablir()"><i class="bi bi-arrow-counterclockwise"></i> Rétablir la proposition</button>
            </div>
        </div>
        ${c.domaines.map((d, di) => `<div class="card pr-pdom">
            <div class="pr-prow">
                <span class="pr-num">${di + 1}</span>
                <input type="text" value="${prE(d.nom)}" onchange="prRenDom('${d.id}',this.value)" style="margin:0;font-weight:700;">
                <button class="btn btn-secondary btn-sm" ${di === 0 ? 'disabled' : ''} onclick="prBougerDom(${di},-1)" title="Monter"><i class="bi bi-arrow-up"></i></button>
                <button class="btn btn-secondary btn-sm" ${di === c.domaines.length - 1 ? 'disabled' : ''} onclick="prBougerDom(${di},1)" title="Descendre"><i class="bi bi-arrow-down"></i></button>
                <button class="btn btn-danger btn-sm" onclick="prSupDom('${d.id}')" title="Supprimer le domaine"><i class="bi bi-trash3"></i></button>
            </div>
            <div class="pr-items">${d.items.map((i, ii) => `<div class="pr-prow sub">
                <i class="bi bi-dot"></i>
                <input type="text" value="${prE(i.nom)}" onchange="prRenItem('${d.id}','${i.id}',this.value)" style="margin:0;">
                <button class="btn btn-secondary btn-sm" ${ii === 0 ? 'disabled' : ''} onclick="prBougerItem('${d.id}',${ii},-1)"><i class="bi bi-arrow-up"></i></button>
                <button class="btn btn-secondary btn-sm" ${ii === d.items.length - 1 ? 'disabled' : ''} onclick="prBougerItem('${d.id}',${ii},1)"><i class="bi bi-arrow-down"></i></button>
                <button class="btn btn-danger btn-sm" onclick="prSupItem('${d.id}','${i.id}')"><i class="bi bi-x-lg"></i></button>
            </div>`).join('')}
            <div class="pr-prow sub"><i class="bi bi-plus"></i><input type="text" id="prNewItem_${d.id}" placeholder="Nouvelle compétence…" style="margin:0;" onkeydown="if(event.key==='Enter')prAjoutItem('${d.id}')"><button class="btn btn-primary btn-sm" onclick="prAjoutItem('${d.id}')"><i class="bi bi-plus-lg"></i> Ajouter</button></div>
            </div>
        </div>`).join('')}
        <div class="card"><div class="pr-prow"><i class="bi bi-plus-circle"></i><input type="text" id="prNewDom" placeholder="Nouveau domaine d'activités…" style="margin:0;" onkeydown="if(event.key==='Enter')prAjoutDom()"><button class="btn btn-primary" onclick="prAjoutDom()"><i class="bi bi-plus-lg"></i> Ajouter le domaine</button></div></div>
        <div class="card">
            <h3 style="margin:0 0 .25rem;">Niveaux d'appréciation</h3>
            <p class="text-secondary small mb-3">Le premier niveau est celui compté comme « réussi » dans le suivi de la classe. Deux niveaux minimum.</p>
            <div style="overflow-x:auto;"><table><thead><tr><th>Ordre</th><th>Code</th><th>Libellé</th><th>Couleur</th><th style="text-align:right;">Action</th></tr></thead><tbody>
            ${c.niveaux.map((n, ni) => `<tr><td>${ni + 1}</td>
                <td><input type="text" value="${prE(n.code)}" maxlength="4" style="margin:0;width:80px;" onchange="prNiv(${ni},'code',this.value)"></td>
                <td><input type="text" value="${prE(n.libelle)}" style="margin:0;" onchange="prNiv(${ni},'libelle',this.value)"></td>
                <td><input type="color" value="${prE(n.couleur)}" style="margin:0;width:56px;height:36px;padding:2px;" onchange="prNiv(${ni},'couleur',this.value)"></td>
                <td style="text-align:right;white-space:nowrap;"><button class="btn btn-secondary btn-sm" ${ni === 0 ? 'disabled' : ''} onclick="prBougerNiv(${ni},-1)"><i class="bi bi-arrow-up"></i></button> <button class="btn btn-danger btn-sm" ${c.niveaux.length <= 2 ? 'disabled' : ''} onclick="prSupNiv(${ni})"><i class="bi bi-trash3"></i></button></td></tr>`).join('')}
            </tbody></table></div>
            <button class="btn btn-secondary mt-3" onclick="prAjoutNiv()"><i class="bi bi-plus-lg"></i> Ajouter un niveau</button>
        </div>`;
}
function prMaj(fn, msg) { const c = Presco.config(); fn(c); Presco.sauverConfig(c); prRenderParams(); if (msg) uiToast(msg, 'ok'); }
function prDom(c, id) { return c.domaines.find(d => d.id === id); }
function prRenDom(id, v) { v = v.trim(); if (!v) return prRenderParams(); prMaj(c => { prDom(c, id).nom = v; }); }
function prRenItem(did, iid, v) { v = v.trim(); if (!v) return prRenderParams(); prMaj(c => { prDom(c, did).items.find(i => i.id === iid).nom = v; }); }
function prBougerDom(i, d) { prMaj(c => { const x = c.domaines.splice(i, 1)[0]; c.domaines.splice(i + d, 0, x); }); }
function prBougerItem(did, i, d) { prMaj(c => { const it = prDom(c, did).items; const x = it.splice(i, 1)[0]; it.splice(i + d, 0, x); }); }
function prAjoutDom() { const v = document.getElementById('prNewDom').value.trim(); if (!v) return; prMaj(c => { c.domaines.push({ id: Presco.uid('d'), nom: v, items: [] }); }, 'Domaine ajouté.'); }
function prAjoutItem(did) { const inp = document.getElementById('prNewItem_' + did), v = inp.value.trim(); if (!v) return; prMaj(c => { prDom(c, did).items.push({ id: Presco.uid('i'), nom: v }); }, 'Compétence ajoutée.'); }
function prPurgeItems(ids) {
    const all = Presco.evals(); let n = 0;
    Object.values(all).forEach(r => { ids.forEach(id => { if (r.items && r.items[id]) { delete r.items[id]; n++; } }); });
    Presco.sauverEvals(all); return n;
}
function prSupDom(id) {
    const c = Presco.config(), d = prDom(c, id);
    if (!confirm(`Supprimer le domaine « ${d.nom} » et ses ${d.items.length} compétence(s) ? Les évaluations correspondantes seront effacées.`)) return;
    const n = prPurgeItems(d.items.map(i => i.id));
    prMaj(cc => { cc.domaines = cc.domaines.filter(x => x.id !== id); }, `Domaine supprimé (${n} évaluation(s) effacée(s)).`);
}
function prSupItem(did, iid) {
    const c = Presco.config(), it = prDom(c, did).items.find(i => i.id === iid);
    if (!confirm(`Supprimer la compétence « ${it.nom} » ? Ses évaluations seront effacées.`)) return;
    const n = prPurgeItems([iid]);
    prMaj(cc => { prDom(cc, did).items = prDom(cc, did).items.filter(i => i.id !== iid); }, `Compétence supprimée (${n} évaluation(s) effacée(s)).`);
}
function prNiv(i, champ, v) {
    v = String(v).trim(); if (!v) return prRenderParams();
    const c = Presco.config(), ancien = c.niveaux[i].code;
    if (champ === 'code') {
        v = v.toUpperCase();
        if (c.niveaux.some((n, j) => j !== i && n.code === v)) { uiToast('Ce code existe déjà.', 'warn'); return prRenderParams(); }
        // les évaluations suivent le nouveau code
        const all = Presco.evals(); Object.values(all).forEach(r => Object.keys(r.items || {}).forEach(k => { if (r.items[k] === ancien) r.items[k] = v; })); Presco.sauverEvals(all);
    }
    prMaj(cc => { cc.niveaux[i][champ] = v; });
}
function prBougerNiv(i, d) { prMaj(c => { const x = c.niveaux.splice(i, 1)[0]; c.niveaux.splice(i + d, 0, x); }); }
function prAjoutNiv() {
    prMaj(c => { let k = 1; while (c.niveaux.some(n => n.code === 'N' + k)) k++; c.niveaux.push({ code: 'N' + k, libelle: 'Nouveau niveau', couleur: '#6366F1' }); }, 'Niveau ajouté : renommez-le.');
}
function prSupNiv(i) {
    const c = Presco.config(), n = c.niveaux[i];
    if (!confirm(`Supprimer le niveau « ${n.libelle} » ? Les compétences évaluées avec ce niveau redeviendront « non évaluées ».`)) return;
    const all = Presco.evals(); Object.values(all).forEach(r => Object.keys(r.items || {}).forEach(k => { if (r.items[k] === n.code) delete r.items[k]; })); Presco.sauverEvals(all);
    prMaj(cc => { cc.niveaux.splice(i, 1); }, 'Niveau supprimé.');
}
function prRetablir() {
    if (!confirm('Remplacer tous les domaines, compétences et niveaux par la proposition de départ ?\n\nLes évaluations déjà faites ne correspondront plus et seront effacées.')) return;
    Presco.sauverConfig(Presco.configParDefaut()); Presco.sauverEvals({});
    prRenderParams(); uiToast('Proposition de départ rétablie.', 'ok');
}
