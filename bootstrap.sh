#!/usr/bin/env bash
# Cinema Productions — bootstrap.sh
# Prepara y arranca la app en un entorno Emergent nuevo.
set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

# 1) Crea backend/.env solo si no existe
if [ ! -f backend/.env ]; then
  printf 'MONGO_URL="mongodb://localhost:27017"\nDB_NAME="reserva_eventos"\nCORS_ORIGINS="*"\n' > backend/.env
fi

# 2) Crea frontend/.env solo si no existe
if [ ! -f frontend/.env ]; then
  printf 'REACT_APP_BACKEND_URL=http://localhost:8001\nWDS_SOCKET_PORT=443\n' > frontend/.env
fi

# 3) Instala dependencias backend
pip install -q -r backend/requirements.txt

# 4) Instala dependencias frontend
( cd frontend && yarn install --silent )

# 5) Reinicia supervisor
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl restart backend frontend

echo "==> ¡Listo! Backend en :8001 · Frontend en :3000"
