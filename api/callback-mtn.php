<?php
// Confirmation envoyée par MTN (X-Callback-Url). Le statut est ensuite re-vérifié auprès de MTN par verifier.php.
require __DIR__ . '/lib.php';
$in = json_decode(file_get_contents('php://input') ?: '', true);
$ext = is_array($in) ? (string) ($in['externalId'] ?? '') : '';
if ($ext !== '') {
    gsd_store(function (&$d) use ($ext) {
        foreach ($d as $ref => $p) if (($p['externalId'] ?? '') === $ext && $p['statut'] === 'en_cours') { $d[$ref]['notifie'] = date('c'); }
    });
}
http_response_code(200); echo 'OK';
