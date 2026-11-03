import { z } from "zod";

// ============================================================================
// 1. Roles, Permissions, and Authorization Scopes (Section 4 & 6)
// ============================================================================

export const RoleEnum = z.enum([
  "SUPER_ADMIN",
  "ORGANIZATION_ADMIN",
  "CSC_MANAGER",
  "EMPLOYEE",
  "CSC_OPERATOR",
  "APPLICATION_REVIEWER",
  "BANK_PARTNER",
  "FARMER",
  "FAMILY_HELPER",
  "GROUP_COORDINATOR",
  "SCHEME_REVIEWER",
  "DEPARTMENT_OFFICER",
  "PLATFORM_ADMIN",
  "SECURITY_AUDITOR",
]);
export type Role = z.infer<typeof RoleEnum>;

export const STAFF_MFA_REQUIRED_ROLES: Role[] = [
  "SUPER_ADMIN",
  "ORGANIZATION_ADMIN",
  "CSC_MANAGER",
  "PLATFORM_ADMIN",
  "SECURITY_AUDITOR",
  "SCHEME_REVIEWER",
  "DEPARTMENT_OFFICER",
  "BANK_PARTNER",
];

export const PermissionEnum = z.enum([
  "profile:read:own",
  "profile:write:own",
  "plots:read:own",
  "plots:write:own",
  "schemes:read",
  "schemes:draft",
  "schemes:review",
  "schemes:publish",
  "deadlines:read",
  "deadlines:manage",
  "documents:read:own",
  "documents:write:own",
  "shares:manage:own",
  "csc:assist:shared",
  "admin:users:manage",
  "admin:invitations:create",
  "admin:system:read",
  "audit:read",
]);
export type Permission = z.infer<typeof PermissionEnum>;

export const ShareScopeEnum = z.enum([
  "profile:read",
  "plots:read",
  "plots:write",
  "schemes:read",
  "documents:read",
  "cases:read",
  "cases:write",
]);
export type ShareScope = z.infer<typeof ShareScopeEnum>;

// ============================================================================
// 2. Provenance & Truth Labels (Section 3, 5, PRD Section 9)
// ============================================================================

export const FactProvenanceEnum = z.enum([
  "FARMER_ENTERED",
  "OCR_EXTRACTED_CONFIRMED",
  "OFFICIALLY_VERIFIED",
  "CSC_ENTERED",
]);
export type FactProvenance = z.infer<typeof FactProvenanceEnum>;

export const TruthLabelEnum = z.enum([
  "LIVE",
  "OFFICIALLY_VERIFIED",
  "MANUALLY_REPORTED",
  "AI_GENERATED_SUGGESTION",
  "SAMPLE_DEMO_DATA",
  "NEEDS_VERIFICATION",
]);
export type TruthLabel = z.infer<typeof TruthLabelEnum>;

export const EligibilityStatusEnum = z.enum([
  "LIKELY_ELIGIBLE",
  "POTENTIALLY_ELIGIBLE",
  "NOT_ELIGIBLE",
  "NEEDS_VERIFICATION",
]);
export type EligibilityStatus = z.infer<typeof EligibilityStatusEnum>;

export const SchemeVersionStatusEnum = z.enum([
  "DRAFT",
  "IN_REVIEW",
  "APPROVED",
  "PUBLISHED",
  "ARCHIVED",
]);
export type SchemeVersionStatus = z.infer<typeof SchemeVersionStatusEnum>;

export const SupportedLanguageEnum = z.enum(["kn", "en", "hi"]);
export type SupportedLanguage = z.infer<typeof SupportedLanguageEnum>;

// ============================================================================
// 3. Auth & Account Schemas (Section 4)
// ============================================================================

export const SignupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters long")
    .max(128, "Password must be at most 128 characters"),
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100),
  preferredLanguage: SupportedLanguageEnum.default("kn"),
  acceptTermsVersion: z.string().min(1, "Terms version required"),
  acceptPrivacyVersion: z.string().min(1, "Privacy policy version required"),
  acceptDataProcessingVersion: z.string().min(1, "Data processing consent required"),
});
export type SignupInput = z.infer<typeof SignupSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totpCode: z.string().length(6).optional(),
  backupCode: z.string().optional(),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const PhoneOtpRequestSchema = z.object({
  phone: z
    .string()
    .regex(/^\+91[6-9]\d{9}$/, "Must be a valid Indian mobile number (+91XXXXXXXXXX)"),
  preferredLanguage: SupportedLanguageEnum.default("kn"),
});
export type PhoneOtpRequestInput = z.infer<typeof PhoneOtpRequestSchema>;

