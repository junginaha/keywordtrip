// Live FX proxy: KRW base, cached at the edge for 1 hour.
export default async function handler(req, res) {
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/KRW");
    const j = await r.json();
    if (j.result !== "success") throw new Error("upstream");
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).json({ t: new Date(j.time_last_update_unix * 1000).toISOString(), r: j.rates, src: "https://www.exchangerate-api.com" });
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({ error: "fx_unavailable" });
  }
}
