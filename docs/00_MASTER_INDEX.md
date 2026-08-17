# Portal — Master Index
STATUS: ACTIVE
VERSION: 2.0
LAST UPDATED: 2026-08-16

## Project Status
- FASE 0 — Product & Architecture: SPEC COMPLETE
- FASE 1 — Authentication & Account: SPEC COMPLETE
- FASE 2 — Identity & Age Verification: SPEC COMPLETE
- FASE 3 — Professional Profile: SPEC COMPLETE
- FASE 4 — Locations, Search, Filters & Ranking: SPEC COMPLETE
- FASE 5 — Media / Photos: SPEC COMPLETE
- FASE 6 — Moderation, Reports & Admin: SPEC COMPLETE
- FASE 7 — Billing / Founders: SPEC COMPLETE (provider underwriting pending)
- FASE 8 — Boosts & Additional Monetization: SPEC COMPLETE
- FASE 9 — Analytics & Business Intelligence: SPEC COMPLETE
- FASE 10 — SEO, Growth & São Paulo GTM: SPEC COMPLETE
- FASE 11 — Security, Privacy, LGPD & Production Hardening: SPEC COMPLETE
- FASE 12 — Closed Beta & Launch Readiness: SPEC COMPLETE
- PRODUCT SPECIFICATION: COMPLETE
- NEXT: IMPLEMENTATION PLAN

## Key Decisions
DEC-001 Modular monolith.
DEC-002 Next.js + TypeScript + Node.js.
DEC-003 Supabase PostgreSQL + Auth.
DEC-004 Hostinger initial production hosting direction.
DEC-005 Vercel preview only with synthetic/non-adult data.
DEC-006 No adult media upload before verified identity AND age.
DEC-007 Didit preferred KYC candidate pending final Terms/DPA/compliance review.
DEC-008 Public identity uses artistic/display name; legal identity remains private.
DEC-009 Video excluded from MVP.
DEC-010 PostgreSQL structured search initially; no Elasticsearch in MVP.
DEC-011 Hidden attributes cannot leak through public filters.
DEC-012 Founder commercial floor currently planned at R$99.99/month; configurable.
DEC-013 Business model is classified advertising/profile visibility; no visitor-to-advertiser payment intermediation.
DEC-014 Media binaries never stored in PostgreSQL.
DEC-015 No premature microservices, Redis, Kafka, Elasticsearch or Kubernetes.
DEC-016 All public media requires moderation after KYC.
DEC-017 Sponsored placement is identifiable, limited and rotated.
DEC-018 Non-payment pauses/unpublishes a profile rather than automatically deleting it.
DEC-019 Subscription benefits use configurable entitlements.
DEC-020 Payment webhooks are source of truth and idempotent.
DEC-021 Billing uses a payment-provider abstraction.
DEC-022 Current payment candidates: Pagar.me/Stone #1, Mercado Pago #2, Safe2Pay #3; none approved before written underwriting acceptance.
DEC-023 Competitor evidence indicates Brazilian mainstream payment infrastructure may be feasible for this advertising model; do not automatically classify the portal as a pornography/content-sales merchant.
DEC-024 Disclose the exact business model during underwriting and obtain MCC/classification and approval in writing.

## Source of Truth
These documents are the project source of truth. Implementation prompts must instruct Codex to read `/docs` before changing code.

## Commercial Objectives & Geography
- OBJ-001 — Target R$50,000 monthly revenue by end of month 6 after commercial launch.
- GEO-001 — São Paulo capital is the exclusive initial launch market and focus of the first six-month commercial phase.
- GEO-002 — Rio de Janeiro is the planned second geographic market.
- GTM-001 — Early supply acquisition uses hybrid 1:1 onboarding + digital + referrals/community; marketplace density takes priority over nationwide breadth.

## Additional Approved Decisions
- GTM-002 — Corporate Instagram is an institutional acquisition/community channel for professionals, not a catalog of professional photos. It routes leads to the Founder landing/signup flow and supports respectful 1:1 outreach.
- DEC-025 — São Paulo capital is the exclusive initial commercial market.
- DEC-026 — Month 1 of OBJ-001 begins only at the São Paulo Commercial Launch after GO criteria.
- DEC-027 — AI Concierge / WhatsApp lead qualification is a priority post-MVP product and potential paid add-on.
- DEC-028 — Video profiles are post-MVP and require dedicated storage/transcoding/moderation/provider-policy design.
