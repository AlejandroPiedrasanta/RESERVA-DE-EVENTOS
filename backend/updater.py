"""Auto-updater helper — descarga segura + validación SHA256 + swap con batch.

Este módulo implementa el flujo de actualización SEGURO que consume el
manifiesto version.json (semáforo). Responsabilidades:

  1. `resolve_asset_for_platform(manifest)` — elige el asset correcto según
     el sistema actual (Windows installer/portable, Linux x64/ARM, macOS).
  2. `download_and_verify(url, expected_sha256, dest_dir=None)` — descarga
     a una carpeta temporal, calcula SHA256 en streaming, y solo devuelve
     el path si el hash coincide con el manifiesto. Si NO coincide, borra
     el archivo y lanza `IntegrityError`.
  3. `apply_update_windows(new_exe_path, current_exe_path)` — genera un
     script batch (`updater.bat`) en %TEMP% que:
        · espera a que el proceso actual libere el .exe (poll de 500 ms),
        · reemplaza el binario en su ubicación de instalación,
        · relanza la app,
        · se auto-elimina.
     El proceso actual debe cerrar la app inmediatamente después de invocar
     el batch (`os._exit(0)` o similar).

Uso típico desde el cliente (Windows):

    from backend.updater import (
        fetch_manifest, resolve_asset_for_platform,
        download_and_verify, apply_update_windows, IntegrityError,
    )

    manifest = fetch_manifest("https://raw.../version.json")  # o del API
    asset = resolve_asset_for_platform(manifest)              # dict con url+sha256
    if asset is None:
        return  # no hay binario para esta plataforma

    try:
        new_bin = download_and_verify(asset["url"], asset["sha256"])
    except IntegrityError:
        # Aborto seguro — el asset está corrupto o incompleto.
        return

    apply_update_windows(new_bin, current_exe_path=sys.executable)
    os._exit(0)  # el batch tomará el relevo

NOTA: el helper NUNCA anuncia una actualización si `version.json` no existe
o si su hash falla — es responsabilidad del código llamante consultar
primero `/api/updates/manifest` y respetar el estado `not_available`.
"""

from __future__ import annotations

import hashlib
import json
import os
import platform
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path
from typing import Optional

# Tamaño de bloque para lectura en streaming: 1 MiB.
_CHUNK = 1024 * 1024


class IntegrityError(Exception):
    """El SHA256 del archivo descargado no coincide con el del manifiesto."""


class ManifestError(Exception):
    """El manifiesto está ausente, malformado o incompleto."""


