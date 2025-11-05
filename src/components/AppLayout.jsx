import React from "react";
import { useAuth } from "../auth"; // adjust if your hook/export is different

export default function AppLayout({ children }) {
  const { user, logout } = useAuth(); // user?.email

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      {/* Top banner */}
      <header className="sticky top-0 z-50 bg-neutral-950/90 backdrop-blur supports-[backdrop-filter]:backdrop-blur border-b border-neutral-900">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex h-16 items-center justify-between">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-xl bg-metal-red border border-neutral-800 border-metal-red" />
              <div className="flex flex-col leading-tight">
                <span className="font-brand text-lg md:text-xl font-extrabold tracking-wide">
                  Trading Log App
                </span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                  Crypto • Journal • Insights
                </span>
              </div>
            </div>

            {/* Right side: user + sign out */}
            <div className="flex items-center gap-3">
              {user?.email && (
                <span className="hidden sm:inline text-sm text-zinc-400">{user.email}</span>
              )}
              <button
                onClick={logout}
                className="group relative inline-flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm font-medium
                           hover:border-red-500/70 hover:bg-neutral-900/80
                           focus:outline-none focus:ring-2 focus:ring-red-500/40"
              >
                <span
                  className="absolute inset-0 -z-10 rounded-xl opacity-0 group-hover:opacity-100 transition
                             bg-[radial-gradient(120px_40px_at_50%_120%,rgba(255,80,80,0.25),transparent)]"
                />
                <svg width="14" height="14" viewBox="0 0 24 24" className="opacity-70 group-hover:opacity-100">
                  <path fill="currentColor" d="M16 13v-2H7V8l-5 4l5 4v-3h9zm3-10H9a2 2 0 0 0-2 2v3h2V5h10v14H9v-3H7v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Z"/>
                </svg>
                Sign out
              </button>
            </div>
          </div>

          {/* Metallic red accent rail */}
          <div className="accent-rail my-3" />
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        {children}
      </main>
    </div>
  );
}
