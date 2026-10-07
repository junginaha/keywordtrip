// Generates static destination pages, the /trips directory, sitemap.xml and llms.txt files
// from assets/data.js. Run: node scripts/build-pages.mjs
import fs from "node:fs";
import path from "node:path";
import { CORE, TOPICS, AIRPORT, TOPIC_WORDS, FLIGHT_WORDS } from "./data/core.mjs";

const root = process.cwd();
const HOST = "https://keywordtrip.com";
// Shared affiliate config (assets/affiliate.js sets globalThis.KTAffiliate)
new Function(fs.readFileSync(path.join(root, "assets/affiliate.js"), "utf8"))();
const AFF = globalThis.KTAffiliate;
const noBook = x => isBan(x) || x.cc === "KP"; // no booking CTA where Korean nationals may not travel freely
const bookHtml = (x, name) => noBook(x) ? "" : `<section class="card book" aria-label="${esc(name)} 예약">
<h2>${esc(name)}, 실제로 떠난다면</h2>
<div class="bookgrid">${[["flights", "항공권 가격"], ["stay", "숙소 가격"], ["activity", "투어·입장권"]].map(([k, l]) => `<a class="bookbtn" href="${esc(AFF.LINKS[k](x))}" target="_blank" rel="${AFF.REL}" data-p="${k}" data-d="${esc(x.id)}">${l}</a>`).join("")}</div>
${AFF.DISCLOSURE ? `<p class="bookdisc">${esc(AFF.DISCLOSURE)}</p>\n` : ""}</section>
<script>document.querySelectorAll(".bookbtn").forEach(a=>a.addEventListener("click",()=>{try{navigator.sendBeacon("/api/outbound",new Blob([JSON.stringify({provider:a.dataset.p,destination:a.dataset.d})],{type:"application/json"}))}catch(e){}}))</script>
`;
const { DEST, INFO, CUR } = new Function(fs.readFileSync(path.join(root, "assets/data.js"), "utf8") + ";return {DEST,INFO,CUR};")();
// content revision date (not bumped by the daily FX refresh, so lastmod stays honest)
const TODAY = INFO.rev || new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
const FAQ = JSON.parse(fs.readFileSync(path.join(root, "scripts/data/trip-faq.json"), "utf8"));

const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const url = x => `${HOST}/trips/${x.id}`;
// country entries that describe the same place as a curated city: consolidate to the curated page
const DUP = { hk: "hongkong", mo: "macau", sg: "singapore", gu: "guam", "ae-du": "dubai", "kr-jj": "jeju" };
const canon = x => DUP[x.id] ? `${HOST}/trips/${DUP[x.id]}` : url(x);
const write = (rel, s) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), s); };

