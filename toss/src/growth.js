/*
 * KeywordTrip mini app — usage events and review timing (Toss bundle only).
 *  - Analytics events feed the console's key metrics (전환 지표).
 *    Main conversion: booking_click (a partner booking link — flights, hotels, tours — is opened).
 *    Supporting: destination_open, official_link_click, share, search.
 *  - Review.request is called when the user comes back to the app after opening a booking link,
 *    or right after sharing a trip; at most once per app session and once every 30 days from this device.
 *    Nothing in the app depends on whether the review sheet appears.
 */
import { Analytics, Review } from "@apps-in-toss/web-framework";

const REVIEW_KEY = "kt_toss_review_at";
const REVIEW_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
const REVIEW_DELAY_MS = 1200;
const PARTNER_HOST = /(^|\.)(trip\.com|klook\.com|agoda\.com|booking\.com|expedia\.co\.kr|myrealtrip\.com)$/i;

function safe(fn) {
  try {
    const r = fn();
    if (r && typeof r.catch === "function") r.catch(() => {});
  } catch (e) {}
}

export function log(name, params) {
  safe(() => Analytics.log({ log_name: name, log_type: "event", params: params || {} }));
}

function pageName() {
  const p = location.pathname.replace(/\.html$/, "").replace(/\/index$/, "") || "/";
  if (p === "/" || p === "") return "home";
  if (p === "/trips/remote") return "destination";
  if (/^\/trips\/[a-z0-9-]+\/[a-z0-9-]+$/.test(p)) return "destination_topic";
  if (/^\/trips\/[a-z0-9-]+$/.test(p)) return "destination";
  if (p === "/trips") return "destinations";
  if (/^\/guides\//.test(p)) return "guide";
  return p.slice(1).replace(/\//g, "_");
}

function pagePath() {
  if (location.pathname.replace(/\.html$/, "") === "/trips/remote") return new URLSearchParams(location.search).get("p") || "";
  return location.pathname.replace(/\.html$/, "");
}

let reviewAskedThisSession = false;
export function askReview(reason) {
  if (reviewAskedThisSession) return;
  try {
    const last = Number(localStorage.getItem(REVIEW_KEY) || 0);
    if (last && Date.now() - last < REVIEW_COOLDOWN_MS) return;
  } catch (e) {}
  if (!Review || !Review.request || !Review.request.isSupported || !Review.request.isSupported()) return;
  reviewAskedThisSession = true;
  setTimeout(() => {
    try { localStorage.setItem(REVIEW_KEY, String(Date.now())); } catch (e) {}
    safe(() => Review.request());
    log("review_request", { reason });
  }, REVIEW_DELAY_MS);
}

// Called by the bridge for every external link the user opens.
let bookingOpened = false;
export function trackOutbound(a, url) {
  const sponsored = /\bsponsored\b/i.test(a.getAttribute("rel") || "");
  if (sponsored || PARTNER_HOST.test(url.hostname)) {
    bookingOpened = true;
    const kind = (url.pathname.split("/")[1] || "").replace(/[^a-z-]/gi, "") || "other";
    log("booking_click", { provider: url.hostname.replace(/^www\./, ""), kind, page: pagePath() || "/" });
  } else {
    log("official_link_click", { host: url.hostname, page: pagePath() || "/" });
  }
}

export function trackShare(id) {
  log("share", { destination: id });
  askReview("share");
}

// Back from the partner site: the trip is planned — a good moment to ask for a review.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && bookingOpened) {
    bookingOpened = false;
    askReview("booking_return");
  }
});

function watchHome() {
  const sheet = document.getElementById("sheet");
  if (sheet) {
    let lastId = new URLSearchParams(location.search).get("d") || "";
    document.addEventListener("click", (e) => {
      const el = e.target && e.target.closest && e.target.closest("[data-id]");
      if (el) lastId = el.getAttribute("data-id") || "";
    }, true);
    new MutationObserver(() => {
      if (sheet.getAttribute("aria-hidden") === "false") log("destination_open", { destination: lastId || "unknown" });
    }).observe(sheet, { attributes: true, attributeFilter: ["aria-hidden"] });
  }
  const q = document.getElementById("q");
  if (q) {
    q.addEventListener("change", () => {
      const v = (q.value || "").trim();
      if (v) log("search", { query: v.slice(0, 40) });
    });
  }
}

function start() {
  const params = { page: pagePath() || "/" };
  safe(() => Analytics.screen(Object.assign({ log_name: pageName() }, params)));
  watchHome();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
else start();
