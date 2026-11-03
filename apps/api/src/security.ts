import { z } from "zod";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// ============================================================================
// 1. Zod Environment Validation at Boot (Section 10.1 & Phase 0)
// ============================================================================

export const EnvConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().default("file:./dev.db"),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32)
    .default("agro_dev_access_secret_minimum_32_characters_long_012345"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32)
    .default("agro_dev_refresh_secret_minimum_32_characters_long_012345"),
  CSRF_SECRET: z
    .string()
    .min(32)
    .default("agro_dev_csrf_secret_minimum_32_characters_long_012345"),
  FIELD_ENCRYPTION_KEY: z
    .string()
    .length(64)
    .default("0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  SMS_PROVIDER: z.enum(["mock", "msg91", "twilio"]).default("mock"),
  EMAIL_PROVIDER: z.enum(["mock", "resend", "ses"]).default("mock"),
  LLM_PROVIDER: z.enum(["mock", "claude", "gemini", "openai"]).default("mock"),
  STT_PROVIDER: z.enum(["mock", "bhashini", "web_speech"]).default("web_speech"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  MANDI_API_KEY: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_APP_SECRET: z
    .string()
    .min(16)
    .default("agro_dev_whatsapp_app_secret_012345"),
  WHATSAPP_VERIFY_TOKEN: z
    .string()
    .min(8)
    .default("agro_dev_whatsapp_verify_token"),
});

export type EnvConfig = z.infer<typeof EnvConfigSchema>;

export function loadEnvConfig(rawEnv: NodeJS.ProcessEnv = process.env): EnvConfig {
  const mergedEnv: Record<string, string | undefined> = {};
  if (rawEnv === process.env) {
    const candidateFiles = [
      path.resolve(process.cwd(), ".env"),
      path.resolve(process.cwd(), "../../.env"),
    ];
    for (const file of candidateFiles) {
      if (fs.existsSync(file)) {
        try {
          const content = fs.readFileSync(file, "utf8");
          for (const rawLine of content.split(/\r?\n/)) {
            const line = rawLine.trim();
            if (!line || line.startsWith("#")) continue;
            const eqIdx = line.indexOf("=");
            if (eqIdx <= 0) continue;
            const k = line.slice(0, eqIdx).trim();
            let v = line.slice(eqIdx + 1).trim();
            if (
              (v.startsWith('"') && v.endsWith('"')) ||
              (v.startsWith("'") && v.endsWith("'"))
            ) {
              v = v.slice(1, -1);
            }
            if (mergedEnv[k] === undefined) {
              mergedEnv[k] = v;
            }
          }
        } catch {
          // Ignore file read errors
        }
      }
    }
  }
  for (const [k, v] of Object.entries(rawEnv)) {
    if (v !== undefined) {
      mergedEnv[k] = v;
    }
  }

  const parsed = EnvConfigSchema.safeParse(mergedEnv);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment configuration: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`
    );
  }
  return parsed.data;
}

// ============================================================================
// 2. UUID v7 Generator (Time-ordered UUIDs per Section 5)
// ============================================================================

export function uuidv7(): string {
  const now = BigInt(Date.now());
  const bytes = crypto.randomBytes(16);

  // 48-bit timestamp in ms
  bytes[0] = Number((now >> 40n) & 0xffn);
  bytes[1] = Number((now >> 32n) & 0xffn);
  bytes[2] = Number((now >> 24n) & 0xffn);
  bytes[3] = Number((now >> 16n) & 0xffn);
  bytes[4] = Number((now >> 8n) & 0xffn);
  bytes[5] = Number(now & 0xffn);

  // Version 7 (0111)
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  // Variant RFC 4122 (10xx)
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;

  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

// ============================================================================
// 3. Field-Level Encryption & Hashing (Section 6)
// ============================================================================

export function encryptField(plaintext: string, hexKey: string): string {
  const key = Buffer.from(hexKey, "hex");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptField(ciphertext: string, hexKey: string): string {
  const parts = ciphertext.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted field format");
  }
  const [ivHex, tagHex, encHex] = parts;
  const key = Buffer.from(hexKey, "hex");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivHex!, "hex")
  );
  decipher.setAuthTag(Buffer.from(tagHex!, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encHex!, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

export function hashLookupToken(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

// ============================================================================
// 4. Password Hashing (scrypt/Argon2id-grade memory-hard KDF) + Breached Check
// ============================================================================

const COMMON_BREACHED_PASSWORDS = new Set([
  "password123",
  "1234567890",
  "qwertyuiop",
  "welcome123",
  "admin12345",
  "karnataka123",
  "farmer12345",
]);

export function isBreachedPassword(password: string): boolean {
  return COMMON_BREACHED_PASSWORDS.has(password.toLowerCase());
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto
    .scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 })
    .toString("hex");
  return `scrypt$16384$8$1$${salt}$${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const salt = parts[4]!;
  const expectedHex = parts[5]!;
  const derived = crypto.scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
  });
  const expectedBuf = Buffer.from(expectedHex, "hex");
  if (derived.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(derived, expectedBuf);
}