/* ---- same rules as assets/app.js ---- */
const CLS = { green: { hex: "#39FF14", l: "무비자" }, blue: { hex: "#2DE2FF", l: "사전 신청" }, yellow: { hex: "#FFE600", l: "비자·허가 필요" }, orange: { hex: "#FF5E1A", l: "금지·경보" } };
const isBan = x => INFO.ban.includes(x.cc);
const isWarn = x => INFO.warn.includes(x.cc) || INFO.warnId.includes(x.id);
function vt(x) {
  let v = INFO.vtypeId[x.id] || null;
  if (!v && isBan(x)) v = ["orange", x.cc === "NE" ? "대부분 여행금지" : "여행금지", ""];
  if (!v) v = INFO.vtype[x.cc] || ["yellow", "입국 조건 확인 필요", ""];
  return v;
}
const vShort = x => { const [c, l, s] = vt(x); return c === "orange" || c === "yellow" ? l : l + (s ? " " + s : ""); };
function visaOf(x) {
  const base = INFO.sch.includes(x.cc) ? INFO.schTxt : (INFO.visa[x.cc] || "");
  return [base, INFO.note[x.cc], INFO.xvisa[x.id]].filter(Boolean).join(" ") || "출발 전 목적지 정부·이민기관의 공식 안내에서 입국 조건을 확인하세요.";
}
function officialOf(x) {
  const a = [...((INFO.official || {})[x.cc] || []), ...((INFO.sch.includes(x.cc) && INFO.schLinks) || [])];
  a.push(["외교부 해외안전여행 (여행경보·최신 공지)", "https://www.0404.go.kr/"]);
  return a;
}
function moneyOf(x) {
  let m = INFO.xmoney[x.id] || INFO.money[x.cc] || "";
  if (!m && x.cur === "XOF") m = INFO.cfaW; if (!m && x.cur === "XAF") m = INFO.cfaC; if (!m && x.cur === "XCD") m = INFO.xcd;
  return m;
}
function tipsOf(x) {
  const a = [...(INFO.xtips[x.id] || []), ...(INFO.tips[x.id] || []), ...((x.country && !x.sub && INFO.tips[x.cc]) || [])];
  if (INFO.left.includes(x.cc)) a.push("자동차는 좌측 통행(운전석이 오른쪽). 렌터카 운전과 길 건널 때 오른쪽부터 확인.");
  return [...new Set(a)];
}
function offsetMin(tz, d) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(d).map(x => [x.type, x.value]));
  return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - d.getTime()) / 60000);
}
function diffText(tz, d) {
  const m = offsetMin(tz, d) - offsetMin("Asia/Seoul", d);
  if (m === 0) return "시차 없음";
  const h = Math.floor(Math.abs(m) / 60), r = Math.abs(m) % 60;
  return `서울보다 ${h ? h + "시간" : ""}${r ? " " + r + "분" : ""} ${m < 0 ? "느림" : "빠름"}`.replace(/\s+/g, " ").trim();
}
function tzLine(x) {
  const jan = new Date(Date.UTC(2026, 0, 15)), jul = new Date(Date.UTC(2026, 6, 15));
  const a = diffText(x.tz, jan), b = diffText(x.tz, jul);
  return a === b ? a : `${b} (서머타임 기간) · ${a} (그 외 기간)`;
}
const mText = ms => ms.map(m => m + "월").join(" · ");
function bestSpan(ms) { // compress into ranges in seasonal order, e.g. 11월~2월
  const set = new Set(ms); if (set.size === 12) return "연중";
  let start = 1; while (set.has(start) && set.size < 12) start = start % 12 + 1; // first non-best month
  const out = []; let run = [];
  for (let i = 0; i < 12; i++) { const m = (start - 1 + i) % 12 + 1; if (set.has(m)) run.push(m); else if (run.length) { out.push(run); run = []; } }
  if (run.length) out.push(run);
  return out.map(r => r.length > 2 ? `${r[0]}월~${r[r.length - 1]}월` : r.map(m => m + "월").join("·")).join(", ");
}
const fxDate = new Date(INFO.fx.t).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" });
const FX_UNIT = { JPY: 100, VND: 100, IDR: 100 };
const FX_SRC = { koreaexim: "한국수출입은행 매매기준율", ecb: "ECB 기준환율", erapi: "ExchangeRate-API" };
function unitFor(c) { if (FX_UNIT[c]) return FX_UNIT[c]; const per = 1 / INFO.fx.r[c]; for (const m of [1, 100, 1000, 10000, 100000]) if (per * m >= 1) return m; return 100000; }
const curLabel = (c, n) => { const nm = CUR[c] || c; return n.toLocaleString("ko-KR") + (/\s/.test(nm) ? " " : "") + nm; };
const wonText = v => v.toLocaleString("ko-KR", { minimumFractionDigits: v >= 10000 ? 0 : 2, maximumFractionDigits: v >= 10000 ? 0 : 2 }) + "원";
function rateLine(x) {
  const r = INFO.fx.r[x.cur]; if (!r || x.cur === "KRW") return "";
  const u = unitFor(x.cur);
  return `${curLabel(x.cur, u)} = ${wonText(u / r)}`;
}
const fxSrc = c => FX_SRC[(INFO.fx.s && INFO.fx.s[c]) || "erapi"];
const fxSpan = x => `<span data-fx="${x.cur}">${esc(rateLine(x))}</span>`;
const fxWhen = x => `<span data-fx-when>${fxDate}</span> 기준 · <span data-fx-src="${x.cur}">${esc(fxSrc(x.cur))}</span>`;
const josa = (w, a, b) => { const c = [...String(w).replace(/\s*\(.*\)$/, "")].pop() || ""; const k = c.charCodeAt(0) - 0xAC00; return w + (k >= 0 && k <= 11171 ? (k % 28 ? a : b) : b); };
const curName = x => `${CUR[x.cur] || x.cur} (${x.cur})`;
const placeName = x => x.country ? x.city : `${x.city}`;
const ctx = x => x.country ? (x.cap ? `${x.c}` : x.reg) : `${x.c} · ${x.reg}`;

/* ---- related links ---- */
const curated = DEST.filter(d => !d.country), countries = DEST.filter(d => d.country);
function related(x) {
  const same = DEST.filter(d => d.cc === x.cc && d.id !== x.id);
  const regionPool = (x.country ? countries : curated).filter(d => d.reg === x.reg && d.cc !== x.cc);
  const i = Math.max(0, regionPool.findIndex(d => d.id > x.id));
  const near = [...regionPool.slice(i), ...regionPool.slice(0, i)].slice(0, 6);
  return { same, near };
}

/* ---- page ---- */
const months12 = x => Array.from({ length: 12 }, (_, i) => `<li class="${x.best.includes(i + 1) ? "on" : ""}${x.wet && x.wet.includes(i + 1) ? " wet" : ""}"><span>${i + 1}</span></li>`).join("");

