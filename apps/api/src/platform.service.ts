import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { AgroEnterpriseService } from "./enterprise.service.js";
import { AgroAlertEngineService } from "./alert.service.js";
import { AgroLocationService } from "./location.service.js";
import {
  compareDocumentXRay,
  convertToHectares,
  inspectSuspiciousMessage,
  SCHEDULED_INDIAN_LANGUAGES,
  STAFF_MFA_REQUIRED_ROLES,
  SUBSIDY_BEFORE_PURCHASE_CATALOGUE,
  type AreaUnit,
  type AuthorizedShareCreateInput,
  type CropRecordCreateInput,
  type DocumentXRayResult,
  type FactProvenance,
  type FarmExpenseEntryInput,
  type FarmerProfileUpdateInput,
  type PlotCreateInput,
  type Role,
  type ScamInspectionResult,
  type SchemeVersionStatus,
  type ShareScope,
  type SignupInput,
  type StaffInvitationAcceptInput,
  type StaffInvitationCreateInput,
  type SupportedLanguage,
} from "@agro/shared";
import {
  evaluateSchemeEligibility,
  SchemeRuleNodeSchema,
  type EligibilityEvaluationResult,
  type FarmerFactSet,
  type SchemeRuleNode,
} from "@agro/rules-engine";
import {
  computeTotpCode,
  decryptField,
  encryptField,
  generateTotpSecret,
  hashLookupToken,
  hashPassword,
  isBreachedPassword,
  loadEnvConfig,
  signAccessJwt,
  signPrivateFileToken,
  uuidv7,
  verifyPassword,
  verifyPrivateFileToken,
  verifyTotpCode,
  type EnvConfig,
} from "./security.js";
import {
  CachedMockLlmProvider,
  MockBhashiniSttProvider,
  MockEmailProvider,
  MockSmsProvider,
  TwilioWhatsAppProvider,
  type LlmExplanationOutput,
  type WhatsAppSendResult,
} from "./adapters.js";

// ============================================================================
// Reference Data: Karnataka Districts / Taluks / Villages (Clearly Labelled)
// ============================================================================

export interface KarnatakaLocationRef {
  districtCode: string;
  districtNameEn: string;
  districtNameKn: string;
  talukCode: string;
  talukNameEn: string;
  talukNameKn: string;
  villageCode: string;
  villageNameEn: string;
  villageNameKn: string;
  isDemoReference: boolean;
}

export const KARNATAKA_LOCATIONS: KarnatakaLocationRef[] = [
  {
    districtCode: "KA-MYS",
    districtNameEn: "Mysuru",
    districtNameKn: "ಮೈಸೂರು",
    talukCode: "KA-MYS-HDK",
    talukNameEn: "Heggadadevankote (H.D. Kote)",
    talukNameKn: "ಹೆಗ್ಗಡದೇವನಕೋಟೆ",
    villageCode: "KA-MYS-HDK-001",
    villageNameEn: "hampapura",
    villageNameKn: "ಹಂಪಾಪುರ",
    isDemoReference: true,
  },
  {
    districtCode: "KA-MDY",
    districtNameEn: "Mandya",
    districtNameKn: "ಮಂಡ್ಯ",
    talukCode: "KA-MDY-MDU",
    talukNameEn: "Maddur",
    talukNameKn: "ಮದ್ದೂರು",
    villageCode: "KA-MDY-MDU-001",
    villageNameEn: "Besagarahalli",
    villageNameKn: "ಬೆಸಗರಹಳ್ಳಿ",
    isDemoReference: true,
  },
  {
    districtCode: "KA-DHW",
    districtNameEn: "Dharwad",
    districtNameKn: "ಧಾರವಾಡ",
    talukCode: "KA-DHW-NVL",
    talukNameEn: "Navalgund",
    talukNameKn: "ನವಲಗುಂದ",
    villageCode: "KA-DHW-NVL-001",
    villageNameEn: "Annigeri",
    villageNameKn: "ಅಣ್ಣಿಗೇರಿ",
    isDemoReference: true,
  },
  {
    districtCode: "KA-RCH",
    districtNameEn: "Raichur",
    districtNameKn: "ರಾಯಚೂರು",
    talukCode: "KA-RCH-SND",
    talukNameEn: "Sindhanur",
    talukNameKn: "ಸಿಂಧನೂರು",
    villageCode: "KA-RCH-SND-001",
    villageNameEn: "Turvihal",
    villageNameKn: "ತುರುವಿಹಾಳ",
    isDemoReference: true,
  },
];

// ============================================================================
// Domain Record Interfaces
// ============================================================================

export interface UserRecord {
  id: string;
  email: string | null;
  phoneEncrypted: string | null;
  phoneHash: string | null;
  passwordHash: string | null;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  deletionRequestedAt: string | null;
  deletionGraceEndsAt: string | null;
  roles: Role[];
  createdAt: string;
  updatedAt: string;
}

export type ExperienceMode = "AI_PREDICTION" | "NORMAL_APP";

export interface UserProfileRecord {
  id: string;
  userId: string;
  fullName: string;
  preferredLanguage: SupportedLanguage;
  experienceMode?: ExperienceMode;
  state: string;
  districtCode: string | null;
  talukCode: string | null;
  villageCode: string | null;
  farmerCategory: string | null;
  hasKccCard: boolean;
  livestockTypes: string[];
  elderOrLowLiteracyMode: boolean;
  provenance: FactProvenance;
  verifiedAt: string | null;
  updatedAt: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  tokenFamilyId: string;
  refreshTokenHash: string;
  userAgent: string;
  ipAddress: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface MfaRecord {
  userId: string;
  secretEncrypted: string;
  enabled: boolean;
  backupCodesHashed: string[];
  updatedAt: string;
}

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: "TERMS" | "PRIVACY_POLICY" | "DPDP_DATA_PROCESSING";
  policyVersion: string;
  grantedAt: string;
  revokedAt: string | null;
}

