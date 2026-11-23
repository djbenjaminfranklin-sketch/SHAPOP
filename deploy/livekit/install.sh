#!/usr/bin/env bash
# =============================================================================
# ShaPop — installation de LiveKit auto-hébergé sur un serveur Hetzner neuf
# (Ubuntu 24.04 LTS). Script IDEMPOTENT : on peut le relancer sans risque.
#
# Usage (en root, sur le serveur, depuis ce dossier copié sur le serveur) :
#   sudo bash install.sh
#
# Ce qu'il fait :
#   1. mises à jour + mises à jour de sécurité automatiques
#   2. pare-feu (uniquement les ports exigés par LiveKit / TURN / RTMP)
#   3. Docker (dépôt officiel)
#   4. copie la configuration dans /opt/livekit (sans écraser une config déjà remplie)
#   5. service systemd : tout redémarre tout seul au démarrage du serveur
# =============================================================================
set -euo pipefail

INSTALL_DIR=/opt/livekit
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { printf '\n==> %s\n' "$*"; }

if [[ $EUID -ne 0 ]]; then
  echo "Lancer en root : sudo bash install.sh" >&2
  exit 1
fi

# --- 1. Système à jour + mises à jour de sécurité automatiques ----------------
log "Mise à jour du système"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg ufw unattended-upgrades fail2ban

log "Mises à jour de sécurité automatiques"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
# Redémarrage automatique la nuit si une mise à jour du noyau l'exige (4 h, heure creuse)
cat > /etc/apt/apt.conf.d/52shapop-unattended <<'EOF'
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "04:00";
EOF
systemctl enable --now unattended-upgrades fail2ban

# --- 2. Pare-feu : ports exacts requis ----------------------------------------
log "Pare-feu"
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp            comment 'SSH'
ufw limit 22/tcp
ufw allow 80/tcp            comment 'Let us Encrypt (emission des certificats)'
ufw allow 443/tcp           comment 'HTTPS LiveKit + TURN/TLS (Caddy)'
ufw allow 7881/tcp          comment 'WebRTC sur TCP'
ufw allow 3478/udp          comment 'TURN/UDP'
ufw allow 50000:60000/udp   comment 'WebRTC sur UDP (media)'
ufw allow 1935/tcp          comment 'RTMP Ingress (OBS)'
# Non ouverts volontairement : 6379 (Redis), 7880 (LiveKit, derriere Caddy),
# 5349 (TURN/TLS, derriere Caddy), 8080/7885 (WHIP non utilise), 9090-9092 (local).
ufw --force enable

# --- 3. Docker (dépôt officiel) -----------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  log "Installation de Docker"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
else
  log "Docker déjà installé"
fi
systemctl enable --now docker

# Journaux Docker limités (sinon le disque se remplit en quelques semaines)
if [[ ! -f /etc/docker/daemon.json ]]; then
  cat > /etc/docker/daemon.json <<'EOF'
{ "log-driver": "json-file", "log-opts": { "max-size": "50m", "max-file": "3" } }
EOF
  systemctl restart docker
fi

# --- Réglages réseau recommandés pour WebRTC (gros tampons UDP) ---------------
cat > /etc/sysctl.d/90-livekit.conf <<'EOF'
net.core.rmem_max = 5000000
net.core.wmem_max = 5000000
EOF
sysctl --system >/dev/null

# --- 4. Configuration dans /opt/livekit ---------------------------------------
log "Copie de la configuration dans ${INSTALL_DIR}"
mkdir -p "${INSTALL_DIR}/caddy_data"
for f in docker-compose.yml caddy.yaml redis.conf livekit.yaml egress.yaml ingress.yaml; do
  if [[ -f "${INSTALL_DIR}/${f}" ]] && ! grep -q '<A_REMPLIR' "${INSTALL_DIR}/${f}"; then
    echo "  ${f} : déjà rempli, conservé"
  else
    install -m 0640 "${SRC_DIR}/${f}" "${INSTALL_DIR}/${f}"
    echo "  ${f} : copié"
  fi
done
# docker-compose.yml, caddy.yaml et redis.conf ne contiennent pas de secret : toujours à jour
for f in docker-compose.yml caddy.yaml redis.conf; do
  install -m 0644 "${SRC_DIR}/${f}" "${INSTALL_DIR}/${f}"
done

# --- 5. Démarrage automatique au boot (systemd) -------------------------------
log "Service systemd livekit-shapop"
cat > /etc/systemd/system/livekit-shapop.service <<EOF
[Unit]
Description=ShaPop LiveKit (docker compose)
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${INSTALL_DIR}
ExecStart=/usr/bin/docker compose up -d --remove-orphans
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable livekit-shapop.service

# --- Démarrage, seulement si la configuration est remplie ---------------------
if grep -l '<A_REMPLIR' "${INSTALL_DIR}"/*.yaml >/dev/null 2>&1; then
  log "À FAIRE : remplir les <A_REMPLIR> dans ces fichiers, puis relancer ce script :"
  grep -l '<A_REMPLIR' "${INSTALL_DIR}"/*.yaml
  exit 0
fi

log "Démarrage de LiveKit"
systemctl restart livekit-shapop.service
sleep 5
docker compose -f "${INSTALL_DIR}/docker-compose.yml" ps

log "Vérification : https://live.shapop.app doit répondre OK (après émission du certificat, ~1 min)"
curl -fsS --max-time 10 http://localhost:7880 && echo " <- LiveKit répond en local" || echo "LiveKit ne répond pas encore : docker compose -f ${INSTALL_DIR}/docker-compose.yml logs livekit"
