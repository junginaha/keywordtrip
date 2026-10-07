/* KeywordTrip affiliate link config — single source of truth.
 * Used by the app (assets/app.js) and the static page builder (scripts/build-pages.mjs).
 * Trip.com attributes a booking only when Allianceid + SID are on the landing URL.
 * trip_sub1 = "<category>-<destination id>" so the partner dashboard shows which page and button earned it.
 */
(function (g) {
  var TRIP = { Allianceid: "10882425", SID: "332762025", trip_sub3: "D20118625" };
  var HOST = "https://kr.trip.com";

  function trip(path, sub, params) {
    var u = new URL(path, HOST);
    Object.keys(params || {}).forEach(function (k) { u.searchParams.set(k, params[k]); });
    Object.keys(TRIP).forEach(function (k) { u.searchParams.set(k, TRIP[k]); });
    if (sub) u.searchParams.set("trip_sub1", String(sub).slice(0, 60));
    return u.toString();
  }
  // English place name gives the most reliable Trip.com search match.
  function q(x) { return x.country ? x.en : (x.en || x.city); }

  // Klook: paste the tracking params from a link generated in the Klook affiliate portal
  // (e.g. { aid: "12345", aff_adid: "67890" }). Empty = activity button stays on Trip.com.
  var KLOOK = {};
  function klook(x) {
    var u = new URL("https://www.klook.com/ko/search/result/");
    u.searchParams.set("query", q(x));
    Object.keys(KLOOK).forEach(function (k) { u.searchParams.set(k, KLOOK[k]); });
    return u.toString();
  }
  var KLOOK_ON = !!KLOOK.aid;

  var LINKS = {
    flights: function (x) { return trip("/flights/", "flight-" + x.id); },
    stay: function (x) { return trip("/global-search/searchlist/search", "stay-" + x.id, { keyword: q(x) + " hotel" }); },
    activity: function (x) { return KLOOK_ON ? klook(x) : trip("/global-search/searchlist/search", "activity-" + x.id, { keyword: q(x) }); }
  };

  // Rel for every commission link (Google requires rel="sponsored" on paid links).
  var REL = "sponsored nofollow noopener";
  // User-facing disclosure required by the KFTC endorsement guideline.
  var DISCLOSURE = "예약 버튼은 " + (KLOOK_ON ? "트립닷컴·클룩" : "트립닷컴") + " 제휴 링크입니다. 이 링크로 예약하시면 키워드트립이 소정의 수수료를 받으며, 예약 가격은 같습니다.";

  g.KTAffiliate = { LINKS: LINKS, REL: REL, DISCLOSURE: DISCLOSURE, trip: trip, KLOOK_ON: KLOOK_ON };
})(typeof globalThis !== "undefined" ? globalThis : window);
