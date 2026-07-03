import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Download, Globe, DollarSign,
  Bell, BellRing, Database, CheckCircle, XCircle, RefreshCw,
  Wifi, WifiOff, MessageCircle, Mail, Loader2, Monitor,
  Package, AlertCircle, Zap, Clock, ChevronDown,
  Github, GitBranch, GitCommit, AlertTriangle, ArrowDownCircle, ExternalLink, CheckCircle2,
} from "lucide-react";
import { useSettings, CURRENCIES } from "@/context/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import { getAppSettings, updateAppSettings, getDbStats, testDbConnection, switchDatabase, resetDatabase, sendTestReminder, testEmailConnection, getBackupHistory, createServerBackup, deleteBackupFile, downloadBackupUrl, restoreBackup, getGithubConfig, saveGithubConfig, checkGithubUpdates, applyGithubUpdate } from "@/lib/api";
import { celebrateUpdate } from "@/lib/celebrations";
import { useNotifications } from "@/hooks/useNotifications";
import { Section, SectionSearchBar } from "@/components/appearance/SectionShell";
import { SectionSearchContext } from "@/lib/sectionSearch";
import { SecuritySection } from "@/components/SecuritySection";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };

function StatCard({ label, value }) {
  return (
    <div className="bg-white/60 rounded-2xl p-3 text-center">
      <div className="text-base font-black text-slate-800" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>{value}</div>
      <div className="text-[11px] text-slate-400 font-semibold mt-0.5">{label}</div>
    </div>
  );
}

// WhatsApp link generator
function buildWhatsappLink(phone, events) {
  const clean = (phone || "").replace(/\D/g, "");
  if (!clean) return null;
  const text = events && events.length > 0
    ? `Hola! Recordatorio de Cinema Productions:\n${events.map(e => `• ${e.client_name} — ${e.event_type} el ${e.event_date}`).join("\n")}`
    : "Hola! Recordatorio de Cinema Productions: Tienes eventos próximos.";
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}

