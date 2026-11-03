import { describe, it, expect } from "vitest";
import {
  SCHEDULED_INDIAN_LANGUAGES,
  compareDocumentXRay,
  inspectSuspiciousMessage,
  SUBSIDY_BEFORE_PURCHASE_CATALOGUE,
} from "./innovations.js";

describe("@agro/shared — Next-Gen Innovations (Languages, Document X-Ray, Scam Shield, Subsidy Guide)", () => {
  it("includes all 22 Scheduled Indian Languages plus English (23 total) with honest capability flags", () => {
    expect(SCHEDULED_INDIAN_LANGUAGES.length).toBe(23);
    const kn = SCHEDULED_INDIAN_LANGUAGES.find((l) => l.code === "kn");
    expect(kn?.nativeName).toBe("ಕನ್ನಡ");
    expect(kn?.tier).toBe("LAUNCH");

    const ur = SCHEDULED_INDIAN_LANGUAGES.find((l) => l.code === "ur");
    expect(ur?.isRtl).toBe(true);
  });

  it("detects RTC / Pahani mismatches in Document X-Ray and enforces farmer confirmation", () => {
    const mismatchRes = compareDocumentXRay({
      farmerProfile: {
        fullName: "Shivanna Gowda",
        surveyNumber: "142/2A",
        areaHectares: 1.01,
        cropCode: "RAGI",
      },
      extractedRtcRecord: {
        ownerNameOnRtc: "Shivanna K",
        surveyNumberOnRtc: "142/2B",
        areaHectaresOnRtc: 1.01,
        recordedCropOnRtc: "PADDY",
        ocrConfidence: 0.95,
        farmerConfirmedExtraction: true,
      },
    });

    expect(mismatchRes.overallReady).toBe(false);
    expect(
      mismatchRes.fields.find((f) => f.field === "surveyNumber")?.status
    ).toBe("MISMATCH");
    expect(
      mismatchRes.fields.find((f) => f.field === "areaHectares")?.status
    ).toBe("MATCH");
  });

  it("flags APK and OTP/PIN phishing in Scam Shield and never labels any message 'safe'", () => {
    const dangerous = inspectSuspiciousMessage(
      "Download http://free-pmkisan.xyz/bonus.apk and enter your UPI PIN and Bank OTP"
    );
    expect(dangerous.verdict).toBe("LOOKS_DANGEROUS");
    expect(dangerous.reasonsEn.length).toBeGreaterThanOrEqual(2);

    const officialDomainMsg = inspectSuspiciousMessage(
      "Check guidelines at https://raitamitra.karnataka.gov.in"
    );
    expect(officialDomainMsg.verdict).toBe(
      "MATCHES_OFFICIAL_DOMAIN_CHECK_CAREFULLY"
    );
  });

  it("provides prior-approval warnings in Subsidy Before Purchase catalogue", () => {
    expect(SUBSIDY_BEFORE_PURCHASE_CATALOGUE.length).toBeGreaterThanOrEqual(2);
    expect(
      SUBSIDY_BEFORE_PURCHASE_CATALOGUE[0]?.priorApprovalRequired
    ).toBe(true);
  });
});
