/* KeywordTrip search: ranked, Korean-aware (particles, compounds, typos, intents). Loaded after data.js, before app.js. */
(function () {
  const norm = s => String(s || "").toLowerCase().normalize("NFC").replace(/[·・,.!?"'()\[\]/~]/g, " ").replace(/\s+/g, " ").trim();
  const STOP = new Set(["여행", "여행지", "여행지추천", "추천", "추천해줘", "가고", "싶어", "싶다", "싶은", "가볼만한", "갈만한", "가기", "좋은", "곳", "데", "나라", "도시", "어디", "어디야", "알려줘", "찾아줘", "해외", "해외여행", "휴가", "정보", "투어", "여행하기", "가자", "어때", "좀", "쓰는", "사용하는", "통하는", "되는", "가능한", "있는", "할", "만한", "같은", "보러", "먹으러", "하러", "갈", "볼", "때", "the", "trip", "travel"]);
  const PARTICLES = ["에서는", "에서", "으로는", "으로", "에는", "에도", "이랑", "하고", "까지", "부터", "여행지", "여행", "투어", "에", "로", "은", "는", "이", "가", "을", "를", "의", "도", "랑", "와", "과"];

  /* place aliases → destination ids */
  const ALIAS_ID = {
    "하와이": ["us-hi", "honolulu"], "호놀룰루": ["honolulu"], "와이키키": ["honolulu"], "la": ["losangeles"], "엘에이": ["losangeles"], "로스엔젤레스": ["losangeles"],
    "ny": ["newyork"], "nyc": ["newyork"], "샌프란": ["sanfrancisco"], "라스베가스": ["lasvegas"], "베가스": ["lasvegas"], "사이공": ["hochiminh"], "호치민시": ["hochiminh"],
    "냐짱": ["nhatrang"], "사파": ["sapa"], "사빠": ["sapa"], "sapa": ["sapa"], "판시판": ["sapa"], "나짱": ["nhatrang"], "푸코쿠": ["phuquoc"], "코키": ["kotakinabalu"], "kl": ["kualalumpur"], "쿠알라": ["kualalumpur"], "오키나와": ["okinawa", "jp-ry"],
    "비엔나": ["vienna"], "융프라우": ["interlaken"], "홋카이도": ["sapporo"], "북해도": ["sapporo"], "타이페이": ["taipei"], "푸켓": ["phuket"], "북경": ["beijing"], "상해": ["shanghai"],
    "청도": ["qingdao"], "몽골": ["ulaanbaatar", "mn"], "아이슬란드": ["reykjavik", "is"], "오로라": ["reykjavik", "is", "fi", "no", "ca", "us-ak", "gl"], "제주도": ["jeju", "kr-jj"],
    "갈라파고스": ["ec-ga"], "티베트": ["cn-xz"], "남극": ["aq-ar", "aq-cl", "aq-gb", "aq-au", "aq-nz", "aq-fr", "aq-no"], "산토리니": ["santorini"], "몰디브": ["mv"],
    "보홀": ["ph"], "팔라완": ["ph"], "코사무이": ["th"], "끄라비": ["th"], "파타야": ["th"], "롬복": ["id-nu"], "랑카위": ["my"], "페낭": ["my"], "마이애미": ["us"], "시애틀": ["us"], "시카고": ["us"],
    "토론토": ["ca"], "나고야": ["jp"], "요코하마": ["jp"], "고베": ["jp"], "나라": [], "시즈오카": ["jp"], "구마모토": ["jp"], "가고시마": ["jp"], "히로시마": ["jp"], "다카마쓰": ["jp"], "마쓰야마": ["jp"],
    "가오슝": ["tw"], "타이중": ["tw"], "시안": ["cn"], "장가계": ["cn"], "청두": ["cn"], "하얼빈": ["cn"], "옌지": ["cn"], "연길": ["cn"], "백두산": ["cn"], "달랏": ["vn"], "사파": ["vn"], "하롱베이": ["hanoi", "vn"],
    "호이안": ["danang"], "비엔티안": ["la"], "방비엥": ["la"], "루앙프라방": ["la"], "씨엠립": ["kh"], "앙코르와트": ["kh"], "프놈펜": ["kh"], "마닐라": ["ph"], "클락": ["ph"], "자카르타": ["id-jw"], "족자카르타": ["id-jw"],
    "피렌체": ["it"], "베네치아": ["it"], "베니스": ["it"], "밀라노": ["it"], "나폴리": ["it"], "마드리드": ["es"], "세비야": ["es"], "그라나다": ["es"], "포르투": ["pt"], "니스": ["fr"], "뮌헨": ["de"], "베를린": ["de"],
    "프랑크푸르트": ["de"], "암스테르담": ["nl"], "브뤼셀": ["be"], "잘츠부르크": ["at"], "할슈타트": ["at"], "취리히": ["ch"], "제네바": ["ch"], "체르마트": ["ch"], "자그레브": ["hr"], "스플리트": ["hr"], "류블랴나": ["si"],
    "바르샤바": ["pl"], "크라쿠프": ["pl"], "에든버러": ["gb-sc"], "더블린": ["ie"], "코펜하겐": ["dk"], "스톡홀름": ["se"], "헬싱키": ["fi"], "오슬로": ["no"], "트롬쇠": ["no"], "아테네": ["gr"], "카파도키아": ["tr-as"],
    "골드코스트": ["au"], "케언스": ["au"], "브리즈번": ["au"], "퍼스": ["au"], "오클랜드": ["nz"], "크라이스트처치": ["nz"], "몰타": ["mt"], "카이로": ["eg"], "마라케시": ["ma"], "페트라": ["jo"], "마추픽추": ["pe"], "쿠스코": ["pe"],
    "우유니": ["bo"], "파타고니아": ["ar", "cl"], "부에노스아이레스": ["ar"], "리우": ["br"], "칸쿤": ["cancun"], "툴룸": ["cancun"], "아부다비": ["ae"], "도하": ["qa"], "타슈켄트": ["uz"], "알마티": ["kz"], "블라디보스토크": ["ru-as"],
    "싱가폴": ["singapore", "sg"], "쿠알라룸프르": ["kualalumpur"], "코타키나바루": ["kotakinabalu"], "블라디": ["ru-as"], "라스베이가스": ["lasvegas"], "샌프란시스코": ["sanfrancisco"], "바르셀로나": ["barcelona"], "로마": ["rome"], "부다": ["budapest"], "두브로": ["dubrovnik"], "치앙마이": ["chiangmai"], "보라카이": ["boracay"], "세부": ["cebu"], "뉴욕": ["newyork"], "엘에이": ["losangeles"], "멕시코시티": ["mexicocity"], "케이프타운": ["capetown"], "퀸즈타운": ["queenstown"], "멜번": ["melbourne"], "울란바타르": ["ulaanbaatar"], "인터라켄": ["interlaken"], "레이캬비크": ["reykjavik"], "레이캬빅": ["reykjavik"]
  };
  /* country words → country codes (for split entries the auto index can't see) */
  const ALIAS_CC = {
    "미국": ["US"], "영국": ["GB"], "중국": ["CN"], "일본": ["JP"], "한국": ["KR"], "대한민국": ["KR"], "국내": ["KR"], "아랍에미리트": ["AE"], "uae": ["AE"], "러시아": ["RU"], "이집트": ["EG"], "튀르키예": ["TR"], "터키": ["TR"],
    "키프로스": ["CY"], "인도네시아": ["ID"], "말레이시아": ["MY"], "인도": ["IN"], "스페인": ["ES"], "이탈리아": ["IT"], "프랑스": ["FR"], "그리스": ["GR"], "포르투갈": ["PT"], "칠레": ["CL"], "에콰도르": ["EC"],
    "호주": ["AU"], "오스트레일리아": ["AU"], "뉴질랜드": ["NZ"], "캐나다": ["CA"], "멕시코": ["MX"], "태국": ["TH"], "베트남": ["VN"], "필리핀": ["PH"], "대만": ["TW"], "홍콩": ["HK"], "마카오": ["MO"], "싱가포르": ["SG"],
    "스위스": ["CH"], "체코": ["CZ"], "오스트리아": ["AT"], "헝가리": ["HU"], "크로아티아": ["HR"], "독일": ["DE"], "네덜란드": ["NL"], "아일랜드": ["IE"], "남아공": ["ZA"], "남아프리카공화국": ["ZA"], "적도기니": ["GQ"],
    "가까운": ["JP", "CN", "TW", "HK", "MO", "MN", "KR", "VN", "PH"], "근거리": ["JP", "CN", "TW", "HK", "MO", "MN", "KR"],
    "동남아": ["TH", "VN", "PH", "MY", "SG", "ID", "KH", "LA", "MM", "BN", "TL"], "동남아시아": ["TH", "VN", "PH", "MY", "SG", "ID", "KH", "LA", "MM", "BN", "TL"],
    "동북아": ["JP", "CN", "TW", "HK", "MO", "MN", "KR"], "동아시아": ["JP", "CN", "TW", "HK", "MO", "MN", "KR"], "중화권": ["CN", "TW", "HK", "MO"],
    "서유럽": ["FR", "GB", "IE", "BE", "NL", "LU", "DE", "CH", "AT", "MC", "LI"], "동유럽": ["CZ", "HU", "PL", "SK", "RO", "BG", "MD", "UA", "BY", "SI", "HR", "RS", "BA", "ME", "MK", "AL", "XK"],
    "발칸": ["HR", "SI", "RS", "BA", "ME", "MK", "AL", "XK", "BG", "RO", "GR"], "북유럽": ["NO", "SE", "FI", "DK", "IS", "EE", "LV", "LT", "FO", "AX", "GL", "SJ"], "스칸디나비아": ["NO", "SE", "DK", "FI", "IS"],
    "남유럽": ["IT", "ES", "PT", "GR", "HR", "MT", "CY", "SM", "VA", "AD", "MC", "SI", "ME", "AL"], "지중해": ["IT", "ES", "GR", "HR", "MT", "CY", "FR", "TR", "MC", "ME", "AL", "TN", "MA"],
    "남미": ["CO", "VE", "EC", "PE", "BO", "CL", "AR", "UY", "PY", "BR", "GY", "SR", "GF", "FK"], "중미": ["GT", "BZ", "SV", "HN", "NI", "CR", "PA", "MX"],
    "카리브": ["CU", "JM", "HT", "DO", "BS", "BB", "TT", "LC", "GD", "VC", "AG", "DM", "KN", "PR", "VI", "MQ", "GP", "BL", "MF", "SX", "CW", "AW", "BQ", "KY", "VG", "AI", "MS", "TC"],
    "남태평양": ["FJ", "PF", "NC", "WS", "TO", "VU", "CK", "NU", "SB", "PG", "TV", "KI", "NR", "WF", "TK", "PN", "AS"], "미크로네시아": ["FM", "PW", "MH", "GU", "MP", "NR", "KI"], "중앙아시아": ["KZ", "UZ", "KG", "TJ", "TM"],
    "코카서스": ["GE", "AM", "AZ"], "캅카스": ["GE", "AM", "AZ"], "미주": [], "괌사이판": ["GU", "MP"]
  };
  const REGION_WORDS = { "아시아": "아시아", "유럽": "유럽", "중동": "중동", "아프리카": "아프리카", "북미": "북미", "중남미": "중남미", "라틴아메리카": "중남미", "오세아니아": "오세아니아", "대양주": "오세아니아", "남극": "남극", "미주": ["북미", "중남미"] };
  const CUR_WORDS = { "엔": "JPY", "엔화": "JPY", "달러": "USD", "달러화": "USD", "미국달러": "USD", "유로": "EUR", "유로화": "EUR", "위안": "CNY", "위안화": "CNY", "바트": "THB", "파운드": "GBP", "루피아": "IDR", "링깃": "MYR", "페소": "PHP", "동화": "VND", "베트남동": "VND", "대만달러": "TWD", "홍콩달러": "HKD", "싱가포르달러": "SGD", "호주달러": "AUD", "스위스프랑": "CHF", "루블": "RUB", "리라": "TRY", "디르함": "AED" };
  const CLASS_WORDS = { "무비자": "green", "비자없이": "green", "비자프리": "green", "사전신청": "blue", "eta": "blue", "esta": "blue", "e비자": "blue", "도착비자": "blue", "여행금지": "orange", "위험": "orange", "경보": "orange" };
  const SEASON = { "봄": [3, 4, 5], "여름": [6, 7, 8], "가을": [9, 10, 11], "겨울": [12, 1, 2] };
  const WARM = new Set(["따뜻한", "따뜻", "따듯한", "더운", "열대", "피한", "따뜻한곳"]);
  const COOL = new Set(["시원한", "선선한", "피서", "서늘한"]);
  const FOOD = ["쿠시카츠", "똠얌", "반미", "타코", "타파스", "에그타르트", "젤라토", "베이글", "포케", "흑돼지", "브런치", "먹다쓰러지기", "크루아상", "야시장", "딤섬", "라멘", "쌀국수", "해산물", "샤오롱바오", "베이징덕", "맥주", "호커센터", "커피", "미식", "나시르막", "망고"];
  const SEA = ["비치", "서핑", "본다이", "해변", "스노클", "지중해", "파도", "바다", "리조트", "섬투어", "호핑투어", "다이빙", "석양", "화이트비치", "카리브해", "에메랄드바다", "라군"];
  const KW_ALIAS = {
    "오지": ["오지", "절해고도", "세상끝마을", "배로만", "인구50명", "극지크루즈", "원시", "미개척", "남극", "북극곰", "외딴"], "섬": ["섬", "제도", "환초", "라군", "섬투어", "호핑"], "해변": SEA, "바다": SEA, "휴양": SEA.concat(["온천", "알로하", "올인클루시브"]), "휴양지": SEA,
    "맛집": FOOD, "음식": FOOD, "먹방": FOOD, "미식": FOOD, "자연": ["오로라", "빙하", "오름", "라이스테라스", "테이블마운틴", "올레길", "펭귄", "이끼", "초원", "은하수", "국립공원", "융프라우", "밀포드사운드", "그랜드캐니언", "세노테", "키나발루산"],
    "역사": ["천년고도", "유적", "모스크", "사원", "가우디", "바자르", "자금성", "만리장성", "성벽투어", "구시가", "박물관", "와이탄", "카를교"], "야경": ["네온", "루프탑", "스카이라인", "야시장", "등불", "야경", "다뉴브야경"],
    "쇼핑": ["쇼핑", "금시장", "바자르", "면세"], "액티비티": ["번지점프", "패러글라이딩", "서핑", "다이빙", "스노클", "사막사파리", "스키"], "온천": ["온천"], "트레킹": ["트레킹", "올레길", "히말라야", "오름"], "커플": ["석양", "이아석양", "야경", "리조트"], "가족": ["리조트", "투몬비치", "츄라우미", "올인클루시브"]
  };
  const PARTICLE_MIN = 2;

  /* ---------- index ---------- */
  let IDX = null;
  function build() {
    const names = new Map(), parts = new Map(); // full names / name fragments -> Set(id)
    const addP = (w, id) => { w = norm(w).replace(/\s+/g, ""); if (!w) return; if (!parts.has(w)) parts.set(w, new Set()); parts.get(w).add(id); };
    const add = (w, id) => { w = norm(w).replace(/\s+/g, ""); if (!w) return; if (!names.has(w)) names.set(w, new Set()); names.get(w).add(id); };
    const ccNames = new Map();
    for (const d of DEST) {
      add(d.city, d.id); add(d.en, d.id); if (d.id.length > 3) add(d.id, d.id);
      String(d.city).split(/[()·\s]/).filter(t => t.length >= 2).forEach(t => addP(t, d.id));
      String(d.en).split(/[()\s,]/).filter(t => t.length >= 3).forEach(t => addP(t, d.id));
      if (d.cap) add(d.cap, d.id);
      if (d.country && !d.sub) { const n = norm(d.city).replace(/\s+/g, ""); if (!ccNames.has(n)) ccNames.set(n, new Set()); ccNames.get(n).add(d.cc); }
      if (!d.country && d.c) { const n = norm(d.c).replace(/\s+/g, ""); if (!ccNames.has(n)) ccNames.set(n, new Set()); ccNames.get(n).add(d.cc); }
    }
    for (const [w, ids] of Object.entries(ALIAS_ID)) ids.forEach(id => add(w, id));
    for (const [w, ccs] of Object.entries(ALIAS_CC)) { if (!ccNames.has(w)) ccNames.set(w, new Set()); ccs.forEach(c => ccNames.get(w).add(c)); }
    const kws = new Map();
    for (const d of DEST) for (const k of d.kw) { const w = norm(k).replace(/\s+/g, ""); if (!kws.has(w)) kws.set(w, new Set()); kws.get(w).add(d.id); }
    const vocab = new Set([...names.keys(), ...parts.keys(), ...ccNames.keys(), ...kws.keys(), ...Object.keys(KW_ALIAS), ...Object.keys(REGION_WORDS), ...Object.keys(CUR_WORDS), ...Object.keys(CLASS_WORDS), ...Object.keys(SEASON), ...WARM, ...COOL]);
    const byId = new Map(DEST.map((d, i) => [d.id, Object.assign(d, { _i: i })]));
    IDX = { names, parts, ccNames, kws, vocab, byId };
  }

  function lev(a, b) {
    if (Math.abs(a.length - b.length) > 1) return 9;
    const m = a.length, n = b.length, dp = Array.from({ length: m + 1 }, (_, i) => [i]);
    for (let j = 1; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return dp[m][n];
  }
  const known = w => IDX.vocab.has(w) || /^\d{1,2}월$/.test(w) || ["지금", "이번달", "다음달"].includes(w);

  /* split query into tokens: particles, compounds ("홍콩여행", "오사카맛집"), typos */
  function tokenize(q) {
    const raw = norm(q).split(" ").filter(Boolean);
    const out = [];
    const strip = w => { for (let k = 0; k < 3; k++) { let hit = false; for (const p of PARTICLES) if (w.length - p.length >= PARTICLE_MIN && w.endsWith(p) && !known(w)) { w = w.slice(0, -p.length); hit = true; break; } if (!hit) break; } return w; };
    for (let w of raw) {
      if (STOP.has(w)) continue;
      if (known(w)) { out.push(w); continue; }
      // compound: longest known prefix + rest
      let split = false;
      for (let L = w.length - 1; L >= 2; L--) {
        const a = w.slice(0, L), b = w.slice(L);
        if (known(a)) { out.push(a); const r = strip(b); if (r && !STOP.has(r) && !PARTICLES.includes(b)) out.push(known(r) ? r : r); split = true; break; }
      }
      if (split) continue;
      const s = strip(w);
      if (STOP.has(s)) continue;
      out.push(s);
    }
    return out.filter(t => t && !STOP.has(t) && !PARTICLES.includes(t));
  }
  function fuzzy(t) {
    if (t.length < 2) return null;
    let best = null;
    for (const w of IDX.names.keys()) { if (w.length < 2) continue; if (lev(t, w) === 1 && (t.length >= 3 || w.length <= 3)) { best = w; break; } }
    if (!best) for (const w of IDX.ccNames.keys()) if (lev(t, w) === 1 && t.length >= 3) { best = w; break; }
    return best;
  }

  /* ---------- scoring ---------- */
  function tokenScores(t, ctx) {
    // returns Map(id -> score) of strong matches; weak text matches only used when no strong match exists
    const S = new Map(); const put = (id, s) => S.set(id, Math.max(S.get(id) || 0, s));
    const { names, parts, ccNames, kws } = IDX;
    if (names.has(t)) names.get(t).forEach(id => put(id, 100));
    if (parts.has(t)) parts.get(t).forEach(id => put(id, 62));
    const latin = /^[a-z0-9]+$/.test(t);
    if (!(latin && t.length < 4)) for (const [w, ids] of names) if (w !== t && t.length >= 2 && (w.startsWith(t) || (t.length >= 3 && w.includes(t)))) ids.forEach(id => put(id, 70));
    if (ccNames.has(t)) { const ccs = ccNames.get(t); for (const d of DEST) if (ccs.has(d.cc)) put(d.id, d.country && !d.sub ? 72 : 66); }
    const rw = REGION_WORDS[t]; if (rw) { const set = new Set([].concat(rw)); for (const d of DEST) if (set.has(d.reg)) put(d.id, 40); }
    if (kws.has(t)) kws.get(t).forEach(id => put(id, 50));
    for (const [w, ids] of kws) if (w !== t && t.length >= 2 && w.includes(t)) ids.forEach(id => put(id, 38));
    if (KW_ALIAS[t]) { const al = KW_ALIAS[t].map(x => norm(x)); for (const d of DEST) { const hay = norm(d.kw.join(" ") + " " + (d.hook || "") + " " + (d.head || "")); if (al.some(a => hay.includes(a))) put(d.id, 44); } }
    const cur = CUR_WORDS[t] || (/^[a-z]{3}$/.test(t) && INFO.fx && INFO.fx.r[t.toUpperCase()] ? t.toUpperCase() : null);
    if (cur) for (const d of DEST) if (d.cur === cur) put(d.id, 55);
    if (!cur && t.length >= 2) for (const d of DEST) { const n = norm(CUR[d.cur] || ""); if (n && n.replace(/\s/g, "").includes(t)) put(d.id, 30); }
    if (t.length >= 2) for (const d of DEST) { const h = norm((d.hook || "") + " " + (d.head || "")); if (h.includes(t)) put(d.id, 22); }
    // a token that is itself a place/country name: drop incidental keyword/hook hits ("파리" ≠ "사파리")
    if (names.has(t) || ccNames.has(t) || parts.has(t)) for (const [id, v] of [...S]) if (v < 66) S.delete(id);
    if (S.size) return S;
    // weak: long texts (visa, money, tips) — only if nothing better anywhere
    if (t.length >= 2) for (const d of DEST) { const h = norm([visaOf(d), moneyOf(d), tipsOf(d).join(" ")].join(" ")); if (h.includes(t)) put(d.id, 8); }
    return S;
  }

  function parse(q) {
    const toks = tokenize(q);
    const intents = { cls: null, months: null, warm: false, cool: false, now: false };
    const terms = [], ignored = [], fixed = [];
    const thisM = +new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", month: "numeric" }).format(new Date());
    for (const t of toks) {
      if (CLASS_WORDS[t]) { intents.cls = CLASS_WORDS[t]; continue; }
      const mm = /^(\d{1,2})월$/.exec(t); if (mm && +mm[1] >= 1 && +mm[1] <= 12) { intents.months = [+mm[1]]; continue; }
      if (t === "지금" || t === "이번달") { intents.now = true; continue; }
      if (t === "다음달") { intents.months = [thisM % 12 + 1]; continue; }
      if (SEASON[t]) { intents.months = SEASON[t]; continue; }
      if (WARM.has(t)) { intents.warm = true; continue; }
      if (COOL.has(t)) { intents.cool = true; continue; }
      terms.push(t);
    }
    const scored = [];
    for (const t of terms) {
      let S = tokenScores(t);
      if (!S.size) { const f = fuzzy(t); if (f) { S = tokenScores(f); if (S.size) fixed.push([t, f]); } }
      if (S.size) scored.push([t, S]); else ignored.push(t);
    }
    if (scored.length > 1) for (let k = scored.length - 1; k >= 0; k--) { const mx = Math.max(...scored[k][1].values()); if (mx <= 8 && scored.some(([, S]) => Math.max(...S.values()) > 8)) { ignored.push(scored[k][0]); scored.splice(k, 1); } }
    return { intents, scored, ignored, fixed, thisM };
  }

  function seasonOk(d, months, warm, cool) {
    const ms = months || [+new Intl.DateTimeFormat("en-US", { timeZone: d.tz, month: "numeric" }).format(new Date())];
    const hot = m => d.hemi === "T" || d.id === "es-cn"
      || (d.hemi === "S" && [11, 12, 1, 2, 3].includes(m))
      || (d.hemi === "N" && [6, 7, 8].includes(m))
      || (d.hemi === "N" && ["중동", "아프리카"].includes(d.reg) && [10, 11, 12, 1, 2, 3, 4].includes(m));
    const coolSummer = m => d.hemi === "N" && [6, 7, 8].includes(m) && (["유럽", "북미"].includes(d.reg) || ["MN", "KG", "JP"].includes(d.cc) && (d.id === "sapporo" || d.cc !== "JP"));
    if (warm) return ms.some(hot);
    if (cool) return ms.some(coolSummer);
    return true;
  }

  /* public: returns {items:[dest...], note, active} */
  window.KTSearch = function (q, base) {
    if (!IDX) build();
    const P = parse(q);
    const { intents, scored } = P;
    let pool = base.slice();
    if (intents.cls) pool = pool.filter(d => classOf(d) === intents.cls);
    if (intents.months) pool = pool.filter(d => (d.best || []).some(m => intents.months.includes(m)));
    if (intents.now) pool = pool.filter(isBest);
    if (intents.warm || intents.cool) pool = pool.filter(d => seasonOk(d, intents.months, intents.warm, intents.cool));
    let res;
    if (scored.length) {
      res = [];
      for (const d of pool) {
        let total = 0, hits = 0;
        for (const [, S] of scored) { const s = S.get(d.id) || 0; if (s) { total += s; hits++; } }
        if (hits === scored.length) res.push([d, total]);
      }
      if (!res.length && scored.length > 1) { // relax: any term
        for (const d of pool) { let total = 0; for (const [, S] of scored) total += S.get(d.id) || 0; if (total) res.push([d, total * 0.5]); }
        P.relaxed = true;
      }
      res.sort((a, b) => (b[1] + (b[0].country ? 0 : 15)) - (a[1] + (a[0].country ? 0 : 15)) || a[0]._i - b[0]._i);
      res = res.map(r => r[0]);
      // same place listed twice (curated city + TCC entry): keep the curated one
      const DUP = { hk: "hongkong", mo: "macau", sg: "singapore", gu: "guam", "ae-du": "dubai", "kr-jj": "jeju" };
      const ids = new Set(res.map(d => d.id));
      res = res.filter(d => !(DUP[d.id] && ids.has(DUP[d.id])));
    } else res = P.ignored.length && !(intents.cls || intents.months || intents.now || intents.warm || intents.cool) ? [] : pool;
    const bits = [];
    if (intents.cls) bits.push(CLS[intents.cls].l);
    if (intents.months) bits.push(intents.months.length > 1 ? intents.months.map(m => m + "월").join("·") + " 적기" : intents.months[0] + "월 적기");
    if (intents.now) bits.push("지금 적기");
    if (intents.warm) bits.push("따뜻한 곳");
    if (intents.cool) bits.push("선선한 곳");
    P.fixed.forEach(([a, b]) => bits.push(`'${a}' → '${b}'`));
    if (P.ignored.length) bits.push(`'${P.ignored.join("', '")}'는 찾지 못해 제외`);
    if (P.relaxed) bits.push("일부 단어만 맞는 결과");
    return { items: res, note: bits.join(" · "), ranked: scored.length > 0, any: scored.length > 0 || !!(intents.cls || intents.months || intents.now || intents.warm || intents.cool), ignoredAll: !scored.length && P.ignored.length > 0 && !(intents.cls || intents.months || intents.now || intents.warm || intents.cool) };
  };
  window.KTSearch._tokenize = q => { if (!IDX) build(); return tokenize(q); };
})();
