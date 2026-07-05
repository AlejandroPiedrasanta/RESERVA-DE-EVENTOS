import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CalendarDays, Bell, Sparkles, ArrowRight, Clock } from "lucide-react";
import { getEventConfig } from "@/lib/eventConfig";

/**
 * Popup modal that fires on Dashboard mount when the user has events this month.
 * Shows for the current session only (dismissable + sessionStorage flag).
 */
export default function EventNotificationPopup({
  events = [],
  monthName = "",
  language = "es",
  onClose,
  onView,
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!events || events.length === 0) return;
    const key = `evt-popup-${new Date().getFullYear()}-${new Date().getMonth()}`;
    if (sessionStorage.getItem(key)) return;
    const t = setTimeout(() => setOpen(true), 550);
    sessionStorage.setItem(key, "1");
    return () => clearTimeout(t);
  }, [events]);

  const close = () => {
    setOpen(false);
    onClose?.();
  };

  const list = events.slice(0, 4);
  const extra = Math.max(0, events.length - list.length);

  const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split("-");
    const ev = new Date(+y, +m - 1, +d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((ev - today) / 86400000));
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="popup-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(6px)" }}
          onClick={close}
          data-testid="event-popup-backdrop"
        >
          <motion.div
            key="popup-card"
            initial={{ scale: 0.85, opacity: 0, y: 30, rotate: -1 }}
            animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="relative w-full max-w-lg rounded-[28px] overflow-hidden shadow-2xl"
            style={{
              background:
                "linear-gradient(150deg,#0f172a 0%,#1e1b4b 40%,#4c1d95 100%)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
            data-testid="event-popup-modal"
          >
            {/* Animated glow blobs */}
            <motion.div
              className="absolute -right-20 -top-20 w-72 h-72 rounded-full pointer-events-none"
              style={{
                background: "conic-gradient(from 0deg,#ec4899,#a855f7,#3b82f6,#ec4899)",
                filter: "blur(60px)",
                opacity: 0.5,
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute -left-16 -bottom-16 w-60 h-60 rounded-full pointer-events-none"
              style={{
                background: "conic-gradient(from 180deg,#f97316,#ec4899,#a855f7,#f97316)",
                filter: "blur(60px)",
                opacity: 0.4,
              }}
              animate={{ rotate: -360 }}
              transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
            />

            {/* Sparkles */}
            {[...Array(10)].map((_, i) => (
              <motion.span
                key={i}
                className="absolute rounded-full bg-white pointer-events-none"
                style={{
                  width: 3,
                  height: 3,
                  left: `${5 + Math.random() * 90}%`,
                  top: `${5 + Math.random() * 90}%`,
                  filter: "blur(0.5px)",
                }}
                animate={{ opacity: [0, 1, 0], scale: [0.4, 1.2, 0.4] }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  delay: Math.random() * 2,
                  repeat: Infinity,
                }}
              />
            ))}

            {/* Close */}
            <button
              onClick={close}
              className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-colors"
              style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)" }}
              data-testid="event-popup-close"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <div className="relative z-10 p-8">
              {/* Header */}
              <div className="flex items-start gap-4 mb-6">
                <motion.div
                  initial={{ rotate: -20, scale: 0 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 220, damping: 12, delay: 0.15 }}
                  className="relative w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "linear-gradient(135deg,#ec4899,#a855f7)",
                    boxShadow: "0 10px 30px -8px rgba(168,85,247,0.6)",
                  }}
                >
                  <motion.span
                    className="absolute inset-0 rounded-2xl"
                    style={{ background: "linear-gradient(135deg,#ec4899,#a855f7)" }}
                    animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                  />
                  <Bell size={22} className="text-white relative" strokeWidth={2.2} />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <motion.p
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                    className="text-[11px] uppercase tracking-[0.25em] text-pink-300 font-black flex items-center gap-1.5"
                  >
                    <Sparkles size={12} />
                    {language === "es" ? "¡Aviso importante!" : "Heads up!"}
                  </motion.p>
                  <motion.h2
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.32 }}
                    className="text-2xl font-black text-white leading-tight mt-1"
                    style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
                  >
                    {events.length === 1
                      ? (language === "es" ? "Tienes 1 evento este mes" : "You have 1 event this month")
                      : (language === "es"
                        ? `Tienes ${events.length} eventos en ${monthName}`
                        : `You have ${events.length} events in ${monthName}`)}
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-white/70 text-sm font-semibold mt-1.5"
                  >
                    {language === "es"
                      ? "Prepárate: aquí están los más próximos"
                      : "Get ready — here are the nearest ones"}
                  </motion.p>
                </div>
              </div>

              {/* Event list */}
              <div className="space-y-2.5 mb-6">
                {list.map((ev, i) => {
                  const cfg = getEventConfig(ev.event_type);
                  const Icon = cfg.icon;
                  const dLeft = daysUntil(ev.event_date);
                  return (
                    <motion.div
                      key={ev.id || i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.45 + i * 0.08 }}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl backdrop-blur-md"
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.14)",
                      }}
                      data-testid={`popup-event-${ev.id || i}`}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: cfg.fg }}
                      >
                        <Icon size={16} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-black text-sm truncate" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                          {ev.event_type || "Evento"}
                          {ev.client_name ? ` · ${ev.client_name}` : ""}
                        </p>
                        <p className="text-white/60 text-xs font-semibold flex items-center gap-1.5 mt-0.5">
                          <Clock size={11} />
                          {(() => {
                            if (!ev.event_date) return "-";
                            const [y, m, d] = ev.event_date.split("-");
                            return `${d}/${m}/${y}`;
                          })()}
                        </p>
                      </div>
                      {dLeft !== null && (
                        <div
                          className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex-shrink-0"
                          style={{
                            background:
                              dLeft === 0
                                ? "linear-gradient(135deg,#ef4444,#f97316)"
                                : dLeft <= 3
                                ? "linear-gradient(135deg,#f97316,#f59e0b)"
                                : "rgba(255,255,255,0.15)",
                            color: "white",
                            border: dLeft > 3 ? "1px solid rgba(255,255,255,0.2)" : "none",
                          }}
                        >
                          {dLeft === 0
                            ? (language === "es" ? "HOY" : "TODAY")
                            : dLeft === 1
                            ? (language === "es" ? "MAÑANA" : "TOMORROW")
                            : (language === "es" ? `${dLeft} DÍAS` : `${dLeft} DAYS`)}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
                {extra > 0 && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="text-center text-white/60 text-xs font-bold pt-1"
                  >
                    {language === "es" ? `+${extra} evento(s) más` : `+${extra} more event(s)`}
                  </motion.p>
                )}
              </div>

              {/* CTAs */}
              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { close(); onView?.(); }}
                  data-testid="event-popup-view-all"
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl px-4 py-3 font-black text-sm text-white uppercase tracking-wider"
                  style={{
                    background: "linear-gradient(135deg,#ec4899,#a855f7,#3b82f6)",
                    boxShadow: "0 10px 30px -8px rgba(168,85,247,0.5)",
                  }}
                >
                  <CalendarDays size={15} />
                  {language === "es" ? "Ver todo" : "See all"}
                  <ArrowRight size={14} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={close}
                  data-testid="event-popup-dismiss"
                  className="px-5 py-3 rounded-2xl font-black text-sm text-white/80 uppercase tracking-wider"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.16)",
                  }}
                >
                  {language === "es" ? "Después" : "Later"}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
