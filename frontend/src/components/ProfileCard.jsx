import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Pencil, Check, X, LogOut, Loader2, Camera } from "lucide-react";

function initialsOf(nameOrEmail) {
  const s = (nameOrEmail || "").trim();
  if (!s) return "U";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function ProfileCard() {
  const { user, updateProfile, logout } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);
  const [imgErr, setImgErr] = useState(false);

  useEffect(() => {
    setName(user?.name || "");
    setImgErr(false);
  }, [user?.name, user?.picture]);

  if (!user) return null;

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast({ title: "El nombre no puede estar vacío", variant: "destructive" });
      return;
    }
    if (trimmed === user.name) { setEditing(false); return; }
    setSaving(true);
    try {
      await updateProfile({ name: trimmed });
      toast({ title: "Perfil actualizado ✓" });
      setEditing(false);
    } catch (e) {
      toast({
        title: "Error al actualizar",
        description: e?.response?.data?.detail || String(e),
        variant: "destructive",
      });
    } finally { setSaving(false); }
  };

  const handleCancel = () => {
    setName(user?.name || "");
    setEditing(false);
  };

  const handleLogout = async () => {
    if (!window.confirm("¿Cerrar sesión?")) return;
    await logout();
    window.location.href = "/";
  };

  const showPhoto = user.picture && !imgErr;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-3xl p-5 bg-white/80 backdrop-blur-xl border-2 border-white/70 shadow-lg"
      data-testid="profile-card"
    >
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-indigo-200/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-14 -left-14 w-40 h-40 rounded-full bg-rose-200/30 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex items-center gap-4">
        {/* Avatar */}
        <div className="relative shrink-0">
          <motion.div
            whileHover={{ scale: 1.04 }}
            className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-black shadow-lg ring-4 ring-white"
            style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
          >
            {showPhoto ? (
              <img
                src={user.picture}
                alt={user.name || user.email}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={() => setImgErr(true)}
                data-testid="profile-avatar-img"
              />
            ) : (
              <span data-testid="profile-avatar-initials">{initialsOf(user.name || user.email)}</span>
            )}
          </motion.div>
          {user.auth_provider === "password" && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white shadow border border-slate-100 flex items-center justify-center">
              <User size={12} className="text-slate-500" />
            </div>
          )}
          {(!user.auth_provider || user.auth_provider === "google" || user.picture) && user.auth_provider !== "password" && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white shadow border border-slate-100 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
            Mi perfil
          </div>
          <AnimatePresence mode="wait" initial={false}>
            {editing ? (
              <motion.div
                key="edit"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="flex items-center gap-2"
              >
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                    if (e.key === "Escape") handleCancel();
                  }}
                  maxLength={80}
                  disabled={saving}
                  data-testid="profile-name-input"
                  className="flex-1 min-w-0 bg-white border border-indigo-300 rounded-xl px-3 py-2 text-base font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400/50"
                  style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
                />
                <button
                  onClick={handleSave}
                  disabled={saving}
                  data-testid="profile-name-save"
                  className="w-9 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-sm disabled:opacity-60"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  data-testid="profile-name-cancel"
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="view"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="flex items-center gap-2 min-w-0"
              >
                <h3
                  className="text-xl font-black text-slate-900 truncate"
                  style={{ fontFamily: "Cabinet Grotesk, sans-serif" }}
                  data-testid="profile-name"
                >
                  {user.name || user.email.split("@")[0]}
                </h3>
                <button
                  onClick={() => setEditing(true)}
                  data-testid="profile-name-edit"
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-slate-400 flex items-center justify-center shrink-0 shadow-sm"
                  title="Editar nombre"
                >
                  <Pencil size={13} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500 min-w-0">
            <Mail size={12} className="shrink-0" />
            <span className="truncate" data-testid="profile-email">{user.email}</span>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          data-testid="profile-logout-btn"
          title="Cerrar sesión"
          className="hidden sm:flex w-10 h-10 rounded-2xl bg-white border border-slate-200 hover:border-red-300 hover:text-red-500 text-slate-400 items-center justify-center shrink-0 shadow-sm"
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* Mobile logout row */}
      <div className="sm:hidden mt-3 pt-3 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-bold hover:border-red-300 hover:text-red-500"
        >
          <LogOut size={13} /> Cerrar sesión
        </button>
      </div>
    </motion.div>
  );
}
