import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { useAuth, authHeaders } from "@/context/AuthContext";
import { Section } from "@/components/appearance/SectionShell";
import ProfileCard from "@/components/ProfileCard";
import {
  Crown, Sparkles, Infinity as InfinityIcon, CheckCircle2,
  Calendar, Zap, ShieldCheck, TrendingUp, Star, Gift, Copy, Check, Users, Share2, Ticket,
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

function ReferralCard({ isLifetime }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [redeeming, setRedeeming] = useState(false);
  const { refresh, setSubscription } = useAuth();

  const load = async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get("/referral/me", { headers: authHeaders() });
      setData(d);
    } catch (e) {
      // silent — no auth or first-load fail
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const link = data?.code ? `${window.location.origin}/?ref=${data.code}` : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setErr("No se pudo copiar. Copia el enlace manualmente.");
    }
  };

  const handleShare = async () => {
    if (!navigator.share) return handleCopy();
    try {
      await navigator.share({
        title: "Reserva de Eventos — 1 mes gratis",
        text: "Usa mi código y ambos ganamos 1 mes gratis en Reserva de Eventos:",
        url: link,
      });
    } catch { /* user cancelled */ }
  };

  const handleRedeem = async () => {
    setErr(null); setMsg(null);
    const c = code.trim().toUpperCase();
    if (!c) { setErr("Ingresa un código"); return; }
    setRedeeming(true);
    try {
      const { data: res } = await api.post("/referral/redeem", { code: c }, { headers: authHeaders() });
      setSubscription(res.subscription);
      setMsg("¡Código canjeado! +30 días agregados a tu plan mensual.");
      setCode("");
      await load();
      setTimeout(() => refresh(), 400);
    } catch (e) {
      setErr(e?.response?.data?.detail || "No se pudo canjear el código");
    } finally { setRedeeming(false); }
  };

  const canRedeem = !data?.already_redeemed && !isLifetime;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-3xl p-5 border-2 border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-teal-50"
      data-testid="referral-card"
    >
      <motion.div
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-emerald-300/30 blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{ x: [0, -20, 0], y: [0, 15, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-12 -left-12 w-44 h-44 rounded-full bg-teal-300/30 blur-3xl pointer-events-none"
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.08, 1] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg"
            >
              <Gift size={20} className="text-white" />
            </motion.div>
            <div>
              <h3 className="text-base font-black text-slate-900" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                Comparte y ganen <span className="text-emerald-600">1 mes gratis</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Tú y tu amigo reciben +30 días cuando canjee tu código.</p>
            </div>
          </div>
          {data && (
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Invitados</div>
                <div className="flex items-center gap-1 justify-end">
                  <Users size={12} className="text-emerald-500" />
                  <div className="text-lg font-black text-slate-900 tabular-nums" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }} data-testid="referral-count">
                    {data.redeemed_count}
                  </div>
                </div>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ganados</div>
                <div className="flex items-center gap-1 justify-end">
                  <Ticket size={12} className="text-emerald-500" />
                  <div className="text-lg font-black text-emerald-600 tabular-nums" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }} data-testid="referral-months-earned">
                    {data.months_earned}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* My code + share */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[200px] flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-white border border-emerald-200 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 shrink-0">Tu código</span>
            <span className="text-base font-black text-slate-900 tracking-[0.2em] flex-1 truncate" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }} data-testid="referral-code">
              {loading ? "···" : (data?.code || "···")}
            </span>
          </div>
          <button
            onClick={handleCopy}
            disabled={!data?.code}
            data-testid="referral-copy-btn"
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span key="ok" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-1.5 text-emerald-600">
                  <Check size={14} /> ¡Copiado!
                </motion.span>
              ) : (
                <motion.span key="cp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-1.5">
                  <Copy size={14} /> Copiar enlace
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <button
            onClick={handleShare}
            disabled={!data?.code}
            data-testid="referral-share-btn"
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
          >
            <Share2 size={14} /> Compartir
          </button>
        </div>

        {/* Redeem input */}
        {canRedeem && (
          <div className="mt-4 pt-4 border-t border-emerald-100/70">
            <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              ¿Tienes un código de un amigo?
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 12))}
                placeholder="Ej. 8XK2QP"
                data-testid="referral-input"
                className="flex-1 min-w-[160px] px-3 py-2.5 rounded-2xl bg-white border border-slate-200 text-sm font-black tracking-[0.2em] text-slate-800 placeholder:text-slate-300 placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
              />
              <button
                onClick={handleRedeem}
                disabled={redeeming || !code.trim()}
                data-testid="referral-redeem-btn"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-lg hover:bg-slate-800 transition-all disabled:opacity-50"
              >
                {redeeming ? (
                  <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" />
                ) : <Ticket size={14} />}
                {redeeming ? "Canjeando…" : "Canjear"}
              </button>
            </div>
          </div>
        )}
        {data?.already_redeemed && (
          <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
            <CheckCircle2 size={12} /> Ya canjeaste un código de referido
          </div>
        )}
        {isLifetime && !data?.already_redeemed && (
          <div className="mt-3 text-[11px] text-slate-500">
            Tienes acceso permanente — comparte tu código para que tus amigos ganen 1 mes gratis.
          </div>
        )}

        <AnimatePresence>
          {msg && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-3 p-2.5 rounded-xl bg-emerald-100 border border-emerald-200 text-xs font-bold text-emerald-800"
              data-testid="referral-success">
              {msg}
            </motion.div>
          )}
          {err && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-3 p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700"
              data-testid="referral-error">
              {err}
            </motion.div>
          )}
        </AnimatePresence>
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
          // Limpiar contenedor de forma segura (evita innerHTML flagged por CodeQL).
          while (el.firstChild) el.removeChild(el.firstChild);
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
        {/* User profile: avatar (Google) + editable name + email */}
        <ProfileCard />

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

        {/* Referral: viral growth loop — share code, both get +30 days */}
        <ReferralCard isLifetime={isLifetime} />

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

        {/* Not configured hint moved to Base de datos → Soporte avanzado → PayPal */}

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