function page(x) {
  const name = placeName(x), [vc] = vt(x), status = vShort(x), u = url(x);
  const kw = x.kw.join("·"), best = bestSpan(x.best);
  const lead = x.hook || `${x.kw.join(", ")}로 기억되는 곳.`;
  const title = `${name} 여행 | ${kw} · 여행 적기·비자·환율 | 키워드트립`;
  const desc = `${name} 여행 적기는 ${best}. 한국 여권 기준 ${status}${x.cur && x.cur !== "KRW" ? `, 통화는 ${CUR[x.cur] || x.cur}` : ""}. ${x.kw.join("·")} 키워드로 고르는 ${name}의 입국·환율·시차·현지 팁을 한눈에.`;
  const visa = visaOf(x), money = moneyOf(x), tips = tipsOf(x), rate = rateLine(x), tzl = tzLine(x);
  const warn = vc === "orange" || isWarn(x);
  const faqs = [
    ...(FAQ[x.id] || []),
    [`${name} 여행 적기는 언제인가요?`, `일반 기후 기준 추천 시기는 ${mText(x.best)}입니다.${x.wet ? ` ${mText(x.wet)}은 우기라 비와 습도를 고려하세요.` : ""} 실제 일정은 출발 직전 날씨와 현지 상황을 함께 확인하세요.`],
    [`한국인은 ${name}에 비자 없이 갈 수 있나요?`, `${status}. ${visa}`],
    ...(x.cur && x.cur !== "KRW" ? [[`${name}에서는 어떤 돈을 쓰나요?`, `통화는 ${curName(x)}입니다.${rate ? ` ${fxDate} 기준 ${rate}.` : ""}${money ? " " + money : ""}`]] : []),
    [`${josa(name, "과", "와")} 서울의 시차는 얼마인가요?`, `${tzl}.`],
  ];
  const { same, near } = related(x);
  const ld = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", "@id": u + "#webpage", url: u, name: title, description: desc, inLanguage: "ko-KR", dateModified: TODAY,
      mainEntity: { "@id": u + "#destination" }, breadcrumb: { "@id": u + "#breadcrumb" }, isPartOf: { "@id": HOST + "/#website" } },
    { "@type": "TouristDestination", "@id": u + "#destination", name: `${name} (${x.en})`, alternateName: x.en, description: `${x.kw.join(", ")}. ${lead}`, touristType: x.kw, url: u,
      ...(x.country && x.cap ? { containsPlace: { "@type": "City", name: x.cap } } : {}) },
    { "@type": "BreadcrumbList", "@id": u + "#breadcrumb", itemListElement: [
      { "@type": "ListItem", position: 1, name: "키워드트립", item: HOST + "/" },
      { "@type": "ListItem", position: 2, name: "전체 여행지", item: HOST + "/trips" },
      { "@type": "ListItem", position: 3, name: `${name} 여행`, item: u }] },
    { "@type": "FAQPage", mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
  ] };
  const link = d => `<a href="/trips/${d.id}"><b>${esc(d.city)}${d.country && !x.country ? " 전체" : ""}</b><small>${esc(vShort(d))}</small></a>`;
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<link rel="canonical" href="${canon(x)}">
<link rel="stylesheet" href="/assets/trip.css">
<link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png">
<meta property="og:type" content="article">
<meta property="og:site_name" content="KeywordTrip">
<meta property="og:locale" content="ko_KR">
<meta property="og:url" content="${u}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${HOST}/icons/icon-512.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0C1020">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
${rate ? `<script src="/assets/trip-fx.js" defer></script>\n` : ""}</head>
<body>
<main class="w">
<nav class="crumb" aria-label="현재 위치"><a href="/">키워드트립</a><span>›</span><a href="/trips">전체 여행지</a><span>›</span><span>${esc(name)}</span></nav>
<header class="hero">
<p class="eyebrow">${x.f ? x.f + " " : ""}${esc(ctx(x))}</p>
<h1>${esc(name)} <span class="en">${esc(x.en)}</span></h1>
<p class="kw">${x.kw.map(k => `<span>${esc(k)}</span>`).join("")}</p>
<p class="hook">${esc(lead)}</p>
</header>
${keywordBar(x)}${warn ? `<p class="alert" role="note">외교부 여행경보가 발령된 국가·지역입니다. 출발 전 <a href="https://www.0404.go.kr" target="_blank" rel="noopener">해외안전여행</a>에서 최신 단계를 반드시 확인하세요.</p>\n` : ""}<dl class="facts" aria-label="핵심 정보">
<div><dt>입국 (한국 여권)</dt><dd><i class="dot" style="--vc:${CLS[vc].hex}"></i>${esc(status)}</dd></div>
<div><dt>여행 적기</dt><dd>${esc(best)}</dd></div>
<div><dt>통화</dt><dd>${esc(curName(x))}${rate ? `<small>${fxSpan(x)} · <span data-fx-when>${fxDate}</span> 기준</small>` : ""}</dd></div>
<div><dt>시차</dt><dd>${esc(tzl)}</dd></div>
</dl>
<section class="card">
<h2>${esc(name)} 여행 적기는 언제인가요?</h2>
<ol class="months" aria-label="월별 여행 적기">${months12(x)}</ol>
<p class="legend"><span class="k on"></span>적기${x.wet ? `<span class="k wet"></span>우기` : ""}</p>
<p>일반 기후 기준 추천 시기는 <b>${esc(best)}</b>입니다.${x.wet ? ` ${esc(bestSpan(x.wet))}은 우기라 비와 습도를 고려하세요.` : ""}</p>
</section>
<section class="card">
<h2>한국인 입국 조건</h2>
<p class="badge" style="--vc:${CLS[vc].hex}">${esc(status)}</p>
<p>${esc(visa)}</p>
<p class="offl"><span>공식 확인처</span>${officialOf(x).map(([l, h]) => `<a href="${h}" target="_blank" rel="noopener">${esc(l)} ↗</a>`).join("")}</p>
</section>
${x.cur && x.cur !== "KRW" ? `<section class="card">
<h2>돈과 결제</h2>
<p><b>${esc(curName(x))}</b>${rate ? ` · <b>${fxSpan(x)}</b>` : ""}</p>
${rate ? `<p class="fxnote">${fxWhen(x)}. 은행 매매기준율과 같은 중간값이며, 실제 환전·카드 결제에는 수수료가 붙습니다.</p>` : ""}
${money ? `<p>${esc(money)}</p>` : ""}
</section>
` : ""}${tips.length ? `<section class="card tips">
<h2>키워드트립 팁</h2>
<ul>${tips.map(t => `<li>${esc(t)}</li>`).join("")}</ul>
</section>
` : ""}${bookHtml(x, name)}<a class="cta" href="/?d=${x.id}">${esc(name)} 지금 현지 시각·실시간 환율 보기 →</a>
<p class="sub">규정과 가격은 바뀔 수 있으니 출발·예약 전 최신 정보를 다시 확인하세요.</p>
<section class="faq">
<h2>${esc(name)} 여행 자주 묻는 질문</h2>
${faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("\n")}
</section>
${same.length ? `<section class="rel"><h2>${esc(x.country ? `${name}의 다른 여행지` : `${x.c} 더 보기`)}</h2><div class="grid">${same.map(link).join("")}</div></section>\n` : ""}${near.length ? `<section class="rel"><h2>${esc(x.reg)}의 다른 여행지</h2><div class="grid">${near.map(link).join("")}</div></section>\n` : ""}<p class="trust">입국 정보: ${esc(INFO.visaSrc)}. 적기는 일반 기후·성수기 기준, 환율은 시장 중간값 참고치입니다. <a href="/about">출처·업데이트·제휴 기준 보기 →</a></p>
<p class="fine">마지막 수정 ${TODAY} · <a href="/trips">전체 여행지 ${DEST.length}곳</a> · KeywordTrip</p>
</main>
</body>
</html>
`;
}

/* ---- directory ---- */
const REG = ["아시아", "중동", "유럽", "아프리카", "북미", "중남미", "오세아니아", "남극"];
function directory() {
  const row = d => `<li><a href="/trips/${d.id}"><i class="dot" style="--vc:${CLS[vt(d)[0]].hex}"></i><b>${esc(d.city)}</b><small>${esc(vShort(d))} · 적기 ${esc(bestSpan(d.best))}</small></a></li>`;
  const byReg = REG.map(r => [r, countries.filter(d => d.reg === r).sort((a, b) => a.city.localeCompare(b.city, "ko"))]).filter(([, a]) => a.length);
  const title = `해외 여행지 전체 목록 ${countries.length}곳 | 비자·여행 적기 한눈에 | 키워드트립`;
  const desc = `키워드트립 추천 도시 ${curated.length}곳과 TCC 기준 ${countries.length}개 국가·지역의 한국인 입국 조건(무비자·사전 신청·비자)과 여행 적기를 한 페이지에서 비교하세요.`;
  const ld = { "@context": "https://schema.org", "@graph": [
    { "@type": "CollectionPage", "@id": HOST + "/trips#webpage", url: HOST + "/trips", name: title, description: desc, inLanguage: "ko-KR", dateModified: TODAY, isPartOf: { "@id": HOST + "/#website" } },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "키워드트립", item: HOST + "/" }, { "@type": "ListItem", position: 2, name: "전체 여행지", item: HOST + "/trips" }] }] };
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<link rel="canonical" href="${HOST}/trips">
<link rel="stylesheet" href="/assets/trip.css">
<link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png">
<meta property="og:type" content="website">
<meta property="og:site_name" content="KeywordTrip">
<meta property="og:url" content="${HOST}/trips">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${HOST}/icons/icon-512.png">
<meta name="theme-color" content="#0C1020">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
</head>
<body>
<main class="w wide">
<nav class="crumb" aria-label="현재 위치"><a href="/">키워드트립</a><span>›</span><span>전체 여행지</span></nav>
<header class="hero">
<p class="eyebrow">한국 여권 기준 · ${new Date(TODAY).toLocaleDateString("ko-KR",{month:"long",day:"numeric"})} 업데이트</p>
<h1>해외 여행지 전체 목록</h1>
<p class="hook">추천 도시 ${curated.length}곳과 ${countries.length}개 국가·지역의 입국 조건과 여행 적기를 한 번에 비교하세요.</p>
<p class="key">${Object.values(CLS).map(o => `<span><i class="dot" style="--vc:${o.hex}"></i>${o.l}</span>`).join("")}</p>
</header>
<section class="dir"><h2>키워드트립 추천 도시 <small>${curated.length}곳</small></h2><ul>${curated.map(row).join("")}</ul></section>
${byReg.map(([r, a]) => `<section class="dir"><h2>${r} <small>${a.length}곳</small></h2><ul>${a.map(row).join("")}</ul></section>`).join("\n")}
<p class="trust">국가·지역 분류는 여행자 클럽 TCC(Travelers' Century Club) 기준이라 독립국이 아닌 곳도 포함됩니다. 입국 정보: ${esc(INFO.visaSrc)}. <a href="/about">출처·업데이트 기준 보기 →</a></p>
<p class="fine">마지막 수정 ${TODAY} · KeywordTrip</p>
</main>
</body>
</html>
`;
}

