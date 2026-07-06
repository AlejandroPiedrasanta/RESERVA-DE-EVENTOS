# RESERVA-DE-EVENTOS

Aplicación full-stack (React + FastAPI + MongoDB) para reserva de eventos.

## Bring-up rápido (Emergent / pods aarch64)

```bash
git clone --depth 1 https://github.com/AlejandroPiedrasanta/RESERVA-DE-EVENTOS /app
REACT_APP_BACKEND_URL="<preview_url>" bash /app/bootstrap.sh
```

`bootstrap.sh` es idempotente:

1. Escribe `backend/.env` y `frontend/.env` si faltan.
2. Descarga `node_modules.tar.gz` y `pip-wheels.tar.gz` del release [`deps-latest`](https://github.com/AlejandroPiedrasanta/RESERVA-DE-EVENTOS/releases/tag/deps-latest) **solo si** el hash de `yarn.lock` / `requirements.txt` coincide (evita mismatches).
3. Cae a `yarn install` / `pip install` fresco si los lockfiles cambiaron.
4. Reinicia supervisor (`backend`, `frontend`) y espera a que ambos estén listos (`webpack compiled successfully` + `/api/` 200).

## Refresco automático de dependencias

Cada push a `main` que modifique `frontend/yarn.lock` o `backend/requirements.txt` dispara el workflow [`.github/workflows/refresh-deps.yml`](.github/workflows/refresh-deps.yml), que rebuild los tarballs en un runner `ubuntu-24.04-arm` y republica el release `deps-latest`. También se puede correr manualmente desde la pestaña Actions.

## Estructura

```
/app
├── backend/          # FastAPI + Motor (Mongo)
├── frontend/         # React + Tailwind + shadcn/ui
├── bootstrap.sh      # Fast bring-up
└── .github/workflows/refresh-deps.yml
```

## Servicios

- Backend: `0.0.0.0:8001` (supervisor)
- Frontend: `3000` (supervisor, hot reload)
- Mongo: `mongodb://localhost:27017` (env `MONGO_URL`, `DB_NAME`)

Todas las rutas backend van prefijadas con `/api` para pasar por el ingress.