export interface StaffInvitationRecord {
  id: string;
  email: string;
  role: Role;
  departmentName: string | null;
  tokenHash: string;
  invitedById: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export interface AuthorizedShareRecord {
  id: string;
  ownerId: string;
  granteeId: string;
  granteeRole: "FAMILY_HELPER" | "CSC_OPERATOR";
  scopes: ShareScope[];
  purpose: string;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface DocumentAccessLogRecord {
  id: string;
  documentId: string;
  ownerId: string;
  accessorId: string;
  shareId: string | null;
  action: string;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string;
  createdAt: string;
}

export interface FarmPlotRecord {
  id: string;
  ownerId: string;
  plotName: string;
  surveyNumberEncrypted: string;
  surveyNumberMasked: string;
  districtCode: string;
  talukCode: string;
  villageCode: string;
  areaValue: number;
  areaUnit: AreaUnit;
  areaHectares: number;
  ownershipType: string;
  irrigationType: string;
  soilType: string | null;
  boundaryGeoJson: string | null;
  provenance: FactProvenance;
  verifiedAt: string | null;
  createdAt: string;
}

export interface CropRecordItem {
  id: string;
  plotId: string;
  ownerId: string;
  season: string;
  year: number;
  cropCode: string;
  cropNameEn: string;
  cropNameKn: string;
  sownAreaHectares: number;
  sowingDate: string | null;
  isInsuredUnderPmfby: boolean;
  provenance: FactProvenance;
  createdAt: string;
}

export interface SchemeDeadlineRecord {
  id: string;
  schemeVersionId: string;
  titleEn: string;
  titleKn: string;
  windowType: "APPLICATION_CUTOFF" | "CLAIM_REPORTING" | "RENEWAL";
  dueDateIso: string | null;
  isVerified: boolean;
  sourceUrl: string;
  lastVerifiedAt: string | null;
}

export type SchemeFreshnessStatus =
  | "VERIFIED_FRESH"
  | "STALE_REVERIFY_REQUIRED"
  | "UNVERIFIED_SOURCE";

export interface SchemeFreshnessMetadata {
  freshnessStatus: SchemeFreshnessStatus;
  sourceProvider: string;
  retrievedAtIso: string | null;
  lastVerifiedAtIso: string | null;
  effectiveDateIso: string | null;
  dataVersion: string;
  ageDays: number | null;
  warningMessageEn: string | null;
  warningMessageKn: string | null;
  warningMessageHi: string | null;
}

export interface SchemeVersionRecord {
  id: string;
  schemeId: string;
  schemeCode: string;
  departmentName: string;
  versionNumber: number;
  status: SchemeVersionStatus;
  titleEn: string;
  titleKn: string;
  summaryEn: string;
  summaryKn: string;
  benefitsDescriptionEn: string;
  benefitsDescriptionKn: string;
  requiredDocumentsEn: string[];
  requiredDocumentsKn: string[];
  applicationStepsEn: string[];
  applicationStepsKn: string[];
  ruleTree: SchemeRuleNode;
  sourceUrl: string;
  sourceLastVerifiedAt: string | null;
  sourceVerifiedById: string | null;
  sourceProvider?: string;
  retrievedAtIso?: string | null;
  effectiveDateIso?: string | null;
  dataVersion?: string;
  authorId: string;
  approvedById: string | null;
  publishedAt: string | null;
  isMock: boolean;
  deadlines: SchemeDeadlineRecord[];
  createdAt: string;
}

export interface RuleEvaluationSnapshot {
  id: string;
  farmerId: string;
  schemeVersionId: string;
  factsSnapshot: FarmerFactSet;
  evaluation: EligibilityEvaluationResult;
  createdAt: string;
}

export interface ClaimEvidencePhotoItem {
  id: string;
  angle: "WIDE_FIELD" | "CLOSE_UP_DAMAGE" | "LANDMARK_SURVEY" | "RECEIPT_OR_TAG";
  capturedAtIso: string;
  latitude: number;
  longitude: number;
  gpsAccuracyMeters: number;
  blurVarianceScore: number;
  isBlurry: boolean;
  sha256Hash: string;
}

export interface CropLossClaimRecord {
  id: string;
  farmerId: string;
  plotId: string;
  cropCode: string;
  damageDateIso: string;
  causeOfDamage:
    | "EXCESS_RAINFALL"
    | "HAILSTORM"
    | "CYCLONE"
    | "DROUGHT"
    | "PEST_DISEASE";
  growthStage: "PRE_SOWING" | "STANDING_CROP" | "POST_HARVEST_DRYING";
  claimCategory:
    | "PREVENTED_SOWING"
    | "LOCALIZED_CALAMITY"
    | "MID_SEASON_ADVERSITY"
    | "POST_HARVEST_LOSS";
  reportingDeadlineNoteEn: string;
  reportingDeadlineNoteKn: string;
  isDeadlineVerified: boolean;
  status: "DRAFT" | "EVIDENCE_PENDING" | "PREPARED" | "SUBMITTED";
  readinessScore: number;
  evidencePhotos: ClaimEvidencePhotoItem[];
  submissionReceiptId: string | null;
  isMock: true;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionReceiptRecord {
  id: string;
  farmerId: string;
  referenceType: "INSURANCE_CLAIM" | "SCHEME_APPLICATION" | "CSC_SUBMISSION";
  referenceId: string;
  portalName: string;
  acknowledgementNumber: string;
  submittedAtIso: string;
  notes: string;
  provenance: FactProvenance;
  isMock: true;
}

export interface ScamReportRecord {
  id: string;
  reporterId: string | null;
  verdict: ScamInspectionResult["verdict"];
  suspiciousHosts: string[];
  hasApkTrap: boolean;
  hasPinOtpTrap: boolean;
  createdAt: string;
}

export interface FarmExpenseRecord {
  id: string;
  farmerId: string;
  category: FarmExpenseEntryInput["category"];
  amountInr: number;
  season: FarmExpenseEntryInput["season"];
  note: string;
  provenance: FactProvenance;
  createdAt: string;
}

export interface CscVisitTokenRecord {
  id: string;
  tokenCode: string;
  farmerId: string;
  farmerName: string;
  centreName: string;
  districtCode: string;
  purpose: string;
  checklistItems: string[];
  status: "BOOKED" | "IN_PROGRESS" | "COMPLETED";
  createdAt: string;
}

export interface WhatsAppMessageLogRecord {
  wamid: string;
  fromPhoneHash: string;
  farmerId: string | null;
  inboundText: string;
  selectedOption: string;
  replyTextKn: string;
  replyTextEn: string;
  within24hWindow: boolean;
  optedOut: boolean;
  handedOffToCsc: boolean;
  isMock: true;
  createdAt: string;
}

export interface ReminderPreferencesRecord {
  farmerId: string;
  inAppEnabled: boolean;
  whatsappEnabled: boolean;
  quietHoursStart: string; // e.g., "21:00"
  quietHoursEnd: string;   // e.g., "07:00"
  optedOut: boolean;
  updatedAt: string;
}

export interface ReminderDeliveryRecord {
  id: string;
  farmerId: string;
  deadlineId: string;
  schemeTitleEn: string;
  schemeTitleKn: string;
  dueDateIso: string;
  sourceUrl: string;
  lastVerifiedAt: string | null;
  channel: "IN_APP" | "WHATSAPP_GATED";
  status:
    | "DELIVERED"
    | "DEFERRED_QUIET_HOURS"
    | "SUPPRESSED_UNVERIFIED"
    | "SUPPRESSED_OPT_OUT";
  idempotencyKey: string;
  createdAt: string;
}

export type ManualCaseStatus =
  | "DRAFT_SAVED"
  | "SUBMITTED_MANUALLY"
  | "UNDER_REVIEW_REPORTED"
  | "CLARIFICATION_NEEDED"
  | "APPROVED_REPORTED"
  | "REJECTED_REPORTED";

export interface StatusHistoryEntry {
  id: string;
  status: ManualCaseStatus;
  sourceMode: "MANUAL_UPDATE";
  enteredByActorId: string;
  enteredByRole: string;
  enteredByName: string;
  note: string;
  timestampIso: string;
}

export interface StatusTrackingCaseRecord {
  id: string;
  farmerId: string;
  caseType: "SCHEME_APPLICATION" | "INSURANCE_CLAIM";
  referenceNumber: string;
  schemeOrPolicyTitle: string;
  currentStatus: ManualCaseStatus;
  sourceMode: "MANUAL_UPDATE";
  statusHistory: StatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface PrivateDocumentRecord {
  id: string;
  farmerId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  documentType:
    | "RTC_PAHANI"
    | "SOWING_CERTIFICATE"
    | "CLAIM_EVIDENCE"
    | "BANK_PASSBOOK_COVER"
    | "REJECTION_NOTICE";
  sha256Hash: string;
  malwareScanStatus: "CLEAN";
  consentGranted: boolean;
  uploadedByActorId: string;
  uploadedByRole: string;
  createdAt: string;
}

export interface AgroGptPendingActionRecord {
  confirmationToken: string;
  farmerId: string;
  actionType: "UPDATE_PROFILE_CROP" | "CREATE_STATUS_CASE" | "SET_REMINDER_PREFS";
  summaryEn: string;
  summaryKn: string;
  payload: Record<string, string>;
  expiresAtIso: string;
  confirmedAtIso: string | null;
}

// ============================================================================
// Core Platform Engine (Phases 0 through 8)
// ============================================================================

export class AgroPlatformService {
  public readonly config: EnvConfig;
  public readonly smsProvider = new MockSmsProvider();
  public readonly emailProvider = new MockEmailProvider();
  public readonly llmProvider = new CachedMockLlmProvider();
  public readonly sttProvider = new MockBhashiniSttProvider();
  public readonly twilioWhatsAppProvider: TwilioWhatsAppProvider;
  public readonly enterprise = new AgroEnterpriseService();
  public readonly alerts = new AgroAlertEngineService();
  public readonly location = new AgroLocationService();

  private readonly users = new Map<string, UserRecord>();
  private readonly profiles = new Map<string, UserProfileRecord>();
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly emailVerificationTokens = new Map<
    string,
    { userId: string; expiresAt: string; usedAt: string | null }
  >();
  private readonly passwordResetTokens = new Map<
    string,
    { userId: string; expiresAt: string; usedAt: string | null }
  >();
  private readonly otpChallenges = new Map<
    string,
    { otpHash: string; expiresAt: string; attempts: number }
  >();
  private readonly mfaSecrets = new Map<string, MfaRecord>();
  private readonly consents: ConsentRecord[] = [];
  private readonly invitations = new Map<string, StaffInvitationRecord>();
  private readonly shares = new Map<string, AuthorizedShareRecord>();
  private readonly documentAccessLogs: DocumentAccessLogRecord[] = [];
  private readonly auditLogs: AuditLogRecord[] = [];
  private readonly plots = new Map<string, FarmPlotRecord>();
  private readonly crops = new Map<string, CropRecordItem>();
  private readonly schemeVersions = new Map<string, SchemeVersionRecord>();
  private readonly ruleEvaluations: RuleEvaluationSnapshot[] = [];
  private readonly claims = new Map<string, CropLossClaimRecord>();
  private readonly receipts = new Map<string, SubmissionReceiptRecord>();
  private readonly scamReports: ScamReportRecord[] = [];
  private readonly expenses = new Map<string, FarmExpenseRecord>();
  private readonly cscTokens = new Map<string, CscVisitTokenRecord>();
  private readonly whatsappMessages = new Map<string, WhatsAppMessageLogRecord>();
  private readonly whatsappOptOuts = new Set<string>();
  private readonly reminderPrefs = new Map<string, ReminderPreferencesRecord>();
  private readonly reminderDeliveries = new Map<string, ReminderDeliveryRecord>();
  private readonly statusCases = new Map<string, StatusTrackingCaseRecord>();
  private readonly privateDocuments = new Map<string, PrivateDocumentRecord>();
  private readonly pendingAiActions = new Map<string, AgroGptPendingActionRecord>();
  private readonly circuitBreakers = new Map<
    string,
    {
      consecutiveFailures: number;
      openedUntilIso: string | null;
      lastError: string | null;
    }
  >();

  private readonly persistencePath?: string;

  constructor(config?: Partial<EnvConfig>, persistencePath?: string) {
    this.config = { ...loadEnvConfig(), ...config };
    this.twilioWhatsAppProvider = new TwilioWhatsAppProvider(
      this.config.TWILIO_ACCOUNT_SID,
      this.config.TWILIO_AUTH_TOKEN,
      this.config.TWILIO_WHATSAPP_FROM
    );
    this.persistencePath = persistencePath;
    if (this.persistencePath && fs.existsSync(this.persistencePath)) {
      this.loadFromDisk();
    } else if (this.config.NODE_ENV !== "production") {
      // Test/Dev isolation: Demo fixtures are NEVER seeded when NODE_ENV === "production"
      this.seedDemoCatalogueAndRoles();
      this.persistToDisk();
    }
  }

  /**
   * Production Environment Guard:
   * Prevents demo users, seed schemes, or simulated messages from entering or being invoked in production.
   */
  public assertDemoAllowed(operation: string): void {
    if (this.config.NODE_ENV === "production") {
      this.appendAudit({
        actorId: null,
        actorRole: "SYSTEM_GUARD",
        action: "PRODUCTION_GUARD_BLOCKED_DEMO_DATA",
        targetType: "ENVIRONMENT_GUARD",
        targetId: operation,
        metadata: { nodeEnv: this.config.NODE_ENV, operation },
      });
      throw new AuthorizationError(
        `FORBIDDEN_IN_PRODUCTION: '${operation}' is disabled in production to prevent demo/mock data contamination.`,
        403
      );
    }
  }

  /**
   * Computes real source freshness metadata for any scheme version record.
   * Marks records older than 30 days as STALE_REVERIFY_REQUIRED and missing verification as UNVERIFIED_SOURCE.
   */
  public computeSchemeFreshness(
    version: SchemeVersionRecord,
    nowMs = Date.now()
  ): SchemeFreshnessMetadata {
    const sourceProvider =
      version.sourceProvider ?? version.departmentName ?? "Official Gazette / Portal";
    const retrievedAtIso = version.retrievedAtIso ?? version.createdAt;
    const lastVerifiedAtIso = version.sourceLastVerifiedAt;
    const effectiveDateIso = version.effectiveDateIso ?? version.publishedAt;
    const dataVersion = version.dataVersion ?? `v${version.versionNumber}.0`;

    if (!lastVerifiedAtIso || !version.sourceUrl) {
      return {
        freshnessStatus: "UNVERIFIED_SOURCE",
        sourceProvider,
        retrievedAtIso,
        lastVerifiedAtIso,
        effectiveDateIso,
        dataVersion,
        ageDays: null,
        warningMessageEn:
          "Source verification date is missing — verify rules and deadlines directly on the official department portal before applying.",
        warningMessageKn:
          "ಮೂಲ ಪರಿಶೀಲಿಸಿದ ದಿನಾಂಕ ಲಭ್ಯವಿಲ್ಲ — ಅರ್ಜಿ ಸಲ್ಲಿಸುವ ಮೊದಲು ಅಧಿಕೃತ ಇಲಾಖೆ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ನೇರವಾಗಿ ಪರಿಶೀಲಿಸಿ.",
        warningMessageHi:
          "स्रोत सत्यापन तिथि उपलब्ध नहीं है — आवेदन करने से पहले आधिकारिक विभाग पोर्टल पर सीधे सत्यापित करें।",
      };
    }

    const verifiedMs = new Date(lastVerifiedAtIso).getTime();
    const ageDays = Math.max(
      0,
      Math.floor((nowMs - verifiedMs) / (24 * 3600 * 1000))
    );

    if (ageDays > 30) {
      return {
        freshnessStatus: "STALE_REVERIFY_REQUIRED",
        sourceProvider,
        retrievedAtIso,
        lastVerifiedAtIso,
        effectiveDateIso,
        dataVersion,
        ageDays,
        warningMessageEn: `Source record was last verified ${ageDays} days ago (>30 days) — re-verify current cutoff and guidelines on ${version.sourceUrl}.`,
        warningMessageKn: `ಮೂಲ ಮಾಹಿತಿಯನ್ನು ${ageDays} ದಿನಗಳ ಹಿಂದೆ ಪರಿಶೀಲಿಸಲಾಗಿದೆ (>30 ದಿನಗಳು) — ಪ್ರಸ್ತುತ ಗಡುವನ್ನು ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಮರು-ಪರಿಶೀಲಿಸಿ.`,
        warningMessageHi: `स्रोत रिकॉर्ड ${ageDays} दिन पहले सत्यापित किया गया था (>30 दिन) — आधिकारिक पोर्टल पर वर्तमान समय-सीमा को पुनः सत्यापित करें।`,
      };
    }

    return {
      freshnessStatus: "VERIFIED_FRESH",
      sourceProvider,
      retrievedAtIso,
      lastVerifiedAtIso,
      effectiveDateIso,
      dataVersion,
      ageDays,
      warningMessageEn: null,
      warningMessageKn: null,
      warningMessageHi: null,
    };
  }

  /**
   * Reliability Guard for External Integrations (Timeouts, Bounded Retries on Idempotent Actions Only, Circuit Breaker).
   * - Never retries non-idempotent write/submission actions.
   * - Opens a circuit breaker for 60s after 3 consecutive provider failures.
   */
  public async executeWithReliabilityGuard<T>(
    providerName: string,
    operationFn: () => Promise<T>,
    options: {
      timeoutMs?: number;
      maxAttempts?: number;
      isIdempotent: boolean;
    }
  ): Promise<T> {
    const breaker = this.circuitBreakers.get(providerName) ?? {
      consecutiveFailures: 0,
      openedUntilIso: null,
      lastError: null,
    };

    if (
      breaker.openedUntilIso &&
      new Date(breaker.openedUntilIso).getTime() > Date.now()
    ) {
      throw new ValidationError(
        `CIRCUIT_BREAKER_OPEN: External provider '${providerName}' is temporarily isolated until ${breaker.openedUntilIso}.`
      );
    }

    const timeoutMs = options.timeoutMs ?? 2500;
    const allowedAttempts = options.isIdempotent
      ? Math.max(1, Math.min(options.maxAttempts ?? 3, 5))
      : 1; // NEVER retry non-idempotent actions!

    let lastErr: Error = new Error("External call failed");

    for (let attempt = 1; attempt <= allowedAttempts; attempt++) {
      try {
        const result = await new Promise<T>((resolve, reject) => {
          const timer = setTimeout(() => {
            reject(
              new Error(
                `EXTERNAL_TIMEOUT: '${providerName}' exceeded ${timeoutMs}ms timeout`
              )
            );
          }, timeoutMs);
          operationFn()
            .then((val) => {
              clearTimeout(timer);
              resolve(val);
            })
            .catch((err) => {
              clearTimeout(timer);
              reject(err);
            });
        });

        this.circuitBreakers.set(providerName, {
          consecutiveFailures: 0,
          openedUntilIso: null,
          lastError: null,
        });
        return result;
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));
        if (attempt < allowedAttempts) {
          await new Promise((r) => setTimeout(r, 15 * attempt));
        }
      }
    }

    const nextFailures = breaker.consecutiveFailures + 1;
    const openedUntilIso =
      nextFailures >= 3
        ? new Date(Date.now() + 60 * 1000).toISOString()
        : null;

    this.circuitBreakers.set(providerName, {
      consecutiveFailures: nextFailures,
      openedUntilIso,
      lastError: lastErr.message,
    });

    this.appendAudit({
      actorId: null,
      actorRole: "RELIABILITY_GUARD",
      action: openedUntilIso
        ? "EXTERNAL_PROVIDER_CIRCUIT_OPENED"
        : "EXTERNAL_PROVIDER_CALL_FAILED",
      targetType: "EXTERNAL_PROVIDER",
      targetId: providerName,
      metadata: {
        consecutiveFailures: nextFailures,
        openedUntilIso,
        isIdempotent: options.isIdempotent,
        attemptsRun: allowedAttempts,
        error: lastErr.message,
      },
    });

    throw new ValidationError(
      `EXTERNAL_SERVICE_UNAVAILABLE (${providerName}): ${lastErr.message}`
    );
  }

  public getCircuitBreakerStatus(providerName: string) {
    return (
      this.circuitBreakers.get(providerName) ?? {
        consecutiveFailures: 0,
        openedUntilIso: null,
        lastError: null,
      }
    );
  }

  /**
   * Creates a cryptographically checksummed backup snapshot of all platform state
   * and verifies restore integrity before applying.
   */
  public createVerifiedBackupSnapshot(actorId: string): {
    createdAtIso: string;
    version: string;
    sha256Checksum: string;
    recordCounts: {
      users: number;
      plots: number;
      schemes: number;
      statusCases: number;
      auditLogs: number;
    };
    dataJson: string;
  } {
    this.requireRole(actorId, ["PLATFORM_ADMIN"]);
    const snapshot = {
      users: Array.from(this.users.entries()),
      profiles: Array.from(this.profiles.entries()),
      consents: this.consents,
      shares: Array.from(this.shares.entries()),
      plots: Array.from(this.plots.entries()),
      crops: Array.from(this.crops.entries()),
      schemeVersions: Array.from(this.schemeVersions.entries()),
      claims: Array.from(this.claims.entries()),
      receipts: Array.from(this.receipts.entries()),
      statusCases: Array.from(this.statusCases.entries()),
      privateDocuments: Array.from(this.privateDocuments.entries()),
    };
    const dataJson = JSON.stringify(snapshot);
    const sha256Checksum = crypto
      .createHash("sha256")
      .update(dataJson, "utf8")
      .digest("hex");
    const createdAtIso = new Date().toISOString();

    this.appendAudit({
      actorId,
      actorRole: "PLATFORM_ADMIN",
      action: "BACKUP_SNAPSHOT_CREATED",
      targetType: "BACKUP",
      targetId: sha256Checksum.slice(0, 16),
      metadata: { sha256Checksum },
    });

    return {
      createdAtIso,
      version: "2026.11.1",
      sha256Checksum,
      recordCounts: {
        users: this.users.size,
        plots: this.plots.size,
        schemes: this.schemeVersions.size,
        statusCases: this.statusCases.size,
        auditLogs: this.auditLogs.length,
      },
      dataJson,
    };
  }

  public restoreVerifiedBackupSnapshot(
    actorId: string,
    backup: {
      sha256Checksum: string;
      dataJson: string;
    }
  ): { restored: boolean; verifiedChecksum: string } {
    this.requireRole(actorId, ["PLATFORM_ADMIN"]);
    const computed = crypto
      .createHash("sha256")
      .update(backup.dataJson, "utf8")
      .digest("hex");

    if (computed !== backup.sha256Checksum) {
      this.appendAudit({
        actorId,
        actorRole: "PLATFORM_ADMIN",
        action: "BACKUP_RESTORE_REJECTED_CHECKSUM_MISMATCH",
        targetType: "BACKUP",
        targetId: null,
      });
      throw new ValidationError(
        "Backup integrity check failed: SHA-256 checksum mismatch."
      );
    }

    const raw = JSON.parse(backup.dataJson);
    this.plots.clear();
    for (const [k, v] of raw.plots ?? []) this.plots.set(k, v);
    this.crops.clear();
    for (const [k, v] of raw.crops ?? []) this.crops.set(k, v);
    this.statusCases.clear();
    for (const [k, v] of raw.statusCases ?? []) this.statusCases.set(k, v);

    this.appendAudit({
      actorId,
      actorRole: "PLATFORM_ADMIN",
      action: "BACKUP_RESTORE_VERIFIED",
      targetType: "BACKUP",
      targetId: computed.slice(0, 16),
    });

    return { restored: true, verifiedChecksum: computed };
  }

  private persistToDisk(): void {
    if (!this.persistencePath) return;
    const dir = path.dirname(this.persistencePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const snapshot = {
      users: Array.from(this.users.entries()),
      profiles: Array.from(this.profiles.entries()),
      sessions: Array.from(this.sessions.entries()),
      mfaSecrets: Array.from(this.mfaSecrets.entries()),
      consents: this.consents,
      shares: Array.from(this.shares.entries()),
      auditLogs: this.auditLogs,
      plots: Array.from(this.plots.entries()),
      crops: Array.from(this.crops.entries()),
      schemeVersions: Array.from(this.schemeVersions.entries()),
      ruleEvaluations: this.ruleEvaluations,
      claims: Array.from(this.claims.entries()),
      receipts: Array.from(this.receipts.entries()),
      scamReports: this.scamReports,
      expenses: Array.from(this.expenses.entries()),
      cscTokens: Array.from(this.cscTokens.entries()),
      whatsappMessages: Array.from(this.whatsappMessages.entries()),
      reminderPrefs: Array.from(this.reminderPrefs.entries()),
      reminderDeliveries: Array.from(this.reminderDeliveries.entries()),
      statusCases: Array.from(this.statusCases.entries()),
      privateDocuments: Array.from(this.privateDocuments.entries()),
      pendingAiActions: Array.from(this.pendingAiActions.entries()),
    };
    fs.writeFileSync(this.persistencePath, JSON.stringify(snapshot, null, 2), "utf8");
  }

  private loadFromDisk(): void {
    if (!this.persistencePath || !fs.existsSync(this.persistencePath)) return;
    try {
      const raw = JSON.parse(fs.readFileSync(this.persistencePath, "utf8"));
      for (const [k, v] of raw.users ?? []) this.users.set(k, v);
      for (const [k, v] of raw.profiles ?? []) this.profiles.set(k, v);
      for (const [k, v] of raw.sessions ?? []) this.sessions.set(k, v);
      for (const [k, v] of raw.mfaSecrets ?? []) this.mfaSecrets.set(k, v);
      this.consents.push(...(raw.consents ?? []));
      for (const [k, v] of raw.shares ?? []) this.shares.set(k, v);
      this.auditLogs.push(...(raw.auditLogs ?? []));
      for (const [k, v] of raw.plots ?? []) this.plots.set(k, v);
      for (const [k, v] of raw.crops ?? []) this.crops.set(k, v);
      for (const [k, v] of raw.schemeVersions ?? []) this.schemeVersions.set(k, v);
      this.ruleEvaluations.push(...(raw.ruleEvaluations ?? []));
      for (const [k, v] of raw.claims ?? []) this.claims.set(k, v);
      for (const [k, v] of raw.receipts ?? []) this.receipts.set(k, v);
      this.scamReports.push(...(raw.scamReports ?? []));
      for (const [k, v] of raw.expenses ?? []) this.expenses.set(k, v);
      for (const [k, v] of raw.cscTokens ?? []) this.cscTokens.set(k, v);
      for (const [k, v] of raw.whatsappMessages ?? []) this.whatsappMessages.set(k, v);
      for (const [k, v] of raw.reminderPrefs ?? []) this.reminderPrefs.set(k, v);
      for (const [k, v] of raw.reminderDeliveries ?? []) this.reminderDeliveries.set(k, v);
      for (const [k, v] of raw.statusCases ?? []) this.statusCases.set(k, v);
      for (const [k, v] of raw.privateDocuments ?? []) this.privateDocuments.set(k, v);
      for (const [k, v] of raw.pendingAiActions ?? []) this.pendingAiActions.set(k, v);
    } catch {
      this.seedDemoCatalogueAndRoles();
    }
  }

  // --------------------------------------------------------------------------
  // Append-Only Audit Logging (Section 4 & 6)
  // --------------------------------------------------------------------------

  private appendAudit(params: {
    actorId: string | null;
    actorRole: string | null;
    action: string;
    targetType: string;
    targetId: string | null;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
  }): AuditLogRecord {
    const entry: AuditLogRecord = Object.freeze({
      id: uuidv7(),
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      metadata: params.metadata ?? {},
      ipAddress: params.ipAddress ?? "127.0.0.1",
      createdAt: new Date().toISOString(),
    });
    this.auditLogs.push(entry);
    this.persistToDisk();
    return entry;
  }

  public getAuditLogs(actorId: string): ReadonlyArray<AuditLogRecord> {
    this.requireRole(actorId, ["PLATFORM_ADMIN", "SECURITY_AUDITOR"]);
    return [...this.auditLogs];
  }

  // --------------------------------------------------------------------------
  // CASL-Style RBAC & Resource-Level Authorization (Section 4)
  // --------------------------------------------------------------------------

  public requireUser(userId: string): UserRecord {
    const user = this.users.get(userId);
    if (!user || user.deletionRequestedAt !== null) {
      throw new AuthorizationError("Unauthorized or deactivated account", 401);
    }
    return user;
  }

  public requireRole(userId: string, allowedRoles: Role[]): UserRecord {
    const user = this.requireUser(userId);
    const hasRole = user.roles.some((r) => allowedRoles.includes(r));
    if (!hasRole) {
      this.appendAudit({
        actorId: userId,
        actorRole: user.roles.join(","),
        action: "AUTHZ_ROLE_DENIED",
        targetType: "ROLE_CHECK",
        targetId: null,
        metadata: { required: allowedRoles },
      });
      throw new AuthorizationError(
        `Forbidden: requires one of [${allowedRoles.join(", ")}]`,
        403
      );
    }
    return user;
  }

  /**
   * Enforces that `actorId` is either the resource `ownerId` OR holds an active,
   * unexpired, unrevoked `authorized_share` with the required `scope`.
   * Platform admins and CSC operators do NOT get blanket access to farmer data.
   */
  public authorizeFarmerResourceAccess(
    actorId: string,
    ownerId: string,
    requiredScope: ShareScope,
    documentIdForLog?: string
  ): { viaShareId: string | null } {
    const actor = this.requireUser(actorId);
    if (actorId === ownerId) {
      if (documentIdForLog) {
        this.documentAccessLogs.push({
          id: uuidv7(),
          documentId: documentIdForLog,
          ownerId,
          accessorId: actorId,
          shareId: null,
          action: requiredScope,
          createdAt: new Date().toISOString(),
        });
      }
      return { viaShareId: null };
    }

    const nowMs = Date.now();
    const matchingShare = Array.from(this.shares.values()).find(
      (s) =>
        s.ownerId === ownerId &&
        s.granteeId === actorId &&
        s.revokedAt === null &&
        new Date(s.expiresAt).getTime() > nowMs &&
        s.scopes.includes(requiredScope)
    );

    if (!matchingShare) {
      this.appendAudit({
        actorId,
        actorRole: actor.roles.join(","),
        action: "AUTHZ_RESOURCE_DENIED",
        targetType: "FARMER_DATA",
        targetId: ownerId,
        metadata: { requiredScope },
      });
      throw new AuthorizationError(
        "Forbidden: no active farmer-granted share for this scope",
        403
      );
    }

    if (documentIdForLog) {
      this.documentAccessLogs.push({
        id: uuidv7(),
        documentId: documentIdForLog,
        ownerId,
        accessorId: actorId,
        shareId: matchingShare.id,
        action: requiredScope,
        createdAt: new Date().toISOString(),
      });
    }

    this.appendAudit({
      actorId,
      actorRole: actor.roles.join(","),
      action: "SHARED_RESOURCE_ACCESSED",
      targetType: "FARMER_DATA",
      targetId: ownerId,
      metadata: { shareId: matchingShare.id, scope: requiredScope },
    });

    return { viaShareId: matchingShare.id };
  }

  // --------------------------------------------------------------------------
  // Phase 1: Authentication, Sessions, Refresh Rotation, OTP, MFA, Shares
  // --------------------------------------------------------------------------

  public async signupFarmer(
    input: SignupInput,
    ipAddress = "127.0.0.1"
  ): Promise<{
    userId: string;
    verificationToken: string;
    emailDelivery: { isMock: boolean };
  }> {
    if (isBreachedPassword(input.password)) {
      throw new ValidationError(
        "Password appears in known data breaches. Please choose a stronger passphrase."
      );
    }

    const normalizedEmail = input.email.toLowerCase().trim();
    const existing = Array.from(this.users.values()).find(
      (u) => u.email === normalizedEmail
    );
    if (existing) {
      // Do not leak enumeration details in error codes; return generic conflict
      throw new ValidationError("Unable to complete registration for this email.");
    }

    const userId = uuidv7();
    const nowIso = new Date().toISOString();
    const user: UserRecord = {
      id: userId,
      email: normalizedEmail,
      phoneEncrypted: null,
      phoneHash: null,
      passwordHash: hashPassword(input.password),
      emailVerifiedAt: null,
      phoneVerifiedAt: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      deletionRequestedAt: null,
      deletionGraceEndsAt: null,
      roles: ["FARMER"],
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    this.users.set(userId, user);

    const profile: UserProfileRecord = {
      id: uuidv7(),
      userId,
      fullName: input.fullName,
      preferredLanguage: input.preferredLanguage,
      state: "Karnataka",
      districtCode: "KA-MYS",
      talukCode: "KA-MYS-HDK",
      villageCode: "KA-MYS-HDK-001",
      farmerCategory: "SMALL",
      hasKccCard: false,
      livestockTypes: [],
      elderOrLowLiteracyMode: false,
      provenance: "FARMER_ENTERED",
      verifiedAt: null,
      updatedAt: nowIso,
    };
    this.profiles.set(userId, profile);

    // Record explicit DPDP consent records with versions & timestamps
    for (const [type, version] of [
      ["TERMS", input.acceptTermsVersion],
      ["PRIVACY_POLICY", input.acceptPrivacyVersion],
      ["DPDP_DATA_PROCESSING", input.acceptDataProcessingVersion],
    ] as const) {
      this.consents.push({
        id: uuidv7(),
        userId,
        consentType: type,
        policyVersion: version,
        grantedAt: nowIso,
        revokedAt: null,
      });
    }

    const rawVerifyToken = `${uuidv7()}-${uuidv7()}`;
    const tokenHash = hashLookupToken(rawVerifyToken);
    this.emailVerificationTokens.set(tokenHash, {
      userId,
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      usedAt: null,
    });

    const emailRes = await this.emailProvider.sendMail(
      normalizedEmail,
      "Verify your Agro AI Scheme account",
      `Verification token: ${rawVerifyToken}`
    );

    this.appendAudit({
      actorId: userId,
      actorRole: "FARMER",
      action: "USER_SIGNUP",
      targetType: "USER",
      targetId: userId,
      ipAddress,
    });

    return {
      userId,
      verificationToken: rawVerifyToken,
      emailDelivery: { isMock: emailRes.isMock },
    };
  }

  public verifyEmail(rawToken: string): { verified: boolean; userId: string } {
    const tokenHash = hashLookupToken(rawToken);
    const record = this.emailVerificationTokens.get(tokenHash);
    if (
      !record ||
      record.usedAt !== null ||
      new Date(record.expiresAt).getTime() < Date.now()
    ) {
      throw new ValidationError("Invalid or expired verification token");
    }
    record.usedAt = new Date().toISOString();
    const user = this.requireUser(record.userId);
    user.emailVerifiedAt = record.usedAt;
    user.updatedAt = record.usedAt;

    this.appendAudit({
      actorId: user.id,
      actorRole: user.roles.join(","),
      action: "EMAIL_VERIFIED",
      targetType: "USER",
      targetId: user.id,
    });

    return { verified: true, userId: user.id };
  }

  public loginWithEmail(params: {
    email: string;
    password: string;
    totpCode?: string;
    backupCode?: string;
    userAgent?: string;
    ipAddress?: string;
  }): {
    accessToken: string;
    refreshToken: string;
    sessionId: string;
    user: { id: string; email: string | null; roles: Role[]; fullName: string };
  } {
    const genericError = new AuthorizationError(
      "Invalid credentials or account locked",
      401
    );
    const normalizedEmail = params.email.toLowerCase().trim();
    const user = Array.from(this.users.values()).find(
      (u) => u.email === normalizedEmail
    );

    if (!user || !user.passwordHash || user.deletionRequestedAt !== null) {
      throw genericError;
    }

    if (user.lockedUntil && new Date(user.lockedUntil).getTime() > Date.now()) {
      this.appendAudit({
        actorId: user.id,
        actorRole: user.roles.join(","),
        action: "LOGIN_BLOCKED_LOCKOUT",
        targetType: "USER",
        targetId: user.id,
        ipAddress: params.ipAddress,
      });
      throw genericError;
    }

    const passwordValid = verifyPassword(params.password, user.passwordHash);
    if (!passwordValid) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }
      this.appendAudit({
        actorId: user.id,
        actorRole: user.roles.join(","),
        action: "LOGIN_FAILED_BAD_PASSWORD",
        targetType: "USER",
        targetId: user.id,
        metadata: { attempts: user.failedLoginAttempts },
        ipAddress: params.ipAddress,
      });
      throw genericError;
    }

    // Check mandatory MFA for staff roles (ADMIN, REVIEWER, OFFICER, AUDITOR)
    const requiresMfa = user.roles.some((r) =>
      STAFF_MFA_REQUIRED_ROLES.includes(r)
    );
    const mfaRecord = this.mfaSecrets.get(user.id);

    if (requiresMfa && (!mfaRecord || !mfaRecord.enabled)) {
      throw new AuthorizationError(
        "MFA_SETUP_REQUIRED: TOTP MFA is mandatory for this staff role",
        403
      );
    }

    let mfaVerified = false;
    if (mfaRecord && mfaRecord.enabled) {
      if (params.totpCode) {
        const rawSecret = decryptField(
          mfaRecord.secretEncrypted,
          this.config.FIELD_ENCRYPTION_KEY
        );
        if (!verifyTotpCode(rawSecret, params.totpCode)) {
          throw new AuthorizationError("Invalid MFA code", 401);
        }
        mfaVerified = true;
      } else if (params.backupCode) {
        const backupHash = hashLookupToken(params.backupCode);
        const idx = mfaRecord.backupCodesHashed.indexOf(backupHash);
        if (idx === -1) {
          throw new AuthorizationError("Invalid MFA backup code", 401);
        }
        mfaRecord.backupCodesHashed.splice(idx, 1);
        mfaVerified = true;
      } else {
        throw new AuthorizationError("MFA_CODE_REQUIRED", 401);
      }
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;

    return this.issueSessionTokens(
      user,
      mfaVerified,
      params.userAgent ?? "AgroWeb/1.0",
      params.ipAddress ?? "127.0.0.1"
    );
  }

  private issueSessionTokens(
    user: UserRecord,
    mfaVerified: boolean,
    userAgent: string,
    ipAddress: string,
    existingTokenFamilyId?: string
  ) {
    const tokenFamilyId = existingTokenFamilyId ?? uuidv7();
    const rawRefreshToken = `rt_${uuidv7()}_${uuidv7()}`;
    const refreshTokenHash = hashLookupToken(rawRefreshToken);
    const sessionId = uuidv7();
    const nowIso = new Date().toISOString();

    const session: SessionRecord = {
      id: sessionId,
      userId: user.id,
      tokenFamilyId,
      refreshTokenHash,
      userAgent,
      ipAddress,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      revokedAt: null,
      createdAt: nowIso,
    };
    this.sessions.set(sessionId, session);

    const accessToken = signAccessJwt(
      {
        sub: user.id,
        roles: user.roles,
        mfaVerified,
      },
      this.config.JWT_ACCESS_SECRET
    );

    const profile = this.profiles.get(user.id);
    this.appendAudit({
      actorId: user.id,
      actorRole: user.roles.join(","),
      action: "SESSION_ISSUED",
      targetType: "SESSION",
      targetId: sessionId,
      ipAddress,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      sessionId,
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles,
        fullName: profile?.fullName ?? "Farmer",
      },
    };
  }

  /**
   * Rotating refresh token with reuse detection:
   * If a previously rotated/revoked refresh token is presented again,
   * the entire tokenFamilyId is immediately revoked.
   */
  public rotateRefreshToken(
    rawRefreshToken: string,
    userAgent = "AgroWeb/1.0",
    ipAddress = "127.0.0.1"
  ) {
    const hash = hashLookupToken(rawRefreshToken);
    const session = Array.from(this.sessions.values()).find(
      (s) => s.refreshTokenHash === hash
    );

    if (!session) {
      throw new AuthorizationError("Invalid refresh token", 401);
    }

    if (session.revokedAt !== null) {
      // REUSE DETECTED! Revoke every session in the same tokenFamilyId
      const nowIso = new Date().toISOString();
      for (const s of this.sessions.values()) {
        if (s.tokenFamilyId === session.tokenFamilyId && s.revokedAt === null) {
          s.revokedAt = nowIso;
        }
      }
      this.appendAudit({
        actorId: session.userId,
        actorRole: null,
        action: "REFRESH_TOKEN_REUSE_FAMILY_REVOKED",
        targetType: "TOKEN_FAMILY",
        targetId: session.tokenFamilyId,
        ipAddress,
      });
      throw new AuthorizationError(
        "Refresh token reuse detected; token family revoked",
        401
      );
    }

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      session.revokedAt = new Date().toISOString();
      throw new AuthorizationError("Refresh token expired", 401);
    }

    // Revoke current token and issue rotated token in same family
    session.revokedAt = new Date().toISOString();
    const user = this.requireUser(session.userId);
    const mfaRecord = this.mfaSecrets.get(user.id);
    return this.issueSessionTokens(
      user,
      Boolean(mfaRecord?.enabled),
      userAgent,
      ipAddress,
      session.tokenFamilyId
    );
  }

  public listActiveSessions(userId: string): SessionRecord[] {
    this.requireUser(userId);
    return Array.from(this.sessions.values()).filter(
      (s) => s.userId === userId && s.revokedAt === null
    );
  }

  public revokeSession(userId: string, sessionId: string): void {
    this.requireUser(userId);
    const session = this.sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      throw new AuthorizationError("Session not found", 404);
    }
    session.revokedAt = new Date().toISOString();
    this.appendAudit({
      actorId: userId,
      actorRole: "FARMER",
      action: "SESSION_REVOKED",
      targetType: "SESSION",
      targetId: sessionId,
    });
  }

  // Phone + SMS OTP Login for Farmers (Platform login OTP only)
  public async requestPhoneOtp(
    phone: string,
    preferredLanguage: SupportedLanguage = "kn"
  ): Promise<{ sent: boolean; isMock: boolean; demoOtpPreview?: string }> {
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const phoneHash = hashLookupToken(phone);
    this.otpChallenges.set(phoneHash, {
      otpHash: hashLookupToken(otp),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      attempts: 0,
    });
    const smsRes = await this.smsProvider.sendOtp(phone, otp, preferredLanguage);
    return {
      sent: smsRes.delivered,
      isMock: smsRes.isMock,
      // Production guard: never return OTP preview in production responses
      demoOtpPreview:
        smsRes.isMock && this.config.NODE_ENV !== "production" ? otp : undefined,
    };
  }

  public verifyPhoneOtpAndLogin(params: {
    phone: string;
    otp: string;
    fullName?: string;
    preferredLanguage?: SupportedLanguage;
    ipAddress?: string;
  }) {
    const phoneHash = hashLookupToken(params.phone);
    const challenge = this.otpChallenges.get(phoneHash);
    if (
      !challenge ||
      new Date(challenge.expiresAt).getTime() < Date.now() ||
      challenge.attempts >= 5
    ) {
      throw new AuthorizationError("OTP expired or too many attempts", 401);
    }
    challenge.attempts += 1;
    if (challenge.otpHash !== hashLookupToken(params.otp)) {
      throw new AuthorizationError("Invalid OTP code", 401);
    }
    this.otpChallenges.delete(phoneHash);

    let user = Array.from(this.users.values()).find(
      (u) => u.phoneHash === phoneHash
    );
    const nowIso = new Date().toISOString();

    if (!user) {
      const userId = uuidv7();
      user = {
        id: userId,
        email: null,
        phoneEncrypted: encryptField(
          params.phone,
          this.config.FIELD_ENCRYPTION_KEY
        ),
        phoneHash,
        passwordHash: null,
        emailVerifiedAt: null,
        phoneVerifiedAt: nowIso,
        failedLoginAttempts: 0,
        lockedUntil: null,
        deletionRequestedAt: null,
        deletionGraceEndsAt: null,
        roles: ["FARMER"],
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      this.users.set(userId, user);
      this.profiles.set(userId, {
        id: uuidv7(),
        userId,
        fullName: params.fullName ?? "ರೈತ ಮಿತ್ರ (Farmer)",
        preferredLanguage: params.preferredLanguage ?? "kn",
        state: "Karnataka",
        districtCode: "KA-MYS",
        talukCode: "KA-MYS-HDK",
        villageCode: "KA-MYS-HDK-001",
        farmerCategory: "SMALL",
        hasKccCard: false,
        livestockTypes: [],
        elderOrLowLiteracyMode: false,
        provenance: "FARMER_ENTERED",
        verifiedAt: null,
        updatedAt: nowIso,
      });
      this.consents.push({
        id: uuidv7(),
        userId,
        consentType: "DPDP_DATA_PROCESSING",
        policyVersion: "v1.0",
        grantedAt: nowIso,
        revokedAt: null,
      });
    }

    return this.issueSessionTokens(
      user,
      false,
      "AgroPhoneOTP/1.0",
      params.ipAddress ?? "127.0.0.1"
    );
  }

  // Password Reset (Revokes all sessions on reset)
  public async requestPasswordReset(email: string): Promise<{ token: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = Array.from(this.users.values()).find(
      (u) => u.email === normalizedEmail
    );
    const rawToken = `pwreset_${uuidv7()}`;
    if (user) {
      this.passwordResetTokens.set(hashLookupToken(rawToken), {
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        usedAt: null,
      });
      await this.emailProvider.sendMail(
        normalizedEmail,
        "Agro AI Scheme Password Reset",
        `Reset token: ${rawToken}`
      );
    }
    return { token: rawToken };
  }

  public resetPassword(rawToken: string, newPassword: string): void {
    if (isBreachedPassword(newPassword)) {
      throw new ValidationError("Choose a non-breached password (min 10 chars)");
    }
    const record = this.passwordResetTokens.get(hashLookupToken(rawToken));
    if (
      !record ||
      record.usedAt !== null ||
      new Date(record.expiresAt).getTime() < Date.now()
    ) {
      throw new ValidationError("Invalid or expired password reset token");
    }
    record.usedAt = new Date().toISOString();
    const user = this.requireUser(record.userId);
    user.passwordHash = hashPassword(newPassword);
    user.updatedAt = record.usedAt;

    // Revoke ALL active sessions on password reset
    for (const s of this.sessions.values()) {
      if (s.userId === user.id && s.revokedAt === null) {
        s.revokedAt = record.usedAt;
      }
    }

    this.appendAudit({
      actorId: user.id,
      actorRole: user.roles.join(","),
      action: "PASSWORD_RESET_ALL_SESSIONS_REVOKED",
      targetType: "USER",
      targetId: user.id,
    });
  }

  // TOTP MFA Setup & Verification
  public setupTotpMfa(userId: string): {
    secretHex: string;
    backupCodes: string[];
    sampleCurrentCode: string;
  } {
    this.requireUser(userId);
    const secretHex = generateTotpSecret();
    const backupCodes = Array.from({ length: 6 }, () =>
      `BC-${uuidv7().slice(0, 8).toUpperCase()}`
    );
    this.mfaSecrets.set(userId, {
      userId,
      secretEncrypted: encryptField(
        secretHex,
        this.config.FIELD_ENCRYPTION_KEY
      ),
      enabled: true,
      backupCodesHashed: backupCodes.map((c) => hashLookupToken(c)),
      updatedAt: new Date().toISOString(),
    });
    this.appendAudit({
      actorId: userId,
      actorRole: null,
      action: "MFA_TOTP_ENABLED",
      targetType: "USER",
      targetId: userId,
    });
    return {
      secretHex,
      backupCodes,
      sampleCurrentCode: computeTotpCode(secretHex),
    };
  }

  // Staff Invitations (Admin invites staff; staff sets password & MFA)
  public createStaffInvitation(
    adminId: string,
    input: StaffInvitationCreateInput
  ): { invitationId: string; rawToken: string } {
    this.requireRole(adminId, ["PLATFORM_ADMIN"]);
    const rawToken = `inv_${uuidv7()}`;
    const invitationId = uuidv7();
    this.invitations.set(hashLookupToken(rawToken), {
      id: invitationId,
      email: input.email.toLowerCase().trim(),
      role: input.role,
      departmentName: input.departmentName ?? null,
      tokenHash: hashLookupToken(rawToken),
      invitedById: adminId,
      expiresAt: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
      acceptedAt: null,
      createdAt: new Date().toISOString(),
    });
    this.appendAudit({
      actorId: adminId,
      actorRole: "PLATFORM_ADMIN",
      action: "STAFF_INVITATION_CREATED",
      targetType: "INVITATION",
      targetId: invitationId,
      metadata: { email: input.email, role: input.role },
    });
    return { invitationId, rawToken };
  }

  public acceptStaffInvitation(input: StaffInvitationAcceptInput): {
    userId: string;
    role: Role;
    mfaSetup: { secretHex: string; backupCodes: string[]; sampleCurrentCode: string };
  } {
    const inv = this.invitations.get(hashLookupToken(input.token));
    if (
      !inv ||
      inv.acceptedAt !== null ||
      new Date(inv.expiresAt).getTime() < Date.now()
    ) {
      throw new ValidationError("Invalid or expired staff invitation");
    }
    inv.acceptedAt = new Date().toISOString();
    const userId = uuidv7();
    const user: UserRecord = {
      id: userId,
      email: inv.email,
      phoneEncrypted: null,
      phoneHash: null,
      passwordHash: hashPassword(input.password),
      emailVerifiedAt: inv.acceptedAt,
      phoneVerifiedAt: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      deletionRequestedAt: null,
      deletionGraceEndsAt: null,
      roles: [inv.role],
      createdAt: inv.acceptedAt,
      updatedAt: inv.acceptedAt,
    };
    this.users.set(userId, user);
    this.profiles.set(userId, {
      id: uuidv7(),
      userId,
      fullName: input.fullName,
      preferredLanguage: "kn",
      state: "Karnataka",
      districtCode: "KA-MYS",
      talukCode: "KA-MYS-HDK",
      villageCode: "KA-MYS-HDK-001",
      farmerCategory: null,
      hasKccCard: false,
      livestockTypes: [],
      elderOrLowLiteracyMode: false,
      provenance: "OFFICIALLY_VERIFIED",
      verifiedAt: inv.acceptedAt,
      updatedAt: inv.acceptedAt,
    });
    const mfaSetup = this.setupTotpMfa(userId);
    return { userId, role: inv.role, mfaSetup };
  }

  // Authorized Shares (Scoped Family Helper & CSC Operator Access)
  public grantAuthorizedShare(
    ownerId: string,
    granteeUserId: string,
    input: Omit<AuthorizedShareCreateInput, "granteeEmailOrPhone">
  ): AuthorizedShareRecord {
    this.requireUser(ownerId);
    this.requireUser(granteeUserId);
    const id = uuidv7();
    const share: AuthorizedShareRecord = {
      id,
      ownerId,
      granteeId: granteeUserId,
      granteeRole: input.granteeRole,
      scopes: input.scopes,
      purpose: input.purpose,
      expiresAt: new Date(
        Date.now() + input.expiresInDays * 24 * 3600 * 1000
      ).toISOString(),
      revokedAt: null,
      createdAt: new Date().toISOString(),
    };
    this.shares.set(id, share);
    this.appendAudit({
      actorId: ownerId,
      actorRole: "FARMER",
      action: "AUTHORIZED_SHARE_GRANTED",
      targetType: "AUTHORIZED_SHARE",
      targetId: id,
      metadata: {
        granteeId: granteeUserId,
        scopes: input.scopes,
        expiresAt: share.expiresAt,
      },
    });
    return share;
  }

  public revokeAuthorizedShare(ownerId: string, shareId: string): void {
    const share = this.shares.get(shareId);
    if (!share || share.ownerId !== ownerId) {
      throw new AuthorizationError("Share not found", 404);
    }
    share.revokedAt = new Date().toISOString();
    this.appendAudit({
      actorId: ownerId,
      actorRole: "FARMER",
      action: "AUTHORIZED_SHARE_REVOKED",
      targetType: "AUTHORIZED_SHARE",
      targetId: shareId,
    });
  }

  public listAuthorizedShares(ownerId: string): AuthorizedShareRecord[] {
    this.requireUser(ownerId);
    return Array.from(this.shares.values()).filter(
      (s) => s.ownerId === ownerId
    );
  }

  // Account Deletion with 30-day grace period
  public requestAccountDeletion(userId: string): {
    deletionRequestedAt: string;
    gracePeriodEndsAt: string;
  } {
    const user = this.requireUser(userId);
    const now = new Date();
    const graceEnds = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
    user.deletionRequestedAt = now.toISOString();
    user.deletionGraceEndsAt = graceEnds.toISOString();
    for (const s of this.sessions.values()) {
      if (s.userId === userId && s.revokedAt === null) {
        s.revokedAt = user.deletionRequestedAt;
      }
    }
    this.appendAudit({
      actorId: userId,
      actorRole: user.roles.join(","),
      action: "ACCOUNT_DELETION_REQUESTED",
      targetType: "USER",
      targetId: userId,
    });
    return {
      deletionRequestedAt: user.deletionRequestedAt,
      gracePeriodEndsAt: user.deletionGraceEndsAt,
    };
  }

  // --------------------------------------------------------------------------
  // Phase 2: Farmer Benefit Passport, Multiple Plots, Crops, Completeness Score
  // --------------------------------------------------------------------------

  public getFarmerPassport(actorId: string, targetFarmerId: string) {
    this.authorizeFarmerResourceAccess(actorId, targetFarmerId, "profile:read");
    const profile = this.profiles.get(targetFarmerId);
    if (!profile) {
      throw new ValidationError("Farmer profile not found");
    }
    const plots = Array.from(this.plots.values()).filter(
      (p) => p.ownerId === targetFarmerId
    );
    const crops = Array.from(this.crops.values()).filter(
      (c) => c.ownerId === targetFarmerId
    );
    const locationRef = KARNATAKA_LOCATIONS.find(
      (l) => l.villageCode === profile.villageCode
    );

    // Compute deterministic completeness score (0-100)
    let score = 0;
    if (profile.fullName) score += 20;
    if (profile.districtCode && profile.talukCode && profile.villageCode) score += 25;
    if (profile.farmerCategory) score += 15;
    if (plots.length > 0) score += 20;
    if (crops.length > 0) score += 20;

    return {
      profile,
      locationRef: locationRef ?? null,
      plots,
      crops,
      completenessScore: score,
      totalLandHectares: Number(
        plots.reduce((acc, p) => acc + p.areaHectares, 0).toFixed(4)
      ),
    };
  }

  public updateFarmerProfile(
    actorId: string,
    targetFarmerId: string,
    input: FarmerProfileUpdateInput
  ): UserProfileRecord {
    this.authorizeFarmerResourceAccess(actorId, targetFarmerId, "profile:read");
    if (actorId !== targetFarmerId) {
      throw new AuthorizationError("Only the farmer can update core profile", 403);
    }
    const existing = this.profiles.get(targetFarmerId);
    if (!existing) {
      throw new ValidationError("Profile not found");
    }
    const updated: UserProfileRecord = {
      ...existing,
      fullName: input.fullName,
      preferredLanguage: input.preferredLanguage,
      state: input.state,
      districtCode: input.districtCode,
      talukCode: input.talukCode,
      villageCode: input.villageCode,
      farmerCategory: input.farmerCategory,
      hasKccCard: input.hasKccCard,
      livestockTypes: input.livestockTypes,
      elderOrLowLiteracyMode: input.elderOrLowLiteracyMode,
      provenance: input.provenance,
      updatedAt: new Date().toISOString(),
    };
    this.profiles.set(targetFarmerId, updated);
    this.appendAudit({
      actorId,
      actorRole: "FARMER",
      action: "FARMER_PROFILE_UPDATED",
      targetType: "PROFILE",
      targetId: targetFarmerId,
    });
    return updated;
  }

  /**
   * Updates the farmer's selected application experience mode ("AI_PREDICTION" | "NORMAL_APP")
   * on the same unified account and profile, preserving all plots, crops, documents, and cases.
   */
  public updateExperienceMode(
    actorId: string,
    targetFarmerId: string,
    experienceMode: ExperienceMode
  ): UserProfileRecord {
    this.authorizeFarmerResourceAccess(actorId, targetFarmerId, "profile:read");
    if (actorId !== targetFarmerId) {
      throw new AuthorizationError(
        "Only the account owner can change experience mode",
        403
      );
    }
    if (
      experienceMode !== "AI_PREDICTION" &&
      experienceMode !== "NORMAL_APP"
    ) {
      throw new ValidationError(
        "experienceMode must be 'AI_PREDICTION' or 'NORMAL_APP'"
      );
    }
    const existing = this.profiles.get(targetFarmerId);
    if (!existing) {
      throw new ValidationError("Profile not found");
    }
    const updated: UserProfileRecord = {
      ...existing,
      experienceMode,
      updatedAt: new Date().toISOString(),
    };
    this.profiles.set(targetFarmerId, updated);
    this.appendAudit({
      actorId,
      actorRole: "FARMER",
      action: "EXPERIENCE_MODE_UPDATED",
      targetType: "PROFILE",
      targetId: targetFarmerId,
      metadata: { experienceMode },
    });
    this.persistToDisk();
    return updated;
  }

  /**
   * Returns a truthful, grounded Agricultural Intelligence Summary for the farmer's profile.
   * Never fabricates mandi prices, weather forecasts, or leaf-disease diagnoses:
   * - Deterministic scheme, crop-insurance, Document X-Ray, and Scam Shield insights are LIVE.
   * - External feeds requiring government/partner API credentials (Agmarknet Mandi, IMD Weather,
   *   Vision Leaf Disease) explicitly report UNAVAILABLE_AWAITING_INTEGRATION.
   */
  public async getAgriculturalIntelligenceSummary(
    actorId: string,
    targetFarmerId: string,
    language: SupportedLanguage = "kn"
  ) {
    this.authorizeFarmerResourceAccess(actorId, targetFarmerId, "profile:read");
    const passport = this.getFarmerPassport(actorId, targetFarmerId);
    const schemeMatches = await this.evaluateSchemesForFarmer(
      actorId,
      targetFarmerId,
      language
    );

    const notifiedCropsSet = new Set([
      "PADDY",
      "RAGI",
      "TUR",
      "MAIZE",
      "COTTON",
    ]);

    const deterministicCropInsights = passport.plots.map((plot) => {
      const plotCrops = passport.crops.filter((c) => c.plotId === plot.id);
      const primaryCrop = plotCrops[0]?.cropCode ?? "UNSPECIFIED";
      const isNotified = notifiedCropsSet.has(primaryCrop);
      return {
        plotId: plot.id,
        plotName: plot.plotName,
        surveyNumberMasked: plot.surveyNumberMasked,
        areaHectares: plot.areaHectares,
        irrigationType: plot.irrigationType,
        soilType: plot.soilType ?? "UNSPECIFIED",
        primaryCropCode: primaryCrop,
        isNotifiedForInsurance: isNotified,
        provenance: plot.provenance,
        recommendationEn: isNotified
          ? `Plot ${plot.surveyNumberMasked} (${plot.areaHectares} ha, ${primaryCrop}) matches notified seasonal crop criteria. Verify Hobli cutoff on Samrakshane.`
          : `Plot ${plot.surveyNumberMasked} (${plot.areaHectares} ha) has crop '${primaryCrop}'. Add or verify a notified seasonal crop to check crop-insurance eligibility.`,
        recommendationKn: isNotified
          ? `ತಾಕು ${plot.surveyNumberMasked} (${plot.areaHectares} ಹೆಕ್ಟೇರ್, ${primaryCrop}) ಅಧಿಸೂಚಿತ ಬೆಳೆ ವಿಮೆ ನಿಯಮಗಳಿಗೆ ಹೊಂದಿಕೆಯಾಗುತ್ತದೆ. ಸಂರಕ್ಷಣೆ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಗಡುವು ಪರಿಶೀಲಿಸಿ.`
          : `ತಾಕು ${plot.surveyNumberMasked} (${plot.areaHectares} ಹೆಕ್ಟೇರ್) ಬೆಳೆ '${primaryCrop}' ಹೊಂದಿದೆ. ಬೆಳೆ ವಿಮೆ ಅರ್ಹತೆ ಪರೀಕ್ಷಿಸಲು ಅಧಿಸೂಚಿತ ಬೆಳೆ ವಿವರ ಪರಿಶೀಲಿಸಿ.`,
        recommendationHi: isNotified
          ? `भूखंड ${plot.surveyNumberMasked} (${plot.areaHectares} हेक्टेयर, ${primaryCrop}) अधिसूचित फसल बीमा मानदंडों से मेल खाता है। आधिकारिक पोर्टल पर अंतिम तिथि जांचें।`
          : `भूखंड ${plot.surveyNumberMasked} (${plot.areaHectares} हेक्टेयर) में फसल '${primaryCrop}' दर्ज है। फसल बीमा पात्रता के लिए अधिसूचित फसल विवरण सत्यापित करें।`,
      };
    });

    return {
      generatedAtIso: new Date().toISOString(),
      experienceMode: passport.profile.experienceMode ?? "AI_PREDICTION",
      farmerId: targetFarmerId,
      completenessScore: passport.completenessScore,
      totalLandHectares: passport.totalLandHectares,
      deterministicCropInsights,
      matchedSchemesCount: schemeMatches.filter(
        (m) =>
          m.evaluation.status === "LIKELY_ELIGIBLE" ||
          m.evaluation.status === "POTENTIALLY_ELIGIBLE"
      ).length,
      capabilities: [
        {
          id: "scheme_matcher_ai",
          status: "LIVE",
          dataFreshness:
            schemeMatches[0]?.freshness.freshnessStatus ?? "VERIFIED_FRESH",
          titleEn: "Government Scheme Matcher & Rule Evaluator",
          titleKn: "ಸರ್ಕಾರಿ ಯೋಜನೆ ಹೊಂದಾಣಿಕೆ ಮತ್ತು ನಿಯಮ ವಿಶ್ಲೇಷಕ",
          titleHi: "सरकारी योजना मिलान और नियम मूल्यांकनकर्ता",
        },
        {
          id: "claim_copilot_evidence",
          status: "LIVE",
          dataFreshness: "VERIFIED_FRESH",
          titleEn: "Crop Insurance Claim Copilot & Photo Proof Pack",
          titleKn: "ಬೆಳೆ ವಿಮೆ ಕ್ಲೇಮ್ ಸಹಾಯಕ ಮತ್ತು ಫೋಟೋ ಸಾಕ್ಷ್ಯ ಪ್ಯಾಕ್",
          titleHi: "फसल बीमा दावा सहायक और फोटो प्रमाण पैक",
        },
        {
          id: "agro_gpt_voice",
          status: "LIVE",
          dataFreshness: "VERIFIED_FRESH",
          titleEn: "Agro GPT Voice & Chat Assistant (Confirmation-Gated)",
          titleKn: "ಆಗ್ರೋ ಜಿಪಿಟಿ ಧ್ವನಿ ಮತ್ತು ಚಾಟ್ ಸಹಾಯಕ (ದೃಢೀಕರಣ ರಕ್ಷಿತ)",
          titleHi: "एग्रो जीपीटी वॉइस और चैट सहायक (पुष्टि-सुरक्षित)",
        },
        {
          id: "mandi_price_forecast",
          status: "UNAVAILABLE_AWAITING_AGMARKNET_API",
          dataFreshness: "UNVERIFIED_SOURCE",
          titleEn: "Mandi Price Analysis & Forecasts",
          titleKn: "ಮಾರುಕಟ್ಟೆ (ಮಂಡಿ) ಧಾರಣೆ ವಿಶ್ಲೇಷಣೆ ಮತ್ತು ಮುನ್ಸೂಚನೆ",
          titleHi: "मंडी भाव विश्लेषण और पूर्वानुमान",
          honestDisclosureEn:
            "Live Agmarknet / e-NAM mandi price feed is not connected. Agro AI never displays fabricated market prices.",
          honestDisclosureKn:
            "ನೇರ ಅಗ್ಮಾರ್ಕ್‌ನೆಟ್ / ಇ-ನ್ಯಾಮ್ ಮಾರುಕಟ್ಟೆ ದರ ಜೋಡಣೆ ಲಭ್ಯವಿಲ್ಲ. ಆಗ್ರೋ ಎಐ ಎಂದಿಗೂ ಕಾಲ್ಪನಿಕ ಬೆಲೆಗಳನ್ನು ತೋರಿಸುವುದಿಲ್ಲ.",
          honestDisclosureHi:
            "लाइव एगमार्कनेट / ई-नाम मंडी भाव फ़ीड कनेक्ट नहीं है। एग्रो एआई कभी भी काल्पनिक बाजार भाव नहीं दिखाता है।",
        },
        {
          id: "hyperlocal_weather",
          status: "UNAVAILABLE_AWAITING_IMD_API",
          dataFreshness: "UNVERIFIED_SOURCE",
          titleEn: "Hyperlocal Weather Intelligence",
          titleKn: "ಸ್ಥಳೀಯ ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ ಮತ್ತು ಎಚ್ಚರಿಕೆ",
          titleHi: "हाइपरलोकल मौसम बुद्धिमत्ता",
          honestDisclosureEn:
            "Live IMD / KSNDMC weather station telemetry is not connected. No invented rainfall or temperature numbers are shown.",
          honestDisclosureKn:
            "ನೇರ ಹವಾಮಾನ ಇಲಾಖೆ (IMD / KSNDMC) ಜೋಡಣೆ ಲಭ್ಯವಿಲ್ಲ. ಯಾವುದೇ ಊಹಾತ್ಮಕ ಮಳೆ ಅಥವಾ ತಾಪಮಾನ ಸಂಖ್ಯೆಗಳನ್ನು ತೋರಿಸಲಾಗುವುದಿಲ್ಲ.",
          honestDisclosureHi:
            "लाइव मौसम विभाग (IMD / KSNDMC) टेलीमेट्री कनेक्ट नहीं है। कोई काल्पनिक वर्षा या तापमान डेटा नहीं दिखाया जाता है।",
        },
        {
          id: "leaf_disease_vision",
          status: "UNAVAILABLE_AWAITING_VISION_MODEL",
          dataFreshness: "UNVERIFIED_SOURCE",
          titleEn: "AI Leaf Disease & Pest Detection",
          titleKn: "ಎಐ ಎಲೆ ರೋಗ ಮತ್ತು ಕೀಟ ಬಾಧೆ ಪತ್ತೆ",
          titleHi: "एआई पत्ती रोग और कीट पहचान",
          honestDisclosureEn:
            "Plant pathology computer-vision model is not connected. Use the Guided Damage Photo Proof Pack to capture geo-tagged photos for official inspection.",
          honestDisclosureKn:
            "ಸಸ್ಯ ರೋಗ ಪತ್ತೆಹಚ್ಚುವ ಕಂಪ್ಯೂಟರ್ ವಿಷನ್ ಮಾಡೆಲ್ ಜೋಡಣೆಯಾಗಿಲ್ಲ. ಅಧಿಕೃತ ಪರಿಶೀಲನೆಗಾಗಿ ಬೆಳೆ ಹಾನಿ ಫೋಟೋ ಸಾಕ್ಷ್ಯ ಪ್ಯಾಕ್ ಬಳಸಿ.",
          honestDisclosureHi:
            "पादप रोग कंप्यूटर-विज़न मॉडल कनेक्ट नहीं है। आधिकारिक निरीक्षण के लिए फोटो प्रमाण पैक का उपयोग करें।",
        },
      ],
    };
  }

  public addFarmPlot(
    actorId: string,
    targetFarmerId: string,
    input: PlotCreateInput
  ): FarmPlotRecord {
    this.authorizeFarmerResourceAccess(actorId, targetFarmerId, "plots:write");
    const areaHectares = convertToHectares(input.areaValue, input.areaUnit);
    const plotId = uuidv7();
    const provenance: FactProvenance =
      actorId !== targetFarmerId ? "CSC_ENTERED" : input.provenance;

    const plot: FarmPlotRecord = {
      id: plotId,
      ownerId: targetFarmerId,
      plotName: input.plotName,
      surveyNumberEncrypted: encryptField(
        input.surveyNumber,
        this.config.FIELD_ENCRYPTION_KEY
      ),
      surveyNumberMasked: `Sy.No ${input.surveyNumber}`,
      districtCode: input.districtCode,
      talukCode: input.talukCode,
      villageCode: input.villageCode,
      areaValue: input.areaValue,
      areaUnit: input.areaUnit,
      areaHectares,
      ownershipType: input.ownershipType,
      irrigationType: input.irrigationType,
      soilType: input.soilType ?? null,
      boundaryGeoJson: input.boundaryGeoJson ?? null,
      provenance,
      verifiedAt: null,
      createdAt: new Date().toISOString(),
    };
    this.plots.set(plotId, plot);
    this.appendAudit({
      actorId,
      actorRole: actorId === targetFarmerId ? "FARMER" : "SHARED_HELPER",
      action: "FARM_PLOT_CREATED",
      targetType: "PLOT",
      targetId: plotId,
    });
    return plot;
  }

  public addCropRecord(
    actorId: string,
    targetFarmerId: string,
    input: CropRecordCreateInput
  ): CropRecordItem {
    this.authorizeFarmerResourceAccess(actorId, targetFarmerId, "plots:write");
    const plot = this.plots.get(input.plotId);
    if (!plot || plot.ownerId !== targetFarmerId) {
      throw new AuthorizationError("Plot does not belong to this farmer", 403);
    }
    const id = uuidv7();
    const crop: CropRecordItem = {
      id,
      plotId: input.plotId,
      ownerId: targetFarmerId,
      season: input.season,
      year: input.year,
      cropCode: input.cropCode.toUpperCase(),
      cropNameEn: input.cropNameEn,
      cropNameKn: input.cropNameKn,
      sownAreaHectares: input.sownAreaHectares,
      sowingDate: input.sowingDate ?? null,
      isInsuredUnderPmfby: input.isInsuredUnderPmfby,
      provenance: actorId !== targetFarmerId ? "CSC_ENTERED" : input.provenance,
      createdAt: new Date().toISOString(),
    };
    this.crops.set(id, crop);
    return crop;
  }

  // --------------------------------------------------------------------------
  // Phase 3: Scheme Catalogue, Maker-Checker Governance, Matcher, What-If
  // --------------------------------------------------------------------------

  public buildFarmerFactSet(farmerId: string): {
    facts: FarmerFactSet;
    allOfficiallyVerified: boolean;
  } {
    const profile = this.profiles.get(farmerId);
    const plots = Array.from(this.plots.values()).filter(
      (p) => p.ownerId === farmerId
    );
    const crops = Array.from(this.crops.values()).filter(
      (c) => c.ownerId === farmerId
    );

    const totalLandHectares =
      plots.length > 0
        ? Number(plots.reduce((sum, p) => sum + p.areaHectares, 0).toFixed(4))
        : null;

    const ownershipTypes = Array.from(
      new Set(plots.map((p) => p.ownershipType))
    );
    const irrigationTypes = Array.from(
      new Set(plots.map((p) => p.irrigationType))
    );
    const cropCodes = Array.from(new Set(crops.map((c) => c.cropCode)));
    const seasons = Array.from(new Set(crops.map((c) => c.season)));

    const facts: FarmerFactSet = {
      state: profile?.state ?? null,
      districtCode: profile?.districtCode ?? null,
      talukCode: profile?.talukCode ?? null,
      villageCode: profile?.villageCode ?? null,
      farmerCategory: profile?.farmerCategory ?? null,
      hasKccCard: profile?.hasKccCard ?? false,
      livestockTypes: profile?.livestockTypes ?? [],
      plotCount: plots.length,
      totalLandHectares,
      ownershipTypes,
      irrigationTypes,
      crops: cropCodes,
      seasons,
    };

    const allOfficiallyVerified =
      profile?.provenance === "OFFICIALLY_VERIFIED" &&
      plots.length > 0 &&
      plots.every((p) => p.provenance === "OFFICIALLY_VERIFIED");

    return { facts, allOfficiallyVerified };
  }

  public async evaluateSchemesForFarmer(
    actorId: string,
    targetFarmerId: string,
    language: SupportedLanguage = "kn"
  ): Promise<
    Array<{
      schemeVersion: SchemeVersionRecord;
      evaluation: EligibilityEvaluationResult;
      aiExplanation: LlmExplanationOutput;
      freshness: SchemeFreshnessMetadata;
    }>
  > {
    this.authorizeFarmerResourceAccess(actorId, targetFarmerId, "schemes:read");
    const { facts, allOfficiallyVerified } =
      this.buildFarmerFactSet(targetFarmerId);

    const publishedVersions = Array.from(this.schemeVersions.values()).filter(
      (v) => v.status === "PUBLISHED"
    );

    const results: Array<{
      schemeVersion: SchemeVersionRecord;
      evaluation: EligibilityEvaluationResult;
      aiExplanation: LlmExplanationOutput;
      freshness: SchemeFreshnessMetadata;
    }> = [];

    for (const version of publishedVersions) {
      const evaluation = evaluateSchemeEligibility(
        version.ruleTree,
        facts,
        allOfficiallyVerified
      );
      const freshness = this.computeSchemeFreshness(version);

      // Persist reproducible rule_evaluations snapshot
      this.ruleEvaluations.push({
        id: uuidv7(),
        farmerId: targetFarmerId,
        schemeVersionId: version.id,
        factsSnapshot: facts,
        evaluation,
        createdAt: evaluation.evaluatedAtIso,
      });

      const aiExplanation = await this.llmProvider.explainEligibility({
        schemeVersionId: version.id,
        schemeTitle: language === "kn" ? version.titleKn : version.titleEn,
        sourceUrl: version.sourceUrl,
        evaluation,
        language,
      });

      results.push({
        schemeVersion: version,
        evaluation,
        aiExplanation,
        freshness,
      });
    }

    const statusPriority: Record<string, number> = {
      LIKELY_ELIGIBLE: 4,
      POTENTIALLY_ELIGIBLE: 3,
      NEEDS_VERIFICATION: 2,
      NOT_ELIGIBLE: 1,
    };

    results.sort((a, b) => {
      const diff =
        (statusPriority[b.evaluation.status] ?? 0) -
        (statusPriority[a.evaluation.status] ?? 0);
      if (diff !== 0) return diff;
      return b.evaluation.relevanceScore - a.evaluation.relevanceScore;
    });

    this.persistToDisk();
    return results;
  }

  public simulateWhatIfEligibility(
    actorId: string,
    targetFarmerId: string,
    overrideFacts: Partial<FarmerFactSet>
  ) {
    this.authorizeFarmerResourceAccess(actorId, targetFarmerId, "schemes:read");
    const { facts: baseFacts, allOfficiallyVerified } =
      this.buildFarmerFactSet(targetFarmerId);
    const simulatedFacts: FarmerFactSet = {
      ...baseFacts,
      ...overrideFacts,
    };

    const publishedVersions = Array.from(this.schemeVersions.values()).filter(
      (v) => v.status === "PUBLISHED"
    );

    return publishedVersions.map((version) => {
      const currentEval = evaluateSchemeEligibility(
        version.ruleTree,
        baseFacts,
        allOfficiallyVerified
      );
      const whatIfEval = evaluateSchemeEligibility(
        version.ruleTree,
        simulatedFacts,
        false
      );
      return {
        schemeVersionId: version.id,
        schemeCode: version.schemeCode,
        titleEn: version.titleEn,
        titleKn: version.titleKn,
        isMock: version.isMock,
        currentStatus: currentEval.status,
        simulatedStatus: whatIfEval.status,
        simulatedEvaluation: whatIfEval,
      };
    });
  }

  // Reviewer Workflow with Maker-Checker Enforcement (Author cannot approve own version)
  public createSchemeDraft(
    authorId: string,
    params: {
      schemeCode: string;
      departmentName: string;
      titleEn: string;
      titleKn: string;
      summaryEn: string;
      summaryKn: string;
      benefitsDescriptionEn: string;
      benefitsDescriptionKn: string;
      requiredDocumentsEn: string[];
      requiredDocumentsKn: string[];
      applicationStepsEn: string[];
      applicationStepsKn: string[];
      ruleTree: SchemeRuleNode;
      sourceUrl: string;
      isMock?: boolean;
    }
  ): SchemeVersionRecord {
    this.requireRole(authorId, ["SCHEME_REVIEWER", "PLATFORM_ADMIN"]);
    const parsedRules = SchemeRuleNodeSchema.safeParse(params.ruleTree);
    if (!parsedRules.success) {
      throw new ValidationError("Invalid scheme JSON DSL rule tree");
    }
    const id = uuidv7();
    const existingForCode = Array.from(this.schemeVersions.values()).filter(
      (v) => v.schemeCode === params.schemeCode
    );
    const versionNumber = existingForCode.length + 1;

    const record: SchemeVersionRecord = {
      id,
      schemeId: `scheme_${params.schemeCode}`,
      schemeCode: params.schemeCode,
      departmentName: params.departmentName,
      versionNumber,
      status: "IN_REVIEW",
      titleEn: params.titleEn,
      titleKn: params.titleKn,
      summaryEn: params.summaryEn,
      summaryKn: params.summaryKn,
      benefitsDescriptionEn: params.benefitsDescriptionEn,
      benefitsDescriptionKn: params.benefitsDescriptionKn,
      requiredDocumentsEn: params.requiredDocumentsEn,
      requiredDocumentsKn: params.requiredDocumentsKn,
      applicationStepsEn: params.applicationStepsEn,
      applicationStepsKn: params.applicationStepsKn,
      ruleTree: parsedRules.data,
      sourceUrl: params.sourceUrl,
      sourceLastVerifiedAt: null,
      sourceVerifiedById: null,
      authorId,
      approvedById: null,
      publishedAt: null,
      isMock: params.isMock ?? true,
      deadlines: [],
      createdAt: new Date().toISOString(),
    };
    this.schemeVersions.set(id, record);
    this.appendAudit({
      actorId: authorId,
      actorRole: "SCHEME_REVIEWER",
      action: "SCHEME_DRAFT_SUBMITTED",
      targetType: "SCHEME_VERSION",
      targetId: id,
    });
    return record;
  }

  public approveAndPublishSchemeVersion(
    reviewerId: string,
    schemeVersionId: string
  ): SchemeVersionRecord {
    this.requireRole(reviewerId, ["SCHEME_REVIEWER", "PLATFORM_ADMIN"]);
    const version = this.schemeVersions.get(schemeVersionId);
    if (!version) {
      throw new ValidationError("Scheme version not found");
    }
    if (version.authorId === reviewerId) {
      this.appendAudit({
        actorId: reviewerId,
        actorRole: "SCHEME_REVIEWER",
        action: "MAKER_CHECKER_VIOLATION_BLOCKED",
        targetType: "SCHEME_VERSION",
        targetId: schemeVersionId,
      });
      throw new AuthorizationError(
        "Maker-Checker violation: author cannot approve or publish their own scheme version",
        403
      );
    }

    const nowIso = new Date().toISOString();
    version.status = "PUBLISHED";
    version.approvedById = reviewerId;
    version.sourceVerifiedById = reviewerId;
    version.sourceLastVerifiedAt = nowIso;
    version.publishedAt = nowIso;

    this.appendAudit({
      actorId: reviewerId,
      actorRole: "SCHEME_REVIEWER",
      action: "SCHEME_VERSION_PUBLISHED",
      targetType: "SCHEME_VERSION",
      targetId: schemeVersionId,
    });
    return version;
  }

  public listAllSchemeVersions(): SchemeVersionRecord[] {
    return Array.from(this.schemeVersions.values());
  }

  // --------------------------------------------------------------------------
  // Phase 4: Crop Insurance & Claim Rescue Room (No hardcoded 72h rule!)
  // --------------------------------------------------------------------------

  public createCropLossClaim(
    actorId: string,
    targetFarmerId: string,
    params: {
      plotId: string;
      cropCode: string;
      damageDateIso: string;
      causeOfDamage: CropLossClaimRecord["causeOfDamage"];
      growthStage: CropLossClaimRecord["growthStage"];
    }
  ): CropLossClaimRecord {
    this.authorizeFarmerResourceAccess(actorId, targetFarmerId, "cases:write");
    const plot = this.plots.get(params.plotId);
    if (!plot || plot.ownerId !== targetFarmerId) {
      throw new AuthorizationError("Plot does not belong to this farmer", 403);
    }

    let claimCategory: CropLossClaimRecord["claimCategory"] = "LOCALIZED_CALAMITY";
    if (params.growthStage === "PRE_SOWING") {
      claimCategory = "PREVENTED_SOWING";
    } else if (params.growthStage === "POST_HARVEST_DRYING") {
      claimCategory = "POST_HARVEST_LOSS";
    } else if (params.causeOfDamage === "DROUGHT" || params.causeOfDamage === "PEST_DISEASE") {
      claimCategory = "MID_SEASON_ADVERSITY";
    }

    const nowIso = new Date().toISOString();
    const id = uuidv7();
    const record: CropLossClaimRecord = {
      id,
      farmerId: targetFarmerId,
      plotId: params.plotId,
      cropCode: params.cropCode.toUpperCase(),
      damageDateIso: params.damageDateIso,
      causeOfDamage: params.causeOfDamage,
      growthStage: params.growthStage,
      claimCategory,
      reportingDeadlineNoteEn:
        "Deadline not verified — check your state/insurer notification for exact intimation hours.",
      reportingDeadlineNoteKn:
        "ಗಡುವು ಪರಿಶೀಲಿಸಲಾಗಿಲ್ಲ — ನಿಮ್ಮ ವಿಮಾ ಪಾಲಿಸಿ ಮತ್ತು ಇಲಾಖೆ ಅಧಿಸೂಚನೆಯಲ್ಲಿ ನಿಖರ ಸಮಯ ಪರಿಶೀಲಿಸಿ.",
      isDeadlineVerified: false,
      status: "EVIDENCE_PENDING",
      readinessScore: 25,
      evidencePhotos: [],
      submissionReceiptId: null,
      isMock: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.claims.set(id, record);
    this.appendAudit({
      actorId,
      actorRole: actorId === targetFarmerId ? "FARMER" : "SHARED_HELPER",
      action: "CROP_LOSS_CLAIM_DRAFT_CREATED",
      targetType: "CLAIM",
      targetId: id,
      metadata: { claimCategory, causeOfDamage: params.causeOfDamage },
    });
    return record;
  }

  public addClaimEvidencePhoto(
    actorId: string,
    targetFarmerId: string,
    claimId: string,
    photo: {
      angle: ClaimEvidencePhotoItem["angle"];
      latitude: number;
      longitude: number;
      gpsAccuracyMeters: number;
      blurVarianceScore: number;
      imagePayloadDigest?: string;
    }
  ): CropLossClaimRecord {
    this.authorizeFarmerResourceAccess(actorId, targetFarmerId, "cases:write");
    const claim = this.claims.get(claimId);
    if (!claim || claim.farmerId !== targetFarmerId) {
      throw new AuthorizationError("Claim not found for this farmer", 404);
    }

    const isBlurry = photo.blurVarianceScore < 100;
    const sha256Hash = crypto
      .createHash("sha256")
      .update(
        `${claimId}:${photo.angle}:${photo.latitude}:${photo.longitude}:${photo.imagePayloadDigest ?? uuidv7()}`
      )
      .digest("hex");

    const item: ClaimEvidencePhotoItem = {
      id: uuidv7(),
      angle: photo.angle,
      capturedAtIso: new Date().toISOString(),
      latitude: photo.latitude,
      longitude: photo.longitude,
      gpsAccuracyMeters: photo.gpsAccuracyMeters,
      blurVarianceScore: photo.blurVarianceScore,
      isBlurry,
      sha256Hash,
    };

    // Replace existing angle if retaken, otherwise push
    const idx = claim.evidencePhotos.findIndex((p) => p.angle === photo.angle);
    if (idx >= 0) {
      claim.evidencePhotos[idx] = item;
    } else {
      claim.evidencePhotos.push(item);
    }

    const sharpPhotosCount = claim.evidencePhotos.filter((p) => !p.isBlurry).length;
    claim.readinessScore = Math.min(100, 20 + sharpPhotosCount * 20);
    claim.status = claim.readinessScore >= 80 ? "PREPARED" : "EVIDENCE_PENDING";
    claim.updatedAt = new Date().toISOString();

    this.appendAudit({
      actorId,
      actorRole: actorId === targetFarmerId ? "FARMER" : "SHARED_HELPER",
      action: "CLAIM_EVIDENCE_PHOTO_ADDED",
      targetType: "CLAIM",
      targetId: claimId,
      metadata: { angle: photo.angle, isBlurry, readinessScore: claim.readinessScore },
    });
    return claim;
  }

  public submitClaimPackage(
    actorId: string,
    targetFarmerId: string,
    claimId: string,
    params: {
      portalName?: string;
      acknowledgementNumber?: string;
      notes?: string;
    }
  ): { claim: CropLossClaimRecord; receipt: SubmissionReceiptRecord } {
    this.authorizeFarmerResourceAccess(actorId, targetFarmerId, "cases:write");
    const claim = this.claims.get(claimId);
    if (!claim || claim.farmerId !== targetFarmerId) {
      throw new AuthorizationError("Claim not found for this farmer", 404);
    }
    const nowIso = new Date().toISOString();
    const receiptId = uuidv7();
    const trimmedAck = params.acknowledgementNumber?.trim();
    if (this.config.NODE_ENV === "production" && !trimmedAck) {
      throw new ValidationError(
        "Official portal acknowledgement number is required in production mode (never fabricated)."
      );
    }
    const ackNum =
      trimmedAck ||
      `DEMO-ACK-${new Date().getFullYear()}-${claimId.slice(-6).toUpperCase()}`;

    const receipt: SubmissionReceiptRecord = {
      id: receiptId,
      farmerId: targetFarmerId,
      referenceType: "INSURANCE_CLAIM",
      referenceId: claimId,
      portalName: params.portalName ?? "DEMO — Samrakshane / PMFBY Intimation Desk",
      acknowledgementNumber: ackNum,
      submittedAtIso: nowIso,
      notes:
        params.notes ??
        "Internal Agro AI Scheme preparation & submission receipt (not an official insurer settlement decision).",
      provenance: actorId === targetFarmerId ? "FARMER_ENTERED" : "CSC_ENTERED",
      isMock: true,
    };

    this.receipts.set(receiptId, receipt);
    claim.status = "SUBMITTED";
    claim.submissionReceiptId = receiptId;
    claim.updatedAt = nowIso;

    this.appendAudit({
      actorId,
      actorRole: actorId === targetFarmerId ? "FARMER" : "SHARED_HELPER",
      action: "CLAIM_SUBMITTED_TO_RECEIPT_VAULT",
      targetType: "CLAIM",
      targetId: claimId,
      metadata: { receiptId, acknowledgementNumber: ackNum },
    });

    return { claim, receipt };
  }

  public listFarmerClaims(
    actorId: string,
    targetFarmerId: string
  ): {
    claims: CropLossClaimRecord[];
    receipts: SubmissionReceiptRecord[];
  } {
    this.authorizeFarmerResourceAccess(actorId, targetFarmerId, "cases:read");
    const claims = Array.from(this.claims.values()).filter(
      (c) => c.farmerId === targetFarmerId
    );
    const receipts = Array.from(this.receipts.values()).filter(
      (r) => r.farmerId === targetFarmerId
    );
    return { claims, receipts };
  }

  // --------------------------------------------------------------------------
  // Phase 5: Document X-Ray, Rejection Repair Studio & Scam Shield
  // --------------------------------------------------------------------------

  public runDocumentXRayForFarmer(
    actorId: string,
    targetFarmerId: string,
    extractedRtcRecord: {
      ownerNameOnRtc: string;
      surveyNumberOnRtc: string;
      areaHectaresOnRtc: number;
      recordedCropOnRtc: string;
      ocrConfidence: number;
      farmerConfirmedExtraction: boolean;
    }
  ): DocumentXRayResult {
    this.authorizeFarmerResourceAccess(
      actorId,
      targetFarmerId,
      "documents:read",
      `rtc_${targetFarmerId}`
    );
    const profile = this.profiles.get(targetFarmerId);
    const plots = Array.from(this.plots.values()).filter(
      (p) => p.ownerId === targetFarmerId
    );
    const crops = Array.from(this.crops.values()).filter(
      (c) => c.ownerId === targetFarmerId
    );
    const primaryPlot = plots[0];
    const primaryCrop = crops[0];

    const rawSurvey = primaryPlot
      ? decryptField(
          primaryPlot.surveyNumberEncrypted,
          this.config.FIELD_ENCRYPTION_KEY
        )
      : "142/2A";

    const result = compareDocumentXRay(
      {
        farmerProfile: {
          fullName: profile?.fullName ?? "Farmer",
          surveyNumber: rawSurvey,
          areaHectares: primaryPlot?.areaHectares ?? 1.0117,
          cropCode: primaryCrop?.cropCode ?? "RAGI",
        },
        extractedRtcRecord,
      },
      true
    );

    this.appendAudit({
      actorId,
      actorRole: actorId === targetFarmerId ? "FARMER" : "SHARED_HELPER",
      action: "DOCUMENT_XRAY_EXECUTED",
      targetType: "DOCUMENT",
      targetId: targetFarmerId,
      metadata: {
        overallReady: result.overallReady,
        requiresFarmerConfirmation: result.requiresFarmerConfirmation,
      },
    });
    return result;
  }

  public analyzeRejectionNotice(
    actorId: string,
    targetFarmerId: string,
    rawNoticeText: string
  ): {
    category:
      | "NAME_MISMATCH"
      | "LAND_SURVEY_MISMATCH"
      | "BANK_NPCI_INACTIVE"
      | "CROP_MISMATCH"
      | "GENERAL_VERIFICATION";
    explanationEn: string;
    explanationKn: string;
    repairChecklistEn: string[];
    repairChecklistKn: string[];
    officerCallScriptKn: string;
    officerCallScriptEn: string;
    isMockOcr: true;
  } {
    this.authorizeFarmerResourceAccess(actorId, targetFarmerId, "documents:read");
    const lower = rawNoticeText.toLowerCase();

    let category:
      | "NAME_MISMATCH"
      | "LAND_SURVEY_MISMATCH"
      | "BANK_NPCI_INACTIVE"
      | "CROP_MISMATCH"
      | "GENERAL_VERIFICATION" = "GENERAL_VERIFICATION";

    if (lower.includes("name") || lower.includes("spelling") || lower.includes("ಹೆಸರು")) {
      category = "NAME_MISMATCH";
    } else if (lower.includes("survey") || lower.includes("hissa") || lower.includes("rtc") || lower.includes("ಸರ್ವೆ")) {
      category = "LAND_SURVEY_MISMATCH";
    } else if (lower.includes("npci") || lower.includes("dbt") || lower.includes("bank") || lower.includes("ekyc")) {
      category = "BANK_NPCI_INACTIVE";
    } else if (lower.includes("crop") || lower.includes("sowing") || lower.includes("ಬೆಳೆ")) {
      category = "CROP_MISMATCH";
    }

    const scripts: Record<
      typeof category,
      {
        explanationEn: string;
        explanationKn: string;
        repairChecklistEn: string[];
        repairChecklistKn: string[];
        officerCallScriptKn: string;
        officerCallScriptEn: string;
      }
    > = {
      NAME_MISMATCH: {
        explanationEn:
          "The name on your RTC/Pahani does not exactly match your application or bank KYC record.",
        explanationKn:
          "ನಿಮ್ಮ ಪಹಣಿ (RTC) ದಾಖಲೆಯಲ್ಲಿರುವ ಹೆಸರು ಮತ್ತು ಅರ್ಜಿಯಲ್ಲಿರುವ ಹೆಸರಿನಲ್ಲಿ ಅಕ್ಷರ ವ್ಯತ್ಯಾಸವಿದೆ.",
        repairChecklistEn: [
          "1. Carry original RTC/Pahani and Identity Card to Nadakacheri / Bhoomi centre or CSC.",
          "2. Obtain a One-and-the-Same Person Affidavit or update FRUITS profile name.",
          "3. Re-submit with the updated acknowledgement number.",
        ],
        repairChecklistKn: [
          "1. ಮೂಲ ಪಹಣಿ ಮತ್ತು ಗುರುತಿನ ಚೀಟಿಯೊಂದಿಗೆ ನಾಡಕಚೇರಿ / ಭೂಮಿ ಕೇಂದ್ರಕ್ಕೆ ಭೇಟಿ ನೀಡಿ.",
          "2. ಹೆಸರು ತಿದ್ದುಪಡಿ ಅಥವಾ ದೃಢೀಕರಣ ಪತ್ರ ಪಡೆದು FRUITS ಪ್ರೊಫೈಲ್ ನವೀಕರಿಸಿ.",
          "3. ಮರು-ಅರ್ಜಿ ಸಲ್ಲಿಸಿ ಸ್ವೀಕೃತಿ ಸಂಖ್ಯೆಯನ್ನು ರಸೀದಿ ವಾಲ್ಟ್‌ನಲ್ಲಿ ಉಳಿಸಿ.",
        ],
        officerCallScriptKn:
          "ನಮಸ್ಕಾರ ಸರ್, ನನ್ನ ಅರ್ಜಿ ಹೆಸರು ವ್ಯತ್ಯಾಸದಿಂದ ತಿರಸ್ಕೃತವಾಗಿದೆ. ನನ್ನ ಪಹಣಿ ಸರ್ವೆ ನಂ ಮತ್ತು FRUITS ಗುರುತಿನೊಂದಿಗೆ ಹೆಸರು ತಿದ್ದುಪಡಿಗೆ ಯಾವ ದಾಖಲೆ ತರಬೇಕು ಎಂದು ದಯವಿಟ್ಟು ತಿಳಿಸಿ.",
        officerCallScriptEn:
          "Namaskara Officer, my application was flagged for a name spelling mismatch with my RTC. Please confirm if a Nadakacheri affidavit or FRUITS correction is needed to re-verify.",
      },
      LAND_SURVEY_MISMATCH: {
        explanationEn:
          "The Hissa/Survey subdivision or cultivable extent in your application did not match the Bhoomi RTC record.",
        explanationKn:
          "ನಿಮ್ಮ ಅರ್ಜಿಯಲ್ಲಿ ನಮೂದಿಸಿದ ಸರ್ವೆ/ಹಿಸ್ಸಾ ಸಂಖ್ಯೆ ಮತ್ತು ಭೂಮಿ ಪಹಣಿ ದಾಖಲೆಗೆ ಹೊಂದಿಕೆಯಾಗುತ್ತಿಲ್ಲ.",
        repairChecklistEn: [
          "1. Download latest Kharif/Rabi Pahani from Bhoomi portal.",
          "2. Enter exact Hissa subdivision (e.g., 142/2A) and exact Gunta/Acre area.",
          "3. Have CSC operator update plot mapping in FRUITS.",
        ],
        repairChecklistKn: [
          "1. ಭೂಮಿ ಪೋರ್ಟಲ್‌ನಿಂದ ಇತ್ತೀಚಿನ ಪಹಣಿ ಪಡೆಯಿರಿ.",
          "2. ನಿಖರವಾದ ಸರ್ವೆ ಮತ್ತು ಹಿಸ್ಸಾ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ.",
          "3. CSC ಕೇಂದ್ರದಲ್ಲಿ FRUITS ಪಹಣಿ ಜೋಡಣೆ ಪರಿಶೀಲಿಸಿ.",
        ],
        officerCallScriptKn:
          "ನಮಸ್ಕಾರ ಸರ್, ನನ್ನ ಪಹಣಿಯ ಸರ್ವೆ/ಹಿಸ್ಸಾ ಸಂಖ್ಯೆ ಮರು-ಪರಿಶೀಲನೆಗೆ ಇತ್ತೀಚಿನ ಪಹಣಿ ಪ್ರತಿ ತಂದಿದ್ದೇನೆ. ದಯವಿಟ್ಟು ಪರಿಶೀಲಿಸಿ.",
        officerCallScriptEn:
          "Namaskara Officer, I have fetched the latest Bhoomi RTC showing the exact Hissa subdivision. How can I submit this for re-verification?",
      },
      BANK_NPCI_INACTIVE: {
        explanationEn:
          "Direct Benefit Transfer (DBT) failed because NPCI mapper seeding is inactive at your bank branch.",
        explanationKn:
          "ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ NPCI / DBT ಜೋಡಣೆ ಸಕ್ರಿಯವಾಗಿಲ್ಲದ ಕಾರಣ ಸಹಾಯಧನ ವರ್ಗಾವಣೆ ಸ್ಥಗಿತಗೊಂಡಿದೆ.",
        repairChecklistEn: [
          "1. Visit your bank branch in person with your passbook.",
          "2. Ask the bank officer to enable 'NPCI DBT Mapper Seeding' on your primary account.",
          "3. Never share any OTP, PIN, or password with anyone claiming to fix DBT over phone.",
        ],
        repairChecklistKn: [
          "1. ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಪಾಸ್‌ಬುಕ್‌ನೊಂದಿಗೆ ನೇರವಾಗಿ ಬ್ಯಾಂಕ್ ಶಾಖೆಗೆ ಭೇಟಿ ನೀಡಿ.",
          "2. 'NPCI DBT ಮ್ಯಾಪರ್ ಸೀಡಿಂಗ್' ಸಕ್ರಿಯಗೊಳಿಸಲು ಬ್ಯಾಂಕ್ ಅಧಿಕಾರಿಗೆ ವಿನಂತಿಸಿ.",
          "3. ಫೋನ್ ಮೂಲಕ DBT ಸರಿಪಡಿಸುತ್ತೇವೆ ಎನ್ನುವವರಿಗೆ ಎಂದಿಗೂ OTP ಅಥವಾ ಪಿನ್ ನೀಡಬೇಡಿ.",
        ],
        officerCallScriptKn:
          "ನಮಸ್ಕಾರ ಬ್ಯಾಂಕ್ ಮ್ಯಾನೇಜರ್ ಅವರೇ, ನನ್ನ ಖಾತೆಗೆ ಸರ್ಕಾರಿ DBT ಸಹಾಯಧನ ಬರಲು NPCI ಮ್ಯಾಪರ್ ಸೀಡಿಂಗ್ ಸ್ಟೇಟಸ್ ಪರಿಶೀಲಿಸಿ ಸಕ್ರಿಯಗೊಳಿಸಿಕೊಡಿ.",
        officerCallScriptEn:
          "Hello Bank Officer, please check and activate my account on the NPCI DBT mapper so government benefit transfers can be credited.",
      },
      CROP_MISMATCH: {
        explanationEn:
          "The seasonal crop recorded in the Pahani/Crop Survey differs from the insured or applied crop.",
        explanationKn:
          "ಬೆಳೆ ಸಮೀಕ್ಷೆ / ಪಹಣಿಯಲ್ಲಿ ದಾಖಲಾದ ಬೆಳೆ ಮತ್ತು ಅರ್ಜಿಯಲ್ಲಿನ ಬೆಳೆ ವಿವರ ಹೊಂದಿಕೆಯಾಗುತ್ತಿಲ್ಲ.",
        repairChecklistEn: [
          "1. Check Crop Survey photo status at your Raitha Samparka Kendra (RSK).",
          "2. Submit a sowing certificate from the Village Accountant / Agriculture Officer.",
        ],
        repairChecklistKn: [
          "1. ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರದಲ್ಲಿ ಬೆಳೆ ಸಮೀಕ್ಷೆ ದಾಖಲೆ ಪರಿಶೀಲಿಸಿ.",
          "2. ಗ್ರಾಮ ಲೆಕ್ಕಿಗರಿಂದ ಬಿತ್ತನೆ ದೃಢೀಕರಣ ಪತ್ರ ಪಡೆದು ಸಲ್ಲಿಸಿ.",
        ],
        officerCallScriptKn:
          "ನಮಸ್ಕಾರ ಸರ್, ನನ್ನ ಜಮೀನಿನಲ್ಲಿ ಬೆಳೆದ ಬೆಳೆ ವಿವರ ಪಹಣಿಯಲ್ಲಿ ತಿದ್ದುಪಡಿಯಾಗಲು ಬಿತ್ತನೆ ದೃಢೀಕರಣ ಪತ್ರ ಎಲ್ಲಿ ಸಲ್ಲಿಸಬೇಕು?",
        officerCallScriptEn:
          "Namaskara Officer, where should I submit my sowing certificate to reconcile the crop recorded in the seasonal Pahani?",
      },
      GENERAL_VERIFICATION: {
        explanationEn:
          "Additional field or document verification is required by the department.",
        explanationKn:
          "ಇಲಾಖೆಯಿಂದ ಹೆಚ್ಚುವರಿ ದಾಖಲೆ ಪರಿಶೀಲನೆ ಅಗತ್ಯವಿದೆ.",
        repairChecklistEn: [
          "1. Carry your application acknowledgement receipt and original RTC to RSK/CSC.",
          "2. Ask for the specific verification remark code.",
        ],
        repairChecklistKn: [
          "1. ಅರ್ಜಿ ಸ್ವೀಕೃತಿ ರಸೀದಿ ಮತ್ತು ಮೂಲ ಪಹಣಿಯೊಂದಿಗೆ ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರಕ್ಕೆ ಭೇಟಿ ನೀಡಿ.",
          "2. ಯಾವ ದಾಖಲೆ ಮರು-ಸಲ್ಲಿಸಬೇಕು ಎಂದು ದೃಢಪಡಿಸಿಕೊಳ್ಳಿ.",
        ],
        officerCallScriptKn:
          "ನಮಸ್ಕಾರ ಸರ್, ನನ್ನ ಅರ್ಜಿ ಸಂಖ್ಯೆಯ ಪ್ರಸ್ತುತ ಸ್ಥಿತಿ ಮತ್ತು ಯಾವ ಹೆಚ್ಚುವರಿ ದಾಖಲೆ ಬೇಕು ಎಂದು ದಯವಿಟ್ಟು ತಿಳಿಸಿ.",
        officerCallScriptEn:
          "Namaskara Officer, could you please let me know which supporting document is needed for my pending application?",
      },
    };

    const chosen = scripts[category];
    this.appendAudit({
      actorId,
      actorRole: actorId === targetFarmerId ? "FARMER" : "SHARED_HELPER",
      action: "REJECTION_REPAIR_ANALYZED",
      targetType: "DOCUMENT",
      targetId: targetFarmerId,
      metadata: { category },
    });

    return {
      category,
      ...chosen,
      isMockOcr: true,
    };
  }

  public inspectAndReportScam(
    actorId: string | null,
    rawMessage: string,
    fileNameOptional?: string
  ): ScamInspectionResult & { reportId: string } {
    const result = inspectSuspiciousMessage(rawMessage, fileNameOptional);
    const reportId = uuidv7();
    this.scamReports.push({
      id: reportId,
      reporterId: actorId,
      verdict: result.verdict,
      suspiciousHosts: [],
      hasApkTrap: rawMessage.toLowerCase().includes(".apk") || Boolean(fileNameOptional?.toLowerCase().endsWith(".apk")),
      hasPinOtpTrap:
        rawMessage.toLowerCase().includes("pin") ||
        rawMessage.toLowerCase().includes("otp"),
      createdAt: new Date().toISOString(),
    });
    this.appendAudit({
      actorId,
      actorRole: actorId ? "FARMER" : "ANONYMOUS",
      action: "SCAM_SHIELD_INSPECTED",
      targetType: "SCAM_REPORT",
      targetId: reportId,
      metadata: { verdict: result.verdict },
    });
    return { ...result, reportId };
  }

  // --------------------------------------------------------------------------
  // Phase 6: Money Trail, Benefit Gap Report, KCC Tracker & Expense Ledger
  // --------------------------------------------------------------------------

  public getFarmerBenefitsAndLedger(actorId: string, targetFarmerId: string) {
    this.authorizeFarmerResourceAccess(actorId, targetFarmerId, "profile:read");
    const profile = this.profiles.get(targetFarmerId);
    const expenses = Array.from(this.expenses.values()).filter(
      (e) => e.farmerId === targetFarmerId
    );
    const totalExpensesInr = expenses.reduce((sum, e) => sum + e.amountInr, 0);

    const isProd = this.config.NODE_ENV === "production";

    return {
      isMock: !isProd,
      truthDisclosures: {
        bankLinkStatus: isProd
          ? "UNAVAILABLE_MANUAL_CHECK"
          : "DEMO_MOCK_ADAPTER",
        noteEn: isProd
          ? "PFMS/DBT bank integration is not connected. Verify benefit transfers directly with your bank branch and never share OTP, UPI PIN, or password."
          : "DEMO DATA: Agro AI Scheme is not connected to live PFMS/DBT bank rails. Never share your bank OTP, UPI PIN, or password.",
        noteKn: isProd
          ? "PFMS/DBT ಬ್ಯಾಂಕ್ ನೇರ ಜೋಡಣೆ ಲಭ್ಯವಿಲ್ಲ. ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಶಾಖೆಯಲ್ಲಿ ನೇರವಾಗಿ ಪರಿಶೀಲಿಸಿ. ಯಾರಿಗೂ OTP ಅಥವಾ UPI ಪಿನ್ ನೀಡಬೇಡಿ."
          : "ಡೆಮೊ ಮಾಹಿತಿ: ಇದು ಅಧಿಕೃತ ಬ್ಯಾಂಕ್ ಅಥವಾ PFMS ಲೈವ್ ಡೇಟಾ ಅಲ್ಲ. ನಿಮ್ಮ ಬ್ಯಾಂಕ್ OTP ಅಥವಾ UPI ಪಿನ್ ಯಾರಿಗೂ ನೀಡಬೇಡಿ.",
      },
      benefitPipeline: isProd
        ? []
        : [
            {
              id: "demo-dbt-1",
              schemeTitleEn: "[DEMO] Karnataka Micro-Irrigation Assistance",
              schemeTitleKn: "[ಡೆಮೊ] ಕರ್ನಾಟಕ ಸೂಕ್ಷ್ಮ ನೀರಾವರಿ ಸಹಾಯಧನ",
              stage: "DOCUMENT_VERIFICATION",
              illustrativeAmountInr: 18500,
              statusNoteEn:
                "DEMO: Waiting for RTC & quotation verification at RSK",
              statusNoteKn:
                "ಡೆಮೊ: ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರದಲ್ಲಿ ಪಹಣಿ ಪರಿಶೀಲನೆ ಹಂತದಲ್ಲಿದೆ",
              isMock: true,
            },
            {
              id: "demo-dbt-2",
              schemeTitleEn: "[DEMO] Seasonal Crop Insurance Protection",
              schemeTitleKn: "[ಡೆಮೊ] ಹಂಗಾಮಿನ ಬೆಳೆ ವಿಮೆ ರಕ್ಷಣೆ",
              stage: "ENROLLED_PROTECTED",
              illustrativeAmountInr: 42000,
              statusNoteEn: "DEMO: Policy active for Kharif Ragi (1.01 ha)",
              statusNoteKn:
                "ಡೆಮೊ: ಮುಂಗಾರು ರಾಗಿ ಬೆಳೆಗೆ ವಿಮಾ ರಕ್ಷಣೆ ಸಕ್ರಿಯವಾಗಿದೆ",
              isMock: true,
            },
          ],
      kccRenewalReminder: {
        hasKccCard: profile?.hasKccCard ?? false,
        statusEn: profile?.hasKccCard
          ? "[DEMO] Check annual KCC interest subvention renewal date with your issuing bank branch."
          : "[DEMO] Not enrolled in Kisan Credit Card (KCC) — check eligibility at your bank branch.",
        statusKn: profile?.hasKccCard
          ? "[ಡೆಮೊ] ಬಡ್ಡಿ ರಿಯಾಯಿತಿ ಪಡೆಯಲು ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಶಾಖೆಯಲ್ಲಿ KCC ನವೀಕರಣ ದಿನಾಂಕ ಪರಿಶೀಲಿಸಿ."
          : "[ಡೆಮೊ] ಕಿಸಾನ್ ಕ್ರೆಡಿಟ್ ಕಾರ್ಡ್ (KCC) ಹೊಂದಿಲ್ಲ — ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಶಾಖೆಯಲ್ಲಿ ವಿಚಾರಿಸಿ.",
        isMock: true,
      },
      subsidyBeforePurchaseCatalogue: SUBSIDY_BEFORE_PURCHASE_CATALOGUE,
      expenses,
      totalExpensesInr,
    };
  }

  public addFarmExpense(
    actorId: string,
    targetFarmerId: string,
    input: FarmExpenseEntryInput
  ): FarmExpenseRecord {
    this.authorizeFarmerResourceAccess(actorId, targetFarmerId, "plots:write");
    const id = uuidv7();
    const record: FarmExpenseRecord = {
      id,
      farmerId: targetFarmerId,
      category: input.category,
      amountInr: input.amountInr,
      season: input.season,
      note: input.note,
      provenance: input.provenance,
      createdAt: new Date().toISOString(),
    };
    this.expenses.set(id, record);
    this.appendAudit({
      actorId,
      actorRole: actorId === targetFarmerId ? "FARMER" : "SHARED_HELPER",
      action: "FARM_EXPENSE_RECORDED",
      targetType: "EXPENSE",
      targetId: id,
      metadata: { category: input.category, amountInr: input.amountInr },
    });
    return record;
  }

  // --------------------------------------------------------------------------
  // Phase 7: CSC Appointment & Token System + WhatsApp Cloud API Webhook
  // --------------------------------------------------------------------------

  public createCscVisitToken(
    actorId: string,
    targetFarmerId: string,
    params: {
      centreName: string;
      purpose: string;
      checklistItems?: string[];
    }
  ): CscVisitTokenRecord {
    this.authorizeFarmerResourceAccess(actorId, targetFarmerId, "cases:write");
    const profile = this.profiles.get(targetFarmerId);
    const id = uuidv7();
    const shortNum = String(1000 + this.cscTokens.size + 1);
    const tokenCode = `KA-CSC-${shortNum}`;

    const record: CscVisitTokenRecord = {
      id,
      tokenCode,
      farmerId: targetFarmerId,
      farmerName: profile?.fullName ?? "Farmer",
      centreName: params.centreName,
      districtCode: profile?.districtCode ?? "KA-MYS",
      purpose: params.purpose,
      checklistItems: params.checklistItems ?? [
        "Original RTC / Pahani",
        "Bank Passbook (for portal reference only — never share PIN/OTP)",
        "Mobile phone for portal OTP",
      ],
      status: "BOOKED",
      createdAt: new Date().toISOString(),
    };
    this.cscTokens.set(id, record);
    this.appendAudit({
      actorId,
      actorRole: actorId === targetFarmerId ? "FARMER" : "SHARED_HELPER",
      action: "CSC_VISIT_TOKEN_CREATED",
      targetType: "CSC_TOKEN",
      targetId: id,
      metadata: { tokenCode, centreName: params.centreName },
    });
    return record;
  }

  public listFarmerCscTokens(
    actorId: string,
    targetFarmerId: string
  ): CscVisitTokenRecord[] {
    this.authorizeFarmerResourceAccess(actorId, targetFarmerId, "cases:read");
    return Array.from(this.cscTokens.values()).filter(
      (t) => t.farmerId === targetFarmerId
    );
  }

  public getCscOperatorWorkspace(actorId: string) {
    this.requireRole(actorId, ["CSC_OPERATOR", "PLATFORM_ADMIN"]);
    const activeSharesForOperator = Array.from(this.shares.values()).filter(
      (s) =>
        s.granteeId === actorId &&
        s.revokedAt === null &&
        new Date(s.expiresAt).getTime() > Date.now()
    );

    const consentedFarmers = activeSharesForOperator.map((share) => {
      const profile = this.profiles.get(share.ownerId);
      const plots = Array.from(this.plots.values()).filter(
        (p) => p.ownerId === share.ownerId
      );
      return {
        shareId: share.id,
        farmerId: share.ownerId,
        farmerName: profile?.fullName ?? "Farmer",
        districtCode: profile?.districtCode ?? "KA-MYS",
        scopes: share.scopes,
        purpose: share.purpose,
        expiresAt: share.expiresAt,
        plotCount: plots.length,
      };
    });

    const tokensQueue = Array.from(this.cscTokens.values());
    const whatsappHandoffs = Array.from(this.whatsappMessages.values()).filter(
      (m) => m.handedOffToCsc
    );

    return {
      consentedFarmers,
      tokensQueue,
      whatsappHandoffs,
    };
  }

  public verifyWhatsAppSignature(
    rawBody: string,
    signatureHeader?: string
  ): boolean {
    if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
      return false;
    }
    const expected =
      "sha256=" +
      crypto
        .createHmac("sha256", this.config.WHATSAPP_APP_SECRET)
        .update(rawBody, "utf8")
        .digest("hex");
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signatureHeader, "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  public handleWhatsAppInbound(params: {
    wamid: string;
    fromPhone: string;
    text: string;
    farmerIdOptional?: string;
    lastCustomerMessageHoursAgo?: number;
  }): {
    deduplicated: boolean;
    record: WhatsAppMessageLogRecord;
  } {
    // Idempotency deduplication by wamid
    const existing = this.whatsappMessages.get(params.wamid);
    if (existing) {
      return { deduplicated: true, record: existing };
    }

    const fromPhoneHash = hashLookupToken(params.fromPhone);
    const trimmed = params.text.trim();
    const upper = trimmed.toUpperCase();
    const within24hWindow = (params.lastCustomerMessageHoursAgo ?? 0) <= 24;

    if (upper === "STOP" || upper === "UNSUBSCRIBE" || trimmed === "ನಿಲ್ಲಿಸಿ") {
      this.whatsappOptOuts.add(fromPhoneHash);
      const stopRecord: WhatsAppMessageLogRecord = {
        wamid: params.wamid,
        fromPhoneHash,
        farmerId: params.farmerIdOptional ?? null,
        inboundText: trimmed,
        selectedOption: "OPT_OUT",
        replyTextKn:
          "ನೀವು ವಾಟ್ಸಾಪ್ ಸೂಚನೆಗಳಿಂದ ಹೊರಬಂದಿದ್ದೀರಿ (Opted out). ಮತ್ತೆ ಪ್ರಾರಂಭಿಸಲು START ಎಂದು ಕಳುಹಿಸಿ.",
        replyTextEn:
          "You have opted out of proactive WhatsApp alerts. Reply START anytime to re-enable.",
        within24hWindow,
        optedOut: true,
        handedOffToCsc: false,
        isMock: true,
        createdAt: new Date().toISOString(),
      };
      this.whatsappMessages.set(params.wamid, stopRecord);
      return { deduplicated: false, record: stopRecord };
    }

    if (upper === "START") {
      this.whatsappOptOuts.delete(fromPhoneHash);
    }

    let selectedOption = "MENU";
    let replyTextKn = "";
    let replyTextEn = "";
    let handedOffToCsc = false;

    switch (trimmed) {
      case "1":
        selectedOption = "1_MY_SCHEMES";
        replyTextKn =
          "🌾 [ಡೆಮೊ] ನಿಮ್ಮ ಜಮೀನಿಗೆ 3 ಮಾದರಿ ಯೋಜನೆಗಳು ಹೊಂದಿಕೆಯಾಗಿವೆ:\n1) ಸೂಕ್ಷ್ಮ ನೀರಾವರಿ ಸಹಾಯಧನ (ಅರ್ಹತೆ ಸಾಧ್ಯತೆ ಇದೆ)\n2) ಬೆಳೆ ವಿಮೆ ರಕ್ಷಣೆ (ಪರಿಶೀಲನೆ ಬಾಕಿ)\nಆಪ್‌ನಲ್ಲಿ ಸಂಪೂರ್ಣ ನಿಯಮಗಳನ್ನು ನೋಡಿ.";
        replyTextEn =
          "🌾 [DEMO] 3 schemes evaluated for your farm profile:\n1) Micro-Irrigation Assistance (Likely Eligible)\n2) Seasonal Crop Insurance (Needs Verification).";
        break;
      case "2":
        selectedOption = "2_REPORT_CROP_DAMAGE";
        replyTextKn =
          "🚨 ಬೆಳೆ ಹಾನಿ ತುರ್ತು ಮಾರ್ಗದರ್ಶಿ:\n1) ಹಾನಿಯ ಕಾರಣ ಆಯ್ಕೆಮಾಡಿ (ಮಳೆ/ಆಲಿಕಲ್ಲು/ಬರ)\n2) ಜಿಪಿಎಸ್ ಸ್ಥಳದೊಂದಿಗೆ 4 ಫೋಟೋ ತೆಗೆಯಿರಿ\n3) ಗಡುವು ಪರಿಶೀಲಿಸಲಾಗಿಲ್ಲ — ನಿಮ್ಮ ವಿಮಾ ಪಾಲಿಸಿ ನೋಡಿ.";
        replyTextEn =
          "🚨 Crop Loss Rescue:\n1) Select peril cause\n2) Capture 4 geo-tagged photos\n3) Deadline not verified — verify your policy notification.";
        break;
      case "3":
        selectedOption = "3_CHECK_DEADLINES";
        replyTextKn =
          "⏰ [ಡೆಮೊ] ಮುಂಬರುವ ಗಡುವುಗಳು:\n• ಸೂಕ್ಷ್ಮ ನೀರಾವರಿ ಅರ್ಜಿ: 15 ಡಿಸೆಂಬರ್ 2026 [DEMO]\n• ಬೆಳೆ ವಿಮೆ ಹಿಂಗಾರು: ಗಡುವು ಪರಿಶೀಲಿಸಲಾಗಿಲ್ಲ.";
        replyTextEn =
          "⏰ [DEMO] Upcoming Deadlines:\n• Micro-Irrigation Cutoff: 15 Dec 2026 [DEMO]\n• Rabi Crop Insurance: Deadline not verified.";
        break;
      case "4":
        selectedOption = "4_UPLOAD_DOCUMENT";
        replyTextKn =
          "📄 ದಾಖಲೆ ಎಕ್ಸ್-ರೇ (Document X-Ray): ನಿಮ್ಮ ಪಹಣಿ (RTC) ಫೋಟೋ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ ಹೆಸರು ಮತ್ತು ಸರ್ವೆ ನಂ ಹೊಂದಾಣಿಕೆ ಪರಿಶೀಲಿಸಿ.",
        replyTextEn =
          "📄 Document X-Ray: Upload your RTC/Pahani to check for name or survey number mismatches before applying.";
        break;
      case "5":
        selectedOption = "5_PAYMENT_GUIDANCE";
        replyTextKn =
          "🏦 ಹಣ ಮತ್ತು DBT ಮಾರ್ಗದರ್ಶಿ: ಸಹಾಯಧನ ವಿಳಂಬವಾದರೆ ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಶಾಖೆಯಲ್ಲಿ 'NPCI DBT Mapper' ಸಕ್ರಿಯವಾಗಿದೆಯೇ ಎಂದು ಪರಿಶೀಲಿಸಿ. ಯಾರಿಗೂ OTP/ಪಿನ್ ನೀಡಬೇಡಿ.",
        replyTextEn =
          "🏦 Payment & DBT Guidance: Verify 'NPCI DBT Mapper Seeding' at your bank branch if a benefit is delayed. Never share OTP or UPI PIN.";
        break;
      case "6":
        selectedOption = "6_SCAM_SHIELD";
        replyTextKn =
          "🛡️ ವಂಚನೆ ರಕ್ಷಕ (Scam Shield): ಸಂಶಯಾಸ್ಪದ ಸಂದೇಶ ಅಥವಾ ಲಿಂಕ್ ಅನ್ನು ಇಲ್ಲಿ ಪೇಸ್ಟ್ ಮಾಡಿ. ಸರ್ಕಾರಿ ಇಲಾಖೆಗಳು ಎಂದಿಗೂ .apk ಫೈಲ್ ಅಥವಾ UPI ಪಿನ್ ಕೇಳುವುದಿಲ್ಲ.",
        replyTextEn =
          "🛡️ Scam Shield: Forward suspicious text here. Official departments never send .apk files or ask for your UPI PIN/OTP.";
        break;
      case "7":
        selectedOption = "7_CSC_HANDOFF";
        handedOffToCsc = true;
        replyTextKn =
          "🤝 ನಿಮ್ಮ ವಿನಂತಿಯನ್ನು ಸ್ಥಳೀಯ CSC / ರೈತ ಸಹಾಯ ಕೇಂದ್ರದ ಸರತಿಗೆ ಸೇರಿಸಲಾಗಿದೆ (Token: KA-CSC-WA). ಆಪರೇಟರ್ ನಿಮಗೆ ಸಹಾಯ ಮಾಡುತ್ತಾರೆ.",
        replyTextEn =
          "🤝 Your conversation has been queued for a CSC Operator with your context summary (Token: KA-CSC-WA).";
        break;
      case "8":
        selectedOption = "8_CHANGE_LANGUAGE";
        replyTextKn =
          "🌐 ಭಾಷೆ ಬದಲಾವಣೆ: ಕನ್ನಡ (kn), English (en), हिन्दी (hi) ಮತ್ತು ಇತರ ಭಾರತೀಯ ಭಾಷೆಗಳು ಲಭ್ಯವಿವೆ.",
        replyTextEn =
          "🌐 Language Selection: Kannada (kn), English (en), Hindi (hi) + 22 Scheduled Indian Languages registry available.";
        break;
      default:
        selectedOption = "MAIN_MENU";
        replyTextKn =
          "ನಮಸ್ಕಾರ! ಅಗ್ರೋ AI ಸ್ಕೀಮ್ (ಸ್ವತಂತ್ರ ರೈತ ಸಹಾಯ ವೇದಿಕೆ — ಅಧಿಕೃತ ಸರ್ಕಾರಿ ಆಪ್ ಅಲ್ಲ).\nಸಂಖ್ಯೆ ಕಳುಹಿಸಿ:\n1) ನನ್ನ ಯೋಜನೆಗಳು\n2) ಬೆಳೆ ಹಾನಿ ವರದಿ\n3) ಗಡುವು ಪರಿಶೀಲನೆ\n4) ದಾಖಲೆ ಎಕ್ಸ್-ರೇ\n5) ಹಣ/DBT ಮಾರ್ಗದರ್ಶಿ\n6) ವಂಚನೆ ರಕ್ಷಕ\n7) CSC ಸಹಾಯ ಕೇಂದ್ರ\n8) ಭಾಷೆ ಬದಲಿಸಿ";
        replyTextEn =
          "Namaskara! Agro AI Scheme (Independent farmer assistant — NOT an official government app).\nReply with a number:\n1) My Schemes\n2) Report Crop Damage\n3) Check Deadlines\n4) Document X-Ray\n5) Payment/DBT Guidance\n6) Scam Shield\n7) Talk to CSC Helper\n8) Change Language";
        break;
    }

    const record: WhatsAppMessageLogRecord = {
      wamid: params.wamid,
      fromPhoneHash,
      farmerId: params.farmerIdOptional ?? null,
      inboundText: trimmed,
      selectedOption,
      replyTextKn,
      replyTextEn,
      within24hWindow,
      optedOut: this.whatsappOptOuts.has(fromPhoneHash),
      handedOffToCsc,
      isMock: true,
      createdAt: new Date().toISOString(),
    };
    this.whatsappMessages.set(params.wamid, record);
    this.appendAudit({
      actorId: params.farmerIdOptional ?? null,
      actorRole: "WHATSAPP_USER",
      action: "WHATSAPP_INBOUND_PROCESSED",
      targetType: "WHATSAPP_MESSAGE",
      targetId: params.wamid,
      metadata: { selectedOption, handedOffToCsc, within24hWindow },
    });
    return { deduplicated: false, record };
  }

  public async sendWhatsAppReport(params: {
    userId?: string;
    phone: string;
    reportText: string;
    mediaUrl?: string;
  }): Promise<WhatsAppSendResult> {
    const cleanPhone = (params.phone || "").replace(/\D/g, "").slice(-10);
    const result = await this.twilioWhatsAppProvider.sendWhatsAppReport({
      toPhone: cleanPhone,
      bodyText: params.reportText,
      mediaUrl: params.mediaUrl,
    });

    const wamid = `wamid-${result.messageSid}`;
    const phoneHash = crypto
      .createHash("sha256")
      .update(cleanPhone || "anonymous")
      .digest("hex");

    const record: WhatsAppMessageLogRecord = {
      wamid,
      fromPhoneHash: phoneHash,
      farmerId: params.userId ?? null,
      inboundText: "OUTBOUND_FARMER_REPORT",
      selectedOption: "TWILIO_WHATSAPP_DISPATCH",
      replyTextKn: params.reportText,
      replyTextEn: params.reportText,
      within24hWindow: true,
      optedOut: false,
      handedOffToCsc: false,
      isMock: true,
      createdAt: result.sentAt,
    };
    this.whatsappMessages.set(wamid, record);

    this.appendAudit({
      actorId: params.userId ?? "anonymous",
      actorRole: "FARMER",
      action: "WHATSAPP_REPORT_DISPATCHED",
      targetType: "WHATSAPP_MESSAGE",
      targetId: result.messageSid,
      metadata: {
        provider: result.provider,
        status: result.status,
        isMock: result.isMock,
        to: result.to,
      },
    });

    return result;
  }

  // --------------------------------------------------------------------------
  // Phase 8: Admin Overview & Real Database Metrics
  // --------------------------------------------------------------------------

  public getAdminOverview(actorId: string) {
    this.requireRole(actorId, ["PLATFORM_ADMIN", "SECURITY_AUDITOR"]);
    const allUsers = Array.from(this.users.values());
    const allSchemes = Array.from(this.schemeVersions.values());

    return {
      metrics: {
        totalUsers: allUsers.length,
        farmersCount: allUsers.filter((u) => u.roles.includes("FARMER")).length,
        staffCount: allUsers.filter((u) => !u.roles.includes("FARMER")).length,
        plotsCount: this.plots.size,
        cropsCount: this.crops.size,
        publishedSchemesCount: allSchemes.filter((s) => s.status === "PUBLISHED")
          .length,
        inReviewSchemesCount: allSchemes.filter((s) => s.status === "IN_REVIEW")
          .length,
        ruleEvaluationsCount: this.ruleEvaluations.length,
        claimsCount: this.claims.size,
        receiptsCount: this.receipts.size,
        scamReportsCount: this.scamReports.length,
        cscTokensCount: this.cscTokens.size,
        whatsappMessagesCount: this.whatsappMessages.size,
        auditLogsCount: this.auditLogs.length,
      },
      adaptersHealth: {
        llm: { provider: this.config.LLM_PROVIDER, isMock: true, status: "HEALTHY" },
        stt: { provider: this.config.STT_PROVIDER, isMock: true, status: "HEALTHY" },
        sms: { provider: this.config.SMS_PROVIDER, isMock: true, status: "HEALTHY" },
        email: { provider: this.config.EMAIL_PROVIDER, isMock: true, status: "HEALTHY" },
        whatsapp: { provider: "mock_cloud_api", isMock: true, status: "HEALTHY" },
      },
      languagesRegistry: SCHEDULED_INDIAN_LANGUAGES,
      recentScamReports: this.scamReports.slice(-10),
      schemes: allSchemes,
    };
  }

  /**
   * Issues an authenticated DEMO session for the Farmer App or Staff Portals
   * (/csc, /reviewer, /admin) so all interactive workflows run against real
   * server-side state and RBAC guards out of the box.
   */
  public getOrCreateDemoSession(
    role: "FARMER" | "CSC_OPERATOR" | "SCHEME_REVIEWER" | "PLATFORM_ADMIN"
  ) {
    this.assertDemoAllowed("getOrCreateDemoSession");
    const emailMap: Record<typeof role, string> = {
      FARMER: "demo.farmer@agro.example",
      CSC_OPERATOR: "demo.csc@agro.example",
      SCHEME_REVIEWER: "demo.reviewer@agro.example",
      PLATFORM_ADMIN: "demo.admin@agro.example",
    };
    const nameMap: Record<typeof role, string> = {
      FARMER: "ಶಿವಣ್ಣ ಗೌಡ (Shivanna Gowda)",
      CSC_OPERATOR: "ಕಾವೇರಿ ಸಿಎಸ್‌ಸಿ ಕೇಂದ್ರ (Kaveri CSC Operator)",
      SCHEME_REVIEWER: "ಡಾ. ಆನಂದ್ ರಾವ್ (Dr. Anand — Scheme Reviewer)",
      PLATFORM_ADMIN: "ಸಿಸ್ಟಮ್ ಅಡ್ಮಿನ್ (Platform Admin)",
    };

    const email = emailMap[role];
    let user = Array.from(this.users.values()).find((u) => u.email === email);
    const nowIso = new Date().toISOString();

    if (!user) {
      const userId = uuidv7();
      user = {
        id: userId,
        email,
        phoneEncrypted: null,
        phoneHash: null,
        passwordHash: hashPassword("DemoStrongPassphrase2026!"),
        emailVerifiedAt: nowIso,
        phoneVerifiedAt: nowIso,
        failedLoginAttempts: 0,
        lockedUntil: null,
        deletionRequestedAt: null,
        deletionGraceEndsAt: null,
        roles: [role],
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      this.users.set(userId, user);
      this.profiles.set(userId, {
        id: uuidv7(),
        userId,
        fullName: nameMap[role],
        preferredLanguage: "kn",
        state: "Karnataka",
        districtCode: "KA-MYS",
        talukCode: "KA-MYS-HDK",
        villageCode: "KA-MYS-HDK-001",
        farmerCategory: "SMALL",
        hasKccCard: true,
        livestockTypes: ["DAIRY"],
        elderOrLowLiteracyMode: false,
        provenance: "FARMER_ENTERED",
        verifiedAt: null,
        updatedAt: nowIso,
      });

      if (role === "FARMER") {
        const plot = this.addFarmPlot(userId, userId, {
          plotName: "ಹೊಲ 1 — ಕಾವೇರಿ ತಾಕು (Plot 1)",
          surveyNumber: "142/2A",
          districtCode: "KA-MYS",
          talukCode: "KA-MYS-HDK",
          villageCode: "KA-MYS-HDK-001",
          areaValue: 2.5,
          areaUnit: "ACRE",
          ownershipType: "OWNER",
          irrigationType: "BOREWELL",
          soilType: "RED",
          provenance: "FARMER_ENTERED",
        });
        this.addCropRecord(userId, userId, {
          plotId: plot.id,
          season: "KHARIF",
          year: 2026,
          cropCode: "RAGI",
          cropNameEn: "Ragi (Finger Millet)",
          cropNameKn: "ರಾಗಿ",
          sownAreaHectares: 1.0117,
          isInsuredUnderPmfby: true,
          provenance: "FARMER_ENTERED",
        });
      }
    }

    // Ensure if CSC_OPERATOR is requested, the demo farmer has granted an active share to them
    if (role === "CSC_OPERATOR") {
      const demoFarmer = this.getOrCreateDemoSession("FARMER").user;
      const existingShare = Array.from(this.shares.values()).find(
        (s) =>
          s.ownerId === demoFarmer.id &&
          s.granteeId === user!.id &&
          s.revokedAt === null
      );
      if (!existingShare) {
        this.grantAuthorizedShare(demoFarmer.id, user.id, {
          granteeRole: "CSC_OPERATOR",
          scopes: [
            "profile:read",
            "plots:read",
            "plots:write",
            "schemes:read",
            "documents:read",
            "cases:read",
            "cases:write",
          ],
          expiresInDays: 30,
          purpose: "DEMO: Consented CSC assistance for scheme & claim filing",
        });
      }
    }

    return this.issueSessionTokens(user, true, "AgroDemoBootstrap/1.0", "127.0.0.1");
  }

  // --------------------------------------------------------------------------
  // Deadline Guardian: Preferences, Quiet Hours, Opt-Out & Deduplication
  // --------------------------------------------------------------------------

  public getOrUpdateReminderPreferences(
    actorId: string,
    targetFarmerId: string,
    updates?: Partial<
      Pick<
        ReminderPreferencesRecord,
        | "inAppEnabled"
        | "whatsappEnabled"
        | "quietHoursStart"
        | "quietHoursEnd"
        | "optedOut"
      >
    >
  ): {
    preferences: ReminderPreferencesRecord;
    deliveries: ReminderDeliveryRecord[];
  } {
    this.authorizeFarmerResourceAccess(actorId, targetFarmerId, "profile:read");
    const existing = this.reminderPrefs.get(targetFarmerId) ?? {
      farmerId: targetFarmerId,
      inAppEnabled: true,
      whatsappEnabled: false,
      quietHoursStart: "21:00",
      quietHoursEnd: "07:00",
      optedOut: false,
      updatedAt: new Date().toISOString(),
    };

    if (updates) {
      if (actorId !== targetFarmerId) {
        throw new AuthorizationError(
          "Only the farmer can modify reminder preferences",
          403
        );
      }
      const next: ReminderPreferencesRecord = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.reminderPrefs.set(targetFarmerId, next);
      this.appendAudit({
        actorId,
        actorRole: "FARMER",
        action: "REMINDER_PREFERENCES_UPDATED",
        targetType: "REMINDER_PREFS",
        targetId: targetFarmerId,
        metadata: { ...updates },
      });
    } else if (!this.reminderPrefs.has(targetFarmerId)) {
      this.reminderPrefs.set(targetFarmerId, existing);
    }

    const preferences = this.reminderPrefs.get(targetFarmerId)!;
    const deliveries = Array.from(this.reminderDeliveries.values()).filter(
      (d) => d.farmerId === targetFarmerId
    );
    return { preferences, deliveries };
  }

  public triggerDeadlineGuardianEvaluation(
    actorId: string,
    targetFarmerId: string,
    simulatedHourIst = 14
  ): {
    preferences: ReminderPreferencesRecord;
    newlyProcessed: ReminderDeliveryRecord[];
    allDeliveries: ReminderDeliveryRecord[];
  } {
    this.authorizeFarmerResourceAccess(actorId, targetFarmerId, "profile:read");
    const { preferences } = this.getOrUpdateReminderPreferences(
      actorId,
      targetFarmerId
    );

    const startHour = Number(preferences.quietHoursStart.split(":")[0] ?? 21);
    const endHour = Number(preferences.quietHoursEnd.split(":")[0] ?? 7);
    const inQuietHours =
      startHour > endHour
        ? simulatedHourIst >= startHour || simulatedHourIst < endHour
        : simulatedHourIst >= startHour && simulatedHourIst < endHour;

    const publishedSchemes = Array.from(this.schemeVersions.values()).filter(
      (s) => s.status === "PUBLISHED"
    );

    const newlyProcessed: ReminderDeliveryRecord[] = [];
    for (const scheme of publishedSchemes) {
      for (const dl of scheme.deadlines) {
        const idempotencyKey = `${targetFarmerId}:${dl.id}:${dl.dueDateIso ?? "none"}`;
        const alreadySent = Array.from(this.reminderDeliveries.values()).find(
          (r) =>
            r.idempotencyKey === idempotencyKey && r.status === "DELIVERED"
        );
        if (alreadySent) {
          // Deduplicated! Do not create duplicate alert
          continue;
        }

        let status: ReminderDeliveryRecord["status"] = "DELIVERED";
        if (preferences.optedOut || !preferences.inAppEnabled) {
          status = "SUPPRESSED_OPT_OUT";
        } else if (!dl.isVerified || !dl.dueDateIso) {
          status = "SUPPRESSED_UNVERIFIED";
        } else if (inQuietHours) {
          status = "DEFERRED_QUIET_HOURS";
        }

        const record: ReminderDeliveryRecord = {
          id: uuidv7(),
          farmerId: targetFarmerId,
          deadlineId: dl.id,
          schemeTitleEn: scheme.titleEn,
          schemeTitleKn: scheme.titleKn,
          dueDateIso: dl.dueDateIso ?? "Deadline not verified",
          sourceUrl: dl.sourceUrl,
          lastVerifiedAt: dl.lastVerifiedAt,
          channel: preferences.whatsappEnabled ? "WHATSAPP_GATED" : "IN_APP",
          status,
          idempotencyKey,
          createdAt: new Date().toISOString(),
        };
        this.reminderDeliveries.set(record.id, record);
        newlyProcessed.push(record);
      }
    }

    this.appendAudit({
      actorId,
      actorRole: actorId === targetFarmerId ? "FARMER" : "SHARED_HELPER",
      action: "DEADLINE_GUARDIAN_EVALUATED",
      targetType: "REMINDER_PREFS",
      targetId: targetFarmerId,
      metadata: {
        newlyProcessedCount: newlyProcessed.length,
        inQuietHours,
      },
    });

    const allDeliveries = Array.from(this.reminderDeliveries.values()).filter(
      (d) => d.farmerId === targetFarmerId
    );
    return { preferences, newlyProcessed, allDeliveries };
  }

  // --------------------------------------------------------------------------
  // Status Tracker & Manual/CSC Case History with Full Audit Trail
  // --------------------------------------------------------------------------

  public createStatusTrackingCase(
    actorId: string,
    targetFarmerId: string,
    params: {
      caseType: "SCHEME_APPLICATION" | "INSURANCE_CLAIM";
      referenceNumber: string;
      schemeOrPolicyTitle: string;
      initialStatus?: ManualCaseStatus;
      note?: string;
    }
  ): StatusTrackingCaseRecord {
    this.authorizeFarmerResourceAccess(actorId, targetFarmerId, "cases:write");
    const actorUser = this.requireUser(actorId);
    const actorProfile = this.profiles.get(actorId);
    const nowIso = new Date().toISOString();
    const id = uuidv7();
    const status = params.initialStatus ?? "SUBMITTED_MANUALLY";

    const firstHistory: StatusHistoryEntry = {
      id: uuidv7(),
      status,
      sourceMode: "MANUAL_UPDATE",
      enteredByActorId: actorId,
      enteredByRole: actorUser.roles.join(","),
      enteredByName: actorProfile?.fullName ?? "User",
      note:
        params.note?.trim() ||
        "Recorded manually (no live external portal integration configured).",
      timestampIso: nowIso,
    };

    const record: StatusTrackingCaseRecord = {
      id,
      farmerId: targetFarmerId,
      caseType: params.caseType,
      referenceNumber: params.referenceNumber.trim(),
      schemeOrPolicyTitle: params.schemeOrPolicyTitle.trim(),
      currentStatus: status,
      sourceMode: "MANUAL_UPDATE",
      statusHistory: [firstHistory],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.statusCases.set(id, record);
    this.appendAudit({
      actorId,
      actorRole: actorUser.roles.join(","),
      action: "STATUS_CASE_CREATED_MANUAL",
      targetType: "STATUS_CASE",
      targetId: id,
      metadata: {
        referenceNumber: record.referenceNumber,
        status,
        sourceMode: "MANUAL_UPDATE",
      },
    });
    return record;
  }

  public updateStatusTrackingCaseManually(
    actorId: string,
    targetFarmerId: string,
    caseId: string,
    params: {
      status: ManualCaseStatus;
      note: string;
    }
  ): StatusTrackingCaseRecord {
    this.authorizeFarmerResourceAccess(actorId, targetFarmerId, "cases:write");
    const record = this.statusCases.get(caseId);
    if (!record || record.farmerId !== targetFarmerId) {
      throw new AuthorizationError("Tracking case not found", 404);
    }
    const actorUser = this.requireUser(actorId);
    const actorProfile = this.profiles.get(actorId);
    const nowIso = new Date().toISOString();

    const entry: StatusHistoryEntry = {
      id: uuidv7(),
      status: params.status,
      sourceMode: "MANUAL_UPDATE",
      enteredByActorId: actorId,
      enteredByRole: actorUser.roles.join(","),
      enteredByName: actorProfile?.fullName ?? "User",
      note: params.note.trim() || "Manual status update",
      timestampIso: nowIso,
    };

    record.currentStatus = params.status;
    record.statusHistory.push(entry);
    record.updatedAt = nowIso;

    this.appendAudit({
      actorId,
      actorRole: actorUser.roles.join(","),
      action: "STATUS_CASE_UPDATED_MANUAL",
      targetType: "STATUS_CASE",
      targetId: caseId,
      metadata: {
        status: params.status,
        enteredByRole: entry.enteredByRole,
      },
    });
    return record;
  }

  public listStatusTrackingCases(
    actorId: string,
    targetFarmerId: string
  ): StatusTrackingCaseRecord[] {
    this.authorizeFarmerResourceAccess(actorId, targetFarmerId, "cases:read");
    return Array.from(this.statusCases.values()).filter(
      (c) => c.farmerId === targetFarmerId
    );
  }

  // --------------------------------------------------------------------------
  // Consent-Gated Document Upload, Validation, Malware Scan & Signed Links
  // --------------------------------------------------------------------------

  public uploadConsentGatedDocument(
    actorId: string,
    targetFarmerId: string,
    params: {
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      documentType: PrivateDocumentRecord["documentType"];
      contentPreviewOrBase64: string;
      consentGranted: boolean;
    }
  ): {
    document: PrivateDocumentRecord;
    signedAccessUrl: string;
    expiresAtIso: string;
  } {
    this.authorizeFarmerResourceAccess(actorId, targetFarmerId, "cases:write");
    if (!params.consentGranted) {
      throw new ValidationError(
        "Explicit farmer consent is required before uploading documents."
      );
    }

    const allowedMimes = new Set([
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
    if (!allowedMimes.has(params.mimeType)) {
      throw new ValidationError(
        `Unsupported file type (${params.mimeType}). Allowed: PDF, JPEG, PNG, WEBP.`
      );
    }

    if (params.sizeBytes <= 0 || params.sizeBytes > 5 * 1024 * 1024) {
      throw new ValidationError("File size must be between 1 byte and 5 MB.");
    }

    const lowerName = params.fileName.toLowerCase();
    const lowerPayload = params.contentPreviewOrBase64.toLowerCase();
    if (
      lowerName.endsWith(".apk") ||
      lowerName.endsWith(".exe") ||
      lowerName.endsWith(".bat") ||
      lowerName.endsWith(".sh") ||
      lowerPayload.includes("x5o!p%@ap[4\\pzx54(p^)7cc)7}$eicar") ||
      lowerPayload.includes("<script")
    ) {
      this.appendAudit({
        actorId,
        actorRole: "FARMER",
        action: "DOCUMENT_UPLOAD_BLOCKED_MALWARE_SCAN",
        targetType: "DOCUMENT",
        targetId: targetFarmerId,
        metadata: { fileName: params.fileName },
      });
      throw new ValidationError(
        "Security scan rejected upload: potentially unsafe executable, script, or malware signature detected."
      );
    }

    const actorUser = this.requireUser(actorId);
    const id = uuidv7();
    const sha256Hash = crypto
      .createHash("sha256")
      .update(`${params.fileName}:${params.sizeBytes}:${params.contentPreviewOrBase64}`)
      .digest("hex");

    const doc: PrivateDocumentRecord = {
      id,
      farmerId: targetFarmerId,
      fileName: params.fileName,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
      documentType: params.documentType,
      sha256Hash,
      malwareScanStatus: "CLEAN",
      consentGranted: true,
      uploadedByActorId: actorId,
      uploadedByRole: actorUser.roles.join(","),
      createdAt: new Date().toISOString(),
    };

    this.privateDocuments.set(id, doc);
    const signed = signPrivateFileToken(
      id,
      targetFarmerId,
      this.config.JWT_ACCESS_SECRET,
      300
    );

    this.appendAudit({
      actorId,
      actorRole: actorUser.roles.join(","),
      action: "PRIVATE_DOCUMENT_UPLOADED_AND_SCANNED",
      targetType: "DOCUMENT",
      targetId: id,
      metadata: {
        documentType: params.documentType,
        malwareScanStatus: "CLEAN",
        sizeBytes: params.sizeBytes,
      },
    });

    return {
      document: doc,
      signedAccessUrl: `/api/v1/documents/private/${id}?token=${signed.token}`,
      expiresAtIso: signed.expiresAtIso,
    };
  }

  public verifyAndReadPrivateDocument(
    documentId: string,
    signedToken: string
  ): PrivateDocumentRecord {
    const verified = verifyPrivateFileToken(
      signedToken,
      this.config.JWT_ACCESS_SECRET
    );
    if (!verified || verified.docId !== documentId) {
      throw new AuthorizationError(
        "Invalid or expired signed document link",
        403
      );
    }
    const doc = this.privateDocuments.get(documentId);
    if (!doc) {
      throw new ValidationError("Document not found");
    }
    return doc;
  }

  public listPrivateDocuments(
    actorId: string,
    targetFarmerId: string
  ): Array<{
    document: PrivateDocumentRecord;
    signedAccessUrl: string;
    expiresAtIso: string;
  }> {
    this.authorizeFarmerResourceAccess(actorId, targetFarmerId, "documents:read");
    return Array.from(this.privateDocuments.values())
      .filter((d) => d.farmerId === targetFarmerId)
      .map((doc) => {
        const signed = signPrivateFileToken(
          doc.id,
          targetFarmerId,
          this.config.JWT_ACCESS_SECRET,
          300
        );
        return {
          document: doc,
          signedAccessUrl: `/api/v1/documents/private/${doc.id}?token=${signed.token}`,
          expiresAtIso: signed.expiresAtIso,
        };
      });
  }

  // --------------------------------------------------------------------------
  // Voice-First Agro GPT Assistant (Server-Side OpenAI + Confirmation Gate)
  // --------------------------------------------------------------------------

  public async chatWithAgroGpt(
    actorId: string,
    targetFarmerId: string,
    params: {
      message: string;
      language: SupportedLanguage;
      inputMode: "VOICE" | "TEXT";
    }
  ): Promise<{
    replyText: string;
    replyLanguage: SupportedLanguage;
    providerMode: "OPENAI_LIVE" | "GROUNDED_SCHEME_ENGINE";
    citedSchemes: Array<{
      schemeCode: string;
      title: string;
      sourceUrl: string;
      lastVerifiedAt: string | null;
      eligibilityStatus: string;
    }>;
    pendingConfirmation: AgroGptPendingActionRecord | null;
  }> {
    this.authorizeFarmerResourceAccess(actorId, targetFarmerId, "schemes:read");
    const matches = await this.evaluateSchemesForFarmer(
      actorId,
      targetFarmerId,
      params.language
    );
    const profile = this.profiles.get(targetFarmerId);
    const citedSchemes = matches.map((m) => ({
      schemeCode: m.schemeVersion.schemeCode,
      title:
        params.language === "kn"
          ? m.schemeVersion.titleKn
          : m.schemeVersion.titleEn,
      sourceUrl: m.schemeVersion.sourceUrl,
      lastVerifiedAt: m.schemeVersion.sourceLastVerifiedAt,
      eligibilityStatus: m.evaluation.status,
      freshnessStatus: m.freshness.freshnessStatus,
      freshnessWarning:
        params.language === "kn"
          ? m.freshness.warningMessageKn
          : params.language === "hi"
            ? m.freshness.warningMessageHi
            : m.freshness.warningMessageEn,
    }));

    const lower = params.message.toLowerCase();
    let pendingConfirmation: AgroGptPendingActionRecord | null = null;

    // Check if the farmer is asking to perform a consequential write action:
    // 1) Recording a reference number / tracking case
    const refMatch = params.message.match(
      /\b([A-Za-z]{2,10}-[A-Za-z0-9-]{3,25}|\d{8,20})\b/
    );
    if (refMatch && refMatch[1]) {
      const refNum = refMatch[1].toUpperCase();
      const token = `confirm_${uuidv7()}`;
      pendingConfirmation = {
        confirmationToken: token,
        farmerId: targetFarmerId,
        actionType: "CREATE_STATUS_CASE",
        summaryEn: `Confirm saving application reference number "${refNum}" to your Status Tracker (Manual update mode)?`,
        summaryKn: `ನಿಮ್ಮ ಅರ್ಜಿ ಉಲ್ಲೇಖ ಸಂಖ್ಯೆ "${refNum}" ಅನ್ನು ಸ್ಥಿತಿ ಟ್ರ್ಯಾಕರ್‌ನಲ್ಲಿ ಉಳಿಸಲು ದೃಢೀಕರಿಸುತ್ತೀರಾ?`,
        payload: {
          referenceNumber: refNum,
          schemeOrPolicyTitle:
            citedSchemes[0]?.title ?? "Scheme Application",
        },
        expiresAtIso: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        confirmedAtIso: null,
      };
      this.pendingAiActions.set(token, pendingConfirmation);
    } else if (
      lower.includes("change crop") ||
      lower.includes("update crop") ||
      lower.includes("add paddy") ||
      lower.includes("add tur") ||
      lower.includes("add maize") ||
      lower.includes("ಬೆಳೆ ಸೇರಿಸಿ") ||
      lower.includes("ಭತ್ತ")
    ) {
      const newCrop = lower.includes("tur")
        ? "TUR"
        : lower.includes("maize")
          ? "MAIZE"
          : "PADDY";
      const token = `confirm_${uuidv7()}`;
      pendingConfirmation = {
        confirmationToken: token,
        farmerId: targetFarmerId,
        actionType: "UPDATE_PROFILE_CROP",
        summaryEn: `Confirm adding seasonal crop "${newCrop}" to your primary plot before saving?`,
        summaryKn: `ನಿಮ್ಮ ಮೊದಲ ಜಮೀನು ತಾಕಿಗೆ "${newCrop}" ಬೆಳೆಯನ್ನು ಸೇರಿಸಲು ದೃಢೀಕರಿಸುತ್ತೀರಾ?`,
        payload: { cropCode: newCrop },
        expiresAtIso: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        confirmedAtIso: null,
      };
      this.pendingAiActions.set(token, pendingConfirmation);
    }

    // If server-side OPENAI_API_KEY is configured, call OpenAI Chat Completions grounded in scheme data
    if (this.config.OPENAI_API_KEY && this.config.OPENAI_API_KEY.startsWith("sk-")) {
      try {
        const systemPrompt = [
          "You are Agro GPT, a truthful, voice-first agricultural scheme & crop-insurance copilot for Indian farmers.",
          "STRICT RULES:",
          "1. Ground every answer ONLY in the provided verified scheme records and farmer profile facts.",
          "2. Always cite the scheme sourceUrl and lastVerifiedAt date. If a deadline or fact is unverified or missing, explicitly state that it is unverified or missing.",
          "3. Never invent government rules, deadlines, benefit amounts, payment statuses, or claim approvals.",
          `4. Respond concisely in ${params.language === "kn" ? "Kannada (ಕನ್ನಡ)" : params.language === "hi" ? "Hindi" : "English"}.`,
          `Farmer Profile: ${JSON.stringify({ state: profile?.state, districtCode: profile?.districtCode, farmerCategory: profile?.farmerCategory })}`,
          `Evaluated Schemes: ${JSON.stringify(citedSchemes)}`,
        ].join("\n");

        const openAiRes = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.config.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: this.config.OPENAI_MODEL,
            temperature: 0.1,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: params.message },
            ],
          }),
        });
        if (openAiRes.ok) {
          const data = (await openAiRes.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const content = data.choices?.[0]?.message?.content?.trim();
          if (content) {
            this.appendAudit({
              actorId,
              actorRole: "FARMER",
              action: "AGRO_GPT_QUERY_OPENAI_LIVE",
              targetType: "AI_ASSISTANT",
              targetId: targetFarmerId,
              metadata: { inputMode: params.inputMode, language: params.language },
            });
            return {
              replyText: content,
              replyLanguage: params.language,
              providerMode: "OPENAI_LIVE",
              citedSchemes,
              pendingConfirmation,
            };
          }
        }
      } catch {
        // Fall through to grounded deterministic engine if network call fails
      }
    }

    // Grounded response from verified scheme database
    const topScheme = matches[0];
    const staleWarningEn = topScheme?.freshness.warningMessageEn
      ? ` ⚠️ Freshness Note: ${topScheme.freshness.warningMessageEn}`
      : "";
    const staleWarningKn = topScheme?.freshness.warningMessageKn
      ? ` ⚠️ ಮೂಲ ಎಚ್ಚರಿಕೆ: ${topScheme.freshness.warningMessageKn}`
      : "";
    const staleWarningHi = topScheme?.freshness.warningMessageHi
      ? ` ⚠️ स्रोत चेतावनी: ${topScheme.freshness.warningMessageHi}`
      : "";

    const replyText =
      params.language === "kn"
        ? pendingConfirmation
          ? `${pendingConfirmation.summaryKn} ದಯವಿಟ್ಟು ಕೆಳಗಿನ 'ದೃಢೀಕರಿಸಿ' ಬಟನ್ ಒತ್ತಿರಿ. ಮೂಲ: ${topScheme?.schemeVersion.sourceUrl ?? "ಡೇಟಾಬೇಸ್"}`
          : matches.length === 0
            ? `ನಮಸ್ಕಾರ ${profile?.fullName ?? "ರೈತರೇ"}! ಪ್ರಸ್ತುತ ಯಾವುದೇ ಪ್ರಕಟಿತ ಯೋಜನೆ ದಾಖಲೆಗಳು ಲಭ್ಯವಿಲ್ಲ.`
            : `ನಮಸ್ಕಾರ ${profile?.fullName ?? "ರೈತರೇ"}! ನಮ್ಮ ಪರಿಶೀಲಿಸಿದ ಯೋಜನೆಗಳ ಡೇಟಾಬೇಸ್ ಪ್ರಕಾರ ನಿಮಗೆ ${matches.length} ಯೋಜನೆಗಳನ್ನು ಪರಿಶೀಲಿಸಲಾಗಿದೆ. ಪ್ರಮುಖ ಹೊಂದಾಣಿಕೆ: "${topScheme?.schemeVersion.titleKn}" — ಸ್ಥಿತಿ: ${topScheme?.evaluation.status}. ಅಧಿಕೃತ ಮೂಲ: ${topScheme?.schemeVersion.sourceUrl} (ಪರಿಶೀಲಿಸಿದ ದಿನಾಂಕ: ${topScheme?.schemeVersion.sourceLastVerifiedAt?.slice(0, 10) ?? "ಪರಿಶೀಲಿಸಲಾಗಿಲ್ಲ"}).${staleWarningKn}`
        : params.language === "hi"
          ? pendingConfirmation
            ? `${pendingConfirmation.summaryEn} कृपया सहेजने से पहले नीचे 'पुष्टि करें' बटन दबाएं।`
            : matches.length === 0
              ? `नमस्कार ${profile?.fullName ?? "किसान मित्र"}! वर्तमान में कोई सत्यापित योजना रिकॉर्ड उपलब्ध नहीं है।`
              : `नमस्कार ${profile?.fullName ?? "किसान मित्र"}! हमारे सत्यापित योजना डेटाबेस के अनुसार आपकी प्रोफ़ाइल के लिए ${matches.length} योजनाओं का मूल्यांकन किया गया है। प्रमुख मिलान: "${topScheme?.schemeVersion.titleEn}" (${topScheme?.evaluation.status})। आधिकारिक स्रोत: ${topScheme?.schemeVersion.sourceUrl} (सत्यापित तिथि: ${topScheme?.schemeVersion.sourceLastVerifiedAt?.slice(0, 10) ?? "असत्यापित"})।${staleWarningHi}`
          : pendingConfirmation
            ? `${pendingConfirmation.summaryEn} Please click 'Confirm & Save' below before I write this change.`
            : matches.length === 0
              ? `Hello ${profile?.fullName ?? "Farmer"}! No published scheme records are currently loaded.`
              : `Hello ${profile?.fullName ?? "Farmer"}! Based on our verified scheme records, ${matches.length} schemes were evaluated for your profile. Top match: "${topScheme?.schemeVersion.titleEn}" (${topScheme?.evaluation.status}). Source: ${topScheme?.schemeVersion.sourceUrl} (Verified: ${topScheme?.schemeVersion.sourceLastVerifiedAt?.slice(0, 10) ?? "Not verified"}). Note: Unverified deadlines or statuses are never guessed.${staleWarningEn}`;

    this.appendAudit({
      actorId,
      actorRole: "FARMER",
      action: "AGRO_GPT_QUERY_GROUNDED",
      targetType: "AI_ASSISTANT",
      targetId: targetFarmerId,
      metadata: {
        inputMode: params.inputMode,
        language: params.language,
        hasPendingConfirmation: Boolean(pendingConfirmation),
      },
    });

    return {
      replyText,
      replyLanguage: params.language,
      providerMode: "GROUNDED_SCHEME_ENGINE",
      citedSchemes,
      pendingConfirmation,
    };
  }

