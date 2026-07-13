import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getStats, getReservations, getSocios } from "@/lib/api";
import { CalendarDays, Clock, CreditCard, TrendingUp, Plus, ArrowRight, BarChart2, DollarSign, Camera, User, CheckCircle, AlertCircle, LayoutDashboard, MapPin, Sparkles, Flame, Zap, Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings, STATUS_COLOR_CLASSES } from "@/context/SettingsContext";
import ReservationForm from "@/components/ReservationForm";
import { getEventConfig } from "@/lib/eventConfig";
import MonthlyEventsBanner from "@/components/MonthlyEventsBanner";
import EventNotificationPopup from "@/components/EventNotificationPopup";
import NextEventReminderPopup from "@/components/NextEventReminderPopup";
import AnimatedEventTypeCard from "@/components/AnimatedEventTypeCard";
import PageHeader from "@/components/PageHeader";
import EventHoverCard from "@/components/EventHoverCard";

const FALLBACK_COLOR = "bg-slate-100/80 text-slate-700 border-slate-200/60";

const STAT_GRADIENTS = [
  "linear-gradient(135deg,#6366f1,#8b5cf6)",
  "linear-gradient(135deg,#10b981,#06b6d4)",
  "linear-gradient(135deg,#f59e0b,#f97316)",
  "linear-gradient(135deg,#a855f7,#ec4899)",
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 24, filter: "blur(4px)" }, show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } };

