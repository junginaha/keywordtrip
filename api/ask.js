// Visitor Q&A per destination (moderated).
//   GET  /api/ask?d=tokyo  → { ready, items:[{q,a,at}] } approved only
//   POST /api/ask          → { d, q, hp } new question (pending, no personal data stored)
//   POST /api/ask (admin)  → form from /api/search-report?view=qa : { key, id, action: approve|delete, answer }
import crypto from "node:crypto";
import { redis } from "./_store.js";

const clean = s => String(s || "").replace(/\s+/g, " ").trim();
const blocked = s => /https?:\/\/|www\.|\.com\b|카톡|텔레그램|t\.me|010[-\s]?\d{3,4}|@[a-z0-9_]{3,}/i.test(s);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const db = redis();
  if (req.method === "GET") {
    const d = String(req.query.d || "").replace(/[^a-z0-9-]/g, "").slice(0, 24);
    if (!db || !d) return res.status(200).json({ ready: !!db, items: [] });
    const [list] = await db.pipeline([["LRANGE", `kt:qa:${d}`, "0", "49"]]);
    return res.status(200).json({ ready: true, items: (list || []).map(s => JSON.parse(s)) });
  }
  if (req.method !== "POST") { res.setHeader("Allow", "GET, POST"); return res.status(405).end(); }
  if (!db) return res.status(503).json({ error: "not_ready" });
  const b = typeof req.body === "string" ? (req.body.startsWith("{") ? JSON.parse(req.body) : Object.fromEntries(new URLSearchParams(req.body))) : (req.body || {});

  // admin moderation
  if (b.key) {
    if (!process.env.SEARCH_REPORT_KEY || b.key !== process.env.SEARCH_REPORT_KEY) return res.status(404).end();
    const id = String(b.id || "").slice(0, 40);
    const [raw] = await db.pipeline([["HGET", "kt:qa:pending", id]]);
    if (raw) {
      const o = JSON.parse(raw);
      if (b.action === "approve" && clean(b.answer)) await db.pipeline([["LPUSH", `kt:qa:${o.d}`, JSON.stringify({ q: o.q, a: clean(b.answer).slice(0, 1200), at: new Date().toISOString().slice(0, 10) })], ["HDEL", "kt:qa:pending", id]]);
      if (b.action === "delete") await db.pipeline([["HDEL", "kt:qa:pending", id]]);
    }
    res.setHeader("Location", `/api/search-report?view=qa&key=${encodeURIComponent(b.key)}`); return res.status(303).end();
  }

  if (b.hp) return res.status(200).json({ ok: true });
  const d = String(b.d || "").replace(/[^a-z0-9-]/g, "").slice(0, 24), q = clean(b.q).slice(0, 300);
  if (!d || q.length < 6) return res.status(400).json({ error: "short" });
  if (blocked(q)) return res.status(400).json({ error: "blocked" });
  const [n] = await db.pipeline([["INCR", `kt:qa:rate:${new Date().toISOString().slice(0, 13)}`], ["EXPIRE", `kt:qa:rate:${new Date().toISOString().slice(0, 13)}`, "7200"]]);
  if (n > 60) return res.status(429).json({ error: "busy" });
  const id = crypto.randomBytes(8).toString("hex");
  await db.pipeline([["HSET", "kt:qa:pending", id, JSON.stringify({ d, q, at: new Date().toISOString() })]]);
  return res.status(200).json({ ok: true });
}
