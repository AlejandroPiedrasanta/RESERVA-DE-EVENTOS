import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useSettings } from "@/context/SettingsContext";

/**
 * Capa cinematográfica 3D global — se renderiza detrás del contenido en TODAS
 * las páginas. Cámaras, rollos de película, claquetas, focos volumétricos y
 * tira de película con profundidad real (perspective + translateZ) y parallax
 * sutil con el mouse. pointer-events: none para no interferir con la UI.
 *
 * Soporta 3 patrones 2D variados:
 *  - "cinema"  → Cámaras, rollos, claquetas, tira de película, palomitas, ticket
 *  - "party"   → Globos, confetti, copas, estrellas, disco ball, sparklers
 *  - "mixed"   → Mezcla cine + fiesta, alterna estilos
 */

/* ── 2D primitives ─────────────────────────────────────────── */

function FilmReel({ size = 120, color = "var(--t-from)", spin = 22 }) {
  const holes = [0, 60, 120, 180, 240, 300];
  return (
    <motion.svg width={size} height={size} viewBox="0 0 100 100"
      animate={{ rotate: 360 }} transition={{ duration: spin, repeat: Infinity, ease: "linear" }}
      style={{ filter: "drop-shadow(0 12px 24px rgba(0,0,0,0.18))" }}>
      <circle cx="50" cy="50" r="46" fill="none" stroke={color} strokeWidth="5" opacity="0.9" />
      <circle cx="50" cy="50" r="12" fill={color} opacity="0.85" />
      {holes.map((a, i) => {
        const rad = (a * Math.PI) / 180;
        return <circle key={i} cx={50 + 28 * Math.cos(rad)} cy={50 + 28 * Math.sin(rad)} r="8"
          fill="none" stroke={color} strokeWidth="4" opacity="0.85" />;
      })}
    </motion.svg>
  );
}

function Clapperboard({ size = 130, color = "var(--t-to)" }) {
  return (
    <motion.div
      animate={{ rotateX: [0, 8, 0], rotateY: [0, -10, 0] }}
      transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      style={{ width: size, height: size * 0.82, transformStyle: "preserve-3d", filter: "drop-shadow(0 16px 30px rgba(0,0,0,0.18))" }}>
      <svg width="100%" height="100%" viewBox="0 0 130 106">
        <g transform="rotate(-12 20 22)">
          <rect x="6" y="6" width="118" height="22" rx="4" fill={color} opacity="0.9" />
          {[0,1,2,3,4,5].map(i => (
            <polygon key={i} points={`${12+i*20},8 ${22+i*20},8 ${16+i*20},26 ${6+i*20},26`} fill="#fff" opacity="0.85" />
          ))}
        </g>
        <rect x="6" y="34" width="118" height="66" rx="6" fill={color} opacity="0.82" />
        <rect x="16" y="46" width="70" height="6" rx="3" fill="#fff" opacity="0.5" />
        <rect x="16" y="60" width="94" height="6" rx="3" fill="#fff" opacity="0.35" />
        <rect x="16" y="74" width="54" height="6" rx="3" fill="#fff" opacity="0.35" />
      </svg>
    </motion.div>
  );
}

function MovieCamera({ size = 170, color = "var(--t-from)" }) {
  return (
    <motion.div
      animate={{ rotateY: [0, 14, 0], y: [0, -10, 0] }}
      transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      style={{ width: size, transformStyle: "preserve-3d", filter: "drop-shadow(0 18px 34px rgba(0,0,0,0.2))" }}>
      <svg width="100%" viewBox="0 0 180 120">
        <circle cx="55" cy="30" r="24" fill="none" stroke={color} strokeWidth="6" opacity="0.85" />
        <circle cx="55" cy="30" r="6" fill={color} opacity="0.85" />
        <circle cx="110" cy="30" r="24" fill="none" stroke={color} strokeWidth="6" opacity="0.85" />
        <circle cx="110" cy="30" r="6" fill={color} opacity="0.85" />
        <rect x="30" y="52" width="96" height="52" rx="10" fill={color} opacity="0.82" />
        <rect x="126" y="66" width="26" height="24" rx="4" fill={color} opacity="0.9" />
        <circle cx="162" cy="78" r="12" fill="none" stroke={color} strokeWidth="5" opacity="0.9" />
      </svg>
    </motion.div>
  );
}

