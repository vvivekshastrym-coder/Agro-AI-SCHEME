// Deterministic "Next Best Action" priority queue (UI_REDESIGN.md §3).
// The AI may reword the result; it never chooses it.

export type NextActionKind =
  | "OPEN_LOSS_WINDOW"
  | "EVIDENCE_PENDING"
  | "DEADLINE_SOON"
  | "MISSING_PROFILE_FACT"
  | "NEW_MATCHED_SCHEME"
  | "DOCUMENT_EXPIRING"
  | "NOTHING_URGENT";

export interface NextActionInput {
  nowIso: string;
  /** Only verified deadlines may be passed; unverified ones must be omitted by the caller. */
  openLossWindow?: { plotName: string; verifiedDeadlineIso: string } | null;
  pendingEvidence?: { plotName: string } | null;
  verifiedDeadlines?: Array<{ schemeName: string; dueIso: string }>;
  missingProfileFacts?: Array<{ factKey: string; reasonScheme: string }>;
  newMatchedSchemes?: Array<{ schemeName: string }>;
  expiringDocuments?: Array<{ documentName: string; expiresIso: string }>;
}

export interface NextAction {
  kind: NextActionKind;
  subject: string;
  dueIso?: string;
}

const HOURS_72_MS = 72 * 3600 * 1000;

export function pickNextBestAction(input: NextActionInput): NextAction {
  const now = new Date(input.nowIso).getTime();

  if (input.openLossWindow) {
    const due = new Date(input.openLossWindow.verifiedDeadlineIso).getTime();
    if (!Number.isNaN(due) && due > now) {
      return {
        kind: "OPEN_LOSS_WINDOW",
        subject: input.openLossWindow.plotName,
        dueIso: input.openLossWindow.verifiedDeadlineIso,
      };
    }
  }
  if (input.pendingEvidence) {
    return { kind: "EVIDENCE_PENDING", subject: input.pendingEvidence.plotName };
  }
  const soon = (input.verifiedDeadlines ?? [])
    .map((d) => ({ ...d, t: new Date(d.dueIso).getTime() }))
    .filter((d) => !Number.isNaN(d.t) && d.t > now && d.t - now <= HOURS_72_MS)
    .sort((a, b) => a.t - b.t)[0];
  if (soon) {
    return { kind: "DEADLINE_SOON", subject: soon.schemeName, dueIso: soon.dueIso };
  }
  const missing = input.missingProfileFacts?.[0];
  if (missing) {
    return { kind: "MISSING_PROFILE_FACT", subject: missing.factKey };
  }
  const scheme = input.newMatchedSchemes?.[0];
  if (scheme) {
    return { kind: "NEW_MATCHED_SCHEME", subject: scheme.schemeName };
  }
  const doc = (input.expiringDocuments ?? [])
    .map((d) => ({ ...d, t: new Date(d.expiresIso).getTime() }))
    .filter((d) => !Number.isNaN(d.t) && d.t > now)
    .sort((a, b) => a.t - b.t)[0];
  if (doc) {
    return { kind: "DOCUMENT_EXPIRING", subject: doc.documentName, dueIso: doc.expiresIso };
  }
  return { kind: "NOTHING_URGENT", subject: "" };
}
