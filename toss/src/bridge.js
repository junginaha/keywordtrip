/*
 * KeywordTrip — Apps in Toss bridge.
 * Loaded first on every page of the Toss bundle. Keeps the site's design and
 * copy untouched and only adapts behaviour the Toss WebView needs:
 *  - /api/* calls go to keywordtrip.com (the bundle runs on keywordtrip.apps.tossmini.com)
 *  - clean URLs (/trips/bali) resolve to the bundled .html files
 *  - links to keywordtrip.com stay inside the mini app
 *  - official sites and partner links open in the external browser
 *  - share uses a Toss deep link (intoss://keywordtrip)
 *  - bottom sheets close on the Toss back button before leaving the page
 */
import { Device, Share, getTossShareLink, openURL as legacyOpenURL } from "@apps-in-toss/web-framework";

const SITE = "https://keywordtrip.com";
const APP = "keywordtrip";
const SITE_HOSTS = new Set(["keywordtrip.com", "www.keywordtrip.com"]);

/* ---------- 1. API calls → keywordtrip.com ---------- */
const isApi = (p) => typeof p === "string" && p.startsWith("/api/");
const nativeFetch = window.fetch.bind(window);
window.fetch = function (input, init) {
  try {
    if (typeof input === "string" && isApi(input)) input = SITE + input;
    else if (input instanceof URL && input.origin === location.origin && isApi(input.pathname)) input = SITE + input.pathname + input.search;
  } catch (e) {}
  return nativeFetch(input, init);
};
if (navigator.sendBeacon) {
  const nativeBeacon = navigator.sendBeacon.bind(navigator);
  navigator.sendBeacon = function (url, data) {
    if (isApi(url)) {
      // Cross-origin JSON beacons are blocked by browsers; send the same body with fetch keepalive.
      try {
        const body = data instanceof Blob ? data : typeof data === "string" ? data : JSON.stringify(data || {});
        nativeFetch(SITE + url, { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
      } catch (e) {}
      return true;
    }
    return nativeBeacon(url, data);
  };
}

/* ---------- 2. Clean URLs → bundled files ---------- */
function bundlePath(pathname) {
  if (!pathname || pathname === "/") return "/index.html";
  if (/\.[a-z0-9]+$/i.test(pathname)) return pathname;
  if (pathname.endsWith("/")) return pathname + "index.html";
  if (pathname === "/trips") return "/trips/index.html";
  return pathname + ".html";
}

/* ---------- 3. External links ---------- */
function openExternal(url) {
  const fn = (Device && Device.openURL) || legacyOpenURL;
  Promise.resolve()
    .then(() => fn(url))
    .catch(() => { try { window.location.href = url; } catch (e) {} });
}

window.addEventListener(
  "click",
  (e) => {
    if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey) return;
    const a = e.target && e.target.closest && e.target.closest("a");
    if (!a) return;

    // Contact links (data-mail) → mail app.
    const mail = a.getAttribute("data-mail");
    if (mail !== null) {
      e.preventDefault();
      e.stopPropagation();
      openExternal("mailto:" + ["junginaha", "gmail.com"].join("@") + (mail ? "?" + mail : ""));
      return;
    }

    const raw = a.getAttribute("href");
    if (!raw || raw.startsWith("#") || raw.startsWith("javascript:")) return;
    let u;
    try { u = new URL(raw, location.href); } catch (err) { return; }

    if (u.protocol === "mailto:" || u.protocol === "tel:") {
      e.preventDefault();
      openExternal(u.href);
      return;
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") return;

    if (SITE_HOSTS.has(u.hostname) || u.origin === location.origin) {
      if (u.origin === location.origin && u.pathname === location.pathname && u.search === location.search && u.hash) return; // in-page anchor
      e.preventDefault();
      location.href = bundlePath(u.pathname) + u.search + u.hash;
      return;
    }

    // Partner and official sites: keep the element's own click handlers (tracking) and open outside.
    e.preventDefault();
    openExternal(u.href);
  },
  true
);

/* ---------- 4. Share with a Toss deep link ---------- */
async function shareTrip(x) {
  const text = (x.head || x.hook || x.city + " 여행") + " · " + (x.kw || []).join(" · ");
  let link = "";
  try {
    link = await (Share && Share.createLink
      ? Share.createLink({ path: "intoss://" + APP + "?d=" + encodeURIComponent(x.id) })
      : getTossShareLink("intoss://" + APP + "?d=" + encodeURIComponent(x.id)));
  } catch (e) {}
  const message = x.city + " 여행 | 키워드트립\n" + text + (link ? "\n" + link : "");
  try {
    if (Share && Share.sendMessage) return await Share.sendMessage({ message });
  } catch (e) {}
  try { if (navigator.share) await navigator.share({ title: x.city + " 여행 | 키워드트립", text, url: link || undefined }); } catch (e) {}
}

/* ---------- 5. Back button closes open sheets first ---------- */
function watchSheet(sel, closeSel) {
  const el = document.querySelector(sel);
  if (!el) return;
  let pushed = false;
  let closingByBack = false;
  const isOpen = () => el.getAttribute("aria-hidden") === "false";
  new MutationObserver(() => {
    if (isOpen() && !pushed) {
      history.pushState({ ktSheet: sel }, "", location.href);
      pushed = true;
    } else if (!isOpen() && pushed) {
      pushed = false;
      if (closingByBack) { closingByBack = false; return; }
      if (history.state && history.state.ktSheet === sel) history.back();
    }
  }).observe(el, { attributes: true, attributeFilter: ["aria-hidden"] });
  window.addEventListener("popstate", () => {
    if (pushed && isOpen()) {
      closingByBack = true;
      const btn = document.querySelector(closeSel);
      if (btn) btn.click();
    }
  });
}

window.KTToss = { app: APP, shareTrip, openExternal, bundlePath };
document.documentElement.classList.add("in-toss");

function ready() {
  watchSheet("#sheet", "#close");
  watchSheet("#finder", "#fClose");
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
else ready();
