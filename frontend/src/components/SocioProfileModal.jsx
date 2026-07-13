import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Camera, Video, Users, CheckCircle, Clock, DollarSign,
  CalendarDays, History, TrendingUp, Wallet, EyeOff, Eye, Phone, Trash2
} from "lucide-react";

const ROLE_ICONS = { "Fotógrafo": Camera, "Videógrafo": Video, "Asistente": Users };

const fmtLong = (d) => {
  if (!d) return "Sin fecha";
  try {
    return new Date(d + "T00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
  } catch { return d.split("-").reverse().join("/"); }
};

const relLabel = (d) => {
  if (!d) return "";
  const dt = new Date(d + "T00:00");
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const diff = Math.round((dt - now) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff > 1 && diff <= 30) return `En ${diff} días`;
  if (diff === -1) return "Ayer";
  if (diff < 0 && diff >= -30) return `Hace ${-diff} días`;
  return null;
};

function EventCard({ ev, socioId, formatCurrency, onTogglePayment, onRemove }) {
  const partner = (ev.assigned_partners || []).find(p => p.socio_id === socioId);
  const isPaid = partner?.payment_status === "Pagado";
  const rel = relLabel(ev.event_date);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      data-testid={`profile-event-${ev.id}`}
      className={`group rounded-2xl p-3.5 border transition-all ${
        isPaid
          ? "bg-emerald-50/70 border-emerald-200/70"
          : "bg-white/70 border-slate-200/70 hover:border-indigo-300/70 hover:shadow-md"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 ${isPaid ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"}`}>
          <span className="text-sm font-black leading-none" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
            {ev.event_date ? new Date(ev.event_date + "T00:00").getDate() : "?"}
          </span>
          <span className="text-[8px] font-bold uppercase mt-0.5">
            {ev.event_date ? new Date(ev.event_date + "T00:00").toLocaleDateString("es-ES", { month: "short" }) : ""}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-black text-slate-900 truncate flex-1">{ev.event_type}</p>
            {rel && <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap">{rel}</span>}
          </div>
          <p className="text-[11px] text-slate-500 truncate">{ev.client_name} · {fmtLong(ev.event_date)}</p>
          <div className="flex items-center gap-2 mt-2">
            {partner?.payment > 0 && (
              <span className="text-xs font-black text-slate-800">{formatCurrency(partner.payment)}</span>
            )}
            <button
              onClick={() => onTogglePayment(ev, socioId)}
              data-testid={`profile-toggle-payment-${ev.id}`}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black transition-all ${
                isPaid
                  ? "bg-emerald-100 text-emerald-700 hover:bg-amber-100 hover:text-amber-700"
                  : "bg-amber-100 text-amber-700 hover:bg-emerald-500 hover:text-white hover:shadow"
              }`}
            >
              <CheckCircle size={10} />
              <span className="group-hover:hidden">{isPaid ? "Pagado" : "Pendiente"}</span>
              <span className="hidden group-hover:inline">{isPaid ? "Marcar pendiente" : "Marcar pagado"}</span>
            </button>
            <button
              onClick={() => onRemove(ev, socioId)}
              data-testid={`profile-remove-${ev.id}`}
              className="ml-auto p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Quitar del evento"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function SocioProfileModal({ socio, events, formatCurrency, onTogglePayment, onRemove, onClose }) {
  const [hidePaid, setHidePaid] = useState(false);
  const RoleIcon = ROLE_ICONS[socio.role] || Users;
  const today = new Date().toISOString().slice(0, 10);

  const { upcoming, past, totalPaid, totalPending, paidCount } = useMemo(() => {
    let totalPaid = 0, totalPending = 0, paidCount = 0;
    events.forEach(ev => {
      const p = (ev.assigned_partners || []).find(x => x.socio_id === socio.id);
      if (!p) return;
      if (p.payment_status === "Pagado") { totalPaid += p.payment || 0; paidCount++; }
      else totalPending += p.payment || 0;
    });
    const isPaid = (ev) => (ev.assigned_partners || []).find(x => x.socio_id === socio.id)?.payment_status === "Pagado";
    const visible = hidePaid ? events.filter(ev => !isPaid(ev)) : events;
    const upcoming = visible.filter(ev => (ev.event_date || "") >= today).sort((a, b) => (a.event_date || "").localeCompare(b.event_date || ""));
    const past = visible.filter(ev => (ev.event_date || "") < today).sort((a, b) => (b.event_date || "").localeCompare(a.event_date || ""));
    return { upcoming, past, totalPaid, totalPending, paidCount };
  }, [events, hidePaid, socio.id, today]);

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
        data-testid="socio-profile-modal"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-lg max-h-[88vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl"
          style={{ background: "rgba(255,255,255,0.98)" }}
        >
          {/* Header con gradiente */}
          <div className="relative p-6 pb-5" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6,#d946ef)" }}>
            <button onClick={onClose} data-testid="profile-close-btn"
              className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/35 text-white transition-colors">
              <X size={16} />
            </button>
            <div className="flex items-center gap-4">
              <div className="relative">
                {socio.photo && socio.photo_content_type
                  ? <img src={`data:${socio.photo_content_type};base64,${socio.photo}`} alt={socio.name} className="w-16 h-16 rounded-2xl object-cover ring-4 ring-white/30 shadow-lg" />
                  : <div className="w-16 h-16 rounded-2xl bg-white/25 flex items-center justify-center ring-4 ring-white/30 shadow-lg"><span className="text-2xl font-black text-white">{socio.name?.charAt(0).toUpperCase()}</span></div>
                }
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow"><RoleIcon size={12} className="text-indigo-600" /></div>
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-black text-white truncate" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>{socio.name}</h2>
                <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-white/25 text-white font-bold mt-1">{socio.role}</span>
                {socio.phone && <p className="text-[11px] text-white/80 mt-1 flex items-center gap-1"><Phone size={10} /> {socio.phone}</p>}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mt-5">
              <div className="bg-white/15 rounded-2xl px-2 py-2.5 text-center backdrop-blur-sm">
                <TrendingUp size={13} className="text-white/70 mx-auto mb-1" />
                <p className="text-lg font-black text-white leading-none" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>{events.length}</p>
                <p className="text-[9px] text-white/70 font-bold uppercase mt-1">Eventos</p>
              </div>
              <div className="bg-white/15 rounded-2xl px-2 py-2.5 text-center backdrop-blur-sm">
                <CheckCircle size={13} className="text-emerald-200 mx-auto mb-1" />
                <p className="text-sm font-black text-white leading-none">{formatCurrency(totalPaid)}</p>
                <p className="text-[9px] text-white/70 font-bold uppercase mt-1">Pagado</p>
              </div>
              <div className="bg-white/15 rounded-2xl px-2 py-2.5 text-center backdrop-blur-sm">
                <Wallet size={13} className="text-amber-200 mx-auto mb-1" />
                <p className="text-sm font-black text-white leading-none">{formatCurrency(totalPending)}</p>
                <p className="text-[9px] text-white/70 font-bold uppercase mt-1">Pendiente</p>
              </div>
            </div>
          </div>

          {/* Toolbar: ocultar pagados */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Historial de eventos</p>
            <button
              onClick={() => setHidePaid(v => !v)}
              data-testid="profile-hide-paid-toggle"
              disabled={paidCount === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black transition-all disabled:opacity-40 ${
                hidePaid ? "bg-indigo-600 text-white shadow" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {hidePaid ? <EyeOff size={12} /> : <Eye size={12} />}
              {hidePaid ? "Mostrando pendientes" : "Ocultar pagados"}
            </button>
          </div>

          {/* Body scrollable */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {events.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3"><CalendarDays size={22} className="text-slate-300" /></div>
                <p className="text-sm text-slate-500 font-semibold">Aún no tiene eventos asignados</p>
              </div>
            ) : (
              <>
                <section data-testid="profile-upcoming-section">
                  <div className="flex items-center gap-2 mb-3">
                    <CalendarDays size={14} className="text-indigo-500" />
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide">Próximos eventos</h3>
                    <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-full">{upcoming.length}</span>
                  </div>
                  {upcoming.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2 pl-6">Sin eventos próximos {hidePaid ? "pendientes" : ""}</p>
                  ) : (
                    <div className="space-y-2">
                      <AnimatePresence>
                        {upcoming.map(ev => (
                          <EventCard key={ev.id} ev={ev} socioId={socio.id} formatCurrency={formatCurrency} onTogglePayment={onTogglePayment} onRemove={onRemove} />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </section>

                <section data-testid="profile-past-section">
                  <div className="flex items-center gap-2 mb-3">
                    <History size={14} className="text-slate-400" />
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide">Eventos pasados</h3>
                    <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">{past.length}</span>
                  </div>
                  {past.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2 pl-6">Sin eventos pasados {hidePaid ? "pendientes" : ""}</p>
                  ) : (
                    <div className="space-y-2">
                      <AnimatePresence>
                        {past.map(ev => (
                          <EventCard key={ev.id} ev={ev} socioId={socio.id} formatCurrency={formatCurrency} onTogglePayment={onTogglePayment} onRemove={onRemove} />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
