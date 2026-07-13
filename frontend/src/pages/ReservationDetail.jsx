import { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import { getReservation, uploadReceipt, deleteReceipt, updateReservation, deleteReservation } from "@/lib/api";
import {
  ArrowLeft, Upload, Trash2, Save, X, ImageIcon,
  Calendar as CalIcon, Clock, MapPin, Users, Package as PackageIcon,
  Phone, Mail, Sparkles, Wallet, CheckCircle2, AlarmClock, Heart, Cake,
  PartyPopper, Briefcase, Mic2, Star, TrendingUp, StickyNote, CircleDollarSign,
  Hash, User, Edit2, Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/context/SettingsContext";
import LocationsSection from "@/components/LocationsSection";
import { PrettyDatePicker, PrettyTimePicker } from "@/components/PrettyDateTime";
import TeamSection from "@/components/TeamSection";

const STATUS_META = {
  Pendiente:  { grad: "from-amber-400 to-orange-500",   ring: "ring-amber-300/50",   text: "text-amber-700",  bg: "bg-amber-50" },
  Confirmado: { grad: "from-blue-400 to-indigo-500",    ring: "ring-blue-300/50",    text: "text-blue-700",   bg: "bg-blue-50" },
  Completado: { grad: "from-emerald-400 to-teal-500",   ring: "ring-emerald-300/50", text: "text-emerald-700",bg: "bg-emerald-50" },
  Cancelado:  { grad: "from-rose-400 to-red-500",       ring: "ring-rose-300/50",    text: "text-rose-700",   bg: "bg-rose-50" },
  Reservado:  { grad: "from-violet-400 to-fuchsia-500", ring: "ring-violet-300/50",  text: "text-violet-700", bg: "bg-violet-50" },
  Pagado:     { grad: "from-emerald-400 to-cyan-500",   ring: "ring-emerald-300/50", text: "text-emerald-700",bg: "bg-emerald-50" },
};

const EVENT_ICON = {
  "Boda": Heart,
  "Quinceañera": Cake,
  "Fiesta Social": PartyPopper,
  "Evento Corporativo": Briefcase,
  "Conferencia": Mic2,
  "Otro": Star,
};

const easeOut = [0.22, 1, 0.36, 1];

export default function ReservationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { tr, formatCurrency } = useSettings();
  const dt = tr.detail;
  const [reservation, setReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);

  const [lightbox, setLightbox] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const load = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const data = await getReservation(id);
      setReservation(data);
      setDraft({
        client_name: data.client_name ?? "",
        event_date: data.event_date ?? "",
        event_time: data.event_time ?? "",
        venue: data.venue ?? "",
        guests_count: data.guests_count ?? "",
        package_type: data.package_type ?? "",
        client_phone: data.client_phone ?? "",
        client_email: data.client_email ?? "",
      });
    }
    catch { toast({ title: dt.toasts?.loadError || "Error", variant: "destructive" }); }
    finally { if (!silent) setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const formatDate = (d) => { if (!d) return "-"; const [y,m,day] = d.split("-"); return `${day}/${m}/${y}`; };
  const formatLongDate = (d) => {
    if (!d) return "-";
    try {
      const [y,m,day] = d.split("-");
      const dt = new Date(Number(y), Number(m)-1, Number(day));
      return dt.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    } catch { return d; }
  };

  const handleFileUpload = async (files) => {
    const allowed = ["image/jpeg","image/png","image/gif","image/webp","application/pdf"];
    for (const file of files) {
      if (!allowed.includes(file.type)) { toast({ title: "Tipo no soportado", variant: "destructive" }); continue; }
      setUploading(true);
      try { await uploadReceipt(id, file); toast({ title: dt.toasts?.uploadSuccess || "Comprobante subido" }); load({ silent: true }); }
      catch (e) { toast({ title: "Error al subir", description: e.response?.data?.detail || "Error", variant: "destructive" }); }
      finally { setUploading(false); }
    }
  };

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); handleFileUpload(Array.from(e.dataTransfer.files)); };

  const handleDeleteReceipt = async (receiptId) => {
    if (!window.confirm("¿Eliminar comprobante?")) return;
    try { await deleteReceipt(id, receiptId); toast({ title: "Eliminado" }); load({ silent: true }); }
    catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleDraftChange = (field, value) => {
    setDraft(prev => ({ ...prev, [field]: value }));
  };

  const isDirty = useMemo(() => {
    if (!reservation) return false;
    return Object.keys(draft).some(k => {
      const orig = reservation[k] ?? "";
      const cur = draft[k] ?? "";
      return String(orig) !== String(cur);
    });
  }, [draft, reservation]);

  const handleSaveAll = async () => {
    if (!reservation || !isDirty || saving) return;
    if (!String(draft.client_name || "").trim()) {
      toast({ title: "El nombre es obligatorio", variant: "destructive" });
      return;
    }
    const payload = {};
    for (const k of Object.keys(draft)) {
      let v = draft[k];
      if (typeof v === "string") v = v.trim();
      if (k === "guests_count") {
        if (v === "" || v === null || v === undefined) v = null;
        else {
          const n = parseInt(v, 10);
          if (Number.isNaN(n)) { toast({ title: "Invitados debe ser un número", variant: "destructive" }); return; }
          v = n;
        }
      } else if (v === "") v = null;
      if ((reservation[k] ?? "") !== (v ?? "")) payload[k] = v;
    }
    if (Object.keys(payload).length === 0) return;
    setSaving(true);
    try {
      await updateReservation(id, payload);
      setReservation(prev => ({ ...prev, ...payload }));
      toast({ title: "Cambios guardados" });
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReservation = async () => {
    if (!window.confirm("¿Eliminar reservación por completo? Esta acción no se puede deshacer.")) return;
    try {
      await deleteReservation(id);
      toast({ title: "Reservación eliminada" });
      navigate("/calendario");
    } catch {
      toast({ title: "Error al eliminar", variant: "destructive" });
    }
  };

  const handleMarkPaid = async () => {
    if (!reservation) return;
    const total = reservation.total_amount || 0;
    if (total <= 0) {
      toast({ title: "Define un total antes de marcar como pagado", variant: "destructive" });
      return;
    }
    if ((reservation.advance_paid || 0) >= total) return;
    try {
      await updateReservation(id, { advance_paid: total });
      setReservation(prev => ({ ...prev, advance_paid: total }));
      setDraft(prev => ({ ...prev, advance_paid: total }));
      toast({ title: dt.markedPaid || "Marcada como pagada" });
    } catch {
      toast({ title: "Error al actualizar", variant: "destructive" });
    }
  };

  const daysToEvent = useMemo(() => {
    if (!reservation?.event_date) return null;
    const [y,m,d] = reservation.event_date.split("-").map(Number);
    const target = new Date(y, m-1, d);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diff = Math.round((target - today) / 86400000);
    return diff;
  }, [reservation?.event_date]);

  const initials = useMemo(() => {
    const src = reservation?.client_name?.trim() || "?";
    return src.split(/\s+/).slice(0,2).map(s => s[0]?.toUpperCase() || "").join("") || "?";
  }, [reservation?.client_name]);

  if (loading) return (
    <div className="px-6 py-8 max-w-7xl mx-auto space-y-4">
      <div className="h-10 w-64 glass rounded-2xl animate-pulse" />
      <div className="h-56 glass rounded-3xl animate-pulse" />
    </div>
  );
  if (!reservation) return <div className="px-6 py-8 text-center text-slate-400 font-medium">No encontrado</div>;

  const remaining = (reservation.total_amount||0) - (reservation.advance_paid||0);
  const paidPct = reservation.total_amount > 0 ? Math.min(100, ((reservation.advance_paid||0)/reservation.total_amount)*100) : 0;
  const teamCost = (reservation.assigned_partners || []).reduce((sum, p) => sum + (p.payment || 0), 0);
  const realEarnings = (reservation.total_amount || 0) - teamCost;
  const statusMeta = STATUS_META[reservation.status] || STATUS_META.Pendiente;
  const EventTypeIcon = EVENT_ICON[reservation.event_type] || Star;

  // Countdown label
  const countdownLabel =
    daysToEvent === null ? "" :
    daysToEvent === 0 ? "Hoy" :
    daysToEvent === 1 ? "Mañana" :
    daysToEvent === -1 ? "Ayer" :
    daysToEvent > 0 ? `${daysToEvent} días` :
    `Hace ${Math.abs(daysToEvent)} días`;

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      {/* ============= HERO ============= */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: easeOut }}
        className="relative overflow-hidden rounded-[32px] mb-6 rd-hero"
        data-testid="reservation-hero"
      >
        {/* Aurora backgrounds */}
        <div className={`rd-hero-aurora`} style={{ background: `radial-gradient(60% 100% at 15% 30%, var(--rd-a) 0%, transparent 60%), radial-gradient(50% 80% at 85% 70%, var(--rd-b) 0%, transparent 60%)` }} />
        <div className="rd-hero-grid" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6 p-7">
          <motion.button
            whileHover={{ scale: 1.1, x: -3 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="self-start p-3 rounded-2xl bg-white/70 backdrop-blur-md border border-white/50 text-slate-700 hover:bg-white transition-colors shadow-sm"
            data-testid="back-btn"
          >
            <ArrowLeft size={18} />
          </motion.button>

          {/* Avatar */}
          <motion.div
            initial={{ scale: 0.6, rotate: -8, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 18, delay: 0.05 }}
            className={`rd-avatar bg-gradient-to-br ${statusMeta.grad}`}
            data-testid="client-avatar"
          >
            <span className="rd-avatar-initials">{initials}</span>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 18, ease: "linear", repeat: Infinity }}
              className="absolute -inset-2 rounded-[32px] pointer-events-none"
              style={{
                background: "conic-gradient(from 0deg, rgba(255,255,255,0.5), transparent 40%, rgba(255,255,255,0.35), transparent 80%)",
                filter: "blur(10px)",
                opacity: 0.6,
              }}
            />
          </motion.div>

          {/* Title block */}
          <div className="flex-1 min-w-0">
            <motion.div
              initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 }}
              className="flex items-center gap-2 mb-2"
            >
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase text-white bg-gradient-to-r ${statusMeta.grad} shadow-md`}>
                <span className="rd-status-dot" />
                {tr.statuses?.[reservation.status] || reservation.status}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-slate-700 bg-white/70 backdrop-blur border border-white/60">
                <EventTypeIcon size={12} className="text-indigo-500" />
                {reservation.event_type}
              </span>
              {daysToEvent !== null && (
                <motion.span
                  initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wider
                    ${daysToEvent < 0 ? "bg-slate-100 text-slate-500" :
                       daysToEvent <= 3 ? "bg-rose-100 text-rose-600 rd-pulse" :
                       daysToEvent <= 14 ? "bg-amber-100 text-amber-700" :
                       "bg-emerald-100 text-emerald-700"}`}
                  data-testid="countdown-badge"
                >
                  <AlarmClock size={12} /> {countdownLabel}
                </motion.span>
              )}
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="rd-title truncate"
              data-testid="client-name-title"
            >
              {reservation.client_name}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.22 }}
              className="text-sm text-slate-500 font-medium mt-1 capitalize"
            >
              {formatLongDate(reservation.event_date)}
              {reservation.event_time && <span className="text-slate-400"> · {reservation.event_time}</span>}
            </motion.p>
          </div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18 }}
            className="flex items-center gap-2 flex-wrap"
          >
            <motion.button
              whileHover={{ scale: isDirty ? 1.05 : 1, y: isDirty ? -1 : 0 }} whileTap={{ scale: 0.95 }}
              onClick={handleSaveAll}
              disabled={!isDirty || saving}
              data-testid="save-btn"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white shadow-md transition-all ${(!isDirty || saving) ? "bg-slate-300 cursor-not-allowed" : "bg-gradient-to-br from-indigo-500 to-violet-600 hover:shadow-lg hover:from-indigo-600 hover:to-violet-700"}`}
            >
              <Save size={14} />
              <span>{saving ? "Guardando..." : "Guardar"}</span>
              {isDirty && !saving && <span className="w-1.5 h-1.5 rounded-full bg-white/90 animate-pulse" />}
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05, y: -1 }} whileTap={{ scale: 0.95 }}
              onClick={handleDeleteReservation}
              data-testid="delete-reservation-btn"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white bg-gradient-to-br from-red-500 to-rose-600 shadow-md hover:shadow-lg hover:from-red-600 hover:to-rose-700 transition-all"
            >
              <Trash2 size={14} />
              <span>Eliminar</span>
            </motion.button>
          </motion.div>
        </div>
      </motion.div>

      {/* ============= GRID ============= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">

          {/* Event info grid tiles */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, ease: easeOut }}
            className="glass rounded-3xl p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Sparkles size={14} className="text-indigo-500" />
              </div>
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">{dt.eventInfo}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <FieldTile icon={User} color="violet" label={dt.clientName || "Nombre"} value={draft.client_name}
                field="client_name" type="text" onChange={handleDraftChange} onEnter={handleSaveAll} delay={0.1} required />
              <FieldTile icon={CalIcon} color="indigo" label={dt.eventDate} value={draft.event_date}
                field="event_date" type="date" onChange={handleDraftChange} onEnter={handleSaveAll} delay={0.12} required />
              <FieldTile icon={Clock} color="cyan" label={dt.time} value={draft.event_time}
                field="event_time" type="time" onChange={handleDraftChange} onEnter={handleSaveAll} delay={0.15} />
              <FieldTile icon={MapPin} color="rose" label={dt.venue} value={draft.venue}
                field="venue" type="text" placeholder="Lugar" onChange={handleDraftChange} onEnter={handleSaveAll} delay={0.18} />
              <FieldTile icon={Users} color="amber" label={dt.guests} value={draft.guests_count}
                field="guests_count" type="number" placeholder="0" onChange={handleDraftChange} onEnter={handleSaveAll} delay={0.2} />
              <FieldTile icon={PackageIcon} color="fuchsia" label="Paquete" value={draft.package_type}
                field="package_type" type="text" placeholder="Paquete" onChange={handleDraftChange} onEnter={handleSaveAll} delay={0.22} />
              <FieldTile icon={Phone} color="emerald" label={dt.phone} value={draft.client_phone}
                field="client_phone" type="tel" placeholder="Número de teléfono" onChange={handleDraftChange} onEnter={handleSaveAll} delay={0.24} />
              <FieldTile icon={Mail} color="sky" label={dt.email} value={draft.client_email}
                field="client_email" type="email" placeholder="correo@ejemplo.com" onChange={handleDraftChange} onEnter={handleSaveAll} delay={0.26} />
            </div>
            {reservation.notes && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="mt-5 p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100"
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <StickyNote size={13} className="text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">{dt.notes}</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{reservation.notes}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>

          <LocationsSection reservation={reservation} onUpdated={() => load({ silent: true })} />

          <TeamSection reservation={reservation} onUpdated={() => load({ silent: true })} />

          {/* Receipts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, ease: easeOut }}
            className="glass rounded-3xl p-6"
          >
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                <ImageIcon size={14} className="text-emerald-500" />
              </div>
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">{dt.receipts}</h2>
              {reservation.receipt_images?.length > 0 && (
                <span className="ml-auto inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black">
                  <Hash size={10} /> {reservation.receipt_images.length}
                </span>
              )}
            </div>

            <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple className="hidden" data-testid="file-input" onChange={e => handleFileUpload(Array.from(e.target.files))} />

            {(!reservation.receipt_images || reservation.receipt_images.length === 0) && (
              <motion.div
                whileHover={{ scale: 1.01 }}
                className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all duration-300 ${dragOver ? "border-indigo-400 bg-indigo-50/60 scale-[1.02]" : "border-indigo-200/60 bg-indigo-50/20 hover:bg-indigo-50/40 hover:border-indigo-300"}`}
                onDrop={handleDrop} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
                onClick={() => fileRef.current?.click()} data-testid="upload-zone"
              >
                <motion.div
                  animate={{ y: [0, -6, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  className="w-14 h-14 rounded-2xl bg-indigo-100/80 flex items-center justify-center mx-auto mb-4"
                >
                  <Upload size={24} className="text-indigo-500" />
                </motion.div>
                <p className="text-base font-bold text-slate-600">{uploading ? dt.uploading : dt.uploadHint}</p>
                <p className="text-xs text-slate-400 mt-1.5">{dt.uploadSub}</p>
              </motion.div>
            )}

            <AnimatePresence>
              {reservation.receipt_images && reservation.receipt_images.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4" data-testid="receipts-grid"
                  onDrop={handleDrop} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}>
                  {reservation.receipt_images.map((img, i) => (
                    <motion.div key={img.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.07 }}
                      className="relative group rounded-3xl overflow-hidden bg-slate-900/5 border border-white/50"
                      style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.08)" }}>
                      {img.content_type?.startsWith("image/") ? (
                        <>
                          <img
                            src={`data:${img.content_type};base64,${img.data}`}
                            alt={img.filename}
                            className="w-full object-contain cursor-zoom-in rounded-3xl"
                            style={{ maxHeight: "520px", minHeight: "200px", background: "#f8fafc" }}
                            onClick={() => setLightbox(img)}
                            data-testid={`receipt-img-${img.id}`}
                          />
                          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-3 rounded-b-3xl opacity-0 group-hover:opacity-100 transition-all duration-200"
                            style={{ background: "linear-gradient(0deg, rgba(15,23,42,0.6) 0%, transparent 100%)" }}>
                            <p className="text-xs font-semibold text-white/80 truncate">{img.filename}</p>
                            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleDeleteReceipt(img.id)}
                              className="p-2 rounded-full bg-white/20 hover:bg-red-500 text-white transition-colors flex-shrink-0"
                              data-testid={`delete-receipt-${img.id}`}><Trash2 size={13} /></motion.button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-3 py-12 cursor-pointer" onClick={() => setLightbox(img)}>
                          <ImageIcon size={40} className="text-slate-400" />
                          <p className="text-sm text-slate-500 font-medium px-4">{img.filename}</p>
                        </div>
                      )}
                    </motion.div>
                  ))}

                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    data-testid="upload-another-btn"
                    className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl border-2 border-dashed text-sm font-bold transition-all duration-200 ${dragOver ? "border-indigo-400 bg-indigo-50/60" : "border-indigo-200/70 bg-indigo-50/20 text-indigo-500 hover:bg-indigo-50/50 hover:border-indigo-400"}`}>
                    <Upload size={16} />
                    {uploading ? (dt.uploading || "Subiendo…") : "Subir otra imagen"}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* ============= RIGHT ============= */}
        <div className="space-y-5">
          {/* Payment card with animated ring */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, ease: easeOut }}
            className="relative overflow-hidden rounded-3xl p-6 rd-payment-card"
          >
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-xl bg-white/60 backdrop-blur flex items-center justify-center">
                <CircleDollarSign size={14} className="text-indigo-500" />
              </div>
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">{dt.paymentSummary}</h2>
              {paidPct < 100 && (reservation.total_amount || 0) > 0 && (
                <motion.button
                  type="button"
                  onClick={handleMarkPaid}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/70 transition-colors"
                  data-testid="btn-mark-paid"
                  title={dt.markPaid}
                >
                  <CheckCircle2 size={11} />
                  {dt.markPaid}
                </motion.button>
              )}
            </div>

            {/* Two key metrics: what you earned + what they owe */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Ganancia real: total del evento - costo de socios */}
              <div
                className="rounded-2xl p-4"
                style={{
                  background: realEarnings >= 0
                    ? "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))"
                    : "linear-gradient(135deg, rgba(244,63,94,0.12), rgba(244,63,94,0.04))",
                  border: realEarnings >= 0
                    ? "1px solid rgba(16,185,129,0.25)"
                    : "1px solid rgba(244,63,94,0.3)",
                }}
                data-testid="payment-earned"
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <Wallet size={12} className={realEarnings >= 0 ? "text-emerald-600" : "text-rose-600"} />
                  <p className={`text-[10px] font-black uppercase tracking-widest ${realEarnings >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{dt.realEarnings}</p>
                </div>
                <p className={`text-2xl font-black leading-none ${realEarnings >= 0 ? "text-emerald-700" : "text-rose-700"}`} style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>
                  {formatCurrency(realEarnings)}
                </p>
                {teamCost > 0 && (
                  <p className="text-[10px] font-bold text-slate-500 mt-1.5 truncate" title={`${formatCurrency(reservation.total_amount || 0)} − ${formatCurrency(teamCost)}`}>
                    −{formatCurrency(teamCost)} equipo
                  </p>
                )}
              </div>

              {/* Deben */}
              <div
                className="rounded-2xl p-4"
                style={{
                  background: remaining > 0
                    ? "linear-gradient(135deg, rgba(245,158,11,0.14), rgba(245,158,11,0.04))"
                    : "linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04))",
                  border: remaining > 0
                    ? "1px solid rgba(245,158,11,0.3)"
                    : "1px solid rgba(16,185,129,0.25)",
                }}
                data-testid="payment-owed"
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp size={12} className={remaining > 0 ? "text-amber-600" : "text-emerald-600"} />
                  <p className={`text-[10px] font-black uppercase tracking-widest ${remaining > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                    {remaining > 0 ? dt.owedByClient : dt.allPaid}
                  </p>
                </div>
                <p className={`text-2xl font-black leading-none ${remaining > 0 ? "text-amber-700" : "text-emerald-700"}`} style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>
                  {remaining > 0 ? formatCurrency(remaining) : formatCurrency(0)}
                </p>
              </div>
            </div>

            {/* Subtle total + progress */}
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-2">
              <span>{Math.round(paidPct)}% {dt.paid} {dt.ofTotal} {formatCurrency(reservation.total_amount)}</span>
              {paidPct >= 100 && (
                <span className="inline-flex items-center gap-1 text-emerald-600 font-black">
                  <CheckCircle2 size={11} /> COMPLETO
                </span>
              )}
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${paidPct}%` }}
                transition={{ duration: 0.9, ease: easeOut, delay: 0.3 }}
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #10b981, #34d399)" }}
                data-testid="payment-progress"
              />
            </div>
          </motion.div>

          {/* Receipts count */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, ease: easeOut }}
            className="glass rounded-3xl p-6"
          >
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">{dt.receiptsCount}</h2>
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.08, rotate: 6 }}
                className="w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #a78bfa, #ec4899)" }}
              >
                <ImageIcon size={17} className="text-white" />
              </motion.div>
              <div>
                <p className="text-2xl font-black text-slate-900 leading-none" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>
                  {(reservation.receipt_images||[]).length}
                </p>
                <p className="text-xs text-slate-400 mt-1">{dt.filesUploaded}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Lightbox */}
      {createPortal(
      <AnimatePresence>
        {lightbox && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            style={{ backdropFilter: "blur(20px)", backgroundColor: "rgba(15,23,42,0.7)" }}
            onClick={() => setLightbox(null)} data-testid="lightbox">
            <motion.button whileHover={{ scale: 1.1 }} className="absolute top-6 right-6 p-2.5 rounded-full glass text-white" onClick={() => setLightbox(null)}><X size={20} /></motion.button>
            {lightbox.content_type?.startsWith("image/") ? (
              <motion.img initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                src={`data:${lightbox.content_type};base64,${lightbox.data}`} alt={lightbox.filename}
                className="max-w-full max-h-[85vh] object-contain rounded-3xl shadow-2xl" onClick={e => e.stopPropagation()} />
            ) : (
              <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="glass-modal rounded-3xl p-10 text-center">
                <ImageIcon size={48} className="mx-auto text-slate-400 mb-3" /><p className="text-slate-700 font-bold">{lightbox.filename}</p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}

    </div>
  );
}

/* ================ SUBCOMPONENTS ================ */

const TILE_COLORS = {
  indigo:  { bg: "bg-indigo-100",  text: "text-indigo-500",  ring: "ring-indigo-100" },
  cyan:    { bg: "bg-cyan-100",    text: "text-cyan-500",    ring: "ring-cyan-100" },
  rose:    { bg: "bg-rose-100",    text: "text-rose-500",    ring: "ring-rose-100" },
  amber:   { bg: "bg-amber-100",   text: "text-amber-500",   ring: "ring-amber-100" },
  fuchsia: { bg: "bg-fuchsia-100", text: "text-fuchsia-500", ring: "ring-fuchsia-100" },
  emerald: { bg: "bg-emerald-100", text: "text-emerald-500", ring: "ring-emerald-100" },
  sky:     { bg: "bg-sky-100",     text: "text-sky-500",     ring: "ring-sky-100" },
  violet:  { bg: "bg-violet-100",  text: "text-violet-500",  ring: "ring-violet-100" },
};

function InfoTile({ icon: Icon, color, label, value, delay = 0 }) {
  const c = TILE_COLORS[color] || TILE_COLORS.indigo;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, ease: easeOut }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="rd-info-tile group"
    >
      <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}>
        <Icon size={16} className={c.text} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 truncate">{label}</p>
        <p className="text-sm font-bold text-slate-900 truncate" title={typeof value === "string" ? value : undefined}>{value}</p>
      </div>
    </motion.div>
  );
}

