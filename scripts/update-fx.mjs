// Refreshes the embedded FX snapshot (INFO.fx in assets/data.js) from the same verified
// sources as /api/fx. Used by .github/workflows/fx-refresh.yml. Run: node scripts/update-fx.mjs
import fs from "node:fs";
import { buildRates } from "../api/_fxcore.js";

const p = "assets/data.js";
const lines = fs.readFileSync(p, "utf8").split("\n");
const i = lines.findIndex(l => l.startsWith("const INFO = "));
const raw = lines[i].slice("const INFO = ".length).replace(/;\s*$/, "");
const INFO = JSON.parse(raw);

const fx = await buildRates({ KOREAEXIM_KEY: process.env.KOREAEXIM_KEY });
// sanity: never write an implausible snapshot (e.g. upstream glitch)
const prev = INFO.fx?.r || {};
for (const c of ["USD", "JPY", "EUR", "CNY"]) {
  if (!fx.r[c]) throw new Error("missing " + c);
  if (prev[c] && Math.abs(fx.r[c] / prev[c] - 1) > 0.15) throw new Error(`${c} moved >15% vs snapshot — refusing to write`);
}
// keep 6 significant digits
for (const c of Object.keys(fx.r)) fx.r[c] = +fx.r[c].toPrecision(6);
INFO.fx = fx;
lines[i] = "const INFO = " + JSON.stringify(INFO) + ";";
fs.writeFileSync(p, lines.join("\n"));
const per = c => (1 / fx.r[c]);
console.log(`fx snapshot ${fx.t} · 1 USD = ${per("USD").toFixed(2)}원 · 100 JPY = ${(per("JPY") * 100).toFixed(2)}원 · sources ${Object.keys(fx.times).join(",")}${Object.keys(fx.dev).length ? " · deviations " + JSON.stringify(fx.dev) : ""}`);
