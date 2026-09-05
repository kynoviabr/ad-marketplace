# Roadmap
STATUS: R12 CLOSED & DEV VALIDATED — LAUNCH READINESS IN PROGRESS
VERSION: 3.0
LAST UPDATED: 2026-09-05

## MVP / Launch Specification & Implementation Status

- **FASE 0 — Product & Architecture** — CLOSED (Modular monolith, Next.js, Supabase, domain architecture)
- **FASE 1 — Authentication & Account** — CLOSED (Auth, RBAC, session management, terms/privacy acceptance)
- **FASE 2 — Identity & Age Verification** — CLOSED (Didit KYC integration foundation, 18+ verification gates)
- **FASE 3 — Professional Profile** — CLOSED (Profile domain, fields, completeness engine, single active profile invariant)
- **FASE 4 — Locations, Search, Filters & Ranking** — CLOSED (PostgreSQL structured search, cities, locations, pagination, fair rotation)
- **FASE 5 — Media / Photos** — CLOSED (Private storage, signed media delivery, upload flow, media moderation status)
- **FASE 6 — Moderation, Reports & Admin** — CLOSED (Content reports, moderation reviews, atomic moderation RPCs)
- **FASE 7 — Billing / Founders** — CLOSED (Monetization foundation, plan entitlements, subscriptions, webhook processing)
- **FASE 8 — Boosts & Additional Monetization** — CLOSED & VALIDATED AGAINST REAL SUPABASE DEV (v1.1)
- **FASE 9 — Analytics & Business Intelligence** — CLOSED & VALIDATED AGAINST REAL SUPABASE DEV (v1.2)
- **FASE 10 — SEO, Growth & São Paulo GTM** — CLOSED & VALIDATED AGAINST REAL SUPABASE DEV (v1.1)
- **FASE 11 — Security, Privacy, LGPD & Production Hardening** — CLOSED & VALIDATED AGAINST REAL SUPABASE DEV
- **FASE 12 — Closed Beta & Launch Readiness** — IN PROGRESS (Core operational surfaces implemented and validated)
  - **FASE 12.1A–C — Design Contract Freeze** — CLOSED (Editorial Contemporary direction authoritative)
  - **FASE 12.2A — Public Design Foundation & Shell** — CLOSED
  - **FASE 12.2B — Public Marketplace Home** — CLOSED & CHECKPOINTED (Discovery, carousels, responsive layout)
  - **Releases R5–R9 — Public Core Features** — INTEGRATED
    - R5: Search & Explore integration on current main
    - R6: Velvet public navigation & compliance
    - R7: Structured professional offerings, rates & services
    - R8: Verified reviews foundation
    - R9: Advanced video profiles foundation
  - **Release R10 — Monetization Entitlements & Audience Control** — CLOSED
    - Client signup flow, professional audience setting (`PUBLIC` vs `VIP_ONLY`), i18n, VIP entitlements
  - **Release R11 — Professional Hub & Acquisition** — CLOSED
    - R11.1: Professional acquisition landing page (`/anuncie`)
    - R11.2A/B: Public onboarding guide (`/como-comecar`) and onboarding progress summary
    - R11.3A/B: Professional help center with instant search, articles, breadcrumbs
    - R11.4: Contextual help links across onboarding and dashboard
    - R11.5A–D: Google OAuth, WhatsApp/Email OTP foundation, auth brand polish
  - **Release R12 — Admin Operations** — CLOSED IN DEV
    - R12.1: Admin operations foundation and landing surface (`/admin`)
    - R12.2: Profile review queue with bounded pagination and safe detail (`/admin/profiles/review`)
    - R12.3: Photo & video moderation queue with safe private preview (`/admin/media/review`)
    - R12.4A: Media approve and reject mutations with immutable audit trails
    - R12.4B: Profile approve and reject mutations with publication gates and audit trails
    - R12.4C1: Profile status audit ledger and atomic RPC foundation (`public.admin_transition_profile_status`)
    - R12.4C2: Profile suspend and reactivate server actions and admin UI controls
  - **R12 Security Remediation (P1 Hardening)** — CLOSED & DEV VALIDATED
    - **P1-1**: Enforced publication entitlement on profile reactivation (Commit `320824a`, migration `20260905000000`)
    - **P1-2**: Atomic profile approval and owner activation (Commit `9bae5cc`, migration `20260905010000`)
    - **P1-3**: Photo validation, sanitization and Sharp pipeline (Commit `f032ab5`)
    - **P1-4**: Checkout return URLs restricted to server-side origins (Commit `78b5571`)
    - **P1-5**: Atomic billing webhook subscription transitions (Commit `87d71a2`, migration `20260905020000`)
    - **Validation Baseline**: 29/29 migrations in canonical sync on DEV (`mwzlunkkyigxzjpnybxj`); 171/171 targeted regression tests PASS; synthetic transactional DEV runtime validation PASS (`VELVET_DEV_RUNTIME_VALIDATION_PASS`).

