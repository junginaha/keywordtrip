// Daily (Vercel Cron): detect entry-rule changes per destination and FX targets, then notify confirmed subscribers.
// Also sends pending confirmation emails once email sending is configured.
import crypto from "node:crypto";
import { redis } from "./_store.js";
import { mailReady, smsReady, sendMail, sendSms, mailHtml, btn } from "./_notify.js";

const HOST = "https://keywordtrip.com";
const sha = s => crypto.createHash("sha256").update(s).digest("hex").slice(0, 16);
const obj = a => { const o = {}; for (let i = 0; i < (a || []).length; i += 2) o[a[i]] = a[i + 1]; return o; };

function rules(DEST, INFO) {
  const isBan = x => INFO.ban.includes(x.cc), isWarn = x => INFO.warn.includes(x.cc) || INFO.warnId.includes(x.id);
  const vt = x => INFO.vtypeId[x.id] || (isBan(x) ? ["orange", "여행금지", ""] : null) || INFO.vtype[x.cc] || ["yellow", "입국 조건 확인 필요", ""];
  const vShort = x => { const [c, l, s] = vt(x); return c === "orange" || c === "yellow" ? l : l + (s ? " " + s : ""); };
  const visaOf = x => [INFO.sch.includes(x.cc) ? INFO.schTxt : (INFO.visa[x.cc] || ""), INFO.note[x.cc], INFO.xvisa[x.id]].filter(Boolean).join(" ");
  return { vShort, visaOf, sig: x => sha([vShort(x), visaOf(x), isBan(x), isWarn(x)].join("|")), isBan, isWarn };
}

export default async function handler(req, res) {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).end();
  const db = redis(); if (!db) return res.status(200).json({ skipped: "no store" });
  const src = await (await fetch(`${HOST}/assets/data.js`, { cache: "no-store" })).text();
  const { DEST, INFO, CUR } = new Function(src + ";return {DEST,INFO,CUR};")();
  const R = rules(DEST, INFO), byId = new Map(DEST.map(d => [d.id, d]));
  const log = { changed: [], entrySent: 0, fxSent: 0, confirmSent: 0 };

  // 1) pending confirmations (e.g. people who signed up before email sending was configured)
  if (mailReady()) {
    const [pending] = await db.pipeline([["SMEMBERS", "kt:pending"]]);
    for (const t of (pending || []).slice(0, 80)) {
      const [h] = await db.pipeline([["HGETALL", `kt:sub:${t}`]]); const o = obj(h);
      if (!o.email || o.ok === "1") { await db.pipeline([["SREM", "kt:pending", t]]); continue; }
      const d = (o.dests || "").split(",")[0];
      await sendMail(o.email, "키워드트립 알림 신청을 확인해 주세요", mailHtml("알림 신청을 확인해 주세요", `아래 버튼을 누르면 입국 규정·환율 변경 알림이 시작됩니다.${btn(`${HOST}/api/sub?confirm=${t}`, "알림 신청 확인")}여행 준비 체크리스트: <a style="color:#FF1FAF" href="${HOST}/trips/${d}/checklist">${HOST}/trips/${d}/checklist</a>`, `본인이 신청하지 않았다면 무시하세요. <a style="color:#A3A9C2" href="${HOST}/api/sub?unsub=${t}">신청 취소·정보 삭제</a>`)).catch(() => {});
      await db.pipeline([["SREM", "kt:pending", t]]); log.confirmSent++;
    }
  }

  // 2) entry-rule changes
  const ids = DEST.map(d => d.id);
  const old = await db.pipeline(ids.map(id => ["GET", `kt:sig:${id}`]));
  const first = old.every(v => !v);
  const setCmds = [];
  ids.forEach((id, i) => { const s = R.sig(byId.get(id)); if (old[i] !== s) { setCmds.push(["SET", `kt:sig:${id}`, s]); if (old[i]) log.changed.push(id); } });
  if (setCmds.length) await db.pipeline(setCmds);
  if (!first) for (const id of log.changed) {
    const x = byId.get(id), [members] = await db.pipeline([["SMEMBERS", `kt:dest:${id}`]]);
    for (const t of members || []) {
      const [h] = await db.pipeline([["HGETALL", `kt:sub:${t}`]]); const o = obj(h);
      if (o.ok !== "1" || o.entry === "0") continue;
      const title = `${x.city} 입국 규정이 바뀌었어요`;
      await sendMail(o.email, `[키워드트립] ${title}`, mailHtml(title, `<b>${R.vShort(x)}</b><br>${R.visaOf(x)}${btn(`${HOST}/trips/${id}`, `${x.city} 최신 정보 보기`)}출발 전 외교부 해외안전여행과 목적지 공식 안내로 한 번 더 확인하세요.`, `관심 여행지로 ${x.city}을(를) 등록하셔서 보내 드리는 알림입니다. <a style="color:#A3A9C2" href="${HOST}/api/sub?unsub=${t}">알림 해지·정보 삭제</a>`)).catch(() => {});
      if (o.sms === "1" && o.phone) await sendSms(o.phone, `[키워드트립] ${title}: ${R.vShort(x)}. 자세히 ${HOST}/trips/${id}`).catch(() => {});
      log.entrySent++;
    }
  }

  // 3) FX targets (at most one alert per currency per 7 days)
  const fx = await (await fetch(`${HOST}/api/fx`, { cache: "no-store" })).json().catch(() => null);
  if (fx && fx.r) {
    const UNIT = { JPY: 100, VND: 100, IDR: 100 };
    const [subs] = await db.pipeline([["SMEMBERS", "kt:fxsubs"]]);
    for (const t of subs || []) {
      const [h] = await db.pipeline([["HGETALL", `kt:sub:${t}`]]); const o = obj(h);
      if (o.ok !== "1") continue;
      for (const [cur, below] of Object.entries(JSON.parse(o.fx || "{}"))) {
        const r = fx.r[cur]; if (!r) continue;
        const unit = UNIT[cur] || 1, won = unit / r;
        if (won > below) continue;
        const [sent] = await db.pipeline([["SET", `kt:fxsent:${t}:${cur}`, "1", "EX", String(7 * 86400), "NX"]]);
        if (sent !== "OK") continue;
        const label = `${unit.toLocaleString("ko-KR")}${CUR[cur] || cur}`, wonTxt = won.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
        const title = `${label} = ${wonTxt}원, 목표 환율에 도달했어요`;
        await sendMail(o.email, `[키워드트립] ${title}`, mailHtml(title, `설정하신 목표(${below.toLocaleString("ko-KR")}원 이하)보다 낮아졌습니다. 은행 매매기준율과 같은 중간값이라 실제 환전에는 수수료가 붙어요.${btn(`${HOST}/`, "실시간 환율 보기")}`, `<a style="color:#A3A9C2" href="${HOST}/api/sub?unsub=${t}">알림 해지·정보 삭제</a>`)).catch(() => {});
        if (o.sms === "1" && o.phone) await sendSms(o.phone, `[키워드트립] ${title}`).catch(() => {});
        log.fxSent++;
      }
    }
  }
  return res.status(200).json({ ok: true, firstRun: first, ...log });
}
