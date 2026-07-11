import { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Sparkles, AlertCircle, Camera, Video, Users, ArrowRight, Flame, TrendingDown, CheckCircle, Clock, ChevronDown } from "lucide-react";

/**
 * Big animated banner for the Socios (partners) page.
 * Rotates through partners with pending payments (name, role, amount, next event)
 * and shows the total debt owed to all partners in the top-right corner.
 */

const ROLE_ICON = { "Fotógrafo": Camera, "Videógrafo": Video, "Asistente": Users };

function useCounter(target, duration = 1400) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    if (target === undefined || target === null) return;
    const start = performance.now();
    const from = 0;
    const tick = (t) => {
      const p = Math.min((t - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 4);
      setDisplay(from + (target - from) * e);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => raf.current && cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return display;
}

function Particles({ count = 20 }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(count)].map((_, i) => {
        const size = 2 + Math.random() * 4;
        const left = Math.random() * 100;
        const delay = Math.random() * 5;
        const dur = 4 + Math.random() * 5;
        return (
          <motion.span
            key={i}
            className="absolute rounded-full bg-white"
            style={{ width: size, height: size, left: `${left}%`, bottom: -10, filter: "blur(0.5px)" }}
            animate={{ y: [0, -280 - Math.random() * 120], opacity: [0, 0.9, 0] }}
            transition={{ duration: dur, delay, repeat: Infinity, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}

export default function PartnerDebtBanner({
  socios = [],
  reservations = [],
  formatCurrency = (v) => `$${v?.toFixed(2) ?? 0}`,
  onScrollTo,
  onTogglePayment,
}) {
  const [expandedSocioId, setExpandedSocioId] = useState(null);
  const [togglingKey, setTogglingKey] = useState(null);
  // Build debt per socio
  const debts = useMemo(() => {
    const map = new Map();
    reservations.forEach((r) => {
      (r.assigned_partners || []).forEach((p) => {
        if (p.payment_status === "Pagado") return;
        const amount = parseFloat(p.payment) || 0;
        if (amount <= 0) return;
        const entry = map.get(p.socio_id) || { socio_id: p.socio_id, pending: 0, count: 0, next: null, events: [] };
        entry.pending += amount;
        entry.count += 1;
        entry.events.push({ reservation: r, amount });
        // pick the most upcoming event as "next"
        if (r.event_date) {
          if (!entry.next || r.event_date < entry.next.event_date) entry.next = r;
        }
        map.set(p.socio_id, entry);
      });
    });
    const arr = Array.from(map.values()).map((d) => {
      const s = socios.find((x) => x.id === d.socio_id);
      // sort each socio's events by date ascending
      d.events.sort((a, b) => (a.reservation.event_date || "").localeCompare(b.reservation.event_date || ""));
      return { ...d, socio: s };
    }).filter((d) => d.socio);
    // sort by biggest debt first
    arr.sort((a, b) => b.pending - a.pending);
    return arr;
  }, [reservations, socios]);

  const totalDebt = useMemo(() => debts.reduce((s, d) => s + d.pending, 0), [debts]);
  const totalDebtAnim = useCounter(totalDebt, 1600);
  const socioCount = debts.length;
  const socioCountAnim = useCounter(socioCount, 1000);

  // Rotating ticker across debts (every 3.2s)
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (debts.length < 2) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % debts.length), 3200);
    return () => clearInterval(id);
  }, [debts.length]);

  // If debts array changes size, reset idx safely
  useEffect(() => { if (idx >= debts.length) setIdx(0); }, [debts.length, idx]);

  const current = debts[idx];
  const CurIcon = current?.socio?.role ? (ROLE_ICON[current.socio.role] || Users) : Users;

  // Top 4 for breakdown
  const top = debts.slice(0, 4);

  const isCritical = totalDebt >= 5000;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[32px] mb-8 shadow-2xl"
      style={{
        background:
          "linear-gradient(120deg, #0b0f1a 0%, #1a1033 25%, #4a044e 60%, #7c2d12 100%)",
        boxShadow: "0 30px 80px -20px rgba(124, 45, 18, 0.55)",
      }}
      data-testid="partner-debt-banner"
    >
      {/* Animated gradient overlay */}
      <motion.div
        className="absolute inset-0 opacity-70 pointer-events-none"
        style={{
          background:
            "radial-gradient(60% 80% at 15% 25%, rgba(244,63,94,0.35), transparent 60%), radial-gradient(50% 80% at 85% 75%, rgba(251,146,60,0.30), transparent 60%)",
        }}
        animate={{ opacity: [0.55, 0.9, 0.55] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Grain */}
      <div
        className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence baseFrequency='0.9'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/></svg>\")",
        }}
      />

      {/* Rotating orbs */}
      <motion.div
        className="absolute -right-24 -top-24 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background:
            "conic-gradient(from 0deg, #f43f5e, #f97316, #eab308, #f43f5e)",
          filter: "blur(70px)",
          opacity: 0.35,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute -left-32 -bottom-32 w-[420px] h-[420px] rounded-full pointer-events-none"
        style={{
          background:
            "conic-gradient(from 180deg, #a855f7, #ec4899, #f43f5e, #a855f7)",
          filter: "blur(90px)",
          opacity: 0.28,
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      />

      <Particles count={22} />

      {/* CORNER — Total debt */}
      <motion.div
        initial={{ opacity: 0, x: 20, y: -10 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute top-5 right-5 z-20 rounded-2xl backdrop-blur-md px-4 py-3 pr-5"
        style={{
          background: "rgba(0,0,0,0.35)",
          border: "1px solid rgba(255,255,255,0.18)",
          boxShadow: "0 10px 40px -8px rgba(244,63,94,0.45)",
        }}
        data-testid="banner-total-debt"
      >
        <div className="flex items-center gap-2 mb-1">
          <motion.div
            animate={{ rotate: [0, -8, 8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Wallet size={12} className="text-rose-300" />
          </motion.div>
          <p className="text-[9px] uppercase tracking-[0.28em] text-white/75 font-black">
            Deuda total
          </p>
          {isCritical && (
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-rose-400"
            />
          )}
        </div>
        <p
          className="font-black text-white leading-none tracking-tight"
          style={{
            fontFamily: "Cabinet Grotesk, sans-serif",
            fontSize: "1.75rem",
            background: "linear-gradient(135deg,#fecdd3 0%,#fda4af 50%,#fdba74 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {formatCurrency(totalDebtAnim)}
        </p>
        <p className="text-[10px] text-white/60 font-bold mt-1">
          {socioCount} {socioCount === 1 ? "socio pendiente" : "socios pendientes"}
        </p>
      </motion.div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-8 p-8 md:p-10 pt-24 lg:pt-10">
        {/* LEFT — Rotating socio card */}
        <div className="flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-6">
            <motion.div
              animate={{ scale: [1, 1.15, 1], rotate: [0, 8, -8, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-11 h-11 rounded-2xl flex items-center justify-center backdrop-blur-md"
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}
            >
              <AlertCircle size={20} className="text-white" strokeWidth={2} />
            </motion.div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-white/70 font-black">
                A quién le toca pagar
              </p>
              <p className="text-xs text-white/50 mt-0.5 font-semibold">
                Rotación automática de pagos pendientes
              </p>
            </div>
            {isCritical && (
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.4 }}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                style={{
                  background: "linear-gradient(135deg,#f43f5e,#f97316)",
                  color: "white",
                  boxShadow: "0 6px 20px -4px rgba(244,63,94,0.6)",
                }}
              >
                <motion.span animate={{ rotate: [0, -12, 12, 0] }} transition={{ duration: 1.4, repeat: Infinity }}>
                  <Flame size={12} />
                </motion.span>
                Urgente
              </motion.div>
            )}
          </div>

          {/* Rotating socio */}
          {!current ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-start gap-3 pb-4"
            >
              <p
                className="font-black text-white tracking-tighter"
                style={{
                  fontFamily: "Cabinet Grotesk, sans-serif",
                  fontSize: "clamp(3rem, 8vw, 5rem)",
                  lineHeight: 1.05,
                  background: "linear-gradient(135deg,#fff,#a7f3d0)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Al día
              </p>
              <p className="text-white/80 font-bold text-base">
                No hay pagos pendientes al equipo. ¡Sigue así!
              </p>
            </motion.div>
          ) : (
            <div className="flex items-end gap-6 flex-wrap">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.socio_id + "-" + idx}
                  initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -24, filter: "blur(8px)" }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center gap-5 flex-1 min-w-[260px]"
                >
                  {/* Avatar */}
                  <motion.div
                    initial={{ scale: 0.6, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="relative shrink-0"
                  >
                    {current.socio.photo && current.socio.photo_content_type ? (
                      <img
                        src={`data:${current.socio.photo_content_type};base64,${current.socio.photo}`}
                        alt={current.socio.name}
                        className="w-24 h-24 rounded-3xl object-cover"
                        style={{
                          border: "3px solid rgba(255,255,255,0.35)",
                          boxShadow: "0 15px 40px -8px rgba(244,63,94,0.55)",
                        }}
                      />
                    ) : (
                      <div
                        className="w-24 h-24 rounded-3xl flex items-center justify-center"
                        style={{
                          background: "linear-gradient(135deg,#f43f5e 0%,#a855f7 100%)",
                          border: "3px solid rgba(255,255,255,0.35)",
                          boxShadow: "0 15px 40px -8px rgba(244,63,94,0.55)",
                        }}
                      >
                        <span
                          className="text-4xl font-black text-white"
                          style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
                        >
                          {current.socio.name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute -bottom-2 -right-2 w-8 h-8 rounded-2xl flex items-center justify-center"
                      style={{
                        background: "linear-gradient(135deg,#fff,#fed7aa)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                      }}
                    >
                      <CurIcon size={14} className="text-rose-600" />
                    </motion.div>
                  </motion.div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider"
                        style={{
                          background: "rgba(255,255,255,0.15)",
                          border: "1px solid rgba(255,255,255,0.25)",
                          color: "white",
                        }}
                        data-testid="banner-partner-role"
                      >
                        {current.socio.role || "Socio"}
                      </span>
                      <motion.span
                        animate={{ rotate: [0, 15, -15, 0] }}
                        transition={{ duration: 2.4, repeat: Infinity }}
                      >
                        <Sparkles size={14} className="text-yellow-300" />
                      </motion.span>
                    </div>
                    <p
                      className="font-black text-white tracking-tight leading-none"
                      style={{
                        fontFamily: "Cabinet Grotesk, sans-serif",
                        fontSize: "clamp(2rem, 4.5vw, 3.25rem)",
                        textShadow: "0 4px 30px rgba(244,63,94,0.35)",
                      }}
                      data-testid="banner-partner-name"
                    >
                      {current.socio.name}
                    </p>
                    <div className="mt-3 flex items-baseline gap-2 flex-wrap">
                      <span className="text-white/70 text-xs font-bold uppercase tracking-widest">
                        Se le debe
                      </span>
                      <p
                        className="font-black tracking-tight leading-none"
                        style={{
                          fontFamily: "Cabinet Grotesk, sans-serif",
                          fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
                          background: "linear-gradient(135deg,#fef3c7 0%,#fda4af 50%,#f9a8d4 100%)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                        data-testid="banner-partner-amount"
                      >
                        {formatCurrency(current.pending)}
                      </p>
                    </div>
                    {current.next && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 }}
                        className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md"
                        style={{
                          background: "rgba(255,255,255,0.10)",
                          border: "1px solid rgba(255,255,255,0.18)",
                        }}
                      >
                        <TrendingDown size={12} className="text-amber-300" />
                        <span className="text-white/85 text-[11px] font-bold">
                          {current.next.event_type}
                          {current.next.event_date
                            ? ` · ${current.next.event_date.split("-").reverse().join("/")}`
                            : ""}
                        </span>
                        <span className="text-white/50 text-[11px] font-semibold">
                          · {current.count} {current.count === 1 ? "evento" : "eventos"}
                        </span>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          {/* Dots pagination for ticker */}
          {debts.length > 1 && (
            <div className="mt-6 flex items-center gap-1.5" data-testid="banner-dots">
              {debts.slice(0, 8).map((d, i) => (
                <button
                  key={d.socio_id}
                  onClick={() => setIdx(i)}
                  aria-label={`Ver socio ${i + 1}`}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: i === idx ? 28 : 8,
                    background:
                      i === idx
                        ? "linear-gradient(90deg,#fda4af,#fdba74)"
                        : "rgba(255,255,255,0.25)",
                  }}
                />
              ))}
              {debts.length > 8 && (
                <span className="text-white/50 text-[10px] font-bold ml-1">
                  +{debts.length - 8}
                </span>
              )}
            </div>
          )}
        </div>

        {/* RIGHT — Top deudores breakdown */}
        <div className="flex flex-col justify-between gap-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
            className="rounded-3xl p-6 backdrop-blur-md relative overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.18)",
            }}
          >
            <motion.div
              className="absolute -right-8 -top-8 w-32 h-32 rounded-full"
              style={{ background: "radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%)" }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="flex items-center gap-2 mb-3 relative z-10">
              <Users size={14} className="text-rose-300" />
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/70 font-black">
                Socios con deuda
              </p>
            </div>
            <div className="flex items-end gap-3 relative z-10 mb-4">
              <p
                className="text-6xl font-black text-white leading-none tracking-tight"
                style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
                data-testid="banner-debt-count"
              >
                {Math.round(socioCountAnim)}
              </p>
              <p className="text-white/70 text-xs font-bold pb-2 leading-tight">
                {socioCount === 1 ? "por pagar" : "por pagar"}
              </p>
            </div>

            {top.length > 0 ? (
              <div className="space-y-1.5 relative z-10" data-testid="banner-debt-breakdown">
                {top.map((d, i) => {
                  const isExpanded = expandedSocioId === d.socio_id;
                  return (
                    <motion.div
                      key={d.socio_id}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.08 }}
                      className="rounded-xl overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                      data-testid={`banner-debt-row-${d.socio_id}`}
                    >
                      <div className="flex items-stretch">
                        <button
                          onClick={() => { setIdx(debts.findIndex(x => x.socio_id === d.socio_id)); setExpandedSocioId(isExpanded ? null : d.socio_id); }}
                          className="flex-1 flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-white/[0.10] transition-colors"
                          data-testid={`banner-debt-row-toggle-${d.socio_id}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {d.socio.photo && d.socio.photo_content_type ? (
                              <img
                                src={`data:${d.socio.photo_content_type};base64,${d.socio.photo}`}
                                alt=""
                                className="w-6 h-6 rounded-lg object-cover shrink-0"
                              />
                            ) : (
                              <div
                                className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black text-white"
                                style={{ background: "linear-gradient(135deg,#f43f5e,#a855f7)" }}
                              >
                                {d.socio.name?.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="text-white/90 text-xs font-black truncate">
                              {d.socio.name}
                            </span>
                            <span className="text-white/40 text-[10px] font-bold shrink-0">
                              · {d.count}
                            </span>
                          </div>
                          <span
                            className="text-[11px] font-black px-2 py-0.5 rounded-full whitespace-nowrap"
                            style={{
                              background: "linear-gradient(135deg,#fda4af,#fdba74)",
                              color: "#7f1d1d",
                            }}
                          >
                            {formatCurrency(d.pending)}
                          </span>
                          <motion.span
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown size={12} className="text-white/60 shrink-0" />
                          </motion.span>
                        </button>
                        {onScrollTo && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onScrollTo(d.socio_id); }}
                            className="px-2 hover:bg-white/[0.10] transition-colors border-l border-white/10"
                            title="Ir a la tarjeta del socio"
                            data-testid={`banner-goto-${d.socio_id}`}
                          >
                            <ArrowRight size={12} className="text-white/50" />
                          </button>
                        )}
                      </div>

                      {/* Expanded: lista de eventos con toggle pagado/pendiente */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div
                              className="p-2 space-y-1 border-t border-white/10"
                              style={{ background: "rgba(0,0,0,0.18)" }}
                              data-testid={`banner-events-${d.socio_id}`}
                            >
                              {d.events.map(({ reservation: ev, amount }) => {
                                const key = `${ev.id}-${d.socio_id}`;
                                const isToggling = togglingKey === key;
                                return (
                                  <div key={ev.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.04]">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[11px] font-black text-white/90 truncate">{ev.event_type}</p>
                                      <p className="text-[9px] text-white/50 font-semibold truncate">
                                        {ev.client_name}
                                        {ev.event_date ? ` · ${ev.event_date.split("-").reverse().join("/")}` : ""}
                                      </p>
                                    </div>
                                    <span
                                      className="text-[10px] font-black text-white/90 whitespace-nowrap"
                                      style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
                                    >
                                      {formatCurrency(amount)}
                                    </span>
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (!onTogglePayment || isToggling) return;
                                        setTogglingKey(key);
                                        try { await onTogglePayment(ev, d.socio_id); }
                                        finally { setTogglingKey(null); }
                                      }}
                                      disabled={isToggling || !onTogglePayment}
                                      data-testid={`banner-toggle-payment-${ev.id}-${d.socio_id}`}
                                      className="flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-black transition-all bg-amber-100 text-amber-800 hover:bg-emerald-100 hover:text-emerald-800 disabled:opacity-50"
                                      title="Marcar como pagado"
                                    >
                                      {isToggling
                                        ? <Clock size={9} className="animate-spin" />
                                        : <><Clock size={9} /> Pagar</>}
                                    </button>
                                  </div>
                                );
                              })}
                              <p className="text-[9px] text-white/40 font-semibold text-center pt-1">
                                Toca “Pagar” para marcar cada evento como pagado
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
                {debts.length > top.length && (
                  <p className="text-white/50 text-[10px] font-bold text-center pt-1">
                    +{debts.length - top.length} socios más
                  </p>
                )}
              </div>
            ) : (
              <p className="text-white/60 text-xs font-semibold relative z-10">
                Todos los pagos al equipo están al día ✓
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
