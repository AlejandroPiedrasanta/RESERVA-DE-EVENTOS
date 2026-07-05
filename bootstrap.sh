#!/usr/bin/env bash
# Cinema Productions — bootstrap.sh v2 (Emergent-aware, fast, parallel)
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"
t0=$(date +%s)

# 1) backend/.env (idempotente)
[ -f backend/.env ] || printf 'MONGO_URL="mongodb://localhost:27017"\nDB_NAME="reserva_eventos"\nCORS_ORIGINS="*"\n' > backend/.env

# 2) frontend/.env SIEMPRE regenerado con URL externa
BACKEND_URL="${preview_endpoint:-http://localhost:8001}"
cat > frontend/.env <<EOF
REACT_APP_BACKEND_URL=${BACKEND_URL}
WDS_SOCKET_PORT=443
EOF

# 3) node_modules cache-aware (solo limpiar si package.json cambió o está corrupto)
NEED_INSTALL=1
if [ -d frontend/node_modules ] && [ -f frontend/.pkg_hash ]; then
  CUR=$(sha256sum frontend/package.json 2>/dev/null | cut -c1-16)
  OLD=$(cat frontend/.pkg_hash 2>/dev/null || echo none)
  [ "$CUR" = "$OLD" ] && NEED_INSTALL=0 && echo "♻️  Reuso node_modules (hash match)"
fi
[ "$NEED_INSTALL" = "1" ] && rm -rf frontend/node_modules

# 4) Deps backend + frontend EN PARALELO
export YARN_CACHE_FOLDER=/root/.yarn-cache
(pip install -q --disable-pip-version-check -r backend/requirements.txt) &
PID_BE=$!
if [ "$NEED_INSTALL" = "1" ]; then
  ( cd frontend && yarn install --silent --prefer-offline --network-concurrency 8 --network-timeout 600000 ) &
  PID_FE=$!
else
  PID_FE=""
fi
wait $PID_BE
[ -n "$PID_FE" ] && wait $PID_FE

# Guardar hash post-install
sha256sum frontend/package.json | cut -c1-16 > frontend/.pkg_hash

# 5) Supervisor
sudo supervisorctl reread >/dev/null
sudo supervisorctl update  >/dev/null
sudo supervisorctl restart backend frontend >/dev/null

echo "==> ✅ Listo en $(($(date +%s)-t0))s · Backend :8001 · Frontend :3000 · Preview: ${BACKEND_URL}"
