# Database Schema Reference
STATUS: ACTIVE & VALIDATED
VERSION: 0.4
LAST UPDATED: 2026-08-18

## Applied Tables (FASE 01 - 04)

### FASE 01: Authentication & Accounts
- `public.account_users`: Core user accounts (role, status, onboarding state, terms/privacy versioning).

### FASE 02: Identity & KYC Foundation
- `public.identity_verifications`: KYC verification sessions, status tracking, age/identity flags.
- `public.verification_webhook_events`: Idempotent webhook event ledger for Didit/Mock providers.

### FASE 03: Professional Profile Domain
- `public.professional_profiles`: Professional advertiser profiles (1:1 with `account_users`), stage name, slug, structured physical attributes, privacy toggles, contacts.

### FASE 04: Locations & Search
- `public.states`: Geographic state entities (e.g. SP).
- `public.cities`: Geographic cities (e.g. São Paulo).
- `public.locations`: Neighborhoods and service areas (e.g. Moema, Pinheiros, Jardins).
- `public.professional_profile_locations`: Many-to-many link between profiles and service locations, with partial unique index ensuring at most one primary location (`is_primary = true`) per profile.

## Candidate Tables (Future Phases)
- FASE 05: `public.profile_media`, `public.media_assets`
- FASE 06: `public.moderation_reviews`, `public.reports`, `public.audit_logs`
- FASE 07: `public.plans`, `public.subscriptions`, `public.payments`
- FASE 08: `public.promotion_products`, `public.promotion_campaigns`
