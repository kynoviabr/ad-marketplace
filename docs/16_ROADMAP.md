# Roadmap
STATUS: ACTIVE — PRODUCT-FIRST PRE-GTM ROADMAP ADOPTED (R12 CLOSED IN DEV)
VERSION: 4.0
LAST UPDATED: 2026-09-05

## Strategic Direction Note (2026-09-05)

**Product-first pre-GTM strategy adopted.** Rather than rushing prematurely into dual PROD infrastructure setup, credential rotation, and Closed Beta, Velvet will build its core product differentiation, operational intelligence, and professional value drivers in the single authorized DEV environment (`mwzlunkkyigxzjpnybxj`) first.

The goal is to reach a state of **GTM Readiness for Professional Acquisition** before creating separate DEV + PROD environments and performing final production infrastructure hardening.

### Updated Strategic Lifecycle Order

1. **Product Expansion & Differentiation in DEV (Workstreams PX1–PX8)**
2. **Pre-GTM Technical, Security & Operations Audit**
3. **Required Pre-GTM Hardening Gate**
4. **Environment & Secrets Readiness (Provisioning separate PROD, credential rotation, backup/PITR)**
5. **Begin Professional Acquisition & Onboarding**
6. **Closed Beta (20–30 real São Paulo professionals)**
7. **Soft Launch (50–100 professionals with demand controls)**
8. **Commercial Launch — São Paulo (Starts Month 1 of OBJ-001)**
9. **Rio de Janeiro Expansion (GEO-002)**

---

## Foundation & Implemented Baseline (FASE 0 — FASE 12)

All foundational releases up to R12 are closed, validated against the real Supabase DEV environment, and locked:

- **FASE 0 — Product & Architecture** — CLOSED (Modular monolith, Next.js, Supabase, domain architecture)
- **FASE 1 — Authentication & Account** — CLOSED (Auth, RBAC, session management, terms/privacy acceptance)
- **FASE 2 — Identity & Age Verification** — CLOSED (Didit KYC integration foundation, 18+ verification gates)
- **FASE 3 — Professional Profile** — CLOSED (Profile domain, fields, completeness engine, single active profile invariant)
- **FASE 4 — Locations, Search, Filters & Ranking** — CLOSED (PostgreSQL structured search, cities, locations, pagination, fair rotation)
- **FASE 5 — Media / Photos** — CLOSED (Private storage, signed media delivery, upload flow, media moderation status)
- **FASE 6 — Moderation, Reports & Admin** — CLOSED (Content reports, moderation reviews, atomic moderation RPCs)
- **FASE 7 — Billing / Founders** — CLOSED (Monetization foundation, plan entitlements, subscriptions, webhook processing)
- **FASE 8 — Boosts & Additional Monetization** — CLOSED & VALIDATED IN DEV (v1.1)
- **FASE 9 — Analytics & Business Intelligence** — CLOSED & VALIDATED IN DEV (v1.2 — foundational event capture and daily aggregates)
- **FASE 10 — SEO, Growth & São Paulo GTM** — CLOSED & VALIDATED IN DEV (v1.1)
- **FASE 11 — Security, Privacy, LGPD & Production Hardening** — CLOSED & VALIDATED IN DEV (Canonical view `v_publication_eligible_profiles`, security headers, JSON-LD sanitization, in-memory rate limiting)
- **FASE 12 — Core Operational Surfaces & Admin Operations** — CLOSED IN DEV
  - FASE 12.1A–C: Design Contract Freeze (Editorial Contemporary direction authoritative)
  - FASE 12.2A/B: Public Design Foundation, Marketplace Home, Carousels
  - Releases R5–R9: Public search, compliance, offerings, verified reviews foundation, and **R9 video profile foundation** (upload, moderation, signed playback URLs)
  - Release R10: Monetization entitlements, client signup flow, audience setting (`PUBLIC` vs `VIP_ONLY`), i18n
  - Release R11: Professional acquisition landing (`/anuncie`), onboarding guide (`/como-comecar`), help center, Google OAuth, Email/WhatsApp OTP
  - Release R12 (R12.1–R12.4C2): Admin operations foundation, profile/media review queues, atomic moderation RPCs, immutable ledger `public.professional_profile_status_events`, suspend/reactivate server actions
  - **R12 Security Remediation (P1-1 through P1-5)**: CLOSED & DEV VALIDATED (29/29 migrations in canonical sync, 171/171 targeted regression tests PASS, synthetic transactional DEV runtime validation PASS)

