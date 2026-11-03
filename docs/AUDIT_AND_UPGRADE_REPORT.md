# Agro AI Scheme — Production Audit & Upgrade Report

## 1. Removed Mock, Hardcoded & Silent Fallback Data from Production Paths

| Location | Removed / Upgraded Path | Production Behavior (`NODE_ENV=production`) |
|---|---|---|
| `apps/api/src/platform.service.ts` (`constructor` & `assertDemoAllowed`) | Removed unconditional startup seeding of `[DEMO]` schemes (`DEMO-KA-DRIP-01`, `DEMO-CROP-INS-02`, `DEMO-ALLIED-DAIRY-03`) in production. | `NODE_ENV === "production"` starts with zero demo/mock schemes and blocks `getOrCreateDemoSession` and `/api/v1/whatsapp/simulate` with `403 FORBIDDEN_IN_PRODUCTION` + audit event `PRODUCTION_GUARD_BLOCKED_DEMO_DATA`. |
| `apps/api/src/platform.service.ts` (`requestPhoneOtp`) | Removed unconditional exposure of `demoOtpPreview` in API responses. | In `production`, `demoOtpPreview` is strictly `undefined` so OTP codes are never leaked in HTTP responses. |
| `apps/api/src/platform.service.ts` (`submitClaimPackage`) | Removed silent fabrication of `DEMO-ACK-*` acknowledgement numbers in production. | In `production`, requires an explicit user- or CSC-provided official portal acknowledgement number or rejects with `400 ValidationError`. |
| `apps/api/src/platform.service.ts` (`getFarmerBenefitsAndLedger`) | Removed hardcoded ₹18,500 / ₹42,000 demo benefit pipeline rows from production responses. | In `production`, returns `isMock: false`, `benefitPipeline: []`, and `bankLinkStatus: "UNAVAILABLE_MANUAL_CHECK"`. |
| `apps/web/src/app/LoginSecurityModal.tsx` | Removed hardcoded initial OTP `"492810"` and removed silent fallback to `"local-farmer"` / `"Shivanna Gowda"` when OTP verification fails. | Starts with empty OTP input `""`, uses WebOTP (`OTPCredential`) + `sms-otp-form`, and displays honest error/unavailable banners if verification fails. |
| `apps/web/src/app/page.tsx` & `packages/i18n/src/index.ts` | Removed mixed-language parentheticals (`(Agro AI Scheme)`, `(Easy)`, `(Opportunity & Risk Radar)`, `LIVE SIGNALS FROM PROFILE`) and removed the Next.js `"N"` dev indicator button. | 100% pure Kannada (`kn`), 100% pure English (`en`), and 100% pure Hindi (`hi`) across every screen, card, and modal. |

---

## 2. Real Sources Integrated vs. Sources Awaiting External Access

