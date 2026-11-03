import { z } from "zod";
import type { EligibilityStatus } from "@agro/shared";

// ============================================================================
// Pure Deterministic JSON DSL for Scheme Eligibility Evaluation (Section 3)
// ============================================================================

export type FactValue =
  | string
  | number
  | boolean
  | string[]
  | number[]
  | null
  | undefined;

export type FarmerFactSet = Record<string, FactValue>;

export type RuleOperator =
  | "eq"
  | "in"
  | "gte"
  | "lte"
  | "between"
  | "exists";

export interface LeafConditionRule {
  id: string;
  fact: string;
  op: RuleOperator;
  value?: unknown;
  descriptionEn: string;
  descriptionKn: string;
  /**
   * When true, a condition that passes on unverified farmer-entered facts
   * yields POTENTIALLY_ELIGIBLE rather than LIKELY_ELIGIBLE if the rule
   * requires official record verification at application time.
   */
  requiresOfficialVerification?: boolean;
}

export interface AllGroupRule {
  all: SchemeRuleNode[];
}

export interface AnyGroupRule {
  any: SchemeRuleNode[];
}

export interface NotGroupRule {
  not: SchemeRuleNode;
}

export type SchemeRuleNode =
  | LeafConditionRule
  | AllGroupRule
  | AnyGroupRule
  | NotGroupRule;

export const LeafConditionRuleSchema: z.ZodType<LeafConditionRule> = z.object({
  id: z.string().min(1),
  fact: z.string().min(1),
  op: z.enum(["eq", "in", "gte", "lte", "between", "exists"]),
  value: z.unknown().optional(),
  descriptionEn: z.string().min(1),
  descriptionKn: z.string().min(1),
  requiresOfficialVerification: z.boolean().optional(),
});

export const SchemeRuleNodeSchema: z.ZodType<SchemeRuleNode> = z.lazy(() =>
  z.union([
    LeafConditionRuleSchema,
    z.object({ all: z.array(SchemeRuleNodeSchema).min(1) }),
    z.object({ any: z.array(SchemeRuleNodeSchema).min(1) }),
    z.object({ not: SchemeRuleNodeSchema }),
  ])
);

export type ConditionOutcome = "PASSED" | "FAILED" | "MISSING_DATA";

export interface RuleConditionTrace {
  ruleId: string;
  fact: string;
  op: RuleOperator;
  expectedValue: unknown;
  actualValue: FactValue;
  outcome: ConditionOutcome;
  descriptionEn: string;
  descriptionKn: string;
  requiresOfficialVerification: boolean;
}

export interface EligibilityEvaluationResult {
  status: EligibilityStatus;
  passedRules: RuleConditionTrace[];
  failedRules: RuleConditionTrace[];
  missingFacts: RuleConditionTrace[];
  relevanceScore: number; // 0..100 deterministic score based on passed conditions
  evaluatedAtIso: string;
}

function isMissingFact(val: FactValue): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val === "string" && val.trim() === "") return true;
  if (Array.isArray(val) && val.length === 0) return true;
  return false;
}

