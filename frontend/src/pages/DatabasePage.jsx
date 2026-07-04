import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database, Download, Upload, Save, Trash2, RefreshCw,
  Wifi, WifiOff, CheckCircle, XCircle, Loader2, FileText,
  AlertCircle, ChevronRight, Clock, HardDrive, BarChart3,
  ShieldCheck, Link2, ArrowRight, FolderOpen, Zap, Timer,
  Play, Square, RotateCcw, Folder, FileSpreadsheet, Plus,
  Star, Bookmark, ChevronDown, Sparkles, Scissors,
  Network, Server, ToggleLeft, ToggleRight, Package, Globe, MonitorSpeaker,
  Github, BookOpen, Copy, Brain, Key, Eye, EyeOff,
  Stethoscope, Wrench, ShieldAlert, LogIn, LogOut, UserCheck, ExternalLink,
} from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import {
  getDbStats, testDbConnection, switchDatabase, resetDatabase, optimizeDatabase,
  getFactoryPresets,
  getReservations, getBackupHistory, createServerBackup,
  deleteBackupFile, downloadBackupUrl, downloadBackupFileUrl, restoreBackup,
  getGithubConfig, saveGithubConfig, getAiContext, saveAiContext, resetAiContext,
  connectGithub, disconnectGithub, runDiagnostic, fixDiagnosticIssue, fixAllDiagnosticIssues,
  githubPushAll, getGithubPushStatus,
} from "@/lib/api";
import { generateAllReservationsPDF } from "@/lib/generatePDF";
import { fireEpic } from "@/lib/celebrations";
import { useAutoBackup } from "@/hooks/useAutoBackup";

const BASE = window.__API_BASE_URL__ || process.env.REACT_APP_BACKEND_URL;

