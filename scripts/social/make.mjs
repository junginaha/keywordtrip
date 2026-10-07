// Builds today's Instagram reel (9:16 MP4 + cover + caption) from KeywordTrip's own data.
// Output: social/out/YYYY-MM-DD/{reel.mp4,cover.jpg,caption.txt,meta.json} and social/index.html.
// Run: node scripts/social/make.mjs [--format=fx|qa|best] [--date=YYYY-MM-DD]
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { chromium } from "playwright";

const root = process.cwd();
const arg = k => (process.argv.find(a => a.startsWith(`--${k}=`)) || "").split("=")[1];
const today = arg("date") || new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const dow = new Date(today + "T12:00:00+09:00").getDay(); // 0=Sun
const FORMAT = arg("format") || process.env.FORMAT || (dow === 0 ? "best" : [1, 3, 5].includes(dow) ? "fx" : "qa");

const { DEST, INFO, CUR } = new Function(fs.readFileSync(path.join(root, "assets/data.js"), "utf8") + ";return {DEST,INFO,CUR};")();
const QA = JSON.parse(fs.readFileSync(path.join(root, "assets/qa.json"), "utf8"));
const statePath = path.join(root, "social/state.json");
const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, "utf8")) : { usedQ: [], fxTurn: 0 };
const outDir = path.join(root, "social/out", today);
fs.mkdirSync(outDir, { recursive: true });

const byId = new Map(DEST.map(d => [d.id, d]));
const NAME = Object.fromEntries(QA.core.map(c => [c[0], c[1]]));
const TOPIC = Object.fromEntries(QA.topics);
const TAGS = {
  jp: ["일본여행", "도쿄여행", "오사카여행", "후쿠오카여행"], vn: ["베트남여행", "다낭여행", "나트랑여행", "푸꾸옥"], th: ["태국여행", "방콕여행", "푸켓여행"],
  tw: ["대만여행", "타이베이여행"], ph: ["필리핀여행", "세부여행", "보라카이"], sg: ["싱가포르여행"], hk: ["홍콩여행", "마카오여행"],
  us: ["미국여행", "뉴욕여행", "하와이여행"], fr: ["프랑스여행", "파리여행", "유럽여행"], it: ["이탈리아여행", "로마여행", "유럽여행"],
};
const TOPIC_TAGS = { "exchange-rate": ["환율", "환전"], weather: ["여행날씨", "여행시기"], entry: ["입국심사", "무비자"], transportation: ["공항가는법", "해외교통"], hotels: ["숙소추천", "호텔추천"], esim: ["이심", "해외유심"], prices: ["여행경비", "해외물가"], safety: ["여행안전", "여행꿀팁"], packing: ["여행준비물", "해외여행준비"] };
const BASE_TAGS = ["해외여행", "여행정보", "여행꿀팁", "키워드트립"];
const hashtags = (cc, topic) => [...new Set([...(TAGS[cc] || []), ...(TOPIC_TAGS[topic] || []), ...BASE_TAGS])].slice(0, 12).map(t => "#" + t).join(" ");

/* ---- FX helpers (same convention as the site: 100엔 = 849.39원) ---- */
const FX_UNIT = { JPY: 100, VND: 100, IDR: 100 };
const unitFor = c => { if (FX_UNIT[c]) return FX_UNIT[c]; const per = 1 / INFO.fx.r[c]; for (const m of [1, 100, 1000, 10000]) if (per * m >= 1) return m; return 10000; };
const won = v => v.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "원";
const label = (c, n) => { const nm = CUR[c] || c; return n.toLocaleString("ko-KR") + (/\s/.test(nm) ? " " : "") + nm; };
const quote = c => `${label(c, unitFor(c))} = ${won(unitFor(c) / INFO.fx.r[c])}`;
const fxDay = new Date(INFO.fx.t).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" });
const SRC = { koreaexim: "한국수출입은행 매매기준율", ecb: "ECB 기준환율", erapi: "ExchangeRate-API" };

