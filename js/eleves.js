// ===== Élèves : liste, import, historique =====

async function clearAllStudents() {
            let eco = []; try { eco = JSON.parse(localStorage.getItem('ecole_eleves')) || []; } catch (e) { eco = []; }
            const nbPay = transactions.filter(t => t.type !== 'depense').length;
            const rep = prompt(`SUPPRIMER TOUS LES ÉLÈVES de l'établissement ?\n\n• ${eco.length || students.length} élève(s) retiré(s) du registre (Scolarité, Études, Surveillance, espace parent…) et de la caisse\n• ${nbPay} paiement(s) d'élèves supprimé(s) (les dépenses sont conservées)\n\nUne copie de sécurité est faite avant (Espace admin › Données et sauvegardes).\nPour confirmer, tapez : SUPPRIMER`);
            if (rep === null) return;
            if (rep.trim().toUpperCase() !== 'SUPPRIMER') { alert('Annulé : le mot de confirmation ne correspond pas.'); return; }
            try { if (window.SecuriteDonnees) await SecuriteDonnees.copieDuJour(true, true); } catch (e) { }
            students = [];
            transactions = transactions.filter(t => t.type === 'depense'); // Garder seulement les dépenses
            localStorage.setItem('ecole_eleves', JSON.stringify([]));
            localStorage.setItem('digigespro_students', JSON.stringify(students));
            localStorage.setItem('digigespro_transactions', JSON.stringify(transactions));
            updateUI();
            alert('Tous les élèves ont été supprimés (registre et caisse). Une copie de sécurité permet de revenir en arrière si besoin.');
        }

function renderStudents() {
            if (typeof syncStudentsFromScolarite === 'function') syncStudentsFromScolarite();
            if (typeof gxInit === 'function') gxInit();
            if (students.length === 0) {
                document.getElementById('studentsTableBody').innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--muted,#64748b);">Aucun eleve</td></tr>';
                return;
            }

            document.getElementById('studentsTableBody').innerHTML = students.map(s => {
                const balances = calculateMonthlyBalances(s.id);
                const totalReste = Object.values(balances).reduce((sum, b) => sum + b.reste, 0);
                
                return `
                    <tr>
                        <td style="font-family:monospace;">${s.matricule}</td>
                        <td style="font-weight:600;">${s.nom} ${s.prenom}</td>
                        <td>${s.classe}</td>
                        <td class="${totalReste <= 0 ? 'solde-positif' : 'solde-negatif'}">
                            ${totalReste.toLocaleString()} FCFA
                        </td>
                        <td><button class="btn btn-secondary" style="padding:0.5rem 1rem;font-size:0.875rem;" onclick="viewStudent('${s.id}')">👁️ Voir</button></td>
                    </tr>
                `;
            }).join('');
        }

function viewStudent(studentId) {
            document.getElementById('selectStudentHisto').value = studentId;
            showTab('historique');
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab')[3].classList.add('active');
            showStudentHistory();
        }

