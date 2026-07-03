"""Cinema Productions — Plantillas del paquete de escritorio (instalador local).
Contiene los archivos embebidos (.env, config.py/.bat, launcher, start.bat/.sh,
requirements.txt, README) que se empaquetan en el ZIP descargable.
Extraído de server.py para reducir su tamaño; importado por server.py.
"""

_ENV_TEMPLATE = """# =======================================================
#  CINEMA PRODUCTIONS - Configuracion de Base de Datos
# =======================================================
#
# Opciones para MONGO_URL:
#
#   embedded
#       Base de datos LOCAL sin internet.
#       Los datos se guardan en cinema_data.json (mismo directorio).
#       Recomendado para uso personal en un solo PC.
#
#   mongodb://localhost:27017
#       MongoDB instalado en tu computadora.
#
#   mongodb+srv://usuario:contrasena@cluster.mongodb.net
#       MongoDB Atlas (nube gratuita en mongodb.com/atlas)
#       Accesible desde cualquier dispositivo.
#
# Para cambiar: edita este archivo con el Bloc de Notas, guarda y reinicia la app.
# O usa la interfaz: Ajustes > Base de Datos > Cambiar conexion MongoDB
#
# Viene configurada de fabrica con tu MongoDB Atlas (nube). Para usar la base
# local en su lugar, cambia la linea de abajo por:  MONGO_URL=embedded
MONGO_URL=mongodb+srv://reu1:cinemaproductions@cluster0.ozg25wu.mongodb.net/?appName=Cluster0
DB_NAME=cinema_productions
"""