  public confirmAgroGptAction(
    actorId: string,
    targetFarmerId: string,
    confirmationToken: string
  ): {
    executed: boolean;
    actionType: AgroGptPendingActionRecord["actionType"];
    resultSummary: string;
  } {
    this.authorizeFarmerResourceAccess(actorId, targetFarmerId, "cases:write");
    const pending = this.pendingAiActions.get(confirmationToken);
    if (
      !pending ||
      pending.farmerId !== targetFarmerId ||
      pending.confirmedAtIso !== null ||
      new Date(pending.expiresAtIso).getTime() < Date.now()
    ) {
      throw new ValidationError(
        "Invalid, expired, or already executed confirmation token"
      );
    }

    pending.confirmedAtIso = new Date().toISOString();
    let resultSummary = "";

    if (pending.actionType === "CREATE_STATUS_CASE") {
      const created = this.createStatusTrackingCase(actorId, targetFarmerId, {
        caseType: "SCHEME_APPLICATION",
        referenceNumber: pending.payload.referenceNumber ?? "REF-MANUAL",
        schemeOrPolicyTitle:
          pending.payload.schemeOrPolicyTitle ?? "Scheme Application",
        initialStatus: "SUBMITTED_MANUALLY",
        note: "Confirmed by farmer via Agro GPT assistant",
      });
      resultSummary = `Saved tracking case ${created.referenceNumber} (${created.currentStatus})`;
    } else if (pending.actionType === "UPDATE_PROFILE_CROP") {
      const plots = Array.from(this.plots.values()).filter(
        (p) => p.ownerId === targetFarmerId
      );
      const firstPlot = plots[0];
      if (firstPlot) {
        const cropCode = pending.payload.cropCode ?? "PADDY";
        this.addCropRecord(actorId, targetFarmerId, {
          plotId: firstPlot.id,
          season: "KHARIF",
          year: 2026,
          cropCode,
          cropNameEn: cropCode,
          cropNameKn: cropCode === "PADDY" ? "ಭತ್ತ" : cropCode,
          sownAreaHectares: firstPlot.areaHectares,
          isInsuredUnderPmfby: false,
          provenance: "FARMER_ENTERED",
        });
        resultSummary = `Confirmed and added crop ${cropCode} to plot ${firstPlot.plotName}`;
      }
    }

    this.appendAudit({
      actorId,
      actorRole: "FARMER",
      action: "AGRO_GPT_WRITE_CONFIRMED_AND_EXECUTED",
      targetType: "AI_CONFIRMATION",
      targetId: confirmationToken,
      metadata: { actionType: pending.actionType, resultSummary },
    });

    return {
      executed: true,
      actionType: pending.actionType,
      resultSummary,
    };
  }

