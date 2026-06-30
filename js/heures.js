// ===== Heures de cours : déclaration + validation à 3 niveaux (partagé) =====
const HEURES_KEY = 'ecole_heures';
// Circuit : enseignant -> surveillant -> scolarité -> études -> validé
const H_STATUT_NIVEAU = { surveillant: 'attente_surveillant', scolarite: 'attente_scolarite', etudes: 'attente_etudes' };
const H_STATUT_SUIVANT = { surveillant: 'attente_scolarite', scolarite: 'attente_etudes', etudes: 'valide' };
const H_NIVEAU_LABEL = { surveillant: 'Surveillant', scolarite: 'Chef de scolarité', etudes: 'Directeur des études' };

function hLoad() { try { return JSON.parse(localStorage.getItem(HEURES_KEY)) || []; } catch (e) { return []; } }
function hSave(arr) { localStorage.setItem(HEURES_KEY, JSON.stringify(arr)); }
function hEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function hValidateur() {
    try { const s = JSON.parse(sessionStorage.getItem('portail_session')); if (s && s.nom) return s.nom; } catch (e) {}
    return 'Responsable';
}
function hStatutLabel(st) {
    return ({
        attente_surveillant: 'En attente — Surveillant',
        attente_scolarite: 'En attente — Chef de scolarité',
        attente_etudes: 'En attente — Directeur des études',
        valide: 'Validé ✓',
        rejete: 'Rejeté ✗'
    })[st] || st;
}
function hStatutColor(st) {
    if (st === 'valide') return '#16a34a';
    if (st === 'rejete') return '#dc3545';
    return '#f59e0b';
}
// Frise des 3 étapes (utilisée côté enseignant)
function hProgress(h) {
    const etape = (label, val) => {
        const done = !!val;
        return `<span style="display:inline-flex;align-items:center;gap:0.25rem;padding:0.15rem 0.5rem;border-radius:999px;font-size:0.74rem;background:${done ? '#dcfce7' : '#f1f5f9'};color:${done ? '#166534' : '#64748b'};">${done ? '✓' : '○'} ${label}${done && val.par ? ' (' + hEsc(val.par) + ')' : ''}</span>`;
    };
    if (h.statut === 'rejete') {
        const nivLbl = ({ surveillant: 'Surveillant', scolarite: 'Chef de scolarité', etudes: 'Directeur des études' })[h.rejet ? h.rejet.niveau : ''] || '';
        return `<span style="color:#dc3545;font-weight:600;">Rejeté${nivLbl ? ' au niveau ' + nivLbl : ''} par ${hEsc(h.rejet ? h.rejet.par : '')}${h.rejet && h.rejet.motif ? '<br><span style="font-weight:500;">Motif : ' + hEsc(h.rejet.motif) + '</span>' : ''}</span>`;
    }
    return `<div style="display:flex;gap:0.3rem;flex-wrap:wrap;">${etape('Surveillant', h.surveillant)} → ${etape('Scolarité', h.scolarite)} → ${etape('Études', h.etudes)}</div>`;
}

