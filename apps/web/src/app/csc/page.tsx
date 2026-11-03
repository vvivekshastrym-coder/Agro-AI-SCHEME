"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  type ApplicationWorkflowStatus,
  type SubmissionMode,
  type AreaUnit,
  type LandOwnershipType,
} from "@agro/shared";

interface FarmerRecord {
  id: string;
  fullName: string;
  mobile: string;
  state: string;
  districtCode: string;
  talukCode: string;
  villageCode: string;
  cropCode: string;
  landAreaValue: number;
  landAreaUnit: AreaUnit;
  ownershipType: LandOwnershipType;
  farmerCategory: string;
  preferredLanguage: string;
  identityVerificationState: string;
  consentStatus: string;
  consentVersion: string;
  consentTimestampIso: string;
  consentPurpose: string;
  createdAt: string;
}

interface SchemeRecord {
  id: string;
  code: string;
  officialName: string;
  shortName: string;
  department: string;
  category: string;
  benefits: string;
  eligibilityRulesDescription: string;
  requiredDocuments: string[];
  officialPortalUrl: string;
  integrationMethod: string;
  lastVerifiedDate: string;
}

interface ApplicationRecord {
  id: string;
  applicationNumber: string;
  farmerId: string;
  farmerName: string;
  farmerMobile: string;
  schemeId: string;
  schemeName: string;
  schemeCategory: string;
  workflowStatus: ApplicationWorkflowStatus;
  submissionMode: SubmissionMode;
  officialAckNumber?: string;
  officialPortalUrl: string;
  requiredDocuments: string[];
  notes?: string;
  createdAt: string;
  statusHistory: Array<{
    id: string;
    fromStatus: string;
    toStatus: string;
    actorName: string;
    timestampIso: string;
    notes?: string;
  }>;
}

