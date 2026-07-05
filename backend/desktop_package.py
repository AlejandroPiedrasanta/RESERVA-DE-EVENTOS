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
_LAUNCHER_PYW = r'''# Cinema Productions - Launcher local (arranque grafico moderno, sin consola)
import os, sys, time, socket, threading, subprocess, webbrowser, traceback
from pathlib import Path
import tkinter as tk
import tkinter.font as tkfont

APP_DIR = Path(__file__).resolve().parent
os.chdir(APP_DIR)
PORT = 8001
URL = "http://127.0.0.1:8001"

# ── Paleta moderna (dark glass / indigo) ──────────────────────────
BG_TOP = "#080816"; BG_BOT = "#16113a"
CARD   = "#191634"; CARD_HI = "#221d47"
ACC    = "#7c6cff"; ACC2 = "#a78bfa"
OK     = "#34d399"; ERR = "#fb7185"
TXT    = "#f4f4ff"; DIM = "#8b8fb5"
TRACK  = "#26234a"
NO_WINDOW = 0x08000000 if sys.platform == "win32" else 0
W, H = 660, 470


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


def _rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def _hx(c):
    return "#%02x%02x%02x" % c


def _mix(a, b, t):
    ca, cb = _rgb(a), _rgb(b)
    return _hx(tuple(int(ca[i] + (cb[i] - ca[i]) * t) for i in range(3)))


class App:
    def __init__(self, root):
        self.root = root
        self.proc = None
        self._pct = 0.0
        self._pct_target = 0.0
        self._bar_color = ACC
        root.title("Cinema Productions")
        root.configure(bg=BG_TOP)
        sw, sh = root.winfo_screenwidth(), root.winfo_screenheight()
        root.geometry("%dx%d+%d+%d" % (W, H, (sw - W) // 2, (sh - H) // 2))
        root.resizable(False, False)
        try:
            root.iconphoto(True, tk.PhotoImage(width=1, height=1))
        except Exception:
            pass

        self.c = tk.Canvas(root, width=W, height=H, highlightthickness=0, bd=0)
        self.c.pack(fill="both", expand=True)
        self._build_ui()

        try:
            root.attributes("-alpha", 0.0)
            self._fade_in()
        except Exception:
            pass
        self._animate_bar()
        self._pulse_glow()
        root.after(300, self.start)

    # ── construccion visual ───────────────────────────────────────
    def _round_rect(self, x1, y1, x2, y2, r, **kw):
        pts = [x1 + r, y1, x2 - r, y1, x2, y1, x2, y1 + r, x2, y2 - r, x2, y2,
               x2 - r, y2, x1 + r, y2, x1, y2, x1, y2 - r, x1, y1 + r, x1, y1]
        return self.c.create_polygon(pts, smooth=True, **kw)

    def _build_ui(self):
        # fondo con degradado vertical
        for y in range(H):
            self.c.create_line(0, y, W, y, fill=_mix(BG_TOP, BG_BOT, y / H))
        cx = W // 2

        # tarjeta central tipo glass con borde de acento
        self._round_rect(56, 78, W - 56, H - 56, 30, fill=CARD, outline="")
        self._round_rect(56, 78, W - 56, 86, 6, fill=ACC, outline="")

        # emblema circular con inicial
        self._round_rect(cx - 34, 108, cx + 34, 176, 34, fill=CARD_HI, outline="")
        self.c.create_oval(cx - 26, 116, cx + 26, 168, outline=ACC, width=2)
        self.c.create_text(cx, 142, text="CP", fill=ACC2,
                           font=("Segoe UI Semibold", 20))

        # marca
        self.c.create_text(cx, 208, text="CINEMA PRODUCTIONS", fill=TXT,
                           font=("Segoe UI Semibold", 25))
        self.c.create_text(cx, 238, text="G E S T O R   D E   R E S E R V A S",
                           fill=DIM, font=("Segoe UI", 9))

        # barra de progreso redondeada
        self.bx1, self.bx2, self.by, self.bh = 150, W - 150, 300, 9
        self._round_rect(self.bx1, self.by - self.bh // 2, self.bx2,
                         self.by + self.bh // 2, self.bh // 2, fill=TRACK, outline="")
        self.bar_fill = None
        # punto glow al final de la barra
        self.glow = self.c.create_oval(self.bx1 - 6, self.by - 6,
                                       self.bx1 + 6, self.by + 6, fill=ACC, outline="")

        # textos de estado
        self.t_status = self.c.create_text(cx, 344, text="Iniciando...", fill=TXT,
                                           font=("Segoe UI", 13))
        self.t_detail = self.c.create_text(cx, 372, text="", fill=DIM,
                                           font=("Consolas", 9))

        # boton reintentar (oculto por defecto)
        self.btn_bg = self._round_rect(cx - 78, H - 116, cx + 78, H - 76, 20,
                                       fill=ACC, outline="", state="hidden")
        self.btn_tx = self.c.create_text(cx, H - 96, text="Reintentar", fill="white",
                                         font=("Segoe UI Semibold", 11), state="hidden")
        for tag in (self.btn_bg, self.btn_tx):
            self.c.tag_bind(tag, "<Button-1>", lambda e: self.start())
            self.c.tag_bind(tag, "<Enter>",
                            lambda e: (self.c.itemconfig(self.btn_bg, fill=ACC2),
                                       self.c.config(cursor="hand2")))
            self.c.tag_bind(tag, "<Leave>",
                            lambda e: (self.c.itemconfig(self.btn_bg, fill=ACC),
                                       self.c.config(cursor="")))

    def _fade_in(self, a=0.0):
        a = min(1.0, a + 0.07)
        try:
            self.root.attributes("-alpha", a)
        except Exception:
            return
        if a < 1.0:
            self.root.after(16, lambda: self._fade_in(a))

    def _animate_bar(self):
        # interpolacion suave hacia el objetivo
        self._pct += (self._pct_target - self._pct) * 0.18
        if abs(self._pct_target - self._pct) < 0.4:
            self._pct = self._pct_target
        try:
            if self.bar_fill is not None:
                self.c.delete(self.bar_fill)
            w = self.bx1 + (self.bx2 - self.bx1) * max(0.0, min(100.0, self._pct)) / 100.0
            fx2 = max(self.bx1 + self.bh, w)
            self.bar_fill = self._round_rect(self.bx1, self.by - self.bh // 2, fx2,
                                             self.by + self.bh // 2, self.bh // 2,
                                             fill=self._bar_color, outline="")
            self.c.coords(self.glow, fx2 - 6, self.by - 6, fx2 + 6, self.by + 6)
            self.c.tag_raise(self.glow)
        except Exception:
            pass
        self.root.after(16, self._animate_bar)

    def _pulse_glow(self, i=0):
        try:
            shades = [ACC, ACC2, "#c4b5fd", ACC2]
            self.c.itemconfig(self.glow, fill=shades[i % len(shades)])
            self.root.after(420, lambda: self._pulse_glow(i + 1))
        except Exception:
            pass

    def set(self, pct=None, status=None, detail=None, color=None):
        def _do():
            if pct is not None:
                self._pct_target = pct
            if status is not None:
                self.c.itemconfig(self.t_status, text=status)
            if detail is not None:
                self.c.itemconfig(self.t_detail, text=str(detail)[:82])
            if color is not None:
                self.c.itemconfig(self.t_status, fill=color)
                self._bar_color = color
        self.root.after(0, _do)

    def fail(self, title, log_text=""):
        try:
            (APP_DIR / "error_log.txt").write_text(title + "\n\n" + (log_text or ""),
                                                   encoding="utf-8", errors="ignore")
        except Exception:
            pass

        def _do():
            self._pct_target = 100
            self._bar_color = ERR
            self.c.itemconfig(self.t_status, text=title, fill=ERR)
            self.c.itemconfig(self.t_detail, text="Detalle guardado en error_log.txt")
            self.c.itemconfig(self.btn_bg, state="normal")
            self.c.itemconfig(self.btn_tx, state="normal")
        self.root.after(0, _do)

    def start(self):
        self.c.itemconfig(self.btn_bg, state="hidden")
        self.c.itemconfig(self.btn_tx, state="hidden")
        self.c.itemconfig(self.t_status, fill=TXT)
        self._bar_color = ACC
        self._pct = 0.0
        self._pct_target = 0.0
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
' Este archivo vive en la raiz del paquete; el motor real esta en "_sistema (NO TOCAR)".
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(WScript.ScriptFullName)
sysdir = root & "\_sistema (NO TOCAR)"
sh.CurrentDirectory = sysdir
q = Chr(34)
target = q & sysdir & "\launcher.pyw" & q
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


# ── VBS que crea un acceso directo (.lnk) en el Escritorio con el icono de la app ──
_CREATE_SHORTCUT_VBS = r"""' Cinema Productions - Crear acceso directo con icono en el Escritorio
Set sh  = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root    = fso.GetParentFolderName(WScript.ScriptFullName)
target  = root & "\INICIAR APP.vbs"
icon    = root & "\icono.ico"
desktop = sh.SpecialFolders("Desktop")
Set link = sh.CreateShortcut(desktop & "\Cinema Productions.lnk")
link.TargetPath       = target
link.WorkingDirectory = root
link.IconLocation     = icon & ",0"
link.Description      = "Cinema Productions - Gestor de Reservas"
link.Save
MsgBox "Acceso directo creado en el Escritorio.", 64, "Cinema Productions"
"""


# ── LEEME.txt simple para el usuario final ──
_LEEME_TXT = """CINEMA PRODUCTIONS - Gestor de Reservas de Eventos
====================================================

COMO USAR (facil):

  1) Doble clic en  ►  START.BAT
     La app se abre sola en tu navegador (la primera vez tarda 1-3 min
     instalando; despues arranca en segundos).

  2) Para cerrarla: doble clic en  ■  DETENER.BAT


ESTRUCTURA DE CARPETAS
----------------------
  En la carpeta principal SOLO veras dos archivos:

     START.BAT     -> abrir la aplicacion
     DETENER.BAT   -> cerrar la aplicacion

  Todo lo demas (el motor de la app) esta dentro de la carpeta:

     SISTEMA\\

  NO borres ni muevas archivos de la carpeta SISTEMA; la app dejaria
  de funcionar.


TUS DATOS
---------
  * Los respaldos automaticos se guardan en la carpeta  SISTEMA\\backups\\
  * Puedes copiar esa carpeta a un USB o a la nube cuando quieras.

  Toda la configuracion se hace DENTRO de la app: abrela y ve a
  Ajustes -> Base de Datos  para conectar tu MongoDB, o a
  Ajustes -> Apariencia  para personalizarla.


REQUISITO
---------
  Necesitas Python 3.11, 3.12 o 3.13 instalado en el sistema.
  Descargalo aqui:  https://www.python.org/downloads/
  IMPORTANTE: marca la casilla "Add Python to PATH" al instalar.


SI ALGO FALLA
-------------
  Abre la carpeta SISTEMA y revisa los archivos  error_log.txt
  y  server_log.txt : contienen el detalle del problema.


Cinema Productions - Sistema de Gestion de Reservas
"""


_START_BAT = """@echo off
chcp 65001 >nul
title Cinema Productions
cd /d "%~dp0SISTEMA"

REM =============================================================
REM  START.BAT (raiz) -> lanza el launcher grafico moderno que
REM  vive dentro de la carpeta SISTEMA. Sin ventana negra.
REM  La primera vez instala dependencias (1-3 min); despues
REM  arranca en segundos.
REM =============================================================

REM -- Habilitar colores ANSI (Windows 10+) --
for /f %%a in ('echo prompt $E^| cmd') do set "E=%%a"

cls
echo(
echo    %E%[38;5;99m╔══════════════════════════════════════════════════════╗%E%[0m
echo    %E%[38;5;99m║%E%[0m                                                      %E%[38;5;99m║%E%[0m
echo    %E%[38;5;99m║%E%[0m       %E%[1;97mC I N E M A   P R O D U C T I O N S%E%[0m            %E%[38;5;99m║%E%[0m
echo    %E%[38;5;99m║%E%[0m       %E%[38;5;147mGestor de Reservas de Eventos%E%[0m                  %E%[38;5;99m║%E%[0m
echo    %E%[38;5;99m║%E%[0m                                                      %E%[38;5;99m║%E%[0m
echo    %E%[38;5;99m╚══════════════════════════════════════════════════════╝%E%[0m
echo(
echo      %E%[38;5;147m▸%E%[0m  Abriendo la aplicacion...
echo(

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

echo    %E%[38;5;209m✕  Python no esta instalado o no esta en el PATH.%E%[0m
echo(
echo       Descargalo desde:  https://www.python.org/downloads/
echo       IMPORTANTE: marca "Add Python to PATH" al instalar.
echo(
pause
"""


_START_BAT_LEGACY = _START_BAT  # alias por compatibilidad


_STOP_BAT = """@echo off
chcp 65001 >nul
title Cinema Productions - Detener
cd /d "%~dp0"

for /f %%a in ('echo prompt $E^| cmd') do set "E=%%a"

cls
echo(
echo    %E%[38;5;204m╔══════════════════════════════════════════════════════╗%E%[0m
echo    %E%[38;5;204m║%E%[0m       %E%[1;97mC I N E M A   P R O D U C T I O N S%E%[0m            %E%[38;5;204m║%E%[0m
echo    %E%[38;5;204m║%E%[0m       %E%[38;5;210mDeteniendo el servidor...%E%[0m                      %E%[38;5;204m║%E%[0m
echo    %E%[38;5;204m╚══════════════════════════════════════════════════════╝%E%[0m
echo(

REM ---- 1. Matar procesos escuchando en el puerto 8001 (backend) -----
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":8001" ^| findstr LISTENING') do (
    echo      %E%[38;5;210m▸%E%[0m  Cerrando PID %%p ^(puerto 8001^)
    taskkill /F /PID %%p >nul 2>&1
)

REM ---- 2. Matar procesos escuchando en el puerto 3000 (frontend dev) --
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr LISTENING') do (
    echo      %E%[38;5;210m▸%E%[0m  Cerrando PID %%p ^(puerto 3000^)
    taskkill /F /PID %%p >nul 2>&1
)

REM ---- 3. Cerrar cualquier python/pythonw que ejecute app.py o launcher.pyw
wmic process where "(name='python.exe' or name='pythonw.exe' or name='py.exe') and (commandline like '%%app.py%%' or commandline like '%%launcher.pyw%%' or commandline like '%%uvicorn%%')" call terminate >nul 2>&1

REM ---- 4. Cerrar ventanas con el titulo "Cinema Productions" ---------
taskkill /F /FI "WINDOWTITLE eq Cinema Productions*" >nul 2>&1

timeout /t 2 /nobreak >nul

echo(
echo    %E%[38;5;114m✔  Cinema Productions ha sido DETENIDO.%E%[0m
echo(
echo       Para volver a abrir la app, ejecuta:  %E%[1;97mSTART.BAT%E%[0m
echo(
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
apscheduler>=3.10.0
bcrypt>=4.0.0
tzdata>=2023.3
"""


_README = """CINEMA PRODUCTIONS - Gestor de Reservas (README tecnico)
=========================================================

Este archivo vive DENTRO de la carpeta SISTEMA. El usuario final solo
usa los dos .bat de la carpeta principal:

  START.BAT     -> abrir la app
  DETENER.BAT   -> cerrar la app

INICIO RAPIDO (Windows):
  1. Doble clic en  START.BAT  (en la carpeta principal).
     Lanza el launcher grafico (launcher.pyw) sin ventana negra.
  2. La PRIMERA vez instala dependencias desde la carpeta  libs/  (offline),
     o descargando online si hace falta. Aparece una ventana con barra de
     progreso moderna.
  3. La app se abre sola en tu navegador. Las siguientes veces arranca en segundos.

DETENER LA APP:
  Doble clic en  DETENER.BAT  (carpeta principal). Cierra todos los procesos
  python/pythonw relacionados y libera los puertos 8001 y 3000.

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

SI ALGO FALLA:
  Revisa  error_log.txt  y  server_log.txt  en esta carpeta (SISTEMA).

Cinema Productions - Sistema de Gestion de Reservas
"""
