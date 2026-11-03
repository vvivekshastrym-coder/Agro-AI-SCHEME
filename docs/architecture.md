# Agro AI Scheme — Architecture Documentation

## 1. Monorepo Structure
- `apps/web`: Next.js (App Router, TypeScript) Farmer App, What-If Simulator, Deadline Guardian, Account/Consent settings, and Reviewer Governance Portal with first-class Kannada (`kn`) and English (`en`) support.
- `apps/api`: Modular API server with Zod environment validation, structured PII-redacted logging, security headers, rate limiting, OpenAPI (`/docs`), health (`/health`, `/ready`), RBAC + resource-level ownership/share authorization, Farmer Benefit Passport, and Scheme Intelligence services.
- `apps/worker`: Background queue processor for Deadline Guardian reminders with idempotency deduplication and unverified deadline suppression.
- `packages/shared`: Shared Zod schemas, RBAC roles/permissions, provenance enums, and area unit converters.
- `packages/rules-engine`: Pure, deterministic JSON DSL eligibility evaluator (`eq`, `in`, `gte`, `lte`, `between`, `exists`, `all`, `any`, `not`) with 100% table-driven test coverage.
- `packages/i18n`: Native Kannada (`kn`), English (`en`), and Hindi (`hi`) dictionaries.
- `packages/ui`: Brand tokens, truthful deadline formatting, provenance badges, and DEMO/MOCK truth label descriptors.
- `infra/docker-compose.yml`: Local stack for PostgreSQL 16 (PostGIS), Redis 7, MinIO (private S3 bucket), and Mailpit.

## 2. Core Design Rule
1. **Scheme data is data, not code**: Schemes, `scheme_versions`, `scheme_sources`, and `scheme_rules` live in the database and require maker-checker approval before publication.
2. **Deterministic eligibility**: Evaluated strictly by `@agro/rules-engine`. Missing facts always yield `NEEDS_VERIFICATION`.
3. **Bound AI explanations**: The `LlmProvider` adapter only receives the deterministic rule trace and verified source text, caches explanations per `(schemeVersionId, status, language)`, and can never alter the eligibility status.
