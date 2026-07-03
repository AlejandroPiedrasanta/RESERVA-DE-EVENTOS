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
# O ejecuta config.bat para una ventana visual de configuracion.
# O usa la interfaz: Ajustes > Base de Datos > Cambiar conexion MongoDB
#
MONGO_URL=embedded
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
_LAUNCHER_PYW = r'''"""Cinema Productions - Launcher Grafico
Se ejecuta con pythonw / py -w para ocultar la consola.
"""
import os
import sys
import time
import threading
import subprocess
import webbrowser
import urllib.request
from pathlib import Path
import tkinter as tk
from tkinter import font as tkfont

# Paleta de colores (dark mode moderno)
BG        = "#0f172a"   # slate-900
CARD      = "#1e293b"   # slate-800
BORDER    = "#334155"   # slate-700
TEXT      = "#f1f5f9"   # slate-100
TEXT_DIM  = "#94a3b8"   # slate-400
ACCENT    = "#7c3aed"   # violet-600
ACCENT_2  = "#a855f7"   # purple-500
SUCCESS   = "#10b981"   # emerald-500
ERROR     = "#ef4444"   # red-500

APP_DIR = Path(__file__).resolve().parent
os.chdir(APP_DIR)


class Launcher:
    def __init__(self, root):
        self.root = root
        self.root.title("Cinema Productions")
        self.root.configure(bg=BG)
        self.root.resizable(False, False)

        # Centrar ventana
        w, h = 620, 480
        sw, sh = root.winfo_screenwidth(), root.winfo_screenheight()
        x, y = (sw - w) // 2, (sh - h) // 2
        self.root.geometry(f"{w}x{h}+{x}+{y}")

        # Icono (si existe)
        try:
            self.root.iconbitmap(default="")
        except Exception:
            pass

        self.state = "idle"          # idle | running | ready | error
        self.progress = 0.0
        self.pulse_dir = 1
        self.pulse_val = 0

        self._build_ui()
        self._animate_pulse()
        # Arranque automatico: no requiere clic (doble clic y listo).
        self.root.after(500, self.on_start)

    def _build_ui(self):
        # Header
        header = tk.Frame(self.root, bg=BG, height=110)
        header.pack(fill="x", pady=(30, 0))
        header.pack_propagate(False)

        title_font = tkfont.Font(family="Segoe UI", size=26, weight="bold")
        subtitle_font = tkfont.Font(family="Segoe UI", size=11)

        tk.Label(header, text="CINEMA PRODUCTIONS", font=title_font,
                 bg=BG, fg=TEXT).pack()
        tk.Label(header, text="Gestor de Reservas de Eventos",
                 font=subtitle_font, bg=BG, fg=TEXT_DIM).pack(pady=(4, 0))

        # Boton central en tarjeta
        btn_frame = tk.Frame(self.root, bg=BG)
        btn_frame.pack(pady=(30, 20))

        self.btn_canvas = tk.Canvas(btn_frame, width=200, height=200,
                                    bg=BG, highlightthickness=0)
        self.btn_canvas.pack()
        self.btn_canvas.bind("<Button-1>", lambda e: self.on_start())
        self.btn_canvas.bind("<Enter>", lambda e: self._draw_button(hover=True))
        self.btn_canvas.bind("<Leave>", lambda e: self._draw_button(hover=False))
        self._draw_button(hover=False)

        # Barra de progreso minimalista
        prog_frame = tk.Frame(self.root, bg=BG)
        prog_frame.pack(pady=(0, 10), padx=60, fill="x")

        self.prog_bg = tk.Canvas(prog_frame, height=4, bg=BORDER,
                                 highlightthickness=0)
        self.prog_bg.pack(fill="x")
        self.prog_bar = self.prog_bg.create_rectangle(
            0, 0, 0, 4, fill=ACCENT, outline="")

        # Status text
        self.status_font = tkfont.Font(family="Segoe UI", size=10)
        self.status = tk.Label(self.root, text="Pulsa el boton para iniciar",
                               font=self.status_font, bg=BG, fg=TEXT_DIM)
        self.status.pack(pady=(8, 0))

        # Log discreto (2 lineas)
        self.log_font = tkfont.Font(family="Consolas", size=9)
        self.log = tk.Label(self.root, text="", font=self.log_font,
                            bg=BG, fg=TEXT_DIM, justify="center")
        self.log.pack(pady=(4, 0))

        # Footer
        footer = tk.Frame(self.root, bg=BG)
        footer.pack(side="bottom", pady=15)
        footer_font = tkfont.Font(family="Segoe UI", size=8)
        tk.Label(footer, text="Version local  |  localhost:8001",
                 font=footer_font, bg=BG, fg=TEXT_DIM).pack()

    # ----- Boton animado (canvas) -----
    def _draw_button(self, hover=False):
        c = self.btn_canvas
        c.delete("all")
        r = 90

        # Halo pulsante cuando idle
        if self.state == "idle":
            halo = 10 + int(self.pulse_val * 8)
            c.create_oval(100 - r - halo, 100 - r - halo,
                          100 + r + halo, 100 + r + halo,
                          fill="", outline=ACCENT_2, width=1)

        # Fondo circulo (con leve gradiente simulado)
        color = ACCENT
        if self.state == "ready":
            color = SUCCESS
        elif self.state == "error":
            color = ERROR
        elif self.state == "running":
            color = ACCENT_2
        if hover and self.state == "idle":
            color = ACCENT_2

        # Sombra
        c.create_oval(100 - r + 3, 100 - r + 5, 100 + r + 3, 100 + r + 5,
                      fill="#000000", outline="", stipple="gray50")
        # Circulo principal
        c.create_oval(100 - r, 100 - r, 100 + r, 100 + r,
                      fill=color, outline="")

        # Icono / texto central
        icon_font = tkfont.Font(family="Segoe UI", size=42, weight="bold")
        label_font = tkfont.Font(family="Segoe UI", size=11, weight="bold")

        if self.state == "idle":
            # Triangulo play
            c.create_polygon(82, 70, 82, 130, 130, 100,
                             fill="white", outline="")
            c.create_text(100, 155, text="INICIAR", fill="white",
                          font=label_font)
        elif self.state == "running":
            # Puntos animados
            for i in range(3):
                offset = (self.pulse_val + i * 0.3) % 1
                dot_size = 6 + int(offset * 6)
                c.create_oval(70 + i * 30 - dot_size // 2,
                              100 - dot_size // 2,
                              70 + i * 30 + dot_size // 2,
                              100 + dot_size // 2,
                              fill="white", outline="")
            c.create_text(100, 155, text="CARGANDO...", fill="white",
                          font=label_font)
        elif self.state == "ready":
            # Check mark
            c.create_line(70, 105, 92, 125, fill="white", width=6,
                          capstyle="round")
            c.create_line(92, 125, 132, 78, fill="white", width=6,
                          capstyle="round")
            c.create_text(100, 155, text="LISTO", fill="white",
                          font=label_font)
        elif self.state == "error":
            c.create_line(75, 75, 125, 125, fill="white", width=6,
                          capstyle="round")
            c.create_line(125, 75, 75, 125, fill="white", width=6,
                          capstyle="round")
            c.create_text(100, 155, text="ERROR", fill="white",
                          font=label_font)

    def _animate_pulse(self):
        self.pulse_val += 0.05 * self.pulse_dir
        if self.pulse_val >= 1:
            self.pulse_val = 1
            self.pulse_dir = -1
        elif self.pulse_val <= 0:
            self.pulse_val = 0
            self.pulse_dir = 1
        if self.state in ("idle", "running"):
            self._draw_button(hover=False)
        self.root.after(60, self._animate_pulse)

    def set_progress(self, pct, msg=None, log_line=None):
        pct = max(0, min(100, pct))
        self.progress = pct
        w = self.prog_bg.winfo_width() or 400
        target_w = int(w * pct / 100)
        self.prog_bg.coords(self.prog_bar, 0, 0, target_w, 4)
        if msg:
            self.status.config(text=msg)
        if log_line is not None:
            self.log.config(text=log_line[:80])
        self.root.update_idletasks()

    def on_start(self):
        if self.state == "running":
            return
        if self.state == "ready":
            # Reabrir navegador
            webbrowser.open("http://localhost:8001")
            return
        self.state = "running"
        self._draw_button()
        self.set_progress(2, "Preparando...", "")
        threading.Thread(target=self._run_pipeline, daemon=True).start()

    # ----- Pipeline en background -----
    def _run_pipeline(self):
        try:
            pyexe = sys.executable  # ya estamos ejecutando desde pythonw

            # PASO 1: verificar python
            self.set_progress(8, "Verificando Python...",
                              f"Usando {sys.version.split()[0]}")
            time.sleep(0.3)

            # PASO 2: actualizar pip
            self.set_progress(15, "Actualizando pip y wheel...",
                              "pip install --upgrade pip wheel")
            self._run([pyexe, "-m", "pip", "install", "--upgrade",
                       "pip", "wheel", "setuptools",
                       "--quiet", "--no-warn-script-location"],
                      ignore_errors=True)

            # PASO 3: instalar dependencias con progreso simulado
            self.set_progress(25, "Instalando dependencias...",
                              "Primera vez tarda 1-3 minutos")

            deps_thread = threading.Thread(
                target=self._install_deps_with_progress, daemon=True)
            deps_thread.start()
            deps_thread.join()

            if self.state == "error":
                return

            # PASO 4: iniciar servidor
            self.set_progress(85, "Iniciando servidor local...",
                              "puerto 8001")

            # Liberar puerto si esta ocupado (best-effort)
            self._free_port_8001()

            # Lanzar app.py en background SIN ventana de consola (pythonw)
            server_exe = pyexe
            if sys.platform == "win32":
                _pyw = Path(pyexe).with_name("pythonw.exe")
                if _pyw.exists():
                    server_exe = str(_pyw)
            creationflags = subprocess.CREATE_NO_WINDOW if sys.platform == "win32" else 0
            self.server_proc = subprocess.Popen(
                [server_exe, "app.py"],
                cwd=str(APP_DIR),
                creationflags=creationflags,
            )

            # PASO 5: esperar que responda
            self.set_progress(92, "Esperando al servidor...", "GET /api/")
            for i in range(30):
                if self._check_server():
                    break
                time.sleep(1)
                self.set_progress(92 + (i * 0.2), None, f"intento {i+1}/30")
            else:
                raise RuntimeError("El servidor no respondio en 30 segundos")

            # PASO 6: listo — abrir navegador y cerrar el launcher (el servidor sigue)
            self.set_progress(100, "App lista - abriendo navegador",
                              "http://localhost:8001")
            time.sleep(0.4)
            webbrowser.open("http://localhost:8001")
            self.state = "ready"
            self._draw_button()
            self.status.config(text="App corriendo en localhost:8001", fg=SUCCESS)
            self.log.config(text="Puedes cerrar esta ventana. La app sigue corriendo.")
            self.root.after(2500, self.root.destroy)

        except Exception as e:
            self.state = "error"
            self._draw_button()
            self.set_progress(0, f"Error: {str(e)[:60]}",
                              "Revisa la consola o reintenta")
            self.status.config(fg=ERROR)

    def _install_deps_with_progress(self):
        pyexe = sys.executable
        req_file = APP_DIR / "requirements.txt"
        if not req_file.exists():
            return

        # Arranque rapido: si ya se instalaron antes, no reinstalar.
        marker = APP_DIR / ".deps_ok"
        if marker.exists():
            self.set_progress(80, "Dependencias ya instaladas", "arranque rapido")
            return

        # Contar dependencias para simular progreso
        try:
            with open(req_file, "r", encoding="utf-8") as f:
                deps = [ln.strip() for ln in f
                        if ln.strip() and not ln.strip().startswith("#")]
        except Exception:
            deps = []

        total = max(len(deps), 1)

        # Ejecutar pip install con retry
        for attempt in range(3):
            self.set_progress(25 + attempt * 5,
                              f"Instalando dependencias (intento {attempt+1}/3)...",
                              f"{total} paquetes")

            # Simulacion visual del progreso mientras pip instala
            stop_sim = threading.Event()

            def simulate():
                p = 25
                while not stop_sim.is_set() and p < 80:
                    time.sleep(0.7)
                    p += 1.5
                    self.set_progress(min(p, 80), None,
                                      f"instalando... ({int(p-25)}%)")

            sim_thread = threading.Thread(target=simulate, daemon=True)
            sim_thread.start()

            ret = self._run([pyexe, "-m", "pip", "install",
                             "-r", "requirements.txt",
                             "--quiet", "--no-warn-script-location",
                             "--disable-pip-version-check"],
                            ignore_errors=True)

            stop_sim.set()
            sim_thread.join(timeout=1)

            if ret == 0:
                try:
                    (APP_DIR / ".deps_ok").write_text("ok", encoding="utf-8")
                except Exception:
                    pass
                self.set_progress(80, "Dependencias listas",
                                  f"{total} paquetes instalados")
                return

            self.set_progress(25 + attempt * 5,
                              f"Reintentando en 3 seg...",
                              f"intento fallido {attempt+1}")
            time.sleep(3)

        self.state = "error"
        raise RuntimeError("No se pudieron instalar las dependencias")

    def _run(self, cmd, ignore_errors=False):
        creationflags = 0
        if sys.platform == "win32":
            creationflags = subprocess.CREATE_NO_WINDOW
        try:
            result = subprocess.run(
                cmd,
                cwd=str(APP_DIR),
                capture_output=True,
                timeout=300,
                creationflags=creationflags,
            )
            return result.returncode
        except Exception:
            if not ignore_errors:
                raise
            return 1

    def _free_port_8001(self):
        if sys.platform != "win32":
            try:
                subprocess.run(["fuser", "-k", "8001/tcp"],
                               capture_output=True, timeout=5)
            except Exception:
                pass
            return
        try:
            result = subprocess.run(
                ["netstat", "-ano"], capture_output=True, text=True,
                timeout=5, creationflags=subprocess.CREATE_NO_WINDOW)
            for line in result.stdout.splitlines():
                if ":8001" in line and "LISTENING" in line:
                    pid = line.split()[-1]
                    subprocess.run(["taskkill", "/F", "/PID", pid],
                                   capture_output=True, timeout=5,
                                   creationflags=subprocess.CREATE_NO_WINDOW)
        except Exception:
            pass

    def _check_server(self):
        try:
            urllib.request.urlopen("http://localhost:8001/api/", timeout=2)
            return True
        except Exception:
            return False


def main():
    root = tk.Tk()
    Launcher(root)
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

_REQUIREMENTS = """# Cinema Productions - Dependencias del Servidor Desktop
# Instalado automaticamente por start.bat / start.sh
fastapi>=0.100.0
uvicorn[standard]>=0.20.0
motor>=3.0.0
pymongo>=4.0.0
dnspython>=2.3.0
python-dotenv>=1.0.0
pydantic>=2.0.0
python-multipart>=0.0.9

# Base de datos embebida (modo local sin internet)
mongomock-motor>=0.0.36

# Notificaciones y emails
resend>=2.0.0
httpx>=0.24.0

# HTTP y utilidades
requests>=2.28.0
aiofiles>=23.0.0

# Compatibilidad de tiempo
tzdata>=2023.3
python-dateutil>=2.8.0

# Seguridad
cryptography>=41.0.0

# Reportes PDF/Excel (opcional)
openpyxl>=3.1.0
pandas>=2.0.0
"""

_README = """CINEMA PRODUCTIONS - Gestor de Reservas
=========================================

INICIO RAPIDO (Windows):
  1. Doble clic en  start.bat
  2. Presiona ENTER (o espera 3 seg) para iniciar
  3. La app se abre automaticamente en el navegador

REQUISITO: Python 3.8+
  https://www.python.org/downloads/
  IMPORTANTE: marcar "Add Python to PATH"

BASE DE DATOS:
  El archivo  .env  controla donde se guardan tus datos.

  OPCIONES:
    MONGO_URL=embedded
      -> Base de datos local, SIN internet, datos en cinema_data.json
        Recomendado para uso personal en un solo PC.

    MONGO_URL=mongodb://localhost:27017
      -> MongoDB instalado en tu computadora.

    MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net
      -> MongoDB Atlas (nube GRATUITA en mongodb.com/atlas)
        Accesible desde cualquier dispositivo.

CAMBIAR BASE DE DATOS (2 formas):
  A) Doble clic en  config.bat  -> Ventana visual de configuracion
  B) Abrir  .env  con el Bloc de Notas -> Edita MONGO_URL -> Guarda

DATOS AUTOMATICOS:
  En modo embebido, los datos se guardan en  cinema_data.json
  Auto-guardado cada 60 segundos y al cerrar la app.

Cinema Productions - Sistema de Gestion de Reservas
"""
