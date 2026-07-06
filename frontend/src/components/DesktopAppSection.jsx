import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor, Package, AlertCircle, CheckCircle, XCircle,
  Loader2, Download, Rocket,
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
