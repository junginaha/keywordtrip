// Live FX on own domain. KRW base, verified across sources (see _fxcore.js). Edge-cached 30 min.
import { buildRates } from "./_fxcore.js";

export default async function handler(req, res) {
  try {
    const j = await buildRates({ KOREAEXIM_KEY: process.env.KOREAEXIM_KEY });
    res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=43200");
    res.status(200).json(j);
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({ error: "fx_unavailable" });
  }
}