_CONFIG_PY = r'''"""Cinema Productions — Configurador Visual de Base de Datos
Ejecutar: python config.py  (o doble clic en config.bat)
"""
import tkinter as tk
from tkinter import messagebox
from pathlib import Path

ROOT_DIR = Path(__file__).parent
ENV_FILE = ROOT_DIR / ".env"


def _read_env():
    config = {}
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                config[k.strip()] = v.strip()
    return config


def _write_env(mongo_url: str, db_name: str):
    content = (
        "# Cinema Productions - Configuracion de Base de Datos\n"
        "#\n"
        "# Opciones:\n"
        "#   embedded                              Base de datos local (cinema_data.json)\n"
        "#   mongodb://localhost:27017             MongoDB en tu PC\n"
        "#   mongodb+srv://user:pass@cluster       MongoDB Atlas (nube gratuita)\n"
        "#\n"
        "# Edita este archivo con el Bloc de Notas y guarda.\n"
        f"MONGO_URL={mongo_url}\n"
        f"DB_NAME={db_name}\n"
    )
    ENV_FILE.write_text(content, encoding="utf-8")


def main():
    cfg = _read_env()
    current_url = cfg.get("MONGO_URL", "embedded")
    db_name = cfg.get("DB_NAME", "cinema_productions")

    root = tk.Tk()
    root.title("Cinema Productions — Configurar Base de Datos")
    root.resizable(False, False)
    root.configure(bg="#0f0e17")

    W, H = 560, 420
    root.update_idletasks()
    x = (root.winfo_screenwidth() - W) // 2
    y = (root.winfo_screenheight() - H) // 2
    root.geometry(f"{W}x{H}+{x}+{y}")

    # ── Header ──────────────────────────────────────────
    hdr = tk.Frame(root, bg="#4f46e5", height=72)
    hdr.pack(fill="x")
    hdr.pack_propagate(False)
    tk.Label(hdr, text="CINEMA PRODUCTIONS", font=("Segoe UI", 15, "bold"),
             bg="#4f46e5", fg="white").pack(pady=(14, 0))
    tk.Label(hdr, text="Configuracion de Base de Datos", font=("Segoe UI", 9),
             bg="#4f46e5", fg="#c7d2fe").pack()

    # ── Body ─────────────────────────────────────────────
    body = tk.Frame(root, bg="#0f0e17", padx=28, pady=18)
    body.pack(fill="both", expand=True)

    tk.Label(body, text="URL de conexion MongoDB:", font=("Segoe UI", 10, "bold"),
             bg="#0f0e17", fg="white", anchor="w").pack(fill="x")
    tk.Label(body,
             text='embedded  |  mongodb://localhost:27017  |  mongodb+srv://user:pass@cluster',
             font=("Courier New", 8), bg="#0f0e17", fg="#6b7280", anchor="w").pack(fill="x", pady=(3, 8))

    url_var = tk.StringVar(value=current_url)
    entry = tk.Entry(body, textvariable=url_var, font=("Courier New", 10),
                     bg="#1e1b4b", fg="#c7d2fe", insertbackground="white",
                     relief="flat", bd=8)
    entry.pack(fill="x")
    entry.focus_set()

    # ── Quick buttons ────────────────────────────────────
    qf = tk.Frame(body, bg="#0f0e17")
    qf.pack(fill="x", pady=(10, 0))
    tk.Label(qf, text="Opciones rapidas:", font=("Segoe UI", 9),
             bg="#0f0e17", fg="#9ca3af").pack(side="left", padx=(0, 8))

    for label, val in [
        ("Embebida (local)", "embedded"),
        ("MongoDB local", "mongodb://localhost:27017"),
    ]:
        tk.Button(qf, text=label, command=lambda v=val: url_var.set(v),
                  bg="#1e1b4b", fg="#a5b4fc", font=("Segoe UI", 9),
                  relief="flat", padx=10, pady=4, cursor="hand2").pack(side="left", padx=4)

    # ── Info box ─────────────────────────────────────────
    ib = tk.Frame(body, bg="#1c1917")
    ib.pack(fill="x", pady=(16, 0))
    tk.Label(ib,
             text="Consejo: tambien puedes abrir el archivo  .env  directamente con el Bloc de Notas y editar MONGO_URL.",
             font=("Segoe UI", 8), bg="#1c1917", fg="#78716c",
             wraplength=480, justify="left", padx=10, pady=8).pack(fill="x")

    # ── Buttons ──────────────────────────────────────────
    bf = tk.Frame(root, bg="#111827", pady=14)
    bf.pack(fill="x")

    def open_notepad():
        import subprocess
        subprocess.Popen(["notepad.exe", str(ENV_FILE)])

    def save():
        url = url_var.get().strip()
        if not url:
            messagebox.showerror("Error", "Por favor ingresa una URL de MongoDB.", parent=root)
            return
        _write_env(url, db_name)
        messagebox.showinfo(
            "Guardado",
            f"Configuracion guardada exitosamente.\n\nMONGO_URL = {url}\n\nReinicia la app para aplicar el cambio.",
            parent=root,
        )
        root.destroy()

    tk.Button(bf, text="  Abrir .env en Bloc de Notas  ", command=open_notepad,
              bg="#374151", fg="#d1d5db", font=("Segoe UI", 9),
              relief="flat", padx=12, pady=7, cursor="hand2").pack(side="left", padx=(24, 8))

    tk.Button(bf, text="  Guardar Configuracion  ", command=save,
              bg="#4f46e5", fg="white", font=("Segoe UI", 10, "bold"),
              relief="flat", padx=16, pady=7, cursor="hand2").pack(side="right", padx=(8, 24))

    root.mainloop()


if __name__ == "__main__":
    main()
'''

_CONFIG_BAT = r"""@echo off
title Cinema Productions - Configuracion
echo.
echo  Abriendo configuracion de Cinema Productions...
echo.
python --version >nul 2>&1
if not errorlevel 1 ( python config.py & goto FIN )
py --version >nul 2>&1
if not errorlevel 1 ( py config.py & goto FIN )
echo  Python no encontrado. Abriendo .env en el Bloc de Notas...
notepad .env
:FIN
"""


