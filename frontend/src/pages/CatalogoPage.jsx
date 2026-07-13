import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutGrid, Search, Plus, Copy, Check, ArrowLeft, MessageCircle,
  Trash2, X, Gem, Crown, Aperture, Castle, Music, Package, Camera,
  Gift, Sparkles, Cake, UploadCloud, Download, FileText, Loader2, Image as ImageIcon,
  ArrowUpDown, Filter, Rows3, Grid3x3, ChevronLeft, ChevronRight, Maximize2,
  Send, Zap, FileImage, FileType, CheckCircle2, Circle, Wand2, Eye,
  ChevronDown, ChevronUp, Film, Play, Pause, RotateCcw, Smartphone,
  Pencil, PlusCircle, HardDrive,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PageHeader from "@/components/PageHeader";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import * as CL from "@/lib/catalogLocal";

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
const TEMPLATES = [
  { name: "Bodas", icon: "gem", gradient: GRADIENTS[0] },
  { name: "XV Años", icon: "crown", gradient: GRADIENTS[1] },
  { name: "Cabina 360", icon: "aperture", gradient: GRADIENTS[2] },
  { name: "Salón", icon: "castle", gradient: GRADIENTS[3] },
  { name: "DJ y Música", icon: "music", gradient: GRADIENTS[4] },
  { name: "Fotografía", icon: "camera", gradient: GRADIENTS[5] },
];
const SCRIPT_TEMPLATES = [
  { label: "Saludo cálido", text: "¡Hola! 😊 Gracias por escribirnos. Con mucho gusto te comparto la información de nuestro servicio.\n\nCuéntame:\n• ¿Para qué fecha lo necesitas?\n• ¿Cuántas personas asistirán?\n• ¿Tienes ya lugar o buscas recomendación?" },
  { label: "Paquetes", text: "Estos son nuestros paquetes:\n\n🎉 BÁSICO — $XXXX\n• Punto 1\n• Punto 2\n\n✨ PREMIUM — $XXXX\n• Todo lo anterior\n• Extras\n\n👑 DELUXE — $XXXX\n• Todo lo anterior\n• Servicios adicionales" },
  { label: "Cierre de venta", text: "Para apartar la fecha solo necesitamos un anticipo del 30%. Aceptamos transferencia y pago con tarjeta.\n\n¿Quieres que te aparte esta fecha? Solo tenemos algunos horarios disponibles este mes 📆" },
];

function IconOf(key) { return ICONS[key] || ICONS.package; }

// ─────────────────────────────────────────────────────────────
// Contador animado + Stat
// ─────────────────────────────────────────────────────────────
function AnimatedCount({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = display, end = value, t0 = performance.now(), raf;
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / 500);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line
  }, [value]);
  return <>{display}</>;
}