export default function Settings() {
  const [searchQuery, setSearchQuery] = useState("");
  const { language, currency, tr, changeLanguage, changeCurrency } = useSettings();
  const { requestPermission, showNotification, startPolling } = useNotifications();
  const { toast } = useToast();
  const s = tr.settings;

  // Notification + Business settings state
  const [notif, setNotif] = useState({    reminders_enabled: false,
    reminder_periods: [3],
    reminder_time: "09:00",
    reminder_hours_before: 0,
    admin_email: "",
    admin_whatsapp: "",
    notification_channel: "email",
    resend_api_key: "",
    telegram_enabled: false,
    telegram_bot_token: "",
    telegram_chat_id: "",
    ntfy_enabled: false,
    ntfy_topic: "",
    // Business config
    company_name: "",
    company_address: "",
    company_phone: "",
    company_website: "",
    company_tax_id: "",
    timezone: "America/Guatemala",
    default_advance_pct: 30,
    business_hours_start: "08:00",
    business_hours_end: "22:00",
    backup_retention: 10,
    auto_cleanup_months: "",
  });
  const [notifLoading, setNotifLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [telegramTestLoading, setTelegramTestLoading] = useState(false);
  const [ntfyTestLoading, setNtfyTestLoading] = useState(false);

  // Desktop download state
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [buildStatus, setBuildStatus] = useState({ status: "idle", message: "" });
  const [buildPolling, setBuildPolling] = useState(false);

  // ── GitHub updates state (App de Escritorio) ─────────────────
  const [ghConfig, setGhConfig] = useState({ repo_url: "", branch: "main", is_configured: false, suggested_repo: "" });
  const [ghDraft, setGhDraft] = useState({ repo_url: "", branch: "main", token: "" });
  const [ghSaving, setGhSaving] = useState(false);
  const [ghChecking, setGhChecking] = useState(false);
  const [ghApplying, setGhApplying] = useState(false);
  const [ghResult, setGhResult] = useState(null);
  const [ghAutoCheck, setGhAutoCheck] = useState(true);

  const loadGhConfig = React.useCallback(async () => {
    try {
      const cfg = await getGithubConfig();
      setGhConfig(cfg);
      // Precargar el draft con lo que hay (o con el sugerido si no hay nada guardado)
      setGhDraft({
        repo_url: cfg.repo_url || cfg.suggested_repo || "",
        branch: cfg.branch || "main",
        token: "",
      });
    } catch { /* noop */ }
  }, []);

  useEffect(() => { loadGhConfig(); }, [loadGhConfig]);

  const handleGhCheck = async (silent = false) => {
    setGhChecking(true);
    setGhResult(null);
    try {
      const res = await checkGithubUpdates();
      setGhResult(res);
      if (!silent) {
        if (res.has_updates) {
          toast({ title: `¡${res.commits_ahead} actualización(es) disponible(s)!`, description: `Rama: ${res.branch}` });
        } else {
          toast({ title: "Todo al día ✓", description: "No hay actualizaciones nuevas en GitHub" });
        }
      }
    } catch (err) {
      if (!silent) toast({ title: "Error al buscar", description: err?.response?.data?.detail || String(err), variant: "destructive" });
    } finally {
      setGhChecking(false);
    }
  };

  const handleGhApply = async () => {
    if (!window.confirm("¿Aplicar la actualización desde GitHub?\n\nEsto sobreescribirá cambios locales y reiniciará los servicios.")) return;
    setGhApplying(true);
    try {
      const res = await applyGithubUpdate(true);
      toast({ title: "🎉 ¡Actualización aplicada!", description: `Nuevo commit: ${res.new_sha_short}. Reiniciando…` });
      celebrateUpdate();
      setTimeout(() => window.location.reload(), 5000);
    } catch (err) {
      toast({ title: "Error al aplicar", description: err?.response?.data?.detail || String(err), variant: "destructive" });
    } finally {
      setGhApplying(false);
    }
  };

  const handleGhSaveRepo = async () => {
    const url = ghDraft.repo_url.trim();
    if (!url) {
      toast({ title: language === "es" ? "Ingresa una URL de GitHub válida" : "Enter a valid GitHub URL", variant: "destructive" });
      return;
    }
    if (!/^https?:\/\/github\.com\/[^/]+\/[^/]+/.test(url)) {
      toast({ title: language === "es" ? "URL inválida" : "Invalid URL", description: language === "es" ? "Formato: https://github.com/usuario/repositorio" : "Format: https://github.com/user/repo", variant: "destructive" });
      return;
    }
    setGhSaving(true);
    try {
      await saveGithubConfig({
        repo_url: url,
        branch: (ghDraft.branch || "main").trim(),
        token: ghDraft.token || undefined,
      });
      toast({ title: language === "es" ? "Repositorio guardado ✓" : "Repository saved ✓" });
      await loadGhConfig();
      // Reset del resultado previo para que el usuario deba refrescar
      setGhResult(null);
    } catch (err) {
      const detail = err?.response?.data?.detail || String(err);
      toast({ title: language === "es" ? "Error al guardar" : "Save error", description: detail, variant: "destructive" });
    } finally {
      setGhSaving(false);
    }
  };

  // Auto-check GitHub al abrir Ajustes (una vez, si hay repo configurado)
  useEffect(() => {
    if (ghAutoCheck && ghConfig.is_configured) {
      handleGhCheck(true);
      setGhAutoCheck(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ghConfig.is_configured]);

  // Deployment / hosting state
  const [deployUrl,        setDeployUrl]        = useState("");
  const [healthLoading,    setHealthLoading]     = useState(false);
  const [healthResult,     setHealthResult]      = useState(null);
  const [expandedPlatform, setExpandedPlatform]  = useState(null);

  // ── Email test ───────────────────────────────────────────────────
  const [emailTestLoading, setEmailTestLoading] = useState(false);
  const [emailTestResult, setEmailTestResult]   = useState(null);

  // ── Timezone sync ─────────────────────────────────────────────────
  const [timezoneMsg, setTimezoneMsg] = useState(null);

  const handleSyncTimezone = () => {
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setNotif(p => ({ ...p, timezone: detected }));
      setTimezoneMsg({ ok: true, tz: detected });
      toast({ title: `Zona horaria sincronizada: ${detected}` });
    } catch {
      setTimezoneMsg({ ok: false });
      toast({ title: "No se pudo detectar la zona horaria", variant: "destructive" });
    }
  };

  const handleTestEmail = async () => {
    setEmailTestLoading(true);
    setEmailTestResult(null);
    try {
      const res = await testEmailConnection();
      setEmailTestResult({ ok: true, msg: res.message });
      toast({ title: "✓ " + res.message });
    } catch (e) {
      const msg = e.response?.data?.detail || "Error al enviar email de prueba";
      setEmailTestResult({ ok: false, msg });
      toast({ title: msg, variant: "destructive" });
    } finally { setEmailTestLoading(false); }
  };

  // DB state
  const [dbStats, setDbStats] = useState(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [newDbUrl, setNewDbUrl] = useState("");
  const [dbTestResult, setDbTestResult] = useState(null);
  const [dbConnecting, setDbConnecting] = useState(false);
  const [dbTesting, setDbTesting] = useState(false);
  const [dbResetting, setDbResetting] = useState(false);

  // Backup state
  const [backupHistory, setBackupHistory] = useState([]);
  const [backupCreating, setBackupCreating] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreResult, setRestoreResult] = useState(null);
  const restoreInputRef = React.useRef(null);

  useEffect(() => {
    getAppSettings().then(data => {
      if (data && Object.keys(data).length > 0) {
        setNotif(prev => ({
          ...prev,
          reminders_enabled: data.reminders_enabled ?? false,
          reminder_periods: data.reminder_periods ?? [data.reminder_days ?? 3],
          reminder_time: data.reminder_time ?? "09:00",
          reminder_hours_before: data.reminder_hours_before ?? 0,
          admin_email: data.admin_email ?? "",
          admin_whatsapp: data.admin_whatsapp ?? "",
          notification_channel: data.notification_channel ?? "email",
          resend_api_key: data.has_resend_key ? "re_" + "•".repeat(20) + "••••" : "",
          telegram_enabled: data.telegram_enabled ?? false,
          telegram_bot_token: data.has_telegram_token ? "•".repeat(8) + "•".repeat(20) + "••••" : "",
          telegram_chat_id: data.telegram_chat_id ?? "",
          ntfy_enabled: data.ntfy_enabled ?? false,
          ntfy_topic: data.ntfy_topic ?? "",
          // Business config
          company_name: data.company_name ?? "",
          company_address: data.company_address ?? "",
          company_phone: data.company_phone ?? "",
          company_website: data.company_website ?? "",
          company_tax_id: data.company_tax_id ?? "",
          timezone: data.timezone ?? "America/Guatemala",
          default_advance_pct: data.default_advance_pct ?? 30,
          business_hours_start: data.business_hours_start ?? "08:00",
          business_hours_end: data.business_hours_end ?? "22:00",
          backup_retention: data.backup_retention ?? 10,
          auto_cleanup_months: data.auto_cleanup_months ?? "",
        }));
      }
    }).catch(() => {});
    loadDbStats();
  }, []);

  // Build status polling
  useEffect(() => {
    if (!buildPolling) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/download/package/build-status`);
        const data = await res.json();
        setBuildStatus(data);
        if (data.status === "ready" || data.status === "error") {
          setBuildPolling(false);
          clearInterval(interval);
          if (data.status === "ready") toast({ title: "App actualizada ✓ — Ya puedes descargarla" });
          else toast({ title: data.message || "Error al compilar", variant: "destructive" });
        }
      } catch { /* ignore network errors during polling */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [buildPolling]);

  const handleRebuild = async () => {
    setBuildStatus({ status: "building", message: "Iniciando compilación…" });
    setBuildPolling(false);
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/download/package/rebuild`, { method: "POST" });
      const data = await res.json();
      setBuildStatus(data);
      if (data.status === "building") {
        setBuildPolling(true);
        toast({ title: "Compilando app… espera 1-3 minutos" });
      }
    } catch {
      setBuildStatus({ status: "error", message: "Error al iniciar compilación" });
      toast({ title: "Error al iniciar compilación", variant: "destructive" });
    }
  };

  const loadDbStats = () => {
    setDbLoading(true);
    getDbStats()
      .then(setDbStats)
      .catch(() => setDbStats(null))
      .finally(() => setDbLoading(false));
  };

  // ── Backup handlers ─────────────────────────────────────────
  const loadBackupHistory = () => {
    getBackupHistory()
      .then(setBackupHistory)
      .catch(() => setBackupHistory([]));
  };

  const handleDownloadBackup = () => {
    const url = downloadBackupUrl();
    const a = document.createElement("a");
    a.href = url;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast({ title: "Descargando respaldo completo..." });
  };

  const handleCreateServerBackup = async () => {
    setBackupCreating(true);
    try {
      const res = await createServerBackup();
      toast({ title: res.message || "Respaldo guardado en servidor" });
      loadBackupHistory();
    } catch (e) {
      toast({ title: e.response?.data?.detail || "Error al crear respaldo", variant: "destructive" });
    } finally {
      setBackupCreating(false);
    }
  };

  const handleRestoreFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreLoading(true);
    setRestoreResult(null);
    try {
      const res = await restoreBackup(file);
      setRestoreResult({ ok: true, msg: res.message });
      toast({ title: res.message });
      loadDbStats();
      loadBackupHistory();
    } catch (err) {
      const msg = err.response?.data?.detail || "Error al restaurar";
      setRestoreResult({ ok: false, msg });
      toast({ title: msg, variant: "destructive" });
    } finally {
      setRestoreLoading(false);
      if (restoreInputRef.current) restoreInputRef.current.value = "";
    }
  };

  const handleDeleteBackup = async (filename) => {
    try {
      await deleteBackupFile(filename);
      setBackupHistory(prev => prev.filter(b => b.filename !== filename));
      toast({ title: "Respaldo eliminado" });
    } catch {
      toast({ title: "Error al eliminar respaldo", variant: "destructive" });
    }
  };

  const handleDownloadPackage = async () => {
    setDownloadLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/download/package`);
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.detail || "Error al generar el paquete");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cinema-productions-local.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: "Paquete descargado ✓ — Extrae el .zip y ejecuta start.bat" });
    } catch (err) {
      toast({ title: err.message || "Error al descargar", variant: "destructive" });
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/export/reservations?format=${format}`);
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = format === "json" ? "reservaciones.json" : "reservaciones.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast({ title: "Descarga iniciada ✓" });
    } catch {
      toast({ title: "Error al exportar", variant: "destructive" });
    }
  };

  const handleSaveNotif = async () => {
    setNotifLoading(true);
    try {
      const payload = { ...notif };
      // If key looks like masked dots, don't send it (keep existing)
      if (payload.resend_api_key && payload.resend_api_key.includes("•")) {
        delete payload.resend_api_key;
      }
      // Convert empty string to null for optional integer fields
      if (payload.auto_cleanup_months === "" || payload.auto_cleanup_months === undefined) {
        payload.auto_cleanup_months = null;
      }
      await updateAppSettings(payload);
      // Persist reminder settings to localStorage so the hook can read them
      localStorage.setItem("cp_reminder_time", notif.reminder_time || "09:00");
      localStorage.setItem("cp_reminder_days", String(notif.reminder_days || 3));
      // Restart notification polling if reminders are enabled
      if (Notification.permission === "granted" && notif.reminders_enabled) {
        startPolling();
      }
      toast({ title: s.notifSaved + " ✓" });
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally {
      setNotifLoading(false);
    }
  };

  const handleTestReminder = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await sendTestReminder();
      const msg = res.message || s.notifTestSent;
      setTestResult({ ok: true, msg, events: res.events_found });
      toast({ title: msg });
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || "Error al enviar";
      setTestResult({ ok: false, msg });
      toast({ title: msg, variant: "destructive" });
    } finally {
      setTestLoading(false);
    }
  };

  const handleTelegramTest = async () => {
    setTelegramTestLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/telegram/test`, { method: "POST" });
      const data = await res.json();
      if (data.ok) toast({ title: data.message || "Mensaje enviado a Telegram ✓" });
      else toast({ title: data.error || "Error al enviar a Telegram", variant: "destructive" });
    } catch (e) {
      toast({ title: e.message || "Error al enviar a Telegram", variant: "destructive" });
    } finally {
      setTelegramTestLoading(false);
    }
  };

  const handleNtfyTest = async () => {
    setNtfyTestLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/ntfy/test`, { method: "POST" });
      const data = await res.json();
      if (data.ok) toast({ title: data.message || "Notificación enviada vía ntfy ✓" });
      else toast({ title: data.error || "Error al enviar ntfy", variant: "destructive" });
    } catch (e) {
      toast({ title: e.message || "Error al enviar ntfy", variant: "destructive" });
    } finally {
      setNtfyTestLoading(false);
    }
  };

  const handleDbTest = async () => {
    if (!newDbUrl.trim()) return;
    setDbTesting(true);
    setDbTestResult(null);
    try {
      await testDbConnection(newDbUrl.trim());
      setDbTestResult({ ok: true, msg: s.dbTestOk });
      toast({ title: s.dbTestOk + " ✓" });
    } catch (err) {
      const msg = err.response?.data?.detail || "Error de conexión";
      setDbTestResult({ ok: false, msg });
      toast({ title: msg, variant: "destructive" });
    } finally {
      setDbTesting(false);
    }
  };

  const handleDbConnect = async () => {
    if (!newDbUrl.trim()) return;
    setDbConnecting(true);
    try {
      await switchDatabase(newDbUrl.trim());
      toast({ title: s.dbConnectOk + " ✓" });
      setNewDbUrl("");
      setDbTestResult(null);
      setTimeout(loadDbStats, 500);
    } catch (err) {
      const msg = err.response?.data?.detail || "Error al conectar";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setDbConnecting(false);
    }
  };

  const handleDbReset = async () => {
    setDbResetting(true);
    try {
      await resetDatabase();
      toast({ title: s.dbResetOk + " ✓" });
      setNewDbUrl("");
      setDbTestResult(null);
      setTimeout(loadDbStats, 500);
    } catch (err) {
      const msg = err.response?.data?.detail || "Error al restaurar";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setDbResetting(false);
    }
  };

  // ── System Notifications ──────────────────────────────────────
  const [notifPermission, setNotifPermission] = useState(() =>
    (typeof window !== "undefined" && "Notification" in window) ? Notification.permission : "unsupported"
  );
  const [immediateLoading, setImmediateLoading] = useState(false);

  const handleRequestPermission = async () => {
    if (!("Notification" in window)) {
      toast({ title: language === "es" ? "Tu navegador no soporta notificaciones" : "Browser does not support notifications", variant: "destructive" });
      return;
    }
    try {
      const result = await requestPermission();
      setNotifPermission(result);
      if (result === "granted") {
        localStorage.setItem("cp_notif_enabled", "true");
        localStorage.setItem("cp_reminder_time", notif.reminder_time || "09:00");
        localStorage.setItem("cp_reminder_days", String(notif.reminder_days || 3));
        toast({ title: language === "es" ? "Notificaciones de escritorio activadas ✓" : "Desktop notifications enabled ✓" });
      } else {
        toast({ title: language === "es" ? "Permiso denegado" : "Permission denied", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error al solicitar permiso", variant: "destructive" });
    }
  };

  const handleTestSystemNotif = () => {
    if (Notification.permission !== "granted") return;
    showNotification(
      "Cinema Productions — Prueba ✓",
      language === "es" ? "Las notificaciones de escritorio están funcionando." : "Desktop notifications are working.",
    );
    toast({ title: language === "es" ? "Notificación de prueba enviada ✓" : "Test notification sent ✓" });
  };

  const handleNotifyImmediate = async () => {
    if (Notification.permission !== "granted") {
      toast({ title: language === "es" ? "Primero activa las notificaciones del escritorio" : "Enable desktop notifications first", variant: "destructive" });
      return;
    }
    setImmediateLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/push/test`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        toast({ title: language === "es" ? `Push enviado a ${data.sent_to} dispositivo(s) ✓` : `Push sent to ${data.sent_to} device(s) ✓` });
      } else {
        toast({ title: "Error al enviar push", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error al conectar con el servidor", variant: "destructive" });
    } finally {
      setImmediateLoading(false);
    }
  };

  // ── Clear All Data ───────────────────────────────────────────
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearLoading, setClearLoading] = useState(false);

  const handleClearAll = async () => {
    setClearLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/data/clear-all`, { method: "DELETE" });
      const data = await res.json();
      setShowClearConfirm(false);
      toast({ title: `✓ Datos eliminados — ${data.deleted_reservations} reservas, ${data.deleted_socios} socios` });
    } catch {
      toast({ title: "Error al borrar los datos", variant: "destructive" });
    } finally {
      setClearLoading(false);
    }
  };

  const channels = [
    { value: "email", label: "Email", icon: Mail },
    { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
    { value: "both", label: language === "es" ? "Ambos" : "Both", icon: Bell },
  ];

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
        <h1 className="text-5xl font-black gradient-text tracking-tight" style={{ fontFamily: 'Cabinet Grotesk, sans-serif' }}>{s.title}</h1>
        <p className="text-sm text-slate-500 font-medium mt-1.5">{s.subtitle}</p>
      </motion.div>

      <SectionSearchBar
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder={language === "es" ? "Buscar función… (ej: idioma, recordatorio, escritorio)" : "Search feature… (e.g. language, reminder, desktop)"}
        testId="settings-search-input"
      />

      <SectionSearchContext.Provider value={searchQuery}>
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">

        {/* Language */}
        <Section icon={Globe} title={s.langTitle} desc={s.langDesc}>
          <div className="flex gap-3">
            {[{ code: "es", flag: "🇬🇹", label: "Español" }, { code: "en", flag: "🇺🇸", label: "English" }].map(l => (
              <motion.button key={l.code} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => changeLanguage(l.code)} data-testid={`lang-${l.code}`}
                className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-bold transition-all flex-1 justify-center ${language === l.code ? "btn-primary text-white" : "glass border-white/60 text-slate-600 hover:bg-white/50"}`}>
                <span className="text-base">{l.flag}</span> {l.label}
                {language === l.code && <span className="text-[10px] opacity-70 ml-1">✓</span>}
              </motion.button>
            ))}
          </div>
        </Section>

        {/* Currency */}
        <Section icon={DollarSign} title={s.currencyTitle} desc={s.currencyDesc}>
          <div className="grid grid-cols-3 gap-2">
            {CURRENCIES.map(c => (
              <motion.button key={c.code} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => changeCurrency(c.code)} data-testid={`currency-${c.code}`}
                className={`flex flex-col items-center py-3 px-2 rounded-2xl text-xs font-bold transition-all ${currency === c.code ? "btn-primary text-white" : "glass border-white/60 text-slate-600 hover:bg-white/50"}`}>
                <span className="text-base font-black">{c.symbol} {c.code}</span>
                <span className={`text-[10px] mt-0.5 ${currency === c.code ? "text-white/70" : "text-slate-400"}`}>{c.name}</span>
              </motion.button>
            ))}
          </div>
        </Section>

        {/* ── ZONA HORARIA ───────────────────────── */}
        <Section icon={Clock} title={language === "es" ? "Hora y Zona Horaria" : "Time & Timezone"} desc={language === "es" ? "Sincroniza con tu hora local para recordatorios precisos" : "Sync with your local time for accurate reminders"}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600 mb-2 block">{language === "es" ? "Zona horaria" : "Timezone"}</label>
              <div className="flex gap-2">
                <select
                  value={notif.timezone || "America/Guatemala"}
                  onChange={e => { setNotif(p => ({ ...p, timezone: e.target.value })); setTimezoneMsg(null); }}
                  data-testid="timezone-select"
                  className="flex-1 bg-white/70 border border-white/80 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  <optgroup label="América">
                    <option value="America/Guatemala">Guatemala (UTC-6)</option>
                    <option value="America/Mexico_City">México CDMX (UTC-6)</option>
                    <option value="America/Bogota">Colombia (UTC-5)</option>
                    <option value="America/Lima">Perú (UTC-5)</option>
                    <option value="America/Caracas">Venezuela (UTC-4)</option>
                    <option value="America/Montevideo">Uruguay (UTC-3)</option>
                    <option value="America/Argentina/Buenos_Aires">Argentina (UTC-3)</option>
                    <option value="America/Santiago">Chile (UTC-3)</option>
                    <option value="America/New_York">Nueva York (UTC-5)</option>
                    <option value="America/Los_Angeles">Los Ángeles (UTC-8)</option>
                    <option value="America/Chicago">Chicago (UTC-6)</option>
                    <option value="America/Denver">Denver (UTC-7)</option>
                  </optgroup>
                  <optgroup label="Europa">
                    <option value="Europe/Madrid">España (UTC+1)</option>
                    <option value="Europe/London">Londres (UTC+0)</option>
                    <option value="Europe/Paris">Francia (UTC+1)</option>
                  </optgroup>
                  <optgroup label="Otras">
                    <option value="UTC">UTC</option>
                  </optgroup>
                </select>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={handleSyncTimezone}
                  data-testid="sync-timezone-btn"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl btn-primary text-white text-xs font-bold whitespace-nowrap shrink-0">
                  <Zap size={13} />
                  {language === "es" ? "Detectar auto" : "Auto-detect"}
                </motion.button>
              </div>
              {timezoneMsg && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className={`text-[11px] mt-1.5 font-semibold ${timezoneMsg.ok ? "text-emerald-600" : "text-red-500"}`}>
                  {timezoneMsg.ok ? `✓ Detectado: ${timezoneMsg.tz}` : "No se pudo detectar"}
                </motion.p>
              )}
            </div>

            <div className="flex items-center gap-3 bg-white/50 rounded-2xl px-4 py-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                <Clock size={14} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-700">
                  {language === "es" ? "Hora local ahora: " : "Local time now: "}
                  <span className="font-black text-indigo-600">
                    {new Date().toLocaleTimeString(language === "es" ? "es-GT" : "en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: notif.timezone || "America/Guatemala" })}
                  </span>
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {language === "es" ? "Los recordatorios automáticos usarán esta hora" : "Automatic reminders use this time"}
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5 block">
                <Clock size={11} /> {language === "es" ? "Hora de aviso diario" : "Daily reminder time"}
              </label>
              <input type="time" value={notif.reminder_time || "09:00"}
                onChange={e => setNotif(p => ({ ...p, reminder_time: e.target.value }))}
                data-testid="notif-time-input"
                className="w-full bg-white/70 border border-white/80 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              <p className="text-[10px] text-slate-400 mt-1">{language === "es" ? "El sistema enviará recordatorios diariamente a esta hora" : "System will send daily reminders at this time"}</p>
            </div>
          </div>
        </Section>

        {/* Notifications */}
        {/* ── SEGURIDAD ── */}
        <SecuritySection />

        <Section icon={Bell} title={s.notifTitle} desc={s.notifDesc}
          badge={
            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${notif.reminders_enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
              {notif.reminders_enabled ? "ACTIVO" : "INACTIVO"}
            </span>
          }>
          <div className="space-y-5">

            {/* ── Toggle ── */}
            <div className="flex items-center justify-between bg-white/50 rounded-2xl px-4 py-3">
              <span className="text-sm font-semibold text-slate-700">{s.notifEnabled}</span>
              <button onClick={() => setNotif(p => ({ ...p, reminders_enabled: !p.reminders_enabled }))}
                data-testid="notif-toggle"
                className={`w-11 h-6 rounded-full transition-all relative ${notif.reminders_enabled ? "btn-primary" : "bg-slate-200"}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${notif.reminders_enabled ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>

            {/* ── Cuándo recordar ── */}
            <div className="space-y-3 bg-white/30 rounded-2xl p-4">
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                {language === "es" ? "¿Cuándo recordar?" : "When to remind?"}
              </p>

              {/* Múltiples períodos */}
              <div>
                <label className="text-xs font-bold text-slate-600 mb-2 block">
                  {language === "es" ? "Días de anticipación (puedes elegir varios)" : "Days before event (multiple allowed)"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { d: 7, label: "7 días" }, { d: 3, label: "3 días" },
                    { d: 2, label: "2 días" }, { d: 1, label: "1 día" },
                    { d: 0, label: "Mismo día" },
                  ].map(({ d, label }) => {
                    const active = (notif.reminder_periods || [3]).includes(d);
                    return (
                      <button
                        key={d}
                        data-testid={`period-btn-${d}`}
                        onClick={() => {
                          const cur = notif.reminder_periods || [3];
                          const next = active ? cur.filter(x => x !== d) : [...cur, d];
                          setNotif(p => ({ ...p, reminder_periods: next.length ? next : [d] }));
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${active ? "btn-primary text-white shadow-sm" : "bg-white/70 text-slate-500 border border-slate-200 hover:border-indigo-300"}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Horas antes (para eventos con horario definido) */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5 block">
                    <Clock size={11} />
                    {language === "es" ? "Horas antes del evento" : "Hours before event"}
                  </label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={0} max={12} step={1} value={notif.reminder_hours_before || 0}
                      onChange={e => setNotif(p => ({ ...p, reminder_hours_before: parseInt(e.target.value) }))}
                      data-testid="notif-hours-slider"
                      className="flex-1 accent-indigo-500" />
                    <span className="text-sm font-black text-slate-800 w-14 text-center bg-white/60 rounded-xl py-1">
                      {notif.reminder_hours_before > 0 ? `${notif.reminder_hours_before}h` : "Off"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {notif.reminder_hours_before > 0
                      ? `Aviso ${notif.reminder_hours_before}h antes del evento (requiere hora en la reserva)`
                      : "Desactivado — actívalo para avisar horas antes"}
                  </p>
                </div>
              </div>

            </div> {/* close grid-cols-2 */}

            {/* ── Canales de notificación ── */}
            <div className="space-y-3">
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                {language === "es" ? "Canales de notificación" : "Notification channels"}
              </p>

              {/* Email Resend */}
              <div className="bg-white/40 rounded-2xl p-4 space-y-3 border border-blue-100/60">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Mail size={14} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-slate-800">Email — Resend</p>
                    <p className="text-[10px] text-slate-400">Gratis hasta 3,000 emails/mes · <a href="https://resend.com" target="_blank" rel="noreferrer" className="text-indigo-500 underline">resend.com</a></p>
                  </div>
                  {notif.resend_api_key && notif.resend_api_key.includes("•") && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">ACTIVO</span>
                  )}
                </div>

                {/* API Key */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block">API Key</label>
                  <input type="password" value={notif.resend_api_key}
                    onChange={e => setNotif(p => ({ ...p, resend_api_key: e.target.value }))}
                    placeholder="re_xxxxx — Obtén la clave en resend.com"
                    data-testid="notif-resend-key-input"
                    className="w-full bg-white/70 border border-white/80 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>

                {/* Email destino */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block">Email Destino (Admin)</label>
                  <input type="email" value={notif.admin_email}
                    onChange={e => setNotif(p => ({ ...p, admin_email: e.target.value }))}
                    placeholder="tu@email.com"
                    data-testid="notif-email-input"
                    className="w-full bg-white/70 border border-white/80 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>

                {/* Nombre del remitente */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block">Nombre del Remitente</label>
                  <input type="text" value={notif.sender_name || ""}
                    onChange={e => setNotif(p => ({ ...p, sender_name: e.target.value }))}
                    placeholder="Cinema Productions"
                    data-testid="notif-sender-name"
                    className="w-full bg-white/70 border border-white/80 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>

                {/* Asunto personalizado */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block">Asunto del Email (opcional)</label>
                  <input type="text" value={notif.email_subject || ""}
                    onChange={e => setNotif(p => ({ ...p, email_subject: e.target.value }))}
                    placeholder="Recordatorio: eventos próximos"
                    data-testid="notif-email-subject"
                    className="w-full bg-white/70 border border-white/80 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>

                {/* CC adicionales */}
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block">Emails adicionales (CC, separados por coma)</label>
                  <input type="text" value={notif.cc_emails || ""}
                    onChange={e => setNotif(p => ({ ...p, cc_emails: e.target.value }))}
                    placeholder="socio@email.com, asistente@email.com"
                    data-testid="notif-cc-emails"
                    className="w-full bg-white/70 border border-white/80 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  <p className="text-[10px] text-slate-400 mt-1">Recibirán copia de cada recordatorio</p>
                </div>

                {/* Notificar al cliente */}
                <div className="flex items-center justify-between bg-white/50 rounded-xl px-3 py-2.5">
                  <div>
                    <p className="text-xs font-bold text-slate-700">Enviar también al cliente</p>
                    <p className="text-[10px] text-slate-400">Envía un recordatorio al email del cliente en la reserva</p>
                  </div>
                  <button
                    data-testid="notify-client-toggle"
                    onClick={() => setNotif(p => ({ ...p, notify_client: !p.notify_client }))}
                    className={`w-9 h-5 rounded-full transition-all relative shrink-0 ${notif.notify_client ? "bg-blue-500" : "bg-slate-200"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${notif.notify_client ? "left-[18px]" : "left-0.5"}`} />
                  </button>
                </div>

                {/* Test result */}
                {emailTestResult && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold ${emailTestResult.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" : "bg-red-50 text-red-600 border border-red-200/60"}`}>
                    {emailTestResult.ok ? <CheckCircle size={13} /> : <XCircle size={13} />}
                    {emailTestResult.msg}
                  </motion.div>
                )}

                {/* Botones */}
                <div className="flex gap-2 pt-1">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={handleTestEmail} disabled={emailTestLoading}
                    data-testid="test-email-btn"
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold transition-all disabled:opacity-50">
                    {emailTestLoading ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                    {emailTestLoading ? "Enviando…" : "Probar conexión"}
                  </motion.button>
                </div>
              </div>

              {/* Telegram */}
              <div className="bg-white/40 rounded-2xl p-4 space-y-3 border border-sky-100/60">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-100 flex items-center justify-center">
                    <MessageCircle size={14} className="text-sky-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-slate-800">Telegram Bot</p>
                    <p className="text-[10px] text-slate-400">100% gratis, ilimitado — mensajes instantáneos</p>
                  </div>
                  <button
                    data-testid="telegram-toggle"
                    onClick={() => setNotif(p => ({ ...p, telegram_enabled: !p.telegram_enabled }))}
                    className={`w-9 h-5 rounded-full transition-all relative ${notif.telegram_enabled ? "bg-sky-500" : "bg-slate-200"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${notif.telegram_enabled ? "left-[18px]" : "left-0.5"}`} />
                  </button>
                </div>

                {notif.telegram_enabled && (
                  <div className="space-y-2">
                    {/* Setup guide */}
                    <div className="bg-sky-50/80 rounded-xl p-3 text-[10px] text-sky-700 space-y-1">
                      <p className="font-black uppercase tracking-wide">Cómo configurarlo (3 pasos):</p>
                      <p>1. En Telegram busca <b>@BotFather</b> → escribe <b>/newbot</b> → obtén el <b>token</b></p>
                      <p>2. Abre tu bot nuevo → escribe cualquier mensaje para activarlo</p>
                      <p>3. Abre este link para obtener tu Chat ID:
                        <br /><code className="bg-white/60 px-1 rounded">https://api.telegram.org/bot{"<TOKEN>"}/getUpdates</code>
                        <br />Busca el número en "id" dentro de "chat"
                      </p>
                    </div>
                    <input type="password" value={notif.telegram_bot_token}
                      onChange={e => setNotif(p => ({ ...p, telegram_bot_token: e.target.value }))}
                      placeholder="1234567890:AAFxxxxxxxxxxxxxxxx (token del bot)"
                      data-testid="telegram-token-input"
                      className="w-full bg-white/70 border border-white/80 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300" />
                    <div className="flex gap-2">
                      <input type="text" value={notif.telegram_chat_id}
                        onChange={e => setNotif(p => ({ ...p, telegram_chat_id: e.target.value }))}
                        placeholder="Chat ID (ej: 123456789)"
                        data-testid="telegram-chatid-input"
                        className="flex-1 bg-white/70 border border-white/80 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300" />
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={handleTelegramTest} disabled={telegramTestLoading}
                        data-testid="telegram-test-btn"
                        className="px-3 py-2 rounded-xl bg-sky-500 text-white text-xs font-bold disabled:opacity-60 whitespace-nowrap">
                        {telegramTestLoading ? <Loader2 size={12} className="animate-spin" /> : "Probar"}
                      </motion.button>
                    </div>
                  </div>
                )}
              </div>

              {/* ntfy.sh */}
              <div className="bg-white/40 rounded-2xl p-4 space-y-3 border border-orange-100/60">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center">
                    <Bell size={14} className="text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-slate-800">ntfy.sh — Push al celular/PC</p>
                    <p className="text-[10px] text-slate-400">Gratis, sin cuenta — app para iOS, Android, Windows</p>
                  </div>
                  <button
                    data-testid="ntfy-toggle"
                    onClick={() => setNotif(p => ({ ...p, ntfy_enabled: !p.ntfy_enabled }))}
                    className={`w-9 h-5 rounded-full transition-all relative ${notif.ntfy_enabled ? "bg-orange-500" : "bg-slate-200"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${notif.ntfy_enabled ? "left-[18px]" : "left-0.5"}`} />
                  </button>
                </div>

                {notif.ntfy_enabled && (
                  <div className="space-y-2">
                    <div className="bg-orange-50/80 rounded-xl p-3 text-[10px] text-orange-700 space-y-1">
                      <p className="font-black uppercase tracking-wide">Cómo configurarlo (2 pasos):</p>
                      <p>1. Instala la app <b>ntfy</b> en tu celular (iOS / Android) o PC — es gratis</p>
                      <p>2. Escribe un nombre único para tu tema (ej: <b>cinema-alex-2024</b>) y suscríbete desde la app</p>
                      <p>Luego ingresa ese mismo nombre aquí. <a href="https://ntfy.sh" target="_blank" rel="noreferrer" className="underline font-bold">ntfy.sh</a></p>
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={notif.ntfy_topic}
                        onChange={e => setNotif(p => ({ ...p, ntfy_topic: e.target.value }))}
                        placeholder="cinema-alex-2024 (tu tema único)"
                        data-testid="ntfy-topic-input"
                        className="flex-1 bg-white/70 border border-white/80 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-300" />
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={handleNtfyTest} disabled={ntfyTestLoading}
                        data-testid="ntfy-test-btn"
                        className="px-3 py-2 rounded-xl bg-orange-500 text-white text-xs font-bold disabled:opacity-60 whitespace-nowrap">
                        {ntfyTestLoading ? <Loader2 size={12} className="animate-spin" /> : "Probar"}
                      </motion.button>
                    </div>
                  </div>
                )}
              </div>

              {/* Browser Push */}
              <div className="rounded-2xl overflow-hidden border border-slate-200/60 bg-white/40">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${notifPermission === "granted" ? "bg-emerald-100" : notifPermission === "denied" ? "bg-red-50" : "bg-slate-100"}`}>
                    <Monitor size={14} className={notifPermission === "granted" ? "text-emerald-600" : notifPermission === "denied" ? "text-red-500" : "text-slate-400"} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-slate-800">Notificaciones del navegador</p>
                    <p className="text-[10px] text-slate-400">Pop-up en Windows / macOS — gratis</p>
                  </div>
                  <span data-testid="system-notif-status"
                    className={`text-[10px] font-black px-2.5 py-1 rounded-full ${notifPermission === "granted" ? "bg-emerald-100 text-emerald-700" : notifPermission === "denied" ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-400"}`}>
                    {notifPermission === "granted" ? "ACTIVO" : notifPermission === "denied" ? "BLOQUEADO" : "INACTIVO"}
                  </span>
                </div>
                <div className="px-4 pb-3">
                  {notifPermission === "denied" ? (
                    <p className="text-[10px] text-red-500 font-medium">
                      Permiso denegado. Ve a Configuración del navegador → Privacidad → Notificaciones y permite este sitio.
                    </p>
                  ) : notifPermission === "granted" ? (
                    <div className="flex gap-2">
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={handleNotifyImmediate} disabled={immediateLoading}
                        data-testid="system-notif-immediate-btn"
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl btn-primary text-white text-xs font-bold disabled:opacity-60">
                        {immediateLoading ? <Loader2 size={12} className="animate-spin" /> : <BellRing size={12} />}
                        Notificar evento próximo
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={handleTestSystemNotif}
                        data-testid="system-notif-test-btn"
                        className="px-3 py-2 rounded-xl glass text-slate-700 text-xs font-bold hover:bg-white/50 border border-white/60">
                        Probar
                      </motion.button>
                    </div>
                  ) : (
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={handleRequestPermission}
                      data-testid="system-notif-enable-btn"
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl btn-primary text-white text-xs font-bold">
                      <BellRing size={13} /> Activar notificaciones del navegador
                    </motion.button>
                  )}
                </div>
              </div>
            </div>

            {/* ── WhatsApp manual ── */}
            {(notif.notification_channel === "whatsapp" || notif.notification_channel === "both") && (
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">{s.notifWhatsapp}</label>
                <div className="flex gap-2">
                  <input type="tel" value={notif.admin_whatsapp}
                    onChange={e => setNotif(p => ({ ...p, admin_whatsapp: e.target.value }))}
                    placeholder="+502 1234 5678"
                    data-testid="notif-whatsapp-input"
                    className="flex-1 bg-white/60 border border-white/80 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                  {notif.admin_whatsapp && (
                    <a href={buildWhatsappLink(notif.admin_whatsapp, [])} target="_blank" rel="noreferrer"
                      data-testid="whatsapp-open-btn"
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors">
                      <MessageCircle size={14} /> {s.notifWhatsappOpen}
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Test result */}
            {testResult && (
              <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl ${testResult.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                {testResult.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
                {testResult.msg}
              </div>
            )}

            {/* ── Buttons ── */}
            <div className="flex gap-3 pt-1">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={handleSaveNotif} disabled={notifLoading}
                data-testid="notif-save-btn"
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl btn-primary text-white text-sm font-bold flex-1 justify-center disabled:opacity-60">
                {notifLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                {s.notifSave}
              </motion.button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={handleTestReminder} disabled={testLoading}
                data-testid="notif-test-btn"
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl glass border-white/60 text-slate-700 text-sm font-bold hover:bg-white/50 transition-all disabled:opacity-60">
                {testLoading ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                Enviar a todos los canales
              </motion.button>
            </div>

          </div>
        </Section>
        {/* Database — moved to dedicated page */}
        <Link to="/base-de-datos"
          className="flex items-center gap-4 glass rounded-3xl p-5 hover:bg-white/40 transition-all group no-underline">
          <div className="w-10 h-10 rounded-xl btn-primary flex items-center justify-center text-white shrink-0">
            <Database size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-slate-900" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
              {language === "es" ? "Base de Datos y Exportar" : "Database & Export"}
            </p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {language === "es" ? "Respaldos, exportar CSV/JSON/PDF, conexión MongoDB" : "Backups, export CSV/JSON/PDF, MongoDB connection"}
            </p>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        {/* ── APP DE ESCRITORIO — REDISEÑADO ────────────────────── */}
        <Section icon={Monitor} title={s.desktopTitle} desc={s.desktopDesc}
          badge={
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-sm">
              {s.desktopBadge}
            </span>
          }>
          <div className="space-y-4">
            {/* Beneficios */}
            <div className="grid grid-cols-2 gap-2">
              {[s.desktopFeature1, s.desktopFeature2, s.desktopFeature3, s.desktopFeature4].map((f, i) => (
                <div key={i} className="flex items-start gap-2 bg-white/60 rounded-xl p-2.5 border border-white/40">
                  <CheckCircle size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-[11px] text-slate-600 font-medium leading-tight">{f}</span>
                </div>
              ))}
            </div>

            {/* Requisitos */}
            <div className="flex items-start gap-2 bg-amber-50/80 border border-amber-200/60 rounded-xl px-3 py-2.5">
              <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700 font-semibold leading-tight">
                {language === "es" ? "Requiere Python 3.8+" : "Requires Python 3.8+"} —{" "}
                <a href="https://www.python.org/downloads/" target="_blank" rel="noreferrer" className="underline hover:text-amber-900">
                  {language === "es" ? "Descargar Python" : "Download Python"}
                </a>
                {" "}({language === "es" ? "marca «Add Python to PATH»" : "check «Add Python to PATH»"})
              </p>
            </div>

            {/* ══ PASO 1: COMPILAR ══════════════════════════════════ */}
            <div className="rounded-2xl border border-indigo-100/80 bg-gradient-to-br from-white/80 to-indigo-50/40 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-indigo-100/60 bg-white/50">
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 ${
                    buildStatus.status === "ready" ? "bg-gradient-to-br from-emerald-500 to-emerald-600" :
                    buildStatus.status === "building" ? "bg-gradient-to-br from-indigo-500 to-purple-500 animate-pulse" :
                    buildStatus.status === "error" ? "bg-gradient-to-br from-red-500 to-red-600" :
                    "btn-primary"
                  }`}>
                    {buildStatus.status === "ready" ? <CheckCircle size={14} /> : "1"}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-slate-800">
                      {language === "es" ? "Compilar app con los últimos cambios" : "Compile app with latest changes"}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {language === "es" ? "Genera el paquete para tu PC (1–3 min)" : "Builds the package for your PC (1–3 min)"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 space-y-3">
                {/* Sub-bloque GitHub — sencillo, sin lock por "por defecto" */}
                <div className="rounded-xl border border-slate-200/70 bg-white/70 overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100/70 bg-slate-50/60">
                    <div className="w-5 h-5 rounded-md bg-slate-900 flex items-center justify-center flex-shrink-0">
                      <Github size={10} className="text-white" />
                    </div>
                    <p className="text-[11px] font-black text-slate-700 flex-1">
                      {language === "es" ? "Repositorio GitHub (opcional)" : "GitHub repository (optional)"}
                    </p>
                    {ghConfig.is_configured && (
                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        {language === "es" ? "CONECTADO" : "CONNECTED"}
                      </span>
                    )}
                  </div>
                  <div className="px-3 py-2.5 space-y-2">
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={ghDraft.repo_url}
                        onChange={e => setGhDraft(p => ({ ...p, repo_url: e.target.value }))}
                        placeholder={ghConfig.suggested_repo || "https://github.com/usuario/repositorio"}
                        data-testid="gh-repo-url-input"
                        className="w-full px-2.5 py-1.5 text-[11px] font-mono rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-white"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={ghDraft.branch}
                          onChange={e => setGhDraft(p => ({ ...p, branch: e.target.value }))}
                          placeholder="main"
                          data-testid="gh-branch-input"
                          className="w-24 px-2.5 py-1.5 text-[11px] font-mono rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-white"
                        />
                        <input
                          type="password"
                          value={ghDraft.token}
                          onChange={e => setGhDraft(p => ({ ...p, token: e.target.value }))}
                          placeholder={language === "es" ? "Token opcional (repos privados)" : "Optional token (private repos)"}
                          data-testid="gh-token-input"
                          className="flex-1 px-2.5 py-1.5 text-[11px] font-mono rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-white"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleGhSaveRepo}
                        disabled={ghSaving || !ghDraft.repo_url.trim()}
                        data-testid="gh-save-repo-btn"
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg btn-primary text-white text-[11px] font-bold disabled:opacity-40"
                      >
                        {ghSaving
                          ? <><Loader2 size={11} className="animate-spin" /> {language === "es" ? "Guardando…" : "Saving…"}</>
                          : <><CheckCircle size={11} /> {language === "es" ? "Guardar repo" : "Save repo"}</>}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGhCheck(false)}
                        disabled={ghChecking || !ghConfig.is_configured}
                        data-testid="gh-check-updates-btn"
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-bold disabled:opacity-40 hover:bg-slate-800 transition"
                        title={!ghConfig.is_configured ? (language === "es" ? "Guarda primero un repo" : "Save a repo first") : ""}
                      >
                        {ghChecking
                          ? <><Loader2 size={11} className="animate-spin" /> {language === "es" ? "Buscando…" : "Checking…"}</>
                          : <><RefreshCw size={11} /> {language === "es" ? "Buscar actualizaciones" : "Check updates"}</>}
                      </button>
                    </div>
                    {ghConfig.is_configured && (
                      <a
                        href={ghConfig.repo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[10px] font-mono text-slate-400 hover:text-slate-700 transition"
                        data-testid="gh-repo-link"
                      >
                        <ExternalLink size={9} />
                        <span className="truncate">{ghConfig.repo_url.replace("https://github.com/", "")}</span>
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 flex items-center gap-0.5">
                          <GitBranch size={7} /> {ghConfig.branch || "main"}
                        </span>
                      </a>
                    )}

                    {/* Resultado del chequeo */}
                    <AnimatePresence mode="wait">
                      {ghResult && !ghResult.has_updates && (
                        <motion.div
                          key="gh-uptodate-settings"
                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          data-testid="gh-no-updates-banner"
                          className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5"
                        >
                          <CheckCircle2 size={12} className="text-emerald-500 flex-shrink-0" />
                          <p className="text-[10px] font-bold text-emerald-700 flex-1">
                            {language === "es" ? "No hay actualizaciones — Todo al día ✓" : "No updates — All up to date ✓"}
                          </p>
                          <p className="text-[9px] font-mono text-emerald-600">{ghResult.remote_sha_short}</p>
                        </motion.div>
                      )}
                      {ghResult?.has_updates && (
                        <motion.div
                          key="gh-updates-settings"
                          initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          data-testid="gh-updates-available-banner"
                          className="space-y-1.5"
                        >
                          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                            <AlertTriangle size={12} className="text-amber-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black text-amber-700">
                                {language === "es"
                                  ? `¡${ghResult.commits_ahead} actualización${ghResult.commits_ahead !== 1 ? "es" : ""} disponible${ghResult.commits_ahead !== 1 ? "s" : ""}!`
                                  : `${ghResult.commits_ahead} update${ghResult.commits_ahead !== 1 ? "s" : ""} available!`}
                              </p>
                              <p className="text-[9px] font-mono text-amber-600">
                                {ghResult.local_sha_short} → {ghResult.remote_sha_short}
                              </p>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                              onClick={handleGhApply}
                              disabled={ghApplying}
                              data-testid="gh-apply-update-btn"
                              className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500 text-white text-[9px] font-black hover:bg-amber-600 transition disabled:opacity-60"
                            >
                              {ghApplying
                                ? <><Loader2 size={9} className="animate-spin" /> {language === "es" ? "Aplicando…" : "Applying…"}</>
                                : <><ArrowDownCircle size={9} /> {language === "es" ? "Aplicar" : "Apply"}</>}
                            </motion.button>
                          </div>
                          {ghResult.commits && ghResult.commits.length > 0 && (
                            <div className="bg-slate-50 rounded-lg p-1.5 max-h-20 overflow-auto border border-slate-100">
                              {ghResult.commits.slice(0, 3).map(c => (
                                <a key={c.full_sha} href={c.url} target="_blank" rel="noreferrer"
                                  className="flex items-start gap-1.5 p-1 rounded hover:bg-white transition">
                                  <GitCommit size={9} className="text-slate-400 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[9px] text-slate-700 font-semibold truncate">{c.message}</p>
                                    <p className="text-[8px] text-slate-400 font-mono">{c.sha} · {c.author}</p>
                                  </div>
                                </a>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Estado del build */}
                <AnimatePresence mode="wait">
                  {buildStatus.status !== "idle" && (
                    <motion.div
                      key={`build-${buildStatus.status}`}
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className={`rounded-xl px-3 py-2.5 border ${
                        buildStatus.status === "building" ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                        buildStatus.status === "ready" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        "bg-red-50 text-red-700 border-red-200"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {buildStatus.status === "building" ? <Loader2 size={13} className="animate-spin flex-shrink-0 mt-0.5" /> :
                         buildStatus.status === "ready" ? <CheckCircle size={13} className="flex-shrink-0 mt-0.5" /> :
                         <XCircle size={13} className="flex-shrink-0 mt-0.5" />}
                        <p className="text-[11px] font-semibold whitespace-pre-wrap flex-1 leading-tight">{buildStatus.message}</p>
                      </div>
                      {buildStatus.status === "building" && typeof buildStatus.progress === "number" && (
                        <div className="mt-2 h-1 bg-indigo-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(10, buildStatus.progress)}%` }}
                            transition={{ duration: 0.5 }}
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                          />
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Botón compilar */}
                <motion.button
                  whileHover={{ scale: buildStatus.status === "building" ? 1 : 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleRebuild}
                  disabled={buildStatus.status === "building"}
                  data-testid="desktop-rebuild-btn"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black text-white shadow-md transition-all disabled:opacity-60"
                  style={{
                    background: buildStatus.status === "ready"
                      ? "linear-gradient(135deg, #10b981, #059669)"
                      : "linear-gradient(135deg, var(--t-from), var(--t-to))"
                  }}
                >
                  {buildStatus.status === "building"
                    ? <><Loader2 size={16} className="animate-spin" /> {language === "es" ? "Compilando…" : "Compiling…"}</>
                    : buildStatus.status === "ready"
                    ? <><CheckCircle size={16} /> {language === "es" ? "App lista ✓ (recompilar)" : "Ready ✓ (rebuild)"}</>
                    : <><RefreshCw size={16} /> {language === "es" ? "Compilar app" : "Compile app"}</>}
                </motion.button>
              </div>
            </div>

            {/* ══ PASO 2: DESCARGAR ══════════════════════════════ */}
            <div className={`rounded-2xl border overflow-hidden shadow-sm transition-all ${
              buildStatus.status === "ready"
                ? "border-emerald-200 bg-gradient-to-br from-emerald-50/40 to-white/80"
                : "border-slate-200 bg-gradient-to-br from-slate-50/40 to-white/40 opacity-70"
            }`}>
              <div className={`px-4 py-3 border-b bg-white/50 ${
                buildStatus.status === "ready" ? "border-emerald-100/60" : "border-slate-100/60"
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 ${
                    buildStatus.status === "ready" ? "bg-gradient-to-br from-emerald-500 to-emerald-600" : "bg-slate-300"
                  }`}>
                    2
                  </div>
                  <div className="flex-1">
                    <p className={`text-xs font-black ${buildStatus.status === "ready" ? "text-slate-800" : "text-slate-500"}`}>
                      {language === "es" ? "Descargar app (.zip)" : "Download app (.zip)"}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {language === "es" ? "Un solo archivo con todo lo necesario" : "Single file with everything included"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3">
                <motion.button
                  whileHover={{ scale: buildStatus.status === "ready" ? 1.02 : 1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleDownloadPackage}
                  disabled={downloadLoading || buildStatus.status !== "ready"}
                  data-testid="desktop-download-btn"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black transition-all disabled:cursor-not-allowed"
                  style={{
                    background: buildStatus.status === "ready" ? "linear-gradient(135deg,var(--t-from),var(--t-to))" : "#e2e8f0",
                    color: buildStatus.status === "ready" ? "white" : "#94a3b8"
                  }}
                >
                  {downloadLoading
                    ? <><Loader2 size={16} className="animate-spin" /> {s.desktopDownloading}</>
                    : buildStatus.status === "ready"
                    ? <><Download size={16} /> {language === "es" ? "Descargar para Windows (.zip)" : "Download for Windows (.zip)"}</>
                    : <><Package size={16} /> {language === "es" ? "Compila primero (Paso 1)" : "Compile first (Step 1)"}</>}
                </motion.button>
              </div>
            </div>

            {/* Instrucciones de uso */}
            <div className="rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200/60 p-3">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">
                {language === "es" ? "Después de descargar" : "After downloading"}
              </p>
              <ol className="space-y-1.5 text-[11px] text-slate-600">
                <li className="flex gap-2"><span className="font-black text-indigo-500 flex-shrink-0">1.</span> {language === "es" ? "Descomprime el .zip donde prefieras" : "Extract the .zip anywhere"}</li>
                <li className="flex gap-2"><span className="font-black text-indigo-500 flex-shrink-0">2.</span> {language === "es" ? "Doble clic en" : "Double-click"} <code className="px-1.5 py-0.5 rounded bg-slate-100 font-mono text-[10px]">start.bat</code></li>
                <li className="flex gap-2"><span className="font-black text-indigo-500 flex-shrink-0">3.</span> {language === "es" ? "Se instalarán dependencias automáticamente (primera vez tarda 1-3 min)" : "Dependencies auto-install (first time takes 1-3 min)"}</li>
                <li className="flex gap-2"><span className="font-black text-indigo-500 flex-shrink-0">4.</span> {language === "es" ? "El navegador se abrirá con la app funcionando" : "Browser opens with the app running"}</li>
              </ol>
              <p className="text-[10px] text-slate-400 mt-2.5 leading-relaxed">
                {language === "es"
                  ? "Al cambiar la BD (o después de recompilar), vuelve a descargar el paquete para actualizar el .env automáticamente."
                  : "When you change the DB (or after a rebuild), re-download the package to update the .env automatically."}
              </p>
            </div>
          </div>
        </Section>

        {/* ── PUBLICAR EN LÍNEA ────────────────────── */}
        <Section icon={Globe} title={language === "es" ? "Publicar en Línea" : "Publish Online"}
          desc={language === "es" ? "Despliega tu app en hosting externo para acceder desde cualquier lugar" : "Deploy to external hosting for anywhere access"}>
          <div className="space-y-4">
            {[
              {
                id: "hostinger",
                name: "Hostinger VPS",
                icon: "🟠",
                badge: "Recomendado",
                badgeColor: "bg-orange-100 text-orange-700",
                desc: language === "es" ? "VPS Linux con Docker — máximo control" : "Linux VPS with Docker — full control",
                steps: [
                  "Contrata plan VPS KVM1 o superior en hostinger.com",
                  "Conecta por SSH: ssh root@tu-ip-servidor",
                  "Instala Docker: curl -fsSL https://get.docker.com | sh",
                  "Sube tu proyecto: scp -r ./cinema-app root@tu-ip:/opt/cinema",
                  "Copia .env y edita las variables de entorno",
                  "Ejecuta: docker-compose up -d",
                  "Configura dominio en hPanel → DNS → A record → tu-ip",
                  "¡Listo! Accede en https://tudominio.com",
                ],
              },
              {
                id: "railway",
                name: "Railway.app",
                icon: "🟣",
                badge: "Más fácil",
                badgeColor: "bg-purple-100 text-purple-700",
                desc: language === "es" ? "Deploy con GitHub en 1 clic — gratis hasta $5/mes" : "GitHub 1-click deploy — free up to $5/mo",
                steps: [
                  "Crea cuenta en railway.app",
                  "Nuevo proyecto → Deploy from GitHub",
                  "Conecta tu repositorio de GitHub",
                  "Railway detecta Python/Node automáticamente",
                  "Ve a Variables → copia el contenido de .env.template",
                  "Clic en Deploy → Railway despliega automáticamente",
                  "Ajustes → Domain → Generate Domain (gratis *.up.railway.app)",
                  "¡En 5 minutos tu app está en línea!",
                ],
                link: "https://railway.app",
              },
              {
                id: "render",
                name: "Render.com",
                icon: "🔵",
                badge: "Gratis",
                badgeColor: "bg-blue-100 text-blue-700",
                desc: language === "es" ? "Tier gratis para proyectos personales" : "Free tier for personal projects",
                steps: [
                  "Crea cuenta en render.com",
                  "New → Web Service → conecta GitHub",
                  "Para el backend: Build Command: pip install -r backend/requirements.txt",
                  "Start Command: uvicorn backend.server:app --host 0.0.0.0 --port $PORT",
                  "Para el frontend: Static Site → Build: cd frontend && npm run build",
                  "Agrega variables de entorno (Environment tab)",
                  "Render asigna URL *.onrender.com automáticamente",
                  "Nota: en tier gratis el servicio 'duerme' después de 15 min inactividad",
                ],
                link: "https://render.com",
              },
              {
                id: "digitalocean",
                name: "DigitalOcean",
                icon: "🔹",
                badge: "$4/mes",
                badgeColor: "bg-sky-100 text-sky-700",
                desc: language === "es" ? "Droplet + App Platform — muy confiable" : "Droplet + App Platform — very reliable",
                steps: [
                  "Crea una cuenta en digitalocean.com ($200 crédito gratis para nuevos)",
                  "App Platform → Create App → GitHub source",
                  "Detecta automáticamente Python y Node.js",
                  "Configura variables de entorno en Settings",
                  "Asigna dominio personalizado o usa *.ondigitalocean.app",
                  "Escala fácilmente con Managed MongoDB Database si necesitas",
                ],
                link: "https://digitalocean.com",
              },
            ].map((platform) => (
              <div key={platform.id} className="border border-slate-200/60 rounded-2xl overflow-hidden bg-white/40">
                <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/60 transition-colors"
                  data-testid={`platform-${platform.id}`}
                  onClick={() => setExpandedPlatform(expandedPlatform === platform.id ? null : platform.id)}>
                  <span className="text-xl">{platform.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-slate-800">{platform.name}</span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${platform.badgeColor}`}>{platform.badge}</span>
                    </div>
                    <span className="text-[11px] text-slate-400">{platform.desc}</span>
                  </div>
                  <ChevronDown size={14} className={`text-slate-400 transition-transform ${expandedPlatform === platform.id ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {expandedPlatform === platform.id && (
                    <motion.div key="steps" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-200/60 px-4 py-3 bg-slate-50/40 overflow-hidden">
                      <ol className="space-y-2">
                        {platform.steps.map((step, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-slate-800 text-white text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                            <span className="text-xs text-slate-600 leading-relaxed">{step}</span>
                          </li>
                        ))}
                      </ol>
                      {platform.link && (
                        <a href={platform.link} target="_blank" rel="noreferrer"
                          className="mt-3 flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                          <Globe size={11} /> Abrir {platform.name} →
                        </a>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}

            <div className="bg-slate-50/60 rounded-2xl p-4 border border-slate-200/50 space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Archivos de despliegue</p>
              <div className="grid grid-cols-2 gap-2.5">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  data-testid="download-env-btn"
                  onClick={async () => {
                    try {
                      const API = process.env.REACT_APP_BACKEND_URL;
                      const res = await fetch(`${API}/api/deployment/env-template`);
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a"); a.href = url; a.download = ".env.template";
                      document.body.appendChild(a); a.click(); document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      toast({ title: ".env.template descargado ✓" });
                    } catch { toast({ title: "Error al descargar", variant: "destructive" }); }
                  }}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-white/70 border border-slate-200/70 hover:bg-white text-xs font-bold text-slate-700 transition-all">
                  <Download size={14} className="text-emerald-500" />
                  <span>.env Template</span>
                  <span className="text-[9px] text-slate-400">Variables de entorno</span>
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  data-testid="download-docker-btn"
                  onClick={async () => {
                    try {
                      const API = process.env.REACT_APP_BACKEND_URL;
                      const res = await fetch(`${API}/api/deployment/docker-compose`);
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a"); a.href = url; a.download = "docker-compose.yml";
                      document.body.appendChild(a); a.click(); document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                      toast({ title: "docker-compose.yml descargado ✓" });
                    } catch { toast({ title: "Error al descargar", variant: "destructive" }); }
                  }}
                  className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl bg-white/70 border border-slate-200/70 hover:bg-white text-xs font-bold text-slate-700 transition-all">
                  <Package size={14} className="text-blue-500" />
                  <span>docker-compose</span>
                  <span className="text-[9px] text-slate-400">Config de containers</span>
                </motion.button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verificar despliegue</p>
              <div className="flex gap-2">
                <input type="url" value={deployUrl} onChange={e => { setDeployUrl(e.target.value); setHealthResult(null); }}
                  placeholder="https://tudominio.com"
                  data-testid="deploy-url-input"
                  className="flex-1 bg-white/60 border border-slate-200/80 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  data-testid="health-check-btn"
                  disabled={!deployUrl || healthLoading}
                  onClick={async () => {
                    setHealthLoading(true); setHealthResult(null);
                    try {
                      const API = process.env.REACT_APP_BACKEND_URL;
                      const res = await fetch(`${API}/api/deployment/health-check?url=${encodeURIComponent(deployUrl)}`, { method: "POST" });
                      const data = await res.json();
                      setHealthResult(data);
                    } catch { setHealthResult({ ok: false, error: "Error de conexión" }); }
                    finally { setHealthLoading(false); }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-indigo-500 text-white text-xs font-bold disabled:opacity-40 hover:bg-indigo-600 transition-colors whitespace-nowrap flex items-center gap-1.5">
                  {healthLoading ? <Loader2 size={12} className="animate-spin" /> : <Wifi size={12} />}
                  Verificar
                </motion.button>
              </div>
              {healthResult && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs font-semibold ${healthResult.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" : "bg-red-50 text-red-600 border border-red-200/60"}`}>
                  {healthResult.ok ? <CheckCircle size={13} /> : <XCircle size={13} />}
                  {healthResult.message || healthResult.error}
                </motion.div>
              )}
            </div>

            <div className="bg-green-50/60 rounded-2xl p-4 border border-green-200/50 space-y-2.5">
              <div className="flex items-center gap-2">
                <Database size={14} className="text-green-600" />
                <p className="text-xs font-black text-green-800">MongoDB Atlas (Base de datos en la nube — Gratis)</p>
              </div>
              <ol className="space-y-1.5">
                {[
                  "Ve a mongodb.com/cloud/atlas → crear cuenta gratis",
                  "Create Cluster → M0 Free (512 MB gratis para siempre)",
                  "Database Access → Add User (usuario + contraseña segura)",
                  "Network Access → Add IP → 0.0.0.0/0 (acceso desde cualquier lugar)",
                  "Connect → Drivers → copia la URI: mongodb+srv://user:pass@cluster...",
                  "Pega la URI en tu .env como MONGO_URL=mongodb+srv://...",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] text-green-700">
                    <span className="font-black shrink-0">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Section>


      </motion.div>
      </SectionSearchContext.Provider>
    </div>
  );
}
