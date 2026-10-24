/*
 * Live content for the Toss mini app.
 * The bundle is reviewed by Toss, so content that changes often is read from keywordtrip.com
 * at runtime as data (JSON / HTML text). Nothing fetched here is executed as code:
 *  - home: destination data and Q&A come from /api/kt-data (JSON) before the app scripts start
 *  - destination & guide pages: the page's <main> comes from /api/kt-page and replaces the bundled copy
 *  - pages that are not in the bundle yet (new destinations) open in /trips/remote.html
 * If keywordtrip.com cannot be reached, the bundled copy is shown, so the app always works.
 */
const SITE = "https://keywordtrip.com";
const SITE_RE = /^https?:\/\/(?:www\.)?keywordtrip\.com/i;
const LIVE_PATH = /^\/(?:trips(?:\/[a-z0-9-]+){0,2}|guides\/[a-z0-9-]+|about|privacy)$/;
const DATA_TIMEOUT = 2500;
const PAGE_TIMEOUT = 3500;
const CACHE_KEY = "kt_live_v1";
const CACHE_MS = 10 * 60 * 1000;

// eslint-disable-next-line no-undef
const BUNDLED = new Set(typeof __KT_PAGES__ !== "undefined" ? __KT_PAGES__ : []);

export function cleanPath(pathname) {
  let p = (pathname || "/").replace(/\.html$/, "").replace(/\/index$/, "");
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p || "/";
}

// Where a site path opens inside the bundle.
export function routeFor(pathname) {
  const p = cleanPath(pathname);
  if (p === "/") return "/index.html";
  if (/\.[a-z0-9]+$/i.test(pathname) && !/\.html$/.test(pathname)) return pathname;
  if (BUNDLED.has(p)) return p === "/trips" ? "/trips/index.html" : p + ".html";
  if (LIVE_PATH.test(p)) return "/trips/remote.html?p=" + encodeURIComponent(p);
  return p + ".html";
}

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
}

function readCache() {
  try {
    const c = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
    if (c && Date.now() - c.at < CACHE_MS && c.body && c.body.data) return c.body;
  } catch (e) {}
  return null;
}
function writeCache(body) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), body })); } catch (e) {}
}

let liveQA = null;

async function loadData(nativeFetch) {
  const cached = readCache();
  if (cached) return cached;
  try {
    const r = await withTimeout(nativeFetch(SITE + "/api/kt-data", { cache: "no-store" }), DATA_TIMEOUT);
    if (!r.ok) throw new Error(String(r.status));
    const body = await r.json();
    if (!body || !body.data || !Array.isArray(body.data.DEST) || !body.data.DEST.length) throw new Error("bad_data");
    writeCache(body);
    return body;
  } catch (e) {
    const r = await nativeFetch("/assets/data.json");
    return { data: await r.json(), qa: null, bundled: true };
  }
}

function loadScripts(srcs) {
  return srcs.reduce((p, src) => p.then(() => new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = false;
    s.onload = s.onerror = () => resolve();
    document.body.appendChild(s);
  })), Promise.resolve());
}

// Home: set the data globals the site scripts expect, then start them in their original order.
export async function boot(srcs, nativeFetch) {
  const body = await loadData(nativeFetch);
  const d = body.data;
  window.DEST = d.DEST;
  window.INFO = d.INFO;
  window.REGIONS = d.REGIONS;
  window.CUR = d.CUR;
  if (body.qa) liveQA = body.qa;
  document.documentElement.dataset.ktData = body.bundled ? "bundled" : "live";
  await loadScripts(srcs);
}

// answers.js asks for /assets/qa.json; hand it the live copy when we have one.
export function qaResponse(url) {
  if (!liveQA) return null;
  const path = typeof url === "string" ? url : url && url.url;
  if (!path || !/^\/assets\/qa\.json(\?|$)/.test(path.replace(location.origin, ""))) return null;
  return Promise.resolve(new Response(JSON.stringify(liveQA), { headers: { "content-type": "application/json" } }));
}

function rewriteLinks(root) {
  root.querySelectorAll("a[href]").forEach((a) => {
    let href = a.getAttribute("href");
    if (SITE_RE.test(href)) href = href.replace(SITE_RE, "") || "/";
    if (!href.startsWith("/") || href.startsWith("//") || href.startsWith("/api/")) return;
    const m = href.match(/^([^?#]*)(.*)$/);
    const target = routeFor(m[1]);
    a.setAttribute("href", target.includes("?") && m[2].startsWith("?") ? target + "&" + m[2].slice(1) : target + m[2]);
  });
}

let pageLive = false;
export function isLivePage() { return pageLive; }

// Destination / guide pages: replace the bundled <main> with the current one from keywordtrip.com.
export async function hydratePage(nativeFetch) {
  const here = cleanPath(location.pathname);
  const remote = here === "/trips/remote";
  const p = remote ? new URLSearchParams(location.search).get("p") || "" : here;
  if (!LIVE_PATH.test(p)) return;
  const main = document.querySelector("main");
  try {
    const r = await withTimeout(nativeFetch(SITE + "/api/kt-page?p=" + encodeURIComponent(p), { cache: "no-store" }), PAGE_TIMEOUT);
    if (!r.ok) throw new Error(String(r.status));
    const doc = new DOMParser().parseFromString(await r.text(), "text/html");
    const next = doc.querySelector("main");
    if (!next || !main) throw new Error("no_main");
    next.querySelectorAll("script, iframe, object, embed").forEach((n) => n.remove());
    next.querySelectorAll("*").forEach((n) => {
      for (const at of Array.from(n.attributes)) if (/^on/i.test(at.name)) n.removeAttribute(at.name);
    });
    rewriteLinks(next);
    main.replaceWith(document.importNode(next, true));
    const t = doc.querySelector("title");
    if (t && t.textContent) document.title = t.textContent;
    pageLive = true;
    document.documentElement.dataset.ktPage = "live";
    // Refresh exchange-rate text in the new content.
    const fx = document.createElement("script");
    fx.src = "/assets/trip-fx.js";
    document.body.appendChild(fx);
  } catch (e) {
    if (remote && main) {
      main.innerHTML = '<p class="sub">지금은 이 여행지 정보를 불러올 수 없어요. 잠시 후 다시 열어 주세요.</p><p><a class="cta" href="/index.html">키워드트립 첫 화면으로 →</a></p>';
    }
  }
}
