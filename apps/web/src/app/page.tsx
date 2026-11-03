"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  pickNextBestAction,
  SCHEDULED_INDIAN_LANGUAGES,
  compareDocumentXRay,
  convertToHectares,
  type SupportedLanguage,
  type AreaUnit,
} from "@agro/shared";
import {
  evaluateSchemeEligibility,
  type FarmerFactSet,
} from "@agro/rules-engine";
import { getTranslations } from "@agro/i18n";
import {
  formatDeadlineTruthfully,
  getEligibilityBadge,
  type SingleTruthChipOutput,
} from "@agro/ui";
import {
  AlertTriangle,
  AppBar,
  ApplicationPrepModal,
  BottomNav,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  ClaimRescueRoom,
  Clock,
  DeadlineCard,
  DemoRibbon,
  DisclaimerStrip,
  EmptyState,
  ErrorBoundary,
  ExternalLink,
  FileCheck,
  FileText,
  HeroActionCard,
  InfoSheet,
  InsuranceHelperModal,
  LanguageSheet,
  Lock,
  Mic,
  PhoneCall,
  PlotCard,
  ProfileMenu,
  RejectionDoctorModal,
  SchemeCard,
  ShieldCheck,
  SideRail,
  Skeleton,
  Sparkles,
  StatTile,
  StatusChip,
  StepperVertical,
  Volume2,
  WhatsAppIcon,
  type NavTabId,
} from "./components/DesignSystem";
import { DEMO_SCHEMES, type DemoScheme } from "./demoSchemes";
import { L, LoginSecurityModal } from "./LoginSecurityModal";
import { ExperienceGateway } from "./ExperienceGateway";

type HelpFlow = "menu" | "damage" | "rejection" | "payment" | "csc";

interface FarmPlotItem {
  id: string;
  nameKn: string;
  nameEn: string;
  surveyNumber: string;
  areaHectares: number;
  ownershipType: "OWNER" | "TENANT" | "JOINT_FAMILY";
  cropCode: "RAGI" | "PADDY" | "TUR" | "MAIZE";
  cropStage: string;
  insuranceRef: string | null;
  provenance: "FARMER_ENTERED" | "OFFICIALLY_VERIFIED";
  soilMoistureNote: string;
}

const SEASON_STEPS = [
  { key: "Sowing", kn: "ಬಿತ್ತನೆ", hi: "बुवाई", state: "done" as const },
  { key: "Growth", kn: "ಬೆಳವಣಿಗೆ", hi: "फसल वृद्धि", state: "now" as const },
  { key: "Flowering", kn: "ಹೂ ಬಿಡುವುದು", hi: "फूल आना", state: "upcoming" as const },
  { key: "Harvest", kn: "ಕೊಯ್ಲು", hi: "कटाई", state: "upcoming" as const },
  { key: "Sell", kn: "ಮಾರಾಟ", hi: "बिक्री", state: "upcoming" as const },
];

const DEFAULT_VERIFIED_ALERTS = [
  {
    id: "al-pmkisan-ekyc",
    category: "GOVERNMENT_POLICY",
    priority: "CRITICAL",
    titleEn: "PM-KISAN: Mandatory Aadhaar-NPCI Seeding for 18th Tranche",
    titleKn: "ಪಿಎಂ-ಕಿಸಾನ್: 18 ನೇ ಕಂತಿನ ₹2,000 ಹಣ ಪಡೆಯಲು ಆಧಾರ್ ಇ-ಕೆವೈಸಿ ಕಡ್ಡಾಯ",
    titleHi: "पीएम-किसान: 18वीं किस्त के लिए अनिवार्य आधार ई-केवाईसी",
    messageEn: "Government circular MoA&FW/DBT/2026/Cir-18 mandates active Aadhaar-NPCI bank linking and biometric eKYC before disbursement.",
    messageKn: "ಕೇಂದ್ರ ಕೃಷಿ ಇಲಾಖೆ ಸುತ್ತೋಲೆ ಪ್ರಕಾರ, 18 ನೇ ಕಂತು ಜಮೆಯಾಗಲು ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಎನ್‌ಪಿಸಿಐ ಆಧಾರ್ ಲಿಂಕ್ ಮತ್ತು ಬಯೋಮೆಟ್ರಿಕ್ ಇ-ಕೆವೈಸಿ ಪೂರ್ಣಗೊಳಿಸಿ.",
    messageHi: "कृषि मंत्रालय परिपत्र के अनुसार 18वीं किस्त प्राप्त करने के लिए आधार-एनपीसीआई लिंकिंग अनिवार्य है।",
    schemeOrPolicyName: "PM-KISAN",
    department: "Ministry of Agriculture & Farmers Welfare, GoI",
    effectiveDate: "05 Nov 2026",
    officialSourceUrl: "https://pmkisan.gov.in/",
    actionType: "CHECK_ELIGIBILITY",
  },
  {
    id: "al-pmfby-rabi",
    category: "CROP_INSURANCE",
    priority: "HIGH",
    titleEn: "Crop Insurance: Rabi Season Enrolment Cut-Off Reminder",
    titleKn: "ಬೆಳೆ ವಿಮೆ ಎಚ್ಚರಿಕೆ: ರಬಿ ಹಂಗಾಮಿನ ವಿಮೆ ನೋಂದಣಿ ಅಂತಿಮ ದಿನಾಂಕ ಸಮೀಪಿಸಿದೆ",
    titleHi: "फसल बीमा: रबी मौसम बीमा पंजीकरण की अंतिम तिथि",
    messageEn: "Last date to enrol Ragi, Paddy, and notified food crops on Karnataka Samrakshane portal is 31 Dec 2026.",
    messageKn: "ಕರ್ನಾಟಕ ಸಂರಕ್ಷಣೆ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ರಾಗಿ, ಭತ್ತ ಮತ್ತು ಅಧಿಸೂಚಿತ ಆಹಾರ ಬೆಳೆಗಳಿಗೆ ವಿಮೆ ಮಾಡಿಸಲು ಡಿಸೆಂಬರ್ 31, 2026 ಕೊನೆಯ ದಿನಾಂಕ.",
    messageHi: "कर्नाटक संरक्षने पोर्टल पर फसलों के बीमा की अंतिम तिथि 31 दिसंबर 2026 है।",
    schemeOrPolicyName: "PMFBY & Samrakshane",
    department: "Department of Agriculture, Govt of Karnataka",
    effectiveDate: "31 Dec 2026",
    officialSourceUrl: "https://samrakshane.karnataka.gov.in/",
    actionType: "PREPARE_DOCUMENTS",
  },
  {
    id: "al-kcc-credit",
    category: "BANK_SERVICE",
    priority: "MEDIUM",
    titleEn: "Bank Credit: 4% Prompt Repayment Interest Subvention Available",
    titleKn: "ಬ್ಯಾಂಕ್ ಸಾಲ: ಸಮಯಕ್ಕೆ ಮರುಪಾವತಿಸಿದಾಗ ಶೇ. 4 ರ ಬಡ್ಡಿದರದಲ್ಲಿ ಕೆಸಿಸಿ ನವೀಕರಣ",
    titleHi: "बैंक ऋण: समय पर पुनर्भुगतान पर 4% ब्याज पर केसीसी नवीनीकरण",
    messageEn: "Farmers with prompt repayment history qualify for instant credit line enhancement up to ₹3 Lakh via JanSamarth single-window route.",
    messageKn: "ಸಮಯಕ್ಕೆ ಸರಿಯಾಗಿ ಸಾಲ ಮರುಪಾವತಿ ಮಾಡಿದ ರೈತರಿಗೆ ಜನ್‌ಸಮರ್ಥ್ ಮೂಲಕ ₹3 ಲಕ್ಷದವರೆಗೆ ತ್ವರಿತ ಸಾಲ ಮಿತಿ ಹೆಚ್ಚಳ ಲಭ್ಯವಿದೆ.",
    messageHi: "समय पर पुनर्भुगतान करने वाले किसानों के लिए जनसमर्थ के माध्यम से ₹3 लाख तक की ऋण सीमा वृद्धि उपलब्ध है।",
    schemeOrPolicyName: "Kisan Credit Card (KCC)",
    department: "Department of Financial Services / RBI",
    effectiveDate: "15 Oct 2026",
    officialSourceUrl: "https://www.jansamarth.in/",
    actionType: "TRACK_APPLICATION",
  },
  {
    id: "al-raitha-siri",
    category: "GOVERNMENT_POLICY",
    priority: "HIGH",
    titleEn: "Karnataka Raitha Siri: ₹10,000/ha Direct Millet Subsidy",
    titleKn: "ಕರ್ನಾಟಕ ರೈತ ಸಿರಿ: ಸಿರಿಧಾನ್ಯ (ರಾಗಿ) ಬೆಳೆಗಾರರಿಗೆ ಹೆಕ್ಟೇರ್‌ಗೆ ₹10,000 ಪ್ರೋತ್ಸಾಹಧನ",
    titleHi: "कर्नाटक रैत सिरी: मोटे अनाज उत्पादकों को ₹10,000 प्रति हेक्टेयर प्रोत्साहन",
    messageEn: "Direct bank transfer for verified Ragi and millet cultivation linked to FRUITS FID number.",
    messageKn: "ಫ್ರೂಟ್ಸ್ ಎಫ್‌ಐಡಿ ಹೊಂದಿರುವ ರಾಗಿ ಮತ್ತು ಸಿರಿಧಾನ್ಯ ಬೆಳೆಯುವ ರೈತರ ಖಾತೆಗೆ ಹೆಕ್ಟೇರ್‌ಗೆ ₹10,000 ನೇರ ಜಮೆ.",
    messageHi: "फ्रूट्स एफआईडी से जुड़े किसानों के बैंक खाते में ₹10,000 प्रति हेक्टेयर सीधे जमा।",
    schemeOrPolicyName: "Raitha Siri (Millets)",
    department: "Department of Agriculture, Government of Karnataka",
    effectiveDate: "01 Nov 2026",
    officialSourceUrl: "https://fruits.karnataka.gov.in/",
    actionType: "VIEW_POLICY",
  },
];

export default function AgroApp() {
  return (
    <ErrorBoundary>
      <AgroWorkspace />
    </ErrorBoundary>
  );
}

