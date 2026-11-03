import { describe, it, expect } from "vitest";
import { pickNextBestAction } from "./nextAction.js";

const nowIso = "2026-11-03T00:00:00.000Z";

describe("pickNextBestAction priority queue", () => {
  it("prefers an open loss window over everything else", () => {
    const r = pickNextBestAction({
      nowIso,
      openLossWindow: { plotName: "North", verifiedDeadlineIso: "2026-11-05T00:00:00.000Z" },
      pendingEvidence: { plotName: "South" },
      verifiedDeadlines: [{ schemeName: "S", dueIso: "2026-11-04T00:00:00.000Z" }],
    });
    expect(r.kind).toBe("OPEN_LOSS_WINDOW");
  });

  it("ignores an expired loss window", () => {
    const r = pickNextBestAction({
      nowIso,
      openLossWindow: { plotName: "North", verifiedDeadlineIso: "2026-11-01T00:00:00.000Z" },
      pendingEvidence: { plotName: "South" },
    });
    expect(r.kind).toBe("EVIDENCE_PENDING");
  });

  it("only surfaces deadlines within 72 hours, earliest first", () => {
    const r = pickNextBestAction({
      nowIso,
      verifiedDeadlines: [
        { schemeName: "Far", dueIso: "2026-11-20T00:00:00.000Z" },
        { schemeName: "Later", dueIso: "2026-11-05T00:00:00.000Z" },
        { schemeName: "Soon", dueIso: "2026-11-04T00:00:00.000Z" },
      ],
    });
    expect(r).toMatchObject({ kind: "DEADLINE_SOON", subject: "Soon" });
    const far = pickNextBestAction({
      nowIso,
      verifiedDeadlines: [{ schemeName: "Far", dueIso: "2026-11-20T00:00:00.000Z" }],
    });
    expect(far.kind).toBe("NOTHING_URGENT");
  });

  it("falls through profile fact, new scheme, expiring document in order", () => {
    expect(
      pickNextBestAction({
        nowIso,
        missingProfileFacts: [{ factKey: "surveyNumber", reasonScheme: "X" }],
        newMatchedSchemes: [{ schemeName: "N" }],
      }).kind
    ).toBe("MISSING_PROFILE_FACT");
    expect(
      pickNextBestAction({ nowIso, newMatchedSchemes: [{ schemeName: "N" }] }).kind
    ).toBe("NEW_MATCHED_SCHEME");
    expect(
      pickNextBestAction({
        nowIso,
        expiringDocuments: [{ documentName: "RTC", expiresIso: "2026-12-01T00:00:00.000Z" }],
      }).kind
    ).toBe("DOCUMENT_EXPIRING");
  });
});