// ============================================================================
// 5. JWT Signing & Verification (15-min Access Token)
// ============================================================================

export interface AccessTokenPayload {
  sub: string;
  roles: string[];
  mfaVerified: boolean;
  iat: number;
  exp: number;
}

export function signAccessJwt(
  payload: Omit<AccessTokenPayload, "iat" | "exp">,
  secret: string,
  expiresInSeconds = 15 * 60
): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const fullPayload: AccessTokenPayload = {
    ...payload,
    iat: nowSec,
    exp: nowSec + expiresInSeconds,
  };
  const headerB64 = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  ).toString("base64url");
  const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString(
    "base64url"
  );
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url");
  return `${headerB64}.${payloadB64}.${signature}`;
}

export function verifyAccessJwt(
  token: string,
  secret: string
): AccessTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url");
  const sigBuf = Buffer.from(sigB64!);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const decoded = JSON.parse(
      Buffer.from(payloadB64!, "base64url").toString("utf8")
    ) as AccessTokenPayload;
    const nowSec = Math.floor(Date.now() / 1000);
    if (decoded.exp <= nowSec) return null;
    return decoded;
  } catch {
    return null;
  }
}

// ============================================================================
// 6. RFC 6238 TOTP MFA Implementation
// ============================================================================

export function generateTotpSecret(): string {
  return crypto.randomBytes(20).toString("hex");
}

export function computeTotpCode(
  secretHex: string,
  timestampMs: number = Date.now()
): string {
  const counter = Math.floor(timestampMs / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto
    .createHmac("sha1", Buffer.from(secretHex, "hex"))
    .update(buf)
    .digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const code =
    (((hmac[offset]! & 0x7f) << 24) |
      ((hmac[offset + 1]! & 0xff) << 16) |
      ((hmac[offset + 2]! & 0xff) << 8) |
      (hmac[offset + 3]! & 0xff)) %
    1_000_000;
  return code.toString().padStart(6, "0");
}

export function verifyTotpCode(
  secretHex: string,
  code: string,
  timestampMs: number = Date.now()
): boolean {
  for (const windowOffset of [-1, 0, 1]) {
    const candidate = computeTotpCode(
      secretHex,
      timestampMs + windowOffset * 30_000
    );
    if (candidate === code) return true;
  }
  return false;
}

// ============================================================================
// 7. PII-Redacted Structured Logger (Section 2 & 10.1)
// ============================================================================

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "token",
  "refreshtoken",
  "authorization",
  "phone",
  "surveynumber",
  "aadhaar",
  "otp",
  "totpcode",
  "secret",
]);

export function redactPii<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => redactPii(item)) as unknown as T;
  }
  const clone: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      clone[k] = "[REDACTED]";
    } else if (typeof v === "object" && v !== null) {
      clone[k] = redactPii(v);
    } else {
      clone[k] = v;
    }
  }
  return clone as T;
}

// ============================================================================
// 8. Private Object Storage Signed Expiring Links (5-minute TTL)
// ============================================================================

export function signPrivateFileToken(
  documentId: string,
  ownerId: string,
  secret: string,
  ttlSeconds = 300
): { token: string; expiresAtIso: string } {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = Buffer.from(
    JSON.stringify({ docId: documentId, ownerId, exp }),
    "utf8"
  ).toString("base64url");
  const sig = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  return {
    token: `${payload}.${sig}`,
    expiresAtIso: new Date(exp * 1000).toISOString(),
  };
}

export function verifyPrivateFileToken(
  token: string,
  secret: string
): { docId: string; ownerId: string; exp: number } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts as [string, string];
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
  if (sig.length !== expectedSig.length) return null;
  if (
    !crypto.timingSafeEqual(
      Buffer.from(sig, "utf8"),
      Buffer.from(expectedSig, "utf8")
    )
  ) {
    return null;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as { docId: string; ownerId: string; exp: number };
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}
