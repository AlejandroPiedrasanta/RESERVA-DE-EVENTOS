#!/usr/bin/env bash
# Cinema Productions — bootstrap.sh (Emergent-aware)
set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

# 1) backend/.env (idempotente)
if [ ! -f backend/.env ]; then
  printf 'MONGO_URL="mongodb://localhost:27017"\nDB_NAME="reserva_eventos"\nCORS_ORIGINS="*"\n' > backend/.env
fi

# 2) frontend/.env — SIEMPRE se regenera con la URL externa de Emergent
#    Emergent expone la URL de preview en $preview_endpoint. Si no existe,
#    caemos a localhost solo como último recurso (dev local).
BACKEND_URL="${preview_endpoint:-http://localhost:8001}"
cat > frontend/.env <<EOF
REACT_APP_BACKEND_URL=${BACKEND_URL}
WDS_SOCKET_PORT=443
EOF

# 3) Dependencias backend
pip install -q -r backend/requirements.txt

# 4) Dependencias frontend — limpiar node_modules corrupto por cp -a
rm -rf frontend/node_modules frontend/.yarn-cache 2>/dev/null || true
( cd frontend && yarn install --silent --network-timeout 600000 )

# 5) Supervisor
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl restart backend frontend

echo "==> Listo. Backend :8001 · Frontend :3000 · Preview: ${BACKEND_URL}"
