import { describe, it, expect } from "vitest";
import {
  calculateCropInsurancePremium,
  evaluateSchemeEligibility,
  SchemeRuleNodeSchema,
  type SchemeRuleNode,
  type FarmerFactSet,
} from "./index.js";

describe("@agro/rules-engine — deterministic table-driven tests", () => {
  const demoRuleTree: SchemeRuleNode = {
    all: [
      {
        id: "r-state",
        fact: "state",
        op: "eq",
        value: "Karnataka",
        descriptionEn: "Farmer must reside in Karnataka",
        descriptionKn: "ರೈತರು ಕರ್ನಾಟಕದ ನಿವಾಸಿಯಾಗಿರಬೇಕು",
      },
      {
        id: "r-ownership",
        fact: "ownershipTypes",
        op: "in",
        value: ["OWNER", "JOINT_FAMILY"],
        descriptionEn: "Must hold cultivable land as owner or joint family",
        descriptionKn: "ಸ್ವಂತ ಅಥವಾ ಅವಿಭಕ್ತ ಕುಟುಂಬದ ಜಮೀನು ಹೊಂದಿರಬೇಕು",
        requiresOfficialVerification: true,
      },
      {
        id: "r-area",
        fact: "totalLandHectares",
        op: "between",
        value: [0.1, 5.0],
        descriptionEn: "Total cultivable land between 0.1 and 5.0 hectares",
        descriptionKn: "ಒಟ್ಟು ಕೃಷಿ ಭೂಮಿ 0.1 ರಿಂದ 5.0 ಹೆಕ್ಟೇರ್ ಒಳಗಿರಬೇಕು",
      },
      {
        any: [
          {
            id: "r-crop",
            fact: "crops",
            op: "in",
            value: ["PADDY", "RAGI", "TUR", "MAIZE"],
            descriptionEn: "Grows eligible notified food grain crop",
            descriptionKn: "ಅಧಿಸೂಚಿತ ಆಹಾರ ಧಾನ್ಯ ಬೆಳೆಯನ್ನು ಬೆಳೆಯುತ್ತಿರಬೇಕು",
          },
          {
            id: "r-min-plots",
            fact: "plotCount",
            op: "gte",
            value: 2,
            descriptionEn: "Has at least 2 registered plots",
            descriptionKn: "ಕನಿಷ್ಠ 2 ನೋಂದಾಯಿತ ಜಮೀನು ತಾಕುಗಳನ್ನು ಹೊಂದಿರಬೇಕು",
          },
        ],
      },
      {
        not: {
          id: "r-excluded-category",
          fact: "farmerCategory",
          op: "eq",
          value: "LARGE",
          descriptionEn: "Large category farmers are excluded",
          descriptionKn: "ದೊಡ್ಡ ವರ್ಗದ ರೈತರಿಗೆ ಅನ್ವಯಿಸುವುದಿಲ್ಲ",
        },
      },
    ],
  };

  it("validates DSL rule tree with SchemeRuleNodeSchema", () => {
    const parsed = SchemeRuleNodeSchema.safeParse(demoRuleTree);
    expect(parsed.success).toBe(true);
  });

  const testCases: Array<{
    name: string;
    facts: FarmerFactSet;
    officiallyVerified: boolean;
    expectedStatus:
      | "LIKELY_ELIGIBLE"
      | "POTENTIALLY_ELIGIBLE"
      | "NOT_ELIGIBLE"
      | "NEEDS_VERIFICATION";
    expectedFailedCount: number;
    expectedMissingCount: number;
  }> = [
    {
      name: "all conditions pass and officially verified => LIKELY_ELIGIBLE",
      facts: {
        state: "Karnataka",
        ownershipTypes: ["OWNER"],
        totalLandHectares: 1.5,
        crops: ["RAGI"],
        plotCount: 1,
        farmerCategory: "SMALL",
      },
      officiallyVerified: true,
      expectedStatus: "LIKELY_ELIGIBLE",
      expectedFailedCount: 1, // plotCount < 2 in the 'any' branch is fine because crops passed
      expectedMissingCount: 0,
    },
    {
      name: "all conditions pass on farmer-entered facts with requiresOfficialVerification => POTENTIALLY_ELIGIBLE",
      facts: {
        state: "Karnataka",
        ownershipTypes: ["JOINT_FAMILY"],
        totalLandHectares: 2.0,
        crops: ["PADDY"],
        plotCount: 2,
        farmerCategory: "MARGINAL",
      },
      officiallyVerified: false,
      expectedStatus: "POTENTIALLY_ELIGIBLE",
      expectedFailedCount: 0,
      expectedMissingCount: 0,
    },
    {
      name: "missing land area fact => NEEDS_VERIFICATION (never guesses)",
      facts: {
        state: "Karnataka",
        ownershipTypes: ["OWNER"],
        totalLandHectares: null,
        crops: ["RAGI"],
        plotCount: 1,
        farmerCategory: "SMALL",
      },
      officiallyVerified: false,
      expectedStatus: "NEEDS_VERIFICATION",
      expectedFailedCount: 1,
      expectedMissingCount: 1,
    },
    {
      name: "state mismatch => NOT_ELIGIBLE",
      facts: {
        state: "Maharashtra",
        ownershipTypes: ["OWNER"],
        totalLandHectares: 1.5,
        crops: ["RAGI"],
        plotCount: 2,
        farmerCategory: "SMALL",
      },
      officiallyVerified: true,
      expectedStatus: "NOT_ELIGIBLE",
      expectedFailedCount: 1,
      expectedMissingCount: 0,
    },
    {
      name: "excluded by NOT rule (farmerCategory == LARGE) => NOT_ELIGIBLE",
      facts: {
        state: "Karnataka",
        ownershipTypes: ["OWNER"],
        totalLandHectares: 4.5,
        crops: ["MAIZE"],
        plotCount: 2,
        farmerCategory: "LARGE",
      },
      officiallyVerified: true,
      expectedStatus: "NOT_ELIGIBLE",
      expectedFailedCount: 1,
      expectedMissingCount: 0,
    },
  ];

  it.each(testCases)(
    "$name",
    ({
      facts,
      officiallyVerified,
      expectedStatus,
      expectedFailedCount,
      expectedMissingCount,
    }) => {
      const res = evaluateSchemeEligibility(
        demoRuleTree,
        facts,
        officiallyVerified,
        "2026-11-03T00:00:00.000Z"
      );
      expect(res.status).toBe(expectedStatus);
      expect(res.failedRules.length).toBe(expectedFailedCount);
      expect(res.missingFacts.length).toBe(expectedMissingCount);
      expect(res.evaluatedAtIso).toBe("2026-11-03T00:00:00.000Z");
    }
  );

  it("evaluates lte and exists operators accurately", () => {
    const lteAndExistsTree: SchemeRuleNode = {
      all: [
        {
          id: "r-max-area",
          fact: "area",
          op: "lte",
          value: 2.0,
          descriptionEn: "Area <= 2.0 ha",
          descriptionKn: "ವಿಸ್ತೀರ್ಣ <= 2.0 ಹೆಕ್ಟೇರ್",
        },
        {
          id: "r-has-kcc",
          fact: "kccNumber",
          op: "exists",
          value: true,
          descriptionEn: "Has KCC reference",
          descriptionKn: "ಕೆಸಿಸಿ ಹೊಂದಿದ್ದಾರೆ",
        },
      ],
    };

    const passRes = evaluateSchemeEligibility(
      lteAndExistsTree,
      { area: 1.8, kccNumber: "KCC-DEMO-01" },
      true
    );
    expect(passRes.status).toBe("LIKELY_ELIGIBLE");

    const failExistsRes = evaluateSchemeEligibility(
      lteAndExistsTree,
      { area: 1.8, kccNumber: "" },
      true
    );
    expect(failExistsRes.status).toBe("NOT_ELIGIBLE");

    const failLteRes = evaluateSchemeEligibility(
      lteAndExistsTree,
      { area: 3.1, kccNumber: "KCC-DEMO-01" },
      true
    );
    expect(failLteRes.status).toBe("NOT_ELIGIBLE");
  });

  it("handles edge cases for invalid operator inputs and missing 'not' facts", () => {
    const edgeTree: SchemeRuleNode = {
      any: [
        {
          id: "r-in-scalar",
          fact: "district",
          op: "in",
          value: ["KA-MYS", "KA-MDY"],
          descriptionEn: "District in Mysuru or Mandya",
          descriptionKn: "ಮೈಸೂರು ಅಥವಾ ಮಂಡ್ಯ ಜಿಲ್ಲೆ",
        },
        {
          not: {
            id: "r-missing-not",
            fact: "unknownFact",
            op: "eq",
            value: "YES",
            descriptionEn: "Not unknown",
            descriptionKn: "ಅಜ್ಞಾತವಲ್ಲ",
          },
        },
      ],
    };

    const resMissing = evaluateSchemeEligibility(edgeTree, {
      district: "KA-BLR",
    });
    expect(resMissing.status).toBe("NEEDS_VERIFICATION");

    const resPassScalarIn = evaluateSchemeEligibility(
      edgeTree,
      { district: "KA-MYS", unknownFact: "NO" },
      true
    );
    expect(resPassScalarIn.status).toBe("LIKELY_ELIGIBLE");
  });

  it("calculates PMFBY insurance premium with capped farmer rates for Kharif, Rabi, and Commercial", () => {
    // 1. Kharif Foodgrain (Ragi, 2.0% cap)
    const kharif = calculateCropInsurancePremium({
      season: "KHARIF",
      cropCode: "RAGI",
      areaHectares: 1.0,
      sumInsuredPerHectareInr: 50000,
    });
    expect(kharif.totalSumInsuredInr).toBe(50000);
    expect(kharif.farmerSharePercent).toBe(2.0);
    expect(kharif.farmerPremiumInr).toBe(1000);
    expect(kharif.governmentSubsidyInr).toBe(5000);

    // 2. Rabi Foodgrain (Paddy, 1.5% cap)
    const rabi = calculateCropInsurancePremium({
      season: "RABI",
      cropCode: "PADDY",
      areaHectares: 2.0,
      sumInsuredPerHectareInr: 60000,
    });
    expect(rabi.totalSumInsuredInr).toBe(120000);
    expect(rabi.farmerSharePercent).toBe(1.5);
    expect(rabi.farmerPremiumInr).toBe(1800);

    // 3. Commercial / Horticultural (Arecanut, 5.0% cap)
    const comm = calculateCropInsurancePremium({
      season: "ANNUAL_COMMERCIAL",
      cropCode: "ARECANUT",
      areaHectares: 0.5,
      sumInsuredPerHectareInr: 100000,
    });
    expect(comm.totalSumInsuredInr).toBe(50000);
    expect(comm.farmerSharePercent).toBe(5.0);
    expect(comm.farmerPremiumInr).toBe(2500);
  });
});
