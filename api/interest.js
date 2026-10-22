// Anonymous "가고 싶어요" heart counter per destination (all-time + per KST day). Stores no contact, IP, cookie or device data.
// The page sends at most one click per destination per day per browser (repeat taps are dropped client-side).
import { redis } from "./_store.js";
import { bump } from "./_metrics.js";
import { cors } from "./_cors.js";

export default async function handler(req, res) {
  if (cors(req, res)) return;
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).end(); }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const destination = String(body.destination || "").replace(/[^a-z0-9-]/gi, "").slice(0, 64);
    if (!destination) return res.status(400).end();
    const db = redis();
    if (db) await Promise.all([db.pipeline([["ZINCRBY", "kt:want", "1", destination]]), bump("want", destination)]);
    else console.log(JSON.stringify({ event: "want", destination, at: new Date().toISOString() }));
    return res.status(204).end();
  } catch (e) {
    return res.status(400).end();
  }
}
