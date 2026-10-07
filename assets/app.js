const $ = s => document.querySelector(s);
const fmtCache = {};
function safeTz(tz){try{new Intl.DateTimeFormat("en",{timeZone:tz});return tz}catch(e){return "UTC"}}
DEST.forEach(d=>d.tz=safeTz(d.tz));
function fmt(tz, opts){const k=tz+JSON.stringify(opts);return fmtCache[k]||(fmtCache[k]=new Intl.DateTimeFormat("ko-KR",{timeZone:tz,...opts}))}
function timeIn(tz){return fmt(tz,{hour:"numeric",minute:"2-digit"}).format(new Date())}
function offsetMin(tz,d=new Date()){
  const p=Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:tz,hourCycle:"h23",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}).formatToParts(d).map(x=>[x.type,x.value]));
  const asUTC=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);
  return Math.round((asUTC-d.getTime())/60000);
}
function monthIn(tz){return +new Intl.DateTimeFormat("en-US",{timeZone:tz,month:"numeric"}).format(new Date())}
function hourIn(tz){return +new Intl.DateTimeFormat("en-US",{timeZone:tz,hour:"numeric",hourCycle:"h23"}).format(new Date())}
function diffText(tz){
  const d=offsetMin(tz)-offsetMin("Asia/Seoul");
  if(d===0) return "시차 없음";
  const h=Math.floor(Math.abs(d)/60),m=Math.abs(d)%60;
  return `${h?h+"시간":""}${m?" "+m+"분":""} ${d<0?"느림":"빠름"}`.trim();
}
function season(x,m){
  if(x.hemi==="T") return x.wet?(x.wet.includes(m)?"우기":"건기"):"열대권";
  const n={12:"겨울",1:"겨울",2:"겨울",3:"봄",4:"봄",5:"봄",6:"여름",7:"여름",8:"여름",9:"가을",10:"가을",11:"가을"}[m];
  if(x.hemi==="N") return n;
  return {겨울:"여름",여름:"겨울",봄:"가을",가을:"봄"}[n];
}
function isBest(x){return !!x.best&&x.best.includes(monthIn(x.tz))}
function nextBest(x,m){for(let i=1;i<=12;i++){const n=(m-1+i)%12+1;if(x.best.includes(n))return n}return x.best[0]}
function bestRange(x){return x.best.map(m=>m+"월").join(", ")}

/* curation info */
function visaOf(x){const cc=x.cc;const base=INFO.sch.includes(cc)?INFO.schTxt:(INFO.visa[cc]||"");const n=INFO.note[cc];const xv=INFO.xvisa[x.id];return [base,n,xv].filter(Boolean).join(" ")||"출발 전 목적지 정부·이민기관의 공식 안내에서 입국 조건을 확인하세요."}
const CLS={green:{c:"var(--green)",hex:"#39FF14",l:"무비자"},blue:{c:"var(--blue)",hex:"#2DE2FF",l:"사전 신청"},yellow:{c:"var(--yellow)",hex:"#FFE600",l:"비자·허가 필요"},orange:{c:"var(--orange)",hex:"#FF5E1A",l:"금지·경보"}};
function isBan(x){return INFO.ban.includes(x.cc)}
function isWarn(x){return INFO.warn.includes(x.cc)||INFO.warnId.includes(x.id)}
function vt(x){if(x._v) return x._v;
  let v=INFO.vtypeId[x.id]||null;
  if(!v&&isBan(x)) v=["orange",x.cc==="NE"?"대부분 여행금지":"여행금지",""];
  if(!v) v=INFO.vtype[x.cc]||["yellow","입국 조건 확인 필요",""];
  return x._v=v}
