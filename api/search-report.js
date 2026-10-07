// Private report of what people search for. GET /api/search-report?key=SEARCH_REPORT_KEY[&month=2026-10][&format=json]
import { redis } from "./_store.js";

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const pairs = a => { const o = []; for (let i = 0; i < (a || []).length; i += 2) o.push([a[i], +a[i + 1]]); return o; };

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  const key = process.env.SEARCH_REPORT_KEY;
  if (!key || req.query.key !== key) return res.status(404).end();
  const db = redis();
  if (!db) return res.status(503).json({ error: "store_not_configured" });
  if (req.query.view === "qa") {
    const [h] = await db.pipeline([["HGETALL", "kt:qa:pending"]]);
    const items = []; for (let i = 0; i < (h || []).length; i += 2) items.push([h[i], JSON.parse(h[i + 1])]);
    res.setHeader("content-type", "text/html; charset=utf-8");
    return res.status(200).send(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>질문 검수 | 키워드트립</title><style>body{margin:0;background:#0C1020;color:#F2F3F8;font:15px/1.6 system-ui,"Noto Sans KR",sans-serif}main{max-width:720px;margin:auto;padding:20px 16px 60px}form{border:1px solid #252C45;border-radius:14px;padding:14px;margin:0 0 14px;background:#11172A}textarea{width:100%;min-height:90px;background:#0C1020;color:#F2F3F8;border:1px solid #252C45;border-radius:10px;padding:8px;font:inherit}button{margin:8px 8px 0 0;padding:9px 14px;border-radius:10px;border:1.5px solid #39FF14;background:none;color:#F2F3F8;font-weight:700}a{color:#FF1FAF}</style></head><body><main><h1>질문 검수 (${items.length})</h1><p><a href="/api/search-report?key=${encodeURIComponent(key)}">← 검색어 집계</a></p>${items.map(([id, o]) => `<form method="post" action="/api/ask"><p><b>${esc(o.d)}</b> · ${esc(o.at.slice(0, 16))}</p><p>${esc(o.q)}</p><input type="hidden" name="key" value="${esc(key)}"><input type="hidden" name="id" value="${esc(id)}"><textarea name="answer" placeholder="답변을 쓰고 승인하면 해당 여행지 페이지에 공개됩니다"></textarea><button name="action" value="approve">답변하고 공개</button><button name="action" value="delete">삭제</button></form>`).join("") || "<p>검수할 질문이 없습니다.</p>"}</main></body></html>`);
  }
  const month = /^\d{4}-\d{2}$/.test(req.query.month || "") ? req.query.month : new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 7);
  const [all, mon, zero, zeroMon, total, subs, pend, qaPend] = await db.pipeline([
    ["ZREVRANGE", "kt:q:all", "0", "199", "WITHSCORES"],
    ["ZREVRANGE", `kt:q:${month}`, "0", "199", "WITHSCORES"],
    ["ZREVRANGE", "kt:q0:all", "0", "199", "WITHSCORES"],
    ["ZREVRANGE", `kt:q0:${month}`, "0", "199", "WITHSCORES"],
    ["GET", "kt:q:total"],
    ["SCARD", "kt:subs"],
    ["SCARD", "kt:pending"],
    ["HLEN", "kt:qa:pending"],
  ]);
  const data = { month, total: +total || 0, subscribers: +subs || 0, pendingConfirm: +pend || 0, questionsPending: +qaPend || 0, top: pairs(all), topMonth: pairs(mon), zero: pairs(zero), zeroMonth: pairs(zeroMon) };
  if (req.query.format === "json") return res.status(200).json(data);
  const table = (title, rows, note) => `<section><h2>${title}</h2>${note ? `<p class="n">${note}</p>` : ""}<ol>${rows.map(([q, c]) => `<li><a href="/?q=${encodeURIComponent(q)}" target="_blank">${esc(q)}</a><b>${c}</b></li>`).join("") || "<li>아직 없음</li>"}</ol></section>`;
  res.setHeader("content-type", "text/html; charset=utf-8");
  res.status(200).send(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>검색어 집계 | 키워드트립</title>
<style>body{margin:0;background:#0C1020;color:#F2F3F8;font:15px/1.6 system-ui,"Noto Sans KR",sans-serif}main{max-width:960px;margin:auto;padding:24px 18px 60px}h1{font-size:24px;margin:0 0 4px}.m{color:#A3A9C2;margin:0 0 20px}.g{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}section{border:1px solid #252C45;border-radius:14px;padding:14px 16px;background:#11172A}h2{font-size:16px;margin:0 0 6px}.n{color:#A3A9C2;font-size:13px;margin:0 0 8px}ol{margin:0;padding-left:22px}li{display:flex;justify-content:space-between;gap:8px;padding:3px 0;border-bottom:1px solid #1B2138}li::marker{color:#A3A9C2}a{color:#F2F3F8;text-decoration:none}b{color:#FF1FAF;font-variant-numeric:tabular-nums}</style></head>
<body><main><h1>검색어 집계</h1><p class="m">알림 구독자 ${data.subscribers.toLocaleString("ko-KR")}명(확인 대기 ${data.pendingConfirm}) · <a style="color:#FF1FAF" href="/api/search-report?view=qa&key=${encodeURIComponent(key)}">검수할 질문 ${data.questionsPending}개</a><br>누적 검색 ${data.total.toLocaleString("ko-KR")}회 · 이번 달 ${esc(month)} · 개인정보 없이 검색어와 결과 수만 저장</p><div class="g">
${table("결과 0건 검색어 (이번 달)", data.zeroMonth, "별칭·여행지 추가 후보")}${table("결과 0건 검색어 (누적)", data.zero)}${table("인기 검색어 (이번 달)", data.topMonth)}${table("인기 검색어 (누적)", data.top)}
</div></main></body></html>`);
}
