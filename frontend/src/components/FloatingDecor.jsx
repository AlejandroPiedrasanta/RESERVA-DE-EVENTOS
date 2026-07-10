import { motion } from "framer-motion";
import {
  Camera, Film, Clapperboard, Aperture, Video, Image as ImageIcon,
  Focus, Sparkles, Star, Play, CircleDot, Instagram,
} from "lucide-react";

/**
 * Capa decorativa global animada — se renderiza detrás del contenido en TODAS
 * las páginas. Iconos flotantes con temática de fotografía/cine + barridos de
 * luz diagonales. pointer-events: none para no interferir con la UI.
 */

const ICONS = [
  { Icon: Camera,       top: "12%", left: "8%",  size: 46, dur: 11, delay: 0,   rot: 12,  color: "rgba(99,102,241,0.20)" },
  { Icon: Clapperboard, top: "22%", left: "82%", size: 54, dur: 13, delay: 1.2, rot: -14, color: "rgba(236,72,153,0.18)" },
  { Icon: Film,         top: "68%", left: "6%",  size: 50, dur: 14, delay: 0.6, rot: -8,  color: "rgba(139,92,246,0.18)" },
  { Icon: Aperture,     top: "78%", left: "88%", size: 58, dur: 12, delay: 2,   rot: 20,  color: "rgba(16,185,129,0.18)" },
  { Icon: Video,        top: "45%", left: "92%", size: 40, dur: 10, delay: 0.9, rot: 10,  color: "rgba(59,130,246,0.18)" },
  { Icon: ImageIcon,    top: "40%", left: "3%",  size: 38, dur: 15, delay: 1.8, rot: -18, color: "rgba(245,158,11,0.18)" },
  { Icon: Focus,        top: "88%", left: "45%", size: 44, dur: 12, delay: 0.3, rot: 8,   color: "rgba(99,102,241,0.16)" },
  { Icon: Sparkles,     top: "6%",  left: "52%", size: 34, dur: 9,  delay: 1.5, rot: 16,  color: "rgba(236,72,153,0.22)" },
  { Icon: Star,         top: "58%", left: "70%", size: 28, dur: 8,  delay: 2.4, rot: -10, color: "rgba(251,191,36,0.24)" },
  { Icon: Play,         top: "32%", left: "30%", size: 30, dur: 13, delay: 1.1, rot: 6,   color: "rgba(139,92,246,0.16)" },
  { Icon: CircleDot,    top: "15%", left: "68%", size: 26, dur: 10, delay: 0.4, rot: -6,  color: "rgba(59,130,246,0.18)" },
  { Icon: Instagram,    top: "72%", left: "58%", size: 32, dur: 11, delay: 1.9, rot: 14,  color: "rgba(236,72,153,0.18)" },
];

export default function FloatingDecor() {
  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
      data-testid="floating-decor"
    >
      {/* Manchas de color suaves (glow ambiental) */}
      <motion.div
        className="absolute rounded-full"
        style={{
          top: "-10%", left: "-8%", width: 420, height: 420,
          background: "radial-gradient(circle, rgba(139,92,246,0.16), transparent 70%)",
          filter: "blur(30px)",
        }}
        animate={{ x: [0, 40, 0], y: [0, 30, 0], scale: [1, 1.12, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{
          bottom: "-12%", right: "-6%", width: 480, height: 480,
          background: "radial-gradient(circle, rgba(236,72,153,0.14), transparent 70%)",
          filter: "blur(34px)",
        }}
        animate={{ x: [0, -50, 0], y: [0, -30, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute rounded-full"
        style={{
          top: "40%", left: "55%", width: 360, height: 360,
          background: "radial-gradient(circle, rgba(16,185,129,0.10), transparent 70%)",
          filter: "blur(30px)",
        }}
        animate={{ x: [0, 30, -20, 0], y: [0, -25, 20, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Iconos flotantes tipo cámara/cine */}
      {ICONS.map(({ Icon, top, left, size, dur, delay, rot, color }, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{ top, left, color }}
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 1, 1, 0.6, 1],
            y: [0, -26, 0, 18, 0],
            x: [0, 12, -8, 6, 0],
            rotate: [0, rot, -rot / 2, rot / 2, 0],
          }}
          transition={{ duration: dur, repeat: Infinity, ease: "easeInOut", delay }}
        >
          <Icon size={size} strokeWidth={1.4} />
        </motion.div>
      ))}

      {/* Barrido de luz diagonal periódico (sweep) */}
      <motion.div
        className="absolute top-0 h-[220%] w-[240px]"
        style={{
          left: "-260px",
          transformOrigin: "center",
          rotate: "18deg",
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), rgba(199,210,254,0.35), transparent)",
          filter: "blur(14px)",
          mixBlendMode: "screen",
        }}
        animate={{ x: ["0vw", "130vw"] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", repeatDelay: 4 }}
      />
      {/* Segundo barrido, tono rosado, desfasado */}
      <motion.div
        className="absolute top-0 h-[220%] w-[160px]"
        style={{
          left: "-200px",
          rotate: "18deg",
          background:
            "linear-gradient(90deg, transparent, rgba(251,207,232,0.4), transparent)",
          filter: "blur(18px)",
          mixBlendMode: "screen",
        }}
        animate={{ x: ["0vw", "130vw"] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", repeatDelay: 6, delay: 3 }}
      />
    </div>
  );
}
