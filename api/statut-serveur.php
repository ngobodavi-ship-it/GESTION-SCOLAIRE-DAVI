<?php
// État du paiement en ligne (aucune clé n'est renvoyée)
require __DIR__ . '/lib.php';
$cfg = gsd_config();
gsd_json([
    'ok' => true,
    'version' => GSD_VERSION,
    'php' => PHP_VERSION,
    'curl' => function_exists('curl_init'),
    'configuration_trouvee' => !empty($cfg),
    'mtn' => gsd_etat_operateur('mtn'),
    'airtel' => gsd_etat_operateur('airtel'),
]);