/* ---- build the storyboard ---- */
let frames, caption, meta;
const splitAnswer = a => { // max two cards, sentence boundaries
  const s = a.match(/[^.!?]+[.!?]?/g).map(x => x.trim()).filter(Boolean);
  if (a.length <= 80 || s.length < 2) return [a];
  let i = 1, best = 1, diff = 1e9; for (; i < s.length; i++) { const l = s.slice(0, i).join(" ").length, d = Math.abs(a.length / 2 - l); if (d < diff) { diff = d; best = i; } }
  return [s.slice(0, best).join(" "), s.slice(best).join(" ")];
};

if (FORMAT === "fx") {
  const ROT = [["jp", "JPY"], ["vn", "VND"], ["th", "THB"], ["tw", "TWD"], ["us", "USD"], ["hk", "HKD"], ["ph", "PHP"], ["sg", "SGD"], ["fr", "EUR"]];
  const [cc, cur] = ROT[state.fxTurn % ROT.length]; state.fxTurn++;
  const others = ["JPY", "USD", "VND", "THB", "EUR", "TWD"].filter(c => c !== cur).slice(0, 4);
  const q = quote(cur), [lead, value] = q.split(" = ");
  frames = [
    { type: "hook", tag: "여행 전 환율 체크", text: `${NAME[cc]} 환율 얼마예요?`, sub: `${fxDay} 기준 →` },
    { type: "big", tag: `${NAME[cc]} · 환율`, lead: lead + " =", value, meta: `${fxDay} 기준 · ${SRC[(INFO.fx.s || {})[cur] || "erapi"]}\n은행 매매기준율과 같은 중간값이에요. 실제 환전·카드 결제엔 수수료가 붙어요.` },
    { type: "grid", tag: "다른 여행지는?", title: "오늘의 여행 환율", rows: others.map(c => quote(c).split(" = ")), meta: `${fxDay} 기준` },
    { type: "cta", title: "환율·입국·날씨\n검색 한 번으로", query: `${NAME[cc]} 환율`, chips: ["환율", "날씨", "입국", "교통", "숙소"] },
  ];
  caption = `${NAME[cc]} 환율 얼마예요?\n\n${fxDay} 기준 ${q}\n${others.map(quote).join("\n")}\n\n은행 매매기준율과 같은 중간값이라 실제 환전·카드 결제에는 수수료가 붙어요. 결제할 때 원화결제(DCC)는 거절하고 현지 통화로!\n\n여행 전 환율·입국·날씨는 프로필 링크 keywordtrip.com 에서 검색하세요.\n\n${hashtags(cc, "exchange-rate")} #${({ JPY: "엔화", USD: "달러환율", VND: "베트남동", THB: "바트", TWD: "대만달러", HKD: "홍콩달러", PHP: "페소", SGD: "싱가포르달러", EUR: "유로" })[cur]}`;
  meta = { format: "fx", cc, cur, quote: q };
} else if (FORMAT === "best") {
  const m = (new Date(today + "T12:00:00+09:00").getMonth() + 1) % 12 + 1; // next month
  const seen = new Set(), picks = DEST.filter(d => !d.country && d.best.includes(m) && !seen.has(d.cc) && seen.add(d.cc)).slice(0, 5);
  frames = [
    { type: "hook", tag: "다음 달 여행 어디 가지?", text: `${m}월에 가기 좋은\n해외여행지?`.replace("\n", " "), sub: "TOP 5 →" },
    { type: "list", tag: `${m}월 여행 적기`, title: `${m}월에 딱 좋은 곳`, rows: picks.map(d => [d.city, d.kw.join(" · ")]) },
    { type: "cta", title: "적기·환율·입국\n한 번에 보기", query: `${m}월 여행`, chips: picks.slice(0, 4).map(d => d.city) },
  ];
  caption = `${m}월에 가기 좋은 해외여행지 TOP 5\n\n${picks.map((d, i) => `${i + 1}. ${d.city} — ${d.kw.join(" · ")}`).join("\n")}\n\n일반 기후·성수기 기준 추천이에요. 비자·환율·현지 시각까지 프로필 링크 keywordtrip.com 에서 '${m}월 여행'으로 검색해 보세요.\n\n#${m}월여행 #${m}월해외여행 #여행지추천 ${hashtags("", "weather")}`;
  meta = { format: "best", month: m, picks: picks.map(d => d.id) };
} else {
  // Q&A: interleave countries so consecutive posts differ; skip ones already used
  const pool = QA.qa.filter(o => !o.fx && !o.main && o.a.length <= 150 && !state.usedQ.includes(o.q));
  const order = ["vn", "jp", "th", "tw", "hk", "ph", "sg", "us", "fr", "it"];
  const lastCc = state.lastCc;
  const pick = order.map(cc => pool.find(o => o.c === cc)).filter(Boolean).find(o => o.c !== lastCc) || pool[0] || QA.qa.find(o => !o.fx);
  state.usedQ.push(pick.q); state.lastCc = pick.c;
  const parts = splitAnswer(pick.a), tag = `${NAME[pick.c]} · ${TOPIC[pick.t]}`;
  const city = pick.city && byId.get(pick.city);
  frames = [
    { type: "hook", tag: `${NAME[pick.c]} 여행 질문`, text: pick.q, sub: "10초 답 →" },
    ...parts.map((a, i) => ({ type: "answer", tag, q: pick.q, a, page: parts.length > 1 ? `${i + 1} / ${parts.length}` : "" })),
    { type: "cta", query: `${city ? city.city : NAME[pick.c]} ${TOPIC[pick.t]}`, chips: [TOPIC[pick.t], ...QA.topics.map(t => t[1]).filter(l => l !== TOPIC[pick.t]).slice(0, 4)] },
  ];
  caption = `${pick.q}\n\n${pick.a}\n\n${NAME[pick.c]} 환율·날씨·입국·교통이 궁금하면 프로필 링크 keywordtrip.com 에서 '${city ? city.city : NAME[pick.c]} ${TOPIC[pick.t]}'로 검색하세요.\n\n${hashtags(pick.c, pick.t)}`;
  meta = { format: "qa", cc: pick.c, topic: pick.t, q: pick.q, url: "https://keywordtrip.com" + pick.u };
}

