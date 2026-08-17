# Architecture
STATUS: APPROVED
VERSION: 1.0
LAST UPDATED: 2026-08-15

Modular monolith using Next.js App Router, TypeScript and Node.js.
Database/Auth: Supabase PostgreSQL + Supabase Auth.
Production: Hostinger.
Preview: Vercel only with synthetic/non-adult data.
Code: GitHub; implementation assistance: Codex.

Modules: auth, users, verification, profiles, locations, media, moderation, billing, boosts, analytics, admin.

Avoid provider lock-in and Vercel-specific architecture. Media uses external object storage; vendor selected before Media phase.

## Payment provider abstraction
Billing domain logic must not depend directly on a single processor SDK. Implement a provider adapter/interface so the selected gateway can be changed without rewriting subscriptions, plans or entitlements. Provider selection is finalized only after written underwriting approval.
