import React, { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert, RefreshCw, CheckCircle2, Trash2, ExternalLink, Github, Loader2, Inbox,
} from "lucide-react";
import { Section } from "@/components/appearance/SectionShell";
import { useToast } from "@/hooks/use-toast";
import {
  listErrors, resolveError, deleteError, clearResolvedErrors,
  getErrorSettings, updateErrorSettings,
} from "@/lib/api";

function timeAgo(iso) {
  if (!iso) return "";
  try {
    const diff = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (diff < 60) return `hace ${diff}s`;
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
    return `hace ${Math.floor(diff / 86400)} d`;
  } catch { return ""; }
}

export default function IncidentsPanel() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [autoReport, setAutoReport] = useState(true);
  const [includeResolved, setIncludeResolved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, cfg] = await Promise.all([listErrors(includeResolved), getErrorSettings()]);
      setItems(res.items || []);
      setOpenCount(res.open_count || 0);
      setAutoReport(!!cfg.auto_report_github);
    } catch {
      /* silencioso: si el panel no carga, no debe romper Ajustes */
    } finally {
      setLoading(false);
    }
  }, [includeResolved]);

  useEffect(() => { load(); }, [load]);

  const toggleAuto = async () => {
    const next = !autoReport;
    setAutoReport(next);
    try {
      await updateErrorSettings({ auto_report_github: next });
      toast({ title: next ? "Reporte automático activado" : "Reporte automático desactivado",
        description: next ? "Los errores se abrirán como incidencias en tu repo de GitHub." : "Los errores se guardarán localmente, sin subirse a GitHub." });
    } catch {
      setAutoReport(!next);
      toast({ title: "No se pudo actualizar", variant: "destructive" });
    }
  };

  const doResolve = async (id) => {
    try { await resolveError(id); await load(); } catch { toast({ title: "No se pudo resolver", variant: "destructive" }); }
  };
  const doDelete = async (id) => {
    try { await deleteError(id); await load(); } catch { toast({ title: "No se pudo eliminar", variant: "destructive" }); }
  };
  const doClearResolved = async () => {
    try { const r = await clearResolvedErrors(); await load(); toast({ title: `${r.deleted || 0} incidencias resueltas eliminadas` }); }
    catch { toast({ title: "No se pudo limpiar", variant: "destructive" }); }
  };

  return (
    <Section icon={ShieldAlert} title="Incidencias y errores"
      desc="Aquí verás cualquier error de la app o de las actualizaciones. Nada falla en silencio.">
      <div data-testid="incidents-panel" className="space-y-4">

        {/* Controles */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-slate-700" data-testid="incidents-open-count">
            {openCount} incidencia{openCount === 1 ? "" : "s"} abierta{openCount === 1 ? "" : "s"}
          </span>
          <button onClick={load} data-testid="incidents-refresh-btn"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass border-white/60 text-slate-700 text-xs font-bold hover:bg-white/50 transition-all">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Actualizar
          </button>
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer ml-auto">
            <input type="checkbox" checked={includeResolved} onChange={(e) => setIncludeResolved(e.target.checked)}
              data-testid="incidents-include-resolved" />
            Ver resueltas
          </label>
        </div>

        {/* Toggle auto-report */}
        <div className="flex items-center justify-between p-3 rounded-2xl glass border-white/60">
          <div className="flex items-center gap-2">
            <Github size={16} className="text-slate-600" />
            <div>
              <p className="text-sm font-bold text-slate-700">Reportar errores a GitHub automáticamente</p>
              <p className="text-xs text-slate-500">Crea una incidencia en tu repo para poder repararlo.</p>
            </div>
          </div>
          <button onClick={toggleAuto} data-testid="incidents-toggle-autoreport"
            className={`relative w-12 h-6 rounded-full transition-all ${autoReport ? "bg-emerald-500" : "bg-slate-300"}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${autoReport ? "left-6" : "left-0.5"}`} />
          </button>
        </div>

        {/* Lista */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400" data-testid="incidents-empty">
            <Inbox size={32} className="mb-2 opacity-60" />
            <p className="text-sm">Sin incidencias. Todo funciona correctamente.</p>
          </div>
        ) : (
          <div className="space-y-2" data-testid="incidents-list">
            {items.map((it) => (
              <motion.div key={it.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                data-testid={`incident-item-${it.id}`}
                className={`p-3 rounded-2xl border ${it.resolved ? "bg-slate-50 border-slate-200 opacity-70" : "bg-red-50/60 border-red-200"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">{it.source}</span>
                      {it.count > 1 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-800">×{it.count}</span>}
                      <span className="text-[11px] text-slate-400">{timeAgo(it.last_seen)}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 mt-1 break-words">{it.message}</p>
                    {it.github_issue_url && (
                      <a href={it.github_issue_url} target="_blank" rel="noreferrer"
                        data-testid={`incident-issue-${it.id}`}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 mt-1 hover:underline">
                        Ver en GitHub <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!it.resolved && (
                      <button onClick={() => doResolve(it.id)} data-testid={`incident-resolve-${it.id}`}
                        title="Marcar como resuelta"
                        className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-600 transition-all">
                        <CheckCircle2 size={16} />
                      </button>
                    )}
                    <button onClick={() => doDelete(it.id)} data-testid={`incident-delete-${it.id}`}
                      title="Eliminar" className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {includeResolved && items.some((i) => i.resolved) && (
          <button onClick={doClearResolved} data-testid="incidents-clear-resolved"
            className="text-xs text-slate-500 hover:text-red-500 transition-all">
            Eliminar todas las resueltas
          </button>
        )}
      </div>
    </Section>
  );
}