function StatCard({ icon: Icon, label, value, sub, gradient }) {
  return (
    <motion.div variants={item} whileHover={{ y: -4, transition: { duration: 0.2 } }} className="glass rounded-3xl p-6 cursor-default group">
      <div className="flex items-start justify-between mb-4">
        <div className="relative w-10 h-10">
          <motion.div
            className="absolute inset-0 rounded-2xl"
            style={{ background: gradient }}
            animate={{ scale: [1, 1.55], opacity: [0.35, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            whileHover={{ rotate: [0, -10, 10, 0], scale: 1.12, transition: { duration: 0.45 } }}
            className="relative w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm"
            style={{ background: gradient }}
          >
            <Icon size={16} strokeWidth={1.5} className="text-white" />
          </motion.div>
        </div>
        <motion.span animate={{ y: [0, -3, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}>
          <TrendingUp size={12} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
        </motion.span>
      </div>
      <motion.p
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 18, delay: 0.15 }}
        className="text-3xl font-black text-slate-900 tracking-tight mb-1" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>{value}</motion.p>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </motion.div>
  );
}

function AnimatedCounter({ target, duration = 900 }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    if (!target) { setDisplay(0); return; }
    const start = Date.now();
    const animate = () => {
      const p = Math.min((Date.now() - start) / duration, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(e * target));
      if (p < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration]);
  return display;
}

function EventTypeCard({ type, count, total, index }) {
  const cfg = getEventConfig(type);
  const Icon = cfg.icon;
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <motion.div
      variants={item}
      whileHover={{ y: -8, scale: 1.03, transition: { duration: 0.22 } }}
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        boxShadow: "0 4px 24px -4px rgba(0,0,0,0.06)",
      }}
      className="relative overflow-hidden rounded-3xl p-5 cursor-default"
      data-testid={`event-type-card-${type.replace(/\s+/g, "-").toLowerCase()}`}
    >
      {/* Decorative background circle */}
      <div
        className="absolute -right-8 -bottom-8 w-28 h-28 rounded-full pointer-events-none"
        style={{ background: cfg.fg, opacity: 0.07 }}
      />
      {/* Second smaller circle */}
      <div
        className="absolute -right-2 -top-2 w-14 h-14 rounded-full pointer-events-none"
        style={{ background: cfg.fg, opacity: 0.04 }}
      />

      {/* Icon */}
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.08 + index * 0.07 }}
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: cfg.fg + "1c" }}
      >
        <Icon size={22} style={{ color: cfg.fg }} strokeWidth={1.7} />
      </motion.div>

      {/* Animated count */}
      <p
        className="text-4xl font-black tracking-tight leading-none"
        style={{ color: cfg.fg, fontFamily: "Cabinet Grotesk, sans-serif" }}
      >
        <AnimatedCounter target={count} duration={800 + index * 120} />
      </p>
      <p className="text-sm font-semibold mt-1.5 leading-tight" style={{ color: cfg.fg, opacity: 0.8 }}>
        {type}
      </p>

      {/* Progress bar */}
      <div
        className="mt-3.5 h-1.5 rounded-full overflow-hidden"
        style={{ background: cfg.fg + "20" }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1], delay: 0.4 + index * 0.07 }}
          style={{ background: cfg.fg }}
          className="h-full rounded-full"
        />
      </div>
      <p className="text-[11px] mt-1.5 font-semibold" style={{ color: cfg.fg, opacity: 0.55 }}>
        {pct}% del total
      </p>
    </motion.div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [all, setAll] = useState([]);
  const [socios, setSocios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [typeFilter, setTypeFilter] = useState("month"); // "month" | "year" | "all"
  const navigate = useNavigate();
  const { tr, formatCurrency, language, activeStatuses, swapNameEventType, dashboardWidgets, dashboardRecentStyle } = useSettings();
  const d = tr.dashboard;

  // Build dynamic status color lookup
  const statusColors = Object.fromEntries(
    activeStatuses.map(s => [s.key, STATUS_COLOR_CLASSES[s.color] || FALLBACK_COLOR])
  );

  // Socio lookup map: id → socio
  const socioMap = Object.fromEntries(socios.map(s => [s.id, s]));

  const load = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [s, r, sc] = await Promise.all([getStats(), getReservations(), getSocios()]);
      setStats(s);
      setSocios(sc);
      setAll(r);
      const now = new Date();
      const cm = now.getMonth();
      const cy = now.getFullYear();
      const monthEvents = [...r]
        .filter(res => {
          if (!res.event_date) return false;
          if (res.status === "Cancelado") return false;
          const d = new Date(res.event_date + "T00:00:00");
          return d.getMonth() === cm && d.getFullYear() === cy;
        })
        .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
      setRecent(monthEvents);
    } catch (e) { console.error(e); } finally { if (!silent) setLoading(false); }
  };

  const currentMonthName = tr.months[new Date().getMonth()];
  const nextMonthName = tr.months[(new Date().getMonth() + 1) % 12];

  // Future pending events: active (non-cancelled/completed) events dated AFTER end of current month
  const _now = new Date();
  const _endCurrent = new Date(_now.getFullYear(), _now.getMonth() + 1, 1); // 1st of next month
  const futurePendingEvents = all.filter(r => {
    if (!r.event_date) return false;
    if (r.status === "Cancelado" || r.status === "Completado") return false;
    const d = new Date(r.event_date + "T00:00:00");
    return d >= _endCurrent;
  });

  useEffect(() => { load(); }, []);

  const formatDate = (dt) => { if (!dt) return "-"; const [y, m, day] = dt.split("-"); return `${day}/${m}/${y}`; };
  const dateStr = new Date().toLocaleDateString(language === "es" ? "es-MX" : "en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const active = all.filter(r => r.status !== "Cancelado");
  // Helper: is a reservation fully paid (status Pagado OR advance_paid >= total_amount)
  const isReservationPaid = (r) => r?.status === "Pagado" || ((r?.total_amount || 0) > 0 && (r?.advance_paid || 0) >= (r?.total_amount || 0));
  const totalEventAmount = active.reduce((sum, r) => sum + (r.total_amount || 0), 0);
  const completedIncome  = all.filter(r => r.status === "Pagado").reduce((sum, r) => sum + (r.total_amount || 0), 0);
  const advanceIncome    = active.reduce((sum, r) => sum + (r.advance_paid || 0), 0);
  const pendingBalance   = active.reduce((sum, r) => sum + ((r.total_amount || 0) - (r.advance_paid || 0)), 0);
  const monthlyIncome    = recent.reduce((sum, r) => sum + (r.total_amount || 0), 0);

  const typeData = active.reduce((acc, r) => {
    acc[r.event_type || "Otro"] = (acc[r.event_type || "Otro"] || 0) + 1;
    return acc;
  }, {});
  const typeEntries = Object.entries(typeData).sort((a, b) => b[1] - a[1]);

  // Filtered event types by period (month / year / all)
  const _tfNow = new Date();
  const _tfMonth = _tfNow.getMonth();
  const _tfYear = _tfNow.getFullYear();
  const activeForTypes = active.filter(r => {
    if (typeFilter === "all") return true;
    if (!r.event_date) return false;
    const d = new Date(r.event_date + "T00:00:00");
    if (isNaN(d)) return false;
    // month (default)
    return d.getMonth() === _tfMonth && d.getFullYear() === _tfYear;
  });
  const typeDataFiltered = activeForTypes.reduce((acc, r) => {
    const key = r.event_type || "Otro";
    if (!acc[key]) acc[key] = { total: 0, paid: 0 };
    acc[key].total += 1;
    if (isReservationPaid(r)) acc[key].paid += 1;
    return acc;
  }, {});
  const typeEntriesFiltered = Object.entries(typeDataFiltered).sort((a, b) => b[1].total - a[1].total);

  // Build ordered, enabled widget list
  const WIDGET_DATA = {
    upcoming:      { icon: CalendarDays, label: d.upcoming,                                                value: recent.length,                  sub: currentMonthName,                                                   gradient: STAT_GRADIENTS[0] },
    total_res:     { icon: Clock,        label: d.total,                                                   value: stats?.total_reservations ?? 0, sub: d.totalSub,                                                         gradient: STAT_GRADIENTS[3] },
    total_events:  { icon: CreditCard,   label: language === "es" ? "Total Eventos"  : "Total Events",    value: formatCurrency(totalEventAmount), sub: language === "es" ? "Suma total activos"    : "All active events",  gradient: STAT_GRADIENTS[2] },
    real_income:   { icon: DollarSign,   label: d.realIncome,                                             value: formatCurrency(stats?.real_income), sub: d.realIncomeSub,                                                  gradient: STAT_GRADIENTS[1] },
    completed_inc: { icon: TrendingUp,   label: language === "es" ? "Ingreso Completadas" : "Completed Income", value: formatCurrency(completedIncome),  sub: language === "es" ? "Etiquetas Completado" : "Completed labels", gradient: "linear-gradient(135deg,#22c55e,#16a34a)" },
    advance_inc:   { icon: CreditCard,   label: language === "es" ? "Anticipos Cobrados" : "Advances Collected", value: formatCurrency(advanceIncome),    sub: language === "es" ? "Total anticipo activos" : "Active advances", gradient: "linear-gradient(135deg,#0ea5e9,#0284c7)" },
    monthly_inc:   { icon: BarChart2,    label: language === "es" ? "Ingreso del Mes"   : "Monthly Income",  value: formatCurrency(monthlyIncome),    sub: currentMonthName,                                                 gradient: "linear-gradient(135deg,#f43f5e,#e11d48)" },
    pending_bal:   { icon: Clock,        label: language === "es" ? "Saldo Pendiente"   : "Pending Balance",  value: formatCurrency(pendingBalance),   sub: language === "es" ? "Por cobrar activos"    : "Outstanding balance", gradient: "linear-gradient(135deg,#f97316,#ea580c)" },
  };

  const visibleWidgets = (dashboardWidgets || []).filter(w => w.enabled && WIDGET_DATA[w.id]);

  // Compute next upcoming event (any date >= today, not cancelled/completed)
  const _today = new Date(); _today.setHours(0,0,0,0);
  const nextEvent = [...all]
    .filter(r => r.event_date && r.status !== "Cancelado" && r.status !== "Completado" && new Date(r.event_date + "T00:00:00") >= _today)
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))[0] || null;
  const daysToNext = nextEvent
    ? Math.round((new Date(nextEvent.event_date + "T00:00:00") - _today) / 86400000)
    : null;
  const nextCfg = nextEvent ? getEventConfig(nextEvent.event_type) : null;
  const NextIcon = nextCfg?.icon;
  const isEventToday = daysToNext === 0;
  const isEventSoon = daysToNext !== null && daysToNext <= 3;

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <PageHeader
        icon={LayoutDashboard}
        title={tr.nav.dashboard}
        subtitle={dateStr}
        gradient="linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899)"
      />

      {/* Notificación URGENTE: evento hoy, mañana o dentro de 3 días */}
      <AnimatePresence>
        {!loading && nextEvent && isEventSoon && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="mb-6 rounded-2xl overflow-hidden shadow-lg cursor-pointer relative"
            onClick={() => navigate(`/reservaciones/${nextEvent.id}`)}
            data-testid="dashboard-urgent-event-notification"
            style={{
              background: isEventToday
                ? "linear-gradient(90deg,#ef4444,#f97316)"
                : daysToNext === 1
                  ? "linear-gradient(90deg,#f97316,#f59e0b)"
                  : "linear-gradient(90deg,#f59e0b,#eab308)",
            }}
          >
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "rgba(255,255,255,0.18)" }}
              animate={{ opacity: [0, 0.55, 0] }}
              transition={{ duration: 1.9, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="relative flex items-center gap-3 px-5 py-3.5 text-white">
              <motion.div
                animate={{ rotate: [0, -14, 14, 0], scale: [1, 1.15, 1] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                className="w-11 h-11 rounded-xl bg-white/25 flex items-center justify-center flex-shrink-0 backdrop-blur-sm"
              >
                <Bell size={19} strokeWidth={2.5} />
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/90 leading-none mb-1.5">
                  {isEventToday
                    ? (language === "es" ? "¡Atención! Evento HOY" : "Heads up! Event TODAY")
                    : daysToNext === 1
                      ? (language === "es" ? "¡Prepárate! Evento MAÑANA" : "Get ready! Event TOMORROW")
                      : (language === "es" ? `Recordatorio · Evento en ${daysToNext} días` : `Reminder · Event in ${daysToNext} days`)}
                </p>
                <p className="text-sm sm:text-base font-black truncate leading-tight">
                  {language === "es" ? "Oye, tienes un evento" : "Hey, you have an event"} · {nextEvent.event_type} · {nextEvent.client_name}
                  {nextEvent.event_time ? ` · ${nextEvent.event_time}` : ""}
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/25 backdrop-blur-sm text-[11px] font-black flex-shrink-0">
                {NextIcon ? <NextIcon size={12} strokeWidth={2.4} /> : <CalendarDays size={12} />}
                {nextEvent.venue || formatDate(nextEvent.event_date)}
              </div>
              <div className="flex flex-col items-center px-3 py-1.5 rounded-xl bg-white/25 backdrop-blur-sm text-white flex-shrink-0 min-w-[62px]">
                <span className="text-[9px] font-black uppercase tracking-widest opacity-90 leading-none">
                  {language === "es" ? "Faltan" : "In"}
                </span>
                <span className="text-lg font-black leading-none mt-0.5" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                  {isEventToday ? (language === "es" ? "¡Hoy!" : "Now!") : daysToNext}
                </span>
                {!isEventToday && (
                  <span className="text-[9px] font-black leading-none mt-0.5">
                    {daysToNext === 1 ? (language === "es" ? "día" : "day") : (language === "es" ? "días" : "days")}
                  </span>
                )}
              </div>
              <ArrowRight size={17} className="flex-shrink-0 opacity-90" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated banner: month events + future pending events (replaces stat cards) */}
      {loading ? (
        <div className="h-72 glass rounded-[32px] animate-pulse mb-8" />
      ) : (
        <MonthlyEventsBanner
          monthEvents={recent}
          pendingEvents={futurePendingEvents}
          nextMonthName={nextMonthName}
          monthName={currentMonthName}
          language={language}
          onCreate={() => setShowForm(true)}
          onViewAll={() => navigate("/reservaciones")}
          onEventClick={(id) => id && navigate(`/reservaciones/${id}`)}
        />
      )}

      {/* Popup notification (only fires once per month via sessionStorage) */}
      {!loading && recent.length > 0 && (
        <EventNotificationPopup
          events={recent}
          monthName={currentMonthName}
          language={language}
          onView={() => navigate("/reservaciones")}
        />
      )}

      {/* One-time reminder popup for the next upcoming event (today / tomorrow / soon) */}
      {!loading && nextEvent && (
        <NextEventReminderPopup
          event={nextEvent}
          daysToNext={daysToNext}
          language={language}
          onView={(ev) => navigate(`/reservaciones/${ev.id}`)}
        />
      )}

      {/* Recent reservations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="glass rounded-3xl overflow-hidden relative"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/40">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-black text-slate-900" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
              {d.upcomingTitle}
            </h2>
            <span className="text-[11px] font-black px-2.5 py-1 rounded-full btn-primary text-white">
              {currentMonthName}
            </span>
            {recent.length > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                {recent.length} {language === "es" ? "evento(s)" : "event(s)"}
              </span>
            )}
          </div>
          <motion.button
            whileHover={{ x: 3 }}
            onClick={() => navigate("/reservaciones")}
            className="text-xs font-bold flex items-center gap-1.5 transition-colors"
            style={{ color: "var(--t-from)" }}
            data-testid="view-all-link"
          >
            {tr.common.viewAll} <ArrowRight size={12} />
          </motion.button>
        </div>

        {recent.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-3xl bg-slate-100/80 flex items-center justify-center mx-auto mb-3 animate-float">
              <CalendarDays size={24} className="text-slate-300" />
            </div>
            <p className="text-slate-400 text-sm font-medium">
              {language === "es" ? `Sin eventos en ${currentMonthName}` : `No events in ${currentMonthName}`}
            </p>
            <p className="text-slate-300 text-xs mt-1">{d.createFirst}</p>
          </div>
        ) : dashboardRecentStyle === "tarjeta" ? (
          /* ── ESTILO TARJETA (full-width, spacious) ── */
          <div className="p-5 space-y-3">
            {recent.map((r, idx) => {
              const cfg = getEventConfig(r.event_type);
              const EvIcon = cfg.icon;
              const partners = (r.assigned_partners || []).map(p => ({ ...p, socio: socioMap[p.socio_id] })).filter(p => p.socio);
              const firstPartner = partners[0];
              const isPaid = isReservationPaid(r);
              return (
                <EventHoverCard
                  key={r.id}
                  event={r}
                  socio={firstPartner?.socio ? { ...firstPartner.socio, payment_status: firstPartner.payment_status } : null}
                  partnersCount={partners.length}
                  onNavigate={() => navigate(`/reservaciones/${r.id}`)}
                  formatCurrency={formatCurrency}
                  statusLabel={tr.statuses[r.status] || r.status}
                  language={language}
                  testId={`recent-row-${r.id}`}
                >
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }}
                    whileHover={{ y: -2, boxShadow: "0 8px 28px rgba(0,0,0,0.09)" }}
                    className="w-full bg-white/60 border border-white/70 rounded-2xl p-5 cursor-pointer transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: cfg.fg + "18" }}>
                        <EvIcon size={22} style={{ color: cfg.fg }} strokeWidth={1.8} />
                      </div>
                      <div>
                        <p className="text-2xl font-black leading-none" style={{ fontFamily: "Cabinet Grotesk, sans-serif", color: cfg.fg }}>{r.event_type || "Evento"}</p>
                        <p className="text-sm text-slate-500 font-semibold mt-0.5">{formatDate(r.event_date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {r.package_type && (
                        <span className={`text-xs font-black px-3 py-1 rounded-full ${r.package_type === "Completo" ? "bg-amber-100 text-amber-700" : r.package_type === "Intermedio" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>
                          {r.package_type}
                        </span>
                      )}
                      {r.total_amount > 0 && <span className="text-xl font-black text-slate-800">{formatCurrency(r.total_amount)}</span>}
                      <span className={`text-xs px-3 py-1.5 rounded-full border font-bold ${statusColors[r.status] || FALLBACK_COLOR}`}>{tr.statuses[r.status] || r.status}</span>
                    </div>
                  </div>
                  {firstPartner ? (
                    <div className="flex items-center gap-3 pt-3 border-t border-white/50">
                      <Camera size={14} className="text-slate-400" />
                      <span className="text-sm font-bold text-slate-700">{firstPartner.socio.name}</span>
                      {firstPartner.payment > 0 && <span className={`text-sm font-black ${isPaid ? "text-emerald-600" : "text-amber-600"}`}>{formatCurrency(firstPartner.payment)}</span>}
                      <span className={`text-xs font-black px-2.5 py-1 rounded-full ${isPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{isPaid ? "Pagado" : "Pendiente"}</span>
                      {partners.length > 1 && partners.slice(1).map((p2,pi) => (
                        <span key={p2.socio?.id || p2.socio?.name || pi} className="text-xs text-slate-500 font-semibold">{p2.socio.name}</span>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 pt-3 border-t border-white/50">
                      <User size={13} className="text-slate-300" />
                      <span className="text-sm text-slate-300 font-medium">{language === "es" ? "Sin fotógrafo asignado" : "No photographer assigned"}</span>
                    </div>
                  )}
                  </motion.div>
                </EventHoverCard>
              );
            })}
          </div>
        ) : dashboardRecentStyle === "linea_paquete" ? (
          /* ── ESTILO LÍNEA PAQUETE ── */
          <div className="divide-y divide-white/30">
            {recent.map((r, idx) => {
              const cfg = getEventConfig(r.event_type);
              const EvIcon = cfg.icon;
              const partners = (r.assigned_partners || []).map(p => ({ ...p, socio: socioMap[p.socio_id] })).filter(p => p.socio);
              const firstPartner = partners[0];
              const isPaid = isReservationPaid(r);
              return (
                <EventHoverCard
                  key={r.id}
                  event={r}
                  socio={firstPartner?.socio ? { ...firstPartner.socio, payment_status: firstPartner.payment_status } : null}
                  partnersCount={partners.length}
                  onNavigate={() => navigate(`/reservaciones/${r.id}`)}
                  formatCurrency={formatCurrency}
                  statusLabel={tr.statuses[r.status] || r.status}
                  language={language}
                  testId={`recent-row-${r.id}`}
                >
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + idx * 0.05 }}
                    whileHover={{ backgroundColor: "rgba(255,255,255,0.35)" }}
                    className="flex items-center gap-5 px-6 py-5 cursor-pointer transition-colors">
                  <div className="flex items-center gap-3 w-[30%] min-w-0">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.fg + "18" }}>
                      <EvIcon size={20} style={{ color: cfg.fg }} strokeWidth={1.8} />
                    </div>
                    <p className="text-2xl font-black truncate leading-none" style={{ fontFamily: "Cabinet Grotesk, sans-serif", color: cfg.fg }}>{r.event_type || "Evento"}</p>
                  </div>
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    {firstPartner ? (
                      <>
                        <Camera size={14} className="text-slate-400 flex-shrink-0" />
                        <span className="text-base font-bold text-slate-700 truncate">{firstPartner.socio.name}</span>
                        {firstPartner.payment > 0 && <span className={`text-base font-black flex-shrink-0 ${isPaid ? "text-emerald-600" : "text-amber-600"}`}>{formatCurrency(firstPartner.payment)}</span>}
                        <span className={`text-xs font-black px-2.5 py-1 rounded-full flex-shrink-0 ${isPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{isPaid ? "Pagado" : "Pendiente"}</span>
                        {partners.length > 1 && <span className="text-xs font-bold text-slate-400 flex-shrink-0">+{partners.length - 1}</span>}
                      </>
                    ) : (
                      <><User size={14} className="text-slate-300 flex-shrink-0" /><span className="text-sm text-slate-300 font-medium">Sin fotógrafo</span></>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {r.package_type ? (
                      <span className={`text-xs font-black px-3 py-1.5 rounded-full flex-shrink-0 ${r.package_type === "Completo" ? "bg-amber-100 text-amber-700" : r.package_type === "Intermedio" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>{r.package_type}</span>
                    ) : <span className="text-sm text-slate-300 font-medium">Sin paquete</span>}
                    <span className="text-base font-bold text-slate-500 whitespace-nowrap">{formatDate(r.event_date)}</span>
                    <span className={`text-xs px-3 py-1.5 rounded-full border font-bold whitespace-nowrap ${statusColors[r.status] || FALLBACK_COLOR}`}>{tr.statuses[r.status] || r.status}</span>
                  </div>
                  </motion.div>
                </EventHoverCard>
              );
            })}
          </div>
        ) : dashboardRecentStyle === "compacto" ? (
          /* ── ESTILO COMPACTO ── */
          <div className="px-4 py-3 space-y-1">
            {recent.map((r, idx) => {
              const cfg = getEventConfig(r.event_type);
              const partners = (r.assigned_partners || []).map(p => ({ ...p, socio: socioMap[p.socio_id] })).filter(p => p.socio);
              const firstPartner = partners[0];
              const isPaid = isReservationPaid(r);
              return (
                <EventHoverCard
                  key={r.id}
                  event={r}
                  socio={firstPartner?.socio ? { ...firstPartner.socio, payment_status: firstPartner.payment_status } : null}
                  partnersCount={partners.length}
                  onNavigate={() => navigate(`/reservaciones/${r.id}`)}
                  formatCurrency={formatCurrency}
                  statusLabel={tr.statuses[r.status] || r.status}
                  language={language}
                  testId={`recent-row-${r.id}`}
                >
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.04 }}
                    whileHover={{ backgroundColor: "rgba(255,255,255,0.5)" }}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cfg.fg }} />
                  <span className="text-sm font-black flex-1 truncate" style={{ color: cfg.fg }}>{r.event_type}</span>
                  {firstPartner && <span className="text-xs text-slate-500 truncate max-w-[100px]">{firstPartner.socio.name} · <span className={isPaid ? "text-emerald-600" : "text-amber-600"}>{formatCurrency(firstPartner.payment)}</span></span>}
                  {r.total_amount > 0 && <span className="text-xs font-bold text-slate-700 flex-shrink-0">{formatCurrency(r.total_amount)}</span>}
                  <span className="text-xs text-slate-400 flex-shrink-0">{formatDate(r.event_date)}</span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold flex-shrink-0 ${statusColors[r.status] || FALLBACK_COLOR}`}>{tr.statuses[r.status] || r.status}</span>
                  </motion.div>
                </EventHoverCard>
              );
            })}
          </div>
        ) : dashboardRecentStyle === "banda" ? (
          /* ── ESTILO BANDA ── */
          <div className="divide-y divide-white/30">
            {recent.map((r, idx) => {
              const cfg = getEventConfig(r.event_type);
              const EvIcon = cfg.icon;
              const partners = (r.assigned_partners || []).map(p => ({ ...p, socio: socioMap[p.socio_id] })).filter(p => p.socio);
              const firstPartner = partners[0];
              const isPaid = isReservationPaid(r);
              return (
                <EventHoverCard
                  key={r.id}
                  event={r}
                  socio={firstPartner?.socio ? { ...firstPartner.socio, payment_status: firstPartner.payment_status } : null}
                  partnersCount={partners.length}
                  onNavigate={() => navigate(`/reservaciones/${r.id}`)}
                  formatCurrency={formatCurrency}
                  statusLabel={tr.statuses[r.status] || r.status}
                  language={language}
                  testId={`recent-row-${r.id}`}
                >
                  <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                    whileHover={{ backgroundColor: "rgba(255,255,255,0.35)" }}
                    className="flex items-stretch cursor-pointer transition-colors overflow-hidden">
                  <div className="w-1.5 flex-shrink-0" style={{ background: cfg.fg }} />
                  <div className="flex items-center gap-5 px-5 py-4 flex-1">
                    <p className="text-xl font-black w-[28%] min-w-0 truncate" style={{ fontFamily: "Cabinet Grotesk, sans-serif", color: cfg.fg }}>{r.event_type || "Evento"}</p>
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      {firstPartner ? (
                        <><Camera size={13} className="text-slate-400 flex-shrink-0" /><span className="text-sm font-bold text-slate-700 truncate">{firstPartner.socio.name}</span>
                        {firstPartner.payment > 0 && <span className={`text-sm font-black flex-shrink-0 ${isPaid ? "text-emerald-600" : "text-amber-600"}`}>{formatCurrency(firstPartner.payment)}</span>}
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0 ${isPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{isPaid ? "Pagado" : "Pendiente"}</span></>
                      ) : <span className="text-sm text-slate-300">Sin fotógrafo</span>}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {r.total_amount > 0 && <span className="text-sm font-black text-slate-800">{formatCurrency(r.total_amount)}</span>}
                      <span className="text-sm font-bold text-slate-500">{formatDate(r.event_date)}</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full border font-bold ${statusColors[r.status] || FALLBACK_COLOR}`}>{tr.statuses[r.status] || r.status}</span>
                    </div>
                  </div>
                  </motion.div>
                </EventHoverCard>
              );
            })}
          </div>
        ) : (
          /* ── ESTILO LÍNEA (default) — WOOWY EDITION ── */
          <div className="p-4 space-y-3">
            {recent.map((r, idx) => {
              const cfg = getEventConfig(r.event_type);
              const EvIcon = cfg.icon;
              const partners = (r.assigned_partners || [])
                .map(p => ({ ...p, socio: socioMap[p.socio_id] }))
                .filter(p => p.socio);
              const firstPartner = partners[0];
              const isPaid = isReservationPaid(r);

              // Day + month abbrev
              const [ey, em, ed] = (r.event_date || "").split("-");
              const dayNum = ed ? parseInt(ed, 10) : "-";
              const monthAbbrEs = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];
              const monthAbbrEn = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
              const monthAbbr = em ? (language === "es" ? monthAbbrEs : monthAbbrEn)[parseInt(em,10)-1] : "";

              // Days until
              let daysUntil = null;
              if (ey && em && ed) {
                const eventD = new Date(parseInt(ey,10), parseInt(em,10)-1, parseInt(ed,10));
                const today0 = new Date(); today0.setHours(0,0,0,0);
                daysUntil = Math.round((eventD - today0) / 86400000);
              }
              const isToday = daysUntil === 0;
              const isTomorrow = daysUntil === 1;
              const isSoon = daysUntil !== null && daysUntil > 0 && daysUntil <= 7;

              let urgencyLabel = "";
              let urgencyClass = "bg-slate-100 text-slate-500";
              let UrgencyIcon = Clock;
              if (isToday) { urgencyLabel = language==="es"?"¡HOY!":"TODAY!"; urgencyClass="bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-md"; UrgencyIcon = Flame; }
              else if (isTomorrow) { urgencyLabel = language==="es"?"Mañana":"Tomorrow"; urgencyClass="bg-amber-100 text-amber-700 border border-amber-200"; UrgencyIcon = Zap; }
              else if (isSoon) { urgencyLabel = language==="es"?`En ${daysUntil}d`:`In ${daysUntil}d`; urgencyClass="bg-indigo-100 text-indigo-700 border border-indigo-200"; UrgencyIcon = Sparkles; }
              else if (daysUntil !== null && daysUntil > 7) { urgencyLabel = language==="es"?`En ${daysUntil}d`:`In ${daysUntil}d`; urgencyClass="bg-slate-100 text-slate-500 border border-slate-200"; }

              const paidPercent = r.total_amount > 0 ? Math.min(100, ((r.advance_paid || 0) / r.total_amount) * 100) : 0;

              return (
                <EventHoverCard
                  key={r.id}
                  event={r}
                  socio={firstPartner?.socio ? { ...firstPartner.socio, payment_status: firstPartner.payment_status } : null}
                  partnersCount={partners.length}
                  onNavigate={() => navigate(`/reservaciones/${r.id}`)}
                  formatCurrency={formatCurrency}
                  statusLabel={tr.statuses[r.status] || r.status}
                  language={language}
                  testId={`recent-row-${r.id}`}
                >
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.35 + idx * 0.08, type: "spring", stiffness: 180, damping: 22 }}
                  whileHover={{ y: -3, scale: 1.008 }}
                  className="group relative cursor-pointer"
                >
                  {/* Glow blur atrás en hover */}
                  <motion.div
                    className="absolute -inset-0.5 rounded-3xl opacity-0 group-hover:opacity-60 blur-xl transition-opacity duration-500 pointer-events-none"
                    style={{ background: `linear-gradient(90deg, ${cfg.fg}55, transparent 70%)` }}
                  />
                  {/* Sparkle animado si es HOY */}
                  {isToday && (
                    <motion.div
                      className="absolute -top-2 -right-2 z-10"
                      animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.15, 1] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-red-500 shadow-lg flex items-center justify-center border-2 border-white">
                        <Flame size={14} className="text-white" strokeWidth={2.5} />
                      </div>
                    </motion.div>
                  )}

                  <div className="relative bg-white/60 backdrop-blur-md border border-white/70 group-hover:border-white/90 rounded-3xl px-4 py-4 shadow-sm group-hover:shadow-xl transition-all duration-300 overflow-hidden">
                    {/* Barra lateral coloreada del tipo */}
                    <motion.div
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ background: `linear-gradient(180deg, ${cfg.fg}, ${cfg.fg}88)` }}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ delay: 0.4 + idx * 0.08, duration: 0.5 }}
                    />

                    <div className="flex items-center gap-4">
                      {/* ── DAY TILE grande ── */}
                      <motion.div
                        whileHover={{ rotate: [0, -6, 6, 0], scale: 1.06 }}
                        transition={{ duration: 0.5 }}
                        className="relative flex-shrink-0"
                      >
                        <motion.div
                          className="relative w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-2xl flex flex-col items-center justify-center shadow-md"
                          style={{
                            background: isToday
                              ? "linear-gradient(135deg, #f43f5e, #ef4444)"
                              : `linear-gradient(135deg, ${cfg.fg}, ${cfg.fg}bb)`,
                          }}
                          animate={isToday ? { boxShadow: ["0 4px 14px rgba(244,63,94,0.35)","0 4px 24px rgba(244,63,94,0.6)","0 4px 14px rgba(244,63,94,0.35)"] } : {}}
                          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                        >
                          {/* Highlight top */}
                          <div className="absolute top-0 left-0 right-0 h-3 bg-white/25 rounded-t-2xl"></div>
                          <span className="text-[9px] font-black text-white/85 tracking-wider mt-1 leading-none">{monthAbbr}</span>
                          <motion.span
                            key={dayNum}
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.5 + idx * 0.08, type: "spring", stiffness: 260 }}
                            className="text-3xl sm:text-4xl font-black text-white leading-none"
                            style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
                          >
                            {dayNum}
                          </motion.span>
                        </motion.div>
                      </motion.div>

                      {/* ── INFO CENTRAL ── */}
                      <div className="flex-1 min-w-0">
                        {/* Header: tipo evento + urgencia */}
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <motion.div
                            whileHover={{ rotate: [0, -10, 10, 0] }}
                            transition={{ duration: 0.4 }}
                            className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
                            style={{ background: cfg.fg + "1f" }}
                          >
                            <EvIcon size={14} style={{ color: cfg.fg }} strokeWidth={2.2} />
                          </motion.div>
                          <p
                            className="text-lg sm:text-xl font-black truncate leading-tight"
                            style={{ fontFamily: "Cabinet Grotesk, sans-serif", color: cfg.fg }}
                          >
                            {r.event_type || "Evento"}
                          </p>
                          {urgencyLabel && (
                            <motion.span
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.6 + idx * 0.08 }}
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${urgencyClass}`}
                            >
                              <UrgencyIcon size={10} strokeWidth={2.5} />
                              {urgencyLabel}
                            </motion.span>
                          )}
                          {r.package_type && (
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide hidden sm:inline-flex ${r.package_type === "Completo" ? "bg-amber-100 text-amber-700" : r.package_type === "Intermedio" ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-600"}`}>
                              {r.package_type}
                            </span>
                          )}
                        </div>

                        {/* Cliente + venue */}
                        <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1 font-semibold text-slate-700">
                            <User size={11} className="text-slate-400" strokeWidth={2.2} />
                            {r.client_name}
                          </span>
                          {r.venue && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="flex items-center gap-1 font-medium truncate max-w-[180px]">
                                <MapPin size={10} className="text-slate-400 flex-shrink-0" strokeWidth={2.2} />
                                {r.venue}
                              </span>
                            </>
                          )}
                          {r.event_time && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="flex items-center gap-1 font-medium">
                                <Clock size={10} className="text-slate-400" strokeWidth={2.2} />
                                {r.event_time}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Fotógrafo + pago */}
                        {firstPartner ? (
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="flex items-center gap-1 text-xs font-bold text-slate-600">
                              <Camera size={11} className="text-slate-400" strokeWidth={2.2} />
                              {firstPartner.socio.name}
                            </span>
                            {firstPartner.payment > 0 && (
                              <span className={`text-xs font-black ${isPaid ? "text-emerald-600" : "text-amber-600"}`}>
                                {formatCurrency(firstPartner.payment)}
                              </span>
                            )}
                            <motion.span
                              whileHover={{ scale: 1.06 }}
                              className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${isPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                            >
                              {isPaid ? (language === "es" ? "Pagado" : "Paid") : (language === "es" ? "Pendiente" : "Pending")}
                            </motion.span>
                            {partners.length > 1 && (
                              <span className="text-[10px] font-bold text-slate-400">+{partners.length - 1}</span>
                            )}
                          </div>
                        ) : null}
                      </div>

                      {/* ── DERECHA: monto + progreso + status ── */}
                      <div className="hidden md:flex flex-col items-end gap-1.5 flex-shrink-0 min-w-[160px]">
                        <motion.span
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.55 + idx * 0.08 }}
                          className="text-xl font-black text-slate-800 leading-none"
                          style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
                        >
                          {r.total_amount > 0 ? formatCurrency(r.total_amount) : "—"}
                        </motion.span>
                        {r.total_amount > 0 && (
                          <div className="flex items-center gap-2 w-full">
                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${paidPercent}%` }}
                                transition={{ delay: 0.7 + idx * 0.08, duration: 0.9, ease: "easeOut" }}
                                className="h-full rounded-full theme-progress"
                              />
                            </div>
                            <span className="text-[10px] font-black text-emerald-600 min-w-[32px] text-right">{Math.round(paidPercent)}%</span>
                          </div>
                        )}
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-black uppercase tracking-wider ${statusColors[r.status] || FALLBACK_COLOR}`}>
                          {tr.statuses[r.status] || r.status}
                        </span>
                      </div>

                      {/* Flecha CTA hover */}
                      <motion.div
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        animate={{ x: [0, 4, 0] }}
                        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center shadow-md"
                          style={{ background: cfg.fg }}
                        >
                          <ArrowRight size={14} className="text-white" strokeWidth={2.5} />
                        </div>
                      </motion.div>
                    </div>

                    {/* Mobile: monto + status abajo */}
                    <div className="flex md:hidden items-center justify-between mt-3 pt-3 border-t border-white/60">
                      <span className="text-base font-black text-slate-800" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                        {r.total_amount > 0 ? formatCurrency(r.total_amount) : "—"}
                      </span>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-black uppercase tracking-wider ${statusColors[r.status] || FALLBACK_COLOR}`}>
                        {tr.statuses[r.status] || r.status}
                      </span>
                    </div>
                  </div>
                </motion.div>
                </EventHoverCard>
              );
            })}
          </div>
        )}

        {/* ── Sub-sección: Tipos de Evento (unificado con Próximas Reservas) ── */}
        {!loading && typeEntries.length > 0 && (
          <div
            className="relative border-t border-white/40 px-6 py-6 overflow-hidden"
            data-testid="charts-section"
          >
            {/* Soft color accents */}
            <motion.div
              className="absolute -right-20 -top-20 w-72 h-72 rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, rgba(236,72,153,0.14), transparent 70%)",
              }}
              animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute -left-16 -bottom-16 w-64 h-64 rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, rgba(139,92,246,0.12), transparent 70%)",
              }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0.9, 0.6] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            />

            {/* Header */}
            <div className="relative z-10 flex flex-wrap items-center gap-4 mb-6">
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 220, damping: 14, delay: 0.55 }}
                className="relative w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg,#ec4899,#a855f7)",
                  boxShadow: "0 8px 20px -6px rgba(168,85,247,0.55)",
                }}
              >
                <BarChart2 size={18} className="text-white relative" strokeWidth={2.2} />
              </motion.div>
              <div className="flex-1 min-w-[180px]">
                <h2
                  className="text-xl font-black text-slate-900 leading-tight"
                  style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
                >
                  {language === "es" ? "Tipos de Evento" : "Event Types"}
                </h2>
                <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 mt-0.5">
                  <motion.span
                    className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"
                    animate={{ opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity }}
                  />
                  {(() => {
                    const paid = activeForTypes.filter(isReservationPaid).length;
                    return `${paid} / ${activeForTypes.length} ${language === "es" ? "pagados" : "paid"}`;
                  })()}
                  <span className="text-slate-300 mx-1">·</span>
                  {typeEntriesFiltered.length} {language === "es" ? "categorías" : "categories"}
                  <span className="text-slate-300 mx-1">·</span>
                  <span className="text-slate-500">
                    {typeFilter === "all"
                      ? (language === "es" ? "Todos" : "All")
                      : (language === "es" ? `Mes: ${currentMonthName}` : `Month: ${currentMonthName}`)}
                  </span>
                </p>
              </div>

              {/* Segmented filter: Mes / Todos */}
              <div
                className="flex items-center gap-1 p-1 rounded-full bg-white/70 border border-slate-200/70 backdrop-blur-sm shadow-sm"
                data-testid="event-types-filter"
              >
                {[
                  { key: "month", label: language === "es" ? "Mes" : "Month" },
                  { key: "all",   label: language === "es" ? "Todos" : "All"  },
                ].map(opt => {
                  const isActive = typeFilter === opt.key;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setTypeFilter(opt.key)}
                      data-testid={`event-types-filter-${opt.key}`}
                      className={`relative px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-full transition-colors ${
                        isActive ? "text-white" : "text-slate-600 hover:text-slate-900"
                      }`}
                      style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="event-types-filter-pill"
                          className="absolute inset-0 rounded-full"
                          style={{ background: "linear-gradient(135deg,#ec4899,#a855f7)" }}
                          transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Grid of animated cards */}
            {typeEntriesFiltered.length > 0 ? (
              <motion.div
                key={typeFilter}
                variants={container}
                initial="hidden"
                animate="show"
                className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {typeEntriesFiltered.map(([type, data], idx) => (
                  <AnimatedEventTypeCard
                    key={type}
                    type={type}
                    count={data.total}
                    total={data.total}
                    paidCount={data.paid}
                    index={idx}
                    language={language}
                  />
                ))}
              </motion.div>
            ) : (
              <div className="relative z-10 py-10 text-center text-sm text-slate-500 font-semibold">
                {language === "es"
                  ? "No hay reservas para este periodo."
                  : "No reservations for this period."}
              </div>
            )}
          </div>
        )}
      </motion.div>


      {showForm && (
        <ReservationForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load({ silent: true }); }}
        />
      )}
    </div>
  );
}
