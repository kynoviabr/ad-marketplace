# Roadmap
STATUS: ACTIVE — PRODUCT-FIRST PRE-GTM ROADMAP ADOPTED (R12 CLOSED IN DEV)
VERSION: 4.0
LAST UPDATED: 2026-09-07

## Strategic Direction Note (2026-09-05)

**Product-first pre-GTM strategy adopted.** Rather than rushing prematurely into dual PROD infrastructure setup, credential rotation, and Closed Beta, Velvet will build its core product differentiation, operational intelligence, and professional value drivers in the single authorized DEV environment (`mwzlunkkyigxzjpnybxj`) first.

The goal is to reach a state of **GTM Readiness for Professional Acquisition** before creating separate DEV + PROD environments and performing final production infrastructure hardening.
Currently, there is a single operational DEV environment: Supabase DEV (`mwzlunkkyigxzjpnybxj`) and the existing Vercel deployment labeled as "Production" is operationally hosted DEV. Real DEV/PROD separation is deferred to Environment & Secrets Readiness.

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
- **Sub-phases**:
  - **PX1A — Correlation IDs + Structured Logging Foundation**: **RESOLVED** (Canonical `x-request-id` header, safe regex validation, Next.js `proxy.ts` propagation, structured JSON logger, recursive sensitive data redaction, safe error serializer, targeted adoption across Didit KYC, OAuth, Billing, Media, and Health boundaries; 55/55 dedicated tests PASS).
  - **PX1B — Health Probes & Operational Integrity Foundation**: **RESOLVED** (Typed health probe contracts, subsystem status and criticality models, safe isolated runner with timeouts, 7 subsystem probes [Database, Auth, Storage, Didit KYC, Billing, Email/OTP, App Config], system health snapshot aggregator with structured observability logging, minimal anonymous public `/api/health` hardening, and Backlog Item H canonical operational status alignment; 161/161 test suites and 1,616 tests PASS).
  - **PX1C — Admin System Health Dashboard (`/admin/health`)**: **RESOLVED** (Secure operator dashboard at `/admin/health`, strict `requireAdmin()` server guard, overall status banner & metric counters, dynamic subsystem probe cards with friendly naming, criticality & probe mode guidance, safe metadata allowlist, manual re-check Server Action with correlation IDs, responsive accessible UI, navigation integration, and zero public leakage; 14/14 dedicated tests PASS).
  - **PX1 Foundation Status**: **COMPLETE (100% RESOLVED)**.
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
- **Sub-phases**:
  - **PX2A — Measurement Integrity + Funnel & Aggregation Foundation**: **RESOLVED** (Additive migration `20260905040000_profile_daily_metrics_extensions.sql` applied to DEV; 31/31 migrations in canonical sync; canonical funnel semantics Impression → Profile View → Contact Intent; session-scoped client and server event_key deduplication; publication eligibility gate enforcement via `v_publication_eligible_profiles`; daily, hourly, location, and peak-time aggregation; zero-baseline safe math in `modules/analytics/funnel.ts`; typed DAL query `getProfessionalAnalyticsOverview` with strict ownership isolation; 63/63 analytics tests PASS; synthetic DEV validation clean with zero residual records).
  - **PX2C — Insights, Comparisons & Privacy-Safe Benchmarks**: **RESOLVED** (Pure domain deterministic performance & funnel insight engine in `modules/analytics/insights.ts`; privacy-safe cohort benchmark engine in `modules/analytics/benchmark.ts` using canonical publication eligibility `v_publication_eligible_profiles`, mathematical median, strict privacy threshold $\ge 5$ distinct active profiles and $\ge 25$ aggregate impressions, target profile exclusion, zero competitor deanonymization or rankings; client UI surfaces `<AnalyticsInsights />` and `<AnalyticsBenchmark />` integrated in `/dashboard/analytics`; bot filtering methodology copy corrected; 21/21 dedicated PX2C tests PASS, 168/168 project test suites PASS).
  - **PX2 Foundation Status**: **COMPLETE (100% RESOLVED)**.
- **Out of Scope**: Real-time streaming counters, external tracker pixels, competitor deanonymization.
- **Dependencies**: FASE 09 analytics event foundation, PX1 telemetry.
- **Data Model**: `profile_daily_metrics` (extended with `location_breakdown JSONB` and `hourly_breakdown JSONB`).
- **Expected Modules**: `modules/analytics/`, `app/(dashboard)/dashboard/analytics/`, `components/dashboard/analytics/`.
- **Expected Migrations**: `20260905040000_profile_daily_metrics_extensions.sql` (applied in DEV).
- **Security Considerations**: Zero raw IP persistence; differential privacy; no cross-advertiser data leakage; canonical publication gate enforcement.
- **Observability Requirements**: Metric aggregation latency telemetry, hourly aggregation job health.
- **Test Strategy**: Historical aggregate calculation tests, funnel percentage precision tests, zero-baseline comparison math tests, professional ownership authorization tests.
- **Exit Criteria**: Advertiser dashboard displays interactive funnel, neighborhood breakdown, and weekly trend comparison.

### PX3 — Agenda & Availability Foundation
- **Status**: **COMPLETE (100% RESOLVED IN DEV)**.
- **Product Value**: Enables professionals to define recurring working hours, time blocks, and service locations, establishing the foundation for client scheduling and AI Concierge availability lookup.
- **User**: Professional Advertiser.
- **Scope**: Recurring weekly availability rules, time slot intervals, buffer times, minimum notice, maximum advance booking, exception dates (time-off / holidays), multi-location availability scoping.
- **Delivered**:
  - Additive migration `20260906010000_professional_availability.sql` applied to DEV Supabase (`mwzlunkkyigxzjpnybxj`); 32/32 migrations aligned in canonical sync.
  - Tables: `professional_availability_settings`, `professional_weekly_availability`, `professional_availability_exceptions` with full constraints and RLS.
  - Transactional RPC: `save_professional_weekly_availability` with interval overlap validation and atomic schedule replacement.
  - Pure Availability Engine: `modules/agenda/engine.ts` implementing deterministic slot generation, timezone offset derivation (`America/Sao_Paulo`), bounded iteration ($\le 90$ days), notice/advance boundaries, and strict override precedence (`CLOSED_DAY` > `CUSTOM_HOURS` > Weekly Rules - `BLOCKED_INTERVAL`).
  - Server DAL & Actions: `modules/agenda/dal.ts` and `modules/agenda/actions.ts` with strict advertiser ownership validation (`account_user_id` / `ADMIN`), location validation, and fail-closed public availability query gated by canonical view `v_publication_eligible_profiles`.
  - Tests & Verification: Dedicated test suite in `tests/agenda/availability-foundation.test.ts` (21/21 tests PASS) and live synthetic PL/pgSQL validation in DEV.
