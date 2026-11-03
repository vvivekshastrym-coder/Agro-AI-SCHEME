import { z } from "zod";
import type { FactProvenance, SupportedLanguage } from "./index.js";

// ============================================================================
// 1. 22 Scheduled Indian Languages + English Registry (Section 2 & 7)
// ============================================================================

export interface LanguageCapabilityEntry {
  code: string;
  nameEn: string;
  nativeName: string;
  script: string;
  isRtl: boolean;
  tier: "LAUNCH" | "EXPANSION";
  supportsUi: boolean;
  supportsStt: boolean;
  supportsTts: boolean;
  supportsOcr: boolean;
  providerStatus: "DEMO_MOCK" | "UNCONFIGURED";
}

export const SCHEDULED_INDIAN_LANGUAGES: LanguageCapabilityEntry[] = [
  { code: "kn", nameEn: "Kannada", nativeName: "ಕನ್ನಡ", script: "Kannada", isRtl: false, tier: "LAUNCH", supportsUi: true, supportsStt: true, supportsTts: true, supportsOcr: true, providerStatus: "DEMO_MOCK" },
  { code: "hi", nameEn: "Hindi", nativeName: "हिन्दी", script: "Devanagari", isRtl: false, tier: "LAUNCH", supportsUi: true, supportsStt: true, supportsTts: true, supportsOcr: true, providerStatus: "DEMO_MOCK" },
  { code: "en", nameEn: "English", nativeName: "English", script: "Latin", isRtl: false, tier: "LAUNCH", supportsUi: true, supportsStt: true, supportsTts: true, supportsOcr: true, providerStatus: "DEMO_MOCK" },
  { code: "ta", nameEn: "Tamil", nativeName: "தமிழ்", script: "Tamil", isRtl: false, tier: "LAUNCH", supportsUi: true, supportsStt: true, supportsTts: true, supportsOcr: false, providerStatus: "DEMO_MOCK" },
  { code: "te", nameEn: "Telugu", nativeName: "తెలుగు", script: "Telugu", isRtl: false, tier: "LAUNCH", supportsUi: true, supportsStt: true, supportsTts: true, supportsOcr: false, providerStatus: "DEMO_MOCK" },
  { code: "ml", nameEn: "Malayalam", nativeName: "മലയാളം", script: "Malayalam", isRtl: false, tier: "LAUNCH", supportsUi: true, supportsStt: false, supportsTts: false, supportsOcr: false, providerStatus: "DEMO_MOCK" },
  { code: "mr", nameEn: "Marathi", nativeName: "मराठी", script: "Devanagari", isRtl: false, tier: "LAUNCH", supportsUi: true, supportsStt: true, supportsTts: false, supportsOcr: false, providerStatus: "DEMO_MOCK" },
  { code: "bn", nameEn: "Bengali", nativeName: "বাংলা", script: "Bengali", isRtl: false, tier: "LAUNCH", supportsUi: true, supportsStt: false, supportsTts: false, supportsOcr: false, providerStatus: "DEMO_MOCK" },
  { code: "gu", nameEn: "Gujarati", nativeName: "ગુજરાતી", script: "Gujarati", isRtl: false, tier: "LAUNCH", supportsUi: true, supportsStt: false, supportsTts: false, supportsOcr: false, providerStatus: "DEMO_MOCK" },
  { code: "pa", nameEn: "Punjabi", nativeName: "ਪੰਜਾਬੀ", script: "Gurmukhi", isRtl: false, tier: "LAUNCH", supportsUi: true, supportsStt: false, supportsTts: false, supportsOcr: false, providerStatus: "DEMO_MOCK" },
  { code: "or", nameEn: "Odia", nativeName: "ଓଡ଼ିଆ", script: "Odia", isRtl: false, tier: "EXPANSION", supportsUi: false, supportsStt: false, supportsTts: false, supportsOcr: false, providerStatus: "UNCONFIGURED" },
  { code: "as", nameEn: "Assamese", nativeName: "অসমীয়া", script: "Assamese", isRtl: false, tier: "EXPANSION", supportsUi: false, supportsStt: false, supportsTts: false, supportsOcr: false, providerStatus: "UNCONFIGURED" },
  { code: "ur", nameEn: "Urdu", nativeName: "اردو", script: "Perso-Arabic", isRtl: true, tier: "EXPANSION", supportsUi: false, supportsStt: false, supportsTts: false, supportsOcr: false, providerStatus: "UNCONFIGURED" },
  { code: "ks", nameEn: "Kashmiri", nativeName: "कॉशुर", script: "Devanagari/Perso-Arabic", isRtl: false, tier: "EXPANSION", supportsUi: false, supportsStt: false, supportsTts: false, supportsOcr: false, providerStatus: "UNCONFIGURED" },
  { code: "kok", nameEn: "Konkani", nativeName: "कोंकणी", script: "Devanagari", isRtl: false, tier: "EXPANSION", supportsUi: false, supportsStt: false, supportsTts: false, supportsOcr: false, providerStatus: "UNCONFIGURED" },
  { code: "mai", nameEn: "Maithili", nativeName: "मैथिली", script: "Devanagari", isRtl: false, tier: "EXPANSION", supportsUi: false, supportsStt: false, supportsTts: false, supportsOcr: false, providerStatus: "UNCONFIGURED" },
  { code: "mni", nameEn: "Manipuri", nativeName: "মৈতৈলোন্", script: "Meitei Mayek", isRtl: false, tier: "EXPANSION", supportsUi: false, supportsStt: false, supportsTts: false, supportsOcr: false, providerStatus: "UNCONFIGURED" },
  { code: "ne", nameEn: "Nepali", nativeName: "नेपाली", script: "Devanagari", isRtl: false, tier: "EXPANSION", supportsUi: false, supportsStt: false, supportsTts: false, supportsOcr: false, providerStatus: "UNCONFIGURED" },
  { code: "sa", nameEn: "Sanskrit", nativeName: "संस्कृतम्", script: "Devanagari", isRtl: false, tier: "EXPANSION", supportsUi: false, supportsStt: false, supportsTts: false, supportsOcr: false, providerStatus: "UNCONFIGURED" },
  { code: "sat", nameEn: "Santali", nativeName: "ᱥᱟᱱᱛᱟᱲᱤ", script: "Ol Chiki", isRtl: false, tier: "EXPANSION", supportsUi: false, supportsStt: false, supportsTts: false, supportsOcr: false, providerStatus: "UNCONFIGURED" },
  { code: "sd", nameEn: "Sindhi", nativeName: "सिन्धी", script: "Devanagari", isRtl: false, tier: "EXPANSION", supportsUi: false, supportsStt: false, supportsTts: false, supportsOcr: false, providerStatus: "UNCONFIGURED" },
  { code: "brx", nameEn: "Bodo", nativeName: "बड़ो", script: "Devanagari", isRtl: false, tier: "EXPANSION", supportsUi: false, supportsStt: false, supportsTts: false, supportsOcr: false, providerStatus: "UNCONFIGURED" },
  { code: "doi", nameEn: "Dogri", nativeName: "डोगरी", script: "Devanagari", isRtl: false, tier: "EXPANSION", supportsUi: false, supportsStt: false, supportsTts: false, supportsOcr: false, providerStatus: "UNCONFIGURED" },
];

