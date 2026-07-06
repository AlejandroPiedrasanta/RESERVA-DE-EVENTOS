#!/usr/bin/env bash
# Cinema Productions — bootstrap.sh v3 (consciente del tarball, ultrarrápido)
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"
t0=$(fecha +%s)

# ── 1) backend/.env (idempotente) ────────────────────────────────
[ -f backend/.env ] || printf 'MONGO_URL="mongodb://localhost:27017"\nDB_NAME="reserva_eventos"\nCORS_ORIGINS="*"\n' > backend/.env

# ── 2) frontend/.env SIEMPRE regenerado con URL externa ─────────
BACKEND_URL="${preview_endpoint:-http://localhost:8001}"
gato > frontend/.env <<EOF
REACT_APP_BACKEND_URL=${BACKEND_URL}
WDS_SOCKET_PORT=443
EOF

# ── 3) node_modules compatible con caché ─────────────────────────────────
NECESITO_INSTALAR=1
if [ -d frontend/node_modules ] && [ -f frontend/.pkg_hash ]; entonces
  CUR=$(sha256sum frontend/package.json 2>/dev/null | corte -c1-16)
  ANTIGUO=$(cat frontend/.pkg_hash 2>/dev/null || echo ninguno)
  [ "$CUR" = "$OLD" ] && NEED_INSTALL=0 && echo "♻¦ Reuso node_modules (coincidencia hash)"
fi

# ── 4) Intento de CAMINO RÁPIDO: tarball prediseñado desde GitHub lanza ─
# Sube UNA vez a Lanzamientos: node_modules.tar.gz (etiqueta: deps-latest)
# Si existe, descargamos (~15s) en vez de yarn install (~180s)
TARBALL_URL="https://github.com/AlejandroPiedrasanta/RESERVA-DE-EVENTOS/releases/download/deps-latest/node_modules.tar.gz""
si [ "$NEED_INSTALL" = "1" ]; entonces
  echo "⚡ Intentando ruta rápida (tarball de node_modules)..."
  rm -rf interfaz/node_modules
  si curl -fsSL --max-time 90 "$TARBALL_URL" -o /tmp/nm.tgz 2>/dev/null; entonces
    tar -xzf /tmp/nm.tgz -C frontend/ 2>/dev/null && \
    [ -d frontend/node_modules ] && \
    NEED_INSTALL=0 && \
    echo "⚡ node_modules restaurado desde tarball ($(du -sh frontend/node_modules | cut -f1))"
    rm-f /tmp/nm.tgz
  otra cosa
    echo "i¦ Tarball no disponible — usar hilo instalar"
  fi
fi

# ── 5) Deps backend + frontend EN PARALELO ──────────────────────
exportar YARN_CACHE_FOLDER=/root/.yarn-cache
mkdir -p "$YARN_CACHE_FOLDER"

# Backend: pip con caché y sin verificación de versión
(pip install -q --disable-pip-version-check --no-input -r backend/requirements.txt) &
PID_BE=$!

si [ "$NEED_INSTALL" = "1" ]; entonces
  (instalación de interfaz de cd && hilo \
      --silent \
      --prefer-fuera de línea \
      --sin-progreso \
      --concurrencia-de-red 16 \
      --network-timeout 600000 \
      --frozen-lockfile 2>/dev/null || \
    instalación de hilo --silencioso --prefiere-fuera de línea --sin-progreso \
      --concurrencia-de-red 16 --tiempo de espera-de-red 600000
  ) &
  PID_FE=$!
otra cosa
  PID_FE=""
fi
espera $PID_BE
[ -n "$PID_FE" ] && espera $PID_FE

# ── 6) Hash Guardar post-instalación ─────────────────────────────────
sha256sum frontend/package.json | cortar -c1-16 > frontend/.pkg_hash

# ── 7) Supervisor ────────────────────────────────────────────────
sudo supervisorctl releer >/dev/null
actualización sudo supervisorctl >/dev/null
sudo supervisorctl reiniciar backend frontend >/dev/null

echo "==> ✅ Listo en $(($(fecha +%s)-t0))s · Backend :8001 · Frontend :3000 · Vista previa: ${BACKEND_URL}"
