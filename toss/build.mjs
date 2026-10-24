// Builds the Apps in Toss web bundle (toss/dist) from the KeywordTrip static site.
// Site files are copied as they are; only Toss-required adaptations are applied.
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(here, "..");
const OUT = path.join(here, "dist");
const COPY = ["index.html", "about.html", "privacy.html", "manifest.webmanifest", "og.png", "assets", "icons", "trips", "guides"];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const item of COPY) {
  const src = path.join(SITE, item);
  if (fs.existsSync(src)) fs.cpSync(src, path.join(OUT, item), { recursive: true });
}

// Pages that ship inside the bundle, as site paths ("/trips/bali"). Anything else opens live.
const BUNDLED_PAGES = [];
(function list(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) list(f);
    else if (e.name.endsWith(".html")) {
      let p = "/" + path.relative(OUT, f).split(path.sep).join("/").replace(/\.html$/, "").replace(/(^|\/)index$/, "");
      if (p.length > 1) p = p.replace(/\/+$/, "");
      BUNDLED_PAGES.push(p || "/");
    }
  }
})(OUT);
const APP_NAME = (fs.readFileSync(path.join(here, "apps-in-toss.config.ts"), "utf8").match(/appName:\s*"([^"]+)"/) || [])[1] || "keytrip";

// Offline fallback for live data: the same values as assets/data.js, as JSON (never executed).
{
  const src = fs.readFileSync(path.join(SITE, "assets/data.js"), "utf8");
  const ctx = vm.createContext({});
  vm.runInContext(src, ctx);
  const data = vm.runInContext("({DEST,INFO,REGIONS,CUR})", ctx);
  fs.writeFileSync(path.join(OUT, "assets/data.json"), JSON.stringify(data));
}

// Shell page for destinations added to the site after this bundle was built.
{
  const base = fs.readFileSync(path.join(OUT, "trips/index.html"), "utf8");
  const shell = base
    .replace(/<title>[\s\S]*?<\/title>/i, "<title>키워드트립</title>")
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, "")
    .replace(/<main\b[\s\S]*<\/main>/i, '<main class="w"><p class="sub">여행지 정보를 불러오고 있어요…</p></main>');
  if (shell === base) throw new Error("remote shell: <main> not found in trips/index.html");
  fs.writeFileSync(path.join(OUT, "trips/remote.html"), shell);
}

// Bridge script (bundles the Apps in Toss SDK) + Toss-only stylesheet.
await build({
  entryPoints: [path.join(here, "src/bridge.js")],
  outfile: path.join(OUT, "assets/toss-bridge.js"),
  bundle: true,
  format: "iife",
  target: ["es2019", "safari14"],
  minify: true,
  legalComments: "none",
  define: { __KT_PAGES__: JSON.stringify(BUNDLED_PAGES), __KT_APP__: JSON.stringify(APP_NAME) },
});
fs.copyFileSync(path.join(here, "src/toss.css"), path.join(OUT, "assets/toss.css"));

const SITE_RE = /^https?:\/\/(?:www\.)?keywordtrip\.com/i;
function bundleHref(href) {
  let rest = href;
  if (SITE_RE.test(rest)) rest = rest.replace(SITE_RE, "") || "/";
  if (!rest.startsWith("/") || rest.startsWith("//")) return href;
  const m = rest.match(/^([^?#]*)(.*)$/);
  let p = m[1];
  const tail = m[2];
  if (p.startsWith("/api/")) return href;
  if (p === "" || p === "/") p = "/index.html";
  else if (/\.[a-z0-9]+$/i.test(p)) {}
  else if (p.endsWith("/")) p += "index.html";
  else if (p === "/trips") p = "/trips/index.html";
  else p += ".html";
  return p + tail;
}

let pages = 0, links = 0;
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f);
    else if (e.name.endsWith(".html")) transform(f);
  }
}
function transform(file) {
  let html = fs.readFileSync(file, "utf8");
  // Pinch zoom off (Toss checklist), layout unchanged.
  html = html.replace(/(<meta name="viewport" content=")([^"]*)(")/i, (all, a, c, z) =>
    a + c.replace(/,\s*maximum-scale=[^,]*/g, "").replace(/,\s*user-scalable=[^,]*/g, "") + ",maximum-scale=1,user-scalable=no" + z);
  // Bridge first, so every later script sees the adapted fetch/links.
  html = html.replace(/<meta charset="utf-8">/i, (m) => m + '\n<script src="/assets/toss-bridge.js"></script>\n<link rel="stylesheet" href="/assets/toss.css">');
  // Anchor hrefs → bundled files.
  html = html.replace(/(<a\b[^>]*?\shref=")([^"]+)(")/gi, (all, a, href, z) => {
    const next = bundleHref(href);
    if (next !== href) links++;
    return a + next + z;
  });
  html = html.replace(/<html\b([^>]*)>/i, (m, attrs) => /class="/.test(attrs) ? m.replace(/class="/, 'class="in-toss ') : `<html${attrs} class="in-toss">`);
  fs.writeFileSync(file, html);
  pages++;
}
walk(OUT);

// Home: start the site scripts after live data is in place (data.js is replaced by live JSON).
{
  const indexFile = path.join(OUT, "index.html");
  let html = fs.readFileSync(indexFile, "utf8");
  const tags = [...html.matchAll(/<script src="(\/assets\/[a-z-]+\.js)" defer><\/script>\s*/g)];
  const srcs = tags.map((m) => m[1]);
  if (!srcs.includes("/assets/data.js") || !srcs.includes("/assets/app.js")) throw new Error("index.html script block changed: " + srcs.join(","));
  for (const m of tags) html = html.replace(m[0], "");
  const bootTag = `<script>window.KTToss.boot(${JSON.stringify(srcs.filter((s) => s !== "/assets/data.js"))});</script>\n`;
  html = html.replace(/(<script id="kt-mail">)/, bootTag + "$1");
  if (!html.includes("KTToss.boot(")) throw new Error("boot tag not placed");
  fs.writeFileSync(indexFile, html);
}

// Share: Toss deep link instead of the website URL.
const appJs = path.join(OUT, "assets/app.js");
let js = fs.readFileSync(appJs, "utf8");
const before = js;
js = js.replace("async function shareTrip(x){", "async function shareTrip(x){if(window.KTToss)return window.KTToss.shareTrip(x);");
if (js === before) throw new Error("shareTrip hook not found in assets/app.js");
fs.writeFileSync(appJs, js);

// Toss checklist: no in-page link may leave to the company site.
const leftovers = [];
(function scan(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) scan(f);
    else if (e.name.endsWith(".html")) {
      const s = fs.readFileSync(f, "utf8");
      const hit = s.match(/<a\b[^>]*href="https?:\/\/(?:www\.)?keywordtrip\.com[^"]*"/i);
      if (hit) leftovers.push(path.relative(OUT, f));
    }
  }
})(OUT);
if (leftovers.length) throw new Error("Site links left: " + leftovers.slice(0, 5).join(", "));

const size = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? size(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
console.log(`toss bundle: ${pages} pages, ${links} links adapted, ${(size(OUT) / 1048576).toFixed(1)} MB`);
