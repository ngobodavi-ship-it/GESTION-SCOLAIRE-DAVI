<?php
// Interroge l'opérateur sur l'état d'un paiement lancé par payer.php
require __DIR__ . '/lib.php';
$ref = preg_replace('/[^a-f0-9-]/', '', strtolower((string) ($_GET['ref'] ?? '')));
if (strlen($ref) !== 36) gsd_erreur('Référence invalide.');
$p = gsd_store(fn(&$d) => $d[$ref] ?? null);
if (!$p) gsd_erreur('Paiement inconnu.', 404);
if ($p['statut'] === 'en_cours') {
    $o = gsd_operateur($p['fournisseur']);
    if ($o) {
        try { $s = $p['fournisseur'] === 'mtn' ? mtn_statut($o, $ref) : airtel_statut($o, $ref); }
        catch (Throwable $e) { $s = ['statut' => 'en_cours']; }
        // Au-delà de 10 minutes sans réponse : considéré comme expiré
        if ($s['statut'] === 'en_cours' && strtotime($p['cree']) < time() - 600) $s = ['statut' => 'echec', 'raison' => 'Délai dépassé : aucune confirmation sur le téléphone.'];
        $p = gsd_store(function (&$d) use ($ref, $s) {
            $d[$ref]['statut'] = $s['statut'];
            if (!empty($s['operateur_tx'])) $d[$ref]['operateur_tx'] = $s['operateur_tx'];
            if (!empty($s['raison'])) $d[$ref]['raison'] = $s['raison'];
            $d[$ref]['maj'] = date('c');
            return $d[$ref];
        });
    }
}
gsd_json(['ok' => true, 'ref' => $ref, 'statut' => $p['statut'], 'montant' => $p['montant'], 'devise' => $p['devise'],
    'fournisseur' => $p['fournisseur'], 'operateur_tx' => $p['operateur_tx'] ?? null, 'raison' => $p['raison'] ?? null,
    'externalId' => $p['externalId'], 'contexte' => $p['contexte'], 'cree' => $p['cree']]);
