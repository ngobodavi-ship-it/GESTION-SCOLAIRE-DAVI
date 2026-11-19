<?php
// =====================================================================
// MODÈLE de configuration du paiement en ligne.
// 1. Copiez ce fichier sous le nom  config-paiement.php
// 2. Placez-le AU-DESSUS du dossier du site sur le serveur LWS (recommandé),
//    ou, à défaut, dans  api/private/config.php  (dossier protégé).
// 3. Remplissez les clés obtenues sur les portails développeur.
// Ne mettez JAMAIS ce fichier rempli sur GitHub.
// =====================================================================
return [
    // Adresse publique du site (pour les confirmations envoyées par les opérateurs)
    'url_publique' => 'https://www.votre-ecole.cg',
    'indicatif'    => '242',            // Congo

    // Secret pour les outils d'installation (api/outils/...) : choisissez une phrase longue
    'secret_installation' => '',

    'mtn' => [
        'actif'            => false,     // true quand les clés sont renseignées
        'environnement'    => 'sandbox', // 'sandbox' (test) ou 'production'
        'target_environment' => 'mtncongo', // en production (à confirmer avec MTN)
        'devise'           => 'EUR',     // le mode test MTN n'accepte que EUR ; en production : XAF
        'subscription_key' => '',        // Portail MTN > Profile > Subscriptions > Collection (Primary key)
        'api_user'         => '',        // créé avec api/outils/mtn-creer-utilisateur.php (test) ou fourni par MTN (production)
        'api_key'          => '',
    ],

    'airtel' => [
        'actif'         => false,
        'environnement' => 'sandbox',    // 'sandbox' (openapiuat) ou 'production'
        'pays'          => 'CG',
        'devise'        => 'XAF',
        'client_id'     => '',           // Portail Airtel > My Apps > votre application
        'client_secret' => '',
        'retirer_zero'  => false,        // true si Airtel demande le numéro sans le 0 initial
    ],
];