/* ---- core destinations: keyword topics & question pages ---- */
const byId = new Map(DEST.map(d => [d.id, d]));
const CORE_BY = new Map(CORE.map(c => [c.id, c]));
const coreOf = x => CORE_BY.get(x.id) || (!x.country ? CORE.find(c => c.cities.includes(x.id)) : (x.country && !x.sub && CORE_BY.get(x.cc.toLowerCase()) && x.id === x.cc.toLowerCase() ? CORE_BY.get(x.id) : null));
const topicUrl = (c, k) => `/trips/${c.id}/${k}`;
const qid = q => "q-" + [...q].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7).toString(36);
function keywordBar(x, cur) {
  const c = coreOf(x); if (!c) return "";
  const chips = TOPICS.map(t => `<a href="${topicUrl(c, t.key)}"${cur === t.key ? ' aria-current="page"' : ""}>${t.label}</a>`);
  if (c.grab) chips.splice(4, 0, `<a href="${topicUrl(c, "transportation")}#grab">Grab</a>`);
  return `<nav class="kwbar" aria-label="${esc(c.name)} 여행 핵심 키워드">${chips.join("")}</nav>\n`;
}
const flightCta = (id, label) => AIRPORT[id] ? `<a class="bookbtn" href="${esc(AFF.trip(`/flights/airport-icn-${AIRPORT[id]}/`, `flight-${id}`))}" target="_blank" rel="${AFF.REL}" data-p="flights" data-d="${esc(id)}">서울 → ${esc(label)} 항공편 확인</a>` : "";
const hotelCta = (id, kw, label) => `<a class="bookbtn" href="${esc(AFF.trip("/global-search/searchlist/search", `stay-${id}`, { keyword: kw }))}" target="_blank" rel="${AFF.REL}" data-p="stay" data-d="${esc(id)}">${esc(label)}</a>`;
const beacon = `<script>document.querySelectorAll(".bookbtn").forEach(a=>a.addEventListener("click",()=>{try{navigator.sendBeacon("/api/outbound",new Blob([JSON.stringify({provider:a.dataset.p,destination:a.dataset.d})],{type:"application/json"}))}catch(e){}}))</script>`;

