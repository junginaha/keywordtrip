// Live destination and guide pages for the Apps in Toss mini app.
// Returns the page's HTML so the mini app can show the current content inside Toss
// (the mini app parses it as data and never runs scripts from it).
import { cors } from "./_cors.js";

const SITE = "https://keywordtrip.com";
const ALLOWED_PATH = /^\/(?:trips(?:\/[a-z0-9-]+){0,2}|guides\/[a-z0-9-]+|about|privacy)$/;

export default async function handler(req, res) {
  if (cors(req, res, "GET, OPTIONS")) return;
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  const p = String((req.query && req.query.p) || "").replace(/\.html$/, "").replace(/\/index$/, "");
  if (!ALLOWED_PATH.test(p)) return res.status(400).json({ error: "bad_path" });
  try {
    const r = await fetch(SITE + p, { headers: { "user-agent": "keywordtrip-kt-page" }, redirect: "follow" });
    if (r.status === 404) return res.status(404).json({ error: "not_found" });
    if (!r.ok) throw new Error(String(r.status));
    const html = await r.text();
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
    return res.status(200).send(html);
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({ error: "page_unavailable" });
  }
}