function FilmStrip({ w = 300, color = "var(--t-to)" }) {
  return (
    <svg width={w} height="70" viewBox="0 0 300 70" style={{ filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.12))" }}>
      <rect x="0" y="0" width="300" height="70" rx="8" fill={color} opacity="0.7" />
      {Array.from({ length: 10 }).map((_, i) => (
        <g key={i}>
          <rect x={8 + i * 30} y="6" width="14" height="10" rx="2" fill="#fff" opacity="0.75" />
          <rect x={8 + i * 30} y="54" width="14" height="10" rx="2" fill="#fff" opacity="0.75" />
        </g>
      ))}
      <rect x="6" y="22" width="288" height="26" rx="3" fill="#0f172a" opacity="0.25" />
    </svg>
  );
}

function Popcorn({ size = 120, color = "var(--t-from)" }) {
  return (
    <motion.svg width={size} height={size} viewBox="0 0 100 110"
      animate={{ y: [0, -6, 0], rotate: [0, -3, 3, 0] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      style={{ filter: "drop-shadow(0 12px 24px rgba(0,0,0,0.18))" }}>
      {/* Popcorn puffs on top */}
      {[
        { cx: 26, cy: 32, r: 12 }, { cx: 44, cy: 22, r: 14 }, { cx: 62, cy: 28, r: 13 },
        { cx: 76, cy: 36, r: 11 }, { cx: 34, cy: 42, r: 10 }, { cx: 56, cy: 42, r: 12 },
      ].map((p, i) => (
        <circle key={i} cx={p.cx} cy={p.cy} r={p.r} fill="#fff" opacity="0.9" stroke={color} strokeWidth="1.5" />
      ))}
      {/* Bucket with red-and-white stripes */}
      <path d="M18 46 L82 46 L74 100 L26 100 Z" fill={color} opacity="0.85" />
      <rect x="30" y="46" width="6" height="54" fill="#fff" opacity="0.5" />
      <rect x="46" y="46" width="6" height="54" fill="#fff" opacity="0.5" />
      <rect x="62" y="46" width="6" height="54" fill="#fff" opacity="0.5" />
    </motion.svg>
  );
}

function Ticket({ size = 140, color = "var(--t-to)" }) {
  return (
    <motion.svg width={size} height={size * 0.55} viewBox="0 0 140 78"
      animate={{ rotateZ: [0, 4, -4, 0] }}
      transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      style={{ filter: "drop-shadow(0 10px 22px rgba(0,0,0,0.16))" }}>
      <path d="M6 12 Q6 6 12 6 L128 6 Q134 6 134 12 L134 30 Q126 30 126 39 Q126 48 134 48 L134 66 Q134 72 128 72 L12 72 Q6 72 6 66 L6 48 Q14 48 14 39 Q14 30 6 30 Z"
        fill={color} opacity="0.85" />
      <line x1="70" y1="12" x2="70" y2="66" stroke="#fff" strokeWidth="2" strokeDasharray="4 4" opacity="0.6" />
      <text x="30" y="46" fill="#fff" opacity="0.85" fontSize="16" fontWeight="900">ADMIT</text>
      <text x="88" y="46" fill="#fff" opacity="0.85" fontSize="20" fontWeight="900">01</text>
    </motion.svg>
  );
}

function Balloon({ size = 110, color = "var(--t-from)" }) {
  return (
    <motion.svg width={size} height={size * 1.35} viewBox="0 0 90 122"
      animate={{ y: [0, -14, 0], rotate: [0, 4, -4, 0] }}
      transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      style={{ filter: "drop-shadow(0 14px 24px rgba(0,0,0,0.18))" }}>
      <ellipse cx="45" cy="42" rx="34" ry="40" fill={color} opacity="0.85" />
      <ellipse cx="34" cy="30" rx="8" ry="12" fill="#fff" opacity="0.4" />
      <path d="M40 82 L45 88 L50 82 Z" fill={color} opacity="0.9" />
      <path d="M45 88 Q40 100 48 108 Q40 116 45 122" stroke={color} strokeWidth="1.6" fill="none" opacity="0.7" />
    </motion.svg>
  );
}

function Confetti({ size = 160, color = "var(--t-to)" }) {
  const pieces = [
    { x: 10, y: 20, r: -22, w: 12, h: 5, c: "var(--t-from)" },
    { x: 40, y: 8,  r: 14,  w: 10, h: 5, c: color },
    { x: 74, y: 22, r: 34,  w: 14, h: 5, c: "var(--t-from)" },
    { x: 108, y: 12, r: -18, w: 12, h: 5, c: color },
    { x: 22, y: 60, r: 8,   w: 10, h: 5, c: color },
    { x: 60, y: 68, r: -36, w: 14, h: 5, c: "var(--t-from)" },
    { x: 92, y: 58, r: 26,  w: 12, h: 5, c: color },
    { x: 130, y: 70, r: -12, w: 10, h: 5, c: "var(--t-from)" },
    { x: 14, y: 100, r: 20, w: 10, h: 5, c: color },
    { x: 54, y: 106, r: -8, w: 12, h: 5, c: "var(--t-from)" },
    { x: 96, y: 100, r: 40, w: 14, h: 5, c: color },
  ];
  return (
    <motion.svg width={size} height={size * 0.85} viewBox="0 0 160 136"
      animate={{ rotate: [0, 3, -3, 0] }}
      transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}>
      {pieces.map((p, i) => (
        <rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} rx="2"
          fill={p.c} opacity="0.85" transform={`rotate(${p.r} ${p.x + p.w/2} ${p.y + p.h/2})`} />
      ))}
      {/* stars */}
      {[{x: 76, y: 42},{x: 44, y: 90},{x: 122, y: 44}].map((s, i) => (
        <g key={`s${i}`} transform={`translate(${s.x} ${s.y})`}>
          <path d="M0,-6 L1.6,-1.8 L6,-1.8 L2.4,1 L3.8,5.4 L0,3 L-3.8,5.4 L-2.4,1 L-6,-1.8 L-1.6,-1.8 Z"
            fill="var(--t-from)" opacity="0.9" />
        </g>
      ))}
    </motion.svg>
  );
}

