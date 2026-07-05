import { useState, useEffect } from "react";
import { createSocio, updateSocio, uploadSocioPhoto } from "@/lib/api";
import {
  ArrowLeft, Camera, Upload, X, Sparkles, User, Phone, Mail, StickyNote,
  DollarSign, Aperture, Video, UserCheck, CheckCircle2, Loader2, Star
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/context/SettingsContext";
import { celebrateSocio } from "@/lib/celebrations";

const ROLES = [
  { key: "Fotógrafo",  icon: Aperture,  grad: "from-cyan-400 to-blue-500" },
  { key: "Videógrafo", icon: Video,     grad: "from-fuchsia-400 to-pink-500" },
  { key: "Asistente",  icon: UserCheck, grad: "from-emerald-400 to-teal-500" },
];

export default function SocioForm({ socio, onClose, onSaved }) {
  const { toast } = useToast();
  const { socioFieldsVisibility } = useSettings();
  const sf = socioFieldsVisibility || {};
  const isEdit = !!socio;

  const [saving, setSaving]             = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile]       = useState(null);

  // Lock body scroll while modal open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const [form, setForm] = useState({
    name: "", role: "Fotógrafo", phone: "", email: "", notes: "", rate_per_event: "",
  });

  useEffect(() => {
    if (socio) {
      setForm({
        name: socio.name || "",
        role: socio.role || "Fotógrafo",
        phone: socio.phone || "",
        email: socio.email || "",
        notes: socio.notes || "",
        rate_per_event: socio.rate_per_event || "",
      });
      if (socio.photo && socio.photo_content_type)
        setPhotoPreview(`data:${socio.photo_content_type};base64,${socio.photo}`);
    }
  }, [socio]);

  const set = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!form.name.trim()) { toast({ title: "Nombre requerido", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(), role: form.role,
        phone: form.phone || null, email: form.email || null, notes: form.notes || null,
        rate_per_event: form.rate_per_event !== "" && form.rate_per_event !== null ? parseFloat(form.rate_per_event) : null,
      };
      let saved;
      if (isEdit) saved = await updateSocio(socio.id, payload);
      else        saved = await createSocio(payload);
      if (photoFile) await uploadSocioPhoto(saved.id, photoFile);
      if (isEdit) toast({ title: "Socio actualizado" });
      else {
        toast({ title: "🎉 ¡Socio agregado al equipo!" });
        celebrateSocio();
      }
      onSaved();
    } catch (err) {
      toast({ title: "Error al guardar", description: err.response?.data?.detail || err.message || "Error", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const title = isEdit ? "Editar Socio" : "Nuevo Socio";
  const submitLabel = saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear socio";

  const stagger = {
    hidden:  { opacity: 0, y: 12 },
    visible: (i) => ({ opacity: 1, y: 0, transition: { delay: 0.05 * i, duration: 0.4, ease: [0.22, 1, 0.36, 1] } }),
  };

  return (
    <AnimatePresence>
      <motion.div
        key="ultra-socio-overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        className="fixed inset-0 z-50 flex items-center justify-center px-4 py-4 overflow-hidden ultra-scroll"
        style={{
          background: "radial-gradient(1000px 600px at 15% 20%, rgba(6,182,212,0.28), transparent 60%), radial-gradient(900px 500px at 85% 80%, rgba(236,72,153,0.28), transparent 60%), rgba(3, 6, 23, 0.75)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        data-testid="socio-form"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 28 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-3xl max-h-[95vh] flex flex-col rounded-[32px] overflow-hidden ultra-glow-border"
          style={{
            background: "linear-gradient(160deg, rgba(10,12,40,0.94) 0%, rgba(17,24,58,0.94) 50%, rgba(30,15,55,0.94) 100%)",
            boxShadow: "0 40px 90px -20px rgba(6,182,212,0.5), 0 20px 50px -20px rgba(236,72,153,0.35)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Aurora blobs */}
          <div className="ultra-aurora-blob" style={{ width: 320, height: 320, top: -100, left: -80, background: "radial-gradient(circle, #06b6d4, transparent)" }} />
          <div className="ultra-aurora-blob" style={{ width: 300, height: 300, bottom: -80, right: -60, background: "radial-gradient(circle, #ec4899, transparent)", animationDelay: "-6s" }} />
          <div className="ultra-aurora-blob" style={{ width: 240, height: 240, top: "50%", right: "-10%", background: "radial-gradient(circle, #a78bfa, transparent)", animationDelay: "-12s" }} />
          <div className="ultra-grid" />

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between px-6 py-3 border-b border-white/10">
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05, x: -2 }} whileTap={{ scale: 0.94 }}
                type="button" onClick={onClose}
                className="ultra-secondary"
                data-testid="cancel-socio-btn"
              >
                <ArrowLeft size={14} /> Cancelar
              </motion.button>
              <div className="flex items-center gap-3">
                <div className="relative w-11 h-11 rounded-2xl flex items-center justify-center"
                     style={{ background: "linear-gradient(135deg, #06b6d4, #a78bfa, #ec4899)", boxShadow: "0 10px 24px -6px rgba(6,182,212,0.6)" }}>
                  <Star size={20} className="text-white ultra-icon-float" />
                </div>
                <div>
                  <div className="ultra-section-header" style={{ marginBottom: 2 }}>
                    <Sparkles size={11} /> {isEdit ? "Editar" : "Sumar al equipo"}
                  </div>
                  <h2 className="ultra-title" style={{ fontSize: 22 }}>{title}</h2>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                type="button" onClick={handleSubmit} disabled={saving}
                className="ultra-cta"
                data-testid="submit-socio-btn"
              >
                {saving ? <Loader2 size={16} className="animate-spin inline mr-2" /> : <CheckCircle2 size={16} className="inline mr-2" />}
                {submitLabel}
              </motion.button>
              <button type="button" onClick={onClose} className="ultra-secondary" style={{ padding: "10px", borderRadius: "50%" }}>
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="relative z-10 px-5 py-3 flex-1 overflow-hidden">
            <div className="flex flex-col md:flex-row gap-4 items-start">
              {/* PHOTO */}
              {sf.photo !== false && (
                <motion.div variants={stagger} initial="hidden" animate="visible" custom={0} className="flex flex-col items-center gap-3 flex-shrink-0">
                  <label className="ultra-photo" data-testid="socio-photo-label">
                    {photoPreview
                      ? <img src={photoPreview} alt="foto" />
                      : <div className="ultra-photo-empty">
                          <Camera size={28} className="ultra-icon-float" strokeWidth={2} />
                          <span>AGREGAR FOTO</span>
                        </div>}
                    <div className="ultra-photo-badge">
                      <Upload size={14} />
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} data-testid="socio-photo-input" />
                  </label>
                  <p className="text-[10px] font-bold text-white/50 tracking-wider">FOTO OPCIONAL</p>
                </motion.div>
              )}

              {/* RIGHT */}
              <div className="flex-1 w-full space-y-3">
                {/* Name */}
                <motion.div variants={stagger} initial="hidden" animate="visible" custom={1}>
                  <UField icon={User} label="Nombre completo *">
                    <input value={form.name} onChange={set("name")} placeholder="Ej: Carlos Pérez" required
                           data-testid="input-socio-name" />
                  </UField>
                </motion.div>

                {/* Role choice cards */}
                <motion.div variants={stagger} initial="hidden" animate="visible" custom={2}>
                  <label className="ultra-label"><Sparkles size={12} /> Rol *</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {ROLES.map((r) => {
                      const Icon = r.icon;
                      const active = form.role === r.key;
                      return (
                        <motion.button
                          key={r.key} type="button"
                          whileHover={{ y: -3 }} whileTap={{ scale: 0.96 }}
                          onClick={() => setForm(p => ({ ...p, role: r.key }))}
                          className={`ultra-choice ${active ? "is-active" : ""}`}
                          data-testid={`role-${r.key.toLowerCase()}`}
                          style={{ padding: "16px 10px" }}
                        >
                          <Icon size={24} strokeWidth={2.2} />
                          <span className="text-[12px]">{r.key}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>

                {/* Phone + Email */}
                <motion.div variants={stagger} initial="hidden" animate="visible" custom={3}
                            className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sf.phone !== false && (
                    <UField icon={Phone} label="Teléfono">
                      <input value={form.phone} onChange={set("phone")} placeholder="+502 1234 5678"
                             data-testid="input-socio-phone" />
                    </UField>
                  )}
                  {sf.email !== false && (
                    <UField icon={Mail} label="Email">
                      <input type="email" value={form.email} onChange={set("email")} placeholder="correo@email.com"
                             data-testid="input-socio-email" />
                    </UField>
                  )}
                </motion.div>

                {/* Notes */}
                {sf.notes !== false && (
                  <motion.div variants={stagger} initial="hidden" animate="visible" custom={4}>
                    <UField icon={StickyNote} label="Notas">
                      <input value={form.notes} onChange={set("notes")} placeholder="Especialidades, equipo, disponibilidad…"
                             data-testid="input-socio-notes" />
                    </UField>
                  </motion.div>
                )}
              </div>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function UField({ icon: Icon, label, children }) {
  return (
    <div className="ultra-field">
      <label className="ultra-label">
        {Icon && <Icon size={12} />}
        {label}
      </label>
      <div className="relative">
        {Icon && <Icon size={16} className="ultra-field-icon" />}
        {children}
      </div>
    </div>
  );
}
