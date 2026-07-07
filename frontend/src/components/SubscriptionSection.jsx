import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth, authHeaders } from "@/context/AuthContext";
import { Section } from "@/components/appearance/SectionShell";
import {
  Crown, Sparkles, Infinity as InfinityIcon, CheckCircle2,
  Calendar, Zap, ShieldCheck, TrendingUp, Star,
} from "lucide-react";

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

function formatDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("es-GT", { day: "numeric", month: "long", year: "numeric" });
  } catch { return ""; }
}

function StatusBadge({ subscription }) {
  const isLifetime = subscription?.plan === "lifetime";
  const isMonthly = subscription?.plan === "monthly";
  const isTrial = !isLifetime && !isMonthly && subscription?.trial_active;

  if (isLifetime) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[11px] font-bold uppercase tracking-wider shadow-lg">
        <Crown size={12} /> Para siempre
      </div>
    );
  }
  if (isMonthly) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[11px] font-bold uppercase tracking-wider shadow-lg">
        <Zap size={12} /> Mensual activa
      </div>
    );
  }
  if (isTrial) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 text-white text-[11px] font-bold uppercase tracking-wider shadow-lg">
        <Sparkles size={12} /> Prueba gratis
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold uppercase tracking-wider shadow-lg">
      Sin acceso
    </div>
  );
}

function CountdownTile({ label, value }) {
  return (
    <div className="flex flex-col items-center px-3 py-2 rounded-2xl bg-white/70 backdrop-blur border border-white/70 shadow-sm min-w-[62px]">
      <div className="text-2xl font-black text-slate-900 tabular-nums" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
        {String(value).padStart(2, "0")}
      </div>
      <div className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</div>
    </div>
  );
}

function LiveCountdown({ endIso }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const total = useMemo(() => {
    if (!endIso) return 0;
    const end = new Date(endIso).getTime();
    return Math.max(0, Math.floor((end - now) / 1000));
  }, [endIso, now]);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return (
    <div className="flex gap-2">
      <CountdownTile label="Días" value={d} />
      <CountdownTile label="Hrs" value={h} />
      <CountdownTile label="Min" value={m} />
      <CountdownTile label="Seg" value={s} />
    </div>
  );
}

