// Generates per-destination share images og/{id}.jpg (1200x630) for Instagram/KakaoTalk link previews.
// Run after destination data changes: node scripts/og.mjs   (needs playwright + chromium)
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const { DEST, INFO } = new Function(fs.readFileSync(path.join(root, "assets/data.js"), "utf8") + ";return {DEST,INFO};")();
const CLS = { green: "#39FF14", blue: "#2DE2FF", yellow: "#FFE600", orange: "#FF5E1A" };
const isBan = x => INFO.ban.includes(x.cc);
const vt = x => INFO.vtypeId[x.id] || (isBan(x) ? ["orange", "여행금지", ""] : null) || INFO.vtype[x.cc] || ["yellow", "입국 조건 확인 필요", ""];
const vShort = x => { const [c, l, s] = vt(x); return c === "orange" || c === "yellow" ? l : l + (s ? " " + s : ""); };
function bestSpan(ms) {
  const set = new Set(ms); if (set.size === 12) return "연중";
  let start = 1; while (set.has(start)) start = start % 12 + 1;
  const out = []; let run = [];
  for (let i = 0; i < 12; i++) { const m = (start - 1 + i) % 12 + 1; if (set.has(m)) run.push(m); else if (run.length) { out.push(run); run = []; } }
  if (run.length) out.push(run);
  return out.map(r => r.length > 2 ? `${r[0]}~${r[r.length - 1]}월` : r.map(m => m + "월").join("·")).join(", ");
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const html = x => {
  const [c] = vt(x), name = x.city, len = [...name].length;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box}body{width:1200px;height:630px;background:#0C1020;color:#F2F3F8;font-family:"Black Han Sans","Noto Sans CJK KR","Noto Sans KR",sans-serif;overflow:hidden;word-break:keep-all}
.f{position:relative;width:1200px;height:630px;padding:56px 72px;display:flex;flex-direction:column}
.f::before{content:"";position:absolute;inset:0;background:radial-gradient(700px 520px at 92% 0%,rgba(255,31,175,.30),transparent 62%),radial-gradient(600px 460px at 0% 100%,rgba(45,226,255,.16),transparent 60%)}
.b{position:relative;display:flex;align-items:center;gap:14px;font-size:30px;font-weight:900}.b i{width:16px;height:16px;border-radius:50%;background:#39FF14;box-shadow:0 0 18px #39FF14}.b small{margin-left:auto;font-size:24px;font-weight:500;color:#A3A9C2}
.n{position:relative;margin-top:${len > 9 ? 70 : 56}px;font-size:${len > 12 ? 74 : len > 8 ? 96 : 128}px;line-height:1.05;font-weight:900;letter-spacing:-.02em}
.e{position:relative;margin-top:10px;font-size:30px;color:#A3A9C2;font-weight:500}
.k{position:relative;margin-top:26px;display:flex;flex-wrap:wrap;gap:12px}.k span{padding:9px 20px;border:2px solid #33405F;border-radius:999px;font-size:28px;font-weight:700;background:rgba(17,23,42,.85)}
.s{position:absolute;left:72px;right:72px;bottom:56px;display:flex;gap:16px}
.s div{flex:1;padding:18px 24px;border:2px solid #252C45;border-radius:22px;background:rgba(17,23,42,.92)}
.s dt{font-size:22px;color:#A3A9C2;font-weight:500}.s dd{margin-top:4px;font-size:34px;font-weight:900;display:flex;align-items:center;gap:12px}
.s dd i{width:16px;height:16px;border-radius:4px;background:${CLS[c]};box-shadow:0 0 12px ${CLS[c]}}
</style></head><body><div class="f"><p class="b"><i></i>키워드트립<small>keywordtrip.com</small></p>
<p class="n">${esc(name)}</p><p class="e">${esc(x.en)}${!x.country && x.c ? " · " + esc(x.c) : ""}</p>
<p class="k">${x.kw.slice(0, 3).map(k => `<span>${esc(k)}</span>`).join("")}</p>
<dl class="s"><div><dt>한국인 입국</dt><dd><i></i>${esc(vShort(x))}</dd></div><div><dt>여행 적기</dt><dd>${esc(bestSpan(x.best))}</dd></div></dl></div></body></html>`;
};

fs.mkdirSync(path.join(root, "og"), { recursive: true });
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
const only = process.argv[2] ? new Set(process.argv[2].split(",")) : null;
let n = 0;
for (const x of DEST) {
  if (only && !only.has(x.id)) continue;
  await page.setContent(html(x), { waitUntil: "load" });
  await page.screenshot({ path: path.join(root, "og", `${x.id}.jpg`), type: "jpeg", quality: 82 });
  n++;
}
await browser.close();
console.log(`og images: ${n}`);
