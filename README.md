# AD-Marketplace — Technical README

> **Status**: FASE 00 — Foundation / Bootstrap
> See [`docs/00_MASTER_INDEX.md`](./docs/00_MASTER_INDEX.md) for the full product specification index.

---

## What is this?

AD-Marketplace is a classified advertising portal for verified adult independent professionals.
This repository contains the technical implementation. All product decisions, architecture choices,
and business rules are documented in the spec files in the [`/docs`](./docs) folder.

**Do not treat this README as a substitute for the spec docs.**

---

## Requirements

| Tool | Version |
|------|---------|
| Node.js | 20 LTS or later |
| npm | 10 or later |

---

## Installation

```bash
# Clone the repo
git clone <repository-url>
cd <repository-directory>

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# → Fill in your Supabase values in .env.local
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and populate:

| Variable | Scope | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public (browser + server) | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (browser + server) | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only** | Service role key — bypasses RLS |
| `NEXT_PUBLIC_APP_URL` | Public | Base URL of the application |

### ⚠️ Secret Security Rules

- `SUPABASE_SERVICE_ROLE_KEY` **must NEVER** use the `NEXT_PUBLIC_` prefix.
- `SUPABASE_SERVICE_ROLE_KEY` **must NEVER** be committed to Git.
- `.env.local` and all `*.local` env files are `.gitignore`d and must stay that way.
- Never log, return, or expose secrets in API responses.

---

## Running Locally

```bash
# Development server (hot reload)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.
Open [http://localhost:3000/api/health](http://localhost:3000/api/health) to check the health endpoint.

---

## Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run test` | Run the test suite (Vitest) |
| `npm run test:watch` | Run tests in watch mode |

---

## Production Build

```bash
npm run build
npm start
```

The output mode is `standalone` (`next.config.ts`), which bundles everything needed to run on
any standard Node.js server — no Vercel or CDN functions required. This is the format intended
for deployment on **Hostinger** or any equivalent Node.js host.

---

## Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Copy the **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy the **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Copy the **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

> **Note**: In FASE 00 (Foundation), no database tables or domain schema are created.
> The Supabase connection infrastructure is in place, but no migrations have been run.
> Tables will be created in the phases where they are required.

### Three client types

| File | Purpose | Key used |
|------|---------|----------|
| `lib/supabase/client.ts` | Browser / Client Components | `ANON_KEY` |
| `lib/supabase/server.ts` | Server Components / API Routes | `ANON_KEY` + cookies |
| `lib/supabase/admin.ts` | Admin / server-only operations | `SERVICE_ROLE_KEY` |

---

## Project Structure

```
.
├── app/                      # Next.js App Router
│   ├── api/
│   │   └── health/           # Health check endpoint
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
│
├── components/               # Shared UI components (future phases)
│
├── lib/
│   ├── env/
│   │   ├── client.ts         # Public env validation (browser-safe)
│   │   └── server.ts         # Server env validation (server-only)
│   └── supabase/
│       ├── admin.ts          # Service role client (server-only)
│       ├── client.ts         # Browser client
│       └── server.ts         # Server/SSR client
│
├── modules/                  # Modular domain boundaries
│   ├── admin/                # Admin tooling (FASE 06+)
│   ├── analytics/            # Analytics (FASE 09+)
│   ├── auth/                 # Authentication (FASE 01+)
│   ├── billing/              # Billing/subscriptions (FASE 07+)
│   ├── locations/            # City/region data (FASE 04+)
│   ├── media/                # Photos/media (FASE 05+)
│   ├── moderation/           # Content moderation (FASE 06+)
│   ├── profiles/             # Professional profiles (FASE 03+)
│   ├── promotions/           # Boosts/sponsored (FASE 08+)
│   ├── users/                # User accounts (FASE 01+)
│   └── verification/         # Identity/KYC (FASE 02+)
│
├── tests/                    # Test suite (Vitest)
│
├── .env.example              # Environment variable template
├── .gitignore
├── next.config.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts

# Product specification — source of truth
├── docs/
│   ├── 00_MASTER_INDEX.md
│   ├── 01_PRODUCT_REQUIREMENTS.md
│   ├── 02_ARCHITECTURE.md
│   └── ... (20 files total — see docs/00_MASTER_INDEX.md)
```

---

## Deploy Portability

This application is designed to run on any standard Node.js host:

- **Production target**: Hostinger (Node.js)
- **Preview / dev**: Vercel (synthetic/non-adult data only — per DEC-005)
- **No Vercel-specific features** are used (no Edge Functions, no ISR with Vercel KV, etc.)
- `output: 'standalone'` in `next.config.ts` makes the build self-contained

---

## Architecture Constraints

Per the project spec (`docs/02_ARCHITECTURE.md`, `docs/00_MASTER_INDEX.md`):

- **Modular Monolith** — no microservices
- **No Redis** — no Kafka — no Elasticsearch — no Kubernetes
- **PostgreSQL portable** — Supabase PostgreSQL; no PG-specific Supabase lock-in beyond standard SQL
- **Payment provider abstraction** — billing domain must use an adapter/interface (DEC-021)
- **No adult media before verified identity AND age** (DEC-006)
- **Service role key never in browser** (`docs/13_SECURITY_PRIVACY.md`)

---

## Running Tests

```bash
npm run test          # Run all tests once
npm run test:watch    # Watch mode
```

Tests are located in `tests/` and use **Vitest**. No external services are required.

---

## CI

GitHub Actions CI runs on every push and pull request to `main`/`develop`:
- Install → Lint → Typecheck → Test → Production Build

See [`.github/workflows/ci.yml`](./.github/workflows/ci.yml).

---

## Reference

All product decisions, architecture choices, security requirements, and roadmap are documented
in the [`/docs`](./docs) folder. Source of truth: [`docs/00_MASTER_INDEX.md`](./docs/00_MASTER_INDEX.md).
