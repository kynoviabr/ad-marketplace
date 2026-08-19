# Security & Privacy
STATUS: APPROVED BASELINE
VERSION: 1.0
LAST UPDATED: 2026-08-15

Data minimization; public/private identity separation; server-side authorization; RLS where appropriate; secrets only in environment variables; no service-role key in browser; audit sensitive admin actions; no adult media before verified identity/age; no residential address publicly; raw KYC artifacts preferably remain with provider; hidden attributes cannot leak through filters; sanitize user-generated text; rate-limit critical endpoints; backups/monitoring before production.

## Analytics Privacy & Data Minimization (FASE 09)
- Raw IP addresses are NEVER stored, logged, or exposed in DTOs.
- Zero cross-session cookies: visitor identifiers are pseudonymous UUIDs in sessionStorage, destroyed on browser close.
- Do Not Track (DNT) is strictly respected for client-side event dispatching.
- Public client access to raw analytics events is blocked by RLS; advertisers access only aggregated daily metrics for their own profile.
- Server-authoritative attribution: campaign IDs are resolved server-side only and never accepted from browser payloads.

Dedicated LGPD/legal review required before production.

## FASE 11 — Security Remediation Baseline

### Canonical Publication Eligibility Architecture

**Single source of truth**: `public.v_publication_eligible_profiles` (SQL VIEW, migration 20260819000010).

All public profile visibility decisions MUST be derived from this view. The view encodes all 8 publication gates:

| Gate | Description | Where enforced |
|------|-------------|----------------|
| 1 | account.status = 'ACTIVE' | VIEW JOIN |
| 2 | KYC: status=VERIFIED + identity_verified + age_verified | VIEW JOIN |
| 3 | profile.status IN ('READY_FOR_REVIEW', 'ACTIVE') | VIEW WHERE |
| 4 | content_moderation_status = 'APPROVED' | VIEW WHERE |
| 5 | ≥1 active service location | VIEW JOIN |
| 6 | ≥1 approved non-deleted photo | VIEW EXISTS |
| 7 | NOT PAUSED/SUSPENDED (covered by Gate 3) | VIEW WHERE |
| 8 | Valid billing entitlement (time-aware: sub OR override) | VIEW EXISTS |

**Time-aware billing (Gate 8)**:
- ACTIVE subscription: eligible IF `current_period_end IS NULL OR > now()`
- PAST_DUE: eligible (provider retrying)
- GRACE_PERIOD: eligible IF `grace_period_end IS NOT NULL AND > now()`
- INCOMPLETE / EXPIRED: NOT eligible
- Admin override: eligible IF `revoked_at IS NULL AND (expires_at IS NULL OR > now())`

**Consumers**: `executeSearch()`, `getCitySeoData()`, `getLocationSeoData()`, `getSitemapData()`, future `/perfil/[slug]`.

**Access**: service_role only. `anon` and `authenticated` CANNOT query the view directly.

### HTTP Security Headers

All routes receive the following headers (configured in `next.config.ts`):
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`
- `Content-Security-Policy`: `default-src 'self'; script-src 'self' 'unsafe-inline'` (see note)
- `Strict-Transport-Security` (production only): `max-age=31536000; includeSubDomains`

> **Note on CSP**: `unsafe-inline` for `script-src` is required for Next.js App Router hydration inline scripts. This is a known framework limitation until per-request nonce-based CSP is implemented.

### JSON-LD Security

`JsonLd` component uses `safeJsonLdString()` which escapes `<`, `>`, `&`, U+2028, U+2029 to their `\uXXXX` Unicode equivalents before `dangerouslySetInnerHTML`. This prevents `</script>` injection attacks.

### Rate Limiting Architecture

| Layer | Implementation | Scope | Mode |
|-------|---------------|-------|------|
| Analytics session | `defaultRateLimiter` (InMemoryRateLimiter) | 50 events/session/hour | LOCAL_BEST_EFFORT |
| Analytics IP | `ipSourceRateLimiter` (InMemoryRateLimiter) | 300 events/IP/hour | LOCAL_BEST_EFFORT |
| Auth login | `isAuthRateLimited()` | 10/15min per IP-derived key | LOCAL_BEST_EFFORT |
| Auth signup | `isAuthRateLimited()` | 5/hour per IP-derived key | LOCAL_BEST_EFFORT |
| Auth reset | Silent (no lockout) | 5/15min — silently dropped | LOCAL_BEST_EFFORT |

**Pre-production blocker**: `DISTRIBUTED_RATE_LIMITING_READY = false`. In-memory rate limiting is NOT globally consistent across multiple server instances. For multi-instance production: replace with a Redis/KV distributed adapter.

### Required Environment Variables (Server-Side)

| Variable | Purpose | Required |
|----------|---------|----------|
| `ABUSE_PEPPER` | HMAC secret for reporter IP pseudonymization | Yes — fails at runtime if missing |
| `ANALYTICS_RATE_LIMIT_SECRET` | HMAC secret for IP-derived analytics rate limiting | Yes (warning in prod if missing, skipped in dev) |
| `BILLING_WEBHOOK_SECRET` | Payment provider webhook signing secret | When real provider integrated |

All secrets must be generated with `openssl rand -hex 32` and stored only in server-side env vars (never `NEXT_PUBLIC_` prefix).

### RLS Posture

| Table Group | anon access | authenticated access | service_role |
|------------|------------|---------------------|-------------|
| `account_users` | None | SELECT own only | Full |
| `identity_verifications` | None (REVOKE ALL) | None (REVOKE ALL) | Full |
| `professional_profiles` | None (REVOKE ALL) | None (REVOKE ALL) | Full |
| `profile_media` | None | SELECT own only | Full |
| `media_moderation_reviews` | Deny-all RLS | Deny-all RLS | Full |
| `profile_moderation_reviews` | Deny-all RLS | Deny-all RLS | Full |
| `content_reports` | Deny SELECT RLS | Deny SELECT RLS | Full |
| `subscriptions`, `billing_overrides`, `billing_webhook_events` | None (REVOKE ALL) | None (REVOKE ALL) | Full |
| `analytics_events` | Deny-all RLS | Deny-all RLS | Full |
| `analytics_daily_metrics` | None | SELECT own only | Full |
| `profile_boosts` | None | SELECT own only | Full |
| `v_publication_eligible_profiles` | None (REVOKE ALL) | None (REVOKE ALL) | SELECT |

### Location Integrity

`save_profile_service_areas()` RPC now enforces:
1. All locations exist and are active
2. Primary location in submitted set
3. **All locations belong to the same city** (F11-SEC-005 fix)
4. Atomic DELETE + INSERT transaction

### Pre-Production Blockers

| Blocker ID | Description | Required Before |
|-----------|-------------|----------------|
| PPB-001 | Distributed rate limiting (Redis/KV adapter) | Production multi-instance deployment |
| PPB-002 | Real payment provider integration (BILLING_WEBHOOK_SECRET) | Production payments |
| PPB-003 | LGPD/legal review for analytics data retention (180-day target) | Staging/legal approval |
| PPB-004 | CI/CD integration test secrets configuration | First staging deployment |
| PPB-005 | Supabase Storage RLS bucket verification (profile-media bucket) | Production media delivery |
