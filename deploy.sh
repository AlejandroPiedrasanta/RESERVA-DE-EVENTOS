#!/usr/bin/env bash
# deploy.sh — despliegue seguro one-shot para cuentas Emergent.
#
# Arregla el error de webpack "Can't resolve '.../html-webpack-plugin/lib/loader.js'"
# (y el "getcwd() FileNotFoundError" del backend) que aparecía al sobrescribir /app.
#
# Causa raíz: hacer `rm -rf /app/frontend` mientras el proceso frontend seguía
# corriendo dejaba su working-directory borrado; webpack resolvía rutas contra
# un cwd inexistente aunque los archivos SÍ estaban en disco.
#
# Solución: PARAR los servicios ANTES de tocar /app, y arrancarlos al final.
set -e
T0=$(date +%s)
REPO="https://github.com/AlejandroPiedrasanta/RESERVA-DE-EVENTOS"
PREVIEW=$(grep -oP 'REACT_APP_BACKEND_URL=\K.*' /app/frontend/.env)
echo "Preview: $PREVIEW"

# 1) Parar servicios ANTES del swap (clave: ningún proceso con cwd borrado)
sudo supervisorctl stop backend frontend >/dev/null 2>&1 || true

# 2) Preservar node_modules (salta yarn install si el hash coincide)
[ -d /app/frontend/node_modules ] && mv /app/frontend/node_modules /root/.nm-cache 2>/dev/null || true

# 3) Clone + limpieza en paralelo
( cd /tmp && rm -rf repo && git clone --depth 1 --single-branch --no-tags --filter=blob:none \
    "$REPO" repo ) & C=$!
( rm -rf /app/backend /app/frontend ) & R=$!
wait $C $R

cp -a /tmp/repo/. /app/
[ -d /root/.nm-cache ] && mv /root/.nm-cache /app/frontend/node_modules 2>/dev/null || true

# 4) Bootstrap (regenera frontend/.env, instala deps y arranca servicios limpios)
cd /app
export preview_endpoint="$PREVIEW"
bash bootstrap.sh

# 5) Polling hasta que backend y frontend respondan 200 (cubre compilación webpack)
for i in $(seq 1 240); do
  BE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$PREVIEW/api/" || echo 000)
  FE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$PREVIEW/" || echo 000)
  [ "$BE" = "200" ] && [ "$FE" = "200" ] && { echo "ready after $i polls"; break; }
  sleep 0.5
done

# 6) Salida final
echo "=== TOTAL: $(($(date +%s)-T0))s ==="
sudo supervisorctl status | grep -E "backend|frontend|mongodb"
curl -sS --max-time 5 "$PREVIEW/api/"; echo ""
curl -sS -o /dev/null -w "FE HTTP: %{http_code}\n" --max-time 5 "$PREVIEW/"
echo "PREVIEW: $PREVIEW"
