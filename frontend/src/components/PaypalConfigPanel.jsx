import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, ExternalLink, Eye, EyeOff, Loader2, CheckCircle, XCircle,
  Save, Zap, Clipboard, ShieldCheck, AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  adminGetPaypalConfig, adminUpdatePaypalConfig, adminTestPaypalConfig,
} from "@/lib/api";

/**
 * PayPal credentials configuration panel (admin only).
 * - Saves client_id, secret, mode into DB (app_settings.paypal)
 * - Provides a direct link to PayPal Developer Dashboard so admin can log in
 *   and create/copy credentials without leaving the flow.
 */
export default function PaypalConfigPanel({ password }) {
  const { toast } = useToast();
  const [cfg, setCfg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showSecret, setShowSecret] = useState(false);
  const [form, setForm] = useState({ client_id: "", secret: "", mode: "sandbox" });

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminGetPaypalConfig(password);
      setCfg(data);
      setForm({
        client_id: data.client_id || "",
        secret: "", // never prefill; user types new or leaves empty to keep existing
        mode: data.mode || "sandbox",
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
    setSaving(true); setTestResult(null);
    try {
      const payload = { client_id: form.client_id.trim(), mode: form.mode };
      if (form.secret.trim()) payload.secret = form.secret.trim();
      await adminUpdatePaypalConfig(password, payload);
      toast({ title: "PayPal guardado ✓" });
      setForm(f => ({ ...f, secret: "" }));
      await load();
    } catch (e) {
      toast({
        title: "Error al guardar",
        description: e?.response?.data?.detail || String(e),
        variant: "destructive",
      });
    } finally { setSaving(false); }
  };

  const handleTest = async () => {
    setTesting(true); setTestResult(null);
    try {
      const res = await adminTestPaypalConfig(password);
      setTestResult(res);
      if (res.ok) toast({ title: res.message });
      else toast({ title: "Credenciales inválidas", description: res.error, variant: "destructive" });
    } catch (e) {
      setTestResult({ ok: false, error: e?.response?.data?.detail || String(e) });
    } finally { setTesting(false); }
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

  const isLive = form.mode === "live";
  const developerUrl = "https://developer.paypal.com/dashboard/applications/" + (isLive ? "live" : "sandbox");
  const loginUrl = "https://www.paypal.com/signin?returnUri=" + encodeURIComponent("/developer/applications/");

  return (
    <div className="space-y-3" data-testid="support-panel-paypal">
      {/* Header card */}
      <div className={`relative overflow-hidden rounded-2xl p-4 border ${cfg?.configured ? "bg-gradient-to-br from-emerald-50 to-white border-emerald-200" : "bg-gradient-to-br from-indigo-50 via-white to-blue-50 border-indigo-200"}`}>
        <div className="flex items-start gap-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${cfg?.configured ? "bg-emerald-500" : "bg-gradient-to-br from-blue-500 to-indigo-600"}`}>
            <CreditCard size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-black text-slate-900" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                PayPal — Cobros de suscripción
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
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${isLive ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>
                {isLive ? "LIVE" : "SANDBOX"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Conecta tu cuenta de PayPal para cobrar planes mensuales y de por vida. Las credenciales se guardan cifradas en tu base de datos.
            </p>
          </div>
        </div>

        {/* Quick actions: go to PayPal */}
        <div className="mt-3 grid sm:grid-cols-2 gap-2">
          <a
            href={loginUrl}
            target="_blank" rel="noopener noreferrer"
            data-testid="paypal-open-login"
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#0070ba] hover:bg-[#005ea6] text-white text-xs font-black shadow-sm transition-all"
          >
            {/* PayPal wordmark-ish icon */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.322 2.65 1.058 4.688-.02.135-.038.264-.06.397-.732 3.55-3.086 4.762-6.096 4.762H12.53c-.5 0-.925.363-1.003.855l-1.463 8.925zm7.116-14.905c.155-.986-.007-1.658-.567-2.263-.616-.66-1.729-.943-3.152-.943H8.05a.372.372 0 0 0-.368.315L6.6 9.995h2.66c2.31 0 4.135-.94 4.933-4.563z"/>
            </svg>
            Iniciar sesión en PayPal
          </a>
          <a
            href={developerUrl}
            target="_blank" rel="noopener noreferrer"
            data-testid="paypal-open-developer"
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-300 text-slate-700 text-xs font-black shadow-sm transition-all"
          >
            <ExternalLink size={13} />
            Abrir Developer Dashboard
          </a>
        </div>
      </div>

      {/* Credentials form */}
      <div className="rounded-2xl bg-white/70 border border-slate-200 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-indigo-500" />
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Credenciales</p>
        </div>

        {/* Mode toggle */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5 block">Modo</label>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
            {[{ id: "sandbox", label: "Sandbox (pruebas)" }, { id: "live", label: "Live (real)" }].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setForm(f => ({ ...f, mode: m.id }))}
                data-testid={`paypal-mode-${m.id}`}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${form.mode === m.id ? (m.id === "live" ? "bg-rose-500 text-white shadow-sm" : "bg-white text-slate-900 shadow-sm") : "text-slate-500"}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Client ID */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5 block">Client ID</label>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={form.client_id}
              onChange={(e) => setForm(f => ({ ...f, client_id: e.target.value }))}
              placeholder="AXX...xxx (empieza con A)"
              data-testid="paypal-client-id-input"
              className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <button
              type="button" onClick={() => handlePaste("client_id")}
              title="Pegar" className="px-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300"
              data-testid="paypal-client-id-paste"
            >
              <Clipboard size={13} />
            </button>
          </div>
        </div>

        {/* Secret */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5 block">
            Secret {cfg?.has_secret && <span className="text-emerald-600 font-bold normal-case tracking-normal ml-1">· ya guardado — deja vacío para conservar</span>}
          </label>
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <input
                type={showSecret ? "text" : "password"}
                value={form.secret}
                onChange={(e) => setForm(f => ({ ...f, secret: e.target.value }))}
                placeholder={cfg?.has_secret ? cfg.secret_masked : "EPX...xxx"}
                data-testid="paypal-secret-input"
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
              type="button" onClick={() => handlePaste("secret")}
              title="Pegar" className="px-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-300"
              data-testid="paypal-secret-paste"
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
            disabled={saving || loading || !form.client_id.trim() || (!form.secret.trim() && !cfg?.has_secret)}
            data-testid="paypal-save-btn"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-black shadow-sm hover:shadow disabled:opacity-50"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Guardar
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={handleTest}
            disabled={testing || !cfg?.configured}
            data-testid="paypal-test-btn"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-black hover:bg-slate-50 disabled:opacity-50"
          >
            {testing ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
            Verificar conexión
          </motion.button>
        </div>

        <AnimatePresence>
          {testResult && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              data-testid="paypal-test-result"
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-bold ${testResult.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}
            >
              {testResult.ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
              {testResult.ok ? testResult.message : testResult.error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* How-to */}
      <details className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-3 text-[11px] text-slate-600" data-testid="paypal-help">
        <summary className="cursor-pointer font-black text-slate-700">¿Cómo obtengo estas credenciales?</summary>
        <ol className="mt-2 space-y-1 list-decimal list-inside">
          <li>Inicia sesión en <a href="https://www.paypal.com/signin" target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold">PayPal</a> con tu cuenta de empresa.</li>
          <li>Ve a <a href={developerUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold">Developer Dashboard</a>.</li>
          <li>En <b>My Apps & Credentials</b> → escoge <b>Sandbox</b> (pruebas) o <b>Live</b> (real) → <b>Create App</b>.</li>
          <li>Copia el <b>Client ID</b> y el <b>Secret</b> y pégalos aquí.</li>
          <li>Pulsa <b>Guardar</b> y luego <b>Verificar conexión</b>.</li>
        </ol>
      </details>
    </div>
  );
}
