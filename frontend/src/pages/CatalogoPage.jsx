import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid, Search, Plus, Copy, Check, ArrowLeft, MessageCircle,
  Trash2, X, Gem, Crown, Aperture, Castle, Music, Package, Camera,
  Gift, Sparkles, Cake, UploadCloud, Download, FileText, Loader2, Image as ImageIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/PageHeader";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  getCatalog, createCatalogService, updateCatalogService, deleteCatalogService,
  uploadCatalogMedia, deleteCatalogMedia, catalogMediaUrl,
} from "@/lib/api";

// Íconos (lucide-react) — sin emojis en la UI
const ICONS = {
  gem: Gem, crown: Crown, aperture: Aperture, castle: Castle, music: Music,
  package: Package, camera: Camera, gift: Gift, sparkles: Sparkles, cake: Cake,
};

const GRADIENTS = [
  "linear-gradient(135deg,#f472b6,#db2777)",
  "linear-gradient(135deg,#a78bfa,#7c3aed)",
  "linear-gradient(135deg,#818cf8,#4f46e5)",
  "linear-gradient(135deg,#fbbf24,#f59e0b)",
  "linear-gradient(135deg,#34d399,#059669)",
  "linear-gradient(135deg,#22d3ee,#0891b2)",
];

function IconOf(key) { return ICONS[key] || ICONS.package; }

