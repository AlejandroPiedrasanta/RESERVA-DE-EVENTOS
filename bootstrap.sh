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
#           (b) GitHub Releases tarball (deps-latest tag)
# Either avoids yarn install (~180s) -> extract only (~10s).
# The restored node_modules is VALIDATED before being trusted:
#   - package.json hash must match frontend/node_modules.tar.gz.sha16 (if present)
#   - the Vite build tool binary must exist (node_modules/.bin/vite)
# If validation fails (stale/incompatible tarball), we discard it and yarn install.
TARBALL_URL="https://github.com/AlejandroPiedrasanta/RESERVA-DE-EVENTOS/releases/download/deps-latest/node_modules.tar.gz"

validate_node_modules() {
  # 1) build tool present?
  [ -x frontend/node_modules/.bin/vite ] || { echo "✗ tarball has no vite binary"; return 1; }
  # 2) hash matches package.json (only if a committed hash is available)
  if [ -f frontend/node_modules.tar.gz.sha16 ]; then
    local expected cur
    expected=$(cat frontend/node_modules.tar.gz.sha16 2>/dev/null)
    cur=$(sha256sum frontend/package.json | cut -c1-16)
    [ "$expected" = "$cur" ] || { echo "✗ tarball stale (package.json changed: $expected != $cur)"; return 1; }
  fi
  return 0
}

if [ "$NEED_INSTALL" = "1" ]; then
  echo "⚡ Trying fast-path (node_modules tarball)..."
  rm -rf frontend/node_modules
  if [ -f frontend/node_modules.tar.gz ]; then
    echo "⚡ Using committed tarball: frontend/node_modules.tar.gz"
    tar -xzf frontend/node_modules.tar.gz -C frontend/ 2>/dev/null || true
  elif curl -fsSL --max-time 90 "$TARBALL_URL" -o /tmp/nm.tgz 2>/dev/null; then
    echo "⚡ Using Releases tarball"
    tar -xzf /tmp/nm.tgz -C frontend/ 2>/dev/null || true
    rm -f /tmp/nm.tgz
  else
    echo "ℹ Tarball not available — falling back to yarn install"
  fi

  if [ -d frontend/node_modules ] && validate_node_modules; then
    NEED_INSTALL=0
    echo "⚡ node_modules restored & validated ($(du -sh frontend/node_modules | cut -f1))"
  else
    echo "ℹ Discarding invalid/absent tarball — will run yarn install"
    rm -rf frontend/node_modules
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

echo "==> ✅ Ready in $(($(date +%s)-t0))s · Backend :8001 · Frontend :3000 · Preview: ${BACKEND_URL}"
