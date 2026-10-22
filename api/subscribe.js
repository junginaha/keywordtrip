// Travel-alert subscription: "꼭 필요한 OO 여행 정보가 나오면 알려드릴까요?"
// GET  → { ready } (front end only asks when storage is configured)
// POST { contact, destination, consent:true, marketing, hp } → new/renewed subscriber, returns { sid }
// POST { sid, destination } → adds another saved destination to an existing subscriber
import { bump } from "./_metrics.js";
import { config, tokenFor, idFrom, parseContact, cleanDest, readBody, upsertSubscriber, subscriberExists, addDest } from "./_sub.js";

// Daily sign-up count per destination (count only, never the contact). A failure here never blocks the sign-up.
const countSignup = d => bump("sub", d).catch(e => console.error("metrics", String(e).slice(0, 200)));

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
      if (!(await subscriberExists(cfg, id))) return res.status(410).json({ error: "gone" });
      if (await addDest(cfg, id, destination)) await countSignup(destination);
      return res.status(200).json({ ok: true });
    }

    if (body.hp) return res.status(200).json({ ok: true }); // honeypot: silently drop bots
    if (body.consent !== true) return res.status(400).json({ error: "consent_required" });
    const c = parseContact(body.contact);
    if (!c) return res.status(400).json({ error: "bad_contact" });
    const way = body.way === "email" ? "email" : body.way === "phone" ? "phone" : c.type;
    if (way !== c.type) return res.status(400).json({ error: "bad_contact" });
    const name = String(body.name || "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 30);
    if (!name) return res.status(400).json({ error: "name_required" });
    const message = String(body.message || "").replace(/[\u0000-\u0009\u000b-\u001f<>]/g, "").trim().slice(0, 300);

    const id = await upsertSubscriber(cfg, c, body.marketing === true, { name, message, destination });
    if (await addDest(cfg, id, destination)) await countSignup(destination);
    return res.status(200).json({ ok: true, sid: tokenFor(cfg.secret, id), type: c.type });
  } catch (e) {
    console.error("subscribe", String(e).slice(0, 300));
    return res.status(500).json({ error: "server_error" });
  }
}