// ============================================================================
// 2. Document X-Ray & Land Record Mismatch Engine (Deterministic Comparison)
// ============================================================================

export interface DocumentXRayComparisonInput {
  farmerProfile: {
    fullName: string;
    surveyNumber: string;
    areaHectares: number;
    cropCode: string;
  };
  extractedRtcRecord: {
    ownerNameOnRtc: string;
    surveyNumberOnRtc: string;
    areaHectaresOnRtc: number;
    recordedCropOnRtc: string;
    ocrConfidence: number;
    farmerConfirmedExtraction: boolean;
  };
}

export interface DocumentFieldMismatch {
  field: "fullName" | "surveyNumber" | "areaHectares" | "cropCode";
  profileValue: string;
  documentValue: string;
  status: "MATCH" | "MISMATCH" | "NEEDS_FARMER_CONFIRMATION";
  guidanceEn: string;
  guidanceKn: string;
}

export interface DocumentXRayResult {
  overallReady: boolean;
  requiresFarmerConfirmation: boolean;
  fields: DocumentFieldMismatch[];
  isMockOcr: boolean;
}

function normalizeToken(val: string): string {
  return val.toLowerCase().replace(/[^a-z0-9\u0C80-\u0CFF]/g, "");
}

export function compareDocumentXRay(
  input: DocumentXRayComparisonInput,
  isMockOcr = true
): DocumentXRayResult {
  const { farmerProfile, extractedRtcRecord } = input;
  const requiresConfirmation =
    !extractedRtcRecord.farmerConfirmedExtraction ||
    extractedRtcRecord.ocrConfidence < 0.85;

  const nameMatch =
    normalizeToken(farmerProfile.fullName) ===
    normalizeToken(extractedRtcRecord.ownerNameOnRtc);

  const surveyMatch =
    normalizeToken(farmerProfile.surveyNumber) ===
    normalizeToken(extractedRtcRecord.surveyNumberOnRtc);

  const areaDiff = Math.abs(
    farmerProfile.areaHectares - extractedRtcRecord.areaHectaresOnRtc
  );
  const areaMatch = areaDiff <= 0.05;

  const cropMatch =
    normalizeToken(farmerProfile.cropCode) ===
    normalizeToken(extractedRtcRecord.recordedCropOnRtc);

  const fields: DocumentFieldMismatch[] = [
    {
      field: "fullName",
      profileValue: farmerProfile.fullName,
      documentValue: extractedRtcRecord.ownerNameOnRtc,
      status: requiresConfirmation
        ? "NEEDS_FARMER_CONFIRMATION"
        : nameMatch
          ? "MATCH"
          : "MISMATCH",
      guidanceEn: nameMatch
        ? "Name matches RTC record."
        : "Name spelling differs between profile and RTC/Pahani. Request affidavit or Bhoomi/Nadakacheri name correction before submitting.",
      guidanceKn: nameMatch
        ? "ಹೆಸರು ಪಹಣಿ (RTC) ದಾಖಲೆಗೆ ಹೊಂದಿಕೆಯಾಗುತ್ತಿದೆ."
        : "ಪ್ರೊಫೈಲ್ ಮತ್ತು ಪಹಣಿಯಲ್ಲಿ ಹೆಸರಿನ ವ್ಯತ್ಯಾಸವಿದೆ. ಅರ್ಜಿ ಸಲ್ಲಿಸುವ ಮುನ್ನ ಭೂಮಿ/ನಾಡಕಚೇರಿಯಲ್ಲಿ ಹೆಸರು ತಿದ್ದುಪಡಿ ಅಥವಾ ದೃಢೀಕರಣ ಪಡೆಯಿರಿ.",
    },
    {
      field: "surveyNumber",
      profileValue: farmerProfile.surveyNumber,
      documentValue: extractedRtcRecord.surveyNumberOnRtc,
      status: requiresConfirmation
        ? "NEEDS_FARMER_CONFIRMATION"
        : surveyMatch
          ? "MATCH"
          : "MISMATCH",
      guidanceEn: surveyMatch
        ? "Survey/Hissa number matches RTC."
        : "Survey/Hissa number mismatch! Verify exact Hissa subdivision on official RTC.",
      guidanceKn: surveyMatch
        ? "ಸರ್ವೆ/ಹಿಸ್ಸಾ ಸಂಖ್ಯೆ ಪಹಣಿಗೆ ಹೊಂದಿಕೆಯಾಗುತ್ತಿದೆ."
        : "ಸರ್ವೆ/ಹಿಸ್ಸಾ ಸಂಖ್ಯೆ ಹೊಂದಿಕೆಯಾಗುತ್ತಿಲ್ಲ! ಅಧಿಕೃತ ಪಹಣಿಯಲ್ಲಿ ಸರಿಯಾದ ಹಿಸ್ಸಾ ಸಂಖ್ಯೆ ಪರಿಶೀಲಿಸಿ.",
    },
    {
      field: "areaHectares",
      profileValue: `${farmerProfile.areaHectares} ha`,
      documentValue: `${extractedRtcRecord.areaHectaresOnRtc} ha`,
      status: requiresConfirmation
        ? "NEEDS_FARMER_CONFIRMATION"
        : areaMatch
          ? "MATCH"
          : "MISMATCH",
      guidanceEn: areaMatch
        ? "Cultivable area is within tolerance."
        : "Declared area differs from RTC cultivable extent by more than 0.05 ha.",
      guidanceKn: areaMatch
        ? "ಕೃಷಿ ವಿಸ್ತೀರ್ಣ ಪಹಣಿಗೆ ಹೊಂದಿಕೆಯಾಗುತ್ತಿದೆ."
        : "ಘೋಷಿತ ವಿಸ್ತೀರ್ಣ ಮತ್ತು ಪಹಣಿ ವಿಸ್ತೀರ್ಣದಲ್ಲಿ ವ್ಯತ್ಯಾಸವಿದೆ.",
    },
    {
      field: "cropCode",
      profileValue: farmerProfile.cropCode,
      documentValue: extractedRtcRecord.recordedCropOnRtc,
      status: requiresConfirmation
        ? "NEEDS_FARMER_CONFIRMATION"
        : cropMatch
          ? "MATCH"
          : "MISMATCH",
      guidanceEn: cropMatch
        ? "Seasonal crop matches RTC Pahani crop column."
        : "Crop recorded in Pahani differs from your current crop declaration. Check crop survey / RSK entry.",
      guidanceKn: cropMatch
        ? "ಹಂಗಾಮಿನ ಬೆಳೆ ಪಹಣಿಯ ಬೆಳೆ ಕಾಲಂಗೆ ಹೊಂದಿಕೆಯಾಗುತ್ತಿದೆ."
        : "ಪಹಣಿಯಲ್ಲಿ ನಮೂದಾದ ಬೆಳೆ ಮತ್ತು ನಿಮ್ಮ ಪ್ರಸ್ತುತ ಬೆಳೆ ವಿವರ ಭಿನ್ನವಾಗಿದೆ. ಬೆಳೆ ಸಮೀಕ್ಷೆ / RSK ದಾಖಲೆ ಪರಿಶೀಲಿಸಿ.",
    },
  ];

  const overallReady =
    !requiresConfirmation && fields.every((f) => f.status === "MATCH");

  return {
    overallReady,
    requiresFarmerConfirmation: requiresConfirmation,
    fields,
    isMockOcr,
  };
}

