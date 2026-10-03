// Anonymous travel-interest signal for KeywordTrip's curation experiment.
// Stores no name, email, phone, account, or free-form user text.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const clean = {
      event: "travel_interest",
      destination: String(body.destination || "").slice(0, 64),
      city: String(body.city || "").slice(0, 80),
      when: ["this_month","next_month","someday"].includes(body.when) ? body.when : "unknown",
      party: ["solo","together"].includes(body.party) ? body.party : "unknown",
      at: new Date().toISOString()
    };
    if (!clean.destination) return res.status(400).json({ error: "destination_required" });
    console.log(JSON.stringify(clean));
    res.setHeader("Cache-Control", "no-store");
    return res.status(204).end();
  } catch (e) {
    return res.status(400).json({ error: "bad_request" });
  }
}
