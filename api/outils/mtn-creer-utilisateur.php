<?php
// =====================================================================
// MODE TEST MTN : crée l'API User et l'API Key à partir de la clé d'abonnement.
// Utilisation (une seule fois) :  https://votre-site/api/outils/mtn-creer-utilisateur.php?secret=VOTRE_SECRET
// où VOTRE_SECRET = 'secret_installation' du fichier de configuration.
// Recopiez ensuite api_user et api_key dans la configuration. En production,
// ces identifiants sont fournis par MTN (ce script ne sert pas).
// =====================================================================
require dirname(__DIR__) . '/lib.php';
$cfg = gsd_config();
$secret = (string) ($cfg['secret_installation'] ?? '');
if (strlen($secret) < 12 || !hash_equals($secret, (string) ($_GET['secret'] ?? ''))) gsd_erreur('Accès refusé : secret d\'installation absent ou incorrect (12 caractères minimum).', 403);
$o = $cfg['mtn'] ?? [];
if (empty($o['subscription_key'])) gsd_erreur('Renseignez d\'abord mtn.subscription_key dans la configuration.');
if (($o['environnement'] ?? 'sandbox') !== 'sandbox') gsd_erreur('Cet outil ne sert qu\'en mode test (sandbox).');
$base = mtn_base($o);
$user = gsd_uuid();
$r = gsd_http('POST', $base . '/v1_0/apiuser', ['X-Reference-Id' => $user, 'Ocp-Apim-Subscription-Key' => $o['subscription_key'], 'Content-Type' => 'application/json'],
    ['providerCallbackHost' => parse_url($cfg['url_publique'] ?? 'https://localhost', PHP_URL_HOST) ?: 'localhost']);
if ($r['code'] !== 201) gsd_erreur('Création de l\'API User refusée par MTN (code ' . $r['code'] . '). Vérifiez la clé d\'abonnement.', 502);
$k = gsd_http('POST', $base . '/v1_0/apiuser/' . $user . '/apikey', ['Ocp-Apim-Subscription-Key' => $o['subscription_key'], 'Content-Length' => '0'], '');
if ($k['code'] !== 201 || empty($k['json']['apiKey'])) gsd_erreur('Création de l\'API Key refusée par MTN (code ' . $k['code'] . ').', 502);
gsd_json(['ok' => true, 'message' => 'Recopiez ces deux valeurs dans la configuration (mtn.api_user et mtn.api_key), puis supprimez ou gardez secret ce lien.', 'api_user' => $user, 'api_key' => $k['json']['apiKey']]);