function PlanCard({
  variant, priceLabel, priceSub, title, subtitle, features, gradient,
  active, popular, containerId, disabled, delay,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
      className={`relative rounded-3xl p-5 flex flex-col overflow-hidden border-2 transition-all ${
        active ? "border-emerald-400 shadow-2xl shadow-emerald-500/20"
               : popular ? "border-transparent shadow-2xl"
               : "border-white/60 shadow-lg"
      }`}
      data-testid={`plan-card-${variant}`}
    >
      {/* Animated gradient background */}
      <div className={`absolute inset-0 ${gradient} opacity-95`} />
      {/* Grain overlay */}
      <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay pointer-events-none"
        style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'><filter id='n'><feTurbulence baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")" }}
      />
      {/* Floating orbs */}
      <motion.div
        animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/20 blur-2xl"
      />
      <motion.div
        animate={{ x: [0, -15, 0], y: [0, 12, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-white/15 blur-2xl"
      />

      <div className="relative z-10 flex flex-col h-full text-white">
        {/* Badges */}
        <div className="flex items-center justify-between mb-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/25 backdrop-blur text-[10px] font-black uppercase tracking-widest">
            {variant === "lifetime" ? <InfinityIcon size={11} /> : <Sparkles size={11} />}
            {title}
          </div>
          {active && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg">
              <CheckCircle2 size={11} /> Tu plan
            </div>
          )}
          {popular && !active && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black uppercase tracking-widest shadow-lg">
              <Star size={11} className="fill-slate-900" /> Mejor valor
            </div>
          )}
        </div>

        {/* Price */}
        <div className="mt-1">
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-black tracking-tight" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
              {priceLabel}
            </span>
            <span className="text-sm font-semibold opacity-80">{priceSub}</span>
          </div>
          <p className="text-xs opacity-90 mt-1">{subtitle}</p>
        </div>

        {/* Features */}
        <ul className="mt-4 space-y-1.5 flex-1">
          {features.map((f, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 0.1 + i * 0.06 }}
              className="flex items-start gap-2 text-[13px] font-medium"
            >
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 opacity-90" />
              <span>{f}</span>
            </motion.li>
          ))}
        </ul>

        {/* PayPal container */}
        <div className="mt-4 rounded-2xl bg-white/95 p-2 min-h-[52px] flex items-center justify-center">
          {active ? (
            <div className="text-emerald-700 text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
              <ShieldCheck size={14} /> Ya cuentas con este plan
            </div>
          ) : disabled ? (
            <div className="text-slate-500 text-xs font-semibold">PayPal no configurado</div>
          ) : (
            <div id={containerId} className="w-full" />
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function SubscriptionSection() {
  const { subscription, refresh, setSubscription } = useAuth();
  const [config, setConfig] = useState(null);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const rendered = useRef(new Set());

  useEffect(() => {
    api.get("/paypal/config").then(r => setConfig(r.data)).catch(() => setConfig({ configured: false }));
  }, []);

  const isLifetime = subscription?.plan === "lifetime";
  const isMonthly = subscription?.plan === "monthly";

  useEffect(() => {
    if (!config?.configured || !config?.client_id) return;
    if (isLifetime) return; // no need to render buttons if lifetime
    let cancelled = false;
    (async () => {
      try {
        const paypal = await loadPayPalSdk(config.client_id);
        if (cancelled) return;
        const targets = isMonthly ? ["lifetime"] : ["monthly", "lifetime"];
        targets.forEach(plan => {
          const containerId = `sub-section-paypal-${plan}`;
          const el = document.getElementById(containerId);
          if (!el || rendered.current.has(plan)) return;
          rendered.current.add(plan);
          el.innerHTML = "";
          paypal.Buttons({
            style: { layout: "vertical", color: plan === "lifetime" ? "gold" : "blue", shape: "pill", label: "pay", height: 40 },
            createOrder: async () => {
              const { data } = await api.post("/paypal/create-order", { plan }, { headers: authHeaders() });
              return data.id;
            },
            onApprove: async (data) => {
              try {
                const { data: res } = await api.post(`/paypal/capture/${data.orderID}`, {}, { headers: authHeaders() });
                setSubscription(res.subscription);
                setMsg(plan === "lifetime" ? "¡Acceso para siempre activado!" : "¡Suscripción mensual activada!");
                setTimeout(() => refresh(), 800);
              } catch (e) {
                setErr(e?.response?.data?.detail || "Error al capturar el pago");
              }
            },
            onError: (e) => setErr(String(e?.message || e)),
          }).render(`#${containerId}`);
        });
      } catch (e) {
        setErr(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [config, isMonthly, isLifetime, refresh, setSubscription]);

  const monthlyFeatures = [
    "Reservas y socios ilimitados",
    "Sincronización en la nube",
    "Recordatorios y notificaciones",
    "Cancela cuando quieras",
  ];
  const lifetimeFeatures = [
    "Todo lo del plan mensual",
    "Un solo pago, sin renovaciones",
    "Actualizaciones para siempre",
    "Prioridad de soporte",
  ];

  const summary = (() => {
    if (isLifetime) return { icon: Crown, tint: "from-amber-500 to-orange-500", text: "Acceso permanente activado", sub: "Gracias por confiar en nosotros" };
    if (isMonthly) return {
      icon: Zap, tint: "from-indigo-500 to-purple-600",
      text: "Suscripción mensual activa",
      sub: subscription?.plan_expires_at ? `Se renueva el ${formatDate(subscription.plan_expires_at)}` : "Renovación automática",
    };
    if (subscription?.trial_active) return {
      icon: Sparkles, tint: "from-emerald-500 to-teal-600",
      text: "Estás en tu prueba gratis",
      sub: "Elige un plan antes de que termine para no perder acceso",
    };
    return { icon: TrendingUp, tint: "from-rose-500 to-red-600", text: "Tu acceso está bloqueado", sub: "Activa un plan para volver a usar todas las funciones" };
  })();

  const SummaryIcon = summary.icon;

  return (
    <Section
      icon={Crown}
      title="Suscripción"
      desc="Consulta tu plan actual y actualízalo cuando quieras"
      badge={<StatusBadge subscription={subscription} />}
      keywords="suscripcion plan pago paypal mensual permanente lifetime prueba trial"
      id="subscription"
    >
      <div className="space-y-5" data-testid="subscription-section">
        {/* Hero status card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={`relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br ${summary.tint} text-white shadow-xl`}
        >
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/30 blur-3xl"
          />
          <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <motion.div
                animate={{ rotate: [0, -6, 6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-12 h-12 rounded-2xl bg-white/25 backdrop-blur flex items-center justify-center shrink-0"
              >
                <SummaryIcon size={22} className="text-white" />
              </motion.div>
              <div className="min-w-0">
                <h3 className="text-base font-black" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                  {summary.text}
                </h3>
                <p className="text-xs opacity-90 mt-0.5" data-testid="subscription-summary-sub">{summary.sub}</p>
              </div>
            </div>
            {(subscription?.trial_active && !isMonthly && !isLifetime && subscription?.trial_end_at) && (
              <LiveCountdown endIso={subscription.trial_end_at} />
            )}
            {isMonthly && subscription?.plan_expires_at && (
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/20 backdrop-blur text-xs font-bold">
                <Calendar size={14} /> Renueva {formatDate(subscription.plan_expires_at)}
              </div>
            )}
          </div>
        </motion.div>

        {/* Success/Error messages */}
        <AnimatePresence>
          {msg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 font-semibold"
              data-testid="subscription-success"
            >
              {msg}
            </motion.div>
          )}
          {err && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="p-3 rounded-2xl bg-red-50 border border-red-200 text-sm text-red-700 font-semibold"
              data-testid="subscription-error"
            >
              {err}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Not configured hint */}
        {config && !config.configured && !isLifetime && !isMonthly && (
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
            <strong>PayPal no configurado.</strong> Añade <code>PAYPAL_CLIENT_ID</code> y <code>PAYPAL_SECRET</code> en <code>backend/.env</code> para habilitar los pagos.
          </div>
        )}

        {/* Plan cards — hide the currently active plan and show only upgrade paths */}
        {!isLifetime && (
          <div className="grid sm:grid-cols-2 gap-4">
            {!isMonthly && (
              <PlanCard
                variant="monthly"
                title="Mensual"
                priceLabel="$1"
                priceSub="/mes"
                subtitle="Perfecto para probarlo con calma."
                features={monthlyFeatures}
                gradient="bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600"
                popular={false}
                active={false}
                containerId="sub-section-paypal-monthly"
                disabled={!config?.configured}
                delay={0.05}
              />
            )}
            <PlanCard
              variant="lifetime"
              title="Para siempre"
              priceLabel="$20"
              priceSub="una sola vez"
              subtitle={isMonthly ? "Cambia a permanente y olvídate de renovar." : "Un solo pago, para siempre tuyo."}
              features={lifetimeFeatures}
              gradient="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500"
              popular={true}
              active={false}
              containerId="sub-section-paypal-lifetime"
              disabled={!config?.configured}
              delay={0.15}
            />
          </div>
        )}

        {/* Lifetime enjoy state */}
        {isLifetime && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="relative overflow-hidden rounded-3xl p-6 text-center border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-white to-orange-50"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{ backgroundImage: "radial-gradient(circle at 30% 30%, #f59e0b 0%, transparent 40%), radial-gradient(circle at 70% 70%, #f97316 0%, transparent 40%)" }}
            />
            <div className="relative z-10">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                <Crown size={28} className="text-white" />
              </div>
              <h3 className="mt-3 text-lg font-black text-slate-900" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                Acceso permanente
              </h3>
              <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
                Tienes todo desbloqueado para siempre. Gracias por apoyar el proyecto ✦
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </Section>
  );
}
