// Minimal Upstash Redis REST client (Vercel Marketplace "Upstash for Redis").
// Accepts either Upstash or legacy Vercel KV env names. Returns null when not configured.
export function redis() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return {
    async pipeline(cmds) {
      const r = await fetch(url.replace(/\/$/, "") + "/pipeline", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify(cmds),
      });
      if (!r.ok) throw new Error("redis " + r.status);
      return (await r.json()).map(x => x.result);
    },
  };
}