# =====================================================================
# _LAUNCHER_PYW  -  Ventana grafica moderna con Tkinter (Windows/Linux/Mac)
# Se lanza desde start.bat con doble clic. Boton central animado + barra
# de progreso minimalista. Instala dependencias en background y abre el
# servidor + navegador al terminar.
# =====================================================================
_LAUNCHER_PYW = r'''# Cinema Productions - Launcher local (arranque sin consola)
import os, sys, time, socket, threading, subprocess, webbrowser, traceback
from pathlib import Path
import tkinter as tk
from tkinter import ttk

APP_DIR = Path(__file__).resolve().parent
os.chdir(APP_DIR)
PORT = 8001
URL = "http://127.0.0.1:8001"

BG = "#0b1020"; ACC = "#6d5efc"; OK = "#22c55e"; ERR = "#ef4444"
TXT = "#eef0fb"; DIM = "#8b90a6"
NO_WINDOW = 0x08000000 if sys.platform == "win32" else 0


def port_open(timeout=0.5):
    try:
        with socket.create_connection(("127.0.0.1", PORT), timeout=timeout):
            return True
    except OSError:
        return False


def pythonw_exe():
    if sys.platform == "win32":
        cand = Path(sys.executable).with_name("pythonw.exe")
        if cand.exists():
            return str(cand)
    return sys.executable


class App:
    def __init__(self, root):
        self.root = root
        self.proc = None
        root.title("Cinema Productions")
        root.configure(bg=BG)
        w, h = 560, 380
        sw, sh = root.winfo_screenwidth(), root.winfo_screenheight()
        root.geometry("%dx%d+%d+%d" % (w, h, (sw - w) // 2, (sh - h) // 2))
        root.resizable(False, False)
        try:
            root.attributes("-alpha", 0.0)
            self._fade_in()
        except Exception:
            pass

        self.topbar = tk.Frame(root, bg=ACC, height=4)
        self.topbar.pack(fill="x")
        self._pulse_bar()
        tk.Label(root, text="CINEMA PRODUCTIONS", bg=BG, fg=TXT,
                 font=("Segoe UI Semibold", 23)).pack(pady=(46, 2))
        tk.Label(root, text="Gestor de Reservas de Eventos", bg=BG, fg=DIM,
                 font=("Segoe UI", 11)).pack()

        style = ttk.Style(root)
        try:
            style.theme_use("clam")
        except Exception:
            pass
        style.configure("CP.Horizontal.TProgressbar", troughcolor="#1a2036",
                        background=ACC, bordercolor=BG, lightcolor=ACC,
                        darkcolor=ACC, thickness=7)
        self.bar = ttk.Progressbar(root, style="CP.Horizontal.TProgressbar",
                                   length=420, mode="determinate", maximum=100)
        self.bar.pack(pady=(52, 12))
        self.status = tk.Label(root, text="Iniciando...", bg=BG, fg=TXT,
                               font=("Segoe UI", 11))
        self.status.pack()
        self.detail = tk.Label(root, text="", bg=BG, fg=DIM, font=("Consolas", 9))
        self.detail.pack(pady=(5, 0))
        self.retry = tk.Button(root, text="Reintentar", command=self.start,
                               bg=ACC, fg="white", activebackground="#5648e0",
                               activeforeground="white", relief="flat", bd=0,
                               padx=22, pady=7, cursor="hand2",
                               font=("Segoe UI Semibold", 10))
        root.after(250, self.start)

    def _fade_in(self, a=0.0):
        a = min(1.0, a + 0.08)
        try:
            self.root.attributes("-alpha", a)
        except Exception:
            return
        if a < 1.0:
            self.root.after(16, lambda: self._fade_in(a))

    _pulse_shades = ["#6d5efc", "#8b7dff", "#a99dff", "#8b7dff"]

    def _pulse_bar(self, i=0):
        try:
            self.topbar.config(bg=self._pulse_shades[i % len(self._pulse_shades)])
            self.root.after(520, lambda: self._pulse_bar(i + 1))
        except Exception:
            pass

    def set(self, pct=None, status=None, detail=None, color=None):
        def _do():
            if pct is not None:
                self.bar["value"] = pct
            if status is not None:
                self.status.config(text=status)
            if detail is not None:
                self.detail.config(text=str(detail)[:78], fg=DIM)
            if color is not None:
                self.status.config(fg=color)
        self.root.after(0, _do)

    def fail(self, title, log_text=""):
        try:
            (APP_DIR / "error_log.txt").write_text(title + "\n\n" + (log_text or ""),
                                                   encoding="utf-8", errors="ignore")
        except Exception:
            pass

        def _do():
            self.bar["value"] = 100
            self.status.config(text=title, fg=ERR)
            self.detail.config(text="Detalle guardado en error_log.txt", fg=DIM)
            self.retry.pack(pady=(18, 0))
        self.root.after(0, _do)

    def start(self):
        self.retry.pack_forget()
        self.status.config(fg=TXT)
        threading.Thread(target=self._run, daemon=True).start()

    def _run(self):
        try:
            if port_open():
                self.set(100, "La app ya estaba abierta", URL, OK)
                webbrowser.open(URL)
                self.root.after(1200, self.root.destroy)
                return

            if not (APP_DIR / ".deps_ok").exists():
                if not self._install():
                    return
            else:
                self.set(62, "Dependencias listas", "arranque rapido")

            self.set(80, "Iniciando servidor...", "app.py")
            log = open(APP_DIR / "server_log.txt", "w", encoding="utf-8", errors="ignore")
            self.proc = subprocess.Popen([pythonw_exe(), "app.py"], cwd=str(APP_DIR),
                                         stdout=log, stderr=subprocess.STDOUT,
                                         creationflags=NO_WINDOW,
                                         env={**os.environ, "CP_NO_BROWSER": "1"})

            for i in range(50):
                if port_open():
                    self.set(100, "Abriendo navegador...", URL, OK)
                    time.sleep(0.2)
                    webbrowser.open(URL)
                    self.set(100, "App corriendo - puedes cerrar esta ventana", URL, OK)
                    self.root.after(1600, self.root.destroy)
                    return
                if self.proc.poll() is not None:
                    tail = ""
                    try:
                        tail = (APP_DIR / "server_log.txt").read_text(
                            encoding="utf-8", errors="ignore")[-1600:]
                    except Exception:
                        pass
                    self.fail("El servidor se cerro al iniciar", tail)
                    return
                self.set(80 + i * 0.4, None, "esperando servidor (%ds)" % (i // 2 + 1))
                time.sleep(0.4)

            self.fail("El servidor no respondio a tiempo",
                      "Revisa server_log.txt. Posible causa: el puerto 8001 esta ocupado.")
        except Exception as e:
            self.fail("Error inesperado: %s" % e, traceback.format_exc())

    def _install(self):
        req = APP_DIR / "requirements.txt"
        if not req.exists():
            return True
        libs = APP_DIR / "libs"
        base = [sys.executable, "-m", "pip", "install",
                "--disable-pip-version-check", "-q"]
        attempts = []
        if libs.exists() and any(libs.glob("*.whl")):
            attempts.append(("paquete local (sin internet)",
                             base + ["--no-index", "--find-links", str(libs),
                                     "-r", str(req)]))
        attempts.append(("descarga online", base + ["-r", str(req)]))

        self.set(10, "Instalando dependencias (solo la primera vez)...",
                 "puede tardar ~1 minuto")
        out = ""
        for idx, (label, cmd) in enumerate(attempts):
            self.set(18 + idx * 14, None, "instalando: %s" % label)
            try:
                r = subprocess.run(cmd, cwd=str(APP_DIR), stdout=subprocess.PIPE,
                                   stderr=subprocess.STDOUT, text=True,
                                   creationflags=NO_WINDOW)
                out = r.stdout or ""
                if r.returncode == 0:
                    (APP_DIR / ".deps_ok").write_text("ok", encoding="utf-8")
                    self.set(62, "Dependencias instaladas", "listo")
                    return True
            except Exception as e:
                out += "\n" + str(e)
        self.fail("No se pudieron instalar las dependencias", out[-1800:])
        return False


def main():
    root = tk.Tk()
    App(root)
    root.mainloop()


if __name__ == "__main__":
    main()
'''