function classOf(x){return vt(x)[0]}
function vShort(x){const [c,l,s]=vt(x);if(c==="orange")return l;if(c==="yellow")return l;return l+(s?" "+s:"")}
function officialOf(x){const a=[...((INFO.official||{})[x.cc]||[]),...((INFO.sch.includes(x.cc)&&INFO.schLinks)||[])];a.push(["외교부 해외안전여행 (여행경보·최신 공지)","https://www.0404.go.kr/"]);return a}
function moneyOf(x){
  let m=(INFO.xmoney[x.id])||INFO.money[x.cc]||"";
  if(!m&&x.cur==="XOF") m=INFO.cfaW; if(!m&&x.cur==="XAF") m=INFO.cfaC; if(!m&&x.cur==="XCD") m=INFO.xcd;
  return m;
}
function tipsOf(x){const a=[...(INFO.xtips[x.id]||[]),...(INFO.tips[x.id]||[]),...((x.country&&!x.sub&&INFO.tips[x.cc])||[])];if(INFO.left.includes(x.cc))a.push("자동차는 좌측 통행(운전석이 오른쪽). 렌터카 운전과 길 건널 때 오른쪽부터 확인.");return [...new Set(a)]}
/* FX: bank-style KRW quotes (100엔 = 850.42원) */
const FX_SRC={koreaexim:"한국수출입은행 매매기준율",ecb:"유럽중앙은행(ECB) 기준환율",erapi:"ExchangeRate-API 시장 중간값"};
const FX_UNIT={JPY:100,VND:100,IDR:100};
function krwPer(code){const r=INFO.fx.r[code];return r?1/r:null}
function unitFor(code){if(FX_UNIT[code])return FX_UNIT[code];const per=krwPer(code);for(const m of [1,100,1000,10000,100000]){if(per*m>=1)return m}return 100000}
function curLabel(code,n){const nm=CUR[code]||code;return n.toLocaleString("ko-KR")+(/\s/.test(nm)?" ":"")+nm}
function wonText(v){return v.toLocaleString("ko-KR",{minimumFractionDigits:v>=10000?0:2,maximumFractionDigits:v>=10000?0:2})+"원"}
function quote(code){const per=krwPer(code);if(!per)return "";const u=unitFor(code);return `${curLabel(code,u)} = ${wonText(per*u)}`}
function rateLine(x){return x.cur&&x.cur!=="KRW"?quote(x.cur):""}
function fmtLocal(v){return v.toLocaleString("ko-KR",{maximumFractionDigits:v>=100?0:v>=1?2:4})}
function fxSrcText(code){const k=(INFO.fx.s&&INFO.fx.s[code])||"erapi";const c=INFO.fx.chk&&INFO.fx.chk[code];return FX_SRC[k]+(c?` (${FX_SRC[c].split(" ")[0]}와 교차 확인)`:"")}
function fxTimeText(){return fmt("Asia/Seoul",{month:"long",day:"numeric",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(INFO.fx.t))}
/* list */
let region="전체", bestOnly=false, query="";
const STOP=["여행","가고","싶어","싶다","추천","곳","나라","어디","좋은","알려줘","찾아줘"];
const SUGGEST=["해변","맛집","자연","야경","동남아","유럽"];
const FOOD=["쿠시카츠","똠얌","반미","타코","타파스","에그타르트","젤라토","베이글","포케","흑돼지","브런치","먹다","크루아상","야시장"];
const SEA=["비치","서핑","본다이","해변","스노클","지중해","파도"];
const ALIAS={"오지":["오지","절해고도","세상끝마을","배로만","인구50명","극지크루즈","원시","미개척","남극","북극곰","외딴"],"섬":["섬","제도","환초","라군"],"해변":SEA,"바다":SEA,"맛집":FOOD,"음식":FOOD,
  "자연":["오로라","빙하","오름","라이스테라스","테이블마운틴","올레길","펭귄","이끼"],
  "역사":["천년고도","유적","모스크","사원","가우디","바자르"],
  "야경":["네온","루프탑","스카이라인","야시장","등불"],
  "휴양":["비치","서핑","스노클","알로하","온천","라이스테라스"],
  "가까운":["일본","대만","한국","베트남"]};
let clsF="";
function renderChips(){
  const words=query.split(/\s+/);
  $("#chips").innerHTML=`<button class="chip" id="bestChip" aria-pressed="${bestOnly}">지금 적기</button>`+
    Object.entries(CLS).map(([k,o])=>`<button class="chip cc" data-c="${k}" style="--vc:${o.c}" aria-pressed="${clsF===k}"><i></i>${o.l}</button>`).join("")+
    SUGGEST.filter(s=>s!=="무비자").map(s=>`<button class="chip${words.includes(s)?" on":""}" data-s="${s}" aria-pressed="${words.includes(s)}">${s}</button>`).join("");
  $("#bestChip").onclick=()=>{bestOnly=!bestOnly;renderChips();renderList()};
  $("#chips").querySelectorAll("[data-c]").forEach(b=>b.onclick=()=>{clsF=clsF===b.dataset.c?"":b.dataset.c;renderChips();renderList()});
  $("#chips").querySelectorAll("[data-s]").forEach(b=>b.onclick=()=>{
    const s=b.dataset.s; const v=(query===s)?"":s; $("#q").value=v; setQuery(v);
  });
}
function chipOk(x){
  if(bestOnly&&!isBest(x)) return false;
  if(clsF&&classOf(x)!==clsF) return false;
  return true;
}
let searchNote="";
function renderList(){
  const base=DEST.filter(chipOk);
  let items=base, ranked=false; searchNote="";
  if(query){const r=KTSearch(query,base);items=r.items;ranked=r.ranked;searchNote=r.note}
  const ans=query&&window.KTAnswer?KTAnswer(query):"";
  $("#empty").hidden=items.length>0||!!ans;
  const active=!!query||bestOnly||!!clsF;
  $("#poster").hidden=active;
  $("#count").innerHTML=active?`<b>${items.length}곳</b>${searchNote?` <span class="snote">${searchNote}</span>`:""}`:"";
  const REG=["아시아","중동","유럽","아프리카","북미","중남미","오세아니아","남극"];
  const cur0=items.filter(x=>!x.country), cs=items.filter(x=>x.country).sort((a,b)=>(REG.indexOf(a.reg)-REG.indexOf(b.reg))||a.city.localeCompare(b.city,"ko"));
  const row=x=>{const c=classOf(x);return `
  <li class="dest" id="d-${x.id}">
    <button data-id="${x.id}" aria-label="${x.city} 정보 열기, ${vShort(x)}">
      <div class="meta"><span><i class="sw" style="--vc:${CLS[c].c}"></i>${x.city}, ${x.c}${isBest(x)?'<span class="best" title="지금 적기"></span>':""}</span><time data-tz="${x.tz}">${timeIn(x.tz)}</time></div>
      <p class="kw">${x.kw.map(k=>`<span>${k}</span>`).join("")}</p>
      ${x.hook?`<p class="hook">${x.hook}</p>`:""}<p class="vline" style="--vc:${CLS[c].c}">${vShort(x)}</p>
    </button>
  </li>`};
  let html="";
  if(ranked){
    html=ans+(items.length?`<li class="divider pinkd"><h2>검색 결과</h2><span>${items.length}곳</span></li>`+items.map(row).join(""):"");
    if(io) io.disconnect();
    $("#list").innerHTML=html; watchTimes(); lastListTick=0;
    $("#list").querySelectorAll("button[data-id]").forEach(b=>b.onclick=()=>openSheet(b.dataset.id,b));
    return;
  }
  html+=ans;
  if(cur0.length) html+=`<li class="divider pinkd"><h2>키워드트립 추천 도시</h2><span>${cur0.length}곳</span></li>`+cur0.map(row).join("");
  let last="";
  if(cs.length) html+=`<li class="divider"><h2>모든 국가·지역</h2><span>${cs.length}곳</span></li>`;
  for(const x of cs){ if(x.reg!==last){last=x.reg;html+=`<li class="regh"><span>${x.reg}</span><span>${cs.filter(i=>i.reg===x.reg).length}</span></li>`} html+=row(x) }
  if(io) io.disconnect();
  $("#list").innerHTML=html; watchTimes(); lastListTick=0;
  $("#list").querySelectorAll("button[data-id]").forEach(b=>b.onclick=()=>openSheet(b.dataset.id,b));
}
function setQuery(v){query=v.trim();
  const u=new URL(location.href); if(query)u.searchParams.set("q",query); else u.searchParams.delete("q"); history.replaceState(null,"",u.pathname+u.search);
  renderChips();renderList();
  const top=$("#poster").hidden?$(".controls").offsetTop:$(".controls").offsetTop;
  if(query&&scrollY<top) scrollTo({top, behavior:reduce?"auto":"smooth"});}
/* anonymous search-term counter: only settled queries (1.5s idle or Enter), once per query per visit */
const qSent=new Set();let qLogT=0;
function logQuery(now){clearTimeout(qLogT);const go=()=>{const q=query.trim().toLowerCase();if(!q||q.length>40||qSent.has(q))return;qSent.add(q);
  const n=$("#list").querySelectorAll(".dest").length;const body=JSON.stringify({q,n});
  try{if(navigator.sendBeacon)navigator.sendBeacon("/api/q",new Blob([body],{type:"application/json"}));else fetch("/api/q",{method:"POST",headers:{"content-type":"application/json"},body,keepalive:true}).catch(()=>{})}catch(e){}};
  now?go():qLogT=setTimeout(go,1500)}
let qT=0;$("#q").addEventListener("input",e=>{clearTimeout(qT);const v=e.target.value;qT=setTimeout(()=>{setQuery(v);logQuery(false)},120)});
$("#q").addEventListener("keydown",e=>{if(e.key==="Enter"){clearTimeout(qT);setQuery(e.target.value);logQuery(true);e.target.blur()}});

/* live clocks */
const visT=new Set();
const io=("IntersectionObserver" in window)?new IntersectionObserver(es=>es.forEach(e=>{e.isIntersecting?visT.add(e.target):visT.delete(e.target)}),{rootMargin:"200px"}):null;
function watchTimes(){visT.clear();document.querySelectorAll("#list time[data-tz]").forEach(t=>{if(io)io.observe(t);else visT.add(t)})}
let lastListTick=0;
function tick(){
  const n=Date.now();
  if(n-lastListTick>15000||lastListTick===0){lastListTick=n;visT.forEach(t=>t.textContent=timeIn(t.dataset.tz))}
  $("#seoul").textContent="서울 "+timeIn("Asia/Seoul");
  const pb=$("#pBtn"); if(pb.dataset.tz) $("#pTime").textContent="현지 "+timeIn(pb.dataset.tz);
  if(cur) paintClock(cur);
}

const reduce=matchMedia("(prefers-reduced-motion: reduce)").matches;

/* sheet */
let cur=null,lastFocus=null,ctl=null;
function paintClock(x){
  $("#shClock").textContent=fmt(x.tz,{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(new Date());
  const h=hourIn(x.tz);
  $("#shDate").textContent=fmt(x.tz,{month:"long",day:"numeric",weekday:"long"}).format(new Date())+(h>=6&&h<19?", 낮":", 밤");
}
function openSheet(id,from){
  const x=DEST.find(d=>d.id===id); cur=x; lastFocus=from;
  const m=monthIn(x.tz);
  $("#shTitle").innerHTML=`${x.city}<small>${x.kw.join(" / ")}</small>`;
  const sh0=$("#sheet");const hx=CLS[classOf(x)].hex;sh0.style.setProperty("--cbg",hx);sh0.style.setProperty("--cfg","#0C1020");
  paintClock(x);
  $("#fDiff").textContent=diffText(x.tz);
  $("#fSeason").textContent=`${m}월, ${season(x,m)}`;
  $("#fNowRow").hidden=!x.best; $("#monthsWrap").hidden=!x.best;
  if(x.best) $("#fNow").textContent=isBest(x)?"지금이 적기":`다음 적기 ${nextBest(x,m)}월`;
  $("#fCur").textContent=`${CUR[x.cur]||""} (${x.cur})`;
  renderInfo(x); renderWant(x); renderBooking(x); setDestinationMeta(x);
  $("#months").innerHTML=Array.from({length:12},(_,i)=>`<span class="${(x.best||[]).includes(i+1)?"b":""} ${i+1===m?"now":""}" title="${i+1}월">${i+1}</span>`).join("");
  $("#mapA").href="https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(x.en);
  $("#wxA").href="https://www.google.com/search?q="+encodeURIComponent((x.cap||x.city)+" 날씨");
  $("#scrim").classList.add("on"); const sh=$("#sheet"); sh.classList.add("on"); sh.setAttribute("aria-hidden","false"); sh.scrollTop=0;
  const u=new URL(location.href);u.searchParams.set("d",x.id);history.replaceState(null,"",u.pathname+u.search);
  setTimeout(()=>$("#close").focus(),50);
}
function closeSheet(){
  ctl?.abort(); cur=null;
  $("#scrim").classList.remove("on"); const sh=$("#sheet"); sh.classList.remove("on"); sh.setAttribute("aria-hidden","true");
  const u=new URL(location.href);u.searchParams.delete("d");history.replaceState(null,"",u.pathname+u.search);resetDestinationMeta();
  lastFocus?.focus();
}
$("#close").onclick=closeSheet; $("#scrim").onclick=closeSheet;
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&cur) closeSheet()});

