/* KeywordTrip 맞춤 찾기: 언제·누구와·어떤 여행·예산·입국·비행 → 목록을 걸러 순위대로 보여 줌.
 * 비행시간·예산은 서울 출발 1인 4~5일 기준 대략값(필터·정렬용). app.js의 chipOk/renderList가 window.KTF를 참조한다. */
(function () {
  /* 서울(인천) 출발 대략 비행시간(시간, 직항 또는 1회 경유 기준) */
  const FLY_CC = { KR: 1, JP: 2.2, CN: 2.2, TW: 2.5, RU: 15, MN: 3.5, HK: 3.6, MO: 3.6, PH: 4, VN: 4.8, GU: 4.5, MP: 4.5, PW: 5, KH: 5.5, LA: 5.5, TH: 6, BN: 5.5, MY: 6.5, SG: 6.5, MM: 6.5, ID: 7, KZ: 6.5, KG: 6.5, UZ: 7.5, NP: 8, IN: 9, BD: 9, LK: 9.5, FM: 9, PG: 9, AE: 10, QA: 10.5, AU: 10.5, NC: 10, FJ: 10, MV: 11, MH: 12, NZ: 12, TR: 12, BH: 12, KW: 12, OM: 12, SA: 12, GE: 12, AZ: 12, IR: 13, AM: 13, ET: 13, IL: 13, FI: 13, US: 13, CA: 11, EG: 14, JO: 14, SC: 14, MU: 15, MX: 15, BT: 12, PK: 11, TL: 10, SB: 12, VU: 13 };
  const FLY_REG = { 아시아: 7, 오세아니아: 16, 중동: 13, 유럽: 14, 북미: 14, 중남미: 24, 아프리카: 18, 남극: 40 };
  const FLY_ID = { "kr-jj": 1, jeju: 1, okinawa: 2.5, "jp-ry": 2.5, sapporo: 3, "jp-og": 30, "cn-xz": 9, "cn-hi": 5, "ru-as": 2.5, "in-an": 12, honolulu: 9, "us-hi": 9, "us-ak": 12, losangeles: 11, sanfrancisco: 11, lasvegas: 12, newyork: 14, vancouver: 10, cancun: 18, "cl-ei": 30, gl: 20, pm: 22, bm: 20, pn: 40, tk: 30 };
  const PRICEY = new Set(["CH", "IS", "NO", "MV", "PF", "SC", "BM", "FO", "SJ", "GL", "MC", "LI", "DK", "BT"]);
  const DUP = { hk: 1, mo: 1, sg: 1, gu: 1, "kr-jj": 1 };
  const fly = x => FLY_ID[x.id] ?? FLY_CC[x.cc] ?? FLY_REG[x.reg] ?? 15;
  function budget(x) {
    const h = fly(x);
    let r = h <= 2.6 ? [30, 80] : h <= 4.6 ? [50, 120] : h <= 7 ? [70, 150] : h <= 11 ? [120, 250] : h <= 16 ? [180, 350] : [250, 600];
    if (PRICEY.has(x.cc)) r = [r[0] * 1.4, r[1] * 1.4];
    return r;
  }
  const BUDGET = { u50: [0, 50], b100: [50, 100], b200: [100, 200], o200: [200, 9999] };

  /* 여행 성격 → 키워드 */
  const BIG = new Set(["tokyo", "osaka", "fukuoka", "kyoto", "sapporo", "hanoi", "hochiminh", "bangkok", "taipei", "hongkong", "macau", "singapore", "kualalumpur", "shanghai", "beijing", "qingdao", "dubai", "paris", "london", "rome", "barcelona", "prague", "vienna", "budapest", "lisbon", "istanbul", "newyork", "losangeles", "lasvegas", "sanfrancisco", "vancouver", "mexicocity", "sydney", "melbourne", "capetown", "sg", "hk", "mo", "mc"]);
  const RESORT = new Set(["okinawa", "danang", "nhatrang", "phuquoc", "phuket", "bali", "cebu", "boracay", "kotakinabalu", "guam", "saipan", "honolulu", "cancun", "santorini", "jeju", "kr-jj", "mv", "pf", "fj", "pw", "sc", "mu", "us-hi", "gu", "mp", "nc", "ck"]);
  const SHOP = new Set(["tokyo", "osaka", "hongkong", "singapore", "bangkok", "dubai", "paris", "london", "newyork", "taipei", "shanghai", "kualalumpur", "istanbul", "lasvegas", "hk", "sg", "macau"]);
  const W = {
    rest: ["해변", "리조트", "라군", "환초", "스노클", "석양", "비치", "에메랄드", "풀빌라", "온천", "휴양", "바다", "산호초", "호핑", "섬", "지중해", "카리브"],
    food: ["맛집", "미식", "야시장", "똠얌", "쌀국수", "딤섬", "라멘", "타코", "타파스", "에그타르트", "젤라토", "해산물", "커피", "와인", "맥주", "카카오", "망고", "랍스터", "호커센터", "나시르막", "샤오롱바오", "베이징덕", "훠궈", "반미", "스시", "초밥", "치즈", "초콜릿", "빵", "디저트", "시장", "포케", "럼", "케밥", "흑돼지"],
    nature: ["화산", "빙하", "오로라", "사막", "국립공원", "협곡", "폭포", "트레킹", "정글", "열대우림", "초원", "고원", "호수", "사파리", "고래", "피오르", "숲", "동굴", "펭귄", "알프스", "산", "석호", "원시", "사하라", "고래상어", "열기구"],
    city: ["야경", "루프탑", "스카이라인", "트램", "마천루", "도심", "카페", "박물관", "미술관", "브런치", "펍", "카지노"],
    shop: ["쇼핑", "면세", "아울렛", "수크", "야시장", "백화점", "명품", "시장"],
    culture: ["사원", "성당", "유적", "수도원", "박물관", "구시가", "궁", "왕궁", "모스크", "고대", "피라미드", "오페라", "미술관", "요새", "성", "세계유산", "신전", "앙코르", "만리장성", "고성"],
    act: ["다이빙", "서핑", "스노클", "트레킹", "카이트서핑", "열기구", "스카이다이빙", "래프팅", "스키", "자전거", "사파리", "하이킹", "번지", "집라인", "요트", "케이블카", "호핑"],
    quiet: ["원시", "소국", "환초", "오지", "수도원", "고원", "초원", "호수", "조용", "한적", "섬", "석호", "피오르"],
  };
  const text = x => [x.city, x.c, x.head, x.hook, ...(x.kw || [])].join(" ");
  const has = (x, k) => W[k].some(w => text(x).includes(w));
  const THEME = {
    warm: x => warmOk(x),
    rest: x => RESORT.has(x.id) || has(x, "rest"),
    food: x => has(x, "food") || (BIG.has(x.id) && !x.country),
    nature: x => has(x, "nature"),
    city: x => BIG.has(x.id) || has(x, "city"),
    shop: x => SHOP.has(x.id) || has(x, "shop"),
    culture: x => has(x, "culture"),
    act: x => has(x, "act"),
    quiet: x => !BIG.has(x.id) && (has(x, "quiet") || !!x.terr),
  };
  const WHO_BOOST = {
    solo: ["카페", "트레킹", "박물관", "구시가", "야시장", "자전거"],
    couple: ["야경", "석양", "리조트", "와인", "루프탑", "라군", "풀빌라"],
    friends: ["맛집", "야시장", "펍", "맥주", "서핑", "다이빙", "카지노"],
    family: ["리조트", "해변", "온천", "테마파크", "동물", "수족관", "케이블카"],
    kids: ["리조트", "해변", "테마파크", "동물", "수족관", "펭귄", "사파리"],
    parents: ["온천", "사원", "구시가", "호수", "케이블카", "정원", "성당"],
  };
  function warmOk(x) {
    const ms = S.months || [monthIn(x.tz)];
    return ms.some(m => x.hemi === "T" || x.id === "es-cn"
      || (x.hemi === "S" && [11, 12, 1, 2, 3].includes(m))
      || (x.hemi === "N" && [6, 7, 8].includes(m))
      || (x.hemi === "N" && ["중동", "아프리카"].includes(x.reg) && [10, 11, 12, 1, 2, 3, 4].includes(m)));
  }

  /* 상태 */
  const S = { when: "", months: null, who: "", themes: new Set(), budget: "", entry: "", flight: "", etc: { who: "", theme: "", budget: "", entry: "" } };
  const nowM = () => +new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", month: "numeric" }).format(new Date());
  function setWhen(v) {
    S.when = v;
    S.months = v === "this" || v === "now" ? [nowM()] : v === "next" ? [nowM() % 12 + 1] : /^m\d+$/.test(v) ? [+v.slice(1)] : null;
  }
  const etcText = () => Object.values(S.etc).map(s => s.trim()).filter(Boolean).join(" ");
  const KTF = window.KTF = {
    get active() { return !!(S.when || S.who || S.themes.size || S.budget || S.entry || S.flight || etcText()); },
    get n() { return [S.when, S.who, S.budget, S.entry, S.flight].filter(Boolean).length + S.themes.size + (etcText() ? 1 : 0); },
    get text() { return etcText(); },
    ok(x) {
      if (!this.active) return true;
      const c = classOf(x);
      if (c === "orange" || isWarn(x)) return false;
      if (DUP[x.id]) return false; /* 추천 도시와 겹치는 지역 항목은 숨김 */
      if (S.months && !(x.best || []).some(m => S.months.includes(m))) return false;
      if ((S.when === "now" || S.entry === "easy") && c !== "green") return false;
      if (S.flight === "short" && fly(x) > 6) return false;
      if (S.budget) { const [lo, hi] = BUDGET[S.budget], [a, b] = budget(x); if (b < lo || a > hi) return false; }
      if ((S.who === "kids" || S.who === "parents") && c === "yellow") return false;
      if (S.themes.size && ![...S.themes].some(t => THEME[t](x))) return false;
      return true;
    },
    score(x) {
      let s = 0;
      for (const t of S.themes) if (THEME[t](x)) s += 3;
      if (S.themes.has("rest") && RESORT.has(x.id)) s += 2;
      if (S.themes.has("city") && BIG.has(x.id)) s += 1;
      if (S.who) s += WHO_BOOST[S.who].filter(w => text(x).includes(w)).length * 1.5;
      if (S.who === "kids" || S.who === "parents" || S.who === "family") s -= fly(x) / 6;
      if (S.flight === "short") s -= fly(x) / 2;
      if (!x.country) s += 1.2; /* 추천 도시 먼저 */
      if (isBest(x)) s += 0.8;
      return s;
    },
    summary() {
      const L = [];
      if (S.when) L.push(S.when === "now" ? "지금 바로" : S.when === "this" ? "이번 달" : S.when === "next" ? "다음 달" : S.months[0] + "월");
      if (S.who) L.push(LBL.who[S.who]);
      S.themes.forEach(t => L.push(LBL.theme[t]));
      if (S.budget) L.push(LBL.budget[S.budget]);
      if (S.entry) L.push("비자 걱정 없이");
      if (S.flight) L.push("짧은 비행");
      if (etcText()) L.push(`"${etcText()}"`);
      return L;
    },
    reset() { setWhen(""); S.who = S.budget = S.entry = S.flight = ""; S.themes.clear(); for (const k in S.etc) S.etc[k] = ""; },
  };

  /* UI */
  const LBL = {
    who: { solo: "혼자", couple: "연인", friends: "친구", family: "가족", kids: "아이와", parents: "부모님과" },
    theme: { warm: "따뜻한 곳", rest: "휴양", food: "음식", nature: "자연", city: "도시", shop: "쇼핑", culture: "문화", act: "액티비티", quiet: "조용한 곳" },
    budget: { "": "상관없음", u50: "50만원 이하", b100: "50~100만원", b200: "100~200만원", o200: "200만원 이상" },
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const chip = (g, v, l, on) => `<button type="button" class="fchip" data-g="${g}" data-v="${v}" aria-pressed="${on}">${l}</button>`;
  const etc = g => `<button type="button" class="fchip fetc" data-etc="${g}" aria-pressed="${!!S.etc[g]}">기타</button><input class="fin" data-etcin="${g}" maxlength="30" placeholder="직접 적어 주세요" value="${esc(S.etc[g])}"${S.etc[g] ? "" : " hidden"}>`;
  const row = (t, sub, body) => `<div class="frow"><p class="fl">${t}${sub ? `<small>${sub}</small>` : ""}</p><div class="fopts">${body}</div></div>`;

  function body() {
    const m = /^m\d+$/.test(S.when) ? +S.when.slice(1) : 0;
    const monthSel = `<label class="fsel${m ? " on" : ""}"><span>${m ? m + "월" : "날짜 선택"}</span><select id="fMonth" aria-label="여행 월 선택"><option value="">날짜 선택</option>${Array.from({ length: 12 }, (_, i) => `<option value="m${i + 1}"${m === i + 1 ? " selected" : ""}>${i + 1}월</option>`).join("")}</select></label>`;
    return row("언제", "", chip("when", "now", "지금 바로", S.when === "now") + chip("when", "this", "이번 달", S.when === "this") + chip("when", "next", "다음 달", S.when === "next") + monthSel)
      + row("누구와", "", Object.entries(LBL.who).map(([v, l]) => chip("who", v, l, S.who === v)).join("") + etc("who"))
      + row("어떤 여행", "여러 개 가능", Object.entries(LBL.theme).map(([v, l]) => chip("theme", v, l, S.themes.has(v))).join("") + etc("theme"))
      + row("예산", "1인 4~5일 대략", Object.entries(LBL.budget).map(([v, l]) => chip("budget", v, l, S.budget === v)).join("") + etc("budget"))
      + row("입국", "", chip("entry", "easy", "비자 신경 쓰기 싫어요", S.entry === "easy") + chip("entry", "", "상관없어요", !S.entry) + etc("entry"))
      + row("비행", "", chip("flight", "short", "짧을수록 좋아요", S.flight === "short") + chip("flight", "", "상관없어요", !S.flight));
  }

  const btn = document.getElementById("findBtn"), box = document.getElementById("finder"), scrim = document.getElementById("fScrim");
  if (!btn || !box) return;
  const opts = box.querySelector("#fBody"), go = box.querySelector("#fGo");
  let last = null;
  function paint() {
    opts.innerHTML = body();
    go.textContent = KTF.active ? `${DEST.filter(x => KTF.ok(x)).length}곳 보기` : "전체 보기";
    box.querySelector("#fReset").hidden = !KTF.active;
  }
  function badge() {
    btn.classList.toggle("on", KTF.active);
    btn.querySelector("b").textContent = KTF.active ? KTF.n : "";
  }
  function open() { last = document.activeElement; paint(); scrim.classList.add("on"); box.classList.add("on"); box.setAttribute("aria-hidden", "false"); box.scrollTop = 0; setTimeout(() => box.querySelector("#fClose").focus(), 50); }
  function close() { scrim.classList.remove("on"); box.classList.remove("on"); box.setAttribute("aria-hidden", "true"); last && last.focus && last.focus(); }
  function apply() {
    badge(); close();
    if (typeof renderList === "function") { renderChips(); renderList(); }
    if (KTF.active) {
      const top = document.querySelector(".controls").offsetTop;
      if (scrollY < top) scrollTo({ top, behavior: "smooth" });
      const t = etcText();
      if (t) try { navigator.sendBeacon("/api/q", new Blob([JSON.stringify({ q: ("맞춤 " + t).toLowerCase().slice(0, 40), n: DEST.filter(x => KTF.ok(x)).length })], { type: "application/json" })); } catch (_) {}
    }
  }
  KTF.open = open;
  KTF.clear = () => { KTF.reset(); badge(); if (typeof renderList === "function") { renderChips(); renderList(); } };

  btn.addEventListener("click", open);
  scrim.addEventListener("click", close);
  box.querySelector("#fClose").addEventListener("click", close);
  go.addEventListener("click", apply);
  box.querySelector("#fReset").addEventListener("click", () => { KTF.reset(); paint(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && box.classList.contains("on")) close(); });
  opts.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.etc) {
      const g = b.dataset.etc, inp = opts.querySelector(`[data-etcin="${g}"]`);
      if (inp.hidden) { inp.hidden = false; b.setAttribute("aria-pressed", "true"); inp.focus(); }
      else { S.etc[g] = ""; inp.value = ""; inp.hidden = true; b.setAttribute("aria-pressed", "false"); }
      return;
    }
    const g = b.dataset.g, v = b.dataset.v;
    if (g === "when") setWhen(S.when === v ? "" : v);
    else if (g === "theme") S.themes.has(v) ? S.themes.delete(v) : S.themes.add(v);
    else if (g === "who") S.who = S.who === v ? "" : v;
    else S[g] = S[g] === v ? "" : v;
    paint();
  });
  opts.addEventListener("change", e => { if (e.target.id === "fMonth") { setWhen(e.target.value); paint(); } });
  opts.addEventListener("input", e => {
    const g = e.target.dataset.etcin; if (!g) return;
    S.etc[g] = e.target.value;
    go.textContent = KTF.active ? `${DEST.filter(x => KTF.ok(x)).length}곳 보기` : "전체 보기";
    box.querySelector("#fReset").hidden = !KTF.active;
  });
  opts.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.dataset.etcin) { e.preventDefault(); apply(); } });
})();
