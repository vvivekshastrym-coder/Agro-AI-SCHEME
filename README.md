# Agro AI Scheme (ಆಗ್ರೋ ಎಐ ಸ್ಕೀಮ್)

Farmer-first government scheme intelligence, deterministic eligibility rules engine, deadline guardian, and benefit passport platform.

> **Disclaimer**: Independent agricultural assistance platform — NOT an official government application. All scheme rules and deadlines must be verified against official government portals. Seeded schemes are clearly flagged `DEMO / MOCK`.

## Architecture & Monorepo Layout
- `apps/web` — Next.js 15 (App Router, TypeScript) Farmer Benefit Passport, Scheme Matcher, What-If Simulator, Deadline Guardian, Account/Consent settings, and Maker-Checker Reviewer Portal (Kannada-first + English)
- `apps/api` — Backend REST API, Authentication, RBAC + Scoped Share Authorization, Farmer Passport, Scheme Governance, and Provider Adapters
- `apps/worker` — Deadline Guardian reminder processor with idempotency deduplication
- `packages/shared` — Shared Zod schemas, RBAC constants, provenance types, area converters
- `packages/rules-engine` — Pure deterministic JSON DSL eligibility evaluator (100% unit-tested)
- `packages/i18n` — Kannada (`kn`), English (`en`), and Hindi (`hi`) translations
- `packages/ui` — Brand tokens, truthful deadline formatter, provenance & DEMO badges
- `infra/docker-compose.yml` — PostgreSQL 16 (PostGIS), Redis 7, MinIO, Mailpit

## Local Setup & Verification Commands

```bash
# 1. Copy environment variables
cp .env.example .env

# 2. Install dependencies
npm install

# 3. Generate DB store & seed 3 DEMO schemes
npm run build
npm run db:migrate
npm run db:seed

# 4. Run lint, typecheck, unit/integration tests, and production build
npm run lint
npm run typecheck
npm test
npm run build
```
