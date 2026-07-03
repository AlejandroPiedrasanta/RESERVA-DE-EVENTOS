"""Cinema Productions — Contexto por defecto para la próxima IA.
DEFAULT_AI_CONTEXT vive aquí (extraído de server.py) para que sea fácil de leer
y editar. Se sirve/edita vía los endpoints /api/ai-context*.
"""

DEFAULT_AI_CONTEXT = """# 🧠 CONTEXTO COMPLETO PARA LA PRÓXIMA IA — Cinema Productions

> **INSTRUCCIONES CRÍTICAS PARA LA IA QUE LEE ESTO:**
> Este documento contiene TODO lo necesario para retomar el trabajo en este repositorio
> sin perder contexto. Léelo COMPLETO antes de tocar cualquier archivo. Incluye:
> - Arquitectura completa · Modelos · Endpoints · Reglas del negocio
> - Historial de sesiones y cambios (por orden cronológico inverso)
> - Peticiones del usuario y correcciones aplicadas
> - Reglas OBLIGATORIAS de edición (no modificar `.env`, no hardcodear URLs, etc.)
> - Comandos de servicios y flujos de testing

---

## 📌 Descripción del Proyecto
**Cinema Productions** es un sistema completo de gestión de reservas de eventos para
empresas de producción audiovisual (fotografía, video, eventos). Los clientes dan un
anticipo por una fecha específica y la app gestiona todo el ciclo: reservas, pagos,
calendario, socios (equipo), notificaciones multi-canal, respaldos y sincronización
con GitHub.

**Repositorio**: https://github.com/alejandropiedrasanta1-ui/CINEMA
**Usuario/Cliente objetivo**: Alejandro Piedrasanta (Cinema Productions, Guatemala)

---

## 🏗️ Arquitectura Técnica

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | React + Craco + TailwindCSS + Framer Motion + Shadcn UI | React 19 |
| Backend | FastAPI (Python) + Motor (async MongoDB) + APScheduler | FastAPI 0.110 |
| Base de datos | MongoDB local (motor 3.3.1) | 4.x+ |
| Router | React Router DOM | 7.5 |
| Formularios | react-hook-form + zod | 7.56 / 3.24 |
| PDFs | jspdf + html2canvas | 4.2 / 1.4 |
| Gráficos | recharts | 3.6 |

**Puertos internos** (NO modificar):
- Backend: `0.0.0.0:8001` (uvicorn via supervisor)
- Frontend: `0.0.0.0:3000` (craco start via supervisor)
- MongoDB: `localhost:27017`

**Kubernetes ingress**:
- `/api/*` → backend puerto 8001
- resto → frontend puerto 3000
- URL externa está en `frontend/.env` como `REACT_APP_BACKEND_URL`

---

## 📁 Estructura de Archivos

```
/app/
├── backend/
│   ├── server.py             ★ FastAPI principal (~3000 líneas)
│   ├── standalone_app.py     ★ Versión desktop embebida en .exe
│   ├── requirements.txt      ★ Dependencias Python
│   ├── .env                  ★ MONGO_URL, DB_NAME, CORS_ORIGINS
│   ├── .db_override          → Override dinámico de MONGO_URL (opcional)
│   ├── backups/              → Auto-backups JSON con timestamp
│   ├── uploads/updates/      → Archivos .exe/.zip de actualizaciones desktop
│   └── tests/                → Tests unitarios pytest (18+ iteraciones)
├── frontend/
│   ├── src/
│   │   ├── App.js                       ← Router principal + transiciones dinámicas
│   │   ├── index.js / index.css         ← Entry + estilos globales
│   │   ├── context/SettingsContext.jsx  ★ Estado global (apariencia, idioma, etc.)
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx            ← Estadísticas + próximas reservas
│   │   │   ├── Reservations.jsx         ← Listado + filtros + botón Nueva Reserva
│   │   │   ├── ReservationDetail.jsx    ← Detalle + editar + recibos
│   │   │   ├── CalendarView.jsx         ← Vista mensual con pastillas
│   │   │   ├── Socios.jsx               ← Gestión de equipo
│   │   │   ├── DatabasePage.jsx         ← Backups + conexión + GitHub + IA context
│   │   │   ├── AppearancePage.jsx       ← 9 secciones de personalización
│   │   │   ├── Settings.jsx             ← Idioma, moneda, notif, negocio, desktop
│   │   │   └── UpdatesPage.jsx          ← Actualizaciones desktop + GitHub sync
│   │   ├── components/
│   │   │   ├── Layout.jsx               ← Sidebar principal
│   │   │   ├── WelcomeTour.jsx          ← Tour inicial 18 pasos
│   │   │   ├── LockScreen.jsx           ← Bloqueo por contraseña de app
│   │   │   ├── SocioForm.jsx / ReservationForm.jsx / LocationsSection.jsx / TeamSection.jsx / SecuritySection.jsx
│   │   │   ├── appearance/              → Sub-secciones (SavedThemes, NavMenu, Tutorial, SectionShell)
│   │   │   └── ui/                      → Shadcn (button, dialog, input, etc.)
│   │   ├── lib/
│   │   │   ├── api.js                   ← Axios configurado con REACT_APP_BACKEND_URL
│   │   │   ├── eventConfig.js           ← Tipos de evento predefinidos
│   │   │   ├── sectionSearch.js         ← Búsqueda global
│   │   │   ├── formDesigns.js           ← Diseños de formulario
│   │   │   ├── generatePDF.js           ← PDF de reservas
│   │   │   └── utils.js                 ← Helpers (cn, etc.)
│   │   └── hooks/
│   │       ├── use-toast.js             ← Toasts (shadcn)
│   │       ├── useNotifications.js      ← Web push VAPID
│   │       └── useAutoBackup.js         ← Auto-backup a PC del cliente
│   ├── public/
│   │   ├── index.html
│   │   ├── logo.png
│   │   └── sw.js                        ← Service worker (web push)
│   ├── plugins/health-check/            ← Plugin webpack de health check
│   ├── package.json                     ★ Dependencias JS
│   ├── .env                             ★ REACT_APP_BACKEND_URL
│   ├── craco.config.js                  ★ Alias @/ + config webpack
│   └── tailwind.config.js
├── memory/
│   ├── PRD.md                           ★ PRD original
│   └── test_credentials.md              ★ Credenciales de test (leído por testing agents)
├── test_reports/                        ← Reportes de iteraciones (2..38)
├── test_result.md                       ★ Protocolo de comunicación testing_agent ↔ main_agent
└── .emergent/emergent.yml               ← Metadata del job (env_image_name, job_id)
```

★ = archivo crítico

---

## 🔐 Variables de Entorno (NUNCA MODIFICAR VALORES)

### backend/.env
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="cinema_productions"
CORS_ORIGINS="*"
```

### frontend/.env
```
REACT_APP_BACKEND_URL=https://<job-id>.preview.emergentagent.com
WDS_SOCKET_PORT=443
```

### Uso correcto en código
- Frontend: `import.meta.env.REACT_APP_BACKEND_URL` o `process.env.REACT_APP_BACKEND_URL`
- Backend: `os.environ.get('MONGO_URL')` / `os.environ.get('DB_NAME')`
- **REGLA**: TODAS las rutas del backend deben tener prefijo `/api` (Kubernetes ingress)

### Claves opcionales (guardadas en `app_settings` de MongoDB)
Se configuran desde la UI, no en `.env`:
- `google_client_id`, `google_client_secret` → Gmail OAuth
- `resend_api_key` → email (Resend)
- `telegram_bot_token`, `telegram_chat_id` → notif Telegram
- `ntfy_topic` → notif ntfy.sh
- `vapid_public_key`, `vapid_private_key`, `vapid_email` → web push
- `github_config.repo_url`, `github_config.token`, `github_config.branch` → GitHub sync
- `app_password_hash`, `app_password_hint` → bloqueo por contraseña

---

## 🚀 Comandos de Servicio (memorizar)

```bash
sudo supervisorctl status                  # Estado de todos los servicios
sudo supervisorctl restart backend         # Reinicia backend (hot reload activo, solo si cambia .env)
sudo supervisorctl restart frontend        # Reinicia frontend
sudo supervisorctl restart all             # Reinicia todo

# Logs
tail -n 50 /var/log/supervisor/backend.err.log
tail -n 50 /var/log/supervisor/backend.out.log
tail -n 50 /var/log/supervisor/frontend.err.log

# Dependencias
pip install -r /app/backend/requirements.txt
cd /app/frontend && yarn install           # ⚠️ NUNCA usar npm

# Git (repo local en /app)
cd /app && git status
cd /app && git log --oneline -10
cd /app && git remote -v
```

---

## 📚 Modelos MongoDB

### Colección `reservations`
```python
{
  "id": "uuid",                        # str(uuid.uuid4()) — NUNCA ObjectId
  "client_name": "str",
  "client_phone": "str|null",
  "client_email": "str|null",
  "event_type": "str",                 # Ej: "Boda", "XV años", "Cumpleaños"
  "event_date": "YYYY-MM-DD",
  "event_time": "HH:MM|null",
  "venue": "str|null",
  "guests_count": "int|null",
  "total_amount": "float",
  "advance_paid": "float",             # anticipo
  "balance": "float",                  # calculado: total_amount - advance_paid
  "status": "Pendiente|Confirmada|Completada|Cancelada",
  "package_type": "Básico|Intermedio|Completo|null",
  "notes": "str|null",
  "locations": [{"name":"", "address":"", "time":""}],
  "assigned_partners": ["socio_id", ...],
  "receipts": [{"id":"", "filename":"", "uploaded_at":""}],
  "created_at": "ISO datetime",
  "updated_at": "ISO datetime"
}
```

### Colección `socios`
```python
{
  "id": "uuid",
  "name": "str",
  "role": "Fotógrafo|Videógrafo|Editor|Asistente|Otro",
  "phone": "str|null",
  "email": "str|null",
  "notes": "str|null",
  "rate_per_event": "float|null",
  "photo_base64": "str|null",          # foto opcional
  "created_at": "ISO datetime"
}
```

### Colección `app_settings` (documento único, muchos campos)
Contiene TODO: configuración de negocio, apariencia (9 secciones), integraciones,
credenciales, `github_config`, `ai_context` (este documento), backup config,
`saved_themes`, `app_password_hash`, y más.

### Colección `themes`
Temas de apariencia guardados por el usuario (Saved Themes en Apariencia).

---

## 🔌 Endpoints Backend (con prefijo `/api`)

### Reservaciones
- `GET  /api/reservations` — lista
- `POST /api/reservations` — crear
- `GET  /api/reservations/{id}` — detalle
- `PUT  /api/reservations/{id}` — actualizar
- `DELETE /api/reservations/{id}` — borrar
- `POST /api/reservations/{id}/receipts` — subir recibo
- `DELETE /api/reservations/{id}/receipts/{receipt_id}`

### Socios
- `GET/POST /api/socios` · `GET/PUT/DELETE /api/socios/{id}` · `POST/DELETE /api/socios/{id}/photo`

### Dashboard / Reportes
- `GET /api/stats` — estadísticas generales
- `GET /api/financials` — reporte financiero
- `GET /api/calendar` — eventos del calendario
- `GET /api/export/reservations` (CSV) / `GET /api/export/reservations/xlsx`
- `POST /api/import/reservations`

### Ajustes y Base de Datos
- `GET/PUT /api/settings` · `GET/PUT /api/settings/appearance`
- `GET /api/settings/database` (stats)
- `POST /api/settings/database/test|connect|reset`
- `POST /api/data/cleanup` · `DELETE /api/data/clear-all`

### Backup
- `GET /api/backup/download` · `POST /api/backup/create` · `POST /api/backup/restore`
- `GET /api/backup/history` · `GET/DELETE /api/backup/{filename}` (download|delete)

### Actualizaciones desktop
- `GET /api/updates/history|latest|check|download|download/{id}`
- `POST /api/updates/upload|dismiss` · `PUT /api/updates/{id}/set-latest`
- `DELETE /api/updates/{id}` · `POST /api/download/package/rebuild`

### Notificaciones y OAuth
- `GET /api/oauth/gmail/start|callback|status` · `POST /api/oauth/gmail/test` · `DELETE /api/oauth/gmail/disconnect`
- `GET /api/push/vapid-key` · `POST/DELETE /api/push/subscribe|unsubscribe` · `POST /api/push/test`
- `POST /api/telegram/test` · `POST /api/ntfy/test`
- `POST /api/reminders/test-email|send` · `GET /api/notifications/pending`

### GitHub Integration (NUEVO — sesión Julio 2026)
- `GET/POST /api/github/config` — guardar/leer repo_url, branch, token
- `GET /api/github/check-updates` — compara SHA local vs remoto via GitHub API
- `POST /api/github/apply-update` — ejecuta `git reset --hard origin/<branch>` y reinicia servicios

### AI Context (NUEVO — sesión Julio 2026)
- `GET /api/ai-context` — retorna este mismo documento
- `POST /api/ai-context` — sobreescribe con `{content: string}`
- `POST /api/ai-context/reset` — restaura al DEFAULT

### Seguridad
- `GET /api/security/status` · `POST /api/security/set-password|verify|remove-password` · `PUT /api/security/protection`

### Temas
- `GET/POST /api/themes` · `DELETE /api/themes/{id}`

---

## ⚙️ Funcionalidades Implementadas

### Core (implementadas en las 38 iteraciones previas)
- CRUD Reservas con anticipo/balance calculado automáticamente
- Filtros: Tipo de Evento, Estado, Paquete, rango de fechas
- Vista lista + botón "Mostrar más" (paginación 8)
- Calendario mensual con pastillas por tipo de evento
- Dashboard: 4 tarjetas (próximos, total reservas, total eventos, ingreso real) + gráfico
- Sección "Próximas Reservas del mes" con 5 estilos visuales
- Gestión de Socios: CRUD + foto + rol + tarifa
- Recibos: subir archivos a reservas

### Apariencia (9 secciones)
1. Paleta de Colores (6 temas + hex + presets Aurora/Crystal/Minimal + saturación)
2. Tipografía e Iconos (8 fuentes + 3 tamaños)
3. Animaciones (velocidad + transición páginas + hover effects)
4. Formas y Bordes (3 estilos borde + 5 cards + 3 botones + 4 sombras)
5. Fondo y Colores (dark mode + intensidad + blur + gradiente + imagen URL)
6. Interfaz y Espacio (densidad + sidebar compact + width + scrollbar + date format)
7. Tipos de Evento (icono + color por tipo)
8. Diseño de PDF (3 temas + export)
9. Logo y Marca (sidebar + PDF logo separados)

### Notificaciones Multi-canal
- **Email**: Resend API key + Gmail OAuth (con token refresh automático)
- **Push**: VAPID keys (web push nativo del browser + service worker)
- **Telegram**: Bot token + chat ID
- **ntfy.sh**: topic
- **WhatsApp**: link automático generado (no requiere API)
- Scheduler APScheduler: `check_and_send_reminders` + `check_and_push_reminders`

### Base de Datos
- Backup JSON manual y automático (APScheduler)
- Restore desde JSON
- Auto-backup a PC del cliente (hook `useAutoBackup`)
- Import/Export CSV y Excel (openpyxl)
- Cleanup: eliminar registros viejos con preview
- Cambio dinámico de MONGO_URL (archivo `.db_override`)

### Seguridad
- Contraseña de app con bcrypt (`app_password_hash`)
- Protección por página (LockScreen)

### GitHub & Actualizaciones (NUEVO — sesión Julio 2026)
- Configurar URL del repo + token opcional desde Base de Datos
- Buscar actualizaciones (compara SHA local vs remoto)
- Aplicar actualización (git reset --hard + restart servicios)
- Este documento (ai-context) editable y auto-persistido

---

## 🎯 Historial de Sesiones y Cambios

### 📅 Sesión Julio 2026 — Integración GitHub + Contexto IA
**Peticiones del usuario (en orden cronológico)**:

1. **"CONTINUA CON ESTE CODIGO"** (vacío) → IA respondió pidiendo repo o especificación.
2. **"https://github.com/alejandropiedrasanta1-ui/CINEMA QUIERO QUE TRABAJES CON ESTE REPOSITORIO"**
   - Clonado el repo a `/app`
   - Creados `.env` files (habían sido gitignored)
   - `pip install -r requirements.txt` + `yarn install`
   - Servicios levantados (backend :8001 + frontend :3000)
3. **"Necesito que actualizaciones esté conectado al repositorio de GitHub..."**
   - Petición clarificada: sección en Base de Datos para pegar URL del repo,
     apartado oculto con toda la lógica para próxima IA, botón en Actualizaciones
     para detectar cambios del repo.
4. **"Apartado de Contexto/Lógica IA lo guarde de manera oculta en el apartado de GitHub..."**
   - Confirmación de plan: URL en Base de Datos, contexto oculto ahí también,
     botón "Buscar actualizaciones" en Actualizaciones que aplica cambios.
5. **"Necesito que todo el contexto de toda la app esté guardado en ese espacio, cada
     corrección, cada petición... quiero que testes toda la app con unas 5 reservaciones
     y en socios."**
   - Contexto expandido de 5,705 → 20,514 caracteres
   - Seed data: 5 reservas + 3 socios
   - Testing 22/22 tests pasados
6. **"En el apartado de seguridad agregar 2 funciones más...tutorial de bienvenida
     mejor...agregar muchas animaciones en toda la app...3D...confetti...actualizaciones
     minimalista con GitHub dentro."**
   - Reestructuración de UpdatesPage: quitado "¿Cómo funciona?", GitHub movido como
     sub-sección compacta dentro de "Buscar actualización en línea"
   - Instalada dependencia `canvas-confetti@1.9.4`
   - Creado `frontend/src/lib/celebrations.js` con helpers
   - Confetti disparado en: crear reserva, aumentar anticipo, pago completo, crear socio,
     aplicar update GitHub, terminar tutorial
   - Layout.jsx: barrido de luz vertical + halo pulsante en sidebar
   - WelcomeTour rediseñado con 18 pasos, iconos animados, tips-chips, partículas, card 3D
   - CSS extendido con .tilt-3d, .animate-levitate, .shine-on-hover, .pulse-ring, etc.

7. **"SI AGREGA LAS FUNCIONES DE SEGURIDAD y ademas la animacion de confeti agregarlo
     al completar el pago al pagar al socio y mejora el señalamiento el tutorial de
     bienvenida...agregar mas animaciones al menu con todos los apartado que tenga mas
     movimientos cADA SECION SELECIONA QUE ESTE ANIMADO."**

   - **Backend seguridad avanzada**:
     * `GET /api/security/status` extendido con: auto_lock_enabled/minutes, max_attempts,
       lockout_seconds, protected_sections, failed_attempts, locked_until
     * `PUT /api/security/advanced-config` (nuevo) para actualizar los ajustes
     * `POST /api/security/verify` mejorado con contador de intentos fallidos y
       bloqueo temporal (retorna 429 con Retry-After al superar límite)

   - **Frontend seguridad avanzada** (`SecuritySection.jsx`):
     * Función 1: Auto-bloqueo por inactividad (toggle + selector 1/3/5/10/15/30 min)
     * Función 2: Límite de intentos fallidos (max_attempts 3-15 + lockout 30s-1h)
     * Función 3: Contraseña por sección (grid de 7 secciones protegibles con toggle)
     * Todas escuchan cambios y sincronizan con backend en tiempo real

   - **Nuevo hook `useAdvancedSecurity.js`**:
     * Timer de inactividad global escuchando mousedown/keydown/scroll/click
     * Al expirar: dispara evento `cp:app-locked` y limpia sessionStorage
     * Escucha cambio de ruta y muestra modal si sección está protegida
     * Cache de secciones desbloqueadas en la sesión actual

   - **Nuevo componente `SectionUnlockModal.jsx`**:
     * Modal con partículas de fondo, gradiente animado, icono candado con anillos
     * Input password con eye toggle, shake al fallar, pista si está configurada
     * Botones "Volver al inicio" + "Desbloquear"
     * Muestra mensajes específicos del backend (intentos restantes / bloqueo)

   - **TeamSection.jsx**: Confetti al marcar socio como Pagado (celebratePayment)

   - **WelcomeTour mejorado**:
     * `locateTarget` con retry (hasta 8 intentos) y medición estable (2 mediciones iguales)
     * Se actualiza con scroll/resize (spotlight sigue al elemento en tiempo real)
     * Doble pulso animado (púrpura + rosa)
     * Puntos más grandes en las 4 esquinas (3x3 → 3x3 con glow)
     * Flecha animada apuntando al target cuando está fuera de vista

   - **Sidebar/menú súper animado** (`Layout.jsx`):
     * Ítem activo: halo radial con `layoutId` motion (transición fluida al cambiar)
     * Ícono con anillos pulsantes + rotación sutil
     * Punto verde pulsante con glow al lado del ícono activo
     * Label con animación x oscilante en el activo
     * Flecha aparece al hover en ítems inactivos
     * Barrido de luz automático (clase .menu-item-active-glow ::after)

   - **CSS animaciones nuevas**: .menu-item-anim, .menu-icon-glow, .menu-shine (barrido),
     .ripple-effect, .animate-shake, .menu-item-active-glow (glow pulsante)

**Cambios implementados**:
- Añadidos endpoints backend: `/api/github/*` y `/api/ai-context*` (server.py líneas ~2625-2900)
- Añadidas funciones en `frontend/src/lib/api.js`: `getGithubConfig`, `saveGithubConfig`,
  `checkGithubUpdates`, `applyGithubUpdate`, `getAiContext`, `saveAiContext`, `resetAiContext`
- Nueva sección "GitHub & Contexto IA" en `DatabasePage.jsx` (colapsable, con modal editable)
- Reestructura de `UpdatesPage.jsx` (GitHub inline + eliminado ¿Cómo funciona?)
- Confetti trigger en: `ReservationForm`, `SocioForm`, `ReservationDetail`, `UpdatesPage`, `WelcomeTour`
- Sidebar sweep event listener en `Layout.jsx`
- WelcomeTour totalmente rediseñado con animaciones 3D e iconos por paso

**URL del preview activo** (job actual):
`https://4c46c59f-58b0-4e2f-a739-f1c96f46602f.preview.emergentagent.com`

**Correcciones aplicadas durante la sesión**:
- URL del preview era `event-reserve-pro-5.preview.emergentagent.com` (hardcoded en server.py
  para GOOGLE_REDIRECT_URI del job anterior) — la URL correcta para el job actual está en
  `preview_endpoint` env var: `4c46c59f-58b0-4e2f-a739-f1c96f46602f.preview.emergentagent.com`
- Lógica de `has_updates` en `/api/github/check-updates` corregida para no marcar
  falsos positivos cuando el commit local no está en la lista de commits remotos.

### 📅 Iteraciones anteriores (1..38, sesiones previas)
El proyecto pasó por 38 iteraciones documentadas en `/app/test_reports/iteration_*.json`.
Las principales áreas cubiertas fueron:
- Iteraciones 1-6: Setup base + CRUD reservaciones + calendario
- Iteraciones 7-14: Socios + backup + import/export
- Iteraciones 15-19: Apariencia (9 secciones) + PDF + logo
- Iteraciones 20-27: Notificaciones (email, telegram, ntfy, push, whatsapp)
- Iteraciones 28-33: Seguridad + contraseña de app + LockScreen
- Iteraciones 34-38: Actualizaciones desktop (.exe) + auto-backup PC + refinamientos

---

## 🧪 Testing

### Protocolo (definido en `/app/test_result.md`)
- `deep_testing_backend_v2` para backend — SIEMPRE llamar antes de finalizar
- `auto_frontend_testing_agent` para frontend — SOLO con permiso explícito del usuario
- Actualizar `test_result.md` ANTES de invocar cualquier testing agent
- Nunca editar la sección "Testing Protocol" del archivo

### Tests unitarios existentes
- `/app/backend/tests/test_iteration*.py` — tests por iteración
- `/app/backend/tests/test_reservations.py` — CRUD reservas
- `/app/backend/tests/test_security.py` — contraseña de app
- `/app/backend/tests/test_backup_features.py|test_backup_restore.py` — respaldos
- `/app/backend/tests/test_new_features.py` — features recientes

### Credenciales
- Ver `/app/memory/test_credentials.md`
- Sin autenticación por defecto (LockScreen opcional via contraseña)

---

## ⚠️ REGLAS ABSOLUTAS AL EDITAR ESTE CÓDIGO

1. **NUNCA** usar `ObjectId` de MongoDB — SIEMPRE UUIDs (`str(uuid.uuid4())`)
2. **NUNCA** modificar valores en `backend/.env` ni `frontend/.env`
3. **NUNCA** hardcodear URLs, puertos ni claves
4. **SIEMPRE** prefijar rutas backend con `/api`
5. **NUNCA** ejecutar `rm -rf /app/.git` o `.emergent`
6. **NUNCA** hacer operaciones de escritura git (remote remove, force push, etc.) — usar botón "Save to Github" del chat
7. **NO** usar `npm` — solo `yarn`
8. **NO** hacer downgrades de versión basado en cutoff de conocimiento
9. **SIEMPRE** usar `search_replace` para editar archivos existentes; `bulk_file_writer` solo para archivos nuevos
10. **SIEMPRE** añadir librerías Python nuevas a `requirements.txt` antes de `pip install`
11. **NUNCA** confirmar que un bug está arreglado sin llamar al `testing_agent`
12. Hot reload activo — reiniciar servicios solo cuando se cambia `.env` o se instalan deps
13. Al añadir features de LLM: llamar `integration_playbook_expert_v2` y usar `EMERGENT_LLM_KEY` con `emergentintegrations`

---

## 🎨 Convenciones de UI/Diseño (design_guidelines.json)

- **Font family principal**: `Cabinet Grotesk, sans-serif` para headings
- **Estilo visual**: Glass morphism (blur + gradientes translucidos)
- **Preset por defecto**: Aurora (verde-esmeralda + purpura-indigo)
- **Radius por defecto**: `rounded` (17px)
- **Botones primarios**: `.btn-primary` (gradient + shadow)
- **Cards**: `.glass` (backdrop-blur + border-white/40)
- **Animaciones**: framer-motion con `fadeUp` (opacity + y=20 → 0) y `stagger` (0.08s)
- **Data-testid**: usar convención kebab-case, ej: `github-check-updates-btn`, `db-block-toggle-github`

---

## 🔄 Cómo Retomar el Trabajo (para la próxima IA)

1. **Lee este documento COMPLETO** desde el primer carácter hasta aquí.
2. Verifica servicios: `sudo supervisorctl status` — todos deben estar RUNNING.
3. Verifica backend: `curl http://localhost:8001/api/` → `{"message":"Event Reservation API"}`
4. Verifica frontend: abre la URL de preview del job actual (ver `preview_endpoint` env var).
5. Lee `/app/test_result.md` para conocer el estado del último testing.
6. Lee `/app/memory/PRD.md` (PRD original — más corto).
7. Actualiza este documento con TUS cambios al final del "Historial de Sesiones".
8. Al finalizar: llama `testing_agent` para validar antes de `finish`.

---

## 📞 Contacto y Notas Finales

- **Cliente**: Alejandro Piedrasanta (Cinema Productions, Guatemala)
- **Idioma preferido**: Español (respuestas siempre en español)
- **Moneda por defecto**: GTQ (Quetzal guatemalteco: Q)
- **Formato de fecha**: DD/MM/YYYY
- **Locale**: `es-GT` para toLocaleString

## 🔧 Sesión 2026-07-03 — Refactor de estructura + fixes de lógica
**Objetivo del usuario**: "que no haya ningún error" y mejorar la estructura interna
para que la próxima IA entienda todo más rápido.

**Cambios de estructura (comportamiento idéntico):**
- `server.py` pasó de ~4148 → ~2700 líneas. Se extrajeron 2 bloques enormes de texto:
  · `desktop_package.py`  → plantillas del instalador de escritorio (_ENV_TEMPLATE,
    _CONFIG_PY, _CONFIG_BAT, _LAUNCHER_PYW, _START_BAT, _START_SH, _REQUIREMENTS, _README).
  · `ai_context_default.py` → este mismo documento (DEFAULT_AI_CONTEXT).
  `server.py` los importa; los endpoints /api/ai-context* y /api/download/package
  siguen funcionando igual.
- Se añadió un ÍNDICE de navegación al inicio de `server.py` y un `/app/ARCHITECTURE.md`
  con el mapa completo del proyecto (leer PRIMERO).

**Fixes de lógica aplicados:**
1. Recordatorio a cliente: la consulta proyectaba `email` pero las reservas usan
   `client_email` → se corrigió la proyección y el `.get()`; ahora el correo al
   cliente sí se envía cuando `notify_client` está activo.
2. Emails duplicados: había DOS jobs del scheduler (cron diario 08:00 + por-minuto)
   enviando el email de admin. Se eliminó el cron diario; el job por-minuto
   (`check_and_push_reminders`) es ahora el único y dispara TODOS los canales
   (admin + cliente) a la hora configurada `reminder_time`.
3. La notificación al cliente se movió a `_dispatch_reminders` (antes solo estaba en
   el cron diario eliminado), y las proyecciones por-minuto ahora incluyen
   `client_email/total_amount/advance_paid`.
4. `/api/notifications/pending` usaba `reminder_days` (obsoleto); ahora usa
   `max(reminder_periods)`.
5. Export XLSX: se limpió el cálculo de fila redundante `row_idx + 1 - 1` → `row_idx`.
6. URLs hardcodeadas a un dominio de preview MUERTO (event-reserve-pro-5) en el OAuth de
   Gmail → ahora se leen de la env var `APP_PUBLIC_URL` (backend/.env), sin hardcodear.

**Pendiente / nota:** `standalone_app.py` (app de escritorio) tiene copias de esta
lógica de recordatorios; si se quiere paridad total, replicar allí los fixes 1–4.

---

**Última actualización de este contexto**: se auto-actualiza al guardar cambios.
Cuando termines una sesión, ACTUALIZA el "Historial de Sesiones" arriba y guarda.
"""