_INICIAR_VBS = r"""' Cinema Productions - Iniciar SIN ventana de consola (recomendado)
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
d = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = d
q = Chr(34)
target = q & d & "\launcher.pyw" & q
On Error Resume Next
sh.Run "pythonw " & target, 0, False
If Err.Number <> 0 Then
  Err.Clear
  sh.Run "py -w " & target, 0, False
End If
If Err.Number <> 0 Then
  Err.Clear
  sh.Run "python " & target, 0, False
End If
"""


_START_BAT = """@echo off
title Cinema Productions
cd /d "%~dp0"

REM =============================================================
REM  Arranque rapido SIN consola: lanza el launcher grafico
REM  (ventana con barra de progreso, sin ventana negra).
REM  La primera vez instala dependencias (1-3 min); despues
REM  arranca en segundos.
REM =============================================================

where pythonw >nul 2>&1
if not errorlevel 1 (
    start "" pythonw launcher.pyw
    exit /b
)

where py >nul 2>&1
if not errorlevel 1 (
    start "" py -w launcher.pyw
    exit /b
)

where python >nul 2>&1
if not errorlevel 1 (
    start "" python launcher.pyw
    exit /b
)

echo.
echo  ==========================================================
echo   Python no esta instalado o no esta en el PATH.
echo   Descargalo desde: https://www.python.org/downloads/
echo   IMPORTANTE: marca "Add Python to PATH" al instalar.
echo  ==========================================================
echo.
pause
"""


