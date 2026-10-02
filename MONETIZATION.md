# KeywordTrip Monetization v1

## Positioning
KeywordTrip is not another generic itinerary chatbot. It captures **travel intent before booking**:
keyword / mood / visa need / season -> destination decision -> booking click.

The commercial asset to build is the anonymized **intent graph**:
search keyword -> destination viewed -> partner category clicked -> partner booking result.

## Revenue order

### 1. Trip.com — first
- Broad inventory: flights, hotels, trains, tours/tickets.
- Official program says individuals and companies can apply.
- Website cookie: 30 days.
- Basic commission advertised up to 7%.
- No website traffic threshold stated on the official program page.
- Partner link generator + dashboard are available.
- Official: https://www.trip.com/partners/index

Action after account approval:
replace PARTNER_LINKS.flights (and later hotel) in index.html with the generated affiliate deep-link template.

### 2. Klook — experiences
- Strong fit with KeywordTrip destination cards.
- Website affiliate tools include widgets, search boxes, banners; advanced integration offers data feeds/API/white label.
- Official: https://affiliate.klook.com/

Action after account approval:
replace PARTNER_LINKS.activity with the approved Klook affiliate deep link.

### 3. Booking.com — accommodation
- Official affiliate program routes applicants through its affiliate network (CJ by region).
- Monetizes qualified bookings.
- Official: https://www.booking.com/affiliate-program/v2/index.html

Action after approval:
replace PARTNER_LINKS.stay with the approved Booking.com affiliate URL/template.

### 4. Skyscanner — later, after traffic
- Official affiliate acceptance criteria include HTTPS, current travel content, good UX, and >5,000 unique visitors/month.
- 30-day referral data window; widgets/text links available.
- Official: https://www.partners.skyscanner.net/product/affiliates

Do not spend founder time here until KeywordTrip crosses the traffic threshold.

## Current implementation
- Destination sheet has three transaction CTAs: flights / stays / activities.
- Partner clicks send only provider + destination + city + timestamp to /api/outbound.
- Search URLs are shareable via ?q=.
- Destination URLs are shareable via ?d=.
- 18 curated city URLs are included in sitemap.xml.
- PARTNER_LINKS is intentionally centralized in index.html so approved affiliate URLs can be swapped in one place.

## Funnel KPIs
1. Organic sessions
2. Search use rate
3. Destination detail open rate
4. Partner click-through rate (CTR)
5. Booking conversion reported by affiliate dashboard
6. Revenue per 1,000 sessions (RPM)
7. Top search keyword -> top booked destination

## 90-day rule
Only build features that improve at least one of:
- qualified traffic
- destination decision rate
- partner CTR
- booking conversion
- repeat/referral traffic

Community features come after transaction demand is proven. The first community use case should be trip-specific (save/share/join a trip), not a generic social feed.
