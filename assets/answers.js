/* KeywordTrip question answers: "Simple first, deep when needed".
 * Loads /assets/qa.json lazily (first search or picker tap) and turns a query like
 * "다낭 10월 날씨" or "베트남에서 카드 잘 되나요?" into one short answer card with related keywords,
 * a link to the detail page and — only when booking is the next step — a Trip.com CTA. */
(function () {
  let QA = null, loading = null;
  const ready = [];
  window.KTQA = {
    load() {
      if (QA) return Promise.resolve(QA);
      if (!loading) loading = fetch("/assets/qa.json").then(r => r.json()).then(j => { QA = j; ready.forEach(f => f()); return j; }).catch(() => null);
      return loading;
    },
    onReady(f) { ready.push(f); },
    get data() { return QA; },
  };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const compact = s => String(s || "").toLowerCase().normalize("NFC").replace(/[\s?!.,~·]/g, "");
  const PRIORITY = ["transportation", "entry", "exchange-rate", "hotels", "esim", "weather", "safety", "packing", "prices"];
  const SOFT = new Set(["얼마", "언제", "비용", "가격", "준비", "지역", "돈"]);

  function detect(q) {
    const s = compact(q);
    let place = null, len = 0;
    for (const [k, v] of Object.entries(QA.places)) { const kk = compact(k); if (kk.length >= 2 && s.includes(kk) && kk.length > len) { place = v; len = kk.length; } }
    let topic = null, best = 0;
    for (const t of PRIORITY) {
      let sc = 0; for (const w of QA.words[t]) if (s.includes(compact(w))) sc += SOFT.has(w) ? 0.5 : 1;
      if (sc > best) { best = sc; topic = t; }
    }
    if (/\d{1,2}월/.test(s) && (!topic || best < 1)) topic = "weather";
    const flight = QA.flight.some(w => s.includes(compact(w)));
    return { s, place, topic, flight };
  }
  const country = cc => QA.core.find(c => c[0] === cc);
  const chips = (cc, cur) => {
    const c = country(cc); const out = QA.topics.filter(([k]) => k !== cur).map(([k, l]) => `<a href="/trips/${cc}/${k}">${esc(l)}</a>`);
    if (c && c[2] && cur !== "transportation") out.splice(4, 0, `<a href="/trips/${cc}/transportation#grab">Grab</a>`);
    return out.join("");
  };
  function cta(kind, id) {
    const A = window.KTAffiliate, ci = QA.cities[id]; if (!A || !ci) return "";
    if (kind === "flight" && ci.ap) return `<a class="ans-cta" href="${esc(A.trip(`/flights/airport-icn-${ci.ap}/`, `flight-${id}`))}" target="_blank" rel="${A.REL}" data-p="flights" data-d="${esc(id)}">서울 → ${esc(ci.n)} 항공편 확인</a>`;
    if (kind === "stay") return `<a class="ans-cta" href="${esc(A.trip("/global-search/searchlist/search", `stay-${id}`, { keyword: ci.en + " hotel" }))}" target="_blank" rel="${A.REL}" data-p="stay" data-d="${esc(id)}">${esc(ci.n)} 호텔 보기</a>`;
    return "";
  }
  function liveAnswer(o) {
    if (o.fx && typeof quote === "function" && INFO.fx && INFO.fx.r[o.fx]) return `${fxTimeText()} 기준 ${quote(o.fx)}입니다. 은행 매매기준율과 같은 중간값이라 실제 환전·카드 결제에는 수수료가 붙습니다.`;
    return o.a;
  }

  // returns HTML for the answer card(s), or "" when the query isn't a travel question about a core destination
  window.KTAnswer = function (q) {
    if (!QA) { KTQA.load(); return ""; }
    const d = detect(q);
    if (!d.place) return "";
    const [cc, cityId] = d.place, c = country(cc); if (!c) return "";
    const target = cityId || cc, ci = QA.cities[target] || QA.cities[cc];
    if (!d.topic) {
      const fl = d.flight ? `<div class="ans-x">${cta("flight", target)}</div>${window.KTAffiliate && KTAffiliate.DISCLOSURE ? `<p class="ans-disc">${esc(KTAffiliate.DISCLOSURE)}</p>` : ""}` : "";
      return `<li class="ans"><p class="ans-t">${esc(ci ? ci.n : c[1])} 여행</p><p class="ans-q">무엇이 궁금하세요?</p><div class="ans-k">${chips(cc)}</div><div class="ans-x"><a class="ans-more" href="/trips/${esc(target)}">${esc(ci ? ci.n : c[1])} 한눈에 보기 →</a></div>${fl}</li>`;
    }
    const pool = QA.qa.filter(o => o.c === cc && o.t === d.topic);
    if (!pool.length) return "";
    const toks = (window.KTSearch && KTSearch._tokenize ? KTSearch._tokenize(q) : q.split(/\s+/)).filter(t => t.length >= 1);
    const scored = pool.map(o => {
      let sc = o.main ? 0.6 : 0;
      if (cityId && (o.city === cityId || o.q.includes(ci.n))) sc += 3;
      else if (cityId && o.city && o.city !== cityId) sc -= 2;
      const oq = compact(o.q), oa = compact(o.a);
      for (const t of toks) { const k = compact(t); if (!k) continue; if (oq.includes(k)) sc += 1; else if (oa.includes(k)) sc += 0.3; }
      return [o, sc];
    }).sort((a, b) => b[1] - a[1]);
    const top = scored[0][0], rel = scored.slice(1, 4).map(r => r[0]);
    const kind = d.flight || (d.topic === "transportation" && d.s.includes("공항")) ? "flight" : d.topic === "hotels" ? "stay" : "";
    const ctaHtml = kind ? cta(kind, target) || cta(kind, cc) : "";
    const label = QA.topics.find(t => t[0] === d.topic)[1];
    return `<li class="ans"><p class="ans-t">${esc(c[1])} · ${esc(label)}</p><p class="ans-q">${esc(top.q)}</p><p class="ans-a">${esc(liveAnswer(top))}</p>
<div class="ans-x"><a class="ans-more" href="${esc(top.u)}">자세히 보기 →</a>${ctaHtml}</div>${ctaHtml && KTAffiliate.DISCLOSURE ? `<p class="ans-disc">${esc(KTAffiliate.DISCLOSURE)}</p>` : ""}
<details class="ans-fold"><summary>더 알아보기</summary><div class="ans-k">${chips(cc, d.topic)}</div>
${rel.length ? `<ul class="ans-rel">${rel.map(o => `<li><a href="${esc(o.u)}">${esc(o.q)}</a></li>`).join("")}</ul>` : ""}</details></li>`;
  };

  document.addEventListener("click", e => {
    const a = e.target.closest && e.target.closest(".ans-cta"); if (!a) return;
    try { navigator.sendBeacon("/api/outbound", new Blob([JSON.stringify({ provider: a.dataset.p, destination: a.dataset.d })], { type: "application/json" })); } catch (_) {}
  });
})();
