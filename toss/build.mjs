// Builds the Apps in Toss web bundle (toss/dist) from the KeywordTrip static site.
// Site files are copied as they are; only Toss-required adaptations are applied.
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
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

// Bridge script (bundles the Apps in Toss SDK) + Toss-only stylesheet.
await build({
  entryPoints: [path.join(here, "src/bridge.js")],
  outfile: path.join(OUT, "assets/toss-bridge.js"),
  bundle: true,
  format: "iife",
  target: ["es2019", "safari14"],
  minify: true,
  legalComments: "none",
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