---

## Pre-GTM Product Expansion (Workstreams PX1–PX8)

To deliver compelling professional value and establish deep competitive differentiation prior to onboarding real São Paulo professionals, the platform executes eight focused expansion workstreams in DEV:

### PX1 — Observability & Telemetry Foundation
- **Product Value**: Gives platform operators instant visibility into subsystem health, API errors, stuck webhooks, and performance bottlenecks before introducing AI and complex workflows.
- **User**: Platform Administrator / Operator.
- **Scope**: Request correlation IDs (`x-request-id`), structured application logging abstraction, subsystem health monitors (Supabase DB, Auth, Storage, Didit KYC, Billing Webhooks, Email/OTP), operational status alignment, and Admin System Health dashboard (`/admin/health`).
- **Out of Scope**: Third-party paid APM subscriptions, external telemetry agents.
- **Dependencies**: R12 admin layout foundation.
- **Data Model**: `operational_health_probes` (transient probe cache).
- **Expected Modules**: `modules/observability/`, `app/(admin)/admin/health/`, `lib/logger.ts`.
- **Expected Migrations**: None (in-memory and system metrics initially).
- **Security Considerations**: Never log PII, raw passwords, auth tokens, or payment details.
- **Observability Requirements**: Self-monitoring; health status endpoints; correlation ID propagation.
- **Test Strategy**: Synthetic health checks, simulated subsystem degradation.
- **Exit Criteria**: `/admin/health` renders live status of all 6 platform subsystems; correlation IDs present on all server responses.

### PX2 — Professional Analytics 2.0
- **Product Value**: Transforms raw view counts into actionable business intelligence, helping professionals understand conversion rates, high-performing neighborhoods, and return on subscription.
- **User**: Professional Advertiser.
- **Scope**: Conversion funnel (Impression → Profile View → WhatsApp/Phone Contact), week-over-week and month-over-month comparative benchmarks, neighborhood/location engagement breakdown, peak engagement days/hours, audience performance (`PUBLIC` vs `VIP_ONLY`), redesigned dashboard analytics UI.
- **Out of Scope**: Real-time streaming counters, external tracker pixels, competitor deanonymization.
- **Dependencies**: FASE 09 analytics event foundation, PX1 telemetry.
- **Data Model**: Extensions to `profile_daily_metrics` (conversion ratios, location breakdown JSONB).
- **Expected Modules**: `modules/analytics/`, `app/(dashboard)/dashboard/analytics/`, `components/dashboard/analytics/`.
- **Expected Migrations**: 1 additive migration extending daily aggregation schema and query indexes.
- **Security Considerations**: Zero raw IP persistence; differential privacy; no cross-advertiser data leakage.
- **Observability Requirements**: Metric aggregation latency telemetry, hourly aggregation job health.
- **Test Strategy**: Historical aggregate calculation tests, funnel percentage precision tests.
- **Exit Criteria**: Advertiser dashboard displays interactive funnel, neighborhood breakdown, and weekly trend comparison.

### PX3 — Agenda & Availability Foundation
- **Product Value**: Enables professionals to define recurring working hours, time blocks, and service locations, establishing the foundation for client scheduling and AI Concierge availability lookup.
- **User**: Professional Advertiser.
- **Scope**: Recurring weekly availability rules, time slot intervals, buffer times, minimum notice, maximum advance booking, exception dates (time-off / holidays), multi-location availability scoping.
- **Out of Scope**: Visitor-to-advertiser payment intermediation, booking escrow, automated calendar sync (Google/iCal).
- **Dependencies**: Professional profile domain, locations domain.
- **Data Model**: `professional_availability_rules`, `professional_availability_exceptions`.
- **Expected Modules**: `modules/agenda/`, `modules/agenda/types.ts`, `modules/agenda/dal.ts`.
- **Expected Migrations**: 1 additive migration creating availability rules and exception tables with strict RLS.
- **Security Considerations**: Strict ownership RLS; time slots cannot leak unapproved service locations.
- **Observability Requirements**: Availability calculation performance telemetry (<20ms resolution).
- **Test Strategy**: Recurrent schedule expansion unit tests, exception override precedence tests.
- **Exit Criteria**: Professional can persist and resolve weekly schedules and time-off exceptions via domain DAL.

