# AGRO AI SCHEME — Complete Product Blueprint & PRD

> Prepared as a consolidated concept and implementation blueprint from the feature ideas discussed. Scheme rules, deadlines, integrations, and legal requirements must be verified for each jurisdiction before launch.

## Core Promise
Help farmers discover relevant benefits, capture the right evidence, meet deadlines, follow their cases, and understand the next step—through the channel they can access.

---

## 1. Executive Summary
Agro AI Scheme is a multi-channel agricultural assistance platform—not merely a scheme-listing app.

- **Discover**: Match a farmer's profile, location, crop, land situation, and season to relevant, verified government schemes.
- **Prevent**: Send deadline, weather, crop-risk, document-expiry, and scheme-change alerts.
- **Capture evidence**: Guide farmers through geotagged, time-aware crop-damage photos and a structured evidence checklist.
- **Guide claims**: Explain claim routes, required documents, official reporting channels, and follow-up steps.
- **Track**: Keep internal case progress, official references, reported status, and payment observations clearly separated.
- **Reach remote farmers**: Offer WhatsApp, voice, SMS/IVR, low-connectivity workflows, and CSC human assistance.
- **Build trust**: Show sources, source dates, confidence/verification labels, consent, and audit history.

### Product positioning
"Existing services may help farmers find information or apply. Agro AI Scheme connects the journey—from discovery and early warning to evidence, claim guidance, follow-up, and payment visibility."

### Primary user groups
| User group | Main need | Access |
|---|---|---|
| **Farmer** | Schemes, farm alerts, evidence, deadlines, case guidance | Farmer app, WhatsApp, voice, SMS |
| **Family helper** | Help with alerts and forms without taking over the account | Limited, consent-based access |
| **CSC operator** | Assist assigned farmers and track pending actions | CSC portal |
| **Government officer** | Review authorized cases and publish approved information | Department-scoped portal |
| **Scheme reviewer** | Verify sources, rules, dates, and versions | Review workflow |
| **Platform administrator** | Manage users, system health, integrations, and permissions | Admin portal |
| **Security auditor** | Review authorized access and security events | Read-only scoped audit access |

---

## 2. Complete Feature Map

### A. Scheme intelligence and eligibility
- Scheme Matcher using farmer profile, crop, location, season, land/tenancy context, and documented eligibility rules.
- Ranked scheme list with transparent relevance factors and next actions.
- Rule-based eligibility engine: `LIKELY_ELIGIBLE`, `POTENTIALLY_ELIGIBLE`, `NOT_ELIGIBLE`, or `NEEDS_VERIFICATION`.
- "Why This Answer?" Trust Label with official source, rule version, last-verified date, and conditions checked.
- What-If Eligibility Simulator to compare possible profile changes before acting; show only rule-supported scenarios.
- Scheme Clash Checker to flag known incompatibilities or interactions between benefits.
- Benefit Gap Report showing eligible/possibly eligible benefits not recorded as claimed, with estimated amounts only where verified.
- Eligibility Change Alerts when reviewed rules, documents, or dates change.
- Scheme versioning and reviewer approval before new rules go live.
- Livestock and allied-scheme module for dairy, poultry, fisheries, and sericulture where supported.

### B. Deadlines, seasons, and proactive protection
- Deadline Guardian for application cutoffs, claim reporting, renewals, and follow-ups.
- Season Calendar combining crop stages, enrolment windows, reporting windows, and renewal dates.
- Pre-Loss Weather Advisory with protective guidance and baseline-evidence reminders.
- Document Renewal Reminder for relevant certificates, KYC, and records, using verified expiry dates.
- Insurance Premium and Cutoff Calculator using current, source-backed crop/season rules.
- Crop Cutting Watch for relevant official crop-cutting events where a reliable schedule exists.
- MSP and Procurement Registration Helper with official registration windows and centre links.
- Delay Escalation Assistant that prepares a complaint draft and shows the appropriate official route.
- Loan Interest Benefit and KCC repayment-date reminders where conditions are verified.
- Documented reminder preferences, quiet hours, deduplication, and delivery status.

### C. Satellite, weather, crop risk, and market signals
- Plot mapping and farm-boundary storage using geographic data.
- Satellite observation history linked to registered plots, with source and acquisition time.
- Supported vegetation-index or other imagery-derived indicators, with data-quality labels.
- Anomaly alerts based on configured thresholds and temporal comparisons.
- Weather alerts based on a configured provider, location, source timestamp, and freshness.
- Agro AI Weather risk triggers that connect an alert to a farmer action checklist.
- Village Damage Pulse using aggregated, anonymous reports to reveal potential area-level patterns.
- Mandi price signals and historical comparisons where trustworthy market data is available.
- Crop and procurement alerts linked to location and season.
- Clear distinction between forecast, observation, inference, sample data, and official assessment.

### D. Claim Copilot and evidence management
- Voice/WhatsApp SOS reporting for crop damage or a farmer-reported problem.
- Claim Type Finder to guide the farmer toward a relevant route based on verified policy rules.
- Damage Photo Proof Pack with prompts for whole-field, close-up, and contextual photographs.
- Photo checks for blur, readability, timestamps, and location metadata where available.
- Evidence checklist with incident date, plot, crop, documents, and reporting deadline.
- Geo-tagged evidence where device permission and metadata allow; never fabricate GPS.
- Claim readiness checklist for missing details and inconsistent records.
- Rejection Doctor that explains a rejection notice, lists fixes, and identifies resubmission guidance when verified.
- Submission Receipt Vault for uploaded documents, case references, receipts, and timestamps.
- Claim status history separating internal case status from authoritative external status.
- Officer Call Coach with a short script, reference numbers, and optional notes.
- Application/claim complaint drafting with human approval before sending.

