# Notes projet ShaPop

## TODO avant mise en production

### APNs (Push Notifications)
- Mettre a jour les env vars sur Render :
  - `APNS_KEY_ID` → `F6X522J25Z`
  - `APNS_PRODUCTION` → `true` (quand on passe en TestFlight/App Store)
  - `APNS_PRIVATE_KEY` → nouvelle cle avec `\n` comme separateurs (pas `/`)
  - Supprimer `APNS_KEY_PATH`
- Actuellement en mode sandbox (builds Xcode uniquement)

### Stripe
- Passer la configuration Stripe en production (webhooks, cles, etc.)
