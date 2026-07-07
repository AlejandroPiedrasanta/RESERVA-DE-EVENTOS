import { useEffect, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, X, Sparkles, Rocket, Zap, TrendingUp, Calendar,
  Users, Database, Gift, Cloud,
} from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { celebrateTutorial } from "@/lib/celebrations";

// 7 pasos esenciales: lo mínimo que un usuario nuevo necesita entender
const TOUR_STEPS = [
  { route: "/dashboard", target: null, icon: Rocket, gradient: "from-purple-500 to-pink-500",
    title: "¡Bienvenido a Cinema Productions! 🎬",
    desc: "Un recorrido rápido por lo esencial: cómo crear una reserva, ver estadísticas, calendario, socios y dónde se guardan tus datos.",
    tips: ["7 pasos rápidos", "≈ 1 minuto", "Puedes reiniciarlo desde Apariencia"] },
  { route: "/reservaciones", target: '[data-testid="new-reservation-btn"]', icon: Zap, gradient: "from-amber-500 to-orange-500",
    title: "Crea una nueva reserva",
    desc: "Pulsa «Nueva reserva» y llena cliente, fecha, tipo de evento, anticipo y paquete. El saldo se calcula solo.",
    tips: ["Anticipo y saldo automáticos", "Sube comprobantes de pago", "Guarda estado del evento"] },
  { route: "/dashboard", target: '[data-testid="stats-grid"]', icon: TrendingUp, gradient: "from-emerald-500 to-teal-500",
    title: "Estadísticas en vivo",
    desc: "Aquí ves lo importante de un vistazo: próximos eventos, ingresos reales y saldos pendientes por cobrar.",
    tips: ["Se actualiza solo", "Ingresos y saldos", "Próximos eventos"] },
  { route: "/calendario", target: '[data-testid="calendar-grid"]', icon: Calendar, gradient: "from-rose-500 to-pink-500",
    title: "Calendario visual",
    desc: "Vista mensual con pastillas de color por tipo de evento. Haz clic en un día para ver o editar la reserva.",
    tips: ["Colores por tipo", "Click para editar", "Detecta solapamientos"] },
  { route: "/socios", target: null, icon: Users, gradient: "from-sky-500 to-cyan-500",
    title: "Tu equipo (Socios)",
    desc: "Registra a tus socios (fotógrafos, videógrafos, editores), asígnales eventos y controla si les debes o ya pagaste.",
    tips: ["Fotos de perfil", "Tarifa por evento", "Estado Pendiente / Pagado"] },
  { route: "/base-de-datos", target: '[data-testid="db-url-input"]', icon: Cloud, gradient: "from-emerald-500 to-green-500",
    title: "Tus datos: local o en la nube",
    desc: "Puedes guardar todo localmente en este equipo, o conectar tu propio MongoDB (Atlas, NAS o servidor) para acceder desde varios dispositivos.",
    tips: ["💾 Modo local sin cuenta", "☁️ MongoDB Atlas gratis", "Cambia entre modos cuando quieras"] },
  { route: "/dashboard", target: null, icon: Gift, gradient: "from-purple-500 to-fuchsia-500",
    title: "¡Listo para empezar! 🎉",
    desc: "Ya conoces lo básico. Empieza creando tu primera reserva. Puedes volver a ver este tutorial desde Apariencia.",
    tips: ["Reinicia el tutorial cuando quieras", "Explora las demás secciones", "¡A trabajar!"] },
];

// Partículas de fondo aleatorias
const Particles = () => {
  const particles = useMemo(() => Array.from({ length: 25 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    duration: Math.random() * 4 + 3,
    delay: Math.random() * 2,
  })), []);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white/40"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.2, 0.8, 0.2],
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