  // --------------------------------------------------------------------------
  // Admin Content Tools: Scheme Version Rollback & Live Integration Status
  // --------------------------------------------------------------------------

  public async fetchMandiPrices(district = "Mysore", commodity = "Ragi"): Promise<{
    providerStatus: "LIVE" | "UNAVAILABLE_AWAITING_AGMARKNET_API";
    isMock: false;
    checkedAtIso: string;
    sourceUrl: string;
    records: Array<{
      state: string;
      district: string;
      market: string;
      commodity: string;
      variety: string;
      arrivalDate: string;
      minPriceInrQuintal: string;
      maxPriceInrQuintal: string;
      modalPriceInrQuintal: string;
    }>;
  }> {
    const checkedAtIso = new Date().toISOString();
    const sourceUrl = "https://agmarknet.gov.in";
    if (!this.config.MANDI_API_KEY || !this.config.MANDI_API_KEY.trim()) {
      return {
        providerStatus: "UNAVAILABLE_AWAITING_AGMARKNET_API",
        isMock: false,
        checkedAtIso,
        sourceUrl,
        records: [],
      };
    }

    try {
      const apiKey = encodeURIComponent(this.config.MANDI_API_KEY.trim());
      const url = `https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070?api-key=${apiKey}&format=json&limit=5&filters[state.keyword]=Karnataka`;
      const rawRecords = await this.executeWithReliabilityGuard(
        "mandi_agmarknet_api",
        async () => {
          const res = await fetch(url, {
            method: "GET",
            headers: { Accept: "application/json" },
          });
          if (!res.ok) {
            throw new Error(`Upstream Agmarknet HTTP ${res.status}`);
          }
          const body = (await res.json()) as {
            records?: Array<Record<string, string>>;
          };
          return Array.isArray(body.records) ? body.records : [];
        },
        { timeoutMs: 3500, maxAttempts: 2, isIdempotent: true }
      );

      if (rawRecords.length === 0) {
        return {
          providerStatus: "UNAVAILABLE_AWAITING_AGMARKNET_API",
          isMock: false,
          checkedAtIso,
          sourceUrl,
          records: [],
        };
      }

      return {
        providerStatus: "LIVE",
        isMock: false,
        checkedAtIso,
        sourceUrl,
        records: rawRecords.map((r) => ({
          state: r.state ?? "Karnataka",
          district: r.district ?? district,
          market: r.market ?? "APMC",
          commodity: r.commodity ?? commodity,
          variety: r.variety ?? "Standard",
          arrivalDate: r.arrival_date ?? checkedAtIso.slice(0, 10),
          minPriceInrQuintal: r.min_price ?? "—",
          maxPriceInrQuintal: r.max_price ?? "—",
          modalPriceInrQuintal: r.modal_price ?? "—",
        })),
      };
    } catch {
      return {
        providerStatus: "UNAVAILABLE_AWAITING_AGMARKNET_API",
        isMock: false,
        checkedAtIso,
        sourceUrl,
        records: [],
      };
    }
  }