_START_BAT_LEGACY = _START_BAT  # alias por compatibilidad


_STOP_BAT = """@echo off
title Cinema Productions - Detener
color 0C
cd /d "%~dp0"

echo.
echo  ==========================================================
echo    CINEMA PRODUCTIONS - Detener servidor
echo  ==========================================================
echo.
echo  Cerrando todos los procesos relacionados...
echo.

REM ---- 1. Matar procesos escuchando en el puerto 8001 (backend) -----
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8001" ^| findstr LISTENING') do (
    echo   [+] Cerrando PID %%p ^(puerto 8001^)
    taskkill /F /PID %%p >nul 2>&1
)

REM ---- 2. Matar procesos escuchando en el puerto 3000 (frontend dev) --
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr LISTENING') do (
    echo   [+] Cerrando PID %%p ^(puerto 3000^)
    taskkill /F /PID %%p >nul 2>&1
)

REM ---- 3. Cerrar cualquier python/pythonw que ejecute app.py o launcher.pyw
wmic process where "(name='python.exe' or name='pythonw.exe' or name='py.exe') and (commandline like '%%app.py%%' or commandline like '%%launcher.pyw%%' or commandline like '%%uvicorn%%')" call terminate >nul 2>&1

REM ---- 4. Cerrar ventanas con el titulo "Cinema Productions" ---------
taskkill /F /FI "WINDOWTITLE eq Cinema Productions*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Cinema Productions - Launcher*" >nul 2>&1

REM ---- 5. Cerrar el navegador solo si abrio localhost:8001 (opcional)
REM (Comentado para no afectar otras pestanas del usuario)
REM taskkill /F /FI "WINDOWTITLE eq *localhost:8001*" >nul 2>&1

timeout /t 2 /nobreak >nul

echo.
echo  ==========================================================
echo    Cinema Productions ha sido DETENIDO.
echo    Para volver a arrancar la app, ejecuta:
echo         Iniciar.vbs  (o  start.bat)
echo  ==========================================================
echo.
timeout /t 3 /nobreak >nul
exit /b 0
"""


_START_SH = """#!/bin/bash
clear
echo ""
echo "  =========================================================="
echo "   CINEMA PRODUCTIONS - Gestor de Reservas de Eventos"
echo "  =========================================================="
echo ""

echo "  [1/5] Verificando Python..."
if command -v python3 &>/dev/null; then
  PYTHON=python3
elif command -v python &>/dev/null; then
  PYTHON=python
else
  echo "  ERROR: Python3 no instalado. Ver https://www.python.org/downloads/"
  exit 1
fi
echo "  OK  $($PYTHON --version) (comando: $PYTHON)"

echo ""
echo "  [2/5] Actualizando pip..."
$PYTHON -m pip install --upgrade pip wheel setuptools --quiet --no-warn-script-location 2>/dev/null || echo "  AVISO: no se pudo actualizar pip"

echo ""
echo "  [3/5] Instalando dependencias (primera vez tarda 1-3 min)..."
TRIES=0
while true; do
  TRIES=$((TRIES + 1))
  echo "  Intento $TRIES de 3..."
  if $PYTHON -m pip install -r requirements.txt --no-warn-script-location --disable-pip-version-check; then
    break
  fi
  if [ $TRIES -ge 3 ]; then
    echo "  ERROR: No se pudieron instalar las dependencias tras 3 intentos"
    exit 1
  fi
  echo "  Reintentando en 3 seg..."
  sleep 3
done
echo "  OK  Dependencias instaladas."

echo ""
echo "  [4/5] Iniciando servidor local en puerto 8001..."
# Matar cualquier proceso previo en el puerto 8001
lsof -ti:8001 | xargs -r kill -9 2>/dev/null || true

$PYTHON app.py &
SERVER_PID=$!

echo "  Verificando servidor (max 30 seg)..."
TRIES=0
while true; do
    sleep 1
    if $PYTHON -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/api/', timeout=2)" 2>/dev/null; then
      break
    fi
    TRIES=$((TRIES + 1))
    if [ $TRIES -ge 30 ]; then
      echo ""
      echo "  ERROR: El servidor no respondio en 30 segundos."
      kill $SERVER_PID 2>/dev/null || true
      exit 1
    fi
    printf "."
done
echo ""
echo "  OK  Servidor arriba en http://localhost:8001"

echo ""
echo "  [5/5] Abriendo Cinema Productions..."
command -v xdg-open &>/dev/null && xdg-open http://localhost:8001 2>/dev/null &
command -v open &>/dev/null && open http://localhost:8001 2>/dev/null &

echo ""
echo "  =========================================================="
echo "   Cinema Productions esta corriendo"
echo "   URL:     http://localhost:8001"
echo "   Datos:   cinema_data.json"
echo "   Cerrar:  Ctrl+C aqui"
echo "  =========================================================="
wait $SERVER_PID
"""

