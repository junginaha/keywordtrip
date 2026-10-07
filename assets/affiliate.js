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

  // Klook: tracked redirect generated in the Klook affiliate portal.
  // k_site = the Klook page the traveler lands on (destination search results).
  var KLOOK = { aid: "137536", aff_adid: "1484668" };
  function klook(x) {
    var target = "https://www.klook.com/ko/search/result/?query=" + encodeURIComponent(q(x));
    return "https://affiliate.klook.com/redirect?aid=" + KLOOK.aid + "&aff_adid=" + KLOOK.aff_adid + "&k_site=" + encodeURIComponent(target);
  }
  var KLOOK_ON = !!KLOOK.aid;

  var LINKS = {
    flights: function (x) { return trip("/flights/", "flight-" + x.id); },
    stay: function (x) { return trip("/global-search/searchlist/search", "stay-" + x.id, { keyword: q(x) + " hotel" }); },
    activity: function (x) { return KLOOK_ON ? klook(x) : trip("/global-search/searchlist/search", "activity-" + x.id, { keyword: q(x) }); }
  };

  // Rel for every commission link (Google requires rel="sponsored" on paid links).
  var REL = "sponsored nofollow noopener";
  // No per-button disclosure line (owner decision 2026-10-07); general affiliate notice lives on /about.
  var DISCLOSURE = "";

  g.KTAffiliate = { LINKS: LINKS, REL: REL, DISCLOSURE: DISCLOSURE, trip: trip, KLOOK_ON: KLOOK_ON };
})(typeof globalThis !== "undefined" ? globalThis : window);