### PX4 — Agenda UX & Public Availability Surface
- **Product Value**: Displays privacy-safe availability indicators on public profiles (e.g., "Atende hoje até as 22h", "Próximo horário disponível") and provides a fast schedule editor in the advertiser dashboard.
- **User**: Professional Advertiser & Prospective Client.
- **Scope**: Dashboard calendar and availability management interface; public profile availability badge and preview modal; quick toggle for immediate unavailability ("Indisponível hoje").
- **Out of Scope**: Direct on-platform booking checkout (Velvet is a non-intermediary directory).
- **Dependencies**: PX3 Agenda Foundation.
- **Data Model**: Read projections from PX3 tables.
- **Expected Modules**: `app/(dashboard)/dashboard/agenda/`, `components/agenda/`, `components/public/profile-availability-badge.tsx`.
- **Expected Migrations**: None.
- **Security Considerations**: Public availability only reflects publication-eligible profiles; exact schedule details sanitized.
- **Observability Requirements**: UI render latency; public availability cache hit rates.
- **Test Strategy**: Visual regression tests, public availability gating tests (suspended profile shows no agenda).
- **Exit Criteria**: Advertiser can adjust weekly schedule in dashboard; public profile reflects real-time availability.

### PX5 — AI Concierge Foundation (Internal Portal Architecture)
- **Product Value**: Provides professionals with an automated, 24/7 AI assistant to answer prospect questions about rates, offerings, services, and neighborhood locations, saving time and increasing inquiry conversion.
- **User**: Professional Advertiser & Prospective Client.
- **Scope**: AI Concierge domain architecture; professional-configured instructions and knowledge base (rates, bio, boundaries); portal-based interactive chat interface; safety boundaries and guardrails; token usage tracking and quota enforcement.
- **Out of Scope**: External WhatsApp Business API integration (deferred to post-portal stabilization), voice/audio generation.
- **Dependencies**: PX1 Telemetry, Professional profile & offerings domain.
- **Data Model**: `ai_concierge_settings`, `ai_conversations`, `ai_messages`, `ai_usage_metering`.
- **Expected Modules**: `modules/ai-concierge/`, `app/api/ai/`, `components/ai/`.
- **Expected Migrations**: 1 additive migration for AI settings, conversation ledgers, and token metering tables.
- **Security Considerations**: Zero leakage of KYC/legal identities, addresses, or phone numbers in LLM system prompts; injection defense; professional retains kill-switch to disable concierge instantly.
- **Observability Requirements**: Token consumption metering, LLM call duration, error rates, prompt safety violation flags.
- **Test Strategy**: Prompt injection resilience tests, strict knowledge-boundary unit tests, quota cap enforcement tests.
- **Exit Criteria**: Prospective client can chat with AI Concierge on a profile; responses strictly honor professional's configured offerings; token usage tracked.

### PX6 — AI Concierge + Agenda & Inquiries Integration
- **Product Value**: Allows the AI Concierge to check real-time availability from PX3/PX4, inform clients of open slots, gather inquiry details, and generate a pre-filled WhatsApp handoff link.
- **User**: Professional Advertiser & Prospective Client.
- **Scope**: AI tool/function calling for availability lookup (`check_availability(date)`); pre-qualification inquiry summary; seamless handoff to WhatsApp with formatted conversation context.
- **Out of Scope**: Automatic calendar booking confirmation without professional consent.
- **Dependencies**: PX3 Agenda, PX4 Public Agenda, PX5 AI Concierge.
- **Data Model**: `ai_inquiry_handoffs` (records qualified lead handoffs).
- **Expected Modules**: `modules/ai-concierge/tools/`, `modules/ai-concierge/handoff.ts`.
- **Expected Migrations**: None or minor additive table for lead handoffs.
- **Security Considerations**: Visitor contact details never shared without consent; strict prompt guardrails around pricing and availability.
- **Observability Requirements**: Inquiry conversion rate telemetry (Chat Started → Availability Checked → WhatsApp Handoff Clicked).
- **Test Strategy**: End-to-end integration test of AI availability lookup and WhatsApp link generation.
- **Exit Criteria**: AI accurately reports available slots from PX3 schedule and produces validated WhatsApp handoff.

