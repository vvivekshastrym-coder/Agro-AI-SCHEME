"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { type ApplicationWorkflowStatus } from "@agro/shared";

interface BankApplicationItem {
  id: string;
  applicationNumber: string;
  farmerName: string;
  farmerMobile: string;
  schemeName: string;
  requestedAmount?: number;
  workflowStatus: ApplicationWorkflowStatus;
  officialAckNumber?: string;
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function BankPartnerPortal() {
  const [selectedBank, setSelectedBank] = useState<string>("bank-sbi");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [assignedApps, setAssignedApps] = useState<BankApplicationItem[]>([]);
  const [stats, setStats] = useState({
    totalAssigned: 0,
    pendingReview: 0,
    additionalInfoNeeded: 0,
    approved: 0,
    rejected: 0,
  });

  // Decision Modal
  const [decisionModalApp, setDecisionModalApp] = useState<BankApplicationItem | null>(null);
  const [decisionType, setDecisionType] = useState<"APPROVED" | "REJECTED" | "ADDITIONAL_INFORMATION_REQUIRED">("APPROVED");
  const [bankRefNo, setBankRefNo] = useState("");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [decisionStatusMsg, setDecisionStatusMsg] = useState("");

  async function fetchBankData(bankId = selectedBank) {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/bank/dashboard?bankId=${bankId}`);
      if (res.ok) {
        const d = await res.json();
        setAssignedApps(d.applications || []);
        setStats({
          totalAssigned: d.totalAssigned || 0,
          pendingReview: d.pendingReview || 0,
          additionalInfoNeeded: d.additionalInfoNeeded || 0,
          approved: d.approved || 0,
          rejected: d.rejected || 0,
        });
      }
    } catch {
      // offline
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchBankData(selectedBank);
  }, [selectedBank]);

  async function handleRecordDecision(e: React.FormEvent) {
    e.preventDefault();
    if (!decisionModalApp || !bankRefNo.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/api/v1/bank/applications/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: decisionModalApp.id,
          decision: decisionType,
          bankReferenceNumber: bankRefNo.trim(),
          bankName:
            selectedBank === "bank-sbi"
              ? "State Bank of India (Agri Cell)"
              : "Canara Bank (Rural Credit)",
          notes: decisionNotes.trim(),
        }),
      });

      if (res.ok) {
        setDecisionStatusMsg(`✅ Decision recorded: ${decisionType} (Ref: ${bankRefNo})`);
        setTimeout(() => {
          setDecisionModalApp(null);
          setBankRefNo("");
          setDecisionNotes("");
          setDecisionStatusMsg("");
          fetchBankData(selectedBank);
        }, 1200);
      }
    } catch {
      setDecisionStatusMsg("❌ Error recording bank decision.");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a", fontFamily: "sans-serif" }}>
      {/* Universal Workspace Navigator */}
      <header
        style={{
          background: "#1e3a8a",
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
              Agro AI Scheme · Bank Partner Workspace
            </div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              🏦 Member Lending Institution Credit Channel · JanSamarth Route
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
              background: "rgba(255,255,255,0.12)",
              color: "#ffffff",
              borderRadius: 6,
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            🏢 Employee / CSC
          </Link>
          <Link
            href="/bank"
            style={{
              padding: "6px 12px",
              background: "#3b82f6",
              color: "#ffffff",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              border: "1px solid #93c5fd",
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

      {/* Institution Switcher Strip */}
      <div
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          padding: "10px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>Active Financial Institution:</span>
          <select
            value={selectedBank}
            onChange={(e) => setSelectedBank(e.target.value)}
            style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, fontWeight: 600 }}
          >
            <option value="bank-sbi">State Bank of India (Agri Lending)</option>
            <option value="bank-canara">Canara Bank (Rural Credit)</option>
            <option value="bank-kgb">Karnataka Gramin Bank (RRB)</option>
          </select>
        </div>
        <div style={{ fontSize: 12, color: "#166534", background: "#f0fdf4", padding: "4px 10px", borderRadius: 4, fontWeight: 600 }}>
          ✅ JanSamarth Single-Window Credit Routing Active
        </div>
      </div>

      <main style={{ maxWidth: 1300, margin: "0 auto", padding: "24px 20px" }}>
        {/* Real-time Data Pill */}
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            padding: "8px 16px",
            borderRadius: 6,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
            color: "#1e40af",
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6", display: "inline-block" }} />
          <strong>Bank Channel Connected:</strong> Displaying only agricultural credit & KCC applications routed to this institution.
        </div>

        {/* 4 Stat Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 28 }}>
          {[
            { title: "Total Assigned Applications", val: stats.totalAssigned, color: "#1e3a8a", sub: "KCC & Agri loans routed" },
            { title: "Awaiting Bank Review", val: stats.pendingReview, color: "#d97706", sub: "Cases requiring underwriting" },
            { title: "Sanctioned / Approved", val: stats.approved, color: "#15803d", sub: "Approved credit facilities" },
            { title: "Declined / Information Needed", val: stats.rejected + stats.additionalInfoNeeded, color: "#dc2626", sub: "Clarifications requested" },
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
                {isLoading ? "..." : c.val}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>{c.sub}</div>
            </div>
          ))}
        </div>

        {/* Assigned Application Queue */}
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>
          Assigned Loan & Credit Application Queue
        </h2>

        {assignedApps.length === 0 ? (
          <div style={{ background: "#ffffff", padding: 40, borderRadius: 8, textAlign: "center", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🏦</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#334155" }}>
              No Loan Applications Assigned
            </h3>
            <p style={{ color: "#64748b", fontSize: 13, maxWidth: 440, margin: "8px auto 16px" }}>
              Credit-linked applications prepared through the <strong>Employee / CSC Portal</strong> (Kisan Credit Card, Agriculture Infrastructure Fund, Mudra) will appear here for underwriter review.
            </p>
            <Link
              href="/csc"
              style={{
                display: "inline-block",
                padding: "8px 16px",
                background: "#1e3a8a",
                color: "#ffffff",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Open Employee Portal to Prepare KCC Application ↗
            </Link>
          </div>
        ) : (
          <div style={{ background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f8fafc", textAlign: "left", color: "#475569" }}>
                  <th style={{ padding: "12px 16px" }}>Application No</th>
                  <th style={{ padding: "12px 16px" }}>Farmer</th>
                  <th style={{ padding: "12px 16px" }}>Facility / Scheme</th>
                  <th style={{ padding: "12px 16px" }}>Requested Amount</th>
                  <th style={{ padding: "12px 16px" }}>Current Status</th>
                  <th style={{ padding: "12px 16px" }}>Bank Reference</th>
                  <th style={{ padding: "12px 16px" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {assignedApps.map((app) => (
                  <tr key={app.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 16px", fontWeight: 700 }}>{app.applicationNumber}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 600 }}>{app.farmerName}</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{app.farmerMobile}</div>
                    </td>
                    <td style={{ padding: "12px 16px" }}>{app.schemeName}</td>
                    <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                      {app.requestedAmount ? `₹${app.requestedAmount.toLocaleString("en-IN")}` : "As per scale of finance"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          background:
                            app.workflowStatus === "APPROVED"
                              ? "#dcfce7"
                              : app.workflowStatus === "REJECTED"
                                ? "#fee2e2"
                                : "#eff6ff",
                          color:
                            app.workflowStatus === "APPROVED"
                              ? "#15803d"
                              : app.workflowStatus === "REJECTED"
                                ? "#b91c1c"
                                : "#1e40af",
                        }}
                      >
                        {app.workflowStatus}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace" }}>
                      {app.officialAckNumber ?? "—"}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <button
                        type="button"
                        onClick={() => {
                          setDecisionModalApp(app);
                          setBankRefNo(app.officialAckNumber || "");
                        }}
                        style={{
                          padding: "6px 12px",
                          background: "#1e3a8a",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        Review / Decide
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* DECISION MODAL */}
        {decisionModalApp && (
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
                Record Bank Credit Decision
              </h3>
              <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 16px" }}>
                Authorized bank underwriter decision for loan or KCC credit facility.
              </p>

              <div style={{ background: "#f8fafc", padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 13 }}>
                <div><strong>Application:</strong> {decisionModalApp.applicationNumber}</div>
                <div><strong>Farmer:</strong> {decisionModalApp.farmerName} ({decisionModalApp.farmerMobile})</div>
                <div><strong>Facility:</strong> {decisionModalApp.schemeName}</div>
                <div><strong>Amount:</strong> ₹{decisionModalApp.requestedAmount?.toLocaleString("en-IN") || "0"}</div>
              </div>

              <form onSubmit={handleRecordDecision} style={{ display: "grid", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    Decision *
                  </label>
                  <select
                    value={decisionType}
                    onChange={(e) => setDecisionType(e.target.value as any)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }}
                  >
                    <option value="APPROVED">APPROVED (Sanction Credit Facility)</option>
                    <option value="ADDITIONAL_INFORMATION_REQUIRED">ADDITIONAL_INFORMATION_REQUIRED (Request Documents)</option>
                    <option value="REJECTED">REJECTED (Decline Application)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    Bank Reference / Sanction Letter Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SBI-KCC-SANCTION-2026-0041"
                    value={bankRefNo}
                    onChange={(e) => setBankRefNo(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                    Underwriting Justification / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Approved under 4% prompt repayment subvention. Scale of finance verified."
                    value={decisionNotes}
                    onChange={(e) => setDecisionNotes(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 14 }}
                  />
                </div>

                {decisionStatusMsg && (
                  <div style={{ fontSize: 13, fontWeight: 600, color: decisionStatusMsg.startsWith("✅") ? "#15803d" : "#b91c1c" }}>
                    {decisionStatusMsg}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => setDecisionModalApp(null)}
                    style={{ padding: "8px 16px", background: "#e2e8f0", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ padding: "8px 18px", background: "#1e3a8a", color: "#ffffff", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}
                  >
                    Submit Decision to Workflow Engine
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