// ============================================================================
// 3. Scam Shield Safe Pattern & Allow-List Inspector (Never claims "Safe")
// ============================================================================

export type ScamVerdictLevel =
  | "LOOKS_DANGEROUS"
  | "NOT_VERIFIED_AS_OFFICIAL"
  | "MATCHES_OFFICIAL_DOMAIN_CHECK_CAREFULLY";

export interface ScamInspectionResult {
  verdict: ScamVerdictLevel;
  reasonsEn: string[];
  reasonsKn: string[];
  safeNextStepsEn: string[];
  safeNextStepsKn: string[];
  officialPortals: string[];
  isMockThreatIntel: boolean;
}

const VERIFIED_OFFICIAL_DOMAINS = [
  "raitamitra.karnataka.gov.in",
  "samrakshane.karnataka.gov.in",
  "pmkisan.gov.in",
  "pmfby.gov.in",
  "bhoomi.karnataka.gov.in",
  "sevasindhu.karnataka.gov.in",
];

export function inspectSuspiciousMessage(
  rawMessage: string,
  fileNameOptional?: string
): ScamInspectionResult {
  const lower = rawMessage.toLowerCase();
  const fileLower = (fileNameOptional ?? "").toLowerCase();
  const reasonsEn: string[] = [];
  const reasonsKn: string[] = [];

  if (lower.includes(".apk") || fileLower.endsWith(".apk")) {
    reasonsEn.push(
      "Contains an Android application (.apk) install link or attachment. Official schemes never send APK files over WhatsApp/SMS."
    );
    reasonsKn.push(
      "ಇದರಲ್ಲಿ ಮೊಬೈಲ್ ಆಪ್ (.apk) ಫೈಲ್ ಇದೆ. ಸರ್ಕಾರಿ ಇಲಾಖೆಗಳು ವಾಟ್ಸಾಪ್ ಮೂಲಕ APK ಕಳುಹಿಸುವುದಿಲ್ಲ — ಇದನ್ನು ಇನ್‌ಸ್ಟಾಲ್ ಮಾಡಬೇಡಿ."
    );
  }

  if (
    lower.includes("upi pin") ||
    lower.includes("atm pin") ||
    lower.includes("bank otp") ||
    lower.includes("share otp") ||
    lower.includes("password")
  ) {
    reasonsEn.push(
      "Requests a PIN, OTP, or banking password. Receiving a government subsidy never requires entering your UPI PIN or sharing a bank OTP."
    );
    reasonsKn.push(
      "ಇದು UPI ಪಿನ್, ಬ್ಯಾಂಕ್ OTP ಅಥವಾ ಪಾಸ್‌ವರ್ಡ್ ಕೇಳುತ್ತಿದೆ. ಸರ್ಕಾರಿ ಸಹಾಯಧನ ಪಡೆಯಲು ಪಿನ್ ಅಥವಾ OTP ನೀಡುವ ಅಗತ್ಯವಿರುವುದಿಲ್ಲ."
    );
  }

  const urlRegex = /https?:\/\/([^\s/]+)/gi;
  const foundHosts: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = urlRegex.exec(rawMessage)) !== null) {
    if (match[1]) foundHosts.push(match[1].toLowerCase());
  }

  const hasNonOfficialHost = foundHosts.some(
    (h) =>
      !VERIFIED_OFFICIAL_DOMAINS.includes(h) &&
      !h.endsWith(".gov.in") &&
      !h.endsWith(".nic.in")
  );
  const hasOnlyOfficialHost =
    foundHosts.length > 0 &&
    foundHosts.every(
      (h) =>
        VERIFIED_OFFICIAL_DOMAINS.includes(h) ||
        h.endsWith(".gov.in") ||
        h.endsWith(".nic.in")
    );

  if (hasNonOfficialHost) {
    reasonsEn.push(
      `Contains an unverified web address (${foundHosts.join(", ")}) that is not on the official .gov.in / .nic.in allow-list.`
    );
    reasonsKn.push(
      `ಇದರಲ್ಲಿ ಅಧಿಕೃತ ಸರ್ಕಾರಿ ಪಟ್ಟಿಯಲ್ಲಿಲ್ಲದ ವೆಬ್ ವಿಳಾಸ (${foundHosts.join(", ")}) ಇದೆ.`
    );
  }

  let verdict: ScamVerdictLevel;
  if (reasonsEn.length > 0) {
    verdict = "LOOKS_DANGEROUS";
  } else if (hasOnlyOfficialHost) {
    verdict = "MATCHES_OFFICIAL_DOMAIN_CHECK_CAREFULLY";
    reasonsEn.push(
      "Address matches an official .gov.in domain, but sender identity cannot be guaranteed from a forwarded message."
    );
    reasonsKn.push(
      "ವೆಬ್ ವಿಳಾಸವು ಅಧಿಕೃತ .gov.in ಡೊಮೇನ್‌ಗೆ ಹೊಂದಿಕೆಯಾಗುತ್ತದೆ, ಆದರೆ ಫಾರ್ವರ್ಡ್ ಮಾಡಿದ ಸಂದೇಶದ ಮೂಲವನ್ನು ಖಾತರಿಪಡಿಸಲಾಗುವುದಿಲ್ಲ."
    );
  } else {
    verdict = "NOT_VERIFIED_AS_OFFICIAL";
    reasonsEn.push(
      "This message could not be verified as an official government communication."
    );
    reasonsKn.push(
      "ಈ ಸಂದೇಶವು ಅಧಿಕೃತ ಸರ್ಕಾರಿ ಪ್ರಕಟಣೆ ಎಂದು ದೃಢೀಕರಿಸಲು ಸಾಧ್ಯವಾಗಿಲ್ಲ."
    );
  }

  return {
    verdict,
    reasonsEn,
    reasonsKn,
    safeNextStepsEn: [
      "Never share your OTP, UPI PIN, ATM PIN, or bank password.",
      "Do not open or install .apk files received in chat.",
      "Verify scheme status directly at your Raitha Samparka Kendra, CSC, or official .gov.in portal.",
    ],
    safeNextStepsKn: [
      "ನಿಮ್ಮ OTP, UPI ಪಿನ್, ATM ಪಿನ್ ಅಥವಾ ಬ್ಯಾಂಕ್ ಪಾಸ್‌ವರ್ಡ್ ಯಾರಿಗೂ ನೀಡಬೇಡಿ.",
      "ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಬರುವ .apk ಫೈಲ್‌ಗಳನ್ನು ಎಂದಿಗೂ ತೆರೆಯಬೇಡಿ ಅಥವಾ ಇನ್‌ಸ್ಟಾಲ್ ಮಾಡಬೇಡಿ.",
      "ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರ (RSK), CSC ಅಥವಾ ಅಧಿಕೃತ .gov.in ವೆಬ್‌ಸೈಟ್‌ನಲ್ಲಿ ನೇರವಾಗಿ ಪರಿಶೀಲಿಸಿ.",
    ],
    officialPortals: VERIFIED_OFFICIAL_DOMAINS.slice(0, 3),
    isMockThreatIntel: true,
  };
}

