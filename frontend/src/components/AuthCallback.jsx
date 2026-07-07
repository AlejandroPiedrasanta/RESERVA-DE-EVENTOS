import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function AuthCallback() {
  const { exchangeSession } = useAuth();
  const [err, setErr] = useState(null);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const hash = window.location.hash || "";
    const m = hash.match(/session_id=([^&]+)/);
    const sessionId = m ? decodeURIComponent(m[1]) : null;
    if (!sessionId) {
      setErr("session_id ausente");
      return;
    }
    (async () => {
      try {
        await exchangeSession(sessionId);
        // Clean the URL and go to dashboard
        window.history.replaceState({}, "", "/dashboard");
        window.location.replace("/dashboard");
      } catch (e) {
        setErr(e?.response?.data?.detail || "Error autenticando");
      }
    })();
  }, [exchangeSession]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center" data-testid="auth-callback">
        <div className="w-12 h-12 mx-auto mb-4 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <div className="text-slate-700 font-medium">
          {err ? `Error: ${err}` : "Iniciando sesión..."}
        </div>
      </div>
    </div>
  );
}
