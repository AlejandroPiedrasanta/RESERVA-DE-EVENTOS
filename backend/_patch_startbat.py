from pathlib import Path

p = Path("/app/backend/desktop_package.py")
src = p.read_text(encoding="utf-8")

start_anchor = '_START_BAT = """@echo off'
legacy_anchor = '\n\n\n_START_BAT_LEGACY = _START_BAT'

i = src.index(start_anchor)
j = src.index(legacy_anchor)
assert i < j, "anchors out of order"

new_block = '''_INICIAR_VBS = """\' Cinema Productions - Iniciar SIN ventana de consola (recomendado)
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
d = fso.GetParentFolderName(WScript.ScriptFullName)
sh.CurrentDirectory = d
On Error Resume Next
sh.Run "pythonw \"\"" & d & "\\\\launcher.pyw\"\"", 0, False
If Err.Number <> 0 Then
  Err.Clear
  sh.Run "py -w \"\"" & d & "\\\\launcher.pyw\"\"", 0, False
End If
If Err.Number <> 0 Then
  Err.Clear
  sh.Run "python \"\"" & d & "\\\\launcher.pyw\"\"", 0, False
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
"""'''

src = src[:i] + new_block + src[j:]
p.write_text(src, encoding="utf-8")
print("patched _START_BAT + added _INICIAR_VBS")