// ─── Countdown helper ────────────────────────────────────────────────────────
function useCountdown(targetDate) {
  const [display, setDisplay] = useState("");
  useEffect(() => {
    if (!targetDate) { setDisplay(""); return; }
    const update = () => {
      const diff = targetDate - Date.now();
      if (diff <= 0) { setDisplay("ahora"); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      if (h > 0) setDisplay(`${h}h ${m}m`);
      else if (m > 0) setDisplay(`${m}m ${s}s`);
      else setDisplay(`${s}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return display;
}

// ─── Time-ago helper ─────────────────────────────────────────────────────────
function timeAgo(date) {
  if (!date) return null;
  const diff = Date.now() - date;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "hace un momento";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

// ─── Collapsible body wrapper ────────────────────────────────────────────────
function CollapseBody({ open, children }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden">
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function BlockChevron({ open, danger }) {
  return (
    <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }}
      className={danger ? "text-red-300" : "text-slate-400"}>
      <ChevronDown size={15} />
    </motion.span>
  );
}

function fmtSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString("es-GT", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } };
const stagger = { show: { transition: { staggerChildren: 0.08 } } };

export default function DatabasePage() {
  const { language, tr, logoUrl, pdfTheme, formatCurrency, usePdfLogo, useCustomPdfLogo, pdfLogoUrl } = useSettings();
  const { toast } = useToast();
  const s = tr;

  // ── Auto-backup ────────────────────────────────────────────────────────────
  const autoBackup = useAutoBackup(`${BASE}/api/backup/download`);
  const countdown  = useCountdown(autoBackup.nextBackup);
  const [lastAgoDisplay, setLastAgoDisplay] = useState("");

  useEffect(() => {
    setLastAgoDisplay(timeAgo(autoBackup.lastBackup));
    const id = setInterval(() => setLastAgoDisplay(timeAgo(autoBackup.lastBackup)), 15_000);
    return () => clearInterval(id);
  }, [autoBackup.lastBackup]);

  // Notify on each auto-backup
  const prevCountRef = useRef(autoBackup.backupCount);
  useEffect(() => {
    if (autoBackup.backupCount > prevCountRef.current) {
      prevCountRef.current = autoBackup.backupCount;
      toast({ title: `Respaldo automático guardado ✓  (${autoBackup.backupCount} total)` });
    }
  }, [autoBackup.backupCount]);

  const [dbStats, setDbStats]           = useState(null);
  const [dbLoading, setDbLoading]       = useState(true);
  const [newDbUrl, setNewDbUrl]         = useState("");
  const [dbTestResult, setDbTestResult] = useState(null);
  const [dbConnecting, setDbConnecting] = useState(false);
  const [dbTesting, setDbTesting]       = useState(false);
  const [dbResetting, setDbResetting]   = useState(false);
  const [backupModal, setBackupModal]   = useState(false);
  const [optimizing, setOptimizing]     = useState(false);
  const [showClear, setShowClear]       = useState(false);
  const [openBlocks, setOpenBlocks] = useState({ backup: false, conn: false, github: false, diagnostic: false, cleanup: false, updates: false, options: false, danger: false });
  const toggleBlock = (k) => setOpenBlocks(p => ({ ...p, [k]: !p[k] }));
  const [clearLoading, setClearLoading] = useState(false);

  // ── GitHub Integration & AI Context ────────────────────────────────
  const [ghConfig, setGhConfig] = useState({ repo_url: "", branch: "main", has_token: false, last_commit_sha: "", last_check_at: "" });
  const [ghRepoInput, setGhRepoInput] = useState("");
  const [ghTokenInput, setGhTokenInput] = useState("");
  const [ghBranchInput, setGhBranchInput] = useState("main");
  const [ghShowToken, setGhShowToken] = useState(false);
  const [ghSaving, setGhSaving] = useState(false);
  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxContent, setCtxContent] = useState("");
  const [ctxLoading, setCtxLoading] = useState(false);
  const [ctxSaving, setCtxSaving] = useState(false);
  const [ctxEditing, setCtxEditing] = useState(false);
  const [ctxUpdatedAt, setCtxUpdatedAt] = useState("");

  // ── GitHub Connect Modal + Diagnostic ─────────────────────────────
  const [ghConnectOpen, setGhConnectOpen] = useState(false);
  const [ghConnectToken, setGhConnectToken] = useState("");
  const [ghConnectSaving, setGhConnectSaving] = useState(false);
  const [ghPushing, setGhPushing] = useState(false);
  const [ghPushProgress, setGhPushProgress] = useState(0);
  const [ghPushMsg, setGhPushMsg] = useState("");
  const ghPushPollRef = useRef(null);
  const [diagnostic, setDiagnostic] = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagFixingId, setDiagFixingId] = useState("");

  // ── Connection mode ────────────────────────────────────────────────────────
  const [connMode, setConnMode] = useState("url"); // "url" | "fields" | "nas"
  const [connFields, setConnFields] = useState({ host: "", port: "27017", user: "", pass: "", db: "cinema_events" });

  const buildUrlFromFields = () => {
    const { host, port, user, pass, db } = connFields;
    if (!host.trim()) return "";
    const base = `${host.trim()}:${port || "27017"}/${db || "cinema_events"}`;
    return user.trim() && pass.trim()
      ? `mongodb://${encodeURIComponent(user.trim())}:${encodeURIComponent(pass.trim())}@${base}`
      : `mongodb://${base}`;
  };

  const activeConnUrl = connMode === "url" ? newDbUrl : buildUrlFromFields();

  // ── DB Options (toggles) ──────────────────────────────────────────────────
  const [dbOptions, setDbOptions] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cp_db_options")) || { autoTest: true, notifySwitch: true, showFullUrl: false, compressBackup: false }; }
    catch { return { autoTest: true, notifySwitch: true, showFullUrl: false, compressBackup: false }; }
  });
  const saveDbOption = (key, val) => {
    const next = { ...dbOptions, [key]: val };
    setDbOptions(next);
    localStorage.setItem("cp_db_options", JSON.stringify(next));
  };

  // ── Actualizaciones en BD ─────────────────────────────────────────────────
  const [dbUpdates, setDbUpdates] = useState([]);
  const [updatesLoading, setUpdatesLoading] = useState(false);

  const loadDbUpdates = async () => {
    setUpdatesLoading(true);
    try {
      const r = await fetch(`${BASE}/api/updates/history`);
      const data = await r.json();
      setDbUpdates(Array.isArray(data) ? data : []);
    } catch { setDbUpdates([]); }
    finally { setUpdatesLoading(false); }
  };

  const handleDeleteUpdate = async (id) => {
    if (!window.confirm("¿Eliminar esta versión?")) return;
    try {
      await fetch(`${BASE}/api/updates/${id}`, { method: "DELETE" });
      setDbUpdates(prev => prev.filter(u => u.id !== id));
      toast({ title: "Versión eliminada de la base de datos" });
    } catch { toast({ title: "Error al eliminar", variant: "destructive" }); }
  };

  const [backupHistory, setBackupHistory]   = useState([]);
  const [backupCreating, setBackupCreating] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreResult, setRestoreResult]   = useState(null);
  const restoreInputRef     = useRef(null);
  const restoreAutoInputRef = useRef(null);

  const [pdfLoading, setPdfLoading] = useState(false);

  // ── CSV Import state ──────────────────────────────────────────────────────
  const csvImportRef                          = useRef(null);
  const [csvImportLoading, setCsvImportLoading] = useState(false);
  const [csvImportResult, setCsvImportResult]   = useState(null);

  // ── Cleanup state ─────────────────────────────────────────────────────────
  const [cleanupPreview, setCleanupPreview] = useState(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupAction, setCleanupAction]   = useState(null); // 'cancelled'|'old_completed'

  // ── Connection presets (localStorage) ─────────────────────────────────────
  const [presets, setPresets] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cp_db_presets")) || []; } catch { return []; }
  });
  const [presetName, setPresetName] = useState("");
  const [showAddPreset, setShowAddPreset] = useState(false);

  const savePresets = (list) => {
    setPresets(list);
    localStorage.setItem("cp_db_presets", JSON.stringify(list));
  };

  // ── Cargar conexiones de fábrica (vienen precargadas desde el backend) ────
  // Se mezclan con las guardadas del usuario (dedupe por URL) y NO se pueden
  // borrar (marcadas con "factory": true). Se persisten como "vistas" en
  // localStorage la primera vez para respetar cambios futuros del usuario.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getFactoryPresets();
        const factory = Array.isArray(res?.presets) ? res.presets : [];
        if (cancelled || factory.length === 0) return;

        const userList = (() => {
          try { return JSON.parse(localStorage.getItem("cp_db_presets")) || []; }
          catch { return []; }
        })();

        // Añade solo las que el usuario no haya eliminado explícitamente.
        const dismissed = (() => {
          try { return JSON.parse(localStorage.getItem("cp_db_factory_dismissed")) || []; }
          catch { return []; }
        })();

        const userUrls = new Set(userList.map(p => p.url));
        const toAdd = factory.filter(fp =>
          !userUrls.has(fp.url) && !dismissed.includes(fp.url)
        );
        if (toAdd.length > 0) {
          const merged = [...toAdd, ...userList];
          savePresets(merged);
        }
      } catch (err) {
        console.error("[factory presets]", err);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadAll(); }, []);

  const loadAll = () => { loadDbStats(); loadBackupHistory(); loadCleanupPreview(); loadDbUpdates(); loadGithubConfig(); };

  // ── GitHub Config load ──────────────────────────────────
  const loadGithubConfig = async () => {
    try {
      const cfg = await getGithubConfig();
      setGhConfig(cfg);
      setGhRepoInput(cfg.repo_url || "");
      setGhBranchInput(cfg.branch || "main");
    } catch (err) { console.error("[loadGithubConfig]", err); }
  };

  const handleSaveGithub = async () => {
    if (!ghRepoInput.trim()) {
      toast({ title: "Ingresa la URL del repositorio", variant: "destructive" });
      return;
    }
    setGhSaving(true);
    try {
      await saveGithubConfig({
        repo_url: ghRepoInput.trim(),
        token: ghTokenInput.trim() || undefined,
        branch: ghBranchInput.trim() || "main",
      });
      toast({ title: "Repositorio guardado", description: "Configuración actualizada correctamente" });
      setGhTokenInput("");
      await loadGithubConfig();
    } catch (err) {
      toast({ title: "Error al guardar", description: err?.response?.data?.detail || String(err), variant: "destructive" });
    } finally {
      setGhSaving(false);
    }
  };

  // ── Conectar con GitHub via PAT ────────────────────────────────────
  const handleConnectGithub = async () => {
    if (!ghConnectToken.trim()) {
      toast({ title: "Pega tu Personal Access Token", variant: "destructive" });
      return;
    }
    setGhConnectSaving(true);
    try {
      const res = await connectGithub(
        ghConnectToken.trim(),
        ghRepoInput.trim() || ghConfig.suggested_repo || "https://github.com/AlejandroPiedrasanta/RESERVA-DE-EVENTOS",
        ghBranchInput.trim() || "main",
      );
      toast({
        title: `¡Conectado como @${res.username}!`,
        description: "Ya puedes guardar cambios en el repositorio.",
      });
      setGhConnectToken("");
      setGhConnectOpen(false);
      await loadGithubConfig();
    } catch (err) {
      toast({
        title: "Error al conectar",
        description: err?.response?.data?.detail || String(err),
        variant: "destructive",
      });
    } finally {
      setGhConnectSaving(false);
    }
  };

  const handleDisconnectGithub = async () => {
    if (!window.confirm("¿Desconectar la cuenta de GitHub? El repositorio quedará configurado, solo se borra el token.")) return;
    try {
      await disconnectGithub();
      toast({ title: "Cuenta desconectada" });
      await loadGithubConfig();
    } catch (err) {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  // ── Guardar TODO el repositorio a GitHub (git add + commit + push) ──
  const handlePushAllToGithub = async () => {
    if (!ghConfig.username) {
      toast({ title: "Conecta tu cuenta de GitHub primero", variant: "destructive" });
      return;
    }
    const message = window.prompt(
      "Mensaje del commit:",
      `Auto-save from Cinema Productions — ${new Date().toLocaleString("es-GT")}`,
    );
    if (message === null) return; // usuario canceló
    setGhPushing(true);
    setGhPushProgress(3);
    setGhPushMsg("Iniciando…");
    // Polling del progreso real reportado por el backend
    if (ghPushPollRef.current) clearInterval(ghPushPollRef.current);
    ghPushPollRef.current = setInterval(async () => {
      try {
        const st = await getGithubPushStatus();
        if (typeof st.progress === "number") setGhPushProgress(st.progress);
        if (st.message) setGhPushMsg(st.message);
      } catch (_) { /* ignora errores de polling */ }
    }, 800);
    try {
      const res = await githubPushAll(message || undefined);
      setGhPushProgress(100);
      if (res.nothing_to_commit) {
        setGhPushMsg("Sin cambios que subir");
        toast({
          title: "Sin cambios que subir",
          description: "El repositorio ya está sincronizado.",
        });
      } else {
        setGhPushMsg("¡Subido a GitHub!");
        toast({
          title: `✓ Subido a GitHub`,
          description: `Commit ${res.commit_short} en rama ${res.branch}`,
        });
        fireEpic();
      }
      await loadGithubConfig();
    } catch (err) {
      setGhPushMsg("Error al subir");
      toast({
        title: "Error al subir",
        description: err?.response?.data?.detail?.slice(0, 200) || String(err),
        variant: "destructive",
      });
    } finally {
      if (ghPushPollRef.current) {
        clearInterval(ghPushPollRef.current);
        ghPushPollRef.current = null;
      }
      // Deja ver 100%/estado final un instante antes de resetear
      setTimeout(() => {
        setGhPushing(false);
        setGhPushProgress(0);
        setGhPushMsg("");
      }, 1200);
    }
  };

  // ── Diagnóstico ────────────────────────────────────────────────────
  const loadDiagnostic = async () => {
    setDiagLoading(true);
    try {
      const d = await runDiagnostic();
      setDiagnostic(d);
    } catch (err) {
      toast({ title: "Error al ejecutar diagnóstico", variant: "destructive" });
    } finally {
      setDiagLoading(false);
    }
  };

  const handleFixIssue = async (id) => {
    setDiagFixingId(id);
    try {
      const res = await fixDiagnosticIssue(id);
      if (res.success) {
        toast({ title: "Corregido ✓", description: res.detail?.slice(0, 120) });
      } else {
        toast({ title: "No se pudo corregir", description: res.detail?.slice(0, 200), variant: "destructive" });
      }
      await loadDiagnostic();
    } catch (err) {
      toast({ title: "Error al corregir", description: err?.response?.data?.detail || String(err), variant: "destructive" });
    } finally {
      setDiagFixingId("");
    }
  };

  // ── Auto-corregir TODO lo que sea corregible ──────────────────────────
  const [diagFixingAll, setDiagFixingAll] = useState(false);
  const handleFixAll = async () => {
    if (!window.confirm("Se ejecutarán correcciones automáticas en todos los items que estén marcados como corregibles (reinstalar dependencias, recrear .env, resetear repo, etc.). ¿Continuar?")) return;
    setDiagFixingAll(true);
    try {
      const res = await fixAllDiagnosticIssues();
      if (res.fixed > 0 && res.failed === 0) {
        toast({
          title: `✓ Todo corregido (${res.fixed} items)`,
          description: `Score final: ${res.final_score}/100`,
        });
        fireEpic();
      } else if (res.fixed > 0) {
        toast({
          title: `Parcialmente corregido`,
          description: `${res.fixed} OK, ${res.failed} fallaron · Score: ${res.final_score}/100`,
        });
      } else {
        toast({
          title: `Nada que corregir`,
          description: `Todo lo corregible ya está OK · Score: ${res.final_score}/100`,
        });
      }
      await loadDiagnostic();
    } catch (err) {
      toast({ title: "Error al auto-corregir", description: err?.response?.data?.detail || String(err), variant: "destructive" });
    } finally {
      setDiagFixingAll(false);
    }
  };

  const handleOpenContext = async () => {
    setCtxOpen(true);
    setCtxLoading(true);
    try {
      const data = await getAiContext();
      setCtxContent(data.content || "");
      setCtxUpdatedAt(data.updated_at || "");
    } catch (err) {
      toast({ title: "Error al cargar contexto", variant: "destructive" });
    } finally {
      setCtxLoading(false);
    }
  };

  const handleSaveContext = async () => {
    setCtxSaving(true);
    try {
      await saveAiContext(ctxContent);
      setCtxEditing(false);
      toast({ title: "Contexto guardado", description: "La próxima IA tendrá esta información" });
      const data = await getAiContext();
      setCtxUpdatedAt(data.updated_at || "");
    } catch (err) {
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally {
      setCtxSaving(false);
    }
  };

  const handleResetContext = async () => {
    if (!window.confirm("¿Restaurar el contexto por defecto? Se perderán tus ediciones.")) return;
    try {
      const data = await resetAiContext();
      setCtxContent(data.content || "");
      toast({ title: "Contexto restaurado al valor por defecto" });
    } catch (err) {
      toast({ title: "Error al restaurar", variant: "destructive" });
    }
  };

  const handleCopyContext = async () => {
    try {
      await navigator.clipboard.writeText(ctxContent);
      toast({ title: "Copiado al portapapeles" });
    } catch {
      toast({ title: "No se pudo copiar", variant: "destructive" });
    }
  };


  const loadCleanupPreview = async () => {
    try {
      const res = await fetch(`${BASE}/api/data/cleanup?action=preview&months_old=6`, { method: "POST" });
      const data = await res.json();
      if (data.ok) setCleanupPreview(data);
    } catch (err) {
      console.error("[loadCleanupPreview]", err);
    }
  };

  const loadDbStats = () => {
    setDbLoading(true);
    getDbStats().then(setDbStats).catch(() => setDbStats(null)).finally(() => setDbLoading(false));
  };

  const loadBackupHistory = () =>
    getBackupHistory().then(setBackupHistory).catch(() => setBackupHistory([]));

  const handleDbTest = async () => {
    if (!activeConnUrl.trim()) return;
    setDbTesting(true); setDbTestResult(null);
    try {
      await testDbConnection(activeConnUrl.trim());
      setDbTestResult({ ok: true, msg: s.dbTestOk || "Conexión exitosa" });
    } catch (err) {
      setDbTestResult({ ok: false, msg: err.response?.data?.detail || "Error de conexión" });
    } finally { setDbTesting(false); }
  };

  const handleDbConnect = async () => {
    if (!activeConnUrl.trim()) return;
    setDbConnecting(true);
    try {
      if (dbOptions.autoTest) {
        try { await testDbConnection(activeConnUrl.trim()); }
        catch { toast({ title: "La prueba de conexión falló. Intenta igualmente.", variant: "destructive" }); }
      }
      await switchDatabase(activeConnUrl.trim());
      toast({ title: "Base de datos conectada ✓ — Actualizando..." });
      setNewDbUrl(""); setConnFields({ host: "", port: "27017", user: "", pass: "", db: "cinema_events" }); setDbTestResult(null);
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      toast({ title: err.response?.data?.detail || "Error al conectar", variant: "destructive" });
    } finally { setDbConnecting(false); }
  };

  const handleDbReset = async () => {
    setDbResetting(true);
    try {
      await resetDatabase();
      toast({ title: "Restaurado a base de datos predeterminada ✓ — Actualizando..." });
      setNewDbUrl(""); setDbTestResult(null);
      setTimeout(() => window.location.reload(), 1200);
    } catch { toast({ title: "Error", variant: "destructive" }); }
    finally { setDbResetting(false); }
  };

  const handleClearAll = async () => {
    setClearLoading(true);
    try {
      const res = await fetch(`${BASE}/api/data/clear-all`, { method: "DELETE" });
      const d = await res.json();
      setShowClear(false);
      toast({ title: `Datos eliminados — ${d.deleted_reservations} reservas, ${d.deleted_socios} socios` });
      loadAll();
    } catch { toast({ title: "Error al borrar", variant: "destructive" }); }
    finally { setClearLoading(false); }
  };

  const handleDownloadBackup = () => {
    const a = document.createElement("a");
    a.href = downloadBackupUrl(); a.download = "";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast({ title: "Descargando respaldo completo..." });
  };

  const handleCreateServerBackup = async () => {
    setBackupCreating(true);
    setBackupModal(true);
    const startedAt = Date.now();
    try {
      const r = await createServerBackup();
      // asegurar que el popup se vea al menos 1s
      const elapsed = Date.now() - startedAt;
      if (elapsed < 1000) await new Promise(res => setTimeout(res, 1000 - elapsed));
      setBackupModal(false);
      fireEpic("success");
      toast({ title: "🎉 Copia de seguridad completa lista", description: r.message || "Se respaldó toda la información" });
      loadBackupHistory();
    } catch (e) {
      setBackupModal(false);
      toast({ title: e.response?.data?.detail || "Error al crear la copia", variant: "destructive" });
    } finally { setBackupCreating(false); }
  };

  const handleOptimize = async () => {
    setOptimizing(true);
    try {
      // 1) Optimizar/compactar BD en el backend
      const r = await optimizeDatabase();
      // 2) Refrescar TODOS los datos de la app en el cliente (reservas, socios, apariencia, settings)
      try { window.dispatchEvent(new Event("cp:refresh-all")); } catch {}
      try { await loadAll?.(); } catch {}
      try { await loadDbStats?.(); } catch {}
      toast({
        title: "Base de datos actualizada ✓",
        description: r.message || "Reservas, contactos, diseño y configuración sincronizados",
      });
    } catch (e) {
      toast({ title: e.response?.data?.detail || "Error al actualizar", variant: "destructive" });
    } finally { setOptimizing(false); }
  };

  const handleRestoreFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreLoading(true); setRestoreResult(null);
    try {
      const r = await restoreBackup(file);
      setRestoreResult({ ok: true, msg: r.message });
      toast({ title: r.message });
      loadAll();
    } catch (err) {
      const msg = err.response?.data?.detail || "Error al restaurar el archivo";
      setRestoreResult({ ok: false, msg });
      toast({ title: msg, variant: "destructive" });
    } finally {
      setRestoreLoading(false);
      if (restoreInputRef.current) restoreInputRef.current.value = "";
      if (restoreAutoInputRef.current) restoreAutoInputRef.current.value = "";
    }
  };

  const handleDeleteBackup = async (filename) => {
    try {
      await deleteBackupFile(filename);
      setBackupHistory(prev => prev.filter(b => b.filename !== filename));
      toast({ title: "Respaldo eliminado" });
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleExport = async (format) => {
    try {
      const res = await fetch(`${BASE}/api/export/reservations?format=${format}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = format === "json" ? "reservaciones.json" : "reservaciones.csv";
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); window.URL.revokeObjectURL(url);
      toast({ title: `Exportado como ${format.toUpperCase()} ✓` });
    } catch { toast({ title: "Error al exportar", variant: "destructive" }); }
  };

  const handleExportXLSX = async () => {
    try {
      const res = await fetch(`${BASE}/api/export/reservations/xlsx`);
      if (!res.ok) throw new Error("Error al generar Excel");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `reservaciones_${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); window.URL.revokeObjectURL(url);
      toast({ title: "Excel descargado ✓" });
    } catch (e) { toast({ title: e.message || "Error al exportar Excel", variant: "destructive" }); }
  };

  const handleCsvImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvImportLoading(true); setCsvImportResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${BASE}/api/import/reservations`, { method: "POST", body: form });
      const data = await res.json();
      setCsvImportResult(data);
      toast({ title: data.message });
      if (data.imported > 0) { loadDbStats(); loadCleanupPreview(); }
    } catch { toast({ title: "Error al importar CSV", variant: "destructive" }); }
    finally {
      setCsvImportLoading(false);
      if (csvImportRef.current) csvImportRef.current.value = "";
    }
  };

  const handleCleanup = async (action) => {
    setCleanupLoading(true); setCleanupAction(action);
    try {
      const res = await fetch(`${BASE}/api/data/cleanup?action=${action}&months_old=6`, { method: "POST" });
      const data = await res.json();
      toast({ title: data.message });
      loadDbStats(); loadCleanupPreview();
    } catch { toast({ title: "Error en limpieza", variant: "destructive" }); }
    finally { setCleanupLoading(false); setCleanupAction(null); }
  };

  const handleExportPDF = async () => {
    setPdfLoading(true);
    try {
      const reservations = await getReservations();
      if (!reservations.length) { toast({ title: "No hay reservas para exportar", variant: "destructive" }); return; }
      const logo = usePdfLogo ? (useCustomPdfLogo && pdfLogoUrl ? pdfLogoUrl : logoUrl || undefined) : null;
      await generateAllReservationsPDF(reservations, formatCurrency, logo, pdfTheme);
      toast({ title: `PDF generado — ${reservations.length} reservas ✓` });
    } catch (e) { toast({ title: e.message || "Error al generar PDF", variant: "destructive" }); }
    finally { setPdfLoading(false); }
  };

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
        <h1 className="text-5xl font-black gradient-text" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
          Base de Datos
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1.5">Respaldos y conexión a la base de datos en la nube</p>
      </motion.div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4">

        {/* ── ONBOARDING BANNER: sugerir Atlas de fábrica ── */}
        {(() => {
          const dismissed = (() => { try { return localStorage.getItem("cp_atlas_banner_dismissed") === "1"; } catch { return false; } })();
          const isOnAtlas = dbStats?.is_atlas;
          const factoryPreset = presets.find(p => p.factory);
          if (dismissed || isOnAtlas || !factoryPreset) return null;
          return (
            <motion.div variants={fadeUp} data-testid="atlas-onboarding-banner"
              className="relative overflow-hidden rounded-3xl p-5 border border-emerald-200/70"
              style={{ background: "linear-gradient(120deg, rgba(236,253,245,0.95), rgba(219,234,254,0.85))" }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/70 flex items-center justify-center shrink-0 shadow-sm">
                  <Sparkles size={22} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-slate-800 flex items-center gap-2">
                    Tu base de datos en la nube ya está lista
                    <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500 text-white">De fábrica</span>
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Migra tus datos a la nube en 1 clic — accesibles desde cualquier dispositivo, con respaldo automático.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                    data-testid="atlas-onboarding-connect"
                    onClick={async () => {
                      try {
                        await switchDatabase(factoryPreset.url);
                        toast({ title: "Conectado a la base de datos en la nube ✓ — Actualizando..." });
                        try { localStorage.setItem("cp_atlas_banner_dismissed", "1"); } catch {}
                        setTimeout(() => window.location.reload(), 1200);
                      } catch (e) { toast({ title: e.response?.data?.detail || "Error al conectar", variant: "destructive" }); }
                    }}
                    className="px-4 py-2 rounded-2xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md flex items-center gap-1.5">
                    <ArrowRight size={13} /> Conectar ahora
                  </motion.button>
                  <button
                    data-testid="atlas-onboarding-dismiss"
                    onClick={() => { try { localStorage.setItem("cp_atlas_banner_dismissed", "1"); } catch {} ; loadAll(); }}
                    className="w-8 h-8 rounded-xl bg-white/60 hover:bg-white text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
                    title="Recordarme más tarde">
                    <XCircle size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })()}

        {/* ── RESPALDO AUTOMÁTICO EN PC ── */}
        <motion.div variants={fadeUp}>
          <div
            style={{ background: autoBackup.config.enabled ? "linear-gradient(135deg,rgba(236,253,245,0.95),rgba(209,250,229,0.7))" : undefined }}
            className={`glass rounded-3xl overflow-hidden transition-all duration-300 ${autoBackup.config.enabled ? "ring-2 ring-emerald-400/50" : ""}`}>

            {/* Header */}
            <div onClick={() => toggleBlock("backup")} data-testid="db-block-toggle-backup"
              className="flex items-center justify-between px-5 py-4 border-b border-white/40 cursor-pointer select-none">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${autoBackup.config.enabled ? "bg-emerald-200" : "bg-slate-100"}`}>
                  <Zap size={16} className={autoBackup.config.enabled ? "text-emerald-700" : "text-slate-400"} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                    Respaldo Automático al PC
                  </p>
                  <p className="text-[11px] text-slate-400">Guarda copias automáticas en tu computadora</p>
                </div>
              </div>
              {/* Status badge */}
              <div className="flex items-center gap-2">
                {autoBackup.config.enabled && (
                  <span className="flex items-center gap-1.5 text-[10px] font-black px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    ACTIVO
                  </span>
                )}
                {/* Toggle */}
                <button
                  data-testid="auto-backup-toggle"
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = !autoBackup.config.enabled;
                    autoBackup.updateConfig({ enabled: next });
                    if (next) toast({ title: "Respaldo automático activado ✓" });
                    else toast({ title: "Respaldo automático desactivado" });
                  }}
                  className={`w-11 h-6 rounded-full transition-all duration-300 relative ${autoBackup.config.enabled ? "bg-emerald-500" : "bg-slate-200"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${autoBackup.config.enabled ? "left-[22px]" : "left-0.5"}`} />
                </button>
                <BlockChevron open={openBlocks.backup} />
              </div>
            </div>

            <CollapseBody open={openBlocks.backup}>
            <div className="p-5 space-y-4">

              {/* ── Status display when active ── */}
              <AnimatePresence>
                {autoBackup.config.enabled && (
                  <motion.div key="status" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                    className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-50 rounded-2xl p-3 text-center">
                      <div className="text-lg font-black text-emerald-700" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>{autoBackup.backupCount}</div>
                      <div className="text-[10px] font-bold text-emerald-500 mt-0.5">Respaldos esta sesión</div>
                    </div>
                    <div className="bg-white/70 rounded-2xl p-3 text-center border border-emerald-100">
                      <div className="text-xs font-black text-slate-700 truncate">{lastAgoDisplay || "—"}</div>
                      <div className="text-[10px] font-bold text-slate-400 mt-0.5">Último respaldo</div>
                    </div>
                    <div className="bg-white/70 rounded-2xl p-3 text-center border border-emerald-100">
                      <div className="text-xs font-black text-slate-700">{countdown || "—"}</div>
                      <div className="text-[10px] font-bold text-slate-400 mt-0.5">Próximo en</div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Interval selector ── */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Frecuencia de respaldo</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "30 min", value: 30 },
                    { label: "1 hora", value: 60 },
                    { label: "2 horas", value: 120 },
                    { label: "6 horas", value: 360 },
                    { label: "12 horas", value: 720 },
                    { label: "24 horas", value: 1440 },
                  ].map(({ label, value }) => {
                    const active = autoBackup.config.intervalMinutes === value;
                    return (
                      <motion.button key={value} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        data-testid={`interval-${value}`}
                        onClick={() => autoBackup.updateConfig({ intervalMinutes: value })}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${active ? "bg-emerald-500 text-white shadow-sm" : "bg-white/60 text-slate-600 border border-slate-200/80 hover:bg-white"}`}>
                        {label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* ── Mode selector ── */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Destino del respaldo</p>
                <div className="grid grid-cols-2 gap-2.5">

                  {/* Downloads folder */}
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    data-testid="mode-downloads"
                    onClick={() => autoBackup.updateConfig({ mode: "downloads" })}
                    className={`flex flex-col items-start gap-2 p-4 rounded-2xl border-2 transition-all text-left ${autoBackup.config.mode === "downloads" ? "border-emerald-400 bg-emerald-50/60" : "border-slate-200/70 bg-white/50 hover:border-slate-300"}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${autoBackup.config.mode === "downloads" ? "bg-emerald-200" : "bg-slate-100"}`}>
                      <Download size={14} className={autoBackup.config.mode === "downloads" ? "text-emerald-700" : "text-slate-400"} />
                    </div>
                    <div>
                      <p className={`text-xs font-black ${autoBackup.config.mode === "downloads" ? "text-emerald-800" : "text-slate-700"}`}>Carpeta Descargas</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Descarga automática a tu carpeta Descargas del sistema</p>
                    </div>
                    {autoBackup.config.mode === "downloads" && (
                      <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1">
                        <CheckCircle size={10} /> Seleccionado
                      </span>
                    )}
                  </motion.button>

                  {/* Fixed custom folder */}
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    data-testid="mode-folder"
                    onClick={async () => {
                      if (!autoBackup.fsSupportado) {
                        toast({ title: "Tu navegador no soporta carpeta fija (usa Chrome o Edge)", variant: "destructive" });
                        return;
                      }
                      if (autoBackup.config.folderName && autoBackup.config.mode === "folder") {
                        autoBackup.updateConfig({ mode: "folder" });
                        return;
                      }
                      const ok = await autoBackup.pickFolder();
                      if (ok) toast({ title: `Carpeta seleccionada: ${autoBackup.config.folderName} ✓` });
                    }}
                    className={`flex flex-col items-start gap-2 p-4 rounded-2xl border-2 transition-all text-left ${autoBackup.config.mode === "folder" ? "border-indigo-400 bg-indigo-50/60" : "border-slate-200/70 bg-white/50 hover:border-slate-300"}`}>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${autoBackup.config.mode === "folder" ? "bg-indigo-200" : "bg-slate-100"}`}>
                      <FolderOpen size={14} className={autoBackup.config.mode === "folder" ? "text-indigo-700" : "text-slate-400"} />
                    </div>
                    <div>
                      <p className={`text-xs font-black ${autoBackup.config.mode === "folder" ? "text-indigo-800" : "text-slate-700"}`}>Carpeta fija</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {autoBackup.config.folderName ? `📁 ${autoBackup.config.folderName}` : "Elige una carpeta y la app siempre guardará ahí"}
                      </p>
                    </div>
                    {autoBackup.config.mode === "folder" && autoBackup.config.folderName && (
                      <span className="text-[10px] font-black text-indigo-600 flex items-center gap-1">
                        <CheckCircle size={10} /> {autoBackup.folderPerm === "granted" ? "Acceso activo" : "Clic para reactivar"}
                      </span>
                    )}
                    {!autoBackup.fsSupportado && (
                      <span className="text-[10px] text-amber-500 font-bold">Solo Chrome/Edge</span>
                    )}
                  </motion.button>
                </div>

                {/* Folder details / change */}
                <AnimatePresence>
                  {autoBackup.config.mode === "folder" && autoBackup.config.folderName && (
                    <motion.div key="folder-info" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="mt-2.5 flex items-center gap-3 bg-indigo-50/70 rounded-2xl px-4 py-3 border border-indigo-200/50">
                      <Folder size={14} className="text-indigo-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-indigo-800 truncate">📁 {autoBackup.config.folderName}</p>
                        <p className="text-[10px] text-indigo-400">
                          {autoBackup.folderPerm === "granted" ? "Acceso concedido — guardando automáticamente" : "Clic en 'Cambiar carpeta' para reactivar el acceso"}
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={autoBackup.pickFolder} data-testid="change-folder-btn"
                          className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors">
                          Cambiar
                        </button>
                        <button onClick={() => { autoBackup.clearFolder(); toast({ title: "Carpeta eliminada" }); }}
                          data-testid="clear-folder-btn"
                          className="px-2 py-1.5 rounded-xl text-[10px] font-bold bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Error message ── */}
              {autoBackup.lastError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200/60 rounded-xl px-4 py-2.5 text-xs text-red-600 font-semibold">
                  <AlertCircle size={13} />
                  {autoBackup.lastError}
                </div>
              )}

              {/* ── Manual trigger button ── */}
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                onClick={() => {
                  autoBackup.triggerBackup();
                  toast({ title: "Creando respaldo ahora..." });
                }}
                disabled={autoBackup.isBacking}
                data-testid="manual-auto-backup-btn"
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#10b981,#059669)" }}>
                {autoBackup.isBacking
                  ? <><Loader2 size={14} className="animate-spin" /> Guardando respaldo...</>
                  : <><Download size={14} /> Guardar respaldo ahora</>}
              </motion.button>

              {/* ── Contenido del respaldo ── */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Incluye:</span>
                {["Reservas", "Socios", "Apariencia", "Temas", "Config.", "Todo"].map((tag) => (
                  <span key={tag} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                    <CheckCircle size={8} /> {tag}
                  </span>
                ))}
              </div>

              {/* ── Restaurar desde archivo ── */}
              <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/30 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-emerald-100/60">
                  <Upload size={13} className="text-emerald-600" />
                  <p className="text-xs font-black text-emerald-800">Restaurar respaldo</p>
                  <span className="text-[10px] text-emerald-500 ml-auto">Sube un archivo .json guardado</span>
                </div>
                <div className="p-3 space-y-2">
                  <input ref={restoreAutoInputRef} type="file" accept=".json"
                    onChange={handleRestoreFile} className="hidden" id="restore-file-auto-input" data-testid="restore-file-auto-input" />
                  <label htmlFor="restore-file-auto-input"
                    className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all border-2 border-dashed ${restoreLoading ? "border-emerald-200 bg-emerald-50 text-emerald-300" : "border-emerald-300 bg-white hover:bg-emerald-50 text-emerald-700"}`}>
                    {restoreLoading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                    {restoreLoading ? "Restaurando datos..." : "Seleccionar archivo .json para restaurar"}
                  </label>
                  {restoreResult && (
                    <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl ${restoreResult.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                      {restoreResult.ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {restoreResult.msg}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Guardar en servidor ── */}
              <div className="grid grid-cols-2 gap-3">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleCreateServerBackup} disabled={backupCreating} data-testid="backup-server-btn"
                  className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-white/70 border border-emerald-200/60 text-emerald-700 disabled:opacity-60 hover:bg-emerald-50 transition-all">
                  {backupCreating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span className="text-xs font-bold">Guardar en servidor</span>
                  <span className="text-[9px] opacity-60">Historial 15 respaldos</span>
                </motion.button>
                <div className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-white/50 border border-slate-100">
                  <HardDrive size={16} className="text-slate-400" />
                  <span className="text-xs font-bold text-slate-600">{backupHistory.length} respaldo(s)</span>
                  <button onClick={loadBackupHistory} className="text-[9px] text-indigo-500 font-bold hover:underline">Actualizar lista</button>
                </div>
              </div>

              {/* ── Backup history list ── */}
              {backupHistory.length > 0 && (
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
                  {backupHistory.map((b, i) => {
                    const isAuto = b.label === "auto";
                    return (
                      <div key={b.filename} className="flex items-center gap-2.5 bg-white/60 border border-slate-100 rounded-xl px-3 py-2 hover:bg-white/80 transition-all">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${isAuto ? "bg-slate-100" : "bg-indigo-100"}`}>
                          {isAuto ? <Clock size={10} className="text-slate-400" /> : <ShieldCheck size={10} className="text-indigo-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-slate-700 truncate">{b.filename}</p>
                          <span className="text-[9px] text-slate-400">{b.size} · {fmtDate(b.created_at)}</span>
                        </div>
                        <a href={downloadBackupFileUrl(b.filename)} download data-testid={`backup-dl-${b.filename}`}
                          className="w-6 h-6 rounded-lg bg-indigo-50 hover:bg-indigo-100 flex items-center justify-center transition-colors">
                          <Download size={10} className="text-indigo-600" />
                        </a>
                        <button onClick={() => handleDeleteBackup(b.filename)} data-testid={`backup-del-${b.filename}`}
                          className="w-6 h-6 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors">
                          <Trash2 size={10} className="text-red-400" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Info note ── */}
              <div className="flex items-start gap-2.5 bg-amber-50/60 rounded-2xl px-4 py-3 border border-amber-200/50">
                <AlertCircle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-700 leading-relaxed">
                  El respaldo automático funciona mientras esta página esté abierta. Para respaldos en segundo plano usa "Guardar en servidor".
                </p>
              </div>

            </div>
            </CollapseBody>
          </div>
        </motion.div>

        {/* ── CONEXIÓN MONGODB (UNIFICADO) ── */}
        <motion.div variants={fadeUp}>
          <div className="glass rounded-3xl overflow-hidden">
            {/* Header */}
            <div onClick={() => toggleBlock("conn")} data-testid="db-block-toggle-conn"
              className="flex items-center justify-between px-5 py-4 border-b border-white/40 cursor-pointer select-none">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <Database size={16} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>Base de datos en la nube</p>
                  <p className="text-[11px] text-slate-400">Estado, conexión y bases guardadas</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {dbStats && (
                  <span className={`flex items-center gap-1.5 text-[10px] font-black px-3 py-1 rounded-full ${dbStats.is_custom ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                    {dbStats.is_custom ? <WifiOff size={10} /> : <Wifi size={10} />}
                    {dbStats.is_custom ? "BD Personalizada" : "BD Local"}
                  </span>
                )}
                <button onClick={(e) => { e.stopPropagation(); loadDbStats(); }} className="w-8 h-8 rounded-xl hover:bg-white/60 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-all">
                  <RefreshCw size={13} className={dbLoading ? "animate-spin" : ""} />
                </button>
                <BlockChevron open={openBlocks.conn} />
              </div>
            </div>

            <CollapseBody open={openBlocks.conn}>
            <div className="p-5 space-y-5">

              {/* ── Stats ── */}
              {dbLoading ? (
                <div className="flex items-center justify-center py-6 gap-3 text-slate-400">
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm">Cargando estadísticas...</span>
                </div>
              ) : dbStats ? (
                <div className="space-y-3">
                  {dbStats.connection_error && (
                    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                      <WifiOff size={14} className="text-red-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-red-700">Sin conexión a la base de datos en la nube</p>
                        <p className="text-[10px] text-red-500 mt-0.5">Verifica tu internet y que el URL sea correcto.</p>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Colecciones", value: dbStats.collections, color: "bg-indigo-50 text-indigo-700" },
                      { label: "Documentos",  value: dbStats.objects?.toLocaleString(), color: "bg-emerald-50 text-emerald-700" },
                      { label: "Tamaño",      value: dbStats.total_size, color: "bg-violet-50 text-violet-700" },
                    ].map((item) => (
                      <div key={item.label} className={`rounded-2xl p-4 ${item.color}`}>
                        <div className="text-xl font-black" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>{item.value}</div>
                        <div className="text-[11px] font-semibold mt-1 opacity-70">{item.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50/80 rounded-2xl px-4 py-3">
                    <Link2 size={13} className="text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Conexión activa</p>
                      <p className="text-xs font-mono text-slate-600 truncate">{dbStats.current_url}</p>
                    </div>
                  </div>

                  {/* ── Espacio disponible ── */}
                  {dbStats.free_size && (
                    <div data-testid="db-space-info" className="bg-slate-50/80 rounded-2xl px-4 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Espacio {dbStats.is_atlas ? "(en la nube)" : ""}
                        </p>
                        <p className="text-[11px] font-black text-slate-600">
                          {dbStats.used_size} usado{dbStats.limit_size && dbStats.limit_size !== "—" ? ` / ${dbStats.limit_size}` : ""}
                        </p>
                      </div>
                      {typeof dbStats.used_pct === "number" && dbStats.limit_size !== "—" ? (
                        <>
                          <div className="h-2.5 rounded-full bg-slate-200 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(2, dbStats.used_pct)}%` }}
                              transition={{ duration: 0.8 }}
                              className={`h-full rounded-full ${dbStats.used_pct > 85 ? "bg-red-500" : dbStats.used_pct > 60 ? "bg-amber-500" : "bg-emerald-500"}`}
                            />
                          </div>
                          <p className="text-[11px] font-bold text-emerald-600 mt-1.5">
                            Te queda {dbStats.free_size} libre ({(100 - dbStats.used_pct).toFixed(1)}%)
                          </p>
                        </>
                      ) : (
                        <p className="text-[11px] font-bold text-emerald-600">{dbStats.free_size}</p>
                      )}
                    </div>
                  )}

                  {/* ── Actualizar base de datos ── */}
                  <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                    onClick={handleOptimize} disabled={optimizing}
                    data-testid="optimize-db-btn"
                    title="Sincroniza reservas, contactos, diseño, configuración y todo el estado de la app. Compacta y reordena la BD."
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold disabled:opacity-60 shadow-md">
                    {optimizing
                      ? <><RefreshCw size={14} className="animate-spin" /> Actualizando datos…</>
                      : <><RefreshCw size={14} /> Actualizar base de datos</>}
                  </motion.button>
                  <p className="text-[10px] text-slate-400 -mt-1 px-1">
                    Sincroniza reservas · contactos · diseño · configuración · optimiza la BD
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between py-4">
                  <p className="text-sm text-slate-400">No se pudieron cargar las estadísticas</p>
                  <button onClick={loadDbStats} className="text-xs text-indigo-500 font-bold hover:underline">Reintentar</button>
                </div>
              )}

              {/* ── Cambiar conexión ── */}
              <div className="border-t border-white/30 pt-4 space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cambiar conexión</p>

                {/* Mode tabs */}
                <div className="flex gap-1 p-1 rounded-2xl bg-slate-100/70">
                  {[
                    { key: "url",    icon: Globe,   label: "URL completa" },
                    { key: "fields", icon: Server,  label: "Por IP/campos" },
                    { key: "nas",    icon: Network,  label: "NAS / Red local" },
                  ].map(({ key, icon: Icon, label }) => (
                    <button key={key} onClick={() => { setConnMode(key); setDbTestResult(null); }}
                      data-testid={`conn-mode-${key}`}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-[11px] font-bold transition-all ${connMode === key ? "bg-white shadow-sm text-indigo-700" : "text-slate-500 hover:text-slate-700"}`}>
                      <Icon size={12} /> {label}
                    </button>
                  ))}
                </div>

                {dbStats?.connection_error && (
                  <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                    onClick={() => { setConnMode("url"); setNewDbUrl(dbStats.current_url?.includes("***") ? "" : (dbStats.current_url || "")); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold hover:bg-amber-100 transition-all">
                    <Wifi size={12} /> Reintentar con URL actual
                  </motion.button>
                )}

                {/* Mode: URL completa */}
                {connMode === "url" && (
                  <input type="text" value={newDbUrl}
                    onChange={e => { setNewDbUrl(e.target.value); setDbTestResult(null); }}
                    placeholder="mongodb+srv://usuario:contraseña@cluster.mongodb.net"
                    data-testid="db-url-input"
                    className="w-full bg-white/60 border border-slate-200/80 rounded-xl px-4 py-3 text-sm font-mono text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent" />
                )}

                {/* Mode: Por IP/campos */}
                {connMode === "fields" && (
                  <div className="space-y-2.5 p-4 rounded-2xl bg-slate-50/60 border border-slate-200/50">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Host / IP *</label>
                        <input value={connFields.host} onChange={e => setConnFields(p => ({ ...p, host: e.target.value }))}
                          placeholder="192.168.1.100 o cluster.mongodb.net" data-testid="field-host"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300" />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Puerto</label>
                        <input value={connFields.port} onChange={e => setConnFields(p => ({ ...p, port: e.target.value }))}
                          placeholder="27017" data-testid="field-port"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Usuario</label>
                        <input value={connFields.user} onChange={e => setConnFields(p => ({ ...p, user: e.target.value }))}
                          placeholder="admin" data-testid="field-user"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300" />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Contraseña</label>
                        <input type="password" value={connFields.pass} onChange={e => setConnFields(p => ({ ...p, pass: e.target.value }))}
                          placeholder="••••••••" data-testid="field-pass"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Base de datos</label>
                      <input value={connFields.db} onChange={e => setConnFields(p => ({ ...p, db: e.target.value }))}
                        placeholder="cinema_events" data-testid="field-db"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-300" />
                    </div>
                    {buildUrlFromFields() && (
                      <div className="flex items-center gap-2 bg-indigo-50/50 rounded-xl px-3 py-2">
                        <Link2 size={10} className="text-indigo-400 shrink-0" />
                        <p className="text-[10px] font-mono text-indigo-700 truncate">{buildUrlFromFields().replace(/:([^@]+)@/, ":***@")}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Mode: NAS / Red local */}
                {connMode === "nas" && (
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2.5 bg-blue-50/60 rounded-2xl px-4 py-3 border border-blue-200/50">
                      <Network size={13} className="text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-bold text-blue-700 mb-0.5">Conexión a NAS o servidor en red</p>
                        <p className="text-[9px] text-blue-600 leading-relaxed">
                          Ingresa la IP de tu NAS (Synology, QNAP, etc.) o servidor local con MongoDB. El puerto estándar de MongoDB es <strong>27017</strong>.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 p-4 rounded-2xl bg-slate-50/60 border border-slate-200/50">
                      <div className="col-span-2">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 block">IP del NAS / Servidor *</label>
                        <input value={connFields.host} onChange={e => setConnFields(p => ({ ...p, host: e.target.value }))}
                          placeholder="192.168.1.50" data-testid="nas-field-host"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Puerto MongoDB</label>
                        <input value={connFields.port} onChange={e => setConnFields(p => ({ ...p, port: e.target.value }))}
                          placeholder="27017" data-testid="nas-field-port"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                      </div>
                      <div className="col-span-3 grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Usuario MongoDB</label>
                          <input value={connFields.user} onChange={e => setConnFields(p => ({ ...p, user: e.target.value }))}
                            placeholder="admin" data-testid="nas-field-user"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Contraseña</label>
                          <input type="password" value={connFields.pass} onChange={e => setConnFields(p => ({ ...p, pass: e.target.value }))}
                            placeholder="••••••••" data-testid="nas-field-pass"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                        </div>
                      </div>
                      <div className="col-span-3">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Base de datos</label>
                        <input value={connFields.db} onChange={e => setConnFields(p => ({ ...p, db: e.target.value }))}
                          placeholder="cinema_events" data-testid="nas-field-db"
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                      </div>
                      {buildUrlFromFields() && (
                        <div className="col-span-3 flex items-center gap-2 bg-blue-50/50 rounded-xl px-3 py-2">
                          <Link2 size={10} className="text-blue-400 shrink-0" />
                          <p className="text-[10px] font-mono text-blue-700 truncate">{buildUrlFromFields().replace(/:([^@]+)@/, ":***@")}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-start gap-2 bg-amber-50/60 rounded-2xl px-4 py-3 border border-amber-200/50 text-[9px] text-amber-700">
                      <AlertCircle size={11} className="shrink-0 mt-0.5" />
                      <span>Asegúrate que MongoDB esté instalado en el NAS y que el puerto 27017 esté abierto en el firewall de tu red local.</span>
                    </div>
                  </div>
                )}

                {dbTestResult && (
                  <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-2.5 rounded-xl ${dbTestResult.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" : "bg-red-50 text-red-600 border border-red-200/60"}`}>
                    {dbTestResult.ok ? <CheckCircle size={13} /> : <XCircle size={13} />}
                    {dbTestResult.msg}
                  </div>
                )}
                <div className="flex gap-2">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={handleDbTest} disabled={!activeConnUrl.trim() || dbTesting} data-testid="db-test-btn"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all disabled:opacity-40">
                    {dbTesting ? <Loader2 size={12} className="animate-spin" /> : <Wifi size={12} />}
                    Probar
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={handleDbConnect} disabled={!activeConnUrl.trim() || dbConnecting} data-testid="db-connect-btn"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl btn-primary text-white text-xs font-bold disabled:opacity-40">
                    {dbConnecting ? <Loader2 size={12} className="animate-spin" /> : <ArrowRight size={12} />}
                    Conectar
                  </motion.button>
                  {dbStats?.is_custom && (
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={handleDbReset} disabled={dbResetting} data-testid="db-reset-btn"
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-all border border-red-200/60 disabled:opacity-40">
                      {dbResetting ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      Restaurar local
                    </motion.button>
                  )}
                </div>
              </div>

              {/* ── Conexiones guardadas ── */}
              <div className="border-t border-white/30 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conexiones guardadas</p>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => setShowAddPreset(p => !p)} data-testid="add-preset-btn"
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors">
                    <Plus size={11} /> Agregar
                  </motion.button>
                </div>

                <AnimatePresence>
                  {showAddPreset && (
                    <motion.div key="add-form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 pb-3 border-b border-white/40">
                      <input type="text" value={presetName}
                        onChange={e => setPresetName(e.target.value)}
                        placeholder="Nombre (ej: Atlas Producción)"
                        data-testid="preset-name-input"
                        className="w-full bg-white/60 border border-slate-200/80 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-300" />
                      <div className="flex gap-2">
                        <input type="text" value={newDbUrl}
                          onChange={e => { setNewDbUrl(e.target.value); setDbTestResult(null); }}
                          placeholder="mongodb://... o mongodb+srv://..."
                          className="flex-1 bg-white/60 border border-slate-200/80 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-300" />
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                          data-testid="save-preset-btn"
                          disabled={!presetName.trim() || !newDbUrl.trim()}
                          onClick={() => {
                            const newPreset = { name: presetName.trim(), url: newDbUrl.trim(), color: ["indigo","emerald","sky","amber","rose","violet"][presets.length % 6] };
                            savePresets([...presets, newPreset]);
                            setPresetName(""); setNewDbUrl(""); setShowAddPreset(false);
                            toast({ title: `Preset "${newPreset.name}" guardado ✓` });
                          }}
                          className="px-4 py-2.5 rounded-xl bg-amber-500 text-white text-xs font-bold disabled:opacity-40 hover:bg-amber-600 transition-colors">
                          <Save size={12} />
                        </motion.button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {presets.length === 0 ? (
                  <div className="flex items-center justify-center py-4 text-slate-300 gap-2">
                    <Bookmark size={14} />
                    <span className="text-xs">No hay conexiones guardadas</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {presets.map((p, i) => {
                      const colors = {
                        indigo: "bg-indigo-50 border-indigo-200/60 text-indigo-700",
                        emerald: "bg-emerald-50 border-emerald-200/60 text-emerald-700",
                        sky: "bg-sky-50 border-sky-200/60 text-sky-700",
                        amber: "bg-amber-50 border-amber-200/60 text-amber-700",
                        rose: "bg-rose-50 border-rose-200/60 text-rose-700",
                        violet: "bg-violet-50 border-violet-200/60 text-violet-700",
                      };
                      return (
                        <div key={p.url || p.name || i} className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${colors[p.color] || colors.indigo}`}>
                          <Database size={13} className="shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-black truncate">{p.name}</p>
                              {p.factory && (
                                <span
                                  data-testid={`preset-factory-badge-${i}`}
                                  title="Conexión precargada con el proyecto"
                                  className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/70 border border-current/20 text-[8px] font-black uppercase tracking-wider"
                                >
                                  <Star size={8} className="fill-current" />
                                  De fábrica
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] font-mono opacity-60 truncate">{p.url.replace(/:([^@]+)@/, ":***@")}</p>
                          </div>
                          <div className="flex gap-1.5">
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              data-testid={`preset-connect-${i}`}
                              onClick={async () => {
                                setNewDbUrl(p.url);
                                try {
                                  await switchDatabase(p.url);
                                  toast({ title: `Conectado a "${p.name}" ✓ — Actualizando...` });
                                  setTimeout(() => window.location.reload(), 1200);
                                } catch (e) { toast({ title: e.response?.data?.detail || "Error al conectar", variant: "destructive" }); }
                              }}
                              className="px-3 py-1.5 rounded-xl text-[10px] font-bold bg-white/80 hover:bg-white transition-colors border border-white/60">
                              Conectar
                            </motion.button>
                            <button onClick={() => {
                                const target = presets[i];
                                if (target?.factory) {
                                  // Registrar dismiss para no volver a añadirla en el próximo load
                                  try {
                                    const d = JSON.parse(localStorage.getItem("cp_db_factory_dismissed")) || [];
                                    if (!d.includes(target.url)) {
                                      d.push(target.url);
                                      localStorage.setItem("cp_db_factory_dismissed", JSON.stringify(d));
                                    }
                                  } catch { /* noop */ }
                                }
                                savePresets(presets.filter((_, j) => j !== i));
                              }}
                              data-testid={`preset-delete-${i}`}
                              className="w-7 h-7 rounded-lg bg-white/60 hover:bg-red-50 flex items-center justify-center transition-colors">
                              <Trash2 size={10} className="text-red-400" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* MongoDB Atlas guide — removido por preferencia del proyecto */}
              </div>

            </div>
            </CollapseBody>
          </div>
        </motion.div>




        {/* ── GITHUB & CONTEXTO IA ── */}
        <motion.div variants={fadeUp}>
          <div className={`glass rounded-3xl overflow-hidden transition-all duration-300 ${ghConfig.repo_url ? "ring-2 ring-slate-800/30" : ""}`}
            style={{ background: ghConfig.repo_url ? "linear-gradient(135deg,rgba(30,41,59,0.05),rgba(15,23,42,0.03))" : undefined }}>

            <div onClick={() => toggleBlock("github")} data-testid="db-block-toggle-github"
              className="flex items-center justify-between px-5 py-4 border-b border-white/40 cursor-pointer select-none">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${ghConfig.repo_url ? "bg-slate-900" : "bg-slate-100"}`}>
                  <Github size={16} className={ghConfig.repo_url ? "text-white" : "text-slate-400"} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                    GitHub & Contexto IA
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {ghConfig.repo_url ? "Repositorio conectado ✓" : "Conecta tu repositorio para sincronizar"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {ghConfig.repo_url && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                    Activo
                  </span>
                )}
                <BlockChevron open={openBlocks.github} />
              </div>
            </div>

            <CollapseBody open={openBlocks.github}>
              <div className="p-5 space-y-5">

                {/* ── Conectar con GitHub (1 clic) ── */}
                <div className={`rounded-2xl border p-4 ${ghConfig.username ? "bg-emerald-50/70 border-emerald-200" : "bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 text-white"}`}>
                  {ghConfig.username ? (
                    <div className="flex items-center gap-3">
                      {ghConfig.avatar_url ? (
                        <img src={ghConfig.avatar_url} alt={ghConfig.username} className="w-10 h-10 rounded-full border-2 border-emerald-300 shadow-sm" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black">
                          {ghConfig.username[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <UserCheck size={13} className="text-emerald-600" />
                          <p className="text-sm font-black text-emerald-800 truncate">@{ghConfig.username}</p>
                        </div>
                        <p className="text-[10px] text-emerald-700/70">
                          {ghConfig.connected_at ? `Conectado ${new Date(ghConfig.connected_at).toLocaleString("es-GT")}` : "Cuenta activa"}
                        </p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        onClick={handleDisconnectGithub}
                        data-testid="github-disconnect-btn"
                        className="px-3 py-1.5 rounded-xl bg-white text-slate-700 text-xs font-bold flex items-center gap-1.5 border border-slate-200 hover:bg-slate-50"
                      >
                        <LogOut size={11} /> Desconectar
                      </motion.button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center flex-shrink-0">
                        <Github size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black">Conecta tu cuenta de GitHub</p>
                        <p className="text-[11px] text-white/60 mt-0.5">Sube cambios y guarda backups directo al repositorio</p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.96 }}
                        onClick={() => setGhConnectOpen(true)}
                        data-testid="github-connect-btn"
                        className="px-4 py-2.5 rounded-2xl bg-white text-slate-900 text-xs font-black flex items-center gap-1.5 shadow-lg"
                      >
                        <LogIn size={12} /> Conectar
                      </motion.button>
                    </div>
                  )}
                </div>

                {/* URL del repositorio */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-600 flex items-center gap-1.5">
                    <Link2 size={12} /> URL del repositorio GitHub
                  </label>
                  <input
                    type="text"
                    value={ghRepoInput}
                    onChange={(e) => setGhRepoInput(e.target.value)}
                    placeholder="https://github.com/usuario/repositorio"
                    data-testid="github-repo-url-input"
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/20 transition-all"
                  />
                </div>

                {/* Branch */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-600 flex items-center gap-1.5">
                    <Network size={12} /> Rama
                  </label>
                  <input
                    type="text"
                    value={ghBranchInput}
                    onChange={(e) => setGhBranchInput(e.target.value)}
                    placeholder="main"
                    data-testid="github-branch-input"
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/20 transition-all"
                  />
                </div>

                {/* Token opcional */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-600 flex items-center gap-1.5">
                    <Key size={12} /> Token de acceso (opcional, para repos privados)
                    {ghConfig.has_token && <span className="ml-1 text-emerald-600">● Token guardado</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={ghShowToken ? "text" : "password"}
                      value={ghTokenInput}
                      onChange={(e) => setGhTokenInput(e.target.value)}
                      placeholder={ghConfig.has_token ? "•••••••••••••• (deja vacío para conservar)" : "ghp_xxxxxxxxxxxxxxxxxxxx"}
                      data-testid="github-token-input"
                      className="w-full pr-10 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setGhShowToken(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    >
                      {ghShowToken ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Estado */}
                {ghConfig.repo_url && (
                  <div className="bg-white/60 rounded-2xl p-3 border border-slate-200/60 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-semibold">Último SHA local</span>
                      <span className="font-mono text-slate-800 font-bold">{ghConfig.last_commit_sha ? ghConfig.last_commit_sha.slice(0, 7) : "—"}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 font-semibold">Última verificación</span>
                      <span className="text-slate-700 font-medium">{ghConfig.last_check_at ? new Date(ghConfig.last_check_at).toLocaleString("es-GT") : "Nunca"}</span>
                    </div>
                  </div>
                )}

                {/* Botones: Guardar config + Push all */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <motion.button
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                    onClick={handleSaveGithub} disabled={ghSaving}
                    data-testid="github-save-config-btn"
                    className="flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all disabled:opacity-60"
                  >
                    {ghSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    Guardar configuración
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                    onClick={handlePushAllToGithub}
                    disabled={ghPushing || !ghConfig.username}
                    data-testid="github-push-all-btn"
                    title={!ghConfig.username ? "Conecta tu cuenta de GitHub primero" : "Sube todos los cambios al repositorio"}
                    className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold transition-all disabled:opacity-60 ${
                      ghConfig.username
                        ? "text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg"
                        : "text-slate-500 bg-slate-100 cursor-not-allowed"
                    }`}
                  >
                    {ghPushing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {ghPushing ? "Subiendo..." : "Guardar todo al repositorio"}
                  </motion.button>
                </div>

                {/* Barra de progreso del push a GitHub */}
                <AnimatePresence>
                  {ghPushing && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      data-testid="github-push-progress"
                      className="overflow-hidden bg-emerald-50/60 border border-emerald-100 rounded-2xl px-4 py-3 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                        <span className="flex items-center gap-2">
                          <Loader2 size={13} className="animate-spin" />
                          {ghPushMsg || "Subiendo repositorio…"}
                        </span>
                        <span data-testid="github-push-progress-pct" className="font-mono tabular-nums">
                          {Math.round(ghPushProgress)}%
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-emerald-100 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(3, Math.min(100, ghPushProgress))}%` }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Estado del último push */}
                {ghConfig.last_push_at && (
                  <div className="text-[10px] text-slate-500 flex items-center justify-between bg-emerald-50/50 border border-emerald-100 rounded-xl px-3 py-2">
                    <span>Último push: <b className="font-mono">{ghConfig.last_commit_sha?.slice(0, 7) || "—"}</b></span>
                    <span>{new Date(ghConfig.last_push_at).toLocaleString("es-GT")}</span>
                  </div>
                )}

                {/* Separador */}
                <div className="border-t border-slate-200/60 pt-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center shrink-0">
                      <Brain size={16} className="text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-900" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                        Contexto para la próxima IA
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Documento oculto con toda la lógica, arquitectura, endpoints e integraciones. Cuando otra IA se conecte al repositorio, leerá este contexto para entender todo sin errores.
                      </p>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                    onClick={handleOpenContext}
                    data-testid="open-ai-context-btn"
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-indigo-700 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border border-indigo-200 transition-all"
                  >
                    <BookOpen size={14} />
                    Ver / Editar contexto IA
                  </motion.button>
                </div>

              </div>
            </CollapseBody>
          </div>
        </motion.div>

        {/* ═══════════ DIAGNÓSTICO DE LA APP ═══════════ */}
        <motion.div variants={fadeUp}>
          <div className="rounded-3xl glass overflow-hidden">
            <div onClick={() => { toggleBlock("diagnostic"); if (!diagnostic) loadDiagnostic(); }} data-testid="db-block-toggle-diagnostic"
              className="flex items-center gap-3 px-5 py-4 border-b border-white/40 cursor-pointer select-none">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center">
                <Stethoscope size={16} className="text-cyan-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-800" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                  Diagnóstico de la app
                </p>
                <p className="text-[11px] text-slate-400">
                  {diagnostic
                    ? `${diagnostic.summary.ok}/${diagnostic.summary.total} correctos · ${diagnostic.summary.errors} errores · ${diagnostic.summary.warnings} avisos`
                    : "Chequeos de dependencias, MongoDB, GitHub, seguridad"}
                </p>
              </div>
              {diagnostic && (
                <div className={`px-3 py-1 rounded-full text-[10px] font-black ${
                  diagnostic.summary.errors === 0 && diagnostic.summary.warnings === 0
                    ? "bg-emerald-100 text-emerald-700"
                    : diagnostic.summary.errors > 0
                    ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-700"
                }`}>
                  {diagnostic.summary.score}/100
                </div>
              )}
              <BlockChevron open={openBlocks.diagnostic} />
            </div>

            <CollapseBody open={openBlocks.diagnostic}>
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={loadDiagnostic}
                    disabled={diagLoading}
                    data-testid="diagnostic-run-btn"
                    className="px-4 py-2 rounded-2xl btn-primary text-white text-xs font-black flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {diagLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    {diagLoading ? "Ejecutando..." : "Ejecutar diagnóstico"}
                  </motion.button>

                  {/* Botón: corregir TODO lo que sea corregible */}
                  {diagnostic && (diagnostic.summary.errors > 0 || diagnostic.summary.warnings > 0) && (
                    <motion.button
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      onClick={handleFixAll}
                      disabled={diagFixingAll}
                      data-testid="diagnostic-fix-all-btn"
                      className="px-4 py-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-black flex items-center gap-1.5 disabled:opacity-60 shadow-md"
                    >
                      {diagFixingAll ? <Loader2 size={12} className="animate-spin" /> : <Wrench size={12} />}
                      {diagFixingAll ? "Corrigiendo..." : "Corregir todo"}
                    </motion.button>
                  )}

                  {diagnostic && (
                    <p className="text-[10px] text-slate-400 ml-auto">
                      Última: {new Date(diagnostic.generated_at).toLocaleTimeString("es-GT")}
                    </p>
                  )}
                </div>

                {diagnostic && (
                  <div className="space-y-2">
                    {diagnostic.checks.map((c) => {
                      const isOk = c.ok;
                      const isError = !isOk && c.severity === "error";
                      const isWarning = !isOk && c.severity === "warning";
                      return (
                        <motion.div
                          key={c.id}
                          layout
                          data-testid={`diagnostic-item-${c.id}`}
                          className={`flex items-start gap-3 rounded-2xl p-3 border ${
                            isOk ? "bg-emerald-50/40 border-emerald-100"
                            : isError ? "bg-red-50/60 border-red-200"
                            : "bg-amber-50/50 border-amber-200"
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isOk ? "bg-emerald-100" : isError ? "bg-red-100" : "bg-amber-100"
                          }`}>
                            {isOk ? <CheckCircle size={15} className="text-emerald-600" />
                              : isError ? <XCircle size={15} className="text-red-600" />
                              : <ShieldAlert size={15} className="text-amber-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-800">{c.label}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5 break-words">{c.detail}</p>
                          </div>
                          {!isOk && c.fixable && (
                            <motion.button
                              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              onClick={() => handleFixIssue(c.id)}
                              disabled={diagFixingId === c.id}
                              data-testid={`diagnostic-fix-${c.id}`}
                              className="shrink-0 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10px] font-black flex items-center gap-1"
                            >
                              {diagFixingId === c.id ? <Loader2 size={10} className="animate-spin" /> : <Wrench size={10} />}
                              Corregir
                            </motion.button>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {!diagnostic && !diagLoading && (
                  <p className="text-[11px] text-slate-400 py-4 text-center">
                    Presiona "Ejecutar diagnóstico" para ver el estado completo de la app.
                  </p>
                )}
              </div>
            </CollapseBody>
          </div>
        </motion.div>

        {/* ── ZONA DE PELIGRO ── */}
        <motion.div variants={fadeUp}>
          <div className="rounded-3xl border-2 border-dashed border-red-200/80 bg-red-50/20 overflow-hidden">
            <div onClick={() => toggleBlock("danger")} data-testid="db-block-toggle-danger"
              className="flex items-center gap-3 px-5 py-4 border-b border-red-100/60 cursor-pointer select-none">
              <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertCircle size={16} className="text-red-500" />
              </div>
              <div>
                <p className="text-sm font-black text-red-700" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>Zona de peligro</p>
                <p className="text-[11px] text-red-400">Acciones irreversibles — se crea respaldo automático primero</p>
              </div>
              <span className="ml-auto"><BlockChevron open={openBlocks.danger} danger /></span>
            </div>
            <CollapseBody open={openBlocks.danger}>
            <div className="p-5">
              {!showClear ? (
                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setShowClear(true)} data-testid="clear-all-data-btn"
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-red-600 bg-white border border-red-200 hover:bg-red-50 transition-all">
                  <Trash2 size={14} /> Borrar todos los datos
                </motion.button>
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3">
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200/60 rounded-2xl p-4">
                    <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-black text-red-700">¿Confirmar borrado total?</p>
                      <p className="text-xs text-red-500 mt-1">Se eliminarán TODAS las reservas y socios. Un respaldo automático se creará antes de borrar.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={handleClearAll} disabled={clearLoading} data-testid="clear-all-confirm-btn"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition-all disabled:opacity-60">
                      {clearLoading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      Sí, borrar todo
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={() => setShowClear(false)} data-testid="clear-all-cancel-btn"
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 transition-all">
                      Cancelar
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </div>
            </CollapseBody>
          </div>
        </motion.div>

      </motion.div>

      {/* ── MODAL: Contexto para la IA ── */}
      <AnimatePresence>
        {ctxOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !ctxSaving && setCtxOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl h-[85vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-indigo-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                    <Brain size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                      Contexto para la próxima IA
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      {ctxUpdatedAt ? `Actualizado: ${new Date(ctxUpdatedAt).toLocaleString("es-GT")}` : "Sin cambios guardados"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => !ctxSaving && setCtxOpen(false)}
                  disabled={ctxSaving}
                  className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  <XCircle size={18} />
                </button>
              </div>

              {/* Toolbar */}
              <div className="flex items-center gap-2 px-6 py-3 border-b border-slate-100 bg-white">
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={() => setCtxEditing(v => !v)}
                  data-testid="ctx-edit-toggle"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                    ctxEditing ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <FileText size={12} /> {ctxEditing ? "Modo edición" : "Modo lectura"}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={handleCopyContext}
                  data-testid="ctx-copy-btn"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
                >
                  <Copy size={12} /> Copiar todo
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  onClick={handleResetContext}
                  data-testid="ctx-reset-btn"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all"
                >
                  <RotateCcw size={12} /> Restaurar por defecto
                </motion.button>
                <div className="ml-auto flex items-center gap-2">
                  {ctxEditing && (
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={handleSaveContext} disabled={ctxSaving}
                      data-testid="ctx-save-btn"
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all disabled:opacity-60"
                    >
                      {ctxSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                      Guardar
                    </motion.button>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-hidden bg-slate-50">
                {ctxLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-slate-400" />
                  </div>
                ) : ctxEditing ? (
                  <textarea
                    value={ctxContent}
                    onChange={(e) => setCtxContent(e.target.value)}
                    data-testid="ctx-editor"
                    className="w-full h-full p-6 bg-white font-mono text-xs text-slate-800 resize-none focus:outline-none border-0"
                    style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}
                  />
                ) : (
                  <pre className="w-full h-full overflow-auto p-6 font-mono text-xs text-slate-800 whitespace-pre-wrap break-words"
                    style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace" }}
                    data-testid="ctx-viewer">
                    {ctxContent}
                  </pre>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Popup: haciendo copia de seguridad completa ── */}
      <AnimatePresence>
        {backupModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            data-testid="backup-modal"
            className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className="bg-white rounded-3xl p-8 mx-4 max-w-sm w-full text-center shadow-2xl">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 mx-auto mb-5 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                <Database size={30} className="text-white" />
              </motion.div>
              <p className="text-lg font-black text-slate-800" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                Haciendo copia de seguridad completa…
              </p>
              <p className="text-sm text-slate-500 mt-2">
                Respaldando todas tus reservas, socios, diseños y configuración. No cierres la ventana.
              </p>
              <div className="mt-5 h-2 rounded-full bg-slate-100 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: "linear-gradient(90deg,#6366f1,#8b5cf6)" }}
                  animate={{ x: ["-40%", "140%"] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                  initial={{ width: "40%" }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════ MODAL: Conectar con GitHub ═══════════ */}
      <AnimatePresence>
        {ghConnectOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setGhConnectOpen(false)}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 22 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
              data-testid="github-connect-modal"
            >
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
                  <Github size={28} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-black">Conectar con GitHub</h3>
                  <p className="text-xs text-white/60 mt-0.5">Un solo paso: pega tu Personal Access Token</p>
                </div>
                <button onClick={() => setGhConnectOpen(false)} className="text-white/60 hover:text-white">
                  <XCircle size={22} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="rounded-2xl bg-blue-50/70 border border-blue-200 p-4 space-y-2">
                  <p className="text-xs font-black text-blue-900 flex items-center gap-1.5">
                    <BookOpen size={12} /> Cómo obtener el token en 30 segundos
                  </p>
                  <ol className="text-[11px] text-blue-800 space-y-1 pl-4 list-decimal">
                    <li>Abre <a href="https://github.com/settings/tokens/new?scopes=repo&description=Cinema%20Productions" target="_blank" rel="noopener noreferrer" className="underline font-bold inline-flex items-center gap-1">github.com/settings/tokens/new <ExternalLink size={10} /></a></li>
                    <li>Nombre: "Cinema Productions" · Scope: <b>repo</b></li>
                    <li>Click "Generate token" → copia el token (empieza con <code>ghp_</code>)</li>
                    <li>Pégalo abajo 👇</li>
                  </ol>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
                    <Key size={12} /> Personal Access Token
                  </label>
                  <input
                    type="password"
                    value={ghConnectToken}
                    onChange={(e) => setGhConnectToken(e.target.value)}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleConnectGithub()}
                    data-testid="github-connect-token-input"
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:bg-white transition-all"
                  />
                  <p className="text-[10px] text-slate-500">
                    🔒 El token se guarda cifrado en tu base de datos. Solo se usa para push/pull al repositorio.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setGhConnectOpen(false)}
                    className="flex-1 px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={handleConnectGithub}
                    disabled={ghConnectSaving || !ghConnectToken.trim()}
                    data-testid="github-connect-submit-btn"
                    className="flex-1 px-4 py-3 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white text-sm font-black flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
                  >
                    {ghConnectSaving ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
                    {ghConnectSaving ? "Conectando..." : "Conectar cuenta"}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
