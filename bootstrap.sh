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
#      Servimos un BUILD DE PRODUCCIÓN estático (serve -s build), no el
#      dev-server: arranque instantáneo, cero file-watchers → inmune al ENOSPC
#      de inotify (read-only en Emergent). Los flags de build hacen el
#      compilado más rápido/robusto (sin sourcemaps, sin eslint-as-error).
BACKEND_URL="${preview_endpoint:-http://localhost:8001}"
cat > frontend/.env <<EOF
REACT_APP_BACKEND_URL=${BACKEND_URL}
WDS_SOCKET_PORT=443
GENERATE_SOURCEMAP=false
DISABLE_ESLINT_PLUGIN=true
CI=false
EOF

# ── 3) node_modules cache-aware ──────────────────────────────────
#      El marcador de hash vive DENTRO de node_modules (no en el repo), así un
#      node_modules ajeno/incompleto preservado de otro proyecto NUNCA se
#      confunde con uno válido: si no trae su propio marcador → yarn install.
NEED_INSTALL=1
HASH_MARKER=frontend/node_modules/.pkg_hash
if [ -d frontend/node_modules ] && [ -f "$HASH_MARKER" ]; then
  CUR=$(sha256sum frontend/package.json 2>/dev/null | cut -c1-16)
  OLD=$(cat "$HASH_MARKER" 2>/dev/null || echo none)
  [ "$CUR" = "$OLD" ] && NEED_INSTALL=0 && echo "♻ Reusing node_modules (hash match)"
fi

# ── 4) RECONCILIACIÓN DE DEPS ────────────────────────────────────
#      Aun con hash-match, verificamos deps críticas (incluidas transitivas
#      como sass-loader, que react-scripts requiere en build-time). Si falta
#      cualquiera, forzamos yarn install (diff incremental, sin re-descargas).
if [ "$NEED_INSTALL" = "0" ] && [ -d frontend/node_modules ]; then
  MISSING=$(node -e "
    const fs=require('fs'), path=require('path');
    const pkg=JSON.parse(fs.readFileSync('frontend/package.json','utf8'));
    const deps=Object.assign({}, pkg.dependencies||{}, pkg.devDependencies||{});
    const critical=['react-scripts','@craco/craco','sass-loader','react','react-dom'];
    const check=new Set([...Object.keys(deps), ...critical]);
    const nm='frontend/node_modules';
    const missing=[];
    for (const name of check) {
      if (!fs.existsSync(path.join(nm, name, 'package.json'))) missing.push(name);
    }
    console.log(missing.join(' '));
  " 2>/dev/null || echo "react-scripts")
  if [ -n "$MISSING" ]; then
    echo "⚠ Deps faltantes/incompletas en node_modules: $MISSING"
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

(
  cd frontend
  if [ "$NEED_INSTALL" = "1" ]; then
    (yarn install --silent --prefer-offline --no-progress \
        --network-concurrency 16 --network-timeout 600000 --frozen-lockfile 2>/dev/null || \
     yarn install --silent --prefer-offline --no-progress \
        --network-concurrency 16 --network-timeout 600000)
  fi

  # ── BUILD DE PRODUCCIÓN (cache-aware) ──────────────────────────
  #   Reconstruimos solo si cambió src/, package.json o .env (el .env baquea
  #   REACT_APP_BACKEND_URL en el bundle → cuentas nuevas con otra URL rebuild).
  BUILD_SIG=$( { sha256sum package.json .env 2>/dev/null; \
                 find src public -type f -exec sha256sum {} + 2>/dev/null; } \
               | sha256sum | cut -c1-32 )
  if [ -d build ] && [ -f build/.build_sig ] && [ "$(cat build/.build_sig)" = "$BUILD_SIG" ]; then
    echo "♻ Reusing production build (sig match) — 0 rebuild"
  else
    echo "🏗  Building production frontend…"
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

# ── 6) Save hash post-install (DENTRO de node_modules) ───────────
[ -d frontend/node_modules ] && sha256sum frontend/package.json | cut -c1-16 > frontend/node_modules/.pkg_hash

# ── 7) Safety-net: garantizar que backend arranque con cwd válido ─
#      El clone/rm del prompt puede dejar uvicorn con working-dir borrado.
#      Un restart final asegura procesos limpios; idempotente y barato.
sudo supervisorctl restart backend >/dev/null 2>&1 || true

echo "==> ✅ Ready in $(($(date +%s)-t0))s · Backend :8001 · Frontend :3000 · Preview: ${BACKEND_URL}"
