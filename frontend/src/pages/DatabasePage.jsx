import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
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
  Stethoscope, Wrench, ShieldAlert, LogIn, LogOut, UserCheck, ExternalLink, GitCommit,
  Lock, LifeBuoy, Cloud, Laptop, CloudUpload, FileCheck2, Info, ListChecks,
  GitCompare, FilePlus2, FilePenLine, FileMinus2,
  Users, UserX, Ban, Crown, Gift, CreditCard, KeyRound,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const SOPORTE_FACTORY_PASSWORD = "286811";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import {
  getDbStats, testDbConnection, compareDatabase, switchDatabase, resetDatabase, optimizeDatabase,
  getFactoryPresets,
  getReservations, getBackupHistory, createServerBackup,
  deleteBackupFile, downloadBackupUrl, downloadBackupFileUrl, restoreBackup,
  createCloudBackup, previewBackup,
  getGithubConfig, saveGithubConfig, getAiContext, saveAiContext, resetAiContext,
  connectGithub, disconnectGithub, runDiagnostic, fixDiagnosticIssue, fixAllDiagnosticIssues,
  githubPushAll, getGithubPushStatus, getGithubNextVersion, getGithubPushPreview, getGithubPushDiff,
  getGithubStorage, deleteGithubBuilds, triggerGithubBuildExe,
  adminListUsers, adminDisableUser, adminEnableUser, adminRevokePlan, adminGrantPlan, adminDeleteUser,
} from "@/lib/api";
import { generateAllReservationsPDF } from "@/lib/generatePDF";
import { fireEpic } from "@/lib/celebrations";
import { useAutoBackup } from "@/hooks/useAutoBackup";
import { DesktopAppSection } from "@/components/DesktopAppSection";

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
  const [cloudCheck, setCloudCheck]     = useState(null); // { pending_total, current_total, target_total, target_url, target_name, checking }
  const [newDbUrl, setNewDbUrl]         = useState("");
  const [dbTestResult, setDbTestResult] = useState(null);
  const [dbConnecting, setDbConnecting] = useState(false);
  const [dbTesting, setDbTesting]       = useState(false);
  const [dbResetting, setDbResetting]   = useState(false);
  const [backupModal, setBackupModal]   = useState(false);
  const [optimizing, setOptimizing]     = useState(false);
  const [showClear, setShowClear]       = useState(false);
  const [uploadModal, setUploadModal]   = useState(false);
  const [uploadPreview, setUploadPreview] = useState(null); // { reservations, socios, settings, themes, total, size, is_cloud }
  const [uploadPreviewLoading, setUploadPreviewLoading] = useState(false);
  const [uploadBreakdownOpen, setUploadBreakdownOpen] = useState(false);
  const [openBlocks, setOpenBlocks] = useState({ backup: false, conn: false, github: false, diagnostic: false, cleanup: false, updates: false, options: false, danger: false });
  const toggleBlock = (k) => setOpenBlocks(p => ({ ...p, [k]: !p[k] }));
  // Unified "Datos y Respaldos" internal tabs: "conn" | "presets" | "backup"
  const [unifiedTab, setUnifiedTab] = useState("conn");
  const [clearLoading, setClearLoading] = useState(false);
  // Divulgación progresiva: ocultar las opciones avanzadas de conexión por defecto
  const [showAdvancedConn, setShowAdvancedConn] = useState(false);

  // ── Modo avanzado: oculta bloques avanzados (Soporte/GitHub + Zona de peligro) ──
  const [advancedMode, setAdvancedMode] = useState(() => {
    try { return localStorage.getItem("cp_db_advanced_mode") === "true"; } catch { return false; }
  });
  const toggleAdvancedMode = () => {
    setAdvancedMode(prev => {
      const next = !prev;
      try { localStorage.setItem("cp_db_advanced_mode", String(next)); } catch {}
      return next;
    });
  };

  // Unified "Soporte avanzado" internal tabs: "publish" | "desktop" | "storage" | "tools" | "users"
  const [supportTab, setSupportTab] = useState("publish");
  const [copiedRepo, setCopiedRepo] = useState(false);

  // Usuarios registrados (admin)
  const [users, setUsers] = useState(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userActionId, setUserActionId] = useState(null);

  // ── Soporte avanzado (antes GitHub) — bloqueado por contraseña de fábrica ──
  const [soporteUnlocked, setSoporteUnlocked] = useState(false);
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [pwdInput, setPwdInput] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdShow, setPwdShow] = useState(false);

  const handleSoporteHeaderClick = () => {
    if (soporteUnlocked) {
      toggleBlock("github");
      return;
    }
    setPwdInput("");
    setPwdError("");
    setPwdShow(false);
    setPwdModalOpen(true);
  };

  const handlePwdSubmit = (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (pwdInput === SOPORTE_FACTORY_PASSWORD) {
      setSoporteUnlocked(true);
      setPwdModalOpen(false);
      setPwdInput("");
      setPwdError("");
      setOpenBlocks((p) => ({ ...p, github: true }));
      toast({ title: "Acceso concedido", description: "Soporte avanzado desbloqueado" });
    } else {
      setPwdError("Contraseña incorrecta");
    }
  };

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
  const [ghPushDetail, setGhPushDetail] = useState("");
  const [ghPushStep, setGhPushStep] = useState(0);
  const [ghPushTotalSteps, setGhPushTotalSteps] = useState(8);
  const [ghPushStepLabel, setGhPushStepLabel] = useState("");
  const [ghPushSteps, setGhPushSteps] = useState([]);
  const [ghPushElapsed, setGhPushElapsed] = useState(0);
  const ghPushPollRef = useRef(null);
  // Modal de publicación: versión + mensaje
  const [ghPushModalOpen, setGhPushModalOpen] = useState(false);
  const [ghPushVersion, setGhPushVersion] = useState("");
  const [ghPushCommitMsg, setGhPushCommitMsg] = useState("");
  const [ghPushVersionInfo, setGhPushVersionInfo] = useState(null); // { current_local, current_remote, next_auto_version, ... }
  const [ghPushVersionLoading, setGhPushVersionLoading] = useState(false);
  // Modal de selección de archivos (paso previo al modal de versión)
  const [ghSelectModalOpen, setGhSelectModalOpen] = useState(false);
  const [ghPreview, setGhPreview] = useState(null); // { categories, totals_defaults }
  const [ghPreviewLoading, setGhPreviewLoading] = useState(false);
  const [ghInclude, setGhInclude] = useState({}); // { backend: true, ... }
  // Diff REAL contra el repositorio remoto (vista "Ver cambios detallados")
  const [ghDiff, setGhDiff] = useState(null); // { changed, summary, by_category, files, ... }
  const [ghDiffLoading, setGhDiffLoading] = useState(false);
  const [ghDiffError, setGhDiffError] = useState("");
  const [ghDiffOpen, setGhDiffOpen] = useState(false);
  const [ghDiffCat, setGhDiffCat] = useState("all"); // filtro por categoría en la lista
  const [diagnostic, setDiagnostic] = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagFixingId, setDiagFixingId] = useState("");

  // ── Almacenamiento del repositorio (espacio + plan + builds .exe) ──────────
  const [storage, setStorage] = useState(null);
  const [storageLoading, setStorageLoading] = useState(false);
  const [buildsDeleting, setBuildsDeleting] = useState(false);
  const [showDeleteBuilds, setShowDeleteBuilds] = useState(false);
  const [deletingAssetId, setDeletingAssetId] = useState(null);
  const [buildTriggering, setBuildTriggering] = useState(false);

  const handleTriggerBuild = async () => {
    setBuildTriggering(true);
    try {
      const res = await triggerGithubBuildExe();
      toast({ title: "Compilación iniciada ✓", description: res.message || "El .exe se está construyendo en GitHub Actions." });
      fireEpic("success");
    } catch (err) {
      toast({ title: "No se pudo iniciar la compilación", description: err?.response?.data?.detail || String(err), variant: "destructive" });
    } finally {
      setBuildTriggering(false);
    }
  };

  const loadStorage = async () => {
    setStorageLoading(true);
    try {
      const data = await getGithubStorage();
      setStorage(data);
    } catch (err) {
      setStorage(null);
      toast({ title: "No se pudo cargar el almacenamiento", description: err?.response?.data?.detail || String(err), variant: "destructive" });
    } finally {
      setStorageLoading(false);
    }
  };

  const handleDeleteAllBuilds = async () => {
    setBuildsDeleting(true);
    try {
      const res = await deleteGithubBuilds({});
      toast({ title: `✓ Builds borrados`, description: res.message });
      setShowDeleteBuilds(false);
      if (res.deleted_count > 0) fireEpic("success");
      await loadStorage();
    } catch (err) {
      toast({ title: "Error al borrar builds", description: err?.response?.data?.detail || String(err), variant: "destructive" });
    } finally {
      setBuildsDeleting(false);
    }
  };

  const handleDeleteOneBuild = async (asset) => {
    setDeletingAssetId(asset.asset_id);
    try {
      const res = await deleteGithubBuilds({ asset_ids: [asset.asset_id] });
      toast({ title: "Archivo borrado", description: res.message });
      await loadStorage();
    } catch (err) {
      toast({ title: "Error al borrar", description: err?.response?.data?.detail || String(err), variant: "destructive" });
    } finally {
      setDeletingAssetId(null);
    }
  };

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

  // ── Cloud backup animation (subida a la nube) ─────────────────────────────
  // phase: null | "prepare" | "upload" | "done"
  const [cloudBackup, setCloudBackup] = useState({ phase: null, result: null, error: null });

  // ── Restore diff preview modal ────────────────────────────────────────────
  const [restorePreview, setRestorePreview] = useState({ open: false, loading: false, data: null, file: null, error: null });

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

  // Cargar almacenamiento del repo al abrir Soporte avanzado (una vez)
  useEffect(() => {
    if (soporteUnlocked && openBlocks.github && supportTab === "storage" && !storage && !storageLoading) {
      loadStorage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soporteUnlocked, openBlocks.github, supportTab]);

  // Cargar diagnóstico automáticamente al abrir la pestaña "Herramientas"
  useEffect(() => {
    if (soporteUnlocked && openBlocks.github && supportTab === "tools" && !diagnostic && !diagLoading) {
      loadDiagnostic();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soporteUnlocked, openBlocks.github, supportTab]);

  // Cargar lista de usuarios al abrir la pestaña "Usuarios"
  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await adminListUsers(SOPORTE_FACTORY_PASSWORD);
      setUsers(data.users || []);
    } catch (e) {
      toast({ title: "Error", description: e?.response?.data?.detail || "No se pudieron cargar los usuarios", variant: "destructive" });
    } finally {
      setUsersLoading(false);
    }
  };
  useEffect(() => {
    if (soporteUnlocked && openBlocks.github && supportTab === "users" && users === null && !usersLoading) {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soporteUnlocked, openBlocks.github, supportTab]);

  const runUserAction = async (uid, fn, successMsg) => {
    setUserActionId(uid);
    try {
      await fn();
      toast({ title: successMsg });
      await loadUsers();
    } catch (e) {
      toast({ title: "Error", description: e?.response?.data?.detail || "Operación fallida", variant: "destructive" });
    } finally {
      setUserActionId(null);
    }
  };

  // Helper: copiar URL del repositorio al portapapeles
  const handleCopyRepoUrl = async () => {
    if (!ghConfig.repo_url) return;
    try {
      await navigator.clipboard.writeText(ghConfig.repo_url);
      setCopiedRepo(true);
      toast({ title: "URL copiada al portapapeles" });
      setTimeout(() => setCopiedRepo(false), 1600);
    } catch {
      toast({ title: "No se pudo copiar", variant: "destructive" });
    }
  };

  const loadAll = () => { loadDbStats(); loadBackupHistory(); loadCleanupPreview(); loadDbUpdates(); loadGithubConfig(); };

  // ── Auto-check pending sync vs. cloud preset ───────────────────────────────
  const checkCloudSync = async () => {
    // Solo verificamos si estamos en LOCAL (no en la nube) y hay una preset en la nube disponible.
    const isOnCloud = dbStats?.is_atlas;
    if (isOnCloud) { setCloudCheck(null); return; }
    const cloudPreset = presets.find(p => p.url?.startsWith("mongodb+srv"));
    if (!cloudPreset) { setCloudCheck(null); return; }
    setCloudCheck(c => ({ ...(c || {}), checking: true, target_url: cloudPreset.url, target_name: cloudPreset.name }));
    try {
      const res = await compareDatabase(cloudPreset.url);
      setCloudCheck({
        checking: false,
        pending_total: res.pending_total || 0,
        current_total: res.current_total || 0,
        target_total: res.target_total || 0,
        target_url: cloudPreset.url,
        target_name: cloudPreset.name,
        needs_sync: !!res.needs_sync,
      });
    } catch {
      setCloudCheck({ checking: false, error: true, target_url: cloudPreset.url, target_name: cloudPreset.name });
    }
  };

  // Ejecutar comparación cuando cambien dbStats o presets
  useEffect(() => {
    if (dbStats && presets.length > 0) checkCloudSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbStats?.is_atlas, dbStats?.objects, presets.length]);

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
  // 1º paso: abre el modal de SELECCIÓN de archivos. Al confirmar, se abre
  //          automáticamente el modal de versión (paso 2).
  const handlePushAllToGithub = async () => {
    if (!ghConfig.username) {
      toast({ title: "Conecta tu cuenta de GitHub primero", variant: "destructive" });
      return;
    }
    setGhPreview(null);
    setGhPreviewLoading(true);
    setGhSelectModalOpen(true);
    // Reiniciar el diff detallado cada vez que se abre el modal
    setGhDiff(null);
    setGhDiffError("");
    setGhDiffOpen(false);
    setGhDiffCat("all");
    // Cargar info de versión en paralelo para mostrar en el modal
    setGhPushVersionInfo(null);
    setGhPushVersionLoading(true);
    getGithubNextVersion()
      .then(info => setGhPushVersionInfo(info))
      .catch(() => {})
      .finally(() => setGhPushVersionLoading(false));
    try {
      const prev = await getGithubPushPreview();
      setGhPreview(prev);
      // Inicializar `include` con los defaults del servidor (fallback mientras
      // se compara el diff; luego se autoselecciona según cambios reales).
      const initial = {};
      (prev?.categories || []).forEach(c => { initial[c.id] = !!c.default; });
      setGhInclude(initial);
      // Autocargar el diff y autoseleccionar SOLO las categorías con cambios.
      loadGhDiff(false, prev?.categories || []);
    } catch (e) {
      toast({ title: "No se pudo cargar la lista de archivos", description: e?.response?.data?.detail || String(e), variant: "destructive" });
      setGhSelectModalOpen(false);
    } finally {
      setGhPreviewLoading(false);
    }
  };

  // Cargar el diff REAL contra el repo remoto (bajo demanda al pulsar "Ver cambios")
  // Si se pasa `autoSelectFrom` (lista de categorías), autoselecciona SOLO las que
  // tienen cambios reales y deja el resto desmarcadas.
  const loadGhDiff = async (refresh = false, autoSelectFrom = null) => {
    setGhDiffLoading(true);
    setGhDiffError("");
    setGhDiffOpen(true);
    try {
      const data = await getGithubPushDiff(refresh);
      setGhDiff(data);
      if (autoSelectFrom && Array.isArray(autoSelectFrom)) {
        const sel = {};
        autoSelectFrom.forEach(c => {
          const bc = data?.by_category?.[c.id];
          sel[c.id] = !!(bc && bc.total > 0);
        });
        setGhInclude(sel);
      }
    } catch (e) {
      setGhDiffError(e?.response?.data?.detail || "No se pudieron comparar los cambios con GitHub.");
    } finally {
      setGhDiffLoading(false);
    }
  };

  // Paso 2: el usuario confirmó la selección → abrir el modal de versión.
  const handleConfirmSelection = async () => {
    // Requiere al menos 1 categoría marcada
    const anyChecked = Object.values(ghInclude).some(Boolean);
    if (!anyChecked) {
      toast({ title: "Selecciona al menos una categoría para subir", variant: "destructive" });
      return;
    }
    setGhSelectModalOpen(false);
    setGhPushVersion("");
    setGhPushCommitMsg(`Actualización — ${new Date().toLocaleString("es-GT")}`);
    setGhPushVersionInfo(null);
    setGhPushVersionLoading(true);
    setGhPushModalOpen(true);
    try {
      const info = await getGithubNextVersion();
      setGhPushVersionInfo(info);
    } catch (_) {
      // Silencioso
    } finally {
      setGhPushVersionLoading(false);
    }
  };

  // Ejecuta el push real con la versión/mensaje elegidos en el modal.
  const runPushToGithub = async () => {
    const version = ghPushVersion.trim();
    const message = (ghPushCommitMsg.trim() || `Actualización — ${new Date().toLocaleString("es-GT")}`);
    setGhPushModalOpen(false);
    setGhPushing(true);
    setGhPushProgress(3);
    setGhPushMsg("Iniciando…");
    setGhPushDetail("Preparando el entorno");
    setGhPushStep(0);
    setGhPushStepLabel("");
    setGhPushElapsed(0);
    if (ghPushPollRef.current) clearInterval(ghPushPollRef.current);

    // Guard: garantiza que el cierre (y el confeti) se ejecute UNA sola vez.
    let finished = false;

    // Función que finaliza el flujo cuando el polling detecta done/error
    const finish = (kind, payload) => {
      if (finished) return;
      finished = true;
      if (ghPushPollRef.current) {
        clearInterval(ghPushPollRef.current);
        ghPushPollRef.current = null;
      }
      if (kind === "done") {
        setGhPushProgress(100);
        setGhPushStep(ghPushTotalSteps);
        if (payload?.nothing_to_commit) {
          setGhPushMsg("Sin cambios que subir");
          setGhPushDetail("El repositorio ya estaba al día");
          toast({ title: "Sin cambios que subir", description: "El repositorio ya está sincronizado." });
        } else {
          setGhPushMsg("¡Subido a GitHub!");
          setGhPushDetail(`Commit ${payload?.commit_short || ""} · v${payload?.version || ""} · ${payload?.files_changed ?? ""} archivo(s)`);
          toast({
            title: "✓ Subido a GitHub",
            description: `Commit ${payload?.commit_short || ""} en rama ${payload?.branch || "main"}`,
          });
          fireEpic();
        }
        loadGithubConfig();
      } else {
        setGhPushMsg("Error al subir");
        setGhPushDetail(String(payload || "").slice(0, 160));
        toast({
          title: "Error al subir",
          description: String(payload || "").slice(0, 250),
          variant: "destructive",
        });
      }
      setTimeout(() => {
        setGhPushing(false);
        setGhPushProgress(0);
        setGhPushMsg("");
        setGhPushDetail("");
        setGhPushStep(0);
        setGhPushStepLabel("");
        setGhPushElapsed(0);
      }, 1800);
    };

    // Polling del progreso + detección de fin
    ghPushPollRef.current = setInterval(async () => {
      if (finished) return;
      try {
        const st = await getGithubPushStatus();
        if (finished) return;
        if (typeof st.progress === "number") setGhPushProgress(st.progress);
        if (st.message) setGhPushMsg(st.message);
        if (typeof st.detail === "string") setGhPushDetail(st.detail);
        if (typeof st.step === "number") setGhPushStep(st.step);
        if (typeof st.total_steps === "number") setGhPushTotalSteps(st.total_steps);
        if (typeof st.step_label === "string") setGhPushStepLabel(st.step_label);
        if (Array.isArray(st.steps) && st.steps.length) setGhPushSteps(st.steps);
        if (typeof st.elapsed_seconds === "number") setGhPushElapsed(st.elapsed_seconds);
        if (st.status === "done") finish("done", st.result || {});
        else if (st.status === "error") finish("error", st.error || st.message || "Error desconocido");
      } catch (_) { /* ignora errores de polling puntuales */ }
    }, 900);

    // Dispara el trabajo. Ahora el POST retorna inmediatamente ({status:"started"}).
    try {
      await githubPushAll(message || undefined, version || undefined, undefined, ghInclude);
    } catch (err) {
      finish("error", err?.response?.data?.detail || String(err));
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
      const res = await switchDatabase(activeConnUrl.trim());
      const uploaded = res?.total_uploaded || 0;
      if (uploaded > 0) {
        toast({
          title: `☁️ Nube conectada · ${uploaded} registros locales subidos`,
          description: "Los datos locales se fusionaron con la nube antes de cargar. Actualizando...",
        });
      } else {
        toast({ title: "Base de datos conectada ✓ — Actualizando..." });
      }
      setNewDbUrl(""); setConnFields({ host: "", port: "27017", user: "", pass: "", db: "cinema_events" }); setDbTestResult(null);
      setTimeout(() => window.location.reload(), 1600);
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

  // ── Preview + confirm upload flow (modal) ─────────────────────────────────
  const openUploadModal = async () => {
    setUploadModal(true);
    setUploadPreview(null);
    setUploadPreviewLoading(true);
    try {
      // Cargar contadores por colección para el preview animado
      const res = await fetch(`${BASE}/api/settings/database/stats-detailed`).catch(() => null);
      let detailed = null;
      if (res && res.ok) detailed = await res.json();
      // Fallback: usar dbStats generales si no existe el endpoint detallado
      if (!detailed) {
        const rs = await getReservations().catch(() => []);
        detailed = {
          reservations: Array.isArray(rs) ? rs.length : 0,
          socios: 0,
          settings: 1,
          themes: 0,
          total: (Array.isArray(rs) ? rs.length : 0),
          size: dbStats?.total_size || "—",
          is_cloud: !!dbStats?.is_atlas,
        };
      }
      setUploadPreview(detailed);
    } catch {
      setUploadPreview({
        reservations: dbStats?.objects || 0,
        socios: 0, settings: 1, themes: 0,
        total: dbStats?.objects || 0,
        size: dbStats?.total_size || "—",
        is_cloud: !!dbStats?.is_atlas,
      });
    } finally {
      setUploadPreviewLoading(false);
    }
  };

  const confirmUploadToCloud = async () => {
    setUploadModal(false);
    // Si hay una nube configurada y estamos en LOCAL → subir de verdad
    const cloudPreset = presets.find(p => p.url?.startsWith("mongodb+srv"));
    const isOnCloud = !!dbStats?.is_atlas;
    if (!isOnCloud && cloudPreset) {
      try {
        setOptimizing(true);
        const res = await switchDatabase(cloudPreset.url);
        const uploaded = res?.total_uploaded || 0;
        toast({
          title: uploaded > 0 ? `☁️ ${uploaded} reservas subidas a la nube` : "☁️ Nube conectada",
          description: "Tus datos locales se fusionaron con la nube. Actualizando…",
        });
        fireEpic("success");
        setTimeout(() => window.location.reload(), 1400);
        return;
      } catch (e) {
        toast({ title: e?.response?.data?.detail || "Error al subir a la nube", variant: "destructive" });
      } finally { setOptimizing(false); }
    }
    // Si ya estamos en la nube (o no hay preset de nube): sincronizar/optimizar
    await handleOptimize();
  };

  const handleRestoreFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset inputs so re-selecting same file re-triggers change
    if (restoreInputRef.current) restoreInputRef.current.value = "";
    if (restoreAutoInputRef.current) restoreAutoInputRef.current.value = "";
    // Abrir modal de preview (diff) antes de restaurar
    setRestoreResult(null);
    setRestorePreview({ open: true, loading: true, data: null, file, error: null });
    try {
      const data = await previewBackup(file);
      setRestorePreview({ open: true, loading: false, data, file, error: null });
    } catch (err) {
      const msg = err.response?.data?.detail || "No se pudo analizar el respaldo";
      setRestorePreview({ open: true, loading: false, data: null, file, error: msg });
    }
  };

  const confirmRestoreFromPreview = async () => {
    const file = restorePreview.file;
    if (!file) return;
    setRestoreLoading(true); setRestoreResult(null);
    setRestorePreview((prev) => ({ ...prev, loading: true }));
    try {
      const r = await restoreBackup(file);
      setRestoreResult({ ok: true, msg: r.message });
      toast({ title: r.message });
      setRestorePreview({ open: false, loading: false, data: null, file: null, error: null });
      loadAll();
    } catch (err) {
      const msg = err.response?.data?.detail || "Error al restaurar el archivo";
      setRestoreResult({ ok: false, msg });
      toast({ title: msg, variant: "destructive" });
      setRestorePreview((prev) => ({ ...prev, loading: false, error: msg }));
    } finally {
      setRestoreLoading(false);
    }
  };

  const cancelRestorePreview = () => {
    setRestorePreview({ open: false, loading: false, data: null, file: null, error: null });
  };

  // ── Guardar respaldo en la NUBE (MongoDB del usuario) con animación ──────
  const handleCloudBackup = async () => {
    setCloudBackup({ phase: "prepare", result: null, error: null });
    // Micro-delay para que la fase "prepare" sea visible
    await new Promise((r) => setTimeout(r, 500));
    setCloudBackup((prev) => ({ ...prev, phase: "upload" }));
    try {
      const r = await createCloudBackup();
      setCloudBackup({ phase: "done", result: r, error: null });
      toast({ title: r.message });
      // Local backup en paralelo (redundancia sana)
      try {
        if (autoBackup.config.mode !== "app_folder") autoBackup.updateConfig({ mode: "app_folder" });
        autoBackup.triggerBackup();
      } catch { /* no-op */ }
      // Auto-cerrar el estado "done" tras 3.5s
      setTimeout(() => setCloudBackup((prev) => (prev.phase === "done" ? { phase: null, result: null, error: null } : prev)), 3500);
    } catch (err) {
      const msg = err.response?.data?.detail || "Error al subir respaldo a la nube";
      setCloudBackup({ phase: null, result: null, error: msg });
      toast({ title: msg, variant: "destructive" });
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
    <div className="px-6 py-8 max-w-7xl mx-auto">

      {/* ── Header (editorial) ── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="mb-10">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">
              <span className="w-6 h-px bg-slate-300" />
              Sección · almacenamiento
            </div>
            <h1 className="text-[52px] leading-none font-black text-slate-900 tracking-tight" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
              Base de <span className="italic font-light text-slate-500">datos</span>
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-3 max-w-xl">
              {advancedMode
                ? "Respaldos, conexión y herramientas avanzadas — soporte, diagnóstico y zona de peligro."
                : "Todo el estado de tu app: reservas, socios y ajustes. Respalda y conecta la nube en un clic."}
            </p>
          </div>

          {/* Toggle Modo avanzado (chip minimal) */}
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={toggleAdvancedMode}
            data-testid="db-advanced-mode-toggle"
            aria-pressed={advancedMode}
            title={advancedMode ? "Ocultar herramientas avanzadas" : "Mostrar herramientas avanzadas (Soporte y Zona de peligro)"}
            className={`group flex items-center gap-2.5 pl-2.5 pr-4 py-2 rounded-full border text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${
              advancedMode
                ? "bg-slate-900 text-white border-slate-900 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.5)]"
                : "bg-white/80 text-slate-500 border-slate-200 hover:bg-white hover:text-slate-800"
            }`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${advancedMode ? "bg-white/15" : "bg-slate-100 group-hover:bg-slate-200"}`}>
              {advancedMode ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
            </span>
            {advancedMode ? "Avanzado" : "Simple"}
          </motion.button>
        </div>
        <div className="mt-6 h-px bg-gradient-to-r from-slate-200 via-slate-200/60 to-transparent" />
      </motion.div>

      <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">

        {/* ── HERO: UBICACIÓN + ACCIÓN NUBE (unifica banner Atlas duplicado) ── */}
        <motion.div variants={fadeUp} data-testid="data-location-hero">
          {(() => {
            const isCloud = !!dbStats?.is_atlas;
            const objects = dbStats?.objects || 0;
            const collections = dbStats?.collections || 0;
            const pending = cloudCheck?.pending_total || 0;
            const cloudPreset = presets.find(p => p.url?.startsWith("mongodb+srv"));
            const factoryPreset = presets.find(p => p.factory);
            const dismissed = (() => { try { return localStorage.getItem("cp_atlas_banner_dismissed") === "1"; } catch { return false; } })();
            const showFactoryCTA = !isCloud && !dismissed && !!factoryPreset;

            return (
              <div className="relative overflow-hidden rounded-[28px] border border-slate-200/70 bg-white shadow-[0_20px_60px_-25px_rgba(15,23,42,0.15)]">
                {/* Franja lateral de estado */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isCloud ? "bg-gradient-to-b from-sky-400 via-indigo-500 to-violet-500" : "bg-gradient-to-b from-amber-400 via-orange-500 to-rose-500"}`} />

                {/* Grain / noise sutil */}
                <div className="absolute inset-0 opacity-[0.035] pointer-events-none mix-blend-multiply"
                  style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")" }} />

                <div className="relative pl-8 pr-6 py-7">
                  {/* Encabezado editorial */}
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.25em] px-2.5 py-1 rounded-full ${isCloud ? "bg-sky-50 text-sky-700 border border-sky-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isCloud ? "bg-sky-500 animate-pulse" : "bg-amber-500"}`} />
                          {isCloud ? "En la nube" : "Local · este equipo"}
                        </span>
                        {isCloud && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.25em] px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle size={9} /> Sincronizado
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ type: "spring", stiffness: 200, damping: 16 }}
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${isCloud ? "bg-slate-900" : "bg-slate-100 border border-slate-200"}`}>
                          {isCloud
                            ? <Cloud size={26} className="text-white" strokeWidth={2} />
                            : <Laptop size={26} className="text-slate-700" strokeWidth={2} />}
                        </motion.div>
                        <div className="min-w-0">
                          <h2 className="text-[28px] leading-[1.05] font-black text-slate-900 tracking-tight" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                            {isCloud
                              ? <>Tus datos viven en <span className="italic font-light text-sky-600">la nube</span></>
                              : <>Tus datos viven <span className="italic font-light text-amber-600">solo aquí</span></>}
                          </h2>
                          <p className="text-[12px] text-slate-500 font-medium mt-1">
                            {isCloud
                              ? "Accesibles desde cualquier dispositivo. Respaldo automático activo."
                              : "Guardados en este equipo. Conecta la nube para acceso multi-dispositivo."}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* CTA principal: conectar nube de fábrica cuando aplique */}
                    {showFactoryCTA && (
                      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        data-testid="atlas-onboarding-connect"
                        onClick={async () => {
                          try {
                            const res = await switchDatabase(factoryPreset.url);
                            const uploaded = res?.total_uploaded || 0;
                            if (uploaded > 0) {
                              toast({ title: `Nube conectada · ${uploaded} registros subidos`, description: "Los datos locales se fusionaron con la nube. Actualizando..." });
                            } else {
                              toast({ title: "Conectado a la base de datos en la nube — Actualizando..." });
                            }
                            try { localStorage.setItem("cp_atlas_banner_dismissed", "1"); } catch {}
                            setTimeout(() => window.location.reload(), 1600);
                          } catch (e) { toast({ title: e.response?.data?.detail || "Error al conectar", variant: "destructive" }); }
                        }}
                        className="group inline-flex items-center gap-2 pl-4 pr-3 py-2.5 rounded-full text-[11px] font-black uppercase tracking-wider text-white bg-slate-900 shadow-[0_10px_30px_-10px_rgba(15,23,42,0.6)] hover:bg-slate-800 transition-all">
                        <Sparkles size={13} /> Conectar la nube
                        <span className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                          <ArrowRight size={12} />
                        </span>
                      </motion.button>
                    )}
                  </div>

                  {/* Métricas editoriales */}
                  <div className="mt-7 grid grid-cols-3 gap-0 border-t border-slate-100 pt-5">
                    {[
                      { k: "Registros", v: objects.toLocaleString() },
                      { k: "Colecciones", v: collections },
                      { k: "Tamaño", v: dbStats?.total_size || "—" },
                    ].map((m, i) => (
                      <div key={m.k} className={`px-4 ${i > 0 ? "border-l border-slate-100" : ""}`}>
                        <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">{m.k}</div>
                        <div className="text-[26px] leading-none font-black text-slate-900 mt-1.5" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                          {m.v}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Sub-estado: pendiente / al día / sin nube */}
                  {!isCloud && cloudCheck && !cloudCheck.checking && !cloudCheck.error && pending > 0 && cloudPreset && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-5 flex items-center gap-3 rounded-2xl bg-orange-50/70 border border-orange-200 px-4 py-3"
                      data-testid="cloud-sync-pending-banner">
                      <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 border border-orange-200">
                        <CloudUpload size={16} className="text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-black text-slate-900" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                          {pending} {pending === 1 ? "registro pendiente" : "registros pendientes"} de subir
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                          local {cloudCheck.current_total} → {cloudCheck.target_name} {cloudCheck.target_total}
                        </p>
                      </div>
                      <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                        data-testid="cloud-sync-now-btn"
                        onClick={async () => {
                          try {
                            const res = await switchDatabase(cloudPreset.url);
                            const uploaded = res?.total_uploaded || 0;
                            toast({ title: `Nube actualizada · ${uploaded} registros subidos`, description: "Actualizando..." });
                            setTimeout(() => window.location.reload(), 1600);
                          } catch (e) { toast({ title: e.response?.data?.detail || "Error al sincronizar", variant: "destructive" }); }
                        }}
                        className="px-3.5 py-2 rounded-full text-[10px] font-black uppercase tracking-wider text-white bg-orange-500 hover:bg-orange-600 shadow-md flex items-center gap-1.5 shrink-0">
                        <CloudUpload size={12} /> Sincronizar
                      </motion.button>
                    </motion.div>
                  )}

                  {!isCloud && cloudCheck && !cloudCheck.checking && !cloudCheck.error && pending === 0 && cloudCheck.target_total > 0 && (
                    <div className="mt-5 flex items-center gap-2.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 px-4 py-2.5" data-testid="cloud-sync-uptodate-banner">
                      <CheckCircle size={13} className="text-emerald-600 shrink-0" />
                      <p className="text-[11px] font-bold text-slate-600">
                        Nube "{cloudCheck.target_name}" al día ({cloudCheck.target_total} registros).
                      </p>
                    </div>
                  )}

                  {!isCloud && (!cloudPreset || (cloudCheck && cloudCheck.error)) && !showFactoryCTA && (
                    <div className="mt-5 flex items-center gap-2.5 rounded-2xl bg-slate-50 border border-slate-200 px-4 py-2.5">
                      <AlertCircle size={13} className="text-slate-500 shrink-0" />
                      <p className="text-[11px] font-bold text-slate-600">
                        {cloudCheck?.error
                          ? "No se pudo conectar con la nube para comparar. Revisa tu internet."
                          : "Aún no tienes una base de datos en la nube configurada."}
                      </p>
                    </div>
                  )}

                  {dbStats?.connection_error && (
                    <div className="mt-5 flex items-start gap-2.5 rounded-2xl bg-red-50 border border-red-200 px-4 py-3">
                      <WifiOff size={14} className="text-red-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[12px] font-black text-red-700">Sin conexión a la base de datos</p>
                        <p className="text-[10px] text-red-500 mt-0.5">Abre "Copia de seguridad" y usa "Probar conexión" para diagnosticar.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </motion.div>

        {/* ── COPIA DE SEGURIDAD (rediseño editorial) ── */}
        <motion.div variants={fadeUp}>
          <div className={`relative rounded-[28px] overflow-hidden border transition-all duration-300 bg-white ${autoBackup.config.enabled ? "border-emerald-300 shadow-[0_0_0_4px_rgba(16,185,129,0.08)]" : "border-slate-200/70"}`}>
            {/* Header */}
            <div onClick={() => toggleBlock("conn")} data-testid="db-block-toggle-conn"
              className="flex items-center justify-between px-6 py-5 cursor-pointer select-none group">
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border transition-colors ${autoBackup.config.enabled ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200 group-hover:bg-slate-100"}`}>
                  <HardDrive size={18} className={autoBackup.config.enabled ? "text-emerald-600" : "text-slate-600"} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[18px] font-black text-slate-900 leading-none tracking-tight" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>Copia de seguridad</p>
                    {autoBackup.config.enabled && (
                      <span data-testid="unified-backup-active-badge" className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Auto
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium mt-1">Respalda todos tus datos en tu PC con un solo clic</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {dbStats && (
                  <span className={`hidden sm:flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${dbStats.is_atlas ? "bg-sky-50 text-sky-700 border-sky-200" : dbStats.is_custom ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-slate-50 text-slate-600 border-slate-200"}`}>
                    {dbStats.is_atlas ? <Cloud size={9} /> : <Laptop size={9} />}
                    {dbStats.is_atlas ? "Nube" : dbStats.is_custom ? "Personalizada" : "Local"}
                  </span>
                )}
                <button onClick={(e) => { e.stopPropagation(); loadDbStats(); }} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-all" title="Actualizar estadísticas">
                  <RefreshCw size={13} className={dbLoading ? "animate-spin" : ""} />
                </button>
                <div className="w-9 h-9 rounded-xl bg-slate-50 group-hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors">
                  <BlockChevron open={openBlocks.conn} />
                </div>
              </div>
            </div>

            <CollapseBody open={openBlocks.conn}>
            <div className="px-6 pb-6 pt-1 space-y-5 border-t border-slate-100">

              {/* ── Botón principal: Guardar respaldo en la NUBE (con animación) ── */}
              <div className="pt-5">
                <motion.button whileHover={{ scale: cloudBackup.phase ? 1 : 1.005 }} whileTap={{ scale: cloudBackup.phase ? 1 : 0.99 }}
                  onClick={() => { if (!cloudBackup.phase) handleCloudBackup(); }}
                  disabled={!!cloudBackup.phase || autoBackup.isBacking}
                  data-testid="backup-save-now-btn"
                  className="group relative w-full flex items-center justify-between gap-4 pl-6 pr-3 py-5 rounded-[22px] text-white transition-all overflow-hidden disabled:cursor-not-allowed"
                  style={{
                    background: cloudBackup.phase === "done"
                      ? "linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)"
                      : "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f766e 100%)",
                    boxShadow: cloudBackup.phase === "upload"
                      ? "0 25px 50px -12px rgba(15,118,110,0.55), inset 0 1px 0 rgba(255,255,255,0.14), 0 0 0 4px rgba(20,184,166,0.15)"
                      : "0 20px 40px -18px rgba(15,23,42,0.55), inset 0 1px 0 rgba(255,255,255,0.12)",
                  }}>
                  {/* Dot pattern base */}
                  <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />

                  {/* Sweep animation during upload */}
                  {cloudBackup.phase === "upload" && (
                    <motion.div
                      initial={{ x: "-100%" }} animate={{ x: "200%" }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-y-0 w-1/3"
                      style={{ background: "linear-gradient(90deg, transparent, rgba(94,234,212,0.25), transparent)" }} />
                  )}

                  {/* Rising particles during upload */}
                  {cloudBackup.phase === "upload" && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <motion.span
                          key={i}
                          initial={{ y: 60, opacity: 0, x: 20 + i * 60 }}
                          animate={{ y: -20, opacity: [0, 1, 0] }}
                          transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.25, ease: "easeOut" }}
                          className="absolute bottom-0 w-1 h-1 rounded-full bg-teal-300 shadow-[0_0_8px_rgba(94,234,212,0.9)]"
                        />
                      ))}
                    </div>
                  )}

                  <div className="relative flex items-center gap-4 min-w-0 z-10">
                    <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 group-hover:bg-white/15 transition-colors">
                      <AnimatePresence mode="wait">
                        {cloudBackup.phase === "prepare" && (
                          <motion.div key="p" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }}>
                            <Package size={20} strokeWidth={2.4} />
                          </motion.div>
                        )}
                        {cloudBackup.phase === "upload" && (
                          <motion.div key="u" initial={{ y: 10, opacity: 0 }} animate={{ y: [-2, -6, -2], opacity: 1 }}
                            transition={{ y: { duration: 1.4, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.3 } }}
                            exit={{ opacity: 0 }}>
                            <CloudUpload size={22} strokeWidth={2.4} className="text-teal-200" />
                          </motion.div>
                        )}
                        {cloudBackup.phase === "done" && (
                          <motion.div key="d" initial={{ scale: 0.5, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} exit={{ opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 15 }}>
                            <CheckCircle size={22} strokeWidth={2.6} className="text-emerald-300" />
                          </motion.div>
                        )}
                        {!cloudBackup.phase && (
                          <motion.div key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <Cloud size={20} strokeWidth={2.4} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="text-left min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50 mb-0.5">
                        {cloudBackup.phase === "prepare" && "Preparando…"}
                        {cloudBackup.phase === "upload" && "Subiendo a MongoDB"}
                        {cloudBackup.phase === "done" && "Guardado en la nube"}
                        {!cloudBackup.phase && "Acción principal"}
                      </div>
                      <div className="text-[18px] font-black leading-none tracking-tight" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                        {cloudBackup.phase === "prepare" && "Empaquetando datos…"}
                        {cloudBackup.phase === "upload" && "Subiendo respaldo…"}
                        {cloudBackup.phase === "done" && (
                          <>Respaldo en la nube · <span className="text-teal-200">{cloudBackup.result?.total_docs || 0} docs</span></>
                        )}
                        {!cloudBackup.phase && "Guardar respaldo en la nube"}
                      </div>
                    </div>
                  </div>
                  <div className="relative shrink-0 w-11 h-11 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center z-10">
                    {cloudBackup.phase === "prepare" && <Loader2 size={18} className="animate-spin" />}
                    {cloudBackup.phase === "upload" && <Loader2 size={18} className="animate-spin text-teal-200" />}
                    {cloudBackup.phase === "done" && <Sparkles size={18} className="text-emerald-300" />}
                    {!cloudBackup.phase && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                  </div>
                </motion.button>

                {/* Barra de progreso indeterminada */}
                <AnimatePresence>
                  {(cloudBackup.phase === "prepare" || cloudBackup.phase === "upload") && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="mt-2 h-1 rounded-full bg-slate-100 overflow-hidden">
                      <motion.div
                        initial={{ x: "-40%" }} animate={{ x: "140%" }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                        className="h-full w-1/3 rounded-full"
                        style={{ background: "linear-gradient(90deg, #0f766e, #14b8a6, #0f766e)" }} />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Resultado */}
                <AnimatePresence>
                  {cloudBackup.phase === "done" && cloudBackup.result && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                      className="mt-3 flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3"
                      data-testid="cloud-backup-success">
                      <div className="w-9 h-9 rounded-xl bg-white border border-emerald-200 flex items-center justify-center shrink-0">
                        <CheckCircle size={16} className="text-emerald-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-black text-emerald-800" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                          Respaldo guardado en {cloudBackup.result.is_atlas ? "MongoDB Atlas · nube" : "tu MongoDB"}
                        </p>
                        <p className="text-[10px] text-emerald-600 mt-0.5 font-mono">
                          {cloudBackup.result.total_docs} docs · {cloudBackup.result.collections_count} colecciones · {cloudBackup.result.size}
                        </p>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500 text-white">
                        {cloudBackup.result.is_atlas ? "Nube" : "Local"}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {cloudBackup.error && (
                  <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200/60 rounded-2xl px-4 py-2.5 text-[11px] text-red-600 font-semibold">
                    <AlertCircle size={13} />
                    {cloudBackup.error}
                  </div>
                )}

                {/* Confirmación último respaldo local */}
                {!cloudBackup.phase && (autoBackup.backupCount > 0 || lastAgoDisplay) && (
                  <div className="mt-3 flex items-center gap-3 bg-emerald-50/50 border border-emerald-200/70 rounded-2xl px-4 py-2.5">
                    <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-slate-700">
                        Último respaldo local: <span className="text-emerald-700">{lastAgoDisplay || "hace unos segundos"}</span>
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">→ backups/ · junto a la app</p>
                    </div>
                    {autoBackup.backupCount > 0 && (
                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-300">
                        {autoBackup.backupCount} sesión
                      </span>
                    )}
                  </div>
                )}

                {autoBackup.lastError && (
                  <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200/60 rounded-2xl px-4 py-2.5 text-[11px] text-red-600 font-semibold">
                    <AlertCircle size={13} />
                    {autoBackup.lastError}
                  </div>
                )}
              </div>

              {/* ── Grid: Stats + Espacio ── */}
              {dbLoading ? (
                <div className="flex items-center justify-center py-6 gap-3 text-slate-400">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-xs">Cargando estadísticas...</span>
                </div>
              ) : dbStats ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Stats */}
                  <div className="rounded-2xl border border-slate-200/70 bg-slate-50/40 p-4">
                    <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 mb-3">Estadísticas</div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Docs",   value: dbStats.objects?.toLocaleString() || "—", accent: "text-emerald-600" },
                        { label: "Colls",  value: dbStats.collections ?? "—",               accent: "text-indigo-600" },
                        { label: "Tamaño", value: dbStats.total_size || "—",                accent: "text-violet-600" },
                      ].map((item) => (
                        <div key={item.label} data-testid={`db-stat-${item.label.toLowerCase()}`}>
                          <div className={`text-xl font-black leading-none ${item.accent}`} style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>{item.value}</div>
                          <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">{item.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Espacio */}
                  {dbStats.free_size ? (
                    <div data-testid="db-space-info" className="rounded-2xl border border-slate-200/70 bg-slate-50/40 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                          Espacio {dbStats.is_atlas ? "· nube" : "· equipo"}
                        </div>
                        <p className="text-[10px] font-black text-slate-600 font-mono">
                          {dbStats.used_size}{dbStats.limit_size && dbStats.limit_size !== "—" ? ` / ${dbStats.limit_size}` : ""}
                        </p>
                      </div>
                      {typeof dbStats.used_pct === "number" && dbStats.limit_size !== "—" ? (
                        <>
                          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(2, dbStats.used_pct)}%` }}
                              transition={{ duration: 0.8 }}
                              className={`h-full rounded-full ${dbStats.used_pct > 85 ? "bg-red-500" : dbStats.used_pct > 60 ? "bg-amber-500" : "bg-emerald-500"}`}
                            />
                          </div>
                          <p className="text-[11px] font-bold text-emerald-600 mt-2">
                            {dbStats.free_size} libre ({(100 - dbStats.used_pct).toFixed(1)}%)
                          </p>
                        </>
                      ) : (
                        <p className="text-[11px] font-bold text-emerald-600">{dbStats.free_size}</p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 p-4 flex items-center justify-center text-[11px] text-slate-400 font-semibold">
                      Espacio no disponible
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between py-3 px-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <p className="text-xs text-slate-400">No se pudieron cargar las estadísticas</p>
                  <button onClick={loadDbStats} className="text-xs text-indigo-500 font-bold hover:underline">Reintentar</button>
                </div>
              )}

              {/* ── Conexión actual (solo lectura) ── */}
              {dbStats && (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/70 bg-white px-3 py-2.5">
                  <Link2 size={12} className="text-slate-400 shrink-0" />
                  <p className="text-[10px] font-mono text-slate-500 truncate flex-1 min-w-0">{dbStats.current_url || "—"}</p>
                </div>
              )}
              {dbTestResult && (
                <div className={`flex items-center gap-2 text-[11px] font-semibold px-3 py-2 rounded-xl ${dbTestResult.ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60" : "bg-red-50 text-red-600 border border-red-200/60"}`}>
                  {dbTestResult.ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
                  {dbTestResult.msg}
                </div>
              )}

              {/* ── Cambiar conexión / Conectar a la nube ── */}
              <div data-testid="db-change-connection" className="rounded-2xl border border-slate-200/70 bg-slate-50/40 p-4 space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
                    <Cloud size={15} className="text-white" strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-black text-slate-900 leading-none" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                      Cambiar conexión
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">Pega la URL de tu base de datos (MongoDB Atlas u otra) y conéctate</p>
                  </div>
                </div>

                <Input
                  value={newDbUrl}
                  onChange={(e) => { setNewDbUrl(e.target.value); setDbTestResult(null); }}
                  placeholder="mongodb+srv://usuario:clave@cluster.mongodb.net"
                  data-testid="db-new-url-input"
                  autoComplete="off" spellCheck={false}
                  className="font-mono text-[12px] bg-white border-slate-200"
                />

                <div className="flex flex-wrap items-center gap-2">
                  <motion.button whileHover={{ scale: newDbUrl.trim() ? 1.03 : 1 }} whileTap={{ scale: newDbUrl.trim() ? 0.97 : 1 }}
                    onClick={handleDbTest}
                    disabled={!newDbUrl.trim() || dbTesting}
                    data-testid="db-new-test-btn"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white text-slate-800 border border-slate-200 hover:bg-slate-50 shadow-sm">
                    {dbTesting ? <Loader2 size={12} className="animate-spin" /> : <Wifi size={12} />}
                    {dbTesting ? "Probando…" : "Probar"}
                  </motion.button>

                  <motion.button whileHover={{ scale: newDbUrl.trim() ? 1.03 : 1 }} whileTap={{ scale: newDbUrl.trim() ? 0.97 : 1 }}
                    onClick={handleDbConnect}
                    disabled={!newDbUrl.trim() || dbConnecting}
                    data-testid="db-connect-btn"
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-slate-900 text-white hover:bg-slate-800 shadow-sm">
                    {dbConnecting ? <Loader2 size={12} className="animate-spin" /> : <LogIn size={12} />}
                    {dbConnecting ? "Conectando…" : "Conectar"}
                  </motion.button>

                  <button
                    onClick={handleDbReset}
                    disabled={dbResetting}
                    data-testid="db-reset-btn"
                    className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all disabled:opacity-40">
                    {dbResetting ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                    {dbResetting ? "Restaurando…" : "Restaurar local"}
                  </button>
                </div>

                <div className="flex items-start gap-2 text-[10px] text-slate-500 leading-relaxed">
                  <ShieldCheck size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>Al conectar, tus datos locales se fusionan con la nube (no se sobrescribe nada). La conexión queda guardada para las próximas sesiones.</span>
                </div>
              </div>

              {/* ── Info card breve ── */}

              {/* ── Automático + Restaurar (grid) ── */}
              <div className="grid md:grid-cols-2 gap-3">
                {/* Automático */}
                <div className={`rounded-2xl border p-4 transition-all ${autoBackup.config.enabled ? "border-emerald-300 bg-emerald-50/40" : "border-slate-200/70 bg-white"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${autoBackup.config.enabled ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                        <Zap size={14} strokeWidth={2.4} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-black text-slate-800 leading-none" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>Automático</p>
                        <p className="text-[10px] text-slate-400 mt-1 truncate">
                          {autoBackup.config.enabled
                            ? `Cada ${autoBackup.config.intervalMinutes} min`
                            : "Actívalo para guardar solo"}
                        </p>
                      </div>
                    </div>
                    <button
                      data-testid="auto-backup-toggle"
                      onClick={() => {
                        const next = !autoBackup.config.enabled;
                        autoBackup.updateConfig({ enabled: next, mode: "app_folder" });
                        toast({ title: next ? "Respaldo automático activado" : "Respaldo automático desactivado" });
                      }}
                      className={`w-11 h-6 rounded-full transition-all duration-300 relative shrink-0 ${autoBackup.config.enabled ? "bg-emerald-500" : "bg-slate-300"}`}>
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${autoBackup.config.enabled ? "left-[22px]" : "left-0.5"}`} />
                    </button>
                  </div>
                  <AnimatePresence>
                    {autoBackup.config.enabled && (
                      <motion.div key="freq" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="pt-3">
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { label: "30 min",  value: 30 },
                            { label: "1 h",     value: 60 },
                            { label: "6 h",     value: 360 },
                            { label: "24 h",    value: 1440 },
                          ].map(({ label, value }) => {
                            const active = autoBackup.config.intervalMinutes === value;
                            return (
                              <button key={value}
                                data-testid={`interval-${value}`}
                                onClick={() => autoBackup.updateConfig({ intervalMinutes: value })}
                                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${active ? "bg-emerald-500 text-white shadow-sm" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"}`}>
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Restaurar */}
                <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                      <Upload size={14} strokeWidth={2.4} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-black text-slate-800 leading-none" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>Restaurar</p>
                      <p className="text-[10px] text-slate-400 mt-1">Sube un archivo .json</p>
                    </div>
                  </div>
                  <input ref={restoreAutoInputRef} type="file" accept=".json"
                    onChange={handleRestoreFile} className="hidden" id="restore-file-auto-input" data-testid="restore-file-auto-input" />
                  <label htmlFor="restore-file-auto-input"
                    className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider cursor-pointer transition-all border-2 border-dashed ${restoreLoading ? "border-slate-200 bg-slate-50 text-slate-300" : "border-indigo-200 bg-indigo-50/30 hover:bg-indigo-50 text-indigo-700"}`}>
                    {restoreLoading ? <Loader2 size={13} className="animate-spin" /> : <FolderOpen size={13} />}
                    {restoreLoading ? "Restaurando…" : "Elegir archivo"}
                  </label>
                  {restoreResult && (
                    <div className={`mt-2 flex items-center gap-2 text-[11px] font-semibold px-3 py-2 rounded-xl ${restoreResult.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                      {restoreResult.ok ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {restoreResult.msg}
                    </div>
                  )}
                </div>
              </div>

            </div>
            </CollapseBody>
          </div>
        </motion.div>




        {/* ── GITHUB & CONTEXTO IA ── */}
        <motion.div variants={fadeUp} style={{ display: advancedMode ? undefined : "none" }} data-testid="db-advanced-block-github">
          <div className={`glass rounded-3xl overflow-hidden transition-all duration-300 ${ghConfig.repo_url ? "ring-2 ring-slate-800/30" : ""}`}
            style={{ background: ghConfig.repo_url ? "linear-gradient(135deg,rgba(30,41,59,0.05),rgba(15,23,42,0.03))" : undefined }}>

            <div onClick={handleSoporteHeaderClick} data-testid="db-block-toggle-github"
              className="flex items-center justify-between px-5 py-4 border-b border-white/40 cursor-pointer select-none">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${ghConfig.repo_url && soporteUnlocked ? "bg-slate-900" : "bg-slate-100"}`}>
                  {soporteUnlocked ? (
                    <LifeBuoy size={16} className={ghConfig.repo_url ? "text-white" : "text-slate-500"} />
                  ) : (
                    <Lock size={16} className="text-slate-500" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                    Soporte avanzado
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {!soporteUnlocked
                      ? "Sección protegida — requiere contraseña"
                      : ghConfig.repo_url
                        ? "Repositorio conectado ✓"
                        : "Conecta tu repositorio para sincronizar"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!soporteUnlocked ? (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                    <Lock size={10} /> Bloqueado
                  </span>
                ) : ghConfig.repo_url && (
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                    Activo
                  </span>
                )}
                <BlockChevron open={openBlocks.github && soporteUnlocked} />
              </div>
            </div>

            <CollapseBody open={openBlocks.github && soporteUnlocked}>
              <div className="p-4 space-y-3">

                {/* ── Encabezado unificado: cuenta conectada / conectar ── */}
                <div className={`rounded-2xl border p-3 ${ghConfig.username ? "bg-emerald-50/70 border-emerald-200" : "bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700 text-white"}`}>
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
                        {ghConfig.repo_url && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-[10px] text-emerald-700/80 font-mono truncate">
                              {ghConfig.repo_url.replace(/^https?:\/\/github\.com\//, "")}
                            </p>
                            <button
                              onClick={handleCopyRepoUrl}
                              title="Copiar URL"
                              className="text-emerald-600/60 hover:text-emerald-700 transition-colors shrink-0"
                            >
                              {copiedRepo ? <CheckCircle size={10} /> : <Copy size={10} />}
                            </button>
                            <a
                              href={ghConfig.repo_url}
                              target="_blank" rel="noopener noreferrer"
                              title="Abrir en GitHub"
                              className="text-emerald-600/60 hover:text-emerald-700 transition-colors shrink-0"
                            >
                              <ExternalLink size={10} />
                            </a>
                          </div>
                        )}
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
                        <p className="text-[11px] text-white/60 mt-0.5">Sube cambios, publica versiones y compila la app de escritorio</p>
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

                {/* ── TABS: Publicar · App Escritorio · Almacenamiento · Herramientas · Usuarios ── */}
                <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-2xl overflow-x-auto">
                  {[
                    { id: "publish",  label: "Publicar",       icon: <CloudUpload size={12} /> },
                    { id: "desktop",  label: "App Escritorio", icon: <Laptop size={12} /> },
                    { id: "storage",  label: "Almacenamiento", icon: <HardDrive size={12} /> },
                    { id: "tools",    label: "Herramientas",   icon: <Wrench size={12} /> },
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setSupportTab(t.id)}
                      data-testid={`support-tab-${t.id}`}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-[11px] font-bold transition-all ${
                        supportTab === t.id
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-700 hover:bg-white/60"
                      }`}
                    >
                      {t.icon}
                      <span className="hidden sm:inline">{t.label}</span>
                    </button>
                  ))}
                </div>

                {/* ═══════════ TAB 1: PUBLICAR ═══════════ */}
                {supportTab === "publish" && (
                  <div className="space-y-3" data-testid="support-panel-publish">

                    {/* Estado del repo */}
                    {ghConfig.repo_url && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white/70 rounded-2xl p-3 border border-slate-200/60">
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                            <GitCommit size={10} /> Último SHA
                          </p>
                          <p className="font-mono text-sm font-black text-slate-800">
                            {ghConfig.last_commit_sha ? ghConfig.last_commit_sha.slice(0, 7) : "—"}
                          </p>
                        </div>
                        <div className="bg-white/70 rounded-2xl p-3 border border-slate-200/60">
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                            <Clock size={10} /> Último push
                          </p>
                          <p className="text-[11px] font-bold text-slate-700 truncate">
                            {ghConfig.last_push_at
                              ? timeAgo(new Date(ghConfig.last_push_at).getTime()) || "reciente"
                              : "Nunca"}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Botón principal: Publicar todo */}
                    <motion.button
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                      onClick={handlePushAllToGithub}
                      disabled={ghPushing || !ghConfig.username}
                      data-testid="github-push-all-btn"
                      title={!ghConfig.username ? "Conecta tu cuenta de GitHub primero" : "Sube todos los cambios al repositorio"}
                      className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-black transition-all disabled:opacity-60 ${
                        ghConfig.username
                          ? "text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg"
                          : "text-slate-500 bg-slate-100 cursor-not-allowed"
                      }`}
                    >
                      {ghPushing ? <Loader2 size={16} className="animate-spin" /> : <CloudUpload size={16} />}
                      {ghPushing ? "Subiendo cambios..." : "Publicar cambios al repositorio"}
                    </motion.button>

                    {/* Enlaces rápidos */}
                    {ghConfig.repo_url && (
                      <div className="grid grid-cols-3 gap-2">
                        <a
                          href={ghConfig.repo_url}
                          target="_blank" rel="noopener noreferrer"
                          data-testid="link-open-repo"
                          className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-[11px] font-bold text-slate-700 transition-colors"
                        >
                          <Github size={11} /> Repositorio
                          <ExternalLink size={9} className="opacity-60" />
                        </a>
                        <a
                          href={`${ghConfig.repo_url}/releases`}
                          target="_blank" rel="noopener noreferrer"
                          data-testid="link-open-releases"
                          className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-[11px] font-bold text-slate-700 transition-colors"
                        >
                          <Package size={11} /> Releases
                          <ExternalLink size={9} className="opacity-60" />
                        </a>
                        <a
                          href={`${ghConfig.repo_url}/actions`}
                          target="_blank" rel="noopener noreferrer"
                          data-testid="link-open-actions"
                          className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-[11px] font-bold text-slate-700 transition-colors"
                        >
                          <Zap size={11} /> Actions
                          <ExternalLink size={9} className="opacity-60" />
                        </a>
                      </div>
                    )}

                    {/* Barra de progreso del push a GitHub */}
                    <AnimatePresence>
                      {ghPushing && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          data-testid="github-push-progress"
                          className="overflow-hidden bg-emerald-50/60 border border-emerald-100 rounded-2xl px-4 py-3 space-y-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                              <span className="flex items-center gap-2 min-w-0">
                                <Loader2 size={13} className="animate-spin shrink-0" />
                                <span className="truncate">{ghPushMsg || "Subiendo repositorio…"}</span>
                              </span>
                              <span data-testid="github-push-progress-pct" className="font-mono tabular-nums shrink-0 ml-2">
                                {Math.round(ghPushProgress)}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-emerald-700/80">
                              <span className="flex items-center gap-1.5">
                                {ghPushStep > 0 && (
                                  <span className="font-semibold">
                                    Paso {ghPushStep} de {ghPushTotalSteps}
                                    {ghPushStepLabel ? ` · ${ghPushStepLabel}` : ""}
                                  </span>
                                )}
                              </span>
                              <span className="flex items-center gap-1 font-mono tabular-nums">
                                <Clock size={10} />
                                {Math.floor(ghPushElapsed / 60)}:{String(ghPushElapsed % 60).padStart(2, "0")}
                              </span>
                            </div>
                          </div>

                          {ghPushDetail && (
                            <div className="text-[11px] text-emerald-700/90 flex items-center gap-1.5 bg-white/60 rounded-lg px-2.5 py-1.5 border border-emerald-100">
                              <Sparkles size={11} className="shrink-0 text-emerald-500" />
                              <span className="truncate">{ghPushDetail}</span>
                            </div>
                          )}

                          <div className="h-2.5 w-full rounded-full bg-emerald-100 overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600"
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(3, Math.min(100, ghPushProgress))}%` }}
                              transition={{ duration: 0.4, ease: "easeOut" }}
                            />
                          </div>

                          {ghPushSteps.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pt-1">
                              {ghPushSteps.map((label, i) => {
                                const n = i + 1;
                                const done = ghPushStep > n || (ghPushProgress >= 100);
                                const active = ghPushStep === n && ghPushProgress < 100;
                                return (
                                  <div
                                    key={label}
                                    className={`flex items-center gap-1.5 text-[10px] leading-tight ${
                                      done ? "text-emerald-700" : active ? "text-emerald-900 font-bold" : "text-emerald-700/40"
                                    }`}
                                  >
                                    {done ? (
                                      <CheckCircle size={11} className="shrink-0 text-emerald-500" />
                                    ) : active ? (
                                      <Loader2 size={11} className="shrink-0 animate-spin" />
                                    ) : (
                                      <span className="w-[11px] h-[11px] shrink-0 rounded-full border border-emerald-300/60" />
                                    )}
                                    <span className="truncate">{label}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <p className="text-[9px] text-emerald-600/70 leading-tight pt-0.5">
                            Puedes dejar esta ventana abierta. La compilación tarda 1–2 min; tus actualizaciones para PC se publican automáticamente al terminar.
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Info: fecha del último push */}
                    {ghConfig.last_push_at && !ghPushing && (
                      <div className="text-[10px] text-slate-500 flex items-center justify-between bg-emerald-50/50 border border-emerald-100 rounded-xl px-3 py-2">
                        <span className="flex items-center gap-1.5">
                          <GitCommit size={11} className="text-emerald-500" />
                          Último push: <b className="font-mono">{ghConfig.last_commit_sha?.slice(0, 7) || "—"}</b>
                        </span>
                        <span>{new Date(ghConfig.last_push_at).toLocaleString("es-GT")}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* ═══════════ TAB 2: APP DE ESCRITORIO ═══════════ */}
                {supportTab === "desktop" && (
                  <div className="space-y-3" data-testid="support-panel-desktop">
                    <DesktopAppSection />

                    {/* Reintentar compilación del .exe en GitHub Actions */}
                    {storage?.connected && (
                      <div className="flex items-center gap-3 bg-slate-50/70 rounded-2xl px-4 py-3 border border-slate-200/60">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
                          <Zap size={14} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-700">Recompilar .exe en GitHub Actions</p>
                          <p className="text-[10px] text-slate-400">Reinicia manualmente la compilación remota si algo falló.</p>
                        </div>
                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          onClick={handleTriggerBuild} disabled={buildTriggering}
                          data-testid="repo-trigger-build-btn"
                          className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 flex items-center gap-1.5 shrink-0 disabled:opacity-60">
                          {buildTriggering ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                          Compilar
                        </motion.button>
                      </div>
                    )}
                  </div>
                )}

                {/* ═══════════ TAB 3: ALMACENAMIENTO ═══════════ */}
                {supportTab === "storage" && (
                  <div className="space-y-3" data-testid="support-panel-storage">
                    <div data-testid="repo-storage-card" className="rounded-2xl border border-slate-200 bg-white/70 overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
                        <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
                          <HardDrive size={16} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-slate-900" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                            Almacenamiento del repositorio
                          </p>
                          <p className="text-[11px] text-slate-400">Espacio · Plan · Builds .exe publicados</p>
                        </div>
                        <button
                          onClick={loadStorage}
                          disabled={storageLoading}
                          data-testid="repo-storage-refresh-btn"
                          className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-all"
                          title="Actualizar">
                          <RefreshCw size={13} className={storageLoading ? "animate-spin" : ""} />
                        </button>
                      </div>

                      <div className="p-4 space-y-4">
                        {storageLoading && !storage ? (
                          <div className="flex items-center justify-center py-6 gap-3 text-slate-400">
                            <Loader2 size={18} className="animate-spin" />
                            <span className="text-sm">Consultando GitHub…</span>
                          </div>
                        ) : !storage ? (
                          <div className="flex items-center justify-between py-3">
                            <p className="text-sm text-slate-400">Sin datos de almacenamiento.</p>
                            <button onClick={loadStorage} className="text-xs text-indigo-500 font-bold hover:underline">Cargar</button>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-3 gap-2.5" data-testid="repo-storage-metrics">
                              <div className="rounded-2xl p-3.5 bg-indigo-50">
                                <div className="flex items-center gap-1.5 text-indigo-600 mb-1">
                                  <Database size={12} />
                                  <span className="text-[9px] font-black uppercase tracking-widest">Repositorio</span>
                                </div>
                                <div className="text-lg font-black text-indigo-800" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                                  {storage.repo?.size_human || "—"}
                                </div>
                                <div className="text-[10px] font-semibold text-indigo-500/70 truncate">{storage.repo_full_name}</div>
                              </div>
                              <div className="rounded-2xl p-3.5 bg-violet-50">
                                <div className="flex items-center gap-1.5 text-violet-600 mb-1">
                                  <Github size={12} />
                                  <span className="text-[9px] font-black uppercase tracking-widest">Plan</span>
                                </div>
                                <div className="text-lg font-black text-violet-800" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                                  {storage.plan?.name || (storage.connected ? "—" : "Sin token")}
                                </div>
                                <div className="text-[10px] font-semibold text-violet-500/70">
                                  {storage.plan?.login ? `@${storage.plan.login}` : "Conecta tu cuenta"}
                                </div>
                              </div>
                              <div className="rounded-2xl p-3.5 bg-amber-50">
                                <div className="flex items-center gap-1.5 text-amber-600 mb-1">
                                  <Package size={12} />
                                  <span className="text-[9px] font-black uppercase tracking-widest">Builds .exe</span>
                                </div>
                                <div className="text-lg font-black text-amber-800" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                                  {storage.builds_total_human || "0 B"}
                                </div>
                                <div className="text-[10px] font-semibold text-amber-500/70">
                                  {storage.builds_count || 0} ejecutable(s)
                                </div>
                              </div>
                            </div>

                            {storage.plan && (
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 bg-slate-50/70 rounded-2xl px-4 py-2.5">
                                {storage.plan.space_human && storage.plan.space_human !== "—" && (
                                  <span>Espacio del plan: <b className="text-slate-700">{storage.plan.space_human}</b></span>
                                )}
                                {typeof storage.plan.private_repos === "number" && (
                                  <span>Repos privados: <b className="text-slate-700">{storage.plan.private_repos}</b></span>
                                )}
                                {typeof storage.plan.public_repos === "number" && (
                                  <span>Repos públicos: <b className="text-slate-700">{storage.plan.public_repos}</b></span>
                                )}
                              </div>
                            )}

                            {storage.builds && storage.builds.length > 0 ? (
                              <div className="space-y-1.5" data-testid="repo-builds-list">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Archivos publicados</p>
                                <div className="max-h-64 overflow-auto space-y-1.5 pr-1">
                                  {storage.builds.map((b) => (
                                    <div key={b.asset_id} data-testid={`repo-build-${b.asset_id}`}
                                      className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 px-3 py-2">
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${b.kind === ".sha256" ? "bg-slate-100 text-slate-400" : b.kind === "installer" ? "bg-blue-50 text-blue-500" : "bg-emerald-50 text-emerald-500"}`}>
                                        {b.kind === ".sha256" ? <FileCheck2 size={14} /> : <Package size={14} />}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-700 truncate">{b.name}</p>
                                        <p className="text-[10px] text-slate-400">
                                          {b.tag ? `${b.tag} · ` : ""}{b.size_human}{b.kind !== ".sha256" ? ` · ${b.kind === "installer" ? "Instalador" : "Portable"}` : ""}
                                        </p>
                                      </div>
                                      <button
                                        onClick={() => handleDeleteOneBuild(b)}
                                        disabled={deletingAssetId === b.asset_id || buildsDeleting}
                                        data-testid={`repo-build-delete-${b.asset_id}`}
                                        className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-300 hover:text-red-500 transition-all disabled:opacity-40"
                                        title="Borrar este archivo">
                                        {deletingAssetId === b.asset_id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                      </button>
                                    </div>
                                  ))}
                                </div>

                                {!showDeleteBuilds ? (
                                  <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                                    onClick={() => setShowDeleteBuilds(true)}
                                    disabled={!storage.connected}
                                    data-testid="repo-delete-all-builds-btn"
                                    title={!storage.connected ? "Conecta tu cuenta de GitHub primero" : "Borra todos los builds .exe para liberar espacio"}
                                    className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-bold text-red-600 bg-white border border-red-200 hover:bg-red-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                    <Trash2 size={13} /> Borrar todos los builds .exe ({storage.builds_total_human})
                                  </motion.button>
                                ) : (
                                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                    className="mt-2 space-y-2 bg-red-50/70 border border-red-200/70 rounded-2xl p-3">
                                    <div className="flex items-start gap-2.5">
                                      <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                                      <p className="text-xs font-semibold text-red-700">
                                        Se eliminarán <b>{storage.builds.length}</b> archivo(s) de los Releases y se liberarán <b>{storage.builds_total_human}</b>. Esta acción no se puede deshacer, pero puedes regenerar los builds con "Publicar cambios al repositorio".
                                      </p>
                                    </div>
                                    <div className="flex gap-2">
                                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                        onClick={handleDeleteAllBuilds} disabled={buildsDeleting}
                                        data-testid="repo-delete-all-confirm-btn"
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition-all disabled:opacity-60">
                                        {buildsDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                        Sí, borrar todo
                                      </motion.button>
                                      <button
                                        onClick={() => setShowDeleteBuilds(false)} disabled={buildsDeleting}
                                        data-testid="repo-delete-all-cancel-btn"
                                        className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 transition-all disabled:opacity-60">
                                        Cancelar
                                      </button>
                                    </div>
                                  </motion.div>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2.5 bg-slate-50/70 rounded-2xl px-4 py-3">
                                <Info size={14} className="text-slate-400 shrink-0" />
                                <p className="text-[11px] font-semibold text-slate-500">
                                  No hay builds .exe publicados en Releases. El repositorio no tiene ejecutables ocupando espacio.
                                </p>
                              </div>
                            )}

                            {!storage.connected && (
                              <div className="flex items-center gap-2.5 bg-amber-50/70 border border-amber-200/60 rounded-2xl px-4 py-2.5">
                                <Lock size={13} className="text-amber-500 shrink-0" />
                                <p className="text-[11px] font-semibold text-amber-700">
                                  Conecta tu cuenta de GitHub arriba para ver tu plan y poder borrar builds.
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ═══════════ TAB 4: HERRAMIENTAS (Diagnóstico + Contexto IA) ═══════════ */}
                {supportTab === "tools" && (
                  <div className="space-y-3" data-testid="support-panel-tools">

                    {/* Diagnóstico del sistema */}
                    <div className="rounded-2xl border border-slate-200 bg-white/70 overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                          <Stethoscope size={16} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-slate-900" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                            Diagnóstico del sistema
                          </p>
                          <p className="text-[11px] text-slate-400">Verifica dependencias, servicios y configuración</p>
                        </div>
                        {diagnostic?.summary && (
                          <div className={`px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1 ${
                            diagnostic.summary.score >= 90 ? "bg-emerald-100 text-emerald-700"
                              : diagnostic.summary.score >= 70 ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                          }`}>
                            {diagnostic.summary.score}/100
                          </div>
                        )}
                        <button
                          onClick={loadDiagnostic}
                          disabled={diagLoading}
                          data-testid="diagnostic-refresh-btn"
                          className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-all"
                          title="Ejecutar diagnóstico">
                          <RefreshCw size={13} className={diagLoading ? "animate-spin" : ""} />
                        </button>
                      </div>

                      <div className="p-4 space-y-3">
                        {diagLoading && !diagnostic ? (
                          <div className="flex items-center justify-center py-6 gap-3 text-slate-400">
                            <Loader2 size={18} className="animate-spin" />
                            <span className="text-sm">Ejecutando diagnóstico…</span>
                          </div>
                        ) : !diagnostic ? (
                          <div className="flex items-center justify-between py-3">
                            <p className="text-sm text-slate-400">Aún no se ha ejecutado el diagnóstico.</p>
                            <button
                              onClick={loadDiagnostic}
                              data-testid="diagnostic-run-btn"
                              className="text-xs text-indigo-500 font-bold hover:underline">
                              Ejecutar ahora
                            </button>
                          </div>
                        ) : (
                          <>
                            {/* Resumen: OK/warnings/errors */}
                            <div className="grid grid-cols-3 gap-2" data-testid="diagnostic-summary">
                              <div className="rounded-xl p-2.5 bg-emerald-50 text-center">
                                <p className="text-[9px] font-black uppercase tracking-wider text-emerald-600 mb-0.5">OK</p>
                                <p className="text-lg font-black text-emerald-800">{diagnostic.summary?.ok || 0}</p>
                              </div>
                              <div className="rounded-xl p-2.5 bg-amber-50 text-center">
                                <p className="text-[9px] font-black uppercase tracking-wider text-amber-600 mb-0.5">Avisos</p>
                                <p className="text-lg font-black text-amber-800">{diagnostic.summary?.warnings || 0}</p>
                              </div>
                              <div className="rounded-xl p-2.5 bg-red-50 text-center">
                                <p className="text-[9px] font-black uppercase tracking-wider text-red-600 mb-0.5">Errores</p>
                                <p className="text-lg font-black text-red-800">{diagnostic.summary?.errors || 0}</p>
                              </div>
                            </div>

                            {/* Lista de checks */}
                            <div className="space-y-1.5 max-h-72 overflow-auto pr-1" data-testid="diagnostic-checks">
                              {(diagnostic.checks || []).map((c) => (
                                <div
                                  key={c.id}
                                  data-testid={`diagnostic-check-${c.id}`}
                                  className={`flex items-start gap-2.5 rounded-xl px-3 py-2 border ${
                                    c.ok
                                      ? "bg-emerald-50/40 border-emerald-100"
                                      : c.severity === "error"
                                        ? "bg-red-50/60 border-red-200"
                                        : "bg-amber-50/60 border-amber-200"
                                  }`}
                                >
                                  <div className="shrink-0 mt-0.5">
                                    {c.ok ? (
                                      <CheckCircle size={13} className="text-emerald-500" />
                                    ) : c.severity === "error" ? (
                                      <XCircle size={13} className="text-red-500" />
                                    ) : (
                                      <AlertCircle size={13} className="text-amber-500" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-800">{c.label}</p>
                                    {c.detail && (
                                      <p className={`text-[10px] mt-0.5 ${c.ok ? "text-emerald-600/80" : "text-slate-500"}`}>
                                        {c.detail}
                                      </p>
                                    )}
                                  </div>
                                  {!c.ok && c.fixable && (
                                    <button
                                      onClick={() => handleFixIssue(c.id)}
                                      disabled={diagFixingId === c.id}
                                      data-testid={`diagnostic-fix-${c.id}`}
                                      className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white bg-slate-800 hover:bg-slate-900 flex items-center gap-1 disabled:opacity-60"
                                    >
                                      {diagFixingId === c.id ? (
                                        <Loader2 size={9} className="animate-spin" />
                                      ) : (
                                        <Wrench size={9} />
                                      )}
                                      Corregir
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Auto-corregir todo */}
                            {(diagnostic.summary?.errors > 0 || diagnostic.summary?.warnings > 0) && (
                              <motion.button
                                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                                onClick={handleFixAll}
                                disabled={diagFixingAll}
                                data-testid="diagnostic-fix-all-btn"
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-xs font-black text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md disabled:opacity-60"
                              >
                                {diagFixingAll ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                                {diagFixingAll ? "Aplicando correcciones…" : "Auto-corregir todo lo posible"}
                              </motion.button>
                            )}

                            {diagnostic.generated_at && (
                              <p className="text-[10px] text-slate-400 text-center">
                                Última verificación: {new Date(diagnostic.generated_at).toLocaleString("es-GT")}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Contexto para la próxima IA */}
                    <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50/70 to-indigo-50/60 p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0">
                          <Brain size={18} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-slate-900" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                            Contexto para la próxima IA
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Notas y decisiones técnicas que la próxima IA (o desarrollador) debería conocer para mantener el proyecto.
                          </p>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          onClick={handleOpenContext}
                          data-testid="open-ai-context-btn"
                          className="px-3.5 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 flex items-center gap-1.5 shrink-0 shadow-md"
                        >
                          <BookOpen size={12} /> Abrir
                        </motion.button>
                      </div>
                    </div>

                    {/* Info: contraseña de fábrica */}
                    <div className="flex items-start gap-2.5 bg-slate-50/70 rounded-2xl px-4 py-3 border border-slate-200/60">
                      <ShieldCheck size={13} className="text-slate-400 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        Esta sección requiere <b>contraseña de fábrica</b> y contiene herramientas avanzadas. Los cambios aquí pueden afectar el funcionamiento del sistema.
                      </p>
                    </div>
                  </div>
                )}

                {/* PayPal / Google Sign-In / Usuarios — eliminados */}
                {false && supportTab === "users" && (
                  <div className="space-y-3" data-testid="support-panel-users">
                    <div className="rounded-2xl border border-slate-200 bg-white/70 overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0">
                          <Users size={16} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-slate-900" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                            Usuarios registrados
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {users ? `${users.length} usuario(s) · plan, prueba y estado` : "Google Sign-In · gestión avanzada"}
                          </p>
                        </div>
                        <button
                          onClick={loadUsers}
                          disabled={usersLoading}
                          data-testid="admin-users-refresh-btn"
                          className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-all"
                          title="Recargar">
                          <RefreshCw size={13} className={usersLoading ? "animate-spin" : ""} />
                        </button>
                      </div>

                      <div className="p-4 space-y-3">
                        {usersLoading && !users ? (
                          <div className="flex items-center justify-center py-8 gap-3 text-slate-400">
                            <Loader2 size={18} className="animate-spin" />
                            <span className="text-sm">Cargando usuarios…</span>
                          </div>
                        ) : !users ? (
                          <div className="flex items-center justify-between py-3">
                            <p className="text-sm text-slate-400">Aún no se ha cargado la lista.</p>
                            <button
                              onClick={loadUsers}
                              data-testid="admin-users-load-btn"
                              className="text-xs text-indigo-500 font-bold hover:underline">
                              Cargar ahora
                            </button>
                          </div>
                        ) : users.length === 0 ? (
                          <div className="text-center py-8 text-sm text-slate-400" data-testid="admin-users-empty">
                            Todavía no hay usuarios registrados.
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[520px] overflow-auto pr-1" data-testid="admin-users-list">
                            {users.map((u) => {
                              const sub = u.subscription || {};
                              const planLabel = sub.plan === "lifetime" ? "De por vida"
                                : sub.plan === "monthly" ? "Mensual"
                                : sub.trial_active ? `Prueba (${sub.trial_days_left}d)`
                                : "Sin plan";
                              const planTone = u.disabled ? "bg-slate-200 text-slate-600"
                                : sub.plan === "lifetime" ? "bg-amber-100 text-amber-800"
                                : sub.plan === "monthly" ? "bg-emerald-100 text-emerald-800"
                                : sub.trial_active ? "bg-indigo-100 text-indigo-700"
                                : "bg-slate-100 text-slate-500";
                              const busy = userActionId === u.user_id;
                              return (
                                <div
                                  key={u.user_id}
                                  data-testid={`admin-user-row-${u.user_id}`}
                                  className={`rounded-2xl border p-3 flex flex-col sm:flex-row sm:items-center gap-3 ${
                                    u.disabled ? "bg-slate-50 border-slate-200 opacity-70" : "bg-white border-slate-200/70"
                                  }`}
                                >
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    {u.picture ? (
                                      <img src={u.picture} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                                    ) : (
                                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-black shrink-0">
                                        {(u.name || u.email || "?").slice(0, 1).toUpperCase()}
                                      </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-black text-slate-900 truncate" data-testid={`admin-user-name-${u.user_id}`}>
                                        {u.name || "(sin nombre)"} {u.disabled && <span className="text-red-600">· desactivado</span>}
                                      </p>
                                      <p className="text-[11px] text-slate-500 truncate" data-testid={`admin-user-email-${u.user_id}`}>{u.email}</p>
                                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${planTone}`}
                                          data-testid={`admin-user-plan-${u.user_id}`}>
                                          {sub.plan === "lifetime" ? <Crown size={9}/> : sub.trial_active ? <Sparkles size={9}/> : sub.plan === "monthly" ? <CheckCircle size={9}/> : <Clock size={9}/>}
                                          {planLabel}
                                        </span>
                                        {sub.plan === "monthly" && sub.plan_expires_at && (
                                          <span className="text-[10px] text-slate-400">
                                            hasta {new Date(sub.plan_expires_at).toLocaleDateString("es-MX", {day:"2-digit", month:"short", year:"numeric"})}
                                          </span>
                                        )}
                                        {u.payments?.count > 0 && (
                                          <span className="text-[10px] text-slate-400">· {u.payments.count} pago(s) · ${Number(u.payments.amount||0).toFixed(2)}</span>
                                        )}
                                        {u.referrals_count > 0 && (
                                          <span className="text-[10px] text-slate-400">· {u.referrals_count} referido(s)</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {sub.plan && (
                                      <button
                                        disabled={busy}
                                        onClick={() => runUserAction(u.user_id,
                                          () => adminRevokePlan(SOPORTE_FACTORY_PASSWORD, u.user_id),
                                          "Plan retirado")}
                                        data-testid={`admin-user-revoke-${u.user_id}`}
                                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 disabled:opacity-50 flex items-center gap-1"
                                        title="Quitar plan (dejar sin plan)">
                                        <Gift size={10}/> Quitar plan
                                      </button>
                                    )}
                                    {!u.disabled ? (
                                      <button
                                        disabled={busy}
                                        onClick={() => runUserAction(u.user_id,
                                          () => adminDisableUser(SOPORTE_FACTORY_PASSWORD, u.user_id),
                                          "Cuenta desactivada")}
                                        data-testid={`admin-user-disable-${u.user_id}`}
                                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 disabled:opacity-50 flex items-center gap-1"
                                        title="Desactivar (bloquear ingreso)">
                                        <Ban size={10}/> Desactivar
                                      </button>
                                    ) : (
                                      <button
                                        disabled={busy}
                                        onClick={() => runUserAction(u.user_id,
                                          () => adminEnableUser(SOPORTE_FACTORY_PASSWORD, u.user_id),
                                          "Cuenta reactivada")}
                                        data-testid={`admin-user-enable-${u.user_id}`}
                                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 flex items-center gap-1"
                                        title="Reactivar cuenta">
                                        <UserCheck size={10}/> Reactivar
                                      </button>
                                    )}
                                    <button
                                      disabled={busy}
                                      onClick={() => {
                                        if (window.confirm(`¿Eliminar a ${u.email}? Esta acción es irreversible.`)) {
                                          runUserAction(u.user_id,
                                            () => adminDeleteUser(SOPORTE_FACTORY_PASSWORD, u.user_id),
                                            "Usuario eliminado");
                                        }
                                      }}
                                      data-testid={`admin-user-delete-${u.user_id}`}
                                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-black bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50 flex items-center gap-1"
                                      title="Eliminar definitivamente">
                                      {busy ? <Loader2 size={10} className="animate-spin"/> : <Trash2 size={10}/>} Eliminar
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="flex items-start gap-2.5 bg-indigo-50/60 rounded-2xl px-4 py-3 border border-indigo-100">
                          <Info size={13} className="text-indigo-400 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-indigo-700/80 leading-relaxed">
                            <b>Desactivar</b> impide que la persona vuelva a iniciar sesión con Google (cierra todas sus sesiones).
                            <b> Quitar plan</b> retira su suscripción pagada; conserva el registro y podrá volver a suscribirse.
                            <b> Eliminar</b> borra completamente su cuenta y datos de sesión.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}


              </div>
            </CollapseBody>
          </div>
        </motion.div>

        {/* ── ZONA DE PELIGRO (rediseño editorial) ── */}
        <motion.div variants={fadeUp} style={{ display: advancedMode ? undefined : "none" }} data-testid="db-advanced-block-danger">
          <div className="relative rounded-[28px] overflow-hidden border border-red-200 bg-white">
            {/* franja de advertencia */}
            <div className="absolute top-0 left-0 right-0 h-1"
              style={{ backgroundImage: "repeating-linear-gradient(45deg, #ef4444 0 8px, transparent 8px 16px)" }} />

            <div onClick={() => toggleBlock("danger")} data-testid="db-block-toggle-danger"
              className="flex items-center gap-4 px-6 py-5 cursor-pointer select-none group">
              <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center">
                <ShieldAlert size={18} className="text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[18px] font-black text-red-700 leading-none tracking-tight" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                    Zona de peligro
                  </p>
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500 text-white">
                    Irreversible
                  </span>
                </div>
                <p className="text-[11px] text-red-400 font-medium mt-1">Acciones destructivas · se crea respaldo automático antes de ejecutar</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-red-50 group-hover:bg-red-100 flex items-center justify-center text-red-500 transition-colors">
                <BlockChevron open={openBlocks.danger} danger />
              </div>
            </div>
            <CollapseBody open={openBlocks.danger}>
            <div className="px-6 pb-6 pt-1 border-t border-red-100">
              {!showClear ? (
                <motion.button whileHover={{ scale: 1.005 }} whileTap={{ scale: 0.995 }}
                  onClick={() => setShowClear(true)} data-testid="clear-all-data-btn"
                  className="mt-5 w-full flex items-center justify-between gap-3 px-5 py-4 rounded-2xl text-sm font-black text-red-700 bg-red-50/50 border border-red-200 hover:bg-red-50 transition-all">
                  <span className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-red-200 flex items-center justify-center">
                      <Trash2 size={15} className="text-red-500" />
                    </div>
                    <span style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>Borrar todos los datos</span>
                  </span>
                  <ChevronRight size={16} className="text-red-400" />
                </motion.button>
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mt-5 space-y-3">
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
                    <div className="w-9 h-9 rounded-xl bg-white border border-red-200 flex items-center justify-center shrink-0">
                      <AlertCircle size={16} className="text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-red-700" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>¿Confirmar borrado total?</p>
                      <p className="text-xs text-red-500 mt-1">Se eliminarán TODAS las reservas y socios. Un respaldo automático se creará antes de borrar.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={handleClearAll} disabled={clearLoading} data-testid="clear-all-confirm-btn"
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-white bg-red-500 hover:bg-red-600 transition-all disabled:opacity-60 shadow-[0_10px_20px_-8px_rgba(239,68,68,0.6)]">
                      {clearLoading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      Sí, borrar todo
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      onClick={() => setShowClear(false)} data-testid="clear-all-cancel-btn"
                      className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 transition-all">
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
      {createPortal(
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
      </AnimatePresence>,
      document.body
      )}

      {/* ═══════════ MODAL: SUBIR RESERVAS A LA NUBE (preview animado) ═══════════ */}
      {createPortal(
      <AnimatePresence>
        {uploadModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setUploadModal(false)}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4"
            data-testid="upload-cloud-modal">
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 240, damping: 22 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

              {/* Header animado con gradiente */}
              <div className="relative overflow-hidden px-6 pt-6 pb-8 text-white"
                style={{ background: "linear-gradient(130deg,#0ea5e9 0%,#6366f1 50%,#8b5cf6 100%)" }}>
                {/* Orbes animados */}
                <motion.div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-white/10 blur-2xl"
                  animate={{ scale: [1, 1.25, 1], rotate: [0, 45, 0] }}
                  transition={{ duration: 6, repeat: Infinity }} />
                <motion.div className="absolute -left-10 bottom-0 w-40 h-40 rounded-full bg-white/10 blur-2xl"
                  animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 5, repeat: Infinity, delay: 0.5 }} />

                {/* Partículas subiendo */}
                {[...Array(6)].map((_, i) => (
                  <motion.div key={i}
                    className="absolute w-1.5 h-1.5 rounded-full bg-white/60"
                    style={{ left: `${15 + i * 13}%`, bottom: 10 }}
                    animate={{ y: [-4, -110], opacity: [0, 1, 0] }}
                    transition={{ duration: 2.6 + (i % 3) * 0.4, repeat: Infinity, delay: i * 0.35, ease: "easeOut" }}
                  />
                ))}

                <div className="relative flex items-center gap-4">
                  <motion.div
                    animate={{ y: [0, -6, 0], rotate: [0, -6, 6, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
                    <CloudUpload size={28} className="text-white" strokeWidth={2} />
                  </motion.div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Vista previa</p>
                    <p className="text-2xl font-black leading-tight" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                      Sube tus reservas a la nube
                    </p>
                    <p className="text-[11px] text-white/80 mt-0.5">
                      {uploadPreview?.is_cloud
                        ? "Ya estás en la nube. Se sincronizará y optimizará todo."
                        : "Esto es lo que se subirá y quedará respaldado en la nube."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Cuerpo */}
              <div className="p-6 space-y-4 overflow-y-auto">
                {uploadPreviewLoading ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                      className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg,#0ea5e9,#8b5cf6)" }}>
                      <Database size={22} className="text-white" />
                    </motion.div>
                    <p className="text-sm font-bold text-slate-500">Analizando tus datos…</p>
                  </div>
                ) : uploadPreview ? (
                  <>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Se subirá lo siguiente</p>

                    <motion.div initial="hidden" animate="show"
                      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
                      className="grid grid-cols-2 gap-3">
                      {[
                        { key: "reservations", label: "Reservas",       icon: FileText,      color: "from-sky-500 to-indigo-500",     bg: "bg-sky-50",     text: "text-sky-700" },
                        { key: "socios",       label: "Contactos",       icon: UserCheck,     color: "from-emerald-500 to-teal-500",   bg: "bg-emerald-50", text: "text-emerald-700" },
                        { key: "settings",     label: "Configuración",   icon: ShieldCheck,   color: "from-violet-500 to-fuchsia-500", bg: "bg-violet-50",  text: "text-violet-700" },
                        { key: "themes",       label: "Diseños / temas", icon: Sparkles,      color: "from-amber-500 to-orange-500",   bg: "bg-amber-50",   text: "text-amber-700" },
                      ].map(({ key, label, icon: Icon, color, bg, text }) => {
                        const value = Number(uploadPreview?.[key] || 0);
                        return (
                          <motion.div key={key}
                            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                            whileHover={{ y: -2 }}
                            className={`relative overflow-hidden rounded-2xl p-4 ${bg}`}>
                            <div className={`absolute -right-3 -top-3 w-16 h-16 rounded-full bg-gradient-to-br ${color} opacity-20 blur-xl`} />
                            <div className="relative flex items-start justify-between">
                              <div>
                                <p className={`text-[10px] font-black uppercase tracking-wider opacity-70 ${text}`}>{label}</p>
                                <motion.p className={`text-2xl font-black ${text}`}
                                  style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
                                  initial={{ scale: 0.6, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ type: "spring", stiffness: 260, damping: 18 }}>
                                  {value.toLocaleString()}
                                </motion.p>
                              </div>
                              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow`}>
                                <Icon size={15} className="text-white" />
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </motion.div>

                    {/* Total resumen */}
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 }}
                      className="flex items-center justify-between rounded-2xl p-4 border border-indigo-100"
                      style={{ background: "linear-gradient(120deg, rgba(224,242,254,0.6), rgba(237,233,254,0.6))" }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center">
                          <Package size={16} className="text-indigo-600" />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total a subir</p>
                          <p className="text-lg font-black text-slate-800" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                            {Number(uploadPreview.total || 0).toLocaleString()} registros
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tamaño</p>
                        <p className="text-lg font-black text-slate-800" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                          {uploadPreview.size || "—"}
                        </p>
                      </div>
                    </motion.div>

                    {/* Info destino */}
                    <div className="flex items-start gap-3 rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
                      {uploadPreview.is_cloud
                        ? <Cloud size={14} className="text-sky-500 mt-0.5 shrink-0" />
                        : <CloudUpload size={14} className="text-indigo-500 mt-0.5 shrink-0" />}
                      <div>
                        <p className="text-xs font-black text-slate-800">
                          {uploadPreview.is_cloud ? "Modo: sincronización en la nube" : "Destino: tu base de datos en la nube"}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {uploadPreview.is_cloud
                            ? "Ya estás conectado a la nube. Al confirmar se optimizará y reindexará todo."
                            : (presets.some(p => p.url?.startsWith("mongodb+srv"))
                                ? "Se subirán tus reservas locales a la nube configurada y se fusionarán con las existentes."
                                : "No hay nube configurada. Se optimizará la base local. Configura una nube abajo para respaldo remoto.")}
                        </p>
                      </div>
                    </div>

                    {/* Desglose colapsable por colección exacta */}
                    {uploadPreview.collections && Object.keys(uploadPreview.collections).length > 0 && (
                      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                        <button
                          data-testid="upload-cloud-breakdown-toggle"
                          onClick={() => setUploadBreakdownOpen((v) => !v)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                              <ListChecks size={14} className="text-slate-500" />
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-black text-slate-800">Ver desglose por colección</p>
                              <p className="text-[10px] text-slate-400">
                                {Object.keys(uploadPreview.collections).length} colecciones · {Number(uploadPreview.total || 0).toLocaleString()} documentos
                              </p>
                            </div>
                          </div>
                          <BlockChevron open={uploadBreakdownOpen} />
                        </button>
                        <AnimatePresence initial={false}>
                          {uploadBreakdownOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                              className="overflow-hidden border-t border-slate-100">
                              <div className="p-3 space-y-1.5 max-h-56 overflow-y-auto">
                                {Object.entries(uploadPreview.collections)
                                  .sort((a, b) => (b[1] || 0) - (a[1] || 0))
                                  .map(([name, count], idx) => {
                                    const total = Number(uploadPreview.total || 0) || 1;
                                    const pct = Math.min(100, Math.max(2, (Number(count || 0) / total) * 100));
                                    const label = ({
                                      reservations: "Reservas",
                                      socios: "Contactos",
                                      app_settings: "Configuración",
                                      appearance_settings: "Apariencia",
                                      saved_themes: "Temas guardados",
                                      updates_history: "Historial de versiones",
                                    }[name]) || name;
                                    return (
                                      <motion.div key={name}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: idx * 0.03 }}
                                        data-testid={`breakdown-row-${name}`}
                                        className="relative rounded-xl bg-slate-50 px-3 py-2 overflow-hidden">
                                        <motion.div
                                          className="absolute inset-y-0 left-0"
                                          initial={{ width: 0 }}
                                          animate={{ width: `${pct}%` }}
                                          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                                          style={{ background: "linear-gradient(90deg, rgba(14,165,233,0.12), rgba(139,92,246,0.12))" }}
                                        />
                                        <div className="relative flex items-center justify-between gap-3">
                                          <div className="min-w-0">
                                            <p className="text-[11px] font-black text-slate-800 truncate">{label}</p>
                                            <p className="text-[9px] font-mono text-slate-400 truncate">{name}</p>
                                          </div>
                                          <p className="text-sm font-black text-slate-700 shrink-0"
                                            style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                                            {Number(count || 0).toLocaleString()}
                                          </p>
                                        </div>
                                      </motion.div>
                                    );
                                  })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-6">No hay datos para mostrar.</p>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-3 justify-end bg-slate-50/50">
                <button
                  data-testid="upload-cloud-cancel"
                  onClick={() => setUploadModal(false)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-black text-slate-600 hover:bg-white transition-colors">
                  Cancelar
                </button>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  disabled={uploadPreviewLoading || optimizing}
                  onClick={confirmUploadToCloud}
                  data-testid="upload-cloud-confirm"
                  className="relative overflow-hidden px-5 py-2.5 rounded-2xl text-xs font-black text-white shadow-md disabled:opacity-60 flex items-center gap-2"
                  style={{ background: "linear-gradient(120deg,#0ea5e9,#6366f1,#8b5cf6)" }}>
                  <motion.span
                    className="absolute inset-0 pointer-events-none"
                    initial={{ x: "-120%" }} animate={{ x: "120%" }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)" }} />
                  <CloudUpload size={14} />
                  {optimizing ? "Subiendo…" : "Subir a la nube"}
                </motion.button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}

      {/* ── Popup: haciendo copia de seguridad completa ── */}
      {createPortal(
      <AnimatePresence>
        {restorePreview.open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            data-testid="restore-preview-modal"
            className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
            onClick={cancelRestorePreview}>
            <motion.div
              initial={{ scale: 0.92, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl bg-white rounded-[28px] shadow-2xl overflow-hidden border border-slate-200">
              {/* Franja top */}
              <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" />
              <div className="p-6">
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center shrink-0">
                    <GitCompare size={20} className="text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-1">Vista previa · antes de restaurar</div>
                    <h3 className="text-[22px] font-black text-slate-900 leading-tight tracking-tight" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                      Diferencias contra tus datos actuales
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono mt-1 truncate">
                      {restorePreview.file?.name}{restorePreview.data?.size ? ` · ${restorePreview.data.size}` : ""}
                    </p>
                  </div>
                  <button onClick={cancelRestorePreview} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors">
                    <XCircle size={16} />
                  </button>
                </div>

                {restorePreview.loading && (
                  <div className="py-10 flex flex-col items-center gap-3 text-slate-400">
                    <Loader2 size={22} className="animate-spin" />
                    <p className="text-xs font-semibold">
                      {restoreLoading ? "Restaurando datos…" : "Analizando respaldo…"}
                    </p>
                  </div>
                )}

                {!restorePreview.loading && restorePreview.error && (
                  <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 font-semibold">
                    {restorePreview.error}
                  </div>
                )}

                {!restorePreview.loading && restorePreview.data && (
                  <>
                    {/* Totales */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <div className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">Actualmente en BD</div>
                        <div className="text-[28px] font-black text-slate-900 leading-none mt-1.5" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                          {restorePreview.data.total_current_docs.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400 font-semibold mt-1">documentos totales</div>
                      </div>
                      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4">
                        <div className="text-[9px] font-black uppercase tracking-[0.25em] text-indigo-500">Se restaurará</div>
                        <div className="text-[28px] font-black text-indigo-700 leading-none mt-1.5" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                          {restorePreview.data.total_backup_docs.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-indigo-500 font-semibold mt-1">
                          en {restorePreview.data.collections_count} colecciones
                        </div>
                      </div>
                    </div>

                    {/* Aviso */}
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 mb-4 flex items-start gap-3">
                      <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[12px] font-black text-amber-800" style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                          Los datos actuales serán reemplazados
                        </p>
                        <p className="text-[10px] text-amber-700 mt-0.5">
                          Se creará un respaldo automático antes de restaurar. Puedes revertir si es necesario.
                        </p>
                      </div>
                    </div>

                    {/* Tabla de diff */}
                    <div className="rounded-2xl border border-slate-200 overflow-hidden max-h-64 overflow-y-auto">
                      <div className="sticky top-0 grid grid-cols-12 gap-2 bg-slate-50 border-b border-slate-200 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                        <div className="col-span-5">Colección</div>
                        <div className="col-span-2 text-right">Actual</div>
                        <div className="col-span-2 text-right">Respaldo</div>
                        <div className="col-span-3 text-right">Cambio</div>
                      </div>
                      {restorePreview.data.diff.length === 0 && (
                        <div className="px-4 py-6 text-center text-xs text-slate-400">El respaldo no contiene colecciones.</div>
                      )}
                      {restorePreview.data.diff.map((d) => {
                        const positive = d.delta > 0;
                        const negative = d.delta < 0;
                        return (
                          <div key={d.collection} className="grid grid-cols-12 gap-2 px-4 py-2.5 border-b border-slate-100 last:border-b-0 text-[12px] items-center hover:bg-slate-50/50">
                            <div className="col-span-5 min-w-0">
                              <div className="font-mono text-slate-700 truncate">{d.collection}</div>
                              {d.warning === "no_en_respaldo" && (
                                <div className="text-[9px] text-red-500 font-black uppercase tracking-wider">Se borrará · no está en respaldo</div>
                              )}
                            </div>
                            <div className="col-span-2 text-right font-mono text-slate-500">{d.current_count.toLocaleString()}</div>
                            <div className="col-span-2 text-right font-mono font-black text-slate-800">{d.backup_count.toLocaleString()}</div>
                            <div className="col-span-3 text-right">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${positive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : negative ? "bg-red-50 text-red-700 border border-red-200" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                                {positive ? <FilePlus2 size={10} /> : negative ? <FileMinus2 size={10} /> : <FilePenLine size={10} />}
                                {d.delta > 0 ? `+${d.delta}` : d.delta}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Footer acciones */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
                <button
                  onClick={cancelRestorePreview}
                  data-testid="restore-preview-cancel"
                  disabled={restoreLoading}
                  className="px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider text-slate-600 hover:bg-white border border-slate-200 transition-all disabled:opacity-60">
                  Cancelar
                </button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={confirmRestoreFromPreview}
                  disabled={restoreLoading || !restorePreview.data || !!restorePreview.error}
                  data-testid="restore-preview-confirm"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 shadow-[0_10px_20px_-8px_rgba(15,23,42,0.5)] transition-all disabled:opacity-60">
                  {restoreLoading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                  {restoreLoading ? "Restaurando…" : "Confirmar restauración"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}

      {/* ── Popup: haciendo copia de seguridad completa ── */}
      {createPortal(
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
      </AnimatePresence>,
      document.body
      )}

      {/* ═══════════ MODAL: SELECCIÓN de archivos a subir (mejorado) ═══════════ */}
      {createPortal(
      <AnimatePresence>
        {ghSelectModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setGhSelectModalOpen(false)}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 22 }}
              data-testid="github-select-modal"
              className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            >
              {/* Header con gradiente + versiones */}
              <div className="px-6 pt-6 pb-5 text-white relative overflow-hidden"
                style={{ background: "linear-gradient(135deg,#0ea5e9 0%,#6366f1 100%)" }}>
                {/* Decoración animada */}
                <motion.div
                  className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-white/10 blur-2xl"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 4, repeat: Infinity }}
                />
                <div className="relative">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center">
                      <ListChecks size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-black">Elegir qué subir al repositorio</p>
                      <p className="text-xs text-white/80 mt-0.5">Se comparará con la versión actual en GitHub</p>
                    </div>
                  </div>

                  {/* Comparación de versiones dinámica */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                    className="mt-4 grid grid-cols-3 gap-2 items-stretch"
                    data-testid="github-select-version-compare"
                  >
                    <div className="flex flex-col justify-center bg-white/10 border border-white/15 rounded-xl p-2.5 text-center backdrop-blur-sm min-h-[54px]">
                      <p className="text-[9px] font-black uppercase tracking-wider text-white/70 mb-0.5">Local</p>
                      <p className="text-sm font-black font-mono truncate">
                        {ghPushVersionLoading ? "…" : `v${ghPushVersionInfo?.current_local || "?"}`}
                      </p>
                    </div>
                    <div className="flex flex-col justify-center bg-white/10 border border-white/15 rounded-xl p-2.5 text-center backdrop-blur-sm min-h-[54px]">
                      <p className="text-[9px] font-black uppercase tracking-wider text-white/70 mb-0.5">GitHub</p>
                      <p className="text-sm font-black font-mono truncate">
                        {ghPushVersionLoading ? "…" : `v${ghPushVersionInfo?.current_remote || "?"}`}
                      </p>
                    </div>
                    <div className="flex flex-col justify-center bg-emerald-400/25 border border-emerald-300/50 rounded-xl p-2.5 text-center backdrop-blur-sm min-h-[54px]">
                      <p className="text-[9px] font-black uppercase tracking-wider text-white mb-0.5">Próxima</p>
                      <p className="text-sm font-black font-mono text-white truncate">
                        {ghPushVersionLoading ? "…" : `v${ghPushVersionInfo?.next_auto_version || "?"}`}
                      </p>
                    </div>
                  </motion.div>

                  {/* Alerta si local está desactualizada respecto a remote */}
                  {!ghPushVersionLoading && ghPushVersionInfo?.current_local && ghPushVersionInfo?.current_remote
                    && ghPushVersionInfo.current_local !== ghPushVersionInfo.current_remote && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                        className="mt-2.5 flex items-center gap-2 bg-amber-400/20 border border-amber-300/40 rounded-lg px-2.5 py-1.5"
                        data-testid="github-select-version-mismatch"
                      >
                        <AlertCircle size={11} className="text-amber-200 shrink-0" />
                        <p className="text-[10px] text-amber-100 font-semibold leading-tight">
                          Tu versión local es distinta a la del repo. Al publicar se subirá a <b className="font-mono">v{ghPushVersionInfo.next_auto_version}</b>.
                        </p>
                      </motion.div>
                  )}
                </div>
              </div>

              {/* Toolbar: contadores + acciones rápidas */}
              {!ghPreviewLoading && ghPreview?.categories && (() => {
                const selectedCats = ghPreview.categories.filter(c => ghInclude[c.id]);
                const totalFiles = selectedCats.reduce((a, c) => a + (c.files || 0), 0);
                const totalBytes = selectedCats.reduce((a, c) => a + (c.size_bytes || 0), 0);
                const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
                const hasSlow = selectedCats.some(c => c.slow);
                return (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="px-6 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3 flex-wrap"
                    data-testid="github-select-toolbar"
                  >
                    <div className="flex items-center gap-4 text-[11px]">
                      <motion.div
                        key={selectedCats.length}
                        initial={{ scale: 0.85, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        className="flex items-center gap-1.5 text-slate-700 font-bold"
                      >
                        <CheckCircle size={12} className="text-indigo-500" />
                        <span data-testid="gh-select-count-cats">{selectedCats.length}</span>
                        <span className="text-slate-400 font-normal">/ {ghPreview.categories.length} categorías</span>
                      </motion.div>
                      <motion.div
                        key={totalFiles}
                        initial={{ scale: 0.85, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        className="flex items-center gap-1.5 text-slate-700 font-bold"
                      >
                        <FileText size={12} className="text-indigo-500" />
                        <span data-testid="gh-select-count-files">{totalFiles.toLocaleString()}</span>
                        <span className="text-slate-400 font-normal">archivos</span>
                      </motion.div>
                      <motion.div
                        key={totalMB}
                        initial={{ scale: 0.85, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        className="flex items-center gap-1.5 text-slate-700 font-bold"
                      >
                        <HardDrive size={12} className="text-indigo-500" />
                        <span data-testid="gh-select-count-size">{totalMB}</span>
                        <span className="text-slate-400 font-normal">MB</span>
                      </motion.div>
                      {hasSlow && (
                        <motion.div
                          initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-1 text-amber-700 font-bold"
                        >
                          <Timer size={11} />
                          <span>+1–2 min</span>
                        </motion.div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          if (!ghDiff?.by_category) { loadGhDiff(false, ghPreview.categories); return; }
                          const sel = {};
                          ghPreview.categories.forEach(c => {
                            const bc = ghDiff.by_category[c.id];
                            sel[c.id] = !!(bc && bc.total > 0);
                          });
                          setGhInclude(sel);
                        }}
                        disabled={ghDiffLoading}
                        title="Selecciona automáticamente solo las categorías con cambios reales"
                        data-testid="gh-select-changed-btn"
                        className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-1 disabled:opacity-50"
                      >
                        {ghDiffLoading ? <Loader2 size={10} className="animate-spin" /> : <GitCompare size={10} />}
                        Con cambios
                      </button>
                      <button
                        onClick={() => {
                          const all = {};
                          ghPreview.categories.forEach(c => { all[c.id] = true; });
                          setGhInclude(all);
                        }}
                        data-testid="gh-select-all-btn"
                        className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
                      >
                        Todo
                      </button>
                      <button
                        onClick={() => {
                          const def = {};
                          ghPreview.categories.forEach(c => { def[c.id] = !!c.default; });
                          setGhInclude(def);
                        }}
                        data-testid="gh-select-essential-btn"
                        className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
                      >
                        Esencial
                      </button>
                      <button
                        onClick={() => {
                          const none = {};
                          ghPreview.categories.forEach(c => { none[c.id] = false; });
                          setGhInclude(none);
                        }}
                        data-testid="gh-select-none-btn"
                        className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
                      >
                        Ninguno
                      </button>
                    </div>
                  </motion.div>
                );
              })()}

              {/* Lista de categorías con animaciones */}
              <div className="p-5 space-y-2 overflow-y-auto flex-1">
                {ghPreviewLoading && (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <Loader2 className="animate-spin text-indigo-400" size={26} />
                    <span className="text-sm text-slate-500 font-semibold">Analizando cambios locales…</span>
                    <span className="text-[10px] text-slate-400">Comparando con el repositorio remoto</span>
                  </div>
                )}

                {!ghPreviewLoading && (
                  <motion.div
                    initial="hidden" animate="show"
                    variants={{ show: { transition: { staggerChildren: 0.05 } } }}
                    className="space-y-2"
                  >
                    {ghPreview?.categories?.map((c) => {
                      const checked = !!ghInclude[c.id];
                      const kb = c.size_bytes ? (c.size_bytes / 1024).toFixed(0) : 0;
                      const mb = c.size_bytes ? (c.size_bytes / (1024 * 1024)).toFixed(1) : 0;
                      const sizeLabel = c.size_bytes >= 1024 * 1024 ? `${mb} MB` : c.size_bytes ? `${kb} KB` : "";
                      const iconMap = {
                        backend:        { icon: <Server size={16} />,        color: "text-sky-600",     bg: "bg-sky-100" },
                        frontend_src:   { icon: <MonitorSpeaker size={16} />,color: "text-violet-600",  bg: "bg-violet-100" },
                        root_files:     { icon: <FolderOpen size={16} />,    color: "text-amber-600",   bg: "bg-amber-100" },
                        standalone_app: { icon: <Package size={16} />,       color: "text-emerald-600", bg: "bg-emerald-100" },
                        version_txt:    { icon: <FileText size={16} />,      color: "text-pink-600",    bg: "bg-pink-100" },
                        build_frontend: { icon: <Zap size={16} />,           color: "text-orange-600",  bg: "bg-orange-100" },
                      };
                      const style = iconMap[c.id] || { icon: <Folder size={16} />, color: "text-slate-600", bg: "bg-slate-100" };
                      return (
                        <motion.label
                          key={c.id}
                          data-testid={`github-select-cat-${c.id}`}
                          variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.995 }}
                          className={`relative flex items-center gap-3 p-3 rounded-2xl border-2 cursor-pointer transition-colors overflow-hidden ${
                            checked
                              ? (c.slow ? "border-amber-300 bg-amber-50" : "border-indigo-300 bg-indigo-50")
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          }`}
                        >
                          {/* Efecto de brillo al marcar */}
                          <AnimatePresence>
                            {checked && (
                              <motion.div
                                initial={{ opacity: 0, x: -100 }}
                                animate={{ opacity: [0, 0.4, 0], x: 400 }}
                                transition={{ duration: 0.7 }}
                                className="absolute inset-y-0 w-24 bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none"
                              />
                            )}
                          </AnimatePresence>

                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => setGhInclude(prev => ({ ...prev, [c.id]: e.target.checked }))}
                            className="w-5 h-5 accent-indigo-600 cursor-pointer flex-shrink-0"
                          />
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${style.bg} ${style.color}`}>
                            {style.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-black text-slate-900">{c.label}</p>
                              {c.slow && (
                                <motion.span
                                  animate={{ scale: [1, 1.05, 1] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900"
                                >
                                  <Timer size={10} /> Lento (1–2 min)
                                </motion.span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5 leading-snug">{c.description}</p>
                            {(c.files > 0 || sizeLabel) && (
                              <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-slate-500">
                                {c.files > 0 && (
                                  <span className="flex items-center gap-1">
                                    <FileText size={9} />
                                    {c.files.toLocaleString()} archivo{c.files === 1 ? "" : "s"}
                                  </span>
                                )}
                                {sizeLabel && (
                                  <span className="flex items-center gap-1">
                                    <HardDrive size={9} />
                                    {sizeLabel}
                                  </span>
                                )}
                              </div>
                            )}
                            {/* Badges de cambios REALES de esta categoría (si ya se comparó) */}
                            {ghDiff?.by_category && (() => {
                              const bc = ghDiff.by_category[c.id];
                              if (!bc || bc.total === 0) {
                                return (
                                  <div className="mt-1.5 text-[10px] font-bold text-slate-400" data-testid={`gh-diff-cat-none-${c.id}`}>
                                    Sin cambios
                                  </div>
                                );
                              }
                              return (
                                <div className="flex items-center gap-1.5 mt-1.5" data-testid={`gh-diff-cat-badges-${c.id}`}>
                                  {bc.added > 0 && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                                      <FilePlus2 size={9} /> {bc.added}
                                    </span>
                                  )}
                                  {bc.modified > 0 && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700">
                                      <FilePenLine size={9} /> {bc.modified}
                                    </span>
                                  )}
                                  {bc.deleted > 0 && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700">
                                      <FileMinus2 size={9} /> {bc.deleted}
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                          <div className="shrink-0 self-center">
                            {checked ? (
                              <motion.div
                                initial={{ scale: 0, rotate: -90 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                                className={`w-6 h-6 rounded-full flex items-center justify-center ${c.slow ? "bg-amber-500" : "bg-indigo-500"}`}
                              >
                                <CheckCircle size={14} className="text-white" />
                              </motion.div>
                            ) : (
                              <div className="w-6 h-6 rounded-full border-2 border-slate-200" />
                            )}
                          </div>
                        </motion.label>
                      );
                    })}
                  </motion.div>
                )}

                {/* ── Ver cambios detallados: diff REAL contra el repo remoto ── */}
                {!ghPreviewLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    className="mt-3 rounded-2xl border border-slate-200 overflow-hidden"
                    data-testid="github-diff-section"
                  >
                    <button
                      type="button"
                      onClick={() => (ghDiff || ghDiffError ? setGhDiffOpen(o => !o) : loadGhDiff(false))}
                      disabled={ghDiffLoading}
                      data-testid="github-diff-toggle-btn"
                      className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors disabled:opacity-60"
                    >
                      <span className="flex items-center gap-2 text-sm font-black text-slate-800">
                        <GitCompare size={16} className="text-indigo-600" />
                        Ver cambios reales vs GitHub
                        {ghDiff && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                            {ghDiff.changed} {ghDiff.changed === 1 ? "cambio" : "cambios"}
                          </span>
                        )}
                      </span>
                      {ghDiffLoading
                        ? <Loader2 size={16} className="animate-spin text-indigo-500" />
                        : <ChevronDown size={16} className={`text-slate-400 transition-transform ${ghDiffOpen ? "rotate-180" : ""}`} />}
                    </button>

                    <AnimatePresence>
                      {ghDiffOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 py-3 bg-white border-t border-slate-100">
                            {ghDiffLoading && (
                              <div className="flex flex-col items-center justify-center py-6 gap-2" data-testid="github-diff-loading">
                                <Loader2 className="animate-spin text-indigo-400" size={22} />
                                <span className="text-xs text-slate-500 font-semibold">Comparando tu código con el repositorio…</span>
                                <span className="text-[10px] text-slate-400">Clonando la versión actual de GitHub</span>
                              </div>
                            )}

                            {!ghDiffLoading && ghDiffError && (
                              <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-100" data-testid="github-diff-error">
                                <AlertCircle size={14} className="text-rose-600 mt-0.5 shrink-0" />
                                <div className="flex-1">
                                  <p className="text-[11px] text-rose-800 leading-snug">{ghDiffError}</p>
                                  <button onClick={() => loadGhDiff(true)} className="mt-1.5 text-[11px] font-bold text-rose-700 underline">Reintentar</button>
                                </div>
                              </div>
                            )}

                            {!ghDiffLoading && !ghDiffError && ghDiff && (
                              <div data-testid="github-diff-result">
                                {/* Resumen global */}
                                <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700">
                                      <FilePlus2 size={11} /> {ghDiff.summary.added} nuevos
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-lg bg-amber-100 text-amber-700">
                                      <FilePenLine size={11} /> {ghDiff.summary.modified} modificados
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-1 rounded-lg bg-rose-100 text-rose-700">
                                      <FileMinus2 size={11} /> {ghDiff.summary.deleted} eliminados
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => loadGhDiff(true)}
                                    data-testid="github-diff-refresh-btn"
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-indigo-600 transition-colors"
                                  >
                                    <RefreshCw size={11} /> Actualizar
                                  </button>
                                </div>

                                {ghDiff.changed === 0 ? (
                                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100" data-testid="github-diff-clean">
                                    <CheckCircle size={15} className="text-emerald-600 shrink-0" />
                                    <p className="text-[11px] text-emerald-800 font-semibold">Tu código local es idéntico al repositorio. No hay nada nuevo que subir.</p>
                                  </div>
                                ) : (
                                  <>
                                    {/* Filtro por categoría */}
                                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                                      {["all", ...Object.keys(ghDiff.by_category)].map((cid) => {
                                        const label = cid === "all"
                                          ? `Todos (${ghDiff.changed})`
                                          : `${(ghPreview?.categories?.find(x => x.id === cid)?.label) || cid} (${ghDiff.by_category[cid]?.total || 0})`;
                                        const active = ghDiffCat === cid;
                                        return (
                                          <button
                                            key={cid}
                                            onClick={() => setGhDiffCat(cid)}
                                            data-testid={`github-diff-filter-${cid}`}
                                            className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-colors ${active ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}
                                          >
                                            {label}
                                          </button>
                                        );
                                      })}
                                    </div>

                                    {/* Lista de archivos */}
                                    <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-50" data-testid="github-diff-file-list">
                                      {ghDiff.files
                                        .filter(f => ghDiffCat === "all" || f.category === ghDiffCat)
                                        .map((f, i) => {
                                          const st = {
                                            A: { icon: <FilePlus2 size={12} />, color: "text-emerald-600", bg: "bg-emerald-50", tag: "Nuevo" },
                                            M: { icon: <FilePenLine size={12} />, color: "text-amber-600", bg: "bg-amber-50", tag: "Modificado" },
                                            D: { icon: <FileMinus2 size={12} />, color: "text-rose-600", bg: "bg-rose-50", tag: "Eliminado" },
                                          }[f.status] || { icon: <FileText size={12} />, color: "text-slate-500", bg: "bg-slate-50", tag: "" };
                                          const kb = f.size_bytes ? (f.size_bytes / 1024).toFixed(0) : 0;
                                          return (
                                            <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-50" data-testid="github-diff-file-row">
                                              <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${st.bg} ${st.color}`}>{st.icon}</span>
                                              <span className="flex-1 min-w-0 text-[11px] font-mono text-slate-700 truncate" title={f.path}>{f.path}</span>
                                              {f.status !== "D" && f.size_bytes > 0 && (
                                                <span className="text-[9px] font-mono text-slate-400 shrink-0">{kb} KB</span>
                                              )}
                                              <span className={`text-[9px] font-black ${st.color} shrink-0`}>{st.tag}</span>
                                            </div>
                                          );
                                        })}
                                    </div>
                                    {ghDiff.truncated && (
                                      <p className="mt-1.5 text-[10px] text-slate-400 text-center">Mostrando los primeros archivos · hay más cambios de los que caben aquí.</p>
                                    )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {!ghPreviewLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                    className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100"
                  >
                    <Info size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-blue-900 leading-snug">
                      <strong>Tip:</strong> GitHub Actions compila el <code className="px-1 py-0.5 rounded bg-blue-100">.exe</code> automáticamente
                      cuando se crea el tag. Por eso <em>Compilar frontend</em> viene desmarcado — el push es mucho más rápido.
                    </p>
                  </motion.div>
                )}
              </div>

              {/* Footer con botones */}
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                <button
                  onClick={() => setGhSelectModalOpen(false)}
                  data-testid="github-select-cancel-btn"
                  className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  onClick={handleConfirmSelection}
                  disabled={ghPreviewLoading || !Object.values(ghInclude).some(Boolean)}
                  data-testid="github-select-continue-btn"
                  className="px-5 py-2.5 rounded-xl text-sm font-black text-white flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
                  style={{ background: "linear-gradient(135deg,#0ea5e9,#6366f1)" }}
                >
                  Continuar <ArrowRight size={14} />
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}

      {/* ═══════════ MODAL: Publicar (versión + mensaje) ═══════════ */}
      {createPortal(
      <AnimatePresence>
        {ghPushModalOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setGhPushModalOpen(false)}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 22 }}
              data-testid="github-push-modal"
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 pt-6 pb-5 text-white"
                style={{ background: "linear-gradient(135deg,#059669 0%,#0d9488 100%)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-white/15 flex items-center justify-center">
                    <Upload size={20} />
                  </div>
                  <div>
                    <p className="text-base font-black">Publicar en GitHub</p>
                    <p className="text-xs text-white/70 mt-0.5">Dale un número o nombre a esta versión</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Tarjeta: Versión actual + próxima automática */}
                <div
                  data-testid="github-push-version-info"
                  className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/60 p-3.5"
                >
                  {ghPushVersionLoading ? (
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <Loader2 size={12} className="animate-spin" />
                      <span>Consultando versión actual…</span>
                    </div>
                  ) : ghPushVersionInfo ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                          Versión actual
                        </p>
                        <p
                          data-testid="github-push-current-version"
                          className="text-lg font-black text-slate-800 mt-0.5"
                        >
                          v{ghPushVersionInfo.current_remote || ghPushVersionInfo.current_local || "—"}
                        </p>
                        {ghPushVersionInfo.current_local
                          && ghPushVersionInfo.current_remote
                          && ghPushVersionInfo.current_local !== ghPushVersionInfo.current_remote && (
                          <p className="text-[9.5px] text-slate-400 mt-0.5">
                            local v{ghPushVersionInfo.current_local}
                          </p>
                        )}
                      </div>
                      <div className="border-l border-emerald-200/70 pl-3">
                        <p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                          Próxima automática
                        </p>
                        <p
                          data-testid="github-push-next-version"
                          className="text-lg font-black text-emerald-700 mt-0.5"
                        >
                          v{ghPushVersionInfo.next_auto_version || "—"}
                        </p>
                        <p className="text-[9.5px] text-slate-400 mt-0.5">
                          si dejas el campo vacío
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      No se pudo consultar la versión (revisa la conexión con GitHub).
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-600 flex items-center gap-1.5">
                    <Package size={12} /> Número o nombre de versión
                    <span className="font-normal text-slate-400">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={ghPushVersion}
                    onChange={(e) => setGhPushVersion(e.target.value)}
                    placeholder={
                      ghPushVersionInfo?.next_auto_version
                        ? `ej. 2.0 o Navidad — vacío = v${ghPushVersionInfo.next_auto_version}`
                        : "ej. 1.1, 2.0 o Navidad — vacío = automático"
                    }
                    data-testid="github-push-version-input"
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                  />
                  <p className="text-[10px] text-slate-400">
                    Se publicará como{" "}
                    <b
                      data-testid="github-push-version-preview"
                      className="text-emerald-600"
                    >
                      v{
                        ghPushVersion.trim().replace(/^v/i, "")
                        || ghPushVersionInfo?.next_auto_version
                        || "1.N"
                      }
                    </b>
                    . Si lo dejas vacío, se numera automáticamente.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-600 flex items-center gap-1.5">
                    <GitCommit size={12} /> Mensaje del cambio
                  </label>
                  <textarea
                    value={ghPushCommitMsg}
                    onChange={(e) => setGhPushCommitMsg(e.target.value)}
                    rows={3}
                    data-testid="github-push-message-input"
                    className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setGhPushModalOpen(false)}
                    data-testid="github-push-cancel-btn"
                    className="flex-1 py-3 rounded-2xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                    onClick={runPushToGithub}
                    data-testid="github-push-confirm-btn"
                    className="flex-[1.4] flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-black text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg transition-all"
                  >
                    <Upload size={15} /> Publicar
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
      )}

      {/* ═══════════ MODAL: Conectar con GitHub ═══════════ */}
      {createPortal(
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
      </AnimatePresence>,
      document.body
      )}

      {/* ── Modal de contraseña — Soporte avanzado ── */}
      <Dialog open={pwdModalOpen} onOpenChange={(o) => {
        setPwdModalOpen(o);
        if (!o) { setPwdInput(""); setPwdError(""); setPwdShow(false); }
      }}>
        <DialogContent className="sm:max-w-md" data-testid="soporte-pwd-modal">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-11 h-11 rounded-2xl bg-slate-900 flex items-center justify-center">
                <Lock size={20} className="text-white" />
              </div>
              <div>
                <DialogTitle style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}>
                  Soporte avanzado
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Sección protegida. Introduce la contraseña para continuar.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handlePwdSubmit} className="space-y-3 pt-2">
            <div>
              <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1 mb-1">
                <Key size={11} /> Contraseña de soporte
              </label>
              <div className="relative">
                <Input
                  type={pwdShow ? "text" : "password"}
                  value={pwdInput}
                  onChange={(e) => { setPwdInput(e.target.value); if (pwdError) setPwdError(""); }}
                  placeholder="••••••"
                  autoFocus
                  data-testid="soporte-pwd-input"
                  className={`pr-10 ${pwdError ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setPwdShow((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  tabIndex={-1}
                >
                  {pwdShow ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {pwdError && (
                <p className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle size={11} /> {pwdError}
                </p>
              )}
              <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                <ShieldCheck size={10} /> Contraseña de fábrica — no se puede cambiar.
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPwdModalOpen(false)}
                data-testid="soporte-pwd-cancel"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-slate-900 hover:bg-slate-800 text-white"
                data-testid="soporte-pwd-submit"
              >
                Desbloquear
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
