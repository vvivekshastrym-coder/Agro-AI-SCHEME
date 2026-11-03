# Agro AI Scheme: Build Plan

This document tracks the phased execution plan for Agro AI Scheme.

## Phases
- **Phase 0: Foundation** — Monorepo (`apps/web`, `apps/api`, `apps/worker`, `packages/shared`, `packages/rules-engine`, `packages/i18n`, `packages/ui`), Docker Compose, CI, lint/typecheck/test setup, env validation, health checks, i18n (en/kn/hi), design tokens.
- **Phase 1: Identity, RBAC, Audit** — Email/password + Phone OTP auth, Argon2id, HIBP check, access JWT + rotating refresh token with reuse detection, TOTP MFA + backup codes, staff invitations, account deletion, `consent_records`, append-only `audit_logs`, CASL RBAC + resource ownership & `authorized_shares`, `document_access_logs`, auth & security UI in English & Kannada.
- **Phase 2: Farmer Profile (Farmer Benefit Passport)** — Farmer profile, farms, multiple plots (survey number, area + unit, ownership/tenancy, optional boundary), crop seasons & crop records, provenance badges (`FARMER_ENTERED`, `OCR_EXTRACTED_CONFIRMED`, `OFFICIALLY_VERIFIED`, `CSC_ENTERED`), profile completeness score, family helper invitations via `authorized_shares`, Karnataka district/taluk/village reference data, voice-to-fill stub via `SttProvider` mock.
- **Phase 3: Scheme Intelligence** — Scheme catalogue, `scheme_versions` workflow (`DRAFT` -> `IN_REVIEW` -> `APPROVED` -> `PUBLISHED` -> `ARCHIVED`) with maker-checker enforcement, `scheme_sources`, `scheme_rules` JSON DSL, `packages/rules-engine` pure deterministic evaluator (100% unit test coverage), eligibility evaluation snapshots (`rule_evaluations`), Matcher UI + Compare + What-If simulator, Reviewer portal (`/reviewer`), Deadline Guardian + reminders, LLM explanation service with source-bound prompt + caching + mock badge.
- **Phase 4: Documents + Scam Shield**
- **Phase 5: Crop Insurance**
- **Phase 6: WhatsApp + Voice**
- **Phase 7: Portals**
- **Phase 8: Advanced Intelligence**
- **Phase 9: Bank & Benefit Intelligence**
- **Phase 10: Production Readiness**
