// server/index.js  (ESM entry for Express API)
import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import "dotenv/config";

/* ---------------------------------------------------------
   Path setup
   --------------------------------------------------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// Root of the repo (one level above /server)
const REPO_ROOT = path.resolve(__dirname, "..");

// Paths for the cached news data (written by worker)
const NEWS_DIR  = path.join(REPO_ROOT, "server", "data");
const NEWS_PATH = path.join(NEWS_DIR, "news.json");

/* ---------------------------------------------------------
   Express setup
   --------------------------------------------------------- */
const app = express();
app.use(cors());
app.use(express.json());

/* ---------------------------------------------------------
   Health check
   --------------------------------------------------------- */
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    now: new Date().toISOString(),
    news_path: NEWS_PATH,
  });
});

/* ---------------------------------------------------------
   News API – reads cached JSON written by worker.mjs
   --------------------------------------------------------- */
app.get("/api/news", async (_req, res) => {
  try {
    await fs.mkdir(NEWS_DIR, { recursive: true });

    let rawObj;
    try {
      const raw = await fs.readFile(NEWS_PATH, "utf8");
      rawObj = JSON.parse(raw);
    } catch {
      rawObj = { items: [], generated_at: null, count: 0 };
    }

    const at = rawObj.generated_at ?? null;
    const items = Array.isArray(rawObj.items) ? rawObj.items : [];

    // Normalize structure for client
    const normalized = {
      at,
      count: items.length,
      items: items.map((it) => ({
        id: it.id ?? String(Math.random()),
        title: it.title ?? "",
        url: it.url ?? "",
        source: it.source ?? "",
        source_name: it.source_name ?? "",
        image: it.image_url ?? it.image ?? null, // unify naming
        coins: Array.isArray(it.coins) ? it.coins : [],
        publishedAt: it.published_at ?? it.publishedAt ?? null,
        excerpt: it.excerpt ?? "",
      })),
    };

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(normalized);
  } catch (e) {
    console.error("[/api/news] error:", e);
    res.status(200).json({
      at: null,
      count: 0,
      items: [],
      error: "server_error",
      message: String(e?.message || e),
    });
  }
});

/* ---------------------------------------------------------
   CoinGecko price API (server-side cache)
   --------------------------------------------------------- */
let PRICE_CACHE = { data: null, ts: 0 };
const PRICE_TTL_MS = 60 * 1000; // 1 minute
const PRICE_IDS = ["bitcoin", "ethereum", "solana", "cardano", "ripple", "dogecoin"];

async function fetchCoinGeckoPrices() {
  const url =
    `https://api.coingecko.com/api/v3/simple/price?` +
    `ids=${encodeURIComponent(PRICE_IDS.join(","))}` +
    `&vs_currencies=eur,usd&include_24hr_change=true`;

  const res = await fetch(url, { headers: { "User-Agent": "TradingLogApp/1.0" } });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`CoinGecko HTTP ${res.status} ${txt.slice(0, 120)}`);
  }
  return res.json();
}

app.get("/api/prices", async (_req, res) => {
  try {
    res.setHeader("Cache-Control", "no-store");
    const now = Date.now();

    // Serve from cache if recent
    if (PRICE_CACHE.data && now - PRICE_CACHE.ts < PRICE_TTL_MS) {
      return res.json({
        cached: true,
        at: new Date(PRICE_CACHE.ts).toISOString(),
        prices: PRICE_CACHE.data,
      });
    }

    // Fetch fresh prices
    const data = await fetchCoinGeckoPrices();
    PRICE_CACHE = { data, ts: now };

    res.json({
      cached: false,
      at: new Date(now).toISOString(),
      prices: data,
    });
  } catch (e) {
    console.error("[/api/prices] error:", e);
    // fallback to stale cache if available
    if (PRICE_CACHE.data) {
      return res.status(200).json({
        cached: true,
        degraded: true,
        at: new Date(PRICE_CACHE.ts).toISOString(),
        prices: PRICE_CACHE.data,
      });
    }
    res.status(503).json({
      error: "price_feed_unavailable",
      message: String(e.message || e),
    });
  }
});

/* ---------------------------------------------------------
   Image proxy – caches + retries to avoid hotlink issues
   --------------------------------------------------------- */
// --- IMAGE PROXY (subdomain-friendly allowlist + retry) ---
const IMG_CACHE = new Map(); // url -> { ts, buf, type }
const IMG_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// Allow base domains; subdomains are OK (endsWith match)
const ALLOWED_DOMAINS = [
  "cointelegraph.com",
  "coindesk.com",
  "ambcrypto.com",
  "newsbtc.com",
  "biztoc.com",
  "wp.com",          // covers i0.wp.com, i1.wp.com, i2.wp.com
  "youtube.com",     // covers img.youtube.com
];

const isAllowedHost = (host) =>
  ALLOWED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));

const EXT_MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

app.get("/api/img", async (req, res) => {
  try {
    const raw = typeof req.query.u === "string" ? req.query.u.trim() : "";
    if (!raw) return res.status(400).end();

    // 1) upgrade to https (prevents mixed-content blocks)
    const target = raw.replace(/^http:/, "https:");
    const u = new URL(target);

    // 2) allowlist check (handles subdomains)
    if (!isAllowedHost(u.hostname)) {
      console.warn("[img] blocked host:", u.hostname);
      return res.status(400).end("blocked host");
    }

    // 3) serve fresh cache if valid
    const now = Date.now();
    const hit = IMG_CACHE.get(target);
    if (hit && now - hit.ts < IMG_TTL_MS) {
      res.setHeader("Cache-Control", "public, max-age=300");
      res.setHeader("Content-Type", hit.type || "image/jpeg");
      return res.end(hit.buf);
    }

    // 4) fetch with browser-like headers; some hosts want a Referer, some don't
    const headers1 = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
      "Accept": "image/avif,image/webp,image/*,*/*;q=0.8",
      "Referer": u.origin,
    };
    const headers2 = { ...headers1 };
    delete headers2.Referer;

    const fetchImage = async (headers) => {
      const r = await fetch(target, { redirect: "follow", headers });
      if (!r.ok) return { ok: false };
      const type = r.headers.get("content-type") || "";
      if (!type.startsWith("image/")) return { ok: false };
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 128) return { ok: false }; // avoid caching tiny/blank
      return { ok: true, buf, type };
    };

    let attempt = await fetchImage(headers1);
    if (!attempt.ok) attempt = await fetchImage(headers2);
    if (!attempt.ok) return res.status(204).end();

    IMG_CACHE.set(target, { ts: now, buf: attempt.buf, type: attempt.type });
    res.setHeader("Cache-Control", "public, max-age=300");
    res.setHeader("Content-Type", attempt.type);
    res.end(attempt.buf);
  } catch (err) {
    console.error("[/api/img] error:", err?.message || err);
    res.status(204).end();
  }
});


/* ---------------------------------------------------------
   Static client (served after API routes)
   --------------------------------------------------------- */
const clientDir = path.resolve(__dirname, "../dist");
app.use(express.static(clientDir));

// fallback for client-side routing
app.get("*", (req, res) => {
  if (req.path.startsWith("/api")) return res.status(404).end();
  res.sendFile(path.join(clientDir, "index.html"));
});

/* ---------------------------------------------------------
   Start server
   --------------------------------------------------------- */
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`\n🚀 API listening at http://localhost:${PORT}`);
  console.log("📰 NEWS_PATH =", NEWS_PATH);
});