_REQUIREMENTS = """# Cinema Productions - Dependencias del servidor local
# Se instalan automaticamente la primera vez (desde libs/ si existe, si no online).
fastapi>=0.100.0
uvicorn>=0.20.0
motor>=3.0.0
pymongo>=4.0.0
dnspython>=2.3.0
python-dotenv>=1.0.0
pydantic>=2.0.0
python-multipart>=0.0.9
mongomock-motor>=0.0.36
resend>=2.0.0
httpx>=0.24.0
openpyxl>=3.1.0
pyzipper>=0.3.0
tzdata>=2023.3
"""


_README = """CINEMA PRODUCTIONS - Gestor de Reservas
=========================================

INICIO RAPIDO (Windows):
  1. Doble clic en  Iniciar.vbs   (recomendado: arranca sin ventana negra)
     o bien en      start.bat
  2. La PRIMERA vez instala dependencias desde la carpeta  libs/  (offline, ~15-30 seg).
     Aparece una ventanita con barra de progreso.
  3. La app se abre sola en tu navegador. Las siguientes veces arranca en segundos.

DETENER LA APP:
  Doble clic en  Detener.bat  para cerrar completamente el servidor.
  Cerrara todos los procesos python/pythonw relacionados y liberara los
  puertos 8001 y 3000. Para arrancar de nuevo: ejecuta  Iniciar.vbs.

REQUISITO: Python 3.11, 3.12 o 3.13
  https://www.python.org/downloads/
  IMPORTANTE: marcar "Add Python to PATH" al instalar.

BASE DE DATOS (se configura DENTRO de la app):
  Abre la app y ve a  Ajustes -> Base de Datos.
  Por defecto usa base local (cinema_data.json), sin internet ni instalaciones.
  Ahi mismo puedes conectar tu propio MongoDB o MongoDB Atlas cuando quieras.

  (Avanzado) Tambien puedes editar el archivo  .env  con el Bloc de Notas:
    MONGO_URL=embedded                         -> local, datos en cinema_data.json
    MONGO_URL=mongodb://localhost:27017        -> MongoDB en tu PC
    MONGO_URL=mongodb+srv://user:pass@cluster  -> MongoDB Atlas (nube)

DATOS:
  En modo local, todo se guarda en  cinema_data.json  (auto-guardado cada 60 seg
  y al cerrar). Copia ese archivo para respaldar o mover tus datos.

ACTUALIZAR:
  La app revisa tu repositorio de GitHub e informa si hay una version nueva.
  Ve a Actualizaciones -> "Aplicar actualizacion" y la app se actualizara y
  reiniciara automaticamente. Tu  cinema_data.json  y  .env  se conservan.

SI ALGO FALLA:
  Revisa  error_log.txt  y  server_log.txt  en esta carpeta: contienen el detalle.

Cinema Productions - Sistema de Gestion de Reservas
"""
