// Generates seasonal/holiday guide pages under guides/ from assets/data.js (curated cities only).
// Every claim on these pages comes from site data (best months, rainy months, entry class, time zone)
// or from a dated, cited fact (holiday dates). Run before build-pages.mjs:
//   node scripts/build-guides.mjs && node scripts/build-pages.mjs && node scripts/seo-check.mjs
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const HOST = "https://keywordtrip.com";
const { DEST, INFO } = new Function(fs.readFileSync(path.join(root, "assets/data.js"), "utf8") + ";return {DEST,INFO};")();
const TODAY = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const CITIES = DEST.filter(x => !x.country && x.cc !== "KR" && !INFO.ban.includes(x.cc) && x.cc !== "KP");

/* same entry rules as scripts/build-pages.mjs */
function vt(x) {
  let v = INFO.vtypeId[x.id] || null;
  if (!v) v = INFO.vtype[x.cc] || ["yellow", "입국 조건 확인 필요", ""];
  return v;
}
const vShort = x => { const [c, l, s] = vt(x); return c === "orange" || c === "yellow" ? l : l + (s ? " " + s : ""); };

function offsetMin(tz, d) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(d).map(x => [x.type, x.value]));
  return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - d.getTime()) / 60000);
}
const diffMin = (x, month) => { const d = new Date(Date.UTC(2027, month - 1, 15)); return offsetMin(x.tz, d) - offsetMin("Asia/Seoul", d); };
function diffText(m) {
  if (m === 0) return "시차 없음";
  const h = Math.floor(Math.abs(m) / 60), r = Math.abs(m) % 60;
  return `서울보다 ${h ? h + "시간" : ""}${r ? " " + r + "분" : ""} ${m < 0 ? "느림" : "빠름"}`.replace(/\s+/g, " ").trim();
}
const mText = ms => [...ms].sort((a, b) => a - b).map(m => m + "월").join("·");
// "near" = short-haul: within 2h of Seoul and not a southern-hemisphere city (Australia/NZ shift into DST)
const near = (x, month) => Math.abs(diffMin(x, month)) <= 120 && x.hemi !== "S";
const SEA = ["VN", "TH", "PH", "MY", "SG", "ID", "KH", "LA", "BN"];
const byNear = month => (a, b) => Math.abs(diffMin(a, month)) - Math.abs(diffMin(b, month)) || CITIES.indexOf(a) - CITIES.indexOf(b);

const CSS = `*{box-sizing:border-box}body{margin:0;background:#0C1020;color:#F2F3F8;font-family:system-ui,-apple-system,"Noto Sans KR",sans-serif;line-height:1.65;word-break:keep-all}.w{max-width:720px;margin:auto;padding:26px 20px 60px}a{color:inherit}.back{font-size:13px;color:#8A90A8;text-decoration:none}.hero{padding:46px 0 24px}.hero .eyebrow{color:#39FF14}.hero h1{font-size:clamp(32px,8.5vw,60px);line-height:1.1;margin:8px 0 14px}.hero p{margin:0;color:#C8CCDA}.answer{padding:18px;border:1px solid #39FF14;border-radius:14px;margin:0 0 18px}.answer b{color:#39FF14}.answer p{margin:6px 0 0}.note{padding:16px;border:1px solid #20263D;border-radius:14px;color:#AEB4C7;font-size:13px;margin-bottom:28px}h2.sec{font-size:20px;margin:34px 0 4px;color:#2DE2FF}.city{display:grid;grid-template-columns:42px 1fr;gap:12px;padding:22px 0;border-top:1px solid #20263D}.no{font-size:13px;color:#8A90A8;padding-top:4px}.city h3{font-size:25px;margin:0 0 5px}.city h3 a{text-decoration:none}.eyebrow{font-size:12px;color:#FF1FAF;margin:0 0 3px}.hook{margin:0 0 10px;color:#DADDEA}.facts{margin:0 0 10px;padding:0;list-style:none;font-size:14px;color:#C8CCDA}.facts li{margin:2px 0}.facts b{color:#F2F3F8;font-weight:600}.warn{color:#FFE600}.kw{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}.kw span{font-size:12px;border:1px solid #2A324F;border-radius:999px;padding:4px 8px}.go{font-size:13px;color:#2DE2FF;text-decoration:none;font-weight:700}.faq{margin-top:36px;border-top:1px solid #20263D;padding-top:10px}.faq h2{font-size:20px}.faq h3{font-size:16px;margin:18px 0 4px}.faq p{margin:0;color:#C8CCDA}.cta{display:block;margin:30px 0 10px;padding:15px 18px;background:#FF1FAF;color:#0C1020;text-align:center;border-radius:12px;text-decoration:none;font-weight:800}.more{display:flex;flex-wrap:wrap;gap:8px;margin-top:22px}.more a{font-size:13px;border:1px solid #2A324F;border-radius:999px;padding:6px 11px;text-decoration:none}.fine{font-size:12px;color:#8A90A8;margin-top:26px}@media(max-width:430px){.w{padding-left:18px;padding-right:18px}.city{grid-template-columns:32px 1fr}.city h3{font-size:22px}}`;

