// Auth eliminado: la app ya no requiere login, cuentas, suscripciones ni Google.
// Este contexto se mantiene solo como shim para no romper componentes que
// aún llaman `useAuth()` (ej. ProfileCard). Devuelve siempre un usuario
// "local" con suscripción activa.
import { createContext, useContext } from "react";

const STUB = {
  user: { name: "Usuario", email: "", picture: "" },
  subscription: { is_active: true, plan: "local", trial_active: false, trial_days_left: 0 },
  status: "authenticated",
  loginWithGoogleCredential: async () => {},
  loginWithPassword: async () => {},
  register: async () => {},
  logout: () => {},
  refresh: async () => {},
  updateProfile: async () => {},
  authHeaders: () => ({}),
};

const AuthContext = createContext(STUB);

export function AuthProvider({ children }) {
  return <AuthContext.Provider value={STUB}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