// Full Q&A list for one topic (shared by the static page, JSON-LD and the search index)
function topicQA(c, t) {
  const home = byId.get(c.id), d = c.t[t.key], name = c.name, cities = c.cities.map(id => byId.get(id)).filter(Boolean);
  const main = {
    "exchange-rate": `${name} 환율·환전은 어떻게 하나요?`, weather: `${name} 날씨, 언제 가는 게 좋나요?`, entry: `한국인 ${name} 입국 조건은?`,
    transportation: `${name} 공항에서 시내까지 어떻게 가나요?`, hotels: `${name} 숙소는 어느 지역이 좋나요?`, esim: `${name} 유심·eSIM은 뭘 쓰나요?`,
    prices: `${name} 물가는 어느 정도인가요?`, safety: `${name} 여행, 안전한가요?`, packing: `${name} 여행 준비물은? 콘센트는 뭘 쓰나요?`,
  }[t.key];
  const out = [{ q: main, a: d.a, main: true }];
  if (t.key === "exchange-rate" && home.cur !== "KRW") out.push({ q: `${name} 환율은 얼마인가요?`, a: `${fxDate} 기준 ${rateLine(home)}입니다(${fxSrc(home.cur)}). 은행 매매기준율과 같은 중간값이라 실제 환전·카드 결제에는 수수료가 붙습니다.`, fx: true });
  if (t.key === "entry") out.push({ q: `한국인은 ${name}에 무비자로 갈 수 있나요?`, a: `${vShort(home)}. ${visaOf(home)}` });
  for (const [q, a] of d.qa) out.push({ q, a, id: /grab/i.test(q) ? "grab" : undefined });
  if (t.key === "weather") for (const x of cities) out.push({ q: `${x.city} 여행 적기는 언제인가요?`, a: `${x.city}의 일반 기후 기준 추천 시기는 ${mText(x.best)}입니다.${x.wet ? ` ${mText(x.wet)}은 우기입니다.` : ""}`, city: x.id });
  if (t.key === "hotels" && d.areas) for (const x of cities) if (d.areas[x.id]) out.push({ q: `${x.city} 숙소는 어디가 좋나요?`, a: `${x.city}는 ${d.areas[x.id].join("·")} 쪽이 기본 선택지입니다.`, city: x.id });
  return out;
}