// guide index shown at the bottom of every generated guide (internal links)
const ALL_GUIDES = [
  ["2027-seollal-overseas-travel", "2027 설 연휴"], ["winter-overseas-travel", "겨울 해외여행"], ["no-jet-lag-overseas-travel", "시차 없는 여행지"],
  ["11-month-overseas-travel", "11월"], ["12-month-overseas-travel", "12월"], ["1-month-overseas-travel", "1월"], ["2-month-overseas-travel", "2월"],
  ["2026-korean-travel-trends", "2026 인기 여행지"],
];

function cityBlock(x, i, month) {
  const wet = month && (x.wet || []).includes(month);
  const dm = month ? diffMin(x, month) : diffMin(x, 1);
  return `<article class="city"><span class="no">${String(i + 1).padStart(2, "0")}</span><div><p class="eyebrow">${esc(x.c)}</p><h3><a href="/trips/${x.id}">${esc(x.city)} 여행</a></h3><p class="hook">${esc(x.hook)}</p><ul class="facts"><li><b>입국</b> ${esc(vShort(x))}</li><li><b>시차</b> ${esc(diffText(dm))}</li><li><b>여행 적기</b> ${esc(mText(x.best))}${wet ? ` <span class="warn">· ${month}월은 우기에 걸림</span>` : ""}</li></ul><p class="kw">${x.kw.map(k => `<span>${esc(k)}</span>`).join("")}</p><a class="go" href="/trips/${x.id}">${esc(x.city)} 입국·환율·날씨 보기 →</a></div></article>`;
}

function page({ slug, title, h1, eyebrow, lead, answer, desc, sections, faq, cta, cites = [] }) {
  const list = sections.flatMap(s => s.items);
  const ld = [
    { "@context": "https://schema.org", "@type": "Article", headline: title, description: desc, datePublished: TODAY, dateModified: TODAY, inLanguage: "ko-KR", mainEntityOfPage: `${HOST}/guides/${slug}`, author: { "@type": "Organization", name: "KeywordTrip", url: `${HOST}/` }, publisher: { "@type": "Organization", name: "KeywordTrip", url: `${HOST}/` } },
    { "@context": "https://schema.org", "@type": "ItemList", name: h1, itemListElement: list.map((x, i) => ({ "@type": "ListItem", position: i + 1, url: `${HOST}/trips/${x.id}`, name: `${x.city} 여행` })) },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "키워드트립", item: `${HOST}/` }, { "@type": "ListItem", position: 2, name: h1, item: `${HOST}/guides/${slug}` }] },
  ];
  let n = 0;
  const body = sections.map(s => `${s.title ? `<h2 class="sec">${esc(s.title)}</h2>${s.sub ? `<p class="hook">${esc(s.sub)}</p>` : ""}` : ""}\n${s.items.map(x => cityBlock(x, n++, s.month)).join("\n")}`).join("\n");
  const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${HOST}/guides/${slug}">
