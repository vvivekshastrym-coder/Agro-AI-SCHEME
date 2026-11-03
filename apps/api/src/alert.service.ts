import { uuidv7 } from "./security.js";
import {
  type AlertCategory,
  type AlertPriority,
  type NotificationChannel,
  type AlertActionType,
  type GovernmentPolicyUpdate,
  type FarmerAlert,
  type AlertPreferences,
  type SupportedLanguage,
} from "@agro/shared";
import { type RealFarmerRecord, type RealApplicationRecord } from "./enterprise.service.js";

// ============================================================================
// Source Registry Models
// ============================================================================

export interface OfficialSourceRegistryItem {
  id: string;
  category: AlertCategory;
  name: string;
  department: string;
  officialPortalUrl: string;
  updateFrequency: "DAILY_FEED" | "WEEKLY_GAZETTE" | "REAL_TIME_WEBHOOK";
  lastVerifiedAtIso: string;
  status: "ACTIVE_VERIFIED" | "PENDING_APPROVAL" | "SUSPENDED";
  trustScore: number;
}

// Default verified government and financial sources
export const OFFICIAL_SOURCE_REGISTRY: OfficialSourceRegistryItem[] = [
  {
    id: "src-moafw-pmkisan",
    category: "GOVERNMENT_POLICY",
    name: "PM-KISAN Central DBT Portal (MoA&FW)",
    department: "Ministry of Agriculture & Farmers Welfare, GoI",
    officialPortalUrl: "https://pmkisan.gov.in/",
    updateFrequency: "DAILY_FEED",
    lastVerifiedAtIso: "2026-11-01T00:00:00.000Z",
    status: "ACTIVE_VERIFIED",
    trustScore: 1.0,
  },
  {
    id: "src-moafw-pmfby",
    category: "CROP_INSURANCE",
    name: "National Crop Insurance Portal (PMFBY)",
    department: "Ministry of Agriculture & Farmers Welfare, GoI",
    officialPortalUrl: "https://pmfby.gov.in/",
    updateFrequency: "DAILY_FEED",
    lastVerifiedAtIso: "2026-11-01T00:00:00.000Z",
    status: "ACTIVE_VERIFIED",
    trustScore: 1.0,
  },
  {
    id: "src-karnataka-fruits",
    category: "GOVERNMENT_POLICY",
    name: "Karnataka FRUITS & Raitha Siri Registry",
    department: "Department of Agriculture, Govt of Karnataka",
    officialPortalUrl: "https://fruits.karnataka.gov.in/",
    updateFrequency: "DAILY_FEED",
    lastVerifiedAtIso: "2026-11-01T00:00:00.000Z",
    status: "ACTIVE_VERIFIED",
    trustScore: 1.0,
  },
  {
    id: "src-dfs-jansamarth",
    category: "BANK_SERVICE",
    name: "JanSamarth Single-Window Credit Channel (DFS)",
    department: "Department of Financial Services, Ministry of Finance",
    officialPortalUrl: "https://www.jansamarth.in/",
    updateFrequency: "REAL_TIME_WEBHOOK",
    lastVerifiedAtIso: "2026-11-01T00:00:00.000Z",
    status: "ACTIVE_VERIFIED",
    trustScore: 1.0,
  },
  {
    id: "src-sbi-agri",
    category: "BANK_SERVICE",
    name: "State Bank of India — Agri Lending Network",
    department: "State Bank of India Rural & Agri Business Unit",
    officialPortalUrl: "https://sbi.co.in/web/agri-rural",
    updateFrequency: "REAL_TIME_WEBHOOK",
    lastVerifiedAtIso: "2026-11-01T00:00:00.000Z",
    status: "ACTIVE_VERIFIED",
    trustScore: 1.0,
  },
];