export const PhoneOtpVerifySchema = z.object({
  phone: z.string().regex(/^\+91[6-9]\d{9}$/),
  otp: z.string().length(6, "OTP must be 6 digits"),
  fullName: z.string().min(2).max(100).optional(),
  acceptTermsVersion: z.string().default("v1.0"),
  acceptPrivacyVersion: z.string().default("v1.0"),
  acceptDataProcessingVersion: z.string().default("v1.0"),
});
export type PhoneOtpVerifyInput = z.infer<typeof PhoneOtpVerifySchema>;

export const StaffInvitationCreateSchema = z.object({
  email: z.string().email(),
  role: z.enum([
    "CSC_OPERATOR",
    "GROUP_COORDINATOR",
    "SCHEME_REVIEWER",
    "DEPARTMENT_OFFICER",
    "PLATFORM_ADMIN",
    "SECURITY_AUDITOR",
  ]),
  departmentName: z.string().optional(),
});
export type StaffInvitationCreateInput = z.infer<typeof StaffInvitationCreateSchema>;

export const StaffInvitationAcceptSchema = z.object({
  token: z.string().min(16),
  fullName: z.string().min(2).max(100),
  password: z.string().min(10).max(128),
});
export type StaffInvitationAcceptInput = z.infer<typeof StaffInvitationAcceptSchema>;

export const AuthorizedShareCreateSchema = z.object({
  granteeEmailOrPhone: z.string().min(3),
  granteeRole: z.enum(["FAMILY_HELPER", "CSC_OPERATOR"]),
  scopes: z.array(ShareScopeEnum).min(1),
  expiresInDays: z.number().int().min(1).max(90).default(30),
  purpose: z.string().min(3).max(240),
});
export type AuthorizedShareCreateInput = z.infer<typeof AuthorizedShareCreateSchema>;

// ============================================================================
// 4. Farmer Benefit Passport & Plots Schemas (Phase 2)
// ============================================================================

export const LandOwnershipTypeEnum = z.enum([
  "OWNER",
  "TENANT",
  "JOINT_FAMILY",
  "SHARECROPPER",
]);
export type LandOwnershipType = z.infer<typeof LandOwnershipTypeEnum>;

export const AreaUnitEnum = z.enum(["HECTARE", "ACRE", "GUNTA"]);
export type AreaUnit = z.infer<typeof AreaUnitEnum>;

export const IrrigationTypeEnum = z.enum([
  "RAINFED",
  "BOREWELL",
  "CANAL",
  "DRIP",
  "SPRINKLER",
]);
export type IrrigationType = z.infer<typeof IrrigationTypeEnum>;

export const SeasonEnum = z.enum(["KHARIF", "RABI", "ZAID", "PERENNIAL"]);
export type Season = z.infer<typeof SeasonEnum>;

export const FarmerCategoryEnum = z.enum([
  "MARGINAL",
  "SMALL",
  "SEMI_MEDIUM",
  "MEDIUM",
  "LARGE",
]);
export type FarmerCategory = z.infer<typeof FarmerCategoryEnum>;

export const FarmerProfileUpdateSchema = z.object({
  fullName: z.string().min(2).max(100),
  preferredLanguage: SupportedLanguageEnum,
  state: z.string().default("Karnataka"),
  districtCode: z.string().min(1, "District is required"),
  talukCode: z.string().min(1, "Taluk is required"),
  villageCode: z.string().min(1, "Village is required"),
  farmerCategory: FarmerCategoryEnum,
  hasKccCard: z.boolean().default(false),
  livestockTypes: z.array(z.enum(["DAIRY", "POULTRY", "FISHERIES", "SERICULTURE", "GOAT_SHEEP"])).default([]),
  elderOrLowLiteracyMode: z.boolean().default(false),
  provenance: FactProvenanceEnum.default("FARMER_ENTERED"),
});
export type FarmerProfileUpdateInput = z.infer<typeof FarmerProfileUpdateSchema>;

export const PlotCreateSchema = z.object({
  plotName: z.string().min(1, "Plot name is required").max(80),
  surveyNumber: z.string().min(1, "Survey/Hissa number is required").max(60),
  districtCode: z.string().min(1),
  talukCode: z.string().min(1),
  villageCode: z.string().min(1),
  areaValue: z.number().positive("Area must be positive").max(10000),
  areaUnit: AreaUnitEnum.default("ACRE"),
  ownershipType: LandOwnershipTypeEnum.default("OWNER"),
  irrigationType: IrrigationTypeEnum.default("RAINFED"),
  soilType: z.enum(["RED", "BLACK", "ALLUVIAL", "LATERITE", "SANDY"]).optional(),
  boundaryGeoJson: z.string().optional(),
  provenance: FactProvenanceEnum.default("FARMER_ENTERED"),
});
export type PlotCreateInput = z.infer<typeof PlotCreateSchema>;

