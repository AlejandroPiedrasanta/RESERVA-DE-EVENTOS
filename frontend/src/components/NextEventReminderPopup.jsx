import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, PartyPopper, Bell, Sparkles, ArrowRight, Clock, MapPin, Flame, CalendarDays } from "lucide-react";
import { getEventConfig } from "@/lib/eventConfig";

/**
 * One-time popup reminder for the next upcoming event.
 * Shows only if event is today / tomorrow / within 3 days.
 * Dismissible via X (persists to localStorage with a phase-scoped key so it
 * won't reappear once closed for the same phase+event).
 */
export default function NextEventReminderPopup({
  event,
  daysToNext,
  language = "es",
  onView,
}) {
  const [open, setOpen] = useState(false);

  const phase = useMemo(() => {
    if (daysToNext == null) return null;
    if (daysToNext === 0) return "today";
    if (daysToNext === 1) return "tomorrow";
    if (daysToNext <= 3) return "soon";
    return null;
  }, [daysToNext]);

  const storageKey = event && phase ? `nextEventReminder_${event.id}_${event.event_date}_${phase}` : null;

  useEffect(() => {
    if (!event || !phase || !storageKey) return;
    if (localStorage.getItem(storageKey)) return;
    const t = setTimeout(() => setOpen(true), 700);
    return () => clearTimeout(t);
  }, [event, phase, storageKey]);

  const close = () => {
    setOpen(false);
    if (storageKey) localStorage.setItem(storageKey, "1");
  };

  if (!event || !phase) return null;

  const cfg = getEventConfig(event.event_type);
  const Icon = cfg.icon;
  const es = language === "es";

  const isToday = phase === "today";
  const isTomorrow = phase === "tomorrow";

  const heroBg = isToday
    ? "linear-gradient(150deg,#7f1d1d 0%,#c2410c 45%,#f97316 100%)"
    : isTomorrow
      ? "linear-gradient(150deg,#7c2d12 0%,#c2410c 45%,#f59e0b 100%)"
      : "linear-gradient(150deg,#78350f 0%,#a16207 45%,#eab308 100%)";

  const headline = isToday
    ? (es ? "¡Es HOY!" : "It's TODAY!")
    : isTomorrow
      ? (es ? "¡Es MAÑANA!" : "It's TOMORROW!")
      : (es ? `¡En ${daysToNext} días!` : `In ${daysToNext} days!`);

  const eyebrow = isToday
    ? (es ? "Recordatorio urgente" : "Urgent reminder")
    : isTomorrow
      ? (es ? "Recordatorio · Mañana" : "Reminder · Tomorrow")
      : (es ? "Recordatorio próximo" : "Upcoming reminder");

  const message = isToday
    ? (es ? "Oye, tienes un evento HOY. ¡Prepárate!" : "Hey, you have an event TODAY. Get ready!")
    : isTomorrow
      ? (es ? "Oye, tienes un evento mañana. Alista todo." : "Hey, you have an event tomorrow. Get everything ready.")
      : (es ? "Oye, tienes un evento próximo. No lo olvides." : "Hey, you have an event coming up. Don't forget.");

  const fmtDate = (d) => { if (!d) return "-"; const [y,m,dd] = d.split("-"); return `${dd}/${m}/${y}`; };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="reminder-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(8px)" }}
          onClick={close}
          data-testid="reminder-popup-backdrop"
        >
          <motion.div
            key="reminder-card"
            initial={{ scale: 0.7, opacity: 0, y: 40, rotate: -3 }}
            animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
            className="relative w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl"
            style={{ background: heroBg, border: "1.5px solid rgba(255,255,255,0.2)" }}
            onClick={(e) => e.stopPropagation()}
            data-testid="reminder-popup-modal"
          >
            {/* Rotating conic gradient glow */}
            <motion.div
              className="absolute -right-24 -top-24 w-80 h-80 rounded-full pointer-events-none"
              style={{
                background: "conic-gradient(from 0deg,#fbbf24,#f97316,#ef4444,#fbbf24)",
                filter: "blur(70px)",
                opacity: 0.55,
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute -left-20 -bottom-20 w-72 h-72 rounded-full pointer-events-none"
              style={{
                background: "conic-gradient(from 180deg,#f97316,#ec4899,#f59e0b,#f97316)",
                filter: "blur(70px)",
                opacity: 0.45,
              }}
              animate={{ rotate: -360 }}
              transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            />

            {/* Confetti sparkles */}
            {[...Array(18)].map((_, i) => (
              <motion.span
                key={i}
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: 3 + Math.random() * 3,
                  height: 3 + Math.random() * 3,
                  left: `${5 + Math.random() * 90}%`,
                  top: `${5 + Math.random() * 90}%`,
                  background: ["#fbbf24", "#fff", "#fecaca", "#fed7aa"][i % 4],
                  filter: "blur(0.4px)",
                }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0.4, 1.4, 0.4],
                  y: [0, -14, 0],
                }}
                transition={{
                  duration: 2 + Math.random() * 2.5,
                  delay: Math.random() * 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))}

            {/* Ring pulses (today only) */}
            {isToday && (
              <>
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={`ring-${i}`}
                    className="absolute left-1/2 top-24 -translate-x-1/2 rounded-full pointer-events-none"
                    style={{ width: 120, height: 120, border: "2px solid rgba(255,255,255,0.5)" }}
                    animate={{ scale: [1, 2.4], opacity: [0.6, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: "easeOut" }}
                  />
                ))}
              </>
            )}

            {/* Close X */}
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={close}
              className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full flex items-center justify-center text-white transition-colors"
              style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.28)", backdropFilter: "blur(8px)" }}
              data-testid="reminder-popup-close"
              aria-label="Close"
            >
              <X size={17} strokeWidth={2.5} />
            </motion.button>

            <div className="relative z-10 p-7 sm:p-8">
              {/* Eyebrow */}
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 }}
                className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.28em] text-amber-100/95 font-black mb-3"
              >
                <motion.span
                  animate={{ rotate: [0, -12, 12, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Bell size={13} strokeWidth={2.6} />
                </motion.span>
                {eyebrow}
              </motion.div>

              {/* Icon + Headline */}
              <div className="flex items-center gap-4 mb-4">
                <motion.div
                  initial={{ rotate: -30, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 210, damping: 12, delay: 0.28 }}
                  className="relative w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "linear-gradient(135deg,#fff,#fed7aa)",
                    boxShadow: "0 12px 34px -8px rgba(0,0,0,0.4)",
                  }}
                >
                  <motion.span
                    className="absolute inset-0 rounded-2xl"
                    style={{ background: "linear-gradient(135deg,#fbbf24,#f97316)" }}
                    animate={{ scale: [1, 1.55], opacity: [0.55, 0] }}
                    transition={{ duration: 1.7, repeat: Infinity, ease: "easeOut" }}
                  />
                  {isToday ? (
                    <motion.span
                      animate={{ rotate: [0, -8, 8, -8, 0], scale: [1, 1.12, 1] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                      className="relative"
                    >
                      <Flame size={30} style={{ color: "#c2410c" }} strokeWidth={2.4} />
                    </motion.span>
                  ) : (
                    <motion.span
                      animate={{ y: [0, -4, 0], rotate: [0, -6, 6, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="relative"
                    >
                      <PartyPopper size={30} style={{ color: "#c2410c" }} strokeWidth={2.4} />
                    </motion.span>
                  )}
                </motion.div>

                <div className="flex-1 min-w-0">
                  <motion.h2
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.34 }}
                    className="text-3xl sm:text-4xl font-black text-white leading-none tracking-tight"
                    style={{ fontFamily: "Cabinet Grotesk, sans-serif", textShadow: "0 3px 12px rgba(0,0,0,0.25)" }}
                  >
                    {headline}
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.44 }}
                    className="text-white/90 text-sm font-bold mt-1.5"
                  >
                    {message}
                  </motion.p>
                </div>
              </div>

              {/* Event card */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="rounded-2xl p-4 mb-5 backdrop-blur-md"
                style={{ background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.22)" }}
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    whileHover={{ rotate: [0, -8, 8, 0], scale: 1.08 }}
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md"
                    style={{ background: cfg.fg }}
                  >
                    <Icon size={20} className="text-white" strokeWidth={2.2} />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-base leading-tight truncate" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                      {event.event_type || "Evento"}
                    </p>
                    <p className="text-white/85 text-sm font-bold truncate mt-0.5">
                      {event.client_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/20 text-[12px] text-white/90 font-bold flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays size={12} className="text-white/70" />
                    {fmtDate(event.event_date)}
                  </span>
                  {event.event_time && (
                    <>
                      <span className="text-white/40">·</span>
                      <span className="flex items-center gap-1.5">
                        <Clock size={12} className="text-white/70" />
                        {event.event_time}
                      </span>
                    </>
                  )}
                  {event.venue && (
                    <>
                      <span className="text-white/40">·</span>
                      <span className="flex items-center gap-1.5 truncate">
                        <MapPin size={12} className="text-white/70" />
                        <span className="truncate max-w-[160px]">{event.venue}</span>
                      </span>
                    </>
                  )}
                </div>
              </motion.div>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.58 }}
                className="flex gap-3"
              >
                <motion.button
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { close(); onView?.(event); }}
                  data-testid="reminder-popup-view"
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 font-black text-sm text-orange-700 uppercase tracking-wider shadow-lg"
                  style={{
                    background: "linear-gradient(135deg,#fff,#fed7aa)",
                    boxShadow: "0 12px 30px -8px rgba(0,0,0,0.35)",
                  }}
                >
                  <Sparkles size={14} strokeWidth={2.6} />
                  {es ? "Ver detalle" : "View detail"}
                  <ArrowRight size={14} strokeWidth={2.6} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={close}
                  data-testid="reminder-popup-dismiss"
                  className="px-5 py-3.5 rounded-2xl font-black text-sm text-white/95 uppercase tracking-wider"
                  style={{ background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.24)" }}
                >
                  {es ? "Entendido" : "Got it"}
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
