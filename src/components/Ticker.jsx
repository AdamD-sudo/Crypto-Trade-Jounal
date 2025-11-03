import React, { useEffect, useState } from "react";

export default function Ticker() {
  const [data, setData] = useState({});
  const [status, setStatus] = useState("loading");
  const timer = useRef(null);

  async function load() {
    try {
      const r = await fetch("/api/prices", { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setData(j.prices || {});
      setStatus("ready");
    } catch (e) {
      console.error("Ticker fetch failed:", e);
      setStatus((s) => (Object.keys(data).length ? "ready" : "error"));
    }
  }

  useEffect(() => {
    load(); // first fetch
    timer.current = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, 60_000); // poll every 60s (be nice to CoinGecko)
    return () => clearInterval(timer.current);
  }, []);

  if (status === "loading") return <div className="text-sm opacity-60">Loading prices…</div>;
  if (status === "error") return <div className="text-sm text-red-400">Price feed unavailable.</div>;

  const rows = [
    ["BTC", "bitcoin"],
    ["ETH", "ethereum"],
    ["SOL", "solana"],
    ["ADA", "cardano"],
    ["XRP", "ripple"],
    ["DOGE", "dogecoin"],
  ];

  return (
    <div className="flex items-center justify-between">
      <div className="whitespace-nowrap overflow-x-auto no-scrollbar">
        {rows.map(([sym, id]) => {
          const p = data[id];
          if (!p) return null;
          const eur = p.eur ?? p.usd;
          const chg = p.eur_24h_change ?? p.usd_24h_change ?? 0;
          const sign = chg >= 0 ? "+" : "";
          return (
            <span key={id} className="inline-flex items-center gap-1 px-3 py-1">
              <span className="opacity-80">{sym}</span>
              <span>€{eur?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              <span className={chg >= 0 ? "text-green-500" : "text-red-500"}>
                {sign}{chg.toFixed(2)}%
              </span>
            </span>
          );
        })}
      </div>
      <button
        onClick={load}
        className="ml-3 rounded-lg border border-neutral-800 px-2 py-1 text-xs hover:bg-neutral-800/40"
        title="Refresh now"
      >
        Refresh
      </button>
    </div>
  );
}
