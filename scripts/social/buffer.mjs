// Sends today's reel to Instagram through Buffer's official API (no Facebook needed —
// Buffer connects to Instagram with Instagram login). Env: BUFFER_API_TOKEN (Buffer → Settings → API),
// optional BUFFER_CHANNEL_ID. Without a token it exits quietly.
import fs from "node:fs";
import path from "node:path";

const TOKEN = process.env.BUFFER_API_TOKEN;
const HOST = "https://keywordtrip.com";
const day = process.argv[2] || new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const dir = path.join(process.cwd(), "social/out", day), metaPath = path.join(dir, "meta.json");
if (!TOKEN) { console.log("BUFFER_API_TOKEN not set — skipping Buffer"); process.exit(0); }
if (!fs.existsSync(metaPath)) { console.error("no reel for", day); process.exit(1); }
const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
if (meta.published) { console.log("already published", JSON.stringify(meta.published)); process.exit(0); }

async function gql(query, variables) {
  const r = await fetch("https://api.buffer.com", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN}`, "user-agent": "keywordtrip-bot/1.0" },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.errors) throw new Error(`Buffer ${r.status}: ${JSON.stringify(j.errors || j).slice(0, 500)}`);
  return j.data;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
const video = `${HOST}/social/out/${day}/reel.mp4`;

// 1) wait for Vercel to serve the file
for (let i = 0; i < 40; i++) {
  const r = await fetch(video, { method: "HEAD" }).catch(() => null);
  if (r && r.ok && /video/.test(r.headers.get("content-type") || "")) break;
  if (i === 39) throw new Error("video URL never became available: " + video);
  await sleep(15000);
}

// 2) find the Instagram channel
let channelId = process.env.BUFFER_CHANNEL_ID;
if (!channelId) {
  const { account } = await gql(`{ account { organizations { id } } }`);
  for (const o of account.organizations) {
    const { channels } = await gql(`query($i: ChannelsInput!) { channels(input: $i) { id service name } }`, { i: { organizationId: o.id } });
    const ig = channels.find(c => c.service === "instagram");
    if (ig) { channelId = ig.id; console.log("Instagram channel:", ig.name); break; }
  }
  if (!channelId) throw new Error("No Instagram channel connected in Buffer");
}

// 3) read the schema so asset/metadata shapes match the live API
const T = async name => (await gql(`query($n: String!) { __type(name: $n) { inputFields { name type { name kind ofType { name kind ofType { name kind } } } } enumValues { name } } }`, { n: name })).__type;
const typeName = t => t && (t.name || typeName(t.ofType));
const assetsT = await T("AssetsInput").catch(() => null) || await T("PostAssetsInput").catch(() => null);
const fields = Object.fromEntries((assetsT?.inputFields || []).map(f => [f.name, f]));
let assets;
if (fields.videos) assets = { videos: [{ url: video }] };
else if (fields.video) assets = { video: { url: video } };
else throw new Error("Buffer API has no video asset field: " + Object.keys(fields).join(","));

let metadata;
const metaT = await T("PostInputMetaData").catch(() => null);
const igField = metaT?.inputFields?.find(f => f.name === "instagram");
if (igField) {
  const igT = await T(typeName(igField.type));
  const ig = {};
  const typeF = igT?.inputFields?.find(f => f.name === "type");
  if (typeF) { const en = await T(typeName(typeF.type)); const reel = en?.enumValues?.find(v => /reel/i.test(v.name)); if (reel) ig.type = reel.name; }
  if (igT?.inputFields?.some(f => f.name === "shouldShareToFeed")) ig.shouldShareToFeed = true;
  if (Object.keys(ig).length) metadata = { instagram: ig };
}

// 4) publish now (the workflow runs at the posting time)
const caption = fs.readFileSync(path.join(dir, "caption.txt"), "utf8").slice(0, 2200);
const input = { channelId, text: caption, schedulingType: "automatic", mode: "shareNow", assets, ...(metadata ? { metadata } : {}) };
const data = await gql(`mutation($input: CreatePostInput!) { createPost(input: $input) { ... on PostActionSuccess { post { id status externalLink } } ... on MutationError { message } } }`, { input });
const res = data.createPost;
if (!res.post) throw new Error("Buffer rejected the post: " + (res.message || JSON.stringify(res)));
meta.published = { via: "buffer", id: res.post.id, status: res.post.status, permalink: res.post.externalLink || null, at: new Date().toISOString() };
fs.writeFileSync(metaPath, JSON.stringify(meta, null, 1));
console.log("sent to Buffer:", res.post.id, res.post.status);
