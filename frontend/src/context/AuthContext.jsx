import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";

const AuthContext = createContext(null);
const TOKEN_KEY = "cp_session_token";

function getToken() { try { return localStorage.getItem(TOKEN_KEY) || null; } catch { return null; } }
function setToken(t) { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } }

function authHeaders() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [status, setStatus] = useState("checking"); // "checking" | "unauthenticated" | "authenticated"

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null); setSubscription(null); setStatus("unauthenticated");
      return null;
    }
    try {
      const { data } = await api.get("/auth/me", { headers: authHeaders() });
      setUser(data.user);
      setSubscription(data.subscription);
      setStatus("authenticated");
      return data;
    } catch {
      setToken(null);
      setUser(null); setSubscription(null); setStatus("unauthenticated");
      return null;
    }
  }, []);

  const exchangeSession = useCallback(async (session_id) => {
    const { data } = await api.post("/auth/session", { session_id });
    if (data.session_token) setToken(data.session_token);
    setUser(data.user);
    setSubscription(data.subscription);
    setStatus("authenticated");
    return data;
  }, []);

  const registerWithPassword = useCallback(async ({ email, password, name }) => {
    const { data } = await api.post("/auth/register", { email, password, name });
    if (data.session_token) setToken(data.session_token);
    setUser(data.user);
    setSubscription(data.subscription);
    setStatus("authenticated");
    return data;
  }, []);

  const loginWithPassword = useCallback(async ({ email, password }) => {
    const { data } = await api.post("/auth/login", { email, password });
    if (data.session_token) setToken(data.session_token);
    setUser(data.user);
    setSubscription(data.subscription);
    setStatus("authenticated");
    return data;
  }, []);

  const updateProfile = useCallback(async (patch) => {
    const { data } = await api.patch("/auth/profile", patch, { headers: authHeaders() });
    setUser(data.user);
    if (data.subscription) setSubscription(data.subscription);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post("/auth/logout", {}, { headers: authHeaders() }); } catch { /* ignore */ }
    setToken(null);
    setUser(null); setSubscription(null); setStatus("unauthenticated");
  }, []);

  useEffect(() => {
    if (window.location.hash?.includes("session_id=")) return;
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, subscription, status, refresh, exchangeSession, logout, setSubscription, setUser, authHeaders, registerWithPassword, loginWithPassword, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { authHeaders };
