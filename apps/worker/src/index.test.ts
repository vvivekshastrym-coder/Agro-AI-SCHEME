import { describe, it, expect } from "vitest";
import { AgroPlatformService } from "@agro/api";
import { DeadlineGuardianWorker } from "./index.js";

describe("@agro/worker — Deadline Guardian Queue Processor", () => {
  it("delivers verified deadline reminders and deduplicates by idempotencyKey", async () => {
    const platform = new AgroPlatformService();
    const worker = new DeadlineGuardianWorker(platform);

    const res1 = await worker.processReminderJob({
      idempotencyKey: "rem-1",
      farmerId: "farmer-demo-1",
      farmerEmail: "farmer@agro.example",
      schemeVersionId: "demo-scheme-v1-drip-irrigation",
      deadlineId: "dl-demo-1",
      language: "en",
    });

    expect(res1.delivered).toBe(true);
    expect(res1.formattedDeadline).toContain("2026");

    // Duplicate retry with same idempotencyKey is safely skipped
    const resDup = await worker.processReminderJob({
      idempotencyKey: "rem-1",
      farmerId: "farmer-demo-1",
      farmerEmail: "farmer@agro.example",
      schemeVersionId: "demo-scheme-v1-drip-irrigation",
      deadlineId: "dl-demo-1",
      language: "en",
    });
    expect(resDup.delivered).toBe(false);
    expect(resDup.skippedReason).toBe("DUPLICATE_IDEMPOTENCY_KEY");
  });

  it("suppresses calendar reminders when deadline is unverified", async () => {
    const platform = new AgroPlatformService();
    const worker = new DeadlineGuardianWorker(platform);

    const unverifiedRes = await worker.processReminderJob({
      idempotencyKey: "rem-unverified",
      farmerId: "farmer-demo-1",
      farmerEmail: "farmer@agro.example",
      schemeVersionId: "demo-scheme-v1-crop-insurance",
      deadlineId: "dl-demo-2-unverified",
      language: "kn",
    });

    expect(unverifiedRes.delivered).toBe(false);
    expect(unverifiedRes.skippedReason).toBe("UNVERIFIED_DEADLINE_SUPPRESSED");
    expect(unverifiedRes.formattedDeadline).toContain("ಪರಿಶೀಲಿಸಲಾಗಿಲ್ಲ");
  });
});