function evaluateLeafCondition(
  leaf: LeafConditionRule,
  facts: FarmerFactSet
): RuleConditionTrace {
  const actualValue = facts[leaf.fact];
  const baseTrace = {
    ruleId: leaf.id,
    fact: leaf.fact,
    op: leaf.op,
    expectedValue: leaf.value,
    actualValue,
    descriptionEn: leaf.descriptionEn,
    descriptionKn: leaf.descriptionKn,
    requiresOfficialVerification: Boolean(leaf.requiresOfficialVerification),
  };

  if (leaf.op === "exists") {
    const shouldExist = leaf.value !== false;
    const exists = !isMissingFact(actualValue);
    return {
      ...baseTrace,
      outcome: exists === shouldExist ? "PASSED" : "FAILED",
    };
  }

  if (isMissingFact(actualValue)) {
    return {
      ...baseTrace,
      outcome: "MISSING_DATA",
    };
  }

  switch (leaf.op) {
    case "eq": {
      const passed = actualValue === leaf.value;
      return { ...baseTrace, outcome: passed ? "PASSED" : "FAILED" };
    }
    case "in": {
      if (!Array.isArray(leaf.value)) {
        return { ...baseTrace, outcome: "FAILED" };
      }
      if (Array.isArray(actualValue)) {
        const hasIntersection = actualValue.some((item) =>
          (leaf.value as unknown[]).includes(item)
        );
        return { ...baseTrace, outcome: hasIntersection ? "PASSED" : "FAILED" };
      }
      const included = (leaf.value as unknown[]).includes(actualValue);
      return { ...baseTrace, outcome: included ? "PASSED" : "FAILED" };
    }
    case "gte": {
      if (typeof actualValue !== "number" || typeof leaf.value !== "number") {
        return { ...baseTrace, outcome: "FAILED" };
      }
      return {
        ...baseTrace,
        outcome: actualValue >= leaf.value ? "PASSED" : "FAILED",
      };
    }
    case "lte": {
      if (typeof actualValue !== "number" || typeof leaf.value !== "number") {
        return { ...baseTrace, outcome: "FAILED" };
      }
      return {
        ...baseTrace,
        outcome: actualValue <= leaf.value ? "PASSED" : "FAILED",
      };
    }
    case "between": {
      if (
        typeof actualValue !== "number" ||
        !Array.isArray(leaf.value) ||
        leaf.value.length !== 2 ||
        typeof leaf.value[0] !== "number" ||
        typeof leaf.value[1] !== "number"
      ) {
        return { ...baseTrace, outcome: "FAILED" };
      }
      const [min, max] = leaf.value;
      return {
        ...baseTrace,
        outcome:
          actualValue >= min && actualValue <= max ? "PASSED" : "FAILED",
      };
    }
  }
}

interface NodeEvalState {
  outcome: ConditionOutcome;
  traces: RuleConditionTrace[];
}

function evaluateNode(
  node: SchemeRuleNode,
  facts: FarmerFactSet
): NodeEvalState {
  if ("all" in node) {
    const childResults = node.all.map((child) => evaluateNode(child, facts));
    const traces = childResults.flatMap((r) => r.traces);
    if (childResults.some((r) => r.outcome === "FAILED")) {
      return { outcome: "FAILED", traces };
    }
    if (childResults.some((r) => r.outcome === "MISSING_DATA")) {
      return { outcome: "MISSING_DATA", traces };
    }
    return { outcome: "PASSED", traces };
  }

  if ("any" in node) {
    const childResults = node.any.map((child) => evaluateNode(child, facts));
    const traces = childResults.flatMap((r) => r.traces);
    if (childResults.some((r) => r.outcome === "PASSED")) {
      return { outcome: "PASSED", traces };
    }
    if (childResults.some((r) => r.outcome === "MISSING_DATA")) {
      return { outcome: "MISSING_DATA", traces };
    }
    return { outcome: "FAILED", traces };
  }

  if ("not" in node) {
    const inner = evaluateNode(node.not, facts);
    if (inner.outcome === "MISSING_DATA") {
      return { outcome: "MISSING_DATA", traces: inner.traces };
    }
    const invertedOutcome: ConditionOutcome =
      inner.outcome === "PASSED" ? "FAILED" : "PASSED";
    const invertedTraces = inner.traces.map((t) => ({
      ...t,
      outcome:
        t.outcome === "PASSED"
          ? ("FAILED" as const)
          : t.outcome === "FAILED"
            ? ("PASSED" as const)
            : ("MISSING_DATA" as const),
    }));
    return { outcome: invertedOutcome, traces: invertedTraces };
  }

  const trace = evaluateLeafCondition(node, facts);
  return { outcome: trace.outcome, traces: [trace] };
}

/**
 * Deterministically evaluates a scheme's JSON DSL rule tree against a farmer's
 * fact snapshot. Never guesses when data is missing: missing required data
 * always returns NEEDS_VERIFICATION.
 */
