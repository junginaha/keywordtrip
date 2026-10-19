// Private metrics feed: GET /api/stats?key=STATS_KEY → JSON only.
// Last 14 KST days: daily ♡ clicks, alert sign-ups, conversion (sign-ups ÷ clicks), and top 10 destinations.
// Counts only — never contacts. Missing or wrong key → 404.
import crypto from "node:crypto";
import { redis } from "./_store.js";
import { readStats } from "./_metrics.js";

function keyOk(given) {
  const want = process.env.STATS_KEY;
  if (!want || want.length < 32 || typeof given !== "string" || !given) return false;
  const a = crypto.createHash("sha256").update(given).digest(), b = crypto.createHash("sha256").update(want).digest();
  return crypto.timingSafeEqual(a, b);
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  if (req.method !== "GET" || !keyOk(req.query && req.query.key)) return res.status(404).end();
  const db = redis();
  if (!db) return res.status(503).json({ error: "store_not_configured" });
  try {
    return res.status(200).json({ generated_at: new Date().toISOString(), ...(await readStats(db, 14)) });
  } catch (e) {
    console.error("stats", String(e).slice(0, 300));
    return res.status(500).json({ error: "server_error" });
  }
}
