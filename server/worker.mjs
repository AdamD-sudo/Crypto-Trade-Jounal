// worker.mjs
// Fetch crypto news -> normalize -> write data/news.json
// ESM, Node 18+ (global fetch). Load .env if present.
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

// ----- Paths (stable regardless of where you run from)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname);
const DATA_DIR = path.join(REPO_ROOT, "data");
const OUT_PATH = path.join(DATA_DIR, "news.json");

// ----- Config
const NEWSAPI_KEY = process.env.NEWSAPI_KEY || "";  // optional
const PAGE_SIZE = 30;                               // max 100 on paid plans
const QUERY = [
  "crypto", "cryptocurrency", "bitcoin", "ethereum", "solana",
  "blockchain", "defi", "nft"
].join(" OR ");

// Map some common tickers from text
const COIN_HINTS = [
  { sym: "BTC", rx: /\bbtc|bitcoin\b/i },
  { sym: "ETH", rx: /\beth|ethereum\b/i },
  { sym: "SOL", rx: /\bsol|solana\b/i },
  { sym: "ADA", rx: /\bada|cardano\b/i },
  { sym: "XRP", rx: /\bxrp|ripple\b/i },
  { sym: "DOGE", rx: /\bdoge|dogecoin\b/i },
];

// Utility: ensure folder + atomic write
async function writeJsonAtomic(filePath, obj) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmp = filePath + ".tmp-" + crypto.randomUUID();
  await fs.writeFile(tmp, JSON.stringify(obj, null, 2), "utf8");
  await fs.rename(tmp, filePath);
}

// Provider: NewsAPI.org (optional)
async function fetchNewsApi() {
  if (!NEWSAPI_KEY) {
    console.warn("[worker] NEWSAPI_KEY not set; skipping NewsAPI provider");
    return [];
  }

  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set("q", QUERY);
  url.searchParams.set("language", "en");
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("pageSize", String(PAGE_SIZE));

  const res = await fetch(url, {
    headers: { "X-Api-Key": NEWSAPI_KEY, "User-Agent": "TradingLogApp/1.0" },
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`NewsAPI HTTP ${res.status}: ${txt.slice(0, 200)}`);
  }

  const json = await res.json();
  const arts = Array.isArray(json.articles) ? json.articles : [];

  const items = arts.map((a) => {
    const title = a.title ?? "";
    const desc = a.description ?? "";
    const content = [title, desc, a.content ?? ""].join(" ");
    const coins = COIN_HINTS.filter(h => h.rx.test(content)).map(h => h.sym);

    // Normalize to your worker shape
    return {
      id: crypto.createHash("sha1").update(a.url || title).digest("hex").slice(0, 24),
      title: title,
      url: a.url ?? "",
      source: "newsapi",
      source_name: a.source?.name ?? "",
      image_url: a.urlToImage ?? null,
      coins,
      published_at: a.publishedAt ?? null,
      excerpt: desc ?? "",
    };
  });

  return items;
}

// De-dup by URL or title hash
function dedupe(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const key = it.url || it.title;
    const h = crypto.createHash("sha1").update(key).digest("hex");
    if (seen.has(h)) continue;
    seen.add(h);
    out.push(it);
  }
  return out;
}

// Sort newest first
function sortByPublished(items) {
  return items.sort((a, b) => {
    const ta = Date.parse(a.published_at || 0) || 0;
    const tb = Date.parse(b.published_at || 0) || 0;
    return tb - ta;
  });
}

async function runOnce() {
  console.log("[worker] starting…");

  let all = [];
  try {
    const fromNewsApi = await fetchNewsApi();
    all = all.concat(fromNewsApi);
  } catch (e) {
    console.warn("[worker] NewsAPI provider failed:", String(e?.message || e));
  }

  // You can add more providers later and concat here.

  // Normalize collection
  all = dedupe(all);
  all = sortByPublished(all);

  const out = {
    generated_at: new Date().toISOString(),
    count: all.length,
    items: all,
  };

  await writeJsonAtomic(OUT_PATH, out);
  console.log(`[worker] wrote ${all.length} items -> ${OUT_PATH}`);
}

// If WATCH=1, poll every N minutes; else run once
const INTERVAL_MIN = Number(process.env.WORKER_INTERVAL_MIN || 10);
if (process.env.WATCH === "1") {
  await runOnce();
  setInterval(runOnce, INTERVAL_MIN * 60 * 1000);
} else {
  await runOnce();
}
