# LiveKit auto-hébergé pour ShaPop (Hetzner)

Dossier prêt pour le jour du lancement : remplacer LiveKit Cloud par notre propre serveur
LiveKit chez Hetzner (Allemagne), **sans changer l'application** (l'app reçoit l'adresse du
serveur vidéo depuis l'API ShaPop : il suffit de changer 3 variables sur Render).

Rien n'est loué tant que ce guide n'est pas suivi.

## Contenu

| Fichier | Rôle |
|---|---|
| `docker-compose.yml` | Les 5 services : Caddy (certificats + TURN/TLS), LiveKit, Redis, Egress (enregistrements), Ingress (OBS/RTMP). Versions épinglées. |
| `caddy.yaml` | Certificats Let's Encrypt automatiques pour `live.shapop.app` et `turn.shapop.app`. |
| `livekit.yaml` | Serveur LiveKit (ports, TURN, clés, webhook vers l'API ShaPop). **À remplir.** |
| `egress.yaml` | Enregistrements. La destination (Cloudflare R2) est envoyée par l'API à chaque direct : pas de clé R2 ici. **À remplir.** |
| `ingress.yaml` | Diffusion depuis OBS (RTMP). **À remplir.** |
| `redis.conf` | Redis local, jamais exposé. |
| `install.sh` | Installe tout (pare-feu, mises à jour auto, Docker, démarrage au boot). Relançable sans risque. |

La structure suit le générateur officiel de LiveKit (`docker run --rm -it -v$PWD:/output livekit/generate`),
complété par Egress et Ingress.

## Jour J, pas à pas

### 1. Louer le serveur (≈ 10 min, Hetzner Robot / Cloud Console)

- **Recommandé : serveur dédié AX42** (AMD Ryzen 7 PRO 8700GE 8 cœurs, 64 Go, 1 Gbit/s garanti,
  trafic illimité) à **Falkenstein (FSN1)**. Prix relevé le 23/11/2026 : **99 € HT/mois + 49 € HT
  de mise en service**, sans engagement. Système : **Ubuntu 24.04 LTS**.
- Alternative plus légère pour démarrer : serveur cloud **CCX23** (vCPU dédiés) à Nuremberg ou
  Falkenstein. Prix à vérifier sur hetzner.com/cloud (offres dédiées « à partir de 36,99 € HT/mois »
  au 23/11/2026) ; trafic inclus limité, au-delà facturé au To.
- Ajouter sa clé SSH à la commande. Noter l'**adresse IPv4** du serveur.

### 2. DNS chez Gandi (≈ 5 min + propagation)

Dans la zone DNS de `shapop.app` :

| Type | Nom | Valeur | TTL |
|---|---|---|---|
| A | `live` | IPv4 du serveur | 300 |
| A | `turn` | IPv4 du serveur | 300 |

(Optionnel : enregistrements AAAA avec l'IPv6 du serveur.) Vérifier : `dig +short live.shapop.app`
doit renvoyer l'IP du serveur **avant** l'étape 4 (sinon Let's Encrypt échoue).

### 3. Créer la clé API du serveur

Sur le Mac :

```bash
echo "API$(openssl rand -hex 8)"     # LIVEKIT_API_KEY
openssl rand -base64 32               # LIVEKIT_API_SECRET
```

Ranger les deux valeurs dans le coffre (jamais dans Git).

### 4. Installer

```bash
scp -r deploy/livekit root@IP_DU_SERVEUR:/root/livekit
ssh root@IP_DU_SERVEUR
cd /root/livekit && bash install.sh        # 1er passage : installe et copie la config
nano /opt/livekit/livekit.yaml             # remplir les <A_REMPLIR>
nano /opt/livekit/egress.yaml
nano /opt/livekit/ingress.yaml
bash install.sh                            # 2e passage : démarre tout
```

`<A_REMPLIR_URL_API_RENDER>` = adresse publique de l'API ShaPop sur Render (celle du service
`shapop-api`), sans `/` final.

Vérifier :
- `curl https://live.shapop.app` → répond `OK` ;
- `docker compose -f /opt/livekit/docker-compose.yml ps` → 5 services « running » ;
- test en ligne : https://livekit.io/connection-test (URL `wss://live.shapop.app` + un jeton).

### 5. Basculer l'application (Render, service `shapop-api`)

Changer 3 variables d'environnement :

| Variable | Nouvelle valeur |
|---|---|
| `LIVEKIT_URL` | `wss://live.shapop.app` |
| `LIVEKIT_API_KEY` | clé créée à l'étape 3 |
| `LIVEKIT_API_SECRET` | secret créé à l'étape 3 |

Render redéploie tout seul (quelques minutes). Les variables d'enregistrement (`RECORDING_S3_*`,
`RECORDING_PUBLIC_BASE_URL`) ne changent pas : les enregistrements continuent d'aller dans R2.
Faire un direct de test sur 2 téléphones (un en Wi-Fi, un en 4G) + un essai OBS.

**Faire la bascule hors des heures de direct** : les directs en cours sont coupés.

### Revenir à LiveKit Cloud en cas de problème

1. **Garder le projet LiveKit Cloud** (offre gratuite « Build ») et ses clés dans le coffre :
   ne jamais le supprimer.
2. Sur Render, remettre les 3 anciennes valeurs (`LIVEKIT_URL` en `wss://…livekit.cloud`,
   clé et secret Cloud). C'est la seule manipulation : environ 1 minute de saisie, puis le
   redéploiement automatique de Render (quelques minutes). Aucune mise à jour de l'app.
3. Le serveur Hetzner peut rester allumé pour enquêter (`docker compose logs livekit`).

## Ports ouverts (pare-feu `ufw`, posés par `install.sh`)

| Port | Usage |
|---|---|
| 22/tcp | SSH (limité contre les attaques) |
| 80/tcp | Émission des certificats Let's Encrypt |
| 443/tcp | HTTPS LiveKit + TURN/TLS (Caddy) |
| 7881/tcp | WebRTC sur TCP |
| 3478/udp | TURN/UDP |
| 50000-60000/udp | WebRTC (flux audio/vidéo) |
| 1935/tcp | RTMP (OBS) |

Fermés : Redis (6379), LiveKit brut (7880), WHIP (8080/7885, non utilisé), ports de santé locaux.
Si le serveur est un **serveur Cloud**, ne pas ajouter de pare-feu Hetzner qui contredirait cette liste
(ou y recopier exactement les mêmes ports).

## Surveillance minimale (gratuite)

- **UptimeRobot** (ou Better Stack), sonde HTTP(S) toutes les 5 min sur `https://live.shapop.app`
  (réponse attendue : `OK`), alerte par e-mail + SMS/app.
- 2e sonde « port » sur `live.shapop.app:1935` (OBS).
- Hetzner Robot : activer les alertes de « server monitoring » (ping) dans le compte.
- En cas d'alerte : `ssh` → `systemctl restart livekit-shapop` ; si ça ne repart pas, bascule
  vers LiveKit Cloud (ci-dessus).

Mises à jour : les correctifs de sécurité d'Ubuntu s'installent seuls (redémarrage auto à 4 h si
nécessaire, tout repart seul grâce au service `livekit-shapop`). Les versions LiveKit sont
épinglées dans `docker-compose.yml` : les monter à la main, hors des heures de direct, après lecture
des notes de version.

## Mise à l'échelle

La limite d'un AX42 est le **débit sortant (1 Gbit/s)**, bien avant le processeur :

- un spectateur sur téléphone reçoit en général 0,5 à 1,5 Mbit/s (LiveKit adapte la qualité) ;
- en gardant 20 % de marge : **environ 500 à 600 spectateurs simultanés au total** (tous directs
  confondus) sur un serveur.

Ajouter un **2e serveur à partir d'environ 400 spectateurs simultanés réguliers** (avant d'atteindre
la limite). LiveKit répartit alors les salles entre les serveurs à condition qu'ils partagent le
même Redis : relier les serveurs par un réseau privé Hetzner (vSwitch), passer Redis en écoute
sur l'IP privée avec un mot de passe (`requirepass`) et mettre la même adresse Redis dans les
`livekit.yaml` / `egress.yaml` / `ingress.yaml` des deux serveurs.

