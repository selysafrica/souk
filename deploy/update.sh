#!/usr/bin/env bash
# Souk — mise à jour sur le serveur, depuis le dépôt cloné :
#   cd /chemin/du/depot && deploy/update.sh
# Récupère la dernière version de la branche suivie, reconstruit l'image et redémarre.
# La base SQLite est dans le volume « souk_souk_data » : elle n'est pas touchée.
set -euo pipefail

cd "$(dirname "$0")/.."
[[ -f .env ]] || { echo "Fichier .env manquant : cp .env.example .env, puis le compléter."; exit 1; }

if ! grep -qE '^ADMIN_PASSWORD=.+' .env; then
  echo "ADMIN_PASSWORD est vide dans .env : l'administration serait inaccessible."; exit 1
fi

echo "==> git pull"
git pull --ff-only

NETWORK=$(grep -E '^PROXY_NETWORK=' .env | cut -d= -f2- || true)
if grep -qE '^COMPOSE_FILE=.*proxy-network' .env && ! docker network inspect "${NETWORK:-selys}" >/dev/null 2>&1; then
  echo "Réseau Docker « ${NETWORK:-selys} » introuvable : vérifiez PROXY_NETWORK dans .env."; exit 1
fi
echo "==> Services : $(docker compose config --services | tr '\n' ' ')"

# Sauvegarde de la base avant de remplacer l'application (ignorée au premier déploiement).
if docker compose ps --status running --services 2>/dev/null | grep -qx app; then
  deploy/backup.sh || echo "Sauvegarde impossible, mise à jour poursuivie."
fi

echo "==> Construction et redémarrage ($(git rev-parse --short HEAD))"
docker compose up -d --build --remove-orphans
docker image prune -f >/dev/null

DOMAIN=$(grep -E '^APP_DOMAIN=' .env | cut -d= -f2-)
PORT=$(grep -E '^APP_PORT=' .env | cut -d= -f2-)
echo "==> Vérification"
for _ in $(seq 1 30); do
  if curl -fsS --max-time 5 "http://127.0.0.1:${PORT:-4310}/api/catalog" >/dev/null 2>&1 \
    && curl -fsS --max-time 5 "http://127.0.0.1:${PORT:-4310}/" >/dev/null 2>&1; then
    echo "En ligne : https://${DOMAIN}  (administration : https://${DOMAIN}/admin)"
    exit 0
  fi
  sleep 3
done
echo "L'application ne répond pas. Journaux :"
docker compose logs --tail 50 app
exit 1
