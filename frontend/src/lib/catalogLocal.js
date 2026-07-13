// ─────────────────────────────────────────────────────────────
// Catálogo LOCAL (IndexedDB) · sin backend
// Guarda servicios, guiones múltiples y media (fotos/videos/PDF) como Blobs
// ─────────────────────────────────────────────────────────────

const DB_NAME = "catalog_local_db";
const DB_VERSION = 1;
const STORE_SERVICES = "services";
const STORE_MEDIA = "media";

let _dbPromise = null;
const _urlCache = new Map(); // media_id -> object url
const _thumbUrlCache = new Map();

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_SERVICES)) {
        db.createObjectStore(STORE_SERVICES, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_MEDIA)) {
        const s = db.createObjectStore(STORE_MEDIA, { keyPath: "id" });
        s.createIndex("service_id", "service_id", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

function tx(store, mode = "readonly") {
  return openDB().then((db) => db.transaction(store, mode).objectStore(store));
}

function reqPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function uuid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ─────────────────────────────────────────────────────────────
// Miniatura para video
// ─────────────────────────────────────────────────────────────
function makeVideoThumb(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.playsInline = true;
    v.src = url;
    const cleanup = () => URL.revokeObjectURL(url);
    v.onloadedmetadata = () => {
      const t = isFinite(v.duration) ? Math.min(1, Math.max(0.1, v.duration * 0.15)) : 0.1;
      v.currentTime = t;
    };
    v.onseeked = () => {
      try {
        const w = v.videoWidth || 640;
        const h = v.videoHeight || 360;
        const scale = Math.min(1, 640 / w);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        canvas.getContext("2d").drawImage(v, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => { cleanup(); resolve(blob || null); }, "image/jpeg", 0.72);
      } catch { cleanup(); resolve(null); }
    };
    v.onerror = () => { cleanup(); resolve(null); };
  });
}

function detectKind(file) {
  const t = (file.type || "").toLowerCase();
  if (t.startsWith("image/")) return "image";
  if (t.startsWith("video/")) return "video";
  if (t === "application/pdf") return "pdf";
  // fallback por extensión
  const name = (file.name || "").toLowerCase();
  if (/\.(jpe?g|png|gif|webp|heic|heif|bmp|avif)$/.test(name)) return "image";
  if (/\.(mp4|mov|webm|mkv|m4v|3gp|avi)$/.test(name)) return "video";
  if (/\.pdf$/.test(name)) return "pdf";
  return null;
}

// ─────────────────────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────────────────────

export async function listServices() {
  const svcStore = await tx(STORE_SERVICES);
  const services = await reqPromise(svcStore.getAll());
  services.sort((a, b) => (a.order || 0) - (b.order || 0));

  const mediaStore = await tx(STORE_MEDIA);
  const allMedia = await reqPromise(mediaStore.getAll());

  const byService = new Map();
  for (const m of allMedia) {
    if (!byService.has(m.service_id)) byService.set(m.service_id, []);
    byService.get(m.service_id).push(m);
  }

  return services.map((s) => {
    const media = (byService.get(s.id) || [])
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((m) => ({
        id: m.id,
        service_id: m.service_id,
        filename: m.filename,
        kind: m.kind,
        mime: m.mime,
        size: m.size,
        order: m.order,
        url: mediaObjectURL(m),
        thumbUrl: mediaThumbURL(m),
      }));
    return {
      id: s.id,
      name: s.name,
      icon: s.icon || "package",
      gradient: s.gradient,
      order: s.order || 0,
      scripts: Array.isArray(s.scripts) && s.scripts.length
        ? s.scripts
        : (s.sales_text ? [{ id: uuid(), title: "Guion principal", text: s.sales_text }] : []),
      media,
    };
  });
}

export async function createService({ name, icon, gradient }) {
  const svcStore = await tx(STORE_SERVICES);
  const all = await reqPromise(svcStore.getAll());
  const doc = {
    id: uuid(),
    name: (name || "").trim() || "Nuevo servicio",
    icon: icon || "package",
    gradient: gradient || "linear-gradient(135deg,#6366f1,#8b5cf6)",
    scripts: [],
    order: all.length,
    created_at: new Date().toISOString(),
  };
  const put = await tx(STORE_SERVICES, "readwrite");
  await reqPromise(put.add(doc));
  return { ...doc, media: [] };
}

export async function updateService(id, patch) {
  const store = await tx(STORE_SERVICES, "readwrite");
  const cur = await reqPromise(store.get(id));
  if (!cur) return null;
  const next = { ...cur, ...patch };
  await reqPromise(store.put(next));
  return next;
}

export async function deleteService(id) {
  // borrar media asociada
  const mediaStore = await tx(STORE_MEDIA, "readwrite");
  const idx = mediaStore.index("service_id");
  const items = await reqPromise(idx.getAll(id));
  for (const m of items) {
    _revoke(m.id);
    await reqPromise(mediaStore.delete(m.id));
  }
  const svcStore = await tx(STORE_SERVICES, "readwrite");
  await reqPromise(svcStore.delete(id));
  return true;
}

