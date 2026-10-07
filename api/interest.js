// Anonymous "가고 싶어요" heart counter per destination. Stores no contact, IP, cookie or device data.
import { redis } from "./_store.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).end(); }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const destination = String(body.destination || "").replace(/[^a-z0-9-]/gi, "").slice(0, 64);
    if (!destination) return res.status(400).end();
    const db = redis();
    if (db) await db.pipeline([["ZINCRBY", "kt:want", "1", destination]]);
    else console.log(JSON.stringify({ event: "want", destination, at: new Date().toISOString() }));
    return res.status(204).end();
  } catch (e) {
    return res.status(400).end();
  }
}