// ─────────────────────────────────────────────────────────────
// Botón copiar texto
// ─────────────────────────────────────────────────────────────
function CopyTextButton({ text, disabled }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const doCopy = async () => {
    if (!text) return;
    try { await navigator.clipboard.writeText(text); }
    catch {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
    setCopied(true);
    toast({ description: "Texto copiado. Pégalo en WhatsApp 👍" });
    setTimeout(() => setCopied(false), 1600);
  };
  return (
    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
      onClick={doCopy} disabled={disabled}
      data-testid="copy-text-btn"
      className={`inline-flex items-center gap-2 font-bold rounded-full px-4 py-2.5 text-sm transition-colors disabled:opacity-40 ${
        copied ? "bg-emerald-500 text-white" : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"}`}>
      {copied ? <Check size={16} strokeWidth={3} /> : <Copy size={16} strokeWidth={2.4} />}
      {copied ? "Copiado" : "Copiar texto"}
    </motion.button>
  );
}

function WhatsAppTextButton({ text, disabled }) {
  const send = () => {
    if (!text) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };
  return (
    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
      onClick={send} disabled={disabled}
      data-testid="whatsapp-text-btn"
      className="inline-flex items-center gap-2 font-bold rounded-full px-4 py-2.5 text-sm text-white transition-transform disabled:opacity-40"
      style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", boxShadow: "0 8px 20px -8px rgba(22,163,74,0.7)" }}>
      <MessageCircle size={16} strokeWidth={2.4} /> Enviar a WhatsApp
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────
// Tarjeta de archivo (imagen o PDF) con arrastrar / descargar / eliminar
// ─────────────────────────────────────────────────────────────
function MediaTile({ media, onDelete }) {
  const isImage = media.kind === "image";
  const url = catalogMediaUrl(media.id);
  const downloadUrl = catalogMediaUrl(media.id, true);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative group rounded-2xl overflow-hidden glass"
      data-testid={`media-${media.id}`}
    >
      <div className="relative aspect-square bg-slate-100">
        {isImage ? (
          // draggable: el usuario puede arrastrar la imagen directo a WhatsApp Web
          <img
            src={url}
            alt={media.filename}
            draggable
            className="w-full h-full object-cover cursor-grab active:cursor-grabbing"
            data-testid={`media-img-${media.id}`}
          />
        ) : (
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="w-full h-full flex flex-col items-center justify-center gap-2 text-rose-500 hover:bg-rose-50 transition-colors">
            <FileText size={40} strokeWidth={1.6} />
            <span className="text-[11px] font-black uppercase tracking-wide">PDF</span>
          </a>
        )}
        {/* Botón eliminar */}
        <button onClick={() => onDelete(media)} data-testid={`media-delete-${media.id}`}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/85 backdrop-blur flex items-center justify-center text-rose-500 opacity-0 group-hover:opacity-100 hover:bg-rose-500 hover:text-white transition-all shadow">
          <Trash2 size={15} />
        </button>
      </div>
      {/* Acciones */}
      <div className="flex items-center justify-between gap-1 px-2.5 py-2">
        <span className="text-[11px] font-semibold text-slate-500 truncate flex-1" title={media.filename}>{media.filename}</span>
        <a href={downloadUrl} download={media.filename} data-testid={`media-download-${media.id}`}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 shrink-0">
          <Download size={13} /> Bajar
        </a>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Zona de subida (drag & drop + clic)
// ─────────────────────────────────────────────────────────────
function UploadZone({ onFiles, uploading, progress }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const handleDrop = (e) => {
    e.preventDefault(); setDrag(false);
    if (e.dataTransfer?.files?.length) onFiles(e.dataTransfer.files);
  };
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      data-testid="upload-zone"
      className={`relative rounded-3xl border-2 border-dashed cursor-pointer transition-all ${
        drag ? "border-indigo-500 bg-indigo-50/70" : "border-slate-300 hover:border-indigo-400 bg-white/50"
      } ${uploading ? "pointer-events-none opacity-80" : ""}`}
    >
      <input ref={inputRef} type="file" accept="image/*,application/pdf" multiple className="hidden"
        onChange={(e) => { if (e.target.files?.length) onFiles(e.target.files); e.target.value = ""; }}
        data-testid="upload-input" />
      <div className="flex flex-col items-center justify-center text-center py-10 px-4">
        {uploading ? (
          <>
            <Loader2 size={34} className="text-indigo-500 animate-spin mb-3" />
            <p className="text-sm font-bold text-slate-700">Subiendo… {progress}%</p>
            <div className="w-40 h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </>
        ) : (
          <>
            <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2.5, repeat: Infinity }}
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: "linear-gradient(135deg,#818cf8,#8b5cf6)" }}>
              <UploadCloud size={26} className="text-white" />
            </motion.div>
            <p className="text-sm font-black text-slate-800">Arrastra tus imágenes o PDF aquí</p>
            <p className="text-xs text-slate-400 font-medium mt-1">o haz clic para elegir · JPG, PNG, PDF (máx 25 MB)</p>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Vista de detalle: subir archivos + guion de venta
// ─────────────────────────────────────────────────────────────
function ServiceDetail({ service, onBack, onChanged }) {
  const Icon = IconOf(service.icon);
  const { toast } = useToast();
  const [media, setMedia] = useState(service.media || []);
  const [salesText, setSalesText] = useState(service.sales_text || "");
  const [name, setName] = useState(service.name);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [savedFlash, setSavedFlash] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    setMedia(service.media || []);
    setSalesText(service.sales_text || "");
    setName(service.name);
  }, [service.id]); // eslint-disable-line

  // Autoguardado del texto y nombre (debounce)
  useEffect(() => {
    if (salesText === (service.sales_text || "") && name === service.name) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await updateCatalogService(service.id, { sales_text: salesText, name: name.trim() || service.name });
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1500);
        onChanged({ silent: true });
      } catch { /* ignore */ }
    }, 900);
    return () => clearTimeout(saveTimer.current);
  }, [salesText, name]); // eslint-disable-line

  const handleFiles = async (files) => {
    const arr = Array.from(files);
    setUploading(true); setProgress(0);
    let ok = 0;
    for (const f of arr) {
      try {
        const m = await uploadCatalogMedia(service.id, f, setProgress);
        setMedia((prev) => [...prev, m]);
        ok += 1;
      } catch (e) {
        toast({ description: `No se pudo subir ${f.name}`, variant: "destructive" });
      }
    }
    setUploading(false); setProgress(0);
    if (ok) { toast({ description: `${ok} archivo(s) subido(s)` }); onChanged({ silent: true }); }
  };

  const removeMedia = async (m) => {
    setMedia((prev) => prev.filter((x) => x.id !== m.id));
    try { await deleteCatalogMedia(m.id); onChanged({ silent: true }); }
    catch { toast({ description: "No se pudo eliminar", variant: "destructive" }); }
  };

  const images = media.filter((m) => m.kind === "image");
  const pdfs = media.filter((m) => m.kind === "pdf");

  return (
    <div data-testid={`service-detail-${service.id}`}>
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <button onClick={onBack} data-testid="detail-back"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 glass rounded-full px-4 py-2 transition-colors">
          <ArrowLeft size={16} /> Volver
        </button>
        <span className={`text-xs font-bold transition-opacity ${savedFlash ? "opacity-100 text-emerald-600" : "opacity-0"}`}>
          ✓ Guardado
        </span>
      </div>

      {/* Cabecera */}
      <div className="flex items-center gap-4 mb-7">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shrink-0" style={{ background: service.gradient }}>
          <Icon size={26} className="text-white" strokeWidth={2.2} />
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)}
          data-testid="detail-name"
          className="flex-1 min-w-0 text-3xl font-black text-slate-900 bg-transparent border-b-2 border-transparent hover:border-slate-200 focus:border-indigo-400 outline-none transition-colors"
          style={{ fontFamily: "Cabinet Grotesk, sans-serif" }} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* IZQUIERDA: archivos (lo que vendes) */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ImageIcon size={17} className="text-indigo-500" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Mis imágenes y PDF</h3>
            <span className="text-xs font-bold text-slate-400">({media.length})</span>
          </div>
          <p className="text-xs text-slate-400 font-medium mb-3">
            Arrastra una imagen fuera de aquí directo a WhatsApp Web, o usa “Bajar” para descargarla.
          </p>

          <UploadZone onFiles={handleFiles} uploading={uploading} progress={progress} />

          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
              <AnimatePresence>
                {images.map((m) => <MediaTile key={m.id} media={m} onDelete={removeMedia} />)}
              </AnimatePresence>
            </div>
          )}

          {pdfs.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
              <AnimatePresence>
                {pdfs.map((m) => <MediaTile key={m.id} media={m} onDelete={removeMedia} />)}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* DERECHA: guion de venta */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle size={17} className="text-emerald-500" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Mi guion de venta</h3>
          </div>
          <p className="text-xs text-slate-400 font-medium mb-3">
            Escribe o pega el texto que le mandas al cliente. Se guarda solo.
          </p>
          <textarea
            value={salesText}
            onChange={(e) => setSalesText(e.target.value)}
            data-testid="sales-text"
            placeholder="Ej: ¡Hola! 😊 Gracias por escribirnos. Te comparto la información de nuestro servicio de bodas..."
            className="w-full min-h-[320px] glass rounded-2xl p-4 text-sm text-slate-700 leading-relaxed outline-none focus:ring-2 focus:ring-emerald-300 resize-y"
          />
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <CopyTextButton text={salesText} disabled={!salesText.trim()} />
            <WhatsAppTextButton text={salesText} disabled={!salesText.trim()} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tarjeta de servicio (grid)
// ─────────────────────────────────────────────────────────────
function ServiceCard({ service, index, onOpen }) {
  const Icon = IconOf(service.icon);
  const cover = (service.media || []).find((m) => m.kind === "image");
  const count = (service.media || []).length;
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, scale: 1.02 }}
      onClick={() => onOpen(service.id)}
      data-testid={`service-card-${service.id}`}
      className="relative text-left glass rounded-3xl overflow-hidden group"
    >
      <div className="relative h-36 overflow-hidden">
        {cover ? (
          <img src={catalogMediaUrl(cover.id)} alt={service.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        ) : (
          <div className="w-full h-full" style={{ background: service.gradient }} />
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(15,23,42,0.5), transparent 60%)" }} />
        <div className="absolute top-3 left-3 w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: service.gradient }}>
          <Icon size={20} className="text-white" strokeWidth={2.2} />
        </div>
        {count > 0 && (
          <span className="absolute top-3 right-3 text-[10px] font-black uppercase tracking-wider bg-white/85 backdrop-blur text-slate-700 rounded-full px-2.5 py-1">
            {count} archivo{count === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="text-lg font-black text-slate-900 leading-tight" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
          {service.name}
        </p>
        <p className="text-xs text-slate-400 font-medium mt-1">
          {service.sales_text?.trim() ? "Guion listo · toca para ver" : "Toca para subir tu material"}
        </p>
      </div>
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────
// Modal: nuevo servicio
// ─────────────────────────────────────────────────────────────
function NewServiceModal({ open, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("gem");
  const [gradIdx, setGradIdx] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (open) { setName(""); setIcon("gem"); setGradIdx(0); } }, [open]);

  const create = async () => {
    if (!name.trim() || busy) return;
    setBusy(true);
    try { await onCreate({ name: name.trim(), icon, gradient: GRADIENTS[gradIdx] }); onClose(); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0 bg-white border border-slate-200 rounded-2xl overflow-hidden [&>button]:hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <DialogTitle className="text-lg font-black text-slate-900">Nuevo servicio</DialogTitle>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wide">Nombre</label>
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus
              placeholder="Ej: Bodas, XV Años, Cabina 360…"
              onKeyDown={(e) => e.key === "Enter" && create()}
              data-testid="new-service-name"
              className="w-full mt-1 text-sm font-semibold bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200 focus:border-indigo-400 outline-none" />
          </div>
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wide">Ícono</label>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {Object.entries(ICONS).map(([key, Comp]) => (
                <button key={key} onClick={() => setIcon(key)}
                  className={`aspect-square rounded-xl flex items-center justify-center transition-all ${icon === key ? "text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                  style={icon === key ? { background: GRADIENTS[gradIdx] } : undefined}>
                  <Comp size={18} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wide">Color</label>
            <div className="flex gap-2 mt-2">
              {GRADIENTS.map((g, i) => (
                <button key={i} onClick={() => setGradIdx(i)}
                  className={`w-9 h-9 rounded-full transition-transform ${gradIdx === i ? "ring-2 ring-offset-2 ring-slate-800 scale-110" : ""}`}
                  style={{ background: g }} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="text-sm font-bold text-slate-600 hover:text-slate-900 px-4 py-2 rounded-full">Cancelar</button>
          <button onClick={create} disabled={!name.trim() || busy} data-testid="new-service-create"
            className="text-sm font-black text-white px-5 py-2.5 rounded-full disabled:opacity-40 inline-flex items-center gap-2"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Crear
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────
export default function CatalogoPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async (opts = {}) => {
    try {
      const data = await getCatalog();
      setServices(data);
    } catch { if (!opts.silent) toast({ description: "No se pudo cargar el catálogo", variant: "destructive" }); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const selected = useMemo(() => services.find((s) => s.id === selectedId) || null, [services, selectedId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return services;
    return services.filter((s) => `${s.name} ${s.sales_text || ""}`.toLowerCase().includes(q));
  }, [services, query]);

  const createService = async ({ name, icon, gradient }) => {
    const svc = await createCatalogService({ name, icon, gradient });
    setServices((prev) => [...prev, { ...svc, media: [] }]);
    setSelectedId(svc.id);
    toast({ description: "Servicio creado · sube tu material" });
  };

  const removeService = async () => {
    if (!selected) return;
    const id = selected.id;
    if (!window.confirm(`¿Eliminar "${selected.name}" y todos sus archivos?`)) return;
    setServices((prev) => prev.filter((s) => s.id !== id));
    setSelectedId(null);
    try { await deleteCatalogService(id); toast({ description: "Servicio eliminado" }); }
    catch { toast({ description: "No se pudo eliminar", variant: "destructive" }); load({ silent: true }); }
  };

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto" data-testid="catalogo-page">
      <PageHeader
        icon={LayoutGrid}
        title="Catálogo"
        subtitle="Tu página de ventas · sube tus fotos/PDF y tu guion, luego mándalos a WhatsApp"
        gradient="linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899)"
        right={selected ? (
          <button onClick={removeService} data-testid="delete-service"
            className="inline-flex items-center gap-2 text-sm font-bold text-rose-600 hover:text-white border border-rose-200 hover:bg-rose-500 rounded-full px-4 py-2.5 transition-colors">
            <Trash2 size={16} /> Eliminar servicio
          </button>
        ) : (
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setNewOpen(true)} data-testid="new-service-btn"
            className="inline-flex items-center gap-2 text-sm font-black text-white rounded-full px-4 py-2.5"
            style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 10px 26px -10px rgba(99,102,241,0.6)" }}>
            <Plus size={16} strokeWidth={2.6} /> Nuevo servicio
          </motion.button>
        )}
      />

      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 size={28} className="animate-spin" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div key="detail"
              initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3 }}>
              <ServiceDetail
                service={selected}
                onBack={() => setSelectedId(null)}
                onChanged={(o) => load(o)}
              />
            </motion.div>
          ) : (
            <motion.div key="grid"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}>
              {services.length > 0 && (
                <div className="relative mb-6 max-w-md">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar servicio…" data-testid="catalogo-search"
                    className="w-full glass rounded-full pl-11 pr-10 py-3 text-sm font-medium text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-300" />
                  {query && (
                    <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={16} /></button>
                  )}
                </div>
              )}

              {services.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white"
                    style={{ background: "linear-gradient(135deg,#818cf8,#8b5cf6)" }}>
                    <LayoutGrid size={28} />
                  </div>
                  <p className="text-slate-700 font-black text-lg">Aún no tienes servicios</p>
                  <p className="text-slate-400 font-medium mt-1 mb-5">Crea uno (Bodas, XV Años, Cabina 360…) y sube tu material.</p>
                  <button onClick={() => setNewOpen(true)} data-testid="empty-new-service-btn"
                    className="inline-flex items-center gap-2 text-sm font-black text-white rounded-full px-5 py-3"
                    style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                    <Plus size={16} strokeWidth={2.6} /> Crear mi primer servicio
                  </button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-slate-500 font-semibold">Nada coincide con “{query}”.</div>
              ) : (
                <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filtered.map((s, i) => (
                    <ServiceCard key={s.id} service={s} index={i} onOpen={setSelectedId} />
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <NewServiceModal open={newOpen} onClose={() => setNewOpen(false)} onCreate={createService} />
    </div>
  );
}
