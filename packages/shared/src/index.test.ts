import { describe, it, expect } from "vitest";
import {
  convertToHectares,
  SignupSchema,
  PhoneOtpRequestSchema,
  PlotCreateSchema,
} from "./index.js";

describe("@agro/shared schemas and utilities", () => {
  it("converts acres and guntas to hectares accurately", () => {
    expect(convertToHectares(1, "HECTARE")).toBe(1);
    expect(convertToHectares(2.5, "ACRE")).toBeCloseTo(1.0117, 4);
    expect(convertToHectares(40, "GUNTA")).toBeCloseTo(0.4047, 4);
  });

  it("validates SignupSchema with minimum 10 character password and consent versions", () => {
    const valid = SignupSchema.safeParse({
      email: "ramesh@example.org",
      password: "StrongPassword123!",
      fullName: "Ramesh Gowda",
      preferredLanguage: "kn",
      acceptTermsVersion: "v1.0",
      acceptPrivacyVersion: "v1.0",
      acceptDataProcessingVersion: "v1.0",
    });
    expect(valid.success).toBe(true);

    const shortPwd = SignupSchema.safeParse({
      email: "ramesh@example.org",
      password: "short",
      fullName: "Ramesh Gowda",
      acceptTermsVersion: "v1.0",
      acceptPrivacyVersion: "v1.0",
      acceptDataProcessingVersion: "v1.0",
    });
    expect(shortPwd.success).toBe(false);
  });

  it("validates Indian mobile numbers in PhoneOtpRequestSchema", () => {
    expect(PhoneOtpRequestSchema.safeParse({ phone: "+919876543210" }).success).toBe(true);
    expect(PhoneOtpRequestSchema.safeParse({ phone: "9876543210" }).success).toBe(false);
  });

  it("validates PlotCreateSchema", () => {
    const plot = PlotCreateSchema.safeParse({
      plotName: "North Borewell Plot",
      surveyNumber: "142/2A",
      districtCode: "KA-MYS",
      talukCode: "KA-MYS-HDK",
      villageCode: "KA-MYS-HDK-001",
      areaValue: 3.5,
      areaUnit: "ACRE",
      ownershipType: "OWNER",
      irrigationType: "BOREWELL",
    });
    expect(plot.success).toBe(true);
  });
});