| Integration / Data Source | Status | Freshness & Provenance Metadata Recorded | Required for Live External Feed |
|---|---|---|---|
| **Deterministic Scheme Rules Engine & Versioned Scheme Store** (`@agro/rules-engine` + `apps/api`) | **LIVE** | `sourceUrl`, `sourceProvider`, `retrievedAtIso`, `sourceLastVerifiedAt`, `effectiveDateIso`, `dataVersion`, `freshnessStatus` (`VERIFIED_FRESH` \| `STALE_REVERIFY_REQUIRED` \| `UNVERIFIED_SOURCE`). | Active now. Maker-Checker reviewer workflow (`createSchemeDraft` → `approveAndPublishSchemeVersion`) enforces two-person verification. |
| **Voice-First Speech I/O (W3C Web Speech STT + SpeechSynthesis TTS)** | **LIVE** | Records `inputMode: "VOICE" \| "TEXT"` and language (`kn-IN`, `en-IN`, `hi-IN`). | Active in supported browsers with text fallback. |
| **Consent-Gated Private Document Vault & Malware Scanner** | **LIVE** | Records `sha256Hash`, `malwareScanStatus: "CLEAN"`, `consentGranted`, `uploadedByActorId`, and 5-minute HMAC-signed access URLs. | Active now. Blocks `.apk`, `.exe`, `.bat`, `.sh`, `<script>`, and EICAR signatures. |
| **Server-Side OpenAI Agro GPT Copilot** (`/api/v1/farmers/:id/assistant/chat`) | **LIVE (Grounded Engine) / AWAITING_CREDENTIALS (`OPENAI_API_KEY`)** | Cites `schemeCode`, `sourceUrl`, `lastVerifiedAt`, `freshnessStatus`, and `freshnessWarning` (warns when source > 30 days old). Enforces confirmation-before-write token gate (`confirmAgroGptAction`). | Set `OPENAI_API_KEY=sk-...` in server `.env` to switch from deterministic grounded engine to live OpenAI generation. |
| **Government Application & Claim Status Portals (FRUITS / Samrakshane / PMFBY)** | **MANUAL_WORKFLOW (`MANUAL_UPDATE`)** | Every case status entry records `sourceMode: "MANUAL_UPDATE"`, `enteredByActorId`, `enteredByRole` (`FARMER` or `CSC_OPERATOR`), `enteredByName`, and `timestampIso`. | Requires official state/central department API credentials and partner IP allowlisting. |
| **WhatsApp Business Cloud API** (`/api/v1/whatsapp/webhook`) | **AWAITING_APPROVAL (`WHATSAPP_ACCESS_TOKEN`)** | Verifies `X-Hub-Signature-256` HMAC, deduplicates by `wamid`, enforces 24-hour customer-care window, and honors `STOP` / `ನಿಲ್ಲಿಸಿ` opt-out. | Requires approved Meta WhatsApp Business Account (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`). |

---

## 3. Security & Privacy Controls Verified

1. **Authentication & OTP Controls**:
   - Mobile OTP challenges hashed with SHA-256 (`hashLookupToken`), 5-minute expiry, and max 5 verification attempts before lockout.
   - Rotating refresh tokens with token-family reuse detection (`REFRESH_TOKEN_REUSE_FAMILY_REVOKED`).
   - Mandatory TOTP 2FA (`setupTotpMfa`) for privileged staff roles (`PLATFORM_ADMIN`, `SCHEME_REVIEWER`, `DEPARTMENT_OFFICER`, `SECURITY_AUDITOR`).
2. **Strict Role-Based & Resource-Level Authorization**:
   - `authorizeFarmerResourceAccess` enforces that a user is either the resource owner (`farmerId`) or holds an active, unexpired, unrevoked `authorized_share` with the exact scope (`profile:read`, `plots:read`, `plots:write`, `schemes:read`, `documents:read`, `cases:read`, `cases:write`).
   - Platform admins and CSC operators do **not** get blanket access to farmer records without explicit farmer consent.
3. **Upload Validation, Malware Scan & Expiring Links**:
   - Validates MIME (`application/pdf`, `image/jpeg`, `image/png`, `image/webp`) and size (`<= 5 MB`), blocks executable/script payloads, and issues 5-minute HMAC-signed access tokens (`signPrivateFileToken`).
4. **PII-Redacted Append-Only Audit Logs**:
   - All sensitive actions are recorded in immutable (`Object.freeze`) audit log records and redacted via `redactPii` before export.

---

## 4. Reliability, Circuit Breakers & Verified Backup/Restore

- **`executeWithReliabilityGuard`**:
  - Enforces configurable per-call timeouts (`timeoutMs`).
  - Performs bounded retries with backoff **only** when `isIdempotent: true` (never retries non-idempotent submissions/writes).
  - Opens a per-provider circuit breaker for 60 seconds after 3 consecutive failures (`CIRCUIT_BREAKER_OPEN`).
- **`createVerifiedBackupSnapshot` & `restoreVerifiedBackupSnapshot`**:
  - Generates a full JSON state snapshot with a SHA-256 integrity checksum (`sha256Checksum`).
  - Verifies the SHA-256 checksum prior to restore and rejects tampered payloads (`BACKUP_RESTORE_REJECTED_CHECKSUM_MISMATCH`).
