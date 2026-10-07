// Alert subscriptions: "입국 규정·환율 바뀌면 알려드려요".
//   GET  /api/sub                 → { ready, email, sms }  (front end shows the form only when ready)
//   POST /api/sub                 → subscribe { email, phone?, dest, entry, fxBelow?, consent, age14, marketing, smsConsent, hp }
//   GET  /api/sub?confirm=TOKEN   → double opt-in confirmation
//   GET  /api/sub?unsub=TOKEN     → unsubscribe and delete all personal data
// Stores only what the consent screen lists; nothing is kept on unsubscribe.
import crypto from "node:crypto";
import { redis } from "./_store.js";
import { mailReady, smsReady, sendMail, mailHtml, btn } from "./_notify.js";

const CONSENT_VERSION = "2026-10-07";
const HOST = "https://keywordtrip.com";
const emailOk = e => /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i.test(e);
const phoneOk = p => /^01[016789]\d{7,8}$/.test(p);
const sha = s => crypto.createHash("sha256").update(s).digest("hex").slice(0, 32);
const page = (res, title, msg) => { res.setHeader("content-type", "text/html; charset=utf-8"); res.status(200).send(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title} | 키워드트립</title><link rel="stylesheet" href="/assets/trip.css"></head><body><main class="w"><header class="hero slim"><p class="eyebrow">키워드트립 알림</p><h1>${title}</h1></header><section class="answer"><p>${msg}</p></section><a class="cta" href="/">키워드트립으로 돌아가기 →</a></main></body></html>`); };

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const db = redis();
  if (req.method === "GET" && !req.query.confirm && !req.query.unsub) return res.status(200).json({ ready: !!db, email: mailReady(), sms: smsReady() });
  if (!db) return res.status(503).json({ error: "not_ready" });

  if (req.method === "GET" && req.query.confirm) {
    const t = String(req.query.confirm).slice(0, 64);
    const [email] = await db.pipeline([["HGET", `kt:sub:${t}`, "email"]]);
    if (!email) return page(res, "링크가 만료됐어요", "이미 해지됐거나 잘못된 링크입니다. 여행지 페이지에서 다시 신청해 주세요.");
    await db.pipeline([["HSET", `kt:sub:${t}`, "ok", "1", "okAt", new Date().toISOString()], ["SREM", "kt:pending", t]]);
    return page(res, "알림 신청이 완료됐어요", "입국 규정이나 환율이 바뀌면 바로 알려 드릴게요. 메일 하단의 해지 링크로 언제든 그만 받을 수 있습니다.");
  }
  if (req.method === "GET" && req.query.unsub) {
    const t = String(req.query.unsub).slice(0, 64);
    const [h] = await db.pipeline([["HGETALL", `kt:sub:${t}`]]);
    const o = {}; for (let i = 0; i < (h || []).length; i += 2) o[h[i]] = h[i + 1];
    if (o.email) {
      const dests = (o.dests || "").split(",").filter(Boolean);
      await db.pipeline([["DEL", `kt:sub:${t}`], ["DEL", `kt:sub:e:${sha(o.email)}`], ["SREM", "kt:subs", t], ["SREM", "kt:pending", t], ["SREM", "kt:fxsubs", t], ...dests.map(d => ["SREM", `kt:dest:${d}`, t])]);
    }
    return page(res, "알림을 해지했어요", "저장된 이메일·휴대폰 번호와 알림 설정을 모두 삭제했습니다. 그동안 이용해 주셔서 감사합니다.");
  }
  if (req.method !== "POST") { res.setHeader("Allow", "GET, POST"); return res.status(405).end(); }

  const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  if (b.hp) return res.status(200).json({ ok: true }); // honeypot
  const email = String(b.email || "").trim().toLowerCase().slice(0, 254);
  const phone = String(b.phone || "").replace(/\D/g, "");
  const dest = String(b.dest || "").replace(/[^a-z0-9-]/g, "").slice(0, 24);
  if (!emailOk(email)) return res.status(400).json({ error: "email" });
  if (!b.consent || !b.age14) return res.status(400).json({ error: "consent" });
  if (phone && (!smsReady() || !phoneOk(phone) || !b.smsConsent)) return res.status(400).json({ error: "phone" });
  if (!dest) return res.status(400).json({ error: "dest" });
  const fxBelow = Number(b.fxBelow) > 0 ? +Number(b.fxBelow).toFixed(2) : 0;
  const fxCur = String(b.fxCur || "").replace(/[^A-Z]/g, "").slice(0, 3);

  const [existing] = await db.pipeline([["GET", `kt:sub:e:${sha(email)}`]]);
  const token = existing || crypto.randomBytes(18).toString("base64url");
  const [cur] = await db.pipeline([["HGETALL", `kt:sub:${token}`]]);
  const o = {}; for (let i = 0; i < (cur || []).length; i += 2) o[cur[i]] = cur[i + 1];
  const dests = new Set((o.dests || "").split(",").filter(Boolean)); dests.add(dest);
  const fx = JSON.parse(o.fx || "{}"); if (fxBelow && fxCur) fx[fxCur] = fxBelow;
  const now = new Date().toISOString();
  const fields = ["email", email, "dests", [...dests].join(","), "entry", b.entry === false ? "0" : "1", "fx", JSON.stringify(fx),
    "mk", b.marketing ? "1" : "0", "mkAt", b.marketing ? now : (o.mkAt || ""), "cv", CONSENT_VERSION, "at", o.at || now, "upd", now, "ok", o.ok || "0"];
  if (phone) fields.push("phone", phone, "sms", "1", "smsAt", now);
  const cmds = [["HSET", `kt:sub:${token}`, ...fields], ["SET", `kt:sub:e:${sha(email)}`, token], ["SADD", "kt:subs", token], ["SADD", `kt:dest:${dest}`, token]];
  if (Object.keys(fx).length) cmds.push(["SADD", "kt:fxsubs", token]);
  if (o.ok !== "1") cmds.push(["SADD", "kt:pending", token]);
  await db.pipeline(cmds);

  let mailed = false;
  if (o.ok !== "1" && mailReady()) {
    await sendMail(email, "키워드트립 알림 신청을 확인해 주세요", mailHtml("알림 신청을 확인해 주세요",
      `아래 버튼을 누르면 입국 규정·환율 변경 알림이 시작됩니다.${btn(`${HOST}/api/sub?confirm=${token}`, "알림 신청 확인")}여행 준비 체크리스트도 함께 보내 드려요: <a style="color:#FF1FAF" href="${HOST}/trips/${dest}/checklist">${HOST}/trips/${dest}/checklist</a>`,
      `본인이 신청하지 않았다면 이 메일을 무시하세요. 확인하지 않으면 알림이 발송되지 않습니다. <a style="color:#A3A9C2" href="${HOST}/api/sub?unsub=${token}">신청 취소·정보 삭제</a>`)).then(() => { mailed = true; }).catch(() => {});
    if (mailed) await db.pipeline([["SREM", "kt:pending", token]]);
  }
  return res.status(200).json({ ok: true, confirmed: o.ok === "1", mailed });
}