Enregistrements : chaque enregistrement de vendeur (720p) consomme environ 1 à 2 cœurs.
`egress.yaml` refuse un nouvel enregistrement au-delà de 80 % de processeur pour protéger les
directs. **Au-delà de ~4 directs enregistrés en même temps**, ajouter un serveur dédié aux
enregistrements (même `docker-compose.yml` avec seulement `egress`).

## Coût mensuel attendu

| Poste | Coût |
|---|---|
| Serveur AX42 | 99 € HT/mois (+ 49 € une fois) |
| Trafic | inclus (illimité) |
| LiveKit (logiciel libre) | 0 € |
| Enregistrements Cloudflare R2 | ~0,015 $/Go/mois stockés, lecture gratuite (pas de frais de sortie) |
| Surveillance (UptimeRobot gratuit) | 0 € |
| **Total** | **≈ 100 €/mois**, quel que soit le nombre d'heures de direct jusqu'à ~500 spectateurs simultanés |

Pour comparaison, LiveKit Cloud (offre Ship, au-delà des quotas inclus) facture environ
0,0005 $/minute de connexion + 0,12 $/Go envoyé : un seul direct d'1 h à 300 spectateurs coûte de
environ 25 à 35 $. Le serveur est rentabilisé dès quelques directs par mois.
