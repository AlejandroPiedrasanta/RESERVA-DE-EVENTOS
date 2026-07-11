import { useEffect, useState, useCallback } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, RefreshCw, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { getUpdateLastResult } from "@/lib/api";

/**
 * Muestra un diálogo al arrancar la app si la última actualización dejó un
 * flag `_cp_update_failed.flag` en el directorio del ejecutable.
 *
 * El backend expone `/api/updates/last-result` que lee el flag + últimas 25
 * líneas del log. Al cerrar el diálogo con "Entendido", se llama al mismo
 * endpoint con `?clear=true` para borrar el flag (no volverá a aparecer).
 *
 * "Reintentar" dispara el evento `cp:check-github-updates` que ya escucha
 * `GithubUpdateNotifier` para hacer una comprobación no silenciosa.
 */

// Mapa de motivos técnicos → mensaje amigable en español.
const REASON_MESSAGES = {
  launch_timeout:
    "La nueva versión se instaló pero no logró arrancar tras la actualización. Se restauró la versión anterior de forma automática — tus datos están intactos.",
  start_failed:
    "El sistema no pudo lanzar el nuevo ejecutable. Se restauró la versión anterior automáticamente.",
  swap:
    "No se pudo reemplazar el ejecutable (probablemente un antivirus lo bloqueó). Se restauró la versión anterior.",
  timeout:
    "La aplicación tardó demasiado en cerrarse durante la actualización. La versión anterior sigue activa.",
  relanzamiento:
    "La actualización se aplicó pero la app no arrancó sola. Ya está corriendo la nueva versión.",
};

function humanizeReason(rawReason) {
  if (!rawReason) return "La actualización no se completó.";
  const lower = rawReason.toLowerCase().trim();
  for (const [key, msg] of Object.entries(REASON_MESSAGES)) {
    if (lower.startsWith(key) || lower.includes(key)) return msg;
  }
  // Fallback: devolver texto original limpio (primer trozo hasta un ":" si lo hay)
  const colonIdx = rawReason.indexOf(":");
  return colonIdx >= 0 ? rawReason.slice(colonIdx + 1).trim() : rawReason.trim();
}

export default function UpdateFailureDialog() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [showLog, setShowLog] = useState(false);

  // Chequeo único al arrancar la app.
  useEffect(() => {
    let cancelled = false;
    // Pequeño delay para no competir con el arranque inicial (auth, settings, etc).
    const t = setTimeout(async () => {
      try {
        const res = await getUpdateLastResult(false);
        if (!cancelled && res?.failed) {
          setData(res);
          setOpen(true);
        }
      } catch {
        // Endpoint no disponible (versión web / sin frozen) → ignorar silenciosamente.
      }
    }, 2000);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  const closeAndClear = useCallback(async () => {
    setOpen(false);
    try {
      // Segundo GET con clear=true para borrar el flag file en disco.
      await getUpdateLastResult(true);
    } catch {
      /* no-op */
    }
  }, []);

  const retryNow = useCallback(async () => {
    await closeAndClear();
    // Dispara el mismo evento que la píldora "Comprobar actualizaciones" para
    // que GithubUpdateNotifier abra su modal con la última versión disponible.
    window.dispatchEvent(new CustomEvent("cp:check-github-updates"));
  }, [closeAndClear]);

  if (!data) return null;

  const friendlyReason = humanizeReason(data.reason);
  const currentVersion = data.current_version || "desconocida";

  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) closeAndClear(); }}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-left">
                La última actualización no se completó
              </AlertDialogTitle>
              <AlertDialogDescription className="text-left mt-2">
                {friendlyReason}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="mt-2 space-y-3">
          <div className="text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
            <span className="font-medium">Versión actual:</span> {currentVersion}
          </div>

          {data.log_tail && (
            <div>
              <button
                type="button"
                onClick={() => setShowLog((v) => !v)}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                {showLog ? "Ocultar detalles técnicos" : "Ver detalles técnicos"}
                {showLog ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {showLog && (
                <ScrollArea className="mt-2 h-40 rounded-md border bg-muted/20 p-2">
                  <pre className="text-[10px] leading-tight font-mono whitespace-pre-wrap text-muted-foreground">
                    {data.log_tail}
                  </pre>
                </ScrollArea>
              )}
            </div>
          )}
        </div>

        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel onClick={closeAndClear} className="mt-0">
            Entendido
          </AlertDialogCancel>
          <Button onClick={retryNow} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Reintentar actualización
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