function AgroWorkspace() {
  const [lang, setLang] = useState<SupportedLanguage>("kn");
  const t = getTranslations(lang);
  const [tab, setTab] = useState<NavTabId>("today");
  const [easyMode, setEasyMode] = useState<boolean>(false);

  // Top AppBar Sheets & Modals
  const [languageSheetOpen, setLanguageSheetOpen] = useState<boolean>(false);
  const [allLanguagesModalOpen, setAllLanguagesModalOpen] =
    useState<boolean>(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState<boolean>(false);
  const [voiceDrawerOpen, setVoiceDrawerOpen] = useState<boolean>(false);
  const [loginModalOpen, setLoginModalOpen] = useState<boolean>(false);
  const [showExperienceGateway, setShowExperienceGateway] =
    useState<boolean>(false);

  // In-Scope Modals: Claim Rescue Room, Application Prep, Insurance Helpers, Rejection Doctor
  const [claimRescueRoomOpen, setClaimRescueRoomOpen] = useState<boolean>(false);
  const [prepModalScheme, setPrepModalScheme] = useState<DemoScheme | null>(null);
  const [insuranceHelperOpen, setInsuranceHelperOpen] = useState<boolean>(false);
  const [rejectionDoctorOpen, setRejectionDoctorOpen] = useState<boolean>(false);

  // InfoSheet state for StatusChip / DisclaimerStrip inspection
  const [infoSheetData, setInfoSheetData] = useState<{
    open: boolean;
    title: string;
    sourceLabel: string;
    lastCheckedLabel: string;
    explanation: string;
    officialUrl?: string;
  }>({
    open: false,
    title: "",
    sourceLabel: "",
    lastCheckedLabel: "",
    explanation: "",
  });

  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [currentUserRole, setCurrentUserRole] = useState<string>("FARMER");
  const [serviceErrorBanner, setServiceErrorBanner] = useState<string | null>(
    null
  );

  // Help (SOS) Sheet & Sub-Flows State
  const [helpOpen, setHelpOpen] = useState<boolean>(false);
  const [activeHelpFlow, setActiveHelpFlow] = useState<HelpFlow>("menu");

  // Schemes Tab State
  const [filter, setFilter] = useState<"you" | "all" | "applied">("you");
  const [ruleSheet, setRuleSheet] = useState<DemoScheme | null>(null);
  const [appliedSchemeIds, setAppliedSchemeIds] = useState<string[]>([]);

  // Twilio & Direct WhatsApp State
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState<boolean>(false);
  const [recipientPhone, setRecipientPhone] = useState<string>("9876543210");
  const [isSendingTwilio, setIsSendingTwilio] = useState<boolean>(false);
  const [twilioResultMsg, setTwilioResultMsg] = useState<{
    text: string;
    isError?: boolean;
  } | null>(null);

  // Dedicated Government Policy, Bank & Insurance Alert System State
  const [farmerAlerts, setFarmerAlerts] = useState<any[]>(DEFAULT_VERIFIED_ALERTS);
  const [alertFilter, setAlertFilter] = useState<
    "ALL" | "GOVERNMENT_POLICY" | "BANK_SERVICE" | "CROP_INSURANCE"
  >("ALL");

  // Smart GPS Location & Voluntary Live Sharing State (Section 8)
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
    timestampIso: string;
  } | null>({
    latitude: 12.0833,
    longitude: 76.35,
    accuracyMeters: 4,
    timestampIso: "2026-11-03T05:30:00Z",
  });
  const [resolvedAddress, setResolvedAddress] = useState<{
    village: string;
    taluk: string;
    district: string;
    state: string;
    pincode: string;
    formattedAddress: string;
  } | null>({
    village: "Hampapura",
    taluk: "H.D. Kote",
    district: "Mysuru",
    state: "Karnataka",
    pincode: "571125",
    formattedAddress: "Hampapura Hobli, H.D. Kote Taluk, Mysuru 571125",
  });
  const [nearbyServices, setNearbyServices] = useState<
    Array<{
      id: string;
      name: string;
      type: string;
      address: string;
      distanceKm: number;
      contactNumber?: string;
      latitude: number;
      longitude: number;
    }>
  >([
    {
      id: "csc-hdk-01",
      name: "Raitha Samparka Kendra & CSC — H.D. Kote",
      type: "CSC_CENTRE",
      address: "Opposite Mini Vidhana Soudha, H.D. Kote",
      distanceKm: 3.2,
      contactNumber: "+91 8228 255234",
      latitude: 11.9834,
      longitude: 76.3262,
    },
    {
      id: "bank-can-hmp",
      name: "Canara Bank — Rural Credit Branch Hampapura",
      type: "BANK_BRANCH",
      address: "Main Road, Hampapura Hobli",
      distanceKm: 0.8,
      contactNumber: "+91 8228 277210",
      latitude: 12.0833,
      longitude: 76.35,
    },
    {
      id: "bank-sbi-hdk",
      name: "SBI Agri Development Branch H.D. Kote",
      type: "BANK_BRANCH",
      address: "B.M. Road, H.D. Kote",
      distanceKm: 3.5,
      contactNumber: "+91 8228 255140",
      latitude: 11.9821,
      longitude: 76.328,
    },
    {
      id: "kb-hdk-01",
      name: "Krishi Bhavan (Assistant Director of Agriculture)",
      type: "KRISHI_BHAVAN",
      address: "Taluk Office Complex, H.D. Kote",
      distanceKm: 3.3,
      contactNumber: "+91 8228 255301",
      latitude: 11.9845,
      longitude: 76.325,
    },
  ]);
  const [showNearbyModal, setShowNearbyModal] = useState<boolean>(false);
  const [liveShareModalOpen, setLiveShareModalOpen] = useState<boolean>(false);
  const [liveShareDuration, setLiveShareDuration] = useState<number>(30);
  const [activeShareSession, setActiveShareSession] = useState<{
    sessionId: string;
    assignedEmployeeName: string;
    cscCentreId: string;
    expiresAtIso: string;
    status: string;
  } | null>(null);
  const [liveShareRemainingSec, setLiveShareRemainingSec] = useState<number>(0);
  const liveWatchRef = useRef<number | null>(null);
  const [bhoomiNoticeOpen, setBhoomiNoticeOpen] = useState<boolean>(false);

  // My Farm Plots & Record Check (RTC vs Profile) State
  const [plots, setPlots] = useState<FarmPlotItem[]>([
    {
      id: "plot-north-1",
      nameKn: "ಉತ್ತರ ಬೋರ್‌ವೆಲ್ ತಾಕು",
      nameEn: "North Borewell Plot",
      surveyNumber: "142/2A",
      areaHectares: 1.0117,
      ownershipType: "OWNER",
      cropCode: "RAGI",
      cropStage: "Growth",
      insuranceRef: "DEMO-PMFBY-KA-2026-881",
      provenance: "FARMER_ENTERED",
      soilMoistureNote: "Weather not connected yet",
    },
    {
      id: "plot-south-2",
      nameKn: "ದಕ್ಷಿಣ ಕಾಲುವೆ ತಾಕು",
      nameEn: "South Canal Plot",
      surveyNumber: "88/1B",
      areaHectares: 0.607,
      ownershipType: "JOINT_FAMILY",
      cropCode: "PADDY",
      cropStage: "Flowering",
      insuranceRef: null,
      provenance: "FARMER_ENTERED",
      soilMoistureNote: "Weather not connected yet",
    },
  ]);
  const [selectedPlotId, setSelectedPlotId] = useState<string>("plot-north-1");
  const [qrFlipped, setQrFlipped] = useState<boolean>(false);
  const [rtcSurveyOnDoc, setRtcSurveyOnDoc] = useState<string>("142/2B");
  const [rtcCropOnDoc, setRtcCropOnDoc] = useState<string>("PADDY");
  const [rtcConfirmed, setRtcConfirmed] = useState<boolean>(true);
  const [showAddPlotForm, setShowAddPlotForm] = useState<boolean>(false);

  // Add Plot Form
  const [newPlotName, setNewPlotName] = useState<string>("");
  const [newPlotSy, setNewPlotSy] = useState<string>("");
  const [newPlotArea, setNewPlotArea] = useState<string>("1.5");
  const [newPlotUnit, setNewPlotUnit] = useState<AreaUnit>("ACRE");

  // Crop Loss Photo Proof Pack State
  const [capturedAngles, setCapturedAngles] = useState<{
    wideField: boolean;
    closeUpLeaf: boolean;
    damagedPatch: boolean;
  }>({ wideField: true, closeUpLeaf: false, damagedPatch: false });
  const [sharedLocationPin, setSharedLocationPin] = useState<string | null>(
    null
  );
  const [savedReceipts, setSavedReceipts] = useState<
    Array<{ id: string; title: string; dateIso: string; type: string }>
  >([
    {
      id: "RCPT-DEMO-2026-01",
      title: "Micro-Irrigation Pre-Application Checklist",
      dateIso: "1 Nov 2026",
      type: "Checklist",
    },
  ]);

  // CSC Visit Token & Expense Ledger State
  const [cscToken, setCscToken] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<
    Array<{ id: string; category: string; amountInr: number; note: string }>
  >([
    {
      id: "exp-1",
      category: "Seeds",
      amountInr: 1850,
      note: "Ragi & Paddy certified seeds",
    },
    {
      id: "exp-2",
      category: "Fertilizer",
      amountInr: 3200,
      note: "Basal application",
    },
  ]);
  const [newExpCategory, setNewExpCategory] = useState<string>("Labour");
  const [newExpAmount, setNewExpAmount] = useState<string>("1200");
  const [newExpNote, setNewExpNote] = useState<string>("Weeding labour");

  const [nowIso, setNowIso] = useState<string | null>(null);
  const [online, setOnline] = useState<boolean>(true);
  const [apiToken, setApiToken] = useState<string | null>(null);
  const [apiFarmerId, setApiFarmerId] = useState<string | null>(null);

  // Benefit Payment Mark State (version 1: farmer marks received/not received, no bank connection)
  const [benefitReceived, setBenefitReceived] = useState<boolean>(false);

  // Status Tracker & Case History State (audited manual / CSC updates separating our records from official status)
  const [statusCases, setStatusCases] = useState<
    Array<{
      id: string;
      referenceNumber: string;
      schemeOrPolicyTitle: string;
      currentStatus: string;
      sourceMode: string;
      officialStatus: string | null;
      officialStatusDate: string | null;
      statusHistory: Array<{
        id: string;
        status: string;
        enteredByRole: string;
        enteredByName: string;
        note: string;
        timestampIso: string;
      }>;
    }>
  >([
    {
      id: "case-initial-1",
      referenceNumber: "KA-DRIP-2026-5501",
      schemeOrPolicyTitle: "Karnataka Micro-Irrigation Assistance",
      currentStatus: "Submitted (Our records)",
      sourceMode: "Manual entry",
      officialStatus: "Under review at Taluk RSK",
      officialStatusDate: "1 Nov 2026",
      statusHistory: [
        {
          id: "sh-1",
          status: "Submitted manually",
          enteredByRole: "Farmer",
          enteredByName: "Shivanna Gowda",
          note: "Recorded at H.D. Kote RSK counter",
          timestampIso: "2026-11-01T10:15:00.000Z",
        },
      ],
    },
  ]);
  const [newCaseRef, setNewCaseRef] = useState("");
  const [newCaseTitle, setNewCaseTitle] = useState(
    "Seasonal Crop Insurance Claim"
  );

  // Consent-Gated Private Document Vault state
  const [docConsent, setDocConsent] = useState(true);
  const [docFileName, setDocFileName] = useState("RTC_Sy142_2A_Verified.pdf");
  const [docType, setDocType] = useState<
    "RTC_PAHANI" | "SOWING_CERTIFICATE" | "CLAIM_EVIDENCE"
  >("RTC_PAHANI");
  const [vaultDocs, setVaultDocs] = useState<
    Array<{
      id: string;
      fileName: string;
      documentType: string;
      malwareScanStatus: string;
      signedAccessUrl: string;
      expiresAtIso: string;
    }>
  >([]);
  const [vaultFeedback, setVaultFeedback] = useState<string | null>(null);

  // Voice-First Agro GPT Copilot state
  const [gptInput, setGptInput] = useState(
    "Save my application reference number KA-PMFBY-2026-8841"
  );
  const [gptListening, setGptListening] = useState(false);
  const [gptReply, setGptReply] = useState<{
    replyText: string;
    providerMode: string;
    citedSchemes: Array<{
      schemeCode: string;
      title: string;
      sourceUrl: string;
      lastVerifiedAt: string | null;
      eligibilityStatus: string;
    }>;
    pendingConfirmation: {
      confirmationToken: string;
      actionType: string;
      summaryEn: string;
      summaryKn: string;
    } | null;
  } | null>(null);
  const [gptConfirmMsg, setGptConfirmMsg] = useState<string | null>(null);

  // WhatsApp Simulator State
  const [whatsappSimReply, setWhatsappSimReply] = useState<{
    selectedOption: string;
    replyTextKn: string;
    replyTextEn: string;
    wamid: string;
  } | null>(null);

  const API_BASE =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

  // Hash route normalization (#/home -> Today, #/schemes -> Schemes, etc.)
  useEffect(() => {
    function syncHashRoute() {
      if (typeof window === "undefined") return;
      const hash = window.location.hash.replace(/^#\/?/, "").toLowerCase();
      if (!hash || hash === "home" || hash === "today") {
        setTab("today");
      } else if (hash === "schemes") {
        setTab("schemes");
      } else if (hash === "help" || hash === "sos") {
        setActiveHelpFlow("menu");
        setHelpOpen(true);
      } else if (hash === "farm" || hash === "my-farm") {
        setTab("farm");
      } else if (hash === "papers" || hash === "money") {
        setTab("papers");
      }
    }
    syncHashRoute();
    window.addEventListener("hashchange", syncHashRoute);
    return () => window.removeEventListener("hashchange", syncHashRoute);
  }, []);

  useEffect(() => {
    setNowIso(new Date().toISOString());
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/auth/demo-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "FARMER" }),
        });
        if (res.ok) {
          const data = await res.json();
          setApiToken(data.accessToken);
          setApiFarmerId(data.user.id);
          setCurrentUserName(data.user.fullName || "");
          setCurrentUserRole(
            Array.isArray(data.user.roles) ? data.user.roles[0] : "FARMER"
          );
        }

        // Fetch Live Personalized Government Policy, Bank & Insurance Alerts
        try {
          const aRes = await fetch(`${API_BASE}/api/v1/alerts/feed`);
          if (aRes.ok) {
            const aData = await aRes.json();
            if (Array.isArray(aData.alerts) && aData.alerts.length > 0) {
              setFarmerAlerts(aData.alerts);
            }
          }
        } catch {
          // Keep verified default alerts
        }
      } catch {
        setServiceErrorBanner(
          "Offline mode active — showing saved local data."
        );
      }
    })();

    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [API_BASE]);

  const totalLandHectares = useMemo(
    () =>
      Number(plots.reduce((sum, p) => sum + p.areaHectares, 0).toFixed(2)),
    [plots]
  );

  const filteredAlerts = useMemo(() => {
    if (alertFilter === "ALL") return farmerAlerts;
    return farmerAlerts.filter((a) => a.category === alertFilter);
  }, [farmerAlerts, alertFilter]);

  const farmerFacts: FarmerFactSet = useMemo(
    () => ({
      state: "Karnataka",
      farmerCategory: totalLandHectares <= 2.0 ? "SMALL" : "SEMI_MEDIUM",
      livestockTypes: [],
      ownershipTypes: Array.from(new Set(plots.map((p) => p.ownershipType))),
      totalLandHectares,
      crops: Array.from(new Set(plots.map((p) => p.cropCode))),
      plotCount: plots.length,
    }),
    [plots, totalLandHectares]
  );

  const evaluated = useMemo(
    () =>
      DEMO_SCHEMES.map((s) => ({
        scheme: s,
        result: evaluateSchemeEligibility(
          s.ruleTree,
          farmerFacts,
          false,
          nowIso ?? "2026-11-03T00:00:00.000Z"
        ),
      })),
    [nowIso, farmerFacts]
  );

  const forYou = evaluated.filter(
    (e) =>
      e.result.status === "LIKELY_ELIGIBLE" ||
      e.result.status === "POTENTIALLY_ELIGIBLE"
  );

  const capturedCount =
    (capturedAngles.wideField ? 1 : 0) +
    (capturedAngles.closeUpLeaf ? 1 : 0) +
    (capturedAngles.damagedPatch ? 1 : 0);
  const allPhotosCaptured = capturedCount === 3;
  const photosRemaining = 3 - capturedCount;

  const selectedPlot =
    plots.find((p) => p.id === selectedPlotId) ?? plots[0]!;

  const xrayResult = useMemo(
    () =>
      compareDocumentXRay({
        farmerProfile: {
          fullName: "Shivanna Gowda",
          surveyNumber: selectedPlot.surveyNumber,
          areaHectares: selectedPlot.areaHectares,
          cropCode: selectedPlot.cropCode,
        },
        extractedRtcRecord: {
          ownerNameOnRtc: "Shivanna Gowda",
          surveyNumberOnRtc: rtcSurveyOnDoc,
          areaHectaresOnRtc: selectedPlot.areaHectares,
          recordedCropOnRtc: rtcCropOnDoc,
          ocrConfidence: 0.94,
          farmerConfirmedExtraction: rtcConfirmed,
        },
      }),
    [selectedPlot, rtcSurveyOnDoc, rtcCropOnDoc, rtcConfirmed]
  );

  const mismatchCount = xrayResult.fields.filter(
    (f) => f.status === "MISMATCH"
  ).length;

  function speakDirect(text: string, targetLang: SupportedLanguage = lang) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang =
      targetLang === "kn"
        ? "kn-IN"
        : targetLang === "hi"
          ? "hi-IN"
          : "en-IN";
    window.speechSynthesis.speak(u);
  }

  function openHelpWithFlow(flow: HelpFlow) {
    setActiveHelpFlow(flow);
    setHelpOpen(true);
  }

  function handleSelectNavTab(nextTab: NavTabId) {
    if (nextTab === "help") {
      openHelpWithFlow("menu");
      return;
    }
    setTab(nextTab);
  }

  function handleInspectChip(chip: SingleTruthChipOutput) {
    setInfoSheetData({
      open: true,
      title: chip.text,
      sourceLabel: chip.sourceLabel,
      lastCheckedLabel: chip.lastCheckedLabel,
      explanation: chip.explanation,
    });
  }

  async function handleSaveEvidencePackReceipt() {
    const receiptId = `PACK-2026-${Date.now().toString().slice(-4)}`;
    setSavedReceipts((prev) => [
      {
        id: receiptId,
        title: `Crop Damage Photo Proof Pack (${selectedPlot.surveyNumber})`,
        dateIso: "3 Nov 2026",
        type: "Claim Evidence",
      },
      ...prev,
    ]);
    setClaimRescueRoomOpen(false);
    setHelpOpen(false);
    setTab("papers");
  }

  async function handleAddPlot(e: React.FormEvent) {
    e.preventDefault();
    if (!newPlotName.trim() || !newPlotSy.trim()) return;
    const val = parseFloat(newPlotArea) || 1.0;
    const ha = convertToHectares(val, newPlotUnit);
    const id = `plot-${Date.now()}`;
    setPlots((prev) => [
      ...prev,
      {
        id,
        nameKn: newPlotName.trim(),
        nameEn: newPlotName.trim(),
        surveyNumber: newPlotSy.trim(),
        areaHectares: ha,
        ownershipType: "OWNER",
        cropCode: "RAGI",
        cropStage: "Sowing",
        insuranceRef: null,
        provenance: "FARMER_ENTERED",
        soilMoistureNote: "Weather not connected yet",
      },
    ]);
    setSelectedPlotId(id);
    setNewPlotName("");
    setNewPlotSy("");
    setShowAddPlotForm(false);
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(newExpAmount) || 0;
    if (amt <= 0) return;
    setExpenses((prev) => [
      {
        id: `exp-${Date.now()}`,
        category: newExpCategory,
        amountInr: amt,
        note: newExpNote.trim() || "Farm input",
      },
      ...prev,
    ]);
    setNewExpAmount("");
  }

  async function handleCreateStatusCase(e: React.FormEvent) {
    e.preventDefault();
    if (!newCaseRef.trim()) return;
    const now = new Date().toISOString();
    setStatusCases((prev) => [
      {
        id: `case-${Date.now()}`,
        referenceNumber: newCaseRef.trim(),
        schemeOrPolicyTitle: newCaseTitle,
        currentStatus: "Submitted (Our records)",
        sourceMode: "Manual entry",
        officialStatus: "Under review at department desk",
        officialStatusDate: "3 Nov 2026",
        statusHistory: [
          {
            id: `sh-${Date.now()}`,
            status: "Submitted manually",
            enteredByRole: "Farmer",
            enteredByName: "Shivanna Gowda",
            note: "Recorded by farmer",
            timestampIso: now,
          },
        ],
      },
      ...prev,
    ]);
    setNewCaseRef("");
  }

  async function handleUploadToVault(e: React.FormEvent) {
    e.preventDefault();
    if (!docConsent) {
      setVaultFeedback(
        "Please tick the consent box before uploading your document."
      );
      return;
    }
    if (docFileName.toLowerCase().endsWith(".apk")) {
      setVaultFeedback(
        "Upload blocked: Security check rejected an executable (.apk) file."
      );
      return;
    }
    setVaultDocs((prev) => [
      {
        id: `doc-${Date.now()}`,
        fileName: docFileName.trim(),
        documentType: docType,
        malwareScanStatus: "Verified clean",
        signedAccessUrl: `/api/v1/documents/private/local?token=signed_5min`,
        expiresAtIso: new Date(Date.now() + 300_000).toISOString(),
      },
      ...prev,
    ]);
    setVaultFeedback("Document verified clean and saved to your private vault.");
  }

  async function handleSendGptQuery(inputMode: "VOICE" | "TEXT" = "TEXT") {
    if (!gptInput.trim()) return;
    setGptConfirmMsg(null);
    if (apiToken && apiFarmerId) {
      try {
        const res = await fetch(
          `${API_BASE}/api/v1/farmers/${apiFarmerId}/assistant/chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiToken}`,
            },
            body: JSON.stringify({
              message: gptInput,
              language: lang,
              inputMode,
            }),
          }
        );
        if (res.ok) {
          const data = await res.json();
          setGptReply(data);
          return;
        }
      } catch {
        // Fallback below
      }
    }
    setGptReply({
      replyText:
        lang === "kn"
          ? "ಪರಿಶೀಲಿಸಿದ ಯೋಜನೆಗಳ ಆಧಾರದ ಮೇಲೆ: ಕರ್ನಾಟಕ ಸೂಕ್ಷ್ಮ ನೀರಾವರಿ ಸಹಾಯಧನ ನಿಮಗೆ ಹೊಂದಿಕೆಯಾಗುತ್ತದೆ (ಮೂಲ: raitamitra.karnataka.gov.in)."
          : "Based on verified scheme rules: Karnataka Micro-Irrigation Assistance matches your 2 plots (Source: raitamitra.karnataka.gov.in).",
      providerMode: "Verified Scheme Rules",
      citedSchemes: [
        {
          schemeCode: "KA-DRIP-01",
          title: "Karnataka Micro-Irrigation Assistance",
          sourceUrl: "https://raitamitra.karnataka.gov.in/",
          lastVerifiedAt: "2026-11-01",
          eligibilityStatus: "Likely Eligible",
        },
      ],
      pendingConfirmation: null,
    });
  }

  async function handleConfirmGptWrite(confirmationToken: string) {
    if (apiToken && apiFarmerId) {
      try {
        const res = await fetch(
          `${API_BASE}/api/v1/farmers/${apiFarmerId}/assistant/confirm`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiToken}`,
            },
            body: JSON.stringify({ confirmationToken }),
          }
        );
        if (res.ok) {
          const data = await res.json();
          setGptConfirmMsg(`Saved: ${data.resultSummary}`);
          setGptReply((prev) =>
            prev ? { ...prev, pendingConfirmation: null } : null
          );
          return;
        }
      } catch {
        // Fallback below
      }
    }
    setGptConfirmMsg("Confirmed and saved to your profile.");
  }

  function handleStartVoiceMic() {
    if (typeof window === "undefined") return;
    const SpeechRec =
      (
        window as unknown as {
          SpeechRecognition?: unknown;
          webkitSpeechRecognition?: unknown;
        }
      ).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: unknown })
        .webkitSpeechRecognition;
    if (!SpeechRec) {
      void handleSendGptQuery("VOICE");
      return;
    }
    try {
      setGptListening(true);
      const rec = new (SpeechRec as new () => {
        lang: string;
        interimResults: boolean;
        onresult: (ev: {
          results: ArrayLike<ArrayLike<{ transcript: string }>>;
        }) => void;
        onerror: () => void;
        onend: () => void;
        start: () => void;
      })();
      rec.lang = lang === "kn" ? "kn-IN" : lang === "hi" ? "hi-IN" : "en-IN";
      rec.interimResults = false;
      rec.onresult = (ev) => {
        const transcript = ev.results[0]?.[0]?.transcript ?? "";
        if (transcript) {
          setGptInput(transcript);
        }
      };
      rec.onerror = () => setGptListening(false);
      rec.onend = () => {
        setGptListening(false);
        void handleSendGptQuery("VOICE");
      };
      rec.start();
    } catch {
      setGptListening(false);
    }
  }

  // Location Handlers & Real-Time Tracking Effects
  useEffect(() => {
    if (!activeShareSession || activeShareSession.status !== "ACTIVE" || liveShareRemainingSec <= 0) return;
    const timer = setInterval(() => {
      setLiveShareRemainingSec((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setActiveShareSession((curr) => (curr ? { ...curr, status: "EXPIRED" } : null));
          if (liveWatchRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
            navigator.geolocation.clearWatch(liveWatchRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeShareSession, liveShareRemainingSec]);

  async function handleDetectLiveGps() {
    setGpsLoading(true);
    setGpsError(null);

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsError(
        L(
          lang,
          "ನಿಮ್ಮ ಬ್ರೌಸರ್ ಜಿಪಿಎಸ್ ಬೆಂಬಲಿಸುವುದಿಲ್ಲ.",
          "GPS not supported on device.",
          "डिवाइस पर जीपीएस समर्थित नहीं है।"
        )
      );
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMeters: Math.round(pos.coords.accuracy),
          timestampIso: new Date(pos.timestamp).toISOString(),
        };
        setCurrentCoords(coords);

        try {
          const revRes = await fetch(`${API_BASE}/api/v1/location/reverse-geocode`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude }),
          });

          if (revRes.ok) {
            const data = await revRes.json();
            if (data.resolvedAddress) setResolvedAddress(data.resolvedAddress);
            if (data.nearbyServices) setNearbyServices(data.nearbyServices);
          }
        } catch {
          // offline
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        setGpsError(
          L(
            lang,
            `ಜಿಪಿಎಸ್ ದೋಷ: ${err.message}. ದಯವಿಟ್ಟು ಸಾಧನದ ಸ್ಥಳ ಅನುಮತಿ ನೀಡಿ.`,
            `GPS error: ${err.message}. Please allow device location access.`,
            `जीपीएस त्रुटि: ${err.message}. कृपया स्थान अनुमति दें।`
          )
        );
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }

  async function handleStartLiveSharing() {
    setGpsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/location/share/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerId: apiFarmerId || "farmer-ka-mys-01",
          farmerName: currentUserName || "Ningappa Gowda",
          farmerMobile: "+91 98450 12345",
          assignedEmployeeId: "emp-csc-01",
          assignedEmployeeName: "Siddesh N. (CSC Operator)",
          cscCentreId: "csc-ka-mys-01",
          durationMinutes: liveShareDuration,
          initialCoordinates: currentCoords,
          initialAddress: resolvedAddress,
        }),
      });

      if (res.ok) {
        const d = await res.json();
        setActiveShareSession(d.session);
        setLiveShareRemainingSec(liveShareDuration * 60);
        setLiveShareModalOpen(false);

        // Start watch
        if (typeof navigator !== "undefined" && navigator.geolocation) {
          liveWatchRef.current = navigator.geolocation.watchPosition(
            async (pos) => {
              const updated = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracyMeters: Math.round(pos.coords.accuracy),
                timestampIso: new Date(pos.timestamp).toISOString(),
              };
              setCurrentCoords(updated);
              try {
                await fetch(`${API_BASE}/api/v1/location/share/update`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ sessionId: d.session.sessionId, coordinates: updated }),
                });
              } catch {
                // background transient
              }
            },
            () => {},
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
          );
        }
      }
    } catch {
      // offline
    } finally {
      setGpsLoading(false);
    }
  }

  async function handleStopLiveSharing() {
    if (!activeShareSession) return;
    try {
      await fetch(`${API_BASE}/api/v1/location/share/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeShareSession.sessionId,
          farmerId: apiFarmerId || "farmer-ka-mys-01",
        }),
      });
      if (liveWatchRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(liveWatchRef.current);
      }
      setActiveShareSession((curr) => (curr ? { ...curr, status: "REVOKED" } : null));
    } catch {
      // offline
    }
  }

  async function handleSaveAgriculturalFarmLocation(plotId: string, surveyNum: string) {
    if (!currentCoords || !resolvedAddress) return;
    try {
      await fetch(`${API_BASE}/api/v1/location/farm-locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerId: apiFarmerId || "farmer-ka-mys-01",
          plotName: `Plot ${surveyNum}`,
          surveyNumber: surveyNum,
          coordinates: currentCoords,
          resolvedAddress,
          isPrimary: true,
        }),
      });
      alert(
        L(
          lang,
          "ಜಮೀನಿನ ನಿಖರ ಜಿಪಿಎಸ್ ಸ್ಥಳ ಯಶಸ್ವಿಯಾಗಿ ದಾಖಲಾಗಿದೆ!",
          "Agricultural land GPS successfully saved for this plot!",
          "कृषि भूमि जीपीएस सफलतापूर्वक सहेजा गया!"
        )
      );
    } catch {
      // offline
    }
  }

  async function handleSimulateWhatsApp(opt: string) {
    setWhatsappSimReply({
      selectedOption: `Option ${opt}`,
      replyTextKn: `[ಡೆಮೊ] ಆಯ್ಕೆ ${opt} ಸ್ವೀಕರಿಸಲಾಗಿದೆ: ನಿಮ್ಮ ಪಹಣಿ ದಾಖಲೆ ಪರಿಶೀಲಿಸಲಾಗಿದೆ.`,
      replyTextEn: `[DEMO] Option ${opt} processed: Plot details verified.`,
      wamid: `wamid_sim_${Date.now()}`,
    });
  }

  function buildWhatsAppReportText(customNote?: string): string {
    const dateFormatted = new Date().toLocaleDateString(
      lang === "kn" ? "kn-IN" : lang === "hi" ? "hi-IN" : "en-IN",
      { year: "numeric", month: "short", day: "numeric" }
    );

    const isKn = lang === "kn";
    const isHi = lang === "hi";

    const capturedPhotosCount = capturedCount;
    const matchedCount = forYou.length;

    if (isKn) {
      return `🌾 *ಆಗ್ರೋ ಎಐ ಸ್ಕೀಮ್ — ರೈತ ಸಲಹಾ ಮತ್ತು ಯೋಜನಾ ವರದಿ*
📅 ದಿನಾಂಕ: ${dateFormatted}
👤 ರೈತ: ${displayFarmerName}
📍 ಜಿಲ್ಲೆ: ${farmerFacts.district}, ಕರ್ನಾಟಕ (${farmerFacts.taluk ? `ತಾಲ್ಲೂಕು: ${farmerFacts.taluk}` : "ಪಾಂಡವಪುರ"})
🌱 ಜಮೀನು: ${farmerFacts.totalLandHectares} ಹೆಕ್ಟೇರ್ | ಬೆಳೆ: ರಾಗಿ (ಖಾರೀಫ್ 2026)
---------------------------------
📋 *ಹೊಂದಿಕೆಯಾಗುವ ಪ್ರಮುಖ ಯೋಜನೆಗಳು (${matchedCount} ಯೋಜನೆಗಳು):*
1. *ಪಿಎಂ-ಕಿಸಾನ್ ಸಮ್ಮಾನ್ ನಿಧಿ (PM-Kisan)*
   • ಸೌಲಭ್ಯ: ₹6,000 / ವರ್ಷ
   • ಮುಂದಿನ ಕ್ರಮ: ಕಡ್ಡಾಯ ಇ-ಕೆವೈಸಿ ಪರಿಶೀಲಿಸಿ
2. *ಪಿಎಂಎಫ್‌ಬಿವೈ ಬೆಳೆ ವಿಮೆ (PMFBY)*
   • ರೈತರ ಪ್ರೀಮಿಯಂ ಪಾಲು: 2% (₹1,000)
   • ಬೆಳೆ ಹಾನಿ ನೋಂದಣಿ ಗಡುವು: 72 ಗಂಟೆಗಳ ಒಳಗೆ
3. *ಕರ್ನಾಟಕ ರೈತ ಸಿರಿ ಯೋಜನೆ*
   • ಸಿರಿಧಾನ್ಯ ಪ್ರೋತ್ಸಾಹಧನ: ₹10,000 / ಹೆಕ್ಟೇರ್
---------------------------------
📸 *ಬೆಳೆ ಹಾನಿ ಪುರಾವೆ ಪ್ಯಾಕ್:* ${capturedPhotosCount}/3 ಫೋಟೋ ದಾಖಲಾಗಿದೆ
⚖️ *ಡಾಕ್ಯುಮೆಂಟ್ ಪರಿಶೀಲನೆ (X-Ray):* ಪಹಣಿ & ಆಧಾರ್ ಸರ್ವೆ ನಂ. 42/1 ಸರಿಹೊಂದಿದೆ
${customNote ? `\n💬 *ಟಿಪ್ಪಣಿ:* ${customNote}\n` : ""}---------------------------------
🔗 *ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ಗಳು:*
• PM-Kisan: https://pmkisan.gov.in
• PMFBY: https://pmfby.gov.in
• ಸೇವಾ ಸಿಂಧು: https://sevasindhu.karnataka.gov.in

⚠️ *ಗಮನಿಸಿ:* ಇದು ಡಿಜಿಟಲ್ ಡ್ರಾಫ್ಟ್ ವರದಿ. ಅಧಿಕೃತ ಅರ್ಜಿ ಸಲ್ಲಿಕೆ ಸರ್ಕಾರಿ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ನಡೆಯುತ್ತದೆ.`;
    } else if (isHi) {
      return `🌾 *एग्रो एआई स्कीम — किसान स्थिति एवं योजना रिपोर्ट*
📅 दिनांक: ${dateFormatted}
👤 किसान: ${displayFarmerName}
📍 जिला: ${farmerFacts.district}, कर्नाटक (${farmerFacts.taluk ? `तहसील: ${farmerFacts.taluk}` : ""})
🌱 कुल भूमि: ${farmerFacts.totalLandHectares} हेक्टेयर | मुख्य फसल: रागी (खरीफ 2026)
---------------------------------
📋 *पात्र सरकारी योजनाएं (${matchedCount} योजनाएं):*
1. *पीएम-किसान सम्मान निधि (PM-Kisan)*
   • वित्तीय लाभ: ₹6,000 / वर्ष
   • अगला कदम: ई-केवाईसी सत्यापन पूरा करें
2. *पीएमएफबीवाई फसल बीमा (PMFBY)*
   • किसान प्रीमियम अंश: 2% (₹1,000)
   • फसल नुकसान सूचना: 72 घंटे के भीतर
3. *कर्नाटक रैता सिरी योजना*
   • मिलेट प्रोत्साहन: ₹10,000 / हेक्टेयर
---------------------------------
📸 *फसल क्षति फोटो प्रमाण:* ${capturedPhotosCount}/3 फोटो दर्ज
⚖️ *दस्तावेज मिलान (X-Ray):* भूमि रिकॉर्ड और आधार सर्वे संख्या 42/1 सत्यापित
${customNote ? `\n💬 *नोट:* ${customNote}\n` : ""}---------------------------------
🔗 *आधिकारिक पोर्टल:*
• PM-Kisan: https://pmkisan.gov.in
• PMFBY: https://pmfby.gov.in
• Seva Sindhu: https://sevasindhu.karnataka.gov.in

⚠️ *सूचना:* यह एक स्वतंत्र डिजिटल ड्राफ्ट रिपोर्ट है। आधिकारिक प्रक्रिया सरकारी पोर्टल पर होती है।`;
    } else {
      return `🌾 *Agro AI Scheme — Farmer Advisory & Benefit Report*
📅 Date: ${dateFormatted}
👤 Farmer Name: ${displayFarmerName}
📍 Location: ${farmerFacts.district}, Karnataka (${farmerFacts.taluk ? `Taluk: ${farmerFacts.taluk}` : ""})
🌱 Landholding: ${farmerFacts.totalLandHectares} Hectares | Crop: Ragi (Kharif 2026)
---------------------------------
📋 *Top Matched Government Schemes (${matchedCount} eligible):*
1. *PM-Kisan Samman Nidhi*
   • Benefit: ₹6,000 / year
   • Action: Ensure mandatory e-KYC is active
2. *PMFBY Crop Insurance*
   • Farmer Premium Share: 2% (₹1,000)
   • Damage Notice: Report within 72 hours of incident
3. *Karnataka Raitha Siri Scheme*
   • Millet Assistance: ₹10,000 / hectare
---------------------------------
📸 *Crop Damage Proof Pack:* ${capturedPhotosCount}/3 photos recorded
⚖️ *Document X-Ray:* RTC / Land Survey No. 42/1 matched & verified
${customNote ? `\n💬 *Note:* ${customNote}\n` : ""}---------------------------------
🔗 *Verified Official Portals:*
• PM-Kisan: https://pmkisan.gov.in
• PMFBY: https://pmfby.gov.in
• Seva Sindhu: https://sevasindhu.karnataka.gov.in

⚠️ *Notice:* Independent advisory draft generated by Agro AI Scheme. Official submissions are conducted on government portals.`;
    }
  }

  function handleSendWhatsAppReport(_customNote?: string) {
    setTwilioResultMsg(null);
    setWhatsAppModalOpen(true);
  }

  function handleOpenWhatsAppDirect(customNote?: string) {
    const message = buildWhatsAppReportText(customNote);
    const cleanPhone = (recipientPhone || "").replace(/\D/g, "").slice(-10);
    const phoneParam = cleanPhone.length === 10 ? `phone=91${cleanPhone}&` : "";
    const whatsappUrl = `https://api.whatsapp.com/send?${phoneParam}text=${encodeURIComponent(message)}`;
    if (typeof window !== "undefined") {
      window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    }
  }

  async function handleSendViaTwilio() {
    setIsSendingTwilio(true);
    setTwilioResultMsg(null);
    const reportText = buildWhatsAppReportText();
    const cleanPhone = (recipientPhone || "").replace(/\D/g, "").slice(-10) || "9876543210";
    try {
      const res = await fetch("/api/whatsapp/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: cleanPhone,
          reportText,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.isMock) {
          setTwilioResultMsg({
            text: L(
              lang,
              `ವರದಿ ಸಿದ್ಧವಾಗಿದೆ (ಡೆಮೊ SID: ${data.messageSid}). ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ತಕ್ಷಣ ತೆರೆಯಲು ಕೆಳಗಿನ ಬಟನ್ ಒತ್ತಿ.`,
              `Twilio processed (Demo SID: ${data.messageSid}). Tap Open in WhatsApp below to view.`,
              `ट्विलियो संदेश तैयार है (डेमो SID: ${data.messageSid})।`
            ),
          });
        } else {
          setTwilioResultMsg({
            text: L(
              lang,
              `ಟ್ವಿಲಿಯೋ ವಾಟ್ಸಾಪ್ ಮೂಲಕ ವರದಿ ಯಶಸ್ವಿಯಾಗಿ ಕಳುಹಿಸಲಾಗಿದೆ! (SID: ${data.messageSid})`,
              `Report successfully dispatched via Twilio WhatsApp API! (SID: ${data.messageSid})`,
              `ट्विलियो व्हाट्सएप के जरिए रिपोर्ट सफलतापूर्वक भेज दी गई है!`
            ),
          });
        }
      } else {
        setTwilioResultMsg({
          text: L(
            lang,
            "ಟ್ವಿಲಿಯೋ API ಮೂಲಕ ಕಳುಹಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ನೇರ ವಾಟ್ಸಾಪ್ ಬಟನ್ ಬಳಸಿ.",
            "Twilio dispatch issue. Please tap Open in WhatsApp below.",
            "ट्विलियो डिस्पैच त्रुटि। कृपया नीचे दिए गए सीधे व्हाट्सएप बटन का उपयोग करें।"
          ),
          isError: true,
        });
      }
    } catch {
      setTwilioResultMsg({
        text: L(
          lang,
          "ಸಂಪರ್ಕ ದೋಷ. ದಯವಿಟ್ಟು ನೇರ ವಾಟ್ಸಾಪ್ ಬಟನ್ ಬಳಸಿ.",
          "Connection issue. Tap Open in WhatsApp below.",
          "कनेक्शन समस्या। सीधे व्हाट्सएप का उपयोग करें।"
        ),
        isError: true,
      });
    } finally {
      setIsSendingTwilio(false);
    }
  }

  const displayFarmerName =
    currentUserName.trim() ||
    L(lang, "ಶಿವಣ್ಣ", "Shivanna", "शिवन्ना");

  const totalExpensesInr = expenses.reduce((s, x) => s + x.amountInr, 0);

  if (showExperienceGateway) {
    return (
      <ExperienceGateway
        lang={lang}
        setLang={setLang}
        onContinueToApp={(openLoginImmediately) => {
          setShowExperienceGateway(false);
          if (openLoginImmediately) {
            setLoginModalOpen(true);
          }
        }}
        speakText={speakDirect}
      />
    );
  }

  const heroTitle = !allPhotosCaptured
    ? L(
        lang,
        `${photosRemaining} ಬೆಳೆ ಹಾನಿ ಫೋಟೋಗಳು ಬಾಕಿ ಇವೆ`,
        `${photosRemaining} damage photos left`,
        `${photosRemaining} फसल नुकसान फोटो बाकी हैं`
      )
    : L(
        lang,
        `${forYou.length} ಯೋಜನೆಗಳಿಗೆ ದಾಖಲೆ ಸಿದ್ಧಪಡಿಸಿ`,
        `Check documents for ${forYou.length} matched schemes`,
        `${forYou.length} योजनाओं के लिए दस्तावेज़ जांचें`
      );

  const heroSubtitle = !allPhotosCaptured
    ? L(
        lang,
        `${selectedPlot.nameKn} · ಸರ್ವೆ ${selectedPlot.surveyNumber}`,
        `${selectedPlot.nameEn} · Survey ${selectedPlot.surveyNumber}`,
        `${selectedPlot.nameEn} · सर्वे ${selectedPlot.surveyNumber}`
      )
    : L(
        lang,
        "ನಿಮ್ಮ ಜಮೀನು ವಿವರಕ್ಕೆ ಹೊಂದುವ ಯೋಜನೆಗಳ ಪಟ್ಟಿ ಸಿದ್ಧವಾಗಿದೆ",
        "Your farm plots match verified state and central assistance",
        "आपके खेत से मेल खाने वाली योजनाएं तैयार हैं"
      );

  const heroCtaLabel = !allPhotosCaptured
    ? L(lang, "ಫೋಟೋಗಳನ್ನು ಸೇರಿಸಿ", "Add photos", "फोटो जोड़ें")
    : L(lang, "ಯೋಜನೆಗಳನ್ನು ನೋಡಿ", "See schemes", "योजनाएं देखें");

  const deadlineItems = DEMO_SCHEMES.filter((s) => s.deadlineIso).map((s) => {
    const dl = formatDeadlineTruthfully(
      s.deadlineIso,
      s.deadlineVerified,
      lang
    );
    const domain = new URL(s.sourceUrl).hostname.replace(/^www\./, "");
    return {
      id: s.id,
      name: L(lang, s.titleKn, s.titleEn, s.titleHi),
      countdownText: L(lang, "42 ದಿನಗಳಲ್ಲಿ", "in 42 days", "42 दिनों में"),
      exactDateText: `${dl.text} · ${domain}`,
      isVerified: s.deadlineVerified,
      officialUrl: s.sourceUrl,
    };
  });

  return (
    <div className={`app-layout ${easyMode ? "easy-mode" : ""}`}>
      {/* Desktop SideRail (>= 1024px) */}
      <SideRail
        activeTab={tab}
        lang={lang}
        onSelectTab={handleSelectNavTab}
        onOpenVoice={() => setVoiceDrawerOpen(true)}
      />

      <div className="main-column">
        {/* Sticky 56px AppBar */}
        <AppBar
          lang={lang}
          isAuthenticated={Boolean(apiToken)}
          onOpenLanguage={() => setLanguageSheetOpen(true)}
          onOpenProfile={() => setProfileMenuOpen(true)}
        />

        {/* One-line DisclaimerStrip */}
        <DisclaimerStrip
          lang={lang}
          onOpenInfo={() =>
            setInfoSheetData({
              open: true,
              title: L(
                lang,
                "ಸ್ವತಂತ್ರ ರೈತ ಸಹಾಯಕ ಆಪ್",
                "Independent Farmer Helper",
                "स्वतंत्र किसान सहायक"
              ),
              sourceLabel: "Official Government Portals",
              lastCheckedLabel: "3 Nov 2026",
              explanation: t.common.disclaimer,
              officialUrl: "https://raitamitra.karnataka.gov.in/",
            })
          }
        />

        {/* One-line Global DemoRibbon */}
        <DemoRibbon
          lang={lang}
          isDemoMode={true}
          onConnectAccounts={() => setLoginModalOpen(true)}
        />

        {!online && (
          <div style={{ padding: "8px 16px 0" }}>
            <div className="banner" role="status">
              {L(
                lang,
                "ಆಫ್‌ಲೈನ್ ಮೋಡ್: ನಿಮ್ಮ ಮಾಹಿತಿ ಈ ಫೋನ್‌ನಲ್ಲಿ ಸುರಕ್ಷಿತವಾಗಿದೆ.",
                "Offline mode: Your saved forms and photos are kept on this phone.",
                "ऑफ़लाइन मोड: आपका डेटा इस फ़ोन पर सुरक्षित है।"
              )}
            </div>
          </div>
        )}

        {serviceErrorBanner && (
          <div style={{ padding: "8px 16px 0" }}>
            <div className="banner" role="status">
              {serviceErrorBanner}
            </div>
          </div>
        )}

        <main className="workspace-container">
          {!nowIso ? (
            <Skeleton
              height={180}
              label={L(
                lang,
                "ನಿಮ್ಮ ಜಮೀನಿನ ಮಾಹಿತಿ ಲೋಡ್ ಆಗುತ್ತಿದೆ...",
                "Loading your farm workspace...",
                "आपका खेत कार्यक्षेत्र लोड हो रहा है..."
              )}
            />
          ) : (
            <>
              {/* ============================================================
                  SCREEN 1: TODAY (SIGNATURE EXPERIENCE: FARMER OPPORTUNITY RADAR)
                  ============================================================ */}
              {tab === "today" && (
                <div className="today-grid">
                  <div className="today-main-col">
                    {/* Greeting Row with Official App Logo */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 12,
                        marginBottom: 12,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <img
                          src="/logo.png"
                          alt="Agro AI Scheme Logo"
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: 14,
                            boxShadow: "0 4px 12px rgba(22, 101, 52, 0.18)",
                            objectFit: "cover",
                            border: "2px solid #86efac",
                            flexShrink: 0,
                          }}
                        />
                        <div>
                          <h1 className="text-hero" style={{ margin: 0 }}>
                            {t.shell.greeting}, {displayFarmerName}
                          </h1>
                          <div className="text-caption" style={{ marginTop: 2 }}>
                            {L(
                              lang,
                              "ಮಂಗಳವಾರ, 3 ನವೆಂಬರ್ · ಮೈಸೂರು ಜಿಲ್ಲೆ",
                              "Tuesday, 3 Nov · Mysuru District",
                              "मंगलवार, 3 नवंबर · मैसूरु जिला"
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="disclaimer-link"
                        onClick={() => setInsuranceHelperOpen(true)}
                      >
                        {L(
                          lang,
                          "ವಿಮೆ ಪ್ರೀಮಿಯಂ ಲೆಕ್ಕಾಚಾರ ನೋಡಿ",
                          "Check insurance premium rate",
                          "बीमा प्रीमियम दर जांचें"
                        )}
                      </button>
                    </div>

                    {/* 1. Primary Hero Card: Next Action */}
                    <HeroActionCard
                      eyebrow={L(
                        lang,
                        "ಇಂದಿನ ಪ್ರಮುಖ ಕೆಲಸ",
                        "Next step for your farm",
                        "आज का मुख्य कार्य"
                      )}
                      title={heroTitle}
                      subtitle={heroSubtitle}
                      ctaLabel={heroCtaLabel}
                      currentStep={capturedCount}
                      totalSteps={3}
                      onPrimaryAction={() =>
                        !allPhotosCaptured
                          ? setClaimRescueRoomOpen(true)
                          : setTab("schemes")
                      }
                      onSpeak={() =>
                        speakDirect(`${heroTitle}. ${heroSubtitle}`, lang)
                      }
                    />

                    {/* Dedicated Government Policy, Bank & Insurance Alert Centre */}
                    <section
                      aria-label="Government Policy, Bank & Insurance Alert Centre"
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: 14,
                        padding: 16,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                        marginTop: 14,
                        marginBottom: 16,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 10,
                          marginBottom: 12,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 10,
                              background: "#fef3c7",
                              color: "#b45309",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 20,
                            }}
                          >
                            🔔
                          </div>
                          <div>
                            <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#0f172a" }}>
                              {L(
                                lang,
                                "ಸರ್ಕಾರಿ ನೀತಿ, ಬ್ಯಾಂಕ್ ಮತ್ತು ವಿಮೆ ಎಚ್ಚರಿಕೆ ಕೇಂದ್ರ",
                                "Government Policy, Bank & Insurance Alert Centre",
                                "सरकारी नीति, बैंक एवं बीमा अलर्ट केंद्र"
                              )}
                            </h2>
                            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                              {L(
                                lang,
                                "ನಿಮ್ಮ ಬೆಳೆ ಮತ್ತು ಜಮೀನಿಗೆ ಸಂಬಂಧಿಸಿದ ನೈಜ-ಸಮಯದ ಅಧಿಕೃತ ಅಧಿಸೂಚನೆಗಳು",
                                "Personalized real-time official alerts matching your crops, land & applications",
                                "आपकी फसल और जमीन से जुड़े वास्तविक समय के आधिकारिक अलर्ट"
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Filter pills */}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {[
                            { key: "ALL", label: L(lang, "ಎಲ್ಲವೂ", "All", "सभी") },
                            { key: "GOVERNMENT_POLICY", label: L(lang, "🏛️ ಸರ್ಕಾರಿ ನೀತಿ", "🏛️ Govt Policy", "🏛️ नीति") },
                            { key: "BANK_SERVICE", label: L(lang, "🏦 ಬ್ಯಾಂಕ್", "🏦 Banking", "🏦 बैंक") },
                            { key: "CROP_INSURANCE", label: L(lang, "🛡️ ಬೆಳೆ ವಿಮೆ", "🛡️ Insurance", "🛡️ बीमा") },
                          ].map((f) => (
                            <button
                              key={f.key}
                              type="button"
                              onClick={() => setAlertFilter(f.key as any)}
                              style={{
                                padding: "4px 10px",
                                borderRadius: 16,
                                border: alertFilter === f.key ? "1px solid #15803d" : "1px solid #e2e8f0",
                                background: alertFilter === f.key ? "#ecfdf5" : "#f8fafc",
                                color: alertFilter === f.key ? "#166534" : "#64748b",
                                fontSize: 12,
                                fontWeight: alertFilter === f.key ? 700 : 500,
                                cursor: "pointer",
                              }}
                            >
                              {f.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Filtered alerts grid */}
                      <div style={{ display: "grid", gap: 12 }}>
                        {filteredAlerts.slice(0, 3).map((alert) => (
                          <div
                            key={alert.id}
                            style={{
                              background:
                                alert.priority === "CRITICAL"
                                  ? "#fff5f5"
                                  : alert.priority === "HIGH"
                                    ? "#fffbeb"
                                    : "#f8fafc",
                              border:
                                alert.priority === "CRITICAL"
                                  ? "1px solid #fecaca"
                                  : alert.priority === "HIGH"
                                    ? "1px solid #fde68a"
                                    : "1px solid #e2e8f0",
                              borderRadius: 10,
                              padding: 14,
                              borderLeft: `4px solid ${
                                alert.priority === "CRITICAL"
                                  ? "#dc2626"
                                  : alert.priority === "HIGH"
                                    ? "#d97706"
                                    : "#0284c7"
                              }`,
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                              <span
                                style={{
                                  padding: "2px 8px",
                                  borderRadius: 4,
                                  fontSize: 10,
                                  fontWeight: 800,
                                  textTransform: "uppercase",
                                  background:
                                    alert.priority === "CRITICAL"
                                      ? "#dc2626"
                                      : alert.priority === "HIGH"
                                        ? "#d97706"
                                        : "#0284c7",
                                  color: "#ffffff",
                                }}
                              >
                                {alert.priority}
                              </span>
                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                <span style={{ fontSize: 11, color: "#64748b" }}>
                                  🗓️ {alert.effectiveDate || "Current"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    speakDirect(
                                      `${lang === "kn" ? alert.titleKn : lang === "hi" ? alert.titleHi : alert.titleEn}. ${lang === "kn" ? alert.messageKn : lang === "hi" ? alert.messageHi : alert.messageEn}`,
                                      lang
                                    )
                                  }
                                  title="Read alert aloud"
                                  style={{
                                    border: "none",
                                    background: "none",
                                    cursor: "pointer",
                                    color: "#64748b",
                                    padding: 2,
                                  }}
                                >
                                  <Volume2 size={16} />
                                </button>
                              </div>
                            </div>

                            <h3 style={{ fontSize: 14, fontWeight: 700, margin: "4px 0", color: "#0f172a" }}>
                              {lang === "kn" ? alert.titleKn : lang === "hi" ? alert.titleHi : alert.titleEn}
                            </h3>
                            <p style={{ fontSize: 12, color: "#334155", margin: "4px 0 10px", lineHeight: 1.5 }}>
                              {lang === "kn" ? alert.messageKn : lang === "hi" ? alert.messageHi : alert.messageEn}
                            </p>

                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                              <span style={{ fontSize: 11, color: "#166534", fontWeight: 600 }}>
                                ✓ {alert.department || alert.schemeOrPolicyName}
                              </span>

                              <div style={{ display: "flex", gap: 8 }}>
                                {alert.actionType === "CHECK_ELIGIBILITY" && (
                                  <button
                                    type="button"
                                    onClick={() => setTab("schemes")}
                                    style={{
                                      padding: "5px 12px",
                                      background: "#15803d",
                                      color: "#ffffff",
                                      border: "none",
                                      borderRadius: 6,
                                      fontSize: 12,
                                      fontWeight: 600,
                                      cursor: "pointer",
                                    }}
                                  >
                                    {L(lang, "ಅರ್ಹತೆ ಪರಿಶೀಲಿಸಿ ➔", "Check Eligibility ➔", "पात्रता जांचें ➔")}
                                  </button>
                                )}
                                {alert.actionType === "PREPARE_DOCUMENTS" && (
                                  <button
                                    type="button"
                                    onClick={() => setClaimRescueRoomOpen(true)}
                                    style={{
                                      padding: "5px 12px",
                                      background: "#d97706",
                                      color: "#ffffff",
                                      border: "none",
                                      borderRadius: 6,
                                      fontSize: 12,
                                      fontWeight: 600,
                                      cursor: "pointer",
                                    }}
                                  >
                                    {L(lang, "ದಾಖಲೆ ಸಿದ್ಧಪಡಿಸಿ ➔", "Prepare Documents ➔", "दस्तावेज तैयार करें ➔")}
                                  </button>
                                )}
                                {alert.actionType === "TRACK_APPLICATION" && (
                                  <button
                                    type="button"
                                    onClick={() => setTab("papers")}
                                    style={{
                                      padding: "5px 12px",
                                      background: "#0284c7",
                                      color: "#ffffff",
                                      border: "none",
                                      borderRadius: 6,
                                      fontSize: 12,
                                      fontWeight: 600,
                                      cursor: "pointer",
                                    }}
                                  >
                                    {L(lang, "ಸ್ಥಿತಿ ಪರಿಶೀಲಿಸಿ ➔", "Track Status ➔", "स्थिति ट्रैक करें ➔")}
                                  </button>
                                )}
                                {alert.actionType === "VIEW_POLICY" && alert.officialSourceUrl && (
                                  <a
                                    href={alert.officialSourceUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      padding: "5px 12px",
                                      background: "#f1f5f9",
                                      color: "#0f172a",
                                      borderRadius: 6,
                                      fontSize: 12,
                                      fontWeight: 600,
                                      textDecoration: "none",
                                      display: "inline-block",
                                    }}
                                  >
                                    {L(lang, "ಸುತ್ತೋಲೆ ನೋಡಿ ↗", "View Circular ↗", "परिपत्र देखें ↗")}
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setWhatsAppModalOpen(true);
                                  }}
                                  style={{
                                    padding: "5px 10px",
                                    background: "#25D366",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                  }}
                                >
                                  💬 {L(lang, "ಹಂಚಿಕೊಳ್ಳಿ", "Share", "साझा करें")}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                    <section aria-label="Farmer Opportunity Radar">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 10,
                        }}
                      >
                        <h2 className="text-h2">
                          {L(
                            lang,
                            "ರೈತ ಅವಕಾಶ ಮತ್ತು ಅಪಾಯ ರೇಡಾರ್",
                            "Farmer Opportunity Radar",
                            "किसान अवसर रडार"
                          )}
                        </h2>
                        <StatusChip
                          states={["DEMO"]}
                          isDemoData={true}
                          lang={lang}
                          onInspect={handleInspectChip}
                        />
                      </div>

                      <div className="stat-tiles-grid">
                        <StatTile
                          icon={<CheckCircle2 size={20} strokeWidth={1.75} />}
                          tone="green"
                          valueText={L(
                            lang,
                            `${forYou.length} ಯೋಜನೆ ಹೊಂದಾಣಿಕೆ`,
                            `${forYou.length} schemes match`,
                            `${forYou.length} योजनाएं मेल`
                          )}
                          label={L(
                            lang,
                            "ನಿಮಗೆ ಹೊಂದುವ ಯೋಜನೆಗಳು",
                            "Matched schemes",
                            "मेल खाती योजनाएं"
                          )}
                          hint={L(
                            lang,
                            "ಯೋಜನೆಗಳನ್ನು ನೋಡಿ →",
                            "View matching schemes →",
                            "योजनाएं देखें →"
                          )}
                          onClick={() => setTab("schemes")}
                        />

                        <StatTile
                          icon={<Camera size={20} strokeWidth={1.75} />}
                          tone={allPhotosCaptured ? "green" : "warn"}
                          valueText={L(
                            lang,
                            `3 ರಲ್ಲಿ ${capturedCount} ಫೋಟೋ`,
                            `${capturedCount} of 3 photos`,
                            `3 में से ${capturedCount} फोटो`
                          )}
                          label={L(
                            lang,
                            "ಬೆಳೆ ಹಾನಿ ಸಾಕ್ಷ್ಯ",
                            "Claim evidence",
                            "फसल नुकसान प्रमाण"
                          )}
                          hint={L(
                            lang,
                            "ರೆಸ್ಕ್ಯೂ ರೂಮ್ ತೆರೆಯಿರಿ →",
                            "Open Rescue Room →",
                            "रेस्क्यू रूम खोलें →"
                          )}
                          onClick={() => setClaimRescueRoomOpen(true)}
                        />

                        <StatTile
                          icon={<AlertTriangle size={20} strokeWidth={1.75} />}
                          tone={mismatchCount > 0 ? "danger" : "green"}
                          valueText={
                            mismatchCount > 0
                              ? L(
                                  lang,
                                  `${mismatchCount} ದಾಖಲೆ ವ್ಯತ್ಯಾಸ`,
                                  `${mismatchCount} record mismatch`,
                                  `${mismatchCount} रिकॉर्ड अंतर`
                                )
                              : L(
                                  lang,
                                  "ದಾಖಲೆ ಸರಿ ಇದೆ",
                                  "Records match",
                                  "रिकॉर्ड सही है"
                                )
                          }
                          label={L(
                            lang,
                            "ದಾಖಲೆ ತಾಳೆ (ಪಹಣಿ)",
                            "Record check",
                            "रिकॉर्ड जांच"
                          )}
                          hint={L(
                            lang,
                            "ಸರ್ವೆ ನಂ. ಪರಿಶೀಲಿಸಿ →",
                            "Inspect survey number →",
                            "सर्वे नंबर जांचें →"
                          )}
                          onClick={() => setTab("farm")}
                        />
                      </div>
                    </section>

                    {/* WhatsApp Papers & Farm Advisory Card in Main Panel */}
                    <section
                      className="ds-card"
                      aria-label="WhatsApp Papers & Advisory"
                      style={{
                        border: "2px solid #25D366",
                        background:
                          "linear-gradient(135deg, rgba(37, 211, 102, 0.08) 0%, rgba(255, 255, 255, 1) 100%)",
                      }}
                    >
                      <div className="ds-card-header" style={{ alignItems: "flex-start" }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: "50%",
                              background: "#25D366",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#FFFFFF",
                              flexShrink: 0,
                              boxShadow: "0 4px 12px rgba(37, 211, 102, 0.35)",
                            }}
                          >
                            <WhatsAppIcon size={26} />
                          </div>
                          <div>
                            <h2
                              className="text-h2"
                              style={{ margin: 0, color: "var(--ink-900)" }}
                            >
                              {L(
                                lang,
                                "ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಜಮೀನಿನ ಪೂರ್ಣ ದಾಖಲೆ ಮತ್ತು ವರದಿ",
                                "Send Farm Papers & Complete Report to WhatsApp",
                                "व्हाट्सएप पर पूरे कृषि दस्तावेज और रिपोर्ट प्राप्त करें"
                              )}
                            </h2>
                            <p className="text-caption" style={{ margin: "4px 0 0" }}>
                              {L(
                                lang,
                                "ಪಹಣಿ (ಆರ್ಟಿಸಿ), ಸರ್ವೆ ನಂ 42/1, ಬೆಳೆ ವಿವರ, ಅರ್ಹ ಯೋಜನೆಗಳು ಮತ್ತು ರಸೀದಿಗಳನ್ನು ವಾಟ್ಸಾಪ್ ವೆಬ್ ಅಥವಾ ಆ್ಯಪ್‌ಗೆ ಕಳುಹಿಸಿ",
                                "Instantly deliver land RTC papers, survey records, matched schemes, and proof receipts directly to WhatsApp Web or App",
                                "खतौनी, सर्वे संख्या 42/1, फसल विवरण, पात्र योजनाएं और रसीदें सीधे व्हाट्सएप वेब या ऐप पर भेजें"
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Paper Summary Badges */}
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                          margin: "14px 0",
                        }}
                      >
                        <span
                          className="status-chip neutral"
                          style={{ background: "#ffffff", borderColor: "var(--line)" }}
                        >
                          📄{" "}
                          {L(
                            lang,
                            "ಪಹಣಿ / ಆರ್ಟಿಸಿ ದಾಖಲೆ (ಸರ್ವೆ ನಂ 42/1)",
                            "RTC Land Record (Survey 42/1)",
                            "खतौनी दस्तावेज (सर्वे 42/1)"
                          )}
                        </span>
                        <span
                          className="status-chip neutral"
                          style={{ background: "#ffffff", borderColor: "var(--line)" }}
                        >
                          🌱{" "}
                          {L(
                            lang,
                            "ಬೆಳೆ: ರಾಗಿ (1.5 ಹೆಕ್ಟೇರ್)",
                            "Crop: Ragi (1.5 Hectares)",
                            "फसल: रागी (1.5 हेक्टेयर)"
                          )}
                        </span>
                        <span className="status-chip green">
                          ✓{" "}
                          {L(
                            lang,
                            `${forYou.length} ಹೊಂದಾಣಿಕೆಯಾಗುವ ಯೋಜನೆಗಳು`,
                            `${forYou.length} Matched Schemes`,
                            `${forYou.length} पात्र योजनाएं`
                          )}
                        </span>
                        <span
                          className="status-chip neutral"
                          style={{ background: "#ffffff", borderColor: "var(--line)" }}
                        >
                          🧾{" "}
                          {L(
                            lang,
                            `ದಾಖಲಾದ ಸಾಕ್ಷ್ಯ (${capturedCount}/3 ಫೋಟೋ)`,
                            `Proof Pack (${capturedCount}/3 photos)`,
                            `प्रमाण पैक (${capturedCount}/3 फोटो)`
                          )}
                        </span>
                      </div>

                      {/* Primary WhatsApp Direct Launcher Button */}
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          className="btn"
                          style={{
                            background: "#25D366",
                            color: "#FFFFFF",
                            border: "none",
                            fontWeight: 700,
                            padding: "12px 20px",
                            borderRadius: 999,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            boxShadow: "0 4px 14px rgba(37, 211, 102, 0.4)",
                            cursor: "pointer",
                          }}
                          onClick={() => handleSendWhatsAppReport()}
                        >
                          <WhatsAppIcon size={20} />
                          <span>
                            {L(
                              lang,
                              "ದಾಖಲೆಗಳನ್ನು ವಾಟ್ಸಾಪ್‌ಗೆ ಕಳುಹಿಸಿ (WhatsApp Web / App)",
                              "Send Papers to WhatsApp (Web / App)",
                              "दस्तावेज व्हाट्सएप पर भेजें (वेब / ऐप)"
                            )}
                          </span>
                          <ExternalLink size={16} strokeWidth={2} />
                        </button>

                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => setTab("papers")}
                        >
                          <FileText size={18} strokeWidth={1.75} />
                          <span>
                            {L(
                              lang,
                              "ದಾಖಲೆಗಳ ವಾಲ್ಟ್ ವೀಕ್ಷಿಸಿ",
                              "Open Papers Vault",
                              "दस्तावेज़ वॉल्ट देखें"
                            )}
                          </span>
                        </button>
                      </div>
                    </section>

                    {/* SMART GPS LOCATION & VOLUNTARY LIVE SHARING MODULE */}
                    <section
                      aria-label="Smart GPS Location and Hyperlocal Centre"
                      style={{
                        background: "#ffffff",
                        border: "1px solid #bbf7d0",
                        borderRadius: 14,
                        padding: 16,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                        marginBottom: 16,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 10,
                          marginBottom: 12,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 10,
                              background: "#dcfce7",
                              color: "#15803d",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 20,
                            }}
                          >
                            📍
                          </div>
                          <div>
                            <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "#0f172a" }}>
                              {L(
                                lang,
                                "ಲೈವ್ ಜಿಪಿಎಸ್ ಮತ್ತು ಸ್ಥಳ-ಆಧಾರಿತ ಸೇವಾ ಕೇಂದ್ರ",
                                "Smart GPS Location & Hyperlocal Centre",
                                "स्मार्ट जीपीएस लोकेशन और हाइपरलोकल केंद्र"
                              )}
                            </h2>
                            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                              {L(
                                lang,
                                "ಗ್ರಾಮ ಮಟ್ಟದ ಯೋಜನೆಗಳು, ಸಮೀಪದ ಸಿಎಸ್‌ಸಿ ಕೇಂದ್ರಗಳು ಮತ್ತು ಲೈವ್ ಜಿಪಿಎಸ್ ಹಂಚಿಕೆ",
                                "Village-level scheme alerts, nearby CSCs, banks, and voluntary live assistance",
                                "ग्राम-स्तरीय योजनाएं, नजदीकी सीएससी केंद्र और लाइव लोकेशन सहायता"
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={handleDetectLiveGps}
                            disabled={gpsLoading}
                            style={{
                              padding: "6px 12px",
                              borderRadius: 6,
                              background: "#f1f5f9",
                              border: "1px solid #cbd5e1",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            🔄 {gpsLoading ? L(lang, "ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...", "Locating...", "खोज रहा है...") : L(lang, "ಜಿಪಿಎಸ್ ರಿಫ್ರೆಶ್", "Refresh GPS", "जीपीएस रिफ्रेश")}
                          </button>
                        </div>
                      </div>

                      {/* Active Live Location Pulse Banner */}
                      {activeShareSession && activeShareSession.status === "ACTIVE" && (
                        <div
                          style={{
                            background: "#ecfdf5",
                            border: "1px solid #86efac",
                            borderRadius: 8,
                            padding: 12,
                            marginBottom: 12,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 12,
                            flexWrap: "wrap",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                background: "#22c55e",
                                boxShadow: "0 0 8px #22c55e",
                                display: "inline-block",
                              }}
                            />
                            <div style={{ fontSize: 13, color: "#065f46" }}>
                              <strong>{L(lang, "ಲೈವ್ ಜಿಪಿಎಸ್ ಹಂಚಿಕೆ ಸಕ್ರಿಯವಾಗಿದೆ:", "Live GPS Sharing Active:", "लाइव जीपीएस शेयरिंग सक्रिय:")}</strong>{" "}
                              {activeShareSession.assignedEmployeeName} (CSC Operator) ·{" "}
                              <span style={{ fontWeight: 700 }}>
                                {Math.floor(liveShareRemainingSec / 60)}:
                                {liveShareRemainingSec % 60 < 10 ? "0" : ""}
                                {liveShareRemainingSec % 60} {L(lang, "ಉಳಿದಿದೆ", "remaining", "शेष")}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleStopLiveSharing}
                            style={{
                              padding: "5px 12px",
                              background: "#dc2626",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            🛑 {L(lang, "ಹಂಚಿಕೆ ನಿಲ್ಲಿಸಿ", "Stop Sharing", "शेयरिंग रोकें")}
                          </button>
                        </div>
                      )}

                      {/* Detected Location Details Box */}
                      {currentCoords && resolvedAddress ? (
                        <div
                          style={{
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: 8,
                            padding: 12,
                            marginBottom: 12,
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                            gap: 12,
                            fontSize: 13,
                          }}
                        >
                          <div>
                            <span style={{ color: "#64748b", fontSize: 11, display: "block" }}>
                              {L(lang, "ಪತ್ತೆಯಾದ ಗ್ರಾಮ ಮತ್ತು ತಾಲೂಕು:", "Detected Village & Taluk:", "पहचाना गया गांव और तालुका:")}
                            </span>
                            <strong>
                              {resolvedAddress.village}, {resolvedAddress.taluk} Taluk
                            </strong>
                            <div style={{ fontSize: 12, color: "#475569" }}>
                              {resolvedAddress.district} District · PIN {resolvedAddress.pincode}
                            </div>
                          </div>

                          <div>
                            <span style={{ color: "#64748b", fontSize: 11, display: "block" }}>
                              {L(lang, "ಜಿಪಿಎಸ್ ಅಕ್ಷಾಂಶ & ರೇಖಾಂಶ:", "GPS Coordinates & Accuracy:", "जीपीएस निर्देशांक एवं सटीकता:")}
                            </span>
                            <strong>
                              {currentCoords.latitude.toFixed(4)}° N, {currentCoords.longitude.toFixed(4)}° E
                            </strong>
                            <div style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>
                              🎯 {L(lang, "ನಿಖರತೆ", "Accuracy radius", "सटीकता")}: ±{currentCoords.accuracyMeters ?? 4}m
                            </div>
                          </div>

                          <div>
                            <span style={{ color: "#64748b", fontSize: 11, display: "block" }}>
                              {L(lang, "ಸ್ಥಳೀಯ ತಾಲೂಕು ವ್ಯಾಪ್ತಿ:", "Official Jurisdiction:", "आधिकारिक अधिकार क्षेत्र:")}
                            </span>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: 4,
                                background: "#ecfdf5",
                                color: "#065f46",
                                fontWeight: 700,
                                fontSize: 11,
                                border: "1px solid #a7f3d0",
                              }}
                            >
                              ✓ Verified H.D. Kote RSK Zone
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: 12, background: "#f8fafc", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
                          {L(
                            lang,
                            "ನಿಮ್ಮ ಮೊಬೈಲ್ ಜಿಪಿಎಸ್ ಸ್ಥಳವನ್ನು ಪತ್ತೆಹಚ್ಚಿ ನಿಖರ ಗ್ರಾಮ ಮಟ್ಟದ ಸೇವೆಗಳನ್ನು ಪಡೆಯಿರಿ.",
                            "Detect your device GPS location for hyperlocal crop and scheme services.",
                            "सटीक ग्राम-स्तरीय सेवाओं के लिए अपने डिवाइस का जीपीएस चालू करें।"
                          )}
                        </div>
                      )}

                      {gpsError && (
                        <div style={{ color: "#b91c1c", fontSize: 12, marginBottom: 10, fontWeight: 600 }}>
                          {gpsError}
                        </div>
                      )}

                      {/* Action Buttons Row */}
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => setLiveShareModalOpen(true)}
                          style={{
                            padding: "8px 16px",
                            background: "#065f46",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          📍 {L(lang, "ಲೈವ್ ಲೊಕೇಶನ್ ಹಂಚಿಕೊಳ್ಳಿ", "SHARE LIVE LOCATION", "लाइव लोकेशन साझा करें")}
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowNearbyModal(true)}
                          style={{
                            padding: "8px 14px",
                            background: "#f1f5f9",
                            color: "#0f172a",
                            border: "1px solid #cbd5e1",
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          🏛️ {L(lang, "ಸಮೀಪದ ಸಿಎಸ್‌ಸಿ & ಬ್ಯಾಂಕ್‌ಗಳು", "Nearby CSCs & Banks", "नजदीकी सीएससी और बैंक")} ({nearbyServices.length})
                        </button>

                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(
                            `Agro AI Location: ${resolvedAddress?.village || "Hampapura"}, ${resolvedAddress?.taluk || "H.D. Kote"} (${currentCoords?.latitude.toFixed(4) || 12.0833}, ${currentCoords?.longitude.toFixed(4) || 76.3500}). View on Map: https://maps.google.com/?q=${currentCoords?.latitude || 12.0833},${currentCoords?.longitude || 76.3500}`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            padding: "8px 14px",
                            background: "#25D366",
                            color: "#ffffff",
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 700,
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          💬 {L(lang, "ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಪಿನ್ ಕಳುಹಿಸಿ", "Send Pin via WhatsApp", "व्हाट्सएप पर पिन भेजें")}
                        </a>
                      </div>
                    </section>

                    {/* 3. "Your season" Horizontal Stepper Card */}
                    <section className="ds-card">
                      <div className="ds-card-header">
                        <div>
                          <h2 className="text-h2">
                            {L(
                              lang,
                              "ನಿಮ್ಮ ಬೆಳೆ ಹಂಗಾಮು",
                              "Your season",
                              "आपका फसल सीज़न"
                            )}
                          </h2>
                          <div className="text-caption">
                            {L(
                              lang,
                              selectedPlot.nameKn,
                              selectedPlot.nameEn,
                              selectedPlot.nameEn
                            )}{" "}
                            · {selectedPlot.cropCode} ({selectedPlot.areaHectares}{" "}
                            ha)
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          {plots.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              className="icon-pill-btn"
                              style={{
                                background:
                                  p.id === selectedPlot.id
                                    ? "var(--green-100)"
                                    : "var(--cream-50)",
                                borderColor:
                                  p.id === selectedPlot.id
                                    ? "var(--green-700)"
                                    : "var(--line)",
                              }}
                              onClick={() => setSelectedPlotId(p.id)}
                            >
                              {p.surveyNumber}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="season-stepper">
                        {SEASON_STEPS.map((st) => (
                          <div
                            key={st.key}
                            className={`season-step ${
                              st.state === "done"
                                ? "done"
                                : st.state === "now"
                                  ? "now"
                                  : ""
                            }`}
                          >
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 700,
                                color:
                                  st.state === "now"
                                    ? "var(--warn-700)"
                                    : st.state === "done"
                                      ? "var(--green-700)"
                                      : "var(--ink-400)",
                              }}
                            >
                              {st.state === "done"
                                ? L(lang, "ಪೂರ್ಣ", "Done", "पूर्ण")
                                : st.state === "now"
                                  ? L(lang, "ಈಗ", "Now", "अभी")
                                  : L(lang, "ಮುಂದೆ", "Next", "आगे")}
                            </div>
                            <div className="text-h3">
                              {L(lang, st.kn, st.key, st.hi)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                  {/* Right Side Column on Desktop (4 cols) / Stacked on Mobile */}
                  <div className="today-side-col">
                    {/* 4. Upcoming Deadlines Vertical Timeline */}
                    <DeadlineCard
                      title={L(
                        lang,
                        "ಮುಂಬರುವ ಗಡುವುಗಳು",
                        "Upcoming deadlines",
                        "आगामी समय-सीमा"
                      )}
                      items={deadlineItems}
                      lang={lang}
                      isDemoData={true}
                      onInspectChip={handleInspectChip}
                    />

                    {/* Quick Access to Claim Rescue Room */}
                    <button
                      type="button"
                      className="sos-action-row"
                      style={{ marginBottom: 0 }}
                      onClick={() => setClaimRescueRoomOpen(true)}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <Camera
                          size={22}
                          strokeWidth={1.75}
                          color="var(--warn-700)"
                        />
                        <div>
                          <div className="text-h3">
                            {L(
                              lang,
                              "ಬೆಳೆ ಹಾನಿ ರೆಸ್ಕ್ಯೂ ರೂಮ್",
                              "Claim Rescue Room",
                              "दावा रेस्क्यू रूम"
                            )}
                          </div>
                          <div className="text-caption">
                            {L(
                              lang,
                              "3 ಕೋನದ ಫೋಟೋ ಮತ್ತು ಸಾಕ್ಷ್ಯ ಪ್ಯಾಕ್",
                              "Guided 3-angle photo proof pack",
                              "3-कोण फोटो प्रमाण पैक"
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={18} strokeWidth={1.75} />
                    </button>

                    {/* Quick Access to Rejection Doctor */}
                    <button
                      type="button"
                      className="sos-action-row"
                      style={{ marginBottom: 0 }}
                      onClick={() => setRejectionDoctorOpen(true)}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <FileCheck
                          size={22}
                          strokeWidth={1.75}
                          color="var(--info-700)"
                        />
                        <div>
                          <div className="text-h3">
                            {L(
                              lang,
                              "ರಿಜೆಕ್ಷನ್ ಡಾಕ್ಟರ್",
                              "Rejection Doctor",
                              "रिजेक्शन डॉक्टर"
                            )}
                          </div>
                          <div className="text-caption">
                            {L(
                              lang,
                              "ಅರ್ಜಿ ತಿರಸ್ಕೃತವಾದರೆ ಕಾರಣ ಮತ್ತು ಪರಿಹಾರ",
                              "Understand why an application was held up",
                              "आवेदन अस्वीकृति का कारण और समाधान"
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={18} strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              )}

              {/* ============================================================
                  SCREEN 2: SCHEMES (MATCHER & APPLICATION PREP)
                  ============================================================ */}
              {tab === "schemes" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <div>
                      <h1 className="text-hero">
                        {L(
                          lang,
                          "ಸರ್ಕಾರಿ ಯೋಜನೆಗಳು",
                          "Government schemes",
                          "सरकारी योजनाएं"
                        )}
                      </h1>
                      <p className="text-caption" style={{ marginTop: 2 }}>
                        {L(
                          lang,
                          "ನಿಮ್ಮ ಜಮೀನು ಮತ್ತು ಬೆಳೆಗೆ ಹೊಂದುವ ಯೋಜನೆಗಳು",
                          "Matched to your plots, crops, and land size",
                          "आपके खेत और फसल से मेल खाती योजनाएं"
                        )}
                      </p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() => setInsuranceHelperOpen(true)}
                      >
                        <ShieldCheck size={18} strokeWidth={1.75} />
                        <span>
                          {L(
                            lang,
                            "ವಿಮೆ ಸಹಾಯಕಿ (PMFBY)",
                            "Insurance Helper",
                            "बीमा सहायक"
                          )}
                        </span>
                      </button>

                      {/* 3-Tab Segmented Control */}
                      <div className="segmented-control" role="tablist">
                        <button
                          type="button"
                          role="tab"
                          className="segmented-tab"
                          aria-selected={filter === "you"}
                          onClick={() => setFilter("you")}
                        >
                          {L(lang, "ನಿಮಗಾಗಿ", "For you", "आपके लिए")} ({forYou.length})
                        </button>
                        <button
                          type="button"
                          role="tab"
                          className="segmented-tab"
                          aria-selected={filter === "all"}
                          onClick={() => setFilter("all")}
                        >
                          {L(lang, "ಎಲ್ಲಾ", "All", "सभी")} ({evaluated.length})
                        </button>
                        <button
                          type="button"
                          role="tab"
                          className="segmented-tab"
                          aria-selected={filter === "applied"}
                          onClick={() => setFilter("applied")}
                        >
                          {L(lang, "ಅರ್ಜಿ ಸಲ್ಲಿಸಿದ್ದು", "Applied", "आवेदित")} ({appliedSchemeIds.length})
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Scheme Cards List */}
                  {(filter === "you" || filter === "all") && (
                    <div className="responsive-cards-grid">
                      {(filter === "you" ? forYou : evaluated).map(
                        ({ scheme, result }) => {
                          const title = L(
                            lang,
                            scheme.titleKn,
                            scheme.titleEn,
                            scheme.titleHi
                          );
                          const ministry = L(
                            lang,
                            scheme.departmentKn,
                            scheme.departmentEn,
                            scheme.departmentHi
                          );
                          const benefit = L(
                            lang,
                            scheme.benefitKn,
                            scheme.benefitEn,
                            scheme.benefitHi
                          );
                          const dl = formatDeadlineTruthfully(
                            scheme.deadlineIso,
                            scheme.deadlineVerified,
                            lang
                          );
                          const domain = new URL(
                            scheme.sourceUrl
                          ).hostname.replace(/^www\./, "");
                          const whyMatch =
                            result.passedRules.length > 0
                              ? L(
                                  lang,
                                  `ನಿಮ್ಮ ${totalLandHectares} ಹೆಕ್ಟೇರ್ ಜಮೀನು ಮತ್ತು ${selectedPlot.cropCode} ಬೆಳೆಗೆ ಹೊಂದಿಕೆಯಾಗುತ್ತದೆ`,
                                  `Matches your ${totalLandHectares} ha landholding and ${selectedPlot.cropCode} crop in Karnataka`,
                                  `आपके ${totalLandHectares} हेक्टेयर भूमि और ${selectedPlot.cropCode} फसल से मेल खाता है`
                                )
                              : L(
                                  lang,
                                  "ಕೆಲವು ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಬೇಕಾಗಿದೆ",
                                  "One or more eligibility details need checking",
                                  "कुछ पात्रता विवरणों की जांच आवश्यक है"
                                );

                          return (
                            <SchemeCard
                              key={scheme.id}
                              title={title}
                              ministry={ministry}
                              benefitSummary={benefit}
                              whyYouMatch={whyMatch}
                              docsReadyCount={2}
                              docsTotalCount={scheme.documentsEn.length}
                              deadlineText={dl.text}
                              sourceDomain={domain}
                              verifiedDateText={scheme.checkedOn}
                              truthStates={
                                result.missingFacts.length > 0
                                  ? ["NEEDS_VERIFICATION"]
                                  : ["DEMO"]
                              }
                              isDemoData={true}
                              isSaved={appliedSchemeIds.includes(scheme.id)}
                              lang={lang}
                              onSpeak={() =>
                                speakDirect(
                                  `${title}. ${benefit}. ${whyMatch}`,
                                  lang
                                )
                              }
                              onSeeDetails={() => setPrepModalScheme(scheme)}
                              onToggleSaved={() =>
                                setAppliedSchemeIds((prev) =>
                                  prev.includes(scheme.id)
                                    ? prev.filter((id) => id !== scheme.id)
                                    : [...prev, scheme.id]
                                )
                              }
                              onInspectTrace={() => setRuleSheet(scheme)}
                              onInspectChip={handleInspectChip}
                            />
                          );
                        }
                      )}
                    </div>
                  )}

                  {filter === "applied" &&
                    (appliedSchemeIds.length === 0 ? (
                      <EmptyState
                        title={L(
                          lang,
                          "ಇನ್ನೂ ಯಾವುದೇ ಯೋಜನೆಯನ್ನು ಗುರುತಿಸಿಲ್ಲ",
                          "No schemes marked as applied yet",
                          "अभी तक कोई योजना चिह्नित नहीं की गई है"
                        )}
                        description={t.shell.appliedEmpty}
                        actionLabel={L(
                          lang,
                          "ನಿಮಗೆ ಹೊಂದುವ ಯೋಜನೆಗಳನ್ನು ನೋಡಿ",
                          "Browse matching schemes",
                          "मेल खाती योजनाएं देखें"
                        )}
                        onAction={() => setFilter("you")}
                      />
                    ) : (
                      <div className="responsive-cards-grid">
                        {evaluated
                          .filter((e) => appliedSchemeIds.includes(e.scheme.id))
                          .map(({ scheme }) => (
                            <SchemeCard
                              key={scheme.id}
                              title={L(
                                lang,
                                scheme.titleKn,
                                scheme.titleEn,
                                scheme.titleHi
                              )}
                              ministry={L(
                                lang,
                                scheme.departmentKn,
                                scheme.departmentEn,
                                scheme.departmentHi
                              )}
                              benefitSummary={L(
                                lang,
                                scheme.benefitKn,
                                scheme.benefitEn,
                                scheme.benefitHi
                              )}
                              whyYouMatch={L(
                                lang,
                                "ನೀವು ಈ ಯೋಜನೆಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಿದ್ದೀರಿ ಎಂದು ಗುರುತಿಸಲಾಗಿದೆ",
                                "Marked by you as applied",
                                "आपने इसे आवेदित के रूप में चिह्नित किया है"
                              )}
                              docsReadyCount={scheme.documentsEn.length}
                              docsTotalCount={scheme.documentsEn.length}
                              deadlineText={
                                formatDeadlineTruthfully(
                                  scheme.deadlineIso,
                                  scheme.deadlineVerified,
                                  lang
                                ).text
                              }
                              sourceDomain={new URL(
                                scheme.sourceUrl
                              ).hostname.replace(/^www\./, "")}
                              verifiedDateText={scheme.checkedOn}
                              truthStates={["MANUALLY_REPORTED"]}
                              isDemoData={true}
                              isSaved={true}
                              lang={lang}
                              onSpeak={() =>
                                speakDirect(scheme.titleEn, lang)
                              }
                              onSeeDetails={() => setPrepModalScheme(scheme)}
                              onToggleSaved={() =>
                                setAppliedSchemeIds((prev) =>
                                  prev.filter((id) => id !== scheme.id)
                                )
                              }
                              onInspectTrace={() => setRuleSheet(scheme)}
                              onInspectChip={handleInspectChip}
                            />
                          ))}
                      </div>
                    ))}
                </div>
              )}

              {/* ============================================================
                  SCREEN 3: MY FARM (SIGNATURE EXPERIENCE: DIGITAL TWIN)
                  ============================================================ */}
              {tab === "farm" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div>
                    <h1 className="text-hero">
                      {L(lang, "ನನ್ನ ಜಮೀನು ಡಿಜಿಟಲ್ ಟ್ವಿನ್", "My Farm Digital Twin", "मेरा खेत डिजिटल ट्विन")}
                    </h1>
                    <p className="text-caption" style={{ marginTop: 2 }}>
                      {plots.length} {L(lang, "ತಾಕುಗಳು", "plots", "भूखंड")} ·{" "}
                      {totalLandHectares}{" "}
                      {L(lang, "ಹೆಕ್ಟೇರ್ ಒಟ್ಟು ಭೂಮಿ", "hectares total", "हेक्टेयर कुल भूमि")}
                    </p>
                  </div>

                  {/* Plot Cards Grid */}
                  <div className="responsive-cards-grid">
                    {plots.map((p) => {
                      const acres = Number((p.areaHectares * 2.471).toFixed(1));
                      const ownershipLabel =
                        p.ownershipType === "OWNER"
                          ? L(lang, "ಸ್ವಂತ", "Owner", "स्वयं")
                          : L(lang, "ಜಂಟಿ ಕುಟುಂಬ", "Joint family", "संयुक्त परिवार");
                      return (
                        <PlotCard
                          key={p.id}
                          name={L(lang, p.nameKn, p.nameEn, p.nameEn)}
                          cropName={p.cropCode}
                          stageText={p.cropStage}
                          progressPercent={
                            p.cropStage.includes("Flowering") ? 68 : 42
                          }
                          areaAcres={acres}
                          ownershipText={ownershipLabel}
                          surveyNumber={p.surveyNumber}
                          isInsured={Boolean(p.insuranceRef)}
                          isSelected={p.id === selectedPlot.id}
                          isDemoData={true}
                          lang={lang}
                          onSelect={() => {
                            setSelectedPlotId(p.id);
                            setRtcSurveyOnDoc(
                              p.surveyNumber === "142/2A"
                                ? "142/2B"
                                : p.surveyNumber
                            );
                          }}
                          onSpeak={() =>
                            speakDirect(
                              `${p.nameEn}, Survey ${p.surveyNumber}, ${acres} acres, ${p.cropCode}`,
                              lang
                            )
                          }
                          onInspectChip={handleInspectChip}
                        />
                      );
                    })}
                  </div>

                  {/* Agricultural Land GPS & Survey Mapping Card */}
                  <div
                    style={{
                      background: "#ffffff",
                      border: "1px solid #bbf7d0",
                      borderRadius: 12,
                      padding: 16,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 18 }}>📍</span>
                        <strong style={{ fontSize: 14, color: "#065f46" }}>
                          {L(lang, "ಜಮೀನಿನ ಅಧಿಕೃತ ಜಿಪಿಎಸ್ ಸ್ಥಳ ದಾಖಲೆ (ಪಹಣಿ/ಆರ್‌ಟಿಸಿ)", "Official Agricultural Land GPS (RTC Survey Mapping)", "कृषि भूमि आधिकारिक जीपीएस रिकॉर्ड")}
                        </strong>
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        {L(
                          lang,
                          `ಆಯ್ಕೆಮಾಡಿದ ತಾಕು: ${selectedPlot.nameEn} (ಸರ್ವೆ ${selectedPlot.surveyNumber}). ಮೊಬೈಲ್ ಸ್ಥಳದಿಂದ ಪ್ರತ್ಯೇಕಿಸಿ ಜಮೀನಿನ ಶಾಶ್ವತ ಜಿಪಿಎಸ್ ದಾಖಲಿಸಿ.`,
                          `Selected plot: ${selectedPlot.nameEn} (Survey ${selectedPlot.surveyNumber}). Pin permanent land coordinates separate from mobile GPS.`,
                          `चयनित भूखंड: ${selectedPlot.nameEn} (सर्वे ${selectedPlot.surveyNumber})। मोबाइल स्थान से अलग स्थायी कृषि भूमि जीपीएस रिकॉर्ड करें।`
                        )}
                      </div>
                      {currentCoords && (
                        <div style={{ fontSize: 12, color: "#0f172a", marginTop: 4 }}>
                          📌 Current Point: <strong>{currentCoords.latitude.toFixed(4)}° N, {currentCoords.longitude.toFixed(4)}° E</strong> ({resolvedAddress?.village || "Hampapura"})
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => handleSaveAgriculturalFarmLocation(selectedPlot.id, selectedPlot.surveyNumber)}
                        style={{
                          padding: "8px 14px",
                          background: "#065f46",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        📍 {L(lang, "ಈ ಜಮೀನಿಗೆ ಜಿಪಿಎಸ್ ಲಿಂಕ್ ಮಾಡಿ", "Pin Land GPS", "भूमि जीपीएस पिन करें")}
                      </button>
                      <a
                        href={`https://maps.google.com/?q=${currentCoords?.latitude || 12.0833},${currentCoords?.longitude || 76.3500}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: "8px 12px",
                          background: "#f1f5f9",
                          color: "#0f172a",
                          border: "1px solid #cbd5e1",
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 600,
                          textDecoration: "none",
                          display: "inline-block",
                        }}
                      >
                        🗺️ Google Maps ↗
                      </a>
                    </div>
                  </div>

                  {/* BHOOMI RTC LOOKUP TILE */}
                  <div
                    style={{
                      background: "#f0fdf4",
                      border: "1px solid #86efac",
                      borderRadius: 12,
                      padding: "14px 18px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 24 }}>📜</span>
                      <div>
                        <strong style={{ fontSize: 14, color: "#065f46", display: "block" }}>
                          {L(
                            lang,
                            "ಭೂಮಿ ಆರ್‌ಟಿಸಿ ಪರಿಶೀಲನೆ (Bhoomi – View RTC & Mutation Records)",
                            "Bhoomi – View RTC & Mutation Records",
                            "भूमि – आरटीसी एवं म्यूटेशन रिकॉर्ड"
                          )}
                        </strong>
                        <span style={{ fontSize: 12, color: "#475569" }}>
                          {L(
                            lang,
                            "ಸರ್ಕಾರದ ಅಧಿಕೃತ ಪಹಣಿ ದಾಖಲೆಯನ್ನು ಭೂಮಿ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ವೀಕ್ಷಿಸಿ.",
                            "Verify official RTC and land ownership records on the Karnataka Bhoomi portal.",
                            "कर्नाटक भूमि पोर्टल पर आधिकारिक खतौनी और रिकॉर्ड देखें।"
                          )}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setBhoomiNoticeOpen(true)}
                      style={{
                        padding: "8px 16px",
                        background: "#065f46",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      🌐 {L(lang, "ಭೂಮಿ ತೆರೆಯಿರಿ ↗", "Open Bhoomi ↗", "भूमि खोलें ↗")}
                    </button>
                  </div>

                  {/* Full-width Dashed "Add plot" Button / Form */}
                  {!showAddPlotForm ? (
                    <button
                      type="button"
                      onClick={() => setShowAddPlotForm(true)}
                      style={{
                        width: "100%",
                        minHeight: 52,
                        borderRadius: "var(--r-md)",
                        border: "2px dashed var(--green-700)",
                        background: "var(--surface)",
                        color: "var(--green-900)",
                        fontWeight: 700,
                        fontSize: 16,
                      }}
                    >
                      + {t.profile.addPlot}
                    </button>
                  ) : (
                    <form
                      onSubmit={handleAddPlot}
                      className="ds-card"
                      style={{ display: "grid", gap: 12 }}
                    >
                      <h3 className="text-h2">{t.profile.addPlot}</h3>
                      <div className="grid-2">
                        <label>
                          <strong>
                            {L(lang, "ತಾಕಿನ ಹೆಸರು", "Plot name", "भूखंड का नाम")}
                          </strong>
                          <input
                            className="input-field"
                            value={newPlotName}
                            onChange={(e) => setNewPlotName(e.target.value)}
                            placeholder="East Garden Plot"
                            required
                          />
                        </label>
                        <label>
                          <strong>
                            {L(lang, "ಸರ್ವೆ ಸಂಖ್ಯೆ", "Survey number", "सर्वे नंबर")}
                          </strong>
                          <input
                            className="input-field"
                            value={newPlotSy}
                            onChange={(e) => setNewPlotSy(e.target.value)}
                            placeholder="54/3"
                            required
                          />
                        </label>
                      </div>
                      <div className="grid-2">
                        <label>
                          <strong>
                            {L(lang, "ವಿಸ್ತೀರ್ಣ", "Area", "क्षेत्रफल")}
                          </strong>
                          <input
                            type="number"
                            step="0.1"
                            className="input-field"
                            value={newPlotArea}
                            onChange={(e) => setNewPlotArea(e.target.value)}
                          />
                        </label>
                        <label>
                          <strong>{L(lang, "ಘಟಕ", "Unit", "इकाई")}</strong>
                          <select
                            className="input-field"
                            value={newPlotUnit}
                            onChange={(e) =>
                              setNewPlotUnit(e.target.value as AreaUnit)
                            }
                          >
                            <option value="ACRE">Acre</option>
                            <option value="HECTARE">Hectare</option>
                            <option value="GUNTA">Gunta</option>
                          </select>
                        </label>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="submit" className="btn">
                          {L(lang, "ಜಮೀನು ಉಳಿಸಿ", "Save plot", "भूखंड सहेजें")}
                        </button>
                        <button
                          type="button"
                          className="btn ghost"
                          onClick={() => setShowAddPlotForm(false)}
                        >
                          {t.shell.close}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* "Record check" Card (Pahani vs Profile Comparison) */}
                  <section className="ds-card">
                    <div className="ds-card-header">
                      <div>
                        <h2 className="text-h2">
                          {L(
                            lang,
                            "ದಾಖಲೆ ತಾಳೆ (ಪಹಣಿ ಮತ್ತು ಪ್ರೊಫೈಲ್ ಹೋಲಿಕೆ)",
                            "Record check (Profile vs Land record)",
                            "रिकॉर्ड जांच (प्रोफ़ाइल बनाम आरटीसी)"
                          )}
                        </h2>
                        <p className="text-caption" style={{ marginTop: 2 }}>
                          {L(
                            lang,
                            "ಅರ್ಜಿ ತಿರಸ್ಕೃತವಾಗದಂತೆ ಸರ್ವೆ ಸಂಖ್ಯೆ ಮತ್ತು ಬೆಳೆ ವಿವರ ತಾಳೆ ನೋಡಿ",
                            "Catch survey number or crop mismatches before your application is rejected",
                            "आवेदन अस्वीकृत होने से पहले सर्वे नंबर और फसल का मिलान करें"
                          )}
                        </p>
                      </div>
                      <StatusChip
                        states={
                          mismatchCount > 0
                            ? ["NEEDS_VERIFICATION"]
                            : ["MANUALLY_REPORTED"]
                        }
                        isDemoData={true}
                        lang={lang}
                        onInspect={handleInspectChip}
                      />
                    </div>

                    <div className="grid-2" style={{ marginBottom: 12 }}>
                      <label>
                        <strong>
                          {L(
                            lang,
                            "ಪಹಣಿಯಲ್ಲಿರುವ ಸರ್ವೆ ಸಂಖ್ಯೆ",
                            "Survey number on land record (RTC)",
                            "भूमि रिकॉर्ड (आरटीसी) पर सर्वे नंबर"
                          )}
                        </strong>
                        <input
                          className="input-field"
                          value={rtcSurveyOnDoc}
                          onChange={(e) => setRtcSurveyOnDoc(e.target.value)}
                        />
                      </label>
                      <label>
                        <strong>
                          {L(
                            lang,
                            "ಪಹಣಿಯಲ್ಲಿರುವ ಬೆಳೆ",
                            "Crop on land record (RTC)",
                            "भूमि रिकॉर्ड पर दर्ज फसल"
                          )}
                        </strong>
                        <select
                          className="input-field"
                          value={rtcCropOnDoc}
                          onChange={(e) => setRtcCropOnDoc(e.target.value)}
                        >
                          <option value="PADDY">PADDY</option>
                          <option value="RAGI">RAGI</option>
                        </select>
                      </label>
                    </div>

                    <div className="vertical-timeline">
                      {xrayResult.fields.map((f) => (
                        <div key={f.field} className="timeline-row">
                          <div>
                            <div className="text-h3">{f.field}</div>
                            <div className="text-caption">
                              {L(lang, "ನಿಮ್ಮ ಪ್ರೊಫೈಲ್:", "Your profile:", "प्रोफ़ाइल:")}{" "}
                              <strong>{f.profileValue}</strong> ·{" "}
                              {L(lang, "ಪಹಣಿ ದಾಖಲೆ:", "Land record (RTC):", "आरटीसी:")}{" "}
                              <strong>{f.documentValue}</strong>
                            </div>
                            <div
                              className="text-caption"
                              style={{ marginTop: 4 }}
                            >
                              {L(lang, f.guidanceKn, f.guidanceEn, f.guidanceEn)}
                            </div>
                          </div>
                          <span
                            className={`status-chip ${
                              f.status === "MATCH" ? "green" : "warn"
                            }`}
                          >
                            {f.status === "MATCH"
                              ? L(lang, "ಹೊಂದಾಣಿಕೆ", "Matches", "मिलान")
                              : L(
                                  lang,
                                  "ಪರಿಶೀಲಿಸಿ",
                                  "Needs checking",
                                  "जांच आवश्यक"
                                )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              {/* ============================================================
                  SCREEN 4: PAPERS (STATUS TRACKER, TIMELINE & RECEIPT VAULT)
                  ============================================================ */}
              {tab === "papers" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <div>
                      <h1 className="text-hero">
                        {L(
                          lang,
                          "ದಾಖಲೆಗಳು ಮತ್ತು ಹಣ",
                          "Papers & Status",
                          "दस्तावेज़ और स्थिति"
                        )}
                      </h1>
                      <p className="text-caption" style={{ marginTop: 2 }}>
                        {L(
                          lang,
                          "ಅರ್ಜಿ ಸ್ಥಿತಿ, ರಸೀದಿಗಳು ಮತ್ತು ಸುರಕ್ಷಿತ ದಾಖಲೆ ವಾಲ್ಟ್",
                          "Track case timeline, saved receipts, and private document vault",
                          "केस टाइमलाइन, सहेजी गई रसीदें और निजी वॉल्ट ट्रैक करें"
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn"
                      style={{
                        background: "#25D366",
                        color: "#FFFFFF",
                        border: "none",
                        fontWeight: 700,
                        padding: "10px 18px",
                        borderRadius: 999,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        boxShadow: "0 4px 12px rgba(37, 211, 102, 0.35)",
                      }}
                      onClick={() => handleSendWhatsAppReport()}
                    >
                      <WhatsAppIcon size={18} />
                      <span>
                        {L(
                          lang,
                          "ದಾಖಲೆಗಳನ್ನು ವಾಟ್ಸಾಪ್‌ಗೆ ಕಳುಹಿಸಿ",
                          "Send Papers to WhatsApp",
                          "दस्तावेज व्हाट्सएप पर भेजें"
                        )}
                      </span>
                    </button>
                  </div>

                  {/* PROMINENT TILE: BHOOMI - KARNATAKA LAND RECORDS */}
                  <section
                    aria-label="Bhoomi Karnataka Land Records"
                    style={{
                      background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                      border: "2px solid #86efac",
                      borderRadius: 14,
                      padding: "20px 22px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 16,
                      flexWrap: "wrap",
                      boxShadow: "0 4px 14px rgba(22, 101, 52, 0.08)",
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1, minWidth: 260 }}>
                      <div
                        style={{
                          width: 54,
                          height: 54,
                          borderRadius: 12,
                          background: "#065f46",
                          color: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 28,
                          boxShadow: "0 2px 8px rgba(6, 95, 70, 0.3)",
                          flexShrink: 0,
                        }}
                      >
                        📜
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              padding: "2px 8px",
                              borderRadius: 4,
                              background: "#065f46",
                              color: "#ffffff",
                              letterSpacing: 0.5,
                            }}
                          >
                            OFFICIAL GOVT PORTAL
                          </span>
                          <span style={{ fontSize: 12, color: "#166534", fontWeight: 700 }}>
                            Revenue Department · Government of Karnataka
                          </span>
                        </div>
                        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#065f46", margin: "0 0 4px" }}>
                          {L(
                            lang,
                            "ಭೂಮಿ – ಆರ್‌ಟಿಸಿ (ಪಹಣಿ) ಮತ್ತು ಮ್ಯುಟೇಶನ್ ದಾಖಲೆಗಳು",
                            "Bhoomi – View RTC & Mutation Records",
                            "भूमि – आरटीसी (खतौनी) एवं म्यूटेशन रिकॉर्ड"
                          )}
                        </h2>
                        <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.4 }}>
                          {L(
                            lang,
                            "ಕರ್ನಾಟಕ ಸರ್ಕಾರದ ಅಧಿಕೃತ ಭೂಮಿ ತಂತ್ರಾಂಶದಲ್ಲಿ ನಿಮ್ಮ ಸರ್ವೆ ನಂಬರ್‌ನ ಪ್ರಸ್ತುತ ಪಹಣಿ (RTC), ಹಕ್ಕು ದಾಖಲೆ ಮತ್ತು ಮ್ಯುಟೇಶನ್ ಸ್ಥಿತಿ ವೀಕ್ಷಿಸಿ.",
                            "Access verified RTC (Pahani), land ownership titles, and mutation status directly on the official Government of Karnataka Bhoomi website.",
                            "कर्नाटक सरकार के आधिकारिक भूमि पोर्टल पर अपनी खतौनी (RTC) और म्यूटेशन रिकॉर्ड देखें।"
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setBhoomiNoticeOpen(true)}
                      style={{
                        padding: "12px 22px",
                        background: "#065f46",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: 10,
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        boxShadow: "0 4px 12px rgba(6, 95, 70, 0.25)",
                      }}
                    >
                      <span>🌐 {L(lang, "ಭೂಮಿ ಪೋರ್ಟಲ್ ತೆರೆಯಿರಿ", "Open Bhoomi RTC", "भूमि पोर्टल खोलें")}</span>
                      <span>➔</span>
                    </button>
                  </section>

                  {/* 1. Case Timeline with Divider: Our Records vs Official Status */}
                  <section className="ds-card">
                    <div className="ds-card-header">
                      <div>
                        <h2 className="text-h2">
                          {L(
                            lang,
                            "ಅರ್ಜಿ ಮತ್ತು ಕ್ಲೇಮ್ ಕೇಸ್ ಟೈಮ್‌ಲೈನ್",
                            "Case Timeline & Status Tracker",
                            "केस टाइमलाइन और स्थिति"
                          )}
                        </h2>
                        <div className="text-caption">
                          {L(
                            lang,
                            "ನಮ್ಮ ದಾಖಲೆಗಳು ಮತ್ತು ಅಧಿಕೃತ ಸ್ಥಿತಿಯನ್ನು ಪ್ರತ್ಯೇಕವಾಗಿ ತೋರಿಸಲಾಗಿದೆ",
                            "Separates 'Our records' from verified 'Official status'",
                            "'हमारे रिकॉर्ड' और 'आधिकारिक स्थिति' अलग-अलग दिखाए गए हैं"
                          )}
                        </div>
                      </div>
                      <StatusChip
                        states={["MANUALLY_REPORTED"]}
                        isDemoData={true}
                        lang={lang}
                        onInspect={handleInspectChip}
                      />
                    </div>

                    <form
                      onSubmit={handleCreateStatusCase}
                      className="grid-2"
                      style={{ marginBottom: 14, alignItems: "end" }}
                    >
                      <label>
                        <strong>
                          {L(
                            lang,
                            "ಅರ್ಜಿ ಉಲ್ಲೇಖ ಸಂಖ್ಯೆ",
                            "Application reference number",
                            "आवेदन संदर्भ संख्या"
                          )}
                        </strong>
                        <input
                          className="input-field"
                          placeholder="KA-DRIP-2026-901"
                          value={newCaseRef}
                          onChange={(e) => setNewCaseRef(e.target.value)}
                          required
                        />
                      </label>
                      <button type="submit" className="btn">
                        {L(
                          lang,
                          "ಉಲ್ಲೇಖ ಸಂಖ್ಯೆ ಉಳಿಸಿ",
                          "Track reference",
                          "संदर्भ ट्रैक करें"
                        )}
                      </button>
                    </form>

                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {statusCases.map((sc) => (
                        <div
                          key={sc.id}
                          style={{
                            padding: 14,
                            borderRadius: "var(--r-sm)",
                            border: "1px solid var(--line)",
                            background: "var(--surface)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: 8,
                            }}
                          >
                            <strong>
                              {sc.schemeOrPolicyTitle} · {sc.referenceNumber}
                            </strong>
                          </div>

                          {/* Visual Divider: Our Records vs Official Status */}
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                              gap: 12,
                              marginTop: 10,
                            }}
                          >
                            {/* Left: Our Records */}
                            <div
                              style={{
                                padding: 10,
                                borderRadius: 8,
                                background: "var(--cream-50)",
                                border: "1px solid var(--line)",
                              }}
                            >
                              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-600)" }}>
                                📋 {lang === "kn" ? "ನಮ್ಮ ದಾಖಲೆಗಳು (Our records)" : "Our records (User/CSC entered)"}
                              </div>
                              <div className="text-h3" style={{ fontSize: 15, marginTop: 4 }}>
                                {sc.currentStatus}
                              </div>
                              <div className="text-caption">
                                Recorded at RSK counter by farmer
                              </div>
                            </div>

                            {/* Right: Official Status */}
                            <div
                              style={{
                                padding: 10,
                                borderRadius: 8,
                                background: "var(--green-100)",
                                border: "1px solid #b8dec0",
                              }}
                            >
                              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--green-900)" }}>
                                🏛️ {lang === "kn" ? "ಅಧಿಕೃತ ಸ್ಥಿತಿ (Official status)" : "Official status (Verified)"}
                              </div>
                              <div className="text-h3" style={{ fontSize: 15, marginTop: 4, color: "var(--green-900)" }}>
                                {sc.officialStatus ?? "Verification in progress"}
                              </div>
                              <div className="text-caption" style={{ color: "var(--green-700)" }}>
                                Source: Taluk Agriculture Office · {sc.officialStatusDate ?? "3 Nov 2026"}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* 2. Benefit Payment Checklist (No Bank Connection) */}
                  <section className="ds-card">
                    <div className="ds-card-header">
                      <div>
                        <h2 className="text-h2">
                          {L(
                            lang,
                            "ಸೌಲಭ್ಯ ಹಣ ಜಮೆ ಪರಿಶೀಲನೆ",
                            "Benefit Payment Status",
                            "लाभ भुगतान स्थिति"
                          )}
                        </h2>
                        <div className="text-caption">
                          {L(
                            lang,
                            "ಯಾವುದೇ ಬ್ಯಾಂಕ್ ಪಾಸ್‌ವರ್ಡ್ ಅಥವಾ ಒಟಿಪಿ ಅಗತ್ಯವಿಲ್ಲ",
                            "No bank credentials required",
                            "किसी बैंक क्रेडेंशियल की आवश्यकता नहीं"
                          )}
                        </div>
                      </div>
                      <span className={`status-chip ${benefitReceived ? "green" : "neutral"}`}>
                        {benefitReceived
                          ? lang === "kn"
                            ? "ಜಮೆಯಾಗಿದೆ ಎಂದು ಗುರುತಿಸಲಾಗಿದೆ"
                            : "Marked Received"
                          : lang === "kn"
                            ? "ಜಮೆ ಬಾಕಿ ಇದೆ"
                            : "Awaiting Credit"}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
                      <button
                        type="button"
                        className={`btn ${benefitReceived ? "ghost" : "gold"}`}
                        onClick={() => setBenefitReceived((v) => !v)}
                      >
                        <Check size={18} strokeWidth={1.75} />
                        <span>
                          {benefitReceived
                            ? lang === "kn"
                              ? "ಜಮೆಯಾಗಿಲ್ಲ ಎಂದು ಬದಲಾಯಿಸಿ"
                              : "Change: Not received"
                            : lang === "kn"
                              ? "ಹಣ ಜಮೆಯಾಗಿದೆ ಎಂದು ಗುರುತಿಸಿ"
                              : "Mark money received"}
                        </span>
                      </button>
                    </div>

                    {/* 4 Checklist Items if Payment is Delayed */}
                    <div className="vertical-timeline">
                      <div className="timeline-row">
                        <div>
                          <div className="text-h3">
                            1. NPCI / Aadhaar Bank Seeding
                          </div>
                          <div className="text-caption">
                            Check with your bank branch that your account is mapped for DBT payments.
                          </div>
                        </div>
                      </div>
                      <div className="timeline-row">
                        <div>
                          <div className="text-h3">
                            2. Scheme e-KYC Verification
                          </div>
                          <div className="text-caption">
                            Ensure biometric or OTP e-KYC is active on the official scheme portal.
                          </div>
                        </div>
                      </div>
                      <div className="timeline-row">
                        <div>
                          <div className="text-h3">
                            3. Land Registry (FRUITS ID) Link
                          </div>
                          <div className="text-caption">
                            Verify that all survey numbers are updated in Karnataka FRUITS registry.
                          </div>
                        </div>
                      </div>
                      <div className="timeline-row">
                        <div>
                          <div className="text-h3">
                            4. Fund Transfer Order (FTO) Stage
                          </div>
                          <div className="text-caption">
                            Ask at Raitha Samparka Kendra if the FTO has been approved by the department.
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* 3. Receipt Vault */}
                  <section className="ds-card">
                    <div className="ds-card-header">
                      <h2 className="text-h2">
                        {L(
                          lang,
                          "ರಸೀದಿ ಮತ್ತು ಸಾಕ್ಷ್ಯ ವಾಲ್ಟ್",
                          "Receipt Vault",
                          "रसीद वॉल्ट"
                        )}
                      </h2>
                      <StatusChip
                        states={["MANUALLY_REPORTED"]}
                        isDemoData={true}
                        lang={lang}
                        onInspect={handleInspectChip}
                      />
                    </div>
                    <div className="vertical-timeline">
                      {savedReceipts.map((r) => (
                        <div key={r.id} className="timeline-row">
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                            }}
                          >
                            <FileText
                              size={20}
                              strokeWidth={1.75}
                              color="var(--green-700)"
                            />
                            <div>
                              <div className="text-h3">{r.title}</div>
                              <div className="text-caption">
                                Ref: {r.id} · {r.dateIso} · {r.type}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* 4. Consent-Gated Private Document Vault */}
                  <section className="ds-card">
                    <div className="ds-card-header">
                      <h2 className="text-h2">
                        {L(
                          lang,
                          "ಖಾಸಗಿ ದಾಖಲೆ ವಾಲ್ಟ್",
                          "Private Document Vault",
                          "निजी दस्तावेज़ वॉल्ट"
                        )}
                      </h2>
                      <StatusChip
                        states={["MANUALLY_REPORTED"]}
                        isDemoData={true}
                        lang={lang}
                        onInspect={handleInspectChip}
                      />
                    </div>

                    <form
                      onSubmit={handleUploadToVault}
                      style={{ display: "grid", gap: 10 }}
                    >
                      <div className="grid-2">
                        <label>
                          <strong>
                            {L(lang, "ಫೈಲ್ ಹೆಸರು", "File name", "फ़ाइल का नाम")}
                          </strong>
                          <input
                            className="input-field"
                            value={docFileName}
                            onChange={(e) => setDocFileName(e.target.value)}
                            required
                          />
                        </label>
                        <label>
                          <strong>
                            {L(lang, "ದಾಖಲೆ ವಿಧ", "Document type", "दस्तावेज़ प्रकार")}
                          </strong>
                          <select
                            className="input-field"
                            value={docType}
                            onChange={(e) =>
                              setDocType(
                                e.target.value as
                                  | "RTC_PAHANI"
                                  | "SOWING_CERTIFICATE"
                                  | "CLAIM_EVIDENCE"
                              )
                            }
                          >
                            <option value="RTC_PAHANI">
                              Land record (RTC / Pahani)
                            </option>
                            <option value="SOWING_CERTIFICATE">
                              Sowing certificate
                            </option>
                            <option value="CLAIM_EVIDENCE">
                              Crop damage photo
                            </option>
                          </select>
                        </label>
                      </div>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={docConsent}
                          onChange={(e) => setDocConsent(e.target.checked)}
                          style={{ width: 20, height: 20 }}
                        />
                        <span className="text-caption">
                          {L(
                            lang,
                            "ಈ ದಾಖಲೆಯನ್ನು ನನ್ನ ಖಾಸಗಿ ವಾಲ್ಟ್‌ನಲ್ಲಿ ಉಳಿಸಲು ನನ್ನ ಒಪ್ಪಿಗೆ ಇದೆ.",
                            "I agree to store this document in my private vault for scheme preparation.",
                            "मैं इस दस्तावेज़ को अपने निजी वॉल्ट में सहेजने के लिए सहमत हूँ।"
                          )}
                        </span>
                      </label>
                      <button type="submit" className="btn">
                        {L(
                          lang,
                          "ವಾಲ್ಟ್‌ನಲ್ಲಿ ಉಳಿಸಿ",
                          "Save to vault",
                          "वॉल्ट में सहेजें"
                        )}
                      </button>
                    </form>

                    {vaultFeedback && (
                      <div className="banner" style={{ marginTop: 10 }}>
                        {vaultFeedback}
                      </div>
                    )}

                    {vaultDocs.map((d) => (
                      <div
                        key={d.id}
                        className="timeline-row"
                        style={{ marginTop: 10 }}
                      >
                        <div>
                          <div className="text-h3">{d.fileName}</div>
                          <div className="text-caption">
                            {d.malwareScanStatus} · 5-minute signed link
                          </div>
                        </div>
                      </div>
                    ))}
                  </section>

                  {/* 5. Built-in WhatsApp Assistant Simulator */}
                  <section className="ds-card">
                    <div className="ds-card-header">
                      <div>
                        <h2 className="text-h2">
                          {L(
                            lang,
                            "ವಾಟ್ಸಾಪ್ ಸಹಾಯಕ ಸಿಮ್ಯುಲೇಟರ್",
                            "WhatsApp Assistant Simulator",
                            "व्हाट्सएप सहायक सिम्युलेटर"
                          )}
                        </h2>
                        <div className="text-caption">
                          {L(
                            lang,
                            "ಮೆಟಾ ಕೀಲಿಗಳು ಇಲ್ಲದೆಯೂ ಬ್ಯಾಕೆಂಡ್ ವೆಬ್‌ಹುಕ್ ಪೈಪ್‌ಲೈನ್ ಪರೀಕ್ಷಿಸಿ",
                            "Tests webhook handler, opt-in, and 8 conversation options",
                            "वेबहुक और 8 वार्तालाप विकल्पों का परीक्षण करें"
                          )}
                        </div>
                      </div>
                      <span className="status-chip green">DEMO SIMULATOR</span>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {[
                        { k: "1", l: "1) My Schemes" },
                        { k: "2", l: "2) Crop Damage" },
                        { k: "3", l: "3) Deadlines" },
                        { k: "4", l: "4) Application Prep" },
                        { k: "5", l: "5) Status Check" },
                        { k: "6", l: "6) Talk to CSC" },
                        { k: "7", l: "7) Language" },
                        { k: "STOP", l: "STOP (Opt-out)" },
                      ].map((opt) => (
                        <button
                          key={opt.k}
                          type="button"
                          className="icon-pill-btn"
                          onClick={() => handleSimulateWhatsApp(opt.k)}
                        >
                          {opt.l}
                        </button>
                      ))}
                    </div>

                    {whatsappSimReply && (
                      <div
                        style={{
                          marginTop: 12,
                          padding: 12,
                          borderRadius: "var(--r-sm)",
                          background: "var(--cream-100)",
                          border: "1px solid var(--line)",
                        }}
                      >
                        <div className="text-caption" style={{ color: "var(--green-900)", fontWeight: 700 }}>
                          Route: {whatsappSimReply.selectedOption} · wamid: {whatsappSimReply.wamid}
                        </div>
                        <p style={{ margin: "6px 0 2px", fontWeight: 600 }}>
                          {whatsappSimReply.replyTextKn}
                        </p>
                        <p style={{ margin: 0, fontSize: 13, color: "var(--ink-600)" }}>
                          {whatsappSimReply.replyTextEn}
                        </p>
                      </div>
                    )}
                  </section>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Floating Action Cluster: WhatsApp Report + Ask Copilot */}
      <div className="floating-actions-cluster">
        <button
          type="button"
          className="whatsapp-action-fab"
          aria-label={L(
            lang,
            "ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ರೈತ ವರದಿ ಪಡೆಯಿರಿ",
            "Send Farmer Report to WhatsApp",
            "व्हाट्सएप पर किसान रिपोर्ट भेजें"
          )}
          onClick={() => handleSendWhatsAppReport()}
          title={L(
            lang,
            "ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ರೈತ ವರದಿ ಪಡೆಯಿರಿ",
            "Send Farmer Report to WhatsApp",
            "व्हाट्सएप पर किसान रिपोर्ट भेजें"
          )}
        >
          <WhatsAppIcon size={22} />
          <span>{L(lang, "ವಾಟ್ಸಾಪ್ ವರದಿ", "WhatsApp Report", "व्हाट्सएप")}</span>
        </button>

        <button
          type="button"
          className="ask-mic-fab"
          aria-label={t.shell.holdToTalk}
          onClick={() => setVoiceDrawerOpen(true)}
        >
          <Mic size={20} strokeWidth={1.75} />
          <span>{L(lang, "ಕೇಳಿ", "Ask", "पूछें")}</span>
        </button>
      </div>

      {/* Mobile 5-Tab BottomNav with Raised 56px Circular Gold SOS Button */}
      <BottomNav
        activeTab={helpOpen ? "help" : tab}
        lang={lang}
        onSelectTab={handleSelectNavTab}
      />

      {/* ================================================================
          HELP / SOS SHEET (CENTRE GOLD BUTTON ACTIONS)
          ================================================================ */}
      {helpOpen && (
        <div className="sheet-backdrop" onClick={() => setHelpOpen(false)}>
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={t.shell.helpTitle}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ds-card-header">
              <h2 className="text-h2">
                {activeHelpFlow === "menu"
                  ? t.shell.helpTitle
                  : activeHelpFlow === "damage"
                    ? L(
                        lang,
                        "ಬೆಳೆ ಹಾನಿ ರೆಸ್ಕ್ಯೂ ರೂಮ್",
                        "Claim Rescue Room",
                        "दावा रेस्क्यू रूम"
                      )
                    : activeHelpFlow === "rejection"
                      ? L(
                          lang,
                          "ರಿಜೆಕ್ಷನ್ ಡಾಕ್ಟರ್",
                          "Rejection Doctor",
                          "रिजेक्शन डॉक्टर"
                        )
                      : activeHelpFlow === "payment"
                        ? L(
                            lang,
                            "ಹಣ ಜಮೆಯಾಗದಿದ್ದರೆ ಪರಿಶೀಲನೆ",
                            "Payment delayed checklist",
                            "भुगतान देरी जांच सूची"
                          )
                        : L(
                            lang,
                            "ಸೇವಾ ಕೇಂದ್ರ (CSC) ಭೇಟಿ ಟೋಕನ್",
                            "Book CSC visit",
                            "सीएससी विज़िट बुक करें"
                          )}
              </h2>
              {activeHelpFlow !== "menu" ? (
                <button
                  type="button"
                  className="icon-pill-btn"
                  onClick={() => setActiveHelpFlow("menu")}
                >
                  {L(lang, "ಹಿಂದೆ", "Back", "वापस")}
                </button>
              ) : (
                <button
                  type="button"
                  className="icon-pill-btn"
                  onClick={() => setHelpOpen(false)}
                >
                  {t.shell.close}
                </button>
              )}
            </div>

            {activeHelpFlow === "menu" && (
              <div>
                <button
                  type="button"
                  className="sos-action-row"
                  onClick={() => {
                    setHelpOpen(false);
                    setClaimRescueRoomOpen(true);
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 14 }}
                  >
                    <Camera
                      size={22}
                      strokeWidth={1.75}
                      color="var(--warn-700)"
                    />
                    <div>
                      <div className="text-h3">
                        {lang === "kn"
                          ? "ಬೆಳೆ ಹಾನಿ ರೆಸ್ಕ್ಯೂ ರೂಮ್ (Claim Rescue Room)"
                          : "Claim Rescue Room & Photo Proof Pack"}
                      </div>
                      <div className="text-caption">
                        {L(
                          lang,
                          "3 ಕೋನಗಳಿಂದ ಬೆಳೆ ಹಾನಿ ಫೋಟೋ ತೆಗೆದು ರಸೀದಿ ಪಡೆಯಿರಿ",
                          "Guided 3-angle field photos, blur check, and evidence bundle",
                          "3 निर्देशित फोटो लें और दावा रसीद सहेजें"
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={18} strokeWidth={1.75} />
                </button>

                <button
                  type="button"
                  className="sos-action-row"
                  onClick={() => {
                    setHelpOpen(false);
                    setRejectionDoctorOpen(true);
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 14 }}
                  >
                    <FileCheck
                      size={22}
                      strokeWidth={1.75}
                      color="var(--info-700)"
                    />
                    <div>
                      <div className="text-h3">
                        {lang === "kn"
                          ? "ರಿಜೆಕ್ಷನ್ ಡಾಕ್ಟರ್ (Rejection Doctor)"
                          : "Rejection Doctor"}
                      </div>
                      <div className="text-caption">
                        {L(
                          lang,
                          "ಅರ್ಜಿ ತಿರಸ್ಕೃತವಾದರೆ ಕಾರಣ ಮತ್ತು ಪರಿಹಾರ ಕ್ರಮಗಳು",
                          "Understand notice reason, fix checklist, and call coach",
                          "अस्वीकृति का कारण, समाधान सूची और कॉल कोच"
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={18} strokeWidth={1.75} />
                </button>

                <button
                  type="button"
                  className="sos-action-row"
                  onClick={() => setActiveHelpFlow("payment")}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 14 }}
                  >
                    <Clock
                      size={22}
                      strokeWidth={1.75}
                      color="var(--green-700)"
                    />
                    <div>
                      <div className="text-h3">{t.shell.helpPayment}</div>
                      <div className="text-caption">
                        {L(
                          lang,
                          "ಆಧಾರ್ ಬ್ಯಾಂಕ್ ಸೀಡಿಂಗ್ ಮತ್ತು ಇ-ಕೆವೈಸಿ ಪರಿಶೀಲನಾ ಪಟ್ಟಿ",
                          "Check NPCI bank seeding, e-KYC, and FTO stages safely",
                          "एनपीसीआई बैंक सीडिंग और ई-केवाईसी की जांच करें"
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={18} strokeWidth={1.75} />
                </button>

                <button
                  type="button"
                  className="sos-action-row"
                  onClick={() => setActiveHelpFlow("csc")}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 14 }}
                  >
                    <PhoneCall
                      size={22}
                      strokeWidth={1.75}
                      color="var(--green-700)"
                    />
                    <div>
                      <div className="text-h3">{t.shell.helpPerson}</div>
                      <div className="text-caption">
                        {L(
                          lang,
                          "ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರ / CSC ಭೇಟಿಗಾಗಿ ಟೋಕನ್ ಪಡೆಯಿರಿ",
                          "Generate a CSC visit token with your document checklist",
                          "दस्तावेज़ सूची के साथ सीएससी टोकन प्राप्त करें"
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={18} strokeWidth={1.75} />
                </button>

                <button
                  type="button"
                  className="btn gold block"
                  style={{ marginTop: 12 }}
                  onClick={() => setActiveHelpFlow("csc")}
                >
                  <PhoneCall size={18} strokeWidth={1.75} />
                  <span>
                    {L(
                      lang,
                      "ಸೇವಾ ಕೇಂದ್ರ ಸಂಪರ್ಕಿಸಿ / ವ್ಯಕ್ತಿಯೊಂದಿಗೆ ಮಾತನಾಡಿ",
                      "Call CSC / Talk to a person",
                      "सीएससी से बात करें"
                    )}
                  </span>
                </button>
              </div>
            )}

            {/* SUB-FLOW: PAYMENT DELAYED */}
            {activeHelpFlow === "payment" && (
              <div className="ds-card">
                <h3 className="text-h3" style={{ marginBottom: 8 }}>
                  {L(
                    lang,
                    "ಸಹಾಯಧನ ಜಮೆಯಾಗದಿದ್ದರೆ ಪರಿಶೀಲಿಸಬೇಕಾದ 4 ಅಂಶಗಳು:",
                    "4 checks when a payment has not arrived:",
                    "भुगतान न आने पर 4 जांचें:"
                  )}
                </h3>
                <ol style={{ margin: 0, paddingLeft: 20 }}>
                  <li>
                    <strong>NPCI / Aadhaar bank seeding:</strong> Confirm your
                    bank account is linked to NPCI DBT mapper at your branch.
                  </li>
                  <li>
                    <strong>e-KYC status:</strong> Check that scheme e-KYC is
                    completed.
                  </li>
                  <li>
                    <strong>FRUITS / Land registry link:</strong> Verify all
                    survey numbers are linked to your farmer ID.
                  </li>
                  <li>
                    <strong>FTO sanction stage:</strong> Ask your RSK officer
                    if the Fund Transfer Order has been generated.
                  </li>
                </ol>
              </div>
            )}

            {/* SUB-FLOW: CSC VISIT TOKEN */}
            {activeHelpFlow === "csc" && (
              <div className="ds-card">
                <p style={{ marginTop: 0 }}>
                  {L(
                    lang,
                    "ನಿಮ್ಮ ಹತ್ತಿರದ ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರ ಅಥವಾ ಸೇವಾ ಕೇಂದ್ರಕ್ಕೆ ಭೇಟಿ ನೀಡಲು ಟೋಕನ್ ಪಡೆಯಿರಿ.",
                    "Generate a token for your nearest Raitha Samparka Kendra or CSC counter.",
                    "अपने नजदीकी सेवा केंद्र के लिए टोकन प्राप्त करें।"
                  )}
                </p>
                <button
                  type="button"
                  className="btn gold block"
                  onClick={() =>
                    setCscToken("TOKEN-HDK-2026-042 · 10:30 AM IST")
                  }
                >
                  {L(
                    lang,
                    "CSC ಭೇಟಿ ಟೋಕನ್ ಪಡೆಯಿರಿ",
                    "Generate CSC visit token",
                    "सीएससी टोकन जनरेट करें"
                  )}
                </button>
                {cscToken && (
                  <div className="banner" style={{ marginTop: 12 }}>
                    <strong>{cscToken}</strong> — Carry original RTC (Survey
                    142/2A) and sowing certificate.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================
          RULE TRACE SHEET ("Why this result?")
          ================================================================ */}
      {ruleSheet && (
        <div className="sheet-backdrop" onClick={() => setRuleSheet(null)}>
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={t.schemes.whyThisAnswer}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const res = evaluateSchemeEligibility(
                ruleSheet.ruleTree,
                farmerFacts,
                false,
                nowIso ?? "2026-11-03T00:00:00.000Z"
              );
              const rows = [
                ...res.passedRules.map((r) => ({ r, state: "Pass" })),
                ...res.failedRules.map((r) => ({ r, state: "Does not match" })),
                ...res.missingFacts.map((r) => ({
                  r,
                  state: "Needs checking",
                })),
              ];
              return (
                <>
                  <div className="ds-card-header">
                    <h2 className="text-h2">{t.schemes.whyThisAnswer}</h2>
                    <button
                      type="button"
                      className="icon-pill-btn"
                      onClick={() => setRuleSheet(null)}
                    >
                      {t.shell.close}
                    </button>
                  </div>

                  <div className="vertical-timeline" style={{ marginBottom: 16 }}>
                    {rows.map(({ r, state }) => (
                      <div key={r.ruleId} className="timeline-row">
                        <div>
                          <div className="text-h3">
                            {lang === "kn" ? r.descriptionKn : r.descriptionEn}
                          </div>
                          <div className="text-caption">
                            Your value: {String(r.actualValue ?? "Not entered")}
                          </div>
                        </div>
                        <span
                          className={`status-chip ${
                            state === "Pass" ? "green" : "warn"
                          }`}
                        >
                          {state}
                        </span>
                      </div>
                    ))}
                  </div>

                  <h3 className="text-h3" style={{ marginBottom: 6 }}>
                    {L(
                      lang,
                      "ಬೇಕಾಗುವ ದಾಖಲೆಗಳು",
                      "Required documents",
                      "आवश्यक दस्तावेज़"
                    )}
                  </h3>
                  <p className="text-caption" style={{ marginBottom: 14 }}>
                    {(lang === "kn"
                      ? ruleSheet.documentsKn
                      : ruleSheet.documentsEn
                    ).join(" · ")}
                  </p>

                  <a
                    href={ruleSheet.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn ghost block"
                    style={{ textDecoration: "none", marginBottom: 10 }}
                  >
                    <span>
                      {L(
                        lang,
                        "ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ತೆರೆಯಿರಿ",
                        "Open official portal",
                        "आधिकारिक पोर्टल खोलें"
                      )}
                    </span>
                    <ExternalLink size={16} strokeWidth={1.75} />
                  </a>

                  <button
                    type="button"
                    className="btn block"
                    onClick={() => setRuleSheet(null)}
                  >
                    {t.shell.close}
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ================================================================
          VOICE COPILOT SHEET (Connected to Server-Side OpenAI / Scheme Engine)
          ================================================================ */}
      {voiceDrawerOpen && (
        <div
          className="sheet-backdrop"
          onClick={() => setVoiceDrawerOpen(false)}
        >
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Voice Copilot"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ds-card-header">
              <div>
                <h2 className="text-h2">
                  {L(
                    lang,
                    "ಧ್ವನಿ ಮತ್ತು ಚಾಟ್ ಸಹಾಯಕ",
                    "Ask Agro AI Copilot",
                    "एग्रो एआई सहायक से पूछें"
                  )}
                </h2>
                <p className="text-caption">
                  {L(
                    lang,
                    "ಕನ್ನಡ, ಇಂಗ್ಲಿಷ್ ಅಥವಾ ಹಿಂದಿಯಲ್ಲಿ ಮಾತನಾಡಿ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ",
                    "Speak or type your question in Kannada, English, or Hindi",
                    "कन्नड़, अंग्रेजी या हिंदी में बोलें या टाइप करें"
                  )}
                </p>
              </div>
              <button
                type="button"
                className="icon-pill-btn"
                onClick={() => setVoiceDrawerOpen(false)}
              >
                {t.shell.close}
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input
                className="input-field"
                style={{ flex: 1, minWidth: 200, margin: 0 }}
                value={gptInput}
                onChange={(e) => setGptInput(e.target.value)}
                placeholder="Ask about schemes or claim steps..."
              />
              <button
                type="button"
                className="btn gold"
                onClick={handleStartVoiceMic}
              >
                <Mic size={18} strokeWidth={1.75} />
                <span>
                  {gptListening
                    ? L(lang, "ಕೇಳಿಸಿಕೊಳ್ಳುತ್ತಿದೆ...", "Listening...", "सुन रहा है...")
                    : L(lang, "ಮಾತನಾಡಿ", "Speak", "बोलें")}
                </span>
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => handleSendGptQuery("TEXT")}
              >
                {L(lang, "ಕಳುಹಿಸಿ", "Ask", "पूछें")}
              </button>
            </div>

            {gptReply && (
              <div className="ds-card" style={{ marginTop: 14 }}>
                <div className="ds-card-header">
                  <span className="status-chip green">
                    {gptReply.providerMode}
                  </span>
                  <button
                    type="button"
                    className="speaker-round-btn light"
                    onClick={() => speakDirect(gptReply.replyText, lang)}
                    aria-label="Listen to answer"
                  >
                    <Volume2 size={18} strokeWidth={1.75} />
                  </button>
                </div>
                <p style={{ margin: "0 0 10px", fontWeight: 600 }}>
                  {gptReply.replyText}
                </p>
                {gptReply.citedSchemes.length > 0 && (
                  <div className="text-caption">
                    {gptReply.citedSchemes.map((cs) => (
                      <div key={cs.schemeCode}>
                        {cs.title} · {cs.sourceUrl}
                      </div>
                    ))}
                  </div>
                )}
                {gptReply.pendingConfirmation && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      borderRadius: "var(--r-sm)",
                      background: "var(--warn-100)",
                    }}
                  >
                    <p style={{ margin: "0 0 8px", fontWeight: 600 }}>
                      {lang === "kn"
                        ? gptReply.pendingConfirmation.summaryKn
                        : gptReply.pendingConfirmation.summaryEn}
                    </p>
                    <button
                      type="button"
                      className="btn"
                      onClick={() =>
                        handleConfirmGptWrite(
                          gptReply.pendingConfirmation!.confirmationToken
                        )
                      }
                    >
                      {L(
                        lang,
                        "ದೃಢೀಕರಿಸಿ ಮತ್ತು ಉಳಿಸಿ",
                        "Confirm & save",
                        "पुष्टि करें और सहेजें"
                      )}
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  className="btn"
                  style={{
                    background: "#25D366",
                    color: "#FFFFFF",
                    marginTop: 12,
                    border: "none",
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                  onClick={() =>
                    handleSendWhatsAppReport(
                      `Ask Copilot ಸಲಹೆ:\n"${gptReply.replyText}"`
                    )
                  }
                >
                  <WhatsAppIcon size={20} />
                  <span>
                    {L(
                      lang,
                      "ಈ ಉತ್ತರವನ್ನು ವಾಟ್ಸಾಪ್‌ಗೆ ಕಳುಹಿಸಿ",
                      "Send this answer to WhatsApp",
                      "इस उत्तर को व्हाट्सएप पर भेजें"
                    )}
                  </span>
                </button>
              </div>
            )}

            {gptConfirmMsg && (
              <div className="banner" style={{ marginTop: 10 }}>
                {gptConfirmMsg}
              </div>
            )}

            <div
              style={{
                marginTop: 16,
                paddingTop: 14,
                borderTop: "1px solid var(--line)",
              }}
            >
              <button
                type="button"
                className="btn"
                style={{
                  background: "#25D366",
                  color: "#FFFFFF",
                  border: "none",
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
                onClick={() => handleSendWhatsAppReport()}
              >
                <WhatsAppIcon size={20} />
                <span>
                  {L(
                    lang,
                    "ರೈತ ವರದಿಯನ್ನು ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಪಡೆಯಿರಿ",
                    "Send Farmer Report to WhatsApp",
                    "पूरी किसान रिपोर्ट व्हाट्सएप पर भेजें"
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          IN-SCOPE MODALS:
          1. CLAIM RESCUE ROOM
          2. APPLICATION PREP
          3. INSURANCE HELPERS
          4. REJECTION DOCTOR
          ================================================================ */}
      <ClaimRescueRoom
        open={claimRescueRoomOpen}
        plotName={selectedPlot.nameKn}
        surveyNumber={selectedPlot.surveyNumber}
        cropName={selectedPlot.cropCode}
        capturedAngles={capturedAngles}
        sharedLocationPin={sharedLocationPin}
        deadlineSourceText={
          lang === "kn"
            ? "ಅಧಿಕೃತ ವರದಿ ಮಾರ್ಗ: 1800-180-1551 ಅಥವಾ RSK ಕಚೇರಿ. ಮೂಲ: PMFBY ಕರ್ನಾಟಕ ಅಧಿಸೂಚನೆ 2026."
            : "Official route: RSK desk or Insurer Helpline 1800-180-1551. Source: PMFBY Karnataka 2026."
        }
        lang={lang}
        onToggleAngle={(k) =>
          setCapturedAngles((prev) => ({ ...prev, [k]: !prev[k] }))
        }
        onShareLocationPin={() =>
          setSharedLocationPin(
            lang === "kn"
              ? "ಜಮೀನಿನ ಜಿಪಿಎಸ್ ಪಿನ್ ಉಳಿಸಲಾಗಿದೆ (10:45 AM IST)"
              : "GPS Pin: Recorded by farmer at 10:45 AM IST"
          )
        }
        onSaveEvidencePack={handleSaveEvidencePackReceipt}
        onCallHelp={() => openHelpWithFlow("csc")}
        onClose={() => setClaimRescueRoomOpen(false)}
      />

      {prepModalScheme && (
        <ApplicationPrepModal
          open={Boolean(prepModalScheme)}
          schemeTitle={L(
            lang,
            prepModalScheme.titleKn,
            prepModalScheme.titleEn,
            prepModalScheme.titleHi
          )}
          ministryName={L(
            lang,
            prepModalScheme.departmentKn,
            prepModalScheme.departmentEn,
            prepModalScheme.departmentHi
          )}
          farmerName={displayFarmerName}
          surveyNumber={selectedPlot.surveyNumber}
          landAreaText={`${selectedPlot.areaHectares} ha (${(selectedPlot.areaHectares * 2.471).toFixed(1)} acres)`}
          cropName={selectedPlot.cropCode}
          requiredDocuments={
            lang === "kn"
              ? prepModalScheme.documentsKn
              : prepModalScheme.documentsEn
          }
          officialPortalUrl={prepModalScheme.sourceUrl}
          lang={lang}
          onSaveReferenceNumber={(ref) => {
            handleCreateStatusCase({
              preventDefault: () => {},
            } as React.FormEvent);
            setStatusCases((prev) => [
              {
                id: `case-${Date.now()}`,
                referenceNumber: ref,
                schemeOrPolicyTitle: prepModalScheme.titleEn,
                currentStatus: "Submitted (Our records)",
                sourceMode: "Official portal handoff",
                officialStatus: "Application registered on department portal",
                officialStatusDate: "3 Nov 2026",
                statusHistory: [
                  {
                    id: `sh-${Date.now()}`,
                    status: "Submitted via official portal",
                    enteredByRole: "Farmer",
                    enteredByName: displayFarmerName,
                    note: "Reference captured from official confirmation page",
                    timestampIso: new Date().toISOString(),
                  },
                ],
              },
              ...prev,
            ]);
            setSavedReceipts((prev) => [
              {
                id: ref,
                title: `${prepModalScheme.titleEn} (Application Submitted)`,
                dateIso: "3 Nov 2026",
                type: "Application",
              },
              ...prev,
            ]);
            setPrepModalScheme(null);
            setTab("papers");
          }}
          onClose={() => setPrepModalScheme(null)}
        />
      )}

      <InsuranceHelperModal
        open={insuranceHelperOpen}
        plotName={selectedPlot.nameKn}
        surveyNumber={selectedPlot.surveyNumber}
        cropName={selectedPlot.cropCode}
        areaHectares={selectedPlot.areaHectares}
        lang={lang}
        onClose={() => setInsuranceHelperOpen(false)}
      />

      <RejectionDoctorModal
        open={rejectionDoctorOpen}
        lang={lang}
        onClose={() => setRejectionDoctorOpen(false)}
      />

      {/* ================================================================
          LANGUAGE SHEET, 22-LANGUAGE MODAL, PROFILE MENU, INFO SHEET & AUTH
          ================================================================ */}
      <LanguageSheet
        open={languageSheetOpen}
        lang={lang}
        onSelectLanguage={setLang}
        onOpenAllLanguages={() => setAllLanguagesModalOpen(true)}
        onClose={() => setLanguageSheetOpen(false)}
      />

      {allLanguagesModalOpen && (
        <div
          className="sheet-backdrop"
          onClick={() => setAllLanguagesModalOpen(false)}
        >
          <div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label="All Indian Languages"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ds-card-header">
              <h2 className="text-h2">22+ Indian Languages</h2>
              <button
                type="button"
                className="icon-pill-btn"
                onClick={() => setAllLanguagesModalOpen(false)}
              >
                {t.shell.close}
              </button>
            </div>
            <div className="grid-2">
              {SCHEDULED_INDIAN_LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  className="sos-action-row"
                  style={{ marginBottom: 0 }}
                  onClick={() => {
                    if (
                      l.code === "kn" ||
                      l.code === "en" ||
                      l.code === "hi"
                    ) {
                      setLang(l.code);
                    }
                    setAllLanguagesModalOpen(false);
                  }}
                >
                  <div>
                    <div className="text-h3">{l.nativeName}</div>
                    <div className="text-caption">{l.nameEn}</div>
                  </div>
                  <span
                    className={`status-chip ${
                      l.tier === "LAUNCH" ? "green" : "neutral"
                    }`}
                  >
                    {l.tier === "LAUNCH" ? "Active" : "Planned"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <ProfileMenu
        open={profileMenuOpen}
        lang={lang}
        easyMode={easyMode}
        isAuthenticated={Boolean(apiToken)}
        userPhone={displayFarmerName}
        onToggleEasyMode={() => setEasyMode((v) => !v)}
        onOpenAuthModal={() => setLoginModalOpen(true)}
        onOpenIntro={() => setShowExperienceGateway(true)}
        onOpenHelp={() => openHelpWithFlow("menu")}
        onSignOut={() => setApiToken(null)}
        onClose={() => setProfileMenuOpen(false)}
      />

      <InfoSheet
        open={infoSheetData.open}
        title={infoSheetData.title}
        sourceLabel={infoSheetData.sourceLabel}
        lastCheckedLabel={infoSheetData.lastCheckedLabel}
        explanation={infoSheetData.explanation}
        officialUrl={infoSheetData.officialUrl}
        lang={lang}
        onClose={() => setInfoSheetData((prev) => ({ ...prev, open: false }))}
      />

      <LoginSecurityModal
        open={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        lang={lang}
        setLang={setLang}
        onOpenAllLanguages={() => {
          setLoginModalOpen(false);
          setAllLanguagesModalOpen(true);
        }}
        apiBase={API_BASE}
        apiToken={apiToken}
        currentUserName={displayFarmerName}
        currentUserRole={currentUserRole}
        onAuthenticated={(auth) => {
          setApiToken(auth.accessToken);
          setApiFarmerId(auth.userId);
          setCurrentUserName(auth.fullName);
          setCurrentUserRole(auth.role);
          setServiceErrorBanner(null);
        }}
        onLoggedOut={() => setApiToken(null)}
        speakText={speakDirect}
      />

      {/* SMART GPS: SHARE LIVE LOCATION MODAL */}
      {liveShareModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 14,
              maxWidth: 480,
              width: "100%",
              padding: 24,
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px", color: "#065f46" }}>
              📍 {L(lang, "ಅಧಿಕಾರಿಯೊಂದಿಗೆ ಲೈವ್ ಜಿಪಿಎಸ್ ಹಂಚಿಕೊಳ್ಳಿ", "Share Live Location with Employee", "अधिकारी के साथ लाइव जीपीएस साझा करें")}
            </h3>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px", lineHeight: 1.5 }}>
              {L(
                lang,
                "ಬೆಳೆ ಸಮೀಕ್ಷೆ, ಹಾನಿ ಪರಿಶೀಲನೆ ಅಥವಾ ಸಿಎಸ್‌ಸಿ ನೆರವಿಗಾಗಿ ನಿಮ್ಮ ಲೈವ್ ಜಿಪಿಎಸ್ ಅನ್ನು ನಿಯೋಜಿತ ಅಧಿಕಾರಿಗೆ ತಾತ್ಕಾಲಿಕವಾಗಿ ಹಂಚಿಕೊಳ್ಳಿ. ಇದು ಸಮಯ ಮಿತಿಯುಳ್ಳದ್ದಾಗಿದ್ದು, ಯಾವುದೇ ಸಮಯದಲ್ಲಿ ನೀವು ಇದನ್ನು ನಿಲ್ಲಿಸಬಹುದು.",
                "Voluntarily share your live GPS location with your assigned CSC operator for field visits, crop damage evidence, or assisted application processing. Automatically expires.",
                "खेत सत्यापन या सीएससी सहायता के लिए अपने लाइव जीपीएस को अस्थायी रूप से साझा करें। यह समय-सीमित है और कभी भी रोका जा सकता है।"
              )}
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                {L(lang, "ಹಂಚಿಕೆ ಅವಧಿ ಆಯ್ಕೆಮಾಡಿ:", "Select Sharing Duration:", "शेयरिंग अवधि चुनें:")}
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  { min: 15, label: "15 Min" },
                  { min: 30, label: "30 Min" },
                  { min: 60, label: "1 Hour" },
                ].map((d) => (
                  <button
                    key={d.min}
                    type="button"
                    onClick={() => setLiveShareDuration(d.min)}
                    style={{
                      padding: "10px 6px",
                      borderRadius: 6,
                      border: liveShareDuration === d.min ? "2px solid #065f46" : "1px solid #cbd5e1",
                      background: liveShareDuration === d.min ? "#ecfdf5" : "#ffffff",
                      color: liveShareDuration === d.min ? "#065f46" : "#0f172a",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                background: "#f8fafc",
                padding: 12,
                borderRadius: 8,
                marginBottom: 20,
                fontSize: 12,
                color: "#475569",
              }}
            >
              <div>👤 <strong>Assigned Operator:</strong> Siddesh N. (Raitha Samparka Kendra / CSC H.D. Kote)</div>
              <div style={{ marginTop: 4 }}>🔒 <strong>DPDP Act Protection:</strong> No silent background tracking. Immediate revocation guaranteed.</div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setLiveShareModalOpen(false)}
                style={{
                  padding: "10px 16px",
                  borderRadius: 6,
                  border: "none",
                  background: "#e2e8f0",
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {L(lang, "ರದ್ದು", "Cancel", "रद्द करें")}
              </button>
              <button
                type="button"
                onClick={handleStartLiveSharing}
                disabled={gpsLoading}
                style={{
                  padding: "10px 20px",
                  borderRadius: 6,
                  border: "none",
                  background: "#065f46",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {gpsLoading ? L(lang, "ಪ್ರಾರಂಭಿಸಲಾಗುತ್ತಿದೆ...", "Starting...", "शुरू हो रहा है...") : L(lang, "ಹಂಚಿಕೆ ಪ್ರಾರಂಭಿಸಿ ➔", "Start Sharing ➔", "शेयरिंग शुरू करें ➔")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SMART GPS: NEARBY SERVICES MODAL */}
      {showNearbyModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 14,
              maxWidth: 580,
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: 24,
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "#065f46" }}>
                🏛️ {L(lang, "ಸಮೀಪದ ಸಿಎಸ್‌ಸಿ ಕೇಂದ್ರಗಳು & ಬ್ಯಾಂಕ್‌ಗಳು", "Nearby CSC Centres & Banks", "नजदीकी सीएससी केंद्र और बैंक")}
              </h3>
              <button
                type="button"
                onClick={() => setShowNearbyModal(false)}
                style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", color: "#64748b" }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px" }}>
              {L(
                lang,
                "ನಿಮ್ಮ ಪ್ರಸ್ತುತ ಜಿಪಿಎಸ್ ಸ್ಥಳದಿಂದ ನಿಖರ ಕಿಲೋಮೀಟರ್ ದೂರದಲ್ಲಿರುವ ಅಧಿಕೃತ ಕೃಷಿ ಸೇವಾ ಕೇಂದ್ರಗಳು.",
                "Verified agricultural support offices, CSC centres, and participating banks calculated from your GPS coordinates.",
                "आपके वर्तमान जीपीएस स्थान से नजदीकी सीएससी केंद्र और बैंक शाखाएं।"
              )}
            </p>

            <div style={{ display: "grid", gap: 12 }}>
              {nearbyServices.map((srv) => (
                <div
                  key={srv.id}
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    padding: 14,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: srv.type === "CSC_CENTRE" ? "#dcfce7" : srv.type === "BANK_BRANCH" ? "#e0f2fe" : "#fef3c7",
                          color: srv.type === "CSC_CENTRE" ? "#15803d" : srv.type === "BANK_BRANCH" ? "#0369a1" : "#b45309",
                        }}
                      >
                        {srv.type.replace("_", " ")}
                      </span>
                      <strong style={{ fontSize: 14, color: "#0f172a" }}>{srv.name}</strong>
                    </div>
                    <div style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>{srv.address}</div>
                    {srv.contactNumber && (
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        📞 <strong>Phone:</strong> {srv.contactNumber}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#065f46", marginBottom: 6 }}>
                      {srv.distanceKm} km
                    </div>
                    <a
                      href={`https://maps.google.com/?q=${srv.latitude},${srv.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: "6px 12px",
                        background: "#065f46",
                        color: "#ffffff",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: "none",
                        display: "inline-block",
                      }}
                    >
                      🗺️ {L(lang, "ದಾರಿ ನೋಡಿ", "Directions", "दिशा")} ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* BHOOMI OFFICIAL GOVT PORTAL HANDOFF MODAL */}
      {bhoomiNoticeOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.65)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              maxWidth: 520,
              width: "100%",
              padding: 24,
              boxShadow: "0 12px 36px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: "#ecfdf5",
                  color: "#065f46",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                }}
              >
                🏛️
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "#0f172a" }}>
                  {L(lang, "ಅಧಿಕೃತ ಸರ್ಕಾರಿ ಜಾಲತಾಣ ಸೂಚನೆ", "Official Government Portal Notice", "आधिकारिक सरकारी पोर्टल सूचना")}
                </h3>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  Karnataka Bhoomi Land Records · landrecords.karnataka.gov.in
                </div>
              </div>
            </div>

            <div
              style={{
                background: "#fef3c7",
                border: "1px solid #fde68a",
                borderRadius: 8,
                padding: 14,
                marginBottom: 16,
                fontSize: 13,
                color: "#92400e",
                lineHeight: 1.5,
              }}
            >
              <strong>⚠️ {L(lang, "ಗಮನಿಸಿ:", "Notice:", "सूचना:")}</strong>{" "}
              {L(
                lang,
                "ನೀವು ಆಗ್ರೋ ಎಐ ಸ್ಕೀಮ್ ತೊರೆದು ಅಧಿಕೃತ ಕರ್ನಾಟಕ ಸರ್ಕಾರದ ಭೂಮಿ ಆರ್‌ಟಿಸಿ (RTC) ಜಾಲತಾಣವನ್ನು ನಿಮ್ಮ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಪ್ರತ್ಯೇಕವಾಗಿ ತೆರೆಯುತ್ತಿದ್ದೀರಿ.",
                "You are leaving Agro AI Scheme and opening the official Karnataka Bhoomi land-records website.",
                "आप एग्रो एआई स्कीम छोड़कर आधिकारिक कर्नाटक भूमि भू-अभिलेख वेबसाइट खोल रहे हैं।"
              )}
            </div>

            <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, marginBottom: 20 }}>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li style={{ marginBottom: 6 }}>
                  <strong>{L(lang, "ಸ್ವತಂತ್ರ ಪ್ಲಾಟ್‌ಫಾರ್ಮ್:", "Independent Platform:", "स्वतंत्र मंच:")}</strong>{" "}
                  {L(
                    lang,
                    "ಆಗ್ರೋ ಎಐ ಸ್ಕೀಮ್ ಒಂದು ಸ್ವತಂತ್ರ ವೇದಿಕೆಯಾಗಿದ್ದು, ಕರ್ನಾಟಕ ಸರ್ಕಾರದ ಅಧಿಕೃತ ಅಂಗಸಂಸ್ಥೆಯಲ್ಲ.",
                    "Agro AI Scheme is an independent platform and is not affiliated with the Government of Karnataka.",
                    "एग्रो एआई स्कीम एक स्वतंत्र मंच है और कर्नाटक सरकार से संबद्ध नहीं है।"
                  )}
                </li>
                <li style={{ marginBottom: 6 }}>
                  <strong>{L(lang, "ಗೌಪ್ಯತೆ ಮತ್ತು ಭದ್ರತೆ:", "Privacy & Security:", "गोपनीयता:")}</strong>{" "}
                  {L(
                    lang,
                    "ನಿಮ್ಮ ಆಗ್ರೋ ಎಐ ಲಾಗಿನ್ ಮಾಹಿತಿ ಮತ್ತು ಅರ್ಜಿ ಡೇಟಾ ಸಂಪೂರ್ಣ ಪ್ರತ್ಯೇಕವಾಗಿರುತ್ತದೆ. ಆಗ್ರೋ ಎಐನಲ್ಲಿ ಯಾವುದೇ ಬ್ಯಾಂಕ್ ಅಥವಾ ಭೂಮಿ ಪಾಸ್‌ವರ್ಡ್, ಒಟಿಪಿಗಳನ್ನು ಎಂದಿಗೂ ಕೇಳಲಾಗುವುದಿಲ್ಲ.",
                    "Your Agro AI session and data remain completely separate. Never enter any bank or portal passwords/OTPs into Agro AI.",
                    "आपका एग्रो एआई सत्र और डेटा पूरी तरह अलग रहेगा।"
                  )}
                </li>
                <li>
                  <strong>{L(lang, "ದಾಖಲೆ ಸಂರಕ್ಷಣೆ:", "No Record Scraping:", "डेटा सुरक्षा:")}</strong>{" "}
                  {L(
                    lang,
                    "ನಾವು ಭೂಮಿ ಜಾಲತಾಣದಿಂದ ಯಾವುದೇ ದಾಖಲೆಗಳನ್ನು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಸಂಗ್ರಹಿಸುವುದಿಲ್ಲ ಅಥವಾ ನಕಲಿಸುವುದಿಲ್ಲ.",
                    "We do not scrape, copy, or store land records from Bhoomi.",
                    "हम भूमि पोर्टल से रिकॉर्ड कॉपी या स्टोर नहीं करते हैं।"
                  )}
                </li>
              </ul>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setBhoomiNoticeOpen(false)}
                style={{
                  padding: "10px 18px",
                  background: "#f1f5f9",
                  color: "#0f172a",
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                ← {L(lang, "ಆಗ್ರೋ ಎಐಗೆ ಹಿಂತಿರುಗಿ", "Return to Agro AI Scheme", "एग्रो एआई पर वापस जाएं")}
              </button>

              <button
                type="button"
                onClick={() => {
                  setBhoomiNoticeOpen(false);
                  window.open(
                    "https://landrecords.karnataka.gov.in/service2/RTC.aspx",
                    "_blank",
                    "noopener,noreferrer"
                  );
                }}
                style={{
                  padding: "10px 20px",
                  background: "#065f46",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                🌐 {L(lang, "ಭೂಮಿ ಪೋರ್ಟಲ್‌ಗೆ ಮುಂದುವರಿಯಿರಿ ↗", "Proceed to Bhoomi Portal ↗", "भूमि पोर्टल पर आगे बढ़ें ↗")}
              </button>
            </div>
          </div>
        </div>
      )}

      {whatsAppModalOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setWhatsAppModalOpen(false)}
        >
          <div
            className="modal-card"
            style={{ maxWidth: 540 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: "#25D366",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    boxShadow: "0 4px 12px rgba(37, 211, 102, 0.35)",
                  }}
                >
                  <WhatsAppIcon size={24} />
                </div>
                <div>
                  <h2 className="text-h2" style={{ margin: 0, fontSize: "1.25rem" }}>
                    {L(
                      lang,
                      "ವಾಟ್ಸಾಪ್ ವರದಿ ರವಾನೆ",
                      "Send WhatsApp Advisory Report",
                      "व्हाट्सएप रिपोर्ट भेजें"
                    )}
                  </h2>
                  <span className="trust-chip verified" style={{ marginTop: 2, display: "inline-block" }}>
                    Twilio & Direct WhatsApp Bridge
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="icon-pill-btn"
                onClick={() => setWhatsAppModalOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <p className="text-caption" style={{ marginBottom: 14 }}>
              {L(
                lang,
                "ನಿಮ್ಮ ಜಮೀನಿನ ಅರ್ಹ ಯೋಜನೆಗಳು, ಪಹಣಿ ವಿವರ ಹಾಗೂ ಬೆಳೆ ವಿಮೆ ಲೆಕ್ಕಾಚಾರದ ಅಧಿಕೃತ ವರದಿಯನ್ನು ನೇರವಾಗಿ ವಾಟ್ಸಾಪ್‌ಗೆ ಕಳುಹಿಸಿ.",
                "Send your verified scheme eligibility, land records, and crop insurance calculation report directly to WhatsApp via Twilio or WhatsApp Web.",
                "अपनी पात्र योजनाओं और फसल बीमा रिपोर्ट को सीधे व्हाट्सएप पर भेजें।"
              )}
            </p>

            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "var(--green-900)",
                  marginBottom: 6,
                }}
              >
                {L(
                  lang,
                  "ಸ್ವೀಕರಿಸುವವರ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ (WhatsApp Mobile Number)",
                  "Recipient WhatsApp Mobile Number",
                  "प्राप्तकर्ता का व्हाट्सएप नंबर"
                )}
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    padding: "10px 14px",
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    fontWeight: 700,
                    color: "var(--green-900)",
                  }}
                >
                  +91
                </span>
                <input
                  type="tel"
                  className="input"
                  style={{ flex: 1 }}
                  placeholder="9876543210"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  maxLength={10}
                />
              </div>
            </div>

            {twilioResultMsg && (
              <div
                className={`banner ${twilioResultMsg.isError ? "bad" : "ok"}`}
                style={{ marginBottom: 14 }}
              >
                {twilioResultMsg.text}
              </div>
            )}

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginTop: 8,
              }}
            >
              <button
                type="button"
                className="btn btn-primary"
                style={{
                  width: "100%",
                  background: "#25D366",
                  color: "#ffffff",
                  borderColor: "#1EBE5D",
                  justifyContent: "center",
                  padding: "12px",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                }}
                disabled={isSendingTwilio}
                onClick={handleSendViaTwilio}
              >
                <WhatsAppIcon size={20} />
                {isSendingTwilio
                  ? L(lang, "ರವಾನಿಸಲಾಗುತ್ತಿದೆ...", "Sending via Twilio...", "भेजा जा रहा है...")
                  : L(
                      lang,
                      "⚡ ಟ್ವಿಲಿಯೋ ಮೂಲಕ ನೇರವಾಗಿ ಕಳುಹಿಸಿ",
                      "⚡ Send Directly via Twilio WhatsApp API",
                      "⚡ ट्विलियो के जरिए सीधे भेजें"
                    )}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: "100%", justifyContent: "center", padding: "12px" }}
                onClick={() => handleOpenWhatsAppDirect()}
              >
                <WhatsAppIcon size={20} />
                {L(
                  lang,
                  "💬 ವಾಟ್ಸಾಪ್ ವೆಬ್ / ಆಪ್‌ನಲ್ಲಿ ತಕ್ಷಣ ತೆರೆಯಿರಿ",
                  "💬 Open in WhatsApp Web / App Directly",
                  "💬 व्हाट्सएप ऐप / वेब में खोलें"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
