#!/usr/bin/env bash
# Cinema Productions — bootstrap.sh v5.0 (no-tarball: cache-aware yarn install)
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"
t0=$(date +%s)

# ── 0.a) Matar procesos viejos ANTES de nada ─────────────────────
# Si /app/backend o /app/frontend fueron borrados/recreados mientras los
# servicios corrían, sus procesos quedan con un working-dir eliminado y
# webpack/uvicorn fallan con "Can't resolve ..." o "getcwd() FileNotFound".
# Pararlos aquí garantiza que al final arranquen procesos limpios con cwd válido.
sudo supervisorctl stop backend frontend >/dev/null 2>&1 || true

# ── 0) (eliminado) instalación de zstd/pigz — ya no hay tarball ──
# El tarball de node_modules (~670MB) fue eliminado. Ahora usamos
# yarn install con caché-awareness (reutiliza node_modules si el hash
# de package.json no cambió). Sin descargas gigantes ni decompresores.

# ── 1) backend/.env (idempotent) ─────────────────────────────────
[ -f backend/.env ] || printf 'MONGO_URL="mongodb://localhost:27017"\nDB_NAME="reserva_eventos"\nCORS_ORIGINS="*"\n' > backend/.env

# ── 2) frontend/.env ALWAYS regenerated with external URL ────────
BACKEND_URL="${preview_endpoint:-http://localhost:8001}"
cat > frontend/.env <<EOF
REACT_APP_BACKEND_URL=${BACKEND_URL}
WDS_SOCKET_PORT=443
EOF

# ── 3) node_modules cache-aware ──────────────────────────────────
NEED_INSTALL=1
if [ -d frontend/node_modules ] && [ -f frontend/.pkg_hash ]; then
  CUR=$(sha256sum frontend/package.json 2>/dev/null | cut -c1-16)
  OLD=$(cat frontend/.pkg_hash 2>/dev/null || echo none)
  [ "$CUR" = "$OLD" ] && NEED_INSTALL=0 && echo "♻ Reusing node_modules (hash match)"
fi

# ── 4) RECONCILIACIÓN DE DEPS (sin tarball) ──────────────────────
#      Si reutilizamos node_modules por hash-match pero falta alguna dep
#      declarada (p.ej. instalación previa incompleta), forzamos yarn install.
#      yarn hace el diff solo, sin re-descargar lo que ya está.
if [ "$NEED_INSTALL" = "0" ] && [ -d frontend/node_modules ] && [ -f frontend/package.json ]; then
  MISSING=$(node -e "
    const fs = require('fs');
    const path = require('path');
    const pkg = JSON.parse(fs.readFileSync('frontend/package.json','utf8'));
    const deps = Object.assign({}, pkg.dependencies || {}, pkg.devDependencies || {});
    const missing = [];
    for (const name of Object.keys(deps)) {
      const p = path.join('frontend','node_modules', name, 'package.json');
      if (!fs.existsSync(p)) missing.push(name);
    }
    console.log(missing.join(' '));
  " 2>/dev/null || echo "")
  if [ -n "$MISSING" ]; then
    echo "⚠ Deps faltantes en node_modules: $MISSING"
    echo "  → Reconciliando con yarn install…"
    NEED_INSTALL=1
  fi
fi

if [ "$NEED_INSTALL" = "1" ]; then
  echo "📦 node_modules requiere yarn install (sin tarball)"
else
  echo "♻ node_modules reutilizado ($(du -sh frontend/node_modules 2>/dev/null | cut -f1)) — 0 descargas"
fi

# ── 5) Backend + Frontend deps IN PARALLEL + overlapped supervisor ─
export YARN_CACHE_FOLDER=/root/.yarn-cache
mkdir -p "$YARN_CACHE_FOLDER"

sudo supervisorctl reread >/dev/null 2>&1 || true
sudo supervisorctl update >/dev/null 2>&1 || true

(
  pip install -q --disable-pip-version-check --no-input -r backend/requirements.txt
  sudo supervisorctl restart backend >/dev/null 2>&1 || true
) &
PID_BE=$!

if [ "$NEED_INSTALL" = "1" ]; then
  (
    cd frontend && (yarn install \
        --silent --prefer-offline --no-progress \
        --network-concurrency 16 --network-timeout 600000 \
        --frozen-lockfile 2>/dev/null || \
      yarn install --silent --prefer-offline --no-progress \
        --network-concurrency 16 --network-timeout 600000)
    sudo supervisorctl restart frontend >/dev/null 2>&1 || true
  ) &
  PID_FE=$!
else
  (sudo supervisorctl restart frontend >/dev/null 2>&1 || true) &
  PID_FE=$!
fi

wait $PID_BE
wait $PID_FE

# ── 6) Save hash post-install ────────────────────────────────────
sha256sum frontend/package.json | cut -c1-16 > frontend/.pkg_hash

echo "==> ✅ Ready in $(($(date +%s)-t0))s · Backend :8001 · Frontend :3000 · Preview: ${BACKEND_URL}"
