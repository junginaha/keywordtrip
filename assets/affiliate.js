/* KeywordTrip affiliate link config — single source of truth.
 * Used by the app (assets/app.js) and the static page builder (scripts/build-pages.mjs).
 * Trip.com attributes a booking only when Allianceid + SID are on the landing URL.
 * trip_sub1 = "<category>-<destination id>" so the partner dashboard shows which page and button earned it.
 */
(function (g) {
  var TRIP = { Allianceid: "10882425", SID: "332762025", trip_sub3: "D20118625" };
  var HOST = "https://kr.trip.com";

  // Shared airport routes used by home, destination and topic pages.
  var AIRPORT = {
    jp: "nrt", tokyo: "nrt", osaka: "kix", kyoto: "kix", fukuoka: "fuk", sapporo: "cts", okinawa: "oka",
    vn: "dad", danang: "dad", nhatrang: "cxr", phuquoc: "pqc", hanoi: "han", hochiminh: "sgn", sapa: "han",
    th: "bkk", bangkok: "bkk", chiangmai: "cnx", phuket: "hkt", tw: "tpe", taipei: "tpe",
    ph: "ceb", cebu: "ceb", boracay: "klo", sg: "sin", singapore: "sin", hk: "hkg", hongkong: "hkg", macau: "mfm",
    us: "lax", newyork: "jfk", losangeles: "lax", lasvegas: "las", sanfrancisco: "sfo", honolulu: "hnl",
    fr: "cdg", paris: "cdg", it: "fco", rome: "fco", li: "zrh", mc: "nce", sm: "blq", va: "fco", ad: "bcn",
    bali: "dps", kotakinabalu: "bki", kualalumpur: "kul", shanghai: "pvg", beijing: "pek", qingdao: "tao", ulaanbaatar: "ubn", jeju: "cju",
    guam: "gum", saipan: "spn", dubai: "dxb", london: "lhr", barcelona: "bcn", camino: "scq", prague: "prg", vienna: "vie",
    budapest: "bud", interlaken: "zrh", santorini: "jtr", dubrovnik: "dbv", lisbon: "lis", istanbul: "ist", reykjavik: "kef", vancouver: "yvr",
    cancun: "cun", mexicocity: "mex", sydney: "syd", melbourne: "mel", queenstown: "zqn", capetown: "cpt", cn: "pvg", mo: "mfm",
    mn: "ubn", my: "kul", bn: "bwn", kh: "kti", la: "vte", mm: "rgn", tl: "dil", in: "del",
    np: "ktm", bt: "pbh", bd: "dac", lk: "cmb", mv: "mle", pk: "isb", kz: "ala", uz: "tas",
    kg: "fru", tj: "dyu", tm: "asb", ae: "auh", qa: "doh", bh: "bah", kw: "kwi", om: "mct",
    sa: "ruh", jo: "amm", il: "tlv", ps: "tlv", lb: "bey", sy: "dam", cy: "lca", gb: "lhr",
    ie: "dub", de: "fra", nl: "ams", be: "bru", lu: "lux", ch: "zrh", at: "vie", mt: "mla",
    gr: "ath", hr: "zag", si: "lju", ba: "sjj", me: "tgd", rs: "beg", xk: "prn", al: "tia",
    mk: "skp", bg: "sof", ro: "otp", md: "kiv", by: "msq", ru: "svo", pl: "waw", cz: "prg",
    sk: "bts", hu: "bud", ee: "tll", lv: "rix", lt: "vno", fi: "hel", se: "arn", no: "osl",
    dk: "cph", ge: "tbs", am: "evn", az: "gyd", eg: "cai", ma: "cmn", tn: "tun", dz: "alg",
    ss: "jub", et: "add", er: "asm", dj: "jib", ke: "nbo", tz: "dar", ug: "ebb", rw: "kgl",
    bi: "bjm", cd: "fih", cg: "bzv", ga: "lbv", cm: "dla", cf: "bgf", td: "ndj", ng: "los",
    gh: "acc", ci: "abj", bf: "oua", sn: "dss", gm: "bjl", gn: "cky", gw: "oxb", sl: "fna",
    lr: "rob", tg: "lfw", bj: "coo", mr: "nkc", cv: "rai", st: "tms", gq: "ssg", ao: "nbj",
    zm: "lun", zw: "hre", mw: "llw", mz: "mpm", mg: "tnr", mu: "mru", sc: "sez", km: "hah",
    na: "wdh", bw: "gbe", ls: "msu", sz: "sho", ca: "yyz", gt: "gua", bz: "bze", sv: "sal",
    hn: "sap", ni: "mga", cr: "sjo", pa: "pty", cu: "hav", jm: "mbj", do: "puj", bs: "nas",
    bb: "bgi", tt: "pos", lc: "uvf", gd: "gnd", vc: "svd", ag: "anu", dm: "dom", kn: "skb",
    co: "bog", ve: "ccs", ec: "uio", pe: "lim", bo: "vvi", cl: "scl", ar: "eze", uy: "mvd",
    py: "asu", br: "gru", gy: "geo", sr: "pbm", nz: "akl", fj: "nan", pg: "pom", sb: "hir",
    vu: "vli", ws: "apw", to: "tbu", ki: "trw", tv: "fun", nr: "inu", mh: "maj", fm: "pni",
    pw: "ror", gl: "goh", fo: "fae", ax: "mhq", sj: "lyr", gi: "gib", je: "jer", gg: "gci",
    im: "iom", gu: "gum", mp: "spn", as: "ppg", pr: "sju", vi: "stt", pf: "ppt", nc: "nou",
    wf: "wls", re: "run", yt: "dza", mq: "fdf", gp: "ptp", gf: "cay", pm: "fsp", bl: "sbh",
    mf: "sxm", sx: "sxm", cw: "cur", aw: "aua", bq: "bon", bm: "bda", ky: "gcm", vg: "eis",
    ai: "axa", ms: "mni", tc: "pls", fk: "mpn", sh: "hle", ck: "rar", nu: "iue", nf: "nlk",
    cx: "xch", cc: "cck", eh: "eun", "jp-ry": "oka", "id-jw": "cgk", "id-ka": "bpn", "id-nu": "lop", "id-ma": "amq",
    "id-pa": "djj", "id-sl": "upg", "id-sm": "kno", kr: "cju", "cn-hi": "syx", "cn-xz": "lxa", "in-an": "ixz", "in-ld": "agx",
    "in-sk": "ixb", kashmir: "sxr", "my-sb": "bki", "my-sk": "kch", "ae-du": "dxb", "ae-sh": "shj", "ae-aj": "shj", "ae-uq": "dxb",
    "ae-rk": "rkt", "ae-fu": "dxb", "eg-si": "ssh", "tr-eu": "ist", "tr-as": "ist", "ru-as": "vvo", "ru-kg": "kgd", "cy-n": "lca",
    "gr-cr": "her", "gr-ae": "jtr", "gr-io": "cfu", es: "mad", "es-ib": "pmi", "es-cn": "tfs", "es-ce": "agp", pt: "lis",
    "pt-ac": "pdl", "pt-ma": "fnc", "it-sa": "cag", "it-si": "cta", "it-la": "lmp", "fr-co": "aja", "gb-sc": "edi", "gb-wa": "cwl",
    "gb-ni": "bfs", is: "kef", "us-ak": "anc", "us-hi": "hnl", "ca-pe": "yyg", mx: "mex", au: "syd", "au-ta": "hba",
    "au-lh": "lhi", za: "jnb", "cl-ei": "ipc", "cl-jf": "scl", "ec-ga": "gps", "nz-ch": "cht", "ki-lp": "cxi", "pg-is": "rab",
    "pf-au": "ppt", "pf-mq": "ppt", "ve-ne": "pmv", "co-sa": "adz", "br-fn": "fen", "kn-ne": "nev", "bq-ss": "sxm", "mu-ro": "rrg",
    "tz-za": "znz", "ao-ca": "cab", "gq-rm": "bsg", "ba-rs": "bnx", "md-tr": "kiv", "az-na": "naj", "kr-jj": "cju",
    "aq-ar": "ush", "aq-cl": "ush", "aq-gb": "ush", "aq-nz": "chc", "aq-au": "hba", "aq-fr": "hba", "aq-no": "cpt", gs: "ush", ta: "cpt", pn: "ppt", tk: "apw", "cy-sb": "lca", "sc-zi": "sez",
  };

  // City-to-city routes where one fixed airport would hide good options (Tokyo: Narita + Haneda, Seoul: Incheon + Gimpo).
  var ROUTE = { kr: "/flights/seoul-to-jeju/airfares-sel-cju/", "kr-jj": "/flights/seoul-to-jeju/airfares-sel-cju/", jeju: "/flights/seoul-to-jeju/airfares-sel-cju/", "jp-og": "/flights/seoul-to-tokyo/airfares-sel-tyo/", jp: "/flights/seoul-to-tokyo/airfares-sel-tyo/", tokyo: "/flights/seoul-to-tokyo/airfares-sel-tyo/" };

  function trip(path, sub, params) {
    var u = new URL(path, HOST);
    Object.keys(params || {}).forEach(function (k) { u.searchParams.set(k, params[k]); });
    Object.keys(TRIP).forEach(function (k) { u.searchParams.set(k, TRIP[k]); });
    if (sub) u.searchParams.set("trip_sub1", String(sub).slice(0, 60));
    return u.toString();
  }
  // English place name gives the most reliable Trip.com search match.
  function q(x) { return x.country ? x.en : (x.en || x.city); }

  // Klook: tracked redirect generated in the Klook affiliate portal.
  // k_site = the Klook page the traveler lands on (destination search results).
  var KLOOK = { aid: "137536", aff_adid: "1484668" };
  function klook(x) {
    var target = "https://www.klook.com/ko/search/result/?query=" + encodeURIComponent(q(x));
    // Klook's redirect ignores/blanks aff_sid (tested 2026-10-23), so per-destination split is done by our own click counts (/api/outbound).
    return "https://affiliate.klook.com/redirect?aid=" + KLOOK.aid + "&aff_adid=" + KLOOK.aff_adid + "&k_site=" + encodeURIComponent(target);
  }
  var KLOOK_ON = !!KLOOK.aid;

  var LINKS = {
    flights: function (x) { return trip(ROUTE[x.id] || (AIRPORT[x.id] ? "/flights/airport-icn-" + AIRPORT[x.id] + "/" : "/flights/"), "flight-" + x.id); },
    stay: function (x) { return trip("/global-search/searchlist/search", "stay-" + x.id, { keyword: q(x) + " hotel" }); },
    activity: function (x) { return KLOOK_ON ? klook(x) : trip("/global-search/searchlist/search", "activity-" + x.id, { keyword: q(x) }); }
  };

  // Rel for every commission link (Google requires rel="sponsored" on paid links).
  var REL = "sponsored nofollow noopener";
  // Per-button disclosure (owner approved 2026-10-17, supersedes the 2026-10-07 no-line decision).
  var DISCLOSURE = "제휴 링크"; // 경제적 이해관계 최소 고지(공정위 추천·보증 심사지침)

  g.KTAffiliate = { LINKS: LINKS, REL: REL, DISCLOSURE: DISCLOSURE, trip: trip, KLOOK_ON: KLOOK_ON, AIRPORT: AIRPORT };
})(typeof globalThis !== "undefined" ? globalThis : window);