// ============================================================================
// 4. Subsidy Before Purchase Guide & Farm Expense / Benefit Ledger
// ============================================================================

export interface EquipmentSubsidyRule {
  equipmentCode: "DRIP_SYSTEM" | "SOLAR_PUMP" | "MINI_TRACTOR" | "POWER_WEEDER";
  nameEn: string;
  nameKn: string;
  priorApprovalRequired: boolean;
  sequenceStepsEn: string[];
  sequenceStepsKn: string[];
  warningEn: string;
  warningKn: string;
  sourceUrl: string;
  isMock: true;
}

export const SUBSIDY_BEFORE_PURCHASE_CATALOGUE: EquipmentSubsidyRule[] = [
  {
    equipmentCode: "DRIP_SYSTEM",
    nameEn: "[DEMO] Drip & Sprinkler Micro-Irrigation System",
    nameKn: "[ಡೆಮೊ] ಹನಿ ಮತ್ತು ತುಂತುರು ನೀರಾವರಿ ಉಪಕರಣ",
    priorApprovalRequired: true,
    sequenceStepsEn: [
      "1. Submit RTC, soil/water report & quotation at Raitha Samparka Kendra BEFORE buying.",
      "2. Wait for official work-order / sanction letter.",
      "3. Purchase only from empanelled vendor and keep GST invoice + geo-tagged installation photo.",
    ],
    sequenceStepsKn: [
      "1. ಉಪಕರಣ ಖರೀದಿಸುವ ಮುನ್ನ ಪಹಣಿ ಮತ್ತು ದರಪಟ್ಟಿಯೊಂದಿಗೆ ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರದಲ್ಲಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ.",
      "2. ಇಲಾಖೆಯಿಂದ ಅಧಿಕೃತ ಕಾರ್ಯಾದೇಶ (Work Order) ಬಂದ ನಂತರವೇ ಖರೀದಿಸಿ.",
      "3. ನೋಂದಾಯಿತ ಸರಬರಾಜುದಾರರಿಂದ ಮಾತ್ರ ಖರೀದಿಸಿ ಮತ್ತು ಜಿಎಸ್‌ಟಿ ಬಿಲ್ ಉಳಿಸಿ.",
    ],
    warningEn:
      "CRITICAL: Purchasing or installing equipment BEFORE official work-order approval can make you ineligible for the subsidy.",
    warningKn:
      "ಮುಖ್ಯ ಎಚ್ಚರಿಕೆ: ಇಲಾಖೆಯ ಅನುಮೋದನೆ (Work Order) ಪಡೆಯುವ ಮುನ್ನವೇ ಉಪಕರಣ ಖರೀದಿಸಿದರೆ ಸಹಾಯಧನ ಸಿಗುವುದಿಲ್ಲ.",
    sourceUrl: "https://raitamitra.karnataka.gov.in/ (DEMO)",
    isMock: true,
  },
  {
    equipmentCode: "POWER_WEEDER",
    nameEn: "[DEMO] Farm Mechanization — Power Weeder / Rotavator",
    nameKn: "[ಡೆಮೊ] ಕೃಷಿ ಯಾಂತ್ರೀಕರಣ — ಪವರ್ ವೀಡರ್ / ರೋಟಾವೇಟರ್",
    priorApprovalRequired: true,
    sequenceStepsEn: [
      "1. Check active K-Kisan / RSK call for applications in your Taluk.",
      "2. Obtain sanction approval before paying the dealer.",
      "3. Complete physical verification with officer for DBT release.",
    ],
    sequenceStepsKn: [
      "1. ನಿಮ್ಮ ತಾಲ್ಲೂಕಿನ ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರದಲ್ಲಿ ಅರ್ಜಿ ಆಹ್ವಾನ ಪರಿಶೀಲಿಸಿ.",
      "2. ಅಧಿಕೃತ ಮಂಜೂರಾತಿ ಪತ್ರ ಪಡೆದ ನಂತರವೇ ಡೀಲರ್‌ಗೆ ಹಣ ಪಾವತಿಸಿ.",
      "3. ಅಧಿಕಾರಿಗಳ ಸ್ಥಳ ಪರಿಶೀಲನೆ ನಂತರ ಸಹಾಯಧನ ಖಾತೆಗೆ ಜಮೆಯಾಗುತ್ತದೆ.",
    ],
    warningEn:
      "Do not pay cash without an official sanction reference and empanelled dealer invoice.",
    warningKn:
      "ಅಧಿಕೃತ ಮಂಜೂರಾತಿ ಇಲ್ಲದೆ ಮತ್ತು ಅಧಿಕೃತ ಬಿಲ್ ಇಲ್ಲದೆ ನಗದು ಪಾವತಿಸಬೇಡಿ.",
    sourceUrl: "https://kkisan.karnataka.gov.in/ (DEMO)",
    isMock: true,
  },
];

export const FarmExpenseEntrySchema = z.object({
  category: z.enum([
    "SEEDS",
    "FERTILIZER",
    "PESTICIDE",
    "LABOUR",
    "IRRIGATION",
    "EQUIPMENT",
    "INSURANCE_PREMIUM",
  ]),
  amountInr: z.number().positive(),
  season: z.enum(["KHARIF", "RABI", "ZAID"]),
  note: z.string().min(1).max(160),
  provenance: z.enum(["FARMER_ENTERED", "OCR_EXTRACTED_CONFIRMED"]).default("FARMER_ENTERED"),
});
export type FarmExpenseEntryInput = z.infer<typeof FarmExpenseEntrySchema>;
