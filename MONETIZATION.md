# KeywordTrip Monetization v2 — 2026-10-03

## Current state (2026-10-07)
- Single config: `assets/affiliate.js` (shared by app, answer cards and static builder). Swap partners there only.
- Flights + stays → Trip.com (Allianceid 10882425 / SID 332762025, trip_sub1 = `<flight|stay>-<destination id>`).
- Tours/tickets → Klook tracked redirect (aid 137536 / aff_adid 1484668) to each destination's Klook search.
- No per-button disclosure line (owner decision). rel="sponsored nofollow noopener" on every partner link; general affiliate notice stays on /about.
- No booking CTA on MOFA travel-ban destinations or North Korea.
- Weekly scheduled task "키워드트립 주간 제휴 조건 스카우팅" (Tue 08:51 KST) reports better partner terms; swaps happen only after owner approval.

## Positioning
KeywordTrip is not another generic itinerary chatbot. It captures **travel intent before booking**:

keyword / mood / visa need / season -> destination decision -> partner click -> completed booking.

The commercial asset to build is a privacy-safe intent graph:
destination viewed -> partner category clicked -> completed booking result.

Do not store names, emails, phone numbers, account IDs, IP addresses, or raw free-form search text in the intent graph.

## Revenue order

### 1. Trip.com — account activated 2026-10-05, primary broad inventory
- Completion email received from Trip.com on 2026-10-05; regular-user completion email means the account is activated and ready to use.
- Official program accepts individuals and companies.
- No website ownership requirement and no stated traffic minimum on the public program page.
- Covers flights, hotels, trains, tours/tickets.
- Official: https://www.trip.com/partners/index

Current status:
- Partner account activation is verified by the completion email.
- The Gmail text body exposes the AID label but not the actual AID value.
- Revenue attribution is NOT active on KeywordTrip yet because AID/SID-bearing affiliate URLs must be generated inside the authenticated Trip.com partner platform.

Immediate activation action:
- Sign in to Trip.com Partner > Affiliate Link.
- Select/create the KeywordTrip Site ID (SID).
- Generate tracked URLs for flights, hotels, and tours/tickets.
- Use trip_sub1 values such as keywordtrip_flight, keywordtrip_stay, keywordtrip_activity for channel attribution where the tool allows it.
- Replace the centralized `PARTNER_LINKS` targets in `assets/app.js` with the generated Trip.com affiliate URLs.
- Keep one primary CTA per transaction type and verify the first click in both KeywordTrip outbound logs and the Trip.com dashboard before calling the channel live.

### 2. Klook — experiences, application/account status to verify
- Strong fit with KeywordTrip destination cards.
- Public affiliate page offers widgets, search boxes, banners, referral codes, performance bonuses, data feeds/API/white label for advanced partners.
- Official: https://affiliate.klook.com/

Verified account rule:
- Klook's official affiliate welcome email received 2026-10-03 states that affiliate accounts with no sales performance for six months are deactivated.
- The same email instructs the partner to complete the account profile and payment details, add websites/AIDs, generate affiliate ads, and use the performance dashboard.
- Treat a completed sale/booking in the affiliate portal as the survival metric; clicks alone do not satisfy the sales requirement.

Action now:
- Complete account profile/payment details and generate the approved Klook affiliate link/AID.
- Then replace `PARTNER_LINKS.activity` with the approved Klook affiliate deep link.
- Internal safety checkpoints: 120 days = conversion review, 150 days = concentrated action, 170 days = account/support/fallback review.

### 3. Viator — apply now, strong immediate backup / second experiences network
- Quick, free sign-up.
- Official page states no traffic or follower minimum.
- 8% commission on completed experience bookings.
- 30-day cookie window.
- Weekly payouts are available for PayPal.
- Official: https://partnerresources.viator.com/

Why it matters:
- Low entry friction makes it useful while Klook status is still being verified.
- A/B test by destination or category rather than showing two competing activity CTAs at once.

Action after approval:
- Add a `viator` provider template to the centralized partner config.
- Use Viator on destinations/categories where it has better inventory or conversion than Klook.

### 4. Airalo — apply now, cross-sell eSIM
- Official affiliate page targets travel bloggers, content creators, comparison sites and apps.
- Standard commission: 10% of final sale value after discounts.
- Minimum payout threshold: USD 15.
- Payout: 28th of the following month; bank or PayPal.
- Official: https://partners.airalo.com/solutions/affiliates

Why it matters:
- eSIM is destination-agnostic and can monetize nearly every international trip page.
- It does not compete directly with flight/stay/activity CTAs.

Action after approval:
- Add one low-friction “eSIM 확인” CTA below transaction CTAs for international destinations only.
- Do not show it on domestic trips.

### 5. Booking.com — accommodation expansion, later
- Official affiliate program routes applicants through Awin or CJ depending on region.
- Monetizes qualified bookings.
- Official: https://www.booking.com/affiliate-program/v2/index.html

