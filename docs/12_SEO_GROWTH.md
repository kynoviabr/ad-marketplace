# SEO, Public Discovery & Growth Architecture
STATUS: APPROVED & IMPLEMENTED
VERSION: 1.1
LAST UPDATED: 2026-08-19

## 1. Executive Summary
FASE 10 establishes the technical SEO, public discovery, canonical routing, sitemap, crawler defense, and indexation foundation for AD-Marketplace.

Commercial launch begins in São Paulo, SP, Brazil, with an architecture designed to scale seamlessly to subsequent cities and states without URL rewrites.

---

## 2. Canonical URL Architecture
- **Home**: `https://{SITE_URL}/`
- **City Landing Page**: `https://{SITE_URL}/[city]` (e.g. `https://admarketplace.com.br/sao-paulo`)
- **Neighborhood / Location Landing Page**: `https://{SITE_URL}/[city]/[location]` (e.g. `https://admarketplace.com.br/sao-paulo/moema`)
- **Future Professional Profile Permalinks (FASE 12 Contract)**: `https://{SITE_URL}/perfil/[slug]` (e.g. `https://admarketplace.com.br/perfil/juliana-moema`). Profile slugs are globally unique and immutable throughout the profile's lifecycle.

---

## 3. Canonical Pagination Strategy (HD-SEO-7)
- **Page 1**: Canonical is the clean geographic base path (`/sao-paulo`). Any `?page=1` parameter is stripped from the canonical URL.
- **Page N (N >= 2)**: Self-referencing canonical preserving ONLY `?page=N` (`/sao-paulo?page=2`).
- **Query Parameter Normalization**: All recognized marketplace filter parameters and tracking parameters (`utm_*`, `gclid`, `fbclid`, `ref`) are completely stripped from canonical URLs.
- **Robots Directive**: Page 1 is `index, follow` (when meeting inventory thresholds); Page 2+ emits `noindex, follow` for MVP.

---

## 4. Indexation Thresholds & Thin Page Protection
- **`MIN_CITY_PROFILES_FOR_INDEXING = 3`** publicly eligible profiles.
- **`MIN_LOCATION_PROFILES_FOR_INDEXING = 3`** publicly eligible profiles.
- **Indexable Location Types**: `NEIGHBORHOOD` and `COMMERCIAL_DISTRICT` (`METRO_REGION` is non-indexable in MVP).
- **Below-Threshold Behavior (0, 1, 2 Profiles)**: HTTP 200 + `noindex, follow` + excluded from `sitemap.xml`.
- **Invalid / Non-Existent Route**: HTTP 404 (`notFound()`).

---

## 5. Filter Combinatorial Explosion Protection
- **Curated Geographic Pages**: Indexable if inventory threshold is met.
- **Filtered Search States** (presence of `idade_min`, `cabelo`, `corpo`, etc.): **`noindex, follow`**.

---

## 6. Dynamic Sitemap (`app/sitemap.ts`)
- **Scope (FASE 10 MVP)**: Includes Home (`/`), active cities (`count >= 3`), and active locations (`count >= 3`).
- **Profile Exclusion Invariant**: `/perfil/[slug]` is STRICTLY EXCLUDED from `sitemap.xml` until the public profile page route is built in FASE 12.
- **Query Parameter Exclusion**: URLs with query parameters (`?page=2`, `?cabelo=...`) are excluded.
- **`lastModified`**: Sourced from authoritative `MAX(profile.updated_at)` or omitted if no reliable timestamp exists. Never faked with `new Date()`.

---

## 7. Search Crawler Analytics Preservation (Zero Cloaking)
- **Lightweight Bot Detection**: `isSearchCrawler(userAgent)` detects search engine and social crawlers (Googlebot, Bingbot, YandexBot, etc.).
- **Suppression**: Suppresses background `SEARCH_PERFORMED` analytics recording inside Next.js `after()`.
- **Zero Cloaking**: Crawlers and human visitors receive **100% identical HTML, search results, metadata, and status codes**.
- **Privacy**: No raw User-Agent or crawler IP is stored.

---

## 8. Open Graph & Media Security (Fail-Closed)
- **Approved Media Only**: Only media in `APPROVED` status from `profile_media` can be referenced in social tags.
- **Fail-Closed**: Expiring signed URLs are omitted from social preview tags to prevent broken previews. Profile-specific public CDN derivatives are deferred to FASE 12.

---

## 9. Schema.org JSON-LD Structured Data
- **`WebSite`**: Emitted on Home root layout.
- **`BreadcrumbList`**: Emitted on City (`Home → City`) and Location (`Home → City → Location`) pages.
- **`ProfilePage` / `Person`**: Module builder contract defined; activated in FASE 12 upon public profile page creation. Zero fake reviews, star ratings, or price spam.

---

## 10. Environment Safety & Robots Directives
- **DEV / STAGING / PREVIEW**: Global crawl block (`Disallow: /`) and `noindex, nofollow`.
- **PRODUCTION**: Allows public surfaces, disallows private routes (`/admin/`, `/dashboard/`, `/onboarding/`, `/api/`, `/auth/`), and references `sitemap.xml`. Root metadata allows public child routes to declare their own indexability.
