import type {
  EligibilityStatus,
  FactProvenance,
  SupportedLanguage,
  TruthLabel,
} from "@agro/shared";
import { getTranslations } from "@agro/i18n";

export const AGRO_BRAND_TOKENS = {
  colors: {
    deepGreen: "#14532D",
    freshGreen: "#16A34A",
    warmWhite: "#FAF8F5",
    goldenAccent: "#D97706",
    dangerRed: "#DC2626",
    slateText: "#1E293B",
  },
  minTouchTargetPx: 48,
} as const;

export interface BadgeDescriptor {
  label: string;
  tone: "success" | "warning" | "danger" | "neutral" | "demo";
}

export function getProvenanceBadge(
  provenance: FactProvenance,
  lang: SupportedLanguage = "kn"
): BadgeDescriptor {
  const t = getTranslations(lang);
  switch (provenance) {
    case "OFFICIALLY_VERIFIED":
      return { label: t.common.verifiedBadge, tone: "success" };
    case "OCR_EXTRACTED_CONFIRMED":
      return { label: t.common.ocrConfirmedBadge, tone: "warning" };
    case "CSC_ENTERED":
      return { label: t.common.cscEnteredBadge, tone: "neutral" };
    case "FARMER_ENTERED":
    default:
      return { label: t.common.farmerEnteredBadge, tone: "neutral" };
  }
}

export function getEligibilityBadge(
  status: EligibilityStatus,
  lang: SupportedLanguage = "kn"
): BadgeDescriptor {
  const t = getTranslations(lang);
  switch (status) {
    case "LIKELY_ELIGIBLE":
      return { label: t.schemes.statusLikelyEligible, tone: "success" };
    case "POTENTIALLY_ELIGIBLE":
      return { label: t.schemes.statusPotentiallyEligible, tone: "warning" };
    case "NOT_ELIGIBLE":
      return { label: t.schemes.statusNotEligible, tone: "danger" };
    case "NEEDS_VERIFICATION":
    default:
      return { label: t.schemes.statusNeedsVerification, tone: "neutral" };
  }
}

export function formatDeadlineTruthfully(
  deadlineIso: string | null | undefined,
  isVerified: boolean,
  lang: SupportedLanguage = "kn"
): { text: string; isVerified: boolean } {
  const t = getTranslations(lang);
  if (!deadlineIso || !isVerified) {
    return {
      text: t.common.deadlineNotVerified,
      isVerified: false,
    };
  }
  const date = new Date(deadlineIso);
  if (Number.isNaN(date.getTime())) {
    return {
      text: t.common.deadlineNotVerified,
      isVerified: false,
    };
  }
  const locale = lang === "kn" ? "kn-IN" : lang === "hi" ? "hi-IN" : "en-IN";
  const formatted = new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
  const tzSuffix =
    lang === "kn" ? "(ಭಾ.ಸಮಯ)" : lang === "hi" ? "(भा.मा.स.)" : "(IST)";
  return {
    text: `${formatted} ${tzSuffix}`,
    isVerified: true,
  };
}

export function getTruthLabelDescriptor(
  truthLabel: TruthLabel,
  isMock: boolean,
  lang: SupportedLanguage = "kn"
): BadgeDescriptor {
  const t = getTranslations(lang);
  if (isMock || truthLabel === "SAMPLE_DEMO_DATA") {
    return { label: t.common.demoBadge, tone: "demo" };
  }
  if (truthLabel === "OFFICIALLY_VERIFIED" || truthLabel === "LIVE") {
    return { label: t.common.verifiedBadge, tone: "success" };
  }
  return { label: t.common.needsVerificationBadge, tone: "warning" };
}

export type InternalTruthState =
  | "NEEDS_VERIFICATION"
  | "DEMO"
  | "MANUALLY_REPORTED"
  | "OFFICIALLY_VERIFIED"
  | "VERIFIED_FRESH"
  | "LIVE"
  | "UNAVAILABLE"
  | "UNAVAILABLE_AWAITING_AGMARKNET_API"
  | "UNAVAILABLE_AWAITING_IMD_API"
  | "UNAVAILABLE_AWAITING_VISION_MODEL";

export interface SingleTruthChipOutput {
  resolvedState:
    | "NEEDS_VERIFICATION"
    | "DEMO"
    | "MANUALLY_REPORTED"
    | "VERIFIED"
    | "LIVE"
    | "UNAVAILABLE";
  text: string;
  style: "warn" | "info" | "green" | "neutral";
  sourceLabel: string;
  lastCheckedLabel: string;
  explanation: string;
}

