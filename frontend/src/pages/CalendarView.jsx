import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getCalendarEvents } from "@/lib/api";
import {
  ChevronLeft, ChevronRight, Plus, Search, BarChart2, CalendarDays, CalendarCheck,
  LayoutGrid, List, Clock, MapPin, Wallet, Sparkles, CalendarClock, ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "@/context/SettingsContext";
import ReservationForm from "@/components/ReservationForm";
import Reservations from "@/pages/Reservations";
import { getEventConfig } from "@/lib/eventConfig";

const EVENT_HEX = {
  "Boda":              { fg: "#be185d", bg: "#fdf2f8", border: "#fbcfe8" },
  "Quinceañera":       { fg: "#7e22ce", bg: "#faf5ff", border: "#e9d5ff" },
  "Fiesta Social":     { fg: "#c2410c", bg: "#fff7ed", border: "#fed7aa" },
  "Evento Corporativo":{ fg: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
  "Conferencia":       { fg: "#0f766e", bg: "#f0fdfa", border: "#99f6e4" },
  "Otro":              { fg: "#475569", bg: "#f8fafc", border: "#e2e8f0" },
};

const YEAR_RANGE = 10;
function getColor(type) { return EVENT_HEX[type] || EVENT_HEX["Otro"]; }

/* ── Monthly type distribution ── */
function MonthDistribution({ events, year, month, language }) {
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthEvents = events.filter(e => e.event_date?.startsWith(monthStr));
  const counts = monthEvents.reduce((a, e) => { a[e.event_type || "Otro"] = (a[e.event_type || "Otro"] || 0) + 1; return a; }, {});
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!entries.length) {
    return <div className="flex items-center justify-center py-8 text-slate-400 text-xs font-medium">{language === "es" ? "Sin eventos este mes" : "No events this month"}</div>;
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {entries.map(([type, count], i) => {
        const cfg = getEventConfig(type); const Icon = cfg.icon;
        return (
          <motion.div key={type} initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }} className="flex items-center gap-2.5 p-3 rounded-2xl"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.fg + "1c" }}>
              <Icon size={14} style={{ color: cfg.fg }} strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold truncate leading-tight" style={{ color: cfg.fg }}>{type}</p>
              <p className="text-[13px] font-black leading-tight" style={{ color: cfg.fg }}>{count}
                <span className="text-[10px] font-medium ml-1" style={{ opacity: 0.6 }}>{language === "es" ? (count === 1 ? "evento" : "eventos") : (count === 1 ? "event" : "events")}</span>
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ── Yearly activity bars ── */
function YearActivity({ events, year, currentMonth, language, onMonthClick }) {
  const MONTH_ABBR_ES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const MONTH_ABBR_EN = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const abbr = language === "es" ? MONTH_ABBR_ES : MONTH_ABBR_EN;
  const counts = Array(12).fill(0);
  events.forEach(e => { if (e.event_date?.startsWith(`${year}-`)) { const m = parseInt(e.event_date.split("-")[1]) - 1; if (m >= 0 && m < 12) counts[m]++; } });
  const max = Math.max(...counts, 1);
  return (
    <div className="flex items-end gap-1 h-20 pt-2">
      {counts.map((count, i) => {
        const isActive = i === currentMonth;
        const pct = Math.max(count / max, count > 0 ? 0.08 : 0);
        return (
          <motion.div key={i} className="flex-1 flex flex-col items-center gap-1 cursor-pointer group" onClick={() => onMonthClick(i)}
            title={`${abbr[i]}: ${count}`} whileHover={{ scaleY: 1.05 }} style={{ originY: 1 }}>
            <motion.div initial={{ height: 0 }} animate={{ height: `${pct * 52}px` }} transition={{ duration: 0.6, delay: i * 0.04, ease: "easeOut" }}
              style={{ background: isActive ? "linear-gradient(180deg, var(--t-from), var(--t-to))" : count > 0 ? "linear-gradient(180deg,#94a3b8,#cbd5e1)" : "#e2e8f0",
                boxShadow: isActive ? "0 2px 8px rgba(99,102,241,0.35)" : "none", minHeight: count > 0 ? "4px" : "2px" }} className="w-full rounded-t-full" />
            <span className={`text-[9px] font-bold transition-colors ${isActive ? "gradient-text" : count > 0 ? "text-slate-500" : "text-slate-300"}`}>{abbr[i]}</span>
            {count > 0 && <span className={`text-[8px] font-black ${isActive ? "text-indigo-500" : "text-slate-400"}`}>{count}</span>}
          </motion.div>
        );
      })}
    </div>
  );
}

/* ── Animated summary chip ── */
function SummaryChip({ icon: Icon, label, value, sub, delay, grad }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 220, damping: 20 }} whileHover={{ y: -4 }}
      className="glass rounded-3xl p-4 flex items-center gap-3.5 relative overflow-hidden group">
      <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md" style={{ background: grad }}>
        <Icon size={18} className="text-white" strokeWidth={2} />
      </motion.div>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className="text-xl font-black text-slate-900 leading-none tracking-tight" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>{value}</p>
        {sub && <p className="text-[11px] text-slate-400 font-semibold mt-1 truncate">{sub}</p>}
      </div>
    </motion.div>
  );
}

