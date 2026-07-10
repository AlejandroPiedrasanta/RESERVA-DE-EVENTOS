import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { getUpdateLastResult } from "@/lib/api";

// Escucha los eventos de error reportados y avisa al usuario con un toast,
// para que SIEMPRE sepa que algo falló (y que ya quedó registrado), en vez de
// un fallo silencioso. También revisa, al arrancar, si la última
// auto-actualización falló (flag dejado por el helper de swap del .exe).
export default function IncidentsNotifier() {
  const { toast } = useToast();

  useEffect(() => {
    const handler = (e) => {
      const d = e?.detail || {};
      toast({
        title: "Se detectó un error",
        description: d.github_issue_url
          ? "Se registró y se reportó automáticamente a GitHub para repararlo."
          : "Se registró la incidencia. Revísala en Ajustes › Incidencias.",
        variant: "destructive",
      });
    };
    window.addEventListener("cp:error-reported", handler);
    return () => window.removeEventListener("cp:error-reported", handler);
  }, [toast]);

  // Revisar el resultado del último intento de actualización (solo aplica al .exe).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getUpdateLastResult(true);
        if (!cancelled && res?.failed) {
          toast({
            title: "La actualización no se completó",
            description: res.reason || "No se pudo aplicar la nueva versión. Tus datos están intactos.",
            variant: "destructive",
            duration: 12000,
          });
        }
      } catch { /* endpoint ausente o preview: ignorar */ }
    })();
    return () => { cancelled = true; };
  }, [toast]);

  return null;
}
