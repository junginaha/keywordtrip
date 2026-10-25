// CORS for the Apps in Toss mini app. The bundle runs on Toss domains
// (<appName>.apps.tossmini.com, and private-apps for console QR tests), not keywordtrip.com,
// so only these origins are allowed to call the public API.
// Toss console app name: keywordtrip (the only KeywordTrip mini app).
const ALLOWED = new Set(
  ["keywordtrip"].flatMap((app) => [
    `https://${app}.apps.tossmini.com`,
    `https://${app}.private-apps.tossmini.com`,
  ]),
);

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
