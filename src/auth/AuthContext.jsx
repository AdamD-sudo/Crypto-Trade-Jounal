// src/auth/AuthContext.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { loginWithEmail, logout } from "./api";

const AuthContext = createContext(null);

const STORAGE_KEY = "tradinglog.auth.v1";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | loading | authed | error

  useEffect(() => {
    // Rehydrate on refresh
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      setUser(parsed.user ?? null);
      setToken(parsed.token ?? null);
      setStatus(parsed.user ? "authed" : "idle");
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const persist = (next) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const signin = async (email, password) => {
    setStatus("loading");
    try {
      const { token, user } = await loginWithEmail(email, password);
      setUser(user);
      setToken(token);
      setStatus("authed");
      persist({ user, token });
      return { ok: true };
    } catch (e) {
      setStatus("error");
      throw e;
    }
  };

  const signout = async () => {
    setStatus("loading");
    await logout();
    setUser(null);
    setToken(null);
    setStatus("idle");
    localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(
    () => ({ user, token, status, signin, signout, isAuthed: !!user }),
    [user, token, status]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
