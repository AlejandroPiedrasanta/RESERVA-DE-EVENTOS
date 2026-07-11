import { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, Clock, MapPin, User, Camera, DollarSign, Phone, Package, ArrowRight, MousePointerClick } from "lucide-react";
import { getEventConfig } from "@/lib/eventConfig";

/**
 * Wrapper "hover-to-navigate" con preview flotante.
 *
 * UX:
 *   · Hover 200ms  → aparece el preview con datos clave del evento.
 *   · Hover 1500ms → navega automáticamente (barra de progreso lo anuncia).
 *   · Click        → navega al instante (atajo para power users).
 *   · Salir mouse  → cancela todo y oculta preview.
 *
 * Objetivo: que el usuario entienda de un vistazo QUÉ es cada card sin
 * tener que abrirlo, y que la navegación al detalle sea intuitiva (no
 * "adivinar dónde hago click").
 */
const AUTO_NAV_MS = 1500;
const PREVIEW_DELAY_MS = 200;

const monthAbbrEs = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const monthAbbrEn = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatFullDate(dt, language = "es") {
  if (!dt) return "—";
  const [y, m, d] = dt.split("-");
  if (!y || !m || !d) return dt;
  const arr = language === "es" ? monthAbbrEs : monthAbbrEn;
  return `${parseInt(d, 10)} ${arr[parseInt(m,10)-1]} ${y}`;
}