function briefHTML(x){
  const now=new Date(), m=monthIn(x.tz), [c,l,s]=vt(x);
  const rows=[];
  rows.push(["지금",`${fmt(x.tz,{month:"long",day:"numeric",weekday:"short"}).format(now)} ${timeIn(x.tz)}, ${season(x,m)}`]);
  if(x.best) rows.push(["시기",isBest(x)?`${m}월은 일반 기후 기준 추천 시기`:`다음 일반 기후 기준 추천 시기 ${nextBest(x,m)}월`]);
  const prep=l==="입국 조건 확인 필요"?"목적지 정부·이민기관에서 확인":{green:"무비자 체류 범위와 별도 입국 절차 확인",blue:"출발 전 또는 도착 시 절차 확인",yellow:"비자·입국 허가 조건 확인",orange:"외교부 최신 여행경보와 방문 허가 확인"}[c];
  rows.push(["입국",`${vShort(x)}. ${prep}`]);
  const per=krwPer(x.cur);
  if(per) rows.push(["환율",quote(x.cur)]);
  if(INFO.left.includes(x.cc)) rows.push(["도로","좌측 통행"]);
  return `<section class="fbrief"><h4 class="h-tip">이번 달 브리핑</h4><dl>${rows.map(r=>`<div><dt>${r[0]}</dt><dd>${r[1]}</dd></div>`).join("")}</dl></section>`;
}
function renderInfo(x){
  const v=visaOf(x), mo=moneyOf(x), rl=rateLine(x), tips=tipsOf(x);
  let h=briefHTML(x);
  if(isBan(x)) h+=`<div class="alert"><b>${x.cc==="NE"?"대부분 지역 여행금지":"여행금지국가"}</b> 대한민국 정부의 예외적 여권 사용 허가 없이 방문하면 여권법 위반으로 처벌될 수 있습니다.</div>`;
  else if(isWarn(x)) h+=`<div class="alert soft"><b>일부 지역 여행금지·경보</b> 아래 입국 정보의 금지 지역과 외교부 최신 경보를 확인하세요.</div>`;
  h+=`<section><h4 class="h-in"><i class="vbadge" style="--vc:${CLS[classOf(x)].c}">${vShort(x)}</i>입국 (한국 여권)</h4><p>${v}</p><p class="offl">${officialOf(x).map(([l,u])=>`<a href="${u}" target="_blank" rel="noopener">${l} ↗</a>`).join("")}</p></section>`;
  h+=`<section><h4 class="h-money">돈</h4><p><b>${CUR[x.cur]||x.cur} (${x.cur})</b>${rl?` <span class="rate">${rl}</span>`:""}</p>${mo?`<p>${mo}</p>`:""}${rl?`<div class="conv"><label><span>원</span><input id="cvK" inputmode="decimal" value="10,000" aria-label="원화 금액"></label><span class="eq">=</span><label><span>${x.cur}</span><input id="cvL" inputmode="decimal" aria-label="${x.cur} 금액"></label></div><p class="src">${fxTimeText()} 기준 · ${fxSrcText(x.cur)}. 은행 매매기준율과 같은 개념의 중간값이며, 실제 환전·카드 결제에는 수수료가 붙습니다.</p>`:`<p class="src">${x.cc==="KP"?"북한 원화는 공개 시장 환율이 없습니다.":"이 통화는 공개 시장 환율이 제공되지 않습니다."}</p>`}</section>`;
  if(tips.length) h+=`<section><h4 class="h-tip">키워드트립 팁</h4><ul>${tips.map(t=>`<li>${t}</li>`).join("")}</ul></section>`;
  $("#info").innerHTML=h;
  if(rl){
    const r=INFO.fx.r[x.cur], K=$("#cvK"), Lc=$("#cvL");
    const num=s=>parseFloat(String(s).replace(/,/g,""))||0;
    const f=(v,d)=>v.toLocaleString("ko-KR",{maximumFractionDigits:d});
    const fromK=()=>{Lc.value=f(num(K.value)*r,r*1>=1?0:2)};
    const fromL=()=>{K.value=f(num(Lc.value)/r,0)};
    K.oninput=fromK; Lc.oninput=fromL; fromK();
  }
}


