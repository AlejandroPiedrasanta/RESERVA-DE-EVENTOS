import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { getMetasProgress, upsertMeta } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Target, TrendingUp, Wallet, DollarSign, Trophy, Flame, ChevronLeft, ChevronRight, Sparkles, Rocket, Star, X, Edit3, Check, Award, Plane, Car, Home, Globe, ImagePlus, Upload, Camera, Trash2, Zap } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import { celebrateGoalReached, fireConfetti, triggerSidebarSweep } from "@/lib/celebrations";
import PageHeader from "@/components/PageHeader";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const MONTHS_SHORT = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];

const TYPES = [
  { key: "ventas",     label: "Ventas Totales",  icon: DollarSign, grad: "from-emerald-400 via-emerald-500 to-teal-600",  ring: "ring-emerald-400/60",  accent: "emerald", desc: "Total facturado" },
  { key: "ganancias",  label: "Ganancias Reales", icon: TrendingUp, grad: "from-indigo-400 via-purple-500 to-fuchsia-600", ring: "ring-purple-400/60",  accent: "purple",  desc: "Ventas menos gastos" },
  { key: "gastos",     label: "Gastos",           icon: Wallet,     grad: "from-amber-400 via-orange-500 to-rose-500",     ring: "ring-orange-400/60",  accent: "orange",  desc: "Pagos a socios y más" },
];

const MOTIVATIONAL_MILESTONES = [
  { pct: 25,  msg: "¡Vas por buen camino! 🚀",         emoji: "🚀" },
  { pct: 50,  msg: "¡A mitad del sueño! 💪",           emoji: "💪" },
  { pct: 75,  msg: "¡Casi lo logras, no aflojes! 🔥",  emoji: "🔥" },
  { pct: 100, msg: "¡META ALCANZADA! 🏆",              emoji: "🏆" },
];

// Badges por racha consecutiva de meses cumplidos
const STREAK_BADGES = [
  { min: 3,  label: "En Llamas",    grad: "from-orange-400 via-red-500 to-pink-600",     glow: "rgba(249,115,22,0.55)",  emoji: "🔥" },
  { min: 6,  label: "Imparable",    grad: "from-fuchsia-500 via-purple-600 to-indigo-600", glow: "rgba(168,85,247,0.55)",  emoji: "⚡" },
  { min: 9,  label: "Leyenda",      grad: "from-amber-400 via-orange-500 to-red-600",    glow: "rgba(251,191,36,0.6)",   emoji: "👑" },
  { min: 12, label: "Año Perfecto", grad: "from-yellow-300 via-amber-400 to-emerald-500", glow: "rgba(52,211,153,0.6)",   emoji: "💎" },
];

// Calcula rachas a partir del array de meses
function computeStreaks(months) {
  const reached = months.map(m => !!m.reached);
  let best = 0, cur = 0, currentActive = 0;
  reached.forEach(r => {
    if (r) { cur += 1; best = Math.max(best, cur); }
    else { cur = 0; }
  });
  // Racha activa: cuenta desde el último mes hacia atrás mientras `reached` sea true
  for (let i = reached.length - 1; i >= 0; i--) {
    if (reached[i]) currentActive += 1;
    else break;
  }
  const total = reached.filter(Boolean).length;
  return { best, current: currentActive, total };
}

function getBadgeForStreak(n) {
  let b = null;
  STREAK_BADGES.forEach(item => { if (n >= item.min) b = item; });
  return b;
}

