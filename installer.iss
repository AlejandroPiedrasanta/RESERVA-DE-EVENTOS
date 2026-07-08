; ============================================================================
;  Cinema Productions - Inno Setup Installer script (MODERN EDITION)
;  ---------------------------------------------------------------------------
;  · Instalación per-user en %LocalAppData% (sin UAC).
;  · Wizard moderno con imágenes personalizadas (clip morado) y textos en ES.
;  · Autostart opcional en Windows.
;  · Preserva datos del usuario (.env, cinema_data.json, backups, uploads) al
;    actualizar sobre una instalación existente.
;  · Cierra la app en ejecución antes de sobrescribir, y la relanza al final.
;
;  El workflow build-exe.yml copia este .iss + favicon.ico + BMPs a dist/ y
;  ejecuta:  ISCC.exe /DMyAppVersion=X.Y.Z dist\installer.iss
;  Todas las rutas relativas se resuelven desde dist/.
; ============================================================================

#ifndef MyAppVersion
  #define MyAppVersion "1.0.0"
#endif

#define MyAppName        "Cinema Productions"
#define MyAppPublisher   "Cinema Productions"
#define MyAppURL         "https://github.com/AlejandroPiedrasanta/RESERVA-DE-EVENTOS"
#define MyAppExeName     "CinemaProductions.exe"
#define MyAppId          "{{A1B4C0DE-CINE-4A11-B3E5-CPRO2025APP01}"

[Setup]
AppId={#MyAppId}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}/issues
AppUpdatesURL={#MyAppURL}/releases
VersionInfoVersion={#MyAppVersion}
VersionInfoProductName={#MyAppName}
VersionInfoProductVersion={#MyAppVersion}
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription={#MyAppName} — Gestor de Reservas de Eventos

; Instalación per-user en %LocalAppData% -> sin admin, sin UAC.
DefaultDirName={localappdata}\CinemaProductions
DefaultGroupName={#MyAppName}
DisableDirPage=auto
DisableProgramGroupPage=yes
DisableWelcomePage=no
DisableReadyPage=no
DisableFinishedPage=no
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog

; Salida
OutputDir=.
OutputBaseFilename=CinemaProductions-Setup
Compression=lzma2/ultra64
SolidCompression=yes
LZMAUseSeparateProcess=yes

; UX moderno
WizardStyle=modern
WizardResizable=no
WizardSizePercent=110
ShowLanguageDialog=no
SetupIconFile=favicon.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName}
CloseApplications=force
RestartApplications=yes
ArchitecturesInstallIn64BitMode=x64compatible

; Imágenes del wizard (BMP)
WizardImageFile=wizard_big.bmp
WizardSmallImageFile=wizard_small.bmp
WizardImageStretch=yes
WizardImageAlphaFormat=none

; Metadatos visibles en Apps y Características
AppReadmeFile={#MyAppURL}
AppContact={#MyAppURL}

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Messages]
spanish.WelcomeLabel1=Bienvenido al asistente de instalación de [name]
spanish.WelcomeLabel2=Este asistente instalará [name/ver] en tu equipo.%n%nCinema Productions te permite gestionar reservas de eventos con una interfaz moderna, ejecutándose 100%% en local, sin depender de internet.%n%nHaz clic en Siguiente para continuar.
spanish.FinishedLabelNoIcons=La instalación de [name] se completó correctamente.
spanish.FinishedLabel=[name] se ha instalado correctamente. Puedes lanzar la aplicación desde el menú Inicio o el acceso directo del escritorio.
spanish.ClickFinish=Haz clic en Finalizar para cerrar el asistente y abrir Cinema Productions.

[Tasks]
Name: "desktopicon";  Description: "Crear un acceso directo en el &escritorio";  GroupDescription: "Accesos directos:"; Flags: checkedonce
Name: "startmenu";    Description: "Crear entrada en el menú &Inicio";           GroupDescription: "Accesos directos:"; Flags: checkedonce
Name: "startup";      Description: "Iniciar Cinema Productions al arrancar Windows"; GroupDescription: "Al arrancar el sistema:"; Flags: unchecked

[Files]
Source: "CinemaProductions.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "favicon.ico";           DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}";                Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\favicon.ico"; Tasks: startmenu
Name: "{group}\Desinstalar {#MyAppName}";    Filename: "{uninstallexe}";                                            Tasks: startmenu
Name: "{autodesktop}\{#MyAppName}";          Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\favicon.ico"; Tasks: desktopicon

[Registry]
; Autostart opcional (per-user). Sin admin.
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; \
  ValueType: string; ValueName: "{#MyAppName}"; ValueData: """{app}\{#MyAppExeName}"""; \
  Flags: uninsdeletevalue; Tasks: startup

[Run]
; Postinstall: lanzar la app SIN mostrar consola (el .exe se compila con --windowed).
Filename: "{app}\{#MyAppExeName}"; Description: "Iniciar {#MyAppName} ahora"; \
  Flags: nowait postinstall skipifsilent

[UninstallRun]
; Al desinstalar, intentar cerrar la instancia en ejecución.
Filename: "{cmd}"; Parameters: "/C taskkill /F /IM {#MyAppExeName} /T"; \
  Flags: runhidden; RunOnceId: "KillCinema"

[UninstallDelete]
Type: filesandordirs; Name: "{app}\_internal"
Type: files;          Name: "{app}\*.log"
; NOTA: NO borramos {app}\backups, {app}\cinema_data.json ni {app}\uploads
;       para no perder datos del usuario. El uninstaller estándar ya los deja.

[Code]
{ ------------------------------------------------------------------
  Detectar si hay una instalación previa (misma AppId) y ofrecer
  cerrar la app antes de sobrescribir. Preserva datos del usuario.
------------------------------------------------------------------- }
function InitializeSetup(): Boolean;
begin
  Result := True;
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
begin
  if CurStep = ssInstall then
  begin
    { Cerrar cualquier instancia en ejecución antes de copiar. }
    Exec(ExpandConstant('{cmd}'), '/C taskkill /F /IM ' + '{#MyAppExeName}' + ' /T',
         '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  end;
end;