- **Out of Scope**: Visitor-to-advertiser payment intermediation, booking escrow, automated calendar sync (Google/iCal), UI surfaces (deferred to PX4).
- **Dependencies**: Professional profile domain, locations domain.
- **Data Model**: `professional_availability_settings`, `professional_weekly_availability`, `professional_availability_exceptions`.
- **Expected Modules**: `modules/agenda/` (`types.ts`, `engine.ts`, `dal.ts`, `actions.ts`, `index.ts`).
- **Applied Migrations**: `20260906010000_professional_availability.sql`.
- **Security Considerations**: Strict ownership RLS; time slots cannot leak unapproved service locations; fail-closed public lookup against `v_publication_eligible_profiles`.
- **Observability Requirements**: Availability calculation performance telemetry (<20ms resolution).
- **Test Strategy**: Pure slot generation tests, exception override precedence tests, overlap rejection tests, fail-closed publication checks, owner authorization tests.
- **Exit Criteria**: Professional can persist and resolve weekly schedules and time-off exceptions via domain DAL and RPC. (MET)

### PX4 — Agenda UX & Public Availability Surface
- **Status**: **COMPLETE (100% RESOLVED IN DEV)**.
- **Product Value**: Displays privacy-safe availability indicators on public profiles ("Disponível hoje", "Disponibilidade esta semana") and provides an ergonomic, mobile-first schedule and exceptions manager in the advertiser dashboard.
- **User**: Professional Advertiser & Prospective Client.
- **Scope**: Advertiser availability dashboard (`/dashboard/availability`) with weekly schedule matrix, multi-location assignment, touch-optimized time selectors, atomic save RPC orchestration, date exception modal (`CLOSED_DAY`, `BLOCKED_INTERVAL`, `CUSTOM_HOURS`), quick "Indisponível hoje" toggle, owner slot preview, advanced interval/buffer/notice settings, and fail-closed privacy-safe public profile badges (`PublicAvailabilityBadge`).
- **Delivered**:
  - Dashboard route: `app/(dashboard)/dashboard/availability/page.tsx` loading comprehensive `ProfessionalAvailabilityDashboardDTO`.
  - UI Components: `components/agenda/availability-manager.tsx`, `components/agenda/add-exception-modal.tsx`, `components/agenda/public-availability-badge.tsx`, and compact status summary card on `/dashboard`.
  - Security Invariants: Server-side location ownership verification (`assertLocationOwnership`) on all schedule & exception mutations; strict account ownership verification; zero leakage of internal UUIDs or calendar intervals to public viewers.
  - Public Integration: Integrated into `app/(public)/perfil/[slug]/page.tsx` via canonical publication view `v_publication_eligible_profiles` and fail-closed signal generation (`AVAILABLE_TODAY`, `AVAILABLE_THIS_WEEK`, `NO_SIGNAL`).
  - i18n: Complete bilingual catalog (`lib/i18n/messages/agenda.ts`) for PT-BR and EN.
  - Tests & Verification: 7 dedicated test suites in `tests/agenda/` (82/82 tests PASS), 177/177 project test suites PASS (1,774 tests), Turbopack build PASS. Zero residual test records in DEV.
  - Hosted DEV Deployment: Deployed to existing Vercel Production target (`https://velvetgirls.club`, deployment `dpl_8bKAfN5ZMZuciN1JpG5U22prH9ms`). Smoke tests PASS (12/12 routes).
- **Out of Scope**: Direct on-platform booking checkout, payment intermediation, escrow, or contracts (Velvet is a classified/discovery marketplace).
- **Dependencies**: PX3 Agenda Foundation.
- **Data Model**: Read/write projections over PX3 tables (`professional_availability_settings`, `professional_weekly_availability`, `professional_availability_exceptions`).
- **Modules**: `app/(dashboard)/dashboard/availability/`, `components/agenda/`, `modules/agenda/`, `lib/i18n/messages/agenda.ts`.
- **Applied Migrations**: None (reuses PX3 schema 32/32).
- **Security Considerations**: Public availability only reflects publication-eligible profiles; exact schedule details sanitized into opaque enum signals; cross-profile and foreign-location mutations strictly prohibited.
- **Observability Requirements**: Structured logging on mutation failures with subsystem `AGENDA`.
- **Test Strategy**: Authorization tests, location boundary validation, weekly schedule matrix tests, date exception precedence tests, public signal gating tests, and live DEV transactional integration tests.
- **Exit Criteria**: Advertiser can manage weekly schedule and exceptions in dashboard; public profile reflects real-time availability. (MET)

