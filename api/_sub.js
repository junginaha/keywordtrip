// Shared helpers for the travel-alert subscription (Supabase REST + signed subscriber tokens).
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUBSCRIBE_SECRET. Without all three the feature stays off.
import crypto from "node:crypto";

export const CONSENT_VERSION = "2026-10-07";

export function config() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY, secret = process.env.SUBSCRIBE_SECRET;
  if (!url || !key || !secret) return null;
  return { url: url.replace(/\/$/, ""), key, secret };
}

export async function sb(cfg, path, { method = "GET", body, prefer } = {}) {
  const r = await fetch(`${cfg.url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: cfg.key,
      authorization: `Bearer ${cfg.key}`,
      "content-type": "application/json",
      ...(prefer ? { prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`supabase ${r.status} ${await r.text().catch(() => "")}`.slice(0, 300));
  return r.status === 204 ? null : r.json().catch(() => null);
}

const sig = (secret, id) => crypto.createHmac("sha256", secret).update(String(id)).digest("base64url").slice(0, 22);
export const tokenFor = (secret, id) => `${id}.${sig(secret, id)}`;
export function idFrom(secret, token) {
  const [id, s] = String(token || "").split(".");
  if (!/^[0-9a-f-]{36}$/.test(id || "") || !s) return null;
  const want = sig(secret, id);
  return s.length === want.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(want)) ? id : null;
}

// Korean mobile number or email. Returns { type, value } or null.
export function parseContact(raw) {
  const s = String(raw || "").trim().slice(0, 120);
  if (s.includes("@")) {
    const e = s.toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(e) ? { type: "email", value: e } : null;
  }
  let d = s.replace(/[^\d+]/g, "");
  if (d.startsWith("+82")) d = "0" + d.slice(3);
  d = d.replace(/\D/g, "");
  return /^01[016789]\d{7,8}$/.test(d) ? { type: "phone", value: d } : null;
}

export const cleanDest = v => String(v || "").replace(/[^a-z0-9-]/gi, "").slice(0, 64);

export function readBody(req) {
  return typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
}
