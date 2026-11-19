<?php
// =====================================================================
// Paiement en ligne — bibliothèque commune (MTN MoMo Collection, Airtel Money)
//
// Les clés ne sont JAMAIS dans ce dépôt. Elles sont lues dans un fichier
// de configuration placé sur le serveur (voir config.exemple.php) :
//   1. le chemin indiqué par la variable d'environnement GSD_PAIEMENT_CONFIG
//   2. ../../config-paiement.php  (au-dessus du dossier du site : recommandé)
//   3. api/private/config.php     (dossier protégé par .htaccess)
// =====================================================================

declare(strict_types=1);

const GSD_VERSION = '1.0';

function gsd_config(): array {
    static $cfg = null;
    if ($cfg !== null) return $cfg;
    $candidats = array_filter([
        getenv('GSD_PAIEMENT_CONFIG') ?: null,
        dirname(__DIR__, 2) . '/config-paiement.php',
        __DIR__ . '/private/config.php',
    ]);
    foreach ($candidats as $f) {
        if (is_file($f)) { $c = require $f; if (is_array($c)) { $cfg = $c; $cfg['_fichier'] = $f; return $cfg; } }
    }
    $cfg = [];
    return $cfg;
}

function gsd_json($data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function gsd_erreur(string $message, int $code = 400): void { gsd_json(['ok' => false, 'erreur' => $message], $code); }

function gsd_uuid(): string {
    $b = random_bytes(16);
    $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
    $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
}

// Appel HTTP vers un opérateur
function gsd_http(string $methode, string $url, array $entetes = [], $corps = null, int $timeout = 30): array {
    $ch = curl_init($url);
    $h = [];
    foreach ($entetes as $k => $v) $h[] = $k . ': ' . $v;
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $methode,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $h,
        CURLOPT_TIMEOUT => $timeout,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    if ($corps !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, is_string($corps) ? $corps : json_encode($corps));
    $reponse = curl_exec($ch);
    $err = curl_error($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    $json = is_string($reponse) && $reponse !== '' ? json_decode($reponse, true) : null;
    return ['code' => $code, 'corps' => $reponse, 'json' => $json, 'erreur' => $err];
}

// ---------------------------------------------------------------
// Stockage des paiements en cours (fichier JSON verrouillé)
// ---------------------------------------------------------------
function gsd_dossier_prive(): string {
    $cfg = gsd_config();
    $d = $cfg['dossier_donnees'] ?? (__DIR__ . '/private');
    if (!is_dir($d)) @mkdir($d, 0750, true);
    return $d;
}
function gsd_store(callable $fn) {
    $f = gsd_dossier_prive() . '/paiements.json';
    $fp = fopen($f, 'c+');
    if (!$fp) gsd_erreur('Stockage indisponible sur le serveur.', 500);
    flock($fp, LOCK_EX);
    $txt = stream_get_contents($fp);
    $data = $txt ? (json_decode($txt, true) ?: []) : [];
    $res = $fn($data);
    ftruncate($fp, 0); rewind($fp);
    fwrite($fp, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    fflush($fp); flock($fp, LOCK_UN); fclose($fp);
    return $res;
}

// Limite anti-abus : nombre de demandes par clé sur une période
function gsd_limite(string $cle, int $max, int $secondes): bool {
    $f = gsd_dossier_prive() . '/limites.json';
    $fp = fopen($f, 'c+'); if (!$fp) return true;
    flock($fp, LOCK_EX);
    $txt = stream_get_contents($fp);
    $data = $txt ? (json_decode($txt, true) ?: []) : [];
    $now = time();
    foreach ($data as $k => $lst) { $data[$k] = array_values(array_filter($lst, fn($t) => $t > $now - 3600)); if (!$data[$k]) unset($data[$k]); }
    $recent = array_filter($data[$cle] ?? [], fn($t) => $t > $now - $secondes);
    $ok = count($recent) < $max;
    if ($ok) $data[$cle][] = $now;
    ftruncate($fp, 0); rewind($fp); fwrite($fp, json_encode($data)); fflush($fp); flock($fp, LOCK_UN); fclose($fp);
    return $ok;
}

// ---------------------------------------------------------------
// Numéros de téléphone (Congo : indicatif 242, numéros à 9 chiffres)
// ---------------------------------------------------------------
function gsd_tel_local(string $t, string $indicatif): string {
    $d = preg_replace('/\D/', '', $t);
    if (strpos($d, '00' . $indicatif) === 0) $d = substr($d, strlen($indicatif) + 2);
    elseif (strpos($d, $indicatif) === 0 && strlen($d) > 9) $d = substr($d, strlen($indicatif));
    return $d;
}

// ---------------------------------------------------------------
// Opérateurs
// ---------------------------------------------------------------
function gsd_operateur(string $id): ?array {
    $cfg = gsd_config();
    $o = $cfg[$id] ?? null;
    if (!is_array($o) || empty($o['actif'])) return null;
    return $o;
}
function gsd_etat_operateur(string $id): array {
    $cfg = gsd_config(); $o = $cfg[$id] ?? [];
    $requis = $id === 'mtn' ? ['subscription_key', 'api_user', 'api_key'] : ['client_id', 'client_secret'];
    $manque = array_values(array_filter($requis, fn($k) => empty($o[$k])));
    return ['actif' => !empty($o['actif']), 'configure' => !$manque, 'manquant' => $manque, 'environnement' => $o['environnement'] ?? 'sandbox', 'devise' => $o['devise'] ?? null];
}

// MTN MoMo — produit Collection
// Documentation : https://momodeveloper.mtn.com (Collection : token, requesttopay)
function mtn_base(array $o): string {
    return rtrim($o['url'] ?? (($o['environnement'] ?? 'sandbox') === 'sandbox' ? 'https://sandbox.momodeveloper.mtn.com' : 'https://proxy.momoapi.mtn.com'), '/');
}
function mtn_env(array $o): string { return ($o['environnement'] ?? 'sandbox') === 'sandbox' ? 'sandbox' : ($o['target_environment'] ?? 'mtncongo'); }
function mtn_token(array $o): string {
    $r = gsd_http('POST', mtn_base($o) . '/collection/token/', [
        'Authorization' => 'Basic ' . base64_encode($o['api_user'] . ':' . $o['api_key']),
        'Ocp-Apim-Subscription-Key' => $o['subscription_key'],
        'Content-Length' => '0',
    ], '');
    if ($r['code'] !== 200 || empty($r['json']['access_token'])) throw new RuntimeException('MTN : authentification refusée (code ' . $r['code'] . '). Vérifiez les clés.');
    return $r['json']['access_token'];
}
function mtn_demander(array $o, string $ref, float $montant, string $tel, string $externalId, string $message): void {
    $cfg = gsd_config();
    $ent = [
        'Authorization' => 'Bearer ' . mtn_token($o),
        'X-Reference-Id' => $ref,
        'X-Target-Environment' => mtn_env($o),
        'Ocp-Apim-Subscription-Key' => $o['subscription_key'],
        'Content-Type' => 'application/json',
    ];
    if (!empty($cfg['url_publique'])) $ent['X-Callback-Url'] = rtrim($cfg['url_publique'], '/') . '/api/callback-mtn.php';
    $indic = $cfg['indicatif'] ?? '242';
    $r = gsd_http('POST', mtn_base($o) . '/collection/v1_0/requesttopay', $ent, [
        'amount' => (string) round($montant),
        'currency' => $o['devise'] ?? (mtn_env($o) === 'sandbox' ? 'EUR' : 'XAF'),
        'externalId' => $externalId,
        'payer' => ['partyIdType' => 'MSISDN', 'partyId' => $indic . gsd_tel_local($tel, $indic)],
        'payerMessage' => mb_substr($message, 0, 160),
        'payeeNote' => mb_substr($message, 0, 160),
    ]);
    if ($r['code'] !== 202) throw new RuntimeException('MTN : demande de paiement refusée (code ' . $r['code'] . ').');
}
function mtn_statut(array $o, string $ref): array {
    $r = gsd_http('GET', mtn_base($o) . '/collection/v1_0/requesttopay/' . rawurlencode($ref), [
        'Authorization' => 'Bearer ' . mtn_token($o),
        'X-Target-Environment' => mtn_env($o),
        'Ocp-Apim-Subscription-Key' => $o['subscription_key'],
    ]);
    if ($r['code'] !== 200 || !is_array($r['json'])) return ['statut' => 'en_cours'];
    $s = strtoupper((string) ($r['json']['status'] ?? ''));
    $map = ['SUCCESSFUL' => 'reussi', 'FAILED' => 'echec', 'REJECTED' => 'echec', 'TIMEOUT' => 'echec', 'PENDING' => 'en_cours'];
    return ['statut' => $map[$s] ?? 'en_cours', 'operateur_tx' => $r['json']['financialTransactionId'] ?? null, 'raison' => $r['json']['reason'] ?? null];
}

// Airtel Money — Collection (paiement marchand)
// Documentation : https://developers.airtel.africa (auth/oauth2/token, merchant/v1/payments)
function airtel_base(array $o): string {
    return rtrim($o['url'] ?? (($o['environnement'] ?? 'sandbox') === 'sandbox' ? 'https://openapiuat.airtel.africa' : 'https://openapi.airtel.africa'), '/');
}
function airtel_token(array $o): string {
    $r = gsd_http('POST', airtel_base($o) . '/auth/oauth2/token', ['Content-Type' => 'application/json', 'Accept' => '*/*'],
        ['client_id' => $o['client_id'], 'client_secret' => $o['client_secret'], 'grant_type' => 'client_credentials']);
    if ($r['code'] !== 200 || empty($r['json']['access_token'])) throw new RuntimeException('Airtel : authentification refusée (code ' . $r['code'] . '). Vérifiez les clés.');
    return $r['json']['access_token'];
}
function airtel_entetes(array $o): array {
    return ['Authorization' => 'Bearer ' . airtel_token($o), 'Content-Type' => 'application/json', 'Accept' => '*/*',
        'X-Country' => $o['pays'] ?? 'CG', 'X-Currency' => $o['devise'] ?? 'XAF'];
}
function airtel_demander(array $o, string $ref, float $montant, string $tel, string $externalId): void {
    $cfg = gsd_config(); $indic = $cfg['indicatif'] ?? '242';
    $r = gsd_http('POST', airtel_base($o) . '/merchant/v1/payments/', airtel_entetes($o), [
        'reference' => mb_substr($externalId, 0, 64),
        'subscriber' => ['country' => $o['pays'] ?? 'CG', 'currency' => $o['devise'] ?? 'XAF', 'msisdn' => !empty($o['retirer_zero']) ? ltrim(gsd_tel_local($tel, $indic), '0') : gsd_tel_local($tel, $indic)],
        'transaction' => ['amount' => round($montant), 'country' => $o['pays'] ?? 'CG', 'currency' => $o['devise'] ?? 'XAF', 'id' => $ref],
    ]);
    $ok = $r['code'] === 200 && (($r['json']['status']['success'] ?? false) === true || ($r['json']['status']['code'] ?? '') === '200');
    if (!$ok) throw new RuntimeException('Airtel : demande de paiement refusée (code ' . $r['code'] . ').');
}
function airtel_statut(array $o, string $ref): array {
    $r = gsd_http('GET', airtel_base($o) . '/standard/v1/payments/' . rawurlencode($ref), airtel_entetes($o));
    $t = $r['json']['data']['transaction'] ?? null;
    if ($r['code'] !== 200 || !is_array($t)) return ['statut' => 'en_cours'];
    $s = strtoupper((string) ($t['status'] ?? ''));
    $map = ['TS' => 'reussi', 'TF' => 'echec', 'TE' => 'echec', 'TIP' => 'en_cours', 'TA' => 'en_cours'];
    return ['statut' => $map[$s] ?? 'en_cours', 'operateur_tx' => $t['airtel_money_id'] ?? ($t['id'] ?? null), 'raison' => $t['message'] ?? null];
}
