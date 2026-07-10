import { useContext, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ChevronDown, Search, X, Sparkles } from "lucide-react";
import { SectionSearchContext, matchesSearch, extractText, normalizeText } from "@/lib/sectionSearch";

/* ─────────────────────────────────────────────────────────────────────
   NUEVO DISEÑO: CARD PANELS con animación
   Cada Section es una tarjeta con:
     · Gradiente propio (auto-asignado por hash del título)
     · Icono orbital flotante
     · Blobs ambientales animados
     · Tilt 3D en hover (parallax con el mouse)
     · Shine sweep al pasar el cursor
     · Sparkles decorativos
     · Apertura con spring elástico
   ───────────────────────────────────────────────────────────────────── */

// Paletas de tarjeta — degradados suaves, sin morados oscuros absolutos
const PALETTES = [
  { from: "#fef3c7", to: "#fde68a", accent: "#f59e0b", text: "#78350f" }, // amber cream
  { from: "#dbeafe", to: "#bfdbfe", accent: "#3b82f6", text: "#1e3a8a" }, // sky
  { from: "#fce7f3", to: "#fbcfe8", accent: "#ec4899", text: "#831843" }, // pink
  { from: "#d1fae5", to: "#a7f3d0", accent: "#10b981", text: "#064e3b" }, // emerald
  { from: "#ede9fe", to: "#ddd6fe", accent: "#8b5cf6", text: "#4c1d95" }, // violet
  { from: "#ffe4e6", to: "#fecdd3", accent: "#f43f5e", text: "#881337" }, // rose
  { from: "#cffafe", to: "#a5f3fc", accent: "#06b6d4", text: "#164e63" }, // cyan
  { from: "#fef9c3", to: "#fef08a", accent: "#eab308", text: "#713f12" }, // yellow
  { from: "#fed7aa", to: "#fdba74", accent: "#f97316", text: "#7c2d12" }, // orange
  { from: "#e0e7ff", to: "#c7d2fe", accent: "#6366f1", text: "#312e81" }, // indigo
];

function hashPalette(seed = "") {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTES[h % PALETTES.length];
}

// Sparkles decorativos
function FloatingSparkles({ color }) {
  const items = useMemo(() => (
    Array.from({ length: 5 }).map((_, i) => ({
      id: i,
      x: 10 + Math.random() * 80,
      y: 10 + Math.random() * 80,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
      size: 8 + Math.random() * 6,
    }))
  ), []);
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {items.map(s => (
        <motion.div
          key={s.id}
          className="absolute"
          style={{ left: `${s.x}%`, top: `${s.y}%` }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1.2, 0.5],
            rotate: [0, 180, 360],
          }}
          transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sparkles size={s.size} style={{ color }} />
        </motion.div>
      ))}
    </div>
  );
}

