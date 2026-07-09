#!/usr/bin/env bash
# Cinema Productions — bootstrap.sh v6.0 (fast: paralelismo + skip cuando ya está listo)
set -euo pipefail
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"
t0=$(date +%s)

sudo supervisorctl stop backend frontend >/dev/null 2>&1 || true

# ── 1) backend/.env (idempotent) ────────────────────────────────
[ -f backend/.env ] || printf 'MONGO_URL="mongodb://localhost:27017"\nDB_NAME="reserva_eventos"\nCORS_ORIGINS="*"\n' > backend/.env

# ── 2) frontend/.env con preview URL ────────────────────────────
BACKEND_URL="${preview_endpoint:-http://localhost:8001}"
cat > frontend/.env <<EOF
REACT_APP_BACKEND_URL=${BACKEND_URL}
WDS_SOCKET_PORT=443
GENERATE_SOURCEMAP=false
DISABLE_ESLINT_PLUGIN=true
CI=false
EOF

# ── 3) node_modules cache-aware (hash del package.json) ─────────
NEED_INSTALL=1
HASH_MARKER=frontend/node_modules/.pkg_hash
if [ -d frontend/node_modules ] && [ -f "$HASH_MARKER" ]; then
  CUR=$(sha256sum frontend/package.json 2>/dev/null | cut -c1-16)
  OLD=$(cat "$HASH_MARKER" 2>/dev/null || echo none)
  [ "$CUR" = "$OLD" ] && [ -x frontend/node_modules/.bin/serve ] \
      && [ -d frontend/node_modules/react-scripts ] \
      && NEED_INSTALL=0 && echo "♻ node_modules OK ($(du -sh frontend/node_modules 2>/dev/null | cut -f1))"
fi

sudo supervisorctl reread >/dev/null 2>&1 || true
sudo supervisorctl update >/dev/null 2>&1 || true

# ── 4) Backend + Frontend en paralelo ──────────────────────────
export YARN_CACHE_FOLDER=/root/.yarn-cache
mkdir -p "$YARN_CACHE_FOLDER"

(
  pip install -q --disable-pip-version-check --no-input -r backend/requirements.txt
  sudo supervisorctl restart backend >/dev/null 2>&1 || true
) &
PID_BE=$!

(
  cd frontend
  if [ "$NEED_INSTALL" = "1" ]; then
    echo "📦 yarn install…"
    yarn install --silent --prefer-offline --no-progress \
        --network-concurrency 16 --network-timeout 600000 2>/dev/null
  fi

  # Build sólo si cambió src/, package.json o .env
  BUILD_SIG=$( { sha256sum package.json .env 2>/dev/null; \
                 find src public -type f -exec sha256sum {} + 2>/dev/null; } \
               | sha256sum | cut -c1-32 )
  if [ -d build ] && [ -f build/.build_sig ] && [ "$(cat build/.build_sig)" = "$BUILD_SIG" ]; then
    echo "♻ build reutilizado"
  else
    echo "🏗  yarn build…"
    rm -rf build
    GENERATE_SOURCEMAP=false DISABLE_ESLINT_PLUGIN=true CI=false \
      NODE_OPTIONS=--max-old-space-size=2048 yarn build
    echo "$BUILD_SIG" > build/.build_sig
  fi
  sudo supervisorctl restart frontend >/dev/null 2>&1 || true
) &
PID_FE=$!

wait $PID_BE
wait $PID_FE

[ -d frontend/node_modules ] && sha256sum frontend/package.json | cut -c1-16 > frontend/node_modules/.pkg_hash

sudo supervisorctl restart backend >/dev/null 2>&1 || true

echo "==> ✅ Ready in $(($(date +%s)-t0))s · Backend :8001 · Frontend :3000 · Preview: ${BACKEND_URL}"
