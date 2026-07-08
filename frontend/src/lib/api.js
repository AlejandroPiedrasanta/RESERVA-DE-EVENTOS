import axios from "axios";

const BASE = `${window.__API_BASE_URL__ || process.env.REACT_APP_BACKEND_URL}/api`;

// Timeout global (30s) para que si un endpoint tarda demasiado (ej. GitHub API
// caído en la app de escritorio) el frontend no se quede colgado en spinners.
export const api = axios.create({ baseURL: BASE, timeout: 30000 });

export const getStats = () => api.get("/stats").then(r => r.data);
export const getReservations = () => api.get("/reservations").then(r => r.data);
export const getReservation = (id) => api.get(`/reservations/${id}`).then(r => r.data);
export const createReservation = (data) => api.post("/reservations", data).then(r => r.data);
export const updateReservation = (id, data) => api.put(`/reservations/${id}`, data).then(r => r.data);
export const deleteReservation = (id) => api.delete(`/reservations/${id}`).then(r => r.data);
export const getCalendarEvents = () => api.get("/calendar").then(r => r.data);

export const uploadReceipt = (id, file) => {
  const form = new FormData();
  form.append("file", file);
  return api.post(`/reservations/${id}/receipts`, form).then(r => r.data);
};

export const deleteReceipt = (id, receiptId) =>
  api.delete(`/reservations/${id}/receipts/${receiptId}`).then(r => r.data);

// Socios
export const getSocios = () => api.get("/socios").then(r => r.data);
export const getSocio = (id) => api.get(`/socios/${id}`).then(r => r.data);
export const createSocio = (data) => api.post("/socios", data).then(r => r.data);
export const updateSocio = (id, data) => api.put(`/socios/${id}`, data).then(r => r.data);
export const deleteSocio = (id) => api.delete(`/socios/${id}`).then(r => r.data);
export const uploadSocioPhoto = (id, file) => {
  const form = new FormData();
  form.append("file", file);
  return api.post(`/socios/${id}/photo`, form).then(r => r.data);
};
export const deleteSocioPhoto = (id) => api.delete(`/socios/${id}/photo`).then(r => r.data);
export const getFinancials = () => api.get("/financials").then(r => r.data);

// Metas (Goals)
export const getMetas = (year, type) => api.get(`/metas?year=${year}&type=${type}`).then(r => r.data);
export const upsertMeta = (data) => api.put("/metas", data).then(r => r.data);
export const deleteMeta = (year, type, month) => {
  const q = month == null ? `year=${year}&type=${type}` : `year=${year}&type=${type}&month=${month}`;
  return api.delete(`/metas?${q}`).then(r => r.data);
};
export const getMetasProgress = (year, type) => api.get(`/metas/progress?year=${year}&type=${type}`).then(r => r.data);

// App Settings
export const getAppSettings = () => api.get("/settings").then(r => r.data);
export const updateAppSettings = (data) => api.put("/settings", data).then(r => r.data);

// Database Settings
export const getDbStats = () => api.get("/settings/database").then(r => r.data);
export const testDbConnection = (url) => api.post("/settings/database/test", { url }).then(r => r.data);
export const compareDatabase = (url) => api.post("/settings/database/compare", { url }).then(r => r.data);
export const switchDatabase = (url) => api.post("/settings/database/connect", { url }).then(r => r.data);
export const resetDatabase = () => api.post("/settings/database/reset").then(r => r.data);
export const optimizeDatabase = () => api.post("/settings/database/optimize").then(r => r.data);
export const getFactoryPresets = () => api.get("/settings/database/factory-presets").then(r => r.data);

// Reminders
export const sendTestReminder   = () => api.post("/reminders/send").then(r => r.data);
export const testEmailConnection = () => api.post("/reminders/test-email").then(r => r.data);

// Notifications
export const getPendingNotifications = () => api.get("/notifications/pending").then(r => r.data);

// Backup
export const getBackupHistory = () => api.get("/backup/history").then(r => r.data);
export const createServerBackup = () => api.post("/backup/create").then(r => r.data);
export const deleteBackupFile = (filename) => api.delete(`/backup/${filename}`).then(r => r.data);
export const downloadBackupUrl = () => `${BASE}/backup/download`;
export const downloadBackupFileUrl = (filename) => `${BASE}/backup/${encodeURIComponent(filename)}/download`;
export const restoreBackup = (file) => {
  const form = new FormData();
  form.append("file", file);
  return api.post("/backup/restore", form).then(r => r.data);
};

// Updates
export const getUpdatesHistory = () => api.get("/updates/history").then(r => r.data);
export const getLatestUpdate = () => api.get("/updates/latest").then(r => r.data);
export const deleteUpdate = (id) => api.delete(`/updates/${id}`).then(r => r.data);
export const setLatestUpdate = (id) => api.put(`/updates/${id}/set-latest`).then(r => r.data);
export const checkRemoteUpdate = (url, currentVersion) =>
  api.get(`/updates/check-remote?url=${encodeURIComponent(url)}&current_version=${currentVersion}`).then(r => r.data);
