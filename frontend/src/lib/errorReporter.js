// Reporte centralizado de errores del frontend.
// Objetivo: que NINGÚN error pase en silencio. Cada error se:
//   1. Registra en consola.
//   2. Envía al backend (/api/errors/report) → se guarda y se abre un GitHub
//      Issue automáticamente en el repo del usuario para poder repararlo.
//   3. Notifica al usuario vía un evento `cp:error-reported` (toast).
import axios from "axios";

const BASE = `${window.__API_BASE_URL__ || process.env.REACT_APP_BACKEND_URL}/api`;

// Cliente propio (sin interceptores) para NO entrar en bucle al reportar.
const reporter = axios.create({ baseURL: BASE, timeout: 15000 });

// Dedup por sesión: no spamear el mismo error una y otra vez.
const _seen = new Set();

function fingerprint(source, message) {
  return `${source}::${(message || "").slice(0, 160)}`;
}

export async function reportError({ source = "frontend", message, stack = "", context = {}, level = "error" } = {}) {
  try {
    const msg = String(message || "Error desconocido").slice(0, 2000);
    const fp = fingerprint(source, msg);
    if (_seen.has(fp)) return null; // ya reportado en esta sesión
    _seen.add(fp);

    // eslint-disable-next-line no-console
    console.error(`[cp-error] ${source}: ${msg}`, stack);

    const payload = {
      source,
      message: msg,
      stack: String(stack || "").slice(0, 8000),
      level,
      version: window.__APP_VERSION__ || "",
      platform: navigator.userAgent,
      context: { url: window.location.href, ...context },
    };
    const { data } = await reporter.post("/errors/report", payload);
    // Avisar a la UI (notificador) para mostrar el toast.
    try {
      window.dispatchEvent(new CustomEvent("cp:error-reported", {
        detail: { ...data, message: msg, source },
      }));
    } catch { /* ignore */ }
    return data;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[cp-error] no se pudo reportar el error:", e?.message);
    return null;
  }
}

let _installed = false;
export function installGlobalErrorHandlers() {
  if (_installed) return;
  _installed = true;

  window.addEventListener("error", (event) => {
    const err = event?.error;
    reportError({
      source: "frontend",
      message: err?.message || event?.message || "Error de JavaScript",
      stack: err?.stack || `${event?.filename}:${event?.lineno}:${event?.colno}`,
      context: { type: "window.onerror" },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event?.reason;
    reportError({
      source: "frontend",
      message: reason?.message || String(reason) || "Promesa rechazada sin manejar",
      stack: reason?.stack || "",
      context: { type: "unhandledrejection" },
    });
  });
}