## Environment Model

- **Current State (NOW)**: Single authorized Supabase environment (`mwzlunkkyigxzjpnybxj`) operating strictly as **VELVET DEV** (the historical dashboard label "Velvet Production" is misleading). No separate Staging and no separate live Production database currently exist.
- **Future State (LATER)**: Dedicated DEV + PROD separation will occur at the future **Environment & Secrets Readiness** checkpoint before live commercial traffic. Staging is not required unless explicitly commissioned.

## Pre-Launch Hardening Backlog (Deferred to Pre-Launch Gate)

Remaining lower-priority security and operational readiness items (non-blocking for R12 closure):
1. Extension of canonical eligibility checks across legacy utility endpoints
2. Non-R12 audit ledger immutability triggers where not yet present
3. Didit KYC `FAILED` status retry semantics and webhooks reconciliation
4. Rate limiting distributed adapter (Redis/KV) for multi-instance deployments
5. Strict LGPD retention, data minimization, and automated account anonymization workflows
6. Dedicated **Environment & Secrets Readiness** checkpoint (credentials rotation, PROD Supabase, PROD Vercel, production webhook endpoints, backup/PITR verification)

## Commercial Objective & Geography

- **OBJ-001**: Target R$50,000 monthly portal revenue by end of month 6 after the São Paulo Commercial Launch. Operating target, not a forecast or guarantee.
- **GEO-001**: Initial market: São Paulo capital only.
- **GEO-002**: Rio de Janeiro is the planned second market after São Paulo expansion gates are satisfied.
- **Business Model**: Classified advertising and profile visibility; direct contact via WhatsApp/phone/Telegram; non-intermediary marketplace.

## Launch Stages

1. **Internal Alpha** — Synthetic data, sandboxes, administrative and operational testing (COMPLETE).
2. **Closed Beta** — Approximately 20–30 real São Paulo professionals (PENDING).
3. **Soft Launch** — Approximately 50–100 professionals with controlled visitor demand.
4. **Commercial Launch São Paulo** — Commercial opening; starts Month 1 of OBJ-001.

## Post-MVP Roadmap

- **FASE 13 — AI Concierge / WhatsApp Lead Qualification** (Optional paid add-on)
- **FASE 14 — Video Profiles Expansion** (Dedicated storage/transcoding/CDN tier)
- **FASE 15 — Advanced Growth & Marketplace Features** (Multi-city expansion, advanced demand tooling)

## Next Development Phase

**ROADMAP DEFINITION REQUIRED**: Core R12 Admin Operations and P1 security remediations are 100% complete and validated in DEV. The immediate next milestone must be authoritatively chosen among:
1. **Pre-Launch Hardening**: Resolving remaining secondary security and operational backlog items.
2. **Environment & Secrets Readiness**: Setting up dual DEV/PROD environments, credential rotation, and production infrastructure.
3. **Closed Beta Operations**: Preparing onboarding runbooks, kill switches, and acquiring the initial cohort of 20–30 professionals.
