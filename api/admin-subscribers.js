// Owner-only subscriber list: https://keywordtrip.com/api/admin-subscribers
// GET  → password form. POST key=<ADMIN_KEY> → per-destination counts + contact list. POST key&format=csv → CSV download.
// Env: ADMIN_KEY (long random string) + the Supabase vars in _sub.js. Without ADMIN_KEY the page is disabled.
import crypto from "node:crypto";
import { config, sb } from "./_sub.js";

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const shell = body => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>구독자 리스트 | 키워드트립</title><style>
body{margin:0;background:#0C1020;color:#f4f4f8;font:15px/1.55 system-ui,sans-serif;padding:16px}main{max-width:960px;margin:0 auto}
h1{font-size:20px}h2{font-size:16px;margin-top:28px}table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #2a2f45;vertical-align:top}
th{color:#aab}.wrap{overflow-x:auto}input,button{font:inherit;padding:10px 12px;border-radius:10px;border:1px solid #2a2f45;background:#151a2e;color:inherit}button{background:#ff1faf;border:0;color:#fff;cursor:pointer}
form.inline{display:inline}.muted{color:#99a}.kpi{display:flex;gap:12px;flex-wrap:wrap}.kpi div{background:#151a2e;border-radius:12px;padding:12px 16px}.kpi b{display:block;font-size:22px}
</style></head><body><main>${body}</main></body></html>`;

function keyOk(given) {
  const want = process.env.ADMIN_KEY;
  if (!want || want.length < 16 || !given) return false;
  const a = crypto.createHash("sha256").update(String(given)).digest(), b = crypto.createHash("sha256").update(want).digest();
  return crypto.timingSafeEqual(a, b);
}

function readForm(req) {
  const b = req.body;
  if (b && typeof b === "object") return b;
  return Object.fromEntries(new URLSearchParams(String(b || "")));
}

const login = msg => shell(`<h1>구독자 리스트</h1>${msg ? `<p>${esc(msg)}</p>` : ""}<form method="post"><input type="password" name="key" placeholder="관리자 키" autocomplete="current-password" required> <button>열기</button></form>`);

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
  if (!cfg) return res.status(503).send(shell("<p>Supabase 환경변수가 없어 구독 저장이 꺼져 있어요.</p>"));

  let rows;
  try {
    rows = await sb(cfg, "kt_subscribers?select=contact,contact_type,marketing,consent_at,kt_subscriber_destinations(destination,created_at)&order=consent_at.desc&limit=10000");
  } catch (e) {
    console.error("admin-subscribers", String(e).slice(0, 300));
    return res.status(500).send(shell("<p>불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p>"));
  }
  rows = rows || [];
  const list = rows.map(r => ({ ...r, dests: (r.kt_subscriber_destinations || []).map(d => d.destination) }));

  if (form.format === "csv") {
    const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = "﻿" + [["연락처", "유형", "특가수신동의", "동의일시", "관심여행지"].map(q).join(",")]
      .concat(list.map(r => [r.contact, r.contact_type === "phone" ? "휴대폰" : "이메일", r.marketing ? "Y" : "N", r.consent_at, r.dests.join(" ")].map(q).join(","))).join("\r\n");
    res.setHeader("content-type", "text/csv; charset=utf-8");
    res.setHeader("content-disposition", `attachment; filename="keywordtrip-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.status(200).send(csv);
  }

  const counts = {};
  list.forEach(r => r.dests.forEach(d => { counts[d] = (counts[d] || 0) + 1; }));
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const phones = list.filter(r => r.contact_type === "phone").length;
  const mkt = list.filter(r => r.marketing).length;

  const body = `<h1>구독자 리스트</h1>
<div class="kpi"><div><b>${list.length}</b>전체 구독자</div><div><b>${phones}</b>휴대폰</div><div><b>${list.length - phones}</b>이메일</div><div><b>${mkt}</b>특가 수신 동의</div></div>
<p><form method="post" class="inline"><input type="hidden" name="key" value="${esc(form.key)}"><input type="hidden" name="format" value="csv"><button>CSV 내려받기</button></form>
<span class="muted"> 특가·광고 메시지는 '특가 수신 동의 Y'에게만, 밤 9시~아침 8시 발송 금지.</span></p>
<h2>관심 여행지 순위</h2><div class="wrap"><table><thead><tr><th>#</th><th>여행지</th><th>구독자</th></tr></thead><tbody>
${top.map(([d, n], i) => `<tr><td>${i + 1}</td><td data-id="${esc(d)}">${esc(d)}</td><td>${n}</td></tr>`).join("") || `<tr><td colspan="3" class="muted">아직 없어요</td></tr>`}
</tbody></table></div>
<h2>연락처</h2><div class="wrap"><table><thead><tr><th>연락처</th><th>유형</th><th>특가</th><th>동의일</th><th>관심 여행지</th></tr></thead><tbody>
${list.map(r => `<tr><td>${esc(r.contact)}</td><td>${r.contact_type === "phone" ? "휴대폰" : "이메일"}</td><td>${r.marketing ? "Y" : "N"}</td><td>${esc(String(r.consent_at || "").slice(0, 10))}</td><td>${r.dests.map(d => `<span data-id="${esc(d)}">${esc(d)}</span>`).join(", ")}</td></tr>`).join("") || `<tr><td colspan="5" class="muted">아직 없어요</td></tr>`}
</tbody></table></div>
<script src="/assets/data.js"></script>
<script>try{var m={};DEST.forEach(function(d){m[d.id]=d.city+(d.country?"":" ("+d.c+")")});document.querySelectorAll("[data-id]").forEach(function(e){var n=m[e.dataset.id];if(n)e.textContent=n})}catch(e){}</script>`;
  return res.status(200).send(shell(body));
}
