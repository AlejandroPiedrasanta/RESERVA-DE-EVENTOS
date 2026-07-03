# 🗺️ ARCHITECTURE — Cinema Productions (Gestión de Reservas de Eventos)

> **Léeme PRIMERO.** Este documento es el mapa rápido de todo el proyecto para que
> cualquier desarrollador (o IA) entienda la estructura interna en minutos.
> Para el contexto histórico detallado ver `backend/ai_context_default.py`
> (servido en la app vía `/api/ai-context`).

---

## 1. Stack
- **Frontend**: React 19 + Craco + TailwindCSS + Framer Motion + Shadcn UI + Recharts
- **Backend**: FastAPI + Motor (MongoDB async) + APScheduler
- **DB**: MongoDB (colecciones con `_id` ObjectId → se serializa a `id` string)
- **Idioma UI**: Español · Moneda: GTQ (Q) · Fecha: DD/MM/YYYY

## 2. Reglas del entorno (NO romper)
- Backend interno en `0.0.0.0:8001`, frontend en `3000` (gestionados por supervisor).
- Toda ruta backend lleva prefijo **`/api`** (ingress de Kubernetes).
- Frontend usa `process.env.REACT_APP_BACKEND_URL`; backend usa `os.environ`.
- Nunca hardcodear URLs/puertos/claves. Nunca borrar llaves de `.env`.
- Hot-reload activo; reiniciar servicios solo al cambiar `.env` o instalar deps.

## 3. Variables de entorno
### `backend/.env`
- `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`
- `APP_PUBLIC_URL` → URL pública del deploy (usada en el redirect de Gmail OAuth)
- Opcionales: `GOOGLE_CLIENT_ID/SECRET`, `GOOGLE_REDIRECT_URI`, `VAPID_*`
### `frontend/.env`
- `REACT_APP_BACKEND_URL`, `WDS_SOCKET_PORT`

## 4. Estructura del backend (`/app/backend/`)
```
server.py               ★ App FastAPI (~2700 líneas). Tiene ÍNDICE al inicio.
desktop_package.py        Plantillas del instalador de escritorio (ZIP descargable).
ai_context_default.py     DEFAULT_AI_CONTEXT (contexto para la próxima IA).
standalone_app.py         App de escritorio embebida (INDEPENDIENTE de server.py).
requirements.txt          Dependencias Python.
backups/                  Respaldos JSON automáticos/manuales.
uploads/updates/          Paquetes .zip de actualizaciones de escritorio.
tests/                    Tests pytest por iteración.
```

### Secciones de `server.py` (buscar marcadores `# ───`)
| # | Sección | Contenido |
|---|---------|-----------|
| 1 | Config & entorno | env, Mongo client `db`, `scheduler`, `doc_to_dict` |
| 2 | Lifespan | arranca/para el scheduler (1 job: `check_and_push_reminders`) |
| 3 | Pydantic Models | `ReservationCreate/Update`, `SocioCreate/Update`, `NotificationSettingsModel`, `DBConnectRequest`, `PushSubscriptionModel` |
| 4 | Reminder logic | HTML builders + envío por Gmail/Push/Telegram/ntfy + `_dispatch_reminders` |
| 5 | Routes base | `/`, `/deployment/*`, `/data/*`, `/import/*`, `/export/*` |
| 6 | Backup | `/backup/download|create|history|restore|{file}` |
| 7 | Core CRUD | `/stats`, `/reservations*`, `/socios*`, `/financials`, `/calendar` |
| 8 | Settings | `/settings`, `/settings/database*` (test/connect/reset) |
| 9 | Reminders | `/notifications/pending`, `/reminders/test-email|send` |
| 10 | Integraciones | `/oauth/gmail/*`, `/push/*`, `/telegram/test`, `/ntfy/test` |
| 11 | Desktop download | `/download/package*` (usa `desktop_package.py`) |
| 12 | Updates/Themes | `/updates/*`, `/settings/appearance`, `/themes*` |
| 13 | Security | `/security/*` (PBKDF2, lock, bloqueo por intentos) |
| 14 | GitHub & AI | `/github/*`, `/ai-context*` (usa `ai_context_default.py`) |

## 5. Colecciones MongoDB
- **`reservations`**: `client_name, client_phone, client_email, event_type,
  event_date (YYYY-MM-DD), event_time, venue, guests_count, total_amount,
  advance_paid, status (Pendiente/Confirmada/Completado/Cancelado), package_type,
  notes, locations[], assigned_partners[{payment, payment_status}], receipt_images[],
  created_at`. Balance = `total_amount - advance_paid` (calculado).
- **`socios`**: `name, role, phone, email, notes, rate_per_event, photo(base64), created_at`.
- **`app_settings`** (doc único): notificaciones, negocio, apariencia, seguridad
  (`app_password_hash`, `security_config`), `github_config`, `ai_context`, etc.
- **`saved_themes`**, **`oauth_tokens`**, **`push_subscriptions`**, **`app_updates`**.

> Nota: los endpoints usan `ObjectId` para reservas/socios/updates (`_id`) y
> devuelven `id` (string) vía `doc_to_dict`. El campo del correo del cliente es
> **`client_email`** (no `email`).

## 6. Recordatorios (cómo funciona)
- Un único job APScheduler cada minuto: `check_and_push_reminders`.
- A la hora `reminder_time` recorre `reminder_periods` (lista de días de antelación)
  y también recordatorios "N horas antes" (`reminder_hours_before`).
- `_dispatch_reminders` envía por cada canal activo: Email (Resend), Telegram, ntfy,
  Web Push, y — si `notify_client` está activo — email individual a cada cliente.
- Dedup diario en memoria (`_sent_push_today`).

## 7. Frontend (`/app/frontend/src/`)
```
App.js                  Router + transiciones. index.js/index.css entrypoints.
context/SettingsContext.jsx   Estado global (apariencia, idioma, seguridad, navConfig).
lib/api.js              Axios con REACT_APP_BACKEND_URL (todas las llamadas /api).
pages/                  Dashboard, Reservations, ReservationDetail, CalendarView,
                        Socios, DatabasePage, AppearancePage, Settings, UpdatesPage.
components/             Layout (sidebar), WelcomeTour, LockScreen, SecuritySection,
                        ReservationForm, SocioForm, TeamSection, LocationsSection,
                        SectionUnlockModal, appearance/*, ui/* (shadcn).
hooks/                  use-toast, useNotifications (VAPID), useAutoBackup, useAdvancedSecurity.
lib/                    celebrations (confetti), eventConfig, formDesigns, generatePDF,
                        sectionSearch, utils.
```

## 8. Comandos útiles
```bash
sudo supervisorctl status|restart backend|frontend
tail -n 100 /var/log/supervisor/backend.err.log
curl -s http://localhost:8001/api/            # health
cd /app/frontend && yarn install               # nunca npm
pip install -r /app/backend/requirements.txt
```

## 9. Testing
- Tests pytest en `backend/tests/` y `backend_test.py` (raíz).
- Reportes de iteraciones en `test_reports/`. Credenciales en `memory/test_credentials.md`.
- Sin autenticación por defecto (LockScreen opcional por contraseña de app).
