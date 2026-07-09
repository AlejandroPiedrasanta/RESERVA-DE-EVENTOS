#!/usr/bin/env bash
# Cinema Productions — bootstrap.sh v4.2 (stream extract + deps reconciliation)
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"
t0=$(date +%s)

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

# ── 4) FAST-PATH: stream extract from GitHub Releases (zstd → gzip)
# Priority: (a) committed tarball  (b) Releases zstd  (c) Releases gzip
REPO="AlejandroPiedrasanta/RESERVA-DE-EVENTOS"
GH_ZST="https://github.com/${REPO}/releases/download/deps-latest/node_modules.tar.zst"
GH_GZ="https://github.com/${REPO}/releases/download/deps-latest/node_modules.tar.gz"

HAS_ZSTD=0; command -v zstd >/dev/null 2>&1 && HAS_ZSTD=1
HAS_PIGZ=0; command -v pigz >/dev/null 2>&1 && HAS_PIGZ=1
GZ_DECOMP="gzip -dc"; [ "$HAS_PIGZ" = "1" ] && GZ_DECOMP="pigz -dc"

try_stream() {
  local url="$1" decomp="$2" label="$3"
  echo "⚡ Trying ${label}"
  local code
  code=$(curl -sI -o /dev/null -w "%{http_code}" --max-time 3 -L "$url" || echo 000)
  if [ "$code" != "200" ]; then
    echo "  ↳ HTTP $code, skip"
    return 1
  fi
  if curl -fsSL --max-time 120 "$url" | eval "$decomp" | tar -xf - -C frontend/ 2>/dev/null; then
    [ -d frontend/node_modules ] && { echo "  ↳ ✅ extracted from ${label}"; return 0; }
  fi
  return 1
}

if [ "$NEED_INSTALL" = "1" ]; then
  rm -rf frontend/node_modules

  # (a) committed tarball (offline path)
  if [ -f frontend/node_modules.tar.zst ] && [ "$HAS_ZSTD" = "1" ]; then
    echo "⚡ Using committed zstd tarball"
    zstd -dc frontend/node_modules.tar.zst | tar -xf - -C frontend/ && NEED_INSTALL=0
  elif [ -f frontend/node_modules.tar.gz ]; then
    echo "⚡ Using committed gzip tarball"
    $GZ_DECOMP < frontend/node_modules.tar.gz | tar -xf - -C frontend/ && NEED_INSTALL=0
  fi

  # (b) GitHub Releases zstd (only if zstd installed)
  if [ "$NEED_INSTALL" = "1" ] && [ "$HAS_ZSTD" = "1" ]; then
    try_stream "$GH_ZST" "zstd -dc" "Releases zstd" && NEED_INSTALL=0 || true
  fi

  # (c) GitHub Releases gzip (default path)
  if [ "$NEED_INSTALL" = "1" ]; then
    try_stream "$GH_GZ" "$GZ_DECOMP" "Releases gzip" && NEED_INSTALL=0 || true
  fi

  if [ "$NEED_INSTALL" = "1" ]; then
    echo "ℹ All tarballs failed — falling back to yarn install"
  else
    echo "⚡ node_modules ready ($(du -sh frontend/node_modules | cut -f1))"
  fi
fi

# ── 4b) RECONCILIACIÓN DE DEPS: si el tarball (deps-latest) está atrasado
#       respecto al package.json actual, el node_modules extraído no incluirá
#       las deps nuevas y el build falla con "Module not found". Comparamos
#       cada dep declarada contra su presencia real en node_modules; si falta
#       alguna, disparamos yarn install para reconciliar (sin borrar lo que
#       ya está — yarn hace el diff él solo).
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
    echo "⚠ Deps faltantes en node_modules (tarball atrasado): $MISSING"
    echo "  → Reconciliando con yarn install (mantiene lo existente)…"
    NEED_INSTALL=1  # Forzar el bloque de yarn install más abajo
  fi
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
