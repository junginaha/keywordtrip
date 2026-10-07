// Outbound messages: email (Resend) and SMS (Solapi). Each is active only when its env vars exist.
import crypto from "node:crypto";

export const mailReady = () => !!process.env.RESEND_API_KEY;
export const smsReady = () => !!(process.env.SOLAPI_KEY && process.env.SOLAPI_SECRET && process.env.SMS_FROM);
const FROM = () => process.env.MAIL_FROM || "키워드트립 <hello@keywordtrip.com>";

export async function sendMail(to, subject, html) {
  if (!mailReady()) return { skipped: true };
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ from: FROM(), to: [to], subject, html, headers: { "List-Unsubscribe": "<https://keywordtrip.com/privacy>" } }),
  });
  if (!r.ok) throw new Error("mail " + r.status + " " + (await r.text()).slice(0, 200));
  return r.json();
}

export async function sendSms(to, text) {
  if (!smsReady()) return { skipped: true };
  const date = new Date().toISOString(), salt = crypto.randomBytes(16).toString("hex");
  const signature = crypto.createHmac("sha256", process.env.SOLAPI_SECRET).update(date + salt).digest("hex");
  const r = await fetch("https://api.solapi.com/messages/v4/send", {
    method: "POST",
    headers: { authorization: `HMAC-SHA256 apiKey=${process.env.SOLAPI_KEY}, date=${date}, salt=${salt}, signature=${signature}`, "content-type": "application/json" },
    body: JSON.stringify({ message: { to: to.replace(/\D/g, ""), from: process.env.SMS_FROM.replace(/\D/g, ""), text } }),
  });
  if (!r.ok) throw new Error("sms " + r.status + " " + (await r.text()).slice(0, 200));
  return r.json();
}

// Simple branded email shell (inline styles only)
export const mailHtml = (title, body, foot = "") => `<!doctype html><html lang="ko"><body style="margin:0;background:#0C1020;color:#F2F3F8;font-family:Apple SD Gothic Neo,Noto Sans KR,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:28px 22px">
<p style="margin:0 0 18px;font-weight:800;font-size:18px"><span style="color:#39FF14">●</span> 키워드트립</p>
<h1 style="font-size:22px;line-height:1.4;margin:0 0 14px">${title}</h1>
<div style="font-size:15px;line-height:1.75;color:#D6DAE8">${body}</div>
<p style="margin:28px 0 0;font-size:12px;line-height:1.6;color:#A3A9C2">${foot}</p>
</div></body></html>`;
export const btn = (href, label) => `<p style="margin:22px 0"><a href="${href}" style="display:inline-block;padding:13px 20px;border-radius:12px;background:#FF1FAF;color:#0C1020;font-weight:800;text-decoration:none">${label}</a></p>`;
