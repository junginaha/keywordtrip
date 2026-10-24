// Runs after `ait build`. Stops the release if the bundle's appName is not the one registered
// in the Apps in Toss console, then saves a copy whose file name says which console app it is for,
// so the wrong file cannot be picked by mistake ("appName이 앱 정보와 달라요").
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const CONSOLE_APP = "keywordtrip";       // appName of this app in the Apps in Toss console — never change without the console
const LABEL = "키워드트립";           // Korean app name, used in the release file name

const here = path.dirname(fileURLToPath(import.meta.url));
const config = fs.readFileSync(path.join(here, "apps-in-toss.config.ts"), "utf8");
const configName = (config.match(/appName:\s*"([^"]+)"/) || [])[1];
const fail = (m) => { console.error("\n✖ " + m + "\n"); process.exit(1); };
if (configName !== CONSOLE_APP) fail(`apps-in-toss.config.ts의 appName이 "${configName}"입니다. 콘솔 앱 이름 "${CONSOLE_APP}"과 같아야 합니다.`);

const ait = path.join(here, CONSOLE_APP + ".ait");
if (!fs.existsSync(ait)) fail(`${CONSOLE_APP}.ait가 없습니다. ait build가 실패했는지 확인하세요.`);
let bundle;
// The .ait has a header before the zip data, so unzip warns (exit 1) but still prints the file.
try { bundle = JSON.parse(spawnSync("unzip", ["-p", ait, "bundle.json"], { encoding: "utf8" }).stdout); }
catch { fail(`${CONSOLE_APP}.ait 안의 bundle.json을 읽지 못했습니다.`); }
const inside = bundle && bundle.config && bundle.config.appName;
if (inside !== CONSOLE_APP) fail(`번들 안 appName이 "${inside}"입니다. 콘솔 앱 이름 "${CONSOLE_APP}"과 달라 업로드가 거절됩니다.`);

for (const f of fs.readdirSync(here)) if (f.endsWith(".ait") && f !== CONSOLE_APP + ".ait") fs.rmSync(path.join(here, f));
const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date()).replace(/-/g, "");
const release = `${LABEL}-${CONSOLE_APP}-${day}.ait`;
fs.copyFileSync(ait, path.join(here, release));
console.log(`✔ appName 확인: ${CONSOLE_APP} (콘솔과 일치) → 업로드할 파일: toss/${release}`);
