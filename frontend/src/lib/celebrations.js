// ═══════════════════════════════════════════════════════════════════
// Celebrations — Animaciones épicas para eventos importantes
// ═══════════════════════════════════════════════════════════════════
import confettiLib from "canvas-confetti";

// Resolver seguro: soporta tanto ESM default como CJS (module.exports = fn).
const _confetti = (typeof confettiLib === "function")
  ? confettiLib
  : (confettiLib && typeof confettiLib.default === "function" ? confettiLib.default : null);

// Wrapper resiliente: nunca lanza excepciones al llamador.
const safeConfetti = (opts) => {
  try {
    if (typeof _confetti === "function") _confetti(opts);
  } catch (e) {
    // Silenciamos errores de canvas-confetti para no romper el flujo (guardado, push, etc.)
    console.warn("[confetti] error suppressed:", e?.message || e);
  }
};

const isReducedMotion = () => {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch { return false; }
};

// Paletas de colores por tipo de celebración
const PALETTES = {
  reservation: ["#8b5cf6", "#a78bfa", "#c4b5fd", "#f472b6", "#fbbf24"],
  payment:     ["#10b981", "#34d399", "#6ee7b7", "#fbbf24", "#f59e0b"],
  socio:       ["#3b82f6", "#60a5fa", "#93c5fd", "#a78bfa", "#f472b6"],
  update:      ["#f59e0b", "#fbbf24", "#fde68a", "#8b5cf6", "#10b981"],
  tutorial:    ["#ec4899", "#f472b6", "#fbbf24", "#a78bfa", "#10b981"],
  success:     ["#10b981", "#34d399", "#3b82f6", "#8b5cf6", "#fbbf24"],
};

// Explosión clásica desde el centro-abajo
export const fireConfetti = (type = "success", origin = { x: 0.5, y: 0.7 }) => {
  if (isReducedMotion()) return;
  const colors = PALETTES[type] || PALETTES.success;
  const defaults = { origin, colors, ticks: 200, gravity: 0.9, scalar: 1 };

  safeConfetti({ ...defaults, particleCount: 80, spread: 70, startVelocity: 45 });
  setTimeout(() => safeConfetti({ ...defaults, particleCount: 50, spread: 100, startVelocity: 35, scalar: 0.8 }), 120);
  setTimeout(() => safeConfetti({ ...defaults, particleCount: 40, spread: 120, startVelocity: 25, scalar: 1.2 }), 240);
};

// Explosión doble lateral (más épica)
export const fireEpic = (type = "success") => {
  if (isReducedMotion()) return;
  const colors = PALETTES[type] || PALETTES.success;
  const end = Date.now() + 900;

  const frame = () => {
    safeConfetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors, startVelocity: 60 });
    safeConfetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors, startVelocity: 60 });
    if (Date.now() < end) {
      try { requestAnimationFrame(frame); } catch { /* noop */ }
    }
  };
  try { frame(); } catch (e) { /* noop */ }

  // Explosión central final
  setTimeout(() => {
    safeConfetti({ particleCount: 150, spread: 160, origin: { x: 0.5, y: 0.5 }, colors, startVelocity: 50, scalar: 1.3, ticks: 300 });
  }, 700);
};

// Lluvia de estrellas/dinero desde arriba
export const fireStars = (type = "payment") => {
  if (isReducedMotion()) return;
  const colors = PALETTES[type] || PALETTES.payment;
  const duration = 2500;
  const end = Date.now() + duration;

  const interval = setInterval(() => {
    if (Date.now() > end) { clearInterval(interval); return; }
    safeConfetti({
      particleCount: 3,
      startVelocity: 0,
      gravity: 0.5,
      ticks: 250,
      origin: { x: Math.random(), y: -0.1 },
      colors,
      shapes: ["star"],
      scalar: Math.random() * 0.8 + 0.6,
    });
  }, 100);
};

// ══════════════ Sidebar shine sweep ══════════════
// Dispara un barrido de luz en el sidebar via evento global
export const triggerSidebarSweep = (color = "purple") => {
  try {
    window.dispatchEvent(new CustomEvent("cp:sidebar-sweep", { detail: { color } }));
  } catch (e) {
    console.warn("[sidebar-sweep] error:", e?.message || e);
  }
};

// ══════════════ Celebraciones específicas ══════════════
export const celebrateReservation = () => {
  fireConfetti("reservation");
  triggerSidebarSweep("purple");
};

export const celebratePayment = () => {
  fireStars("payment");
  triggerSidebarSweep("emerald");
};

export const celebrateFullPayment = () => {
  fireEpic("payment");
  triggerSidebarSweep("emerald");
};

export const celebrateSocio = () => {
  fireConfetti("socio", { x: 0.5, y: 0.6 });
  triggerSidebarSweep("blue");
};

export const celebrateUpdate = () => {
  fireEpic("update");
  triggerSidebarSweep("amber");
};

export const celebrateTutorial = () => {
  fireEpic("tutorial");
};

// ══════════════ Money rain — para logros de metas ══════════════
// Dispara una lluvia de billetes/monedas simulada usando emojis en shapes
export const fireMoneyRain = (durationMs = 4200) => {
  if (isReducedMotion()) return;
  const end = Date.now() + durationMs;
  const moneyColors = ["#10b981", "#059669", "#34d399", "#fbbf24", "#f59e0b", "#84cc16"];

  const interval = setInterval(() => {
    if (Date.now() > end) { clearInterval(interval); return; }
    // Lluvia principal
    safeConfetti({
      particleCount: 6,
      startVelocity: 15,
      gravity: 1.1,
      ticks: 300,
      origin: { x: Math.random(), y: -0.15 },
      colors: moneyColors,
      shapes: ["square"],
      scalar: 1.4,
      drift: (Math.random() - 0.5) * 0.6,
    });
    // Monedas doradas ocasionales
    if (Math.random() < 0.5) {
      safeConfetti({
        particleCount: 2,
        startVelocity: 10,
        gravity: 1.3,
        ticks: 260,
        origin: { x: Math.random(), y: -0.1 },
        colors: ["#fbbf24", "#f59e0b", "#fde68a"],
        shapes: ["circle"],
        scalar: 1.1,
      });
    }
  }, 90);

  // Explosión épica final
  setTimeout(() => {
    fireEpic("payment");
  }, 400);
};

// Celebración específica de meta alcanzada
export const celebrateGoalReached = () => {
  fireMoneyRain(4500);
  triggerSidebarSweep("emerald");
};