### PX7 — Cybersecurity & Abuse Intelligence
- **Product Value**: Protects platform availability, data integrity, and user trust against hostile traffic, automated scraping, malicious media uploads, and account abuse.
- **User**: Platform Administrator & System Operators.
- **Scope**: Operational integrity monitors (detecting orphaned records, stuck webhooks, gate drifts); audit ledger immutability triggers (Backlog Item C); transactional mutation/audit RPCs (Backlog Item B); suspicious activity detection; emergency platform kill switches; admin security audit log viewer.
- **Out of Scope**: Cloudflare enterprise WAF deployment (deferred to Environment & Secrets Readiness).
- **Dependencies**: PX1 Telemetry, R12 Admin foundation.
- **Data Model**: Triggers on existing audit ledgers, `security_events_log`.
- **Expected Modules**: `modules/security/`, `app/(admin)/admin/security/`, `supabase/migrations/`.
- **Expected Migrations**: 1 additive migration establishing immutable audit triggers and atomic RPCs.
- **Security Considerations**: Anti-tamper audit logs; least-privilege security dashboard access.
- **Observability Requirements**: Real-time security incident counters and reconciliation alert logs.
- **Test Strategy**: Penetration/abuse simulation tests, mutation tampering tests, trigger enforcement tests.
- **Exit Criteria**: All audit tables reject UPDATE/DELETE; reconciliation engine flags data anomalies in <60s.

### PX8 — Product Polish & Pre-GTM Readiness
- **Product Value**: Ensures cohesive, high-end editorial aesthetics, seamless mobile responsiveness, sub-second page performance, and accessible navigation across the complete public and advertiser experience.
- **User**: All Platform Visitors, Advertisers, and Administrators.
- **Scope**: Comprehensive UI/UX audit; mobile touch targets and animation polish; Core Web Vitals optimization (LCP < 2.0s, CLS < 0.05); empty state and error boundary enhancements; pre-GTM documentation freeze.
- **Out of Scope**: New functional feature development.
- **Dependencies**: PX1–PX7 completion.
- **Data Model**: None.
- **Expected Modules**: `components/ui/`, `app/`, `styles/`.
- **Expected Migrations**: None.
- **Security Considerations**: Content Security Policy verification; final dependency vulnerability scan.
- **Observability Requirements**: Real-user performance metric tracking; client-side exception boundaries.
- **Test Strategy**: Full regression test suite (>200 tests), Lighthouse audit (Performance > 90, Accessibility > 95).
- **Exit Criteria**: Zero open P1/P2 UX issues; all automated test suites 100% green; design review signed off.

---

## Technical Hardening Backlog — Strategic Categorization

The technical hardening findings identified during R12 analysis are preserved and categorized across the lifecycle:

| Backlog Item | Finding Description | Strategic Category | Target Phase |
|---|---|---|---|
| **Item D** | Didit KYC `FAILED` webhook retry reconciliation | **Continuous Security Guardrail** | **RESOLVED** (Commit validated with retry suite) |
| **Item F** | OAuth callback & auth redirect trusted origin validation | **Continuous Security Guardrail** | **Fix before PX1** (Host header injection defense) |
| **Item E** | Media delivery publication gate enforcement | **Continuous Security Guardrail** | **Fix before PX1** (Private photo leakage prevention) |
| **Item I** | CLIENT signup error handling & provisioning atomicity | **Continuous Security Guardrail** | **Fix before PX1** (Account consistency) |
| **Item H** | Admin operational classification drift vs canonical view | **Continuous Security Guardrail** | **Fix during PX1** (Observability / Health alignment) |
| **Item A** | Canonical publication eligibility in utility helpers | **Continuous Security Guardrail** | **Fix during PX2 / PX4** (Analytics / Agenda gating) |
| **Item B** | Non-atomic mutation and audit trail pairs | **Continuous Security Guardrail** | **Fix during PX7** (Cybersecurity & Atomic RPCs) |
| **Item C** | Audit tables lacking DB immutability triggers & FK cascade | **Continuous Security Guardrail** | **Fix during PX7** (Cybersecurity & Ledger Immutability) |
| **Item J** | LGPD automated account deletion and PII anonymization | **Must Fix Before Real Users** | **Pre-GTM Hardening Gate** (Prior to Beta Onboarding) |
| **Item G** | Distributed Redis/KV rate limiting adapter | **Can Defer Until Scale** | **Environment Readiness / Production Scale** |

---

## Strategic Clarity: Video and AI Capabilities

