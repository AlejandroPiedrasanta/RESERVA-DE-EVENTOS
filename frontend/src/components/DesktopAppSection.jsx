import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor, Package, AlertCircle, CheckCircle, XCircle,
  Loader2, Download, Rocket, HardDrive, ExternalLink, Shield, Copy,
  DownloadCloud, Sparkles,
} from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import { Section } from "@/components/appearance/SectionShell";

/**
 * DesktopAppSection — UN SOLO BOTÓN: Compila + descarga la app de escritorio (.zip)
 * con barra de progreso y pasos visibles (estilo "Guardar en GitHub").
 * Se usa dentro de: Base de Datos → Soporte avanzado.
 */
const STEPS_ES = [
  { id: 1, label: "Iniciando compilación" },
  { id: 2, label: "Compilando frontend" },
  { id: 3, label: "Empaquetando .zip" },
  { id: 4, label: "Descargando en tu equipo" },
];
const STEPS_EN = [
  { id: 1, label: "Starting build" },
  { id: 2, label: "Building frontend" },
  { id: 3, label: "Packaging .zip" },
  { id: 4, label: "Downloading to your device" },
];

export function DesktopAppSection() {
  const { language, tr } = useSettings();
  const { toast } = useToast();
  const s = tr.settings;
  const STEPS = language === "es" ? STEPS_ES : STEPS_EN;

  // "idle" | "building" | "downloading" | "done" | "error"
  const [phase, setPhase] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [message, setMessage] = useState("");
  const pollingRef = useRef(null);

  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

  const downloadZip = async () => {
    setPhase("downloading");
    setCurrentStep(4);
    setProgress(95);
    setMessage(language === "es" ? "Descargando el paquete .zip…" : "Downloading the .zip package…");
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/download/package`);
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || (language === "es" ? "Error al generar el paquete" : "Failed to build package"));
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cinema-productions-local.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setProgress(100);
      setPhase("done");
      setMessage(language === "es" ? "✓ Paquete descargado. Extrae el .zip y ejecuta start.bat" : "✓ Package downloaded. Extract the .zip and run start.bat");
      toast({ title: language === "es" ? "App descargada ✓" : "App downloaded ✓" });
    } catch (err) {
      setPhase("error");
      setMessage(err.message);
      toast({ title: err.message, variant: "destructive" });
    }
  };

  const pollBuild = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/download/package/build-status`);
        const data = await res.json();
        // Escalamos progreso 0-100 del backend a 0-90 (10% reservado para descarga)
        const scaled = Math.min(90, Math.round((data.progress || 0) * 0.9));
        setProgress(scaled);
        if (data.step) setCurrentStep(data.step);
        if (data.message) setMessage(data.message);
        if (data.status === "ready") {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          await downloadZip();
        } else if (data.status === "error") {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
          setPhase("error");
          setMessage(data.message || (language === "es" ? "Error al compilar" : "Build error"));
          toast({ title: data.message || (language === "es" ? "Error al compilar" : "Build error"), variant: "destructive" });
        }
      } catch { /* ignore transient network errors */ }
    }, 2500);
  };

  const handleCompileAndDownload = async () => {
    setPhase("building");
    setProgress(5);
    setCurrentStep(1);
    setMessage(language === "es" ? "Iniciando compilación…" : "Starting build…");
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/download/package/rebuild`, { method: "POST" });
      const data = await res.json();
      if (data.status === "building") {
        toast({ title: language === "es" ? "Compilando app… espera 1–3 minutos" : "Building app… wait 1–3 min" });
        pollBuild();
      } else if (data.status === "ready") {
        await downloadZip();
      } else {
        setPhase("error");
        setMessage(data.message || (language === "es" ? "No se pudo iniciar la compilación" : "Could not start build"));
      }
    } catch {
      setPhase("error");
      setMessage(language === "es" ? "Error al iniciar compilación" : "Failed to start build");
      toast({ title: language === "es" ? "Error al iniciar compilación" : "Failed to start build", variant: "destructive" });
    }
  };

  const isBusy = phase === "building" || phase === "downloading";
  const isError = phase === "error";
  const isDone = phase === "done";

  // ── Descarga .EXE (Windows, sin Python) desde GitHub Releases ───────────
  // El .exe se compila por GitHub Actions (.github/workflows/build-exe.yml) y
  // se publica como asset de release: descarga instantánea, sin PyInstaller
  // en el servidor.
  //   · exeInfo       → CinemaProductions.exe (portable)
  //   · installerInfo → CinemaProductions-Setup.exe (Inno Setup, se instala)
  const [exeInfo, setExeInfo] = useState(null); // {status, name, size_mb, tag, url, sha256, ...}
  const [exePhase, setExePhase] = useState("idle"); // idle|loading|downloading|error
  const [installerInfo, setInstallerInfo] = useState(null);
  const [installerPhase, setInstallerPhase] = useState("idle");
  const [showHashInfo, setShowHashInfo] = useState(false);
  const [hashCopied, setHashCopied] = useState(false);
  const [showInstallerHashInfo, setShowInstallerHashInfo] = useState(false);
  const [installerHashCopied, setInstallerHashCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setExePhase("loading");
        setInstallerPhase("loading");
        const [r1, r2] = await Promise.all([
          fetch(`${process.env.REACT_APP_BACKEND_URL}/api/download/desktop-exe/info`),
          fetch(`${process.env.REACT_APP_BACKEND_URL}/api/download/desktop-installer/info`),
        ]);
        setExeInfo(await r1.json());
        setInstallerInfo(await r2.json());
      } catch {
        setExeInfo({ status: "not_available", message: "" });
        setInstallerInfo({ status: "not_available", message: "" });
      } finally {
        setExePhase("idle");
        setInstallerPhase("idle");
      }
    })();
  }, []);

  const _triggerDownload = (info, phaseSetter, fallbackName) => {
    if (!info || info.status !== "ready") {
      const url = info?.workflow_url || info?.releases_url;
      if (url) window.open(url, "_blank", "noopener");
      toast({
        title: language === "es" ? "Aún no hay .exe publicado" : "No .exe published yet",
        description: language === "es"
          ? "Ejecuta el workflow 'Build Windows .exe' en GitHub Actions o publica un tag v*."
          : "Run the 'Build Windows .exe' workflow on GitHub Actions or push a v* tag.",
        variant: "destructive",
      });
      return;
    }
    phaseSetter("downloading");
    try {
      const a = document.createElement("a");
      a.href = info.url;
      a.download = info.name || fallbackName;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast({
        title: language === "es" ? ".EXE descargando…" : ".EXE downloading…",
        description: `${info.name} · ${info.size_mb} MB · ${info.tag}`,
      });
    } finally {
      setTimeout(() => phaseSetter("idle"), 800);
    }
  };

  const handleDownloadExe = () => _triggerDownload(exeInfo, setExePhase, "CinemaProductions.exe");
  const handleDownloadInstaller = () => _triggerDownload(installerInfo, setInstallerPhase, "CinemaProductions-Setup.exe");

  const copyHash = async () => {
    if (!exeInfo?.sha256) return;
    try {
      await navigator.clipboard.writeText(exeInfo.sha256);
      setHashCopied(true);
      setTimeout(() => setHashCopied(false), 1600);
      toast({ title: language === "es" ? "SHA256 copiado" : "SHA256 copied" });
    } catch { /* noop */ }
  };

  const copyInstallerHash = async () => {
    if (!installerInfo?.sha256) return;
    try {
      await navigator.clipboard.writeText(installerInfo.sha256);
      setInstallerHashCopied(true);
      setTimeout(() => setInstallerHashCopied(false), 1600);
      toast({ title: language === "es" ? "SHA256 copiado" : "SHA256 copied" });
    } catch { /* noop */ }
  };

  return (
    <Section
      icon={Monitor}
      title={s.desktopTitle}
      desc={s.desktopDesc}
      badge={
        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm">
          {s.desktopBadge}
        </span>
      }
    >
      <div className="space-y-4" data-testid="desktop-app-section">
        {/* Beneficios */}
        <div className="grid grid-cols-2 gap-2">
          {[s.desktopFeature1, s.desktopFeature2, s.desktopFeature3, s.desktopFeature4].map((f, i) => (
            <div key={i} className="flex items-start gap-2 bg-white/60 rounded-xl p-2.5 border border-white/40">
              <CheckCircle size={13} className="text-emerald-500 mt-0.5 shrink-0" />
              <span className="text-[11px] text-slate-600 font-medium leading-tight">{f}</span>
            </div>
          ))}
        </div>

        {/* Requisitos */}
        <div className="flex items-start gap-2 bg-amber-50/80 border border-amber-200/60 rounded-xl px-3 py-2.5">
          <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700 font-semibold leading-tight">
            {language === "es" ? "Requiere Python 3.8+" : "Requires Python 3.8+"} —{" "}
            <a href="https://www.python.org/downloads/" target="_blank" rel="noreferrer" className="underline hover:text-amber-900">
              {language === "es" ? "Descargar Python" : "Download Python"}
            </a>
            {" "}({language === "es" ? "marca «Add Python to PATH»" : "check «Add Python to PATH»"})
          </p>
        </div>

        {/* ══ BOTÓN ÚNICO: COMPILAR + DESCARGAR ══════════════════════ */}
        <div className={`rounded-2xl border overflow-hidden shadow-sm transition-all ${
          isError ? "border-red-200 bg-gradient-to-br from-red-50/40 to-white/80" :
          isDone ? "border-emerald-200 bg-gradient-to-br from-emerald-50/40 to-white/80" :
          "border-indigo-100/80 bg-gradient-to-br from-white/80 to-indigo-50/40"
        }`}>
          <div className="px-4 py-3 border-b border-indigo-100/60 bg-white/50">
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white shadow-sm flex-shrink-0 ${
                isDone ? "bg-gradient-to-br from-emerald-500 to-emerald-600" :
                isError ? "bg-gradient-to-br from-red-500 to-red-600" :
                isBusy ? "bg-gradient-to-br from-indigo-500 to-purple-500 animate-pulse" :
                "bg-gradient-to-br from-indigo-500 to-purple-500"
              }`}>
                {isDone ? <CheckCircle size={14} /> : isError ? <XCircle size={14} /> : <Rocket size={14} />}
              </div>
              <div className="flex-1">
                <p className="text-xs font-black text-slate-800">
                  {language === "es" ? "Compilar y descargar app (.zip)" : "Build & download app (.zip)"}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  {language === "es" ? "Un solo paso: compila y descarga automáticamente (1–3 min)" : "One step: builds and downloads automatically (1–3 min)"}
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 py-3 space-y-3">
            {/* Barra de progreso con pasos (estilo "Guardar en GitHub") */}
            <AnimatePresence>
              {(isBusy || isDone || isError) && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="space-y-3"
                  data-testid="desktop-build-progress"
                >
                  {/* Lista de pasos */}
                  <div className="rounded-xl bg-white/70 border border-slate-200/60 p-3 space-y-2">
                    {STEPS.map((step) => {
                      const isCurrent = currentStep === step.id && !isError;
                      const isCompleted = currentStep > step.id || (isDone && step.id === 4);
                      const isFailed = isError && currentStep === step.id;
                      return (
                        <div
                          key={step.id}
                          data-testid={`desktop-step-${step.id}`}
                          className={`flex items-center gap-2.5 transition-all ${
                            isCurrent || isCompleted || isFailed ? "opacity-100" : "opacity-40"
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-black ${
                            isFailed ? "bg-red-500 text-white" :
                            isCompleted ? "bg-emerald-500 text-white" :
                            isCurrent ? "bg-indigo-500 text-white" :
                            "bg-slate-200 text-slate-500"
                          }`}>
                            {isFailed ? <XCircle size={11} /> :
                             isCompleted ? <CheckCircle size={11} /> :
                             isCurrent ? <Loader2 size={11} className="animate-spin" /> :
                             step.id}
                          </div>
                          <span className={`text-[11px] font-semibold leading-tight ${
                            isFailed ? "text-red-700" :
                            isCompleted ? "text-emerald-700" :
                            isCurrent ? "text-indigo-700" :
                            "text-slate-500"
                          }`}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Barra de progreso */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        {language === "es" ? "Progreso" : "Progress"}
                      </span>
                      <span className={`text-[11px] font-black ${
                        isError ? "text-red-600" : isDone ? "text-emerald-600" : "text-indigo-600"
                      }`} data-testid="desktop-progress-percent">
                        {progress}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className={`h-full ${
                          isError ? "bg-gradient-to-r from-red-500 to-red-600" :
                          isDone ? "bg-gradient-to-r from-emerald-500 to-emerald-600" :
                          "bg-gradient-to-r from-indigo-500 to-purple-500"
                        }`}
                      />
                    </div>
                  </div>

                  {/* Mensaje de estado */}
                  {message && (
                    <div className={`rounded-xl px-3 py-2 border text-[11px] font-semibold whitespace-pre-wrap leading-tight ${
                      isError ? "bg-red-50 text-red-700 border-red-200" :
                      isDone ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      "bg-indigo-50 text-indigo-700 border-indigo-200"
                    }`} data-testid="desktop-build-message">
                      {message}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Botón ÚNICO */}
            <motion.button
              whileHover={{ scale: isBusy ? 1 : 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleCompileAndDownload}
              disabled={isBusy}
              data-testid="desktop-compile-download-btn"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black text-white shadow-md transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              style={{
                background: isDone
                  ? "linear-gradient(135deg, #10b981, #059669)"
                  : isError
                  ? "linear-gradient(135deg, #ef4444, #dc2626)"
                  : "linear-gradient(135deg, var(--t-from), var(--t-to))"
              }}
            >
              {phase === "building"
                ? <><Loader2 size={16} className="animate-spin" /> {language === "es" ? "Compilando…" : "Building…"}</>
                : phase === "downloading"
                ? <><Loader2 size={16} className="animate-spin" /> {language === "es" ? "Descargando…" : "Downloading…"}</>
                : isDone
                ? <><Download size={16} /> {language === "es" ? "Descargar de nuevo" : "Download again"}</>
                : isError
                ? <><Rocket size={16} /> {language === "es" ? "Reintentar" : "Retry"}</>
                : <><Package size={16} /> {language === "es" ? "Compilar y descargar (.zip)" : "Build & download (.zip)"}</>}
            </motion.button>

            {/* ══ BOTÓN SECUNDARIO: DESCARGAR .EXE (Windows, sin Python) ══ */}
            <div className="pt-2 border-t border-slate-200/60">
              <motion.button
                whileHover={{ scale: exePhase === "downloading" ? 1 : 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleDownloadExe}
                disabled={exePhase === "downloading" || exePhase === "loading"}
                data-testid="desktop-download-exe-btn"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black text-white shadow-md transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                style={{
                  background: exeInfo?.status === "ready"
                    ? "linear-gradient(135deg, #0f172a, #1e293b)"
                    : "linear-gradient(135deg, #64748b, #475569)"
                }}
              >
                {exePhase === "loading"
                  ? <><Loader2 size={16} className="animate-spin" /> {language === "es" ? "Consultando release…" : "Fetching release…"}</>
                  : exePhase === "downloading"
                  ? <><Loader2 size={16} className="animate-spin" /> {language === "es" ? "Descargando .EXE…" : "Downloading .EXE…"}</>
                  : exeInfo?.status === "ready"
                  ? <><HardDrive size={16} /> {language === "es" ? "Descargar .EXE (Windows, sin Python)" : "Download .EXE (Windows, no Python)"}</>
                  : <><ExternalLink size={16} /> {language === "es" ? "Publicar .EXE en GitHub Actions" : "Publish .EXE via GitHub Actions"}</>}
              </motion.button>

              {/* Info del release / instrucciones */}
              <div className="mt-2 flex items-center justify-between text-[10px] font-semibold">
                {exeInfo?.status === "ready" ? (
                  <>
                    <span className="text-slate-500">
                      {exeInfo.name} · <span className="text-slate-700">{exeInfo.size_mb} MB</span> · <span className="text-slate-700">{exeInfo.tag}</span>
                    </span>
                    <span className="text-emerald-600 flex items-center gap-1">
                      <CheckCircle size={11} />
                      {language === "es" ? "Descarga instantánea" : "Instant download"}
                    </span>
                  </>
                ) : (
                  <span className="text-slate-500 leading-tight">
                    {language === "es"
                      ? "El .exe se compila por GitHub Actions (build-exe.yml) y se publica en Releases. Descarga inmediata, sin Python en el equipo del cliente."
                      : "The .exe is built by GitHub Actions (build-exe.yml) and published to Releases. Instant download, no Python needed on the client."}
                  </span>
                )}
              </div>

              {/* ── SHA256 (verificación de integridad) ─────────────────── */}
              {exeInfo?.status === "ready" && exeInfo?.sha256 && (
                <div
                  data-testid="desktop-exe-sha256"
                  className="mt-2 rounded-xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setShowHashInfo(v => !v)}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50/80 transition-colors"
                    data-testid="desktop-exe-sha256-toggle"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Shield size={12} className="text-emerald-600 flex-shrink-0" />
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider flex-shrink-0">
                        SHA256
                      </span>
                      <code className="text-[10px] font-mono text-slate-700 truncate">
                        {exeInfo.sha256.slice(0, 16)}…{exeInfo.sha256.slice(-8)}
                      </code>
                    </div>
                    <div
                      onClick={(e) => { e.stopPropagation(); copyHash(); }}
                      role="button"
                      tabIndex={0}
                      data-testid="desktop-exe-sha256-copy"
                      className="flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-md bg-slate-900 text-white hover:bg-slate-700 transition-colors flex-shrink-0 cursor-pointer"
                    >
                      {hashCopied ? <CheckCircle size={11} /> : <Copy size={11} />}
                      {hashCopied
                        ? (language === "es" ? "Copiado" : "Copied")
                        : (language === "es" ? "Copiar" : "Copy")}
                    </div>
                  </button>

                  <AnimatePresence>
                    {showHashInfo && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-slate-200/70"
                      >
                        <div className="px-3 py-2.5 space-y-2">
                          <p className="text-[10px] text-slate-600 leading-relaxed">
                            {language === "es"
                              ? "Verifica que el .exe descargado no fue alterado. Abre PowerShell donde lo descargaste y ejecuta:"
                              : "Verify the downloaded .exe was not tampered with. Open PowerShell where you downloaded it and run:"}
                          </p>
                          <code className="block px-2.5 py-1.5 rounded-md bg-slate-900 text-emerald-300 text-[10px] font-mono whitespace-pre overflow-x-auto">
{`Get-FileHash .\\${exeInfo.name} -Algorithm SHA256`}
                          </code>
                          <p className="text-[10px] text-slate-500 leading-relaxed">
                            {language === "es"
                              ? "El hash devuelto debe coincidir exactamente con:"
                              : "The returned hash must match exactly:"}
                          </p>
                          <code className="block px-2.5 py-1.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-mono break-all">
                            {exeInfo.sha256}
                          </code>
                          {exeInfo.sha256_url && (
                            <a
                              href={exeInfo.sha256_url}
                              target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline"
                            >
                              <ExternalLink size={10} />
                              {language === "es" ? "Descargar archivo .sha256" : "Download .sha256 file"}
                            </a>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Instrucciones de uso */}
        <div className="rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200/60 p-3">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
            {language === "es" ? "Después de descargar" : "After downloading"}
          </p>
          <ol className="space-y-1.5 text-[11px] text-slate-600">
            <li className="flex gap-2"><span className="font-black text-indigo-500 flex-shrink-0">1.</span> {language === "es" ? "Descomprime el .zip donde prefieras" : "Extract the .zip anywhere"}</li>
            <li className="flex gap-2"><span className="font-black text-indigo-500 flex-shrink-0">2.</span> {language === "es" ? "Doble clic en" : "Double-click"} <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px]">start.bat</code></li>
            <li className="flex gap-2"><span className="font-black text-indigo-500 flex-shrink-0">3.</span> {language === "es" ? "Se instalarán dependencias automáticamente (primera vez tarda 1-3 min)" : "Dependencies auto-install (first time takes 1-3 min)"}</li>
            <li className="flex gap-2"><span className="font-black text-indigo-500 flex-shrink-0">4.</span> {language === "es" ? "El navegador se abrirá con la app funcionando" : "Browser opens with the app running"}</li>
          </ol>
          <p className="text-[10px] text-slate-400 mt-2.5 leading-relaxed">
            {language === "es"
              ? "Al cambiar la BD (o después de recompilar), vuelve a descargar el paquete para actualizar el .env automáticamente."
              : "When you change the DB (or after a rebuild), re-download the package to update the .env automatically."}
          </p>
        </div>
      </div>
    </Section>
  );
}
