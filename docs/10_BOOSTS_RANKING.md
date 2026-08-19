# Boosts, Sponsored Visibility & Ranking
STATUS: FASE 08 — IMPLEMENTATION COMPLETE
VERSION: 3.0 (v1.1 Architecture — Corrected Pagination)
LAST UPDATED: 2026-08-18

## Separation
Subscription = ongoing publication/plan benefits.
Promotion = temporary paid exposure.
Search organic ranking and sponsored inventory remain separate engines/layers.

## MVP Boost Products
| Code | Scope | Duration |
|---|---|---|
| BOOST_CITY_24H | CITY | 24h |
| BOOST_CITY_7D | CITY | 7 days (168h) |
| BOOST_LOCATION_24H | MARKETPLACE_LOCATION | 24h |
| BOOST_LOCATION_7D | MARKETPLACE_LOCATION | 7 days |

Prices are configurable and DB-authoritative. Clients never determine amount, currency, duration, or scope. DEV placeholder prices (R$29,90 / R$99,90 / R$14,90 / R$49,90) are NOT production pricing.

## Campaign Lifecycle
```
PENDING_PAYMENT → ACTIVE (if starts_at <= now)
PENDING_PAYMENT → SCHEDULED (if starts_at > now)
PENDING_PAYMENT → FAILED (provider declined)
```
Campaigns are **never** created directly as ACTIVE. Service role transitions status after payment confirmation.

## Temporal Overlap Prevention
Enforced at PostgreSQL level using `btree_gist` exclusion constraint:
```sql
EXCLUDE USING gist (
  profile_id WITH =,
  scope_type WITH =,
  city_id WITH =,
  effective_location_id WITH =,   -- COALESCE(location_id, '00000000-...')
  tstzrange(starts_at, ends_at, '[)') WITH &&
) WHERE (status IN ('PENDING_PAYMENT', 'SCHEDULED', 'ACTIVE'))
```
- Half-open range `[)` allows adjacent campaigns (A.ends_at = B.starts_at).
- FAILED/CANCELED/COMPLETED rows excluded — never block future campaigns.
- Two concurrent overlapping insertions: exactly one succeeds (PG error code 23P01).

## Sponsored Search Placement

### Eligibility (Fail-Closed)
Boost NEVER bypasses the 8 centralized publication gates from `isPublicSearchEligible()`:
- Account ACTIVE
- Profile ACTIVE/READY_FOR_REVIEW
- Content moderation APPROVED
- KYC VERIFIED (identity + age)
- At least 1 service area
- At least 1 approved photo
- Subscription publication entitlement
- No suspension/pause

If a profile loses eligibility during an active boost, sponsored placement stops immediately. The campaign record is preserved. Refund/credit is a human commercial decision.

### MAX_SPONSORED_SLOTS_PER_PAGE = 4
No profile appears twice on the same result page (sponsored + organic).

### Fair Rotation
`SHA-256(scopeType : scopeId : bucket : profileId)` — deterministic per `BOOST_ROTATION_WINDOW_MINUTES` (60min bucket). Zero state required. No Redis.

### Pagination (v1.1 Corrected)

The sponsored layer runs on **ALL pages** to authoritatively recompute `sponsoredCountPage1` for the organic offset formula. Client-supplied `sponsoredCount` is never trusted.

```
Page 1:
  organicOffset = 0
  organicLimit  = PAGE_SIZE - sponsoredCount

Page N ≥ 2:
  organicOffset = (PAGE_SIZE - sponsoredCountPage1) + ((N - 2) × PAGE_SIZE)
  organicLimit  = PAGE_SIZE
```

| Sponsored | Page | Organic offset | Organic limit |
|---|---|---|---|
| 4 | 1 | 0 | 16 |
| 4 | 2 | 16 | 20 |
| 4 | 3 | 36 | 20 |
| 2 | 1 | 0 | 18 |
| 2 | 2 | 18 | 20 |
| 0 | 1 | 0 | 20 |
| 0 | 2 | 20 | 20 |

**totalProfiles** = unique eligible profiles. Sponsored profiles are already members of this population. Never: `organicCount + sponsoredCount`.
**totalPages** = `ceil(totalProfiles / PAGE_SIZE)`.

- Page 1: sponsored IDs excluded from organic query (NOT IN).
- Page 2+: no exclusion — boosted profiles re-enter organic ranking.
- Bucket boundary: minor result movement is accepted MVP behavior.

### SearchResponse
```typescript
interface SearchResponse {
  results:        SearchResultDTO[]
  totalProfiles:  number   // unique eligible profiles — never inflated
  totalPages:     number   // ceil(totalProfiles / PAGE_SIZE)
  currentPage:    number
  sponsoredCount: number   // 0..4 — informational for UI only
}
```

## Scope Behavior
- **CITY boost**: Appears in any search within the city (with or without location filter), limited to `MAX_SPONSORED_SLOTS_PER_PAGE`.
- **MARKETPLACE_LOCATION boost**: Appears in neighborhood-specific searches only. Takes precedence over CITY boosts in that neighborhood.
- Simultaneous CITY + LOCATION boosts by the same profile are allowed (different scope types = different constraint axes).

## Analytics (Post-MVP)
Impressions, profile views, and contact clicks per campaign. Dashboard compares campaign performance vs. baseline. Never promise guaranteed clients.

## Deferred
Dynamic pricing, campaign scheduling UI, bundles, daypart/weekend products, auction systems, real payment provider integration (pending written underwriting approval).


