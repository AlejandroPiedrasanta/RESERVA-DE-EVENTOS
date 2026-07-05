import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { getEventConfig } from "@/lib/eventConfig";

function useCounter(target, duration = 900) {
  const [n, setN] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min((t - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 4);
      setN(Math.round(target * e));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => raf.current && cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return n;
}

const hexA = (hex, a) => {
  const h = hex.replace("#", "");
  const b = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const r = parseInt(b.slice(0, 2), 16);
  const g = parseInt(b.slice(2, 4), 16);
  const bl = parseInt(b.slice(4, 6), 16);
  return `rgba(${r},${g},${bl},${a})`;
};

/**
 * Clean, readable event-type card.
 * - White background with subtle color-tinted glow
 * - Big dark number (very legible)
 * - Colored icon + type name
 * - Animated horizontal progress bar
 * - Subtle hover lift
 */
export default function AnimatedEventTypeCard({ type, count, total, index }) {
  const cfg = getEventConfig(type);
  const Icon = cfg.icon;
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const num = useCounter(count, 900 + index * 70);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.2 } }}
      className="relative overflow-hidden rounded-3xl bg-white cursor-default group"
      style={{
        border: `1px solid ${hexA(cfg.fg, 0.15)}`,
        boxShadow: `0 8px 28px -12px ${hexA(cfg.fg, 0.35)}, 0 2px 6px rgba(15,23,42,0.05)`,
        padding: "22px",
      }}
      data-testid={`event-type-card-${type.replace(/\s+/g, "-").toLowerCase()}`}
    >
      {/* Corner color accent glow */}
      <motion.div
        className="absolute -right-16 -top-16 w-40 h-40 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, ${hexA(cfg.fg, 0.28)}, transparent 70%)`,
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut", delay: index * 0.3 }}
      />

      {/* Top center pill accent */}
      <div
        className="absolute left-1/2 -translate-x-1/2 top-2 h-1.5 w-14 rounded-full"
        style={{ background: `linear-gradient(90deg, ${cfg.fg}, ${hexA(cfg.fg, 0.4)})` }}
      />

      <div className="relative z-10">
        {/* Header row: icon + type name */}
        <div className="flex items-center gap-3 mb-4">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 14, delay: 0.1 + index * 0.07 }}
            whileHover={{ rotate: [0, -8, 8, 0], transition: { duration: 0.5 } }}
            className="relative w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${cfg.fg}, ${hexA(cfg.fg, 0.75)})`,
              boxShadow: `0 6px 16px -4px ${hexA(cfg.fg, 0.5)}`,
            }}
          >
            <Icon size={20} className="text-white relative" strokeWidth={2.1} />
          </motion.div>
          <p
            className="text-base font-black text-slate-900 leading-tight flex-1 truncate"
            style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
            title={type}
          >
            {type}
          </p>
        </div>

        {/* Big number */}
        <div className="flex items-baseline gap-2 mb-3">
          <motion.p
            className="text-5xl font-black tracking-tight leading-none text-slate-900"
            style={{ fontFamily: "Cabinet Grotesk, sans-serif", paddingBottom: "0.1em" }}
          >
            {num}
          </motion.p>
          <span className="text-sm font-bold text-slate-400">
            / {total}
          </span>
          <span
            className="ml-auto text-xs font-black px-2.5 py-1 rounded-full"
            style={{
              background: hexA(cfg.fg, 0.12),
              color: cfg.fg,
            }}
          >
            {pct}%
          </span>
        </div>

        {/* Horizontal progress bar */}
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{ background: hexA(cfg.fg, 0.12) }}
        >
          <motion.div
            className="h-full rounded-full relative overflow-hidden"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 + index * 0.07 }}
            style={{
              background: `linear-gradient(90deg, ${cfg.fg}, ${hexA(cfg.fg, 0.7)})`,
            }}
          >
            {/* Shine sweep across the bar */}
            <motion.div
              className="absolute inset-y-0 w-1/2"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)",
              }}
              animate={{ x: ["-100%", "220%"] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 1 + index * 0.2 }}
            />
          </motion.div>
        </div>

        {/* Subtitle */}
        <p className="text-[11px] text-slate-500 font-semibold mt-2 uppercase tracking-wider">
          {count === 1 ? "reserva" : "reservas"}
        </p>
      </div>
    </motion.div>
  );
}
