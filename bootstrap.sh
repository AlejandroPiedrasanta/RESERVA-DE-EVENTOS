#!/usr/bin/env bash
# ============================================================================
#  Cinema Productions — bootstrap.sh
#  Prepara y arranca la app automáticamente en un entorno Emergent nuevo.
#  Uso:  bash bootstrap.sh        (no requiere responder preguntas)
#  · Instala dependencias de backend (pip) y frontend (yarn)
#  · Crea .env por defecto SOLO si faltan (nunca sobreescribe los del entorno)
#  · Reinicia los servicios con supervisor
#  Es idempotente: se puede ejecutar varias veces sin romper nada.
# ============================================================================
set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

echo "==> Cinema Productions · bootstrap iniciado en: $APP_DIR"

# ── 1) backend/.env (solo si falta) ─────────────────────────────────────────
if [ ! -f backend/.env ]; then
  printf 'MONGO_URL="mongodb://localhost:27017"\nDB_NAME="reserva_eventos"\nCORS_ORIGINS="*"\n' > backend/.env
  echo "    backend/.env creado con valores por defecto"
else
  echo "    backend/.env ya existe — se conserva"
fi

# ── 2) frontend/.env (solo si falta) ────────────────────────────────────────
if [ ! -f frontend/.env ]; then
  printf 'REACT_APP_BACKEND_URL=http://localhost:8001\nWDS_SOCKET_PORT=443\n' > frontend/.env
  echo "    frontend/.env creado con valores por defecto"
else
  echo "    frontend/.env ya existe — se conserva"
fi

# ── 3) Dependencias backend ─────────────────────────────────────────────────
echo "==> Instalando dependencias del backend (pip)..."
if [ -f backend/requirements.txt ]; then
  pip install -q -r backend/requirements.txt
else
  echo "    (no hay backend/requirements.txt — se omite)"
fi

# ── 4) Dependencias frontend ────────────────────────────────────────────────
echo "==> Instalando dependencias del frontend (yarn)..."
if [ -f frontend/package.json ]; then
  ( cd frontend && yarn install --silent )
else
  echo "    (no hay frontend/package.json — se omite)"
fi

# ── 5) Reiniciar servicios (supervisor) ─────────────────────────────────────
if command -v supervisorctl >/dev/null 2>&1; then
  echo "==> Reiniciando servicios (supervisor)..."
  sudo supervisorctl reread  >/dev/null 2>&1 || true
  sudo supervisorctl update  >/dev/null 2>&1 || true
  sudo supervisorctl restart backend frontend >/dev/null 2>&1 || true
else
  echo "==> supervisor no disponible; inicia manualmente backend (:8001) y frontend (:3000)"
fi

echo ""
echo "==> ¡Listo! Backend en :8001 · Frontend en :3000"
echo "    Salud backend: curl -s http://localhost:8001/api/"
