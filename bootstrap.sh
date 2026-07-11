#!/usr/bin/env bash
# Cinema Productions — bootstrap.sh v3 (tarball-aware, ultrafast)
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

# ── 4) FAST-PATH attempt: prebuilt node_modules tarball ─────────
# Priority: (a) tarball committed in repo (frontend/node_modules.tar.gz)
#           (b) GitHub Releases tarball (deps-latest tag) — auto-regen by CI
# Either avoids yarn install (~180s) -> extract only (~10s).
# The restored node_modules is VALIDATED before being trusted:
#   - package.json hash must match frontend/node_modules.tar.gz.sha16
#   - the Vite build tool binary must exist (node_modules/.bin/vite)
# If validation fails, we FALL THROUGH to next source (committed -> releases -> yarn).
TARBALL_URL="https://github.com/AlejandroPiedrasanta/RESERVA-DE-EVENTOS/releases/download/deps-latest/node_modules.tar.gz"
SHA16_URL="https://github.com/AlejandroPiedrasanta/RESERVA-DE-EVENTOS/releases/download/deps-latest/node_modules.tar.gz.sha16"

validate_node_modules() {
  # 1) build tool present?
  [ -x frontend/node_modules/.bin/vite ] || { echo "✗ tarball has no vite binary"; return 1; }
  # 2) hash matches package.json (only if a hash file is available)
  if [ -f frontend/node_modules.tar.gz.sha16 ]; then
    local expected cur
    expected=$(cat frontend/node_modules.tar.gz.sha16 2>/dev/null)
    cur=$(sha256sum frontend/package.json | cut -c1-16)
    [ "$expected" = "$cur" ] || { echo "✗ tarball stale (package.json changed: $expected != $cur)"; return 1; }
  fi
  return 0
}

try_committed_tarball() {
  [ -f frontend/node_modules.tar.gz ] || return 1
  echo "⚡ Trying committed tarball: frontend/node_modules.tar.gz"
  rm -rf frontend/node_modules
  tar -xzf frontend/node_modules.tar.gz -C frontend/ 2>/dev/null || return 1
  validate_node_modules || { rm -rf frontend/node_modules; return 1; }
  return 0
}

try_releases_tarball() {
  echo "⚡ Trying Releases tarball (deps-latest)..."
  # Fetch the sha16 first (small, fast) so we can validate BEFORE 60MB download
  local remote_sha
  remote_sha=$(curl -fsSL --max-time 15 "$SHA16_URL" 2>/dev/null | tr -d '[:space:]')
  if [ -n "$remote_sha" ]; then
    local cur
    cur=$(sha256sum frontend/package.json | cut -c1-16)
    if [ "$remote_sha" != "$cur" ]; then
      echo "✗ Releases tarball stale (package.json: $cur vs release: $remote_sha) — CI hasn't caught up yet"
      return 1
    fi
    # Pre-write sha16 so validate_node_modules can check post-extract
    echo "$remote_sha" > frontend/node_modules.tar.gz.sha16
  fi
  curl -fsSL --max-time 120 "$TARBALL_URL" -o /tmp/nm.tgz 2>/dev/null || { echo "✗ Releases download failed"; return 1; }
  rm -rf frontend/node_modules
  tar -xzf /tmp/nm.tgz -C frontend/ 2>/dev/null
  rm -f /tmp/nm.tgz
  validate_node_modules || { rm -rf frontend/node_modules; return 1; }
  return 0
}

if [ "$NEED_INSTALL" = "1" ]; then
  echo "⚡ Fast-path attempt (committed -> releases -> yarn)..."
  if try_committed_tarball; then
    NEED_INSTALL=0
    echo "⚡ node_modules restored from committed tarball ($(du -sh frontend/node_modules | cut -f1))"
  elif try_releases_tarball; then
    NEED_INSTALL=0
    echo "⚡ node_modules restored from Releases tarball ($(du -sh frontend/node_modules | cut -f1))"
  else
    echo "ℹ No valid tarball — will run yarn install (CI will refresh tarballs on next push)"
    NEED_INSTALL=1
  fi
fi

# ── 5) Backend + Frontend deps IN PARALLEL + overlapped supervisor ─
export YARN_CACHE_FOLDER=/root/.yarn-cache
mkdir -p "$YARN_CACHE_FOLDER"

sudo supervisorctl reread >/dev/null 2>&1 || true
sudo supervisorctl update >/dev/null 2>&1 || true

# Backend: pip → then restart backend supervisor immediately (overlap with yarn)
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

# ── 7) Auto-regenerate tarball artifact in BACKGROUND (only if yarn ran) ─
# Después de un yarn install exitoso, regeneramos frontend/node_modules.tar.gz
# y frontend/node_modules.tar.gz.sha16 para que la próxima corrida entre
# por fast-path (~10s). El usuario solo tiene que commit+push de esos 2 archivos.
# Corre en background para no bloquear el "Ready".
if [ "$NEED_INSTALL" = "1" ] && [ -d frontend/node_modules ]; then
  (
    cd frontend || exit 0
    NEW_HASH=$(sha256sum package.json | cut -c1-16)
    # tar excluye .cache para bajar tamaño; usa gzip -1 para velocidad
    if tar --exclude='node_modules/.cache' -cf - node_modules/ 2>/dev/null | gzip -1 > node_modules.tar.gz.new 2>/dev/null; then
      mv node_modules.tar.gz.new node_modules.tar.gz
      echo "$NEW_HASH" > node_modules.tar.gz.sha16
      echo "♻ [bg] Regenerated node_modules.tar.gz + .sha16 (hash=$NEW_HASH, size=$(du -h node_modules.tar.gz | cut -f1)) — commit ambos para fast-path en la próxima corrida" >&2
    else
      rm -f node_modules.tar.gz.new
      echo "⚠ [bg] Falló regeneración del tarball (no crítico)" >&2
    fi
  ) &
  disown
fi

echo "==> ✅ Ready in $(($(date +%s)-t0))s · Backend :8001 · Frontend :3000 · Preview: ${BACKEND_URL}"
