// Refreshes exchange-rate text on static destination pages from /api/fx (falls back to the built snapshot).
(function () {
  var UNIT = { JPY: 100, VND: 100, IDR: 100 };
  var SRC = { koreaexim: "한국수출입은행 매매기준율", ecb: "ECB 기준환율", erapi: "ExchangeRate-API" };
  function unitFor(c, per) { if (UNIT[c]) return UNIT[c]; var ms = [1, 100, 1000, 10000, 100000]; for (var i = 0; i < ms.length; i++) if (per * ms[i] >= 1) return ms[i]; return 100000; }
  function won(v) { var big = v >= 10000; return v.toLocaleString("ko-KR", { minimumFractionDigits: big ? 0 : 2, maximumFractionDigits: big ? 0 : 2 }) + "원"; }
  fetch("/api/fx").then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
    if (!j || !j.r || !j.r.USD) return;
    document.querySelectorAll("[data-fx]").forEach(function (el) {
      var c = el.getAttribute("data-fx"), r = j.r[c]; if (!r) return;
      var per = 1 / r, u = unitFor(c, per), label = el.textContent.split("=")[0].trim();
      el.textContent = label + " = " + won(per * u);
    });
    var when = new Date(j.t).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
    document.querySelectorAll("[data-fx-when]").forEach(function (el) { el.textContent = when; });
    document.querySelectorAll("[data-fx-src]").forEach(function (el) { var k = j.s && j.s[el.getAttribute("data-fx-src")]; if (k && SRC[k]) el.textContent = SRC[k]; });
  }).catch(function () {});
})();
