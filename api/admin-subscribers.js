// Owner-only subscriber list: https://keywordtrip.com/api/admin-subscribers
// GET  → password form. POST key=<ADMIN_KEY> → last-14-day ♡/sign-up charts + per-destination counts + contact list. POST key&format=csv → CSV download.
// Env: ADMIN_KEY (long random string) + the Supabase vars in _sub.js. Without ADMIN_KEY the page is disabled.
import crypto from "node:crypto";
import { config, listSubscribers } from "./_sub.js";
import { redis } from "./_store.js";
import { readStats } from "./_metrics.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const shell = body => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>구독자 리스트 | 키워드트립</title><style>
body{margin:0;background:#0C1020;color:#f4f4f8;font:15px/1.55 system-ui,sans-serif;padding:16px}main{max-width:960px;margin:0 auto}
h1{font-size:20px}h2{font-size:16px;margin-top:28px}table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #2a2f45;vertical-align:top}
th{color:#aab}.wrap{overflow-x:auto}input,button{font:inherit;padding:10px 12px;border-radius:10px;border:1px solid #2a2f45;background:#151a2e;color:inherit}button{background:#ff1faf;border:0;color:#fff;cursor:pointer}
form.inline{display:inline}.muted{color:#99a}.kpi{display:flex;gap:12px;flex-wrap:wrap}.kpi div{background:#151a2e;border-radius:12px;padding:12px 16px}.kpi b{display:block;font-size:22px}
.charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}.chart{background:#151a2e;border-radius:12px;padding:12px 14px}.chart h3{font-size:14px;margin:0 0 6px;font-weight:600}
.chart svg{display:block;width:100%;height:auto;overflow:visible}.chart .ax{fill:#99a;font-size:10px}.chart .val{fill:#f4f4f8;font-size:10px;font-weight:600}.chart .grid{stroke:#2a2f45;stroke-width:1}
.chart .hit{fill:transparent}.chart g.pt:hover .bar,.chart g.pt:hover .dot{opacity:.75}details{margin-top:8px}summary{cursor:pointer;color:#aab}
</style></head><body><main>${body}</main></body></html>`;

function keyOk(given) {
  const want = process.env.ADMIN_KEY;
  if (!want || want.length < 12 || !given) return false;
  const a = crypto.createHash("sha256").update(String(given)).digest(), b = crypto.createHash("sha256").update(want).digest();
  return crypto.timingSafeEqual(a, b);
}

function readForm(req) {
  const b = req.body;
  if (b && typeof b === "object") return b;
  return Object.fromEntries(new URLSearchParams(String(b || "")));
}

/* ---- 최근 14일 측정 그래프 (서버에서 SVG로 그림, 외부 스크립트 없음) ---- */
const W = 320, H = 150, PL = 28, PR = 6, PT = 14, PB = 22;
const md = d => d.slice(5).replace("-", ".");
const fmtPct = v => (v == null ? "–" : v.toFixed(1) + "%");
function chartSvg(daily, field, kind, fmt) {
  const n = daily.length, vals = daily.map(d => d[field]);
  const max = Math.max(1, ...vals.filter(v => v != null)), step = (W - PL - PR) / n, y = v => PT + (H - PT - PB) * (1 - v / max);
  const base = H - PB, peak = vals.indexOf(Math.max(...vals.filter(v => v != null), -1));
  let marks = "";
  const line = [];
  daily.forEach((d, i) => {
    const v = d[field], cx = PL + step * i + step / 2, tip = `${md(d.date)} · ${fmt(v)}`;
    const label = v != null && (i === peak || i === n - 1) && v > 0 ? `<text class="val" x="${cx}" y="${y(v) - 4}" text-anchor="middle">${fmt(v)}</text>` : "";
    if (kind === "bar") {
      const bw = Math.max(4, step - 4), h = v ? Math.max(2, base - y(v)) : 0, r = Math.min(4, bw / 2, h);
      const bar = h ? `<path class="bar" fill="#ff1faf" d="M${cx - bw / 2},${base}V${base - h + r}q0,-${r} ${r},-${r}H${cx + bw / 2 - r}q${r},0 ${r},${r}V${base}Z"/>` : "";
      marks += `<g class="pt"><title>${tip}</title><rect class="hit" x="${cx - step / 2}" y="${PT}" width="${step}" height="${H - PT - PB}"/>${bar}${label}</g>`;
    } else {
      if (v != null) line.push([cx, y(v)]);
      else line.push(null);
      marks += `<g class="pt"><title>${tip}</title><rect class="hit" x="${cx - step / 2}" y="${PT}" width="${step}" height="${H - PT - PB}"/>${v != null ? `<circle class="dot" cx="${cx}" cy="${y(v)}" r="4" fill="#ff1faf" stroke="#151a2e" stroke-width="2"/>` : ""}${label}</g>`;
    }
  });
  let path = "";
  if (kind === "line") { let pen = "M"; for (const p of line) { if (!p) { pen = "M"; continue; } path += `${pen}${p[0].toFixed(1)},${p[1].toFixed(1)}`; pen = "L"; } }
  const xl = daily.map((d, i) => (i % 2 === (n - 1) % 2 ? `<text class="ax" x="${PL + step * i + step / 2}" y="${H - 6}" text-anchor="middle">${md(d.date)}</text>` : "")).join("");
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(field)}">
<line class="grid" x1="${PL}" x2="${W - PR}" y1="${base}" y2="${base}"/><line class="grid" x1="${PL}" x2="${W - PR}" y1="${PT}" y2="${PT}" stroke-dasharray="2 3"/>
<text class="ax" x="${PL - 4}" y="${PT + 3}" text-anchor="end">${fmt(max)}</text><text class="ax" x="${PL - 4}" y="${base + 3}" text-anchor="end">${kind === "line" ? "0%" : 0}</text>
${path ? `<path d="${path}" fill="none" stroke="#ff1faf" stroke-width="2" stroke-linejoin="round"/>` : ""}${marks}${xl}</svg>`;
}

function metricsSection(st) {
  if (!st) return `<h2>최근 14일 측정</h2><p class="muted">저장소(Upstash Redis)가 연결되지 않아 집계가 꺼져 있어요.</p>`;
  const t = st.totals, num = v => (v ?? 0).toLocaleString("ko-KR");
  return `<h2>최근 14일 측정 <span class="muted" style="font-weight:400;font-size:13px">${esc(md(st.from))}–${esc(md(st.to))} · 한국 시간 · 숫자만 저장</span></h2>
<div class="kpi"><div><b>${num(t.clicks)}</b>♡ 클릭</div><div><b>${num(t.signups)}</b>알림 신청</div><div><b>${fmtPct(t.conversion_pct)}</b>전환율 (신청÷클릭)</div></div>
<div class="charts" style="margin-top:12px">
<div class="chart"><h3>일별 ♡ 클릭</h3>${chartSvg(st.daily, "clicks", "bar", num)}</div>
<div class="chart"><h3>일별 알림 신청</h3>${chartSvg(st.daily, "signups", "bar", num)}</div>
<div class="chart"><h3>일별 전환율 (신청÷클릭)</h3>${chartSvg(st.daily, "conversion_pct", "line", fmtPct)}</div>
</div>
<details><summary>일별 숫자 표로 보기</summary><div class="wrap"><table><thead><tr><th>날짜</th><th>♡ 클릭</th><th>신청</th><th>전환율</th></tr></thead><tbody>
${st.daily.slice().reverse().map(d => `<tr><td>${esc(d.date)}</td><td>${num(d.clicks)}</td><td>${num(d.signups)}</td><td>${fmtPct(d.conversion_pct)}</td></tr>`).join("")}
</tbody></table></div></details>
<h2>여행지별 상위 10 (최근 14일, ♡ 클릭순)</h2><div class="wrap"><table><thead><tr><th>#</th><th>여행지</th><th>♡ 클릭</th><th>신청</th><th>전환율</th></tr></thead><tbody>
${st.top.map((r, i) => `<tr><td>${i + 1}</td><td data-id="${esc(r.destination)}">${esc(r.destination)}</td><td>${num(r.clicks)}</td><td>${num(r.signups)}</td><td>${fmtPct(r.conversion_pct)}</td></tr>`).join("") || `<tr><td colspan="5" class="muted">아직 없어요</td></tr>`}
</tbody></table></div>`;
}

// 검색어 통계 (api/q.js가 쌓는 익명 검색어·결과 수)
async function readSearch(db) {
  const month = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 7);
  const [mon, zeroMon, all, total] = await db.pipeline([
    ["ZREVRANGE", `kt:q:${month}`, "0", "29", "WITHSCORES"],
    ["ZREVRANGE", `kt:q0:${month}`, "0", "29", "WITHSCORES"],
    ["ZREVRANGE", "kt:q:all", "0", "29", "WITHSCORES"],
    ["GET", "kt:q:total"],
  ]);
  const pairs = a => { const o = []; for (let i = 0; i < (a || []).length; i += 2) o.push([a[i], +a[i + 1]]); return o; };
  return { month, total: +total || 0, mon: pairs(mon), zero: pairs(zeroMon), all: pairs(all) };
}
function searchSection(sq) {
  if (!sq) return "";
  const tb = (title, rows) => `<div><h3>${title}</h3><div class="wrap"><table><tbody>${rows.map(([q, c], i) => `<tr><td>${i + 1}</td><td><a href="/?q=${encodeURIComponent(q)}" target="_blank" style="color:inherit">${esc(q)}</a></td><td>${c}</td></tr>`).join("") || `<tr><td class="muted">아직 없어요</td></tr>`}</tbody></table></div></div>`;
  return `<h2>검색어 <span class="muted" style="font-weight:400;font-size:13px">누적 ${sq.total.toLocaleString("ko-KR")}회 · 이번 달 ${esc(sq.month)} · 검색어와 결과 수만 저장</span></h2>
<div class="charts">${tb("결과 0건 (이번 달) — 추가 후보", sq.zero)}${tb("인기 검색어 (이번 달)", sq.mon)}${tb("인기 검색어 (누적)", sq.all)}</div>`;
}

const login = msg => shell(`<h1>키워드트립 관리자</h1>${msg ? `<p>${esc(msg)}</p>` : ""}<form method="post"><input type="password" name="key" placeholder="관리자 키" autocomplete="current-password" required> <button>열기</button></form>`);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("content-type", "text/html; charset=utf-8");
  if (!process.env.ADMIN_KEY) return res.status(503).send(shell("<p>ADMIN_KEY 환경변수가 없어 꺼져 있어요.</p>"));
  if (req.method === "GET") return res.status(200).send(login());
  if (req.method !== "POST") { res.setHeader("Allow", "GET, POST"); return res.status(405).end(); }

  const form = readForm(req);
  if (!keyOk(form.key)) { await new Promise(r => setTimeout(r, 800)); return res.status(401).send(login("키가 맞지 않아요.")); }
  const cfg = config();
  if (!cfg) return res.status(503).send(shell("<p>저장소(Upstash Redis 또는 Supabase)가 연결되지 않아 구독 저장이 꺼져 있어요.</p>"));

  let list, stats = null;
  const db = redis();
  if (db && form.format !== "csv") stats = await readStats(db, 14).catch(e => { console.error("admin-stats", String(e).slice(0, 300)); return null; });
  const search = db && form.format !== "csv" ? await readSearch(db).catch(() => null) : null;
  try {
    list = await listSubscribers(cfg);
  } catch (e) {
    console.error("admin-subscribers", String(e).slice(0, 300));
    return res.status(500).send(shell("<p>불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>"));
  }

  if (form.format === "csv") {
    const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const notes = r => Object.entries(r.notes || {}).map(([d, m]) => `${d}: ${m}`).join(" / ");
    const csv = "﻿" + [["이름", "연락처", "유형", "특가수신동의", "동의일시", "관심여행지", "남기신 말"].map(q).join(",")]
      .concat(list.map(r => [r.name || "", r.contact, r.contact_type === "phone" ? "휴대폰" : "이메일", r.marketing ? "Y" : "N", r.consent_at, r.dests.join(" "), notes(r)].map(q).join(","))).join("\r\n");
    res.setHeader("content-type", "text/csv; charset=utf-8");
    res.setHeader("content-disposition", `attachment; filename="keywordtrip-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.status(200).send(csv);
  }

  const counts = {};
  list.forEach(r => r.dests.forEach(d => { counts[d] = (counts[d] || 0) + 1; }));
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const phones = list.filter(r => r.contact_type === "phone").length;
  const mkt = list.filter(r => r.marketing).length;

  const body = `<h1>키워드트립 관리자</h1>
<div class="kpi"><div><b>${list.length}</b>전체 구독자</div><div><b>${phones}</b>휴대폰</div><div><b>${list.length - phones}</b>이메일</div><div><b>${mkt}</b>특가 수신 동의</div></div>
<p><form method="post" class="inline"><input type="hidden" name="key" value="${esc(form.key)}"><input type="hidden" name="format" value="csv"><button>CSV 내려받기</button></form>
<span class="muted"> 특가·광고 메시지는 '특가 수신 동의 Y'에게만, 밤 9시~아침 8시 발송 금지.</span></p>
${metricsSection(stats)}
${searchSection(search)}
<h2>관심 여행지 순위 (누적 구독자)</h2><div class="wrap"><table><thead><tr><th>#</th><th>여행지</th><th>구독자</th></tr></thead><tbody>
${top.map(([d, n], i) => `<tr><td>${i + 1}</td><td data-id="${esc(d)}">${esc(d)}</td><td>${n}</td></tr>`).join("") || `<tr><td colspan="3" class="muted">아직 없어요</td></tr>`}
</tbody></table></div>
<h2>연락처</h2><div class="wrap"><table><thead><tr><th>이름</th><th>연락처</th><th>유형</th><th>특가</th><th>동의일</th><th>관심 여행지</th><th>남기신 말</th></tr></thead><tbody>
${list.map(r => `<tr><td>${esc(r.name || "")}</td><td>${esc(r.contact)}</td><td>${r.contact_type === "phone" ? "휴대폰" : "이메일"}</td><td>${r.marketing ? "Y" : "N"}</td><td>${esc(String(r.consent_at || "").slice(0, 10))}</td><td>${r.dests.map(d => `<span data-id="${esc(d)}">${esc(d)}</span>`).join(", ")}</td><td>${Object.entries(r.notes || {}).map(([d, m]) => `<span data-id="${esc(d)}">${esc(d)}</span>: ${esc(m)}`).join("<br>")}</td></tr>`).join("") || `<tr><td colspan="7" class="muted">아직 없어요</td></tr>`}
</tbody></table></div>
<script src="/assets/data.js"></script>
<script>try{var m={};DEST.forEach(function(d){m[d.id]=d.city+(d.country?"":" ("+d.c+")")});document.querySelectorAll("[data-id]").forEach(function(e){var n=m[e.dataset.id];if(n)e.textContent=n})}catch(e){}</script>`;
  return res.status(200).send(shell(body));
}
