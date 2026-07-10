import { useEffect, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { getCalendarEvents } from "@/lib/api";
import {
  ChevronLeft, ChevronRight, Plus, Search, CalendarDays, CalendarCheck,
  LayoutGrid, List, MapPin, Wallet, Sparkles, CalendarClock, ArrowRight,
  PartyPopper, Bell, Zap, Flame,
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

export default function CalendarView() {
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [direction, setDirection] = useState(1);
  const [showSearch, setShowSearch] = useState(false);
  const [viewMode, setViewMode] = useState("month"); // month | agenda
  const [hover, setHover] = useState(null); // { ev, rect }
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

  // Auto-jump to next event month on first load if none picked yet
  useEffect(() => {
    if (nextEvent && daysToNext !== null && daysToNext <= 1) {
      const [ny, nm] = nextEvent.event_date.split("-").map(Number);
      // Only auto-focus if we're not already in that month
      if (ny !== year || nm - 1 !== month) {
        setCurrentDate(new Date(ny, nm - 1, 1));
      }
    }
  }, [nextEvent?.id, nextEvent?.event_date, daysToNext, year, month]);

  const onChipEnter = (ev, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHover({ ev, rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height } });
  };
  const onChipMove = () => {};
  const onChipLeave = () => setHover(null);

  const gridVariants = { hidden: {}, show: { transition: { staggerChildren: 0.012 } } };
  const cellVariant = { hidden: { opacity: 0, scale: 0.9 }, show: { opacity: 1, scale: 1, transition: { duration: 0.25 } } };

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-5xl font-black gradient-text tracking-tight" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>{viewMode === "list" ? tr.nav.reservations : tr.nav.calendar}</h1>
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

      {/* Notificación GLOBAL sticky si el evento es hoy o mañana */}
      <AnimatePresence>
        {viewMode !== "list" && nextEvent && daysToNext !== null && daysToNext <= 1 && (() => {
          const c = getColor(nextEvent.event_type);
          const cfgG = getEventConfig(nextEvent.event_type);
          const GIcon = cfgG.icon;
          const isToday = daysToNext === 0;
          return (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="mb-4 rounded-2xl overflow-hidden shadow-lg cursor-pointer relative"
              onClick={() => navigate(`/reservaciones/${nextEvent.id}`)}
              data-testid="urgent-event-notification"
              style={{
                background: isToday
                  ? "linear-gradient(90deg,#ef4444,#f97316)"
                  : "linear-gradient(90deg,#f97316,#f59e0b)",
              }}
            >
              <motion.div
                className="absolute inset-0"
                style={{ background: "rgba(255,255,255,0.18)" }}
                animate={{ opacity: [0, 0.6, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
              <div className="relative flex items-center gap-3 px-5 py-3 text-white">
                <motion.div
                  animate={{ rotate: [0, -12, 12, 0], scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                  className="w-10 h-10 rounded-xl bg-white/25 flex items-center justify-center flex-shrink-0 backdrop-blur-sm"
                >
                  <Bell size={18} strokeWidth={2.5} />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/90 leading-none mb-1">
                    {isToday ? (es ? "¡Atención! Evento HOY" : "Heads up! Event TODAY") : (es ? "¡Prepárate! Evento mañana" : "Get ready! Event tomorrow")}
                  </p>
                  <p className="text-sm font-black truncate leading-tight">
                    {es ? "Oye, tienes un evento" : "Hey, you have an event"} · {nextEvent.event_type} · {nextEvent.client_name}
                    {nextEvent.event_time ? ` · ${nextEvent.event_time}` : ""}
                  </p>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/25 backdrop-blur-sm text-[11px] font-black flex-shrink-0">
                  <GIcon size={12} strokeWidth={2.4} />
                  {nextEvent.venue || fmtDate(nextEvent.event_date)}
                </div>
                <ArrowRight size={16} className="flex-shrink-0 opacity-90" />
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Próximo evento — Banner destacado */}
      {viewMode !== "list" && nextEvent && (() => {
        const c = getColor(nextEvent.event_type);
        const cfgN = getEventConfig(nextEvent.event_type);
        const NIcon = cfgN.icon;
        const isToday = daysToNext === 0;
        const isSoon = daysToNext !== null && daysToNext <= 1;
        const isThisWeek = daysToNext !== null && daysToNext <= 7;
        const jumpToNext = () => {
          const [ny, nm] = nextEvent.event_date.split("-").map(Number);
          goTo(ny, nm - 1, 0);
        };
        return (
          <motion.div
            initial={{ opacity: 0, y: -14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 180, damping: 20 }}
            className="relative mb-6 rounded-[28px] overflow-hidden cursor-pointer group"
            onClick={() => navigate(`/reservaciones/${nextEvent.id}`)}
            data-testid="next-event-banner"
          >
            {/* Fondo con gradiente sutil del color del evento */}
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(120deg, ${c.fg}18 0%, ${c.fg}08 45%, rgba(255,255,255,0.6) 100%)`,
              }}
            />
            {/* Ondas animadas */}
            <motion.div
              className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none"
              style={{ background: `radial-gradient(circle, ${c.fg}30, transparent 70%)` }}
              animate={{ scale: [1, 1.15, 1], opacity: [0.55, 0.85, 0.55] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full pointer-events-none"
              style={{ background: `radial-gradient(circle, ${c.fg}22, transparent 70%)` }}
              animate={{ scale: [1.1, 1, 1.1], opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            />

            <div className="relative glass rounded-[28px] border-white/60 shadow-lg group-hover:shadow-2xl transition-shadow duration-500 px-6 py-5 sm:px-8 sm:py-6">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-5 md:gap-8">
                {/* Icono + Estado */}
                <div className="flex items-center gap-4 flex-shrink-0">
                  <motion.div
                    animate={isSoon
                      ? { scale: [1, 1.08, 1], rotate: [0, -6, 6, 0] }
                      : { rotate: [0, -4, 4, 0] }}
                    transition={{ duration: isSoon ? 1.4 : 3.5, repeat: Infinity, ease: "easeInOut" }}
                    className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-3xl flex items-center justify-center shadow-xl flex-shrink-0"
                    style={{ background: `linear-gradient(135deg, ${c.fg}, ${c.fg}dd)` }}
                  >
                    <NIcon size={30} className="text-white" strokeWidth={2} />
                    {isSoon && (
                      <motion.div
                        className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shadow-md ring-2 ring-white"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.9, repeat: Infinity }}
                      >
                        <Bell size={11} className="text-white" strokeWidth={2.6} />
                      </motion.div>
                    )}
                  </motion.div>

                  <div className="min-w-0">
                    <motion.p
                      className="text-[11px] font-black uppercase tracking-[0.18em] mb-1 flex items-center gap-1.5"
                      style={{ color: c.fg }}
                    >
                      <PartyPopper size={12} strokeWidth={2.4} />
                      {es ? "Prepárate para el próximo evento" : "Get ready for your next event"}
                    </motion.p>
                    <h2
                      className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-slate-900"
                      style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
                    >
                      {nextEvent.event_type || "Evento"}
                    </h2>
                    <p className="text-sm text-slate-600 font-semibold mt-0.5 truncate">
                      {nextEvent.client_name}
                      {nextEvent.venue ? ` · ${nextEvent.venue}` : ""}
                    </p>
                  </div>
                </div>

                {/* Contador de días */}
                <div className="flex items-center gap-4 md:ml-auto">
                  <div className="flex flex-col items-center px-5 py-3 rounded-2xl bg-white/70 border border-white/80 shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {es ? "Fecha" : "Date"}
                    </span>
                    <span className="text-base font-black text-slate-800 mt-0.5">
                      {fmtDate(nextEvent.event_date)}
                    </span>
                    {nextEvent.event_time && (
                      <span className="text-[11px] text-slate-500 font-bold mt-0.5">
                        {nextEvent.event_time}
                      </span>
                    )}
                  </div>

                  <motion.div
                    animate={isSoon ? { scale: [1, 1.06, 1] } : {}}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                    className="relative flex flex-col items-center px-5 py-3 rounded-2xl shadow-md min-w-[110px]"
                    style={{
                      background: isToday
                        ? "linear-gradient(135deg,#ef4444,#f97316)"
                        : isSoon
                          ? "linear-gradient(135deg,#f97316,#f59e0b)"
                          : `linear-gradient(135deg, ${c.fg}, ${c.fg}cc)`,
                    }}
                  >
                    {isSoon && (
                      <motion.span
                        className="absolute inset-0 rounded-2xl"
                        style={{ background: "rgba(255,255,255,0.25)" }}
                        animate={{ opacity: [0, 0.5, 0] }}
                        transition={{ duration: 1.4, repeat: Infinity }}
                      />
                    )}
                    <span className="relative text-[10px] font-black text-white/90 uppercase tracking-widest">
                      {es ? "Faltan" : "In"}
                    </span>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={daysToNext}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -10, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="relative text-3xl font-black text-white leading-none mt-0.5"
                        style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
                      >
                        {isToday ? (es ? "¡Hoy!" : "Today!") : daysToNext}
                      </motion.span>
                    </AnimatePresence>
                    {!isToday && (
                      <span className="relative text-[11px] font-black text-white/95 mt-0.5">
                        {daysToNext === 1 ? (es ? "día" : "day") : (es ? "días" : "days")}
                      </span>
                    )}
                  </motion.div>

                  <motion.button
                    whileHover={{ scale: 1.06, x: 2 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={(e) => { e.stopPropagation(); jumpToNext(); }}
                    className="hidden sm:flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white/80 hover:bg-white text-slate-700 text-xs font-black shadow-sm hover:shadow-md transition-shadow"
                    data-testid="jump-to-next-event-btn"
                  >
                    {es ? "Ver en calendario" : "View in calendar"} <ArrowRight size={13} />
                  </motion.button>
                </div>
              </div>

              {/* Barra de progreso del mes actual (sub-info) */}
              <div className="mt-5 pt-4 border-t border-white/60 flex items-center gap-4 flex-wrap text-xs">
                <div className="flex items-center gap-1.5 text-slate-600 font-bold">
                  <CalendarClock size={13} className="text-slate-400" />
                  {monthEvents.length} {es ? (monthEvents.length === 1 ? "evento este mes" : "eventos este mes") : (monthEvents.length === 1 ? "event this month" : "events this month")}
                </div>
                <span className="text-slate-300">·</span>
                <div className="flex items-center gap-1.5 text-slate-600 font-bold">
                  <Wallet size={13} className="text-slate-400" />
                  {formatCurrency(monthRevenue)}
                </div>
                {isThisWeek && !isSoon && (
                  <>
                    <span className="text-slate-300">·</span>
                    <div className="flex items-center gap-1.5 text-amber-600 font-black">
                      <Zap size={13} strokeWidth={2.5} />
                      {es ? "¡Esta semana!" : "This week!"}
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        );
      })()}

      {/* Banner vacío si no hay próximo evento */}
      {viewMode !== "list" && !nextEvent && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 glass rounded-[28px] px-6 py-6 flex items-center gap-4 border-white/60"
          data-testid="next-event-banner-empty"
        >
          <div className="w-14 h-14 rounded-2xl btn-primary flex items-center justify-center shadow-md">
            <CalendarClock size={24} className="text-white" strokeWidth={2} />
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              {es ? "Sin próximos eventos" : "No upcoming events"}
            </p>
            <p className="text-lg font-black text-slate-800" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
              {es ? "Crea tu primera reserva" : "Create your first reservation"}
            </p>
          </div>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full btn-primary text-white text-xs font-black">
            <Plus size={14} /> {tr.common.newReservation}
          </motion.button>
        </motion.div>
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
              exit={{ opacity: 0, x: direction * -24, transition: { duration: 0.18 } }} className="grid grid-cols-7 gap-1.5 p-2 sm:p-3" data-testid="calendar-grid">
              {cells.map((day, i) => {
                const dayEvents = getEventsForDay(day);
                const visible = dayEvents.slice(0, 3);
                const extra = dayEvents.length - visible.length;
                const past = day ? isPast(day) : false;
                const todayCell = day && isToday(day);
                const hasEvents = dayEvents.length > 0;
                const primaryType = hasEvents ? dayEvents[0].event_type : null;
                const primaryColor = primaryType ? getColor(primaryType) : null;
                const isWeekend = day && ((firstDay + day - 1) % 7 === 0 || (firstDay + day - 1) % 7 === 6);
                const isNextEventDay = nextEvent && day && dayEvents.some(e => e.id === nextEvent.id);
                const isSoonHighlight = isNextEventDay && daysToNext !== null && daysToNext <= 1;

                return (
                  <motion.div
                    key={i}
                    variants={cellVariant}
                    whileHover={day && !past ? { scale: 1.035, y: -3, transition: { type: "spring", stiffness: 300, damping: 20 } } : {}}
                    className={`relative min-h-[112px] p-2 rounded-2xl border transition-colors group/cell overflow-hidden ${
                      !day ? "bg-transparent border-transparent" :
                      past ? "bg-slate-50/40 border-white/30" :
                      hasEvents ? "border-white/60" :
                      "bg-white/25 border-white/40 hover:bg-white/55 hover:border-white/80 hover:shadow-md"
                    } ${day ? "cursor-pointer" : ""}`}
                    style={hasEvents && !past ? {
                      background: `linear-gradient(135deg, ${primaryColor.fg}14, ${primaryColor.fg}05 60%, rgba(255,255,255,0.4))`,
                    } : hasEvents && past ? {
                      background: `linear-gradient(135deg, ${primaryColor.fg}0a, rgba(248,250,252,0.4))`,
                    } : undefined}
                    onClick={() => { if (day && dayEvents.length === 0) setShowForm(true); }}
                    data-testid={day ? `calendar-day-${day}` : undefined}
                  >
                    {/* Glow animado si tiene eventos (no en pasado) */}
                    {hasEvents && !past && (
                      <>
                        <motion.div
                          className="absolute inset-0 rounded-2xl pointer-events-none opacity-60"
                          style={{
                            boxShadow: `inset 0 0 0 1.5px ${primaryColor.fg}55`,
                          }}
                          animate={{ opacity: [0.4, 0.85, 0.4] }}
                          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: (i % 7) * 0.15 }}
                        />
                        <motion.div
                          className="absolute -inset-0.5 rounded-2xl pointer-events-none opacity-0 group-hover/cell:opacity-100 transition-opacity duration-300"
                          style={{
                            background: `radial-gradient(circle at 30% 20%, ${primaryColor.fg}30, transparent 65%)`,
                          }}
                        />
                        {/* Sparkle esquina */}
                        <motion.div
                          className="absolute top-1 right-1 pointer-events-none"
                          animate={{ scale: [1, 1.25, 1], rotate: [0, 12, 0] }}
                          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: (i % 5) * 0.3 }}
                        >
                          <Sparkles size={9} style={{ color: primaryColor.fg }} strokeWidth={2.5} className="opacity-60" />
                        </motion.div>
                      </>
                    )}

                    {/* Anillo especial "PRÓXIMO EVENTO" (por encima del ring today) */}
                    {isNextEventDay && !todayCell && (
                      <motion.div
                        className="absolute inset-0 rounded-2xl pointer-events-none z-10"
                        style={{ boxShadow: `inset 0 0 0 2.5px ${primaryColor.fg}` }}
                      >
                        <motion.div
                          className="absolute inset-0 rounded-2xl"
                          style={{ boxShadow: `0 0 0 3px ${primaryColor.fg}40` }}
                          animate={{ opacity: [0.3, 0.9, 0.3], scale: [1, 1.02, 1] }}
                          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                        />
                      </motion.div>
                    )}
                    {isSoonHighlight && (
                      <motion.div
                        className="absolute -top-1 -right-1 z-20 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-red-500 to-orange-500 shadow-md"
                        initial={{ scale: 0 }}
                        animate={{ scale: [1, 1.12, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      >
                        <Flame size={9} className="text-white" strokeWidth={2.6} />
                      </motion.div>
                    )}

                    {/* Anillo TODAY */}
                    {todayCell && (
                      <motion.div
                        layoutId="today-ring"
                        className="absolute inset-0 rounded-2xl pointer-events-none z-10"
                        style={{ boxShadow: "inset 0 0 0 2.5px var(--t-from)" }}
                      >
                        <motion.div
                          className="absolute inset-0 rounded-2xl"
                          style={{ boxShadow: "0 0 0 3px var(--t-from)33" }}
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                        />
                      </motion.div>
                    )}

                    {day && (
                      <div className="relative z-[1]">
                        <div className="flex items-center justify-between mb-1.5">
                          <motion.span
                            whileHover={{ scale: 1.15 }}
                            className={`inline-flex items-center justify-center min-w-[28px] h-7 px-1.5 text-sm rounded-xl font-black transition-all ${
                              todayCell ? "theme-today shadow-md" :
                              past ? "text-slate-300" :
                              hasEvents ? "text-slate-800 group-hover/cell:bg-white/80" :
                              isWeekend ? "text-slate-500 group-hover/cell:bg-white/80" :
                              "text-slate-700 group-hover/cell:bg-white/80"
                            }`}
                            style={hasEvents && !todayCell && !past ? { color: primaryColor.fg } : undefined}
                          >
                            {day}
                          </motion.span>
                          {hasEvents ? (
                            <motion.span
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 280, delay: 0.1 + (i % 7) * 0.02 }}
                              whileHover={{ scale: 1.2, rotate: 5 }}
                              className="text-[9px] font-black px-1.5 py-0.5 rounded-full text-white shadow-sm flex-shrink-0"
                              style={{ background: primaryColor.fg }}
                            >
                              {dayEvents.length}
                            </motion.span>
                          ) : (
                            !past && (
                              <motion.span
                                whileHover={{ scale: 1.3, rotate: 90 }}
                                className="opacity-0 group-hover/cell:opacity-100 transition-opacity"
                              >
                                <div className="w-5 h-5 rounded-full bg-white/70 flex items-center justify-center shadow-sm">
                                  <Plus size={11} className="text-slate-500" strokeWidth={2.5} />
                                </div>
                              </motion.span>
                            )
                          )}
                        </div>
                        <div className="space-y-1">
                          <AnimatePresence>
                            {visible.map((ev, evIdx) => {
                              const c = getColor(ev.event_type);
                              const cfg = getEventConfig(ev.event_type);
                              const EvIcon = cfg.icon;
                              return (
                                <motion.div
                                  key={ev.id}
                                  layout
                                  initial={{ opacity: 0, x: -8, scale: 0.9 }}
                                  animate={{ opacity: 1, x: 0, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.9 }}
                                  transition={{ delay: 0.1 + evIdx * 0.05, type: "spring", stiffness: 260 }}
                                  whileHover={{ scale: 1.06, x: 3, boxShadow: `0 4px 14px ${c.fg}44` }}
                                  whileTap={{ scale: 0.96 }}
                                  onClick={(e) => { e.stopPropagation(); navigate(`/reservaciones/${ev.id}`); }}
                                  onMouseEnter={(e) => onChipEnter(ev, e)}
                                  onMouseMove={onChipMove}
                                  onMouseLeave={onChipLeave}
                                  style={{ borderLeftColor: c.fg, background: `linear-gradient(90deg, ${c.bg}, ${c.bg}cc)` }}
                                  className="flex items-center gap-1 pl-1.5 pr-1.5 py-1 rounded-lg border-l-[3px] cursor-pointer shadow-sm hover:shadow-md transition-shadow"
                                  data-testid={`calendar-event-${ev.id}`}
                                >
                                  <EvIcon size={10} style={{ color: c.fg }} strokeWidth={2.3} className="flex-shrink-0" />
                                  <span className="text-[10px] font-black truncate leading-tight" style={{ color: c.fg }}>
                                    {ev.event_time ? `${ev.event_time} ` : ""}{ev.event_type || ev.client_name}
                                  </span>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                          {extra > 0 && (
                            <motion.span
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.25 }}
                              whileHover={{ scale: 1.08, x: 2 }}
                              className="text-[10px] font-black pl-1 block cursor-pointer"
                              style={{ color: primaryColor?.fg || "#94a3b8" }}
                            >
                              + {extra} {es ? "más" : "more"}
                            </motion.span>
                          )}
                        </div>
                      </div>
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

      {/* Legend row removed per request */}

      {/* Floating hover preview */}
      {createPortal(
      <AnimatePresence>
        {hover && (() => {
          const c = getColor(hover.ev.event_type);
          const cfg = getEventConfig(hover.ev.event_type);
          const HIcon = cfg.icon;
          const balance = (hover.ev.total_amount || 0) - (hover.ev.advance_paid || 0);
          const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
          const vh = typeof window !== "undefined" ? window.innerHeight : 800;
          const CARD_W = 288; // w-72
          const CARD_H = 210;
          const GAP = 10;
          // Prefer right side of chip; fallback left; fallback below
          let left = hover.rect.right + GAP;
          let top = hover.rect.top;
          if (left + CARD_W > vw - 8) {
            left = hover.rect.left - CARD_W - GAP;
          }
          if (left < 8) {
            // Not enough horizontal space either side → place below the chip
            left = Math.max(8, Math.min(hover.rect.left, vw - CARD_W - 8));
            top = hover.rect.bottom + GAP;
          }
          if (top + CARD_H > vh - 8) top = Math.max(8, vh - CARD_H - 8);
          if (top < 8) top = 8;
          return (
            <motion.div initial={{ opacity: 0, scale: 0.94, x: -6 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.94 }} transition={{ duration: 0.14 }}
              className="fixed z-[9999] w-72 rounded-2xl p-4 pointer-events-none shadow-2xl border"
              style={{ left, top, background: "rgba(255,255,255,0.94)", backdropFilter: "blur(16px)", borderColor: c.border }} data-testid="calendar-hover-preview">
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
      </AnimatePresence>,
      document.body
      )}

      {showForm && <ReservationForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); reload(); }} />}
    </div>
  );
}
