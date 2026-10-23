// Daily anonymous counters: ♡ clicks and alert sign-ups per destination (KST date).
// Keys: kt:m:want:YYYY-MM-DD / kt:m:sub:YYYY-MM-DD → hash { destination: count }, kept 400 days.
// Only destination + date + count are stored — no contact, IP, cookie or device value.
import { redis } from "./_store.js";

const TTL = String(400 * 86400);
export const kstDate = (t = Date.now()) => new Date(t + 9 * 3600e3).toISOString().slice(0, 10);

export async function bump(kind, destination) {
  const db = redis();
  if (!db || !destination) return;
  const key = `kt:m:${kind}:${kstDate()}`;
  await db.pipeline([["HINCRBY", key, destination, "1"], ["EXPIRE", key, TTL]]);
}

// Partner (affiliate) clicks per day: kt:m:out:YYYY-MM-DD → hash { "<provider>|<destination>": count }. Counts only.
const PROVIDERS = new Set(["flights", "stay", "activity"]);
export async function bumpOut(provider, destination) {
  const db = redis();
  const p = String(provider || ""), d = String(destination || "").replace(/[^a-z0-9-]/gi, "").slice(0, 64);
  if (!db || !PROVIDERS.has(p) || !d) return;
  const key = `kt:m:out:${kstDate()}`;
  await db.pipeline([["HINCRBY", key, `${p}|${d}`, "1"], ["EXPIRE", key, TTL]]);
}
// Last `days` KST days of partner clicks: { totals:{flights,stay,activity}, daily:[{date,flights,stay,activity}], top:[{destination,flights,stay,activity,total}] }
export async function readOut(db, days = 14) {
  const dates = [];
  for (let i = days - 1; i >= 0; i--) dates.push(kstDate(Date.now() - i * 864e5));
  const res = await db.pipeline(dates.map(d => ["HGETALL", `kt:m:out:${d}`]));
  const totals = { flights: 0, stay: 0, activity: 0 }, per = {};
  const daily = dates.map((date, i) => {
    const row = { date, flights: 0, stay: 0, activity: 0 }, a = res[i] || [];
    for (let j = 0; j < a.length; j += 2) {
      const [p, d] = String(a[j]).split("|"), n = +a[j + 1] || 0;
      if (!(p in row)) continue;
      row[p] += n; totals[p] += n;
      const t = per[d] || (per[d] = { destination: d, flights: 0, stay: 0, activity: 0, total: 0 });
      t[p] += n; t.total += n;
    }
    return row;
  });
  const top = Object.values(per).sort((a, b) => b.total - a.total).slice(0, 15);
  return { from: dates[0], to: dates[dates.length - 1], totals, daily, top };
}

const pct = (s, c) => (c ? Math.round((s / c) * 1000) / 10 : null);

// Last `days` KST days, oldest first. conversion_pct = sign-ups ÷ ♡ clicks × 100 (null when no clicks).
export async function readStats(db, days = 14) {
  const dates = [];
  for (let i = days - 1; i >= 0; i--) dates.push(kstDate(Date.now() - i * 864e5));
  const res = await db.pipeline(dates.flatMap(d => [["HGETALL", `kt:m:want:${d}`], ["HGETALL", `kt:m:sub:${d}`]]));
  const per = {};
  const daily = dates.map((date, i) => {
    const sum = (arr, field) => {
      let n = 0;
      for (let k = 0; k < (arr || []).length; k += 2) {
        const v = +arr[k + 1] || 0; n += v;
        (per[arr[k]] ||= { destination: arr[k], clicks: 0, signups: 0 })[field] += v;
      }
      return n;
    };
    const clicks = sum(res[i * 2], "clicks"), signups = sum(res[i * 2 + 1], "signups");
    return { date, clicks, signups, conversion_pct: pct(signups, clicks) };
  });
  const clicks = daily.reduce((a, d) => a + d.clicks, 0), signups = daily.reduce((a, d) => a + d.signups, 0);
  const top = Object.values(per)
    .sort((a, b) => b.clicks - a.clicks || b.signups - a.signups || a.destination.localeCompare(b.destination))
    .slice(0, 10)
    .map(r => ({ ...r, conversion_pct: pct(r.signups, r.clicks) }));
  return { timezone: "Asia/Seoul", from: dates[0], to: dates[dates.length - 1], totals: { clicks, signups, conversion_pct: pct(signups, clicks) }, daily, top };
}