  public rollbackSchemeToVersion(
    actorId: string,
    schemeCode: string,
    targetVersionNumber: number
  ): SchemeVersionRecord {
    this.requireRole(actorId, ["PLATFORM_ADMIN", "SCHEME_REVIEWER"]);
    const versions = Array.from(this.schemeVersions.values()).filter(
      (v) => v.schemeCode === schemeCode
    );
    const target = versions.find(
      (v) => v.versionNumber === targetVersionNumber
    );
    if (!target) {
      throw new ValidationError(
        `Version ${targetVersionNumber} not found for scheme ${schemeCode}`
      );
    }

    for (const v of versions) {
      v.status = v.id === target.id ? "PUBLISHED" : "ARCHIVED";
    }

    this.appendAudit({
      actorId,
      actorRole: "PLATFORM_ADMIN",
      action: "SCHEME_VERSION_ROLLED_BACK",
      targetType: "SCHEME_VERSION",
      targetId: target.id,
      metadata: { schemeCode, rolledBackToVersion: targetVersionNumber },
    });
    return target;
  }

  public getIntegrationsStatus() {
    const hasOpenAiKey = Boolean(
      this.config.OPENAI_API_KEY && this.config.OPENAI_API_KEY.startsWith("sk-")
    );
    const hasMandiKey = Boolean(
      this.config.MANDI_API_KEY && this.config.MANDI_API_KEY.trim().length > 0
    );
    const hasWhatsAppToken = Boolean(this.config.WHATSAPP_ACCESS_TOKEN);

    return {
      checkedAtIso: new Date().toISOString(),
      integrations: [
        {
          id: "rules_engine_and_db",
          name: "Deterministic Scheme Rules Engine & Real-Time Store",
          status: "LIVE",
          description:
            "Evaluates farmer profiles against versioned JSON DSL rules, persists profiles, plots, cases, reminders, and append-only audit logs in real time.",
          requiredToActivate: "Active and live now.",
        },
        {
          id: "web_speech_voice_io",
          name: "Voice-First Speech Recognition (STT) & Read-Aloud (TTS)",
          status: "LIVE",
          description:
            "Browser W3C Web Speech API (kn-IN & en-IN) for real-time microphone voice input and spoken responses with full text fallback.",
          requiredToActivate: "Active in supported browsers (Chrome/Edge/Android).",
        },
        {
          id: "private_doc_storage_malware_scan",
          name: "Consent-Gated Private Document Vault & Malware Scanner",
          status: "LIVE",
          description:
            "Validates file MIME/size, blocks .apk/.exe/EICAR payloads, and issues 5-minute HMAC-signed access URLs.",
          requiredToActivate: "Active and live now.",
        },
        {
          id: "openai_agro_gpt",
          name: "OpenAI API Server-Side Agro GPT Layer",
          status: hasOpenAiKey ? "LIVE" : "AWAITING_CREDENTIALS",
          description: hasOpenAiKey
            ? `Connected server-side to OpenAI (${this.config.OPENAI_MODEL}) with strict scheme grounding and confirmation-before-write gates.`
            : "Grounded deterministic scheme assistant is active with confirmation-before-write gates. Set OPENAI_API_KEY on the server to enable live OpenAI LLM generation.",
          requiredToActivate: hasOpenAiKey
            ? "Configured."
            : "Set OPENAI_API_KEY=sk-... in server environment variables (.env).",
        },
        {
          id: "mandi_agmarknet_feed",
          name: "Mandi Market Price Feed (Agmarknet / data.gov.in)",
          status: hasMandiKey ? "LIVE" : "AWAITING_CREDENTIALS",
          description: hasMandiKey
            ? "Server-side MANDI_API_KEY configured with circuit-breaker reliability guard. Never fabricates market prices if upstream returns empty."
            : "Mandi price feed awaiting MANDI_API_KEY in server environment (.env).",
          requiredToActivate: hasMandiKey
            ? "Configured."
            : "Set MANDI_API_KEY in server environment variables (.env).",
        },
        {
          id: "status_tracker_portals",
          name: "Government Application & Claim Status Tracker",
          status: "MANUAL_WORKFLOW",
          description:
            "Uses audited manual updates (recording whether Farmer or CSC Operator entered the status and when). Never fabricates live portal status.",
          requiredToActivate:
            "Requires official state/central API credentials (FRUITS / Samrakshane / PMFBY authorized partner keys).",
        },
        {
          id: "whatsapp_business_cloud",
          name: "WhatsApp Business Platform Notifications & Bot",
          status: hasWhatsAppToken ? "LIVE" : "AWAITING_APPROVAL",
          description: hasWhatsAppToken
            ? "Connected to Meta WhatsApp Cloud API with X-Hub-Signature-256 verification."
            : "Webhook HMAC verifier, wamid deduplication, 24h window guard, and STOP opt-out are implemented. Outbound WhatsApp delivery awaits approved Meta WABA credentials.",
          requiredToActivate:
            "Set WHATSAPP_ACCESS_TOKEN, WHATSAPP_APP_SECRET, and approved template names after Meta Business verification.",
        },
      ],
    };
  }