// Verified Policy Updates
export const INITIAL_VERIFIED_POLICY_UPDATES: GovernmentPolicyUpdate[] = [
  {
    id: "pol-pmkisan-18th-instalment",
    department: "Ministry of Agriculture & Farmers Welfare, Govt of India",
    schemeOrPolicyName: "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
    circularReference: "MoA&FW/DBT/2026/Cir-18",
    category: "GOVERNMENT_POLICY",
    publicationDate: "2026-10-25",
    effectiveDate: "2026-11-05",
    previousRule: "Pahani seed status validated via village revenue inspector physical list.",
    newRule: "Mandatory Aadhaar-NPCI bank account seeding and biometric/face eKYC required to receive upcoming 18th tranche of ₹2,000.",
    affectedStates: ["Karnataka", "All States"],
    affectedDistricts: ["KA-MYS", "KA-MDY", "KA-HSN"],
    affectedCrops: [],
    affectedFarmerCategories: ["MARGINAL", "SMALL", "SEMI_MEDIUM", "MEDIUM", "LARGE"],
    officialSourceUrl: "https://pmkisan.gov.in/",
    isSourceVerified: true,
    lastCheckedIso: "2026-11-01T00:00:00.000Z",
    actionType: "CHECK_ELIGIBILITY",
    priority: "CRITICAL",
  },
  {
    id: "pol-pmfby-rabi-deadline",
    department: "Ministry of Agriculture & Farmers Welfare / GoK Samrakshane",
    schemeOrPolicyName: "PMFBY Rabi 2026 Notified Enrolment Cut-Off",
    circularReference: "GoK/Agri/Ins/2026-Rabi-04",
    category: "CROP_INSURANCE",
    publicationDate: "2026-10-20",
    effectiveDate: "2026-11-01",
    previousRule: "Rabi season enrolment was open with standard 1.5% premium.",
    newRule: "Final cut-off deadline for Rabi food crops (Paddy, Ragi, Tur, Maize) insurance enrollment is December 31, 2026 on Samrakshane portal.",
    affectedStates: ["Karnataka"],
    affectedDistricts: ["KA-MYS", "KA-MDY", "KA-HSN"],
    affectedCrops: ["PADDY", "RAGI", "TUR", "MAIZE"],
    affectedFarmerCategories: ["MARGINAL", "SMALL", "SEMI_MEDIUM", "MEDIUM", "LARGE"],
    officialSourceUrl: "https://samrakshane.karnataka.gov.in/",
    isSourceVerified: true,
    lastCheckedIso: "2026-11-01T00:00:00.000Z",
    actionType: "PREPARE_DOCUMENTS",
    priority: "HIGH",
  },
  {
    id: "pol-kcc-subvention-renewal",
    department: "Department of Financial Services / RBI / NABARD",
    schemeOrPolicyName: "Kisan Credit Card (KCC) 4% Prompt Repayment Benefit",
    circularReference: "RBI/FIDD/2026-27/84",
    category: "BANK_SERVICE",
    publicationDate: "2026-10-15",
    effectiveDate: "2026-10-15",
    previousRule: "Annual credit renewal required physical branch inspection every 12 months.",
    newRule: "Farmers with clean prompt repayment record qualify for instant credit line enhancement up to ₹3,00,000 via JanSamarth single-window channel.",
    affectedStates: ["Karnataka", "All States"],
    affectedDistricts: ["KA-MYS", "KA-MDY"],
    affectedCrops: [],
    affectedFarmerCategories: ["MARGINAL", "SMALL"],
    officialSourceUrl: "https://www.jansamarth.in/",
    isSourceVerified: true,
    lastCheckedIso: "2026-11-01T00:00:00.000Z",
    actionType: "TRACK_APPLICATION",
    priority: "MEDIUM",
  },
  {
    id: "pol-raitha-siri-millet-bonus",
    department: "Department of Agriculture, Government of Karnataka",
    schemeOrPolicyName: "Karnataka Raitha Siri (Millet Cultivation Direct Assistance)",
    circularReference: "GoK/Agri/RaithaSiri/2026/09",
    category: "GOVERNMENT_POLICY",
    publicationDate: "2026-10-28",
    effectiveDate: "2026-11-01",
    previousRule: "Incentive disbursed based on offline tahsildar verification.",
    newRule: "Direct bank transfer of ₹10,000 per hectare for verified Ragi, Navane, and minor millet growers linked to FRUITS FID.",
    affectedStates: ["Karnataka"],
    affectedDistricts: ["KA-MYS", "KA-MDY", "KA-HSN"],
    affectedCrops: ["RAGI"],
    affectedFarmerCategories: ["MARGINAL", "SMALL", "SEMI_MEDIUM"],
    officialSourceUrl: "https://fruits.karnataka.gov.in/",
    isSourceVerified: true,
    lastCheckedIso: "2026-11-01T00:00:00.000Z",
    actionType: "VIEW_POLICY",
    priority: "HIGH",
  },
];

// ============================================================================
// Smart Alert Centre Engine
// ============================================================================

export class AgroAlertEngineService {
  public readonly sources = new Map<string, OfficialSourceRegistryItem>();
  public readonly policyUpdates = new Map<string, GovernmentPolicyUpdate>();
  public readonly farmerAlerts = new Map<string, FarmerAlert>();
  public readonly preferences = new Map<string, AlertPreferences>();