Why later:
- Additional affiliate-network onboarding adds friction versus Trip.com / Viator / Airalo.
- Apply when accommodation click volume is measurable or Trip.com stay performance is insufficient.

### 6. DiscoverCars — later, high-intent rental-car pages
- Official program advertises roughly USD 20 average commission per booking.
- 365-day cookie.
- Commission is based on DiscoverCars' profit, not customer booking value.
- Official terms restrict PPC, display ads and paid social traffic.
- Official: https://www.discovercars.com/affiliate

Why later:
- Best fit is destination content with a clear rental-car use case.
- Confirm tax/payout eligibility before prioritizing in the current no-business-registration state.

### 7. 12Go / GetYourGuide — reserve pool
- 12Go is relevant to rail / bus / ferry-heavy destinations and its official agreement states cookie tracking of at least 30 days.
- GetYourGuide has an affiliate partner program; partner commission is defined in its partner portal/terms rather than a fixed public headline rate.
- Add only if inventory or conversion meaningfully improves a specific destination.

## Current implementation
- Destination sheet has three transaction CTAs: flights / stays / activities.
- Partner clicks send only provider + destination + city + timestamp to `/api/outbound`.
- Search URLs are shareable via `?q=`.
- Destination URLs are shareable via `?d=`.
- Curated city URLs are included in `sitemap.xml`.
- `PARTNER_LINKS` is centralized in `index.html` so approved affiliate URLs can be swapped in one place.
- Current outbound URLs are generic provider/search URLs unless an approved affiliate tracking template has been inserted.

## Conversion rules
1. One primary partner CTA per transaction category.
2. Never show two competing activity buttons by default; choose Klook or Viator by inventory/performance.
3. Do not call a click “revenue.”
4. Booking completion reported by the affiliate dashboard is the revenue-conversion source of truth.
5. Do not claim affiliate approval until the partner completion email or dashboard activation is verified.
6. Affiliate disclosure should be clear once commission-generating links are active.

## 60-day execution
### Days 0–14
- Verify Trip.com approval state.
- Verify Klook account/portal state and actual inactivity rule.
- Apply to Viator and Airalo.
- Keep generic links until approved tracking links are available.

### Days 15–30
- Insert approved tracking links in the centralized partner config.
- Confirm outbound click events by provider and destination.
- Build top 10 high-intent destination/category pages around transaction intent.

### Days 31–60
- Compare partner CTR with affiliate-dashboard completed bookings.
- Keep the best-converting provider per category/destination.
- Add eSIM only to international destination flows.
- Test rental car only on destinations where it is a real itinerary need.

## Funnel KPIs
1. Organic sessions
2. Search use rate
3. Destination detail open rate
4. Partner CTR
5. Completed bookings reported by partner dashboard
6. Commission revenue
7. Revenue per 1,000 sessions (RPM)
8. Top destination -> top transaction category -> completed booking

## 90-day rule
Only build features that improve at least one of:
- qualified traffic
- destination decision rate
- partner CTR
- booking conversion
- repeat/referral traffic

Community features come after transaction demand is proven. The first community use case should be trip-specific (save/share/join a trip), not a generic social feed.


## Traffic growth engine

Revenue requires qualified traffic before affiliate optimization.

### Organic search
- Every curated city must have an indexable canonical `/trips/{id}` landing page.
- `sitemap.xml` uses those canonical landing pages, not query-string detail states.
- Homepage exposes crawlable internal links to all curated city landing pages.
- IndexNow notifies participating search engines when public URLs change.
- Google Search Console property for KeywordTrip is still not connected as of 2026-10-03; do not invent search metrics before verification.

### Referral loop
- Destination detail includes a native mobile share action.
- Shared URLs open the same destination state with `?d=`.
- Track share action separately from partner clicks; a share is not revenue.

### Content expansion rule
Prioritize new city/search landing pages from verified Korean travel demand and commercial intent, then measure:
1. impressions
2. organic clicks
3. destination detail opens
4. partner CTR
5. verified affiliate bookings

2026 demand signals currently support prioritizing Japan short-haul demand plus rising destinations such as Phu Quoc, while existing KeywordTrip pages already cover Osaka, Bangkok and Da Nang. Add new destinations only when content quality and transaction relevance are sufficient; avoid thin programmatic pages.

## 2026-10-05 — AI reference applied
Destination suitability FAQs now describe visitor intent and tradeoffs. Visible FAQ answers and JSON-LD use the same text. Missing entry data no longer defaults to visa-free; visa-free no longer implies no entry procedure. FX timestamps identify reference data, including the stored fallback. Provider clicks remain distinct from verified completed bookings and earned commission. Review source URL, affected field and actual edit date when correcting travel data; editorial dates are not claims of a full immigration audit. Keep curation separate from affiliate terms, and preserve the existing provider configuration until approved links are verified.
