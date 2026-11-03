import { describe, it, expect } from "vitest";
import {
  formatDeadlineTruthfully,
  getEligibilityBadge,
  getProvenanceBadge,
  getTruthLabelDescriptor,
  resolveSingleTruthChip,
} from "./index.js";

describe("@agro/ui truthful formatting and badges", () => {
  it("never renders an unverified deadline as a calendar date", () => {
    const unverified = formatDeadlineTruthfully(
      "2026-12-31T00:00:00.000Z",
      false,
      "en"
    );
    expect(unverified.isVerified).toBe(false);
    expect(unverified.text).toBe(
      "Deadline not verified — check official portal"
    );
    expect(unverified.text).not.toContain("2026");

    const verified = formatDeadlineTruthfully(
      "2026-12-15T00:00:00.000Z",
      true,
      "en"
    );
    expect(verified.isVerified).toBe(true);
    expect(verified.text).toContain("2026");
  });

  it("renders DEMO / MOCK badge whenever isMock is true", () => {
    const badge = getTruthLabelDescriptor("OFFICIALLY_VERIFIED", true, "en");
    expect(badge.tone).toBe("demo");
    expect(badge.label).toContain("DEMO / MOCK");
  });

  it("maps provenance and eligibility badges in Kannada and English", () => {
    expect(getProvenanceBadge("FARMER_ENTERED", "en").label).toBe(
      "Entered by You"
    );
    expect(getEligibilityBadge("LIKELY_ELIGIBLE", "kn").tone).toBe("success");
  });

  it("enforces single truth chip priority order and never shows Live on demo-fed cards", () => {
    const chipPriority = resolveSingleTruthChip({
      states: ["OFFICIALLY_VERIFIED", "DEMO", "NEEDS_VERIFICATION", "LIVE"],
      isDemoData: true,
      lang: "en",
    });
    expect(chipPriority.resolvedState).toBe("NEEDS_VERIFICATION");
    expect(chipPriority.text).toBe("Needs checking");

    const demoOverLive = resolveSingleTruthChip({
      states: ["LIVE", "VERIFIED_FRESH"],
      isDemoData: true,
      isProviderConnected: true,
      lang: "en",
    });
    expect(demoOverLive.resolvedState).toBe("DEMO");
    expect(demoOverLive.text).toBe("Demo data");
    expect(demoOverLive.text).not.toContain("Live");

    const disconnectedLive = resolveSingleTruthChip({
      states: ["LIVE"],
      isDemoData: false,
      isProviderConnected: false,
      lang: "en",
    });
    expect(disconnectedLive.resolvedState).toBe("DEMO");
    expect(disconnectedLive.text).toBe("Demo data");

    const connectedLive = resolveSingleTruthChip({
      states: ["LIVE"],
      isDemoData: false,
      isProviderConnected: true,
      lang: "en",
    });
    expect(connectedLive.resolvedState).toBe("LIVE");
    expect(connectedLive.text).toBe("Live · updated 2 min ago");

    const unavailable = resolveSingleTruthChip({
      states: ["UNAVAILABLE_AWAITING_AGMARKNET_API"],
      isDemoData: false,
      isProviderConnected: false,
      lang: "en",
    });
    expect(unavailable.resolvedState).toBe("UNAVAILABLE");
    expect(unavailable.text).toBe("Not connected yet");
    expect(unavailable.text).not.toContain("UNAVAILABLE_");
  });
});