function PartyGlass({ size = 130, color = "var(--t-from)" }) {
  return (
    <motion.svg width={size} height={size} viewBox="0 0 100 120"
      animate={{ rotate: [0, -8, 8, 0], y: [0, -6, 0] }}
      transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      style={{ filter: "drop-shadow(0 12px 24px rgba(0,0,0,0.18))" }}>
      {/* champagne bowl */}
      <path d="M20 12 L80 12 Q78 46 50 62 Q22 46 20 12 Z" fill={color} opacity="0.55" stroke={color} strokeWidth="2" />
      {/* bubbles */}
      <circle cx="38" cy="26" r="2.5" fill="#fff" opacity="0.85" />
      <circle cx="52" cy="20" r="2" fill="#fff" opacity="0.7" />
      <circle cx="60" cy="34" r="2.4" fill="#fff" opacity="0.8" />
      <circle cx="44" cy="42" r="1.8" fill="#fff" opacity="0.75" />
      {/* stem + foot */}
      <rect x="47" y="62" width="6" height="42" fill={color} opacity="0.85" />
      <ellipse cx="50" cy="108" rx="22" ry="4" fill={color} opacity="0.85" />
      {/* sparkle */}
      <path d="M78 6 L80 12 L86 14 L80 16 L78 22 L76 16 L70 14 L76 12 Z" fill="var(--t-to)" opacity="0.9" />
    </motion.svg>
  );
}

function DiscoBall({ size = 130, color = "var(--t-to)" }) {
  const facets = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 8; c++) {
      const cx = 12 + c * 9 + (r % 2 ? 4 : 0);
      const cy = 18 + r * 11;
      facets.push({ cx, cy });
    }
  }
  return (
    <motion.svg width={size} height={size * 1.15} viewBox="0 0 90 118"
      animate={{ rotate: [0, 360] }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      style={{ filter: "drop-shadow(0 14px 26px rgba(0,0,0,0.2))" }}>
      {/* hanging string */}
      <line x1="45" y1="0" x2="45" y2="16" stroke={color} strokeWidth="1.5" opacity="0.7" />
      {/* ball */}
      <circle cx="45" cy="58" r="40" fill={color} opacity="0.85" />
      {facets.map((f, i) => (
        <rect key={i} x={f.cx} y={f.cy} width="7" height="9" rx="1"
          fill="#fff" opacity={0.25 + ((i * 37) % 40) / 100} />
      ))}
      {/* highlight */}
      <ellipse cx="32" cy="42" rx="8" ry="6" fill="#fff" opacity="0.55" />
      {/* light rays */}
      <path d="M45 58 L88 24" stroke="var(--t-from)" strokeWidth="1.4" opacity="0.5" />
      <path d="M45 58 L4 26"  stroke="var(--t-from)" strokeWidth="1.4" opacity="0.5" />
      <path d="M45 58 L10 106" stroke="var(--t-from)" strokeWidth="1.4" opacity="0.4" />
      <path d="M45 58 L82 108" stroke="var(--t-from)" strokeWidth="1.4" opacity="0.4" />
    </motion.svg>
  );
}

