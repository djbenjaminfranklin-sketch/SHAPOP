# ShaPop Android (com.shapop.app)

Application Capacitor 8 : la même app web (`client/src`) que l'iPhone, dans une WebView Android.

## Compiler

```bash
cd client
npx vite build && npx cap sync android
cd android
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"   # Java 21
./gradlew assembleDebug        # APK de test : app/build/outputs/apk/debug/app-debug.apk
```

Version de store (AAB signé) — **seulement avec l'accord du fondateur** :

```bash
./gradlew bundleRelease        # app/build/outputs/bundle/release/app-release.aab
```

Avant chaque envoi sur Google Play, augmenter `versionCode` (et `versionName`) dans `app/build.gradle`.

## Réglages en place

- `minSdk 24` (Android 7), `targetSdk 36` / `compileSdk 36` (Android 16) : exigence Google Play
  depuis le 31/08/2026 pour les nouvelles apps et mises à jour.
- Bord à bord (obligatoire dès Android 15) : `SystemBars` de Capacitor fournit les marges
  (`env(safe-area-inset-*)` et `--safe-area-inset-*`) ; les icônes des barres suivent le thème
  de l'app (`syncAndroidSystemBars` dans `src/lib/nativePlatform.ts`).
- Pas de HTTP en clair (`network_security_config.xml`), pas de sauvegarde cloud des données.
- Permissions : caméra, micro (+ réglages audio) pour les directs, notifications (Android 13+),
  position **approximative** seulement (ville / pays). Photos : sélecteur système, aucune
  permission de stockage.
- Lien de retour de connexion Google / Apple : `com.shapop.app://login-callback`.
- Bouton retour : écran précédent ; sur le premier écran, l'app passe en arrière-plan.
- Le service worker (mode hors ligne du site) n'est **pas** utilisé dans l'app.
- Apple Pay masqué sur Android ; le paiement se fait par carte (Stripe dans la WebView).
- Langues des textes Android : en, fr, es, ru, he (`values-iw` et `values-he`).

## Signature (clé d'envoi Google Play)

- Fichier : `app/shapop-upload.keystore` (ignoré par git), alias `shapop-upload`, RSA 2048, 10 000 jours.
- Mot de passe : trousseau macOS, élément « ShaPop Android upload keystore ».
- `android/keystore.properties` (ignoré par git) :

  ```properties
  storeFile=shapop-upload.keystore
  keyAlias=shapop-upload
  storePassword=…
  keyPassword=…
  ```

  ou variables d'environnement `SHAPOP_UPLOAD_STORE_FILE`, `SHAPOP_UPLOAD_STORE_PASSWORD`,
  `SHAPOP_UPLOAD_KEY_ALIAS`, `SHAPOP_UPLOAD_KEY_PASSWORD`. Sans elles, la release n'est pas signée
  (jamais avec la clé de debug).
- Sauvegarde : `whatfor/cles-signature/` (avec une notice, sans le mot de passe).
- Empreinte SHA-256 de la clé d'envoi :
  `13:F7:31:8D:23:78:77:2E:61:CE:3E:68:4C:61:7E:C2:03:C6:66:16:64:2A:8B:F0:1F:8B:81:FC:F0:88:57:0F`

## Notifications push : ce qu'il reste à créer (compte Google du fondateur)

Tant que ce n'est pas fait, l'app Android fonctionne mais **ne demande pas** la permission de
notifications (sinon elle planterait : Firebase non initialisé) et le serveur ignore les jetons Android.

1. **Projet Firebase** : <https://console.firebase.google.com> → « Ajouter un projet » (ex. `ShaPop`),
   Google Analytics facultatif (non).
2. **App Android** dans ce projet : nom de paquet `com.shapop.app`, surnom « ShaPop Android ».
   Empreinte SHA-1 facultative (pas nécessaire pour FCM).
3. Télécharger **`google-services.json`** et le poser dans `client/android/app/google-services.json`
   (déjà ignoré par git). Recompiler : le plugin Google Services s'active tout seul et
   `ShaPopNative.pushAvailable()` renvoie vrai.
4. **Compte de service pour le serveur** : Paramètres du projet → Comptes de service →
   « Générer une nouvelle clé privée » (fichier JSON). L'API « Firebase Cloud Messaging API (V1) »
   doit être activée (Paramètres → Cloud Messaging).
5. **Variables sur Render** (service API) :
   - `FCM_PROJECT_ID` = l'identifiant du projet (ex. `shapop-1a2b3`)
   - `FCM_SERVICE_ACCOUNT_JSON` = le contenu du fichier JSON (tel quel, ou encodé en base64)

   Au démarrage, le serveur écrit « FCM (Android) enabled for project … ». Les envois passent par
   `sendPushToDevice` (`server/src/utils.ts`) : APNs pour les appareils `ios`, FCM pour `android`
   (`server/src/services/push.ts`) ; un jeton Android périmé est supprimé automatiquement.

Les notifications Android utilisent le canal `shapop_default` (« Messages, commandes et lives »,
traduit dans la langue du téléphone) et la petite icône `ic_stat_shapop`.

## Fiche Google Play : à préparer

- Compte développeur Google Play (organisation) et création de l'app `com.shapop.app`.
- Fiche : titre (30 caractères max), description courte (80) et longue, dans les 5 langues ;
  icône 512×512 ; image de présentation 1024×500 ; captures téléphone (2 minimum).
- Catégorie « Shopping », coordonnées, URL de la politique de confidentialité.
- Questionnaire « Sécurité des données » : compte (e-mail, nom), position approximative,
  photos/vidéos, audio (directs), achats (paiement traité par Stripe), messages, identifiants
  d'appareil (jeton de notification).
- Classification du contenu, public cible (pas destiné aux enfants), accès à l'app pour l'examen
  (compte de démonstration dans les notes privées).
- « Signature d'application Play » : envoyer le premier AAB signé avec la clé d'envoi ci-dessus.
- Nouveau compte personnel : test fermé obligatoire (12 testeurs pendant 14 jours) avant la
  production ; un compte d'organisation n'y est pas soumis.
