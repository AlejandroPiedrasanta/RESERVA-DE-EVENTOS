import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { AlertCircle, RefreshCcw, ArrowLeft } from "lucide-react";

export default function AuthCallback() {
  const { exchangeSession } = useAuth();
  const [err, setErr] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const done = useRef(false);
  const sessionIdRef = useRef(null);

  const runExchange = async (sessionId) => {
    try {
      await exchangeSession(sessionId);
      window.history.replaceState({}, "", "/dashboard");
      window.location.replace("/dashboard");
    } catch (e) {
      const detail = e?.response?.data?.detail || e?.message || "No se pudo iniciar sesión con Google.";
      setErr(typeof detail === "string" ? detail : JSON.stringify(detail));
    }
  };

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const hash = window.location.hash || "";
    const m = hash.match(/session_id=([^&]+)/);
    const sessionId = m ? decodeURIComponent(m[1]) : null;
    sessionIdRef.current = sessionId;
    if (!sessionId) {
      setErr("Falta el identificador de sesión (session_id). Inténtalo de nuevo desde el inicio de sesión.");
      return;
    }
    runExchange(sessionId);
  }, [exchangeSession]);

  const handleRetry = async () => {
    if (!sessionIdRef.current) {
      goToLogin();
      return;
    }
    setRetrying(true);
    setErr(null);
    await runExchange(sessionIdRef.current);
    setRetrying(false);
  };

  const goToLogin = () => {
    window.history.replaceState({}, "", "/");
    window.location.replace("/");
  };

  if (err) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-rose-50 px-6">
        <div className="max-w-md w-full bg-white/90 backdrop-blur-xl border border-white/60 shadow-2xl rounded-3xl p-8 text-center" data-testid="auth-callback-error">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-red-600" />
          </div>
          <h1 className="mt-4 text-xl font-black text-slate-900" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
            No pudimos iniciar sesión
          </h1>
          <p className="mt-2 text-sm text-slate-600 break-words">{err}</p>
          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={handleRetry}
              disabled={retrying || !sessionIdRef.current}
              data-testid="auth-retry-btn"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              <RefreshCcw className={`w-4 h-4 ${retrying ? "animate-spin" : ""}`} />
              {retrying ? "Reintentando…" : "Reintentar"}
            </button>
            <button
              onClick={goToLogin}
              data-testid="auth-back-login-btn"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Volver a inicio de sesión
            </button>
          </div>
          <p className="mt-4 text-[11px] text-slate-400">
            Si el problema persiste, cierra esta pestaña e ingresa nuevamente desde tu navegador.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center" data-testid="auth-callback">
        <div className="w-12 h-12 mx-auto mb-4 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <div className="text-slate-700 font-medium">Iniciando sesión…</div>
      </div>
    </div>
  );
}