<meta property="og:type" content="article">
<meta property="og:url" content="${HOST}/guides/${slug}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${HOST}/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="키워드트립 — ${esc(h1)}">
<meta property="og:locale" content="ko_KR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${HOST}/og.png">
<meta name="theme-color" content="#0C1020">
${ld.map(o => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join("\n")}
<style>
${CSS}
</style>
</head>
<body>
<main class="w">
<a class="back" href="/">← KeywordTrip</a>
<section class="hero"><p class="eyebrow">${esc(eyebrow)}</p><h1>${esc(h1)}</h1><p>${esc(lead)}</p></section>
<div class="answer"><b>한 줄 답</b><p>${esc(answer)}</p></div>
<p class="note">여행 적기·우기는 평균 기후와 계절성 기준, 입국 조건은 키워드트립 데이터 기준, ${esc(INFO.rev || TODAY)} 확인. 출발 전 항공편, 현지 날씨, 입국 규정, <a href="https://www.0404.go.kr/" target="_blank" rel="noopener">외교부 여행경보</a>를 다시 확인하세요.</p>
${body}
<section class="faq"><h2>자주 묻는 질문</h2>
${faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("\n")}
</section>
<a class="cta" href="${esc(cta[0])}">${esc(cta[1])}</a>
<nav class="more" aria-label="다른 여행 가이드">${ALL_GUIDES.filter(g => g[0] !== slug).map(([s, l]) => `<a href="/guides/${s}">${esc(l)}</a>`).join("")}<a href="/trips">전체 여행지</a></nav>
${cites.length ? `<p class="fine">출처: ${cites.map(([l, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(l)}</a>`).join(" · ")}</p>` : ""}
<p class="fine">KeywordTrip · 키워드로 고르고 바로 떠나는 여행 · 업데이트 ${TODAY}</p>
</main>
</body>
</html>
`;
  fs.writeFileSync(path.join(root, "guides", slug + ".html"), html);
  return slug;
}

const jong = w => { const c = w.charCodeAt(w.length - 1) - 0xAC00; return c >= 0 && c < 11172 && c % 28 !== 0; };
const eun = w => w + (jong(w) ? "은" : "는");
const ga = w => w + (jong(w) ? "이" : "가");
const names = xs => xs.slice(0, 6).map(x => x.city).join("·");
const out = [];

/* 1월 · 2월 monthly guides */
for (const m of [1, 2]) {
  const pick = CITIES.filter(x => x.best.includes(m)).sort(byNear(m));
  const nearL = pick.filter(x => near(x, m)), farL = pick.filter(x => !near(x, m));
  out.push(page({
    slug: `${m}-month-overseas-travel`,
    title: `${m}월 해외여행 추천 ${pick.length}곳 | 가까운 곳·먼 곳 나눠 보기 | 키워드트립`,
    h1: `${m}월 해외여행 추천 ${pick.length}곳`,
    eyebrow: `2027 · MONTHLY TRIP`,
    lead: `평균 기후로 ${m}월이 여행 적기인 도시만 골라, 시차 2시간 이내 가까운 곳과 장거리로 나눴습니다.`,
    answer: `${m}월에 가기 좋은 해외여행지는 가까운 곳이면 ${names(nearL)}, 장거리면 ${names(farL)}입니다. 모두 ${m}월이 키워드트립 기준 여행 적기입니다.`,
    desc: `${m}월 해외여행지 추천: ${names(nearL)} 등 가까운 곳과 ${names(farL)} 등 장거리 ${pick.length}곳을 여행 적기·입국 조건·시차로 비교하세요.`,
    sections: [
      { title: `가까운 곳 ${nearL.length}곳 · 시차 2시간 이내`, sub: "짧은 연휴나 3박 4일 일정에 맞습니다.", items: nearL, month: m },
      { title: `장거리 ${farL.length}곳`, sub: "7일 이상 일정일 때 고려하세요.", items: farL, month: m },
    ],
    faq: [
      [`${m}월에 가기 좋은 가까운 해외여행지는?`, `시차 2시간 이내이면서 ${m}월이 여행 적기인 곳은 ${nearL.map(x => x.city).join("·")}입니다.`],
      [`${m}월 동남아 여행, 우기는 괜찮나요?`, `${eun(pick.filter(x => SEA.includes(x.cc)).map(x => x.city).join("·") || "해당 도시")} ${m}월이 키워드트립 기준 여행 적기입니다. 발리는 ${m}월이 우기라 이 목록에서 뺐습니다.`],
      [`${m}월 해외여행지의 입국 조건은?`, `목록의 도시 대부분은 한국 여권 무비자이고, 미국 ESTA, 호주 ETA, 뉴질랜드 NZeTA처럼 사전 신청이 필요한 곳은 각 도시 카드에 표시했습니다.`],
    ],
    cta: [`/?q=${encodeURIComponent(m + "월 여행")}`, `${m}월 여행지 더 찾아보기 →`],
  }));
}

