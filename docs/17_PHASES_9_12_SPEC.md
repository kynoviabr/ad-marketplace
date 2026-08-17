# Fases 9–12 — Analytics, GTM, Hardening & Launch
STATUS: APPROVED SPECIFICATION
VERSION: 1.0
LAST UPDATED: 2026-08-16

# FASE 9 — Analytics & Business Intelligence
Two surfaces: Advertiser Analytics and Business Analytics.

Advertiser metrics: search impressions, profile views, contact clicks, CTR, contact-click/profile-view conversion and promotion performance. A contact click is a proxy for intent, not a completed service/client.

Core events include search, impression, profile view, contact click, signup, KYC, profile submission/approval, trial, checkout/payment, subscription lifecycle and promotion events.

Never place CPF, RG, legal identity, KYC documents, residential address, conversation text or unnecessary visitor PII in analytics.

Business metrics: revenue, subscription MRR, promotion revenue, paying advertisers, ARPU, trial-to-paid by cohort, voluntary/involuntary churn, Promotion Attach Rate, Promotion ARPPU, acquisition funnel, CAC when known, São Paulo supply/demand by region and OBJ-001 progress/gap/forecast.

Architecture: validated first-party events in PostgreSQL/Supabase plus daily aggregate tables. No data warehouse or streaming infrastructure in MVP.

# FASE 10 — SEO, Growth & São Paulo GTM
Principle: build supply density before scaling visitor acquisition.

São Paulo capital is the exclusive initial commercial market. Rio de Janeiro is second after expansion gates.

Use hybrid acquisition: direct 1:1 onboarding, digital/organic lead generation, referrals/community and SEO/demand generation. A Community & Onboarding Manager is recommended. KYC documents never travel through WhatsApp or informal channels.

Track outreach -> response -> interest -> signup -> KYC -> approved profile -> trial -> paid. Respect DO_NOT_CONTACT.

## Corporate Instagram — GTM-002
Create a corporate Instagram account as an institutional acquisition/community channel aimed primarily at professionals.

Editorial positioning: platform/technology, visibility, privacy/control, profile optimization, verification/security, Founder program, product features, analytics and future AI Concierge.

The corporate feed is not a catalog of professionals and does not require professional photos. Avoid explicit sexual marketing/service-offer posts. CTA routes interested professionals to the official Founder landing page and secure signup/KYC flow.

The account may support respectful 1:1 outreach to relevant public professional accounts. Track INSTAGRAM_ORGANIC and INSTAGRAM_OUTREACH. Do not make GTM dependent on Meta Ads; revalidate paid-media policies before campaigns.

SEO supports useful São Paulo and neighborhood/region pages plus public profile URLs. Do not index empty/thin location pages or uncontrolled filter combinations.

180-day approach: pre-launch supply; M1–2 liquidity/channel discovery; M3 paid conversion; M4–5 scale proven channels; M6 target OBJ-001.

Candidate North Star: Contact Clicks per Active Advertiser. Future AI Concierge may evolve this to Qualified Leads per Active Advertiser.

# FASE 11 — Security, Privacy, LGPD & Production Hardening
Separate public professional identity from private/legal identity. Prefer KYC provider retention of raw documents where appropriate, keeping verification status/reference locally.

Controls: Supabase RLS, server-only secrets, separate environments, synthetic staging data, admin MFA, server-side RBAC, least privilege, audit logs, secure signed media, validation/EXIF removal, rate limits, signed/idempotent webhooks, log redaction, gateway tokenization, backup + restore tests, deletion/retention workflows, LGPD request operations, terms-version history, incident response, monitoring, dependency scanning and CI.

Cross-account authorization vulnerabilities, KYC bypass, private media exposure or legal-identity exposure are production blockers.

# FASE 12 — Closed Beta & Launch Readiness
Stages: INTERNAL ALPHA -> CLOSED BETA -> SOFT LAUNCH -> COMMERCIAL LAUNCH SÃO PAULO.
Closed Beta does not start the six-month OBJ-001 clock.

Internal Alpha uses synthetic data and sandboxes. Closed Beta starts with approximately 20–30 real São Paulo professionals. Soft Launch expands to approximately 50–100 and controlled visitor traffic.

Initial Commercial Launch Supply Gate hypothesis: approximately 150–250 approved profiles with adequate density across priority São Paulo clusters.

Before production: KYC provider approved, storage/CDN policy compatible, gateway has approved exact business model in writing, billing/reconciliation validated and legal/compliance documents reviewed.

Create operational runbooks and kill switches for signups, uploads, payments and promotions.

NO-GO includes KYC bypass, public private-media exposure, cross-account auth flaws, unapproved gateway, materially inconsistent billing, missing critical takedown workflow, untested restore, essential legal docs missing, incompatible storage, private-data exposure, missing admin MFA or broken financial reconciliation.

Month 1 of OBJ-001 begins on the recorded São Paulo Commercial Launch date.