### PX4.5 — PWA & Installable Experience
- **Status**: **COMPLETE (100% RESOLVED IN DEV)**.
- **Product Value**: Transforms Velvet into a fast, standalone installable PWA for iOS and Android while preserving privacy, security, and the non-intermediary classifieds boundary.
- **User**: Professional Advertiser & Prospective Client.
- **Scope**:
  - Web App Manifest: Next.js App Router canonical manifest (`app/manifest.ts` served as `/manifest.webmanifest`) with standalone display mode, `#3B203F` brand theme color, `#F5F1E8` background, and full icon suite.
  - Icon Suite: Crisp, platform-compliant 192x192, 512x512, maskable (192/512), and apple-touch-icon (180x180) generated with `sharp`.
  - Service Worker (`public/sw.js`): Security-first caching architecture:
    - Strictly blocks caching for private/authenticated routes (`/dashboard*`, `/cliente*`, `/admin*`, `/onboarding*`, `/auth*`, `/api*`, `/login`, `/signup*`). Responses are NEVER stored in Cache Storage.
    - Strictly blocks caching for signed media URLs (`token=`, `/sign/profile-media`, `/sign/profile-videos`).
    - Bypasses external communication schemes (`wa.me`, `whatsapp:`, `tel:`, `mailto:`).
    - Public HTML navigation uses Network-First with fallback to pre-cached `/offline` to ensure real-time availability accuracy.
    - Immutable static assets (`/_next/static/*`, `/icons/*`, fonts) use Cache-First with background fill.
    - Cache versioning with automatic cleanup of obsolete caches on activation.
  - Offline Experience: Editorial offline fallback page at `/offline` with reconnection action and no private data exposure.
  - Standalone UX: iOS safe-area support (`env(safe-area-inset-*)`), viewport-fit=cover, status bar customization (`black-translucent`), and lifecycle component (`PwaLifecycle`).
  - Tests & Verification: Dedicated PWA test suite (`tests/pwa/pwa-manifest-and-cache-policy.test.ts`, 10/10 PASS); 178/178 test suites PASS (1,784 tests); Turbopack build PASS.
- **Out of Scope**: Web push notifications, background sync of private mutations, native-app rewrites.
- **Data Model**: None (0 database migrations, 32/32 aligned).
- **Modules**: `app/manifest.ts`, `public/sw.js`, `public/icons/`, `app/(public)/offline/`, `components/pwa/pwa-lifecycle.tsx`.

### PX4.6 — Install App UX
- **Status**: **COMPLETE (100% RESOLVED IN DEV)**.
- **Product Value**: Delivers a polished, device-aware, non-intrusive Velvet installation experience for Android/Chromium, iOS Safari, and Desktop PWA users.
- **User**: Professional Advertiser & Prospective Client.
- **Scope**:
  - Discoverable Entry Points:
    - Restrained public footer card (`InstallVelvetCard`) with Velvet editorial styling: heading "VELVET NO SEU CELULAR" (EN: "VELVET ON YOUR DEVICE"), description "Acesse mais rápido, em tela cheia e direto da sua tela inicial.", primary CTA "Instalar Velvet", and session dismiss action.
    - Mobile navigation drawer action (`InstallVelvetButton`) with clean icon, accessible label, and >=44px touch target.
  - Platform-Aware Installation:
    - Android / Chromium: Captures `beforeinstallprompt` event, triggers native browser prompt upon user click, tracks `accepted` and `dismissed` outcomes without persistent nagging.
    - iOS / iPadOS: Safely detects iOS devices and iPadOS desktop UA, presents accessible modal dialog (`IosInstallModal`) with 3 concise steps (Share -> Add to Home Screen -> Add) and visual Safari icons.
    - Standalone & Installed Detection: Automatically suppresses all install CTAs when running in standalone mode (`display-mode: standalone` / `navigator.standalone`) or upon receiving `appinstalled` event.
    - Unsupported Environments: Gracefully returns `null` with zero broken CTAs on unsupported browsers.
  - Non-Intermediary & Security Invariants:
    - Zero store badges (no Apple App Store or Google Play badges).
    - No "Download App" naming (explicitly "Instalar Velvet" PWA installation).
    - Zero security authority: install state is UX only and never used for authentication or authorization decisions.
  - Telemetry:
    - Canonical DB analytics marked DEFERRED (fixed database enum `analytics_event_type` preserved under MIGRATION = NONE policy).
    - Privacy-safe, deduplicated client telemetry events (`PWA_INSTALL_CTA_SHOWN`, `PWA_INSTALL_CTA_CLICKED`, `PWA_INSTALL_PROMPT_ACCEPTED`, `PWA_INSTALL_PROMPT_DISMISSED`, `PWA_INSTALLED`, `PWA_IOS_INSTRUCTIONS_OPENED`, `PWA_STANDALONE_SESSION`) with zero PII and zero device fingerprinting.
  - Verification & Test Coverage:
    - 26 PWA tests passing (`tests/pwa/pwa-manifest-and-cache-policy.test.ts` & `tests/pwa/pwa-install-ux.test.ts`).
    - Full test suite: 179 test files, 1,800 tests PASS (0 failures).
    - Typecheck: 0 errors (`npm run typecheck`).
    - Lint: 0 errors, 0 warnings (`npm run lint`).
    - Production build: Turbopack PASS (`npm run build`).
- **Data Model**: None (0 migrations created, 32/32 aligned).
- **Modules**: `components/pwa/`, `components/public/public-footer.tsx`, `components/public/mobile-navigation.tsx`, `lib/i18n/messages/public.ts`, `app/velvet-public.css`.