export default function EventHoverCard({
  event,
  socio,
  partnersCount = 0,
  onNavigate,
  formatCurrency = (n) => `$${n}`,
  statusLabel,
  language = "es",
  className = "",
  children,
  testId,
}) {
  const [hovering, setHovering] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [progress, setProgress] = useState(0);
  const wrapperRef = useRef(null);
  const previewTimerRef = useRef(null);
  const navTimerRef = useRef(null);
  const progressRafRef = useRef(null);
  const navigatedRef = useRef(false);

  const cfg = getEventConfig(event?.event_type);
  const Icon = cfg?.icon || CalendarDays;

  const clearAll = useCallback(() => {
    if (previewTimerRef.current) { clearTimeout(previewTimerRef.current); previewTimerRef.current = null; }
    if (navTimerRef.current) { clearTimeout(navTimerRef.current); navTimerRef.current = null; }
    if (progressRafRef.current) { cancelAnimationFrame(progressRafRef.current); progressRafRef.current = null; }
  }, []);

  const startHover = useCallback(() => {
    if (navigatedRef.current) return;
    setHovering(true);
    // Preview aparece a 200ms
    previewTimerRef.current = setTimeout(() => setShowPreview(true), PREVIEW_DELAY_MS);
    // Auto-navegación a 1500ms
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min((t - t0) / AUTO_NAV_MS, 1);
      setProgress(p);
      if (p < 1) progressRafRef.current = requestAnimationFrame(tick);
    };
    progressRafRef.current = requestAnimationFrame(tick);
    navTimerRef.current = setTimeout(() => {
      navigatedRef.current = true;
      onNavigate?.();
    }, AUTO_NAV_MS);
  }, [onNavigate]);

  const endHover = useCallback(() => {
    clearAll();
    setHovering(false);
    setShowPreview(false);
    setProgress(0);
  }, [clearAll]);

  const handleClick = useCallback(() => {
    clearAll();
    navigatedRef.current = true;
    onNavigate?.();
  }, [clearAll, onNavigate]);

  // Cleanup on unmount
  useEffect(() => () => clearAll(), [clearAll]);

  const isPaid = socio && socio.payment_status === "Pagado";

  return (
    <div
      ref={wrapperRef}
      className={`relative ${className}`}
      onMouseEnter={startHover}
      onMouseLeave={endHover}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } }}
      role="button"
      tabIndex={0}
      aria-label={language === "es" ? `Abrir evento de ${event?.client_name || ""}` : `Open event for ${event?.client_name || ""}`}
      data-testid={testId}
    >
      {children}

      {/* Barra de progreso de auto-navegación (feedback visual crítico) */}
      <AnimatePresence>
        {hovering && progress > 0 && progress < 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute left-3 right-3 bottom-1 h-[3px] rounded-full overflow-hidden bg-black/5 z-20"
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress * 100}%`,
                background: `linear-gradient(90deg, ${cfg.fg}, ${cfg.fg}bb)`,
                transition: "width 60ms linear",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview tooltip flotante — arriba a la derecha del card */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute z-40 right-3 top-[calc(100%+8px)] w-[300px] rounded-2xl shadow-2xl border border-white/70 overflow-hidden"
            style={{ background: "rgba(255,255,255,0.98)", backdropFilter: "blur(20px)" }}
            data-testid="event-hover-preview"
          >
            {/* Franja superior del color del evento */}
            <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${cfg.fg}, ${cfg.fg}88)` }} />
            <div className="p-4">
              {/* Header: tipo + fecha */}
              <div className="flex items-start gap-2.5 mb-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: cfg.fg + "1c" }}
                >
                  <Icon size={16} style={{ color: cfg.fg }} strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-base font-black leading-tight truncate"
                    style={{ color: cfg.fg, fontFamily: "Cabinet Grotesk, sans-serif" }}
                  >
                    {event?.event_type || (language === "es" ? "Evento" : "Event")}
                  </p>
                  <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mt-0.5">
                    <CalendarDays size={10} strokeWidth={2.4} />
                    {formatFullDate(event?.event_date, language)}
                    {event?.event_time && (
                      <>
                        <span className="text-slate-300">·</span>
                        <Clock size={10} strokeWidth={2.4} />
                        {event.event_time}
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Datos clave */}
              <div className="space-y-1.5 text-[12px]">
                <PreviewRow icon={User} label={language === "es" ? "Cliente" : "Client"} value={event?.client_name} />
                {event?.client_phone && (
                  <PreviewRow icon={Phone} label={language === "es" ? "Teléfono" : "Phone"} value={event.client_phone} />
                )}
                {event?.venue && (
                  <PreviewRow icon={MapPin} label={language === "es" ? "Lugar" : "Venue"} value={event.venue} />
                )}
                {event?.package_type && (
                  <PreviewRow icon={Package} label={language === "es" ? "Paquete" : "Package"} value={event.package_type} />
                )}
                {socio && (
                  <PreviewRow
                    icon={Camera}
                    label={language === "es" ? "Fotógrafo" : "Photographer"}
                    value={
                      <>
                        {socio.name}
                        {partnersCount > 1 && (
                          <span className="text-slate-400 font-semibold"> · +{partnersCount - 1}</span>
                        )}
                      </>
                    }
                  />
                )}
              </div>

              {/* Monto + estado */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    {language === "es" ? "Monto" : "Amount"}
                  </span>
                  <span
                    className="text-lg font-black leading-none text-slate-900"
                    style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
                  >
                    {event?.total_amount > 0 ? formatCurrency(event.total_amount) : "—"}
                  </span>
                </div>
                {statusLabel && (
                  <span
                    className="text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider"
                    style={{ background: cfg.fg + "1c", color: cfg.fg }}
                  >
                    {statusLabel}
                  </span>
                )}
              </div>

              {/* CTA hint */}
              <div className="mt-3 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span className="flex items-center gap-1">
                  <MousePointerClick size={10} strokeWidth={2.4} />
                  {language === "es" ? "Click para abrir" : "Click to open"}
                </span>
                <span className="flex items-center gap-1" style={{ color: cfg.fg }}>
                  {language === "es" ? "Abriendo" : "Opening"}
                  <ArrowRight size={10} strokeWidth={2.4} />
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PreviewRow({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Icon size={11} className="text-slate-400 flex-shrink-0" strokeWidth={2.2} />
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider min-w-[52px]">{label}</span>
      <span className="text-[12px] font-bold text-slate-700 truncate">{value}</span>
    </div>
  );
}