/* 겨울 (12~2월) */
{
  const W = [12, 1, 2];
  const pick = CITIES.filter(x => W.some(m => x.best.includes(m))).sort(byNear(1));
  const warm = pick.filter(x => x.hemi === "T" || x.hemi === "S" || x.id === "dubai");
  const cold = pick.filter(x => !warm.includes(x));
  out.push(page({
    slug: "winter-overseas-travel",
    title: `겨울 해외여행 추천 ${pick.length}곳 | 12~2월 따뜻한 곳·겨울다운 곳 | 키워드트립`,
    h1: `겨울 해외여행 추천 ${pick.length}곳`,
    eyebrow: "2026–2027 · WINTER",
    lead: "12월·1월·2월 중 한 달 이상이 여행 적기인 도시를 '추위를 피하는 곳'과 '겨울을 즐기는 곳'으로 나눴습니다.",
    answer: `추위를 피하려면 ${names(warm)}, 선선한 날씨와 겨울 분위기를 원하면 ${ga(cold.map(x => x.city).join("·"))} 12~2월 중 여행 적기입니다.`,
    desc: `겨울 해외여행지 추천: 따뜻한 ${names(warm)}, 겨울 분위기의 ${cold.map(x => x.city).join("·")}. 12~2월 중 언제가 적기인지, 입국·시차까지 한눈에.`,
    sections: [
      { title: `추위를 피하는 따뜻한 곳 ${warm.length}곳`, sub: "열대·남반구 도시와 겨울이 선선한 사막 도시.", items: warm },
      { title: `겨울 분위기·선선한 날씨 ${cold.length}곳`, sub: "더위 없이 걷기 좋은 도시와 겨울이 제철인 도시.", items: cold },
    ],
    faq: [
      ["겨울에 따뜻한 해외여행지는 어디인가요?", `12~2월에도 여행 적기인 따뜻한 곳은 ${warm.map(x => x.city).join("·")}입니다.`],
      ["겨울에 가까운 따뜻한 나라는?", `시차 2시간 이내로는 ${ga(warm.filter(x => near(x, 1)).map(x => x.city).join("·"))} 있습니다.`],
      ["겨울에 눈 구경하기 좋은 해외여행지는?", "가까운 곳으로는 삿포로가 대표적입니다. 2월이 여행 적기이고 눈축제가 열립니다. 정확한 축제 일정은 출발 전 공식 발표를 확인하세요."],
    ],
    cta: ["/?q=%EA%B2%A8%EC%9A%B8", "겨울 여행지 더 찾아보기 →"],
  }));
}

