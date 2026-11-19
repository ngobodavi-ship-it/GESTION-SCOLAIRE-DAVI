<?php
// Lance une demande de paiement sur le téléphone du parent (MTN ou Airtel)
require __DIR__ . '/lib.php';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') gsd_erreur('Méthode non autorisée.', 405);
$in = json_decode(file_get_contents('php://input') ?: '', true);
if (!is_array($in)) gsd_erreur('Requête invalide.');

$fournisseur = (string) ($in['fournisseur'] ?? '');
if (!in_array($fournisseur, ['mtn', 'airtel'], true)) gsd_erreur('Opérateur inconnu.');
$o = gsd_operateur($fournisseur);
if (!$o || !gsd_etat_operateur($fournisseur)['configure']) gsd_erreur('Le paiement en ligne ' . strtoupper($fournisseur) . ' n\'est pas encore activé sur le serveur.', 503);

$montant = (float) ($in['montant'] ?? 0);
if ($montant < 1 || $montant > 10000000) gsd_erreur('Montant invalide.');
$tel = (string) ($in['telephone'] ?? '');
$local = gsd_tel_local($tel, gsd_config()['indicatif'] ?? '242');
if (strlen($local) < 8 || strlen($local) > 10) gsd_erreur('Numéro de téléphone invalide.');

// Limites anti-abus : 5 demandes / 10 min par numéro, 20 / 10 min par adresse IP
$ip = $_SERVER['REMOTE_ADDR'] ?? 'inconnue';
if (!gsd_limite('tel:' . $local, 5, 600) || !gsd_limite('ip:' . $ip, 20, 600)) gsd_erreur('Trop de demandes. Patientez quelques minutes.', 429);

$ctx = is_array($in['contexte'] ?? null) ? $in['contexte'] : [];
$contexte = [
    'eleveId' => mb_substr((string) ($ctx['eleveId'] ?? ''), 0, 64),
    'eleveNom' => mb_substr((string) ($ctx['eleveNom'] ?? ''), 0, 120),
    'type' => in_array($ctx['type'] ?? '', ['scolarite', 'inscription', 'reinscription'], true) ? $ctx['type'] : 'scolarite',
    'mois' => array_slice(array_map('strval', (array) ($ctx['mois'] ?? [])), 0, 12),
    'parentKey' => mb_substr((string) ($ctx['parentKey'] ?? ''), 0, 20),
];
$ref = gsd_uuid();
$externalId = 'GSD-' . substr(str_replace('-', '', $ref), 0, 12);
$message = 'Scolarite ' . ($contexte['eleveNom'] ?: '') . ' ' . implode(' ', $contexte['mois']);

try {
    if ($fournisseur === 'mtn') mtn_demander($o, $ref, $montant, $tel, $externalId, $message);
    else airtel_demander($o, $ref, $montant, $tel, $externalId);
} catch (Throwable $e) {
    gsd_erreur($e->getMessage(), 502);
}

gsd_store(function (&$data) use ($ref, $fournisseur, $montant, $local, $externalId, $contexte, $o) {
    $data[$ref] = ['ref' => $ref, 'fournisseur' => $fournisseur, 'montant' => $montant, 'devise' => $o['devise'] ?? 'XAF',
        'telephone' => $local, 'externalId' => $externalId, 'contexte' => $contexte, 'statut' => 'en_cours',
        'cree' => date('c'), 'maj' => date('c')];
});
gsd_json(['ok' => true, 'ref' => $ref, 'externalId' => $externalId, 'statut' => 'en_cours']);