### Clarification on Video Profiles
- **Current State (Implemented in DEV)**: The R9 Video Foundation is **already integrated** in the codebase. This includes `public.profile_videos`, video upload validation, administrative review queues, moderation events, and signed playback URL generation (`/modules/videos/`).
- **Future State (Post-MVP)**: What remains deferred as post-MVP is **Advanced Video Infrastructure** (dedicated cloud transcoding pipelines, adaptive HLS/DASH streaming, and high-bandwidth CDN tiers).

### Clarification on AI Concierge
- **Strategic Shift**: AI Concierge is no longer a distant post-MVP luxury (formerly FASE 13). It is repositioned as a **Pre-GTM Product Differentiator** (Workstreams PX5 and PX6).
- **Business Boundaries**:
  1. Velvet remains strictly an advertising directory / non-intermediary portal.
  2. AI Concierge is an **optional professional productivity tool** configured, enabled, or disabled entirely by the professional.
  3. The portal-based chat architecture is implemented first, decoupling core AI value from third-party WhatsApp Business API approval timelines.

---

## Pre-GTM Milestones & Gate Definitions

### 1. GTM Ready for Professional Acquisition Gate
The entry milestone indicating the product is sufficiently mature, differentiated, and robust in DEV to begin 1:1 acquisition of the initial cohort of 20–30 São Paulo professionals:
- **Product**: PX1 through PX8 complete and accepted.
- **Security**: Items D, F, E, I, H, A, B, C fixed; Item J (anonymization RPC) implemented and validated in DEV.
- **Observability**: Subsystem health dashboard operational; correlation IDs active; zero unhandled webhook drops.
- **Analytics**: Funnel metrics and neighborhood performance visible in dashboard.
- **KYC**: Didit automated verification and retry reconciliation proven reliable.
- **Admin**: Queues operational for profiles, media, and videos with immutable audit logs.
- **Agenda**: Weekly schedule and exception management verified.
- **AI**: Concierge responds accurately to configured offerings with enforced token quotas.
- **Quality**: >200 automated tests passing, 0 TypeScript errors, 0 lint warnings.

### 2. Environment & Secrets Readiness Entry Gate
Executed only **after** the GTM Ready Gate is achieved:
- Provisioning of dedicated Supabase PROD project (`mwzlunkkyigxzjpnybxj` remains strictly VELVET DEV).
- Provisioning of production Vercel deployment linked to PROD Supabase.
- Full credential rotation (Supabase service role keys, Didit API secrets, billing secrets, pepper).
- Payment provider live underwriting sign-off and production webhook configuration (DEC-022, DEC-024).
- Point-in-Time Recovery (PITR) and automated backup verification.
- Production DNS, domains, SSL, and edge security configuration.

---

## Commercial Objective & Geography

- **OBJ-001**: Target R$50,000 monthly portal revenue by end of month 6 after the São Paulo Commercial Launch. Operating target, not a forecast or guarantee.
- **GEO-001**: Initial market: São Paulo capital only.
- **GEO-002**: Rio de Janeiro is the planned second market after São Paulo expansion gates are satisfied.
- **Business Model**: Classified advertising and profile visibility; direct contact via WhatsApp/phone/Telegram; non-intermediary marketplace.

## Launch Stages

1. **Internal Alpha** — Synthetic data, sandboxes, administrative and operational testing (COMPLETE).
2. **Pre-GTM Product Expansion (PX1–PX8)** — In progress in DEV.
3. **Pre-GTM Hardening & Audit** — Validation of LGPD anonymization, penetration checks, operational runbooks.
4. **Environment & Secrets Readiness** — Dual DEV/PROD environment creation and credential rotation.
5. **Closed Beta** — Approximately 20–30 real São Paulo professionals.
6. **Soft Launch** — Approximately 50–100 professionals with controlled visitor demand.
7. **Commercial Launch São Paulo** — Commercial opening; starts Month 1 of OBJ-001.

---

## Immediate Next Development Step

- **Completed Pre-PX1 Guardrail**: **Didit FAILED Webhook Retry Reconciliation (Backlog Item D) — RESOLVED**.
- **Remaining Pre-PX1 Guardrails**: **Backlog Items F (OAuth origin), E (Media delivery gating), I (Client provisioning)**.
- **Next Product Workstream**: **PX1 — Observability & Telemetry Foundation**.