export default function WelcomeTour() {
  const { showTour, endTour } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);

  const current = TOUR_STEPS[step];
  const total = TOUR_STEPS.length;

  const locateTarget = useCallback(() => {
    if (!current?.target) { setRect(null); return; }

    const tryLocate = (attempts = 0) => {
      const el = document.querySelector(current.target);
      if (!el) {
        // Reintentar hasta 8 veces con delay creciente
        if (attempts < 8) {
          setTimeout(() => tryLocate(attempts + 1), 200 + attempts * 100);
        } else {
          setRect(null);
        }
        return;
      }

      // Scroll y esperar
      el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });

      // Esperar a que termine el scroll (múltiples mediciones)
      let stableCount = 0;
      let lastTop = null;
      const measure = () => {
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) {
          // Elemento no visible, seguir esperando
          setTimeout(measure, 100);
          return;
        }
        if (lastTop !== null && Math.abs(r.top - lastTop) < 1) {
          stableCount++;
          if (stableCount >= 2) {
            // Rect estable: mostrarlo
            setRect({
              top: Math.max(r.top, 8),
              left: Math.max(r.left, 8),
              width: Math.min(r.width, window.innerWidth - 16),
              height: Math.min(r.height, window.innerHeight - 16),
            });
            return;
          }
        } else {
          stableCount = 0;
        }
        lastTop = r.top;
        setTimeout(measure, 80);
      };
      setTimeout(measure, 500); // esperar inicio del scroll
    };

    tryLocate();
  }, [current]);

  useEffect(() => {
    if (!showTour) return;
    setRect(null);
    if (location.pathname !== current.route) navigate(current.route);
    const t = setTimeout(locateTarget, 550);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, showTour]);

  // Re-localizar target al hacer scroll o resize (spotlight sigue al elemento)
  useEffect(() => {
    if (!showTour || !current?.target) return;
    const el = document.querySelector(current.target);
    if (!el) return;
    let raf = null;
    const update = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        if (r.width > 4 && r.height > 4) {
          setRect({
            top: Math.max(r.top, 8),
            left: Math.max(r.left, 8),
            width: Math.min(r.width, window.innerWidth - 16),
            height: Math.min(r.height, window.innerHeight - 16),
          });
        }
      });
    };
    window.addEventListener("scroll", update, { passive: true, capture: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, { capture: true });
      window.removeEventListener("resize", update);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [showTour, current, step]);

  useEffect(() => { if (showTour) setStep(0); }, [showTour]);

  if (!showTour || !current) return null;

  const next = () => {
    if (step < total - 1) {
      setStep(step + 1);
    } else {
      celebrateTutorial();
      setTimeout(() => endTour(), 400);
    }
  };
  const prev = () => { if (step > 0) setStep(step - 1); };

  const Icon = current.icon;
  const isLast = step === total - 1;
  const isFirst = step === 0;

  return createPortal(
    <AnimatePresence>
      <motion.div key="tour" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200]" data-testid="welcome-tour-overlay">

        {/* Backdrop / spotlight */}
        {rect ? (
          <>
            <motion.div
              initial={false}
              animate={{ top: rect.top - 10, left: rect.left - 10, width: rect.width + 20, height: rect.height + 20 }}
              transition={{ type: "spring", stiffness: 200, damping: 26 }}
              className="fixed rounded-2xl pointer-events-none"
              style={{
                boxShadow: "0 0 0 9999px rgba(15,23,42,0.75)",
                border: "3px solid rgba(167,139,250,0.9)",
              }}
            >
              {/* Pulso animado alrededor del target */}
              <motion.div
                className="absolute inset-0 rounded-2xl"
                animate={{
                  boxShadow: [
                    "0 0 0 0 rgba(167,139,250,0.7)",
                    "0 0 0 20px rgba(167,139,250,0)",
                  ],
                }}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
              {/* Doble pulso extra */}
              <motion.div
                className="absolute inset-0 rounded-2xl"
                animate={{
                  boxShadow: [
                    "0 0 0 0 rgba(236,72,153,0.6)",
                    "0 0 0 28px rgba(236,72,153,0)",
                  ],
                }}
                transition={{ duration: 1.6, repeat: Infinity, delay: 0.4 }}
              />
              {/* Puntos brillantes en las esquinas */}
              {[[0,0],[100,0],[0,100],[100,100]].map(([x,y], i) => (
                <motion.div
                  key={i}
                  className="absolute w-3 h-3 rounded-full bg-white"
                  style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)", boxShadow: "0 0 12px rgba(255,255,255,1)" }}
                  animate={{ scale: [1, 1.6, 1], opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.12 }}
                />
              ))}
            </motion.div>
            {/* Flecha animada apuntando al target si está lejos del card */}
            {rect.top < window.innerHeight - 260 && rect.top + rect.height < window.innerHeight - 240 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: [0, -8, 0] }}
                transition={{ y: { duration: 1.2, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.4 } }}
                className="fixed pointer-events-none z-[210]"
                style={{
                  top: rect.top + rect.height + 12,
                  left: rect.left + rect.width / 2 - 16,
                }}
              >
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-2xl"
                  style={{ boxShadow: "0 8px 32px rgba(139,92,246,0.6)" }}>
                  <ArrowRight size={16} className="text-white rotate-90" />
                </div>
              </motion.div>
            )}
          </>
        ) : (
          <div className="fixed inset-0" style={{ background: "radial-gradient(circle at 50% 50%, rgba(15,23,42,0.55) 0%, rgba(15,23,42,0.88) 80%)" }}>
            <Particles />
          </div>
        )}

        {/* Card — épica con gradientes y animaciones */}
        <motion.div
          key={`card-${step}`}
          initial={{ opacity: 0, y: 40, scale: 0.92, rotateX: -8 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[min(500px,94vw)] rounded-3xl overflow-hidden"
          style={{
            boxShadow: "0 32px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)",
            transformStyle: "preserve-3d",
            perspective: "1000px",
          }}
          data-testid="tour-card"
        >
          {/* Header con gradiente dinámico */}
          <div className={`relative bg-gradient-to-br ${current.gradient} p-5 overflow-hidden`}>
            {/* Brillos decorativos */}
            <motion.div
              className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/20"
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <motion.div
              className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white/15"
              animate={{ scale: [1, 1.4, 1], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 3.5, repeat: Infinity, delay: 0.5 }}
            />

            <div className="relative flex items-center justify-between mb-3">
              <span className="flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full text-slate-900 bg-white/90 backdrop-blur">
                <Sparkles size={10} /> Paso {step + 1} / {total}
              </span>
              <button onClick={endTour} data-testid="tour-skip-btn"
                className="flex items-center gap-1 text-[11px] font-bold text-white/80 hover:text-white transition-colors">
                Saltar <X size={13} />
              </button>
            </div>

            <div className="relative flex items-start gap-3">
              {/* Icono animado con anillos */}
              <div className="relative flex-shrink-0">
                <motion.div
                  className="absolute inset-0 rounded-2xl bg-white/30"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                />
                <motion.div
                  className="relative w-14 h-14 rounded-2xl bg-white/25 backdrop-blur flex items-center justify-center"
                  animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.08, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity }}
                >
                  <Icon size={28} className="text-white" strokeWidth={2} />
                </motion.div>
              </div>

              <div className="flex-1 min-w-0 text-white">
                <motion.h3
                  key={`title-${step}`}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-xl font-black leading-tight"
                  style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
                >
                  {current.title}
                </motion.h3>
                <motion.p
                  key={`desc-${step}`}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 }}
                  className="text-sm text-white/90 leading-snug mt-1"
                >
                  {current.desc}
                </motion.p>
              </div>
            </div>
          </div>

          {/* Body con tips destacados */}
          <div className="bg-white p-5 space-y-3">
            {/* Tips como chips */}
            <div className="flex flex-wrap gap-1.5">
              {current.tips?.map((tip, i) => (
                <motion.span
                  key={`${step}-tip-${i}`}
                  initial={{ opacity: 0, scale: 0.8, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.08, type: "spring", stiffness: 300 }}
                  className="text-[10px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-700 flex items-center gap-1"
                >
                  <motion.span
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                    className="w-1.5 h-1.5 rounded-full bg-emerald-500"
                  />
                  {tip}
                </motion.span>
              ))}
            </div>

            {/* Progress bar con gradiente */}
            <div className="relative h-2 rounded-full bg-slate-100 overflow-hidden">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${current.gradient}`}
                animate={{ width: `${((step + 1) / total) * 100}%` }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              />
              {/* Brillo que recorre */}
              <motion.div
                className="absolute top-0 h-full w-8 bg-white/50 blur-sm"
                animate={{ left: ["-10%", "100%"] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            {/* Botones */}
            <div className="flex items-center justify-between pt-1">
              <motion.button
                whileHover={{ scale: isFirst ? 1 : 1.05, x: isFirst ? 0 : -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={prev} disabled={isFirst}
                data-testid="tour-prev-btn"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
              >
                <ArrowLeft size={13} /> Anterior
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.06, x: 2 }}
                whileTap={{ scale: 0.94 }}
                onClick={next} data-testid="tour-next-btn"
                className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white text-xs font-black bg-gradient-to-r ${current.gradient} shadow-lg`}
                style={{ boxShadow: "0 8px 24px rgba(139,92,246,0.35)" }}
              >
                {isLast ? (
                  <>
                    <motion.span
                      animate={{ rotate: [0, 20, -20, 0] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      🎉
                    </motion.span>
                    ¡Terminar!
                  </>
                ) : (
                  <>Siguiente <ArrowRight size={13} /></>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