### PX5 — AI Concierge Foundation (Internal Portal Architecture)
- **Status**: **COMPLETE (100% RESOLVED IN DEV)**.
- **Product Value**: Provides professionals with an automated, 24/7 AI assistant to answer prospect questions about rates, offerings, services, and neighborhood locations, saving time and increasing inquiry conversion.
- **User**: Professional Advertiser & Prospective Client.
- **Scope**: AI Concierge domain architecture; professional-configured instructions and knowledge base (rates, bio, boundaries); portal-based interactive chat interface; safety boundaries and guardrails; token usage tracking and quota enforcement.
- **Delivered**:
  - Additive Migration `20260906020000_ai_concierge.sql` applied to DEV Supabase (`mwzlunkkyigxzjpnybxj`); 33/33 migrations aligned in canonical sync.
  - Database Schema: `professional_concierge_settings`, `professional_concierge_faqs`, `concierge_conversations`, `concierge_messages` with strict `service_role` authorization, RLS, and zero public exposure.
  - Core Concierge Module (`modules/concierge/`):
    - `types.ts`: Comprehensive domain contracts (tone, channel, status, role, qualification schemas, tools).
    - `constants.ts`: Operational bounds (1000 char message cap, 10-message context window, max 3 tool calls/turn, max 10 FAQs/profile, refusal replies, tone instructions).
    - `tools.ts`: Server-authoritative tool registry with execution limits (`get_public_profile_summary`, `get_public_service_areas`, `request_human_handoff`, and PX6 `get_available_slots` stub).
    - `prompt.ts`: Pre-flight safety filter (18+ minor protection, prompt injection defense, system prompt confidentiality, illegal activity refusal) and structured prompt builder with public facts & FAQ context.
    - `provider.ts`: Server-only AI provider abstraction with native fetch to OpenAI completions when `OPENAI_API_KEY` is present, and deterministic rule-based mock provider fallback for dev/test.
    - `dal.ts`: Data access layer with fail-closed profile ownership assertions and strict minimization (excludes KYC, documents, billing, real names, and private addresses).
    - `runtime.ts`: Multi-turn conversational runtime with session rate limiting, status transitions, qualification updates, and structured observability logging.
    - `actions.ts`: Guarded Next.js Server Actions with strict ownership validation (`assertProfileOwnership`).
  - Professional Dashboard (`/dashboard/concierge`):
    - Server page `app/(dashboard)/dashboard/concierge/page.tsx` guarded by advertiser auth and onboarding completion.
    - `ConciergeSettingsForm`: Master toggle, assistant display name, welcome message, tone selector, qualification toggle, and handoff toggle.
    - `ConciergeFaqManager`: Card-based list and creator for up to 10 custom Q&As with edit and delete capabilities.
    - `ConciergeTestChat`: Interactive simulator marked prominently with "MODO DE TESTE" / "TEST MODE", disclaimer, message history, touch-friendly composer (>=44px), detected intent pills, and conversation reset.
    - Header Navigation: Added "Concierge IA" / "AI Concierge" to `ProfessionalDashboardHeader`.
  - Internationalization: Complete bilingual catalog in `lib/i18n/messages/concierge.ts` registered in `lib/i18n/catalog.ts`.
  - Styling: Editorial Velvet styles for layout, forms, FAQ cards, and test simulator in `app/globals.css`.
  - Verification & Test Coverage:
    - 25 dedicated PX5 tests in `tests/concierge/` (prompt safety, server tools, mock provider, DAL and live DEV Supabase integration).
    - Full project suite: 182 test files, 1,825 tests PASS.
    - Quality gates: `npm run typecheck`, `npm run lint`, `npm run build` all pass with zero errors.
- **Out of Scope**: External WhatsApp Business API integration (deferred to post-portal stabilization), live booking execution (PX6).
- **Data Model**: `professional_concierge_settings`, `professional_concierge_faqs`, `concierge_conversations`, `concierge_messages`.
- **Modules**: `modules/concierge/`, `app/(dashboard)/dashboard/concierge/`, `components/concierge/`, `lib/i18n/messages/concierge.ts`.
- **Applied Migrations**: `20260906020000_ai_concierge.sql` (33/33 aligned).
- **Security Considerations**: Zero leakage of KYC, legal names, or billing info in prompts; pre-flight safety filter rejects underage inquiries; non-intermediary classified disclaimers enforced.
- **Product Next**: PX5.1 — AI Concierge Integrity Audit & Security Gates (COMPLETE) → PX4.7 — Velvet App Experience.

### PX5.1 — AI Concierge Integrity Audit & Security Gates
- **Status**: **COMPLETE (100% RESOLVED IN DEV)**.
- **Product Value**: Proves and guarantees that the AI Concierge foundation fails closed across 14 security, privacy, and architecture boundaries before participating in public visitor channels or the installable app experience.
- **Scope & Gates Verified**:
  1. **Mock Provider Channel Isolation (Section 4)**: The deterministic mock AI provider is strictly prohibited from executing on `WEB_PUBLIC` or `WHATSAPP_OFFICIAL` channels. When `OPENAI_API_KEY` is unconfigured, public visitor requests fail closed immediately with a safe, polite unavailable reply (`PROVIDER_FALLBACK_REPLY`), preventing synthetic AI hallucinations from reaching prospective clients. Mock responses are permitted ONLY for `INTERNAL_TEST` or unit test harnesses.
  2. **Prompt Confidentiality & System Prompt Leakage Defense (Section 6 & 8)**: System prompts and internal developer directives are strictly prevented from entering the persistent ledger (`concierge_messages`). The DAL explicitly rejects messages with role `SYSTEM` (`saveConciergeMessage`). Output filtering (`filterAssistantOutput`) strips accidental leaks of internal instructions.
  3. **Conversation Session Authority & Hijacking Defense (Sections 9 & 10)**: Raw conversation UUIDs are unforgeable and unauthorized without presenting a matching visitor session token/entropy and profile binding (`assertConversationAuthority`). Random or guessed UUIDs return 404/denied.
  4. **Profile Immutability**: Conversations are permanently bound to their origin profile; cross-profile message injection is structurally rejected.
  5. **Publication Gate Enforcement**: Public concierge chat checks canonical view `v_publication_eligible_profiles` AND `settings.enabled` (`assertPublicConciergeEligibility`). Unpublished, suspended, unverified, or expired profiles cannot serve concierge chat to public visitors.
  6. **Layered Safety Filters (Section 15)**: Multi-layer safety engine (`evaluatePreFlightSafety`) blocks minor inquiries (18+ protection) in PT-BR and EN, including written numbers (`dezessete`, `sixteen`) and third-party references, without false positives on legitimate dates, times, or career tenure (`atendo há 17 anos`, `dia 17`, `às 17:00`). Prompt injection defenses refuse jailbreaks, prompt extractions, and role deception attacks.
  7. **Server Tool Registry & Non-Intermediary Boundary (Sections 16, 17, 18)**: Strict tool execution allowlist with `MAX_TOOL_CALLS_PER_TURN = 3`. Unknown or unapproved tools return safe errors. Concierge tools hold zero authority over bookings, transactions, payments, or contracts; booking attempts trigger the canonical classifieds non-intermediary disclaimer.
  8. **Bounded Qualification Schema (Section 19)**: Sanitizer (`sanitizeQualification`) strips unapproved or sensitive keys (`cpf`, `address`, `card`, `rg`) and enforces length bounds on lead qualification summaries.
  9. **Rate Limiting & Abuse Defense (Section 22)**: Per-conversation rate limiting (`LOCAL_BEST_EFFORT`, 20 turns/hour) protects platform compute. Marked with `DISTRIBUTED_CONCIERGE_RATE_LIMITING_READY = false as const`.
  10. **Inbound Message Retry Idempotency (Section 23)**: Duplicate inbound requests (e.g. network retries within 15 seconds or matching `clientTurnId`) return the existing assistant response without duplicating database rows.
  11. **DEV Database Table Privileges Audit (Section 28)**: Direct access to all concierge tables (`professional_concierge_settings`, `professional_concierge_faqs`, `concierge_conversations`, `concierge_messages`) is strictly revoked for `anon` and `authenticated` roles in DEV Supabase (`42501 insufficient_privilege`), enforcing server-authoritative `service_role` access only.
  12. **Real User Retention Policy Decision (Section 29)**: `RETENTION POLICY REQUIRED BEFORE REAL USERS` adopted. Prior to onboarding real end-users, an automated conversation data retention and purge policy must be implemented. All current conversations in DEV are transient test fixtures.
  13. **LGPD Full Lifecycle Decision (Section 30)**: `LGPD FULL LIFECYCLE = DEFERRED` (Backlog Item J). Full data subject request fulfillment (deletion, export) is scheduled for the pre-GTM compliance audit prior to commercial launch.
  14. **Roadmap Realignment**: Product Next set authoritatively to `PX4.7 — Velvet App Experience`, followed by `HOSTED DEV APP CHECKPOINT`, followed by `PX6 — AI Concierge + Agenda & Inquiries Integration`.