  constructor() {
    for (const src of OFFICIAL_SOURCE_REGISTRY) {
      this.sources.set(src.id, src);
    }
    for (const pol of INITIAL_VERIFIED_POLICY_UPDATES) {
      this.policyUpdates.set(pol.id, pol);
    }
  }

  // --------------------------------------------------------------------------
  // Policy Management & Admin Publishing Workflow
  // --------------------------------------------------------------------------

  public publishPolicyUpdate(params: {
    department: string;
    schemeOrPolicyName: string;
    circularReference: string;
    category: AlertCategory;
    publicationDate: string;
    effectiveDate: string;
    previousRule?: string;
    newRule: string;
    affectedStates?: string[];
    affectedDistricts?: string[];
    affectedCrops?: string[];
    officialSourceUrl: string;
    actionType?: AlertActionType;
    priority?: AlertPriority;
  }): GovernmentPolicyUpdate {
    const id = `pol-${uuidv7().slice(0, 8)}`;
    const nowIso = new Date().toISOString();

    const record: GovernmentPolicyUpdate = {
      id,
      department: params.department,
      schemeOrPolicyName: params.schemeOrPolicyName,
      circularReference: params.circularReference,
      category: params.category || "GOVERNMENT_POLICY",
      publicationDate: params.publicationDate,
      effectiveDate: params.effectiveDate,
      previousRule: params.previousRule,
      newRule: params.newRule,
      affectedStates: params.affectedStates || ["Karnataka"],
      affectedDistricts: params.affectedDistricts || [],
      affectedCrops: params.affectedCrops || [],
      affectedFarmerCategories: ["MARGINAL", "SMALL", "SEMI_MEDIUM", "MEDIUM", "LARGE"],
      officialSourceUrl: params.officialSourceUrl,
      isSourceVerified: true,
      lastCheckedIso: nowIso,
      actionType: params.actionType || "CHECK_ELIGIBILITY",
      priority: params.priority || "MEDIUM",
    };

    this.policyUpdates.set(id, record);
    return record;
  }

  // --------------------------------------------------------------------------
  // Personalized Alert Matching Engine (Module 4)
  // --------------------------------------------------------------------------

