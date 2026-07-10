import { NavLink } from "react-router-dom";
import { LayoutDashboard, CalendarDays, List, Menu, X, SlidersHorizontal, Users, Database, Palette, RefreshCw, ArrowRight, Target } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSettings } from "@/context/SettingsContext";
import WelcomeTour from "@/components/WelcomeTour";
import SectionUnlockModal from "@/components/SectionUnlockModal";
import GithubUpdateNotifier from "@/components/GithubUpdateNotifier";
import FloatingDecor from "@/components/FloatingDecor";
import { useAdvancedSecurity } from "@/hooks/useAdvancedSecurity";

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { tr, preset, logoUrl, logoSize, logoHidden, sidebarCompact, iconSize, sidebarStyle, islandMargins, navConfig } = useSettings();
  const sidebarLogoH = Math.min(Math.max(logoSize || 40, 24), 80);

  // Sidebar sweep (barrido de luz al crear reserva/socio/etc)
  const [sweep, setSweep] = useState(null);
  useEffect(() => {
    const handler = (e) => {
      const color = e.detail?.color || "purple";
      setSweep({ color, ts: Date.now() });
      setTimeout(() => setSweep(null), 1300);
    };
    window.addEventListener("cp:sidebar-sweep", handler);
    return () => window.removeEventListener("cp:sidebar-sweep", handler);
  }, []);

  const sweepGradient = {
    purple:  "linear-gradient(180deg, transparent 0%, rgba(139,92,246,0) 30%, rgba(167,139,250,0.85) 50%, rgba(139,92,246,0) 70%, transparent 100%)",
    emerald: "linear-gradient(180deg, transparent 0%, rgba(16,185,129,0) 30%, rgba(52,211,153,0.85) 50%, rgba(16,185,129,0) 70%, transparent 100%)",
    blue:    "linear-gradient(180deg, transparent 0%, rgba(59,130,246,0) 30%, rgba(96,165,250,0.85) 50%, rgba(59,130,246,0) 70%, transparent 100%)",
    amber:   "linear-gradient(180deg, transparent 0%, rgba(245,158,11,0) 30%, rgba(251,191,36,0.85) 50%, rgba(245,158,11,0) 70%, transparent 100%)",
  };

  // Advanced security (auto-lock + section lock)
  const { sectionLock, unlockSection, cancelSectionLock } = useAdvancedSecurity();

  // "island" always uses islandMargins for margins; no pill style
  const compact = sidebarCompact;

  // Icon size mapping
  const iconPx = iconSize === "small" ? 14 : iconSize === "large" ? 22 : 18;
  const iconPxInline = iconSize === "small" ? 12 : iconSize === "large" ? 20 : 16;

  const { top: mTop, bottom: mBottom, side: mSide } = islandMargins || { top: 14, bottom: 14, side: 14 };
  const sidebarWidth = compact ? "72px" : "240px";

  // Per-style inline overrides
  const styleMap = {
    normal:     {},
    floating: {
      margin: "12px 0 12px 12px",
      borderRadius: "20px",
      minHeight: "calc(100vh - 24px)",
      height: "calc(100vh - 24px)",
      boxShadow: "0 20px 60px rgba(31,38,135,0.14), 0 4px 16px rgba(0,0,0,0.06)",
    },
    borderless: {
      borderRight: "none",
      boxShadow: "none",
      background: "transparent",
      backdropFilter: "none",
    },
    island: {
      top: `${mTop}px`,
      bottom: `${mBottom}px`,
      left: `${mSide}px`,
      height: "auto",
      minHeight: "auto",
      borderRadius: "28px",
      boxShadow: "0 32px 80px rgba(31,38,135,0.22), 0 8px 30px rgba(0,0,0,0.1)",
      background: "rgba(255,255,255,0.88)",
      backdropFilter: "blur(28px) saturate(180%)",
    },
    minimal: {
      background: "rgba(255,255,255,0.18)",
      borderRight: "1px solid rgba(255,255,255,0.22)",
      boxShadow: "none",
      backdropFilter: "blur(6px)",
    },
  };

  const sidebarExtra = styleMap[sidebarStyle] || {};
  const mainMarginLeft = ["floating", "island"].includes(sidebarStyle)
    ? `calc(${sidebarWidth} + ${sidebarStyle === "island" ? mSide + 12 : 14}px)`
    : sidebarWidth;

  const NAV_DEFS = {
    "/dashboard":       { label: tr.nav.dashboard,                   icon: LayoutDashboard,    tile: "linear-gradient(135deg,#818cf8,#6366f1)" },
    "/calendario":      { label: tr.nav.reservations,                icon: CalendarDays,       tile: "linear-gradient(135deg,#34d399,#059669)" },
    "/socios":          { label: tr.nav.socios || "Socios",          icon: Users,              tile: "linear-gradient(135deg,#f472b6,#db2777)" },
    "/metas":           { label: tr.nav.metas || "Metas",            icon: Target,             tile: "linear-gradient(135deg,#fbbf24,#f59e0b)" },
    "/base-de-datos":   { label: tr.nav.database || "Base de Datos", icon: Database,           tile: "linear-gradient(135deg,#22d3ee,#0891b2)" },
    "/apariencia":      { label: tr.nav.appearance || "Apariencia",  icon: Palette,            tile: "linear-gradient(135deg,#a78bfa,#7c3aed)" },
    "/ajustes":         { label: tr.nav.settings,                    icon: SlidersHorizontal,  tile: "linear-gradient(135deg,#94a3b8,#475569)" },
    "/actualizaciones": { label: "Actualizaciones",                  icon: RefreshCw,          tile: "linear-gradient(135deg,#fb7185,#e11d48)" },
  };
  const navItems = (navConfig || Object.keys(NAV_DEFS).map(p => ({ path: p, custom: "" })))
    .map(c => NAV_DEFS[c.path] ? { path: c.path, label: c.custom || NAV_DEFS[c.path].label, icon: NAV_DEFS[c.path].icon, tile: NAV_DEFS[c.path].tile } : null)
    .filter(Boolean);

  return (
    <div className="flex min-h-screen" style={{ position: "relative", zIndex: 1 }}>
      <FloatingDecor />
      <GithubUpdateNotifier />
      <WelcomeTour />
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col min-h-screen glass-sidebar fixed left-0 top-0 z-20 transition-all duration-300 overflow-hidden"
        style={{ width: sidebarWidth, ...sidebarExtra }}
      >
        {/* Aurora animada de fondo — efecto WOW continuo */}
        <div className="sidebar-aurora" aria-hidden="true">
          <span className="orb orb-1" />
          <span className="orb orb-2" />
          <span className="orb orb-3" />
        </div>
        {/* Sweep overlay — barrido de luz épico */}
        <AnimatePresence>
          {sweep && (
            <motion.div
              key={sweep.ts}
              initial={{ y: "-100%", opacity: 0 }}
              animate={{ y: "100%", opacity: [0, 1, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
              className="pointer-events-none absolute inset-0 z-40"
              style={{
                background: sweepGradient[sweep.color] || sweepGradient.purple,
                mixBlendMode: "screen",
                filter: "blur(6px)",
              }}
            />
          )}
        </AnimatePresence>
        {/* Halo lateral pulsante */}
        <AnimatePresence>
          {sweep && (
            <motion.div
              key={`halo-${sweep.ts}`}
              initial={{ opacity: 0, boxShadow: "inset 0 0 0px rgba(255,255,255,0)" }}
              animate={{ opacity: [0, 1, 0], boxShadow: [
                "inset 0 0 0px rgba(255,255,255,0)",
                "inset 0 0 60px rgba(255,255,255,0.35)",
                "inset 0 0 0px rgba(255,255,255,0)"
              ]}}
              transition={{ duration: 1.2 }}
              className="pointer-events-none absolute inset-0 z-40"
            />
          )}
        </AnimatePresence>

        {/* Logo area */}
        {!logoHidden && (
          <div className={`relative z-10 border-b border-white/40 transition-all duration-300 ${compact ? "px-3 py-5 flex justify-center" : "px-6 py-6 flex justify-center"}`}>
            {compact ? (
              <div className="w-9 h-9 rounded-xl btn-primary flex items-center justify-center text-white font-black text-base">
                C
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <img
                  src={logoUrl || "/logo.png"}
                  alt="Cinema Productions"
                  className="w-auto rounded-xl object-contain"
                  style={{ height: `${sidebarLogoH}px`, maxWidth: "140px" }}
                />
              </div>
            )}
          </div>
        )}

        <nav className={`relative z-10 flex-1 py-5 space-y-1.5 transition-all duration-300 ${compact ? "px-2" : "px-3"}`}>
          {navItems.map(({ path, label, icon: Icon, tile }, idx) => (
            <motion.div
              key={path}
              initial={{ opacity: 0, x: -18, filter: "blur(6px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.05 + idx * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
            <NavLink
              to={path}
              data-testid={`nav-${path.replace("/", "")}`}
              title={compact ? label : undefined}
              className={({ isActive }) =>
                `menu-item-anim group relative flex items-center gap-3 py-2 rounded-2xl text-sm font-semibold overflow-hidden transition-all duration-300 ${
                  compact ? "px-0 justify-center" : "px-3"
                } ${
                  isActive ? "nav-active is-active menu-item-active-glow" : "text-slate-600 hover:bg-white/50 hover:text-slate-900"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Halo animado en el ítem activo */}
                  {isActive && (
                    <motion.span
                      layoutId="nav-highlight"
                      className="absolute inset-0 rounded-2xl pointer-events-none"
                      style={{ background: "radial-gradient(circle at 30% 50%, rgba(255,255,255,0.35) 0%, transparent 60%)" }}
                      transition={{ type: "spring", damping: 22, stiffness: 260 }}
                    />
                  )}

                  {/* Icono en tile de vidrio con color de acento (glassmorphism) */}
                  <motion.span
                    className="nav-tile relative flex-shrink-0 flex items-center justify-center"
                    style={{
                      "--tile": tile,
                      width: compact ? 38 : 34,
                      height: compact ? 38 : 34,
                    }}
                    data-active={isActive ? "true" : "false"}
                    animate={isActive ? { y: [0, -2, 0] } : { y: 0 }}
                    transition={isActive ? { duration: 2.6, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
                    whileHover={{ scale: 1.12, rotate: -4 }}
                  >
                    <Icon size={compact ? iconPx : iconPxInline} strokeWidth={isActive ? 2.4 : 2} />
                    {/* Punto pulsante para el ítem activo */}
                    {isActive && !compact && (
                      <motion.span
                        className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400"
                        animate={{ scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        style={{ boxShadow: "0 0 8px rgba(52, 211, 153, 0.9)" }}
                      />
                    )}
                  </motion.span>

                  {!compact && (
                    <motion.span
                      className="sidebar-compact-label relative z-10"
                      animate={isActive ? { x: [0, 2, 0] } : { x: 0 }}
                      transition={isActive ? { duration: 3, repeat: Infinity, ease: "easeInOut" } : { duration: 0.2 }}
                    >
                      {label}
                    </motion.span>
                  )}

                  {/* Flecha que aparece al hover */}
                  {!compact && !isActive && (
                    <motion.span
                      className="ml-auto opacity-0 group-hover:opacity-100"
                      initial={{ x: -6 }}
                      whileHover={{ x: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ArrowRight size={13} className="text-slate-400" />
                    </motion.span>
                  )}
                </>
              )}
            </NavLink>
            </motion.div>
          ))}
        </nav>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 glass border-b border-white/50">
        <div className="flex items-center justify-between px-5 py-4">
          {!logoHidden ? (
            <div className="flex items-center gap-2.5">
              <img
                src={logoUrl || "/logo.png"}
                alt="Cinema Productions"
                className="w-auto rounded-lg object-contain"
                style={{ height: "28px", maxWidth: "90px" }}
              />
            </div>
          ) : <div />}
          <button onClick={() => setMobileOpen(!mobileOpen)} data-testid="mobile-menu-toggle" className="p-2 rounded-2xl text-slate-600 hover:bg-white/50 transition-all">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="md:hidden fixed inset-0 z-20 glass-strong pt-16">
            <nav className="px-4 py-4 space-y-1.5">
              {navItems.map(({ path, label, icon: Icon, tile }, idx) => (
                <motion.div
                  key={path}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.35 }}
                >
                <NavLink to={path} onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 ${isActive ? "nav-active" : "text-slate-600 hover:bg-white/60"}`}
                >
                  {({ isActive }) => (
                    <>
                      <span className="nav-tile flex items-center justify-center flex-shrink-0" style={{ "--tile": tile, width: 36, height: 36 }} data-active={isActive ? "true" : "false"}>
                        <Icon size={18} strokeWidth={2} />
                      </span>
                      {label}
                    </>
                  )}
                </NavLink>
                </motion.div>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <main
        className="flex-1 min-h-screen transition-all duration-300"
        style={{ marginLeft: mainMarginLeft, position: "relative", zIndex: 10 }}
      >
        <div className="pt-16 md:pt-0 min-h-screen">{children}</div>
      </main>

      {/* Modal de desbloqueo por sección */}
      <SectionUnlockModal
        sectionLock={sectionLock}
        onUnlock={unlockSection}
        onCancel={cancelSectionLock}
      />
    </div>
  );
}