const CURATED_IDS=new Set(DEST.filter(d=>!d.country).map(d=>d.id));
let wantState={when:"",party:""};
function monthLabel(offset){
  const d=new Date(); d.setMonth(d.getMonth()+offset);
  return (d.getMonth()+1)+"월";
}
function renderWant(x){
  const box=$("#wantbox"), btn=$("#wantBtn"), panel=$("#wantPanel"), done=$("#wantDone"), save=$("#wantSave");
  const eligible=CURATED_IDS.has(x.id);
  box.hidden=!eligible;
  if(!eligible) return;
  wantState={when:"",party:""};
  const saved=(()=>{
    try{return JSON.parse(localStorage.getItem("kt_want_"+x.id)||"null")}catch(e){return null}
  })();
  btn.textContent=saved?"♥ 가고 싶어요":"♡ 가고 싶어요";
  btn.setAttribute("aria-expanded","false");
  panel.hidden=true; done.hidden=true; save.disabled=true;
  $("#whenOpts").innerHTML=[
    [monthLabel(0),"this_month"],
    [monthLabel(1),"next_month"],
    ["날짜 미정","someday"]
  ].map(([label,val])=>`<button type="button" data-when="${val}">${label}</button>`).join("");
  $("#whenOpts").querySelectorAll("button").forEach(b=>b.onclick=()=>{
    wantState.when=b.dataset.when;
    $("#whenOpts").querySelectorAll("button").forEach(v=>v.classList.toggle("on",v===b));
    save.disabled=!(wantState.when&&wantState.party);
  });
  $("#partyOpts").querySelectorAll("button").forEach(b=>{
    b.classList.remove("on");
    b.onclick=()=>{
      wantState.party=b.dataset.party;
      $("#partyOpts").querySelectorAll("button").forEach(v=>v.classList.toggle("on",v===b));
      save.disabled=!(wantState.when&&wantState.party);
    };
  });
  btn.onclick=()=>{
    const open=panel.hidden;
    panel.hidden=!open;
    btn.setAttribute("aria-expanded",String(open));
  };
  save.onclick=()=>saveWant(x);
}
async function saveWant(x){
  if(!(wantState.when&&wantState.party)) return;
  const payload={destination:x.id,city:x.city,when:wantState.when,party:wantState.party,at:new Date().toISOString()};
  try{localStorage.setItem("kt_want_"+x.id,JSON.stringify(payload))}catch(e){}
  $("#wantBtn").textContent="♥ 가고 싶어요";
  $("#wantDone").hidden=false;
  $("#wantSave").disabled=true;
  try{await fetch("/api/interest",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload),keepalive:true})}catch(e){}
}
const BASE_META={
  title:document.title,
  desc:document.querySelector('meta[name="description"]')?.content||"",
  canonical:document.querySelector('link[rel="canonical"]')?.href||"https://keywordtrip.com/"
};
// Affiliate URLs live in assets/affiliate.js (shared with the static page builder).
const PARTNER_LINKS=window.KTAffiliate.LINKS;
function partnerClick(provider,x){
  const payload={provider,destination:x.id,city:x.city,at:new Date().toISOString()};
  try{
    const a=JSON.parse(localStorage.getItem("kt_partner_clicks")||"[]");
    a.push(payload);localStorage.setItem("kt_partner_clicks",JSON.stringify(a.slice(-100)));
  }catch(e){}
  try{fetch("/api/outbound",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload),keepalive:true}).catch(()=>{})}catch(e){}
}
async function shareTrip(x){
  const url="https://keywordtrip.com/?d="+encodeURIComponent(x.id);
  const data={title:x.city+" 여행 | KeywordTrip",text:(x.head||x.hook||x.city+" 여행")+" · "+x.kw.join(" · "),url};
  try{
    if(navigator.share){await navigator.share(data)}
    else if(navigator.clipboard){await navigator.clipboard.writeText(url);toast("여행 링크를 복사했어요.")}
    else{prompt("여행 링크를 복사하세요.",url)}
  }catch(e){}
}
function renderBooking(x){
  // No booking CTA for MOFA travel-ban destinations.
  const noBook=isBan(x)||x.cc==="KP";
  const box=$("#bookbox"); if(box) box.hidden=noBook;
  if(noBook) return;
  const disc=document.querySelector("#bookbox .bookdisc"); if(disc) disc.textContent=window.KTAffiliate.DISCLOSURE;
  const links=[
    ["flightA","flights",PARTNER_LINKS.flights(x)],
    ["stayA","stay",PARTNER_LINKS.stay(x)],
    ["actA","activity",PARTNER_LINKS.activity(x)]
  ];
  links.forEach(([id,p,url])=>{const a=$("#"+id);a.href=url;a.onclick=()=>partnerClick(p,x)});
  const sh=$("#shareTripBtn"); if(sh) sh.onclick=()=>shareTrip(x);
}
function setDestinationMeta(x){
  document.title=`${x.city} 여행 | 비자·환율·적기 한눈에 | 키워드트립`;
  const d=document.querySelector('meta[name="description"]');
  if(d)d.content=`${x.city} 여행을 ${x.kw.join("·")} 키워드로 살펴보고 한국 여권 입국 정보, 환율, 현지 시각과 여행 적기를 한눈에 확인하세요.`;
  const can=document.querySelector('link[rel="canonical"]');
  if(can)can.href="https://keywordtrip.com/trips/"+encodeURIComponent(x.id);
}
function resetDestinationMeta(){
  document.title=BASE_META.title;
  const d=document.querySelector('meta[name="description"]');if(d)d.content=BASE_META.desc;
  const can=document.querySelector('link[rel="canonical"]');if(can)can.href=BASE_META.canonical;
}
function fitPoster(){
  const kw=$("#pKw");
  if(kw) kw.style.removeProperty("font-size");
}
addEventListener("resize",fitPoster);
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>fitPoster());
/* poster: today's pick among best-now cities */
function renderPoster(){
  const cur0=DEST.filter(d=>!d.country), pool=cur0.filter(isBest).length?cur0.filter(isBest):cur0;
  const day=Math.floor(Date.now()/864e5);
  const x=pool[day%pool.length], p=$("#pBtn");
  p.style.setProperty("--pbg",x.bg); p.style.setProperty("--pfg",x.fg);
  $("#pKw").innerHTML=x.kw.map(k=>`<span>${k}</span>`).join("");
  $("#pTitle").textContent=`${x.city}, ${x.c}`;
  $("#pHead").textContent=x.head||x.hook||"";
  p.dataset.tz=x.tz; p.onclick=()=>openSheet(x.id,p); p.onkeydown=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openSheet(x.id,p)}};
  fitPoster();
  p.setAttribute("aria-label",`오늘의 추천 여행 ${x.city}, ${x.head||""}: ${x.kw.join(", ")}. 자세히 보기`);
}
function renderFx(){
  const used=[...new Set(DEST.map(d=>d.cur))].filter(c=>INFO.fx.r[c]&&c!=="KRW");
  const rows=used.map(c=>({c,n:CUR[c]||c,m:unitFor(c),v:krwPer(c)})).sort((a,b)=>a.n.localeCompare(b.n,"ko"));
  $("#fxMeta").textContent=`여행지 통화 ${rows.length}개, ${fxTimeText()} 기준`;
  $("#fxgrid").innerHTML=rows.map(o=>`<div><b>${o.n} <span>${o.c}</span></b><span>${curLabel(o.c,o.m)} = ${wonText(o.v*o.m)}</span></div>`).join("");
}
/* voice search with pre-permission popup */
function toast(msg,ms=2800){const t=$("#toast");t.textContent=msg;t.classList.add("on");clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove("on"),ms)}
(function(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition, mic=$("#mic"), pp=$("#pp");
  const isIOS=/iP(hone|ad|od)/.test(navigator.userAgent);
  const howTo=isIOS?"설정 앱 → Safari(또는 사용 중인 브라우저) → 마이크에서 허용해 주세요.":"주소창 왼쪽 자물쇠(사이트 정보) → 마이크 → 허용으로 바꿔 주세요.";
  let rec=null, on=false;
  const store={get(){try{return localStorage.getItem("kt_mic")}catch(e){return null}},set(v){try{localStorage.setItem("kt_mic",v)}catch(e){}}};
  const stop=()=>{on=false;mic.setAttribute("aria-pressed","false");try{rec&&rec.stop()}catch(e){}};
  const openPP=()=>{pp.hidden=false;setTimeout(()=>$("#ppOk").focus(),50)};
  const closePP=()=>{pp.hidden=true;mic.focus()};
  async function permState(){try{if(!navigator.permissions)return "prompt";const s=await navigator.permissions.query({name:"microphone"});return s.state}catch(e){return "prompt"}}
  function start(frame){
    rec=new SR(); rec.lang="ko-KR"; rec.interimResults=true; rec.maxAlternatives=1;
    rec.onresult=e=>{const s=[...e.results].map(r=>r[0].transcript).join(" ").replace(/[.?!]/g,"").trim();$("#q").value=s;setQuery(s);logQuery(false)};
    rec.onerror=e=>{stop();
      if(e.error==="not-allowed"||e.error==="service-not-allowed"){ if(frame){store.set("frameDenied");dictate()} else {store.set("denied");toast("마이크가 차단돼 있어요. "+howTo,6000)} }
      else if(e.error==="no-speech") toast("말소리가 들리지 않았어요. 다시 눌러 말해 보세요.");
      else toast("음성 인식에 실패했어요. 다시 시도해 주세요.")};
    rec.onstart=()=>store.set("granted");
    rec.onend=()=>{if(on){on=false;mic.setAttribute("aria-pressed","false")}};
    try{rec.start();on=true;mic.setAttribute("aria-pressed","true");toast("듣고 있어요. 예: 유럽 무비자, 해변 맛집")}catch(e){stop();toast("음성 인식을 시작하지 못했어요.")}
  }
  const inFrame=(()=>{try{return window.self!==window.top}catch(e){return true}})();
  const dictate=()=>{const q=$("#q");q.focus();toast(isIOS?"키보드 오른쪽 아래 🎤 받아쓰기 버튼을 눌러 말하세요. keywordtrip.com에서는 마이크 버튼으로 바로 검색돼요.":"키보드의 🎤 음성 입력을 눌러 말하세요. keywordtrip.com에서는 마이크 버튼으로 바로 검색돼요.",6000)};
  mic.onclick=async()=>{
    if(inFrame){ $("#q").focus(); if(SR&&store.get()!=="frameDenied"){ try{start(true);return}catch(e){} } dictate(); return }
    if(!SR){toast("이 브라우저는 음성 인식을 지원하지 않아요. 키보드의 마이크 버튼으로 말해 보세요.",4000);$("#q").focus();return}
    if(on){stop();return}
    const st=await permState();
    if(st==="denied"){toast("마이크가 차단돼 있어요. "+howTo,6000);return}
    if(st==="granted"||store.get()==="granted"){start();return}
    openPP();
  };
  $("#ppOk").onclick=()=>{closePP();start()};
  $("#ppNo").onclick=closePP;
  pp.addEventListener("click",e=>{if(e.target===pp)closePP()});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!pp.hidden)closePP()});
})();
const dock=$("#dock"); if(dock) dock.addEventListener("submit",e=>e.preventDefault());