/* 2027 설 연휴 (2/6 토 ~ 2/9 화, 4일) */
{
  const pick = CITIES.filter(x => x.best.includes(2) && near(x, 2)).sort(byNear(2));
  const zero = pick.filter(x => Math.abs(diffMin(x, 2)) <= 60);
  out.push(page({
    slug: "2027-seollal-overseas-travel",
    title: `2027 설 연휴 해외여행 추천 ${pick.length}곳 | 2월 6~9일 4일, 3박 4일로 가기 좋은 곳 | 키워드트립`,
    h1: `2027 설 연휴 해외여행 ${pick.length}곳`,
    eyebrow: "2027 · 설 연휴 2/6 토 ~ 2/9 화",
    lead: "2027년 설 연휴는 2월 6일 토요일부터 대체공휴일인 2월 9일 화요일까지 4일입니다. 3박 4일에 맞게 시차 2시간 이내이면서 2월이 여행 적기인 곳만 골랐습니다.",
    answer: `2027 설 연휴 4일, 2월 6~9일에는 ${names(pick)} 등 ${pick.length}곳이 시차 2시간 이내이면서 2월이 여행 적기입니다. 연휴 항공권은 일찍 마감되니 지금 가격부터 비교하세요.`,
    desc: `2027 설 연휴 해외여행지 추천: 2월 6일 토요일부터 9일 화요일까지 4일 연휴, 3박 4일로 다녀오기 좋은 ${names(pick)} 등 ${pick.length}곳. 입국 조건·시차·2월 날씨 기준.`,
    sections: [{ title: "", items: pick, month: 2 }],
    faq: [
      ["2027년 설 연휴는 며칠인가요?", "4일입니다. 설날인 2월 7일이 일요일이라, 2월 6일 토요일부터 대체공휴일 2월 9일 화요일까지 쉽니다."],
      ["설 연휴 3박 4일 해외여행 어디가 좋나요?", `시차 2시간 이내이면서 2월이 여행 적기인 곳은 ${pick.map(x => x.city).join("·")}입니다.`],
      ["설 연휴에 시차 없이 갈 수 있는 곳은?", `시차 1시간 이내로는 ${ga(zero.map(x => x.city).join("·"))} 있습니다.`],
      ["설 연휴 항공권은 언제 사야 하나요?", "명절 연휴 출발편은 수요가 몰려 일찍 마감되는 경우가 많습니다. 특정 시점이 항상 싸다고 단정할 수는 없으니, 여러 날짜의 가격을 지금 비교해 두는 것이 안전합니다."],
    ],
    cta: ["/?q=2%EC%9B%94%20%EC%97%AC%ED%96%89", "2월 여행지 더 찾아보기 →"],
    cites: [["2027년 공휴일 · kholidayz", "https://kholidayz.com/year/2027/seollal"]],
  }));
}

/* 시차 없는 해외여행 (연중 ±1시간 이내) */
{
  const pick = CITIES.filter(x => Math.abs(diffMin(x, 1)) <= 60 && Math.abs(diffMin(x, 7)) <= 60).sort(byNear(1));
  const zero = pick.filter(x => diffMin(x, 1) === 0);
  out.push(page({
    slug: "no-jet-lag-overseas-travel",
    title: `시차 없는 해외여행 ${pick.length}곳 | 시차 0~1시간, 짧은 연휴에 딱 | 키워드트립`,
    h1: `시차 없는 해외여행 ${pick.length}곳`,
    eyebrow: "NO JET LAG",
    lead: "서울과 시차가 0~1시간인 도시만 모았습니다. 아이·부모님과 함께 가거나, 주말을 붙인 짧은 여행에 피로가 적습니다.",
    answer: `서울과 시차가 아예 없는 곳은 ${zero.map(x => x.city).join("·")}, 1시간 차이는 ${pick.filter(x => !zero.includes(x)).map(x => x.city).join("·")}입니다.`,
    desc: `시차 없는 해외여행지: 시차 0은 ${zero.map(x => x.city).join("·")}, 1시간은 ${names(pick.filter(x => !zero.includes(x)))} 등. 도시별 여행 적기와 입국 조건까지.`,
    sections: [
      { title: `시차 0시간 ${zero.length}곳`, items: zero },
      { title: `시차 1시간 ${pick.length - zero.length}곳`, items: pick.filter(x => !zero.includes(x)) },
    ],
    faq: [
      ["한국과 시차가 없는 나라는?", `키워드트립 추천 도시 중 시차가 없는 곳은 일본의 ${zero.map(x => x.city).join("·")}입니다.`],
      ["시차 1시간인 해외여행지는?", `${eun(pick.filter(x => !zero.includes(x)).map(x => x.city).join("·"))} 서울과 1시간 차이입니다.`],
      ["아이와 가기 좋은 시차 적은 해외여행지는?", "시차가 적으면 수면 리듬이 덜 흐트러집니다. 이 목록의 도시 중 여행하려는 달이 여행 적기에 들어가는 곳을 고르세요."],
    ],
    cta: ["/trips", "전체 여행지 비교하기 →"],
  }));
}

console.log("guides:", out.join(", "));