function StatCard({ icon: Icon, label, value, gradient, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className="relative glass rounded-3xl p-4 overflow-hidden group cursor-default"
      data-testid={`stat-${label}`}
    >
      <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-40" style={{ background: gradient }} />
      <div className="relative flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg shrink-0" style={{ background: gradient }}>
          <Icon size={20} className="text-white" strokeWidth={2.2} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-black text-slate-900 leading-none" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
            <AnimatedCount value={value} />
          </p>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mt-1 truncate">{label}</p>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Botones copiar / whatsapp
// ─────────────────────────────────────────────────────────────
function CopyBtn({ text, disabled, compact }) {
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
    toast({ description: "Texto copiado 👍" });
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
      onClick={doCopy} disabled={disabled} data-testid="copy-text-btn"
      className={`inline-flex items-center gap-2 font-bold rounded-full ${compact ? "px-3 py-2 text-xs" : "px-4 py-2.5 text-sm"} transition-colors disabled:opacity-40 ${
        copied ? "bg-emerald-500 text-white" : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"}`}>
      {copied ? <Check size={compact ? 14 : 16} strokeWidth={3} /> : <Copy size={compact ? 14 : 16} strokeWidth={2.4} />}
      {copied ? "Copiado" : "Copiar"}
    </motion.button>
  );
}

function WaBtn({ text, disabled, compact }) {
  const send = () => { if (text) window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener"); };
  return (
    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }}
      onClick={send} disabled={disabled} data-testid="whatsapp-text-btn"
      className={`inline-flex items-center gap-2 font-bold rounded-full ${compact ? "px-3 py-2 text-xs" : "px-4 py-2.5 text-sm"} text-white transition-transform disabled:opacity-40`}
      style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", boxShadow: "0 8px 20px -8px rgba(22,163,74,0.7)" }}>
      <MessageCircle size={compact ? 14 : 16} strokeWidth={2.4} /> WhatsApp
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────
// Lightbox (imágenes + videos)
// ─────────────────────────────────────────────────────────────
function Lightbox({ items, index, onClose, onNav }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onNav(-1);
      if (e.key === "ArrowRight") onNav(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onNav]);
  if (index == null || !items[index]) return null;
  const it = items[index];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-6"
      onClick={onClose} data-testid="lightbox">
      <button onClick={onClose} className="absolute top-6 right-6 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center" data-testid="lightbox-close"><X size={20} /></button>
      <div className="absolute top-6 left-6 text-white/70 text-sm font-bold">{index + 1} / {items.length}</div>
      {index > 0 && <button onClick={(e) => { e.stopPropagation(); onNav(-1); }} className="absolute left-4 md:left-8 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"><ChevronLeft size={22} /></button>}
      {index < items.length - 1 && <button onClick={(e) => { e.stopPropagation(); onNav(1); }} className="absolute right-4 md:right-8 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"><ChevronRight size={22} /></button>}
      <div onClick={(e) => e.stopPropagation()} className="max-w-[90vw] max-h-[85vh] flex items-center justify-center">
        {it.kind === "video" ? (
          <video key={it.id} src={it.url} controls autoPlay className="max-w-[90vw] max-h-[85vh] rounded-2xl shadow-2xl" />
        ) : (
          <motion.img key={it.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            src={it.url} alt={it.filename} draggable
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl cursor-grab active:cursor-grabbing" />
        )}
      </div>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 backdrop-blur rounded-full px-4 py-2">
        <button onClick={(e) => { e.stopPropagation(); CL.downloadMedia(it.id, it.filename); }}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-white/90 hover:text-white">
          <Download size={13} /> Descargar
        </button>
        <span className="text-white/40">·</span>
        <span className="text-xs text-white/60 font-medium truncate max-w-[240px]" title={it.filename}>{it.filename}</span>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Media Tile (imagen / video / pdf)
// Todo el arrastre funciona porque son blob URLs locales
// ─────────────────────────────────────────────────────────────
function MediaTile({ media, onDelete, onPreview, index }) {
  const isImage = media.kind === "image";
  const isVideo = media.kind === "video";
  const isPdf = media.kind === "pdf";
  const bgUrl = media.thumbUrl || media.url;

  // Para video/pdf: setear DownloadURL en dragstart (Chrome soporta arrastrar como archivo)
  const onDragStart = (e) => {
    if (isImage) return; // imágenes arrastran nativas
    try {
      const dl = `${media.mime || "application/octet-stream"}:${media.filename}:${media.url}`;
      e.dataTransfer.setData("DownloadURL", dl);
      e.dataTransfer.effectAllowed = "copy";
    } catch { /* ignore */ }
  };

  return (
    <motion.div
      layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.03 }}
      className="relative group rounded-2xl overflow-hidden glass"
      data-testid={`media-${media.id}`}
      draggable onDragStart={onDragStart}
    >
      <div className="relative aspect-square bg-slate-100 overflow-hidden">
        {isPdf ? (
          <button onClick={() => window.open(media.url, "_blank", "noopener")}
            className="w-full h-full flex flex-col items-center justify-center gap-2 text-rose-500 hover:bg-rose-50 transition-colors">
            <FileText size={40} strokeWidth={1.6} />
            <span className="text-[11px] font-black uppercase tracking-wide">PDF</span>
          </button>
        ) : (
          <>
            <img src={bgUrl} alt={media.filename} draggable={isImage}
              className="w-full h-full object-cover cursor-grab active:cursor-grabbing transition-transform duration-500 group-hover:scale-110"
              data-testid={`media-img-${media.id}`} />
            {isVideo && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur flex items-center justify-center shadow-2xl">
                  <Play size={22} className="text-white ml-0.5" fill="white" />
                </div>
              </div>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onPreview(media); }}
              className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors"
              data-testid={`media-preview-${media.id}`} aria-label="Ver en grande">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur rounded-full px-3 py-1.5 text-xs font-black text-slate-800 inline-flex items-center gap-1.5">
                <Maximize2 size={12} /> Ver
              </span>
            </button>
          </>
        )}
        <button onClick={() => onDelete(media)} data-testid={`media-delete-${media.id}`}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center text-rose-500 opacity-0 group-hover:opacity-100 hover:bg-rose-500 hover:text-white transition-all shadow z-10">
          <Trash2 size={15} />
        </button>
        {/* Etiqueta de tipo */}
        <span className={`absolute top-2 left-2 text-[9px] font-black uppercase tracking-wider rounded-full px-2 py-0.5 backdrop-blur ${
          isVideo ? "bg-purple-500/90 text-white" : isPdf ? "bg-rose-500/90 text-white" : "bg-white/90 text-slate-700"
        }`}>
          {isVideo ? "Video" : isPdf ? "PDF" : "Foto"}
        </span>
      </div>
      <div className="flex items-center justify-between gap-1 px-2.5 py-2">
        <span className="text-[11px] font-semibold text-slate-500 truncate flex-1" title={media.filename}>{media.filename}</span>
        <button onClick={() => CL.downloadMedia(media.id, media.filename)} data-testid={`media-download-${media.id}`}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 shrink-0">
          <Download size={13} /> Bajar
        </button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Visor tipo banner (grande) + tira de miniaturas
// Todo el área acepta drop. Botón "Añadir" compacto.
// ─────────────────────────────────────────────────────────────
function MediaBanner({ media, onDelete, onOpenLightbox, onFilesDrop, uploading, progress }) {
  const [idx, setIdx] = useState(0);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef(null);
  const stripRef = useRef(null);

  // Reset al cambiar de servicio o si el actual desaparece
  useEffect(() => {
    if (idx >= media.length) setIdx(Math.max(0, media.length - 1));
  }, [media.length, idx]);

  const current = media[idx];

  const pick = () => inputRef.current?.click();
  const handleDrop = (e) => {
    e.preventDefault(); setDrag(false);
    if (e.dataTransfer?.files?.length) onFilesDrop(e.dataTransfer.files);
  };
  const nav = (d) => setIdx((i) => Math.max(0, Math.min(media.length - 1, i + d)));

  // Auto-scroll al thumb activo
  useEffect(() => {
    const el = stripRef.current?.querySelector(`[data-thumb="${idx}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [idx]);

  // Dragstart del visor grande — permite arrastrarlo a WhatsApp Web
  const onDragStartCurrent = (e) => {
    if (!current) return;
    if (current.kind === "image") return; // nativo
    try {
      const dl = `${current.mime || "application/octet-stream"}:${current.filename}:${current.url}`;
      e.dataTransfer.setData("DownloadURL", dl);
      e.dataTransfer.effectAllowed = "copy";
    } catch { /* ignore */ }
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*,video/*,application/pdf" multiple className="hidden"
        onChange={(e) => { if (e.target.files?.length) onFilesDrop(e.target.files); e.target.value = ""; }}
        data-testid="upload-input" />

      {/* Visor grande */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        data-testid="media-banner"
        className={`relative rounded-3xl overflow-hidden glass transition-all ${drag ? "ring-4 ring-indigo-400" : ""}`}
        style={{ aspectRatio: "4 / 3" }}
      >
        {/* Overlay dropzone activa */}
        <AnimatePresence>
          {drag && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 bg-indigo-500/25 backdrop-blur-sm flex items-center justify-center pointer-events-none">
              <div className="bg-white rounded-full px-5 py-3 shadow-xl inline-flex items-center gap-2">
                <UploadCloud size={20} className="text-indigo-500" />
                <span className="text-sm font-black text-slate-800">Suelta para agregar</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Overlay de progreso */}
        <AnimatePresence>
          {uploading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
              <Loader2 size={32} className="text-white animate-spin" />
              <p className="text-sm font-black text-white">Guardando… {progress}%</p>
              <div className="w-48 h-1.5 bg-white/25 rounded-full overflow-hidden">
                <div className="h-full bg-white transition-all" style={{ width: `${progress}%` }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contenido */}
        {media.length === 0 ? (
          <button onClick={pick} data-testid="banner-empty-add"
            className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-500 hover:bg-white/40 transition-colors">
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 2.5, repeat: Infinity }}
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#818cf8,#8b5cf6)" }}>
              <UploadCloud size={28} className="text-white" />
            </motion.div>
            <p className="text-base font-black text-slate-800">Arrastra o toca para agregar</p>
            <p className="text-xs text-slate-400 font-medium">JPG · PNG · MP4 · MOV · PDF · guardado local</p>
          </button>
        ) : (
          <>
            <AnimatePresence mode="wait">
              <motion.div key={current?.id}
                initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.28 }}
                className="absolute inset-0 flex items-center justify-center bg-slate-900"
                data-testid="banner-current"
                draggable={!!current}
                onDragStart={onDragStartCurrent}
              >
                {current?.kind === "image" && (
                  <img src={current.url} alt={current.filename} draggable
                    className="max-w-full max-h-full object-contain cursor-grab active:cursor-grabbing" />
                )}
                {current?.kind === "video" && (
                  <video key={current.id} src={current.url} controls
                    className="max-w-full max-h-full object-contain" />
                )}
                {current?.kind === "pdf" && (
                  <button onClick={() => window.open(current.url, "_blank", "noopener")}
                    className="w-full h-full flex flex-col items-center justify-center gap-3 text-rose-400 hover:text-rose-300 transition-colors">
                    <FileText size={72} strokeWidth={1.4} />
                    <span className="text-lg font-black uppercase tracking-wide">PDF</span>
                    <span className="text-xs font-medium text-slate-400">Toca para abrir</span>
                  </button>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Contador */}
            <div className="absolute top-3 left-3 z-20 text-[11px] font-black tracking-wider text-white bg-black/50 backdrop-blur rounded-full px-3 py-1.5">
              {idx + 1} / {media.length}
            </div>

            {/* Tipo */}
            <span className={`absolute top-3 left-1/2 -translate-x-1/2 z-20 text-[10px] font-black uppercase tracking-wider rounded-full px-2.5 py-1 backdrop-blur ${
              current?.kind === "video" ? "bg-purple-500/90 text-white" :
              current?.kind === "pdf" ? "bg-rose-500/90 text-white" :
              "bg-white/90 text-slate-700"
            }`}>
              {current?.kind === "video" ? "Video" : current?.kind === "pdf" ? "PDF" : "Foto"}
            </span>

            {/* Acciones */}
            <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
              {current && current.kind !== "pdf" && (
                <button onClick={() => onOpenLightbox(current)} data-testid="banner-fullscreen"
                  className="w-9 h-9 rounded-full bg-white/90 backdrop-blur hover:bg-white text-slate-700 flex items-center justify-center shadow"
                  title="Ver en pantalla completa">
                  <Maximize2 size={15} />
                </button>
              )}
              {current && (
                <button onClick={() => CL.downloadMedia(current.id, current.filename)} data-testid="banner-download"
                  className="w-9 h-9 rounded-full bg-white/90 backdrop-blur hover:bg-white text-slate-700 flex items-center justify-center shadow"
                  title="Descargar">
                  <Download size={15} />
                </button>
              )}
              {current && (
                <button onClick={() => { onDelete(current); }} data-testid="banner-delete"
                  className="w-9 h-9 rounded-full bg-white/90 backdrop-blur hover:bg-rose-500 hover:text-white text-rose-500 flex items-center justify-center shadow"
                  title="Eliminar">
                  <Trash2 size={15} />
                </button>
              )}
            </div>

            {/* Flechas */}
            {idx > 0 && (
              <button onClick={() => nav(-1)} data-testid="banner-prev"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/45 hover:bg-black/70 backdrop-blur text-white flex items-center justify-center transition-colors">
                <ChevronLeft size={20} />
              </button>
            )}
            {idx < media.length - 1 && (
              <button onClick={() => nav(1)} data-testid="banner-next"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/45 hover:bg-black/70 backdrop-blur text-white flex items-center justify-center transition-colors">
                <ChevronRight size={20} />
              </button>
            )}

            {/* Pie: hint + nombre */}
            <div className="absolute bottom-0 left-0 right-0 z-20 px-4 py-3 flex items-end justify-between gap-3 pointer-events-none"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)" }}>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Arrastra a WhatsApp Web →</p>
                <p className="text-sm font-black text-white truncate">{current?.filename}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tira de miniaturas + botón añadir */}
      <div className="mt-3 flex items-center gap-2">
        <button onClick={pick} data-testid="strip-add"
          className="shrink-0 w-16 h-16 rounded-2xl border-2 border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50 flex flex-col items-center justify-center gap-0.5 text-indigo-500 transition-colors"
          title="Añadir archivos">
          <Plus size={18} strokeWidth={2.6} />
          <span className="text-[9px] font-black uppercase tracking-wider">Añadir</span>
        </button>
        <div ref={stripRef} className="flex-1 flex items-center gap-2 overflow-x-auto pb-1 catalog-strip">
          {media.map((m, i) => (
            <button key={m.id} data-thumb={i} data-testid={`strip-thumb-${i}`}
              onClick={() => setIdx(i)}
              className={`shrink-0 relative w-16 h-16 rounded-2xl overflow-hidden transition-all ${
                i === idx ? "ring-2 ring-indigo-500 ring-offset-2 scale-105" : "opacity-70 hover:opacity-100"
              }`}
              title={m.filename}
            >
              {(m.kind === "image" || m.kind === "video") ? (
                <img src={m.thumbUrl || m.url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-rose-50 flex items-center justify-center text-rose-500">
                  <FileText size={22} />
                </div>
              )}
              {m.kind === "video" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
                    <Play size={10} className="text-white ml-0.5" fill="white" />
                  </div>
                </div>
              )}
            </button>
          ))}
          {media.length === 0 && (
            <p className="text-xs text-slate-400 font-medium">Aún no hay archivos</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Zona de subida clásica (mantenida por compatibilidad)
// ─────────────────────────────────────────────────────────────
function UploadZone({ onFiles, uploading, progress }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const handleDrop = (e) => {
    e.preventDefault(); setDrag(false);
    if (e.dataTransfer?.files?.length) onFiles(e.dataTransfer.files);
  };
  return (
    <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)} onDrop={handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      data-testid="upload-zone"
      className={`relative rounded-3xl border-2 border-dashed cursor-pointer transition-all ${
        drag ? "border-indigo-500 bg-indigo-50/70 scale-[1.01]" : "border-slate-300 hover:border-indigo-400 bg-white/50"
      } ${uploading ? "pointer-events-none opacity-80" : ""}`}>
      <input ref={inputRef} type="file" accept="image/*,video/*,application/pdf" multiple className="hidden"
        onChange={(e) => { if (e.target.files?.length) onFiles(e.target.files); e.target.value = ""; }}
        data-testid="upload-input" />
      <div className="flex flex-col items-center justify-center text-center py-10 px-4">
        {uploading ? (
          <>
            <Loader2 size={34} className="text-indigo-500 animate-spin mb-3" />
            <p className="text-sm font-bold text-slate-700">Guardando… {progress}%</p>
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
            <p className="text-sm font-black text-slate-800">Arrastra fotos, videos o PDF aquí</p>
            <p className="text-xs text-slate-400 font-medium mt-1">
              o haz clic para elegir · JPG, PNG, MP4, MOV, PDF · guardado local
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Card de guion (colapsable, editable, título + texto)
// ─────────────────────────────────────────────────────────────
function ScriptCard({ script, index, open, onToggle, onChange, onDelete, onSelectForPreview, selected }) {
  const [title, setTitle] = useState(script.title);
  const [text, setText] = useState(script.text);
  const saveTimer = useRef(null);

  useEffect(() => { setTitle(script.title); setText(script.text); }, [script.id]); // eslint-disable-line

  useEffect(() => {
    if (title === script.title && text === script.text) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      onChange({ title: title.trim() || `Guion ${index + 1}`, text });
    }, 700);
    return () => clearTimeout(saveTimer.current);
    // eslint-disable-next-line
  }, [title, text]);

  const insertTpl = (tpl) => setText((prev) => prev ? `${prev}\n\n${tpl.text}` : tpl.text);
  const chars = text.length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <motion.div
      layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25 }}
      className={`glass rounded-2xl overflow-hidden transition-all ${selected ? "ring-2 ring-emerald-400 shadow-lg" : ""}`}
      data-testid={`script-card-${script.id}`}
    >
      {/* Header colapsable */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white/40">
        <button
          onClick={onToggle}
          className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 shrink-0"
          data-testid={`script-toggle-${script.id}`}
          aria-label={open ? "Colapsar" : "Expandir"}
        >
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          data-testid={`script-title-${script.id}`}
          placeholder={`Guion ${index + 1}`}
          className="flex-1 min-w-0 text-sm font-black text-slate-800 bg-transparent outline-none border-b border-transparent focus:border-indigo-300"
        />
        <span className="text-[10px] font-bold text-slate-400 tabular-nums whitespace-nowrap">
          {words}p · {chars}c
        </span>
        <button
          onClick={onSelectForPreview}
          data-testid={`script-preview-${script.id}`}
          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
            selected ? "bg-emerald-500 text-white" : "text-slate-400 hover:bg-slate-100 hover:text-emerald-600"
          }`}
          title="Usar este guion en la vista previa"
        >
          <Eye size={14} />
        </button>
        <button
          onClick={onDelete}
          data-testid={`script-delete-${script.id}`}
          className="w-7 h-7 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 flex items-center justify-center shrink-0"
          title="Eliminar guion"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Cuerpo */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1">
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Insertar:</span>
                {SCRIPT_TEMPLATES.map((t) => (
                  <button key={t.label} onClick={() => insertTpl(t)}
                    className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-full px-2 py-1"
                    data-testid={`script-tpl-${script.id}-${t.label}`}>
                    <Wand2 size={10} className="inline -mt-0.5 mr-0.5" /> {t.label}
                  </button>
                ))}
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                data-testid={`script-text-${script.id}`}
                placeholder="Escribe el mensaje que le mandas al cliente…"
                className="w-full min-h-[160px] bg-white/70 border border-slate-200 focus:border-emerald-300 rounded-xl p-3 text-sm text-slate-700 leading-relaxed outline-none focus:ring-2 focus:ring-emerald-200 resize-y"
              />
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <CopyBtn text={text} disabled={!text.trim()} compact />
                <WaBtn text={text} disabled={!text.trim()} compact />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Vista previa móvil (Mockup animado tipo WhatsApp)
// ─────────────────────────────────────────────────────────────
function MobilePreview({ service, script }) {
  const [playing, setPlaying] = useState(true);
  const [step, setStep] = useState(0);
  const timer = useRef(null);

  const images = useMemo(() => (service.media || []).filter((m) => m.kind === "image" || m.kind === "video").slice(0, 5), [service.media]);
  const scriptText = script?.text || "";

  // Secuencia: 0=cliente saluda, 1..N=empresa envía cada imagen, N+1=guion
  const totalSteps = 1 + images.length + (scriptText.trim() ? 1 : 0);

  useEffect(() => { setStep(0); }, [service.id, script?.id]);

  useEffect(() => {
    if (!playing) return;
    if (step >= totalSteps) {
      // reiniciar tras pausa
      timer.current = setTimeout(() => setStep(0), 2500);
      return () => clearTimeout(timer.current);
    }
    const delay = step === 0 ? 900 : (step === totalSteps - 1 && scriptText.trim()) ? 1400 : 900;
    timer.current = setTimeout(() => setStep((s) => s + 1), delay);
    return () => clearTimeout(timer.current);
  }, [playing, step, totalSteps, scriptText]);

  const replay = () => { setStep(0); setPlaying(true); };
  const Icon = IconOf(service.icon);
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0"), mm = String(now.getMinutes()).padStart(2, "0");

  return (
    <div className="sticky top-24" data-testid="mobile-preview">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Smartphone size={16} className="text-indigo-500" />
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Cómo lo ve tu cliente</h3>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setPlaying((p) => !p)} data-testid="preview-playpause"
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600">
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button onClick={replay} data-testid="preview-replay"
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600" title="Repetir">
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Marco de teléfono */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="relative mx-auto rounded-[36px] p-2 shadow-2xl"
        style={{
          width: "min(320px, 100%)",
          background: "linear-gradient(160deg,#1e293b,#0f172a)",
        }}
      >
        {/* Notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-5 rounded-b-2xl bg-black z-10" />
        <div className="rounded-[28px] overflow-hidden" style={{ background: "#e5ddd5" }}>
          {/* Header WhatsApp */}
          <div className="flex items-center gap-2 px-3 pt-8 pb-2" style={{ background: "#075E54" }}>
            <ChevronLeft size={16} className="text-white/80" />
            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: service.gradient }}>
              <Icon size={15} className="text-white" strokeWidth={2.4} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-white leading-tight truncate">{service.name}</p>
              <p className="text-[10px] text-white/70 leading-tight">en línea</p>
            </div>
          </div>

          {/* Fondo tipo whatsapp con patrón */}
          <div
            className="relative min-h-[360px] max-h-[420px] overflow-y-auto px-3 py-3 flex flex-col gap-2"
            style={{
              backgroundImage: "radial-gradient(rgba(0,0,0,0.04) 1.5px, transparent 1.5px)",
              backgroundSize: "14px 14px",
              backgroundColor: "#e5ddd5",
            }}
          >
            {/* Burbuja cliente */}
            <AnimatePresence>
              {step >= 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="self-start max-w-[80%] rounded-2xl rounded-tl-md bg-white px-3 py-1.5 shadow-sm"
                >
                  <p className="text-[12px] text-slate-700 leading-snug">¡Hola! Me interesa {service.name}</p>
                  <p className="text-[9px] text-slate-400 text-right">{hh}:{mm}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Imágenes/Videos enviados por la empresa */}
            {images.map((img, i) => (
              <AnimatePresence key={img.id}>
                {step >= 2 + i && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="self-end max-w-[80%] rounded-2xl rounded-tr-md p-1 shadow-sm"
                    style={{ background: "#dcf8c6" }}
                  >
                    <div className="relative w-40 h-40 rounded-xl overflow-hidden bg-slate-200">
                      <img src={img.thumbUrl || img.url} alt="" className="w-full h-full object-cover" />
                      {img.kind === "video" && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-9 h-9 rounded-full bg-black/60 flex items-center justify-center">
                            <Play size={16} className="text-white ml-0.5" fill="white" />
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-[9px] text-slate-500 text-right px-1 pt-0.5">{hh}:{mm} ✓✓</p>
                  </motion.div>
                )}
              </AnimatePresence>
            ))}

            {/* Guion */}
            <AnimatePresence>
              {step >= 2 + images.length && scriptText.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="self-end max-w-[85%] rounded-2xl rounded-tr-md px-3 py-2 shadow-sm"
                  style={{ background: "#dcf8c6" }}
                >
                  <p className="text-[12px] text-slate-800 leading-relaxed whitespace-pre-wrap">{scriptText}</p>
                  <p className="text-[9px] text-slate-500 text-right pt-0.5">{hh}:{mm} ✓✓</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* "Escribiendo..." mientras carga */}
            {playing && step > 0 && step < totalSteps && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="self-end bg-white/70 rounded-full px-3 py-1 shadow-sm inline-flex items-center gap-1"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </motion.div>
            )}
          </div>

          {/* Input falso WhatsApp */}
          <div className="flex items-center gap-2 px-3 py-2 bg-[#f0f0f0]">
            <div className="flex-1 rounded-full bg-white px-3 py-1.5 text-[11px] text-slate-400">Mensaje</div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#075E54" }}>
              <Send size={13} className="text-white" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Progreso */}
      <div className="mt-3 flex items-center justify-center gap-1">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <span key={i} className={`h-1 rounded-full transition-all ${i < step ? "w-6 bg-emerald-500" : "w-3 bg-slate-300"}`} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Vista de detalle
// ─────────────────────────────────────────────────────────────
function ServiceDetail({ service, onBack, onChanged }) {
  const Icon = IconOf(service.icon);
  const { toast } = useToast();
  const [media, setMedia] = useState(service.media || []);
  const [scripts, setScripts] = useState(service.scripts || []);
  const [name, setName] = useState(service.name);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const [openScripts, setOpenScripts] = useState(() => new Set(service.scripts?.[0]?.id ? [service.scripts[0].id] : []));
  const [previewScriptId, setPreviewScriptId] = useState(service.scripts?.[0]?.id || null);
  const [savedFlash, setSavedFlash] = useState(false);
  const nameTimer = useRef(null);

  useEffect(() => {
    setMedia(service.media || []);
    setScripts(service.scripts || []);
    setName(service.name);
    setOpenScripts(new Set(service.scripts?.[0]?.id ? [service.scripts[0].id] : []));
    setPreviewScriptId(service.scripts?.[0]?.id || null);
  }, [service.id]); // eslint-disable-line

  // Auto-guardar nombre
  useEffect(() => {
    if (name === service.name) return;
    if (nameTimer.current) clearTimeout(nameTimer.current);
    nameTimer.current = setTimeout(async () => {
      await CL.updateService(service.id, { name: name.trim() || service.name });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1200);
      onChanged({ silent: true });
    }, 700);
    return () => clearTimeout(nameTimer.current);
    // eslint-disable-next-line
  }, [name]);

  const handleFiles = async (files) => {
    const arr = Array.from(files);
    setUploading(true); setProgress(0);
    let ok = 0;
    for (let i = 0; i < arr.length; i++) {
      const f = arr[i];
      try {
        const m = await CL.addMedia(service.id, f, (p) => setProgress(Math.round(((i + p / 100) / arr.length) * 100)));
        setMedia((prev) => [...prev, m]);
        ok += 1;
      } catch (e) {
        toast({ description: `No se pudo agregar ${f.name}: ${e.message || "error"}`, variant: "destructive" });
      }
    }
    setUploading(false); setProgress(0);
    if (ok) toast({ description: `${ok} archivo(s) guardado(s) localmente` });
    onChanged({ silent: true });
  };

  const removeMedia = async (m) => {
    setMedia((prev) => prev.filter((x) => x.id !== m.id));
    try { await CL.deleteMedia(m.id); onChanged({ silent: true }); }
    catch { toast({ description: "No se pudo eliminar", variant: "destructive" }); }
  };

  const addNewScript = async () => {
    const s = await CL.addScript(service.id, { title: `Guion ${scripts.length + 1}`, text: "" });
    setScripts((prev) => [...prev, s]);
    setOpenScripts((prev) => { const n = new Set(prev); n.add(s.id); return n; });
    if (!previewScriptId) setPreviewScriptId(s.id);
    onChanged({ silent: true });
  };

  const changeScript = async (sid, patch) => {
    setScripts((prev) => prev.map((s) => s.id === sid ? { ...s, ...patch } : s));
    await CL.updateScript(service.id, sid, patch);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
    onChanged({ silent: true });
  };

  const removeScript = async (sid) => {
    if (!window.confirm("¿Eliminar este guion?")) return;
    setScripts((prev) => prev.filter((s) => s.id !== sid));
    if (previewScriptId === sid) {
      const remaining = scripts.filter((s) => s.id !== sid);
      setPreviewScriptId(remaining[0]?.id || null);
    }
    await CL.deleteScript(service.id, sid);
    onChanged({ silent: true });
  };

  const toggleScript = (sid) => {
    setOpenScripts((prev) => {
      const n = new Set(prev);
      if (n.has(sid)) n.delete(sid); else n.add(sid);
      return n;
    });
  };

  const images = media.filter((m) => m.kind === "image");
  const videos = media.filter((m) => m.kind === "video");
  const pdfs = media.filter((m) => m.kind === "pdf");
  const previewables = media.filter((m) => m.kind === "image" || m.kind === "video");
  const activeScript = scripts.find((s) => s.id === previewScriptId) || scripts[0] || null;

  const openLightboxAt = (m) => {
    const i = previewables.findIndex((x) => x.id === m.id);
    if (i >= 0) setLightboxIdx(i);
  };

  return (
    <div data-testid={`service-detail-${service.id}`}>
      {/* Barra sticky */}
      <div className="sticky top-2 z-30 mb-6">
        <div className="glass rounded-full flex items-center justify-between gap-3 px-3 py-2 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={onBack} data-testid="detail-back"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full px-3 py-1.5 transition-colors">
              <ArrowLeft size={15} /> Volver
            </button>
            <div className="hidden sm:flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: service.gradient }}>
                <Icon size={14} className="text-white" strokeWidth={2.4} />
              </div>
              <span className="text-sm font-black text-slate-800 truncate">{name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {savedFlash && (
                <motion.span initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                  className="text-xs font-bold text-emerald-600 inline-flex items-center gap-1">
                  <CheckCircle2 size={13} /> Guardado
                </motion.span>
              )}
            </AnimatePresence>
            {activeScript?.text?.trim() && (
              <>
                <CopyBtn text={activeScript.text} compact />
                <WaBtn text={activeScript.text} compact />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cabecera */}
      <div className="flex items-center gap-4 mb-5">
        <motion.div whileHover={{ rotate: [0, -6, 6, 0], transition: { duration: 0.5 } }}
          className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shrink-0" style={{ background: service.gradient }}>
          <Icon size={26} className="text-white" strokeWidth={2.2} />
        </motion.div>
        <input value={name} onChange={(e) => setName(e.target.value)} data-testid="detail-name"
          className="flex-1 min-w-0 text-3xl font-black text-slate-900 bg-transparent border-b-2 border-transparent hover:border-slate-200 focus:border-indigo-400 outline-none transition-colors"
          style={{ fontFamily: "Cabinet Grotesk, sans-serif" }} />
      </div>

      {/* Chips resumen */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 rounded-full px-3 py-1.5">
          <FileImage size={13} /> {images.length} foto{images.length === 1 ? "" : "s"}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-purple-50 text-purple-700 rounded-full px-3 py-1.5">
          <Film size={13} /> {videos.length} video{videos.length === 1 ? "" : "s"}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-rose-50 text-rose-700 rounded-full px-3 py-1.5">
          <FileType size={13} /> {pdfs.length} PDF
        </span>
        <span className={`inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-3 py-1.5 ${
          scripts.length ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
        }`}>
          {scripts.length ? <CheckCircle2 size={13} /> : <Circle size={13} />} {scripts.length} guion{scripts.length === 1 ? "" : "es"}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-slate-100 text-slate-500 rounded-full px-3 py-1.5">
          <HardDrive size={13} /> Local
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* IZQUIERDA: archivos (visor grande + strip) */}
        <div className="lg:col-span-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <ImageIcon size={17} className="text-indigo-500" />
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Fotos · Videos · PDF</h3>
              <span className="text-xs font-bold text-slate-400">({media.length})</span>
            </div>
          </div>
          <MediaBanner
            media={media}
            onDelete={removeMedia}
            onOpenLightbox={openLightboxAt}
            onFilesDrop={handleFiles}
            uploading={uploading}
            progress={progress}
          />
        </div>

        {/* CENTRO: guiones */}
        <div className="lg:col-span-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <MessageCircle size={17} className="text-emerald-500" />
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wide">Mis guiones</h3>
              <span className="text-xs font-bold text-slate-400">({scripts.length})</span>
            </div>
            <button onClick={addNewScript} data-testid="add-script-btn"
              className="inline-flex items-center gap-1.5 text-xs font-black text-white rounded-full px-3 py-1.5"
              style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}>
              <PlusCircle size={13} /> Añadir guion
            </button>
          </div>
          <p className="text-xs text-slate-400 font-medium mb-3">
            Crea varios guiones con títulos (Saludo, Precios, Cierre…). Selecciona <Eye size={11} className="inline" /> para verlo en la vista previa.
          </p>
          <div className="space-y-2">
            <AnimatePresence>
              {scripts.length === 0 ? (
                <motion.button
                  onClick={addNewScript}
                  data-testid="empty-add-script"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="w-full glass rounded-2xl border-2 border-dashed border-emerald-200 text-emerald-700 font-black text-sm py-8 hover:bg-emerald-50 transition-colors inline-flex flex-col items-center gap-2"
                >
                  <PlusCircle size={22} />
                  Crear mi primer guion
                </motion.button>
              ) : scripts.map((s, i) => (
                <ScriptCard
                  key={s.id}
                  script={s}
                  index={i}
                  open={openScripts.has(s.id)}
                  onToggle={() => toggleScript(s.id)}
                  onChange={(patch) => changeScript(s.id, patch)}
                  onDelete={() => removeScript(s.id)}
                  onSelectForPreview={() => setPreviewScriptId(s.id)}
                  selected={previewScriptId === s.id}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* DERECHA: vista previa móvil animada */}
        <div className="lg:col-span-3">
          <MobilePreview service={{ ...service, media }} script={activeScript} />
        </div>
      </div>

      <AnimatePresence>
        {lightboxIdx != null && (
          <Lightbox
            items={previewables}
            index={lightboxIdx}
            onClose={() => setLightboxIdx(null)}
            onNav={(d) => setLightboxIdx((i) => Math.max(0, Math.min(previewables.length - 1, i + d)))}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Barra de completitud
// ─────────────────────────────────────────────────────────────
function CompletenessBar({ hasPhoto, hasVideo, hasScript }) {
  const items = [
    { on: hasPhoto, color: "#6366f1" },
    { on: hasVideo, color: "#a855f7" },
    { on: hasScript, color: "#10b981" },
  ];
  return (
    <div className="flex items-center gap-1">
      {items.map((it, idx) => (
        <div key={idx} className="flex-1 h-1.5 rounded-full overflow-hidden bg-slate-200/70">
          <motion.div initial={{ width: 0 }} animate={{ width: it.on ? "100%" : "0%" }}
            transition={{ duration: 0.6, delay: idx * 0.05 }}
            className="h-full" style={{ background: it.color }} />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tarjeta de servicio
// ─────────────────────────────────────────────────────────────
function ServiceCard({ service, index, onOpen, onQuickSend, onQuickCopy, compact }) {
  const Icon = IconOf(service.icon);
  const media = service.media || [];
  const cover = media.find((m) => m.kind === "image") || media.find((m) => m.kind === "video");
  const imageCount = media.filter((m) => m.kind === "image").length;
  const videoCount = media.filter((m) => m.kind === "video").length;
  const pdfCount = media.filter((m) => m.kind === "pdf").length;
  const firstScript = (service.scripts || []).find((s) => s.text?.trim()) || null;
  const hasScript = !!firstScript;

  return (
    <motion.div layout initial={{ opacity: 0, y: 22, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.04, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
      onClick={() => onOpen(service.id)}
      data-testid={`service-card-${service.id}`}
      className="relative text-left glass rounded-3xl overflow-hidden group cursor-pointer"
    >
      <div className={`relative overflow-hidden ${compact ? "h-24" : "h-40"}`}>
        {cover ? (
          <img src={cover.thumbUrl || cover.url} alt={service.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
        ) : (
          <div className="w-full h-full" style={{ background: service.gradient }}>
            <div className="w-full h-full opacity-30" style={{
              backgroundImage: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.4), transparent 40%), radial-gradient(circle at 80% 60%, rgba(255,255,255,0.25), transparent 40%)"
            }} />
          </div>
        )}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(15,23,42,0.65), transparent 55%)" }} />
        <div className={`absolute top-3 left-3 rounded-2xl flex items-center justify-center shadow-lg ${compact ? "w-9 h-9" : "w-11 h-11"}`} style={{ background: service.gradient }}>
          <Icon size={compact ? 16 : 20} className="text-white" strokeWidth={2.2} />
        </div>
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
          {imageCount > 0 && (
            <span className="text-[10px] font-black uppercase tracking-wider bg-white/90 backdrop-blur text-indigo-700 rounded-full px-2.5 py-1 inline-flex items-center gap-1 shadow">
              <FileImage size={11} /> {imageCount}
            </span>
          )}
          {videoCount > 0 && (
            <span className="text-[10px] font-black uppercase tracking-wider bg-purple-500/90 backdrop-blur text-white rounded-full px-2.5 py-1 inline-flex items-center gap-1 shadow">
              <Film size={11} /> {videoCount}
            </span>
          )}
          {pdfCount > 0 && (
            <span className="text-[10px] font-black uppercase tracking-wider bg-white/90 backdrop-blur text-rose-600 rounded-full px-2.5 py-1 inline-flex items-center gap-1 shadow">
              <FileType size={11} /> {pdfCount}
            </span>
          )}
        </div>
        {!compact && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
            <button onClick={(e) => { e.stopPropagation(); onQuickSend(firstScript); }} disabled={!hasScript}
              data-testid={`quick-send-${service.id}`}
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-[11px] font-black text-white rounded-full px-3 py-1.5 backdrop-blur transition-transform hover:scale-[1.02] disabled:opacity-40 disabled:pointer-events-none"
              style={{ background: "linear-gradient(135deg,#22c55e,#16a34a)", boxShadow: "0 6px 16px -6px rgba(22,163,74,0.7)" }}
              title={hasScript ? "Enviar guion a WhatsApp" : "Escribe primero un guion"}>
              <Send size={11} /> Enviar
            </button>
            <button onClick={(e) => { e.stopPropagation(); onQuickCopy(firstScript); }} disabled={!hasScript}
              data-testid={`quick-copy-${service.id}`}
              className="inline-flex items-center justify-center gap-1 text-[11px] font-black text-slate-800 bg-white/90 backdrop-blur rounded-full px-3 py-1.5 hover:bg-white transition-transform hover:scale-[1.02] disabled:opacity-40 disabled:pointer-events-none"
              title="Copiar guion">
              <Copy size={11} />
            </button>
          </div>
        )}
      </div>
      <div className={compact ? "p-3" : "p-4"}>
        <p className={`font-black text-slate-900 leading-tight ${compact ? "text-sm" : "text-lg"}`} style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
          {service.name}
        </p>
        {!compact && (
          <p className="text-xs text-slate-400 font-medium mt-1 line-clamp-1">
            {hasScript ? (firstScript.text.replace(/\s+/g, " ").trim().slice(0, 72) + (firstScript.text.length > 72 ? "…" : "")) : "Toca para subir tu material"}
          </p>
        )}
        <div className="mt-3">
          <CompletenessBar hasPhoto={imageCount > 0} hasVideo={videoCount > 0} hasScript={hasScript} />
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// Modal nuevo servicio
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
  const applyTemplate = (tpl) => {
    setName(tpl.name); setIcon(tpl.icon);
    const idx = GRADIENTS.findIndex((g) => g === tpl.gradient);
    if (idx >= 0) setGradIdx(idx);
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
            <label className="text-xs font-black text-slate-500 uppercase tracking-wide">Plantilla rápida</label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {TEMPLATES.map((t) => {
                const TIcon = IconOf(t.icon);
                return (
                  <button key={t.name} onClick={() => applyTemplate(t)} data-testid={`template-${t.name}`}
                    className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl px-2.5 py-2 transition-colors">
                    <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: t.gradient }}>
                      <TIcon size={12} className="text-white" strokeWidth={2.4} />
                    </span>
                    <span className="truncate">{t.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wide">Nombre</label>
            <input value={name} onChange={(e) => setName(e.target.value)} autoFocus
              placeholder="Ej: Bodas, XV Años, Cabina 360…" onKeyDown={(e) => e.key === "Enter" && create()}
              data-testid="new-service-name"
              className="w-full mt-1 text-sm font-semibold bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-200 focus:border-indigo-400 outline-none" />
          </div>
          <div>
            <label className="text-xs font-black text-slate-500 uppercase tracking-wide">Ícono</label>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {Object.entries(ICONS).map(([key, Comp]) => (
                <button key={key} onClick={() => setIcon(key)}
                  className={`aspect-square rounded-xl flex items-center justify-center transition-all ${icon === key ? "text-white scale-105" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
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
  const [sortBy, setSortBy] = useState("order");
  const [filter, setFilter] = useState("all");
  const [view, setView] = useState("comfy");
  const { toast } = useToast();

  const load = useCallback(async (opts = {}) => {
    try {
      const data = await CL.listServices();
      setServices(data);
    } catch { if (!opts.silent) toast({ description: "No se pudo cargar el catálogo local", variant: "destructive" }); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const selected = useMemo(() => services.find((s) => s.id === selectedId) || null, [services, selectedId]);

  const stats = useMemo(() => {
    let images = 0, videos = 0, pdfs = 0, scripts = 0;
    services.forEach((s) => {
      (s.media || []).forEach((m) => {
        if (m.kind === "image") images += 1;
        else if (m.kind === "video") videos += 1;
        else if (m.kind === "pdf") pdfs += 1;
      });
      if ((s.scripts || []).some((sc) => sc.text?.trim())) scripts += 1;
    });
    return { services: services.length, images, videos, pdfs, scripts };
  }, [services]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = services.slice();
    arr = arr.filter((s) => {
      const media = s.media || [];
      const hasImg = media.some((m) => m.kind === "image");
      const hasVideo = media.some((m) => m.kind === "video");
      const hasPdf = media.some((m) => m.kind === "pdf");
      const hasScript = (s.scripts || []).some((sc) => sc.text?.trim());
      if (filter === "photos") return hasImg;
      if (filter === "videos") return hasVideo;
      if (filter === "pdf") return hasPdf;
      if (filter === "script") return hasScript;
      if (filter === "incomplete") return !(hasImg && hasScript);
      return true;
    });
    if (q) arr = arr.filter((s) =>
      `${s.name} ${(s.scripts || []).map((sc) => sc.title + " " + sc.text).join(" ")}`.toLowerCase().includes(q)
    );
    if (sortBy === "name") arr.sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
    else if (sortBy === "files") arr.sort((a, b) => (b.media?.length || 0) - (a.media?.length || 0));
    else arr.sort((a, b) => (a.order || 0) - (b.order || 0));
    return arr;
  }, [services, query, filter, sortBy]);

  const createSvc = async ({ name, icon, gradient }) => {
    const svc = await CL.createService({ name, icon, gradient });
    setServices((prev) => [...prev, svc]);
    setSelectedId(svc.id);
    toast({ description: "Servicio creado · sube tu material" });
  };
  const createFromTemplate = async (tpl) => {
    try {
      const svc = await CL.createService({ name: tpl.name, icon: tpl.icon, gradient: tpl.gradient });
      setServices((prev) => [...prev, svc]);
      toast({ description: `"${tpl.name}" creado` });
    } catch { toast({ description: "No se pudo crear", variant: "destructive" }); }
  };
  const removeSvc = async () => {
    if (!selected) return;
    const id = selected.id;
    if (!window.confirm(`¿Eliminar "${selected.name}" y todos sus archivos?`)) return;
    setServices((prev) => prev.filter((s) => s.id !== id));
    setSelectedId(null);
    try { await CL.deleteService(id); toast({ description: "Servicio eliminado" }); }
    catch { toast({ description: "No se pudo eliminar", variant: "destructive" }); load({ silent: true }); }
  };
  const quickSend = (script) => {
    const t = script?.text || "";
    if (t.trim()) window.open(`https://wa.me/?text=${encodeURIComponent(t)}`, "_blank", "noopener");
  };
  const quickCopy = async (script) => {
    const t = script?.text || "";
    if (!t.trim()) return;
    try { await navigator.clipboard.writeText(t); toast({ description: "Guion copiado" }); }
    catch { toast({ description: "No se pudo copiar", variant: "destructive" }); }
  };

  const FILTER_CHIPS = [
    { key: "all", label: "Todos", count: services.length },
    { key: "photos", label: "Con fotos", count: services.filter((s) => (s.media || []).some((m) => m.kind === "image")).length },
    { key: "videos", label: "Con videos", count: services.filter((s) => (s.media || []).some((m) => m.kind === "video")).length },
    { key: "pdf", label: "Con PDF", count: services.filter((s) => (s.media || []).some((m) => m.kind === "pdf")).length },
    { key: "script", label: "Con guion", count: services.filter((s) => (s.scripts || []).some((sc) => sc.text?.trim())).length },
    { key: "incomplete", label: "Por completar", count: services.filter((s) => !((s.media || []).some((m) => m.kind === "image") && (s.scripts || []).some((sc) => sc.text?.trim()))).length },
  ];

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto" data-testid="catalogo-page">
      <PageHeader
        icon={LayoutGrid}
        title="Catálogo"
        subtitle="Tu proceso de venta · guardado local · arrastra a WhatsApp Web y listo"
        gradient="linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899)"
        right={selected ? (
          <button onClick={removeSvc} data-testid="delete-service"
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
        <div className="flex items-center justify-center py-24 text-slate-400"><Loader2 size={28} className="animate-spin" /></div>
      ) : (
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div key="detail" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }}>
              <ServiceDetail service={selected} onBack={() => setSelectedId(null)} onChanged={(o) => load(o)} />
            </motion.div>
          ) : (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
              {services.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6" data-testid="stats-panel">
                  <StatCard icon={LayoutGrid} label="Servicios" value={stats.services} gradient="linear-gradient(135deg,#818cf8,#6366f1)" delay={0} />
                  <StatCard icon={FileImage} label="Fotos" value={stats.images} gradient="linear-gradient(135deg,#f472b6,#db2777)" delay={0.05} />
                  <StatCard icon={Film} label="Videos" value={stats.videos} gradient="linear-gradient(135deg,#a855f7,#7c3aed)" delay={0.1} />
                  <StatCard icon={FileType} label="PDFs" value={stats.pdfs} gradient="linear-gradient(135deg,#fbbf24,#f59e0b)" delay={0.15} />
                  <StatCard icon={CheckCircle2} label="Guiones" value={stats.scripts} gradient="linear-gradient(135deg,#34d399,#10b981)" delay={0.2} />
                </div>
              )}

              {services.length > 0 && (
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 mb-4">
                  <div className="relative flex-1 min-w-0">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar servicio o texto del guion…" data-testid="catalogo-search"
                      className="w-full glass rounded-full pl-11 pr-10 py-3 text-sm font-medium text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-300" />
                    {query && (
                      <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={16} /></button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="glass rounded-full px-1 py-1 flex items-center gap-0.5" data-testid="sort-toggle">
                      <ArrowUpDown size={14} className="text-slate-400 ml-2 mr-1" />
                      {[{ k: "order", l: "Manual" }, { k: "name", l: "A–Z" }, { k: "files", l: "+ archivos" }].map((o) => (
                        <button key={o.k} onClick={() => setSortBy(o.k)} data-testid={`sort-${o.k}`}
                          className={`text-xs font-black rounded-full px-3 py-1.5 transition-colors ${sortBy === o.k ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"}`}>
                          {o.l}
                        </button>
                      ))}
                    </div>
                    <div className="glass rounded-full px-1 py-1 flex items-center gap-0.5" data-testid="view-toggle">
                      <button onClick={() => setView("comfy")} data-testid="view-comfy"
                        className={`p-2 rounded-full transition-colors ${view === "comfy" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"}`} title="Cómoda"><Grid3x3 size={14} /></button>
                      <button onClick={() => setView("compact")} data-testid="view-compact"
                        className={`p-2 rounded-full transition-colors ${view === "compact" ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-800"}`} title="Compacta"><Rows3 size={14} /></button>
                    </div>
                  </div>
                </div>
              )}

              {services.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap mb-6" data-testid="filter-chips">
                  <Filter size={14} className="text-slate-400 shrink-0" />
                  {FILTER_CHIPS.map((c) => (
                    <button key={c.key} onClick={() => setFilter(c.key)} data-testid={`filter-${c.key}`}
                      className={`text-xs font-black rounded-full px-3 py-1.5 transition-all inline-flex items-center gap-1.5 ${
                        filter === c.key ? "text-white shadow-lg" : "bg-white/70 text-slate-600 hover:bg-white hover:text-slate-900 border border-slate-200"
                      }`}
                      style={filter === c.key ? { background: "linear-gradient(135deg,#6366f1,#8b5cf6)" } : undefined}>
                      {c.label}
                      <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${filter === c.key ? "bg-white/25" : "bg-slate-100 text-slate-500"}`}>{c.count}</span>
                    </button>
                  ))}
                </div>
              )}

              {services.length === 0 ? (
                <div className="text-center py-16" data-testid="empty-state">
                  <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5 text-white shadow-2xl"
                    style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6,#ec4899)" }}>
                    <Zap size={34} strokeWidth={2.2} />
                  </motion.div>
                  <p className="text-slate-900 font-black text-2xl" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>Empieza a vender más rápido</p>
                  <p className="text-slate-500 font-medium mt-2 mb-8 max-w-md mx-auto">
                    Crea un servicio y ten tus fotos, videos, PDFs y guion listos. Todo se guarda en tu equipo.
                  </p>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-3">Plantillas rápidas</p>
                  <div className="flex items-center justify-center gap-2 flex-wrap max-w-2xl mx-auto mb-6">
                    {TEMPLATES.map((t, i) => {
                      const TIcon = IconOf(t.icon);
                      return (
                        <motion.button key={t.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                          whileHover={{ y: -3, scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          onClick={() => createFromTemplate(t)} data-testid={`empty-template-${t.name}`}
                          className="glass rounded-2xl px-4 py-3 flex items-center gap-2 hover:ring-2 hover:ring-indigo-300 transition-all">
                          <span className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: t.gradient }}>
                            <TIcon size={15} className="text-white" strokeWidth={2.4} />
                          </span>
                          <span className="text-sm font-black text-slate-800">{t.name}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                  <button onClick={() => setNewOpen(true)} data-testid="empty-new-service-btn"
                    className="inline-flex items-center gap-2 text-sm font-black text-white rounded-full px-5 py-3"
                    style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 12px 28px -10px rgba(99,102,241,0.6)" }}>
                    <Plus size={16} strokeWidth={2.6} /> Crear uno personalizado
                  </button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16" data-testid="no-results">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400"><Eye size={24} /></div>
                  <p className="text-slate-700 font-black text-lg">Sin resultados</p>
                  <p className="text-slate-400 font-medium mt-1">
                    {query ? <>Nada coincide con &ldquo;<span className="text-slate-700">{query}</span>&rdquo;.</> : "Prueba otro filtro."}
                  </p>
                  <button onClick={() => { setQuery(""); setFilter("all"); }} className="mt-4 text-xs font-black text-indigo-600 hover:text-indigo-800">
                    Limpiar filtros
                  </button>
                </div>
              ) : (
                <motion.div layout className={`grid gap-4 ${view === "compact" ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"}`}>
                  <AnimatePresence>
                    {filtered.map((s, i) => (
                      <ServiceCard key={s.id} service={s} index={i} onOpen={setSelectedId} onQuickSend={quickSend} onQuickCopy={quickCopy} compact={view === "compact"} />
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
      <NewServiceModal open={newOpen} onClose={() => setNewOpen(false)} onCreate={createSvc} />
    </div>
  );
}