function showStudentHistory() {
            const studentId = document.getElementById('selectStudentHisto').value;
            if (!studentId) {
                document.getElementById('studentHistoryContent').innerHTML = '';
                return;
            }

            const student = students.find(s => s.id === studentId);
            const balances = calculateMonthlyBalances(studentId);
            const payments = transactions.filter(t => t.studentId === studentId && t.type === 'scolarite');
            
            const totalPaye = Object.values(balances).reduce((sum, b) => sum + b.paye, 0);
            const totalPrixFixe = Object.values(balances).reduce((sum, b) => sum + b.prixFixe, 0);
            const totalReste = totalPrixFixe - totalPaye;

            document.getElementById('studentHistoryContent').innerHTML = `
                <div class="card">
                    <div style="border-bottom:2px solid #e2e8f0;padding-bottom:1.5rem;margin-bottom:1.5rem;">
                        <h3 style="font-size:1.5rem;font-weight:700;">${student.nom} ${student.prenom}</h3>
                        <p style="color:var(--muted,#64748b);">📋 ${student.matricule} • 🎓 ${student.classe}</p>
                    </div>

                    <div style="background:var(--surface-2,#f8fafc);padding:1.5rem;border-radius:12px;margin-bottom:1.5rem;">
                        <h4 style="font-size:1.25rem;font-weight:700;margin-bottom:1rem;">💰 Resume financier</h4>
                        <div class="grid-2">
                            <div>
                                <p style="font-size:0.875rem;color:var(--muted,#64748b);">Total paye</p>
                                <p style="font-size:1.75rem;font-weight:700;color:var(--ok,#10b981);">${totalPaye.toLocaleString()} FCFA</p>
                            </div>
                            <div>
                                <p style="font-size:0.875rem;color:var(--muted,#64748b);">Prix fixe total (12 mois)</p>
                                <p style="font-size:1.75rem;font-weight:700;">${totalPrixFixe.toLocaleString()} FCFA</p>
                            </div>
                        </div>
                        <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid #e2e8f0;">
                            <p style="font-size:0.875rem;color:var(--muted,#64748b);">Reste a payer</p>
                            <p style="font-size:2rem;font-weight:700;" class="${totalReste <= 0 ? 'solde-positif' : 'solde-negatif'}">
                                ${totalReste.toLocaleString()} FCFA
                            </p>
                        </div>
                    </div>

                    <h4 style="font-size:1.25rem;font-weight:700;margin-bottom:1rem;">📅 Detail par mois</h4>
                    <div style="overflow-x:auto;">
                        <table>
                            <thead>
                                <tr>
                                    <th>Mois</th>
                                    <th>Prix fixe</th>
                                    <th>Paye</th>
                                    <th>Reste</th>
                                    <th>Etat</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${MOIS.map(mois => {
                                    const b = balances[mois];
                                    let badge = '';
                                    
                                    if (b.status === 'complet') {
                                        badge = '<span style="background:var(--ok-bg,#d1fae5);color:var(--ok-strong,#065f46);padding:0.25rem 0.75rem;border-radius:12px;font-size:0.875rem;font-weight:600;">✓ Complet</span>';
                                    } else if (b.status === 'partiel') {
                                        badge = '<span style="background:var(--warn-bg,#fef3c7);color:var(--warn-strong,#92400e);padding:0.25rem 0.75rem;border-radius:12px;font-size:0.875rem;font-weight:600;">⚡ Partiel</span>';
                                    } else {
                                        badge = '<span style="background:var(--danger-bg,#fee2e2);color:var(--danger-strong,#991b1b);padding:0.25rem 0.75rem;border-radius:12px;font-size:0.875rem;font-weight:600;">✗ Impaye</span>';
                                    }
                                    
                                    return `
                                        <tr>
                                            <td style="font-weight:600;">${mois}</td>
                                            <td style="font-weight:600;">${b.prixFixe.toLocaleString()} FCFA</td>
                                            <td style="color:var(--ok,#10b981);font-weight:600;">${b.paye.toLocaleString()} FCFA</td>
                                            <td class="${b.reste <= 0 ? 'solde-positif' : 'solde-negatif'}">
                                                ${b.reste.toLocaleString()} FCFA
                                            </td>
                                            <td>${badge}</td>
                                            <td>
                                                ${b.status !== 'impaye' ? `
                                                    <button class="btn btn-warning" style="padding:0.35rem 0.75rem;font-size:0.75rem;" onclick="editMonthPayment('${studentId}', '${mois}')">
                                                        ✏️ Editer
                                                    </button>
                                                ` : ''}
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                                <tr style="background:var(--surface-2,#f8fafc);border-top:3px solid #1B6BFF;font-weight:700;font-size:1.125rem;">
                                    <td style="padding:1rem;">TOTAL</td>
                                    <td style="padding:1rem;">${totalPrixFixe.toLocaleString()} FCFA</td>
                                    <td style="color:var(--ok,#10b981);padding:1rem;">${totalPaye.toLocaleString()} FCFA</td>
                                    <td class="${totalReste <= 0 ? 'solde-positif' : 'solde-negatif'}" style="padding:1rem;">
                                        ${totalReste.toLocaleString()} FCFA
                                    </td>
                                    <td style="padding:1rem;font-size:0.875rem;">
                                        ${Object.values(balances).filter(b => b.status === 'complet').length} complets<br>
                                        ${Object.values(balances).filter(b => b.status === 'partiel').length} partiels<br>
                                        ${Object.values(balances).filter(b => b.status === 'impaye').length} impayes
                                    </td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <h4 style="font-size:1.25rem;font-weight:700;margin:2rem 0 1rem 0;">📜 Historique des paiements</h4>
                    ${payments.length === 0 ? '<p style="color:var(--muted,#64748b);text-align:center;padding:2rem;">Aucun paiement</p>' :
                        payments.map(p => `
                            <div style="padding:1rem;background:var(--surface-2,#f8fafc);border-radius:10px;margin-bottom:0.75rem;border-left:4px solid #10b981;">
                                <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:1rem;">
                                    <div style="flex:1;">
                                        <p style="font-weight:600;margin-bottom:0.5rem;">${p.description}</p>
                                        <p style="font-size:0.875rem;color:var(--muted,#64748b);">📅 ${new Date(p.date).toLocaleDateString('fr-FR')} ${p.time}</p>
                                        <p style="margin-top:0.5rem;color:var(--brand,#1B6BFF);font-weight:600;">Mois: ${p.moisPayes.join(', ')}</p>
                                        ${p.isEcheance ? '<p style="font-size:0.875rem;color:var(--warn,#f59e0b);font-weight:600;">⚡ Paiement par echeance</p>' : ''}
                                    </div>
                                    <div style="text-align:right;display:flex;flex-direction:column;gap:0.5rem;">
                                        <div>
                                            <p style="font-size:1.5rem;font-weight:700;color:var(--ok,#10b981);">+${parseFloat(p.amount).toLocaleString()}</p>
                                            <p style="font-size:0.875rem;color:var(--muted,#64748b);">FCFA</p>
                                        </div>
                                        <button class="btn btn-danger" style="padding:0.35rem 0.75rem;font-size:0.75rem;" onclick="deleteTransaction('${p.id}')">
                                            🗑️ Supprimer
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `).join('')
                    }
                </div>
            `;
        }

function handleFileUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            // Vérifier que c'est bien un fichier Excel
            if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
                alert('❌ Veuillez importer un fichier Excel (.xlsx ou .xls)');
                event.target.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, {type: 'array'});
                    
                    // Lire la première feuille
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet, {header: 1});
                    
                    if (jsonData.length < 2) {
                        alert('❌ Le fichier est vide ou ne contient pas de donnees');
                        event.target.value = '';
                        return;
                    }

                    const imported = [];
                    let errorCount = 0;

                    // Commencer à la ligne 2 (indice 1) pour ignorer les en-têtes
                    for (let i = 1; i < jsonData.length; i++) {
                        const row = jsonData[i];
                        
                        // Vérifier qu'il y a au moins un nom et un prénom
                        if (row && row[0] && row[1]) {
                            imported.push({
                                id: Date.now() + '-' + i,
                                nom: String(row[0] || '').trim(),
                                prenom: String(row[1] || '').trim(),
                                classe: String(row[2] || 'Non definie').trim(),
                                matricule: String(row[3] || `MAT-${Date.now()}-${i}`).trim()
                            });
                        } else {
                            errorCount++;
                        }
                    }

                    if (imported.length === 0) {
                        alert('❌ Aucune donnee valide trouvee.\n\nVerifiez que:\n- La premiere ligne contient les en-tetes\n- Les colonnes sont: Nom | Prenom | Classe | Matricule\n- Il y a au moins un nom et un prenom par ligne');
                        event.target.value = '';
                        return;
                    }

                    // Registre principal (Scolarité) : ajout, ou mise à jour si le matricule existe déjà
                    let eco = []; try { eco = JSON.parse(localStorage.getItem('ecole_eleves')) || []; } catch (e) { eco = []; }
                    const d0 = new Date(), y0 = d0.getFullYear(), annee = d0.getMonth() >= 8 ? `${y0}-${y0 + 1}` : `${y0 - 1}-${y0}`;
                    let ajoutes = 0, majs = 0;
                    imported.forEach(im => {
                        const ex = eco.find(e => im.matricule && e.matricule === im.matricule);
                        if (ex) { ex.nom = im.nom; ex.prenom = im.prenom; if (im.classe && im.classe !== 'Non definie') ex.classe = im.classe; im.id = ex.id; majs++; }
                        else { eco.push({ id: im.id, nom: im.nom, prenom: im.prenom, classe: im.classe, matricule: im.matricule, statut: 'Nouveau', anneeScolaire: annee, dateInscription: d0.toISOString().split('T')[0], source: 'import caisse' }); ajoutes++; }
                        const i = students.findIndex(st => st.id === im.id || (im.matricule && st.matricule === im.matricule));
                        if (i >= 0) students[i] = Object.assign(students[i], { nom: im.nom, prenom: im.prenom, classe: im.classe, matricule: im.matricule }); else students.push(im);
                    });
                    localStorage.setItem('ecole_eleves', JSON.stringify(eco));
                    localStorage.setItem('digigespro_students', JSON.stringify(students));
                    updateUI();
                    
                    let message = `✅ ${ajoutes} nouvel(s) élève(s) importé(s)${majs ? `, ${majs} mis à jour (matricule déjà connu)` : ''}. Ils apparaissent aussi dans la Direction de la scolarité et les autres modules.`;
                    if (errorCount > 0) {
                        message += `\n⚠️ ${errorCount} ligne(s) ignoree(s) (donnees invalides)`;
                    }
                    alert(message);
                    event.target.value = '';
                } catch(error) {
                    console.error('Erreur import Excel:', error);
                    alert('❌ Erreur lors de l\'import du fichier Excel.\n\nAssurez-vous que:\n1. Le fichier est un vrai fichier Excel (.xlsx ou .xls)\n2. La premiere ligne contient: Nom | Prenom | Classe | Matricule\n3. Les donnees commencent a la ligne 2');
                    event.target.value = '';
                }
            };
            reader.readAsArrayBuffer(file);
        }

// ===== Inscription / Réinscription (guichet caisse → Scolarité) =====
let gxPhotoTemp = '';
function gxV(id) { const el = document.getElementById(id); return el ? el.value : ''; }
function gxSet(id, v) { const el = document.getElementById(id); if (el) el.value = v; }
function gxRead(k, def) { try { return JSON.parse(localStorage.getItem(k) || 'null') || def; } catch (e) { return def; } }
function anneeScolaireGestion() { const d = new Date(), y = d.getFullYear(); return (d.getMonth() >= 8) ? `${y}-${y + 1}` : `${y - 1}-${y}`; }
function genererMatriculeGestion() {
    const year = new Date().getFullYear();
    const eco = gxRead('ecole_eleves', []);
    let max = 0;
    students.concat(eco).forEach(s => { const m = /MAT-(\d{4})-(\d+)/.exec(s && s.matricule || ''); if (m && m[1] === String(year)) { const n = parseInt(m[2], 10); if (n > max) max = n; } });
    return `MAT-${year}-${String(max + 1).padStart(4, '0')}`;
}
function gxInit() {
    const dl = document.getElementById('gxClasseList');
    if (dl) { const cls = gxRead('ecole_classes', []); dl.innerHTML = cls.map(c => `<option value="${(c.nom || '').replace(/"/g, '&quot;')}">`).join(''); }
    const sel = document.getElementById('gxExisting');
    if (sel) {
        const cur = sel.value;
        const eco = gxRead('ecole_eleves', []).slice().sort((a, b) => ((a.nom || '') + (a.prenom || '')).localeCompare((b.nom || '') + (b.prenom || '')));
        sel.innerHTML = '<option value="">-- Choisir l\'élève --</option>' + eco.map(e => `<option value="${e.id}">${e.nom} ${e.prenom} — ${e.classe || ''} (${e.matricule || ''})</option>`).join('');
        sel.value = cur;
    }
    const d = document.getElementById('gxDate'); if (d && !d.value) d.value = new Date().toISOString().split('T')[0];
    const a = document.getElementById('gxAnnee'); if (a && !a.value) a.value = anneeScolaireGestion();
    const ec = document.getElementById('gxEcole'); if (ec && !ec.value) ec.value = localStorage.getItem('digigespro_ecole') || '';
}
function gxToggleType() {
    const rein = document.getElementById('gxType').value === 'Réinscription';
    document.getElementById('gxExistingWrap').style.display = rein ? '' : 'none';
    gxSet('gxFrais', rein ? 'reinscription' : 'inscription');
    if (!rein) gxSet('gxExisting', '');
    gxAutoMontant();
}
function gxAutoMontant() {
    if (typeof grilleTarif !== 'function') return;
    const classe = gxV('gxClasse');
    if (!classe) return;
    const t = grilleTarif(classe);
    const frais = gxV('gxFrais');
    const montant = frais === 'reinscription' ? t.reinscription : t.inscription;
    const champ = document.getElementById('gxMontant');
    if (champ && montant > 0) champ.value = montant;
}
function gxPickExisting() {
    const id = gxV('gxExisting'); if (!id) return;
    const e = gxRead('ecole_eleves', []).find(x => x.id === id); if (!e) return;
    gxSet('gxNom', e.nom || ''); gxSet('gxPrenom', e.prenom || ''); gxSet('gxSexe', e.sexe || 'M');
    gxSet('gxDateN', e.dateNaissance || ''); gxSet('gxLieuN', e.lieuNaissance || '');
    gxSet('gxClasse', e.classe || ''); gxSet('gxAnnee', e.anneeScolaire || anneeScolaireGestion());
    gxSet('gxTuteur', e.tuteur || ''); gxSet('gxTel', e.telephone || ''); gxSet('gxAdresse', e.adresse || '');
    gxPhotoTemp = e.photo || '';
    const prev = document.getElementById('gxPhotoPreview');
    if (e.photo) { prev.src = e.photo; prev.style.display = 'block'; } else { prev.style.display = 'none'; }
    gxAutoMontant();
}
function chargerPhotoGestion(input) {
    const file = input.files && input.files[0]; if (!file) return;
    if (!/^image\//.test(file.type)) { alert('Choisissez une image.'); input.value = ''; return; }
    const reader = new FileReader();
    reader.onload = function (ev) {
        const img = new Image();
        img.onload = function () {
            const maxW = 150, maxH = 190; let w = img.width, h = img.height;
            const ratio = Math.min(maxW / w, maxH / h, 1); w = Math.round(w * ratio); h = Math.round(h * ratio);
            const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            gxPhotoTemp = canvas.toDataURL('image/jpeg', 0.7);
            const prev = document.getElementById('gxPhotoPreview'); prev.src = gxPhotoTemp; prev.style.display = 'block';
        };
        img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
}
function retirerPhotoGestion() {
    gxPhotoTemp = '';
    const p = document.getElementById('gxPhoto'); if (p) p.value = '';
    const prev = document.getElementById('gxPhotoPreview'); if (prev) prev.style.display = 'none';
}
function gxReset() {
    ['gxNom', 'gxPrenom', 'gxLieuN', 'gxClasse', 'gxTuteur', 'gxTel', 'gxAdresse', 'gxMontant'].forEach(i => gxSet(i, ''));
    gxSet('gxSexe', 'M'); gxSet('gxDateN', ''); gxSet('gxExisting', '');
    retirerPhotoGestion();
    document.getElementById('gxDate').value = new Date().toISOString().split('T')[0];
    gxInit();
}
function enregistrerInscription(avecRecu) {
    const type = gxV('gxType');
    const nom = gxV('gxNom').trim(), prenom = gxV('gxPrenom').trim(), classe = gxV('gxClasse').trim();
    if (!nom || !prenom) { alert('❌ Nom et prénom obligatoires.'); return; }
    if (!classe) { alert('❌ Indiquez la classe.'); return; }
    const champs = {
        nom: nom, prenom: prenom, sexe: gxV('gxSexe'), dateNaissance: gxV('gxDateN'),
        lieuNaissance: gxV('gxLieuN').trim(), classe: classe,
        anneeScolaire: gxV('gxAnnee').trim() || anneeScolaireGestion(),
        tuteur: gxV('gxTuteur').trim(), telephone: gxV('gxTel').trim(), adresse: gxV('gxAdresse').trim(),
        photo: gxPhotoTemp || '', statut: type
    };
    let eco = gxRead('ecole_eleves', []);
    let student = null;
    const existingId = (type === 'Réinscription') ? gxV('gxExisting') : '';
    if (existingId) {
        const e = eco.find(x => x.id === existingId);
        if (e) {
            Object.assign(e, {
                classe: champs.classe, anneeScolaire: champs.anneeScolaire, statut: 'Réinscription',
                tuteur: champs.tuteur || e.tuteur, telephone: champs.telephone || e.telephone, adresse: champs.adresse || e.adresse,
                sexe: champs.sexe || e.sexe, dateNaissance: champs.dateNaissance || e.dateNaissance,
                lieuNaissance: champs.lieuNaissance || e.lieuNaissance, photo: champs.photo || e.photo
            });
            student = { id: e.id, matricule: e.matricule, nom: e.nom, prenom: e.prenom, classe: e.classe };
        }
    }
    if (!student) {
        const id = 'e' + Date.now();
        const matricule = genererMatriculeGestion();
        eco.push(Object.assign({ id: id, matricule: matricule, dateInscription: new Date().toISOString().split('T')[0] }, champs));
        student = { id: id, matricule: matricule, nom: nom, prenom: prenom, classe: classe };
    }
    localStorage.setItem('ecole_eleves', JSON.stringify(eco));
    // miroir Gestion (suivi caisse)
    const idx = students.findIndex(s => s.id === student.id);
    const mini = { id: student.id, nom: nom, prenom: prenom, classe: classe, matricule: student.matricule };
    if (idx >= 0) students[idx] = mini; else students.push(mini);
    localStorage.setItem('digigespro_students', JSON.stringify(students));
    // encaissement des frais (si montant saisi)
    const montant = parseFloat(gxV('gxMontant')) || 0;
    const typeFrais = gxV('gxFrais') || 'inscription';
    const nomEcole = gxV('gxEcole').trim() || localStorage.getItem('digigespro_ecole') || '';
    let trans = null;
    if (montant > 0) {
        trans = {
            id: Date.now().toString(),
            date: gxV('gxDate') || new Date().toISOString().split('T')[0],
            time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            type: typeFrais, nomEcole: nomEcole, paymentMethod: gxV('gxMoyen'),
            studentId: student.id, studentName: `${nom} ${prenom}`, studentClasse: classe, studentMatricule: student.matricule,
            amount: montant, description: `Frais de ${typeFrais === 'reinscription' ? 'réinscription' : 'inscription'} — ${nom} ${prenom}`,
            reference: `${typeFrais.substring(0, 3).toUpperCase()}-${String(transactions.filter(t => t.type === typeFrais).length + 1).padStart(3, '0')}`
        };
        transactions.unshift(trans);
        localStorage.setItem('digigespro_transactions', JSON.stringify(transactions));
        if (nomEcole) localStorage.setItem('digigespro_ecole', nomEcole);
    }
    updateUI();
    gxReset();
    closeInscriptionModal();
    if (avecRecu && trans && typeof showReceipt === 'function') { showReceipt(trans); }
    else { alert(`✅ ${student.matricule} — ${nom} ${prenom} enregistré(e) et transmis(e) à la Direction de la scolarité.${montant > 0 ? '\n💰 Frais encaissés : ' + montant.toLocaleString('fr-FR') + ' FCFA.' : ''}`); }
}

function openInscriptionModal() {
    const m = document.getElementById('inscriptionModal'); if (!m) return;
    gxSet('gxType', 'Nouvelle inscription');
    gxReset();
    gxToggleType();
    m.classList.remove('hidden');
}
function closeInscriptionModal() {
    const m = document.getElementById('inscriptionModal'); if (m) m.classList.add('hidden');
}
