# Database Schema Reference
STATUS: ACTIVE & VALIDATED
VERSION: 0.6
LAST UPDATED: 2026-08-18

## Applied Tables (FASE 01 - 08)

### FASE 01: Authentication & Accounts
- `public.account_users`: Core user accounts (role, status, onboarding state, terms/privacy versioning).

### FASE 02: Identity & KYC Foundation
- `public.identity_verifications`: KYC verification sessions, status tracking, age/identity flags.
- `public.verification_webhook_events`: Idempotent webhook event ledger for Didit/Mock providers.

### FASE 03: Professional Profile Domain
- `public.professional_profiles`: Professional advertiser profiles (1:1 with `account_users`), stage name, slug, structured physical attributes, privacy toggles, contacts, content moderation status.

### FASE 04: Locations & Search
- `public.states`: Geographic state entities (e.g. SP).
- `public.cities`: Geographic cities (e.g. São Paulo).
- `public.marketplace_locations`: Neighborhoods and service areas (e.g. Moema, Pinheiros, Jardins).
- `public.professional_profile_locations`: Many-to-many link between profiles and service locations, with partial unique index ensuring at most one primary location (`is_primary = true`) per profile.

### FASE 05: Media / Photos
- `public.profile_media`: Profile photos with upload/moderation lifecycle, position ordering, primary flag, MIME/size metadata, and signed URL support.

### FASE 06: Content Moderation & Reports
- `public.media_moderation_reviews`: Media review audit trail (reviewer, decision, reason, source).
- `public.profile_moderation_reviews`: Profile content review audit trail with content snapshots.
- `public.content_reports`: Public content reports with single-target constraint (profile XOR media), reporter hash, resolution tracking.

### FASE 07: Billing, Subscriptions & Payment Gateway Foundation
- `public.subscription_plans`: Plan definitions (FOUNDER, future Essential/Premium/Top/Super Top). Soft-delete via `is_active`.
- `public.plan_prices`: Price tiers per plan (LAUNCH_FREE, FOUNDING). Integer minor units (centavos). Temporal validity bounds with CHECK constraint.
- `public.plan_entitlements`: Configurable plan benefits (MAX_PHOTOS, MAX_SERVICE_AREAS, PROFILE_PUBLICATION).
- `public.subscriptions`: Account subscriptions with state machine (ACTIVE, PAST_DUE, GRACE_PERIOD, INCOMPLETE, EXPIRED). Partial unique index allows one active subscription per account while preserving EXPIRED history. Provider references nullable for free-launch. Cancel via `cancel_at_period_end` flag.
- `public.billing_webhook_events`: Idempotent webhook event ledger with UNIQUE (provider, provider_event_id). No raw payload storage (LGPD/PCI minimization).
- `public.billing_overrides`: Admin-granted publication entitlements with audit trail (granted_by, revoked_by, reason, expiry).

### FASE 08: Boosts & Additional Monetization Foundation
- `public.boost_products`: Visibility products catalog (BOOST_CITY_24H, BOOST_CITY_7D, BOOST_LOCATION_24H, BOOST_LOCATION_7D). Scope types (`CITY`, `MARKETPLACE_LOCATION`).
- `public.boost_prices`: Price tiers per boost product. Integer minor units (centavos), temporal integrity check constraint (`valid_until > valid_from`), non-negative check. Seeded as commercial placeholders for DEV (NOT production pricing).
- `public.profile_boosts`: Campaign orders and active placements with lifecycle states (PENDING_PAYMENT, SCHEDULED, ACTIVE, COMPLETED, CANCELED, FAILED). `effective_location_id` is a `GENERATED ALWAYS AS STORED` column (`COALESCE(location_id, '00000000-0000-0000-0000-000000000000'::uuid)`) enabling NULL-safe exclusion constraints. Concurrency-safe temporal exclusion constraint (`ex_profile_boosts_no_temporal_overlap` via `btree_gist` + `tstzrange('[)')`) prevents overlapping active/scheduled/pending campaigns for the exact same profile, scope, and location while allowing adjacent and future campaigns. FAILED/CANCELED/COMPLETED rows are excluded from the constraint. Composite performance indexes for fast search resolution.

**v1.1 Search Architecture Note:** `SearchResponse.totalProfiles` represents unique eligible profiles only. Sponsored profiles are already members of the organic population — totalProfiles is never inflated by `+sponsoredCount`. The sponsored candidate layer runs on all pages to authoritatively recompute `sponsoredCountPage1` for the corrected organic offset formula.


### FASE 09: Analytics, Event Tracking & Conversion Measurement Foundation
- `public.analytics_events`: Canonical raw event store for `SEARCH_PERFORMED`, `PROFILE_IMPRESSION`, `CONTACT_WHATSAPP_CLICKED`, `BOOST_ACTIVATED` (and reserved `PROFILE_VIEWED`, phone/telegram CTAs). Partial unique index on `event_key` for idempotent lifecycle events. RLS completely denies public client access; server-only ingestion via admin client.
- `public.profile_daily_metrics`: Daily impression, view, and contact click rollups per profile. Unique constraint on `(profile_id, metric_date)`. RLS restricts advertisers to their own profile rows only.
- `public.platform_daily_metrics`: Platform-wide daily search, impression, click, and active advertiser rollups. Unique constraint on `metric_date`. RLS restricted to admins.

## Candidate Tables (Future Phases)
- FASE 10: `public.seo_slug_redirects`, `public.acquisition_campaign_sources`

