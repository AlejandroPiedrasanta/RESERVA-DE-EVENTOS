import { CalendarDays, Sparkles, ShieldCheck } from "lucide-react";
import SupportAccessButton from "@/components/SupportAccessButton";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
function startGoogleLogin() {
  const redirectUrl = window.location.origin + "/dashboard";
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
}

export default function LoginScreen() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="absolute inset-0 pointer-events-none opacity-70">
        <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-indigo-200/50 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-rose-200/40 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md bg-white/80 backdrop-blur-xl border border-white/60 shadow-2xl rounded-3xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Cinema Productions</div>
            <div className="text-lg font-bold text-slate-900">Reserva de Eventos</div>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 leading-tight mb-2" data-testid="login-title">
          Ingresa para continuar
        </h1>
        <p className="text-sm text-slate-600 mb-6">
          Inicia sesión con tu cuenta de Google. <span className="font-semibold text-indigo-700">Prueba gratis por 3 días</span>, luego elige tu plan.
        </p>

        <button
          type="button"
          onClick={startGoogleLogin}
          data-testid="google-login-btn"
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-lg transition-all rounded-2xl px-4 py-3 font-semibold text-slate-800"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuar con Google
        </button>

        <div className="grid grid-cols-3 gap-3 mt-8">
          <div className="text-center">
            <div className="w-10 h-10 mx-auto rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-1">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="text-[11px] text-slate-600 leading-tight">3 días<br/>gratis</div>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 mx-auto rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-1">
              <CalendarDays className="w-4 h-4" />
            </div>
            <div className="text-[11px] text-slate-600 leading-tight">$1/mes<br/>o $20 para siempre</div>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 mx-auto rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 mb-1">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="text-[11px] text-slate-600 leading-tight">Cancela<br/>cuando quieras</div>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 text-center mt-6">
          Al continuar aceptas nuestros términos y política de privacidad.
        </p>

        <div className="mt-4 pt-4 border-t border-slate-200/70 flex justify-center">
          <SupportAccessButton variant="light" />
        </div>
      </div>
    </div>
  );
}
