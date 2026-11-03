import { describe, it, expect } from "vitest";
import {
  AgroPlatformService,
  AuthorizationError,
  ValidationError,
} from "./platform.service.js";
import { createApiServer } from "./server.js";

describe("@agro/api — Phase 0, 1, 2, 3 Unit, Security & Integration Tests", () => {
  it("enforces refresh-token reuse detection and revokes the entire token family", async () => {
    const platform = new AgroPlatformService();
    await platform.signupFarmer({
      email: "ramesh@agro.example",
      password: "StrongFarmerPassword123!",
      fullName: "Ramesh Gowda",
      preferredLanguage: "kn",
      acceptTermsVersion: "v1.0",
      acceptPrivacyVersion: "v1.0",
      acceptDataProcessingVersion: "v1.0",
    });

    const login1 = platform.loginWithEmail({
      email: "ramesh@agro.example",
      password: "StrongFarmerPassword123!",
    });

    // Rotate once legitimately: refreshToken1 -> refreshToken2
    const rotated = platform.rotateRefreshToken(login1.refreshToken);
    expect(rotated.refreshToken).not.toBe(login1.refreshToken);

    // Now replay the old refreshToken1! Must throw and revoke the whole token family
    expect(() => platform.rotateRefreshToken(login1.refreshToken)).toThrow(
      /reuse detected/i
    );

    // Even the newly issued refreshToken2 in that family must now be revoked!
    expect(() => platform.rotateRefreshToken(rotated.refreshToken)).toThrow(
      AuthorizationError
    );
  });

  it("resists user enumeration and locks account after 5 failed password attempts", async () => {
    const platform = new AgroPlatformService();
    await platform.signupFarmer({
      email: "lakshmi@agro.example",
      password: "CorrectHorseBatteryStaple99!",
      fullName: "Lakshmi Devi",
      preferredLanguage: "kn",
      acceptTermsVersion: "v1.0",
      acceptPrivacyVersion: "v1.0",
      acceptDataProcessingVersion: "v1.0",
    });

    // Unknown user vs wrong password produce the exact same generic error message
    let unknownUserMsg = "";
    let wrongPwdMsg = "";
    try {
      platform.loginWithEmail({
        email: "nobody@agro.example",
        password: "WrongPassword123!",
      });
    } catch (e) {
      unknownUserMsg = (e as Error).message;
    }

    for (let i = 0; i < 5; i++) {
      try {
        platform.loginWithEmail({
          email: "lakshmi@agro.example",
          password: "WrongPassword123!",
        });
      } catch (e) {
        wrongPwdMsg = (e as Error).message;
      }
    }

    expect(unknownUserMsg).toBe(wrongPwdMsg);

    // 6th attempt with the CORRECT password must still fail because account is locked
    expect(() =>
      platform.loginWithEmail({
        email: "lakshmi@agro.example",
        password: "CorrectHorseBatteryStaple99!",
      })
    ).toThrow(AuthorizationError);
  });

  it("enforces mandatory TOTP MFA for ADMIN / SCHEME_REVIEWER roles", async () => {
    const platform = new AgroPlatformService();
    // Bootstrap an admin via invitation flow
    const farmer = await platform.signupFarmer({
      email: "temp@agro.example",
      password: "StrongPassword123!",
      fullName: "Temp",
      preferredLanguage: "en",
      acceptTermsVersion: "v1.0",
      acceptPrivacyVersion: "v1.0",
      acceptDataProcessingVersion: "v1.0",
    });
    // Elevate first user in test to create staff invitation
    const rawUser = platform.requireUser(farmer.userId);
    rawUser.roles = ["PLATFORM_ADMIN"];
    const adminMfa = platform.setupTotpMfa(farmer.userId);

    const inv = platform.createStaffInvitation(farmer.userId, {
      email: "reviewer1@agro.example",
      role: "SCHEME_REVIEWER",
      departmentName: "Agriculture Dept",
    });

    const accepted = platform.acceptStaffInvitation({
      token: inv.rawToken,
      fullName: "Reviewer One",
      password: "ReviewerStrongPassword99!",
    });

    // Attempting login without TOTP code for SCHEME_REVIEWER must fail
    expect(() =>
      platform.loginWithEmail({
        email: "reviewer1@agro.example",
        password: "ReviewerStrongPassword99!",
      })
    ).toThrow(/MFA_CODE_REQUIRED/);

    // Login with valid TOTP code succeeds
    const validLogin = platform.loginWithEmail({
      email: "reviewer1@agro.example",
      password: "ReviewerStrongPassword99!",
      totpCode: accepted.mfaSetup.sampleCurrentCode,
    });
    expect(validLogin.user.roles).toContain("SCHEME_REVIEWER");
    expect(adminMfa.backupCodes.length).toBe(6);
  });

  it("enforces strict ownership isolation: Farmer A cannot read Farmer B, and expired/unscoped shares are denied", async () => {
    const platform = new AgroPlatformService();
    const farmerA = await platform.signupFarmer({
      email: "farmer.a@agro.example",
      password: "FarmerAPassword123!",
      fullName: "Farmer A",
      preferredLanguage: "kn",
      acceptTermsVersion: "v1.0",
      acceptPrivacyVersion: "v1.0",
      acceptDataProcessingVersion: "v1.0",
    });
    const farmerB = await platform.signupFarmer({
      email: "farmer.b@agro.example",
      password: "FarmerBPassword123!",
      fullName: "Farmer B",
      preferredLanguage: "kn",
      acceptTermsVersion: "v1.0",
      acceptPrivacyVersion: "v1.0",
      acceptDataProcessingVersion: "v1.0",
    });
    const helper = await platform.signupFarmer({
      email: "helper@agro.example",
      password: "HelperPassword123!",
      fullName: "Family Helper",
      preferredLanguage: "kn",
      acceptTermsVersion: "v1.0",
      acceptPrivacyVersion: "v1.0",
      acceptDataProcessingVersion: "v1.0",
    });

    // Farmer B tries to read Farmer A's passport -> 403 Forbidden
    expect(() =>
      platform.getFarmerPassport(farmerB.userId, farmerA.userId)
    ).toThrow(AuthorizationError);

    // Helper without share tries to read Farmer A -> 403 Forbidden
    expect(() =>
      platform.getFarmerPassport(helper.userId, farmerA.userId)
    ).toThrow(AuthorizationError);

    // Farmer A grants helper 'profile:read' only (NOT 'plots:write')
    const share = platform.grantAuthorizedShare(
      farmerA.userId,
      helper.userId,
      {
        granteeRole: "FAMILY_HELPER",
        scopes: ["profile:read"],
        expiresInDays: 7,
        purpose: "Help check profile details",
      }
    );

    // Helper can now read Farmer A's passport
    const passport = platform.getFarmerPassport(helper.userId, farmerA.userId);
    expect(passport.profile.fullName).toBe("Farmer A");

    // Helper tries to add a plot for Farmer A without 'plots:write' scope -> 403 Forbidden
    expect(() =>
      platform.addFarmPlot(helper.userId, farmerA.userId, {
        plotName: "Unauthorized Plot",
        surveyNumber: "99/1",
        districtCode: "KA-MYS",
        talukCode: "KA-MYS-HDK",
        villageCode: "KA-MYS-HDK-001",
        areaValue: 2,
        areaUnit: "ACRE",
        ownershipType: "OWNER",
        irrigationType: "RAINFED",
        provenance: "FARMER_ENTERED",
      })
    ).toThrow(AuthorizationError);

    // Revoke share -> Helper can no longer read Farmer A's passport
    platform.revokeAuthorizedShare(farmerA.userId, share.id);
    expect(() =>
      platform.getFarmerPassport(helper.userId, farmerA.userId)
    ).toThrow(AuthorizationError);
  });

  it("evaluates schemes deterministically, caches LLM explanations, and enforces Maker-Checker on scheme publishing", async () => {
    const platform = new AgroPlatformService();
    const otpReq = await platform.requestPhoneOtp("+919876543210", "kn");
    expect(otpReq.isMock).toBe(true);
    expect(otpReq.demoOtpPreview).toHaveLength(6);

    const farmerAuth = platform.verifyPhoneOtpAndLogin({
      phone: "+919876543210",
      otp: otpReq.demoOtpPreview!,
      fullName: "ಶಿವಣ್ಣ (Shivanna)",
      preferredLanguage: "kn",
    });
    const farmerId = farmerAuth.user.id;

    // Add 2 plots and a seasonal crop (RAGI)
    const plot1 = platform.addFarmPlot(farmerId, farmerId, {
      plotName: "ಹೊಲ 1 (North Plot)",
      surveyNumber: "142/2A",
      districtCode: "KA-MYS",
      talukCode: "KA-MYS-HDK",
      villageCode: "KA-MYS-HDK-001",
      areaValue: 2.5,
      areaUnit: "ACRE",
      ownershipType: "OWNER",
      irrigationType: "BOREWELL",
      provenance: "FARMER_ENTERED",
    });

    platform.addCropRecord(farmerId, farmerId, {
      plotId: plot1.id,
      season: "KHARIF",
      year: 2026,
      cropCode: "RAGI",
      cropNameEn: "Ragi (Finger Millet)",
      cropNameKn: "ರಾಗಿ",
      sownAreaHectares: 1.0,
      isInsuredUnderPmfby: false,
      provenance: "FARMER_ENTERED",
    });

    const matches = await platform.evaluateSchemesForFarmer(
      farmerId,
      farmerId,
      "kn"
    );
    expect(matches.length).toBe(3);

    // Second call uses cached LLM explanation
    const matchesCached = await platform.evaluateSchemesForFarmer(
      farmerId,
      farmerId,
      "kn"
    );
    expect(matchesCached[0]!.aiExplanation.cached).toBe(true);

    // Test What-If Simulator
    const whatIf = platform.simulateWhatIfEligibility(farmerId, farmerId, {
      livestockTypes: ["DAIRY"],
    });
    const dairySim = whatIf.find(
      (s) => s.schemeCode === "DEMO-ALLIED-DAIRY-03"
    );
    // No livestock data entered => unknown, never guessed (AGENTS.md rule 2)
    expect(dairySim?.currentStatus).toBe("NEEDS_VERIFICATION");
    expect(dairySim?.simulatedStatus).toBe("LIKELY_ELIGIBLE");

    // Test Maker-Checker enforcement
    const reviewerA = await platform.signupFarmer({
      email: "rev.a@agro.example",
      password: "ReviewerAPassword123!",
      fullName: "Reviewer A",
      preferredLanguage: "en",
      acceptTermsVersion: "v1.0",
      acceptPrivacyVersion: "v1.0",
      acceptDataProcessingVersion: "v1.0",
    });
    const reviewerB = await platform.signupFarmer({
      email: "rev.b@agro.example",
      password: "ReviewerBPassword123!",
      fullName: "Reviewer B",
      preferredLanguage: "en",
      acceptTermsVersion: "v1.0",
      acceptPrivacyVersion: "v1.0",
      acceptDataProcessingVersion: "v1.0",
    });
    platform.requireUser(reviewerA.userId).roles = ["SCHEME_REVIEWER"];
    platform.requireUser(reviewerB.userId).roles = ["SCHEME_REVIEWER"];

    const draft = platform.createSchemeDraft(reviewerA.userId, {
      schemeCode: "DEMO-MAKER-CHECKER",
      departmentName: "DEMO Dept",
      titleEn: "[DEMO] Test Scheme",
      titleKn: "[ಡೆಮೊ] ಪರೀಕ್ಷಾ ಯೋಜನೆ",
      summaryEn: "Summary",
      summaryKn: "ಸಾರಾಂಶ",
      benefitsDescriptionEn: "Benefit",
      benefitsDescriptionKn: "ಸೌಲಭ್ಯ",
      requiredDocumentsEn: ["RTC"],
      requiredDocumentsKn: ["ಪಹಣಿ"],
      applicationStepsEn: ["Apply"],
      applicationStepsKn: ["ಅರ್ಜಿ ಸಲ್ಲಿಸಿ"],
      ruleTree: {
        id: "r1",
        fact: "state",
        op: "eq",
        value: "Karnataka",
        descriptionEn: "In Karnataka",
        descriptionKn: "ಕರ್ನಾಟಕದಲ್ಲಿರಬೇಕು",
      },
      sourceUrl: "https://raitamitra.karnataka.gov.in/",
      isMock: true,
    });

    // Author (Reviewer A) tries to approve own version -> 403 Maker-Checker violation
    expect(() =>
      platform.approveAndPublishSchemeVersion(reviewerA.userId, draft.id)
    ).toThrow(/Maker-Checker violation/);

    // Different reviewer (Reviewer B) approves and publishes -> succeeds
    const published = platform.approveAndPublishSchemeVersion(
      reviewerB.userId,
      draft.id
    );
    expect(published.status).toBe("PUBLISHED");
    expect(published.approvedById).toBe(reviewerB.userId);
  });

  it("serves HTTP endpoints (/health, /ready, /docs, /api/v1/schemes/catalogue) with security headers", async () => {
    const { server } = createApiServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const addr = server.address();
    const port = typeof addr === "object" && addr ? addr.port : 0;

    try {
      const healthRes = await fetch(`http://127.0.0.1:${port}/health`);
      expect(healthRes.status).toBe(200);
      expect(healthRes.headers.get("x-content-type-options")).toBe("nosniff");
      const healthBody = (await healthRes.json()) as { status: string };
      expect(healthBody.status).toBe("ok");

      const catalogueRes = await fetch(
        `http://127.0.0.1:${port}/api/v1/schemes/catalogue`
      );
      expect(catalogueRes.status).toBe(200);
      const catalogueBody = (await catalogueRes.json()) as {
        schemes: Array<{ isMock: boolean }>;
      };
      expect(catalogueBody.schemes.length).toBeGreaterThanOrEqual(3);
      expect(catalogueBody.schemes.every((s) => s.isMock === true)).toBe(true);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("rejects breached passwords on signup", async () => {
    const platform = new AgroPlatformService();
    await expect(
      platform.signupFarmer({
        email: "breach@agro.example",
        password: "password123",
        fullName: "Test User",
        preferredLanguage: "en",
        acceptTermsVersion: "v1.0",
        acceptPrivacyVersion: "v1.0",
        acceptDataProcessingVersion: "v1.0",
      })
    ).rejects.toThrow(ValidationError);
  });

  it("handles Crop Loss Claim Rescue Room, Photo Proof Pack, Receipt Vault, and negative authorization", async () => {
    const platform = new AgroPlatformService();
    const farmerA = platform.getOrCreateDemoSession("FARMER");
    const farmerB = await platform.signupFarmer({
      email: "intruder@agro.example",
      password: "IntruderStrongPass123!",
      fullName: "Intruder Farmer",
      preferredLanguage: "en",
      acceptTermsVersion: "v1.0",
      acceptPrivacyVersion: "v1.0",
      acceptDataProcessingVersion: "v1.0",
    });

    const passport = platform.getFarmerPassport(
      farmerA.user.id,
      farmerA.user.id
    );
    const plotId = passport.plots[0]!.id;

    // Negative auth test: Farmer B cannot file a crop loss claim on Farmer A's plot
    expect(() =>
      platform.createCropLossClaim(farmerB.userId, farmerA.user.id, {
        plotId,
        cropCode: "RAGI",
        damageDateIso: "2026-10-18T08:00:00.000Z",
        causeOfDamage: "EXCESS_RAINFALL",
        growthStage: "STANDING_CROP",
      })
    ).toThrow(AuthorizationError);

    // Farmer A creates claim
    const claim = platform.createCropLossClaim(
      farmerA.user.id,
      farmerA.user.id,
      {
        plotId,
        cropCode: "RAGI",
        damageDateIso: "2026-10-18T08:00:00.000Z",
        causeOfDamage: "EXCESS_RAINFALL",
        growthStage: "STANDING_CROP",
      }
    );
    expect(claim.claimCategory).toBe("LOCALIZED_CALAMITY");
    expect(claim.isDeadlineVerified).toBe(false);
    expect(claim.reportingDeadlineNoteEn).toContain("Deadline not verified");

    // Add 4 sharp geo-tagged photos to reach 100% readiness
    for (const angle of [
      "WIDE_FIELD",
      "CLOSE_UP_DAMAGE",
      "LANDMARK_SURVEY",
      "RECEIPT_OR_TAG",
    ] as const) {
      platform.addClaimEvidencePhoto(
        farmerA.user.id,
        farmerA.user.id,
        claim.id,
        {
          angle,
          latitude: 12.1145,
          longitude: 76.3211,
          gpsAccuracyMeters: 4.2,
          blurVarianceScore: 185,
        }
      );
    }

    const submitted = platform.submitClaimPackage(
      farmerA.user.id,
      farmerA.user.id,
      claim.id,
      {}
    );
    expect(submitted.claim.status).toBe("SUBMITTED");
    expect(submitted.claim.readinessScore).toBe(100);
    expect(submitted.receipt.acknowledgementNumber).toMatch(/^DEMO-ACK-/);
    expect(submitted.receipt.isMock).toBe(true);
  });

  it("handles Document X-Ray, Rejection Repair Studio, Scam Shield, Benefits Ledger, CSC Tokens, WhatsApp Webhook, and Admin Overview", async () => {
    const platform = new AgroPlatformService();
    const farmer = platform.getOrCreateDemoSession("FARMER");
    const csc = platform.getOrCreateDemoSession("CSC_OPERATOR");
    const admin = platform.getOrCreateDemoSession("PLATFORM_ADMIN");

    // 1. Document X-Ray detects name mismatch vs farmer profile
    const xray = platform.runDocumentXRayForFarmer(
      farmer.user.id,
      farmer.user.id,
      {
        ownerNameOnRtc: "Sivana Gouda",
        surveyNumberOnRtc: "142/2A",
        areaHectaresOnRtc: 1.0117,
        recordedCropOnRtc: "RAGI",
        ocrConfidence: 0.94,
        farmerConfirmedExtraction: true,
      }
    );
    expect(xray.overallReady).toBe(false);
    expect(xray.fields.find((f) => f.field === "fullName")?.status).toBe(
      "MISMATCH"
    );

    // 2. Rejection Repair Studio classifies NPCI DBT inactive notice
    const rejection = platform.analyzeRejectionNotice(
      farmer.user.id,
      farmer.user.id,
      "Application payment failed: Bank NPCI DBT mapper inactive"
    );
    expect(rejection.category).toBe("BANK_NPCI_INACTIVE");
    expect(rejection.officerCallScriptKn).toContain("NPCI");

    // 3. Scam Shield flags .apk and UPI PIN traps and logs anonymized report
    const scam = platform.inspectAndReportScam(
      farmer.user.id,
      "Install PM_Kisan_Bonus.apk and enter UPI PIN to claim Rs 6000"
    );
    expect(scam.verdict).toBe("LOOKS_DANGEROUS");
    expect(scam.reportId).toBeTruthy();

    // 4. Farm Expense Ledger & Benefits Pipeline
    platform.addFarmExpense(farmer.user.id, farmer.user.id, {
      category: "SEEDS",
      amountInr: 2400,
      season: "KHARIF",
      note: "Certified Ragi seeds from RSK",
      provenance: "FARMER_ENTERED",
    });
    const benefits = platform.getFarmerBenefitsAndLedger(
      farmer.user.id,
      farmer.user.id
    );
    expect(benefits.isMock).toBe(true);
    expect(benefits.totalExpensesInr).toBe(2400);

    // 5. CSC Visit Token & CSC Operator Workspace
    const token = platform.createCscVisitToken(farmer.user.id, farmer.user.id, {
      centreName: "H.D. Kote RSK / CSC",
      purpose: "RTC Name Affidavit & Drip Irrigation Filing",
    });
    expect(token.tokenCode).toMatch(/^KA-CSC-/);

    // Negative auth: Farmer cannot access CSC operator workspace
    expect(() => platform.getCscOperatorWorkspace(farmer.user.id)).toThrow(
      AuthorizationError
    );
    const cscWorkspace = platform.getCscOperatorWorkspace(csc.user.id);
    expect(cscWorkspace.consentedFarmers.length).toBeGreaterThanOrEqual(1);
    expect(cscWorkspace.tokensQueue.length).toBe(1);

    // 6. WhatsApp wamid idempotency deduplication, CSC handoff (option 7), and STOP opt-out
    const wa1 = platform.handleWhatsAppInbound({
      wamid: "wamid.HBgMOTE5ODc2NTQzMjEwFQIAERgSQTFCMkMz",
      fromPhone: "+919876543210",
      text: "7",
      farmerIdOptional: farmer.user.id,
    });
    expect(wa1.deduplicated).toBe(false);
    expect(wa1.record.handedOffToCsc).toBe(true);

    const waDup = platform.handleWhatsAppInbound({
      wamid: "wamid.HBgMOTE5ODc2NTQzMjEwFQIAERgSQTFCMkMz",
      fromPhone: "+919876543210",
      text: "7",
    });
    expect(waDup.deduplicated).toBe(true);

    const waStop = platform.handleWhatsAppInbound({
      wamid: "wamid.STOP_TEST_01",
      fromPhone: "+919876543210",
      text: "STOP",
    });
    expect(waStop.record.optedOut).toBe(true);

    // 6b. Twilio WhatsApp Direct Dispatch & Direct Link Generation
    const waReport = await platform.sendWhatsAppReport({
      userId: farmer.user.id,
      phone: "9876543210",
      reportText: "Agro AI Farmer Report: 3 Eligible Schemes",
    });
    expect(waReport.to).toBe("whatsapp:+919876543210");
    expect(waReport.directWhatsAppUrl).toContain("https://api.whatsapp.com/send?phone=919876543210");
    expect(waReport.directWhatsAppUrl).toContain(encodeURIComponent("Agro AI Farmer Report: 3 Eligible Schemes"));
    expect(waReport.messageSid).toBeDefined();

    // 7. Admin Overview (Negative auth for Farmer, allowed for Admin)
    expect(() => platform.getAdminOverview(farmer.user.id)).toThrow(
      AuthorizationError
    );
    const overview = platform.getAdminOverview(admin.user.id);
    expect(overview.metrics.publishedSchemesCount).toBeGreaterThanOrEqual(3);
    expect(overview.metrics.scamReportsCount).toBe(1);
    expect(overview.languagesRegistry.length).toBe(23);
  });

  it("enforces Deadline Guardian quiet hours, opt-out, unverified deadline suppression, and deduplication", () => {
    const platform = new AgroPlatformService();
    const farmer = platform.getOrCreateDemoSession("FARMER");

    // 1. Evaluate during quiet hours (23:00 IST -> DEFERRED_QUIET_HOURS for verified, SUPPRESSED_UNVERIFIED for unverified)
    const quietEval = platform.triggerDeadlineGuardianEvaluation(
      farmer.user.id,
      farmer.user.id,
      23
    );
    expect(
      quietEval.newlyProcessed.some((d) => d.status === "DEFERRED_QUIET_HOURS")
    ).toBe(true);
    expect(
      quietEval.newlyProcessed.some((d) => d.status === "SUPPRESSED_UNVERIFIED")
    ).toBe(true);

    // 2. Evaluate during active hours (14:00 IST -> DELIVERED for verified deadline)
    const activeEval1 = platform.triggerDeadlineGuardianEvaluation(
      farmer.user.id,
      farmer.user.id,
      14
    );
    const deliveredCount1 = activeEval1.newlyProcessed.filter(
      (d) => d.status === "DELIVERED"
    ).length;
    expect(deliveredCount1).toBe(1);

    // 3. Re-running during active hours does NOT duplicate the already-delivered reminder!
    const activeEval2 = platform.triggerDeadlineGuardianEvaluation(
      farmer.user.id,
      farmer.user.id,
      14
    );
    const deliveredCount2 = activeEval2.newlyProcessed.filter(
      (d) => d.status === "DELIVERED"
    ).length;
    expect(deliveredCount2).toBe(0);
  });

  it(
    "tracks manual farmer & CSC status updates with full audit trail, blocks malware uploads, and requires confirmation before Agro GPT writes",
    async () => {
    const platform = new AgroPlatformService();
    const farmer = platform.getOrCreateDemoSession("FARMER");
    const csc = platform.getOrCreateDemoSession("CSC_OPERATOR");
    const unconsentedFarmer = await platform.signupFarmer({
      email: "other.farmer@agro.example",
      password: "OtherFarmerPass123!",
      fullName: "Other Farmer",
      preferredLanguage: "en",
      acceptTermsVersion: "v1.0",
      acceptPrivacyVersion: "v1.0",
      acceptDataProcessingVersion: "v1.0",
    });

    // 1. Status Tracker: Farmer creates case, CSC Operator updates it with audit history
    const statusCase = platform.createStatusTrackingCase(
      farmer.user.id,
      farmer.user.id,
      {
        caseType: "SCHEME_APPLICATION",
        referenceNumber: "KA-DRIP-2026-5501",
        schemeOrPolicyTitle: "Karnataka Micro-Irrigation Assistance",
        initialStatus: "SUBMITTED_MANUALLY",
        note: "Submitted at H.D. Kote RSK counter",
      }
    );
    expect(statusCase.sourceMode).toBe("MANUAL_UPDATE");

    // Unauthorized farmer cannot update this case
    expect(() =>
      platform.updateStatusTrackingCaseManually(
        unconsentedFarmer.userId,
        farmer.user.id,
        statusCase.id,
        {
          status: "UNDER_REVIEW_REPORTED",
          note: "Unauthorized attempt",
        }
      )
    ).toThrow(AuthorizationError);

    // Consented CSC Operator updates the case -> records CSC_OPERATOR role & timestamp in statusHistory
    const updatedCase = platform.updateStatusTrackingCaseManually(
      csc.user.id,
      farmer.user.id,
      statusCase.id,
      {
        status: "UNDER_REVIEW_REPORTED",
        note: "Verified physical RTC copy at CSC desk",
      }
    );
    expect(updatedCase.currentStatus).toBe("UNDER_REVIEW_REPORTED");
    expect(updatedCase.statusHistory.length).toBe(2);
    expect(updatedCase.statusHistory[1]?.enteredByRole).toContain(
      "CSC_OPERATOR"
    );

    // 2. Consent-gated Private Document Vault & Malware Scan
    expect(() =>
      platform.uploadConsentGatedDocument(farmer.user.id, farmer.user.id, {
        fileName: "PM_Kisan_Trap.apk",
        mimeType: "application/pdf",
        sizeBytes: 2048,
        documentType: "RTC_PAHANI",
        contentPreviewOrBase64: "apk payload",
        consentGranted: true,
      })
    ).toThrow(ValidationError);

    const cleanUpload = platform.uploadConsentGatedDocument(
      farmer.user.id,
      farmer.user.id,
      {
        fileName: "RTC_Sy142_2A.pdf",
        mimeType: "application/pdf",
        sizeBytes: 48_000,
        documentType: "RTC_PAHANI",
        contentPreviewOrBase64: "Valid RTC Pahani PDF content",
        consentGranted: true,
      }
    );
    expect(cleanUpload.document.malwareScanStatus).toBe("CLEAN");
    expect(cleanUpload.signedAccessUrl).toContain("token=");

    // 3. Agro GPT Voice/Chat Assistant: Grounded response + Confirmation-Before-Write gate
    const chatRes = await platform.chatWithAgroGpt(
      farmer.user.id,
      farmer.user.id,
      {
        message: "Please save my application reference number PMFBY-2026-99123",
        language: "en",
        inputMode: "VOICE",
      }
    );
    expect(chatRes.citedSchemes.length).toBeGreaterThanOrEqual(3);
    expect(chatRes.pendingConfirmation).not.toBeNull();
    expect(chatRes.pendingConfirmation?.actionType).toBe("CREATE_STATUS_CASE");

    // Case is NOT created until farmer confirms the token!
    const casesBefore = platform.listStatusTrackingCases(
      farmer.user.id,
      farmer.user.id
    );
    expect(
      casesBefore.some((c) => c.referenceNumber === "PMFBY-2026-99123")
    ).toBe(false);

    // Farmer confirms the action -> Case is now saved and audited
    const confirmed = platform.confirmAgroGptAction(
      farmer.user.id,
      farmer.user.id,
      chatRes.pendingConfirmation!.confirmationToken
    );
    expect(confirmed.executed).toBe(true);
    const casesAfter = platform.listStatusTrackingCases(
      farmer.user.id,
      farmer.user.id
    );
    expect(
      casesAfter.some((c) => c.referenceNumber === "PMFBY-2026-99123")
    ).toBe(true);

    // 4. Live Integrations Status check
    const intStatus = platform.getIntegrationsStatus();
    expect(intStatus.integrations.length).toBeGreaterThanOrEqual(5);
  }, 20000);

  it("Production Guard: blocks demo/seed data, demo sessions, OTP leaks, and fabricated claim receipts in NODE_ENV=production", async () => {
    const prodPlatform = new AgroPlatformService({ NODE_ENV: "production" });

    // 1. Zero seed/demo schemes loaded in production startup
    expect(prodPlatform.listAllSchemeVersions().length).toBe(0);

    // 2. Demo session bootstrap is strictly blocked with 403
    expect(() => prodPlatform.getOrCreateDemoSession("FARMER")).toThrow(
      AuthorizationError
    );

    // 3. OTP request in production never leaks demoOtpPreview in the response
    const otpRes = await prodPlatform.requestPhoneOtp("+919845011223", "kn");
    expect(otpRes.sent).toBe(true);
    expect(otpRes.demoOtpPreview).toBeUndefined();

    // 4. Real signup + login in production has empty benefitPipeline (no fake ₹18,500 / ₹42,000 rows)
    const signup = await prodPlatform.signupFarmer({
      email: "real.farmer@karnataka.in",
      password: "StrongFarmerPassword2026!",
      fullName: " Basavaraj Patil ",
      preferredLanguage: "kn",
      acceptTermsVersion: "v1.0",
      acceptPrivacyVersion: "v1.0",
      acceptDataProcessingVersion: "v1.0",
    });
    prodPlatform.verifyEmail(signup.verificationToken);
    const benefits = prodPlatform.getFarmerBenefitsAndLedger(
      signup.userId,
      signup.userId
    );
    expect(benefits.isMock).toBe(false);
    expect(benefits.benefitPipeline).toHaveLength(0);
    expect(benefits.truthDisclosures.bankLinkStatus).toBe(
      "UNAVAILABLE_MANUAL_CHECK"
    );

    // 5. Claim submission in production refuses to fabricate a DEMO-ACK number
    const plot = prodPlatform.addFarmPlot(signup.userId, signup.userId, {
      plotName: "Survey 88/1",
      surveyNumber: "88/1",
      districtCode: "KA-DHW",
      talukCode: "KA-DHW-NVL",
      villageCode: "KA-DHW-NVL-001",
      areaValue: 2,
      areaUnit: "ACRE",
      ownershipType: "OWNER",
      irrigationType: "RAINFED",
      provenance: "FARMER_ENTERED",
    });
    const claim = prodPlatform.createCropLossClaim(signup.userId, signup.userId, {
      plotId: plot.id,
      cropCode: "TUR",
      damageDateIso: new Date().toISOString(),
      causeOfDamage: "EXCESS_RAINFALL",
      growthStage: "STANDING_CROP",
    });
    expect(() =>
      prodPlatform.submitClaimPackage(signup.userId, signup.userId, claim.id, {})
    ).toThrow(ValidationError);

    // Providing a real user-entered acknowledgement number succeeds
    const validSubmit = prodPlatform.submitClaimPackage(
      signup.userId,
      signup.userId,
      claim.id,
      {
        portalName: "Samrakshane Karnataka",
        acknowledgementNumber: "SAM-2026-REAL-88912",
      }
    );
    expect(validSubmit.receipt.acknowledgementNumber).toBe("SAM-2026-REAL-88912");
  });

  it("Data Freshness & Source Verification: flags stale (>30 days) or unverified sources in Scheme Matcher & Agro GPT", async () => {
    const platform = new AgroPlatformService();
    const admin = platform.getOrCreateDemoSession("PLATFORM_ADMIN");
    const reviewer = platform.getOrCreateDemoSession("SCHEME_REVIEWER");
    const farmer = platform.getOrCreateDemoSession("FARMER");

    const draft = platform.createSchemeDraft(admin.user.id, {
      schemeCode: "KA-FRESHNESS-TEST-01",
      departmentName: "Department of Agriculture Karnataka",
      titleEn: "Verified Paddy Seed Subsidy",
      titleKn: "ಪರಿಶೀಲಿಸಿದ ಭತ್ತದ ಬೀಜ ಸಹಾಯಧನ",
      summaryEn: "Subsidy for certified paddy seeds.",
      summaryKn: "ಪ್ರಮಾಣಿತ ಭತ್ತದ ಬೀಜಗಳಿಗೆ ಸಹಾಯಧನ.",
      benefitsDescriptionEn: "50% seed cost support.",
      benefitsDescriptionKn: "ಶೇ. 50 ಬೀಜ ವೆಚ್ಚ ಸಹಾಯಧನ.",
      requiredDocumentsEn: ["RTC Pahani"],
      requiredDocumentsKn: ["ಪಹಣಿ (RTC)"],
      applicationStepsEn: ["Apply at RSK"],
      applicationStepsKn: ["ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರದಲ್ಲಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ"],
      ruleTree: {
        all: [
          {
            id: "r1",
            fact: "state",
            op: "eq",
            value: "Karnataka",
            descriptionEn: "State is Karnataka",
            descriptionKn: "ಕರ್ನಾಟಕ ರಾಜ್ಯ",
          },
        ],
      },
      sourceUrl: "https://raitamitra.karnataka.gov.in/seed-subsidy",
      isMock: false,
    });

    // Unverified before approval
    const unverifiedMeta = platform.computeSchemeFreshness(draft);
    expect(unverifiedMeta.freshnessStatus).toBe("UNVERIFIED_SOURCE");

    // Approve & publish -> VERIFIED_FRESH
    const published = platform.approveAndPublishSchemeVersion(
      reviewer.user.id,
      draft.id
    );
    const freshMeta = platform.computeSchemeFreshness(published);
    expect(freshMeta.freshnessStatus).toBe("VERIFIED_FRESH");

    // Simulate 45 days passing -> STALE_REVERIFY_REQUIRED
    const futureMs = Date.now() + 45 * 24 * 3600 * 1000;
    const staleMeta = platform.computeSchemeFreshness(published, futureMs);
    expect(staleMeta.freshnessStatus).toBe("STALE_REVERIFY_REQUIRED");
    expect(staleMeta.warningMessageEn).toContain("45 days ago");

    // Verify Hindi (hi) grounded response in Agro GPT
    const hiChat = await platform.chatWithAgroGpt(
      farmer.user.id,
      farmer.user.id,
      {
        message: "मेरे लिए कौन सी योजनाएं उपलब्ध हैं?",
        language: "hi",
        inputMode: "TEXT",
      }
    );
    expect(hiChat.replyLanguage).toBe("hi");
    expect(hiChat.replyText).toContain("नमस्कार");
  }, 20000);

  it("Reliability Guard & Verified Backup/Restore: enforces timeouts, idempotent-only retries, circuit breaker, and SHA-256 backup verification", async () => {
    const platform = new AgroPlatformService();
    const admin = platform.getOrCreateDemoSession("PLATFORM_ADMIN");
    const farmer = platform.getOrCreateDemoSession("FARMER");

    // 1. Idempotent operation retries transient failures and succeeds
    let idempotentCalls = 0;
    const recovered = await platform.executeWithReliabilityGuard(
      "bhoomi_read_adapter",
      async () => {
        idempotentCalls += 1;
        if (idempotentCalls < 3) {
          throw new Error("Transient 503");
        }
        return "RTC_OK";
      },
      { isIdempotent: true, maxAttempts: 3, timeoutMs: 500 }
    );
    expect(recovered).toBe("RTC_OK");
    expect(idempotentCalls).toBe(3);

    // 2. Non-idempotent write operation NEVER retries on failure
    let nonIdempotentCalls = 0;
    await expect(
      platform.executeWithReliabilityGuard(
        "portal_claim_submit",
        async () => {
          nonIdempotentCalls += 1;
          throw new Error("Submission gateway error");
        },
        { isIdempotent: false, maxAttempts: 3, timeoutMs: 500 }
      )
    ).rejects.toThrow(ValidationError);
    expect(nonIdempotentCalls).toBe(1);

    // 3. Circuit breaker opens after 3 consecutive provider failures
    for (let i = 0; i < 3; i++) {
      await expect(
        platform.executeWithReliabilityGuard(
          "flaky_gov_portal",
          async () => {
            throw new Error("Connection reset");
          },
          { isIdempotent: false, timeoutMs: 200 }
        )
      ).rejects.toThrow(ValidationError);
    }
    const breaker = platform.getCircuitBreakerStatus("flaky_gov_portal");
    expect(breaker.consecutiveFailures).toBe(3);
    expect(breaker.openedUntilIso).not.toBeNull();

    // Subsequent call fails fast with CIRCUIT_BREAKER_OPEN
    await expect(
      platform.executeWithReliabilityGuard(
        "flaky_gov_portal",
        async () => "should_not_run",
        { isIdempotent: true }
      )
    ).rejects.toThrow(/CIRCUIT_BREAKER_OPEN/);

    // 4. Verified Backup & Restore with SHA-256 integrity validation
    platform.createStatusTrackingCase(farmer.user.id, farmer.user.id, {
      caseType: "SCHEME_APPLICATION",
      referenceNumber: "BACKUP-TEST-991",
      schemeOrPolicyTitle: "Micro-Irrigation",
    });

    const backup = platform.createVerifiedBackupSnapshot(admin.user.id);
    expect(backup.sha256Checksum).toHaveLength(64);

    // Tampered backup is rejected
    expect(() =>
      platform.restoreVerifiedBackupSnapshot(admin.user.id, {
        sha256Checksum: backup.sha256Checksum,
        dataJson: backup.dataJson + " ",
      })
    ).toThrow(/SHA-256 checksum mismatch/);

    // Valid backup restores cleanly
    const restored = platform.restoreVerifiedBackupSnapshot(
      admin.user.id,
      backup
    );
    expect(restored.restored).toBe(true);
  });

  it("Dual Experience Mode (AI_PREDICTION vs NORMAL_APP): persists mode, preserves farmer records across switches, enforces RBAC, and never fabricates mandi/weather/disease data", async () => {
    const platform = new AgroPlatformService();
    const farmer = platform.getOrCreateDemoSession("FARMER");
    const admin = platform.getOrCreateDemoSession("PLATFORM_ADMIN");

    // 1. Default intelligence summary defaults to AI_PREDICTION and contains real plot insights
    const initialSummary = await platform.getAgriculturalIntelligenceSummary(
      farmer.user.id,
      farmer.user.id,
      "en"
    );
    expect(initialSummary.experienceMode).toBe("AI_PREDICTION");
    expect(initialSummary.deterministicCropInsights.length).toBeGreaterThanOrEqual(
      1
    );

    // 2. Verify honest UNAVAILABLE status for Mandi, Weather, and Vision Leaf Disease (never fabricated)
    const mandiCap = initialSummary.capabilities.find(
      (c) => c.id === "mandi_price_forecast"
    );
    const weatherCap = initialSummary.capabilities.find(
      (c) => c.id === "hyperlocal_weather"
    );
    const leafCap = initialSummary.capabilities.find(
      (c) => c.id === "leaf_disease_vision"
    );
    expect(mandiCap?.status).toBe("UNAVAILABLE_AWAITING_AGMARKNET_API");
    expect(weatherCap?.status).toBe("UNAVAILABLE_AWAITING_IMD_API");
    expect(leafCap?.status).toBe("UNAVAILABLE_AWAITING_VISION_MODEL");

    // 3. Add a tracking case while in AI_PREDICTION mode
    platform.createStatusTrackingCase(farmer.user.id, farmer.user.id, {
      caseType: "SCHEME_APPLICATION",
      referenceNumber: "MODE-SWITCH-7741",
      schemeOrPolicyTitle: "Drip Irrigation Subsidy",
    });

    // 4. Switch to NORMAL_APP mode -> preserves same user account, plots, crops, and tracking cases
    const switchedToNormal = platform.updateExperienceMode(
      farmer.user.id,
      farmer.user.id,
      "NORMAL_APP"
    );
    expect(switchedToNormal.experienceMode).toBe("NORMAL_APP");

    const passportInNormal = platform.getFarmerPassport(
      farmer.user.id,
      farmer.user.id
    );
    expect(passportInNormal.profile.experienceMode).toBe("NORMAL_APP");
    expect(passportInNormal.plots.length).toBeGreaterThanOrEqual(1);
    const casesInNormal = platform.listStatusTrackingCases(
      farmer.user.id,
      farmer.user.id
    );
    expect(
      casesInNormal.some((c) => c.referenceNumber === "MODE-SWITCH-7741")
    ).toBe(true);

    // 5. Switch back to AI_PREDICTION mode -> still preserves all data
    const switchedBackToAi = platform.updateExperienceMode(
      farmer.user.id,
      farmer.user.id,
      "AI_PREDICTION"
    );
    expect(switchedBackToAi.experienceMode).toBe("AI_PREDICTION");

    // 6. Negative Authorization Test: Admin or another user cannot change farmer's experience mode or read intelligence summary without share
    expect(() =>
      platform.updateExperienceMode(
        admin.user.id,
        farmer.user.id,
        "NORMAL_APP"
      )
    ).toThrow(AuthorizationError);
    await expect(
      platform.getAgriculturalIntelligenceSummary(
        admin.user.id,
        farmer.user.id,
        "en"
      )
    ).rejects.toThrow(AuthorizationError);
  });
});