function StarBurst({ size = 120, color = "var(--t-from)" }) {
  return (
    <motion.svg width={size} height={size} viewBox="0 0 100 100"
      animate={{ rotate: [0, 40, 0], scale: [1, 1.08, 1] }}
      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      style={{ filter: "drop-shadow(0 12px 22px rgba(0,0,0,0.18))" }}>
      <path d="M50 6 L58 40 L94 40 L64 60 L74 94 L50 74 L26 94 L36 60 L6 40 L42 40 Z"
        fill={color} opacity="0.85" />
      <circle cx="50" cy="50" r="8" fill="#fff" opacity="0.85" />
    </motion.svg>
  );
}

function Sparkler({ size = 140, color = "var(--t-to)" }) {
  const rays = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
  return (
    <motion.svg width={size} height={size} viewBox="0 0 100 100"
      animate={{ rotate: [0, 12, -12, 0], scale: [1, 1.12, 1] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      style={{ filter: "drop-shadow(0 12px 22px rgba(0,0,0,0.18))" }}>
      {rays.map((a, i) => {
        const rad = (a * Math.PI) / 180;
        const x1 = 50 + 16 * Math.cos(rad);
        const y1 = 50 + 16 * Math.sin(rad);
        const x2 = 50 + 44 * Math.cos(rad);
        const y2 = 50 + 44 * Math.sin(rad);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.85" />;
      })}
      <circle cx="50" cy="50" r="10" fill="var(--t-from)" opacity="0.95" />
      <circle cx="50" cy="50" r="5"  fill="#fff" opacity="0.9" />
    </motion.svg>
  );
}

/* ── Pattern configuration (positions/depths) ─────────────── */
/* Each pattern has 7 slots with distinct positions/depths so parallax
   and 3D layering feel varied. */
const BASE_LAYOUT = [
  { top: "10%", left: "6%",  z: -260, scale: 0.9,  blur: 3, opacity: 0.14, dur: 15, drift: 26 },
  { top: "60%", left: "80%", z: -180, scale: 1.0,  blur: 2, opacity: 0.15, dur: 17, drift: 22 },
  { top: "70%", left: "5%",  z: -120, scale: 0.95, blur: 1, opacity: 0.16, dur: 13, drift: 30 },
  { top: "74%", left: "50%", z: -340, scale: 0.7,  blur: 4, opacity: 0.10, dur: 19, drift: 18 },
  { top: "20%", left: "68%", z: -300, scale: 0.9,  blur: 3, opacity: 0.11, dur: 16, drift: 24 },
  { top: "8%",  left: "44%", z: -380, scale: 0.6,  blur: 4, opacity: 0.09, dur: 21, drift: 16 },
  { top: "36%", left: "2%",  z: -420, scale: 0.6,  blur: 5, opacity: 0.08, dur: 22, drift: 14 },
];

const PATTERNS = {
  cinema:  ["reel",    "camera",  "clap",     "reel",   "strip",   "clap",    "camera"],
  party:   ["balloon", "disco",   "confetti", "star",   "glass",   "sparkler","balloon"],
  mixed:   ["camera",  "balloon", "clap",     "disco",  "popcorn", "confetti","ticket"],
};

const RENDERERS = {
  reel:     <FilmReel />,
  camera:   <MovieCamera />,
  clap:     <Clapperboard />,
  strip:    <FilmStrip />,
  popcorn:  <Popcorn />,
  ticket:   <Ticket />,
  balloon:  <Balloon />,
  confetti: <Confetti />,
  glass:    <PartyGlass />,
  disco:    <DiscoBall />,
  star:     <StarBurst />,
  sparkler: <Sparkler />,
};

export default function FloatingDecor() {
  const { cinematic = "normal", cinematicPattern = "cinema" } = useSettings();
  const [par, setPar] = useState({ x: 0, y: 0 });
  const raf = useRef();

  useEffect(() => {
    if (cinematic === "off") return;
    const onMove = (e) => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        const nx = (e.clientX / window.innerWidth - 0.5) * 2;
        const ny = (e.clientY / window.innerHeight - 0.5) * 2;
        setPar({ x: nx, y: ny });
      });
    };
    window.addEventListener("mousemove", onMove);
    return () => { window.removeEventListener("mousemove", onMove); cancelAnimationFrame(raf.current); };
  }, [cinematic]);

  if (cinematic === "off") return null;

  const K = cinematic === "subtle" ? 0.55 : cinematic === "intense" ? 1.8 : 1;
  const patternKey = PATTERNS[cinematicPattern] ? cinematicPattern : "cinema";
  const shapes = PATTERNS[patternKey];

  // Build objects: assign shape to each layout slot, trim for "subtle"
  const objects = BASE_LAYOUT.map((slot, i) => ({ ...slot, type: shapes[i % shapes.length] }));
  const visible = cinematic === "subtle" ? objects.slice(0, 4) : objects;

  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 0, perspective: "1400px", perspectiveOrigin: "50% 40%" }}
      aria-hidden="true"
      data-testid="floating-decor"
    >
      {/* Ambient color glows */}
      <motion.div className="absolute rounded-full"
        style={{ top: "-10%", left: "-8%", width: 460, height: 460, background: "radial-gradient(circle, var(--t-from), transparent 70%)", opacity: 0.14 * K, filter: "blur(40px)" }}
        animate={{ x: [0, 40, 0], y: [0, 30, 0], scale: [1, 1.12, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="absolute rounded-full"
        style={{ bottom: "-12%", right: "-6%", width: 520, height: 520, background: "radial-gradient(circle, var(--t-to), transparent 70%)", opacity: 0.12 * K, filter: "blur(44px)" }}
        animate={{ x: [0, -50, 0], y: [0, -30, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }} />

      {/* Volumetric spotlight beams */}
      {[{ l: "18%", rot: -16, w: 220, d: 8, o: 0.10 }, { l: "72%", rot: 14, w: 280, d: 11, o: 0.08 }].map((b, i) => (
        <motion.div key={i} className="absolute top-[-16%]"
          style={{
            left: b.l, width: b.w, height: "150%", transformOrigin: "top center", rotate: `${b.rot}deg`,
            background: `linear-gradient(180deg, rgba(255,255,255,${(b.o + 0.06) * K}) 0%, rgba(255,255,255,${b.o * K}) 22%, transparent 70%)`,
            filter: "blur(22px)", mixBlendMode: "screen",
            clipPath: "polygon(38% 0, 62% 0, 100% 100%, 0% 100%)",
          }}
          animate={{ opacity: [b.o * K, b.o * K * 1.8, b.o * K], rotate: [`${b.rot}deg`, `${b.rot + (i ? -4 : 4)}deg`, `${b.rot}deg`] }}
          transition={{ duration: b.d, repeat: Infinity, ease: "easeInOut" }} />
      ))}

      {/* 2D decorative objects with depth + parallax */}
      {visible.map((o, i) => {
        const depth = Math.abs(o.z) / 420;
        return (
          <motion.div key={`${patternKey}-${i}`} className="absolute"
            data-testid={`decor-${patternKey}-${o.type}-${i}`}
            style={{
              top: o.top, left: o.left, opacity: Math.min(0.6, o.opacity * K), color: "var(--t-from)",
              filter: `blur(${o.blur}px)`, transformStyle: "preserve-3d",
              transform: `translate3d(${par.x * 30 * depth}px, ${par.y * 24 * depth}px, ${o.z}px) scale(${o.scale})`,
              transition: "transform 0.35s cubic-bezier(.2,.7,.2,1)",
            }}
            animate={{ y: [0, -o.drift, 0, o.drift * 0.6, 0], rotateZ: [0, 3, -2, 0] }}
            transition={{ duration: o.dur, repeat: Infinity, ease: "easeInOut" }}>
            {RENDERERS[o.type] || RENDERERS.reel}
          </motion.div>
        );
      })}

      {/* Diagonal light sweep */}
      <motion.div className="absolute top-0 h-[220%] w-[240px]"
        style={{ left: "-260px", rotate: "18deg", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), rgba(199,210,254,0.3), transparent)", filter: "blur(14px)", mixBlendMode: "screen" }}
        animate={{ x: ["0vw", "130vw"] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", repeatDelay: 4 }} />

      {/* Film grain / vignette overlay */}
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse at center, transparent 55%, rgba(15,23,42,0.10) 100%)",
        mixBlendMode: "multiply",
      }} />
    </div>
  );
}
