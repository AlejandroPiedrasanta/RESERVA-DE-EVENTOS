#!/usr/bin/env python3
"""Compila Cinema Productions en UN SOLO ejecutable con todo lo necesario.

El ejecutable resultante incluye Python, todas las librerías del backend, el
frontend compilado (build/), los temas, el contexto de IA y version.txt. No
requiere instalar Python, Node ni MongoDB en el equipo donde se ejecuta: usa
una base de datos embebida (cinema_data.json) guardada en
%LOCALAPPDATA%\\CinemaProductions (Windows).

Uso (desde la raíz del repo):

    pip install -r backend/requirements.txt pyinstaller
    python scripts/build_exe.py                 # → dist/CinemaProductions.exe

Opciones útiles:
    --onedir            carpeta (exe + _internal/) en vez de un único archivo;
                        es lo que empaqueta el instalador de Inno Setup.
    --name NOMBRE       nombre del ejecutable (por defecto CinemaProductions).
    --skip-frontend     reutiliza frontend/build/ ya compilado (CI).
    --icon RUTA         .ico (Windows) o .icns (macOS).
    --distpath/--workpath  carpetas de salida/trabajo de PyInstaller.

PyInstaller no compila de forma cruzada: el .exe de Windows se genera en
Windows (o en GitHub Actions, workflow «Build Windows .exe»). En Linux/macOS
este mismo script produce el binario nativo de esa plataforma.
"""
from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

# En Windows, con la salida redirigida (CI), Python usa cp1252 y los «✓ → ❌»
# lanzarían UnicodeEncodeError.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
FRONTEND = ROOT / "frontend"
BUNDLE = BACKEND / "_bundle"
IS_WINDOWS = sys.platform == "win32"

# Lo que PyInstaller no detecta solo (imports dinámicos de pymongo/dnspython,
# certificados raíz, el SSL autofirmado y la BD embebida).
HIDDEN_IMPORTS = [
    "motor.motor_asyncio",
    "pymongo",
    "pymongo.asynchronous.srv_resolver",
    "pymongo.synchronous.srv_resolver",
    "bson",
    "dns",
    "dns.resolver",
    "dns.asyncresolver",
    "ssl_bootstrap",
    "openpyxl",
    "certifi",
]
COLLECT_SUBMODULES = [
    "dns",
    "pymongo",
    "uvicorn",
    "fastapi",
    "openpyxl",
    "cryptography",
    "mongomock_motor",
    "mongomock",
]
COLLECT_DATA = ["certifi"]
EXCLUDE_MODULES = ["tkinter", "matplotlib"]


def run(cmd: list[str], cwd: Path | None = None, env: dict | None = None) -> None:
    print("→", " ".join(cmd), flush=True)
    exe = shutil.which(cmd[0]) or cmd[0]  # yarn es yarn.cmd en Windows
    subprocess.run([exe, *cmd[1:]], cwd=cwd, env=env, check=True)


def build_frontend(backend_url: str) -> None:
    if not shutil.which("yarn"):
        sys.exit("❌ No se encontró 'yarn'. Instala Node.js 22+ y ejecuta: npm install -g yarn")
    env = {**os.environ, "REACT_APP_BACKEND_URL": backend_url, "CI": "false"}
    run(["yarn", "install", "--frozen-lockfile"], cwd=FRONTEND, env=env)
    run(["yarn", "build"], cwd=FRONTEND, env=env)


def prepare_bundle() -> None:
    """Copia a backend/_bundle/ todo lo que el ejecutable necesita en runtime."""
    build_dir = FRONTEND / "build"
    if not (build_dir / "index.html").is_file():
        sys.exit("❌ frontend/build/index.html no existe. Compila el frontend (quita --skip-frontend).")
    if BUNDLE.exists():
        shutil.rmtree(BUNDLE)
    BUNDLE.mkdir(parents=True)
    shutil.copytree(build_dir, BUNDLE / "build")
    shutil.copy2(BACKEND / "ai_context_default.py", BUNDLE / "ai_context_default.py")
    shutil.copy2(ROOT / "version.txt", BUNDLE / "version.txt")
    (BUNDLE / "themes").mkdir()
    shutil.copy2(ROOT / "themes" / "saved_themes.json", BUNDLE / "themes" / "saved_themes.json")
    print(f"✓ Payload listo en {BUNDLE.relative_to(ROOT)}", flush=True)