function FieldTile({ icon: Icon, color, label, value, field, type = "text", placeholder, onChange, onEnter, delay = 0, required = false }) {
  const c = TILE_COLORS[color] || TILE_COLORS.indigo;
  const isDate = type === "date";
  const isTime = type === "time";
  const handlePickerChange = (e) => onChange(field, e.target.value);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, ease: easeOut }}
      className="rd-info-tile group"
    >
      <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={16} className={c.text} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">
          {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
        </p>
        {isDate ? (
          <PrettyDatePicker value={value || ""} onChange={handlePickerChange} testId={`field-input-${field}`} />
        ) : isTime ? (
          <PrettyTimePicker value={value || ""} onChange={handlePickerChange} testId={`field-input-${field}`} />
        ) : (
          <input
            type={type}
            value={value ?? ""}
            onChange={e => onChange(field, e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && onEnter) { e.preventDefault(); onEnter(); } }}
            placeholder={placeholder || label}
            data-testid={`field-input-${field}`}
            className="w-full text-sm font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-400 focus:outline-none py-0.5 transition-colors placeholder:text-slate-300 placeholder:italic placeholder:font-normal"
          />
        )}
      </div>
    </motion.div>
  );
}


function EditableInfoTile({ icon: Icon, color, label, value, field, type = "text", placeholder, onSave, delay = 0, required = false }) {
  const c = TILE_COLORS[color] || TILE_COLORS.indigo;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const [saving, setSaving] = useState(false);

  const start = () => { setDraft(value || ""); setEditing(true); };
  const cancel = () => { setDraft(value || ""); setEditing(false); };
  const save = async () => {
    const trimmed = (draft || "").trim();
    if (required && !trimmed) return;
    if (trimmed === (value || "")) { setEditing(false); return; }
    setSaving(true);
    try { await onSave(field, trimmed); setEditing(false); }
    catch { /* keep editing on failure */ }
    finally { setSaving(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, ease: easeOut }}
      className="rd-info-tile group relative"
    >
      <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={16} className={c.text} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 truncate">{label}</p>
        {editing ? (
          <div className="flex items-center gap-1 mt-0.5">
            <input
              autoFocus
              type={type}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
              placeholder={placeholder || label}
              className="w-full text-sm font-bold text-slate-900 bg-white/80 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-[var(--t-from)]/50"
              data-testid={`inline-edit-input-${field}`}
            />
            <button onClick={save} disabled={saving} title="Guardar"
              className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 disabled:opacity-50" data-testid={`inline-edit-save-${field}`}>
              <Check size={14} />
            </button>
            <button onClick={cancel} title="Cancelar"
              className="p-1 rounded-md text-slate-400 hover:bg-slate-100" data-testid={`inline-edit-cancel-${field}`}>
              <X size={14} />
            </button>
          </div>
        ) : (
          <button onClick={start}
            className="flex items-center gap-1.5 text-left w-full group/edit" data-testid={`inline-edit-trigger-${field}`}>
            <span className={`text-sm font-bold truncate ${value ? "text-slate-900" : "text-slate-300 italic"}`} title={value || ""}>
              {value || placeholder || "—"}
            </span>
            <Edit2 size={11} className="text-slate-300 group-hover/edit:text-slate-500 transition-colors flex-shrink-0" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

function PaymentRow({ icon: Icon, color, label, value, strong }) {
  const c = TILE_COLORS[color] || TILE_COLORS.indigo;
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className={`w-7 h-7 rounded-lg ${c.bg} flex items-center justify-center`}>
          <Icon size={13} className={c.text} />
        </div>
        <span className="text-sm text-slate-600 font-semibold">{label}</span>
      </div>
      <span className={`text-sm ${strong ? "font-black" : "font-bold"} ${c.text}`}>{value}</span>
    </div>
  );
}

function CircularProgress({ percent }) {
  const size = 92, stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (c * Math.min(100, Math.max(0, percent))) / 100;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="rd-prog" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} stroke="rgba(148,163,184,0.18)" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size/2} cy={size/2} r={r}
          stroke="url(#rd-prog)" strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: off }}
          transition={{ duration: 1.1, ease: easeOut, delay: 0.25 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-black text-slate-900" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
          {Math.round(percent)}%
        </span>
      </div>
    </div>
  );
}