export default function CalendarView() {
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [direction, setDirection] = useState(1);
  const [showSearch, setShowSearch] = useState(false);
  const [viewMode, setViewMode] = useState("month"); // month | agenda
  const [hover, setHover] = useState(null); // { ev, x, y }
  const navigate = useNavigate();
  const { tr, language, formatCurrency } = useSettings();
  const es = language === "es";

  useEffect(() => { getCalendarEvents().then(setEvents).catch(console.error); }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const getEventsForDay = useCallback((day) => {
    if (!day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter(e => e.event_date === dateStr);
  }, [events, year, month]);

  const today = new Date();
  const isToday = (day) => day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const isPast = (day) => { const d = new Date(year, month, day); d.setHours(0,0,0,0); const t = new Date(); t.setHours(0,0,0,0); return d < t; };

  const goTo = (y, m, dir) => { setDirection(dir); setCurrentDate(new Date(y, m, 1)); };
  const prev = () => month === 0 ? goTo(year - 1, 11, -1) : goTo(year, month - 1, -1);
  const next = () => month === 11 ? goTo(year + 1, 0, 1) : goTo(year, month + 1, 1);
  const reload = () => getCalendarEvents().then(setEvents).catch(console.error);
  const yearList = Array.from({ length: YEAR_RANGE * 2 + 1 }, (_, i) => today.getFullYear() - YEAR_RANGE + i);

  /* ── Derived metrics ── */
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthEvents = useMemo(() => events.filter(e => e.event_date?.startsWith(monthStr)), [events, monthStr]);
  const monthRevenue = monthEvents.reduce((s, e) => s + (e.total_amount || 0), 0);

  const nextEvent = useMemo(() => {
    const t = new Date(); t.setHours(0,0,0,0);
    return [...events].filter(e => e.event_date && new Date(e.event_date + "T00:00:00") >= t)
      .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))[0] || null;
  }, [events]);
  const daysToNext = nextEvent ? Math.round((new Date(nextEvent.event_date + "T00:00:00") - new Date(new Date().setHours(0,0,0,0))) / 86400000) : null;

  const fmtDate = (d) => { if (!d) return "-"; const [y,m,dd] = d.split("-"); return `${dd}/${m}/${y}`; };
  const nextLabel = daysToNext === 0 ? (es ? "¡Hoy!" : "Today!") : daysToNext === 1 ? (es ? "Mañana" : "Tomorrow") : daysToNext != null ? `${es ? "En" : "In"} ${daysToNext} ${es ? "días" : "days"}` : (es ? "Sin eventos" : "No events");

  const onChipEnter = (ev, e) => setHover({ ev, x: e.clientX, y: e.clientY });
  const onChipMove = (e) => setHover(h => h ? { ...h, x: e.clientX, y: e.clientY } : h);
  const onChipLeave = () => setHover(null);

  const gridVariants = { hidden: {}, show: { transition: { staggerChildren: 0.012 } } };
  const cellVariant = { hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1, transition: { duration: 0.25 } } };

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <motion.div animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="w-12 h-12 rounded-2xl btn-primary flex items-center justify-center shadow-lg flex-shrink-0">
              {viewMode === "list"
                ? <CalendarCheck size={22} className="text-white" strokeWidth={2} />
                : <CalendarDays size={22} className="text-white" strokeWidth={2} />}
            </motion.div>
            <h1 className="text-5xl font-black gradient-text tracking-tight" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>{viewMode === "list" ? tr.nav.reservations : tr.nav.calendar}</h1>
          </div>
          <p className="text-sm text-slate-500 font-medium mt-1.5">{viewMode === "list"
            ? (es ? "Busca por nombre o teléfono y encuéntralo al instante" : "Search by name or phone and find it instantly")
            : (es ? "Reservas y calendario en un solo lugar" : "Reservations & calendar in one place")}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center gap-1 glass rounded-full p-1" data-testid="calendar-view-toggle">
            {[{ id: "month", icon: LayoutGrid, label: es ? "Mes" : "Month" }, { id: "list", icon: List, label: es ? "Lista" : "List" }].map(v => (
              <motion.button key={v.id} whileTap={{ scale: 0.94 }} onClick={() => setViewMode(v.id)} data-testid={`view-${v.id}-btn`}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all ${viewMode === v.id ? "btn-primary text-white shadow" : "text-slate-500 hover:text-slate-700"}`}>
                <v.icon size={13} /> {v.label}
              </motion.button>
            ))}
          </div>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setViewMode(v => v === "list" ? "month" : "list")} data-testid="calendar-search-toggle"
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-xs font-bold transition-all ${viewMode === "list" ? "btn-primary text-white shadow" : "glass text-slate-600 hover:bg-white/50"}`}>
            <Search size={14} /> {es ? "Buscar" : "Search"}
          </motion.button>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setShowForm(true)} data-testid="new-event-btn"
            className="flex items-center gap-2 px-5 py-2.5 rounded-full btn-primary text-white text-sm font-bold">
            <Plus size={16} /> {tr.common.newReservation}
          </motion.button>
        </div>
      </motion.div>

      {/* Summary chips */}
      {viewMode !== "list" && (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <SummaryChip icon={CalendarClock} label={es ? "Eventos del mes" : "Events this month"} value={monthEvents.length}
          sub={tr.months[month] + " " + year} delay={0.05} grad="linear-gradient(135deg,#6366f1,#8b5cf6)" />
        <SummaryChip icon={Wallet} label={es ? "Ingresos del mes" : "Month revenue"} value={formatCurrency(monthRevenue)}
          sub={es ? `${monthEvents.length} evento(s)` : `${monthEvents.length} event(s)`} delay={0.12} grad="linear-gradient(135deg,#10b981,#06b6d4)" />
        <SummaryChip icon={Sparkles} label={es ? "Próximo evento" : "Next event"} value={nextLabel}
          sub={nextEvent ? `${nextEvent.event_type || "Evento"} · ${fmtDate(nextEvent.event_date)}` : "—"} delay={0.19} grad="linear-gradient(135deg,#f59e0b,#f97316)" />
      </div>
      )}

      {/* Search bar */}
      <AnimatePresence>
        {showSearch && viewMode === "month" && (
          <motion.div initial={{ opacity: 0, height: 0, marginBottom: 0 }} animate={{ opacity: 1, height: "auto", marginBottom: 16 }} exit={{ opacity: 0, height: 0, marginBottom: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
            <div className="glass rounded-2xl px-5 py-4 flex items-center gap-4 flex-wrap">
              <Search size={15} className="text-slate-400 shrink-0" />
              <div className="flex items-center gap-3 flex-wrap flex-1">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{es ? "Mes" : "Month"}</label>
                  <select value={month} onChange={e => goTo(year, parseInt(e.target.value), 0)} data-testid="calendar-month-select"
                    className="bg-white/70 border border-white/80 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer">
                    {tr.months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{es ? "Año" : "Year"}</label>
                  <select value={year} onChange={e => goTo(parseInt(e.target.value), month, 0)} data-testid="calendar-year-select"
                    className="bg-white/70 border border-white/80 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer">
                    {yearList.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => goTo(today.getFullYear(), today.getMonth(), 0)} data-testid="calendar-today-btn"
                  className="self-end px-4 py-2 rounded-xl btn-primary text-white text-xs font-bold">{es ? "Hoy" : "Today"}</motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ MONTH VIEW ══ */}
      {viewMode === "month" && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} className="glass rounded-3xl overflow-hidden">
          {/* Nav header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/30">
            <motion.button whileHover={{ scale: 1.1, x: -2 }} whileTap={{ scale: 0.9 }} onClick={prev} className="p-2.5 rounded-2xl glass hover:bg-white/50 text-slate-600 transition-colors" data-testid="prev-month-btn">
              <ChevronLeft size={16} />
            </motion.button>
            <AnimatePresence mode="wait">
              <motion.h2 key={`${month}-${year}`} initial={{ opacity: 0, y: direction * 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: direction * -8 }} transition={{ duration: 0.22 }}
                className="text-xl font-black text-slate-900 cursor-pointer select-none hover:opacity-70 transition-opacity" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
                onClick={() => setShowSearch(s => !s)} data-testid="calendar-month-title">{tr.months[month]} {year}</motion.h2>
            </AnimatePresence>
            <motion.button whileHover={{ scale: 1.1, x: 2 }} whileTap={{ scale: 0.9 }} onClick={next} className="p-2.5 rounded-2xl glass hover:bg-white/50 text-slate-600 transition-colors" data-testid="next-month-btn">
              <ChevronRight size={16} />
            </motion.button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 bg-white/10 border-b border-white/20">
            {tr.days.map(d => <div key={d} className="py-2.5 text-center text-[11px] font-black text-slate-500 uppercase tracking-widest">{d}</div>)}
          </div>

          {/* Day cells with directional slide */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div key={`grid-${month}-${year}`} custom={direction} variants={gridVariants} initial="hidden" animate="show"
              exit={{ opacity: 0, x: direction * -24, transition: { duration: 0.18 } }} className="grid grid-cols-7" data-testid="calendar-grid">
              {cells.map((day, i) => {
                const dayEvents = getEventsForDay(day);
                const visible = dayEvents.slice(0, 3);
                const extra = dayEvents.length - visible.length;
                const past = day ? isPast(day) : false;
                const todayCell = day && isToday(day);
                return (
                  <motion.div key={i} variants={cellVariant}
                    className={`relative min-h-[112px] p-2 border-r border-b border-white/20 last:border-r-0 transition-colors group/cell ${!day ? "bg-slate-50/20" : past ? "bg-slate-50/30" : "hover:bg-white/40"} ${day ? "cursor-pointer" : ""}`}
                    onClick={() => { if (day && dayEvents.length === 0) setShowForm(true); }}
                    data-testid={day ? `calendar-day-${day}` : undefined}>
                    {todayCell && (
                      <motion.div layoutId="today-ring" className="absolute inset-1 rounded-2xl pointer-events-none"
                        style={{ boxShadow: "inset 0 0 0 2px var(--t-from)" }} />
                    )}
                    {day && (
                      <>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`inline-flex items-center justify-center w-7 h-7 text-sm rounded-full font-bold transition-all ${todayCell ? "theme-today" : past ? "text-slate-300" : "text-slate-700 group-hover/cell:bg-white/70"}`}>{day}</span>
                          {day && dayEvents.length === 0 && !past && (
                            <motion.span initial={{ opacity: 0 }} whileHover={{ scale: 1.2 }} className="opacity-0 group-hover/cell:opacity-100 transition-opacity">
                              <Plus size={13} className="text-slate-400" />
                            </motion.span>
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <AnimatePresence>
                            {visible.map(ev => {
                              const c = getColor(ev.event_type);
                              const cfg = getEventConfig(ev.event_type);
                              const EvIcon = cfg.icon;
                              return (
                                <motion.div key={ev.id} layout initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                                  whileHover={{ scale: 1.04, x: 2, boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}
                                  onClick={(e) => { e.stopPropagation(); navigate(`/reservaciones/${ev.id}`); }}
                                  onMouseEnter={(e) => onChipEnter(ev, e)} onMouseMove={onChipMove} onMouseLeave={onChipLeave}
                                  style={{ borderLeftColor: c.fg, background: c.bg }}
                                  className="flex items-center gap-1 pl-1.5 pr-1 py-1 rounded-r-lg rounded-l-sm border-l-[3px] cursor-pointer" data-testid={`calendar-event-${ev.id}`}>
                                  <EvIcon size={9} style={{ color: c.fg }} strokeWidth={2.2} className="flex-shrink-0" />
                                  <span className="text-[10px] font-bold truncate leading-tight" style={{ color: c.fg }}>{ev.event_time ? `${ev.event_time} ` : ""}{ev.event_type || ev.client_name}</span>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                          {extra > 0 && <span className="text-[10px] font-bold text-slate-400 pl-1 block">+{extra} {es ? "más" : "more"}</span>}
                        </div>
                      </>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}

      {/* ══ LIST VIEW (unified reservations table) ══ */}
      {viewMode === "list" && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} data-testid="calendar-list-view">
          <Reservations embedded />
        </motion.div>
      )}

      {/* Legend row */}
      {viewMode !== "list" && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex flex-wrap gap-2 mt-4">
        {Object.entries(EVENT_HEX).map(([type, c]) => {
          const cfg = getEventConfig(type); const LIcon = cfg.icon;
          return (
            <motion.span key={type} whileHover={{ scale: 1.05, y: -1 }} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-bold cursor-default"
              style={{ background: c.bg, color: c.fg, border: `1px solid ${c.border}` }}>
              <LIcon size={11} strokeWidth={2} />{type}
            </motion.span>
          );
        })}
      </motion.div>
      )}

      {/* Floating hover preview */}
      <AnimatePresence>
        {hover && (() => {
          const c = getColor(hover.ev.event_type);
          const cfg = getEventConfig(hover.ev.event_type);
          const HIcon = cfg.icon;
          const balance = (hover.ev.total_amount || 0) - (hover.ev.advance_paid || 0);
          const left = Math.min(hover.x + 16, (typeof window !== "undefined" ? window.innerWidth : 1200) - 300);
          const top = Math.min(hover.y + 16, (typeof window !== "undefined" ? window.innerHeight : 800) - 220);
          return (
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.15 }}
              className="fixed z-[9999] w-72 rounded-2xl p-4 pointer-events-none shadow-2xl border"
              style={{ left, top, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)", borderColor: c.border }} data-testid="calendar-hover-preview">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: c.fg + "18" }}>
                  <HIcon size={16} style={{ color: c.fg }} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black leading-tight truncate" style={{ color: c.fg }}>{hover.ev.event_type || "Evento"}</p>
                  <p className="text-[11px] text-slate-500 font-semibold truncate">{hover.ev.client_name}</p>
                </div>
              </div>
              <div className="space-y-1.5 text-[12px] text-slate-600 font-medium">
                <div className="flex items-center gap-2"><CalendarDays size={12} className="text-slate-400" />{fmtDate(hover.ev.event_date)}{hover.ev.event_time ? ` · ${hover.ev.event_time}` : ""}</div>
                {hover.ev.venue && <div className="flex items-center gap-2"><MapPin size={12} className="text-slate-400" /><span className="truncate">{hover.ev.venue}</span></div>}
                {hover.ev.package_type && <div className="flex items-center gap-2"><Sparkles size={12} className="text-slate-400" />{hover.ev.package_type}</div>}
                {hover.ev.total_amount > 0 && (
                  <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-slate-200/70">
                    <span className="flex items-center gap-2"><Wallet size={12} className="text-slate-400" />{formatCurrency(hover.ev.total_amount)}</span>
                    {balance > 0 ? <span className="text-[11px] font-black text-amber-600">{es ? "Saldo" : "Bal"} {formatCurrency(balance)}</span>
                      : <span className="text-[11px] font-black text-emerald-600">{es ? "Pagado" : "Paid"}</span>}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-semibold mt-2.5 flex items-center gap-1">{es ? "Clic para ver detalle" : "Click to view"} <ArrowRight size={10} /></p>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {showForm && <ReservationForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); reload(); }} />}
    </div>
  );
}
