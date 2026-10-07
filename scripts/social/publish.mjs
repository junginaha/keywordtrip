// Publishes today's reel through the official Instagram API (Instagram Login, graph.instagram.com).
// Needs env IG_USER_ID + IG_ACCESS_TOKEN (Instagram professional account, instagram_business_content_publish).
// Without them it exits quietly — the reel stays on keywordtrip.com/social/ for manual posting.
import fs from "node:fs";
import path from "node:path";

const { IG_USER_ID, IG_ACCESS_TOKEN } = process.env;
const V = process.env.IG_API_VERSION || "v25.0";
const HOST = "https://keywordtrip.com";
const day = process.argv[2] || new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const dir = path.join(process.cwd(), "social/out", day);
const metaPath = path.join(dir, "meta.json");
if (!IG_USER_ID || !IG_ACCESS_TOKEN) { console.log("IG secrets not set — skipping publish (manual: https://keywordtrip.com/social/)"); process.exit(0); }
if (!fs.existsSync(metaPath)) { console.error("no reel for", day); process.exit(1); }
const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
if (meta.published) { console.log("already published", meta.published.id); process.exit(0); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const video = `${HOST}/social/out/${day}/reel.mp4`, cover = `${HOST}/social/out/${day}/cover.jpg`;

// wait until Vercel has deployed the files (Instagram fetches them from the public URL)
for (let i = 0; i < 40; i++) {
  const r = await fetch(video, { method: "HEAD" }).catch(() => null);
  if (r && r.ok && /video/.test(r.headers.get("content-type") || "")) break;
  if (i === 39) { console.error("video URL never became available:", video); process.exit(1); }
  await sleep(15000);
}

async function api(method, p, params) {
  const u = new URL(`https://graph.instagram.com/${V}/${p}`);
  const body = new URLSearchParams({ ...params, access_token: IG_ACCESS_TOKEN });
  const r = method === "GET" ? await fetch(u + "?" + body) : await fetch(u, { method, body });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(`${p}: ${JSON.stringify(j.error || j)}`);
  return j;
}

const caption = fs.readFileSync(path.join(dir, "caption.txt"), "utf8").slice(0, 2200);
const c = await api("POST", `${IG_USER_ID}/media`, { media_type: "REELS", video_url: video, cover_url: cover, caption, share_to_feed: "true" });
let status = "IN_PROGRESS";
for (let i = 0; i < 40 && status === "IN_PROGRESS"; i++) { await sleep(10000); status = (await api("GET", c.id, { fields: "status_code,status" })).status_code; }
if (status !== "FINISHED") throw new Error("container status " + status);
const pub = await api("POST", `${IG_USER_ID}/media_publish`, { creation_id: c.id });
const info = await api("GET", pub.id, { fields: "permalink,timestamp" }).catch(() => ({}));
meta.published = { id: pub.id, permalink: info.permalink || null, at: new Date().toISOString() };
fs.writeFileSync(metaPath, JSON.stringify(meta, null, 1));
console.log("published", pub.id, info.permalink || "");
