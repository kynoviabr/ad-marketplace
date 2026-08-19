# Analytics, Event Tracking & Conversion Measurement
STATUS: FASE 09 — IMPLEMENTATION COMPLETE
VERSION: 1.0
LAST UPDATED: 2026-08-18

## Overview
FASE 09 establishes the privacy-first, first-party event tracking and analytics foundation for AD-Marketplace.
It measures the primary discovery and conversion funnel:
`SEARCH_PERFORMED → PROFILE_IMPRESSION → CONTACT_WHATSAPP_CLICKED`

Analytics is strictly observational and decoupled from billing, ranking, and visitor UX.

## Non-Negotiable Invariants
1. **Never Block UX**: Search rendering, card display, and WhatsApp navigation never wait for or fail upon analytics dispatch.
2. **Privacy by Design**:
   - Zero raw IP persistence or logging.
   - Zero cross-session or third-party cookies.
   - Session identifier (`visitor_session_id`) is a client-generated UUID in `sessionStorage`, destroyed on tab close.
   - Do Not Track (`DNT === '1'`) is strictly respected (skips client-side tracking).
3. **Server-Authoritative Sponsored Attribution**:
   - Browser is forbidden from sending `boost_campaign_id` or pricing fields.
   - Server resolves campaign validity based on active database records. If invalid/expired, gracefully falls back to `ORGANIC`.
4. **Least-Privilege RLS**:
   - Zero direct public/client `SELECT` or `INSERT` on `analytics_events`.
   - Advertisers view only sanitized, aggregate summaries in `profile_daily_metrics`. `visitor_session_id` is never exposed.

## Canonical Event Taxonomy
- `SEARCH_PERFORMED`: Server-side non-blocking recording via Next.js `after()`.
- `PROFILE_IMPRESSION`: Client-side IntersectionObserver (50% visibility threshold, 500ms continuous visibility timer).
- `CONTACT_WHATSAPP_CLICKED`: Client-side fire-and-forget beacon upon CTA click.
- `BOOST_ACTIVATED`: Server-side lifecycle event with idempotent `event_key`.
- `PROFILE_VIEWED`: Reserved in domain/schema; deferred until public permalink pages are implemented.
- `CONTACT_PHONE_CLICKED` / `CONTACT_TELEGRAM_CLICKED`: Reserved in domain/schema.

## Rate Limiting & Abuse Protection
- Abstraction: `RateLimiter` interface with `RATE_LIMITING_MODE = 'LOCAL_BEST_EFFORT'`.
- In-memory sliding window for DEV/MVP (50 events/session/hour). Pluggable for distributed stores in production.
- Payload size capped at 4KB.

## Daily Aggregations
- Stored in `profile_daily_metrics` (per profile) and `platform_daily_metrics` (marketplace totals).
- Admin-triggered manual execution (`POST /api/admin/analytics/aggregate`) for MVP/DEV.
- Strictly deterministic and idempotent (`INSERT ... ON CONFLICT DO UPDATE`).

## Dashboards
- **Advertiser (`/dashboard/analytics`)**: Total Impressions, Organic vs Sponsored, WhatsApp Clicks, CTR over 7/30/90 days.
- **Admin (`/admin/analytics`)**: Surface A event analytics, Platform Searches, Impressions, Clicks, CTR, Top Profiles, Top Locations, and the North Star metric: **Contact Clicks per Active Advertiser**.