- **Verification & Test Coverage**:
  - Dedicated integrity test suite: `tests/concierge/concierge-integrity-audit.test.ts` (19/19 tests PASS).
  - All concierge tests: 4 test suites, 44 tests PASS (`tests/concierge/`).
  - Full project test suite: 183 test files, 1,844 tests PASS (0 failures).
  - Turbopack production build PASS.
- **Applied Migrations**: None (existing schema 33/33 validated).
- **Modules**: `modules/concierge/` (`provider.ts`, `prompt.ts`, `dal.ts`, `runtime.ts`, `rate-limiter.ts`, `constants.ts`, `types.ts`).

### PX4.7 — Velvet App Experience
- **Status**: **IMPLEMENTATION COMPLETE (AWAITING PHYSICAL DEVICE VERIFICATION)**.
- **Product Value**: Refines and elevates the installed PWA user experience into a seamless, native-feeling app tailored for mobile and standalone use, optimizing layout, navigation, and touch ergonomics across client and professional journeys without altering the normal web browser experience.
- **User**: Professional Advertiser & Client.
- **Scope & Delivered Architecture**:
  - **Server-Authoritative `/app` Launcher**: Route at `app/app/page.tsx` resolving session via `getAccount()`. Automatically routes: Anonymous/Public → `/`, Client → `/cliente`, Active Advertiser → `/dashboard`, Onboarding Advertiser → `resolveAdvertiserDestination()`, Admin → `/admin`, Suspended → `/suspended`. Strictly ignores spoofable query params (`?role=...`).
  - **Service Worker Security & Privacy**: `public/sw.js` explicitly blocks caching for `/app` and `/app/*` (Network-Only policy; never stored in Cache Storage).
  - **Web App Manifest**: Updated `start_url: '/app'` in `app/manifest.ts` while preserving `scope: '/'`, `#3B203F` theme color, `#F5F1E8` background, and full icon set.
  - **Editorial Bottom Navigation (`VelvetAppBottomNav`)**:
    - Advertiser: 5 destinations (Início `/dashboard`, Analytics `/dashboard/analytics`, Agenda `/dashboard/availability`, Concierge `/dashboard/concierge`, Mais sheet trigger).
    - Client / Public: 4 destinations (Explorar `/`, Buscar `/?buscar=1`, Conta `/cliente`, Mais sheet trigger).
    - Admin: Bottom nav suppressed entirely (preserves clean administrative dashboard).
    - Ergonomics: Fixed bottom bar, $\ge 44$px touch targets, accessible `aria-current="page"`, `aria-label`, safe-area-inset-bottom support, and active indicator dot.
  - **Accessible More Sheet Drawer (`VelvetAppMoreSheet`)**: Modal bottom sheet (`role="dialog"`, `aria-modal="true"`) with backdrop blur, focus trap, Escape key handling, and role-appropriate actions (Meu perfil, Fotos, Bairros, Verificação, Avaliações, Plano, Destaques, Ajuda, Sair) with zero fake features or app store badges.
  - **Restrained Standalone Top Bar (`VelvetAppTopBar`)**: Contextual standalone header displaying `velvet.` wordmark, active section title, `LanguageSelector`, and logout button with `env(safe-area-inset-top)` support.
  - **Layout & Shell Integration**: Wrapped `(dashboard)/layout.tsx` with `<VelvetAppShell role={account.role}>`; integrated `<VelvetAppBottomNav>` into `(public)/layout.tsx`; non-blocking server auth resolution via cached `getPublicAccount()`.
  - **Pre-Hydration CSS Isolation (`app/globals.css`)**: Pure CSS `@media (display-mode: standalone)` reveals app chrome and hides web navigation/footers/install banners instantly before JavaScript hydration, eliminating layout jump. Content offset `padding-bottom: calc(68px + max(16px, env(safe-area-inset-bottom)))` prevents navigation overlap. Desktop standalone (`min-width: 1024px`) suppresses bottom nav.
  - **Internationalization**: Bilingual catalog `lib/i18n/messages/app-mode.ts` (PT-BR and EN) registered in `lib/i18n/catalog.ts`; updated PWA card heading to "VELVET APP".
  - **Verification & Test Coverage**:
    - 18 dedicated tests in `tests/pwa/app-mode-shell.test.tsx` (44 PWA tests total across 3 test suites).
    - Full project suite: 184 test files, 1,862 tests PASS (0 failures).
    - Quality gates: `npm run typecheck` (0 errors), `npm run lint` (0 errors, 0 warnings), `npm run build` (Turbopack production build PASS).
  - **Release Verification Status**: `VELVET APP EXPERIENCE RELEASE-VERIFIED = NO` (deferred to physical iPhone Safari and Android Chromium testing at `HOSTED DEV APP CHECKPOINT`).
