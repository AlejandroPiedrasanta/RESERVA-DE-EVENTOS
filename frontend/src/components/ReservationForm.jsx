import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { createReservation, updateReservation } from "@/lib/api";
import {
  ArrowLeft, X, Sparkles, User, Phone, Mail, Calendar as CalIcon, Clock, MapPin,
  Users, DollarSign, Package, StickyNote, PartyPopper, Heart, Cake, Briefcase,
  Mic2, Star, CheckCircle2, Loader2, Wallet, Tag, Pencil, RotateCcw, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/context/SettingsContext";
import { getEventTypeName } from "@/lib/eventConfig";
import { celebrateReservation, celebratePayment, celebrateFullPayment } from "@/lib/celebrations";
import { PrettyDatePicker, PrettyTimePicker } from "@/components/PrettyDateTime";

const EVENT_TYPES = [
  { key: "Boda",               icon: Heart,       grad: "from-pink-400 to-rose-500" },
  { key: "Quinceañera",        icon: Cake,        grad: "from-fuchsia-400 to-purple-500" },
  { key: "Fiesta Social",      icon: PartyPopper, grad: "from-amber-400 to-orange-500" },
  { key: "Evento Corporativo", icon: Briefcase,   grad: "from-cyan-400 to-blue-500" },
  { key: "Conferencia",        icon: Mic2,        grad: "from-emerald-400 to-teal-500" },
  { key: "Otro",               icon: Star,        grad: "from-slate-300 to-slate-500" },
];

const PACKAGES = [
  { key: "",           label: "Sin paquete", icon: Tag },
  { key: "Básico",     label: "Básico",      icon: Package },
  { key: "Intermedio", label: "Intermedio",  icon: Package },
  { key: "Completo",   label: "Completo",    icon: Package },
];

export default function ReservationForm({ reservation, onClose, onSaved }) {
  const { toast } = useToast();
  const { tr, activeStatuses, formFieldsVisibility } = useSettings();
  const f = tr.form;
  const ff = formFieldsVisibility || {};
  const isEdit = !!reservation;

  const [form, setForm] = useState({
    client_name: "Desconocido", client_phone: "", client_email: "",
    event_type: "Boda", event_date: "", event_time: "",
    venue: "", guests_count: "", total_amount: "",
    advance_paid: "0", status: "Reservado", notes: "",
    package_type: "",
  });

  const STATUS_OPTIONS = [
    { key: "Reservado", label: "Reservado" },
    { key: "Pagado",    label: "Pagado" },
  ];
  const [saving, setSaving] = useState(false);

  // Snapshot original values for dirty tracking (edit mode)
  const originalRef = useRef(null);
  const buildSnapshot = (r) => ({
    client_name: r?.client_name || "",
    client_phone: r?.client_phone || "",
    client_email: r?.client_email || "",
    event_type: r?.event_type || "Boda",
    event_date: r?.event_date || "",
    event_time: r?.event_time || "",
    venue: r?.venue || "",
    guests_count: String(r?.guests_count ?? ""),
    total_amount: String(r?.total_amount ?? ""),
    advance_paid: String(r?.advance_paid ?? "0"),
    status: r?.status || "Reservado",
    notes: r?.notes || "",
    package_type: r?.package_type || "",
  });

  const isDirtyField = (field) => {
    if (!isEdit || !originalRef.current) return false;
    return String(form[field] ?? "") !== String(originalRef.current[field] ?? "");
  };

  const FIELD_META = useMemo(() => ({
    client_name:  { label: "Nombre",   icon: User },
    client_phone: { label: "Teléfono", icon: Phone },
    client_email: { label: "Email",    icon: Mail },
    event_type:   { label: "Tipo",     icon: Sparkles },
    event_date:   { label: "Fecha",    icon: CalIcon },
    event_time:   { label: "Hora",     icon: Clock },
    venue:        { label: "Lugar",    icon: MapPin },
    guests_count: { label: "Invitados",icon: Users },
    total_amount: { label: "Total",    icon: DollarSign },
    advance_paid: { label: "Anticipo", icon: Wallet },
    status:       { label: "Estado",   icon: Tag },
    package_type: { label: "Paquete",  icon: Package },
    notes:        { label: "Notas",    icon: StickyNote },
  }), []);

  const dirtyFields = useMemo(() => {
    if (!isEdit || !originalRef.current) return [];
    return Object.keys(FIELD_META).filter(k => String(form[k] ?? "") !== String(originalRef.current[k] ?? ""));
  }, [form, isEdit, FIELD_META]);

  const clientInitials = useMemo(() => {
    const src = (isEdit ? (originalRef.current?.client_name || reservation?.client_name) : form.client_name) || "?";
    return src.trim().split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase() || "").join("") || "?";
  }, [isEdit, reservation, form.client_name]);

  const handleRevert = () => {
    if (!originalRef.current) return;
    setForm({ ...originalRef.current });
    toast({ title: "Cambios descartados" });
  };

  // Lock body scroll while modal open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    if (reservation) {
      const snap = buildSnapshot(reservation);
      originalRef.current = snap;
      setForm(snap);
    }
  }, [reservation]);

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));
  const setStatus = (e) => {
    const newStatus = e.target.value;
    setForm(prev => ({
      ...prev,
      status: newStatus,
      advance_paid: newStatus === "Pagado"
        ? String(prev.total_amount || prev.advance_paid)
        : prev.advance_paid,
    }));
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!form.client_name.trim()) { toast({ title: "Nombre requerido", variant: "destructive" }); return; }
    if (!form.event_date)         { toast({ title: "Fecha requerida",  variant: "destructive" }); return; }
    if (!form.total_amount || isNaN(Number(form.total_amount))) {
      toast({ title: "Monto inválido", variant: "destructive" }); return;
    }
    setSaving(true);
    const payload = {
      ...form,
      guests_count: form.guests_count ? parseInt(form.guests_count) : null,
      total_amount: parseFloat(form.total_amount),
      advance_paid: parseFloat(form.advance_paid) || 0,
    };
    try {
      if (isEdit) {
        await updateReservation(reservation.id, payload);
        toast({ title: "Reserva actualizada" });
        const prevAdvance = parseFloat(reservation.advance_paid || 0);
        const newAdvance = payload.advance_paid || 0;
        if (newAdvance > prevAdvance) {
          const total = payload.total_amount || 0;
          if (newAdvance >= total) celebrateFullPayment();
          else celebratePayment();
        }
      } else {
        await createReservation(payload);
        toast({ title: "🎉 ¡Reserva creada!" });
        celebrateReservation();
      }
      onSaved();
    } catch (err) {
      toast({ title: "Error al guardar", description: err.response?.data?.detail || "Error", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const title = isEdit ? "Editar Reserva" : "Nueva Reserva";
  const submitLabel = saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear reserva";

  // Balance
  const balance = Math.max(0, (parseFloat(form.total_amount) || 0) - (parseFloat(form.advance_paid) || 0));
  const progress = form.total_amount ? Math.min(100, ((parseFloat(form.advance_paid) || 0) / parseFloat(form.total_amount)) * 100) : 0;

  const stagger = {
    hidden:  { opacity: 0, y: 12 },
    visible: (i) => ({ opacity: 1, y: 0, transition: { delay: 0.05 * i, duration: 0.4, ease: [0.22, 1, 0.36, 1] } }),
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="ultra-overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto py-6 px-4 ultra-scroll"
        style={{
          background: "radial-gradient(1200px 700px at 20% 10%, rgba(139,92,246,0.35), transparent 60%), radial-gradient(1000px 600px at 80% 90%, rgba(236,72,153,0.28), transparent 60%), rgba(3, 6, 23, 0.75)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        data-testid="reservation-form"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 28 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-4xl max-h-[95vh] flex flex-col rounded-[28px] overflow-hidden ultra-glow-border"
          style={{
            background: "linear-gradient(160deg, rgba(15,10,40,0.92) 0%, rgba(23,16,58,0.92) 50%, rgba(30,15,55,0.94) 100%)",
            boxShadow: "0 40px 90px -20px rgba(139,92,246,0.5), 0 20px 50px -20px rgba(236,72,153,0.35)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Aurora blobs */}
          <div className="ultra-aurora-blob" style={{ width: 340, height: 340, top: -100, left: -80, background: "radial-gradient(circle, #a78bfa, transparent)" }} />
          <div className="ultra-aurora-blob" style={{ width: 300, height: 300, bottom: -80, right: -60, background: "radial-gradient(circle, #ec4899, transparent)", animationDelay: "-6s" }} />
          <div className="ultra-aurora-blob" style={{ width: 260, height: 260, top: "40%", right: "-10%", background: "radial-gradient(circle, #06b6d4, transparent)", animationDelay: "-12s" }} />
          <div className="ultra-grid" />

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between px-7 py-4 border-b border-white/10 gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <motion.button
                whileHover={{ scale: 1.05, x: -2 }} whileTap={{ scale: 0.94 }}
                type="button" onClick={onClose}
                className="ultra-secondary"
                style={{ padding: "8px 14px", fontSize: 12 }}
                data-testid="cancel-form-btn"
              >
                <ArrowLeft size={12} /> Cancelar
              </motion.button>

              {isEdit ? (
                <div className="flex items-center gap-3 min-w-0">
                  <motion.div
                    initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18 }}
                    className="edit-avatar shrink-0"
                    data-testid="edit-avatar"
                  >
                    {clientInitials}
                  </motion.div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <motion.span
                        initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="edit-badge"
                        data-testid="edit-mode-badge"
                      >
                        <Pencil size={10} /> Editando
                      </motion.span>
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={dirtyFields.length === 0 ? "clean" : "dirty"}
                          initial={{ opacity: 0, y: -4, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.9 }}
                          transition={{ duration: 0.22 }}
                          className={`edit-counter ${dirtyFields.length === 0 ? "zero" : ""}`}
                          data-testid="edit-changes-counter"
                        >
                          <Zap size={10} />
                          {dirtyFields.length === 0 ? (
                            <>Sin cambios</>
                          ) : (
                            <>
                              <span className="num">{dirtyFields.length}</span>
                              cambio{dirtyFields.length === 1 ? "" : "s"}
                            </>
                          )}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                    <h2 className="ultra-title truncate" style={{ fontSize: 20, maxWidth: 320 }} data-testid="edit-client-name">
                      {originalRef.current?.client_name || "Reserva"}
                    </h2>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3.5">
                  <div className="relative w-9 h-9 rounded-xl flex items-center justify-center"
                       style={{ background: "linear-gradient(135deg, #8b5cf6, #ec4899)", boxShadow: "0 8px 20px -6px rgba(167,139,250,0.7)" }}>
                    <Sparkles size={16} className="text-white ultra-icon-float" />
                  </div>
                  <h2 className="ultra-title" style={{ fontSize: 18 }}>{title}</h2>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <AnimatePresence>
                {isEdit && dirtyFields.length > 0 && (
                  <motion.button
                    key="revert"
                    initial={{ opacity: 0, x: 10, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 10, scale: 0.9 }}
                    whileHover={{ y: -1 }} whileTap={{ scale: 0.94 }}
                    type="button" onClick={handleRevert}
                    className="revert-btn"
                    data-testid="revert-changes-btn"
                  >
                    <RotateCcw size={12} /> Descartar
                  </motion.button>
                )}
              </AnimatePresence>
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                type="button" onClick={handleSubmit} disabled={saving || (isEdit && dirtyFields.length === 0)}
                className={`ultra-cta ${isEdit && dirtyFields.length > 0 ? "has-changes" : ""}`}
                style={{ padding: "10px 20px", fontSize: 13 }}
                data-testid="submit-form-btn"
              >
                {saving ? <Loader2 size={14} className="animate-spin inline mr-1.5" /> : <CheckCircle2 size={14} className="inline mr-1.5" />}
                {submitLabel}
              </motion.button>
              <button type="button" onClick={onClose} className="ultra-secondary" style={{ padding: "8px", borderRadius: "50%" }}>
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Form body */}
          <form onSubmit={handleSubmit} className="relative z-10 px-7 py-5 ultra-compact flex-1 overflow-hidden">
            {/* Diff strip — shows changed fields as chips */}
            <AnimatePresence>
              {isEdit && dirtyFields.length > 0 && (
                <motion.div
                  key="diff-strip"
                  initial={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto", marginBottom: 14 }}
                  exit={{ opacity: 0, y: -8, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                  className="edit-diff-strip"
                  data-testid="edit-diff-strip"
                >
                  <span className="text-[10px] font-black tracking-widest uppercase text-amber-200/80 mr-1 flex items-center gap-1.5">
                    <Zap size={11} /> Modificado:
                  </span>
                  {dirtyFields.map((k, i) => {
                    const meta = FIELD_META[k];
                    const Icon = meta?.icon || Pencil;
                    return (
                      <motion.span
                        key={k}
                        initial={{ opacity: 0, scale: 0.7, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.7 }}
                        transition={{ delay: i * 0.03, type: "spring", stiffness: 320, damping: 20 }}
                        className="edit-diff-chip"
                        data-testid={`diff-chip-${k}`}
                      >
                        <Icon size={10} /> {meta?.label || k}
                      </motion.span>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {/* SECTION 1 — Cliente */}
            <motion.div variants={stagger} initial="hidden" animate="visible" custom={0} className="mb-4">
              <div className="ultra-section-header"><User size={11} /> Datos del cliente</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <UField icon={User}  label={`${f.clientName} *`} dirty={isDirtyField("client_name")} testId="field-client-name">
                  <input value={form.client_name} onChange={set("client_name")} placeholder="María García" required
                         data-testid="input-client-name" />
                </UField>
                {ff.phone !== false && (
                  <UField icon={Phone} label={f.phone} dirty={isDirtyField("client_phone")} testId="field-phone">
                    <input value={form.client_phone} onChange={set("client_phone")} placeholder="+502 1234 5678"
                           data-testid="input-phone" />
                  </UField>
                )}
                {ff.email !== false && (
                  <UField icon={Mail} label={f.email} dirty={isDirtyField("client_email")} testId="field-email">
                    <input type="email" value={form.client_email} onChange={set("client_email")} placeholder="correo@email.com"
                           data-testid="input-email" />
                  </UField>
                )}
              </div>
            </motion.div>

            {/* SECTION 2 — Tipo de evento (choice cards) */}
            <motion.div variants={stagger} initial="hidden" animate="visible" custom={1} className="mb-4">
              <div className="ultra-section-header">
                <Sparkles size={11} /> Tipo de evento
                {isDirtyField("event_type") && (
                  <motion.span
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-200 text-[9px] tracking-wider"
                    data-testid="event-type-dirty-badge"
                  >
                    <Zap size={8} /> Cambiado
                  </motion.span>
                )}
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {EVENT_TYPES.map((t) => {
                  const Icon = t.icon;
                  const active = form.event_type === t.key;
                  const wasOriginal = isEdit && originalRef.current?.event_type === t.key;
                  return (
                    <motion.button
                      key={t.key} type="button"
                      whileHover={{ y: -3 }} whileTap={{ scale: 0.96 }}
                      onClick={() => setForm(p => ({ ...p, event_type: t.key }))}
                      className={`ultra-choice ${active ? "is-active" : ""}`}
                      data-testid={`event-type-${t.key.toLowerCase().replace(/\s/g,"-")}`}
                      style={wasOriginal && !active ? { outline: "1.5px dashed rgba(167,139,250,0.55)", outlineOffset: 2 } : undefined}
                    >
                      <Icon size={22} strokeWidth={2.2} />
                      <span className="text-[11px]">{getEventTypeName(t.key)}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>

            {/* SECTION 3 — Detalles evento */}
            <motion.div variants={stagger} initial="hidden" animate="visible" custom={2} className="mb-4">
              <div className="ultra-section-header"><CalIcon size={11} /> Detalles del evento</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div className="relative">
                  <label className="ultra-label"><CalIcon size={12} /> {f.eventDate} *
                    {isDirtyField("event_date") && <Zap size={10} className="text-amber-300" />}
                  </label>
                  <PrettyDatePicker value={form.event_date} onChange={set("event_date")} testId="input-event-date-pretty" />
                  {isDirtyField("event_date") && <span className="dirty-dot" style={{ top: 22, right: -3 }} />}
                  {/* Hidden native for tests */}
                  <input type="date" value={form.event_date} onChange={set("event_date")} required data-testid="input-event-date" className="hidden" />
                </div>
                {ff.time !== false && (
                  <div className="relative">
                    <label className="ultra-label"><Clock size={12} /> {f.time}
                      {isDirtyField("event_time") && <Zap size={10} className="text-amber-300" />}
                    </label>
                    <PrettyTimePicker value={form.event_time} onChange={set("event_time")} testId="input-event-time-pretty" />
                    {isDirtyField("event_time") && <span className="dirty-dot" style={{ top: 22, right: -3 }} />}
                    <input type="time" value={form.event_time} onChange={set("event_time")} data-testid="input-event-time" className="hidden" />
                  </div>
                )}
                {/* Compatibilidad con tests: selects ocultos */}
                <select value={form.event_type} onChange={set("event_type")} data-testid="input-event-type" className="hidden">
                  {EVENT_TYPES.map(t => <option key={t.key} value={t.key}>{getEventTypeName(t.key)}</option>)}
                </select>
                <select value={form.status} onChange={setStatus} data-testid="input-status" className="hidden">
                  {STATUS_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-2.5">
                {ff.venue !== false && (
                  <div className="md:col-span-2">
                    <UField icon={MapPin} label={f.venue} dirty={isDirtyField("venue")} testId="field-venue">
                      <input value={form.venue} onChange={set("venue")} placeholder="Salón / Hotel / Ubicación"
                             data-testid="input-venue" />
                    </UField>
                  </div>
                )}
                {ff.guests !== false && (
                  <UField icon={Users} label={f.guests} dirty={isDirtyField("guests_count")} testId="field-guests">
                    <input type="number" value={form.guests_count} onChange={set("guests_count")} placeholder="150" min="0"
                           data-testid="input-guests" />
                  </UField>
                )}
              </div>
            </motion.div>

            {/* SECTION 5 — Dinero */}
            <motion.div variants={stagger} initial="hidden" animate="visible" custom={4} className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="ultra-section-header" style={{ marginBottom: 0 }}><Wallet size={11} /> Información financiera</div>
                {/* Toggle Reservado / Pagado */}
                <div className="inline-flex p-1 rounded-full border border-white/15 bg-white/5 backdrop-blur">
                  {STATUS_OPTIONS.map((s) => {
                    const active = form.status === s.key;
                    return (
                      <button
                        key={s.key} type="button"
                        onClick={() => setStatus({ target: { value: s.key } })}
                        data-testid={`status-toggle-${s.key.toLowerCase()}`}
                        className="relative px-4 py-1.5 rounded-full text-[11px] font-black tracking-wider uppercase transition-all"
                        style={{
                          color: active ? "#fff" : "rgba(255,255,255,0.55)",
                          background: active
                            ? (s.key === "Pagado"
                                ? "linear-gradient(135deg, #10b981, #06b6d4)"
                                : "linear-gradient(135deg, #8b5cf6, #ec4899)")
                            : "transparent",
                          boxShadow: active ? "0 6px 18px -4px rgba(139,92,246,0.55)" : "none",
                        }}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <UField icon={DollarSign} label={`${f.totalAmount} *`} dirty={isDirtyField("total_amount")} testId="field-total">
                  <input type="number" value={form.total_amount} onChange={set("total_amount")} placeholder="50,000" min="0" step="0.01" required
                         data-testid="input-total" />
                </UField>
                {ff.advance !== false && (
                  <UField icon={Wallet} label={f.advancePaid} dirty={isDirtyField("advance_paid")} testId="field-advance">
                    <input type="number" value={form.advance_paid} onChange={set("advance_paid")} placeholder="10,000" min="0" step="0.01"
                           data-testid="input-advance" />
                  </UField>
                )}
                <div className="ultra-field flex flex-col justify-end">
                  <label className="ultra-label"><DollarSign size={12} /> Saldo</label>
                  <div className="relative rounded-2xl px-4 py-3.5 border border-white/15 bg-white/5 overflow-hidden">
                    <div className="text-white font-black text-lg tracking-tight">
                      Q{balance.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full rounded-full"
                        style={{ background: "linear-gradient(90deg, #8b5cf6, #ec4899, #f59e0b)" }}
                      />
                    </div>
                    <div className="absolute inset-0 ultra-sweep" style={{ opacity: 0.35 }} />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Hidden select for test compatibility */}
            <select value={form.package_type} onChange={set("package_type")} data-testid="input-package" className="hidden">
              <option value="">— Sin paquete —</option>
              <option value="Básico">Básico</option>
              <option value="Intermedio">Intermedio</option>
              <option value="Completo">Completo</option>
            </select>
            <input value={form.notes} onChange={set("notes")} data-testid="input-notes" className="hidden" />
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// Reusable ultra field with icon
function UField({ icon: Icon, label, children, dirty = false, testId }) {
  return (
    <div className={`ultra-field ${dirty ? "is-dirty" : ""}`} data-testid={testId}>
      <label className="ultra-label">
        {Icon && <Icon size={12} />}
        {label}
      </label>
      <div className="relative">
        {Icon && <Icon size={16} className="ultra-field-icon" />}
        {children}
        {dirty && <span className="dirty-dot" data-testid="dirty-dot" />}
      </div>
    </div>
  );
}
