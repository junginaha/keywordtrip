// CORS for the Apps in Toss mini app (keytrip). The bundle runs on Toss domains,
// not keywordtrip.com, so only these origins are allowed to call the public API.
const ALLOWED = new Set([
  "https://keytrip.apps.tossmini.com",
  "https://keytrip.private-apps.tossmini.com",
]);

// Returns true when the request was a preflight and has been answered.
export function cors(req, res, methods = "GET, POST, OPTIONS") {
  const origin = req.headers.origin;
  if (origin && ALLOWED.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", methods);
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    res.setHeader("Access-Control-Max-Age", "86400");
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}
