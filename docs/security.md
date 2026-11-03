# Agro AI Scheme — Security & Compliance Controls (Phase 1)

## 1. Authentication & Session Controls
- **Password Security**: Minimum 10 characters, checked against known breached passwords, hashed with memory-hard `scrypt` (`N=16384, r=8, p=1`) + per-user random 128-bit salt and timing-safe comparison.
- **User Enumeration Resistance**: Login and signup endpoints return generic messages and identical HTTP status codes for unknown accounts vs invalid credentials.
- **Lockout & Rate Limiting**: Per-IP rate limiting and progressive account lockout after 5 failed password attempts (15-minute lockout window).
- **Access & Refresh Tokens**: Short-lived access JWT (15 minutes) paired with rotating refresh tokens stored as SHA-256 hashes in `sessions` with `tokenFamilyId`.
- **Refresh-Token Reuse Detection**: Presenting a previously rotated/revoked refresh token immediately revokes the entire `tokenFamilyId` and writes a `REFRESH_TOKEN_REUSE_FAMILY_REVOKED` audit log entry.
- **Mandatory Staff MFA**: RFC 6238 TOTP MFA with single-use hashed backup codes is mandatory for `PLATFORM_ADMIN`, `SECURITY_AUDITOR`, `SCHEME_REVIEWER`, and `DEPARTMENT_OFFICER`.
- **Phone OTP Login for Farmers**: Supports +91 mobile OTP login via `SmsProvider` adapter (`isMock=true` in local dev). Platform login OTP only — bank OTPs are never requested or stored.

## 2. Authorization & Resource Isolation
- **Server-Side Enforcement**: Every farmer resource endpoint invokes `authorizeFarmerResourceAccess(actorId, ownerId, requiredScope)`.
- **No Blanket Admin/CSC Access**: Farmer B, unshared helpers, and CSC operators without an active, unexpired `authorized_share` for the specific scope (`profile:read`, `plots:write`, `schemes:read`, `documents:read`) receive `403 Forbidden`.
- **Maker-Checker Governance**: In `/reviewer`, the author of a `scheme_version` (`authorId`) is blocked (`403 Forbidden`) from approving or publishing their own version.

## 3. Data Privacy & DPDP Act 2023 Compliance
- **Zero Forbidden Identifiers**: Aadhaar numbers, bank passwords, UPI/ATM PINs, bank OTPs, and full account numbers are never collected or stored.
- **Field-Level Encryption**: Phone numbers, MFA secrets, and plot survey numbers are encrypted at rest with AES-256-GCM (`encryptField` / `decryptField`).
- **Explicit Consent Records**: `consent_records` tracks `TERMS`, `PRIVACY_POLICY`, and `DPDP_DATA_PROCESSING` versions and timestamps.
- **Account Deletion**: Self-service deletion request revokes active sessions immediately and starts a 30-day grace period before purge.
- **Append-Only Audit Log**: Sensitive actions and authorization denials are recorded in `audit_logs` with PII redaction (`redactPii`).
