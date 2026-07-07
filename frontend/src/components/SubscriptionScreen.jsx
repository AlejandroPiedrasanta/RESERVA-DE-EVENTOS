import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useAuth, authHeaders } from "@/context/AuthContext";
import { CheckCircle2, Sparkles, Infinity as InfinityIcon, LogOut, Lock } from "lucide-react";
import SupportAccessButton from "@/components/SupportAccessButton";

function loadPayPalSdk(clientId) {
  return new Promise((resolve, reject) => {
    if (window.paypal) return resolve(window.paypal);
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture`;
    s.async = true;
    s.onload = () => resolve(window.paypal);
    s.onerror = () => reject(new Error("No se pudo cargar PayPal SDK"));
    document.body.appendChild(s);
  });
}

function PlanCard({ plan, price, subtitle, badge, features, popular, onPay, disabled, testId }) {
  return (
    <div
      className={`relative rounded-3xl border p-6 flex flex-col ${popular ? "border-indigo-400 bg-white shadow-2xl" : "border-slate-200 bg-white/80"}`}
      data-testid={testId}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          Recomendado
        </div>
      )}
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{badge}</div>
      <div className="mt-3 flex items-end gap-1">
        <div className="text-4xl font-bold text-slate-900">${price}</div>
        <div className="text-sm text-slate-500 mb-1">{subtitle}</div>
      </div>
      <ul className="mt-5 space-y-2 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
            <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5">
        <div id={`paypal-container-${plan}`} className={disabled ? "opacity-40 pointer-events-none" : ""} />
      </div>
    </div>
  );
}

export default function SubscriptionScreen({ reason = "trial_expired" }) {
  const { user, subscription, refresh, logout, setSubscription } = useAuth();
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const rendered = useRef(new Set());

  useEffect(() => {
    api.get("/paypal/config")
      .then(r => setConfig(r.data))
      .catch(() => setError("No se pudo cargar la configuración de pago"));
  }, []);

  useEffect(() => {
    if (!config?.configured || !config?.client_id) return;
    let cancelled = false;

    (async () => {
      try {
        const paypal = await loadPayPalSdk(config.client_id);
        if (cancelled) return;
        ["monthly", "lifetime"].forEach(plan => {
          const containerId = `#paypal-container-${plan}`;
          const el = document.querySelector(containerId);
          if (!el || rendered.current.has(plan)) return;
          rendered.current.add(plan);
          el.innerHTML = "";
          paypal.Buttons({
            style: { layout: "vertical", color: plan === "lifetime" ? "gold" : "blue", shape: "pill", label: "pay" },
            createOrder: async () => {
              const { data } = await api.post("/paypal/create-order", { plan }, { headers: authHeaders() });
              return data.id;
            },
            onApprove: async (data) => {
              try {
                const { data: res } = await api.post(`/paypal/capture/${data.orderID}`, {}, { headers: authHeaders() });
                setSubscription(res.subscription);
                setSuccess(plan === "lifetime" ? "¡Acceso activado para siempre!" : "¡Suscripción mensual activada!");
                setTimeout(() => refresh().then(() => window.location.replace("/dashboard")), 1200);
              } catch (e) {
                setError(e?.response?.data?.detail || "Error al capturar el pago");
              }
            },
            onError: (err) => setError(String(err?.message || err)),
          }).render(containerId);
        });
      } catch (e) {
        setError(e.message);
      }
    })();

    return () => { cancelled = true; };
  }, [config, refresh, setSubscription]);

  const trialDays = subscription?.trial_days_left ?? 0;
  const showTrialExpired = reason === "trial_expired" || (!subscription?.is_active);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-60">
        <div className="absolute -top-24 right-1/4 w-[30rem] h-[30rem] rounded-full bg-indigo-200/40 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-amber-100/40 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            {user?.picture && (
              <img src={user.picture} alt="" className="w-10 h-10 rounded-full ring-2 ring-white shadow" />
            )}
            <div>
              <div className="text-sm text-slate-500">Hola</div>
              <div className="font-semibold text-slate-800" data-testid="user-name">{user?.name || user?.email}</div>
            </div>
          </div>
          <button
            onClick={logout}
            data-testid="logout-btn"
            className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1"
          >
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>

        <div className="text-center mb-10">
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-4 ${showTrialExpired ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
            <Lock className="w-3.5 h-3.5" />
            {showTrialExpired ? "Tu prueba gratis terminó" : `Prueba: ${trialDays} día(s) restantes`}
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight" data-testid="subscription-title">
            Elige tu plan
          </h1>
          <p className="mt-3 text-slate-600 max-w-xl mx-auto">
            Continúa gestionando tus reservas y socios. Solo <span className="font-semibold text-slate-900">$1 al mes</span>, o paga <span className="font-semibold text-slate-900">$20 una sola vez</span> y quédatelo para siempre.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700" data-testid="pay-error">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700" data-testid="pay-success">
            {success}
          </div>
        )}
        {config && !config.configured && (
          <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
            <strong>PayPal no configurado.</strong> Añade <code>PAYPAL_CLIENT_ID</code> y <code>PAYPAL_SECRET</code> en <code>/app/backend/.env</code> y reinicia el backend.
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <PlanCard
            plan="monthly"
            price="1"
            subtitle="/ mes"
            badge={<span className="inline-flex items-center gap-1"><Sparkles className="w-3 h-3"/> Mensual</span>}
            features={["Reservas ilimitadas", "Socios ilimitados", "Sincronización en la nube", "Cancela cuando quieras"]}
            popular={false}
            testId="plan-monthly"
          />
          <PlanCard
            plan="lifetime"
            price="20"
            subtitle="una sola vez"
            badge={<span className="inline-flex items-center gap-1"><InfinityIcon className="w-3 h-3"/> Para siempre</span>}
            features={["Todo lo del plan mensual", "Un solo pago, sin renovaciones", "Actualizaciones incluidas", "Mejor relación precio/valor"]}
            popular={true}
            testId="plan-lifetime"
          />
        </div>

        <div className="mt-10 flex justify-center">
          <SupportAccessButton variant="light" />
        </div>
      </div>
    </div>
  );
}