export const CropRecordCreateSchema = z.object({
  plotId: z.string().min(1),
  season: SeasonEnum,
  year: z.number().int().min(2020).max(2035),
  cropCode: z.string().min(1),
  cropNameEn: z.string().min(1),
  cropNameKn: z.string().min(1),
  sownAreaHectares: z.number().positive(),
  sowingDate: z.string().optional(),
  isInsuredUnderPmfby: z.boolean().default(false),
  provenance: FactProvenanceEnum.default("FARMER_ENTERED"),
});
export type CropRecordCreateInput = z.infer<typeof CropRecordCreateSchema>;

export function convertToHectares(value: number, unit: AreaUnit): number {
  switch (unit) {
    case "HECTARE":
      return Number(value.toFixed(4));
    case "ACRE":
      return Number((value * 0.404686).toFixed(4));
    case "GUNTA":
      return Number((value * 0.010117).toFixed(4));
  }
}

// ============================================================================
// 5. 16-State Application Workflow Engine & Integration Health (PRD & Operation)
// ============================================================================

export const ApplicationWorkflowStatusEnum = z.enum([
  "DRAFT",
  "CONSENT_PENDING",
  "DOCUMENTS_PENDING",
  "READY_FOR_REVIEW",
  "INTERNAL_REVIEW",
  "READY_FOR_SUBMISSION",
  "SUBMISSION_PENDING",
  "SUBMITTED_CONFIRMED",
  "PORTAL_HANDOFF",
  "GOVERNMENT_REVIEW",
  "BANK_REVIEW",
  "ADDITIONAL_INFORMATION_REQUIRED",
  "APPROVED",
  "REJECTED",
  "CLOSED",
  "CANCELLED",
]);
export type ApplicationWorkflowStatus = z.infer<typeof ApplicationWorkflowStatusEnum>;

export const IntegrationStatusEnum = z.enum([
  "CONNECTED",
  "PENDING_APPROVAL",
  "FAILED",
  "NOT_CONNECTED",
  "PORTAL_HANDOFF_REQUIRED",
]);
export type IntegrationStatus = z.infer<typeof IntegrationStatusEnum>;

export const DataFreshnessLabelEnum = z.enum([
  "LIVE",
  "PENDING",
  "MANUAL",
  "STALE",
  "UNAVAILABLE",
  "NOT_CONNECTED",
]);
export type DataFreshnessLabel = z.infer<typeof DataFreshnessLabelEnum>;

export const ApplicationCategoryEnum = z.enum([
  "CENTRAL_GOVERNMENT",
  "STATE_GOVERNMENT",
  "BANK_CREDIT",
  "CROP_INSURANCE",
]);
export type ApplicationCategory = z.infer<typeof ApplicationCategoryEnum>;

export const SubmissionModeEnum = z.enum([
  "AUTHORIZED_API",
  "OFFICIAL_PORTAL_HANDOFF",
]);
export type SubmissionMode = z.infer<typeof SubmissionModeEnum>;

export const FarmerRegistrationSchema = z.object({
  fullName: z.string().min(2).max(100),
  mobile: z.string().regex(/^\+91[6-9]\d{9}$/, "Must be valid Indian mobile (+91XXXXXXXXXX)"),
  state: z.string().default("Karnataka"),
  districtCode: z.string().min(1, "District required"),
  talukCode: z.string().min(1, "Taluk required"),
  villageCode: z.string().min(1, "Village required"),
  cropCode: z.string().min(1, "Primary crop required"),
  landAreaValue: z.number().positive("Land area must be positive"),
  landAreaUnit: AreaUnitEnum.default("ACRE"),
  ownershipType: LandOwnershipTypeEnum.default("OWNER"),
  preferredLanguage: SupportedLanguageEnum.default("kn"),
  farmerCategory: FarmerCategoryEnum.default("SMALL"),
  consentVersion: z.string().default("v1.2-DPDP"),
  consentPurpose: z.string().min(5, "Consent purpose required"),
});
export type FarmerRegistrationInput = z.infer<typeof FarmerRegistrationSchema>;

export const ApplicationCreateSchema = z.object({
  farmerId: z.string().min(1),
  schemeId: z.string().min(1),
  schemeName: z.string().min(1),
  schemeCategory: ApplicationCategoryEnum,
  requestedAmount: z.number().optional(),
  submissionMode: SubmissionModeEnum.default("OFFICIAL_PORTAL_HANDOFF"),
  assignedBankId: z.string().optional(),
  cscCentreId: z.string().optional(),
  notes: z.string().optional(),
});
export type ApplicationCreateInput = z.infer<typeof ApplicationCreateSchema>;

export const ApplicationTransitionSchema = z.object({
  applicationId: z.string().min(1),
  toStatus: ApplicationWorkflowStatusEnum,
  reasonOrNote: z.string().min(1),
  officialReferenceNumber: z.string().optional(),
});
export type ApplicationTransitionInput = z.infer<typeof ApplicationTransitionSchema>;

export * from "./nextAction";

export * from "./innovations";
