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

# ── 4) FAST-PATH attempt: prebuilt tarball from GitHub Releases ──
# Upload ONCE to Releases: node_modules.tar.gz (tag: deps-latest)
# If it exists, we download (~15s) instead of yarn install (~180s)
TARBALL_URL="https://github.com/AlejandroPiedrasanta/RESERVA-DE-EVENTOS/releases/download/deps-latest/node_modules.tar.gz"
if [ "$NEED_INSTALL" = "1" ]; then
  echo "⚡ Trying fast-path (node_modules tarball)..."
  rm -rf frontend/node_modules
  if curl -fsSL --max-time 90 "$TARBALL_URL" -o /tmp/nm.tgz 2>/dev/null; then
    tar -xzf /tmp/nm.tgz -C frontend/ 2>/dev/null && \
    [ -d frontend/node_modules ] && \
    NEED_INSTALL=0 && \
    echo "⚡ node_modules restored from tarball ($(du -sh frontend/node_modules | cut -f1))"
    rm -f /tmp/nm.tgz
  else
    echo "ℹ Tarball not available — falling back to yarn install"
  fi
fi

# ── 5) Backend + Frontend deps IN PARALLEL ───────────────────────
export YARN_CACHE_FOLDER=/root/.yarn-cache
mkdir -p "$YARN_CACHE_FOLDER"

# Backend: pip with cache and no version check
(pip install -q --disable-pip-version-check --no-input -r backend/requirements.txt) &
PID_BE=$!

if [ "$NEED_INSTALL" = "1" ]; then
  (cd frontend && yarn install \
      --silent \
      --prefer-offline \
      --no-progress \
      --network-concurrency 16 \
      --network-timeout 600000 \
      --frozen-lockfile 2>/dev/null || \
    yarn install --silent --prefer-offline --no-progress \
      --network-concurrency 16 --network-timeout 600000
  ) &
  PID_FE=$!
else
  PID_FE=""
fi
wait $PID_BE
[ -n "$PID_FE" ] && wait $PID_FE

# ── 6) Save hash post-install ────────────────────────────────────
sha256sum frontend/package.json | cut -c1-16 > frontend/.pkg_hash

# ── 7) Supervisor ────────────────────────────────────────────────
sudo supervisorctl reread >/dev/null
sudo supervisorctl update >/dev/null
sudo supervisorctl restart backend frontend >/dev/null

echo "==> ✅ Ready in $(($(date +%s)-t0))s · Backend :8001 · Frontend :3000 · Preview: ${BACKEND_URL}"
