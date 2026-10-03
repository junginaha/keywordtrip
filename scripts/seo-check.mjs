import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const errors=[];
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const exists=p=>fs.existsSync(path.join(root,p));
const htmlFiles=[];

function walk(dir){
  for(const name of fs.readdirSync(path.join(root,dir))){
    const rel=path.join(dir,name);
    const stat=fs.statSync(path.join(root,rel));
    if(stat.isDirectory()) walk(rel);
    else if(name.endsWith(".html")) htmlFiles.push(rel.replaceAll("\\","/"));
  }
}
htmlFiles.push("index.html");
for(const dir of ["trips","guides"]) if(exists(dir)) walk(dir);
if(exists("about.html")) htmlFiles.push("about.html");

const index=read("index.html");
if(Buffer.byteLength(index)>50000) errors.push("index.html exceeds 50KB; move data/CSS/JS out of HTML");
if(/name=["']keywords["']/i.test(index)) errors.push("obsolete meta keywords found");
if(/"numberOfItems"\s*:\s*348/.test(index)) errors.push("oversized 348-item JSON-LD returned");
if(/dataLayer/.test(read("assets/app.js"))) errors.push("dead dataLayer calls remain in app.js");
if(!/href=["']\/assets\/app\.css["']/.test(index)) errors.push("homepage external stylesheet missing");
if(!/src=["']\/assets\/data\.js["']/.test(index)||!/src=["']\/assets\/app\.js["']/.test(index)) errors.push("homepage external JS assets missing");

for(const file of [...new Set(htmlFiles)]){
  const c=read(file);
  if(!/<title>[^<]+<\/title>/i.test(c)) errors.push(file+": missing title");
  if(!/<meta name=["']description["'][^>]+>/i.test(c)) errors.push(file+": missing meta description");
  if(!/<link rel=["']canonical["'][^>]+>/i.test(c)) errors.push(file+": missing canonical");
  const h1=(c.match(/<h1\b/gi)||[]).length;
  if(h1!==1) errors.push(file+": expected exactly one h1, found "+h1);
  if(/<img\b(?![^>]*\balt=)/i.test(c)) errors.push(file+": image without alt");
}

const sitemap=read("sitemap.xml");
const urls=[...sitemap.matchAll(/<loc>https:\/\/keywordtrip\.com\/([^<]*)<\/loc>/g)].map(m=>m[1]);
for(const u of urls){
  if(!u) continue;
  const clean=u.replace(/\/$/,"");
  let file=null;
  if(clean==="about") file="about.html";
  else if(clean.startsWith("trips/")) file=clean+".html";
  else if(clean.startsWith("guides/")) file=clean+".html";
  if(file && !exists(file)) errors.push("sitemap URL has no file: "+u);
}
if(!read("robots.txt").includes("https://keywordtrip.com/sitemap.xml")) errors.push("robots.txt sitemap missing");

if(errors.length){
  console.error("\nSEO health check failed:\n- "+errors.join("\n- "));
  process.exit(1);
}
console.log("SEO health check passed:", new Set(htmlFiles).size, "HTML pages,", urls.length, "sitemap URLs");
