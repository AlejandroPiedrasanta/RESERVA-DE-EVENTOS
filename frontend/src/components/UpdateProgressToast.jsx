import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Download, Package, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { getUpdateProgress } from "@/lib/api";

/**
 * Barra de progreso persistente (flotante) para el auto-update.
 *
 * A diferencia del modal de `GithubUpdateNotifier` (que solo muestra el
 * progreso mientras el usuario tiene el modal abierto), este componente
 * hace polling permanente en background y muestra un TOAST discreto en la
 * esquina inferior derecha en cuanto detecta una actualización activa
 * (`stage: 'downloading' | 'installing'`).
 *
 * Ventajas:
 *   · El usuario puede seguir navegando en la app durante la descarga.
 *   · Si cerró el modal de update por error, sigue viendo el progreso.
 *   · Muestra el estado final (done / error) durante 5s antes de esconderse.
 */

const POLL_INTERVAL_MS = 1000;
const FINAL_STATE_LINGER_MS = 5000;

const STAGE_META = {
  downloading: { label: "Descargando actualización...", Icon: Download, color: "text-blue-500" },
  installing: { label: "Instalando nueva versión...", Icon: Package, color: "text-indigo-500" },
  done: { label: "Actualización completa", Icon: CheckCircle2, color: "text-emerald-500" },
  error: { label: "Error en la actualización", Icon: AlertTriangle, color: "text-rose-500" },
};

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let idx = 0;
  let v = bytes;
  while (v >= 1024 && idx < units.length - 1) { v /= 1024; idx += 1; }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[idx]}`;
}

export default function UpdateProgressToast() {
  const [progress, setProgress] = useState(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const lingerTimerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const p = await getUpdateProgress();
        if (cancelled) return;
        setProgress(p);

        // Mostrar mientras haya actividad o durante 5s tras el estado final.
        if (p?.active || p?.stage === "downloading" || p?.stage === "installing") {
          setVisible(true);
          setDismissed(false);
          if (lingerTimerRef.current) {
            clearTimeout(lingerTimerRef.current);
            lingerTimerRef.current = null;
          }
        } else if (p?.stage === "done" || p?.stage === "error") {
          // Estado final: mantener visible unos segundos y luego esconder.
          if (!lingerTimerRef.current && !dismissed) {
            setVisible(true);
            lingerTimerRef.current = setTimeout(() => {
              if (!cancelled) setVisible(false);
              lingerTimerRef.current = null;
            }, FINAL_STATE_LINGER_MS);
          }
        }
      } catch {
        // Sin backend / sin frozen → silencioso.
      }
    };
    tick();
    const iv = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(iv);
      if (lingerTimerRef.current) clearTimeout(lingerTimerRef.current);
    };
  }, [dismissed]);

  const dismiss = useCallback(() => {
    setVisible(false);
    setDismissed(true);
  }, []);

  if (!visible || !progress || dismissed) return null;

  const stage = progress.stage || "downloading";
  const meta = STAGE_META[stage] || STAGE_META.downloading;
  const { Icon, label, color } = meta;
  const percent = Math.max(0, Math.min(100, progress.percent || 0));
  const isFinal = stage === "done" || stage === "error";
  const isAnimated = !isFinal;

  const sizeInfo =
    progress.downloaded && progress.total
      ? `${formatBytes(progress.downloaded)} / ${formatBytes(progress.total)}`
      : "";

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="update-progress-toast"
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="fixed bottom-6 right-6 z-[9999] w-[340px] rounded-xl border bg-background/95 backdrop-blur shadow-lg"
        data-testid="update-progress-toast"
      >
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 mt-0.5 ${color}`}>
              {isAnimated ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Icon className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium truncate">{label}</p>
                <button
                  type="button"
                  onClick={dismiss}
                  className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {progress.name && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {progress.name}
                </p>
              )}
            </div>
          </div>

          {stage !== "error" && (
            <div className="mt-3">
              <Progress value={percent} className="h-1.5" />
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
                <span>{percent}%</span>
                {sizeInfo && <span>{sizeInfo}</span>}
              </div>
            </div>
          )}

          {stage === "error" && progress.error && (
            <p className="mt-2 text-xs text-rose-600 dark:text-rose-400 break-words">
              {progress.error}
            </p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