- **Dependencies**: PX4.5 PWA Infrastructure, PX4.6 Install App UX.
- **Data Model**: None (0 migrations created, 33/33 aligned).
- **Modules**: `app/app/page.tsx`, `components/pwa/`, `public/sw.js`, `app/manifest.ts`, `lib/i18n/messages/app-mode.ts`, `app/globals.css`.

### HOSTED DEV APP CHECKPOINT
- **Status**: **HOSTED DEV AUTOMATED + IPHONE PHYSICAL PASS (ANDROID DEFERRED)**.
- **Hosted Deployment**: Deployed to persistent hosted DEV environment (`https://velvetgirls.club`).
- **Objective**: Deploy the complete installable application stack (PX4.5 PWA + PX4.6 Install UX + PX4.7 App Experience) to the persistent hosted DEV environment (`https://velvetgirls.club`) and execute mandatory physical device verification.
- **Physical Device Gate Status**:
  - **IPHONE APP SHELL**: PASS
  - **IPHONE ONBOARDING & PROFILE REVIEW**: PASS
  - **IPHONE DIDIT ENTRY & RESUME FLOW**: PASS (PX4.8.1 / PX4.8.2 validated)
  - **ANDROID PHYSICAL APP GATE**: DEFERRED (Required before Closed Beta / real-user launch, does not block DEV progression)
  - **VELVET APP EXPERIENCE RELEASE-VERIFIED**: YES (iOS / iPhone PWA)
  - **PX6 SAFE TO START**: YES
- **Automated Validation Results**:
  - Base routes: 9/9 PASS (`/`, `/app`, `/manifest.webmanifest`, `/sw.js`, `/offline`, `/api/health`, `/login`, `/sao-paulo`, `/sao-paulo/moema`).
  - Protected route canonical gates: 7/7 PASS (307 redirect to `/login` for anonymous callers).
  - Service worker security & privacy: `/app`, `/dashboard`, `/api`, `/auth`, and signed media strictly excluded from Cache Storage.
  - Manifest & icons: `start_url: '/app'`, `display: 'standalone'`, all 4 icon sizes (192, 512, maskable) return HTTP 200.
  - Public profile: HTTP 200 on eligible profiles.
  - Desktop Standalone Navigation: Fully verified with top bar compact navigation and More sheet trigger.

### PX6 — AI Concierge + Agenda & Inquiries Integration
- **Status**: **COMPLETE (100% RESOLVED IN DEV)**.
- **Product Value**: Connects the AI Concierge with the canonical Agenda/Availability engine to truthfully answer schedule questions without hallucination, provides professionals with an inquiries inbox in the dashboard, and equips public profiles with a multi-gated, non-intrusive concierge chat.
- **User**: Professional Advertiser & Prospective Client.
- **Scope & Delivered Architecture**:
  - **Availability Engine Connection (`modules/concierge/tools.ts`)**:
    - Tool `get_available_slots` calls canonical `getPublicAvailableSlots()` from `modules/agenda/dal.ts`.
    - Bounded 7-day query horizon (requests beyond 7 days clamped automatically).
    - Returns sanitized DTO: `slotRef`, date, time, timezone, zero internal UUIDs, and explicit disclaimer that appointments are arranged directly with the professional.
    - System prompt platform directive #7 prohibits hallucination and emphasizes that availability does NOT mean a booking exists.
  - **Mock & Live Multi-Turn Provider Integration (`modules/concierge/provider.ts`)**:
    - `generateMockReply` queries canonical availability when schedule questions are asked ("atende hoje", "horário amanhã").
    - `generateConciergeReply` supports multi-turn tool calling with OpenAI completions.
  - **Zero Booking / Invariant Enforcement**:
    - Verified by dedicated regression suite: queries produce 0 side effects, 0 rows added/modified in `professional_weekly_availability` or `professional_availability_exceptions`.
    - Zero booking, reservation, slot locking, or payment intermediation logic.
    - Zero database migrations (schema remains strictly 33/33).
  - **Professional Inquiries Inbox (`components/concierge/concierge-inquiries-inbox.tsx`)**:
    - Embedded in `/dashboard/concierge` alongside concierge status bar.
    - Filter pills (Todas, Novas, Em contato, Convertidas, Arquivadas).
    - Status badges, qualification summaries (budget, dates, location preferences), unread indicators, and full message transcript modal.
    - Server Actions with strict ownership validation: `getProfessionalInquiriesAction`, `getProfessionalInquiryDetailAction`, `updateProfessionalInquiryStatusAction`.
  - **Public Web Chat & Multi-Gate Server Readiness (`modules/concierge/gate.ts` & `components/concierge/public-concierge-chat.tsx`)**:
    - Server gate `isWebPublicConciergeReady(profileId)` enforces 6 checks:
      1. Global feature flag (`CONCIERGE_WEB_PUBLIC_ENABLED === 'true'`).
      2. Data retention policy approval marker (`CONCIERGE_RETENTION_POLICY_APPROVED === 'true'`).
      3. Distributed rate limiting readiness (`CONCIERGE_DISTRIBUTED_RATE_LIMIT_READY === 'true'`).
      4. AI provider configuration (`OPENAI_API_KEY` present).
      5. Canonical profile publication eligibility (`v_publication_eligible_profiles`).
      6. Professional concierge enabled setting (`settings.enabled`).
    - Defaults to OFF (`WEB_PUBLIC = OFF`) on Hosted DEV.
    - Floating bottom launcher, accessible modal / bottom sheet on mobile, clear virtual assistant disclosure, non-intrusive styling.
  - **Verification & Test Coverage**:
    - 6 dedicated test files in `tests/concierge/` with 60/60 tests PASS.
    - Full test suite: 189 test files, 1,927 tests PASS (0 failures).
    - Typecheck (`npm run typecheck`): 0 errors.
    - Lint (`npm run lint`): 0 errors, 0 warnings.
    - Production build (`npm run build`): Turbopack PASS.
    - Hosted validation at `https://velvetgirls.club`: All routes HTTP 200, public concierge chat trigger correctly suppressed (`false`).