  // --------------------------------------------------------------------------
  // Seed 3 Clearly-Flagged DEMO Schemes (Section 3 Rule 5 & Phase 3 Prompt)
  // --------------------------------------------------------------------------

  private seedDemoCatalogueAndRoles(): void {
    const nowIso = new Date().toISOString();
    const authorId = "system-seed-author";
    const verifierId = "system-seed-reviewer";

    const demoSchemes: SchemeVersionRecord[] = [
      {
        id: "demo-scheme-v1-drip-irrigation",
        schemeId: "scheme_DEMO_KA_MICRO_IRRIGATION",
        schemeCode: "DEMO-KA-DRIP-01",
        departmentName: "DEMO — Department of Agriculture / Horticulture (Karnataka)",
        versionNumber: 1,
        status: "PUBLISHED",
        titleEn: "[DEMO] Karnataka Micro-Irrigation (Drip & Sprinkler) Assistance",
        titleKn: "[ಡೆಮೊ / ಮಾದರಿ] ಕರ್ನಾಟಕ ಸೂಕ್ಷ್ಮ ನೀರಾವರಿ (ಹನಿ ಮತ್ತು ತುಂತುರು) ಸಹಾಯಧನ ಯೋಜನೆ",
        summaryEn:
          "DEMO scheme entry for testing deterministic eligibility evaluation on plots with cultivable area between 0.2 and 5.0 hectares.",
        summaryKn:
          "0.2 ರಿಂದ 5.0 ಹೆಕ್ಟೇರ್ ಕೃಷಿ ಭೂಮಿ ಹೊಂದಿರುವ ರೈತರಿಗೆ ಸೂಕ್ಷ್ಮ ನೀರಾವರಿ ಅರ್ಹತೆ ಪರೀಕ್ಷಿಸಲು ರಚಿಸಲಾದ ಡೆಮೊ ಯೋಜನೆ.",
        benefitsDescriptionEn:
          "DEMO: Illustrative subsidy support for drip/sprinkler equipment installation (verify official rates on state portal).",
        benefitsDescriptionKn:
          "ಡೆಮೊ: ಹನಿ/ತುಂತುರು ನೀರಾವರಿ ಉಪಕರಣ ಅಳವಡಿಕೆಗೆ ಮಾದರಿ ಸಹಾಯಧನ (ಅಧಿಕೃತ ದರಗಳನ್ನು ಇಲಾಖೆ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಪರಿಶೀಲಿಸಿ).",
        requiredDocumentsEn: [
          "RTC / Pahani land record",
          "Soil & water test report (if applicable)",
          "Quotation from approved supplier",
        ],
        requiredDocumentsKn: [
          "ಪಹಣಿ (RTC) ದಾಖಲೆ",
          "ಮಣ್ಣು ಮತ್ತು ನೀರಿನ ಪರೀಕ್ಷಾ ವರದಿ",
          "ಅನುಮೋದಿತ ಸರಬರಾಜುದಾರರ ದರಪಟ್ಟಿ",
        ],
        applicationStepsEn: [
          "Check plot survey number and area in RTC",
          "Visit Raitha Samparka Kendra (RSK) or official state portal",
          "Keep acknowledgement receipt in your Receipt Vault",
        ],
        applicationStepsKn: [
          "ಪಹಣಿಯಲ್ಲಿ ಸರ್ವೆ ಸಂಖ್ಯೆ ಮತ್ತು ವಿಸ್ತೀರ್ಣ ಪರಿಶೀಲಿಸಿ",
          "ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರ (RSK) ಅಥವಾ ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ಗೆ ಭೇಟಿ ನೀಡಿ",
          "ಸ್ವೀಕೃತಿ ರಸೀದಿಯನ್ನು ಆಪ್‌ನಲ್ಲಿ ಸುರಕ್ಷಿತವಾಗಿ ಉಳಿಸಿ",
        ],
        ruleTree: {
          all: [
            {
              id: "drip-r1",
              fact: "state",
              op: "eq",
              value: "Karnataka",
              descriptionEn: "Resides in Karnataka",
              descriptionKn: "ಕರ್ನಾಟಕದ ನಿವಾಸಿಯಾಗಿರಬೇಕು",
            },
            {
              id: "drip-r2",
              fact: "ownershipTypes",
              op: "in",
              value: ["OWNER", "JOINT_FAMILY"],
              descriptionEn: "Holds land as Owner or Joint Family",
              descriptionKn: "ಸ್ವಂತ ಅಥವಾ ಅವಿಭಕ್ತ ಕುಟುಂಬದ ಜಮೀನು ಹೊಂದಿರಬೇಕು",
              requiresOfficialVerification: true,
            },
            {
              id: "drip-r3",
              fact: "totalLandHectares",
              op: "between",
              value: [0.2, 5.0],
              descriptionEn: "Total cultivable land between 0.2 ha and 5.0 ha",
              descriptionKn: "ಒಟ್ಟು ಕೃಷಿ ಭೂಮಿ 0.2 ರಿಂದ 5.0 ಹೆಕ್ಟೇರ್ ಒಳಗಿರಬೇಕು",
            },
          ],
        },
        sourceUrl: "https://raitamitra.karnataka.gov.in/ (DEMO REFERENCE)",
        sourceLastVerifiedAt: nowIso,
        sourceVerifiedById: verifierId,
        authorId,
        approvedById: verifierId,
        publishedAt: nowIso,
        isMock: true,
        deadlines: [
          {
            id: "dl-demo-1",
            schemeVersionId: "demo-scheme-v1-drip-irrigation",
            titleEn: "[DEMO] Kharif Application Window",
            titleKn: "[ಡೆಮೊ] ಮುಂಗಾರು ಅರ್ಜಿ ಗಡುವು",
            windowType: "APPLICATION_CUTOFF",
            dueDateIso: "2026-12-15T18:00:00.000Z",
            isVerified: true,
            sourceUrl: "https://raitamitra.karnataka.gov.in/ (DEMO)",
            lastVerifiedAt: nowIso,
          },
        ],
        createdAt: nowIso,
      },
      {
        id: "demo-scheme-v1-crop-insurance",
        schemeId: "scheme_DEMO_CROP_INSURANCE",
        schemeCode: "DEMO-CROP-INS-02",
        departmentName: "DEMO — Crop Insurance Cell (Verification Required)",
        versionNumber: 1,
        status: "PUBLISHED",
        titleEn: "[DEMO] Seasonal Notified Crop Insurance Enrolment & Protection",
        titleKn: "[ಡೆಮೊ / ಮಾದರಿ] ಹಂಗಾಮಿನ ಅಧಿಸೂಚಿತ ಬೆಳೆ ವಿಮೆ ನೋಂದಣಿ ಮತ್ತು ರಕ್ಷಣೆ",
        summaryEn:
          "DEMO scheme illustrating seasonal crop matching (Paddy, Ragi, Tur, Maize) and unverified deadline handling.",
        summaryKn:
          "ಮುಂಗಾರು/ಹಿಂಗಾರು ಬೆಳೆ (ಭತ್ತ, ರಾಗಿ, ತೊಗರಿ, ಮೆಕ್ಕೆಜೋಳ) ಹೊಂದಾಣಿಕೆ ಮತ್ತು ಗಡುವು ಪರಿಶೀಲನೆ ತೋರಿಸುವ ಡೆಮೊ ಯೋಜನೆ.",
        benefitsDescriptionEn:
          "DEMO: Coverage against notified natural perils subject to official notification for yourHobli/Gram Panchayat.",
        benefitsDescriptionKn:
          "ಡೆಮೊ: ನಿಮ್ಮ ಹೋಬಳಿ/ಗ್ರಾಮ ಪಂಚಾಯಿತಿಗೆ ಅಧಿಕೃತ ಅಧಿಸೂಚನೆಯಂತೆ ಬೆಳೆ ಹಾನಿ ವಿಮಾ ರಕ್ಷಣೆ.",
        requiredDocumentsEn: [
          "Land RTC / Tenancy agreement (where supported)",
          "Sowing certificate / Crop declaration",
          "Bank passbook copy (for official portal verification only)",
        ],
        requiredDocumentsKn: [
          "ಪಹಣಿ (RTC) / ಗೇಣಿ ಒಪ್ಪಂದ",
          "ಬೆಳೆ ಬಿತ್ತನೆ ದೃಢೀಕರಣ ಪತ್ರ",
          "ಬ್ಯಾಂಕ್ ಪಾಸ್‌ಬುಕ್ ಪ್ರತಿ (ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ಗೆ ಮಾತ್ರ)",
        ],
        applicationStepsEn: [
          "Confirm your crop is notified in your Taluk/Hobli for this season",
          "Enrol before the notified cutoff date via CSC or official portal",
          "Store your policy/application receipt in the Receipt Vault",
        ],
        applicationStepsKn: [
          "ನಿಮ್ಮ ತಾಲ್ಲೂಕು/ಹೋಬಳಿಗೆ ಈ ಬೆಳೆ ಅಧಿಸೂಚಿತವಾಗಿದೆಯೇ ಎಂದು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ",
          "ನಿಗದಿತ ಗಡುವಿನೊಳಗೆ CSC ಅಥವಾ ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಮೂಲಕ ನೋಂದಾಯಿಸಿ",
          "ಅರ್ಜಿ ಸ್ವೀಕೃತಿ ಸಂಖ್ಯೆಯನ್ನು ರಸೀದಿ ವಾಲ್ಟ್‌ನಲ್ಲಿ ಉಳಿಸಿ",
        ],
        ruleTree: {
          all: [
            {
              id: "ins-r1",
              fact: "state",
              op: "eq",
              value: "Karnataka",
              descriptionEn: "Plot located in Karnataka",
              descriptionKn: "ಜಮೀನು ಕರ್ನಾಟಕದಲ್ಲಿರಬೇಕು",
            },
            {
              id: "ins-r2",
              fact: "crops",
              op: "in",
              value: ["PADDY", "RAGI", "TUR", "MAIZE", "COTTON"],
              descriptionEn: "Grows a notified seasonal crop (Paddy, Ragi, Tur, Maize, Cotton)",
              descriptionKn: "ಅಧಿಸೂಚಿತ ಬೆಳೆ (ಭತ್ತ, ರಾಗಿ, ತೊಗರಿ, ಮೆಕ್ಕೆಜೋಳ, ಹತ್ತಿ) ಬೆಳೆಯುತ್ತಿರಬೇಕು",
            },
            {
              id: "ins-r3",
              fact: "plotCount",
              op: "gte",
              value: 1,
              descriptionEn: "At least 1 plot registered",
              descriptionKn: "ಕನಿಷ್ಠ 1 ಜಮೀನು ತಾಕು ನೋಂದಾಯಿಸಿರಬೇಕು",
            },
          ],
        },
        sourceUrl: "https://samrakshane.karnataka.gov.in/ (DEMO REFERENCE)",
        sourceLastVerifiedAt: nowIso,
        sourceVerifiedById: verifierId,
        authorId,
        approvedById: verifierId,
        publishedAt: nowIso,
        isMock: true,
        deadlines: [
          {
            id: "dl-demo-2-unverified",
            schemeVersionId: "demo-scheme-v1-crop-insurance",
            titleEn: "[DEMO] Rabi Enrolment Cutoff (Unverified Demo)",
            titleKn: "[ಡೆಮೊ] ಹಿಂಗಾರು ನೋಂದಣಿ ಗಡುವು (ಪರಿಶೀಲಿಸಲಾಗಿಲ್ಲ)",
            windowType: "APPLICATION_CUTOFF",
            dueDateIso: "2026-12-30T00:00:00.000Z",
            isVerified: false, // Deliberately unverified so UI proves it renders "Deadline not verified"
            sourceUrl: "https://samrakshane.karnataka.gov.in/ (DEMO)",
            lastVerifiedAt: null,
          },
        ],
        createdAt: nowIso,
      },
      {
        id: "demo-scheme-v1-allied-dairy",
        schemeId: "scheme_DEMO_ALLIED_LIVESTOCK",
        schemeCode: "DEMO-ALLIED-DAIRY-03",
        departmentName: "DEMO — Department of Animal Husbandry & Fisheries",
        versionNumber: 1,
        status: "PUBLISHED",
        titleEn: "[DEMO] Smallholder Allied Dairy & Sericulture Support",
        titleKn: "[ಡೆಮೊ / ಮಾದರಿ] ಸಣ್ಣ ರೈತರ ಹೈನುಗಾರಿಕೆ ಮತ್ತು ರೇಷ್ಮೆ ಕೃಷಿ ಪ್ರೋತ್ಸಾಹ ಯೋಜನೆ",
        summaryEn:
          "DEMO scheme testing allied livestock/sericulture rules and small/marginal farmer category matching.",
        summaryKn:
          "ಹೈನುಗಾರಿಕೆ/ರೇಷ್ಮೆ ಕೃಷಿ ಮತ್ತು ಸಣ್ಣ/ಅತಿ ಸಣ್ಣ ರೈತ ವರ್ಗದ ಅರ್ಹತೆ ಪರೀಕ್ಷಿಸಲು ರಚಿಸಲಾದ ಡೆಮೊ ಯೋಜನೆ.",
        benefitsDescriptionEn:
          "DEMO: Illustrative shed/equipment assistance for small & marginal farmers engaged in dairy or sericulture.",
        benefitsDescriptionKn:
          "ಡೆಮೊ: ಹೈನುಗಾರಿಕೆ ಅಥವಾ ರೇಷ್ಮೆ ಕೃಷಿ ಮಾಡುವ ಸಣ್ಣ ಮತ್ತು ಅತಿ ಸಣ್ಣ ರೈತರಿಗೆ ಮಾದರಿ ಸಹಾಯಧನ.",
        requiredDocumentsEn: [
          "Small/Marginal Farmer Certificate or RTC",
          "Livestock / Sericulture registration details",
        ],
        requiredDocumentsKn: [
          "ಸಣ್ಣ/ಅತಿ ಸಣ್ಣ ರೈತ ಪ್ರಮಾಣಪತ್ರ ಅಥವಾ ಪಹಣಿ",
          "ಹೈನುಗಾರಿಕೆ / ರೇಷ್ಮೆ ಇಲಾಖೆ ನೋಂದಣಿ ವಿವರ",
        ],
        applicationStepsEn: [
          "Add DAIRY or SERICULTURE in your Farmer Benefit Passport",
          "Verify local veterinary/sericulture office window",
        ],
        applicationStepsKn: [
          "ನಿಮ್ಮ ರೈತ ಪಾಸ್‌ಪೋರ್ಟ್‌ನಲ್ಲಿ ಹೈನುಗಾರಿಕೆ ಅಥವಾ ರೇಷ್ಮೆ ಆಯ್ಕೆ ಸೇರಿಸಿ",
          "ಸ್ಥಳೀಯ ಪಶುವೈದ್ಯಕೀಯ/ರೇಷ್ಮೆ ಕಚೇರಿಯಲ್ಲಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ",
        ],
        ruleTree: {
          all: [
            {
              id: "allied-r1",
              fact: "farmerCategory",
              op: "in",
              value: ["MARGINAL", "SMALL"],
              descriptionEn: "Farmer category is Marginal or Small",
              descriptionKn: "ಸಣ್ಣ ಅಥವಾ ಅತಿ ಸಣ್ಣ ರೈತ ವರ್ಗಕ್ಕೆ ಸೇರಿರಬೇಕು",
            },
            {
              id: "allied-r2",
              fact: "livestockTypes",
              op: "in",
              value: ["DAIRY", "SERICULTURE", "GOAT_SHEEP"],
              descriptionEn: "Engaged in Dairy, Sericulture, or Goat/Sheep rearing",
              descriptionKn: "ಹೈನುಗಾರಿಕೆ, ರೇಷ್ಮೆ ಅಥವಾ ಕುರಿ/ಮೇಕೆ ಸಾಕಾಣಿಕೆ ಹೊಂದಿರಬೇಕು",
            },
          ],
        },
        sourceUrl: "https://ahvs.karnataka.gov.in/ (DEMO REFERENCE)",
        sourceLastVerifiedAt: nowIso,
        sourceVerifiedById: verifierId,
        authorId,
        approvedById: verifierId,
        publishedAt: nowIso,
        isMock: true,
        deadlines: [],
        createdAt: nowIso,
      },
    ];

    for (const s of demoSchemes) {
      this.schemeVersions.set(s.id, s);
    }
  }
}

export class ValidationError extends Error {
  public readonly statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class AuthorizationError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode = 403) {
    super(message);
    this.name = "AuthorizationError";
    this.statusCode = statusCode;
  }
}
