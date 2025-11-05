// src/pages/Dashboard.jsx
import Ticker from "../components/Ticker";
import AppLayout from "../components/AppLayout";
import NewsFeed from "../components/NewsFeed";

export default function Dashboard() {
  return (
    <AppLayout>
      <main className="mx-auto max-w-6xl p-4 md:p-6 text-zinc-100">
        {/* Accent rail */}
        <hr className="my-2 h-[3px] w-full rounded-full border-0 bg-gradient-to-r from-red-800 via-rose-600 to-red-500" />

        {/* Ticker */}
        <section
          aria-label="Market ticker"
          className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3 shadow-[0_0_20px_rgba(255,0,0,0.06)]"
        >
          <Ticker />
        </section>

        {/* Header */}
        <header className="mb-6 flex items-baseline justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-zinc-400">Your trading hub at a glance.</p>
          </div>
          <div
            className="hidden md:block rounded-xl border border-red-900/40 bg-gradient-to-r from-red-900/30 to-rose-800/20 px-3 py-1 text-xs text-rose-300/90 shadow-[0_0_12px_rgba(255,50,80,0.15)]"
            role="status"
            aria-label="Live data"
            title="Live data"
          >
            Live
          </div>
        </header>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column */}
          <section aria-label="Portfolio overview" className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 shadow-[0_6px_30px_-10px_rgba(255,60,80,0.2)]">
              <div className="mb-3 text-sm text-zinc-400">Portfolio snapshot</div>
              <div className="h-32 rounded-xl bg-neutral-800/60" />
            </div>
            {/* Add more cards here */}
          </section>

          {/* Right column — News */}
          <aside aria-label="Crypto news" className="lg:col-span-1">
            <NewsFeed className="border-neutral-800 bg-neutral-900/60 shadow-[0_6px_30px_-10px_rgba(255,60,80,0.2)]" />
          </aside>
        </div>
      </main>
    </AppLayout>
  );
}