let _hLastRender = null;
function renderValidationHeures(niveau, containerId) {
    _hLastRender = { niveau, containerId };
    const box = document.getElementById(containerId);
    if (!box) return;
    const arr = hLoad();
    const pending = arr.filter(h => h.statut === H_STATUT_NIVEAU[niveau]).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const recents = arr.filter(h => h.statut === 'valide' || h.statut === 'rejete').slice(-10).reverse();
    box.innerHTML = `
        <p style="color:#64748b;margin:0 0 0.75rem;">À valider à votre niveau (${hEsc(H_NIVEAU_LABEL[niveau])}) : <strong>${pending.length}</strong></p>
        <div style="overflow-x:auto;"><table>
            <thead><tr><th>Enseignant</th><th>Date</th><th>Classe</th><th>Matière</th><th style="text-align:center;">Heures</th><th>Sujet</th><th>Étapes précédentes</th><th style="text-align:right;">Action</th></tr></thead>
            <tbody>${pending.length === 0
                ? '<tr><td colspan="8" style="text-align:center;padding:1.25rem;color:#64748b;">Aucune déclaration en attente.</td></tr>'
                : pending.map(h => `<tr>
                    <td style="font-weight:600;">${hEsc(h.enseignantNom)}</td>
                    <td>${h.date ? new Date(h.date).toLocaleDateString('fr-FR') : '-'}</td>
                    <td>${hEsc(h.classe)}</td>
                    <td>${hEsc(h.matiere)}</td>
                    <td style="text-align:center;font-weight:700;">${hEsc(String(h.heures))}</td>
                    <td>${hEsc(h.sujet)}</td>
                    <td style="font-size:0.78rem;color:#475569;">${h.surveillant ? 'Surv. ✓ (' + hEsc(h.surveillant.par) + ')' : ''}${h.scolarite ? '<br>Scol. ✓ (' + hEsc(h.scolarite.par) + ')' : ''}</td>
                    <td style="text-align:right;white-space:nowrap;">
                        <button class="btn btn-primary" style="padding:0.3rem 0.6rem;font-size:0.82rem;" onclick="validerHeure('${h.id}','${niveau}')"><i class="bi bi-check2"></i> Valider</button>
                        <button class="btn btn-danger" style="padding:0.3rem 0.6rem;font-size:0.82rem;" onclick="rejeterHeure('${h.id}','${niveau}')"><i class="bi bi-x"></i> Rejeter</button>
                    </td></tr>`).join('')}</tbody>
        </table></div>
        ${recents.length ? `<h4 style="font-size:0.95rem;font-weight:700;margin:1.25rem 0 0.5rem;">Dernières déclarations traitées</h4>
        <div style="overflow-x:auto;"><table>
            <thead><tr><th>Enseignant</th><th>Date</th><th>Classe</th><th style="text-align:center;">Heures</th><th>Statut</th></tr></thead>
            <tbody>${recents.map(h => `<tr><td>${hEsc(h.enseignantNom)}</td><td>${h.date ? new Date(h.date).toLocaleDateString('fr-FR') : '-'}</td><td>${hEsc(h.classe)}</td><td style="text-align:center;">${hEsc(String(h.heures))}</td><td style="color:${hStatutColor(h.statut)};font-weight:600;">${hStatutLabel(h.statut)}${h.statut === 'rejete' && h.rejet ? `<br><span style="font-weight:500;color:#991b1b;font-size:0.8rem;">Motif : ${hEsc(h.rejet.motif || '')}${h.rejet.par ? ' (' + hEsc(h.rejet.par) + ')' : ''}</span>` : ''}</td></tr>`).join('')}</tbody>
        </table></div>` : ''}`;
}
function validerHeure(id, niveau) {
    const arr = hLoad();
    const h = arr.find(x => x.id === id); if (!h) return;
    h[niveau] = { par: hValidateur(), le: new Date().toISOString() };
    h.statut = H_STATUT_SUIVANT[niveau];
    if (h.statut === 'valide') h.lu = false;
    hSave(arr);
    if (_hLastRender) renderValidationHeures(_hLastRender.niveau, _hLastRender.containerId);
}
function rejeterHeure(id, niveau) {
    let motif = prompt('Motif du rejet (OBLIGATOIRE — visible par l\'enseignant) :', '');
    if (motif === null) return; // annulation
    motif = motif.trim();
    if (!motif) { alert('Le motif du rejet est obligatoire. Le rejet a été annulé.'); return; }
    const arr = hLoad();
    const h = arr.find(x => x.id === id); if (!h) return;
    h.statut = 'rejete';
    h.rejet = { par: hValidateur(), niveau: niveau, motif: motif, le: new Date().toISOString() };
    h.lu = false;
    hSave(arr);
    if (_hLastRender) renderValidationHeures(_hLastRender.niveau, _hLastRender.containerId);
}
