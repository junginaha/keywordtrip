// Privacy-safe outbound partner click event logger.
// No email, phone, IP, cookie, or user account data is written by this handler.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const clean = {
      event: "partner_click",
      provider: String(body.provider || "").slice(0, 32),
      destination: String(body.destination || "").slice(0, 64),
      city: String(body.city || "").slice(0, 80),
      at: new Date().toISOString()
    };
    console.log(JSON.stringify(clean));
    res.setHeader("Cache-Control", "no-store");
    return res.status(204).end();
  } catch (e) {
    return res.status(400).json({ error: "bad_request" });
  }
}
