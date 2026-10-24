// Live site data for the Apps in Toss mini app, as plain JSON.
// The mini app bundle is reviewed by Toss, so destination data (visa rules, best months, tips,
// new cities) is served from here instead of being frozen inside the bundle.
// Source of truth stays assets/data.js and assets/qa.json; nothing is duplicated.
import vm from "node:vm";
import { cors } from "./_cors.js";

const SITE = "https://keywordtrip.com";
const NAMES = ["DEST", "INFO", "REGIONS", "CUR"];

async function text(path) {
  const r = await fetch(SITE + path, { headers: { "user-agent": "keywordtrip-kt-data" } });
  if (!r.ok) throw new Error(path + " " + r.status);
  return r.text();
}

export function parseData(src) {
  const ctx = vm.createContext({});
  vm.runInContext(src, ctx, { timeout: 1000 });
  const out = vm.runInContext(`({${NAMES.join(",")}})`, ctx, { timeout: 1000 });
  // Round-trip so only plain JSON leaves the server.
  return JSON.parse(JSON.stringify(out));
}

export default async function handler(req, res) {
  if (cors(req, res, "GET, OPTIONS")) return;
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  try {
    const [dataSrc, qaSrc] = await Promise.all([text("/assets/data.js"), text("/assets/qa.json")]);
    const data = parseData(dataSrc);
    if (!Array.isArray(data.DEST) || !data.DEST.length) throw new Error("empty_data");
    const qa = JSON.parse(qaSrc);
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
    return res.status(200).json({ v: 1, data, qa });
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({ error: "data_unavailable" });
  }
}
