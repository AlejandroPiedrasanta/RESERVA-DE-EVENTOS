import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GitCommit, GitBranch, RefreshCw, X, Sparkles, Loader2, CheckCircle2,
  AlertTriangle, ExternalLink, ChevronDown, Package,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useSettings } from "@/context/SettingsContext";
import { checkGithubUpdates, applyGithubUpdate } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const POLL_INTERVAL_MS = 5 * 60 * 1000;
const INITIAL_DELAY_MS = 1200;
const DISMISSED_KEY = "gh_update_dismissed_sha";

function relativeTime(iso) {
  if (!iso) return "";
  try {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.max(0, Math.floor((now - then) / 1000));
    if (diff < 60) return `hace ${diff}s`;
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
    return `hace ${Math.floor(diff / 86400)} d`;
  } catch {
    return "";
  }
}

// Return a short, user-friendly version label
function versionLabel(data) {
  if (!data) return "";
  if (data.remote_version) return data.remote_version;
  if (data.remote_sha_short) return data.remote_sha_short;
  return "";
}

export default function GithubUpdateNotifier() {
  const { autoCheckUpdates } = useSettings();
  const { toast } = useToast();

  const [data, setData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showPill, setShowPill] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const intervalRef = useRef(null);

  const readDismissed = () => {
    try { return localStorage.getItem(DISMISSED_KEY) || ""; } catch { return ""; }
  };
  const writeDismissed = (sha) => {
    try { if (sha) localStorage.setItem(DISMISSED_KEY, sha); } catch { /* ignore */ }
  };

  const runCheck = useCallback(async ({ silent = true } = {}) => {
    try {
      const res = await checkGithubUpdates();
      if (res?.has_updates && res?.remote_sha) {
        setData(res);
        if (readDismissed() !== res.remote_sha) {
          setShowModal(true);
          setShowPill(true);
        } else {
          setShowPill(true);
        }
      } else {
        setData(null);
        setShowModal(false);
        setShowPill(false);
      }
    } catch (err) {
      if (!silent) {
        toast({
          title: "No se pudo verificar actualizaciones",
          description: err?.response?.data?.detail || err?.message || "Error de red",
          variant: "destructive",
        });
      }
    }
  }, [toast]);

  useEffect(() => {
    if (!autoCheckUpdates) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return undefined;
    }
    const initial = setTimeout(() => runCheck({ silent: true }), INITIAL_DELAY_MS);
    intervalRef.current = setInterval(() => runCheck({ silent: true }), POLL_INTERVAL_MS);
    const onFocus = () => runCheck({ silent: true });
    window.addEventListener("focus", onFocus);
    return () => {
      clearTimeout(initial);
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener("focus", onFocus);
    };
  }, [autoCheckUpdates, runCheck]);

  useEffect(() => {
    const handler = () => runCheck({ silent: false });
    window.addEventListener("cp:check-github-updates", handler);
    return () => window.removeEventListener("cp:check-github-updates", handler);
  }, [runCheck]);

  // "Recordarme luego" — colapsa el modal y deja la píldora flotante visible en cualquier apartado.
  const collapseToPill = () => {
    setShowModal(false);
    setShowPill(true);
    setExpanded(false);
  };

  // X global — descarta completamente esta versión hasta que aparezca una nueva.
  const dismissForever = () => {
    if (data?.remote_sha) writeDismissed(data.remote_sha);
    setShowModal(false);
    setShowPill(false);
    setExpanded(false);
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      const res = await applyGithubUpdate(true);
      setApplied(true);
      // App de escritorio: mensaje específico según si se reinició o no
      if (res?.is_desktop) {
        if (res.restarted) {
          toast({
            title: "Actualización aplicada",
            description: `${res.files_updated || 0} archivos actualizados. La app se reiniciará en 2 segundos.`,
          });
          setTimeout(() => window.location.reload(), 2500);
        } else if (res.dry_run) {
          toast({
            title: "Simulación completada (DRY RUN)",
            description: res.message || "Actualización simulada sin cambios reales.",
          });
          setApplied(false);
          setApplying(false);
        } else {
          // Fallback: hay nueva versión pero no se pudo reiniciar
          toast({
            title: "Hay una versión nueva en GitHub",
            description: res.message || "Descarga el paquete de nuevo para actualizar.",
          });
          setApplied(false);
          setApplying(false);
        }
      } else {
        toast({
          title: "Actualización aplicada",
          description: "El servidor se reiniciará y cargará los cambios más recientes.",
        });
        setTimeout(() => window.location.reload(), 2200);
      }
    } catch (err) {
      toast({
        title: "No se pudo aplicar la actualización",
        description: err?.response?.data?.detail || err?.message || "Error inesperado",
        variant: "destructive",
      });
      setApplying(false);
    }
  };

  if (!data || !data.has_updates) return null;

  const version = versionLabel(data);
  const localVersion = data.local_version || data.local_sha_short || "";
  const commitsAhead = data.commits_ahead || (data.commits?.length ?? 0);
  const commits = data.commits || [];

  return (
    <>
      {/* ── Persistent floating pill (visible en cualquier apartado) ── */}
      <AnimatePresence>
        {showPill && !showModal && (
          <motion.div
            key="gh-update-pill"
            data-testid="github-update-pill"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            transition={{ type: "spring", damping: 22, stiffness: 260 }}
            className="fixed bottom-5 right-5 z-[60] flex items-center gap-2 pl-3 pr-2 py-2 rounded-full text-white text-sm font-semibold shadow-2xl"
            style={{
              background: "linear-gradient(90deg, #6d28d9 0%, #4f46e5 60%, #0ea5e9 100%)",
              boxShadow: "0 20px 40px -10px rgba(79,70,229,0.6), 0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            <button
              type="button"
              data-testid="github-update-pill-open"
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2.5 hover:scale-[1.02] active:scale-[0.98] transition-transform"
            >
              <motion.span
                className="relative flex items-center justify-center w-7 h-7 rounded-full bg-white/20"
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles size={14} />
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white animate-pulse" />
              </motion.span>
              <span className="flex flex-col items-start leading-tight">
                <span className="text-[10px] uppercase tracking-wider opacity-80">Nueva versión</span>
                <span className="text-xs font-bold">v{version}</span>
              </span>
            </button>
            <button
              type="button"
              onClick={dismissForever}
              data-testid="github-update-pill-close"
              className="ml-1 w-7 h-7 flex items-center justify-center rounded-full opacity-70 hover:opacity-100 hover:bg-white/20 transition-all"
              aria-label="Descartar notificación"
            >
              <X size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Emergent modal (pantalla emergente) ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            key="gh-update-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[70] flex items-center justify-center px-4"
            style={{ background: "rgba(15, 23, 42, 0.55)", backdropFilter: "blur(6px)" }}
            onMouseDown={(e) => { if (e.target === e.currentTarget) collapseToPill(); }}
          >
            <motion.div
              key="gh-update-modal"
              data-testid="github-update-modal"
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: "spring", damping: 24, stiffness: 260 }}
              className="relative w-full max-w-md rounded-3xl overflow-hidden bg-white shadow-2xl"
              style={{ boxShadow: "0 30px 80px rgba(15,23,42,0.35), 0 8px 24px rgba(15,23,42,0.15)" }}
            >
              {/* X — cierra por completo (descarta hasta próxima versión) */}
              <button
                type="button"
                data-testid="github-update-modal-close"
                onClick={dismissForever}
                className="absolute top-3.5 right-3.5 z-10 w-9 h-9 rounded-full flex items-center justify-center bg-white/25 hover:bg-white/40 text-white transition-colors"
                aria-label="Cerrar y no mostrar más"
                title="Cerrar y descartar esta versión"
              >
                <X size={16} strokeWidth={2.5} />
              </button>

              {/* Header con VERSIÓN protagonista */}
              <div
                className="relative px-7 pt-8 pb-7 text-white text-center overflow-hidden"
                style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%)" }}
              >
                <div className="absolute inset-0 opacity-30 pointer-events-none"
                  style={{ background: "radial-gradient(circle at 20% 10%, rgba(255,255,255,0.4) 0%, transparent 50%)" }} />
                <div className="relative flex flex-col items-center">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm mb-3">
                    <Package size={22} />
                  </div>
                  <p className="text-[11px] uppercase tracking-[0.2em] font-bold opacity-85">Nueva versión disponible</p>
                  <p data-testid="github-update-version" className="mt-2 text-[38px] leading-none font-black tracking-tight">
                    v{version || "—"}
                  </p>
                  {localVersion && (
                    <p className="mt-2 text-xs opacity-80">
                      Tienes instalada <span className="font-mono">v{localVersion}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Toggle colapsable "Ver qué trae de nuevo" */}
              <div className="px-5 pt-4">
                <button
                  type="button"
                  data-testid="github-update-toggle-details"
                  onClick={() => setExpanded((v) => !v)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-semibold text-slate-700"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles size={14} className="text-indigo-500" />
                    Ver qué trae de nuevo
                    <span className="ml-1 px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                      {commitsAhead}
                    </span>
                  </span>
                  <motion.span
                    animate={{ rotate: expanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-slate-400"
                  >
                    <ChevronDown size={16} />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      key="details"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 max-h-[220px] overflow-y-auto pr-1">
                        <ul className="space-y-2" data-testid="github-update-commits">
                          {commits.length === 0 && (
                            <li className="text-sm text-slate-500 italic px-2 py-2">Sin detalle de cambios disponible.</li>
                          )}
                          {commits.map((c) => (
                            <li key={c.full_sha || c.sha} className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                                style={{ background: "linear-gradient(135deg, #ede9fe 0%, #fce7f3 100%)", color: "#6d28d9" }}>
                                <GitCommit size={13} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800 leading-snug" title={c.message}>{c.message || "(sin mensaje)"}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  <span className="font-mono">{c.sha}</span> · {c.author || "desconocido"} · {relativeTime(c.date)}
                                </p>
                              </div>
                              {c.url && (
                                <a href={c.url} target="_blank" rel="noreferrer"
                                  className="text-slate-400 hover:text-indigo-600 transition-colors mt-1" title="Ver en GitHub">
                                  <ExternalLink size={12} />
                                </a>
                              )}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 px-2">
                          <span className="inline-flex items-center gap-1">
                            <GitBranch size={11} /> {data.branch || "main"}
                          </span>
                          {data.repo_url && (
                            <a href={data.repo_url} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1 hover:text-indigo-600 transition-colors">
                              ver en GitHub <ExternalLink size={10} />
                            </a>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer actions */}
              <div className="px-5 py-4 mt-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2.5">
                {applied ? (
                  <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold mx-auto py-1">
                    <CheckCircle2 size={16} /> Recargando aplicación…
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      data-testid="github-update-modal-later"
                      onClick={collapseToPill}
                      className="px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      Luego
                    </button>
                    <Link
                      to="/actualizaciones"
                      data-testid="github-update-modal-open-page"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2.5 rounded-2xl text-sm font-semibold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 transition-colors text-center"
                    >
                      Detalles
                    </Link>
                    <button
                      type="button"
                      data-testid="github-update-modal-apply"
                      onClick={handleApply}
                      disabled={applying}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold text-white transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{ background: "linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%)", boxShadow: "0 10px 24px -6px rgba(79,70,229,0.5)" }}
                    >
                      {applying ? (
                        <><Loader2 size={15} className="animate-spin" /> Aplicando…</>
                      ) : (
                        <><RefreshCw size={15} /> Actualizar</>
                      )}
                    </button>
                  </>
                )}
              </div>

              <div className="px-5 py-2.5 bg-amber-50 border-t border-amber-100 flex items-start gap-2 text-[11px] text-amber-700">
                <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                <span>Al actualizar, el servidor se reinicia y la app se recarga automáticamente.</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