export const getUpdateDownloadUrl = (id) => `${BASE}/updates/download/${id}`;
export const uploadAppUpdate = (file, version, notes, channel) => {
  const form = new FormData();
  form.append("file", file);
  form.append("version", version);
  form.append("notes", notes || "");
  form.append("channel", channel || "stable");
  return api.post("/updates/upload", form).then(r => r.data);
};
export const checkForUpdates = () => api.get("/updates/check").then(r => r.data);

// Appearance cloud sync & saved themes
export const getCloudAppearance = () => api.get("/settings/appearance").then(r => r.data);
export const saveCloudAppearance = (snapshot) => api.put("/settings/appearance", { snapshot }).then(r => r.data);
export const getSavedThemes = () => api.get("/themes").then(r => r.data);
export const createSavedTheme = (name, snapshot) => api.post("/themes", { name, snapshot }).then(r => r.data);
export const updateSavedTheme = (id, snapshot, name) => api.put(`/themes/${id}`, { snapshot, ...(name ? { name } : {}) }).then(r => r.data);
export const deleteSavedTheme = (id) => api.delete(`/themes/${id}`).then(r => r.data);
export const setDefaultTheme = (id) => api.post(`/themes/${id}/set-default`).then(r => r.data);
export const syncThemesNow = () => api.post("/themes/sync").then(r => r.data);
export const getThemesSyncStatus = () => api.get("/themes/sync/status").then(r => r.data);

// App security
export const getSecurityStatus = () => api.get("/security/status").then(r => r.data);
export const setAppPassword = (password, hint, current_password) => api.post("/security/set-password", { password, hint, current_password }).then(r => r.data);
export const verifyAppPassword = (password) => api.post("/security/verify", { password }).then(r => r.data);
export const removeAppPassword = (current_password) => api.post("/security/remove-password", { current_password }).then(r => r.data);
export const setPageProtection = (enabled) => api.put("/security/protection", { enabled }).then(r => r.data);
export const setAdvancedSecurity = (data) => api.put("/security/advanced-config", data).then(r => r.data);
export const getZipPassword = () => api.get("/security/zip-password").then(r => r.data);
export const setZipPassword = (new_password) => api.post("/security/zip-password", { new_password }).then(r => r.data);
export const resetZipPassword = () => api.post("/security/zip-password/reset").then(r => r.data);

// GitHub Integration
export const getGithubConfig = () => api.get("/github/config").then(r => r.data);
export const saveGithubConfig = (data) => api.post("/github/config", data).then(r => r.data);
export const connectGithub = (token, repo_url, branch) => api.post("/github/connect", { token, repo_url, branch }).then(r => r.data);
export const disconnectGithub = () => api.post("/github/disconnect").then(r => r.data);
export const githubPushAll = (message, version, versionName, include) =>
  api.post("/github/push-all", { message, version, version_name: versionName, include }).then(r => r.data);
export const getGithubPushStatus = () => api.get("/github/push-status").then(r => r.data);
export const getGithubPushPreview = () => api.get("/github/push-preview").then(r => r.data);
export const getGithubNextVersion = () => api.get("/github/next-version").then(r => r.data);
export const getGithubStorage = () => api.get("/github/storage").then(r => r.data);
export const deleteGithubBuilds = (opts = {}) =>
  api.delete("/github/builds", { data: opts, timeout: 120000 }).then(r => r.data);
export const applyUpdateAndRestart = () => api.post("/updates/apply-and-restart", {}, { timeout: 600000 }).then(r => r.data);
export const runDiagnostic = () => api.get("/diagnostic").then(r => r.data);
export const fixDiagnosticIssue = (id) => api.post("/diagnostic/fix", { id }).then(r => r.data);
export const fixAllDiagnosticIssues = () => api.post("/diagnostic/fix-all").then(r => r.data);
export const checkGithubUpdates = () => api.get("/github/check-updates").then(r => r.data);
export const applyGithubUpdate = (force = true) => api.post("/github/apply-update", { force }, { timeout: 600000 }).then(r => r.data);

// Ping ligero para detectar cuando el backend vuelve tras una auto-actualización.
// Usa un cliente sin baseURL para evitar redirects y con timeout corto.
export const pingBackend = () => axios.get(`${BASE}/`, { timeout: 2500 }).then(r => r.data);

// Espera hasta que el backend vuelva a responder tras un reinicio por
// actualización. Devuelve true si respondió antes de `timeoutMs`, false si
// se agotó el tiempo. Poll cada 500ms.
export const waitBackendReady = async (timeoutMs = 90000) => {
  const start = Date.now();
  // pequeña espera inicial: el proceso todavía está vivo cuando la respuesta
  // llega al frontend (shutdown se agenda a 3s), no queremos que el primer
  // ping pegue al backend viejo justo antes de morir.
  await new Promise(r => setTimeout(r, 1500));
  while (Date.now() - start < timeoutMs) {
    try {
      await pingBackend();
      // Espera un poco más para dar tiempo a que uvicorn cargue todos los
      // handlers antes de recargar el frontend.
      await new Promise(r => setTimeout(r, 400));
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  return false;
};

// AI Context (Contexto para la próxima IA)
export const getAiContext = () => api.get("/ai-context").then(r => r.data);
export const saveAiContext = (content) => api.post("/ai-context", { content }).then(r => r.data);
export const resetAiContext = () => api.post("/ai-context/reset").then(r => r.data);

