# Search, Locations & Filters
STATUS: APPROVED
VERSION: 1.0
LAST UPDATED: 2026-08-15

## Location hierarchy
Brazil -> State -> City -> Region/Neighborhood.
Locations use controlled records/slugs rather than advertiser free text.
A profile has a primary city/region and may have additional service regions. Number of service regions may become a plan benefit.
Never use residential address as public search location.

## Search
Use PostgreSQL initially; no Elasticsearch in MVP.
Primary discovery is structured search/filtering.

## Approved filters
- State/city
- Region/neighborhood
- Verified-only
- Verified age/range when age is displayed
- Price
- Availability
- Height
- Weight
- Bust/waist/hips when displayed
- Eye color
- Hair color/length
- Body type
- Tattoos
- Piercings
- Languages
- Service/category
- In-person / virtual

Numeric values remain numeric. Categorical values use controlled reference tables.

## Privacy invariant
Hidden attributes do not participate in public filters and must not be indirectly inferable from search results.

## URLs
Examples: /sao-paulo and /sao-paulo/moema. Individual profile: /perfil/<slug>.
Arbitrary filter combinations should not automatically become indexable SEO pages.

## Pagination
Use conventional pagination or load-more with crawlable pagination support; do not rely exclusively on infinite scroll.

## Analytics
Search introduces `search_impression`, producing the funnel:
search_impression -> profile_view -> contact_click.

## Performance
Add indexes based on actual query patterns. PostgreSQL is expected to support MVP/early growth without a separate search engine.
