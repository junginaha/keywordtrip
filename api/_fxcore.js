// Shared FX logic for /api/fx and scripts/update-fx.mjs.
// Output: { t, r: {CODE: units of CODE per 1 KRW}, s: {CODE: sourceKey}, chk: {CODE: verifiedAgainst}, srcs }
// Priority per currency:
//   1) 한국수출입은행 매매기준율 (official KRW base; needs KOREAEXIM_KEY; weekdays ~11:00 KST)
//   2) ECB reference rates via Frankfurter (≈30 major currencies)
//   3) ExchangeRate-API open feed (all other currencies)
// Cross-check: any currency present in two sources that differs by more than MAX_DEV is
// replaced by the higher-priority source and reported in `dev`.

const MAX_DEV = 0.025;
export const SOURCES = {
  koreaexim: { name: "한국수출입은행 매매기준율", url: "https://www.koreaexim.go.kr/" },
  ecb: { name: "유럽중앙은행(ECB) 기준환율", url: "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html" },
  erapi: { name: "ExchangeRate-API", url: "https://www.exchangerate-api.com" },
};

async function getJSON(url, ms = 8000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
  try { const r = await fetch(url, { signal: ctl.signal, headers: { accept: "application/json" } }); if (!r.ok) throw new Error(url + " " + r.status); return await r.json(); }
  finally { clearTimeout(t); }
}

async function fromErApi() {
  const j = await getJSON("https://open.er-api.com/v6/latest/KRW");
  if (j.result !== "success" || !j.rates?.USD) throw new Error("erapi");
  return { t: new Date(j.time_last_update_unix * 1000).toISOString(), r: j.rates };
}

async function fromEcb() {
  const j = await getJSON("https://api.frankfurter.dev/v1/latest");
  const krw = j.rates?.KRW; if (!krw) throw new Error("ecb");
  const r = { KRW: 1, EUR: 1 / krw };
  for (const [c, v] of Object.entries(j.rates)) r[c] = v / krw;
  return { t: j.date + "T14:15:00Z", r }; // ECB publishes ~16:00 CET
}

function kstDate(offsetDays = 0) {
  const d = new Date(Date.now() + 9 * 3600e3 - offsetDays * 86400e3);
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}
async function fromKoreaexim(key) {
  if (!key) throw new Error("no key");
  for (let back = 0; back < 5; back++) { // latest business day
    const ymd = kstDate(back);
    const j = await getJSON(`https://oapi.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=${encodeURIComponent(key)}&searchdate=${ymd}&data=AP01`);
    if (!Array.isArray(j) || !j.length || j[0].result !== 1) continue;
    const r = { KRW: 1 };
    for (const row of j) {
      const m = /^([A-Z]{3})(?:\((\d+)\))?$/.exec(row.cur_unit || ""); if (!m || m[1] === "KRW") continue;
      const krwPerUnit = parseFloat(String(row.deal_bas_r).replace(/,/g, "")) / (m[2] ? +m[2] : 1);
      if (krwPerUnit > 0) r[m[1]] = 1 / krwPerUnit;
    }
    // 11:00 KST publication
    return { t: `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6)}T02:00:00Z`, r };
  }
  throw new Error("koreaexim empty");
}

export async function buildRates(env = {}) {
  const [ex, ecb, er] = await Promise.allSettled([fromKoreaexim(env.KOREAEXIM_KEY), fromEcb(), fromErApi()]);
  const layers = [["koreaexim", ex], ["ecb", ecb], ["erapi", er]].filter(([, p]) => p.status === "fulfilled").map(([k, p]) => [k, p.value]);
  if (!layers.length) throw new Error("all fx sources failed");
  const r = { KRW: 1 }, s = {}, chk = {}, dev = {};
  const codes = new Set(layers.flatMap(([, v]) => Object.keys(v.r)));
  for (const c of codes) {
    if (c === "KRW") continue;
    const have = layers.filter(([, v]) => v.r[c] > 0);
    if (!have.length) continue;
    const [k0, v0] = have[0];
    r[c] = v0.r[c]; s[c] = k0;
    if (have[1]) {
      const [k1, v1] = have[1];
      const d = Math.abs(v0.r[c] / v1.r[c] - 1);
      chk[c] = k1;
      if (d > MAX_DEV) dev[c] = +(d * 100).toFixed(2);
    }
  }
  const times = Object.fromEntries(layers.map(([k, v]) => [k, v.t]));
  // headline time = the source used for USD (most-viewed)
  return { t: times[s.USD] || layers[0][1].t, r, s, chk, dev, times };
}