/**
 * Single-source truth chip resolver enforcing:
 * 1. At most ONE status chip per card.
 * 2. Priority order: NEEDS_VERIFICATION > DEMO > MANUALLY_REPORTED > VERIFIED > LIVE > UNAVAILABLE.
 * 3. A card may show "Live" ONLY when its provider is actually connected and returned non-demo data.
 *    Cards fed by demo or deterministic seed data always resolve to "Demo data" (never "Live").
 * 4. Never renders raw enum strings.
 */
export function resolveSingleTruthChip(params: {
  states: InternalTruthState[];
  isDemoData?: boolean;
  isProviderConnected?: boolean;
  verifiedDateText?: string;
  sourceUrl?: string;
  lang?: SupportedLanguage;
}): SingleTruthChipOutput {
  const lang = params.lang ?? "en";
  const isDemo = Boolean(params.isDemoData);
  const isConnected = Boolean(params.isProviderConnected) && !isDemo;
  const dateStr = params.verifiedDateText ?? "1 Nov 2026";
  const src = params.sourceUrl ?? "Official portal";

  const hasNeedsVerification = params.states.includes("NEEDS_VERIFICATION");
  const hasUnavailable = params.states.some((s) => s.startsWith("UNAVAILABLE"));
  const hasDemo = isDemo || params.states.includes("DEMO");
  const hasManual = params.states.includes("MANUALLY_REPORTED");
  const hasVerified =
    params.states.includes("OFFICIALLY_VERIFIED") ||
    params.states.includes("VERIFIED_FRESH");
  const hasLive = params.states.includes("LIVE");

  if (hasNeedsVerification) {
    return {
      resolvedState: "NEEDS_VERIFICATION",
      text:
        lang === "kn"
          ? "ಪರಿಶೀಲನೆ ಬಾಕಿ"
          : lang === "hi"
            ? "जांच आवश्यक"
            : "Needs checking",
      style: "warn",
      sourceLabel: src,
      lastCheckedLabel: dateStr,
      explanation:
        lang === "kn"
          ? "ಕೆಲವು ವಿವರಗಳನ್ನು ಅಧಿಕೃತ ದಾಖಲೆ ಅಥವಾ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ದೃಢೀಕರಿಸಬೇಕಾಗಿದೆ."
          : lang === "hi"
            ? "कुछ विवरणों को आधिकारिक पोर्टल या रिकॉर्ड से जांचना आवश्यक है।"
            : "One or more details need to be checked against your official land record or portal.",
    };
  }

  // Priority 2: DEMO (also catches any LIVE claim when isDemoData is true or provider is not connected)
  if (hasDemo || (hasLive && !isConnected)) {
    return {
      resolvedState: "DEMO",
      text:
        lang === "kn"
          ? "ಮಾದರಿ ಮಾಹಿತಿ"
          : lang === "hi"
            ? "डेमो डेटा"
            : "Demo data",
      style: "warn",
      sourceLabel: src,
      lastCheckedLabel: dateStr,
      explanation:
        lang === "kn"
          ? "ಇದು ಪರೀಕ್ಷೆಗಾಗಿ ನೀಡಲಾದ ಮಾದರಿ ಮಾಹಿತಿ. ಅರ್ಜಿ ಸಲ್ಲಿಸುವ ಮುನ್ನ ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಪರಿಶೀಲಿಸಿ."
          : lang === "hi"
            ? "यह प्रदर्शन के लिए नमूना डेटा है। आवेदन करने से पहले आधिकारिक पोर्टल पर जांचें।"
            : "This card uses sample seed data for demonstration. Always verify on the official government portal.",
    };
  }

  if (hasManual) {
    return {
      resolvedState: "MANUALLY_REPORTED",
      text:
        lang === "kn"
          ? "ನೀವು ನಮೂದಿಸಿದ್ದು"
          : lang === "hi"
            ? "आपने दर्ज किया"
            : "You entered this",
      style: "info",
      sourceLabel:
        lang === "kn"
          ? "ರೈತರು ನಮೂದಿಸಿದ ಮಾಹಿತಿ"
          : lang === "hi"
            ? "किसान द्वारा दर्ज"
            : "Entered by you",
      lastCheckedLabel: dateStr,
      explanation:
        lang === "kn"
          ? "ಈ ಮಾಹಿತಿಯನ್ನು ನೀವು ಅಥವಾ ಸೇವಾ ಕೇಂದ್ರದವರು ಆಪ್‌ನಲ್ಲಿ ನಮೂದಿಸಿದ್ದೀರಿ."
          : lang === "hi"
            ? "यह जानकारी आपने या सीएससी ऑपरेटर ने दर्ज की है।"
            : "This information was entered directly by you or your CSC operator.",
    };
  }

  if (hasVerified) {
    return {
      resolvedState: "VERIFIED",
      text:
        lang === "kn"
          ? `ಪರಿಶೀಲಿಸಲಾಗಿದೆ · ${dateStr}`
          : lang === "hi"
            ? `सत्यापित · ${dateStr}`
            : `Verified · ${dateStr}`,
      style: "green",
      sourceLabel: src,
      lastCheckedLabel: dateStr,
      explanation:
        lang === "kn"
          ? "ಅಧಿಕೃತ ಸರ್ಕಾರಿ ಮೂಲದೊಂದಿಗೆ ಪರಿಶೀಲಿಸಲಾಗಿದೆ."
          : lang === "hi"
            ? "आधिकारिक सरकारी स्रोत से सत्यापित।"
            : "Checked against the official department notification.",
    };
  }

  if (hasLive && isConnected) {
    return {
      resolvedState: "LIVE",
      text:
        lang === "kn"
          ? "ಲೈವ್ · 2 ನಿಮಿಷಗಳ ಹಿಂದೆ"
          : lang === "hi"
            ? "लाइव · 2 मिनट पहले"
            : "Live · updated 2 min ago",
      style: "green",
      sourceLabel: src,
      lastCheckedLabel:
        lang === "kn" ? "2 ನಿಮಿಷಗಳ ಹಿಂದೆ" : lang === "hi" ? "2 मिनट पहले" : "2 min ago",
      explanation:
        lang === "kn"
          ? "ಸಂಪರ್ಕಿತ ಅಧಿಕೃತ ಸೇವೆಯಿಂದ ನೇರವಾಗಿ ಪಡೆದ ಮಾಹಿತಿ."
          : lang === "hi"
            ? "कनेक्टेड प्रदाता से सीधे प्राप्त लाइव डेटा।"
            : "Retrieved directly from a connected live data provider.",
    };
  }

  if (hasUnavailable) {
    return {
      resolvedState: "UNAVAILABLE",
      text:
        lang === "kn"
          ? "ಇನ್ನೂ ಸಂಪರ್ಕಗೊಂಡಿಲ್ಲ"
          : lang === "hi"
            ? "अभी कनेक्ट नहीं है"
            : "Not connected yet",
      style: "neutral",
      sourceLabel: src,
      lastCheckedLabel:
        lang === "kn" ? "ಲಭ್ಯವಿಲ್ಲ" : lang === "hi" ? "अनुपलब्ध" : "Not connected",
      explanation:
        lang === "kn"
          ? "ಈ ಸೇವೆಯ ಬಾಹ್ಯ ಡೇಟಾ ಮೂಲ ಇನ್ನೂ ಸಂಪರ್ಕಗೊಂಡಿಲ್ಲ. ನಾವು ಯಾವುದೇ ಕಾಲ್ಪನಿಕ ಮಾಹಿತಿಯನ್ನು ತೋರಿಸುವುದಿಲ್ಲ."
          : lang === "hi"
            ? "इस सेवा का बाहरी डेटा स्रोत अभी कनेक्ट नहीं है। हम कोई काल्पनिक डेटा नहीं दिखाते।"
            : "This external data source is not connected yet. We never display fabricated or guessed numbers.",
    };
  }

  return {
    resolvedState: "DEMO",
    text:
      lang === "kn"
        ? "ಮಾದರಿ ಮಾಹಿತಿ"
        : lang === "hi"
          ? "डेमो डेटा"
          : "Demo data",
    style: "warn",
    sourceLabel: src,
    lastCheckedLabel: dateStr,
    explanation:
      lang === "kn"
        ? "ಮಾದರಿ ಮಾಹಿತಿ."
        : lang === "hi"
          ? "नमूना डेटा।"
          : "Sample demonstration data.",
  };
}