function topicPage(c, t) {
  const home = byId.get(c.id), d = c.t[t.key], name = c.name, cities = c.cities.map(id => byId.get(id)).filter(Boolean);
  const u = HOST + topicUrl(c, t.key), qa = topicQA(c, t);
  const title = `${name} ${t.h} | 키워드트립`;
  const desc = `${qa[0].q} ${d.a}`.slice(0, 155);
  let body = "";
  if (t.key === "exchange-rate" && home.cur !== "KRW") body += `<section class="card"><h2>지금 환율</h2><p class="big"><span data-fx="${home.cur}">${esc(rateLine(home))}</span></p><p class="fxnote"><span data-fx-when>${fxDate}</span> 기준 · <span data-fx-src="${home.cur}">${esc(fxSrc(home.cur))}</span>. 실제 환전·카드 결제에는 수수료가 붙습니다.</p>${moneyOf(home) ? `<p>${esc(moneyOf(home))}</p>` : ""}</section>\n`;
  if (t.key === "weather") body += `<section class="card"><h2>도시별 여행 적기</h2>${cities.map(x => `<div class="cm"><h3><a href="/trips/${x.id}">${esc(x.city)}</a></h3><ol class="months" aria-label="${esc(x.city)} 월별 여행 적기">${months12(x)}</ol></div>`).join("")}<p class="legend"><span class="k on"></span>적기<span class="k wet"></span>우기</p></section>\n`;
  if (t.key === "entry") body += `<section class="card"><h2>한국 여권 기준</h2><p class="badge" style="--vc:${CLS[vt(home)[0]].hex}">${esc(vShort(home))}</p><p>${esc(visaOf(home))}</p><p class="offl"><span>공식 확인처</span>${officialOf(home).map(([l, h]) => `<a href="${h}" target="_blank" rel="noopener">${esc(l)} ↗</a>`).join("")}</p></section>\n`;
  // booking moment only where it fits the question
  let cta = "";
  if (t.key === "hotels") cta = cities.map(x => `<div class="cm"><h3>${esc(x.city)}</h3><p class="areas">${(d.areas?.[x.id] || []).map(a => `<span>${esc(a)}</span>`).join("")}</p><div class="bookgrid auto">${hotelCta(x.id, `${x.en} hotel`, `${x.city} 호텔 보기`)}</div></div>`).join("");
  else if (t.key === "transportation") cta = `<div class="bookgrid auto">${cities.map(x => flightCta(x.id, x.city)).join("")}</div>`;
  else if (["weather", "entry", "esim", "prices", "packing", "exchange-rate"].includes(t.key)) cta = `<div class="bookgrid auto">${flightCta(cities[0]?.id || c.id, cities[0]?.city || name)}${hotelCta(cities[0]?.id || c.id, `${(cities[0] || home).en} hotel`, `${(cities[0] || home).city} 호텔 보기`)}</div>`;
  const ctaHtml = cta && !noBook(home) ? `<section class="card book" aria-label="예약"><h2>${t.key === "hotels" ? "지역을 정했다면" : t.key === "transportation" ? "항공편 확인" : "떠날 준비가 됐다면"}</h2>${cta}${AFF.DISCLOSURE ? `<p class="bookdisc">${esc(AFF.DISCLOSURE)}</p>` : ""}</section>\n${beacon}\n` : "";
  const ld = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebPage", "@id": u + "#webpage", url: u, name: title, description: desc, inLanguage: "ko-KR", dateModified: TODAY, about: { "@type": "Country", name: `${name} (${home.en})` }, breadcrumb: { "@id": u + "#breadcrumb" }, isPartOf: { "@id": HOST + "/#website" } },
    { "@type": "BreadcrumbList", "@id": u + "#breadcrumb", itemListElement: [
      { "@type": "ListItem", position: 1, name: "키워드트립", item: HOST + "/" },
      { "@type": "ListItem", position: 2, name: `${name} 여행`, item: HOST + "/trips/" + c.id },
      { "@type": "ListItem", position: 3, name: `${name} ${t.label}`, item: u }] },
    { "@type": "FAQPage", mainEntity: qa.map(o => ({ "@type": "Question", name: o.q, acceptedAnswer: { "@type": "Answer", text: o.a } })) },
  ] };
  const others = TOPICS.filter(o => o.key !== t.key);
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">
<link rel="canonical" href="${u}">
<link rel="stylesheet" href="/assets/trip.css">
<link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png">
<meta property="og:type" content="article">
<meta property="og:site_name" content="KeywordTrip">
<meta property="og:locale" content="ko_KR">
<meta property="og:url" content="${u}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${HOST}/icons/icon-512.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0C1020">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
${t.key === "exchange-rate" ? `<script src="/assets/trip-fx.js" defer></script>\n` : ""}</head>
<body>
<main class="w">
<nav class="crumb" aria-label="현재 위치"><a href="/">키워드트립</a><span>›</span><a href="/trips/${c.id}">${esc(name)}</a><span>›</span><span>${esc(t.label)}</span></nav>
<header class="hero slim">
<p class="eyebrow">${home.f ? home.f + " " : ""}${esc(name)} 여행</p>
<h1>${esc(name)} ${esc(t.h)}</h1>
</header>
${keywordBar(home, t.key)}<section class="answer"><h2>${esc(qa[0].q)}</h2><p>${esc(d.a)}</p></section>
${body}<section class="faq">
<h2>${esc(name)} ${esc(t.label)} 자주 묻는 질문</h2>
${qa.slice(1).map(o => `<details id="${o.id || qid(o.q)}"><summary>${esc(o.q)}</summary><p>${esc(o.a)}</p></details>`).join("\n")}
</section>
${ctaHtml}<section class="rel"><h2>${esc(name)} 여행지</h2><div class="grid"><a href="/trips/${c.id}"><b>${esc(name)} 한눈에</b><small>${esc(vShort(home))}</small></a>${cities.map(x => `<a href="/trips/${x.id}"><b>${esc(x.city)}</b><small>적기 ${esc(bestSpan(x.best))}</small></a>`).join("")}</div></section>
<p class="trust">가격·요금은 2026년 기준 대략값이며 바뀔 수 있습니다. 입국 정보: ${esc(INFO.visaSrc)}. <a href="/about">출처·업데이트·제휴 기준 보기 →</a></p>
<p class="fine">마지막 수정 ${TODAY} · <a href="/trips/${c.id}">${esc(name)} 여행</a> · KeywordTrip</p>
</main>
</body>
</html>
`;
}

/* ---- write pages ---- */
for (const x of DEST) write(`trips/${x.id}.html`, page(x));
write("trips/index.html", directory());

/* ---- homepage crawl links ---- */
const idxPath = "index.html";
let idx = fs.readFileSync(path.join(root, idxPath), "utf8");
const navStart = '<nav aria-label="추천 여행지">', navEnd = "</nav>";
const a = idx.indexOf(navStart);
if (a > 0) {
  const b = idx.indexOf(navEnd, a);
  idx = idx.slice(0, a) + navStart + `\n          <a href="/trips"><b>전체 여행지 ${DEST.length}곳</b></a>` + curated.map(d => `<a href="/trips/${d.id}">${esc(d.city)}</a>`).join("") + "\n        " + idx.slice(b);
  fs.writeFileSync(path.join(root, idxPath), idx);
}

/* ---- write core topic pages + search Q&A index ---- */
const coreUrls = [], qaIndex = [];
for (const c of CORE) for (const t of TOPICS) {
  write(`trips/${c.id}/${t.key}.html`, topicPage(c, t));
  coreUrls.push(`trips/${c.id}/${t.key}`);
  for (const o of topicQA(c, t)) qaIndex.push({ c: c.id, t: t.key, q: o.q, a: o.a, u: `/trips/${c.id}/${t.key}${o.main ? "" : "#" + (o.id || qid(o.q))}`, ...(o.city ? { city: o.city } : {}), ...(o.fx ? { fx: byId.get(c.id).cur } : {}), ...(o.main ? { main: 1 } : {}) });
}
const places = {};
for (const c of CORE) { places[c.name] = [c.id]; for (const id of c.cities) { const x = byId.get(id); if (x) places[x.city.replace(/\s/g, "")] = [c.id, id]; } }
Object.assign(places, { "도쿄": ["jp", "tokyo"], "동경": ["jp", "tokyo"], "홋카이도": ["jp", "sapporo"], "하와이": ["us", "honolulu"], "뉴욕": ["us", "newyork"], "la": ["us", "losangeles"], "엘에이": ["us", "losangeles"], "라스베가스": ["us", "lasvegas"], "호치민": ["vn", "hochiminh"], "사이공": ["vn", "hochiminh"], "냐짱": ["vn", "nhatrang"], "타이페이": ["tw", "taipei"], "푸켓": ["th", "phuket"], "싱가폴": ["sg", "singapore"], "로마": ["it", "rome"], "파리": ["fr", "paris"], "미국": ["us"], "일본": ["jp"], "베트남": ["vn"], "태국": ["th"], "대만": ["tw"], "필리핀": ["ph"], "홍콩": ["hk", "hongkong"], "마카오": ["hk", "macau"], "싱가포르": ["sg", "singapore"], "프랑스": ["fr"], "이탈리아": ["it"] });
const cityInfo = {};
for (const c of CORE) for (const id of [c.id, ...c.cities]) { const x = byId.get(id); if (x) cityInfo[id] = { n: x.city, en: x.en, ap: AIRPORT[id] || null, c: c.id }; }
write("assets/qa.json", JSON.stringify({ v: TODAY, topics: TOPICS.map(t => [t.key, t.label]), words: TOPIC_WORDS, flight: FLIGHT_WORDS, places, cities: cityInfo, core: CORE.map(c => [c.id, c.name, c.grab ? 1 : 0]), qa: qaIndex }));

/* ---- sitemap ---- */
const guides = fs.existsSync(path.join(root, "guides")) ? fs.readdirSync(path.join(root, "guides")).filter(f => f.endsWith(".html")).map(f => "guides/" + f.slice(0, -5)) : [];
const entry = (loc, freq, pr) => `  <url><loc>${HOST}/${loc}</loc><lastmod>${TODAY}</lastmod><changefreq>${freq}</changefreq><priority>${pr}</priority></url>`;
const sm = [
  entry("", "daily", "1.0"), entry("trips", "weekly", "0.9"),
  ...curated.map(d => entry("trips/" + d.id, "weekly", "0.8")),
  ...coreUrls.map(u => entry(u, "weekly", "0.7")),
  ...countries.filter(d => !DUP[d.id]).map(d => entry("trips/" + d.id, "weekly", "0.6")),
  ...guides.map(g => entry(g, "monthly", "0.6")),
  entry("about", "monthly", "0.4"),
];
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sm.join("\n")}\n</urlset>\n`);

