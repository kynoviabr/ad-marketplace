# Portal — Master Index
STATUS: ACTIVE — PRODUCT-FIRST PRE-GTM ROADMAP ADOPTED (R12 CLOSED IN DEV)
VERSION: 4.0
LAST UPDATED: 2026-09-05

## Project Status
- FASE 0 — Product & Architecture: IMPLEMENTED & CLOSED
- FASE 1 — Authentication & Account: IMPLEMENTED & CLOSED
- FASE 2 — Identity & Age Verification: IMPLEMENTED & CLOSED
- FASE 3 — Professional Profile: IMPLEMENTED & CLOSED
- FASE 4 — Locations, Search, Filters & Ranking: IMPLEMENTED & CLOSED
- FASE 5 — Media / Photos: IMPLEMENTED & CLOSED
- FASE 6 — Moderation, Reports & Admin: IMPLEMENTED & CLOSED
- FASE 7 — Billing / Founders: IMPLEMENTED & CLOSED (provider underwriting pending)
- FASE 8 — Boosts & Additional Monetization: IMPLEMENTED & CLOSED (v1.1)
- FASE 9 — Analytics & Business Intelligence: IMPLEMENTED & CLOSED (v1.2 — event foundation)
- FASE 10 — SEO, Growth & São Paulo GTM: IMPLEMENTED & CLOSED (v1.1)
- FASE 11 — Security, Privacy, LGPD & Production Hardening: IMPLEMENTED & CLOSED
- FASE 12 — Core Operations, Admin & Product Expansion: IN PROGRESS IN DEV
  - Public Foundation, Discovery & Home (FASE 12.2A/B): CLOSED
  - Public Search, Compliance, Offerings, Reviews, Video Foundation (Releases R5–R9): INTEGRATED
  - Monetization Entitlements & Audience Control (Release R10): CLOSED
  - Professional Hub & Acquisition Funnel (Release R11): CLOSED
  - Admin Operations & Queues (Release R12 / R12.1–R12.4C2): CLOSED IN DEV
  - Security Remediation P1-1 through P1-5: CLOSED & DEV VALIDATED (29/29 migrations in DEV)
- CURRENT STATE: R12 CLOSED & DEV VALIDATED (171/171 targeted tests PASS, DEV transactional runtime PASS)
- NEXT: Pre-GTM Product Expansion in DEV (Workstreams PX1–PX8) followed by Pre-GTM Hardening, Environment & Secrets Readiness (PROD setup), and Professional Acquisition.

## Key Decisions
- DEC-001 Modular monolith.
- DEC-002 Next.js + TypeScript + Node.js.
- DEC-003 Supabase PostgreSQL + Auth.
- DEC-004 Hostinger initial production hosting direction.
- DEC-005 Vercel preview only with synthetic/non-adult data.
- DEC-006 No adult media upload before verified identity AND age.
- DEC-007 Didit preferred KYC candidate pending final Terms/DPA/compliance review.
- DEC-008 Public identity uses artistic/display name; legal identity remains private.
- DEC-009 Video core foundation implemented in DEV in R9; advanced cloud transcoding and dedicated streaming CDN remain post-MVP expansion.
- DEC-010 PostgreSQL structured search initially; no Elasticsearch in MVP.
- DEC-011 Hidden attributes cannot leak through public filters.
- DEC-012 Founder commercial floor currently planned at R$99.99/month; configurable.
- DEC-013 Business model is classified advertising/profile visibility; no visitor-to-advertiser payment intermediation.
- DEC-014 Media binaries never stored in PostgreSQL.
- DEC-015 No premature microservices, Redis, Kafka, Elasticsearch or Kubernetes.
- DEC-016 All public media requires moderation after KYC.
- DEC-017 Sponsored placement is identifiable, limited and rotated.
- DEC-018 Non-payment pauses/unpublishes a profile rather than automatically deleting it.
- DEC-019 Subscription benefits use configurable entitlements.
- DEC-020 Payment webhooks are source of truth and idempotent.
- DEC-021 Billing uses a payment-provider abstraction.
- DEC-022 Current payment candidates: Pagar.me/Stone #1, Mercado Pago #2, Safe2Pay #3; none approved before written underwriting acceptance.
- DEC-023 Competitor evidence indicates Brazilian mainstream payment infrastructure may be feasible for this advertising model; do not automatically classify the portal as a pornography/content-sales merchant.
- DEC-024 Disclose the exact business model during underwriting and obtain MCC/classification and approval in writing.
- DEC-025 São Paulo capital is the exclusive initial commercial market.
- DEC-026 Month 1 of OBJ-001 begins only at the São Paulo Commercial Launch after GO criteria.
- DEC-027 AI Concierge repositioned to Pre-GTM Product Differentiation (PX5/PX6); optional, non-intermediary, professional-configured productivity add-on; portal-first architecture.
- DEC-028 Video profiles core foundation implemented in DEV in R9 (upload, moderation, signed playback URLs); advanced transcoding pipelines and CDN tiers remain post-MVP.
- DEC-029 Product-first pre-GTM strategy adopted 2026-09-05: core product differentiation (PX1–PX8) will be completed and validated in DEV before provisioning separate PROD infrastructure or starting Closed Beta.
- DEC-030 Observability & Telemetry is an explicit architectural foundation (PX1) required before introducing AI and complex workflows.
- DEC-031 Agenda & Availability is an optional professional productivity tool; Velvet does not intermediate bookings or payments (non-intermediary directory model preserved).
- DEC-032 Technical hardening backlog from R12 is preserved and addressed progressively (critical guardrails before PX1, audit/integrity during PX, LGPD anonymization before real users, PROD infrastructure at Environment Readiness).
- DEC-033 Commercial Launch remains focused exclusively on São Paulo capital (GEO-001) with Rio de Janeiro as the secondary expansion target (GEO-002).

## Source of Truth
These documents are the project source of truth. Implementation prompts must instruct Codex to read `/docs` before changing code.

## Commercial Objectives & Geography
- OBJ-001 — Target R$50,000 monthly revenue by end of month 6 after commercial launch.
- GEO-001 — São Paulo capital is the exclusive initial launch market and focus of the first six-month commercial phase.
- GEO-002 — Rio de Janeiro is the planned second geographic market.
- GTM-001 — Early supply acquisition uses hybrid 1:1 onboarding + digital + referrals/community; marketplace density takes priority over nationwide breadth.
- GTM-002 — Corporate Instagram is an institutional acquisition/community channel for professionals, not a catalog of professional photos. It routes leads to the Founder landing/signup flow and supports respectful 1:1 outreach.
