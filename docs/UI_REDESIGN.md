# Agro AI Scheme — UI/UX Redesign (overrides PRD §11 ordering and §12 navigation)

Condensed from the product owner's redesign brief. Sections are referenced by number from AGENTS.md.

## 1. Problem with the old layout
~40 PRD modules were exposed as 8 tabs named after internal modules. Organise by what the farmer is trying to get done.

## 2. Structure: 8 jobs, 5 tabs
| # | Job (farmer's words) | PRD modules folded in |
|---|---|---|
| 1 | What schemes can I get? | B Matcher, C Radar, What-If, Subsidy Shopping Guide |
| 2 | Don't let me miss a date | D Deadline Guardian, M KCC/Loan dates, Crop Cutting Watch |
| 3 | My crop is damaged | E, F, G, H, J (one flow) |
| 4 | Something went wrong with my application | I, P, Q, Land Mismatch (one flow) |
| 5 | Is this message real? | N Scam Shield |
| 6 | Where is my money and my papers? | K, L, O |
| 7 | My farm | A Passport, Diary, Family/Tenant, QR, Nominee |
| 8 | My group (later) | Groups, Village Damage Pulse |

Farmer navigation = exactly 5 bottom tabs: **Today, Schemes, Help (centre, gold), My Farm, Money & Papers**.
The AI assistant is a floating hold-to-talk button. Profile/language/notifications sit behind the avatar.
Max 3 competing choices per screen; one primary action in the thumb zone; progressive disclosure.

## 3. Design system
Concept "Season Ribbon": Today shows crop stages on a horizontal track with verified deadlines pinned at true position;
unverified dates are dashed with "Date not verified".
Next Best Action: one hero card chosen by a deterministic priority queue (open loss window > pending evidence >
verified deadline within 72h > missing profile fact > new matched scheme > document expiring). AI may word it, never choose it.

Tokens: Deep Field #1B5E3A, Fresh Leaf #3FA66B, Cream #FBF8F1, Harvest Gold #E9A820 (ink text on gold only),
Ink #1E2B24, Muted #5E6B63, Line #E6E0D2, Alert Red #C8402F, Amber #D98A00, Info Blue #2F6FA8.
Base font 17px, Kannada line-height 1.6, card radius 20, button radius 16, min touch target 52px, 4px grid,
motion 200–300ms, honour prefers-reduced-motion. WCAG AA, never colour alone (icon + word + colour).
Trust chips everywhere: "Official source · checked <date>", "Entered by you", "Verified", "DEMO".

## 4. Farmer screens
Onboarding (<60s): language → sign in → 3 questions (village, crop, land type) → instant "schemes that may fit you".
Today: weather strip ("Weather not connected" if no provider), Next Best Action, Season Ribbon, up to 3 For-you chips,
money snapshot (empty state valid), scam-check row. Schemes: For you | All | Applied; rule sheet with check/cross/question rows.
Help sheet tiles: crop damaged · application rejected/delayed · check a message · payment not come · talk to a person.
My Farm: plot cards, vault, sharing sheet + access log, Passport card. Money & Papers: receipts, money river, benefit report, KCC.
Every screen: loading, empty, error, offline and sync states.

## 5. Staff portals
Admin sidebar (7 sections): Overview · People · Knowledge · Cases · Channels · Integrations · Trust & Safety (+Settings).
CSC Case Desk: queue / case workspace / consented farmer context, "Request access" flow.
Reviewer: source text left, rules right, version diff, maker-checker publish.

## 6. Feature tiers
MVP: auth, My Farm, matcher + rules engine, Deadline Guardian, Vault, Scam Shield, Today, WhatsApp basic.
v1: crop damaged flow, evidence camera, receipt vault, Kannada voice, CSC desk. v2: fix-a-problem+OCR, benefit report, What-If,
groups, reviewer. Later: Damage Pulse, Crop Cutting Watch, Succession, satellite.
Blocked on outside access: Account Aggregator money trail, PMFBY/NCIP live status, DBT status (adapters + labelled mocks only).

## 7. WhatsApp
Task-specific bot (not a general assistant) on the Cloud API behind a `WhatsAppProvider` interface; farmer messages first
(24h service window); templates only for reminders; verify `X-Hub-Signature-256` on the raw body; dedupe on message id;
unlinked numbers get no farmer data. Facts about Meta pricing/policy must be re-checked in Meta's docs before launch.

### 7.6 Starter templates (draft, unapproved, Kannada needs native review)
deadline_reminder, evidence_pending, document_missing, status_changed, link_code (authentication).
