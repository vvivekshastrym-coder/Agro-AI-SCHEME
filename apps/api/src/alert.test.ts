import { describe, it, expect } from "vitest";
import { AgroAlertEngineService } from "./alert.service.js";
import { type RealFarmerRecord, type RealApplicationRecord } from "./enterprise.service.js";

describe("AgroAlertEngineService — Government Policy, Bank & Insurance Alert Engine", () => {
  it("initializes official government, bank, and insurance source registries", () => {
    const alerts = new AgroAlertEngineService();
    expect(alerts.sources.size).toBeGreaterThanOrEqual(5);

    const pmkisan = alerts.sources.get("src-moafw-pmkisan");
    expect(pmkisan?.category).toBe("GOVERNMENT_POLICY");
    expect(pmkisan?.officialPortalUrl).toBe("https://pmkisan.gov.in/");
    expect(pmkisan?.status).toBe("ACTIVE_VERIFIED");

    const pmfby = alerts.sources.get("src-moafw-pmfby");
    expect(pmfby?.category).toBe("CROP_INSURANCE");

    const jansamarth = alerts.sources.get("src-dfs-jansamarth");
    expect(jansamarth?.category).toBe("BANK_SERVICE");
  });

  it("publishes a verified government policy update with circular reference", () => {
    const alerts = new AgroAlertEngineService();
    const policy = alerts.publishPolicyUpdate({
      department: "Ministry of Agriculture & Farmers Welfare, GoI",
      schemeOrPolicyName: "Pradhan Mantri Fasal Bima Yojana (PMFBY)",
      circularReference: "MoA/PMFBY/2026/Notice-09",
      category: "CROP_INSURANCE",
      publicationDate: "2026-11-01",
      effectiveDate: "2026-11-05",
      previousRule: "Cutoff date was November 15.",
      newRule: "Extended Rabi enrolment cutoff date to December 31 for Karnataka notified districts.",
      affectedStates: ["Karnataka"],
      affectedDistricts: ["KA-MYS", "KA-MDY"],
      affectedCrops: ["RAGI", "PADDY"],
      officialSourceUrl: "https://pmfby.gov.in/",
      actionType: "PREPARE_DOCUMENTS",
      priority: "CRITICAL",
    });

    expect(policy.id).toMatch(/^pol-/);
    expect(policy.isSourceVerified).toBe(true);
    expect(alerts.policyUpdates.has(policy.id)).toBe(true);
  });

  it("matches personalized alerts based on farmer location, crop, and category", () => {
    const alerts = new AgroAlertEngineService();

    // Ragi farmer in Mysuru
    const mysuruRagiFarmer: RealFarmerRecord = {
      id: "farmer-ragi-mys",
      fullName: "Basappa Gowda",
      mobile: "+919845112233",
      state: "Karnataka",
      districtCode: "KA-MYS",
      talukCode: "KA-MYS-HDK",
      villageCode: "KA-MYS-HDK-001",
      cropCode: "RAGI",
      landAreaValue: 2.0,
      landAreaUnit: "ACRE",
      ownershipType: "OWNER",
      farmerCategory: "SMALL",
      preferredLanguage: "kn",
      identityVerificationState: "AADHAAR_EKYC_GUIDED",
      consentStatus: "CONSENTED",
      consentVersion: "v1.2-DPDP",
      consentTimestampIso: "2026-11-01T00:00:00.000Z",
      consentPurpose: "CSC assisted alerts",
      registeredByActorId: "emp-lead-01",
      createdAt: "2026-11-01T00:00:00.000Z",
    };

    const matched = alerts.matchAndGenerateFarmerAlerts(mysuruRagiFarmer, []);
    expect(matched.length).toBeGreaterThan(0);

    // Verify Raitha Siri (Millet) policy matched
    const raithaSiriAlert = matched.find((a) => a.schemeOrPolicyName.includes("Raitha Siri"));
    expect(raithaSiriAlert).toBeDefined();
    expect(raithaSiriAlert?.category).toBe("GOVERNMENT_POLICY");
    expect(raithaSiriAlert?.titleKn).toContain("ಸರ್ಕಾರಿ ನಿಯಮ ಬದಲಾವಣೆ");

    // Verify PMFBY Rabi deadline matched (Ragi crop)
    const pmfbyAlert = matched.find((a) => a.schemeOrPolicyName.includes("PMFBY"));
    expect(pmfbyAlert).toBeDefined();
    expect(pmfbyAlert?.category).toBe("CROP_INSURANCE");
    expect(pmfbyAlert?.titleKn).toContain("ಬೆಳೆ ವಿಮೆ ಎಚ್ಚರಿಕೆ");
  });

  it("triggers CRITICAL bank alerts when additional documents are requested on an active application", () => {
    const alerts = new AgroAlertEngineService();
    const farmer: RealFarmerRecord = {
      id: "farmer-kcc-01",
      fullName: "Devraj Gowda",
      mobile: "+919945001122",
      state: "Karnataka",
      districtCode: "KA-MYS",
      talukCode: "KA-MYS-HDK",
      villageCode: "KA-MYS-HDK-001",
      cropCode: "MAIZE",
      landAreaValue: 3.5,
      landAreaUnit: "ACRE",
      ownershipType: "OWNER",
      farmerCategory: "SMALL",
      preferredLanguage: "kn",
      identityVerificationState: "AADHAAR_EKYC_GUIDED",
      consentStatus: "CONSENTED",
      consentVersion: "v1.2-DPDP",
      consentTimestampIso: "2026-11-01T00:00:00.000Z",
      consentPurpose: "Bank alerts",
      registeredByActorId: "emp-lead-01",
      createdAt: "2026-11-01T00:00:00.000Z",
    };

    const activeApp: RealApplicationRecord = {
      id: "app-kcc-test-01",
      applicationNumber: "AGRO-2026-00991",
      farmerId: farmer.id,
      farmerName: farmer.fullName,
      farmerMobile: farmer.mobile,
      schemeId: "kcc-official",
      schemeName: "Kisan Credit Card (KCC)",
      schemeCategory: "BANK_CREDIT",
      workflowStatus: "ADDITIONAL_INFORMATION_REQUIRED",
      submissionMode: "OFFICIAL_PORTAL_HANDOFF",
      assignedEmployeeId: "emp-lead-01",
      assignedBankId: "bank-sbi",
      cscCentreId: "csc-ka-mys-01",
      officialPortalUrl: "https://www.jansamarth.in/",
      requiredDocuments: ["Pahani", "Aadhaar"],
      uploadedDocuments: [],
      statusHistory: [],
      createdAt: "2026-11-01T00:00:00.000Z",
      updatedAt: "2026-11-01T00:00:00.000Z",
    };

    const matched = alerts.matchAndGenerateFarmerAlerts(farmer, [activeApp]);
    const criticalDocAlert = matched.find((a) => a.actionType === "PREPARE_DOCUMENTS");
    expect(criticalDocAlert).toBeDefined();
    expect(criticalDocAlert?.priority).toBe("CRITICAL");
    expect(criticalDocAlert?.titleKn).toContain("ಹೆಚ್ಚಿನ ದಾಖಲೆಗಳು ಬೇಕಾಗಿವೆ");
  });

  it("handles farmer notification preferences and quiet hours calculation", () => {
    const alerts = new AgroAlertEngineService();
    const prefs = alerts.getFarmerPreferences("farmer-test-01");
    expect(prefs.inAppEnabled).toBe(true);
    expect(prefs.whatsappEnabled).toBe(true);

    const updated = alerts.updateFarmerPreferences("farmer-test-01", {
      whatsappEnabled: false,
      quietHoursStart: "22:00",
      quietHoursEnd: "06:00",
    });
    expect(updated.whatsappEnabled).toBe(false);
    expect(updated.quietHoursStart).toBe("22:00");
  });

  it("provides employee and CSC operator actionable queues", () => {
    const alerts = new AgroAlertEngineService();
    const apps: RealApplicationRecord[] = [
      {
        id: "app-test-1",
        applicationNumber: "AGRO-2026-00101",
        farmerId: "f1",
        farmerName: "Kempanna",
        farmerMobile: "+919845000001",
        schemeId: "kcc-official",
        schemeName: "Kisan Credit Card",
        schemeCategory: "BANK_CREDIT",
        workflowStatus: "ADDITIONAL_INFORMATION_REQUIRED",
        submissionMode: "OFFICIAL_PORTAL_HANDOFF",
        assignedEmployeeId: "emp-lead-01",
        assignedBankId: "bank-sbi",
        cscCentreId: "csc-ka-mys-01",
        officialPortalUrl: "https://www.jansamarth.in/",
        requiredDocuments: [],
        uploadedDocuments: [],
        statusHistory: [],
        createdAt: "2026-11-01T00:00:00.000Z",
        updatedAt: "2026-11-01T00:00:00.000Z",
      },
    ];

    const empAlerts = alerts.getEmployeeAlerts("csc-ka-mys-01", apps);
    expect(empAlerts.counts.urgentCount).toBe(1);
    expect(empAlerts.items[0]?.priority).toBe("CRITICAL");
  });
});
