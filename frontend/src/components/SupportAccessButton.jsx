import { useState } from "react";
import { LifeBuoy, X } from "lucide-react";

const SUPPORT_PASSWORD = "2868";
export const SUPPORT_FLAG = "cp_support_access";

export function hasSupportAccess() {
  try { return localStorage.getItem(SUPPORT_FLAG) === "true"; } catch { return false; }
}

export default function SupportAccessButton({ variant = "light" }) {
  const [open, setOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (pwd.trim() === SUPPORT_PASSWORD) {
      localStorage.setItem(SUPPORT_FLAG, "true");
      window.location.replace("/dashboard");
    } else {
      setErr("Contraseña incorrecta");
      setPwd("");
    }
  };

  const linkClass = variant === "dark"
    ? "text-slate-300 hover:text-white"
    : "text-slate-500 hover:text-slate-800";

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setErr(""); setPwd(""); }}
        data-testid="support-btn"
        className={`inline-flex items-center gap-1.5 text-xs font-medium ${linkClass} transition-colors`}
      >
        <LifeBuoy className="w-3.5 h-3.5" />
        Soporte
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          data-testid="support-modal"
          onClick={() => setOpen(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={submit}
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 relative"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              data-testid="support-close"
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                <LifeBuoy className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Acceso de Soporte</div>
                <div className="text-sm text-slate-700">Ingresa la contraseña</div>
              </div>
            </div>
            <input
              type="password"
              autoFocus
              value={pwd}
              onChange={(e) => { setPwd(e.target.value); setErr(""); }}
              placeholder="••••"
              data-testid="support-password-input"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-center text-lg tracking-widest font-mono focus:outline-none focus:border-slate-900"
            />
            {err && (
              <div className="mt-2 text-sm text-red-600 text-center" data-testid="support-error">{err}</div>
            )}
            <button
              type="submit"
              data-testid="support-submit"
              className="mt-4 w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Ingresar
            </button>
            <p className="mt-3 text-[11px] text-slate-400 text-center">
              Uso exclusivo de soporte técnico. Otorga acceso permanente en este dispositivo.
            </p>
          </form>
        </div>
      )}
    </>
  );
}
