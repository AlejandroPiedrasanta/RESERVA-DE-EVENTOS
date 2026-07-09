import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ExternalLink, Eye, EyeOff, Loader2, CheckCircle,
  Save, Clipboard, ShieldCheck, AlertCircle, KeyRound,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  adminGetGoogleLoginConfig, adminUpdateGoogleLoginConfig,
} from "@/lib/api";

/**
 * Google Sign-In credentials configuration panel (admin only).
 * - Saves client_id + client_secret into DB (app_settings.google_login)
 * - Provides a direct link to Google Cloud Console
 * - The frontend's <GoogleOAuthProvider> reads the client_id from
 *   /api/auth/google-config after saving (page reload required).
 */
export default function GoogleAuthConfigPanel({ password }) {
  const { toast } = useToast();
  const [cfg, setCfg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [form, setForm] = useState({ client_id: "", client_secret: "" });

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminGetGoogleLoginConfig(password);
      setCfg(data);
      setForm({
        client_id: data.client_id || "",
        client_secret: "", // never prefill; user types new or leaves empty to keep existing
      });
    } catch (e) {
      toast({
        title: "Error al cargar",
        description: e?.response?.data?.detail || String(e),
        variant: "destructive",
      });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { client_id: form.client_id.trim() };
      if (form.client_secret.trim()) payload.client_secret = form.client_secret.trim();
      await adminUpdateGoogleLoginConfig(password, payload);
      toast({
        title: "Google Sign-In guardado ✓",
        description: "Recarga la página para que el botón use el nuevo Client ID.",
      });
      setForm(f => ({ ...f, client_secret: "" }));
      await load();
    } catch (e) {
      toast({
        title: "Error al guardar",
        description: e?.response?.data?.detail || String(e),
        variant: "destructive",
      });
    } finally { setSaving(false); }
  };

  const handlePaste = async (field) => {
    try {
      const text = (await navigator.clipboard.readText())?.trim();
      if (!text) { toast({ title: "Portapapeles vacío", variant: "destructive" }); return; }
      setForm(f => ({ ...f, [field]: text }));
      toast({ title: "Pegado ✓" });
    } catch {
      toast({ title: "No se pudo leer el portapapeles", variant: "destructive" });
    }
  };

  const consoleUrl = "https://console.cloud.google.com/apis/credentials";
  const previewOrigin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="space-y-3" data-testid="support-panel-google-auth">
      {/* Header card */}
      <div className={`relative overflow-hidden rounded-2xl p-4 border ${cfg?.configured ? "bg-gradient-to-br from-emerald-50 to-white border-emerald-200" : "bg-gradient-to-br from-sky-50 via-white to-indigo-50 border-sky-200"}`}>
        <div className="flex items-start gap-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${cfg?.configured ? "bg-emerald-500" : "bg-gradient-to-br from-sky-500 to-indigo-600"}`}>
            <KeyRound size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-black text-slate-900" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                Google Sign-In — Autenticación real con Google
              </h3>
              {cfg?.configured ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black">
                  <CheckCircle size={10} /> CONFIGURADO
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black">
                  <AlertCircle size={10} /> PENDIENTE
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Guarda aquí tu OAuth 2.0 Client ID (y opcionalmente el Secret) de Google Cloud Console. Reemplaza al login de Emergent por el flujo oficial de Google.
            </p>
          </div>
        </div>

        {/* Quick action: open Google Cloud Console */}
        <div className="mt-3 grid gap-2">
          <a
            href={consoleUrl}
            target="_blank" rel="noopener noreferrer"
            data-testid="google-auth-open-console"
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#1a73e8] hover:bg-[#1662c4] text-white text-xs font-black shadow-sm transition-all"
          >
            <ExternalLink size={13} />
            Abrir Google Cloud Console (Credentials)
          </a>
        </div>

        {/* Origin hint */}
        {previewOrigin && (
          <div className="mt-3 rounded-xl bg-white/70 border border-slate-200 p-3 text-[11px] text-slate-600">
            <div className="font-black text-slate-700 mb-1">En tu OAuth Client Web añade:</div>
            <div><span className="font-black text-slate-800">Authorized JavaScript origin:</span> <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">{previewOrigin}</code></div>
            <div><span className="font-black text-slate-800">Authorized redirect URI:</span> <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">{previewOrigin}/auth/google</code></div>
          </div>
        )}
      </div>

      {/* Credentials form */}
      <div className="rounded-2xl bg-white/70 border border-slate-200 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-indigo-500" />
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Credenciales OAuth 2.0</p>
        </div>

        {/* Client ID */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5 block">Client ID</label>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={form.client_id}
              onChange={(e) => setForm(f => ({ ...f, client_id: e.target.value }))}
              placeholder="1234567890-xxxx.apps.googleusercontent.com"
              data-testid="google-auth-client-id-input"
              className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <button
              type="button" onClick={() => handlePaste("client_id")}
              title="Pegar" className="px-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300"
              data-testid="google-auth-client-id-paste"
            >
              <Clipboard size={13} />
            </button>
          </div>
        </div>

        {/* Client Secret */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5 block">
            Client Secret <span className="text-slate-400 font-bold normal-case tracking-normal">(opcional para ID-token flow)</span>
            {cfg?.has_client_secret && <span className="text-emerald-600 font-bold normal-case tracking-normal ml-1">· ya guardado — deja vacío para conservar</span>}
          </label>
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <input
                type={showSecret ? "text" : "password"}
                value={form.client_secret}
                onChange={(e) => setForm(f => ({ ...f, client_secret: e.target.value }))}
                placeholder={cfg?.has_client_secret ? cfg.client_secret_masked : "GOCSPX-xxxx"}
                data-testid="google-auth-secret-input"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 pr-9 py-2 text-xs font-mono text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <button
                type="button" onClick={() => setShowSecret(v => !v)} tabIndex={-1}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-slate-400 hover:text-slate-600"
              >
                {showSecret ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            <button
              type="button" onClick={() => handlePaste("client_secret")}
              title="Pegar" className="px-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300"
              data-testid="google-auth-secret-paste"
            >
              <Clipboard size={13} />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            disabled={saving || loading || !form.client_id.trim()}
            data-testid="google-auth-save-btn"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-xs font-black shadow-sm hover:shadow disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Guardar
          </motion.button>
        </div>
      </div>

      {/* How-to */}
      <details className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-[11px] text-slate-600" data-testid="google-auth-help">
        <summary className="cursor-pointer font-black text-slate-700">¿Cómo obtengo estas credenciales?</summary>
        <ol className="mt-2 space-y-1 list-decimal list-inside">
          <li>Entra a <a href={consoleUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold">Google Cloud Console → Credentials</a>.</li>
          <li>Crea un <b>OAuth client ID</b> de tipo <b>Web application</b>.</li>
          <li>En <b>Authorized JavaScript origins</b> añade el origen mostrado arriba.</li>
          <li>En <b>Authorized redirect URIs</b> añade la URL <code>{previewOrigin}/auth/google</code>.</li>
          <li>Copia el <b>Client ID</b> (termina en <code>.apps.googleusercontent.com</code>) y opcionalmente el <b>Secret</b> (empieza con <code>GOCSPX-</code>).</li>
          <li>Pégalos aquí y pulsa <b>Guardar</b>. Recarga la página de inicio de sesión.</li>
        </ol>
      </details>
    </div>
  );
}
