import React, { useEffect, useState } from "react";

function usePrices() {
  const [prices, setPrices] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/prices", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (alive) setPrices(j?.prices || null);
      } catch (e) {
        console.error("[Ticker] price fetch failed:", e);
      }
    };
    load();
    const id = setInterval(load, 60000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return prices;
}

export default function Ticker() {
  const p = usePrices();

  const items = [
    ["BTC", p?.bitcoin],
    ["ETH", p?.ethereum],
    ["SOL", p?.solana],
    ["ADA", p?.cardano],
    ["XRP", p?.ripple],
    ["DOGE", p?.dogecoin],
  ].filter(([_, v]) => v);

  // Small helper that gives colour + formatted string
  const renderItem = (sym, v) => {
    const price = v?.eur ?? v?.usd ?? 0;
    const chg = v?.eur_24h_change ?? v?.usd_24h_change ?? 0;
    const sign = chg >= 0 ? "+" : "";
    const color =
      chg > 0 ? "text-green-400" : chg < 0 ? "text-red-500" : "text-zinc-400";

    return (
      <span key={sym} className="flex items-center gap-1">
        <span className="font-semibold text-zinc-100">{sym}</span>
        <span className="text-zinc-300">
          €{price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </span>
        <span className={color}>
          {sign}
          {chg.toFixed(2)}%
        </span>
      </span>
    );
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-800">
      <div className="whitespace-nowrap will-change-transform animate-ticker px-6 py-2 text-sm flex gap-6">
        {items.map(([sym, v], i) => (
          <React.Fragment key={sym}>
            {i > 0 && <span className="opacity-40 text-zinc-500">•</span>}
            {renderItem(sym, v)}
          </React.Fragment>
        ))}
        {/* Duplicate once to make seamless scroll */}
        {items.map(([sym, v], i) => (
          <React.Fragment key={`${sym}-dup`}>
            <span className="opacity-40 text-zinc-500">•</span>
            {renderItem(sym, v)}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
<div className="relative overflow-hidden rounded-2xl border border-neutral-800 ticker-mask">
  ...
</div>