// Blobs ambientales flotando dentro de la card
function AmbientBlobs({ from, to }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2rem]">
      <motion.div
        className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-40 blur-3xl"
        style={{ background: from }}
        animate={{ x: [0, 30, -20, 0], y: [0, -20, 30, 0], scale: [1, 1.15, 0.9, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full opacity-40 blur-3xl"
        style={{ background: to }}
        animate={{ x: [0, -25, 20, 0], y: [0, 25, -15, 0], scale: [1, 0.85, 1.2, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
    </div>
  );
}

export function Section({ icon: Icon, title, desc, children, badge, isNew, keywords = "", id, defaultOpen = false }) {
  const query = useContext(SectionSearchContext);
  const [open, setOpen] = useState(defaultOpen);
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef(null);
  const searching = !!(query && query.trim());
  const slug = id || normalizeText(title).replace(/\s+/g, "-");
  const palette = useMemo(() => hashPalette(title || slug), [title, slug]);

  // Parallax tilt en hover
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [1.5, -1.5]), { stiffness: 150, damping: 25 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-1.5, 1.5]), { stiffness: 150, damping: 25 });

  const onMouseMove = (e) => {
    if (!cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onMouseLeave = () => {
    mx.set(0); my.set(0); setHovered(false);
  };

  const matched = useMemo(() => {
    if (!searching) return true;
    return matchesSearch(query, `${title} ${desc} ${keywords} ${extractText(children)}`);
  }, [searching, query, title, desc, keywords, children]);

  if (searching && !matched) return null;
  const isOpen = searching || open;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 40, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 180, damping: 22 }}
      whileHover={{ y: -1 }}
      style={{ perspective: 1200 }}
      className="relative"
      data-testid={`section-${slug}`}
    >
      <motion.div
        ref={cardRef}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={onMouseLeave}
        onMouseMove={onMouseMove}
        style={{
          rotateX: rx,
          rotateY: ry,
          transformStyle: "preserve-3d",
          background: `linear-gradient(135deg, ${palette.from} 0%, ${palette.to} 100%)`,
          boxShadow: hovered
            ? `0 22px 55px -20px ${palette.accent}45, 0 12px 30px -15px rgba(0,0,0,0.12)`
            : `0 15px 45px -15px ${palette.accent}30, 0 8px 20px -8px rgba(0,0,0,0.08)`,
        }}
        className="relative rounded-[2rem] overflow-hidden border border-white/60 transition-shadow duration-500"
      >
        {/* Blobs ambientales */}
        <AmbientBlobs from={palette.from} to={palette.accent + "88"} />

        {/* Sparkles al hover (muy sutil) */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <FloatingSparkles color={palette.accent} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Shine sweep — sutil */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ x: "-100%" }}
          animate={hovered ? { x: "120%" } : { x: "-100%" }}
          transition={{ duration: 1.6, ease: "easeInOut" }}
          style={{
            background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)",
          }}
        />

        {/* Header clickeable */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setOpen(o => !o)}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(o => !o); } }}
          data-testid={`section-toggle-${slug}`}
          className="relative w-full flex items-center justify-between gap-4 px-6 py-6 cursor-pointer select-none z-10"
          style={{ transform: "translateZ(30px)" }}
        >
          <div className="flex items-center gap-4 min-w-0 flex-1">
            {/* Icono flotante con órbita */}
            <div className="relative flex-shrink-0">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full"
                style={{
                  background: `conic-gradient(from 0deg, ${palette.accent}, transparent, ${palette.accent})`,
                  filter: "blur(8px)",
                  opacity: hovered ? 0.4 : 0.25,
                }}
              />
              <motion.div
                whileHover={{ scale: 1.04 }}
                className="relative w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${palette.accent}, ${palette.text})`,
                  boxShadow: `0 10px 25px -8px ${palette.accent}70`,
                }}
              >
                <Icon size={22} className="text-white" strokeWidth={2.4} />
              </motion.div>
            </div>

            {/* Título + descripción */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <motion.h2
                  className="text-lg md:text-xl font-black tracking-tight leading-tight"
                  style={{ fontFamily: "Cabinet Grotesk, sans-serif", color: palette.text, letterSpacing: "-0.02em" }}
                >
                  {title}
                </motion.h2>
                {isNew && (
                  <motion.span
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                    className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider text-white shadow-sm"
                    style={{ background: `linear-gradient(135deg, ${palette.accent}, ${palette.text})` }}
                  >
                    NUEVO
                  </motion.span>
                )}
              </div>
              <p className="text-xs md:text-sm font-semibold mt-1 opacity-70" style={{ color: palette.text }}>
                {desc}
              </p>
            </div>
          </div>

          {/* Badge + chevron */}
          <div className="flex items-center gap-3 shrink-0" style={{ transform: "translateZ(20px)" }}>
            {badge && <div onClick={e => e.stopPropagation()}>{badge}</div>}
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md"
              style={{
                background: "rgba(255,255,255,0.85)",
                border: `1.5px solid ${palette.accent}40`,
              }}
            >
              <ChevronDown size={18} style={{ color: palette.text }} strokeWidth={2.6} />
            </motion.div>
          </div>
        </div>

        {/* Contenido expandido */}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              key="body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ height: { type: "spring", stiffness: 200, damping: 26 }, opacity: { duration: 0.25 } }}
              className="overflow-hidden relative z-10"
            >
              <motion.div
                initial={{ y: -10 }}
                animate={{ y: 0 }}
                exit={{ y: -10 }}
                transition={{ duration: 0.3 }}
                className="mx-3 mb-3 rounded-[1.5rem] bg-white/85 backdrop-blur-xl border border-white/70 shadow-inner"
              >
                <div className="px-5 py-5">{children}</div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

export function SectionSearchBar({ value, onChange, placeholder, testId }) {
  const [focused, setFocused] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.4 }}
      className="relative mb-6"
    >
      <motion.div
        animate={{
          boxShadow: focused
            ? "0 20px 50px -15px rgba(99,102,241,0.35), 0 8px 25px -10px rgba(0,0,0,0.1)"
            : "0 8px 25px -12px rgba(0,0,0,0.12)",
        }}
        className="relative rounded-3xl bg-white/70 backdrop-blur-xl border-2 border-white/80 overflow-hidden"
      >
        <motion.div
          animate={focused ? { rotate: [0, 8, -8, 0] } : { rotate: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none"
        >
          <Search size={18} className="text-slate-500" strokeWidth={2.5} />
        </motion.div>
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          data-testid={testId}
          className="w-full pl-14 pr-12 py-4 bg-transparent text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none"
        />
        {value && (
          <motion.button
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            whileHover={{ scale: 1.15, rotate: 90 }}
            whileTap={{ scale: 0.85 }}
            onClick={() => onChange("")}
            data-testid={`${testId}-clear`}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500"
          >
            <X size={15} strokeWidth={2.8} />
          </motion.button>
        )}
      </motion.div>
    </motion.div>
  );
}
