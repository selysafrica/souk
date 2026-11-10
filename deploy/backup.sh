#!/usr/bin/env bash
# Souk — sauvegarde de la base SQLite, application en marche :
#   deploy/backup.sh            → backups/souk-AAAAMMJJ-HHMMSS.db
# VACUUM INTO produit une copie cohérente même pendant les écritures.
# Garde les 14 sauvegardes les plus récentes.
# Restauration : docker compose stop app
#                docker compose cp backups/<fichier>.db app:/app/data/souk.db
#                docker compose start app
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p backups
NAME="souk-$(date +%Y%m%d-%H%M%S).db"

docker compose exec -T app node -e "
  const { DatabaseSync } = process.getBuiltinModule('node:sqlite');
  new DatabaseSync(process.env.SOUK_DB).exec(\"VACUUM INTO '/tmp/${NAME}'\");
"
docker compose cp "app:/tmp/${NAME}" "backups/${NAME}"
docker compose exec -T app rm -f "/tmp/${NAME}"
echo "==> Sauvegarde : backups/${NAME}"

ls -1t backups/souk-*.db 2>/dev/null | tail -n +15 | xargs -r rm -f
