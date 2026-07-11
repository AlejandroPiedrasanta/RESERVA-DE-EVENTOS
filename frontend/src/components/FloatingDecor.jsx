import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useSettings } from "@/context/SettingsContext";

/**
 * Capa cinematográfica 3D global — se renderiza detrás del contenido en TODAS
 * las páginas. Cámaras, rollos de película, claquetas, focos volumétricos y
 * tira de película con profundidad real (perspective + translateZ) y parallax
 * sutil con el mouse. pointer-events: none para no interferir con la UI.
 */

/* ── 3D primitives ─────────────────────────────────────────── */

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
        {/* top clap arm (angled) */}
        <g transform="rotate(-12 20 22)">
          <rect x="6" y="6" width="118" height="22" rx="4" fill={color} opacity="0.9" />
          {[0,1,2,3,4,5].map(i => (
            <polygon key={i} points={`${12+i*20},8 ${22+i*20},8 ${16+i*20},26 ${6+i*20},26`} fill="#fff" opacity="0.85" />
          ))}
        </g>
        {/* board body */}
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
        {/* two top reels */}
        <circle cx="55" cy="30" r="24" fill="none" stroke={color} strokeWidth="6" opacity="0.85" />
        <circle cx="55" cy="30" r="6" fill={color} opacity="0.85" />
        <circle cx="110" cy="30" r="24" fill="none" stroke={color} strokeWidth="6" opacity="0.85" />
        <circle cx="110" cy="30" r="6" fill={color} opacity="0.85" />
        {/* body */}
        <rect x="30" y="52" width="96" height="52" rx="10" fill={color} opacity="0.82" />
        {/* lens */}
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

/* ── Layout of 3D objects (depth via z + blur) ─────────────── */
const OBJECTS = [
  { type: "reel",   top: "10%", left: "6%",  z: -260, scale: 0.9, blur: 3,   opacity: 0.14, dur: 15, drift: 26 },
  { type: "camera", top: "60%", left: "80%", z: -180, scale: 1.0, blur: 2,   opacity: 0.15, dur: 17, drift: 22 },
  { type: "clap",   top: "70%", left: "5%",  z: -120, scale: 0.95, blur: 1,  opacity: 0.16, dur: 13, drift: 30 },
  { type: "reel",   top: "74%", left: "50%", z: -340, scale: 0.7, blur: 4,   opacity: 0.10, dur: 19, drift: 18 },
  { type: "strip",  top: "20%", left: "68%", z: -300, scale: 0.9, blur: 3,   opacity: 0.11, dur: 16, drift: 24 },
  { type: "clap",   top: "8%",  left: "44%", z: -380, scale: 0.6, blur: 4,   opacity: 0.09, dur: 21, drift: 16 },
  { type: "camera", top: "36%", left: "2%",  z: -420, scale: 0.6, blur: 5,   opacity: 0.08, dur: 22, drift: 14 },
];

export default function FloatingDecor() {
  const { cinematic = "normal" } = useSettings();
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

  // intensity multiplier for opacities/glows
  const K = cinematic === "subtle" ? 0.55 : cinematic === "intense" ? 1.8 : 1;
  // number of 3D objects shown (subtle shows fewer, intense shows all)
  const objects = cinematic === "subtle" ? OBJECTS.slice(0, 4) : OBJECTS;

  const render3D = (t) =>
    t === "reel" ? <FilmReel /> :
    t === "camera" ? <MovieCamera /> :
    t === "clap" ? <Clapperboard /> :
    <FilmStrip />;

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

      {/* Volumetric spotlight beams from the top */}
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

      {/* 3D cinematic objects with depth + parallax */}
      {objects.map((o, i) => {
        const depth = Math.abs(o.z) / 420; // 0..1, farther = more parallax
        return (
          <motion.div key={i} className="absolute"
            style={{
              top: o.top, left: o.left, opacity: Math.min(0.6, o.opacity * K), color: "var(--t-from)",
              filter: `blur(${o.blur}px)`, transformStyle: "preserve-3d",
              transform: `translate3d(${par.x * 30 * depth}px, ${par.y * 24 * depth}px, ${o.z}px) scale(${o.scale})`,
              transition: "transform 0.35s cubic-bezier(.2,.7,.2,1)",
            }}
            animate={{ y: [0, -o.drift, 0, o.drift * 0.6, 0], rotateZ: [0, 3, -2, 0] }}
            transition={{ duration: o.dur, repeat: Infinity, ease: "easeInOut" }}>
            {render3D(o.type)}
          </motion.div>
        );
      })}

      {/* Diagonal light sweep */}
      <motion.div className="absolute top-0 h-[220%] w-[240px]"
        style={{ left: "-260px", rotate: "18deg", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), rgba(199,210,254,0.3), transparent)", filter: "blur(14px)", mixBlendMode: "screen" }}
        animate={{ x: ["0vw", "130vw"] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", repeatDelay: 4 }} />

      {/* Film grain / vignette overlay for cinematic mood */}
      <div className="absolute inset-0" style={{
        background: "radial-gradient(ellipse at center, transparent 55%, rgba(15,23,42,0.10) 100%)",
        mixBlendMode: "multiply",
      }} />
    </div>
  );
}