# ─────────────────────────────────────────────────────────────────────
# 1) Manifest fetch
# ─────────────────────────────────────────────────────────────────────
def fetch_manifest(url: str, timeout: int = 15) -> dict:
    """Descarga y parsea el manifiesto `version.json` desde una URL pública.

    Valida shape mínimo: {version, assets{}}.
    """
    req = urllib.request.Request(url, headers={"User-Agent": "cinema-productions-updater"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = json.loads(r.read().decode("utf-8"))
    if not isinstance(data, dict):
        raise ManifestError("version.json no es un objeto JSON")
    if not data.get("version"):
        raise ManifestError("version.json sin campo 'version'")
    if not isinstance(data.get("assets"), dict) or not data["assets"]:
        raise ManifestError("version.json sin 'assets' válidos")
    return data


# ─────────────────────────────────────────────────────────────────────
# 2) Platform resolution
# ─────────────────────────────────────────────────────────────────────
def resolve_asset_for_platform(
    manifest: dict, prefer: str = "installer"
) -> Optional[dict]:
    """Devuelve el asset del manifest apropiado para la plataforma actual.

    `prefer`:
      · "installer"  → Windows: usa el instalador Inno Setup si existe,
                       si no, cae a portable.
      · "portable"   → Windows: siempre portable.
    En Linux/macOS, elige por arquitectura.

    Retorna dict {name, url, size, sha256} o None si no hay asset compatible.
    """
    assets = manifest.get("assets") or {}
    if not isinstance(assets, dict):
        return None

    sysname = platform.system().lower()
    machine = (platform.machine() or "").lower()

    if sysname == "windows":
        keys = (
            ["windows_installer", "windows_portable"]
            if prefer == "installer"
            else ["windows_portable", "windows_installer"]
        )
    elif sysname == "darwin":
        keys = ["macos_arm64"] if "arm" in machine or "aarch64" in machine else ["macos_arm64"]
    elif sysname == "linux":
        if "aarch64" in machine or "arm64" in machine:
            keys = ["linux_arm64", "linux_x64"]
        else:
            keys = ["linux_x64", "linux_arm64"]
    else:
        return None

    for k in keys:
        a = assets.get(k)
        if isinstance(a, dict) and a.get("url") and a.get("sha256"):
            return {
                "kind": k,
                "name": a.get("name"),
                "url": a["url"],
                "size": a.get("size"),
                "sha256": a["sha256"].lower(),
            }
    return None


# ─────────────────────────────────────────────────────────────────────
# 3) Download + SHA256 verification
# ─────────────────────────────────────────────────────────────────────
def download_and_verify(
    url: str,
    expected_sha256: str,
    dest_dir: Optional[str] = None,
    filename: Optional[str] = None,
    progress_cb=None,
    timeout: int = 300,
) -> str:
    """Descarga a una carpeta temporal y valida SHA256.

    · Streaming: calcula el hash mientras escribe → no requiere leer 2 veces.
    · Si el hash NO coincide: elimina el archivo y lanza IntegrityError.
    · `progress_cb(downloaded_bytes, total_bytes)` opcional.
    · Retorna la ruta absoluta del archivo validado.
    """
    if not expected_sha256 or len(expected_sha256) != 64:
        raise IntegrityError("expected_sha256 inválido (debe ser hex de 64 chars)")
    expected = expected_sha256.lower()

    base = Path(dest_dir) if dest_dir else Path(tempfile.gettempdir()) / "CinemaProductions_update"
    base.mkdir(parents=True, exist_ok=True)

    name = filename or url.rsplit("/", 1)[-1].split("?", 1)[0] or "download.bin"
    # Descarga a *.part y renombra al final para evitar dejar archivos incompletos
    part = base / f"{name}.part"
    final = base / name
    if part.exists():
        part.unlink()

    hasher = hashlib.sha256()
    total = 0
    total_size = 0

    req = urllib.request.Request(url, headers={"User-Agent": "cinema-productions-updater"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        try:
            total_size = int(r.headers.get("Content-Length") or 0)
        except Exception:
            total_size = 0
        with open(part, "wb") as f:
            while True:
                chunk = r.read(_CHUNK)
                if not chunk:
                    break
                f.write(chunk)
                hasher.update(chunk)
                total += len(chunk)
                if progress_cb:
                    try:
                        progress_cb(total, total_size)
                    except Exception:
                        pass

    actual = hasher.hexdigest().lower()
    if actual != expected:
        try:
            part.unlink()
        except Exception:
            pass
        raise IntegrityError(
            f"SHA256 mismatch: expected={expected[:16]}… actual={actual[:16]}…"
        )

    # Hash OK → promocionar el .part al nombre final
    if final.exists():
        try:
            final.unlink()
        except Exception:
            pass
    part.rename(final)
    return str(final)


# ─────────────────────────────────────────────────────────────────────
# 4) Safe swap (Windows) via helper batch
# ─────────────────────────────────────────────────────────────────────
_WIN_BATCH_TEMPLATE = r"""@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "NEW_BIN={new_bin}"
set "CUR_BIN={cur_bin}"
set "LOG={log}"
set "APP_NAME={app_name}"

for %%I in ("%CUR_BIN%") do set "CUR_DIR=%%~dpI"

echo [%date% %time%] updater.bat start > "%LOG%"
echo   NEW_BIN=%NEW_BIN% >> "%LOG%"
echo   CUR_BIN=%CUR_BIN% >> "%LOG%"
echo   CUR_DIR=%CUR_DIR% >> "%LOG%"

REM 0) Sanidad: el nuevo binario debe existir y no estar vacío.
if not exist "%NEW_BIN%" (
  echo [%date% %time%] ERROR: NEW_BIN no existe >> "%LOG%"
  goto :fail
)
for %%F in ("%NEW_BIN%") do set "NEW_SIZE=%%~zF"
if "%NEW_SIZE%"=="0" (
  echo [%date% %time%] ERROR: NEW_BIN tamano 0 >> "%LOG%"
  goto :fail
)
echo   NEW_SIZE=%NEW_SIZE% >> "%LOG%"

REM 1) Esperar a que el proceso actual libere el .exe (max 60 s).
set /a tries=0
:waitloop
tasklist /FI "IMAGENAME eq %APP_NAME%" | find /I "%APP_NAME%" > nul
if errorlevel 1 goto :post_wait
set /a tries+=1
if %tries% GEQ 120 (
  echo [%date% %time%] timeout esperando cierre de %APP_NAME% >> "%LOG%"
  goto :force_kill
)
timeout /t 1 /nobreak > nul
goto :waitloop

:force_kill
taskkill /F /IM "%APP_NAME%" >> "%LOG%" 2>&1
timeout /t 2 /nobreak > nul

:post_wait
REM 1b) Windows a veces tarda extra en liberar el lock — pausa de gracia.
timeout /t 2 /nobreak > nul

:do_swap
REM 2) Backup del .exe actual (por si el reemplazo falla) — con reintentos.
if exist "%CUR_BIN%.bak" del /F /Q "%CUR_BIN%.bak" >> "%LOG%" 2>&1
if exist "%CUR_BIN%" (
  set /a mv=0
  :mv_retry
  move /Y "%CUR_BIN%" "%CUR_BIN%.bak" >> "%LOG%" 2>&1
  if not errorlevel 1 goto :mv_ok
  set /a mv+=1
  if !mv! GEQ 8 (
    echo [%date% %time%] ERROR backup tras !mv! intentos >> "%LOG%"
    goto :fail
  )
  echo [%date% %time%] move falló, reintento !mv! >> "%LOG%"
  timeout /t 1 /nobreak > nul
  goto :mv_retry
)
:mv_ok

REM 3) Copiar el nuevo binario en su lugar — con reintentos.
set /a cp=0
:cp_retry
copy /Y "%NEW_BIN%" "%CUR_BIN%" >> "%LOG%" 2>&1
if not errorlevel 1 goto :cp_ok
set /a cp+=1
if !cp! GEQ 5 (
  echo [%date% %time%] ERROR copy tras !cp! intentos — restaurando backup >> "%LOG%"
  if exist "%CUR_BIN%.bak" move /Y "%CUR_BIN%.bak" "%CUR_BIN%" >> "%LOG%" 2>&1
  goto :fail
)
echo [%date% %time%] copy falló, reintento !cp! >> "%LOG%"
timeout /t 1 /nobreak > nul
goto :cp_retry
:cp_ok

REM 3b) Verifica que la copia quedó bien (tamaño > 0).
for %%F in ("%CUR_BIN%") do set "CUR_SIZE=%%~zF"
if "%CUR_SIZE%"=="0" (
  echo [%date% %time%] ERROR: CUR_BIN quedó vacío — rollback >> "%LOG%"
  if exist "%CUR_BIN%.bak" (
    del /F /Q "%CUR_BIN%" >> "%LOG%" 2>&1
    move /Y "%CUR_BIN%.bak" "%CUR_BIN%" >> "%LOG%" 2>&1
  )
  goto :fail
)

REM 4) Relanzar la app FIJANDO el directorio de trabajo original.
echo [%date% %time%] swap OK — relanzando %CUR_BIN% (CWD=%CUR_DIR%) >> "%LOG%"
start "" /D "%CUR_DIR%" "%CUR_BIN%"
if errorlevel 1 (
  echo [%date% %time%] ERROR: start falló — rollback y relanzar backup >> "%LOG%"
  if exist "%CUR_BIN%.bak" (
    del /F /Q "%CUR_BIN%" >> "%LOG%" 2>&1
    move /Y "%CUR_BIN%.bak" "%CUR_BIN%" >> "%LOG%" 2>&1
    start "" /D "%CUR_DIR%" "%CUR_BIN%"
  )
  goto :fail
)

REM 5) Limpieza: borrar backup + archivo nuevo + este batch.
if exist "%CUR_BIN%.bak" del /F /Q "%CUR_BIN%.bak" >> "%LOG%" 2>&1
if exist "%NEW_BIN%" del /F /Q "%NEW_BIN%" >> "%LOG%" 2>&1
echo [%date% %time%] updater.bat OK >> "%LOG%"
(goto) 2>nul & del /Q "%~f0"
exit /b 0

:fail
echo [%date% %time%] updater.bat FAILED >> "%LOG%"
exit /b 1
"""


def apply_update_windows(
    new_exe_path: str,
    current_exe_path: Optional[str] = None,
    app_name: str = "CinemaProductions.exe",
) -> str:
    """Genera y lanza `updater.bat` para reemplazar el .exe en marcha.

    El batch se ejecuta en un proceso DETACHED (no hijo del proceso actual),
    por lo que sobrevive al cierre inmediato de la app. El caller DEBE
    llamar `os._exit(0)` justo después.

    Retorna la ruta del batch generado (útil para logging).
    """
    if sys.platform != "win32":
        raise RuntimeError("apply_update_windows() sólo funciona en Windows")

    cur = current_exe_path or sys.executable
    tmp = Path(tempfile.gettempdir()) / "CinemaProductions_update"
    tmp.mkdir(parents=True, exist_ok=True)
    batch = tmp / f"updater_{int(time.time())}.bat"
    log = tmp / "updater.log"

    batch.write_text(
        _WIN_BATCH_TEMPLATE.format(
            new_bin=str(Path(new_exe_path).resolve()),
            cur_bin=str(Path(cur).resolve()),
            log=str(log.resolve()),
            app_name=app_name,
        ),
        encoding="ascii",
    )

    # DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP = 0x00000008 | 0x00000200
    CREATE_FLAGS = 0x00000008 | 0x00000200
    subprocess.Popen(
        ["cmd.exe", "/c", str(batch)],
        creationflags=CREATE_FLAGS,
        close_fds=True,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return str(batch)


# ─────────────────────────────────────────────────────────────────────
# 5) Safe swap (POSIX) — reemplazo directo (el binario en POSIX se puede
#    reemplazar aunque esté ejecutándose porque el kernel mantiene el inode).
# ─────────────────────────────────────────────────────────────────────
def apply_update_posix(new_bin_path: str, current_bin_path: Optional[str] = None) -> None:
    """En Linux/macOS, mover encima del binario en ejecución es seguro."""
    cur = current_bin_path or sys.executable
    shutil.move(new_bin_path, cur)
    os.chmod(cur, 0o755)


# ─────────────────────────────────────────────────────────────────────
# 6) High-level orchestration helper (opcional, sync)
# ─────────────────────────────────────────────────────────────────────
def run_full_update(
    manifest_url: str,
    current_local_version: str,
    prefer: str = "installer",
    progress_cb=None,
) -> dict:
    """Orquesta todo el flujo: fetch manifest → compare → download+verify → swap.

    Devuelve dict con `status`: `up_to_date` | `applied` | `no_asset` | error.
    No relanza la app automáticamente — deja esa decisión al caller.
    """
    try:
        manifest = fetch_manifest(manifest_url)
    except Exception as e:
        return {"status": "error", "stage": "fetch_manifest", "detail": str(e)}

    remote = str(manifest.get("version", "")).strip().lstrip("v")
    local = (current_local_version or "").strip().lstrip("v")

    def _tup(v: str):
        try:
            return tuple(int(x) for x in v.split("."))
        except Exception:
            return (0, 0, 0)

    if not remote or _tup(remote) <= _tup(local):
        return {"status": "up_to_date", "local": local, "remote": remote}

    asset = resolve_asset_for_platform(manifest, prefer=prefer)
    if not asset:
        return {"status": "no_asset", "remote": remote}

    try:
        path = download_and_verify(
            asset["url"], asset["sha256"], progress_cb=progress_cb
        )
    except IntegrityError as e:
        return {"status": "error", "stage": "verify", "detail": str(e)}
    except Exception as e:
        return {"status": "error", "stage": "download", "detail": str(e)}

    return {
        "status": "downloaded",
        "remote": remote,
        "asset": asset,
        "path": path,
        # El caller decide llamar apply_update_windows() / apply_update_posix()
        # y luego os._exit(0). No lo hacemos aquí para permitir confirmación UX.
    }