/* ---- render frames ---- */
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
const tpl = "file://" + path.join(root, "scripts/social/frame.html");
const pngs = [];
for (let i = 0; i < frames.length; i++) {
  await page.goto(tpl + "?i=" + i + "#" + encodeURIComponent(JSON.stringify(frames[i])));
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(() => document.fonts && document.fonts.ready);
  const f = path.join(outDir, `f${i}.png`); await page.screenshot({ path: f }); pngs.push(f);
}
await browser.close();

/* ---- assemble MP4: gentle zoom per card + crossfades, silent AAC track ---- */
const FPS = 30, X = 0.35;
const durs = frames.map(f => f.type === "hook" ? 2.6 : f.type === "cta" ? 3.2 : f.type === "list" || f.type === "grid" ? 4.6 : Math.min(6, 3 + (f.a || "").length / 40));
const args = ["-y"];
pngs.forEach((p, i) => args.push("-loop", "1", "-t", String(durs[i]), "-i", p));
args.push("-f", "lavfi", "-t", String(durs.reduce((a, b) => a + b, 0)), "-i", "anullsrc=r=44100:cl=stereo");
let fc = pngs.map((_, i) => `[${i}:v]scale=1188:2112,zoompan=z='min(zoom+0.0007,1.06)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${Math.round(durs[i] * FPS)}:s=1080x1920:fps=${FPS},format=yuv420p,setsar=1[v${i}]`).join(";");
let last = "v0", off = 0;
for (let i = 1; i < pngs.length; i++) { off += durs[i - 1] - X; fc += `;[${last}][v${i}]xfade=transition=slideleft:duration=${X}:offset=${off.toFixed(2)}[x${i}]`; last = `x${i}`; }
args.push("-filter_complex", fc, "-map", `[${last}]`, "-map", `${pngs.length}:a`, "-shortest", "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-r", String(FPS), "-crf", "23", "-preset", "medium", "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", path.join(outDir, "reel.mp4"));
execFileSync("ffmpeg", args, { stdio: ["ignore", "ignore", "inherit"] });
execFileSync("ffmpeg", ["-y", "-i", pngs[0], "-q:v", "3", path.join(outDir, "cover.jpg")], { stdio: "ignore" });
pngs.forEach(p => fs.unlinkSync(p));

