; ============================================================================
;  Cinema Productions - Inno Setup Installer script
;  Empaqueta dist/CinemaProductions.exe en dist/CinemaProductions-Setup.exe.
;  Instala en %LocalAppData%\CinemaProductions (sin permisos de administrador),
;  crea accesos directos en Escritorio y menu Inicio, y lanza la app al terminar.
;
;  El workflow .github/workflows/build-exe.yml copia este .iss a dist/ y lo
;  invoca con:  ISCC.exe /DMyAppVersion=X.Y.Z dist\installer.iss
;  Todas las rutas relativas del script se resuelven desde dist/.
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
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}/releases
VersionInfoVersion={#MyAppVersion}
VersionInfoProductName={#MyAppName}
VersionInfoProductVersion={#MyAppVersion}

; Instalacion per-user en %LocalAppData% -> sin admin, sin UAC.
DefaultDirName={localappdata}\CinemaProductions
DefaultGroupName={#MyAppName}
DisableDirPage=yes
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog

; Salida
OutputDir=.
OutputBaseFilename=CinemaProductions-Setup
Compression=lzma2/max
SolidCompression=yes
LZMAUseSeparateProcess=yes

; UX
WizardStyle=modern
ShowLanguageDialog=no
SetupIconFile=favicon.ico
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName}
CloseApplications=yes
RestartApplications=no
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon";  Description: "{cm:CreateDesktopIcon}";      GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunch";  Description: "{cm:CreateQuickLaunchIcon}";  GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked; OnlyBelowVersion: 6.02

[Files]
Source: "CinemaProductions.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "favicon.ico";           DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}";                Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\favicon.ico"
Name: "{group}\Desinstalar {#MyAppName}";    Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}";          Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\favicon.ico"; Tasks: desktopicon
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\favicon.ico"; Tasks: quicklaunch

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; Limpieza de archivos que la app pueda generar junto al .exe (opcional).
Type: filesandordirs; Name: "{app}\_internal"