/* question answers (lazy) */
if(window.KTQA){KTQA.onReady(()=>{if(query)renderList()});$("#q").addEventListener("focus",()=>KTQA.load(),{once:true});if(new URLSearchParams(location.search).get("q"))KTQA.load()}
/* init */
document.querySelectorAll("[data-curated-count]").forEach(e=>e.textContent=DEST.filter(d=>!d.country).length);
document.querySelectorAll("[data-tcc-count]").forEach(e=>e.textContent=DEST.filter(d=>d.country).length);
document.querySelectorAll("[data-total-count]").forEach(e=>e.textContent=DEST.length);
renderPoster(); renderChips(); renderList(); renderFx(); tick();
const initParams=new URLSearchParams(location.search);
const initQ=initParams.get("q"); if(initQ){$("#q").value=initQ;setQuery(initQ)}
/* live FX on own domain: /api/fx (Vercel). Falls back to embedded snapshot. */
fetch("/api/fx",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(j=>{
  if(!j||!j.r||!j.r.USD) return;
  INFO.fx=j; renderFx(); if(cur) renderInfo(cur);
}).catch(()=>{});
setInterval(tick,1000);
const d0=new URLSearchParams(location.search).get("d")||location.hash.slice(1); if(DEST.some(d=>d.id===d0)) openSheet(d0,null);