interface EmployeeAlertItem {
  id: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "INFORMATIONAL";
  title: string;
  message: string;
  action: string;
  applicationId?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function EmployeeCscPortal() {
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "register" | "schemes" | "prepare" | "tracker" | "alerts" | "whatsapp"
  >("dashboard");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [farmers, setFarmers] = useState<FarmerRecord[]>([]);
  const [schemes, setSchemes] = useState<SchemeRecord[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [employeeAlerts, setEmployeeAlerts] = useState<{
    urgentCount: number;
    pendingDocsCount: number;
    readyReviewCount: number;
    items: EmployeeAlertItem[];
  }>({
    urgentCount: 0,
    pendingDocsCount: 0,
    readyReviewCount: 0,
    items: [],
  });

  // Guided Registration Form
  const [regName, setRegName] = useState("");
  const [regMobile, setRegMobile] = useState("+91");
  const [regDistrict, setRegDistrict] = useState("KA-MYS");
  const [regTaluk, setRegTaluk] = useState("KA-MYS-HDK");
  const [regVillage, setRegVillage] = useState("Hampapura");
  const [regCrop, setRegCrop] = useState("RAGI");
  const [regArea, setRegArea] = useState<number>(2.5);
  const [regUnit, setRegUnit] = useState<AreaUnit>("ACRE");
  const [regOwnership, setRegOwnership] = useState<LandOwnershipType>("OWNER");
  const [regLang, setRegLang] = useState<"kn" | "en" | "hi">("kn");
  const [regConsentGiven, setRegConsentGiven] = useState(false);
  const [regStatusMsg, setRegStatusMsg] = useState("");

  // Application Prep Form
  const [selectedFarmerId, setSelectedFarmerId] = useState("");
  const [selectedSchemeId, setSelectedSchemeId] = useState("");
  const [prepAmount, setPrepAmount] = useState<number>(50000);
  const [prepSubmissionMode, setPrepSubmissionMode] = useState<SubmissionMode>("OFFICIAL_PORTAL_HANDOFF");
  const [prepNotes, setPrepNotes] = useState("");
  const [prepStatusMsg, setPrepStatusMsg] = useState("");

  // Handoff & Acknowledgement Modal
  const [handoffModalApp, setHandoffModalApp] = useState<ApplicationRecord | null>(null);
  const [ackInput, setAckInput] = useState("");
  const [ackNotes, setAckNotes] = useState("");
  const [ackStatusMsg, setAckStatusMsg] = useState("");

  async function fetchLiveData() {
    setIsLoading(true);
    try {
      const [farmersRes, schemesRes, appsRes, alertsRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/admin/farmers`).catch(() => null),
        fetch(`${API_BASE}/api/v1/admin/schemes`).catch(() => null),
        fetch(`${API_BASE}/api/v1/admin/applications`).catch(() => null),
        fetch(`${API_BASE}/api/v1/employee/alerts`).catch(() => null),
      ]);

      if (farmersRes && farmersRes.ok) {
        const f = await farmersRes.json();
        setFarmers(f.farmers || []);
        if (f.farmers?.length > 0 && !selectedFarmerId) {
          setSelectedFarmerId(f.farmers[0].id);
        }
      }

      if (schemesRes && schemesRes.ok) {
        const s = await schemesRes.json();
        setSchemes(s.schemes || []);
        if (s.schemes?.length > 0 && !selectedSchemeId) {
          setSelectedSchemeId(s.schemes[0].id);
        }
      }

      if (appsRes && appsRes.ok) {
        const a = await appsRes.json();
        setApplications(a.applications || []);
      }

      if (alertsRes && alertsRes.ok) {
        const al = await alertsRes.json();
        setEmployeeAlerts({
          urgentCount: al.counts?.urgentCount || 0,
          pendingDocsCount: al.counts?.pendingDocsCount || 0,
          readyReviewCount: al.counts?.readyReviewCount || 0,
          items: al.items || [],
        });
      }
    } catch {
      // offline
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchLiveData();
  }, []);

  async function handleRegisterFarmer(e: React.FormEvent) {
    e.preventDefault();
    if (!regConsentGiven) {
      setRegStatusMsg("⚠️ Explicit farmer DPDP consent must be checked before registering.");
      return;
    }
    if (!regMobile.startsWith("+91") || regMobile.length !== 13) {
      setRegStatusMsg("⚠️ Enter valid 10-digit Indian mobile number (+91XXXXXXXXXX).");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/v1/employee/farmers/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: regName.trim(),
          mobile: regMobile.trim(),
          state: "Karnataka",
          districtCode: regDistrict,
          talukCode: regTaluk,
          villageCode: regVillage,
          cropCode: regCrop,
          landAreaValue: Number(regArea),
          landAreaUnit: regUnit,
          ownershipType: regOwnership,
          farmerCategory: Number(regArea) <= 2.5 ? "SMALL" : "MEDIUM",
          preferredLanguage: regLang,
          consentPurpose: "CSC operator assisted scheme application and document preparation",
          consentVersion: "v1.2-DPDP",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setRegStatusMsg(`✅ Successfully registered farmer: ${data.farmer.fullName} (ID: ${data.farmer.id}).`);
        setRegName("");
        setRegMobile("+91");
        setRegConsentGiven(false);
        fetchLiveData();
        setActiveTab("prepare");
      } else {
        setRegStatusMsg("❌ Registration failed. Please check the inputs.");
      }
    } catch {
      setRegStatusMsg("❌ Connection error while registering farmer.");
    }
  }

  async function handleCreateApplication(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFarmerId || !selectedSchemeId) {
      setPrepStatusMsg("⚠️ Please select a farmer and a scheme.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/v1/employee/applications/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmerId: selectedFarmerId,
          schemeId: selectedSchemeId,
          requestedAmount: Number(prepAmount),
          submissionMode: prepSubmissionMode,
          notes: prepNotes.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPrepStatusMsg(
          `✅ Application created! Application No: ${data.application.applicationNumber} (Status: ${data.application.workflowStatus})`
        );
        setPrepNotes("");
        fetchLiveData();
        setActiveTab("tracker");
      } else {
        setPrepStatusMsg("❌ Failed to create application.");
      }
    } catch {
      setPrepStatusMsg("❌ Network error connecting to backend.");
    }
  }

  async function handleConfirmPortalHandoff(e: React.FormEvent) {
    e.preventDefault();
    if (!handoffModalApp || !ackInput.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/api/v1/employee/applications/handoff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: handoffModalApp.id,
          officialAckNumber: ackInput.trim(),
          notes: ackNotes.trim(),
        }),
      });

      if (res.ok) {
        setAckStatusMsg("✅ Handoff saved! Status updated to SUBMITTED_CONFIRMED.");
        setTimeout(() => {
          setHandoffModalApp(null);
          setAckInput("");
          setAckNotes("");
          setAckStatusMsg("");
          fetchLiveData();
        }, 1200);
      }
    } catch {
      setAckStatusMsg("❌ Error recording acknowledgement.");
    }
  }

  // Dashboard Queues
  const docsPending = applications.filter((a) => a.workflowStatus === "DOCUMENTS_PENDING");
  const awaitingReview = applications.filter(
    (a) => a.workflowStatus === "READY_FOR_REVIEW" || a.workflowStatus === "INTERNAL_REVIEW"
  );
  const readySubmit = applications.filter((a) => a.workflowStatus === "READY_FOR_SUBMISSION");
  const confirmedSubmitted = applications.filter(
    (a) => a.workflowStatus === "SUBMITTED_CONFIRMED" || a.workflowStatus === "PORTAL_HANDOFF"
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a", fontFamily: "sans-serif" }}>
      {/* Top Header */}
      <header
        style={{
          background: "#065f46",
          color: "#ffffff",
          padding: "12px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <img
            src="/logo.png"
            alt="Agro AI Scheme Logo"
            style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }}
          />
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.3 }}>
              Agro AI Scheme · Operator Workspace
            </div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              🏢 Employee & CSC Assisted Application Desk · Real-Time Operations
            </div>
          </div>
        </div>

        {/* Multi-Portal Switcher */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, opacity: 0.75, marginRight: 4 }}>Workspaces:</span>
          <Link
            href="/admin"
            style={{
              padding: "6px 12px",
              background: "rgba(255,255,255,0.12)",
              color: "#ffffff",
              borderRadius: 6,
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            🛡️ Super Admin
          </Link>
          <Link
            href="/csc"
            style={{
              padding: "6px 12px",
              background: "#10b981",
              color: "#ffffff",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              border: "1px solid #6ee7b7",
            }}
          >
            🏢 Employee / CSC
          </Link>
          <Link
            href="/bank"
            style={{
              padding: "6px 12px",
              background: "rgba(255,255,255,0.12)",
              color: "#ffffff",
              borderRadius: 6,
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            🏦 Bank Partner
          </Link>
          <Link
            href="/"
            style={{
              padding: "6px 12px",
              background: "#d97706",
              color: "#ffffff",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            🌾 Farmer App
          </Link>
        </div>
      </header>

      {/* Sub Navigation */}
      <div
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          padding: "0 24px",
          display: "flex",
          gap: 24,
          overflowX: "auto",
        }}
      >
        {[
          { key: "dashboard", label: "📋 Operator Dashboard" },
          { key: "alerts", label: `🔔 Alerts & Actions (${employeeAlerts.items.length})` },
          { key: "register", label: "📝 Register Farmer & Consent" },
          { key: "schemes", label: `🏛️ Government Schemes (${schemes.length})` },
          { key: "prepare", label: "🚀 Application Preparation" },
          { key: "tracker", label: `📑 Track Applications (${applications.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: "14px 0",
              border: "none",
              background: "none",
              fontSize: 14,
              fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? "#065f46" : "#64748b",
              borderBottom: activeTab === tab.key ? "3px solid #065f46" : "3px solid transparent",
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <main style={{ maxWidth: 1300, margin: "0 auto", padding: "24px 20px" }}>
        {/* Real-time Status Badge */}
        <div
          style={{
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            padding: "8px 16px",
            borderRadius: 6,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
            color: "#065f46",
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
          <strong>Operator Centre Online:</strong> Raitha Samparka Kendra / CSC — H.D. Kote (Mysuru). Operating on Live Real-Time Database.
        </div>

        {/* TAB 1: OPERATOR DASHBOARD */}
        {activeTab === "dashboard" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
              Operator Work Overview & Live Queues
            </h2>

            {/* 4 Queue Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 28 }}>
              {[
                { title: "Registered Farmers", count: farmers.length, color: "#065f46", sub: "Assisted farmer profiles" },
                { title: "Documents Pending", count: docsPending.length, color: "#f97316", sub: "Requires Pahani/RTC/photo upload" },
                { title: "Ready for Submission", count: readySubmit.length, color: "#0284c7", sub: "Verified & farmer confirmed" },
                { title: "Submitted Confirmed", count: confirmedSubmitted.length, color: "#10b981", sub: "Official acknowledgement recorded" },
              ].map((c) => (
                <div
                  key={c.title}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    padding: 18,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                >
                  <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>{c.title}</div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: c.color, margin: "6px 0" }}>
                    {c.count}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>{c.sub}</div>
                </div>
              ))}
            </div>

            {/* Fast Action Shortcuts */}
            <div style={{ background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0", padding: 20, marginBottom: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Quick Actions</h3>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setActiveTab("register")}
                  style={{
                    padding: "10px 18px",
                    background: "#065f46",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 6,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  + Register New Farmer with DPDP Consent
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("prepare")}
                  style={{
                    padding: "10px 18px",
                    background: "#0284c7",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 6,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  🚀 Prepare Scheme / Loan Application
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("schemes")}
                  style={{
                    padding: "10px 18px",
                    background: "#f1f5f9",
                    color: "#0f172a",
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  🔍 Search Verified Government Schemes
                </button>
              </div>
            </div>

            {/* Recent Cases */}
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Recent Applications</h3>
            {applications.length === 0 ? (
              <div style={{ background: "#ffffff", padding: 32, borderRadius: 8, textAlign: "center", border: "1px solid #e2e8f0" }}>
                <p style={{ color: "#64748b", margin: 0, fontSize: 14 }}>
                  No active cases yet. Click <strong>Register New Farmer</strong> above to start your first assisted case!
                </p>
              </div>
            ) : (
              <div style={{ background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", textAlign: "left", color: "#475569" }}>
                      <th style={{ padding: "12px 16px" }}>App Number</th>
                      <th style={{ padding: "12px 16px" }}>Farmer</th>
                      <th style={{ padding: "12px 16px" }}>Scheme</th>
                      <th style={{ padding: "12px 16px" }}>Status</th>
                      <th style={{ padding: "12px 16px" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.slice(0, 5).map((app) => (
                      <tr key={app.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "12px 16px", fontWeight: 700 }}>{app.applicationNumber}</td>
                        <td style={{ padding: "12px 16px" }}>{app.farmerName}</td>
                        <td style={{ padding: "12px 16px" }}>{app.schemeName}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ padding: "2px 6px", background: "#ecfdf5", color: "#065f46", borderRadius: 4, fontWeight: 700, fontSize: 11 }}>
                            {app.workflowStatus}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <button
                            type="button"
                            onClick={() => {
                              setHandoffModalApp(app);
                              setAckInput(app.officialAckNumber || "");
                            }}
                            style={{
                              padding: "4px 10px",
                              background: "#0284c7",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: 4,
                              fontSize: 12,
                              cursor: "pointer",
                            }}
                          >
                            Update / Handoff
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB: ALERTS & OPERATOR NOTIFICATIONS */}
        {activeTab === "alerts" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>
                  Operator Alert & Action Desk
                </h2>
                <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
                  Real-time policy alerts, document requests, and bank inquiry notifications for assigned farmers.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchLiveData}
                style={{
                  padding: "8px 14px",
                  background: "#f1f5f9",
                  border: "1px solid #cbd5e1",
                  borderRadius: 6,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                🔄 Refresh Feed
              </button>
            </div>

            {/* Alert Summary Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
              <div style={{ background: "#ffffff", border: "1px solid #fecaca", borderRadius: 8, padding: 16, borderLeft: "4px solid #ef4444" }}>
                <div style={{ fontSize: 13, color: "#991b1b", fontWeight: 600 }}>🔴 Urgent Clarifications Required</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#b91c1c", margin: "6px 0" }}>
                  {employeeAlerts.urgentCount}
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>Bank inquiries or returned applications</div>
              </div>
              <div style={{ background: "#ffffff", border: "1px solid #fed7aa", borderRadius: 8, padding: 16, borderLeft: "4px solid #f97316" }}>
                <div style={{ fontSize: 13, color: "#9a3412", fontWeight: 600 }}>🟠 Documents Pending Upload</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#c2410c", margin: "6px 0" }}>
                  {employeeAlerts.pendingDocsCount}
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>Awaiting RTC, Pahani, or Sowing Cert</div>
              </div>
              <div style={{ background: "#ffffff", border: "1px solid #bae6fd", borderRadius: 8, padding: 16, borderLeft: "4px solid #0284c7" }}>
                <div style={{ fontSize: 13, color: "#075985", fontWeight: 600 }}>🔵 Ready for Submission Handoff</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "#0369a1", margin: "6px 0" }}>
                  {employeeAlerts.readyReviewCount}
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>Verified by operator; ready for portal entry</div>
              </div>
            </div>

            {/* List of Alerts */}
            {employeeAlerts.items.length === 0 ? (
              <div style={{ background: "#ffffff", padding: 40, textAlign: "center", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 6px" }}>All Operator Tasks Up to Date</h3>
                <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                  No urgent application blockages, bank requests, or missing documents in this CSC centre.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {employeeAlerts.items.map((item) => {
                  const isCrit = item.priority === "CRITICAL";
                  const isHigh = item.priority === "HIGH";
                  return (
                    <div
                      key={item.id}
                      style={{
                        background: "#ffffff",
                        border: isCrit ? "1px solid #fca5a5" : isHigh ? "1px solid #fed7aa" : "1px solid #e2e8f0",
                        borderRadius: 8,
                        padding: 18,
                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 16,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 260 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 4,
                              background: isCrit ? "#fee2e2" : isHigh ? "#ffedd5" : "#e0f2fe",
                              color: isCrit ? "#991b1b" : isHigh ? "#9a3412" : "#0369a1",
                            }}
                          >
                            {item.priority}
                          </span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                            {item.title}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: "#475569", marginBottom: 6 }}>
                          {item.message}
                        </div>
                        {item.applicationId && (
                          <div style={{ fontSize: 12, color: "#94a3b8" }}>
                            Application ID: <code>{item.applicationId}</code>
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => setActiveTab("tracker")}
                          style={{
                            padding: "8px 14px",
                            background: "#065f46",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          {item.action} ➔
                        </button>
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(
                            `Agro AI Operator Alert: ${item.title}. Action needed: ${item.message}`
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            padding: "8px 12px",
                            background: "#25D366",
                            color: "#ffffff",
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 600,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          💬 Notify Farmer
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: REGISTER FARMER & CONSENT */}
        {activeTab === "register" && (
          <div style={{ maxWidth: 800, background: "#ffffff", padding: 28, borderRadius: 10, border: "1px solid #e2e8f0" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              Farmer Assisted Registration & Consent Workflow
            </h2>
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 20 }}>
              Collect required details with explicit, recorded DPDP Act consent. Never collect passwords, ATM PINs, or online banking credentials.
            </p>

            <form onSubmit={handleRegisterFarmer} style={{ display: "grid", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    Farmer Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ningappa Gowda"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    Mobile Number * (Indian +91)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+919845012345"
                    value={regMobile}
                    onChange={(e) => setRegMobile(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    District *
                  </label>
                  <select
                    value={regDistrict}
                    onChange={(e) => setRegDistrict(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }}
                  >
                    <option value="KA-MYS">Mysuru</option>
                    <option value="KA-MDY">Mandya</option>
                    <option value="KA-HSN">Hassan</option>
                    <option value="KA-BLR">Bengaluru Rural</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    Taluk *
                  </label>
                  <input
                    type="text"
                    required
                    value={regTaluk}
                    onChange={(e) => setRegTaluk(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    Village *
                  </label>
                  <input
                    type="text"
                    required
                    value={regVillage}
                    onChange={(e) => setRegVillage(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    Primary Crop *
                  </label>
                  <select
                    value={regCrop}
                    onChange={(e) => setRegCrop(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }}
                  >
                    <option value="RAGI">Ragi (Finger Millet)</option>
                    <option value="PADDY">Paddy (Rice)</option>
                    <option value="MAIZE">Maize</option>
                    <option value="SUGARCANE">Sugarcane</option>
                    <option value="PULSES">Tur / Pulses</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    Land Area *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={regArea}
                    onChange={(e) => setRegArea(Number(e.target.value))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    Area Unit
                  </label>
                  <select
                    value={regUnit}
                    onChange={(e) => setRegUnit(e.target.value as any)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }}
                  >
                    <option value="ACRE">Acre</option>
                    <option value="GUNTA">Gunta</option>
                    <option value="HECTARE">Hectare</option>
                  </select>
                </div>
              </div>

              {/* Digital DPDP Consent Agreement */}
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #86efac",
                  padding: 16,
                  borderRadius: 8,
                  marginTop: 8,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: "#166534", marginBottom: 6 }}>
                  📜 Mandatory DPDP Act Assisted Consent (Version v1.2-DPDP)
                </div>
                <p style={{ fontSize: 12, color: "#14532d", margin: 0, lineHeight: 1.5 }}>
                  The farmer has been explained the purpose in their preferred language ({regLang}) and authorizes
                  the CSC operator to look up eligible government schemes, assist in preparing applications, and hand off
                  records to authorized government/bank portals. No financial passwords or Aadhaar PINs are requested.
                </p>
                <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, cursor: "pointer", fontWeight: 600, fontSize: 13, color: "#166534" }}>
                  <input
                    type="checkbox"
                    checked={regConsentGiven}
                    onChange={(e) => setRegConsentGiven(e.target.checked)}
                    style={{ width: 18, height: 18, cursor: "pointer" }}
                  />
                  I confirm that the farmer gave explicit verbal and informed consent.
                </label>
              </div>

              {regStatusMsg && (
                <div style={{ fontSize: 13, fontWeight: 600, color: regStatusMsg.startsWith("✅") ? "#15803d" : "#b91c1c" }}>
                  {regStatusMsg}
                </div>
              )}

              <button
                type="submit"
                style={{
                  padding: "12px 24px",
                  background: "#065f46",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: "pointer",
                  marginTop: 8,
                }}
              >
                Save Farmer Record & Proceed to Application ➔
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: GOVERNMENT SCHEME SERVICES */}
        {activeTab === "schemes" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              Government Scheme Services Catalogue
            </h2>
            <p style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>
              Configurable Central & State government schemes with live eligibility criteria and official portal routes.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
              {schemes.map((s) => (
                <div
                  key={s.id}
                  style={{
                    background: "#ffffff",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    padding: 20,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                    <span style={{ padding: "2px 8px", background: "#e0f2fe", color: "#0369a1", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                      {s.code}
                    </span>
                    <span style={{ fontSize: 11, color: "#64748b" }}>{s.category}</span>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: "6px 0", color: "#0f172a" }}>
                    {s.officialName}
                  </h3>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
                    🏛️ {s.department}
                  </div>
                  <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.5, marginBottom: 12 }}>
                    <strong>Benefits:</strong> {s.benefits}
                  </p>
                  <div style={{ fontSize: 12, color: "#475569", marginBottom: 12 }}>
                    <strong>Eligibility:</strong> {s.eligibilityRulesDescription}
                  </div>
                  <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSchemeId(s.id);
                        setActiveTab("prepare");
                      }}
                      style={{
                        padding: "6px 14px",
                        background: "#065f46",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Prepare Application ➔
                    </button>
                    <a
                      href={s.officialPortalUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 12, color: "#0284c7", textDecoration: "none", fontWeight: 600 }}
                    >
                      Official Portal ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: PREPARE APPLICATION */}
        {activeTab === "prepare" && (
          <div style={{ maxWidth: 840, background: "#ffffff", padding: 28, borderRadius: 10, border: "1px solid #e2e8f0" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              Prepare Scheme or Bank Loan Application
            </h2>
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 20 }}>
              Guided application workflow: select consented farmer, choose scheme, review required checklist, and initiate authorized submission or official portal handoff.
            </p>

            {farmers.length === 0 ? (
              <div style={{ background: "#fef3c7", padding: 20, borderRadius: 8, color: "#92400e", fontSize: 14 }}>
                ⚠️ No farmers found in database. Please register a farmer first under the <strong>Register Farmer</strong> tab.
              </div>
            ) : (
              <form onSubmit={handleCreateApplication} style={{ display: "grid", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    Select Consented Farmer *
                  </label>
                  <select
                    value={selectedFarmerId}
                    onChange={(e) => setSelectedFarmerId(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }}
                  >
                    {farmers.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.fullName} · {f.mobile} ({f.cropCode}, {f.landAreaValue} {f.landAreaUnit} in {f.districtCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    Select Scheme or Loan Facility *
                  </label>
                  <select
                    value={selectedSchemeId}
                    onChange={(e) => setSelectedSchemeId(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }}
                  >
                    {schemes.map((s) => (
                      <option key={s.id} value={s.id}>
                        [{s.code}] {s.officialName} — {s.category}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                      Credit / Support Amount (₹ INR, if applicable)
                    </label>
                    <input
                      type="number"
                      step="1000"
                      value={prepAmount}
                      onChange={(e) => setPrepAmount(Number(e.target.value))}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                      Submission Mode
                    </label>
                    <select
                      value={prepSubmissionMode}
                      onChange={(e) => setPrepSubmissionMode(e.target.value as any)}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }}
                    >
                      <option value="OFFICIAL_PORTAL_HANDOFF">Official Portal Handoff (Guided)</option>
                      <option value="AUTHORIZED_API">Authorized API Gateway (where available)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    Application Notes / Operator Assessment
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Sowing verified in Kharif 2026. Pahani survey number 48/2 verified."
                    value={prepNotes}
                    onChange={(e) => setPrepNotes(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }}
                  />
                </div>

                {prepStatusMsg && (
                  <div style={{ fontSize: 13, fontWeight: 600, color: prepStatusMsg.startsWith("✅") ? "#15803d" : "#b91c1c" }}>
                    {prepStatusMsg}
                  </div>
                )}

                <button
                  type="submit"
                  style={{
                    padding: "12px 24px",
                    background: "#0284c7",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: 15,
                    cursor: "pointer",
                    marginTop: 8,
                  }}
                >
                  Create Application Case in Workflow Engine ➔
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 5: TRACK APPLICATIONS & HANDOFF */}
        {activeTab === "tracker" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
              Application Lifecycle Tracker ({applications.length} Cases)
            </h2>

            {applications.length === 0 ? (
              <div style={{ background: "#ffffff", padding: 40, borderRadius: 8, textAlign: "center", border: "1px solid #e2e8f0" }}>
                <p style={{ color: "#64748b", margin: 0, fontSize: 14 }}>
                  No applications recorded yet. Go to <strong>Application Preparation</strong> to generate your first case!
                </p>
              </div>
            ) : (
              <div style={{ background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", textAlign: "left", color: "#475569" }}>
                      <th style={{ padding: "12px 16px" }}>App Number</th>
                      <th style={{ padding: "12px 16px" }}>Farmer</th>
                      <th style={{ padding: "12px 16px" }}>Scheme</th>
                      <th style={{ padding: "12px 16px" }}>Workflow State</th>
                      <th style={{ padding: "12px 16px" }}>Ack Number</th>
                      <th style={{ padding: "12px 16px" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app) => (
                      <tr key={app.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "12px 16px", fontWeight: 700 }}>{app.applicationNumber}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontWeight: 600 }}>{app.farmerName}</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>{app.farmerMobile}</div>
                        </td>
                        <td style={{ padding: "12px 16px" }}>{app.schemeName}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              padding: "3px 8px",
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 700,
                              background:
                                app.workflowStatus === "APPROVED" || app.workflowStatus === "SUBMITTED_CONFIRMED"
                                  ? "#dcfce7"
                                  : app.workflowStatus === "REJECTED"
                                    ? "#fee2e2"
                                    : "#e0f2fe",
                              color:
                                app.workflowStatus === "APPROVED" || app.workflowStatus === "SUBMITTED_CONFIRMED"
                                  ? "#15803d"
                                  : app.workflowStatus === "REJECTED"
                                    ? "#b91c1c"
                                    : "#0369a1",
                            }}
                          >
                            {app.workflowStatus}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", fontFamily: "monospace" }}>
                          {app.officialAckNumber ?? "Pending submission"}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", gap: 8 }}>
                            <a
                              href={app.officialPortalUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                padding: "4px 8px",
                                background: "#f1f5f9",
                                color: "#0f172a",
                                borderRadius: 4,
                                textDecoration: "none",
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              Portal ↗
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                setHandoffModalApp(app);
                                setAckInput(app.officialAckNumber || "");
                              }}
                              style={{
                                padding: "4px 8px",
                                background: "#10b981",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: 4,
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              Handoff ACK
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* HANDOFF & ACKNOWLEDGEMENT MODAL */}
        {handoffModalApp && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: 16,
            }}
          >
            <div
              style={{
                background: "#ffffff",
                borderRadius: 10,
                maxWidth: 540,
                width: "100%",
                padding: 24,
                boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
              }}
            >
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>
                Official Portal Handoff & Ack Number
              </h3>
              <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px" }}>
                Record the genuine official government or bank acknowledgement number once the submission is complete on the official portal.
              </p>

              <div style={{ background: "#f8fafc", padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
                <div><strong>Application:</strong> {handoffModalApp.applicationNumber}</div>
                <div><strong>Farmer:</strong> {handoffModalApp.farmerName} ({handoffModalApp.farmerMobile})</div>
                <div><strong>Scheme:</strong> {handoffModalApp.schemeName}</div>
                <div>
                  <strong>Official Portal:</strong>{" "}
                  <a href={handoffModalApp.officialPortalUrl} target="_blank" rel="noreferrer" style={{ color: "#0284c7" }}>
                    {handoffModalApp.officialPortalUrl} ↗
                  </a>
                </div>
              </div>

              <form onSubmit={handleConfirmPortalHandoff} style={{ display: "grid", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    Official Acknowledgement / Transaction Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PMKISAN-KA-2026-009182 or PMFBY-ACK-48210"
                    value={ackInput}
                    onChange={(e) => setAckInput(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    Submission Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sowing certificate uploaded, eKYC OTP completed."
                    value={ackNotes}
                    onChange={(e) => setAckNotes(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }}
                  />
                </div>

                {ackStatusMsg && (
                  <div style={{ fontSize: 13, fontWeight: 600, color: ackStatusMsg.startsWith("✅") ? "#15803d" : "#b91c1c" }}>
                    {ackStatusMsg}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setHandoffModalApp(null)}
                    style={{ padding: "8px 16px", background: "#e2e8f0", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ padding: "8px 18px", background: "#10b981", color: "#ffffff", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}
                  >
                    Save & Mark Submitted Confirmed
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