- **Dependencies**: PX3 Agenda, PX4 Public Agenda, PX5 AI Concierge.
- **Data Model**: None (0 migrations created; 33/33 migrations aligned).
- **Modules**: `modules/concierge/`, `components/concierge/`, `app/(dashboard)/dashboard/concierge/page.tsx`, `app/(public)/perfil/[slug]/page.tsx`, `app/globals.css`.
- **Product Next**: PX7 — Cybersecurity & Abuse Intelligence.

### PX7 — Cybersecurity & Abuse Intelligence
- **Status**: **COMPLETE** (DEV & Hosted Aligned)
- **Product Value**: Protects platform availability, data integrity, and user trust against hostile traffic, automated scraping, cross-tenant attacks, and audit tampering.
- **User**: Platform Administrator & System Operators.
- **Scope & Delivered Architecture**:
  - **Distributed Abuse Protection / Rate Limiter (`modules/security/rate-limiter.ts`)**:
    - Backed by PostgreSQL atomic counter `public.check_rate_limit(p_key, p_limit, p_window_seconds)` on `distributed_rate_limits` table.
    - Seamless in-memory fallback for local unit tests without live database.
    - Exported canonical flags: `DISTRIBUTED_AUTH_RATE_LIMITING_READY = true`, `DISTRIBUTED_CONCIERGE_RATE_LIMITING_READY = true`.
    - Integrated with AI Concierge public chat (`sendPublicChatMessageAction` rejects empty/whitespace payloads and enforces distributed burst rate limiting per session).
  - **Audit Ledger Immutability Triggers (Backlog Item C RESOLVED)**:
    - Attached trigger function `public.prevent_audit_ledger_mutation()` `BEFORE UPDATE OR DELETE` across all 5 sensitive audit ledgers:
      `billing_admin_audit_logs`, `media_moderation_reviews`, `profile_moderation_reviews`, `profile_video_moderation_events`, `professional_review_moderation_events`.
    - Attached trigger function `public.prevent_webhook_event_deletion()` `BEFORE DELETE` across both webhook event ledgers:
      `billing_webhook_events`, `verification_webhook_events`.
    - Validated by automated tests: any attempt to UPDATE or DELETE an audit log record raises exception `23505`/`P0001` and rolls back.
  - **Security-Sensitive Atomic Mutation RPCs (Backlog Item B RESOLVED)**:
    - Created PostgreSQL atomic transaction functions ensuring mutations and audit log creation succeed or fail together as a single atomic unit:
      1. `public.admin_toggle_client_vip`: Atomically updates client membership type and inserts `billing_admin_audit_logs` record.
      2. `public.admin_set_profile_audience`: Atomically updates profile audience setting and inserts `billing_admin_audit_logs` record.
      3. `public.admin_moderate_video`: Atomically updates video moderation status and inserts `profile_video_moderation_events` record.
      4. `public.admin_grant_founder_benefit`: Atomically acquires account lock, creates active Founder subscription, and inserts `billing_admin_audit_logs`.
      5. `public.admin_revoke_founder_benefit`: Atomically expires Founder subscription and inserts `billing_admin_audit_logs`.
    - Updated server actions and admin pages (`/admin/clients`, `/admin/profiles/audience`, `modules/moderation/actions.ts`, `modules/billing/actions.ts`) to invoke atomic RPCs.
  - **Canonical Cross-Tenant Profile Ownership Guards**:
    - Implemented `assertProfileOwnership(profileId)` in `modules/profiles/guards.ts`.
    - Consolidated in `modules/agenda/actions.ts` and `modules/concierge/actions.ts`.
  - **Zero Non-Intermediary Leakage**:
    - Absolute preservation of directory boundary: zero booking, reservation, slot locking, or payment intermediation logic.
  - **Database Migration & Synchronization**:
    - Migration `20260907170000_px7_cybersecurity_hardening.sql` created, applied, and verified in DEV Supabase `mwzlunkkyigxzjpnybxj` (34/34 migrations synchronized).
  - **Verification & Quality Gates**:
    - 3 dedicated PX7 security test suites (26 tests PASS):
      - `tests/security/px7-audit-immutability-and-atomicity.test.ts` (10/10)
      - `tests/security/px7-distributed-rate-limiter.test.ts` (9/9)
      - `tests/security/px7-cross-tenant-and-abuse.test.ts` (7/7)
    - Full project test suite: 192 test files, 1,953 tests PASS (0 failures).
    - Strict typecheck (`npm run typecheck`): 0 errors.
    - Strict linter (`npm run lint`): 0 errors, 0 warnings.
    - Production build (`npm run build`): Next.js Turbopack build succeeded.
- **Dependencies**: PX1 Telemetry, R12 Admin foundation.
- **Data Model**: Migration `20260907170000_px7_cybersecurity_hardening.sql` (34/34 migrations).
- **Product Next**: PX8 — Product Polish & Pre-GTM Readiness.

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
| **Item F** | OAuth callback & auth redirect trusted origin validation | **Continuous Security Guardrail** | **RESOLVED** (Enforced server-authoritative origin, Host spoofing tests PASS) |
| **Item E** | Media delivery publication gate enforcement | **Continuous Security Guardrail** | **RESOLVED** (Enforced canonical publication eligibility for public media; 12/12 dedicated tests PASS) |
| **Item I** | CLIENT signup error handling & provisioning atomicity | **Continuous Security Guardrail** | **RESOLVED & DEV VALIDATED** (Database-owned atomic membership provisioning via account_users trigger; 30/30 DEV migrations in sync; dedicated test suite PASS) |
| **Item H** | Admin operational classification drift vs canonical view | **Continuous Security Guardrail** | **RESOLVED** (Fixed in PX1B; canonical eligibility strictly governs operational classification; verified by dedicated tests) |
| **Item A** | Canonical publication eligibility in utility helpers | **Continuous Security Guardrail** | **RESOLVED & DEV VERIFIED** (Enforced canonical view `v_publication_eligible_profiles` across PX2 Analytics and PX4 Agenda public signals) |
| **Item B** | Non-atomic mutation and audit trail pairs | **Continuous Security Guardrail** | **RESOLVED** (Atomic PostgreSQL RPCs implemented and verified in PX7; Backlog Item B closed) |
| **Item C** | Audit tables lacking DB immutability triggers & FK cascade | **Continuous Security Guardrail** | **RESOLVED** (Database triggers prevent UPDATE/DELETE on all 7 audit & webhook ledgers in PX7; Backlog Item C closed) |
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

