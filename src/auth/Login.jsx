// src/auth/Login.jsx
import { useState } from "react";
import { useAuth } from "./AuthContext";
import { useLocation, useNavigate } from "react-router-dom";

export default function Login() {
  const { signin, status } = useAuth();
  const [email, setEmail] = useState("demo@tradinglog.app");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await signin(email.trim(), password);
      navigate(from, { replace: true });
    } catch (e) {
      setError(e.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-neutral-900/70 border border-neutral-800 rounded-2xl shadow-2xl p-8 backdrop-blur">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Sign in to your Trading Log
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <label className="block text-sm mb-2">Email</label>
              <input
                type="email"
                className="w-full rounded-xl bg-neutral-950 border border-neutral-800 focus:border-red-500/70 outline-none px-4 py-3"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Password</label>
              <input
                type="password"
                className="w-full rounded-xl bg-neutral-950 border border-neutral-800 focus:border-red-500/70 outline-none px-4 py-3"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full rounded-xl px-4 py-3 font-medium transition
                         bg-gradient-to-r from-red-700 via-red-600 to-red-500
                         disabled:opacity-60 disabled:cursor-not-allowed
                         hover:shadow-[0_0_0_3px_rgba(239,68,68,0.25)]"
            >
              {status === "loading" ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-xs text-neutral-500">
            <span>v0 auth (local)</span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              Metallic Red
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