  public matchAndGenerateFarmerAlerts(
    farmer: RealFarmerRecord,
    applications: RealApplicationRecord[] = []
  ): FarmerAlert[] {
    const matchedAlerts: FarmerAlert[] = [];
    const nowIso = new Date().toISOString();

    // 1. Match against verified government policies
    for (const pol of this.policyUpdates.values()) {
      if (!pol.isSourceVerified) continue;

      // Location match
      const stateMatches =
        pol.affectedStates.length === 0 ||
        pol.affectedStates.includes("All States") ||
        pol.affectedStates.includes(farmer.state);

      const districtMatches =
        pol.affectedDistricts.length === 0 ||
        pol.affectedDistricts.includes(farmer.districtCode);

      if (!stateMatches || !districtMatches) continue;

      // Crop match
      const cropMatches =
        pol.affectedCrops.length === 0 ||
        pol.affectedCrops.includes(farmer.cropCode);

      if (!cropMatches) continue;

      // Category match
      const categoryMatches =
        pol.affectedFarmerCategories.length === 0 ||
        pol.affectedFarmerCategories.includes(farmer.farmerCategory);

      if (!categoryMatches) continue;

      const alertId = `alert-${farmer.id}-${pol.id}`;
      if (!this.farmerAlerts.has(alertId)) {
        const titleEn = `${pol.category.replace("_", " ")}: ${pol.schemeOrPolicyName}`;
        const titleKn =
          pol.category === "CROP_INSURANCE"
            ? `ಬೆಳೆ ವಿಮೆ ಎಚ್ಚರಿಕೆ: ${pol.schemeOrPolicyName}`
            : pol.category === "BANK_SERVICE"
              ? `ಬ್ಯಾಂಕ್ ಮಾಹಿತಿ: ${pol.schemeOrPolicyName}`
              : `ಸರ್ಕಾರಿ ನಿಯಮ ಬದಲಾವಣೆ: ${pol.schemeOrPolicyName}`;
        const titleHi =
          pol.category === "CROP_INSURANCE"
            ? `फसल बीमा सूचना: ${pol.schemeOrPolicyName}`
            : `सरकारी नीति सूचना: ${pol.schemeOrPolicyName}`;

        const alert: FarmerAlert = {
          id: alertId,
          farmerId: farmer.id,
          category: pol.category,
          priority: pol.priority,
          titleEn,
          titleKn,
          titleHi,
          messageEn: `${pol.newRule} (Effective: ${pol.effectiveDate}). Verified from: ${pol.department}.`,
          messageKn: `${pol.newRule} (ಜಾರಿಗೆ ಬರುವ ದಿನಾಂಕ: ${pol.effectiveDate}). ಅಧಿಕೃತ ಮೂಲ: ${pol.department}.`,
          messageHi: `${pol.newRule} (प्रभावी तिथि: ${pol.effectiveDate}). आधिकारिक स्रोत: ${pol.department}.`,
          schemeOrPolicyName: pol.schemeOrPolicyName,
          officialSourceUrl: pol.officialSourceUrl,
          effectiveDate: pol.effectiveDate,
          actionType: pol.actionType,
          actionUrl: pol.officialSourceUrl,
          channels: ["IN_APP", "WHATSAPP"],
          isRead: false,
          actionTaken: false,
          sourceVerified: true,
          createdAt: nowIso,
        };

        this.farmerAlerts.set(alertId, alert);
        matchedAlerts.push(alert);
      } else {
        matchedAlerts.push(this.farmerAlerts.get(alertId)!);
      }
    }

    // 2. Match against active farmer applications (Bank & Insurance updates)
    const farmerApps = applications.filter((a) => a.farmerId === farmer.id);
    for (const app of farmerApps) {
      if (app.workflowStatus === "ADDITIONAL_INFORMATION_REQUIRED") {
        const alertId = `alert-app-info-${app.id}`;
        if (!this.farmerAlerts.has(alertId)) {
          const alert: FarmerAlert = {
            id: alertId,
            farmerId: farmer.id,
            category: app.schemeCategory === "BANK_CREDIT" ? "BANK_SERVICE" : "GOVERNMENT_POLICY",
            priority: "CRITICAL",
            titleEn: `Action Required: Additional Documents for ${app.schemeName}`,
            titleKn: `ಕ್ರಮ ಅಗತ್ಯ: ${app.schemeName} ಗೆ ಹೆಚ್ಚಿನ ದಾಖಲೆಗಳು ಬೇಕಾಗಿವೆ`,
            titleHi: `कार्रवाई आवश्यक: ${app.schemeName} के लिए अतिरिक्त दस्तावेज`,
            messageEn: `Your application (${app.applicationNumber}) requires additional documentation. Please connect with your assigned CSC centre.`,
            messageKn: `ನಿಮ್ಮ ಅರ್ಜಿಗೆ (${app.applicationNumber}) ಹೆಚ್ಚುವರಿ ದಾಖಲೆಗಳ ಅಗತ್ಯವಿದೆ. ದಯವಿಟ್ಟು ಸಿಎಸ್‌ಸಿ ಕೇಂದ್ರವನ್ನು ಸಂಪರ್ಕಿಸಿ.`,
            messageHi: `आपके आवेदन (${app.applicationNumber}) के लिए अतिरिक्त दस्तावेजों की आवश्यकता है।`,
            schemeOrPolicyName: app.schemeName,
            officialSourceUrl: app.officialPortalUrl,
            actionType: "PREPARE_DOCUMENTS",
            channels: ["IN_APP", "WHATSAPP", "CSC_DESK"],
            isRead: false,
            actionTaken: false,
            sourceVerified: true,
            createdAt: nowIso,
          };
          this.farmerAlerts.set(alertId, alert);
          matchedAlerts.push(alert);
        } else {
          matchedAlerts.push(this.farmerAlerts.get(alertId)!);
        }
      } else if (app.workflowStatus === "APPROVED") {
        const alertId = `alert-app-approved-${app.id}`;
        if (!this.farmerAlerts.has(alertId)) {
          const alert: FarmerAlert = {
            id: alertId,
            farmerId: farmer.id,
            category: app.schemeCategory === "BANK_CREDIT" ? "BANK_SERVICE" : "GOVERNMENT_POLICY",
            priority: "HIGH",
            titleEn: `Congratulations: ${app.schemeName} Approved!`,
            titleKn: `ಅಭಿನಂದನೆಗಳು: ${app.schemeName} ಅರ್ಜಿ ಅನುಮೋದನೆಯಾಗಿದೆ!`,
            titleHi: `बधाई: ${app.schemeName} स्वीकृत!`,
            messageEn: `Your application (${app.applicationNumber}) has been approved with reference ${app.officialAckNumber || "OFFICIAL"}.`,
            messageKn: `ನಿಮ್ಮ ಅರ್ಜಿ (${app.applicationNumber}) ಅಧಿಕೃತವಾಗಿ ಅಂಗೀಕೃತವಾಗಿದೆ. ಉಲ್ಲೇಖ: ${app.officialAckNumber || "ಅಧಿಕೃತ"}.`,
            messageHi: `आपका आवेदन (${app.applicationNumber}) स्वीकृत हो गया है।`,
            schemeOrPolicyName: app.schemeName,
            officialSourceUrl: app.officialPortalUrl,
            actionType: "TRACK_APPLICATION",
            channels: ["IN_APP", "WHATSAPP"],
            isRead: false,
            actionTaken: false,
            sourceVerified: true,
            createdAt: nowIso,
          };
          this.farmerAlerts.set(alertId, alert);
          matchedAlerts.push(alert);
        } else {
          matchedAlerts.push(this.farmerAlerts.get(alertId)!);
        }
      }
    }

    return matchedAlerts.sort((a, b) => {
      const priorityOrder: Record<AlertPriority, number> = {
        CRITICAL: 0,
        HIGH: 1,
        MEDIUM: 2,
        INFORMATIONAL: 3,
      };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  // --------------------------------------------------------------------------
  // Employee & CSC Operator Notifications (Module 8)
  // --------------------------------------------------------------------------

  public getEmployeeAlerts(cscCentreId = "csc-ka-mys-01", applications: RealApplicationRecord[] = []) {
    const centreApps = applications.filter((a) => !a.cscCentreId || a.cscCentreId === cscCentreId);

    const pendingDocs = centreApps.filter((a) => a.workflowStatus === "DOCUMENTS_PENDING");
    const awaitingReview = centreApps.filter((a) => a.workflowStatus === "READY_FOR_REVIEW");
    const actionRequired = centreApps.filter((a) => a.workflowStatus === "ADDITIONAL_INFORMATION_REQUIRED");

    return {
      centreId: cscCentreId,
      calculatedAtIso: new Date().toISOString(),
      counts: {
        urgentCount: actionRequired.length,
        pendingDocsCount: pendingDocs.length,
        readyReviewCount: awaitingReview.length,
      },
      items: [
        ...actionRequired.map((a) => ({
          id: `csc-alert-act-${a.id}`,
          priority: "CRITICAL" as AlertPriority,
          title: `Clarification Required: ${a.farmerName} (${a.schemeName})`,
          message: `Application ${a.applicationNumber} needs immediate farmer clarification or documents.`,
          action: "Contact Farmer",
          applicationId: a.id,
        })),
        ...pendingDocs.map((a) => ({
          id: `csc-alert-doc-${a.id}`,
          priority: "HIGH" as AlertPriority,
          title: `Documents Pending: ${a.farmerName}`,
          message: `Application ${a.applicationNumber} for ${a.schemeName} awaits upload of Pahani or Sowing certificate.`,
          action: "Review Checklist",
          applicationId: a.id,
        })),
        ...awaitingReview.map((a) => ({
          id: `csc-alert-rev-${a.id}`,
          priority: "MEDIUM" as AlertPriority,
          title: `Ready for Review: ${a.farmerName}`,
          message: `Application ${a.applicationNumber} verified by operator; ready for submission handoff.`,
          action: "Handoff to Portal",
          applicationId: a.id,
        })),
      ],
    };
  }

  // --------------------------------------------------------------------------
  // Farmer Notification Preferences & Quiet Hours (Module 6 & 11)
  // --------------------------------------------------------------------------

  public getFarmerPreferences(farmerId: string): AlertPreferences {
    if (!this.preferences.has(farmerId)) {
      this.preferences.set(farmerId, {
        farmerId,
        inAppEnabled: true,
        whatsappEnabled: true,
        smsEnabled: false,
        quietHoursStart: "21:00",
        quietHoursEnd: "07:00",
        preferredLanguage: "kn",
        optedOut: false,
      });
    }
    return this.preferences.get(farmerId)!;
  }

  public updateFarmerPreferences(farmerId: string, updates: Partial<AlertPreferences>): AlertPreferences {
    const current = this.getFarmerPreferences(farmerId);
    const updated = { ...current, ...updates };
    this.preferences.set(farmerId, updated);
    return updated;
  }

  public isQuietHours(farmerId: string): boolean {
    const prefs = this.getFarmerPreferences(farmerId);
    if (!prefs.quietHoursStart || !prefs.quietHoursEnd) return false;

    const now = new Date();
    // Convert to IST (UTC + 5:30)
    const istHours = (now.getUTCHours() + 5 + Math.floor((now.getUTCMinutes() + 30) / 60)) % 24;
    const [startH] = prefs.quietHoursStart.split(":").map(Number);
    const [endH] = prefs.quietHoursEnd.split(":").map(Number);

    if (startH! > endH!) {
      return istHours >= startH! || istHours < endH!;
    }
    return istHours >= startH! && istHours < endH!;
  }
}
