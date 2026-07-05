import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor, Package, AlertCircle, CheckCircle, XCircle,
  Loader2, RefreshCw, Download,
} from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import { Section } from "@/components/appearance/SectionShell";

/**
 * DesktopAppSection — Compila y descarga la app de escritorio (.zip).
 * Autocontenido: gestiona su propio buildStatus + polling + handlers.
 * Se usa dentro de: Base de Datos → Soporte avanzado.
 */
export function DesktopAppSection() {
  const { language, tr } = useSettings();
  const { toast } = useToast();
  const s = tr.settings;

  const [downloadLoading, setDownloadLoading] = useState(false);
  const [buildStatus, setBuildStatus] = useState({ status: "idle", message: "" });
  const [buildPolling, setBuildPolling] = useState(false);

  // Poll build status
  useEffect(() => {
    if (!buildPolling) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/download/package/build-status`);
        const data = await res.json();
        setBuildStatus(data);
        if (data.status === "ready" || data.status === "error") {
          setBuildPolling(false);
          clearInterval(interval);
          if (data.status === "ready") toast({ title: "App actualizada ✓ — Ya puedes descargarla" });
          else toast({ title: data.message || "Error al compilar", variant: "destructive" });
        }
      } catch { /* ignore network errors during polling */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [buildPolling, toast]);

  const handleRebuild = async () => {
    setBuildStatus({ status: "building", message: "Iniciando compilación…" });
    setBuildPolling(false);
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/download/package/rebuild`, { method: "POST" });
      const data = await res.json();
      setBuildStatus(data);
      if (data.status === "building") {
        setBuildPolling(true);
        toast({ title: "Compilando app… espera 1-3 minutos" });
      }
    } catch {
      setBuildStatus({ status: "error", message: "Error al iniciar compilación" });
      toast({ title: "Error al iniciar compilación", variant: "destructive" });
    }
  };

  const handleDownloadPackage = async () => {
    setDownloadLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/download/package`);
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || "Error al generar el paquete");
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
      toast({ title: "Paquete descargado ✓ — Extrae el .zip y ejecuta start.bat" });
    } catch (err) {
      toast({ title: err.message || "Error al descargar", variant: "destructive" });
    } finally {
      setDownloadLoading(false);
    }
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

        {/* ══ PASO 1: COMPILAR ══════════════════════════════════ */}
        <div className="rounded-2xl border border-indigo-100/80 bg-gradient-to-br from-white/80 to-indigo-50/40 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-indigo-100/60 bg-white/50">
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 ${
                buildStatus.status === "ready" ? "bg-gradient-to-br from-emerald-500 to-emerald-600" :
                buildStatus.status === "building" ? "bg-gradient-to-br from-indigo-500 to-purple-500 animate-pulse" :
                buildStatus.status === "error" ? "bg-gradient-to-br from-red-500 to-red-600" :
                "btn-primary"
              }`}>
                {buildStatus.status === "ready" ? <CheckCircle size={14} /> : "1"}
              </div>
              <div className="flex-1">
                <p className="text-xs font-black text-slate-800">
                  {language === "es" ? "Compilar app con los últimos cambios" : "Compile app with latest changes"}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  {language === "es" ? "Genera el paquete para tu PC (1–3 min)" : "Builds the package for your PC (1–3 min)"}
                </p>
              </div>
            </div>
          </div>

          <div className="px-4 py-3 space-y-3">
            {/* Estado del build */}
            <AnimatePresence mode="wait">
              {buildStatus.status !== "idle" && (
                <motion.div
                  key={`build-${buildStatus.status}`}
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className={`rounded-xl px-3 py-2.5 border ${
                    buildStatus.status === "building" ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                    buildStatus.status === "ready" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    "bg-red-50 text-red-700 border-red-200"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {buildStatus.status === "building" ? <Loader2 size={13} className="animate-spin flex-shrink-0 mt-0.5" /> :
                     buildStatus.status === "ready" ? <CheckCircle size={13} className="flex-shrink-0 mt-0.5" /> :
                     <XCircle size={13} className="flex-shrink-0 mt-0.5" />}
                    <p className="text-[11px] font-semibold whitespace-pre-wrap flex-1 leading-tight">{buildStatus.message}</p>
                  </div>
                  {buildStatus.status === "building" && typeof buildStatus.progress === "number" && (
                    <div className="mt-2 h-1 bg-indigo-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(10, buildStatus.progress)}%` }}
                        transition={{ duration: 0.5 }}
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                      />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Botón compilar */}
            <motion.button
              whileHover={{ scale: buildStatus.status === "building" ? 1 : 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleRebuild}
              disabled={buildStatus.status === "building"}
              data-testid="desktop-rebuild-btn"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black text-white shadow-md transition-all disabled:opacity-60"
              style={{
                background: buildStatus.status === "ready"
                  ? "linear-gradient(135deg, #10b981, #059669)"
                  : "linear-gradient(135deg, var(--t-from), var(--t-to))"
              }}
            >
              {buildStatus.status === "building"
                ? <><Loader2 size={16} className="animate-spin" /> {language === "es" ? "Compilando…" : "Compiling…"}</>
                : buildStatus.status === "ready"
                ? <><CheckCircle size={16} /> {language === "es" ? "App lista ✓ (recompilar)" : "Ready ✓ (rebuild)"}</>
                : <><RefreshCw size={16} /> {language === "es" ? "Compilar app" : "Compile app"}</>}
            </motion.button>
          </div>
        </div>

        {/* ══ PASO 2: DESCARGAR ══════════════════════════════ */}
        <div className={`rounded-2xl border overflow-hidden shadow-sm transition-all ${
          buildStatus.status === "ready"
            ? "border-emerald-200 bg-gradient-to-br from-emerald-50/40 to-white/80"
            : "border-slate-200 bg-gradient-to-br from-slate-50/40 to-white/40 opacity-70"
        }`}>
          <div className={`px-4 py-3 border-b bg-white/50 ${
            buildStatus.status === "ready" ? "border-emerald-100/60" : "border-slate-100/60"
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 ${
                buildStatus.status === "ready" ? "bg-gradient-to-br from-emerald-500 to-emerald-600" : "bg-slate-300"
              }`}>
                2
              </div>
              <div className="flex-1">
                <p className={`text-xs font-black ${buildStatus.status === "ready" ? "text-slate-800" : "text-slate-500"}`}>
                  {language === "es" ? "Descargar app (.zip)" : "Download app (.zip)"}
                </p>
                <p className="text-[10px] text-slate-500 font-medium">
                  {language === "es" ? "Un solo archivo con todo lo necesario" : "Single file with everything included"}
                </p>
              </div>
            </div>
          </div>
          <div className="px-4 py-3">
            <motion.button
              whileHover={{ scale: buildStatus.status === "ready" ? 1.02 : 1 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleDownloadPackage}
              disabled={downloadLoading || buildStatus.status !== "ready"}
              data-testid="desktop-download-btn"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all disabled:cursor-not-allowed"
              style={{
                background: buildStatus.status === "ready" ? "linear-gradient(135deg,var(--t-from),var(--t-to))" : "#e2e8f0",
                color: buildStatus.status === "ready" ? "white" : "#94a3b8"
              }}
            >
              {downloadLoading
                ? <><Loader2 size={16} className="animate-spin" /> {s.desktopDownloading}</>
                : buildStatus.status === "ready"
                ? <><Download size={16} /> {language === "es" ? "Descargar para Windows (.zip)" : "Download for Windows (.zip)"}</>
                : <><Package size={16} /> {language === "es" ? "Compila primero (Paso 1)" : "Compile first (Step 1)"}</>}
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
