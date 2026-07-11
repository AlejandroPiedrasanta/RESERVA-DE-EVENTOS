import { useState, useEffect, useMemo } from "react";
import { getSocios, getSocio, updateReservation } from "@/lib/api";
import { celebratePayment } from "@/lib/celebrations";
import {
  Users, Plus, X, Camera, Video, CheckCircle2, Clock, ChevronDown,
  Sparkles, Wallet, TrendingUp, TrendingDown, Coins, Search,
  UserPlus, Crown, Zap, DollarSign
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/context/SettingsContext";

const ROLE_META = {
  "Fotógrafo": {
    icon: Camera,
    grad: "from-indigo-500 via-blue-500 to-cyan-500",
    soft: "from-indigo-50 to-blue-50",
    text: "text-indigo-600",
    ring: "ring-indigo-200/60",
    dot: "bg-indigo-500",
    accent: "#6366f1",
  },
  "Videógrafo": {
    icon: Video,
    grad: "from-fuchsia-500 via-purple-500 to-violet-500",
    soft: "from-fuchsia-50 to-purple-50",
    text: "text-purple-600",
    ring: "ring-purple-200/60",
    dot: "bg-purple-500",
    accent: "#a855f7",
  },
  "Asistente": {
    icon: Users,
    grad: "from-slate-500 via-slate-600 to-slate-700",
    soft: "from-slate-50 to-gray-50",
    text: "text-slate-600",
    ring: "ring-slate-200/60",
    dot: "bg-slate-500",
    accent: "#64748b",
  },
};

const easeOut = [0.22, 1, 0.36, 1];

function SocioAvatar({ socio, size = "md" }) {
  const meta = ROLE_META[socio.role] || ROLE_META["Asistente"];
  const sz = size === "sm" ? "w-8 h-8 text-[10px]"
           : size === "lg" ? "w-12 h-12 text-sm"
           : "w-10 h-10 text-xs";
  if (socio.photo && socio.photo_content_type) {
    return (
      <div className="relative">
        <img
          src={`data:${socio.photo_content_type};base64,${socio.photo}`}
          alt={socio.name}
          className={`${sz} rounded-2xl object-cover ring-2 ring-white shadow-md`}
        />
        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${meta.dot} ring-2 ring-white`} />
      </div>
    );
  }
  return (
    <div className="relative">
      <div className={`${sz} rounded-2xl flex items-center justify-center font-black bg-gradient-to-br ${meta.grad} text-white ring-2 ring-white shadow-md`}>
        {socio.name?.charAt(0).toUpperCase()}
      </div>
      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${meta.dot} ring-2 ring-white`} />
    </div>
  );
}

/* Custom animated select */
function SocioPicker({ socios, value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = socios.find(s => s.id === value);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return socios;
    return socios.filter(s =>
      s.name?.toLowerCase().includes(term) || s.role?.toLowerCase().includes(term)
    );
  }, [socios, q]);

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  return (
    <div className="relative flex-1 min-w-0">
      <motion.button
        type="button"
        whileTap={{ scale: 0.99 }}
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        data-testid="select-socio-trigger"
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-white/60 backdrop-blur-md border border-white/70 hover:bg-white/80 transition-colors text-left shadow-sm disabled:opacity-60"
      >
        {selected ? (
          <>
            <SocioAvatar socio={selected} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate leading-tight">{selected.name}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{selected.role}</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
              <UserPlus size={14} className="text-slate-400" />
            </div>
            <span className="text-sm text-slate-400 font-medium flex-1">Seleccionar socio…</span>
          </>
        )}
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={16} className="text-slate-400" />
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.18, ease: easeOut }}
              className="absolute z-40 top-[calc(100%+8px)] left-0 right-0 rounded-2xl bg-white/95 backdrop-blur-xl border border-white/80 shadow-2xl overflow-hidden"
              data-testid="select-socio-dropdown"
            >
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100">
                <Search size={14} className="text-slate-400" />
                <input
                  autoFocus
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Buscar por nombre o rol…"
                  className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none"
                />
              </div>
              <div className="max-h-64 overflow-y-auto py-1.5">
                {filtered.length === 0 && (
                  <div className="px-4 py-6 text-center text-xs font-medium text-slate-400">
                    Sin resultados
                  </div>
                )}
                {filtered.map((s, i) => {
                  const meta = ROLE_META[s.role] || ROLE_META["Asistente"];
                  const Icon = meta.icon;
                  return (
                    <motion.button
                      key={s.id}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      onClick={() => { onChange(s.id); setOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors text-left group"
                      data-testid={`socio-option-${s.id}`}
                    >
                      <SocioAvatar socio={s} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{s.name}</p>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${meta.text}`}>
                          <Icon size={9} /> {s.role}
                        </span>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus size={14} className="text-slate-400" />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TeamSection({ reservation, onUpdated }) {
  const { toast } = useToast();
  const { formatCurrency } = useSettings();
  const [socios, setSocios] = useState([]);
  const [socioMap, setSocioMap] = useState({});
  const [selectedSocio, setSelectedSocio] = useState("");
  const [payment, setPayment] = useState("");
  const [adding, setAdding] = useState(false);
  const partners = reservation.assigned_partners || [];

  useEffect(() => {
    getSocios().then(data => {
      const assignedIds = partners.map(p => p.socio_id);
      setSocios(data.filter(s => !assignedIds.includes(s.id)));
      setSocioMap(Object.fromEntries((data || []).map(s => [s.id, s])));
    }).catch(console.error);
  }, [reservation]);

  const teamCost = partners.reduce((sum, p) => sum + (p.payment || 0), 0);
  const paidToTeam = partners.filter(p => p.payment_status === "Pagado").reduce((sum, p) => sum + (p.payment || 0), 0);
  const pendingToTeam = teamCost - paidToTeam;
  const realIncome = (reservation.total_amount || 0) - teamCost;
  const totalAmount = reservation.total_amount || 0;
  const marginPct = totalAmount > 0 ? (realIncome / totalAmount) * 100 : 0;
  const teamPaidPct = teamCost > 0 ? (paidToTeam / teamCost) * 100 : 0;

  const handleAdd = async () => {
    if (!selectedSocio) { toast({ title: "Selecciona un socio", variant: "destructive" }); return; }
    setAdding(true);
    try {
      const socio = await getSocio(selectedSocio);
      const newPartner = {
        socio_id: socio.id,
        name: socio.name,
        role: socio.role,
        photo: socio.photo || null,
        photo_content_type: socio.photo_content_type || null,
        payment: parseFloat(payment) || 0,
        payment_status: "Pendiente",
      };
      const updatedPartners = [...partners, newPartner];
      await updateReservation(reservation.id, { assigned_partners: updatedPartners });
      toast({ title: `${socio.name} asignado` });
      setSelectedSocio(""); setPayment("");
      onUpdated?.();
    } catch {
      toast({ title: "Error al asignar", variant: "destructive" });
    } finally { setAdding(false); }
  };

  const handleRemove = async (socioId) => {
    const updatedPartners = partners.filter(p => p.socio_id !== socioId);
    try {
      await updateReservation(reservation.id, { assigned_partners: updatedPartners });
      toast({ title: "Socio removido" });
      onUpdated?.();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleTogglePayment = async (socioId) => {
    let becamePaid = false;
    let socioName = "";
    const updatedPartners = partners.map(p => {
      if (p.socio_id !== socioId) return p;
      const newStatus = p.payment_status === "Pagado" ? "Pendiente" : "Pagado";
      if (newStatus === "Pagado") { becamePaid = true; socioName = p.name; }
      return { ...p, payment_status: newStatus };
    });
    try {
      await updateReservation(reservation.id, { assigned_partners: updatedPartners });
      if (becamePaid) {
        toast({ title: `💰 ¡${socioName} pagado!` });
        celebratePayment();
      }
      onUpdated?.();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, ease: easeOut }}
      className="glass rounded-3xl p-6 relative overflow-hidden"
    >
      {/* Ambient aurora */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-40"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.28), transparent 70%)", filter: "blur(30px)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-24 w-72 h-72 rounded-full opacity-30"
        style={{ background: "radial-gradient(circle, rgba(236,72,153,0.22), transparent 70%)", filter: "blur(30px)" }}
      />

      {/* Header */}
      <div className="relative flex items-center gap-3 mb-6">
        <motion.div
          whileHover={{ scale: 1.08, rotate: 8 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 flex items-center justify-center shadow-lg shadow-fuchsia-500/30"
        >
          <Users size={16} className="text-white" />
        </motion.div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            Fotógrafo / Equipo
            <Sparkles size={11} className="text-fuchsia-400" />
          </h2>
          <p className="text-[10px] font-medium text-slate-400 mt-0.5">Asigna talento y controla pagos en tiempo real</p>
        </div>
        {partners.length > 0 && (
          <motion.div
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-violet-100 to-fuchsia-100 border border-fuchsia-200/50"
          >
            <Crown size={11} className="text-fuchsia-500" />
            <span className="text-[11px] font-black text-fuchsia-700">{partners.length}</span>
          </motion.div>
        )}
      </div>

      {/* Add partner row */}
      <div className="relative grid grid-cols-1 sm:grid-cols-12 gap-2 mb-5 items-stretch">
        <div className="sm:col-span-7 flex">
          <SocioPicker
            socios={socios}
            value={selectedSocio}
            onChange={setSelectedSocio}
            disabled={adding}
          />
        </div>
        <div className="relative sm:col-span-3 flex">
          <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="number"
            value={payment}
            onChange={e => setPayment(e.target.value)}
            placeholder="Pago"
            className="w-full text-sm font-bold pl-8 pr-3 py-2.5 rounded-2xl bg-white/60 backdrop-blur-md border border-white/70 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/40 focus:border-fuchsia-300 text-slate-700 shadow-sm transition h-full"
            data-testid="input-partner-payment"
          />
        </div>
        <motion.button
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleAdd}
          disabled={adding || !selectedSocio}
          data-testid="add-partner-btn"
          className="sm:col-span-2 relative overflow-hidden group px-3 py-2.5 rounded-2xl text-white text-sm font-black flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-fuchsia-500/30 h-full min-h-[44px]"
          style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 60%, #f59e0b 100%)" }}
        >
          <motion.span
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            initial={{ x: "-120%" }}
            animate={{ x: adding ? "-120%" : ["-120%", "120%"] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.2 }}
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)" }}
          />
          <Plus size={15} className="relative" />
          <span className="relative">Asignar</span>
        </motion.button>
      </div>

      {/* Partners list */}
      <AnimatePresence mode="popLayout">
        {partners.length > 0 ? (
          <div className="space-y-2.5 mb-5">
            {partners.map((p, i) => {
              const info = socioMap[p.socio_id] || {};
              const pName = p.name || info.name || "Socio";
              const pRole = p.role || info.role || "Fotógrafo";
              const avatarSocio = { ...info, ...p, name: pName, role: pRole };
              const meta = ROLE_META[pRole] || ROLE_META["Asistente"];
              const RoleIcon = meta.icon;
              const isPaid = p.payment_status === "Pagado";
              return (
                <motion.div
                  key={p.socio_id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  transition={{ delay: i * 0.06, ease: easeOut }}
                  whileHover={{ y: -2 }}
                  className={`group relative flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-br ${meta.soft} border border-white/70 overflow-hidden`}
                  data-testid={`partner-row-${p.socio_id}`}
                >
                  {/* Left accent bar */}
                  <span
                    className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full"
                    style={{ background: meta.accent }}
                  />

                  <SocioAvatar socio={avatarSocio} size="md" />

                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-sm font-black text-slate-900 truncate leading-tight">{pName}</p>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider mt-1 ${meta.text}`}>
                      <RoleIcon size={10} /> {pRole}
                    </span>
                  </div>

                  {/* Payment badge */}
                  <div className="flex flex-col items-end justify-center w-24 flex-shrink-0">
                    <span className={`text-sm font-black tabular-nums ${isPaid ? "text-emerald-600" : "text-slate-800"}`}>
                      {formatCurrency(p.payment)}
                    </span>
                    <motion.span
                      key={p.payment_status}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest ${isPaid ? "text-emerald-600" : "text-amber-600"}`}
                    >
                      {isPaid ? <CheckCircle2 size={9} /> : <Clock size={9} />}
                      {isPaid ? "Pagado" : "Pendiente"}
                    </motion.span>
                  </div>

                  {/* Actions cluster with fixed alignment */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Toggle payment */}
                    <motion.button
                      whileHover={{ scale: 1.12 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleTogglePayment(p.socio_id)}
                      title={isPaid ? "Marcar pendiente" : "Marcar pagado"}
                      data-testid={`toggle-payment-${p.socio_id}`}
                      className={`relative w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${isPaid ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30" : "bg-white/70 text-amber-500 border border-amber-200/70 hover:bg-amber-50"}`}
                    >
                      {isPaid ? <CheckCircle2 size={14} /> : <Zap size={14} />}
                      {!isPaid && (
                        <motion.span
                          aria-hidden
                          className="absolute inset-0 rounded-xl border-2 border-amber-400/50"
                          animate={{ opacity: [0.2, 0.8, 0.2], scale: [1, 1.12, 1] }}
                          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                        />
                      )}
                    </motion.button>

                    {/* Remove */}
                    <motion.button
                      whileHover={{ scale: 1.12, rotate: 90 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleRemove(p.socio_id)}
                      className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors opacity-60 group-hover:opacity-100"
                      data-testid={`remove-partner-${p.socio_id}`}
                    >
                      <X size={13} />
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="relative mb-5 rounded-2xl border-2 border-dashed border-violet-200/70 bg-gradient-to-br from-violet-50/50 to-fuchsia-50/40 p-6 text-center"
            data-testid="empty-team-state"
          >
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
              className="w-12 h-12 rounded-2xl bg-white/70 border border-violet-100 mx-auto flex items-center justify-center mb-3 shadow-sm"
            >
              <UserPlus size={18} className="text-violet-500" />
            </motion.div>
            <p className="text-sm font-black text-slate-700">Sin equipo asignado</p>
            <p className="text-[11px] text-slate-500 mt-1">Selecciona un socio arriba para empezar</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Financial dashboard */}
      <div className="relative">
        {/* Team payment progress */}
        {teamCost > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, ease: easeOut }}
            className="rounded-2xl bg-white/50 backdrop-blur-sm border border-white/70 p-3.5"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest inline-flex items-center gap-1.5">
                <Wallet size={11} className="text-fuchsia-500" /> Pagos al equipo
              </span>
              <span className="text-[10px] font-black text-slate-700">
                {formatCurrency(paidToTeam)} <span className="text-slate-400">/</span> {formatCurrency(teamCost)}
              </span>
            </div>
            <div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, teamPaidPct)}%` }}
                transition={{ duration: 1, ease: easeOut, delay: 0.3 }}
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ background: "linear-gradient(90deg, #10b981, #14b8a6, #06b6d4)" }}
              />
              <motion.div
                aria-hidden
                className="absolute inset-y-0 w-16 pointer-events-none"
                initial={{ x: "-30%" }}
                animate={{ x: "180%" }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.6 }}
                style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)" }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-600">
                <CheckCircle2 size={10} /> {Math.round(teamPaidPct)}% pagado
              </span>
              {pendingToTeam > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-600">
                  <Clock size={10} /> {formatCurrency(pendingToTeam)} pendiente
                </span>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function StatPill({ icon: Icon, label, value, grad, iconGrad, valueClass, delay = 0, emphasis, testid }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, ease: easeOut }}
      whileHover={{ y: -3 }}
      className={`relative rounded-2xl p-3 bg-gradient-to-br ${grad} border border-white/70 overflow-hidden ${emphasis ? "ring-1 ring-white shadow-md" : ""}`}
    >
      <div className={`w-7 h-7 rounded-xl bg-gradient-to-br ${iconGrad} flex items-center justify-center shadow-sm mb-2`}>
        <Icon size={13} className="text-white" />
      </div>
      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest truncate">{label}</p>
      <p
        className={`text-sm font-black ${valueClass} leading-tight truncate mt-0.5`}
        style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
        data-testid={testid}
        title={value}
      >
        {value}
      </p>
    </motion.div>
  );
}