export async function addMedia(service_id, file, onProgress) {
  const kind = detectKind(file);
  if (!kind) throw new Error("Tipo no soportado");
  // simular progreso rápido (lectura local casi instantánea)
  if (onProgress) onProgress(20);
  let thumbBlob = null;
  if (kind === "video") {
    thumbBlob = await makeVideoThumb(file);
  }
  if (onProgress) onProgress(70);

  const store = await tx(STORE_MEDIA, "readwrite");
  const idx = store.index("service_id");
  const existing = await reqPromise(idx.getAll(service_id));
  const doc = {
    id: uuid(),
    service_id,
    filename: file.name || `archivo.${kind === "pdf" ? "pdf" : kind === "video" ? "mp4" : "jpg"}`,
    kind,
    mime: file.type || (kind === "pdf" ? "application/pdf" : kind === "video" ? "video/mp4" : "image/jpeg"),
    size: file.size,
    order: existing.length,
    blob: file,
    thumb: thumbBlob,
    created_at: new Date().toISOString(),
  };
  await reqPromise(store.add(doc));
  if (onProgress) onProgress(100);
  return {
    id: doc.id,
    service_id,
    filename: doc.filename,
    kind: doc.kind,
    mime: doc.mime,
    size: doc.size,
    order: doc.order,
    url: mediaObjectURL(doc),
    thumbUrl: mediaThumbURL(doc),
  };
}

export async function deleteMedia(media_id) {
  _revoke(media_id);
  const store = await tx(STORE_MEDIA, "readwrite");
  await reqPromise(store.delete(media_id));
  return true;
}

export async function getMediaBlob(media_id) {
  const store = await tx(STORE_MEDIA);
  const m = await reqPromise(store.get(media_id));
  return m?.blob || null;
}

export function mediaObjectURL(m) {
  if (!m?.blob) return null;
  if (_urlCache.has(m.id)) return _urlCache.get(m.id);
  const url = URL.createObjectURL(m.blob);
  _urlCache.set(m.id, url);
  return url;
}

export function mediaThumbURL(m) {
  if (m.kind === "image") return mediaObjectURL(m);
  if (m.kind === "video" && m.thumb) {
    if (_thumbUrlCache.has(m.id)) return _thumbUrlCache.get(m.id);
    const url = URL.createObjectURL(m.thumb);
    _thumbUrlCache.set(m.id, url);
    return url;
  }
  return null;
}

function _revoke(id) {
  if (_urlCache.has(id)) { URL.revokeObjectURL(_urlCache.get(id)); _urlCache.delete(id); }
  if (_thumbUrlCache.has(id)) { URL.revokeObjectURL(_thumbUrlCache.get(id)); _thumbUrlCache.delete(id); }
}

// Descarga un blob de media al disco (para "Bajar")
export async function downloadMedia(media_id, filename) {
  const blob = await getMediaBlob(media_id);
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "archivo";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Gestión de guiones (scripts)
export async function addScript(service_id, { title, text } = {}) {
  const store = await tx(STORE_SERVICES, "readwrite");
  const svc = await reqPromise(store.get(service_id));
  if (!svc) return null;
  const scripts = Array.isArray(svc.scripts) ? svc.scripts.slice() : [];
  const script = { id: uuid(), title: (title || "").trim() || `Guion ${scripts.length + 1}`, text: text || "" };
  scripts.push(script);
  await reqPromise(store.put({ ...svc, scripts }));
  return script;
}

export async function updateScript(service_id, script_id, patch) {
  const store = await tx(STORE_SERVICES, "readwrite");
  const svc = await reqPromise(store.get(service_id));
  if (!svc) return null;
  const scripts = (svc.scripts || []).map((s) => s.id === script_id ? { ...s, ...patch } : s);
  await reqPromise(store.put({ ...svc, scripts }));
  return scripts.find((s) => s.id === script_id) || null;
}

export async function deleteScript(service_id, script_id) {
  const store = await tx(STORE_SERVICES, "readwrite");
  const svc = await reqPromise(store.get(service_id));
  if (!svc) return null;
  const scripts = (svc.scripts || []).filter((s) => s.id !== script_id);
  await reqPromise(store.put({ ...svc, scripts }));
  return true;
}

// ─────────────────────────────────────────────────────────────
// Plantillas de guiones (editables + guardadas en localStorage)
// ─────────────────────────────────────────────────────────────
const TPL_KEY = "catalog_script_templates_v1";

export const DEFAULT_SCRIPT_TEMPLATES = [
  { id: "tpl-saludo", label: "Saludo cálido", text: "¡Hola! 😊 Gracias por escribirnos. Con mucho gusto te comparto la información de nuestro servicio.\n\nCuéntame:\n• ¿Para qué fecha lo necesitas?\n• ¿Cuántas personas asistirán?\n• ¿Tienes ya lugar o buscas recomendación?" },
  { id: "tpl-paquetes", label: "Paquetes", text: "Estos son nuestros paquetes:\n\n🎉 BÁSICO — $XXXX\n• Punto 1\n• Punto 2\n\n✨ PREMIUM — $XXXX\n• Todo lo anterior\n• Extras\n\n👑 DELUXE — $XXXX\n• Todo lo anterior\n• Servicios adicionales" },
  { id: "tpl-cierre", label: "Cierre de venta", text: "Para apartar la fecha solo necesitamos un anticipo del 30%. Aceptamos transferencia y pago con tarjeta.\n\n¿Quieres que te aparte esta fecha? Solo tenemos algunos horarios disponibles este mes 📆" },
];

export function getScriptTemplates() {
  try {
    const raw = localStorage.getItem(TPL_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return arr
          .filter((t) => t && (t.label || t.text))
          .map((t) => ({ id: t.id || uuid(), label: (t.label || "Plantilla").trim(), text: t.text || "" }));
      }
    }
  } catch { /* ignore */ }
  return DEFAULT_SCRIPT_TEMPLATES.map((t) => ({ ...t }));
}

export function saveScriptTemplates(list) {
  const clean = (Array.isArray(list) ? list : [])
    .filter((t) => t && (t.label?.trim() || t.text?.trim()))
    .map((t) => ({ id: t.id || uuid(), label: (t.label || "Plantilla").trim(), text: t.text || "" }));
  try { localStorage.setItem(TPL_KEY, JSON.stringify(clean)); } catch { /* ignore */ }
  return clean;
}

export function newTemplateId() { return uuid(); }
