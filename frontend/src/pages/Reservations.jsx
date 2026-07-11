import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getReservations, deleteReservation } from "@/lib/api";
import { Plus, Trash2, Eye, Search, FileDown, ChevronDown, ChevronUp, SlidersHorizontal, CalendarCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings, STATUS_COLOR_CLASSES } from "@/context/SettingsContext";
import ReservationForm from "@/components/ReservationForm";
import { useToast } from "@/hooks/use-toast";
import { generateReservationPDF } from "@/lib/generatePDF";
import { getEventConfig, getEventTypeName } from "@/lib/eventConfig";
import PageHeader from "@/components/PageHeader";

const FALLBACK_COLOR = "bg-slate-100/80 text-slate-700 border-slate-200/60";

export default function Reservations({ embedded = false }) {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPackage, setFilterPackage] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [visibleCount, setVisibleCount] = useState(12);
  const [showExtraFilters, setShowExtraFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tr, formatCurrency, logoUrl, pdfLogoUrl, usePdfLogo, useCustomPdfLogo, pdfTheme, activeStatuses, swapNameEventType } = useSettings();
  const l = tr.list;
  const es = l.colClient !== "Client";

  // Build dynamic status color lookup from activeStatuses
  const statusColors = Object.fromEntries(
    activeStatuses.map(s => [s.key, STATUS_COLOR_CLASSES[s.color] || FALLBACK_COLOR])
  );

  const getEffectivePdfLogo = () => {
    if (!usePdfLogo) return null;
    if (useCustomPdfLogo && pdfLogoUrl) return pdfLogoUrl;
    return logoUrl || undefined;
  };

  const handleDownloadPDF = async (r, e) => {
    e.stopPropagation();
    try {
      await generateReservationPDF(r, formatCurrency, getEffectivePdfLogo(), pdfTheme);
      toast({ title: "PDF generado exitosamente" });
    } catch {
      toast({ title: "Error al generar PDF", variant: "destructive" });
    }
  };

  const EVENT_TYPES = ["Boda","Quinceañera","Fiesta Social","Evento Corporativo","Conferencia","Otro"];

  const load = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await getReservations();
      setReservations([...data].sort((a, b) => new Date(a.event_date) - new Date(b.event_date)));
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { if (!silent) setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("¿Eliminar?")) return;
    try { await deleteReservation(id); toast({ title: "Eliminado" }); load({ silent: true }); }
    catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const formatDate = (d) => { if (!d) return "-"; const [y,m,day] = d.split("-"); return `${day}/${m}/${y}`; };

  const filtered = reservations.filter(r => {
    const q = search.toLowerCase();
    const ms = r.client_name?.toLowerCase().includes(q)
      || r.event_type?.toLowerCase().includes(q)
      || (r.venue||"").toLowerCase().includes(q)
      || (r.client_phone||"").toLowerCase().includes(q);
    const mt = filterType === "all" || r.event_type === filterType;
    const ms2 = filterStatus === "all" || r.status === filterStatus;
    const mp = filterPackage === "all" || (r.package_type || "") === filterPackage;
    const mdf = !filterDateFrom || (r.event_date && r.event_date >= filterDateFrom);
    const mdt = !filterDateTo || (r.event_date && r.event_date <= filterDateTo);
    return ms && mt && ms2 && mp && mdf && mdt;
  });

  const visibleRows = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  const resetFilters = () => {
    setSearch(""); setFilterType("all"); setFilterStatus("all");
    setFilterPackage("all"); setFilterDateFrom(""); setFilterDateTo("");
    setVisibleCount(12);
  };

  return (
    <div className={embedded ? "" : "px-6 py-8 max-w-7xl mx-auto"}>
      {!embedded && (
      <PageHeader
        icon={CalendarCheck}
        title={tr.nav.reservations}
        subtitle={es ? `${filtered.length} en total` : `${filtered.length} total`}
        gradient="linear-gradient(135deg,#0ea5e9,#6366f1,#8b5cf6)"
        right={(
          <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }} onClick={() => setShowForm(true)} data-testid="new-reservation-btn"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full btn-primary text-white text-sm font-bold">
            <Plus size={16} /> {tr.common.newReservation}
          </motion.button>
        )}
      />
      )}

      <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35, delay:0.1 }} className="flex flex-col gap-3 mb-5">
        {/* Buscador GRANDE + Filtros compactos en la misma fila */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch">
          {/* Buscador PROTAGONISTA */}
          <motion.div
            whileHover={{ scale: 1.005 }}
            className="relative flex-1 group"
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-[var(--t-from)]/10 to-[var(--t-to)]/10 opacity-0 group-focus-within:opacity-100 blur-xl transition-opacity duration-500 pointer-events-none"></div>
            <div className="relative flex items-center glass rounded-3xl border-white/60 shadow-sm hover:shadow-md focus-within:shadow-lg focus-within:ring-2 focus-within:ring-[var(--t-from)]/30 transition-all duration-300">
              <motion.div
                animate={search ? { rotate: [0, -10, 10, 0] } : {}}
                transition={{ duration: 0.4 }}
                className="pl-5 pr-2 flex-shrink-0"
              >
                <Search size={20} className="text-[var(--t-from)]" strokeWidth={2.5} />
              </motion.div>
              <input
                value={search}
                onChange={e => { setSearch(e.target.value); setVisibleCount(12); }}
                placeholder={es ? "Buscar por nombre, teléfono, evento, lugar…" : "Search by name, phone, event, venue…"}
                className="w-full py-4 pr-4 text-base font-medium bg-transparent focus:outline-none placeholder-slate-400 text-slate-800"
                data-testid="search-input"
              />
              {search && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => { setSearch(""); setVisibleCount(12); }}
                  className="mr-4 px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-bold transition-colors"
                >
                  {es ? "Limpiar" : "Clear"}
                </motion.button>
              )}
              {filtered.length > 0 && (
                <div className="hidden sm:flex mr-4 items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100/70 text-slate-500 text-xs font-bold flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {filtered.length}
                </div>
              )}
            </div>
          </motion.div>

          {/* Filtros compactos - iconos */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative">
              <select
                value={filterType}
                onChange={e => { setFilterType(e.target.value); setVisibleCount(12); }}
                data-testid="filter-type"
                className={`appearance-none text-sm rounded-2xl pl-4 pr-9 py-3 bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--t-from)]/30 font-bold cursor-pointer transition-all ${filterType !== "all" ? "btn-primary text-white" : "glass text-slate-600"}`}
              >
                <option value="all" className="bg-white text-slate-700">{es ? "Todos tipos" : "All types"}</option>
                {EVENT_TYPES.map(t => <option key={t} value={t} className="bg-white text-slate-700">{getEventTypeName(t)}</option>)}
              </select>
              <ChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${filterType !== "all" ? "text-white" : "text-slate-400"}`} />
            </div>
            <div className="relative">
              <select
                value={filterStatus}
                onChange={e => { setFilterStatus(e.target.value); setVisibleCount(12); }}
                data-testid="filter-status"
                className={`appearance-none text-sm rounded-2xl pl-4 pr-9 py-3 bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--t-from)]/30 font-bold cursor-pointer transition-all ${filterStatus !== "all" ? "btn-primary text-white" : "glass text-slate-600"}`}
              >
                <option value="all" className="bg-white text-slate-700">{es ? "Todos estados" : "All statuses"}</option>
                {activeStatuses.map(s => <option key={s.key} value={s.key} className="bg-white text-slate-700">{s.label}</option>)}
              </select>
              <ChevronDown size={14} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${filterStatus !== "all" ? "text-white" : "text-slate-400"}`} />
            </div>
            <motion.button
              whileHover={{ scale:1.05 }}
              whileTap={{ scale:0.95 }}
              onClick={() => setShowExtraFilters(v => !v)}
              data-testid="toggle-extra-filters"
              title={es ? "Más filtros" : "More filters"}
              className={`p-3 rounded-2xl transition-all relative ${showExtraFilters || filterPackage !== "all" || filterDateFrom || filterDateTo ? "btn-primary text-white shadow-md" : "glass text-slate-600 hover:text-slate-800"}`}
            >
              <SlidersHorizontal size={16} />
              {(filterPackage !== "all" || filterDateFrom || filterDateTo) && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-white"></span>
              )}
            </motion.button>
          </div>
        </div>

        {/* Filtros extra (colapsables) */}
        <AnimatePresence>
          {showExtraFilters && (
            <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }} exit={{ opacity:0, height:0 }} transition={{ duration:0.25 }}
              className="overflow-hidden">
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">{es ? "Paquete" : "Package"}</label>
                  <select value={filterPackage} onChange={e => { setFilterPackage(e.target.value); setVisibleCount(12); }} data-testid="filter-package"
                    className="text-sm glass rounded-2xl px-4 py-2.5 bg-transparent text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--t-from)]/30 font-medium">
                    <option value="all" className="bg-white">{es ? "Todos los paquetes" : "All packages"}</option>
                    {["Básico","Intermedio","Completo"].map(p => <option key={p} value={p} className="bg-white">{p}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">{es ? "Desde" : "From"}</label>
                  <input type="date" value={filterDateFrom} onChange={e => { setFilterDateFrom(e.target.value); setVisibleCount(12); }} data-testid="filter-date-from"
                    className="text-sm glass rounded-2xl px-4 py-2.5 bg-transparent text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--t-from)]/30 font-medium" />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">{es ? "Hasta" : "To"}</label>
                  <input type="date" value={filterDateTo} onChange={e => { setFilterDateTo(e.target.value); setVisibleCount(12); }} data-testid="filter-date-to"
                    className="text-sm glass rounded-2xl px-4 py-2.5 bg-transparent text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--t-from)]/30 font-medium" />
                </div>
                <div className="flex flex-col gap-1 justify-end">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1 opacity-0">x</label>
                  <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }} onClick={resetFilters} data-testid="reset-filters-btn"
                    className="px-4 py-2.5 rounded-2xl glass text-sm font-bold text-slate-600 hover:bg-red-50 hover:text-red-500 transition-colors">
                    {es ? "Limpiar" : "Clear"}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.4, delay:0.15 }} className="rounded-3xl overflow-hidden">
        {loading ? (
          <div className="py-6 space-y-3">
            {[...Array(4)].map((_,i) => <div key={i} className="h-20 glass rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center glass rounded-3xl">
            <div className="w-16 h-16 rounded-3xl glass flex items-center justify-center mx-auto mb-4 animate-float"><Search size={24} className="text-slate-300" /></div>
            <p className="text-slate-500 font-medium">{l.noResults}</p>
          </div>
        ) : (
          <>
          <div className="flex flex-col gap-2.5" data-testid="reservations-table">
            <AnimatePresence>
              {visibleRows.map((r, idx) => {
                const cfg = getEventConfig(r.event_type);
                const EvIcon = cfg.icon;
                const paidPercent = r.total_amount > 0 ? Math.min(100, ((r.advance_paid || 0) / r.total_amount) * 100) : 0;
                const statusClass = statusColors[r.status] || FALLBACK_COLOR;

                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: idx * 0.035, type: "spring", stiffness: 220, damping: 22 }}
                    whileHover={{ scale: 1.008, x: 4 }}
                    className="group relative cursor-pointer"
                    onClick={() => navigate(`/reservaciones/${r.id}`)}
                    data-testid={`reservation-row-${r.id}`}
                  >
                    {/* Glow lateral animado */}
                    <div
                      className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full opacity-70 group-hover:opacity-100 group-hover:w-1.5 transition-all duration-300"
                      style={{ background: `linear-gradient(180deg, ${cfg.fg}, ${cfg.fg}88)` }}
                    ></div>
                    {/* Hover glow background */}
                    <div
                      className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 pointer-events-none -z-10"
                      style={{ background: `linear-gradient(90deg, ${cfg.fg}12, transparent 60%)` }}
                    ></div>

                    <div className="glass rounded-3xl border-white/50 shadow-sm group-hover:shadow-xl group-hover:border-white/80 transition-all duration-300 px-5 py-4 pl-6">
                      <div className="flex items-center gap-4">
                        {/* Avatar/Icono principal */}
                        <motion.div
                          whileHover={{ rotate: [0, -6, 6, 0], scale: 1.08 }}
                          transition={{ duration: 0.4 }}
                          className="relative w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
                          style={{ background: `linear-gradient(135deg, ${cfg.fg}22, ${cfg.fg}10)` }}
                        >
                          {swapNameEventType ? (
                            <EvIcon size={22} style={{ color: cfg.fg }} strokeWidth={2} />
                          ) : (
                            <span className="text-lg font-black" style={{ color: cfg.fg }}>
                              {r.client_name?.charAt(0).toUpperCase()}
                            </span>
                          )}
                          {/* Badge tipo evento (esquina) */}
                          {!swapNameEventType && (
                            <div
                              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-xl flex items-center justify-center shadow-md border-2 border-white"
                              style={{ background: cfg.fg }}
                            >
                              <EvIcon size={11} className="text-white" strokeWidth={2.5} />
                            </div>
                          )}
                        </motion.div>

                        {/* Info principal */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-black text-slate-900 text-base truncate">
                              {swapNameEventType ? getEventTypeName(r.event_type) : r.client_name}
                            </p>
                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-black uppercase tracking-wider ${statusClass}`}>
                              {tr.statuses[r.status] || r.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                            <span className="flex items-center gap-1 font-semibold">
                              <EvIcon size={12} style={{ color: cfg.fg }} strokeWidth={2} />
                              {swapNameEventType ? r.client_name : getEventTypeName(r.event_type)}
                            </span>
                            {r.client_phone && (
                              <>
                                <span className="text-slate-300">·</span>
                                <span className="font-medium">{r.client_phone}</span>
                              </>
                            )}
                            {r.venue && (
                              <>
                                <span className="text-slate-300 hidden sm:inline">·</span>
                                <span className="font-medium hidden sm:inline truncate max-w-[180px]">{r.venue}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Fecha */}
                        <div className="hidden sm:flex flex-col items-end flex-shrink-0 min-w-[90px]">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{es ? "Fecha" : "Date"}</span>
                          <span className="font-black text-slate-800 text-sm mt-0.5">{formatDate(r.event_date)}</span>
                        </div>

                        {/* Monto + Progreso */}
                        <div className="hidden md:flex flex-col items-end flex-shrink-0 min-w-[140px]">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{es ? "Pagado" : "Paid"}</span>
                          <div className="flex items-baseline gap-1.5 mt-0.5">
                            <span className="font-black text-emerald-600 text-sm">{formatCurrency(r.advance_paid)}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">/ {formatCurrency(r.total_amount)}</span>
                          </div>
                          {r.total_amount > 0 && (
                            <div className="w-28 h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${paidPercent}%` }}
                                transition={{ duration: 0.8, delay: 0.2 + idx * 0.02, ease: "easeOut" }}
                                className="h-full rounded-full theme-progress"
                              />
                            </div>
                          )}
                        </div>

                        {/* Acciones */}
                        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                          <motion.button
                            whileHover={{ scale: 1.15, rotate: -5 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => navigate(`/reservaciones/${r.id}`)}
                            className="p-2.5 rounded-2xl bg-white/40 hover:bg-indigo-500/90 text-slate-400 hover:text-white transition-colors shadow-sm hover:shadow-md"
                            data-testid={`view-btn-${r.id}`}
                            title={es ? "Ver detalle" : "View"}
                          >
                            <Eye size={15} />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.15, rotate: 5 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={e => handleDownloadPDF(r, e)}
                            className="p-2.5 rounded-2xl bg-white/40 hover:bg-emerald-500/90 text-slate-400 hover:text-white transition-colors shadow-sm hover:shadow-md"
                            data-testid={`pdf-btn-${r.id}`}
                            title="PDF"
                          >
                            <FileDown size={15} />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.15, rotate: -5 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={e => handleDelete(r.id, e)}
                            className="p-2.5 rounded-2xl bg-white/40 hover:bg-red-500/90 text-slate-400 hover:text-white transition-colors shadow-sm hover:shadow-md"
                            data-testid={`delete-btn-${r.id}`}
                            title={es ? "Eliminar" : "Delete"}
                          >
                            <Trash2 size={15} />
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Botón Mostrar más / Mostrar menos */}
          {(hasMore || visibleCount > 12) && (
            <div className="flex items-center justify-center gap-4 py-6">
              {hasMore && (
                <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
                  onClick={() => setVisibleCount(v => v + 12)} data-testid="show-more-btn"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full glass text-sm font-bold text-slate-600 hover:bg-white/60 transition-all shadow-sm hover:shadow-md">
                  <ChevronDown size={16} />
                  {es ? `Mostrar más (${filtered.length - visibleCount} restantes)` : `Show more (${filtered.length - visibleCount} remaining)`}
                </motion.button>
              )}
              {visibleCount > 12 && (
                <motion.button whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
                  onClick={() => setVisibleCount(12)} data-testid="show-less-btn"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full glass text-sm font-bold text-slate-400 hover:bg-white/60 transition-all">
                  <ChevronUp size={16} />
                  {es ? "Mostrar menos" : "Show less"}
                </motion.button>
              )}
            </div>
          )}
          </>
        )}
      </motion.div>

      {showForm && <ReservationForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load({ silent: true }); }} />}
    </div>
  );
}
