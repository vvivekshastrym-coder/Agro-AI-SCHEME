# Agro AI Scheme — Database Model Documentation

## Conventions
- **Primary Keys**: Time-ordered UUID v7 (`uuidv7()`).
- **Timestamps**: Stored in UTC (`ISO-8601`), displayed in `Asia/Kolkata` (IST).
- **Provenance Tracking**: Every farmer profile, plot, and crop record carries `provenance` (`FARMER_ENTERED | OCR_EXTRACTED_CONFIRMED | OFFICIALLY_VERIFIED | CSC_ENTERED`) and `verifiedAt`.
- **Reproducible Eligibility**: Every scheme evaluation writes a `rule_evaluations` snapshot containing the exact input `factsSnapshot` and deterministic `evaluation` trace.

## Schema File
See [schema.prisma](file:///c:/Users/vivek/Downloads/New%20folder/apps/api/prisma/schema.prisma) for the full relational model across Identity, Farms/Plots, Schemes/Versions/Deadlines, Shares, and Governance.
