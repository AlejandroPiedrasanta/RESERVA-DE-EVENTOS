#!/usr/bin/env bash
# bootstrap.sh — Fast bring-up for RESERVA-DE-EVENTOS on Emergent pods.
# Idempotent. Uses pre-built dependency tarballs from the `deps-latest` release
# when their hashes match yarn.lock / requirements.txt; falls back to fresh install otherwise.
set -euo pipefail

REPO_SLUG="AlejandroPiedrasanta/RESERVA-DE-EVENTOS"
REL_TAG="deps-latest"
APP_DIR="${APP_DIR:-/app}"
DL_BASE="https://github.com/${REPO_SLUG}/releases/download/${REL_TAG}"

log() { printf '[bootstrap] %s\n' "$*"; }

# ---- 0. Env files ----------------------------------------------------------
if [ ! -f "${APP_DIR}/backend/.env" ]; then
  printf 'MONGO_URL="mongodb://localhost:27017"\nDB_NAME="reserva_eventos"\nCORS_ORIGINS="*"\n' \
    > "${APP_DIR}/backend/.env"
fi
if [ -n "${REACT_APP_BACKEND_URL:-}" ]; then
  printf 'REACT_APP_BACKEND_URL=%s\nWDS_SOCKET_PORT=443\n' "$REACT_APP_BACKEND_URL" \
    > "${APP_DIR}/frontend/.env"
fi

# ---- 1. Frontend node_modules ---------------------------------------------
FE_HASH=$(sha256sum "${APP_DIR}/frontend/yarn.lock" 2>/dev/null | awk '{print $1}' || echo none)
REMOTE_FE_HASH=$(curl -fsSL --max-time 10 "${DL_BASE}/node_modules.sha256" 2>/dev/null | awk '{print $1}' || echo "")

if [ -d "${APP_DIR}/frontend/node_modules/.bin" ] && [ -f "${APP_DIR}/frontend/node_modules/.yarn-lock-hash" ] \
   && [ "$(cat "${APP_DIR}/frontend/node_modules/.yarn-lock-hash")" = "$FE_HASH" ]; then
  log "frontend: node_modules cache hit (local)"
elif [ -n "$REMOTE_FE_HASH" ] && [ "$REMOTE_FE_HASH" = "$FE_HASH" ]; then
  log "frontend: downloading node_modules tarball (hash match)"
  curl -fsSL --max-time 180 "${DL_BASE}/node_modules.tar.gz" -o /tmp/nm.tgz
  rm -rf "${APP_DIR}/frontend/node_modules"
  tar -xzf /tmp/nm.tgz -C "${APP_DIR}/frontend"
  rm -f /tmp/nm.tgz
  printf '%s' "$FE_HASH" > "${APP_DIR}/frontend/node_modules/.yarn-lock-hash"
else
  log "frontend: yarn install (lock changed or no tarball)"
  (cd "${APP_DIR}/frontend" && yarn install --silent --prefer-offline --no-progress \
     --network-concurrency 16 --network-timeout 600000)
  printf '%s' "$FE_HASH" > "${APP_DIR}/frontend/node_modules/.yarn-lock-hash"
fi

# ---- 2. Backend python deps -----------------------------------------------
BE_HASH=$(sha256sum "${APP_DIR}/backend/requirements.txt" 2>/dev/null | awk '{print $1}' || echo none)
REMOTE_BE_HASH=$(curl -fsSL --max-time 10 "${DL_BASE}/pip-wheels.sha256" 2>/dev/null | awk '{print $1}' || echo "")

if [ -n "$REMOTE_BE_HASH" ] && [ "$REMOTE_BE_HASH" = "$BE_HASH" ]; then
  log "backend: installing from wheel tarball (hash match)"
  curl -fsSL --max-time 180 "${DL_BASE}/pip-wheels.tar.gz" -o /tmp/wh.tgz
  rm -rf /tmp/wheels && tar -xzf /tmp/wh.tgz -C /tmp && rm -f /tmp/wh.tgz
  pip install -q --disable-pip-version-check --no-input --no-index \
      --find-links /tmp/wheels -r "${APP_DIR}/backend/requirements.txt"
else
  log "backend: pip install from PyPI (requirements changed or no wheels)"
  pip install -q --disable-pip-version-check --no-input -r "${APP_DIR}/backend/requirements.txt"
fi

# ---- 3. Restart services ---------------------------------------------------
sudo supervisorctl reread >/dev/null 2>&1 || true
sudo supervisorctl update  >/dev/null 2>&1 || true
sudo supervisorctl restart backend  >/dev/null 2>&1 || true
sudo supervisorctl restart frontend >/dev/null 2>&1 || true

# ---- 4. Wait for readiness -------------------------------------------------
for i in $(seq 1 200); do
  if curl -sf --max-time 2 http://localhost:8001/api/ >/dev/null \
     && grep -q "webpack compiled successfully" /var/log/supervisor/frontend.out.log 2>/dev/null; then
    log "READY"
    exit 0
  fi
  sleep 1
done
log "TIMEOUT"
exit 1
