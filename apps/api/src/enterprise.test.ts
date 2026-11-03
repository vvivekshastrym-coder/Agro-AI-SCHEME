import { describe, it, expect } from "vitest";
import { AgroEnterpriseService } from "./enterprise.service.js";

describe("AgroEnterpriseService — Multi-Portal Real-Time Operations", () => {
  it("calculates real-time dashboard counts strictly from database (0 when empty)", () => {
    const service = new AgroEnterpriseService();
    const dashboard = service.getSuperAdminDashboard();

    expect(dashboard.isRealTime).toBe(true);
    expect(dashboard.dataFreshness).toBe("LIVE");
    expect(dashboard.metrics.totalFarmers).toBe(0);
    expect(dashboard.metrics.totalApplications).toBe(0);
    expect(dashboard.metrics.totalEmployees).toBe(1); // 1 initial lead employee
    expect(dashboard.metrics.totalCscCentres).toBe(2);
    expect(dashboard.metrics.totalSchemes).toBe(7); // 7 verified real schemes
    expect(dashboard.pipeline.DRAFT).toBe(0);
    expect(dashboard.pipeline.SUBMITTED_CONFIRMED).toBe(0);
  });

  it("registers a farmer with explicit DPDP consent and tracks identity verification state", () => {
    const service = new AgroEnterpriseService();
    const farmer = service.registerFarmer("emp-lead-01", {
      fullName: "Basavaraj Bommai",
      mobile: "+919845012345",
      state: "Karnataka",
      districtCode: "KA-MYS",
      talukCode: "KA-MYS-HDK",
      villageCode: "KA-MYS-HDK-001",
      cropCode: "RAGI",
      landAreaValue: 2.5,
      landAreaUnit: "ACRE",
      ownershipType: "OWNER",
      farmerCategory: "SMALL",
      preferredLanguage: "kn",
      consentPurpose: "CSC operator assisted scheme application and document preparation",
      consentVersion: "v1.2-DPDP",
    });

    expect(farmer.id).toMatch(/^farmer-/);
    expect(farmer.consentStatus).toBe("CONSENTED");
    expect(farmer.identityVerificationState).toBe("AADHAAR_EKYC_GUIDED");
    expect(service.farmers.size).toBe(1);

    // Verify dashboard reflects real count
    const dashboard = service.getSuperAdminDashboard();
    expect(dashboard.metrics.totalFarmers).toBe(1);
  });

  it("progresses an application through the 16-state workflow and logs immutable history", () => {
    const service = new AgroEnterpriseService();
    const farmer = service.registerFarmer("emp-lead-01", {
      fullName: "Ningamma Gowda",
      mobile: "+919880123456",
      state: "Karnataka",
      districtCode: "KA-MYS",
      talukCode: "KA-MYS-HDK",
      villageCode: "KA-MYS-HDK-001",
      cropCode: "RAGI",
      landAreaValue: 3.0,
      landAreaUnit: "ACRE",
      ownershipType: "OWNER",
      farmerCategory: "SMALL",
      preferredLanguage: "kn",
      consentPurpose: "Assisted KCC application",
    });

    const app = service.createApplication(
      "emp-lead-01",
      "EMPLOYEE",
      "Suresh Patil",
      {
        farmerId: farmer.id,
        schemeId: "kcc-official",
        requestedAmount: 150000,
        submissionMode: "OFFICIAL_PORTAL_HANDOFF",
        assignedBankId: "bank-sbi",
      }
    );

    expect(app.applicationNumber).toMatch(/^AGRO-\d{4}-\d{5}$/);
    expect(app.workflowStatus).toBe("DOCUMENTS_PENDING");
    expect(app.statusHistory.length).toBe(1);

    // Transition: DOCUMENTS_PENDING -> READY_FOR_REVIEW
    const reviewed = service.transitionApplicationStatus(
      "emp-lead-01",
      "EMPLOYEE",
      "Suresh Patil",
      {
        applicationId: app.id,
        toStatus: "READY_FOR_REVIEW",
        reasonOrNote: "All 4 required documents (RTC, ID, Photo) verified.",
      }
    );
    expect(reviewed.workflowStatus).toBe("READY_FOR_REVIEW");

    // Transition: READY_FOR_REVIEW -> BANK_REVIEW
    const routedToBank = service.transitionApplicationStatus(
      "emp-lead-01",
      "APPLICATION_REVIEWER",
      "Suresh Patil",
      {
        applicationId: app.id,
        toStatus: "BANK_REVIEW",
        reasonOrNote: "Application verified; routed to SBI Mysuru Main Branch.",
      }
    );
    expect(routedToBank.workflowStatus).toBe("BANK_REVIEW");

    // Bank Decision: APPROVED
    const approved = service.recordBankDecision(
      "bank-mgr-sbi",
      "BANK_PARTNER",
      "SBI Agri Officer",
      {
        applicationId: app.id,
        decision: "APPROVED",
        bankReferenceNumber: "SBI-KCC-2026-9912",
        notes: "Credit limit ₹1,50,000 sanctioned under subsidized KCC terms.",
      }
    );

    expect(approved.workflowStatus).toBe("APPROVED");
    expect(approved.officialAckNumber).toBe("SBI-KCC-2026-9912");
    expect(approved.statusHistory.length).toBe(4);
  });

  it("supports official portal handoff with acknowledgement number tracking", () => {
    const service = new AgroEnterpriseService();
    const farmer = service.registerFarmer("emp-lead-01", {
      fullName: "Mallikarjun Swamy",
      mobile: "+919945112233",
      state: "Karnataka",
      districtCode: "KA-MYS",
      talukCode: "KA-MYS-HDK",
      villageCode: "KA-MYS-HDK-001",
      cropCode: "PADDY",
      landAreaValue: 1.8,
      landAreaUnit: "ACRE",
      ownershipType: "OWNER",
      farmerCategory: "SMALL",
      preferredLanguage: "kn",
      consentPurpose: "PM-KISAN registration assistance",
    });

    const app = service.createApplication(
      "emp-lead-01",
      "EMPLOYEE",
      "Suresh Patil",
      {
        farmerId: farmer.id,
        schemeId: "pm-kisan-official",
        submissionMode: "OFFICIAL_PORTAL_HANDOFF",
      }
    );

    const handoff = service.recordPortalHandoff(
      "emp-lead-01",
      "EMPLOYEE",
      "Suresh Patil",
      {
        applicationId: app.id,
        officialAckNumber: "PMKISAN-KA-2026-004812",
        notes: "Completed submission on pmkisan.gov.in portal. eKYC OTP verified.",
      }
    );

    expect(handoff.workflowStatus).toBe("SUBMITTED_CONFIRMED");
    expect(handoff.officialAckNumber).toBe("PMKISAN-KA-2026-004812");
  });

  it("checks Integration Health Centre status without fake responses", () => {
    const service = new AgroEnterpriseService();
    const health = service.getIntegrationHealth();

    expect(health.length).toBeGreaterThanOrEqual(8);
    const apiSetu = health.find((h) => h.id === "api_setu_national");
    expect(apiSetu?.status).toBe("PENDING_APPROVAL");

    const pmKisan = health.find((h) => h.id === "pm_kisan_dbt");
    expect(pmKisan?.status).toBe("PORTAL_HANDOFF_REQUIRED");

    const twilio = health.find((h) => h.id === "twilio_whatsapp_bridge");
    expect(twilio?.status).toBe("CONNECTED");
  });
});