/* ---- llms.txt ---- */
const llms = `# 키워드트립 (KeywordTrip)

> 한국 여권 소지자를 위한 한국어 여행 큐레이션. 추천 도시 ${curated.length}곳과 TCC 기준 ${countries.length}개 국가·지역의 입국 조건(무비자·사전 신청·비자), 여행 적기, 통화·환율, 서울과의 시차, 현지 팁을 정리합니다.

- 입국 정보 기준: ${INFO.visaSrc}
- 여행 적기: 일반 기후·성수기 기준 (우기 표시 포함)
- 환율: 원화 기준 중간값(은행 매매기준율과 같은 개념). 주요 통화는 ECB 기준환율, 그 밖의 통화는 ExchangeRate-API를 쓰고 두 출처를 교차 확인. ${fxDate} 기준 스냅샷이며 사이트에서는 30분마다 갱신
- 마지막 수정: ${TODAY}

## 핵심 페이지
- [전체 여행지 목록](${HOST}/trips): 모든 목적지의 입국 조건과 여행 적기 비교
- [서비스·출처·업데이트 기준](${HOST}/about)
${guides.map(g => `- [${g}](${HOST}/${g})`).join("\n")}

## 핵심 여행지 질문별 안내
${CORE.map(c => `- ${c.name}: ${TOPICS.map(t => `[${t.label}](${HOST}/trips/${c.id}/${t.key})`).join(" · ")}`).join("\n")}

## 추천 도시
${curated.map(d => `- [${d.city}](${url(d)}): ${d.c}, ${vShort(d)}, 적기 ${bestSpan(d.best)}`).join("\n")}

## 전체 데이터
- [llms-full.txt](${HOST}/llms-full.txt): 목적지별 입국·적기·통화 요약 전체
`;
write("llms.txt", llms);
const full = `# 키워드트립 목적지 데이터 (한국 여권 기준, ${TODAY})

${DEST.map(d => `## ${d.city} (${d.en})
- URL: ${url(d)}
- 지역: ${d.reg}${d.country ? "" : ` / ${d.c}`}
- 입국: ${vShort(d)} — ${visaOf(d)}
- 여행 적기: ${mText(d.best)}${d.wet ? ` / 우기: ${mText(d.wet)}` : ""}
- 통화: ${curName(d)}${rateLine(d) ? ` (${rateLine(d)}, ${fxDate} 기준)` : ""}
- 시차: ${tzLine(d)}
- 키워드: ${d.kw.join(", ")}`).join("\n\n")}
`;
write("llms-full.txt", full);

console.log(`built ${DEST.length} destination pages, /trips directory, ${sm.length} sitemap URLs, llms.txt`);
