import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Bookmark, Save, Trash2, Play, RotateCcw, Cloud, CloudOff, Loader2,
  CheckCircle2, RefreshCw, Star, Github, Database, HardDrive,
} from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { useToast } from "@/hooks/use-toast";
import {
  getSavedThemes, createSavedTheme, updateSavedTheme, deleteSavedTheme,
  setDefaultTheme, syncThemesNow, getThemesSyncStatus,
} from "@/lib/api";
import { Section } from "./SectionShell";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Confirmación in-app (reemplaza window.confirm — que puede estar bloqueado
 * en iframes de preview). Recibe una acción `pending` con {title, description,
 * confirmLabel, onConfirm, variant}.
 */
function ConfirmDialog({ pending, onCancel }) {
  const open = !!pending;
  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <AlertDialogContent data-testid="theme-confirm-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle data-testid="theme-confirm-title">{pending?.title}</AlertDialogTitle>
          <AlertDialogDescription data-testid="theme-confirm-description">
            {pending?.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-testid="theme-confirm-cancel">
            {pending?.cancelLabel || "Cancelar"}
          </AlertDialogCancel>
          <AlertDialogAction
            data-testid="theme-confirm-ok"
            onClick={() => pending?.onConfirm?.()}
            className={pending?.variant === "destructive"
              ? "bg-red-600 hover:bg-red-700 text-white"
              : ""}
          >
            {pending?.confirmLabel || "Aceptar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function SavedThemesSection() {
  const {
    language, getAppearanceSnapshot, applyAppearanceSnapshot,
    resetAppearanceToDefault, appearanceSync,
  } = useSettings();
  const { toast } = useToast();
  const es = language === "es";

  const [themes, setThemes] = useState([]);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(null);
  const [updating, setUpdating] = useState(null);
  const [settingDefault, setSettingDefault] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [pending, setPending] = useState(null); // Confirmation modal state

  const load = async () => {
    try { setThemes(await getSavedThemes()); } catch (_) { /* noop */ }
    try { setSyncStatus(await getThemesSyncStatus()); } catch (_) { /* noop */ }
  };
  useEffect(() => { load(); }, []);

  const closeConfirm = () => setPending(null);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: es ? "Escribe un nombre para el tema" : "Enter a theme name", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await createSavedTheme(name.trim(), getAppearanceSnapshot());
      toast({ title: es ? `Tema "${name.trim()}" guardado y sincronizado ✓` : `Theme "${name.trim()}" saved & synced ✓` });
      setName("");
      load();
    } catch {
      toast({ title: es ? "Error al guardar el tema" : "Error saving theme", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const doUpdate = async (t) => {
    closeConfirm();
    setUpdating(t.id);
    try {
      await updateSavedTheme(t.id, getAppearanceSnapshot());
      toast({ title: es ? `Tema "${t.name}" actualizado ✓` : `Theme "${t.name}" updated ✓` });
      load();
    } catch {
      toast({ title: es ? "Error al actualizar" : "Update error", variant: "destructive" });
    } finally { setUpdating(null); }
  };

  const doApply = async (t) => {
    closeConfirm();
    setApplying(t.id);
    try {
      await applyAppearanceSnapshot(t.snapshot);
    } catch {
      setApplying(null);
      toast({ title: es ? "Error al aplicar el tema" : "Error applying theme", variant: "destructive" });
    }
  };

  const doDelete = async (t) => {
    closeConfirm();
    try {
      await deleteSavedTheme(t.id);
      toast({ title: es ? "Tema eliminado" : "Theme deleted" });
      load();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const doReset = async () => {
    closeConfirm();
    try {
      await resetAppearanceToDefault();
    } catch {
      toast({ title: es ? "Error al restaurar" : "Reset error", variant: "destructive" });
    }
  };

  const askUpdate = (t) => setPending({
    title: es ? `Reguardar "${t.name}"` : `Overwrite "${t.name}"`,
    description: es
      ? `Se sobreescribirá el snapshot del tema con la apariencia actual. Los cambios se sincronizarán con MongoDB, el archivo local y GitHub.`
      : `The theme snapshot will be overwritten with the current appearance and synced to MongoDB, local file and GitHub.`,
    confirmLabel: es ? "Reguardar" : "Overwrite",
    onConfirm: () => doUpdate(t),
  });

  const askApply = (t) => setPending({
    title: es ? `Aplicar "${t.name}"` : `Apply "${t.name}"`,
    description: es
      ? `Se aplicará este tema a toda la app. La página se recargará para tomar los cambios.`
      : `This theme will be applied to the whole app. The page will reload.`,
    confirmLabel: es ? "Aplicar" : "Apply",
    onConfirm: () => doApply(t),
  });

  const askDelete = (t) => setPending({
    title: es ? `Eliminar "${t.name}"` : `Delete "${t.name}"`,
    description: es
      ? `Esta acción no se puede deshacer. También se actualizará el archivo local y GitHub.`
      : `This action cannot be undone. Local file and GitHub will be updated.`,
    confirmLabel: es ? "Eliminar" : "Delete",
    variant: "destructive",
    onConfirm: () => doDelete(t),
  });

  const askReset = () => setPending({
    title: es ? "¿Restaurar toda la apariencia?" : "Reset all appearance?",
    description: es
      ? `Se borrará toda la personalización y se volverá al diseño original. La página se recargará.`
      : `All customization will be cleared and the original design restored. Page will reload.`,
    confirmLabel: es ? "Restaurar" : "Reset",
    variant: "destructive",
    onConfirm: () => doReset(),
  });

  const handleSetDefault = async (t) => {
    setSettingDefault(t.id);
    try {
      await setDefaultTheme(t.id);
      toast({ title: es ? `"${t.name}" es ahora el tema por defecto ⭐` : `"${t.name}" is now the default theme ⭐` });
      load();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally { setSettingDefault(null); }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const r = await syncThemesNow();
      toast({
        title: es
          ? `Sincronización: local ✓ · GitHub ${r?.github?.ok ? "✓" : (r?.github?.skipped ? "omitido" : "error")}`
          : `Synced: local ✓ · GitHub ${r?.github?.ok ? "✓" : (r?.github?.skipped ? "skipped" : "error")}`,
        variant: r?.github?.ok || r?.github?.skipped ? "default" : "destructive",
      });
      load();
    } catch {
      toast({ title: es ? "Error al sincronizar" : "Sync error", variant: "destructive" });
    } finally { setSyncing(false); }
  };

  const syncBadge = () => {
    if (appearanceSync.status === "saving") return (
      <span className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
        <Loader2 size={10} className="animate-spin" /> {es ? "Sincronizando…" : "Syncing…"}
      </span>
    );
    if (appearanceSync.status === "error") return (
      <span className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
        <CloudOff size={10} /> {es ? "Sin conexión" : "Offline"}
      </span>
    );
    return (
      <span className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700" data-testid="appearance-sync-badge">
        <Cloud size={10} /> {es ? "Sincronizado con la nube" : "Cloud synced"}
      </span>
    );
  };

  const fmt = (iso) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString(es ? "es-GT" : "en-US", { dateStyle: "short", timeStyle: "short" });
    } catch { return iso; }
  };

  const ghOk = syncStatus?.last_status === "ok";
  const ghConfigured = !!syncStatus?.github_configured;

  return (
    <>
      <ConfirmDialog pending={pending} onCancel={closeConfirm} />
      <Section
        icon={Bookmark}
        isNew
        id="saved-themes-section"
        title={es ? "Temas Guardados" : "Saved Themes"}
        desc={es ? "Sincronizado con MongoDB, archivo local y GitHub" : "Synced with MongoDB, local file and GitHub"}
        keywords="tema guardado preset estilo default por defecto nube sincronizar guardar apariencia restaurar github mongodb local minimalista actualizar reguardar aplicar"
        badge={syncBadge()}
      >
        <div className="space-y-5" data-testid="saved-themes-section">
          {/* Sync targets summary */}
          <div className="grid grid-cols-3 gap-2" data-testid="sync-targets">
            <div className="glass rounded-2xl px-3 py-2.5 border-white/50 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <Database size={13} className="text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">MongoDB</p>
                <p className="text-[10px] text-emerald-600 font-bold truncate">{es ? "Fuente principal" : "Primary"}</p>
              </div>
            </div>
            <div className="glass rounded-2xl px-3 py-2.5 border-white/50 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-100 flex items-center justify-center shrink-0">
                <HardDrive size={13} className="text-sky-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{es ? "JSON local" : "Local JSON"}</p>
                <p className="text-[10px] text-slate-500 font-semibold truncate" title={syncStatus?.local_path}>
                  {syncStatus?.local_exists ? fmt(syncStatus?.local_mtime) : "—"}
                </p>
              </div>
            </div>
            <div className="glass rounded-2xl px-3 py-2.5 border-white/50 flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${ghOk ? "bg-slate-900" : ghConfigured ? "bg-amber-100" : "bg-slate-100"}`}>
                <Github size={13} className={ghOk ? "text-white" : ghConfigured ? "text-amber-600" : "text-slate-400"} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">GitHub</p>
                <p className={`text-[10px] font-bold truncate ${ghOk ? "text-emerald-600" : ghConfigured ? "text-amber-600" : "text-slate-400"}`}>
                  {ghOk ? fmt(syncStatus?.last_github_at) : (ghConfigured ? (es ? "Pendiente" : "Pending") : (es ? "No config" : "No config"))}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] text-slate-400 leading-relaxed">
              {es
                ? "Al guardar/actualizar, se replica automáticamente a MongoDB → archivo local → GitHub."
                : "On save/update the theme replicates to MongoDB → local file → GitHub."}
            </p>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleSyncNow} disabled={syncing}
              data-testid="sync-themes-now-btn"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] font-black transition-colors disabled:opacity-50 shrink-0">
              {syncing ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
              {es ? "Sincronizar ahora" : "Sync now"}
            </motion.button>
          </div>

          {/* Save current */}
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSave(); }}
              placeholder={es ? "Nombre del tema (ej: Mi estilo oscuro)" : "Theme name (e.g. My dark style)"}
              data-testid="theme-name-input"
              className="flex-1 px-4 py-2.5 text-sm glass rounded-2xl border-white/50 bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--t-from)]/30 text-slate-700 font-semibold placeholder-slate-400"
            />
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={handleSave} disabled={saving}
              data-testid="save-theme-btn"
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl btn-primary text-white text-xs font-bold disabled:opacity-50">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              {es ? "Guardar tema actual" : "Save current theme"}
            </motion.button>
          </div>

          {/* Theme list */}
          {themes.length === 0 ? (
            <div className="py-6 text-center rounded-2xl bg-white/40 border border-dashed border-slate-200">
              <Bookmark size={22} className="mx-auto text-slate-200 mb-2" />
              <p className="text-xs text-slate-400 font-medium">{es ? "Aún no tienes temas guardados" : "No saved themes yet"}</p>
            </div>
          ) : (
            <div className="space-y-2" data-testid="saved-themes-list">
              {themes.map(t => (
                <div
                  key={t.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors ${
                    t.is_default ? "bg-amber-50/60 border-amber-200" : "bg-white/70 border-white/70"
                  }`}
                  data-testid={`theme-row-${t.id}`}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `linear-gradient(135deg, ${(t.snapshot?.custom_accent) || "var(--t-from)"}, var(--t-to))` }}
                  >
                    {t.is_default ? <Star size={14} className="text-white fill-white" /> : <CheckCircle2 size={14} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-black text-slate-800 truncate">{t.name}</p>
                      {t.is_default && (
                        <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-800" data-testid={`default-badge-${t.id}`}>
                          {es ? "Por defecto" : "Default"}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      {t.updated_at && t.updated_at !== t.created_at
                        ? (es ? `Actualizado: ${fmt(t.updated_at)}` : `Updated: ${fmt(t.updated_at)}`)
                        : (es ? `Creado: ${fmt(t.created_at)}` : `Created: ${fmt(t.created_at)}`)}
                    </p>
                  </div>

                  {/* Set default */}
                  {!t.is_default && (
                    <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={() => handleSetDefault(t)} disabled={settingDefault === t.id}
                      data-testid={`set-default-btn-${t.id}`}
                      title={es ? "Marcar como tema por defecto" : "Set as default"}
                      className="p-2 rounded-xl hover:bg-amber-100 text-slate-300 hover:text-amber-500 transition-colors disabled:opacity-50">
                      {settingDefault === t.id ? <Loader2 size={13} className="animate-spin" /> : <Star size={13} />}
                    </motion.button>
                  )}

                  {/* Update / Reguardar */}
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => askUpdate(t)} disabled={updating === t.id}
                    data-testid={`update-theme-btn-${t.id}`}
                    title={es ? "Sobreescribir con la apariencia actual" : "Overwrite with current appearance"}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-600 text-[10px] font-black transition-colors disabled:opacity-50">
                    {updating === t.id ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                    {es ? "Reguardar" : "Update"}
                  </motion.button>

                  {/* Apply */}
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => askApply(t)} disabled={applying === t.id}
                    data-testid={`apply-theme-btn-${t.id}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] font-black transition-colors disabled:opacity-50">
                    {applying === t.id ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
                    {es ? "Aplicar" : "Apply"}
                  </motion.button>

                  {/* Delete */}
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={() => askDelete(t)}
                    data-testid={`delete-theme-btn-${t.id}`}
                    className="p-2 rounded-xl hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 size={13} />
                  </motion.button>
                </div>
              ))}
            </div>
          )}

          {/* Reset to default */}
          <div className="border-t border-white/40 pt-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-slate-600">{es ? "Restaurar por defecto" : "Restore defaults"}</p>
              <p className="text-[10px] text-slate-400">{es ? "Borra toda la personalización y vuelve al diseño original" : "Clears all customization back to the original design"}</p>
            </div>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={askReset}
              data-testid="reset-appearance-btn"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 text-xs font-bold transition-colors shrink-0">
              <RotateCcw size={12} /> {es ? "Restaurar todo" : "Reset all"}
            </motion.button>
          </div>
        </div>
      </Section>
    </>
  );
}
