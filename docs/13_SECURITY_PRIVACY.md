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