fs.writeFileSync(path.join(outDir, "caption.txt"), caption);
fs.writeFileSync(path.join(outDir, "meta.json"), JSON.stringify({ date: today, ...meta, published: null }, null, 1));
state.usedQ = state.usedQ.slice(-400);
fs.writeFileSync(statePath, JSON.stringify(state, null, 1));

/* ---- keep the last 14 days, rebuild the download page ---- */
const days = fs.readdirSync(path.join(root, "social/out")).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().reverse();
for (const d of days.slice(14)) fs.rmSync(path.join(root, "social/out", d), { recursive: true, force: true });
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const cards = days.slice(0, 14).map(d => {
  const dir = path.join(root, "social/out", d); if (!fs.existsSync(path.join(dir, "meta.json"))) return "";
  const m = JSON.parse(fs.readFileSync(path.join(dir, "meta.json"), "utf8")), cap = fs.readFileSync(path.join(dir, "caption.txt"), "utf8");
  return `<article><h2>${d} <small>${esc(m.format)}${m.published ? ` · <a href="${esc(m.published.permalink || "#")}">게시됨</a>` : " · 미게시"}</small></h2>
<video src="/social/out/${d}/reel.mp4" poster="/social/out/${d}/cover.jpg" controls playsinline preload="none"></video>
<p><a class="btn" href="/social/out/${d}/reel.mp4" download>영상 저장</a><button class="btn" onclick="navigator.clipboard.writeText(this.parentNode.nextElementSibling.value);this.textContent='복사됨'">캡션 복사</button></p>
<textarea readonly>${esc(cap)}</textarea></article>`;
}).join("\n");
fs.writeFileSync(path.join(root, "social/index.html"), `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>키워드트립 릴스 보관함</title>
<style>body{margin:0;background:#0C1020;color:#F2F3F8;font:15px/1.6 system-ui,"Noto Sans KR",sans-serif}main{max-width:560px;margin:auto;padding:20px 16px 60px}h1{font-size:22px}article{margin:0 0 28px;padding:14px;border:1px solid #252C45;border-radius:16px;background:#11172A}h2{font-size:16px;margin:0 0 10px}small{color:#A3A9C2;font-weight:400}video{width:100%;border-radius:12px;background:#000;aspect-ratio:9/16}textarea{width:100%;min-height:160px;margin-top:8px;background:#0C1020;color:#F2F3F8;border:1px solid #252C45;border-radius:10px;padding:10px;font:14px/1.5 inherit}.btn{display:inline-block;margin-right:8px;padding:10px 14px;border-radius:10px;border:1.5px solid #39FF14;background:none;color:#F2F3F8;font:700 14px inherit;text-decoration:none}a{color:#FF1FAF}</style></head>
<body><main><h1>키워드트립 릴스 보관함</h1><p>매일 자동으로 만들어지는 인스타그램 릴스입니다. 자동 게시가 꺼져 있으면 여기서 영상을 저장하고 캡션을 복사해 올리세요.</p>${cards}</main></body></html>`);
console.log(`made ${FORMAT} reel for ${today}: ${frames.length} cards, ${durs.reduce((a, b) => a + b, 0).toFixed(1)}s → social/out/${today}/`);