def repo_path(p: str) -> Path:
    """Rutas relativas se interpretan desde la raíz del repo."""
    path = Path(p)
    return path if path.is_absolute() else ROOT / path


def dist_dir(args: argparse.Namespace) -> Path:
    return repo_path(args.distpath) if args.distpath else ROOT / "dist"


def default_icon() -> Path | None:
    if IS_WINDOWS:
        ico = FRONTEND / "public" / "favicon.ico"
        return ico if ico.is_file() else None
    return None


def pyinstaller_args(args: argparse.Namespace) -> list[str]:
    sep = os.pathsep  # ';' en Windows, ':' en Linux/macOS
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--onedir" if args.onedir else "--onefile",
        "--noconfirm",
        "--clean",
        "--name", args.name,
        "--paths", str(BACKEND),
        "--add-data", f"{BUNDLE / 'build'}{sep}build",
        "--add-data", f"{BUNDLE / 'ai_context_default.py'}{sep}.",
        "--add-data", f"{BUNDLE / 'version.txt'}{sep}.",
        "--add-data", f"{BUNDLE / 'themes'}{sep}themes",
    ]
    if args.windowed:
        cmd.append("--windowed")
    # El build/ de la raíz es la versión plana del frontend (versionada en git):
    # los temporales de PyInstaller y el .spec van dentro de dist/ (ignorado).
    workpath = repo_path(args.workpath) if args.workpath else ROOT / "dist" / "_work"
    cmd += ["--distpath", str(dist_dir(args)), "--workpath", str(workpath), "--specpath", str(workpath)]
    icon = repo_path(args.icon) if args.icon else default_icon()
    if icon:
        cmd += ["--icon", str(icon)]
    for m in HIDDEN_IMPORTS:
        cmd += ["--hidden-import", m]
    for m in COLLECT_SUBMODULES:
        cmd += ["--collect-submodules", m]
    for m in COLLECT_DATA:
        cmd += ["--collect-data", m]
    for m in EXCLUDE_MODULES:
        cmd += ["--exclude-module", m]
    cmd.append(str(BACKEND / "standalone_app.py"))
    return cmd


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--name", default="CinemaProductions")
    p.add_argument("--onedir", action="store_true", help="carpeta en lugar de un único archivo")
    p.add_argument("--skip-frontend", action="store_true", help="no recompilar el frontend")
    p.add_argument("--backend-url", default="http://127.0.0.1:8001",
                   help="URL de respaldo horneada en el frontend (el .exe inyecta la real)")
    p.add_argument("--icon")
    p.add_argument("--distpath")
    p.add_argument("--workpath")
    p.add_argument("--console", dest="windowed", action="store_false",
                   help="mostrar consola (por defecto en Windows se oculta)")
    p.set_defaults(windowed=IS_WINDOWS)
    args = p.parse_args()

    try:
        import PyInstaller  # noqa: F401
    except ImportError:
        sys.exit("❌ Falta PyInstaller: pip install -r backend/requirements.txt pyinstaller")

    if not args.skip_frontend:
        build_frontend(args.backend_url)
    prepare_bundle()
    subprocess.run(pyinstaller_args(args), cwd=ROOT, check=True)

    dist = dist_dir(args)
    exe_name = args.name + (".exe" if IS_WINDOWS else "")
    out = dist / args.name / exe_name if args.onedir else dist / exe_name
    if not out.is_file():
        sys.exit(f"❌ PyInstaller terminó pero no se encontró {out}")
    print(f"\n✅ Ejecutable listo: {out}  ({out.stat().st_size / 1_048_576:.1f} MB)")


if __name__ == "__main__":
    main()