export function evaluateSchemeEligibility(
  ruleRoot: SchemeRuleNode,
  facts: FarmerFactSet,
  allFactsOfficiallyVerified = false,
  nowIso: string = new Date().toISOString()
): EligibilityEvaluationResult {
  const { outcome, traces } = evaluateNode(ruleRoot, facts);

  const passedRules = traces.filter((t) => t.outcome === "PASSED");
  const failedRules = traces.filter((t) => t.outcome === "FAILED");
  const missingFacts = traces.filter((t) => t.outcome === "MISSING_DATA");

  const totalCount = traces.length || 1;
  const rawScore = Math.round((passedRules.length / totalCount) * 100);

  let status: EligibilityStatus;
  if (outcome === "FAILED") {
    status = "NOT_ELIGIBLE";
  } else if (outcome === "MISSING_DATA") {
    status = "NEEDS_VERIFICATION";
  } else {
    const needsOfficialCheck = passedRules.some(
      (r) => r.requiresOfficialVerification && !allFactsOfficiallyVerified
    );
    status = needsOfficialCheck ? "POTENTIALLY_ELIGIBLE" : "LIKELY_ELIGIBLE";
  }

  return {
    status,
    passedRules,
    failedRules,
    missingFacts,
    relevanceScore: outcome === "FAILED" ? Math.min(rawScore, 25) : rawScore,
    evaluatedAtIso: nowIso,
  };
}

export interface InsurancePremiumCalculationInput {
  season: "KHARIF" | "RABI" | "ANNUAL_COMMERCIAL";
  cropCode: "RAGI" | "PADDY" | "TUR" | "MAIZE" | "ARECANUT" | "SUGARCANE";
  areaHectares: number;
  sumInsuredPerHectareInr: number;
  ruleVersion?: string;
}

export interface InsurancePremiumCalculationOutput {
  season: "KHARIF" | "RABI" | "ANNUAL_COMMERCIAL";
  cropCode: string;
  areaHectares: number;
  totalSumInsuredInr: number;
  farmerSharePercent: number;
  farmerPremiumInr: number;
  governmentSubsidyPercent: number;
  governmentSubsidyInr: number;
  actuarialRatePercent: number;
  ruleVersion: string;
  sourceUrl: string;
  verifiedDateText: string;
}

/**
 * Pure, deterministic PMFBY-standard crop insurance premium calculator.
 * Rules derived from Ministry of Agriculture & Farmers Welfare operational guidelines:
 * - Kharif (food grains & oilseeds): Farmer pays capped 2.0%
 * - Rabi (food grains & oilseeds): Farmer pays capped 1.5%
 * - Annual Commercial / Horticultural: Farmer pays capped 5.0%
 */
export function calculateCropInsurancePremium(
  input: InsurancePremiumCalculationInput
): InsurancePremiumCalculationOutput {
  const totalSumInsuredInr = Math.round(
    input.areaHectares * input.sumInsuredPerHectareInr
  );
  let farmerSharePercent = 2.0;
  const actuarialRatePercent = 12.0; // Benchmark actuarial rate in Karnataka

  if (
    input.season === "ANNUAL_COMMERCIAL" ||
    input.cropCode === "ARECANUT" ||
    input.cropCode === "SUGARCANE"
  ) {
    farmerSharePercent = 5.0;
  } else if (input.season === "RABI") {
    farmerSharePercent = 1.5;
  } else {
    farmerSharePercent = 2.0;
  }

  const farmerPremiumInr = Math.round(
    (totalSumInsuredInr * farmerSharePercent) / 100
  );
  const governmentSubsidyPercent = Math.max(
    0,
    actuarialRatePercent - farmerSharePercent
  );
  const governmentSubsidyInr = Math.round(
    (totalSumInsuredInr * governmentSubsidyPercent) / 100
  );

  return {
    season: input.season,
    cropCode: input.cropCode,
    areaHectares: input.areaHectares,
    totalSumInsuredInr,
    farmerSharePercent,
    farmerPremiumInr,
    governmentSubsidyPercent,
    governmentSubsidyInr,
    actuarialRatePercent,
    ruleVersion: input.ruleVersion ?? "PMFBY-REV-2026.1",
    sourceUrl: "https://pmfby.gov.in/pdf/revised_operational_guidelines.pdf",
    verifiedDateText: "1 Nov 2026",
  };
}
