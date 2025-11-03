// src/auth/index.jsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // bootstrap from localStorage
  useEffect(() => {
    const raw = localStorage.getItem("auth_user");
    if (raw) setUser(JSON.parse(raw));
  }, []);

  const login = async (email, password) => {
    // demo only — replace with real API later
    const fakeUser = { id: "u1", email };
    setUser(fakeUser);
    localStorage.setItem("auth_user", JSON.stringify(fakeUser));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("auth_user");
  };

  const value = useMemo(() => ({ user, login, logout }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

// Guard for protected routes
export function ProtectedRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

// Minimal login page (demo)
export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    const ok = await login(email, password);
    if (ok) navigate("/dashboard", { replace: true });
  }

  return (
    <main className="min-h-screen grid place-items-center bg-neutral-950 text-zinc-100">
      <form onSubmit={onSubmit} className="w-80 space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5">
        <h1 className="text-lg font-semibold">Sign in</h1>
        <input
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="••••••••"
          className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2"
        />
        <button className="w-full rounded-lg border border-rose-700/50 bg-rose-600/20 px-3 py-2 hover:bg-rose-600/30">
          Continue
        </button>
      </form>
    </main>
  );
}
