import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  memo,
} from "react";

/* helpers */
function timeSince(iso) {
  if (!iso) return "never";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}
function clsx(...xs) { return xs.filter(Boolean).join(" "); }

/* ---- API base ----
   Set VITE_API_URL=http://localhost:5050 in client/.env (then restart Vite)
*/
const API = import.meta.env.VITE_API_URL || "";

/* URL builders */
const newsUrl = () => `${API}/api/news`;
const proxyImg = (u) => (u ? `${API}/api/img?u=${encodeURIComponent(u)}` : null);
const httpsDirect = (u) => (u ? u.replace(/^http:/, "https:") : null);

/* ---------------------------------------------
   Small, safe image component:
   proxy first -> direct https -> hide on failure
---------------------------------------------- */
function NewsImage({ raw, alt = "", className = "" }) {
  const initial = useMemo(() => {
    if (!raw) return "/vendor-logos/default.png";
    return `${API}/api/img?u=${encodeURIComponent(raw)}`;
  }, [raw]);

  const [src, setSrc] = useState(initial);
  const triedDirect = useRef(false);
  const triedFallback = useRef(false);

  useEffect(() => {
    setSrc(initial);
    triedDirect.current = false;
    triedFallback.current = false;
  }, [initial]);

  const onError = (e) => {
    if (!raw) {
      e.currentTarget.src = "/vendor-logos/default.png";
      return;
    }

    if (!triedDirect.current) {
      triedDirect.current = true;
      setSrc(raw.replace(/^http:/, "https:"));
      return;
    }

    if (!triedFallback.current) {
      triedFallback.current = true;
      setSrc("/vendor-logos/default.png");
      return;
    }

    e.currentTarget.style.display = "none";
  };

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={onError}
      className={className}
    />
  );
}


/* ---------------------------------------------
   News feed
---------------------------------------------- */
function NewsFeedInner({ className }) {
  const [data, setData] = useState({ items: [], at: null });
  const [status, setStatus] = useState("idle");
  const fetchOnce = useRef(false);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const r = await fetch(newsUrl(), { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const safe = {
        at: j?.at ?? j?.generated_at ?? null,
        items: Array.isArray(j?.items) ? j.items : [],
      };
      setData(safe);
      setStatus("ready");
    } catch (e) {
      console.error("News fetch failed:", e);
      setStatus((s) => (data.items.length ? "ready" : "error"));
    }
  }, [data.items.length]);

  useEffect(() => {
    if (fetchOnce.current) return;
    fetchOnce.current = true;
    load();
  }, [load]);

  const headerNote = useMemo(
    () => (data.at ? `Updated ${timeSince(data.at)}` : "Updated never"),
    [data.at]
  );

  return (
    <section className={clsx("rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4", className)}>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-tight">Crypto News</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500">{headerNote}</span>
          <button
            onClick={load}
            className="rounded-lg border px-2 py-1 text-xs hover:bg-zinc-50/10 active:scale-[0.99]"
            aria-label="Refresh news"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {status === "loading" && data.items.length === 0 && (
        <ul className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="animate-pulse">
              <div className="flex gap-3">
                <div className="h-16 w-24 rounded-lg bg-neutral-800" />
                <div className="flex-1">
                  <div className="mb-2 h-4 w-3/4 rounded bg-neutral-800" />
                  <div className="h-3 w-1/2 rounded bg-neutral-800" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {status === "error" && (
        <div className="text-sm text-red-400">
          Couldn’t load headlines. Check{" "}
          <code className="rounded bg-neutral-800 px-1">{newsUrl()}</code>.
        </div>
      )}

      {status === "ready" && data.items.length === 0 && (
        <div className="text-sm text-zinc-400">
          No headlines for your favourites yet. Try again soon.
        </div>
      )}

      {/* Scrollable list (~3 cards tall) */}
      {status === "ready" && data.items.length > 0 && (
        <div className="h-[360px] overflow-y-auto pr-2 custom-scroll">
          <ul className="space-y-3">
            {data.items.map((it) => {
              const rawImg = it?.image_url ?? it?.image ?? null;
              const srcName = it?.source_name || it?.source || "Unknown source";
              const when = it?.published_at ? timeSince(it.published_at) : "";
              const title = it?.title ?? "Untitled";
              const url = it?.url ?? "#";

              return (
                <li key={it?.id || url}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="group block rounded-xl border border-neutral-800 bg-neutral-900/50 p-3 hover:border-neutral-700 hover:bg-neutral-900/60 transition-colors"
                  >
                    <div className="flex gap-3">
                      {rawImg ? (
                        <NewsImage
                     raw={it?.image_url ?? it?.image ?? null}
                      alt=""
                      className="h-16 w-24 flex-none rounded-lg object-cover bg-neutral-800"
/>

                      ) : (
                        <div className="h-16 w-24 flex-none rounded-lg bg-neutral-800" />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          <span className="truncate">{srcName}</span>
                          {when && (
                            <>
                              <span>•</span>
                              <time dateTime={it?.published_at}>{when}</time>
                            </>
                          )}
                        </div>

                        <h3 className="mt-1 line-clamp-2 font-medium leading-snug group-hover:underline">
                          {title}
                        </h3>

                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {(it?.coins || []).slice(0, 6).map((c) => (
                            <span
                              key={c}
                              className="rounded-md border px-1.5 py-0.5 text-[10px] text-zinc-300"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

export default memo(NewsFeedInner);
