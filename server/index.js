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
const NEWS_DIR = path.join(REPO_ROOT, "data");
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

app.get("/api/img", async (req, res) => {
  try {
    const url = req.query.u;
    if (!url || typeof url !== "string") return res.status(400).end();
    const now = Date.now();
    const hit = IMG_CACHE.get(url);
    if (hit && now - hit.ts < IMG_TTL_MS) {
      res.setHeader("Cache-Control", "public, max-age=300");
      res.setHeader("Content-Type", hit.type || "image/jpeg");
      return res.end(hit.buf);
    }
    const up = await fetch(url, { headers: { "User-Agent": "TradingLogApp/1.0" } });
    if (!up.ok) return res.status(204).end();
    const buf = Buffer.from(await up.arrayBuffer());
    const type = up.headers.get("content-type") || "image/jpeg";
    IMG_CACHE.set(url, { ts: now, buf, type });
    res.setHeader("Cache-Control", "public, max-age=300");
    res.setHeader("Content-Type", type);
    res.end(buf);
  } catch {
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