### E. Documents, land records, and plot management
- Secure document vault for relevant records and claim evidence.
- Document Photo Fixer for crop, rotate, perspective correction, and readability checks.
- OCR-assisted extraction with farmer/operator confirmation before important values are used.
- Land Record Mismatch Checker for comparing name, survey number, crop, and other fields where source data is provided.
- Family and Tenant Plot Manager for multiple plots, joint-family context, and tenant-farming information.
- Document completeness checklist before application submission.
- Document version history, private storage, access audit, and retention rules.
- Nominee and Succession Helper with official guidance after death or land transfer.
- QR Farmer Card with limited, consent-controlled verified profile status; avoid exposing sensitive data.

### F. Voice, WhatsApp, SMS, and accessibility
- Official Agro AI Scheme WhatsApp Business entry point when a provider and business number are configured.
- Kannada-first voice and text flows, with additional languages as validated.
- Speak-to-Fill Forms with read-back and confirmation of important fields.
- Voice-to-text problem reporting and text-to-speech responses.
- WhatsApp bot intents for schemes, deadlines, SOS, documents, status, weather, and human help.
- SMS summaries and missed-call/IVR callback flows where provider support exists.
- Low-connectivity mode with saved checklists and deferred sync where appropriate.
- Elder and Low-Literacy Mode with large controls, simple language, slow speech, and repeat-on-request.
- Family Helper Link with scoped permissions and revocable consent.
- Human handoff to an authorized CSC operator when confidence is low or the user requests help.

### G. Payments, finance, and scam prevention
- Money Trail Tracker using only consented, authorized data sources or supported manual evidence.
- Expected-versus-received benefit view, with the source and freshness of each status.
- Payment troubleshooting checklist for common items such as KYC or record-linking issues, without assuming the cause.
- KCC and Loan Date Guardian for verified repayment dates and interest-benefit conditions.
- Scam Shield for suspicious subsidy messages, links, APKs, credential requests, and payment demands.
- Official-domain/source comparison with cautious warnings rather than unsupported claims of certainty.
- Benefit Use Planner with optional, non-pushy seasonal planning information.
- Bank-linked features only through permitted, consented integrations; never ask for PINs or banking passwords.

### H. Community, CSC, and government coordination
- CSC dashboard for assigned farmers, pending cases, documents, reminders, and escalations.
- Farmer Group Mode for authorized FPO/SHG or group support workflows.
- Village Opportunity Board with aggregated, privacy-safe opportunities and camp announcements.
- Anonymous village-level damage pattern summaries with safeguards against re-identification.
- Government portal for authorized case review, official responses, and approved notices.
- Scheme reviewer workflow: draft, review, approve, publish, supersede, and retire rules.
- Admin portal for roles, integrations, queues, audits, notifications, and system health.
- Case assignment, escalation, staff notes, and turnaround-time reporting.

### I. Trust, privacy, and reliability
- Simple Consent Dashboard showing what data is shared, with whom, for what purpose, and revocation options where applicable.
- Role-based and resource-level access control across farmer, CSC, department, reviewer, and admin roles.
- Source labels and data freshness indicators on scheme, weather, satellite, market, and status data.
- Audit logs for sensitive access and administrative changes.
- Integration health, retry-safe jobs, deduplication, and delivery tracking.
- Privacy-aware retention and deletion workflows.
- Clear live/sample/manual/AI-generated/officially verified labels.
- Human confirmation for important submissions and uncertain AI extraction.

---

## 3. Recommended Application Architecture
- **Web experience**: Next.js + TypeScript (Farmer, CSC, government, reviewer, and admin interfaces)
- **Backend API**: NestJS + REST + OpenAPI (Business logic, validation, authorization)
- **Database**: PostgreSQL + PostGIS + Prisma (Persistent records and geographic queries; SQLite/local fallback supported for zero-Docker local runs)
- **Background work**: Redis + BullMQ (Scheduled reminders, integrations, retries)
- **Evidence files**: Private S3-compatible storage (Documents, photos, evidence bundles)
- **AI adapters**: Provider-independent services (Speech, OCR, explanations, intent detection)
- **Observability**: Structured logs, metrics, tracing

---

## 4. Security, Privacy, and Responsible AI
- Use production authentication; never use an unrestricted development login in production.
- Enforce authorization on the backend for every sensitive operation and record.
- Apply least privilege, resource ownership checks, rate limiting, safe file handling, and webhook signature validation.
- Collect only necessary personal information and explain the purpose of collection.
- Do not store bank passwords, UPI PINs, ATM PINs, Aadhaar numbers, or full account/card numbers.
- Treat voice recognition as input—not identity verification.
- Treat OCR, AI output, external messages, and uploaded files as untrusted.
- Do not let AI decide official eligibility; a deterministic, versioned rules engine evaluates known conditions and AI explains the result.
- Do not guarantee benefits, claim acceptance, payments, or crop-loss determinations.
- Important: do not apply a universal 72-hour claim deadline. The reporting window must come from the relevant scheme/policy, incident type, location, and current authoritative source. If unverified, show that it needs confirmation and surface the official reporting route immediately.
