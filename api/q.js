// Anonymous search-query counter. Stores only the normalized query text and its result count —
// no IP, cookie, account, or device data. Personal-looking input (emails, phone numbers, long digits) is dropped.
import { redis } from "./_store.js";

const clean = s => String(s || "").normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 40);
const personal = s => /@|\d{6,}|\d{2,4}[- ]\d{3,4}[- ]\d{4}/.test(s);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).end(); }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const q = clean(body.q);
    const n = Math.max(0, Math.min(999, parseInt(body.n, 10) || 0));
    if (q.length < 1 || personal(q)) return res.status(204).end();
    const month = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 7); // KST month
    const db = redis();
    if (db) {
      const cmds = [
        ["ZINCRBY", "kt:q:all", "1", q],
        ["ZINCRBY", `kt:q:${month}`, "1", q],
        ["EXPIRE", `kt:q:${month}`, String(60 * 60 * 24 * 400)],
        ["INCR", "kt:q:total"],
      ];
      if (n === 0) cmds.push(["ZINCRBY", "kt:q0:all", "1", q], ["ZINCRBY", `kt:q0:${month}`, "1", q], ["EXPIRE", `kt:q0:${month}`, String(60 * 60 * 24 * 400)]);
      await db.pipeline(cmds);
    } else {
      console.log(JSON.stringify({ event: "search", q, n, at: new Date().toISOString() }));
    }
    return res.status(204).end();
  } catch (e) {
    return res.status(204).end();
  }
}
