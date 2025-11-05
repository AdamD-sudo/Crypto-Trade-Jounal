// server/index.js (ESM)

import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import "dotenv/config";


// --- Stable paths (declare ONCE) ---
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");        // one level up from /server
const NEWS_DIR = path.join(REPO_ROOT, "server/data");
const NEWS_PATH = path.join(NEWS_DIR, "news.json");

const app = express();
app.use(cors());
app.use(express.json());

// --- HEALTH ---
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, now: new Date().toISOString() });
});

// --- NEWS (reads cache written by worker) ---
app.get("/api/news", async (_req, res) => {
  try {
    try { await fs.mkdir(NEWS_DIR, { recursive: true }); } catch {}
    let rawObj;
    try {
      const raw = await fs.readFile(NEWS_PATH, "utf8");
      rawObj = JSON.parse(raw);
    } catch {
      rawObj = { items: [], generated_at: null, count: 0 };
    }

    const at = rawObj.generated_at ?? null;
    const items = Array.isArray(rawObj.items) ? rawObj.items : [];

    const normalized = {
      at,
      count: items.length,
      items: items.map((it) => ({
        id: it.id ?? String(Math.random()),
        title: it.title ?? "",
        url: it.url ?? "",
        source: it.source ?? "",
        source_name: it.source_name ?? "",
        image: it.image_url ?? it.image ?? null, // image_url -> image
        coins: Array.isArray(it.coins) ? it.coins : [],
        publishedAt: it.published_at ?? it.publishedAt ?? null,
        excerpt: it.excerpt ?? "",
      })),
    };

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(normalized);
  } catch (e) {
    res.status(200).json({
      at: null, count: 0, items: [], error: "server_error", message: String(e?.message || e)
    });
  }
});

// --- PRICES (CoinGecko via server, cached) ---
let PRICE_CACHE = { data: null, ts: 0 };
const PRICE_TTL_MS = 60 * 1000;
const PRICE_IDS = ["bitcoin","ethereum","solana","cardano","ripple","dogecoin"];

async function fetchCoinGeckoPrices() {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(
    PRICE_IDS.join(",")
  )}&vs_currencies=eur,usd&include_24hr_change=true`;

  const res = await fetch(url, { headers: { "User-Agent": "TradingLogApp/1.0" } });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`CG HTTP ${res.status} ${txt.slice(0,120)}`);
  }
  return res.json();
}

app.get("/api/prices", async (_req, res) => {
  try {
    res.setHeader("Cache-Control", "no-store");
    const now = Date.now();
    if (PRICE_CACHE.data && now - PRICE_CACHE.ts < PRICE_TTL_MS) {
      return res.json({ cached: true, at: new Date(PRICE_CACHE.ts).toISOString(), prices: PRICE_CACHE.data });
    }
    const data = await fetchCoinGeckoPrices();
    PRICE_CACHE = { data, ts: now };
    res.json({ cached: false, at: new Date(now).toISOString(), prices: data });
  } catch (e) {
    if (PRICE_CACHE.data) {
      return res.status(200).json({
        cached: true, degraded: true,
        at: new Date(PRICE_CACHE.ts).toISOString(),
        prices: PRICE_CACHE.data
      });
    }
    res.status(503).json({ error: "price_feed_unavailable", message: String(e.message || e) });
  }
});

// --- IMAGE PROXY ---

const IMG_CACHE = new Map(); // url -> { ts, buf, type }
const IMG_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const IMG_STALE_MS = 24 * 60 * 60 * 1000; // allow stale if upstream breaks

app.get("/api/img", async (req, res) => {
  try {
    const raw = req.query.u;
    if (!raw || typeof raw !== "string") return res.status(400).end();

    // 1) upgrade to https (prevents mixed-content)
    const target = raw.replace(/^http:/, "https:");
    const u = new URL(target);

    // 2) very small allowlist to avoid SSRF (add domains as they appear)
    const ALLOWED = new Set([
      "images.cointelegraph.com",
      "static.coindesk.com",
      "ambcrypto.com",
      "www.newsbtc.com",
      "biztoc.com",
      "i0.wp.com",
      "i1.wp.com",
      "i2.wp.com",
      "img.youtube.com",
    ]);
    if (!ALLOWED.has(u.hostname)) return res.status(400).end("blocked host");

    const now = Date.now();
    const hit = IMG_CACHE.get(target);

    // 3) serve fresh cache if valid
    if (hit && now - hit.ts < IMG_TTL_MS) {
      res.setHeader("Cache-Control", "public, max-age=300");
      res.setHeader("Content-Type", hit.type || "image/jpeg");
      return res.end(hit.buf);
    }

    // 4) fetch with browser-like headers + timeout
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);

    const up = await fetch(target, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        "Referer": u.origin,
        "Accept": "image/avif,image/webp,image/*,*/*;q=0.8",
      },
      signal: controller.signal,
    });

    clearTimeout(t);

    if (!up.ok) {
      // 5) if upstream fails but we have *stale* cache, serve it
      if (hit && now - hit.ts < IMG_STALE_MS) {
        res.setHeader("Cache-Control", "public, max-age=60");
        res.setHeader("Content-Type", hit.type || "image/jpeg");
        return res.end(hit.buf);
      }
      return res.status(204).end(); // let <img> onError handle hide
    }

    const type = up.headers.get("content-type") || "image/jpeg";
    // only cache real images
    if (!type.startsWith("image/")) return res.status(204).end();

    const buf = Buffer.from(await up.arrayBuffer());
    if (buf.length < 256) {
      // tiny/blank responses → don’t cache, let UI hide
      return res.status(204).end();
    }

    IMG_CACHE.set(target, { ts: now, buf, type });
    res.setHeader("Cache-Control", "public, max-age=300");
    res.setHeader("Content-Type", type);
    res.end(buf);
  } catch {
    // fall back to stale if we can
    const raw = req.query.u;
    const target = typeof raw === "string" ? raw.replace(/^http:/, "https:") : null;
    const hit = target && IMG_CACHE.get(target);
    if (hit && Date.now() - hit.ts < IMG_STALE_MS) {
      res.setHeader("Cache-Control", "public, max-age=60");
      res.setHeader("Content-Type", hit.type || "image/jpeg");
      return res.end(hit.buf);
    }
    res.status(204).end();
  }
});


// --- STATIC (after API routes) ---
const clientDir = path.resolve(__dirname, "../dist");
app.use(express.static(clientDir));
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) return res.status(404).end();
  res.sendFile(path.join(clientDir, "index.html"));
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
