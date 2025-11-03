import Ticker from "../components/Ticker";
import AppLayout from "../components/AppLayout";
import NewsFeed from "../components/NewsFeed";

export default function Dashboard() {
  return (
    <AppLayout>
      {/* Page chrome with dark gradient */}
      <div className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-950 to-neutral-900 text-zinc-100">
        <main className="mx-auto max-w-6xl p-4 md:p-6">
          {/* Top ribbon accent */}
          <div className="mb-4 h-[3px] w-full rounded-full bg-gradient-to-r from-red-800 via-rose-600 to-red-500" />

          {/* Ticker */}
          <div className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3 shadow-[0_0_20px_rgba(255,0,0,0.06)]">
            <Ticker />
          </div>

          {/* Header */}
          <div className="mb-6 flex items-baseline justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Welcome back
              </h1>
              <p className="text-sm text-zinc-400">
                Your trading hub at a glance.
              </p>
            </div>
            <div className="hidden md:block rounded-xl border border-red-900/40 bg-gradient-to-r from-red-900/30 to-rose-800/20 px-3 py-1 text-xs text-rose-300/90 shadow-[0_0_12px_rgba(255,50,80,0.15)]">
              Live
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Left column (your cards/charts) */}
            <section className="lg:col-span-2 space-y-6">
              {/* Example card placeholder */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 shadow-[0_6px_30px_-10px_rgba(255,60,80,0.2)]">
                <div className="mb-3 text-sm text-zinc-400">
                  Portfolio snapshot
                </div>
                <div className="h-32 rounded-xl bg-neutral-800/60" />
              </div>

              {/* Add more cards here as you build them */}
            </section>

            {/* Right column — News */}
            <aside className="lg:col-span-1">
              <NewsFeed className="border-neutral-800 bg-neutral-900/60 shadow-[0_6px_30px_-10px_rgba(255,60,80,0.2)]" />
            </aside>
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
