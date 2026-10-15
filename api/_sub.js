// Shared helpers for the travel-alert subscription + signed subscriber tokens.
// Storage, first match wins:
//   1) Supabase  — SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (+ SUBSCRIBE_SECRET; tables in supabase/subscribe.sql)
//   2) Upstash Redis — UPSTASH_REDIS_REST_URL/TOKEN or KV_REST_API_URL/TOKEN (Vercel Marketplace one-click, no schema)
// SUBSCRIBE_SECRET signs subscriber tokens; on Redis it falls back to a key derived from the Redis token.
import crypto from "node:crypto";
import { redis } from "./_store.js";

export const CONSENT_VERSION = "2026-10-07";

export function config() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY, secret = process.env.SUBSCRIBE_SECRET;
  if (url && key && secret) return { kind: "sb", url: url.replace(/\/$/, ""), key, secret };
  const db = redis();
  if (db) {
    const tok = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
    return { kind: "kv", db, secret: secret || crypto.createHmac("sha256", tok).update("kt-subscribe").digest("base64url") };
  }
  return null;
}

/* ---- storage operations (Supabase or Redis) ---- */
const flat = a => { const o = {}; for (let i = 0; i < (a || []).length; i += 2) o[a[i]] = a[i + 1]; return o; };

export async function upsertSubscriber(cfg, c, marketing) {
  const now = new Date().toISOString();
  if (cfg.kind === "sb") {
    const rows = await sb(cfg, "kt_subscribers?on_conflict=contact", {
      method: "POST", prefer: "resolution=merge-duplicates,return=representation",
      body: [{ contact: c.value, contact_type: c.type, consent_version: CONSENT_VERSION, consent_at: now, marketing, marketing_at: marketing ? now : null }],
    });
    const id = rows && rows[0] && rows[0].id;
    if (!id) throw new Error("no id");
    return id;
  }
  const [existing] = await cfg.db.pipeline([["GET", `kt:subc:${c.value}`]]);
  const id = existing || crypto.randomUUID();
  await cfg.db.pipeline([
    ["SET", `kt:subc:${c.value}`, id],
    ["HSET", `kt:sub:${id}`, "contact", c.value, "contact_type", c.type, "consent_version", CONSENT_VERSION, "consent_at", now, "marketing", marketing ? "1" : "0", "marketing_at", marketing ? now : ""],
    ["SADD", "kt:subs", id],
  ]);
  return id;
}

export async function subscriberExists(cfg, id) {
  if (cfg.kind === "sb") { const rows = await sb(cfg, `kt_subscribers?id=eq.${id}&select=id`); return !!(rows && rows.length); }
  const [n] = await cfg.db.pipeline([["EXISTS", `kt:sub:${id}`]]);
  return n === 1;
}

export async function addDest(cfg, id, destination) {
  if (cfg.kind === "sb") return sb(cfg, "kt_subscriber_destinations?on_conflict=subscriber_id,destination", {
    method: "POST", prefer: "resolution=ignore-duplicates,return=minimal", body: [{ subscriber_id: id, destination }],
  });
  return cfg.db.pipeline([["SADD", `kt:subd:${id}`, destination], ["SADD", `kt:dsub:${destination}`, id]]);
}

export async function deleteSubscriber(cfg, id) {
  if (cfg.kind === "sb") return sb(cfg, `kt_subscribers?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
  const [h, dests] = await cfg.db.pipeline([["HGETALL", `kt:sub:${id}`], ["SMEMBERS", `kt:subd:${id}`]]);
  const contact = flat(h).contact;
  const cmds = [["DEL", `kt:sub:${id}`], ["DEL", `kt:subd:${id}`], ["SREM", "kt:subs", id], ...(dests || []).map(d => ["SREM", `kt:dsub:${d}`, id])];
  if (contact) cmds.push(["DEL", `kt:subc:${contact}`]);
  return cfg.db.pipeline(cmds);
}

// [{ contact, contact_type, marketing, consent_at, dests: [] }] newest first
export async function listSubscribers(cfg) {
  if (cfg.kind === "sb") {
    const rows = await sb(cfg, "kt_subscribers?select=contact,contact_type,marketing,consent_at,kt_subscriber_destinations(destination,created_at)&order=consent_at.desc&limit=10000");
    return (rows || []).map(r => ({ ...r, dests: (r.kt_subscriber_destinations || []).map(d => d.destination) }));
  }
  const [ids] = await cfg.db.pipeline([["SMEMBERS", "kt:subs"]]);
  if (!ids || !ids.length) return [];
  const out = [];
  for (let i = 0; i < ids.length; i += 200) {
    const part = ids.slice(i, i + 200);
    const res = await cfg.db.pipeline(part.flatMap(id => [["HGETALL", `kt:sub:${id}`], ["SMEMBERS", `kt:subd:${id}`]]));
    part.forEach((id, k) => { const h = flat(res[k * 2]); if (h.contact) out.push({ contact: h.contact, contact_type: h.contact_type, marketing: h.marketing === "1", consent_at: h.consent_at, dests: res[k * 2 + 1] || [] }); });
  }
  return out.sort((a, b) => String(b.consent_at).localeCompare(String(a.consent_at)));
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
