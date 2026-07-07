; ============================================================================
;  Cinema Productions — Inno Setup Installer Script
; ----------------------------------------------------------------------------
;  Builds CinemaProductions-Setup.exe from the portable CinemaProductions.exe.
;  This .iss is copied into `dist/` by the GitHub Actions workflow so that
;  relative paths resolve to `dist\CinemaProductions.exe`.
;
;  Requirements:
;    - Inno Setup 6 (ISCC.exe, pre-installed on windows-latest runners).
;    - MyAppVersion is injected via `ISCC /DMyAppVersion=X.Y.Z`.
;
;  Install target: %LocalAppData%\CinemaProductions  (no admin required)
; ============================================================================

#ifndef MyAppVersion
  #define MyAppVersion "1.0.0"
#endif

#define MyAppName        "Cinema Productions"
#define MyAppPublisher   "Cinema Productions"
#define MyAppExeName     "CinemaProductions.exe"
#define MyAppURL         "https://github.com/AlejandroPiedrasanta/RESERVA-DE-EVENTOS"

[Setup]
AppId={{B3C1E4F2-9A7D-4E8B-9C3D-5F2A1E7B0C4D}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}/releases

; Install per-user under %LocalAppData% — no admin rights required
DefaultDirName={localappdata}\CinemaProductions
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog

; Output
OutputDir=.
OutputBaseFilename=CinemaProductions-Setup
Compression=lzma2/max
SolidCompression=yes
LZMAUseSeparateProcess=yes

; UI
WizardStyle=modern
ShowLanguageDialog=auto
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName} {#MyAppVersion}

; Version metadata baked into the setup .exe
VersionInfoVersion={#MyAppVersion}
VersionInfoProductName={#MyAppName}
VersionInfoProductVersion={#MyAppVersion}
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription={#MyAppName} Setup

ArchitecturesInstallIn64BitMode=x64compatible
ArchitecturesAllowed=x64compatible

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon";   Description: "{cm:CreateDesktopIcon}";        GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Portable payload — CinemaProductions.exe lives next to this .iss inside dist\
Source: "CinemaProductions.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}";           Filename: "{app}\{#MyAppExeName}"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}";     Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: quicklaunchicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
; Clean local runtime data on uninstall (logs, cache). Leave user documents alone.
Type: filesandordirs; Name: "{localappdata}\CinemaProductions\logs"
Type: filesandordirs; Name: "{localappdata}\CinemaProductions\cache"