- **Pre-PX1 Critical Guardrails Status**:
  - **Didit FAILED Webhook Retry Reconciliation (Backlog Item D) — RESOLVED** (Validated with 15/15 tests).
  - **OAuth Trusted Origin Validation (Backlog Item F) — RESOLVED** (Server-authoritative origin enforced; header spoofing defense validated with 17/17 tests).
  - **Media Publication Gate Enforcement (Backlog Item E) — RESOLVED** (Enforced canonical publication eligibility view for public media; 12/12 dedicated tests PASS).
  - **CLIENT Provisioning Consistency (Backlog Item I) — RESOLVED & DEV VALIDATED** (Database-owned atomic membership provisioning via `trg_ensure_client_membership` trigger on `account_users`; 30/30 DEV migrations applied and verified in DEV; 233/233 auth suite tests PASS).
- **Completed Product Workstreams**:
  - **PX1 — Observability & Telemetry Foundation**: **COMPLETE (100% RESOLVED)** across PX1A, PX1B, PX1C.
  - **PX2 — Professional Analytics 2.0**: **COMPLETE (100% RESOLVED)** across PX2A, PX2B, PX2C.
  - **PX3 — Agenda & Availability Foundation**: **COMPLETE (100% RESOLVED)**.
  - **PX4 — Agenda UX & Professional Operations**: **COMPLETE (100% RESOLVED)**.
  - **PX4.5 — PWA & Installable Experience**: **COMPLETE (100% RESOLVED)**.
  - **PX4.6 — Install App UX**: **COMPLETE (100% RESOLVED)**.
  - **PX5 — AI Concierge Foundation**: **COMPLETE (100% RESOLVED IN DEV)**.
  - **PX5.1 — AI Concierge Integrity Audit & Security Gates**: **COMPLETE (100% RESOLVED IN DEV)**.
  - **PX4.7 — Velvet App Experience**: **IMPLEMENTATION COMPLETE**.
  - **PX4.8 — Velvet App UX Consolidation**: **COMPLETE (100% IMPLEMENTED & AUTOMATED PASS ON HOSTED DEV)**.
    - *Reversible Onboarding*: Stepper now renders completed steps as interactive links; explicit Back CTA (`← Voltar`) on all steps after the first; non-blocking KYC with clear age-verification lead notice and review affordance (`Voltar e revisar meu perfil`).
    - *Quiet Top Bar & More Sheet Language Switcher*: Removed persistent PT/EN toggle from header; added quiet top bar menu button; integrated native segmented language switcher pills (`Português` / `English`) with cookie persistence and path localization in `VelvetAppMoreSheet`.
    - *Summary-First Profile UX & Reduced Density*: In standalone App Mode, profile editing defaults to 7 structured cards with formatted values (`Sim` / `Não` / `Não informado`) and focused section-by-section editing.
  - **PX4.8.1 — KYC / Didit Entry & Resume Flow Correction**: **COMPLETE (100% IMPLEMENTED & AUTOMATED PASS ON HOSTED DEV)**.
    - *Actionable Verification Flow*: Eliminated dead-end in `VerificationStatusCard.tsx` where active sessions (`PENDING` / `IN_PROGRESS`) only displayed "Atualizar status". Added primary CTA `Continuar verificação` (initiating/resuming session via `startVerificationAction`) and secondary `Voltar e revisar meu perfil`, with `Atualizar status` preserved as a tertiary action (`.verification-tertiary-action`).
    - *Server Action Resumption & In-Memory Deduplication*: Refactored `startVerificationAction()` and `resumeVerificationAction()` to allow continuing `PENDING` and `IN_PROGRESS` verification without throwing `"Sua verificação já está em andamento"`. Added 15-minute in-memory cache and in-flight promise deduplication against rapid double-clicks.
    - *Truthful State Separation & Labels*: Decoupled `IN_REVIEW` ("Verificação em análise") from `PENDING` ("Aguardando conclusão") and `EXPIRED` ("Sessão expirada"). Aligned all 7 verification status labels and localized helper copy in PT-BR and EN.
  - **PX4.8.2 — Hosted DEV Didit Configuration & Session Smoke**: **COMPLETE (100% RESOLVED & VERIFIED IN HOSTED DEV)**.
    - *Hosted Provider Configuration Verified*: Proved that Vercel Hosted DEV (`prj_737boGVLj1t2iNQnLxWQ38xXlasb`, environment `Production`) possesses complete, active Didit credentials (`DIDIT_API_KEY`, `DIDIT_WORKFLOW_ID`, `DIDIT_WEBHOOK_SECRET`). Subsystem health probe `/admin/health` reports status `HEALTHY` (`Saudável`) with `Status de Configuração: Completo`.
    - *Real Synthetic Session Creation*: Successfully executed canonical `startVerificationAction` against the live hosted runtime (`https://velvetgirls.club`). Verified that a real Didit session is generated, valid verification URL (`https://verify.didit.me/session/...`) is returned, and record is persisted in `identity_verifications` with `provider: didit` and `status: PENDING`.
    - *Active Session Resume & Profile Review Roundtrip*: Successfully verified in-memory session reuse and profile review roundtrip on Hosted DEV with zero duplicate rows.
- **Current Gate**: **HOSTED DEV APP CHECKPOINT — AUTOMATED PASS (PHYSICAL APP GATE READY FOR RETEST)**.
- **Physical Device Gate**:
  - Real iPhone Safari PWA: Ready for physical retest of Iniciar/Continuar verificação flow backed by live Didit provider on Hosted DEV.
  - Real Android Chromium PWA: PENDING.
- **VELVET APP EXPERIENCE RELEASE-VERIFIED**: **NO** (Physical Device Gate required).
- **PX6 SAFE TO START**: **NO** (Physical Device Gate must complete first).
