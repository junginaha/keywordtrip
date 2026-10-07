// Travel-alert subscription: "OO 여행에 꼭 필요한 정보가 바뀌면 알려드릴까요?"
// GET  → { ready } (front end only asks when storage is configured)
// POST { contact, destination, consent:true, marketing, hp } → new/renewed subscriber, returns { sid }
// POST { sid, destination } → adds another saved destination to an existing subscriber
import { config, sb, tokenFor, idFrom, parseContact, cleanDest, readBody, CONSENT_VERSION } from "./_sub.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const cfg = config();
  if (req.method === "GET") return res.status(200).json({ ready: !!cfg });
  if (req.method !== "POST") { res.setHeader("Allow", "GET, POST"); return res.status(405).end(); }
  if (!cfg) return res.status(503).json({ error: "not_ready" });

  let body;
  try { body = readBody(req); } catch { return res.status(400).json({ error: "bad_request" }); }
  const destination = cleanDest(body.destination);
  if (!destination) return res.status(400).json({ error: "destination_required" });

  try {
    // Existing subscriber: just add the destination.
    if (body.sid) {
      const id = idFrom(cfg.secret, body.sid);
      if (!id) return res.status(400).json({ error: "bad_sid" });
      const rows = await sb(cfg, `kt_subscribers?id=eq.${id}&select=id`);
      if (!rows || !rows.length) return res.status(410).json({ error: "gone" });
      await addDest(cfg, id, destination);
      return res.status(200).json({ ok: true });
    }

    if (body.hp) return res.status(200).json({ ok: true }); // honeypot: silently drop bots
    if (body.consent !== true) return res.status(400).json({ error: "consent_required" });
    const c = parseContact(body.contact);
    if (!c) return res.status(400).json({ error: "bad_contact" });

    const now = new Date().toISOString();
    const marketing = body.marketing === true;
    const rows = await sb(cfg, "kt_subscribers?on_conflict=contact", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=representation",
      body: [{
        contact: c.value,
        contact_type: c.type,
        consent_version: CONSENT_VERSION,
        consent_at: now,
        marketing,
        marketing_at: marketing ? now : null,
      }],
    });
    const id = rows && rows[0] && rows[0].id;
    if (!id) throw new Error("no id");
    await addDest(cfg, id, destination);
    return res.status(200).json({ ok: true, sid: tokenFor(cfg.secret, id), type: c.type });
  } catch (e) {
    console.error("subscribe", String(e).slice(0, 300));
    return res.status(500).json({ error: "server_error" });
  }
}

function addDest(cfg, id, destination) {
  return sb(cfg, "kt_subscriber_destinations?on_conflict=subscriber_id,destination", {
    method: "POST",
    prefer: "resolution=ignore-duplicates,return=minimal",
    body: [{ subscriber_id: id, destination }],
  });
}
