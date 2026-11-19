<?php
// Confirmation envoyée par Airtel. Le statut est ensuite re-vérifié auprès d'Airtel par verifier.php.
require __DIR__ . '/lib.php';
$in = json_decode(file_get_contents('php://input') ?: '', true);
$id = is_array($in) ? (string) ($in['transaction']['id'] ?? '') : '';
if ($id !== '') gsd_store(function (&$d) use ($id) { if (isset($d[$id])) $d[$id]['notifie'] = date('c'); });
http_response_code(200); echo 'OK';
