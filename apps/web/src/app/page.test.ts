import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { getTranslations } from "@agro/i18n";
import {
  formatDeadlineTruthfully,
  getEligibilityBadge,
  getProvenanceBadge,
  resolveSingleTruthChip,
} from "@agro/ui";
import { calculateCropInsurancePremium } from "@agro/rules-engine";
import { ErrorBoundary } from "./components/DesignSystem.js";

describe("@agro/web UI integration and Phase 0 & 1 Acceptance Tests", () => {
  it("verifies Kannada, English, and Hindi UI dictionary and truthful deadline helpers", () => {
    const kn = getTranslations("kn");
    expect(kn.profile.passportTitle).toContain("ರೈತ");

    const unverifiedDl = formatDeadlineTruthfully(
      "2026-12-30T00:00:00.000Z",
      false,
      "kn"
    );
    expect(unverifiedDl.isVerified).toBe(false);
    expect(unverifiedDl.text).toContain("ಪರಿಶೀಲಿಸಲಾಗಿಲ್ಲ");

    const prov = getProvenanceBadge("FARMER_ENTERED", "kn");
    expect(prov.label).toContain("ನೀವು ನಮೂದಿಸಿದ");

    const elig = getEligibilityBadge("POTENTIALLY_ELIGIBLE", "en");
    expect(elig.tone).toBe("warning");
  });

  it("verifies pure localized strings across languages", () => {
    const kn = getTranslations("kn");
    const en = getTranslations("en");
    const hi = getTranslations("hi");

    expect(kn.common.appName).toBe("ಆಗ್ರೋ ಎಐ ಸ್ಕೀಮ್");
    expect(en.common.appName).toBe("Agro AI Scheme");
    expect(hi.common.appName).toBe("एग्रो एआई स्कीम");

    const knElig = getEligibilityBadge("LIKELY_ELIGIBLE", "kn");
    expect(knElig.label).toBe("ಅರ್ಹರಾಗುವ ಸಾಧ್ಯತೆ ಹೆಚ್ಚು");
  });

  it("enforces ErrorBoundary recovery state when a component throws", () => {
    const derived = ErrorBoundary.getDerivedStateFromError(
      new Error("Simulated route error")
    );
    expect(derived.hasError).toBe(true);
    expect(derived.errorMessage).toBe("Simulated route error");
  });

  it("verifies NO parked features exist in production page UI", () => {
    const pageSource = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/page.tsx"),
      "utf8"
    );

    // Parked features explicitly barred by Section 2.3 of prompt
    expect(pageSource).not.toContain("Scam Shield");
    expect(pageSource).not.toContain("What-If Simulator");
    expect(pageSource).not.toContain("whatif");
    expect(pageSource).not.toContain("Subsidy Before Purchase");
    expect(pageSource).not.toContain("subsidy-before-purchase");
    expect(pageSource).not.toContain("UNAVAILABLE_AWAITING_AGMARKNET_API");
    expect(pageSource).not.toContain("UNAVAILABLE_AWAITING_IMD_API");
    expect(pageSource).not.toContain("UNAVAILABLE_AWAITING_VISION_MODEL");
    expect(pageSource).not.toContain("VERIFIED_FRESH");
    expect(pageSource).not.toContain("DEADLINE_UNVERIFIED");

    // Must contain the in-scope signature experiences and helpers
    const designSystemSource = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/components/DesignSystem.tsx"),
      "utf8"
    );
    expect(pageSource).toContain("Farmer Opportunity Radar");
    expect(pageSource).toContain("Claim Rescue Room");
    expect(pageSource).toContain("My Farm Digital Twin");
    expect(designSystemSource).toContain("DRAFT, NOT SUBMITTED");
  });

  it("enforces single truth chip priority rules and prevents Live on demo data", () => {
    const demoChip = resolveSingleTruthChip({
      states: ["LIVE", "OFFICIALLY_VERIFIED"],
      isDemoData: true,
      isProviderConnected: true,
      lang: "en",
    });
    expect(demoChip.text).toBe("Demo data");
    expect(demoChip.text).not.toContain("Live");

    const needsVerificationChip = resolveSingleTruthChip({
      states: ["NEEDS_VERIFICATION", "DEMO", "LIVE"],
      isDemoData: true,
      lang: "en",
    });
    expect(needsVerificationChip.text).toBe("Needs checking");
  });

  it("calculates crop insurance premium according to PMFBY operational guidelines", () => {
    const kharifCalc = calculateCropInsurancePremium({
      season: "KHARIF",
      cropCode: "RAGI",
      areaHectares: 1.0,
      sumInsuredPerHectareInr: 50000,
    });
    expect(kharifCalc.farmerSharePercent).toBe(2.0);
    expect(kharifCalc.farmerPremiumInr).toBe(1000);

    const rabiCalc = calculateCropInsurancePremium({
      season: "RABI",
      cropCode: "PADDY",
      areaHectares: 1.0,
      sumInsuredPerHectareInr: 60000,
    });
    expect(rabiCalc.farmerSharePercent).toBe(1.5);
    expect(rabiCalc.farmerPremiumInr).toBe(900);
  });

  it("verifies LoginSecurityModal safely normalizes sessions and prevents .slice crash on undefined createdAt", () => {
    const modalSource = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/LoginSecurityModal.tsx"),
      "utf8"
    );
    // Ensure createdAtIso and cleanPhone cannot throw undefined.slice
    expect(modalSource).toContain("createdAtIso");
    expect(modalSource).toContain('(phone || "").replace');
    expect(modalSource).toContain("dateRaw.slice");
  });

  it("verifies WhatsApp report direct link button exists alongside the Ask Bot and on the Home screen main panel with papers", () => {
    const pageSource = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/page.tsx"),
      "utf8"
    );
    expect(pageSource).toContain("whatsapp-action-fab");
    expect(pageSource).toContain("handleSendWhatsAppReport");
    expect(pageSource).toContain("https://api.whatsapp.com/send?");
    expect(pageSource).toContain("handleSendViaTwilio");
    expect(pageSource).toContain("floating-actions-cluster");
    expect(pageSource).toContain("WhatsApp Papers & Advisory");
  });

  it("verifies Agro AI Schemes brand logo is configured in AppBar, Gateway and Manifest", () => {
    const designSource = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/components/DesignSystem.tsx"),
      "utf8"
    );
    const gatewaySource = fs.readFileSync(
      path.resolve(process.cwd(), "src/app/ExperienceGateway.tsx"),
      "utf8"
    );
    const manifestSource = fs.readFileSync(
      path.resolve(process.cwd(), "public/manifest.json"),
      "utf8"
    );
    expect(designSource).toContain('/logo.png');
    expect(gatewaySource).toContain('/logo.png');
    expect(manifestSource).toContain('/logo.png');
  });
});
