import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, Sparkles, Zap, ArrowRight, Flame, Plus, ChevronDown, CalendarClock } from "lucide-react";
import { getEventConfig } from "@/lib/eventConfig";

/**
 * Big animated hero banner replacing the 4 stat cards.
 * Shows: current-month events (big) + total events + animated ticker of upcoming events.
 */

function useCounter(target, duration = 1200) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    if (target === undefined || target === null) return;
    const start = performance.now();
    const from = 0;
    const tick = (t) => {
      const p = Math.min((t - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 4);
      setDisplay(Math.round(from + (target - from) * e));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => raf.current && cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return display;
}

// Floating sparkle particles
function Particles({ count = 18 }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(count)].map((_, i) => {
        const size = 2 + Math.random() * 4;
        const left = Math.random() * 100;
        const delay = Math.random() * 5;
        const dur = 4 + Math.random() * 5;
        return (
          <motion.span
            key={i}
            className="absolute rounded-full bg-white"
            style={{ width: size, height: size, left: `${left}%`, bottom: -10, filter: "blur(0.5px)" }}
            animate={{ y: [0, -280 - Math.random() * 120], opacity: [0, 0.9, 0] }}
            transition={{ duration: dur, delay, repeat: Infinity, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}

export default function MonthlyEventsBanner({
  monthEvents = [],
  pendingEvents = [],
  nextMonthName = "",
  monthName = "",
  language = "es",
  onCreate,
  onViewAll,
  onEventClick,
}) {
  const monthCount = monthEvents.length;
  const nextEvent = monthEvents[0]; // already sorted asc
  const pendingCount = pendingEvents.length;
  const [upcomingOpen, setUpcomingOpen] = useState(false);

  // Sorted list of upcoming pending events (asc by date), cap for display
  const upcomingList = useMemo(() => {
    return [...pendingEvents]
      .filter(e => !!e.event_date)
      .sort((a, b) => a.event_date.localeCompare(b.event_date))
      .slice(0, 6);
  }, [pendingEvents]);

  // Month labels for date formatting
  const monthLabels = useMemo(() => {
    const es = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const en = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return language === "es" ? es : en;
  }, [language]);

  const bigNum = useCounter(monthCount, 1000);

  // Days until next event
  let daysToNext = null;
  if (nextEvent?.event_date) {
    const [y, m, d] = nextEvent.event_date.split("-");
    const ev = new Date(+y, +m - 1, +d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    daysToNext = Math.max(0, Math.round((ev - today) / 86400000));
  }

  // Cycling next-events ticker (rotates every 3s)
  const [tickerIdx, setTickerIdx] = useState(0);
  useEffect(() => {
    if (monthEvents.length < 2) return;
    const id = setInterval(() => setTickerIdx(i => (i + 1) % monthEvents.length), 3000);
    return () => clearInterval(id);
  }, [monthEvents.length]);
  const tickerEvent = monthEvents[tickerIdx];
  const tickerCfg = tickerEvent ? getEventConfig(tickerEvent.event_type) : null;
  const TickerIcon = tickerCfg?.icon;

  const isHot = monthCount >= 3;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[32px] mb-8 shadow-2xl"
      style={{
        background:
          "linear-gradient(120deg, #0f172a 0%, #1e1b4b 30%, #4c1d95 65%, #831843 100%)",
        boxShadow: "0 30px 80px -20px rgba(76, 29, 149, 0.55)",
      }}
      data-testid="monthly-events-banner"
    >
      {/* Animated gradient overlay */}
      <motion.div
        className="absolute inset-0 opacity-70 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 80% at 20% 20%, rgba(236,72,153,0.35), transparent 60%), radial-gradient(50% 80% at 80% 80%, rgba(59,130,246,0.35), transparent 60%)",
        }}
        animate={{ opacity: [0.6, 0.85, 0.6] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Grain / noise-ish texture using SVG */}
      <div
        className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence baseFrequency='0.9'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/></svg>\")",
        }}
      />

      {/* Rotating orb */}
      <motion.div
        className="absolute -right-24 -top-24 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background:
            "conic-gradient(from 0deg, #ec4899, #8b5cf6, #3b82f6, #06b6d4, #ec4899)",
          filter: "blur(60px)",
          opacity: 0.35,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute -left-32 -bottom-32 w-[420px] h-[420px] rounded-full pointer-events-none"
        style={{
          background:
            "conic-gradient(from 180deg, #f97316, #ec4899, #a855f7, #f97316)",
          filter: "blur(80px)",
          opacity: 0.28,
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      />

      <Particles count={22} />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 p-8 md:p-10">
        {/* LEFT — Big month number */}
        <div className="flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-6">
            <motion.div
              animate={{ scale: [1, 1.15, 1], rotate: [0, 8, -8, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-11 h-11 rounded-2xl flex items-center justify-center backdrop-blur-md"
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}
            >
              <CalendarDays size={20} className="text-white" strokeWidth={2} />
            </motion.div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-white/70 font-black">
                {language === "es" ? "Eventos de" : "Events in"} {monthName}
              </p>
              <p className="text-xs text-white/50 mt-0.5 font-semibold">
                {language === "es" ? "Enfócate en este mes" : "Focus on this month"}
              </p>
            </div>
            {isHot && (
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.4 }}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                style={{
                  background: "linear-gradient(135deg,#f97316,#ec4899)",
                  color: "white",
                  boxShadow: "0 6px 20px -4px rgba(236,72,153,0.6)",
                }}
              >
                <motion.span animate={{ rotate: [0, -12, 12, 0] }} transition={{ duration: 1.4, repeat: Infinity }}>
                  <Flame size={12} />
                </motion.span>
                {language === "es" ? "Mes activo" : "Hot month"}
              </motion.div>
            )}
          </div>

          {/* Giant number */}
          <div className="flex items-end gap-6 flex-wrap">
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 180, damping: 16, delay: 0.2 }}
              className="relative"
              style={{ paddingBottom: "0.5rem", paddingTop: "0.5rem" }}
            >
              <p
                className="font-black text-white"
                style={{
                  fontFamily: "Cabinet Grotesk, sans-serif",
                  fontSize: "clamp(6rem, 14vw, 11rem)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                  textShadow: "0 4px 40px rgba(236,72,153,0.4)",
                  background:
                    "linear-gradient(135deg, #ffffff 0%, #fce7f3 40%, #c4b5fd 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  paddingBottom: "0.15em",
                  paddingRight: "0.12em",
                  display: "inline-block",
                  overflow: "visible",
                }}
                data-testid="banner-month-count"
              >
                {bigNum}
              </p>
              <motion.span
                className="absolute -right-4 -top-2"
                animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles size={22} className="text-pink-300" />
              </motion.span>
            </motion.div>

            <div className="pb-4 min-w-[220px] flex-1">
              <p
                className="text-white font-black leading-[1.1] tracking-tight"
                style={{
                  fontFamily: "Cabinet Grotesk, sans-serif",
                  fontSize: "clamp(1.5rem, 2.6vw, 2.25rem)",
                  textShadow: "0 2px 20px rgba(0,0,0,0.25)",
                }}
                data-testid="banner-month-label"
              >
                {monthCount === 0
                  ? (language === "es" ? "Sin eventos este mes" : "No events this month")
                  : monthCount === 1
                  ? (language === "es" ? "Reserva confirmada este mes" : "Reservation confirmed this month")
                  : (language === "es" ? "Reservas confirmadas este mes" : "Reservations confirmed this month")}
              </p>
              {daysToNext !== null && nextEvent && (
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  className="text-white/85 text-base mt-3 font-bold flex items-center gap-2"
                >
                  <Zap size={16} className="text-yellow-300" />
                  {daysToNext === 0
                    ? (language === "es" ? "Un evento es HOY" : "An event is TODAY")
                    : daysToNext === 1
                    ? (language === "es" ? "Próximo evento: mañana" : "Next event: tomorrow")
                    : (language === "es" ? `Próximo evento en ${daysToNext} días` : `Next event in ${daysToNext} days`)}
                </motion.p>
              )}
            </div>
          </div>

          {/* Ticker of upcoming events */}
          {tickerEvent && (
            <div className="mt-6 relative h-14">
              <AnimatePresence mode="wait">
                <motion.button
                  key={tickerEvent.id}
                  onClick={onViewAll}
                  initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -16, filter: "blur(6px)" }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 flex items-center gap-3 px-4 py-3 rounded-2xl backdrop-blur-md text-left"
                  style={{
                    background: "rgba(255,255,255,0.10)",
                    border: "1px solid rgba(255,255,255,0.20)",
                  }}
                  data-testid="banner-ticker"
                >
                  {TickerIcon && (
                    <motion.div
                      animate={{ scale: [1, 1.12, 1] }}
                      transition={{ duration: 1.6, repeat: Infinity }}
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: tickerCfg.fg }}
                    >
                      <TickerIcon size={16} className="text-white" />
                    </motion.div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-sm truncate" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                      {tickerEvent.event_type || "Evento"}
                      {tickerEvent.client_name ? ` · ${tickerEvent.client_name}` : ""}
                    </p>
                    <p className="text-white/60 text-xs font-semibold">
                      {(() => {
                        if (!tickerEvent.event_date) return "";
                        const [y, m, d] = tickerEvent.event_date.split("-");
                        return `${d}/${m}/${y}`;
                      })()}
                    </p>
                  </div>
                  <ArrowRight size={16} className="text-white/70 flex-shrink-0" />
                </motion.button>
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* RIGHT — Clean "Próximos eventos" with hover/click reveal + CTA */}
        <div className="flex flex-col justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
            onMouseEnter={() => setUpcomingOpen(true)}
            onMouseLeave={() => setUpcomingOpen(false)}
            className="rounded-3xl backdrop-blur-md relative overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.18)",
            }}
            data-testid="banner-upcoming-card"
          >
            <motion.div
              className="absolute -right-8 -top-8 w-32 h-32 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%)" }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Header — clickable to toggle on mobile */}
            <button
              type="button"
              onClick={() => setUpcomingOpen(o => !o)}
              className="w-full text-left p-6 flex items-center gap-4 relative z-10"
              data-testid="banner-upcoming-toggle"
              aria-expanded={upcomingOpen}
            >
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg,#f472b6,#a78bfa)",
                  boxShadow: "0 8px 20px -6px rgba(168,85,247,0.55)",
                }}
              >
                <CalendarClock size={22} className="text-white" strokeWidth={2.2} />
              </motion.div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-white font-black leading-tight"
                  style={{
                    fontFamily: "Cabinet Grotesk, sans-serif",
                    fontSize: "clamp(1.35rem, 2vw, 1.75rem)",
                  }}
                >
                  {language === "es" ? "Próximos eventos" : "Upcoming events"}
                </p>
                <p className="text-white/70 text-sm font-semibold mt-0.5">
                  {pendingCount === 0
                    ? (language === "es" ? "Sin eventos pendientes" : "No pending events")
                    : pendingCount === 1
                    ? (language === "es" ? "1 evento pendiente" : "1 pending event")
                    : (language === "es" ? `${pendingCount} eventos pendientes` : `${pendingCount} pending events`)}
                </p>
              </div>
              <motion.div
                animate={{ rotate: upcomingOpen ? 180 : 0 }}
                transition={{ duration: 0.3 }}
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)" }}
              >
                <ChevronDown size={18} className="text-white" />
              </motion.div>
            </button>

            {/* Expandable list */}
            <AnimatePresence initial={false}>
              {upcomingOpen && upcomingList.length > 0 && (
                <motion.div
                  key="upcoming-list"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  className="relative z-10 overflow-hidden"
                  data-testid="banner-upcoming-list"
                >
                  <div className="px-4 pb-4 space-y-1.5 max-h-[280px] overflow-y-auto">
                    {upcomingList.map((ev, i) => {
                      const cfg = getEventConfig(ev.event_type);
                      const Icon = cfg?.icon;
                      let dateLabel = "";
                      if (ev.event_date) {
                        const [y, m, d] = ev.event_date.split("-");
                        dateLabel = `${d} ${monthLabels[parseInt(m, 10) - 1]}`;
                      }
                      return (
                        <motion.button
                          key={ev.id || i}
                          initial={{ opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          onClick={() => onEventClick && onEventClick(ev.id)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left group hover:bg-white/10 transition-colors"
                          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)" }}
                          data-testid={`banner-upcoming-item-${i}`}
                        >
                          {Icon && (
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: cfg.fg }}
                            >
                              <Icon size={14} className="text-white" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-sm truncate">
                              {ev.event_type || (language === "es" ? "Evento" : "Event")}
                              {ev.client_name ? ` · ${ev.client_name}` : ""}
                            </p>
                            <p className="text-white/60 text-xs font-semibold">{dateLabel}</p>
                          </div>
                          <ArrowRight
                            size={14}
                            className="text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all flex-shrink-0"
                          />
                        </motion.button>
                      );
                    })}
                    {pendingCount > upcomingList.length && (
                      <button
                        type="button"
                        onClick={onViewAll}
                        className="w-full text-center text-white/80 hover:text-white text-xs font-black uppercase tracking-widest py-2 mt-1"
                        data-testid="banner-upcoming-viewall"
                      >
                        {language === "es"
                          ? `Ver los ${pendingCount} eventos →`
                          : `View all ${pendingCount} events →`}
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
              {upcomingOpen && upcomingList.length === 0 && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-6 pb-6 text-white/60 text-sm font-semibold relative z-10"
                >
                  {language === "es"
                    ? `Aún sin eventos para ${nextMonthName || "los próximos meses"}`
                    : `No events yet for ${nextMonthName || "upcoming months"}`}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.button
            whileHover={{ scale: 1.03, boxShadow: "0 20px 40px -12px rgba(236,72,153,0.55)" }}
            whileTap={{ scale: 0.97 }}
            onClick={onCreate}
            data-testid="banner-create-btn"
            className="w-full rounded-2xl px-6 py-4 font-black text-sm text-white uppercase tracking-widest flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg,#ec4899 0%,#a855f7 60%,#3b82f6 100%)",
              boxShadow: "0 10px 30px -8px rgba(168,85,247,0.5)",
            }}
          >
            <Plus size={16} />
            {language === "es" ? "Nueva Reserva" : "New Reservation"}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