function StreakCard({ streak, formatCurrency }) {
  const { best, current, total } = streak;
  const showFor = Math.max(best, current);
  const badge = getBadgeForStreak(showFor);
  const flames = Math.min(5, Math.max(0, Math.ceil(showFor / 2)));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.15, duration: 0.4 }}
      className="relative overflow-hidden rounded-3xl p-5 shadow-lg"
      style={{
        background: badge
          ? `linear-gradient(135deg, rgba(255,255,255,0.92), rgba(255,255,255,0.7))`
          : "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))",
        backdropFilter: "blur(20px)",
        border: badge ? `1.5px solid ${badge.glow}` : "1px solid rgba(255,255,255,0.6)",
        boxShadow: badge ? `0 12px 40px ${badge.glow}, 0 4px 16px rgba(0,0,0,0.06)` : undefined,
      }}
      data-testid="streak-card"
    >
      {/* Fondo animado si hay badge */}
      {badge && (
        <motion.div
          className="absolute inset-0 opacity-25 pointer-events-none"
          animate={{ opacity: [0.15, 0.35, 0.15] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className={`w-full h-full bg-gradient-to-br ${badge.grad}`} />
        </motion.div>
      )}

      <div className="relative flex items-center gap-4">
        {/* Icono principal con llamas animadas */}
        <div className="relative shrink-0">
          <motion.div
            animate={badge
              ? { scale: [1, 1.12, 1], rotate: [0, -6, 6, 0] }
              : { scale: [1, 1.04, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
              badge ? `bg-gradient-to-br ${badge.grad}` : "bg-gradient-to-br from-slate-300 to-slate-400"
            }`}
          >
            <Flame size={28} className="text-white" strokeWidth={2.2} fill={badge ? "white" : "none"} />
          </motion.div>
          {/* Chispas orbitando */}
          {badge && (
            <>
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.9)]"
                  animate={{
                    x: [Math.cos((i / 3) * Math.PI * 2) * 30, Math.cos(((i / 3) * Math.PI * 2) + Math.PI * 2) * 30],
                    y: [Math.sin((i / 3) * Math.PI * 2) * 30, Math.sin(((i / 3) * Math.PI * 2) + Math.PI * 2) * 30],
                    opacity: [0.4, 1, 0.4],
                  }}
                  transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: "linear" }}
                />
              ))}
            </>
          )}
        </div>

        {/* Texto principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Racha consecutiva</p>
            {badge && (
              <motion.span
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", damping: 10, stiffness: 200 }}
                className={`inline-flex items-center gap-1 bg-gradient-to-r ${badge.grad} text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md`}
              >
                <span>{badge.emoji}</span>{badge.label}
              </motion.span>
            )}
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <motion.p
              key={current}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 12, stiffness: 200 }}
              className="text-4xl font-black text-slate-900 tracking-tight leading-none"
              style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
              data-testid="streak-current"
            >
              {current}
            </motion.p>
            <span className="text-sm font-bold text-slate-500">
              {current === 1 ? "mes seguido" : "meses seguidos"}
            </span>
            {/* Llamas visuales */}
            <div className="flex items-center gap-0.5 ml-1">
              {[...Array(flames)].map((_, i) => (
                <motion.span
                  key={i}
                  className="text-lg"
                  animate={{ y: [0, -3, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 1 + i * 0.15, repeat: Infinity, delay: i * 0.1 }}
                >
                  🔥
                </motion.span>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            Mejor racha del año: <span className="font-black text-slate-700" data-testid="streak-best">{best}</span>
            <span className="mx-1.5 text-slate-300">·</span>
            {total} de 12 conquistados
          </p>
        </div>

        {/* Award/trofeo si racha ≥ 3 */}
        {badge && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 10, delay: 0.2 }}
            className="hidden sm:flex shrink-0 w-14 h-14 rounded-2xl items-center justify-center shadow-lg"
            style={{ background: `linear-gradient(135deg, ${badge.glow.replace("0.55","0.9").replace("0.6","0.9")}, rgba(255,255,255,0.4))` }}
          >
            <Award size={26} className="text-white" fill="rgba(255,255,255,0.3)" strokeWidth={2.2} />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function useCountUp(target, duration = 900) {
  const [val, setVal] = useState(target || 0);
  const raf = useRef();
  const prev = useRef(target || 0);
  useEffect(() => {
    const start = performance.now();
    const from = prev.current;
    const to = target || 0;
    const step = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = from + (to - from) * eased;
      setVal(v);
      if (p < 1) raf.current = requestAnimationFrame(step);
      else prev.current = to;
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return val;
}

function GoalReachedModal({ open, onClose, type, monthLabel, amount, formatCurrency }) {
  const typeCfg = TYPES.find(t => t.key === type) || TYPES[0];
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          data-testid="goal-reached-modal"
        >
          <motion.div
            className="absolute inset-0"
            style={{ background: "radial-gradient(circle at center, rgba(16,185,129,0.35) 0%, rgba(0,0,0,0.7) 70%)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.4, rotate: -12, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: "spring", damping: 12, stiffness: 160 }}
            className="relative max-w-md w-full rounded-3xl overflow-hidden shadow-2xl"
            style={{
              background: "linear-gradient(135deg, #064e3b 0%, #065f46 40%, #0f766e 100%)",
              border: "2px solid rgba(52,211,153,0.7)",
            }}
          >
            {/* Rays background */}
            <motion.div
              className="absolute inset-0 pointer-events-none opacity-40"
              style={{
                background: "conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(251,191,36,0.6) 20deg, transparent 40deg, transparent 80deg, rgba(52,211,153,0.5) 100deg, transparent 120deg, transparent 160deg, rgba(251,191,36,0.6) 180deg, transparent 200deg, transparent 240deg, rgba(52,211,153,0.5) 260deg, transparent 280deg, transparent 320deg, rgba(251,191,36,0.6) 340deg, transparent 360deg)"
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            />
            <div className="relative p-8 text-center">
              <motion.div
                animate={{ scale: [1, 1.15, 1], rotate: [0, -5, 5, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                className="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center shadow-2xl"
                style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b, #ea580c)" }}
              >
                <Trophy size={54} className="text-white" strokeWidth={2} />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="text-4xl font-black text-white tracking-tight mb-2"
                style={{ fontFamily: "Cabinet Grotesk, sans-serif", textShadow: "0 4px 20px rgba(251,191,36,0.5)" }}
              >
                ¡LO LOGRASTE!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                className="text-emerald-100/90 text-sm font-bold uppercase tracking-widest mb-4"
              >
                Meta de {monthLabel} · {typeCfg.label}
              </motion.p>
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: "spring", damping: 10 }}
                className="inline-flex items-center gap-2 bg-emerald-950/50 border border-emerald-300/40 rounded-2xl px-5 py-3 mb-6"
              >
                <Sparkles size={16} className="text-amber-300" />
                <span className="text-3xl font-black text-white" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                  {formatCurrency(amount)}
                </span>
                <Sparkles size={16} className="text-amber-300" />
              </motion.div>
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="text-emerald-100/80 text-sm font-medium mb-6 max-w-xs mx-auto"
              >
                Cada meta alcanzada te acerca a algo más grande. ¡Sigue así!
              </motion.p>
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={onClose}
                data-testid="goal-modal-close-btn"
                className="px-6 py-3 rounded-full bg-white text-emerald-700 font-black text-sm shadow-lg hover:shadow-xl transition-shadow"
              >
                Seguir conquistando →
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function MilestoneToast({ milestone, onDone }) {
  useEffect(() => {
    if (!milestone) return;
    const t = setTimeout(() => onDone(), 2600);
    return () => clearTimeout(t);
  }, [milestone, onDone]);
  return createPortal(
    <AnimatePresence>
      {milestone && (
        <motion.div
          initial={{ y: -80, opacity: 0, scale: 0.7 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: "spring", damping: 14, stiffness: 200 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[9998] pointer-events-none"
          data-testid="milestone-toast"
        >
          <div className="flex items-center gap-3 px-5 py-3 rounded-full shadow-2xl border-2 border-white/40 backdrop-blur-xl"
               style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.95), rgba(236,72,153,0.95))" }}>
            <span className="text-2xl">{milestone.emoji}</span>
            <span className="text-white font-black text-sm tracking-wide">{milestone.msg}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function MonthCard({ month, data, type, index, formatCurrency, onSave, celebrated, onCelebrate, isPast, isCurrent, mode }) {
  const [editing, setEditing]     = useState(false);
  const [draft, setDraft]         = useState(String(data.goal || ""));
  const [saving, setSaving]       = useState(false);
  const typeCfg = TYPES.find(t => t.key === type) || TYPES[0];
  const pct = Math.min(100, data.percent || 0);
  const reached = data.reached;
  const animPct = useCountUp(pct, 700);
  const isGastos = mode === "gastos";

  useEffect(() => { setDraft(String(data.goal || "")); }, [data.goal]);

  // Fire celebration once per month achievement (no aplica a gastos: no hay meta objetivo)
  useEffect(() => {
    if (isGastos) return;
    if (reached && !celebrated) {
      onCelebrate(month, data.actual);
    }
  }, [reached, celebrated, month, data.actual, onCelebrate, isGastos]);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(month, parseFloat(draft) || 0);
      setEditing(false);
    } finally { setSaving(false); }
  };

  const clearCustom = async () => {
    setSaving(true);
    try {
      await onSave(month, 0);
      setEditing(false);
    } finally { setSaving(false); }
  };

  const barColor = reached
    ? "linear-gradient(90deg,#10b981,#34d399,#fbbf24)"
    : pct >= 75 ? "linear-gradient(90deg,#f59e0b,#f97316,#ec4899)"
    : pct >= 50 ? "linear-gradient(90deg,#8b5cf6,#a78bfa,#ec4899)"
    : pct >= 25 ? "linear-gradient(90deg,#3b82f6,#8b5cf6)"
    : "linear-gradient(90deg,#94a3b8,#cbd5e1)";

  // Barra visual para gastos: proceso continuo (proporcional al mayor gasto del año, pasado por prop indirectamente via data.percent que viene 0 sin meta).
  // Para no depender del backend, usamos un tinte fijo para gastos.
  const gastosBar = "linear-gradient(90deg,#f59e0b,#f97316,#ef4444)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 22, scale: 0.94 }}
      animate={{ opacity: isPast ? 0.5 : 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, scale: 1.015, opacity: 1 }}
      data-testid={`meta-month-${month}`}
      className={`relative glass rounded-3xl p-4 overflow-hidden transition-all ${reached ? `ring-2 ${typeCfg.ring} shadow-lg` : ""} ${isCurrent ? "ring-2 ring-indigo-300/70 shadow-md" : ""}`}
    >
      {/* Reached shine (no aplica en gastos) */}
      {!isGastos && reached && (
        <motion.div
          className="absolute inset-0 pointer-events-none opacity-40"
          animate={{ background: [
            "linear-gradient(120deg, transparent 0%, rgba(251,191,36,0.4) 50%, transparent 100%)",
            "linear-gradient(120deg, transparent 100%, rgba(251,191,36,0.4) 150%, transparent 200%)",
          ]}}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
        />
      )}
      <div className="relative flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-9 h-9 rounded-2xl bg-gradient-to-br ${typeCfg.grad} flex items-center justify-center shadow-sm`}>
            <span className="text-[10px] font-black text-white tracking-wider">{MONTHS_SHORT[month - 1]}</span>
          </div>
          <div>
            <p className="text-xs font-black text-slate-900 leading-tight flex items-center gap-1">
              {MONTHS_ES[month - 1]}
              {isCurrent && (
                <span className="text-[8px] font-black uppercase tracking-wider bg-indigo-500 text-white rounded-full px-1.5 py-0.5">Hoy</span>
              )}
            </p>
            {isGastos ? (
              <p className="text-[10px] text-slate-400 font-medium">
                {isPast ? "mes cerrado" : isCurrent ? "en curso" : "próximo"}
              </p>
            ) : (
              <p className="text-[10px] text-slate-400 font-medium">{Math.round(animPct)}% completado</p>
            )}
          </div>
        </div>
        {!isGastos && reached && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", damping: 10 }}
            className="flex items-center gap-1 bg-emerald-100 border border-emerald-300/70 rounded-full px-2 py-0.5"
          >
            <Trophy size={10} className="text-emerald-700" />
            <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider">Meta!</span>
          </motion.div>
        )}
        {!isGastos && !reached && data.is_auto && (
          <span className="text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 rounded-full px-2 py-0.5" title="Meta derivada del objetivo anual / 12">
            auto
          </span>
        )}
        {!isGastos && data.is_custom && !reached && (
          <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-600 rounded-full px-2 py-0.5">
            custom
          </span>
        )}
      </div>

      {/* Progress bar */}
      {isGastos ? (
        <div className="relative h-2.5 bg-slate-200/60 rounded-full overflow-hidden mb-3">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ background: gastosBar }}
            initial={{ width: 0 }}
            animate={{ width: data.actual > 0 ? "100%" : "0%" }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: index * 0.04 + 0.15 }}
          />
        </div>
      ) : (
        <div className="relative h-2.5 bg-slate-200/60 rounded-full overflow-hidden mb-3">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ background: barColor, boxShadow: reached ? "0 0 12px rgba(52,211,153,0.6)" : "none" }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, pct)}%` }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: index * 0.04 + 0.15 }}
          />
          {reached && (
            <motion.div
              className="absolute inset-y-0 w-8 rounded-full pointer-events-none"
              style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.9),transparent)" }}
              animate={{ x: ["-100%", "1200%"] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
            />
          )}
        </div>
      )}

      {/* Values */}
      {isGastos ? (
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Gastado este mes</p>
          <p className="text-lg font-black text-orange-600" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }} data-testid={`meta-actual-${month}`}>
            {formatCurrency(data.actual)}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 mb-1">
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Real</p>
            <p className={`text-sm font-black ${reached ? "text-emerald-600" : "text-slate-800"}`} style={{ fontFamily: "Cabinet Grotesk, sans-serif" }} data-testid={`meta-actual-${month}`}>
              {formatCurrency(data.actual)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Meta {data.is_auto ? "· auto" : data.is_custom ? "· custom" : ""}</p>
            {editing ? (
              <div className="flex items-center gap-1 justify-end">
                <input
                  type="number"
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
                  data-testid={`meta-input-${month}`}
                  min="0" step="0.01"
                  className="w-24 text-right bg-white border border-indigo-300 rounded-lg px-2 py-1 text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <button onClick={save} disabled={saving} data-testid={`meta-save-${month}`}
                        className="p-1 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-40">
                  <Check size={11} />
                </button>
                {data.is_custom && (
                  <button onClick={clearCustom} disabled={saving} data-testid={`meta-clear-${month}`} title="Restaurar auto (anual/12)"
                          className="p-1 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors disabled:opacity-40">
                    <X size={11} />
                  </button>
                )}
              </div>
            ) : (
              <button onClick={() => setEditing(true)} data-testid={`meta-edit-${month}`}
                      className="group inline-flex items-center gap-1 text-sm font-black text-slate-700 hover:text-indigo-600 transition-colors"
                      style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                {data.goal > 0 ? formatCurrency(data.goal) : "— establecer —"}
                <Edit3 size={9} className="opacity-40 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ============================================================
 * GoalDreamImage — Carrusel de imágenes de metas con transform editor
 *
 * Features:
 *  · Múltiples imágenes, cualquier formato (PNG/WebP/GIF/JPG con alpha).
 *  · Auto-rotación tipo carrusel con intervalo configurable.
 *  · Al click sobre la imagen: abre modal para subir/reordenar/eliminar,
 *    ajustar intervalo, y modificar tamaño, posición y rotación por imagen.
 *  · Persiste todo en localStorage por año+tipo.
 * ============================================================ */
function GoalDreamImage({ year, type }) {
  const LS_KEY = `cp:metas:dreamImageV2:${type}:${year}`;
  const DEFAULT_STATE = { images: [], intervalSec: 5 };

  const [state, setState] = useState(DEFAULT_STATE);
  const [idx, setIdx] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  // Cargar / migrar
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setState({
          images: Array.isArray(parsed.images) ? parsed.images : [],
          intervalSec: Number(parsed.intervalSec) > 0 ? Number(parsed.intervalSec) : 5,
        });
      } else {
        // Migración desde versión previa (una sola imagen)
        const legacyKey = `cp:metas:dreamImage:${type}:${year}`;
        const legacy = localStorage.getItem(legacyKey);
        if (legacy) {
          setState({
            images: [{ id: cryptoId(), src: legacy, scale: 1, x: 0, y: 0, rotation: 0 }],
            intervalSec: 5,
          });
        } else {
          setState(DEFAULT_STATE);
        }
      }
      setIdx(0);
    } catch { setState(DEFAULT_STATE); }
  }, [LS_KEY]);

  const persist = (newState) => {
    setState(newState);
    try { localStorage.setItem(LS_KEY, JSON.stringify(newState)); }
    catch { /* quota; ignore */ }
  };

  // Auto-carrusel
  useEffect(() => {
    if (state.images.length < 2) return;
    const ms = Math.max(1, state.intervalSec) * 1000;
    const t = setInterval(() => setIdx(i => (i + 1) % state.images.length), ms);
    return () => clearInterval(t);
  }, [state.images.length, state.intervalSec]);

  const current = state.images[idx] || null;

  return (
    <>
      <div
        className="relative w-full sm:w-48 md:w-52 lg:w-56 aspect-[4/5] flex-shrink-0 cursor-pointer group"
        onClick={() => setModalOpen(true)}
        data-testid="goal-dream-image"
        title={current ? "Editar imágenes de meta" : "Subir imagen de meta"}
      >
        <AnimatePresence mode="wait">
          {current ? (
            <motion.img
              key={current.id + "-" + idx}
              src={current.src}
              alt="Meta"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
              draggable={false}
              style={{
                transform: `translate(${current.x || 0}px, ${current.y || 0}px) rotate(${current.rotation || 0}deg) scale(${current.scale || 1})`,
                transformOrigin: "center center",
              }}
              initial={{ opacity: 0, scale: (current.scale || 1) * 0.92 }}
              animate={{
                opacity: 1,
                y: [current.y || 0, (current.y || 0) - 4, current.y || 0],
              }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: { duration: 0.6, ease: "easeOut" },
                y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
              }}
              data-testid="goal-image-preview"
            />
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 group-hover:text-slate-400 transition-colors"
              data-testid="goal-image-empty"
            >
              <motion.div
                animate={{ y: [0, -4, 0], rotate: [0, 3, -3, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <ImagePlus size={32} strokeWidth={1.5} />
              </motion.div>
              <p className="text-[10px] font-bold uppercase tracking-widest mt-2">Imagen de tu meta</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contador discreto abajo si hay >1 imagen */}
        {state.images.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1 pb-1">
            {state.images.map((_, i) => (
              <span
                key={i}
                className="h-1 rounded-full transition-all"
                style={{
                  width: i === idx ? 14 : 4,
                  background: i === idx ? "rgba(15,23,42,0.7)" : "rgba(148,163,184,0.5)",
                }}
              />
            ))}
          </div>
        )}
      </div>

      <GoalImageModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        state={state}
        onChange={persist}
        activeIdx={idx}
        setActiveIdx={setIdx}
      />
    </>
  );
}

// Helper: id compacto sin dependencias
function cryptoId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// Convierte un File a dataURL preservando transparencia (PNG/WebP/GIF/SVG)
// y limitando dimensiones para no reventar localStorage.
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("no file"));
    const mime = (file.type || "").toLowerCase();
    const isGifOrSvg = /gif|svg/i.test(mime);
    // JPEG es el ÚNICO formato común sin alpha. Todo lo demás → tratamos como transparente.
    const isJpeg = /jpe?g/i.test(mime);

    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (ev) => {
      const rawDataUrl = ev.target.result;
      // GIF/SVG: no procesar (perdería animación/vector). Devolver original.
      if (isGifOrSvg) { resolve(rawDataUrl); return; }

      // Si el archivo es pequeño (< 1.5 MB), no recodificar → conserva alpha y calidad exactos.
      const SMALL_LIMIT = 1.5 * 1024 * 1024;
      if (file.size && file.size <= SMALL_LIMIT) {
        resolve(rawDataUrl);
        return;
      }

      // Redimensionar para archivos grandes.
      const img = new Image();
      img.onload = () => {
        const maxDim = 900;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round(height * (maxDim / width)); width = maxDim; }
          else                { width  = Math.round(width  * (maxDim / height)); height = maxDim; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        // alpha:true (default) — pero lo hacemos explícito por seguridad
        const ctx = canvas.getContext("2d", { alpha: true });
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        // Todo lo que NO sea JPEG explícito → PNG (preserva alpha)
        const out = isJpeg
          ? canvas.toDataURL("image/jpeg", 0.85)
          : canvas.toDataURL("image/png");
        resolve(out);
      };
      img.onerror = () => resolve(rawDataUrl); // fallback: dataURL crudo
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/* ============================================================
 * GoalImageModal — editor completo (upload/reorder/remove + transform)
 * ============================================================ */
function GoalImageModal({ open, onClose, state, onChange, activeIdx, setActiveIdx }) {
  const fileInputRef = useRef(null);
  const [selectedIdx, setSelectedIdx] = useState(activeIdx);

  useEffect(() => { if (open) setSelectedIdx(activeIdx); }, [open, activeIdx]);

  const selected = state.images[selectedIdx] || null;

  const updateSelected = (patch) => {
    if (!selected) return;
    const images = state.images.map((im, i) => i === selectedIdx ? { ...im, ...patch } : im);
    onChange({ ...state, images });
  };

  const setInterval_ = (v) => onChange({ ...state, intervalSec: Math.max(1, Math.min(60, v)) });

  const handleFiles = async (files) => {
    const arr = Array.from(files || []);
    if (!arr.length) return;
    const newOnes = [];
    for (const f of arr) {
      if (!f.type.startsWith("image/")) continue;
      try {
        const src = await fileToDataUrl(f);
        newOnes.push({ id: cryptoId(), src, scale: 1, x: 0, y: 0, rotation: 0 });
      } catch { /* skip */ }
    }
    if (!newOnes.length) return;
    const images = [...state.images, ...newOnes];
    onChange({ ...state, images });
    setSelectedIdx(images.length - newOnes.length); // seleccionar la primera nueva
  };

  const onPick = (e) => {
    handleFiles(e.target.files);
    e.target.value = "";
  };

  const removeImage = (i) => {
    const images = state.images.filter((_, j) => j !== i);
    onChange({ ...state, images });
    if (activeIdx >= images.length) setActiveIdx(Math.max(0, images.length - 1));
    setSelectedIdx(Math.max(0, Math.min(selectedIdx, images.length - 1)));
  };

  const moveImage = (from, to) => {
    if (to < 0 || to >= state.images.length) return;
    const images = [...state.images];
    const [item] = images.splice(from, 1);
    images.splice(to, 0, item);
    onChange({ ...state, images });
    setSelectedIdx(to);
  };

  const resetTransform = () => updateSelected({ scale: 1, x: 0, y: 0, rotation: 0 });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose?.()}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[92vh] overflow-hidden p-0 bg-white/95 backdrop-blur-xl border border-white/60 rounded-3xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 via-white to-fuchsia-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md" style={{ background: "linear-gradient(135deg,#8b5cf6,#ec4899)" }}>
              <ImagePlus size={18} className="text-white" strokeWidth={2.2} />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-slate-900" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                Imágenes de tu meta
              </DialogTitle>
              <p className="text-xs text-slate-500 font-semibold">Sube, ordena y edita tamaño, posición y rotación</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
            data-testid="goal-modal-close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-0 max-h-[calc(92vh-72px)] overflow-hidden">
          {/* Preview + transform controls */}
          <div className="p-5 flex flex-col gap-4 overflow-y-auto">
            <div
              className="relative w-full aspect-[4/5] max-h-[420px] mx-auto rounded-2xl overflow-hidden"
              style={{
                background:
                  "repeating-conic-gradient(#f1f5f9 0% 25%, #ffffff 0% 50%) 50% / 22px 22px",
                border: "1px solid rgba(148,163,184,0.25)",
              }}
              data-testid="goal-modal-preview"
            >
              {selected ? (
                <img
                  key={selected.id}
                  src={selected.src}
                  alt="Preview"
                  className="absolute inset-0 w-full h-full object-contain select-none pointer-events-none"
                  draggable={false}
                  style={{
                    transform: `translate(${selected.x || 0}px, ${selected.y || 0}px) rotate(${selected.rotation || 0}deg) scale(${selected.scale || 1})`,
                    transformOrigin: "center center",
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                  <ImagePlus size={40} strokeWidth={1.4} />
                  <p className="text-xs font-bold mt-2">Sube tu primera imagen</p>
                </div>
              )}
            </div>

            {/* Transform controls */}
            {selected && (
              <div className="space-y-3">
                <TransformSlider
                  label="Tamaño"
                  value={selected.scale || 1}
                  min={0.3} max={3} step={0.02}
                  onChange={(v) => updateSelected({ scale: v })}
                  display={`${Math.round((selected.scale || 1) * 100)}%`}
                  testId="tr-scale"
                />
                <TransformSlider
                  label="Rotación"
                  value={selected.rotation || 0}
                  min={-180} max={180} step={1}
                  onChange={(v) => updateSelected({ rotation: v })}
                  display={`${Math.round(selected.rotation || 0)}°`}
                  testId="tr-rot"
                />
                <div className="grid grid-cols-2 gap-3">
                  <TransformSlider
                    label="Posición X"
                    value={selected.x || 0}
                    min={-120} max={120} step={1}
                    onChange={(v) => updateSelected({ x: v })}
                    display={`${Math.round(selected.x || 0)}`}
                    testId="tr-x"
                  />
                  <TransformSlider
                    label="Posición Y"
                    value={selected.y || 0}
                    min={-120} max={120} step={1}
                    onChange={(v) => updateSelected({ y: v })}
                    display={`${Math.round(selected.y || 0)}`}
                    testId="tr-y"
                  />
                </div>
                <button
                  onClick={resetTransform}
                  className="text-[11px] font-black uppercase tracking-wider text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1"
                  data-testid="tr-reset"
                >
                  <X size={11} /> Restablecer transformación
                </button>
              </div>
            )}

            {/* Intervalo del carrusel */}
            <div className="pt-2 border-t border-slate-100">
              <TransformSlider
                label={`Intervalo del carrusel · ${state.intervalSec}s`}
                value={state.intervalSec}
                min={1} max={30} step={1}
                onChange={(v) => setInterval_(v)}
                display={`${state.intervalSec}s`}
                testId="tr-interval"
                icon={Zap}
              />
              <p className="text-[10px] text-slate-400 font-semibold mt-1">
                Con {state.images.length < 2 ? "1 imagen no rota" : "2+ imágenes rota automáticamente"}
              </p>
            </div>
          </div>

          {/* Lista de imágenes */}
          <div className="border-t md:border-t-0 md:border-l border-slate-100 bg-slate-50/60 p-4 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Galería · {state.images.length}
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-black text-white px-3 py-1.5 rounded-full shadow-md hover:shadow-lg transition-all flex items-center gap-1.5"
                style={{ background: "linear-gradient(135deg,#8b5cf6,#ec4899)" }}
                data-testid="goal-modal-upload"
              >
                <Upload size={11} strokeWidth={2.6} />
                Subir
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={onPick}
                data-testid="goal-modal-file-input"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {state.images.length === 0 && (
                <div className="text-center py-10 text-slate-400 text-xs font-semibold">
                  Aún no tienes imágenes.<br/>Sube una para empezar.
                </div>
              )}
              {state.images.map((im, i) => (
                <div
                  key={im.id}
                  onClick={() => setSelectedIdx(i)}
                  className={`relative group flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all ${
                    i === selectedIdx
                      ? "bg-white shadow-md border border-indigo-200"
                      : "bg-white/60 hover:bg-white border border-transparent"
                  }`}
                  data-testid={`goal-modal-thumb-${i}`}
                >
                  <div
                    className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0"
                    style={{
                      background:
                        "repeating-conic-gradient(#e2e8f0 0% 25%, #f8fafc 0% 50%) 50% / 8px 8px",
                    }}
                  >
                    <img src={im.src} alt="" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-slate-700">#{i + 1}</p>
                    <p className="text-[10px] text-slate-400 font-semibold truncate">
                      {Math.round((im.scale || 1) * 100)}% · {Math.round(im.rotation || 0)}°
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); moveImage(i, i - 1); }}
                      className="w-6 h-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500"
                      title="Subir"
                    >
                      <ChevronLeft size={12} className="-rotate-90" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); moveImage(i, i + 1); }}
                      className="w-6 h-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-500"
                      title="Bajar"
                    >
                      <ChevronRight size={12} className="rotate-90" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                      className="w-6 h-6 rounded-md hover:bg-rose-50 flex items-center justify-center text-rose-500"
                      title="Eliminar"
                      data-testid={`goal-modal-remove-${i}`}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Slider con etiqueta + valor mostrado
function TransformSlider({ label, value, min, max, step, onChange, display, testId, icon: Icon }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-1">
          {Icon && <Icon size={10} strokeWidth={2.6} className="text-indigo-500" />}
          {label}
        </p>
        <p className="text-[11px] font-black text-slate-900 tabular-nums" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
          {display}
        </p>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        data-testid={testId}
      />
    </div>
  );
}

export default function Metas() {
  const now = new Date();
  const [year,    setYear]    = useState(now.getFullYear());
  const [type,    setType]    = useState("ventas");
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [annualDraft, setAnnualDraft] = useState("");
  const [annualEditing, setAnnualEditing] = useState(false);
  const [savingAnnual, setSavingAnnual]  = useState(false);
  const [modal,        setModal]         = useState(null); // { monthLabel, amount }
  const [milestone,    setMilestone]     = useState(null);
  // ── Persistencia entre sesiones (localStorage) ────────────────────────────
  // Guarda qué celebraciones ya se dispararon "para siempre" en este dispositivo.
  const LS_KEY = "cp:metas:celebrated:v1";
  const loadCelebratedLS = () => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch { return new Set(); }
  };
  const saveCelebratedLS = (set) => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(Array.from(set))); } catch { /* noop */ }
  };
  const persistedRef = useRef(loadCelebratedLS());
  const markCelebrated = (key) => {
    persistedRef.current.add(key);
    saveCelebratedLS(persistedRef.current);
  };
  const isCelebrated  = (key) => persistedRef.current.has(key);

  const celebratedRef      = useRef(new Set()); // meses ya celebrados en esta sesión
  const milestonesShownRef = useRef(new Set()); // hitos anuales mostrados
  const streakBadgeRef     = useRef(new Set()); // badges de racha mostrados
  const { formatCurrency } = useSettings();
  const { toast } = useToast();

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const p = await getMetasProgress(year, type);

      // Siembra: cualquier meta YA cumplida al cargar, la marcamos como
      // "no debe celebrarse". Cubre tanto sesiones nuevas como recargas.
      (p.months || []).forEach(m => {
        if (m.reached) celebratedRef.current.add(`${type}-${year}-${m.month}`);
      });
      if (p.annual_reached) {
        celebratedRef.current.add(`${type}-${year}-annual-reached`);
      }
      const initialPct = Math.min(100, p.annual_percent || 0);
      MOTIVATIONAL_MILESTONES.forEach(m => {
        if (initialPct >= m.pct) milestonesShownRef.current.add(`${type}-${year}-${m.pct}`);
      });
      const streak = computeStreaks(p.months || []);
      const badge = getBadgeForStreak(streak.best);
      if (badge) streakBadgeRef.current.add(`${type}-${year}-badge-${badge.min}`);

      setData(p);
      setAnnualDraft(String(p.annual_goal_explicit || ""));
    } catch (e) {
      console.error(e);
      toast({ title: "Error al cargar metas", variant: "destructive" });
    } finally { if (!silent) setLoading(false); }
  }, [year, type, toast]);

  useEffect(() => {
    celebratedRef.current      = new Set();
    milestonesShownRef.current = new Set();
    streakBadgeRef.current     = new Set();
    load();
  }, [year, type, load]);

  const typeCfg = TYPES.find(t => t.key === type) || TYPES[0];
  const annualPct = Math.min(100, data?.annual_percent || 0);
  const animAnnualPct = useCountUp(annualPct, 1100);
  const animAnnualVal = useCountUp(data?.annual_actual || 0, 1100);

  // Track annual milestones
  useEffect(() => {
    if (!data) return;
    if (type === "gastos") return; // Gastos: sin celebraciones ni milestones
    MOTIVATIONAL_MILESTONES.forEach(m => {
      const key = `${type}-${year}-${m.pct}`;
      if (annualPct >= m.pct && !milestonesShownRef.current.has(key) && !isCelebrated(key)) {
        milestonesShownRef.current.add(key);
        markCelebrated(key);
        // Only pop the toast (not the ones triggered instantly on first load if already reached)
        if (m.pct < 100) {
          setMilestone(m);
        }
      }
    });
    // Annual meta reached (full 100%)
    const annualKey = `${type}-${year}-annual-reached`;
    if (data.annual_reached && !celebratedRef.current.has(annualKey) && !isCelebrated(annualKey)) {
      celebratedRef.current.add(annualKey);
      markCelebrated(annualKey);
      celebrateGoalReached();
      setModal({ monthLabel: `Meta Anual ${year}`, amount: data.annual_actual });
    }
    // Streak badges — celebra al desbloquear un nuevo badge de racha
    const streak = computeStreaks(data.months);
    const badge = getBadgeForStreak(streak.best);
    if (badge) {
      const badgeKey = `${type}-${year}-badge-${badge.min}`;
      if (!streakBadgeRef.current.has(badgeKey) && !isCelebrated(badgeKey)) {
        streakBadgeRef.current.add(badgeKey);
        markCelebrated(badgeKey);
        fireConfetti("payment", { x: 0.5, y: 0.4 });
        triggerSidebarSweep("amber");
        setMilestone({ emoji: badge.emoji, msg: `¡${badge.label}! ${streak.best} meses seguidos` });
      }
    }
  }, [data, annualPct, type, year]);

  const handleSaveMonth = async (month, amount) => {
    try {
      await upsertMeta({ year, month, type, amount });
      toast({ title: `Meta de ${MONTHS_ES[month - 1]} guardada ✓` });
      triggerSidebarSweep(typeCfg.accent === "emerald" ? "emerald" : typeCfg.accent === "purple" ? "purple" : "amber");
      await load({ silent: true });
    } catch { toast({ title: "Error al guardar", variant: "destructive" }); }
  };

  const handleSaveAnnual = async () => {
    setSavingAnnual(true);
    try {
      await upsertMeta({ year, month: null, type, amount: parseFloat(annualDraft) || 0 });
      toast({ title: `Meta anual ${year} guardada ✓` });
      setAnnualEditing(false);
      fireConfetti(typeCfg.accent === "emerald" ? "payment" : "reservation", { x: 0.5, y: 0.3 });
      await load({ silent: true });
    } catch { toast({ title: "Error al guardar", variant: "destructive" }); }
    finally { setSavingAnnual(false); }
  };

  const handleMonthCelebrate = useCallback((month, amount) => {
    const key = `${type}-${year}-${month}`;
    if (celebratedRef.current.has(key)) return;
    if (isCelebrated(key)) { celebratedRef.current.add(key); return; }
    celebratedRef.current.add(key);
    markCelebrated(key);
    // Delay so it doesn't fire during initial paint
    setTimeout(() => {
      celebrateGoalReached();
      setModal({ monthLabel: MONTHS_ES[month - 1], amount });
    }, 250);
  }, [type, year]);

  const reachedCount = data?.months?.filter(m => m.reached).length || 0;
  const totalActual  = data?.months?.reduce((s, m) => s + (m.actual || 0), 0) || 0;
  const isGastos     = type === "gastos";
  const nowDate      = new Date();
  const currentMonth = (year === nowDate.getFullYear()) ? (nowDate.getMonth() + 1) : (year < nowDate.getFullYear() ? 13 : 0);

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto" data-testid="metas-page">
      {/* Header */}
      <PageHeader
        icon={Target}
        title="Metas"
        subtitle={isGastos
          ? `${typeCfg.desc} · Total del año: ${formatCurrency(totalActual)}`
          : `${typeCfg.desc} · ${reachedCount} de 12 meses conquistados`}
        gradient={
          typeCfg.key === "ventas"
            ? "linear-gradient(135deg,#10b981,#14b8a6,#0d9488)"
            : typeCfg.key === "ganancias"
              ? "linear-gradient(135deg,#8b5cf6,#a855f7,#ec4899)"
              : "linear-gradient(135deg,#f59e0b,#f97316,#f43f5e)"
        }
        right={(
          <div className="flex items-center gap-2 glass rounded-full px-2 py-1.5">
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={() => setYear(y => y - 1)} data-testid="year-prev-btn"
              className="p-1.5 rounded-full hover:bg-white/60 transition-colors">
              <ChevronLeft size={14} className="text-slate-600" />
            </motion.button>
            <div className="min-w-[64px] text-center">
              <p className="text-xl font-black text-slate-900 tracking-tight" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }} data-testid="year-display">{year}</p>
            </div>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={() => setYear(y => y + 1)} data-testid="year-next-btn"
              className="p-1.5 rounded-full hover:bg-white/60 transition-colors">
              <ChevronRight size={14} className="text-slate-600" />
            </motion.button>
          </div>
        )}
      />

      {/* Type switcher */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6"
      >
        {TYPES.map((t, i) => {
          const Icon = t.icon;
          const isActive = type === t.key;
          return (
            <motion.button
              key={t.key}
              onClick={() => setType(t.key)}
              data-testid={`type-btn-${t.key}`}
              whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }}
              transition={{ delay: i * 0.05 }}
              className={`relative overflow-hidden glass rounded-3xl p-4 text-left transition-all ${isActive ? `ring-2 ${t.ring} shadow-lg` : "opacity-70 hover:opacity-100"}`}
            >
              {isActive && (
                <motion.div
                  className="absolute inset-0 opacity-15 pointer-events-none"
                  style={{ background: `linear-gradient(135deg, var(--tw-gradient-stops))` }}
                  animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
                  transition={{ duration: 4, repeat: Infinity, repeatType: "reverse" }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${t.grad} opacity-50`} />
                </motion.div>
              )}
              <div className="relative flex items-center gap-3">
                <motion.div
                  animate={isActive ? { scale: [1, 1.1, 1], rotate: [0, -5, 5, 0] } : { scale: 1 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${t.grad} flex items-center justify-center shadow-md`}
                >
                  <Icon size={18} className="text-white" strokeWidth={2} />
                </motion.div>
                <div className="flex-1">
                  <p className="text-sm font-black text-slate-900">{t.label}</p>
                  <p className="text-[11px] text-slate-500 font-medium">{t.desc}</p>
                </div>
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]"
                  />
                )}
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Annual goal hero card */}
      {isGastos ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden rounded-3xl p-6 mb-6 shadow-xl"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.6)",
          }}
          data-testid="annual-gastos-card"
        >
          <motion.div
            className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-20 pointer-events-none"
            animate={{ scale: [1, 1.2, 1], rotate: [0, 45, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className={`w-full h-full rounded-full bg-gradient-to-br ${typeCfg.grad} blur-2xl`} />
          </motion.div>
          <div className="relative flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${typeCfg.grad} flex items-center justify-center shadow-lg shrink-0`}>
              <Wallet size={24} className="text-white" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Gastos totales · {year}</p>
              <p className="text-5xl font-black text-slate-900 tracking-tight leading-none" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }} data-testid="annual-actual">
                {formatCurrency(animAnnualVal)}
              </p>
              <p className="text-xs text-slate-500 font-medium mt-2">
                En este apartado solo se registra el proceso mensual. Los gastos no requieren meta.
              </p>
            </div>
          </div>
        </motion.div>
      ) : (
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative overflow-hidden rounded-[28px] p-6 sm:p-7 mb-6 shadow-2xl"
        style={{
          background: `
            radial-gradient(circle at 15% 15%, rgba(255,255,255,0.95), rgba(255,255,255,0.7) 40%, rgba(255,255,255,0.55) 100%)
          `,
          backdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.7)",
        }}
        data-testid="annual-goal-card"
      >
        {/* Capa decorativa 1: gran orbe gradient del tipo */}
        <motion.div
          className="absolute -top-24 -right-24 w-80 h-80 rounded-full opacity-25 pointer-events-none"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 45, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className={`w-full h-full rounded-full bg-gradient-to-br ${typeCfg.grad} blur-3xl`} />
        </motion.div>
        {/* Capa decorativa 2: orbe secundario */}
        <motion.div
          className="absolute -bottom-20 -left-16 w-64 h-64 rounded-full opacity-20 pointer-events-none"
          animate={{ scale: [1.1, 1, 1.1], rotate: [0, -30, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        >
          <div className={`w-full h-full rounded-full bg-gradient-to-br ${typeCfg.grad} blur-3xl`} />
        </motion.div>
        {/* Grid sutil */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(0,0,0,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.6) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative flex flex-col lg:flex-row items-stretch lg:items-center gap-6 lg:gap-8">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <motion.div animate={{ rotate: [0, 20, -20, 0] }} transition={{ duration: 4, repeat: Infinity }}>
                <Flame size={16} className="text-orange-500" />
              </motion.div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Meta Anual · {year} · {typeCfg.label}</p>
            </div>
            <div className="flex items-baseline gap-3 flex-wrap">
              <p className="text-5xl font-black text-slate-900 tracking-tight leading-none" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }} data-testid="annual-actual">
                {formatCurrency(animAnnualVal)}
              </p>
              <div className="flex items-center gap-1">
                <span className="text-slate-400 text-sm font-bold">/</span>
                {annualEditing ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      autoFocus
                      value={annualDraft}
                      onChange={(e) => setAnnualDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleSaveAnnual(); if (e.key === "Escape") setAnnualEditing(false); }}
                      data-testid="annual-goal-input"
                      min="0" step="0.01"
                      className="w-40 bg-white border border-indigo-300 rounded-xl px-3 py-1.5 text-base font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                    <button onClick={handleSaveAnnual} disabled={savingAnnual} data-testid="annual-goal-save"
                            className="p-1.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40">
                      <Check size={13} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAnnualEditing(true)}
                    data-testid="annual-goal-edit-btn"
                    className="group inline-flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors"
                  >
                    <span className="text-lg font-black" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                      {data?.annual_goal > 0 ? formatCurrency(data.annual_goal) : "— sin meta —"}
                    </span>
                    <Edit3 size={12} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-2 flex items-center gap-2 flex-wrap">
              <span>
                {data?.annual_reached
                  ? "🏆 ¡Superaste tu meta anual! Eres imparable."
                  : data?.annual_goal > 0
                    ? `Te faltan ${formatCurrency(Math.max(0, (data.annual_goal - data.annual_actual)))} para alcanzar el sueño`
                    : "Define tu meta anual y comienza a conquistarla"}
              </span>
              {data && (() => {
                const streak = computeStreaks(data.months);
                const badge = getBadgeForStreak(Math.max(streak.best, streak.current));
                return (
                  <span
                    data-testid="streak-chip"
                    className="group relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wider shadow-sm cursor-help"
                    style={{
                      background: badge ? `linear-gradient(90deg, ${badge.glow.replace("0.55","0.95").replace("0.6","0.95")}, rgba(255,255,255,0.5))` : "rgba(148,163,184,0.18)",
                      color: badge ? "#fff" : "#475569",
                      border: badge ? "1px solid rgba(255,255,255,0.5)" : "1px solid rgba(148,163,184,0.35)",
                      textShadow: badge ? "0 1px 2px rgba(0,0,0,0.2)" : "none",
                    }}
                  >
                    <Flame size={11} className={badge ? "text-white" : "text-slate-500"} strokeWidth={2.4} fill={badge ? "white" : "none"} />
                    <span data-testid="streak-current">{streak.current}</span>
                    <span className="opacity-70">·</span>
                    <span>mejor <span data-testid="streak-best">{streak.best}</span></span>
                    {badge && <span className="ml-0.5">{badge.emoji}</span>}

                    {/* Tooltip: línea temporal 12 puntitos (posicionado a la derecha para no chocar con bordes) */}
                    <span
                      role="tooltip"
                      data-testid="streak-timeline-tooltip"
                      className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30 whitespace-nowrap rounded-2xl px-3 py-2 shadow-2xl"
                      style={{
                        background: "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(30,41,59,0.96))",
                        border: "1px solid rgba(148,163,184,0.35)",
                        backdropFilter: "blur(12px)",
                      }}
                    >
                      {/* Flechita apuntando al chip */}
                      <span
                        aria-hidden
                        className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0"
                        style={{
                          borderTop: "6px solid transparent",
                          borderBottom: "6px solid transparent",
                          borderRight: "6px solid rgba(15,23,42,0.96)",
                        }}
                      />
                      <span className="block text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1.5 text-center normal-case">
                        Línea del año · {streak.total}/12 conquistados
                      </span>
                      <span className="flex items-center gap-1">
                        {data.months.map((mm) => (
                          <span
                            key={mm.month}
                            title={`${MONTHS_ES[mm.month - 1]}: ${mm.reached ? "cumplido" : "pendiente"}`}
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{
                              background: mm.reached
                                ? "linear-gradient(135deg,#34d399,#10b981)"
                                : "rgba(148,163,184,0.35)",
                              boxShadow: mm.reached ? "0 0 6px rgba(52,211,153,0.7)" : "none",
                              border: mm.reached ? "none" : "1px solid rgba(148,163,184,0.5)",
                            }}
                          />
                        ))}
                      </span>
                      <span className="flex items-center justify-between gap-2 mt-1.5 text-[8px] font-bold text-slate-400 tracking-wider">
                        <span>ENE</span>
                        <span>DIC</span>
                      </span>
                    </span>
                  </span>
                );
              })()}
            </p>
          </div>

          {/* Dream image — imagen inspiracional de la meta */}
          <div className="flex justify-center lg:justify-start">
            <GoalDreamImage year={year} type={type} />
          </div>

          {/* Circular progress */}
          <div className="relative w-40 h-40 flex-shrink-0 mx-auto lg:mx-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(148,163,184,0.2)" strokeWidth="8" />
              <motion.circle
                cx="50" cy="50" r="42" fill="none"
                stroke="url(#gradMeta)" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - Math.min(1, animAnnualPct / 100)) }}
                transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
              />
              <defs>
                <linearGradient id="gradMeta" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={typeCfg.key === "ventas" ? "#10b981" : typeCfg.key === "ganancias" ? "#8b5cf6" : "#f59e0b"} />
                  <stop offset="100%" stopColor={typeCfg.key === "ventas" ? "#0d9488" : typeCfg.key === "ganancias" ? "#ec4899" : "#f43f5e"} />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-3xl font-black text-slate-900 tracking-tight leading-none" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }} data-testid="annual-percent">
                {Math.round(animAnnualPct)}%
              </p>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">del sueño</p>
            </div>
            {data?.annual_reached && (
              <motion.div
                animate={{ scale: [1, 1.3, 1], rotate: [0, 15, -15, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg"
              >
                <Star size={16} className="text-white fill-white" />
              </motion.div>
            )}
          </div>
        </div>

      </motion.div>
      )}

      <div className="h-6" />

      {/* Months grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => <div key={i} className="h-40 glass rounded-3xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {data?.months?.map((m, idx) => (
            <MonthCard
              key={m.month}
              month={m.month}
              data={m}
              type={type}
              index={idx}
              formatCurrency={formatCurrency}
              onSave={handleSaveMonth}
              celebrated={celebratedRef.current.has(`${type}-${year}-${m.month}`)}
              onCelebrate={handleMonthCelebrate}
              isPast={currentMonth > 0 && m.month < currentMonth}
              isCurrent={currentMonth > 0 && m.month === currentMonth}
              mode={type}
            />
          ))}
        </div>
      )}

      <MilestoneToast milestone={milestone} onDone={() => setMilestone(null)} />
      <GoalReachedModal
        open={!!modal}
        onClose={() => setModal(null)}
        type={type}
        monthLabel={modal?.monthLabel}
        amount={modal?.amount || 0}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}


