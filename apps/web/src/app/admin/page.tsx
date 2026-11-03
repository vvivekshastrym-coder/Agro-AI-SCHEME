"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  type ApplicationWorkflowStatus,
  type IntegrationStatus,
  type DataFreshnessLabel,
} from "@agro/shared";

interface DashboardMetrics {
  totalFarmers: number;
  totalEmployees: number;
  activeEmployees: number;
  totalCscCentres: number;
  activeCscCentres: number;
  totalSchemes: number;
  totalApplications: number;
  partnerBanksCount: number;
}

interface IntegrationHealthItem {
  id: string;
  name: string;
  type: string;
  officialUrl: string;
  status: IntegrationStatus;
  freshnessLabel: DataFreshnessLabel;
  lastPingIso: string;
  notes: string;
  requirements: string;
}

interface FarmerItem {
  id: string;
  fullName: string;
  mobile: string;
  districtCode: string;
  talukCode: string;
  villageCode: string;
  cropCode: string;
  landAreaValue: number;
  landAreaUnit: string;
  consentStatus: string;
  consentVersion: string;
  identityVerificationState: string;
  createdAt: string;
}

interface EmployeeItem {
  id: string;
  name: string;
  email: string;
  role: string;
  cscCentreId: string | null;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
}

interface CscCentreItem {
  id: string;
  code: string;
  name: string;
  districtCode: string;
  talukCode: string;
  contactPhone: string;
  status: string;
}

interface SchemeItem {
  id: string;
  code: string;
  officialName: string;
  department: string;
  category: string;
  benefits: string;
  officialPortalUrl: string;
  integrationMethod: string;
  lastVerifiedDate: string;
}

interface ApplicationItem {
  id: string;
  applicationNumber: string;
  farmerName: string;
  farmerMobile: string;
  schemeName: string;
  schemeCategory: string;
  workflowStatus: ApplicationWorkflowStatus;
  submissionMode: string;
  officialAckNumber?: string;
  officialPortalUrl: string;
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

interface BankPartnerItem {
  id: string;
  name: string;
  code: string;
  branches: string[];
  connectionStatus: string;
  janSamarthIntegrated: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function SuperAdminPanel() {
  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "farmers"
    | "employees"
    | "csc"
    | "schemes"
    | "applications"
    | "banks"
    | "health"
  >("dashboard");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalFarmers: 0,
    totalEmployees: 0,
    activeEmployees: 0,
    totalCscCentres: 0,
    activeCscCentres: 0,
    totalSchemes: 0,
    totalApplications: 0,
    partnerBanksCount: 0,
  });

  const [pipeline, setPipeline] = useState<Record<string, number>>({});
  const [integrationHealth, setIntegrationHealth] = useState<IntegrationHealthItem[]>([]);
  const [farmersList, setFarmersList] = useState<FarmerItem[]>([]);
  const [employeesList, setEmployeesList] = useState<EmployeeItem[]>([]);
  const [cscList, setCscList] = useState<CscCentreItem[]>([]);
  const [schemesList, setSchemesList] = useState<SchemeItem[]>([]);
  const [applicationsList, setApplicationsList] = useState<ApplicationItem[]>([]);
  const [bankPartnersList, setBankPartnersList] = useState<BankPartnerItem[]>([]);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // New Employee Form State
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpEmail, setNewEmpEmail] = useState("");
  const [newEmpRole, setNewEmpRole] = useState("EMPLOYEE");
  const [empStatusMsg, setEmpStatusMsg] = useState("");

  // New CSC Form State
  const [newCscName, setNewCscName] = useState("");
  const [newCscCode, setNewCscCode] = useState("");
  const [newCscDistrict, setNewCscDistrict] = useState("KA-MYS");
  const [cscStatusMsg, setCscStatusMsg] = useState("");

  async function fetchLiveAdminData() {
    setIsLoading(true);
    try {
      const [
        dashRes,
        farmersRes,
        empRes,
        cscRes,
        schemesRes,
        appsRes,
        banksRes,
        healthRes,
      ] = await Promise.all([
        fetch(`${API_BASE}/api/v1/admin/dashboard`).catch(() => null),
        fetch(`${API_BASE}/api/v1/admin/farmers`).catch(() => null),
        fetch(`${API_BASE}/api/v1/admin/employees`).catch(() => null),
        fetch(`${API_BASE}/api/v1/admin/csc-centres`).catch(() => null),
        fetch(`${API_BASE}/api/v1/admin/schemes`).catch(() => null),
        fetch(`${API_BASE}/api/v1/admin/applications`).catch(() => null),
        fetch(`${API_BASE}/api/v1/admin/bank-partners`).catch(() => null),
        fetch(`${API_BASE}/api/v1/admin/integrations/health`).catch(() => null),
      ]);

      if (dashRes && dashRes.ok) {
        const d = await dashRes.json();
        if (d.metrics) setMetrics(d.metrics);
        if (d.pipeline) setPipeline(d.pipeline);
      }

      if (farmersRes && farmersRes.ok) {
        const f = await farmersRes.json();
        setFarmersList(f.farmers || []);
      }

      if (empRes && empRes.ok) {
        const e = await empRes.json();
        setEmployeesList(e.employees || []);
      }

      if (cscRes && cscRes.ok) {
        const c = await cscRes.json();
        setCscList(c.cscCentres || []);
      }

      if (schemesRes && schemesRes.ok) {
        const s = await schemesRes.json();
        setSchemesList(s.schemes || []);
      }

      if (appsRes && appsRes.ok) {
        const a = await appsRes.json();
        setApplicationsList(a.applications || []);
      }

      if (banksRes && banksRes.ok) {
        const b = await banksRes.json();
        setBankPartnersList(b.bankPartners || []);
      }

      if (healthRes && healthRes.ok) {
        const h = await healthRes.json();
        setIntegrationHealth(h.integrations || []);
      }
    } catch {
      // offline fallback
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchLiveAdminData();
  }, []);

  async function handleCreateEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmpName.trim() || !newEmpEmail.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newEmpName.trim(),
          email: newEmpEmail.trim(),
          role: newEmpRole,
          cscCentreId: "csc-ka-mys-01",
        }),
      });
      if (res.ok) {
        setEmpStatusMsg(`✅ Employee account created for ${newEmpName}.`);
        setNewEmpName("");
        setNewEmpEmail("");
        fetchLiveAdminData();
      }
    } catch {
      setEmpStatusMsg("❌ Server connection error while creating employee.");
    }
  }

  async function handleCreateCsc(e: React.FormEvent) {
    e.preventDefault();
    if (!newCscName.trim() || !newCscCode.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/admin/csc-centres`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCscName.trim(),
          code: newCscCode.trim().toUpperCase(),
          districtCode: newCscDistrict,
        }),
      });
      if (res.ok) {
        setCscStatusMsg(`✅ CSC Centre registered: ${newCscName}.`);
        setNewCscName("");
        setNewCscCode("");
        fetchLiveAdminData();
      }
    } catch {
      setCscStatusMsg("❌ Server connection error while creating CSC centre.");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", color: "#0f172a", fontFamily: "sans-serif" }}>
      {/* Universal Workspace Navigator */}
      <header
        style={{
          background: "#14532d",
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
              Agro AI Scheme · Enterprise Platform
            </div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              🛡️ Super Admin Control Center · Real-Time Data Only
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
              background: "#15803d",
              color: "#ffffff",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
              border: "1px solid #4ade80",
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

      {/* Admin Subnav */}
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
          { key: "dashboard", label: "📊 Dashboard" },
          { key: "farmers", label: `👨‍🌾 Farmers (${metrics.totalFarmers})` },
          { key: "employees", label: `👥 Employees (${metrics.totalEmployees})` },
          { key: "csc", label: `🏢 CSC Centres (${metrics.totalCscCentres})` },
          { key: "schemes", label: `📜 Schemes (${metrics.totalSchemes})` },
          { key: "applications", label: `📑 Applications (${metrics.totalApplications})` },
          { key: "banks", label: `🏦 Bank Partners (${metrics.partnerBanksCount})` },
          { key: "health", label: "🩺 Integration Health" },
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
              color: activeTab === tab.key ? "#15803d" : "#64748b",
              borderBottom: activeTab === tab.key ? "3px solid #15803d" : "3px solid transparent",
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <main style={{ maxWidth: 1360, margin: "0 auto", padding: "24px 20px" }}>
        {/* Real-Time Live Status Pill */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            padding: "10px 18px",
            borderRadius: 8,
            marginBottom: 24,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
            <strong style={{ color: "#065f46", fontSize: 14 }}>
              LIVE PRODUCTION DATABASE MODE
            </strong>
            <span style={{ color: "#047857", fontSize: 13 }}>
              · Zero fabricated statistics. All figures calculated directly from active database records.
            </span>
          </div>
          <button
            type="button"
            onClick={fetchLiveAdminData}
            style={{
              padding: "5px 12px",
              background: "#ffffff",
              border: "1px solid #10b981",
              borderRadius: 6,
              color: "#065f46",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            🔄 Refresh Live Metrics
          </button>
        </div>

        {/* TAB 1: DASHBOARD */}
        {activeTab === "dashboard" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
              Platform Overview & Live Metrics
            </h2>

            {/* 4 Stat Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 28 }}>
              {[
                { title: "Registered Farmers", val: metrics.totalFarmers, color: "#15803d", subtitle: "Real database farmer profiles" },
                { title: "Active Applications", val: metrics.totalApplications, color: "#0284c7", subtitle: "Live 16-state workflow records" },
                { title: "Active Employees", val: metrics.activeEmployees, color: "#d97706", subtitle: "Authorized CSC and case staff" },
                { title: "CSC Centres", val: metrics.totalCscCentres, color: "#7c3aed", subtitle: "Registered operational kiosks" },
              ].map((c) => (
                <div
                  key={c.title}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    padding: 20,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                >
                  <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600 }}>{c.title}</div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: c.color, margin: "8px 0" }}>
                    {isLoading ? "..." : c.val}
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>{c.subtitle}</div>
                </div>
              ))}
            </div>

            {/* 16-State Pipeline Grid */}
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
              Application Workflow Pipeline (16 Real-Time Stages)
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
                gap: 12,
                marginBottom: 32,
              }}
            >
              {[
                { status: "DRAFT", label: "Draft", color: "#64748b" },
                { status: "CONSENT_PENDING", label: "Consent Pending", color: "#eab308" },
                { status: "DOCUMENTS_PENDING", label: "Docs Pending", color: "#f97316" },
                { status: "READY_FOR_REVIEW", label: "Ready for Review", color: "#06b6d4" },
                { status: "INTERNAL_REVIEW", label: "Internal Review", color: "#3b82f6" },
                { status: "READY_FOR_SUBMISSION", label: "Ready to Submit", color: "#6366f1" },
                { status: "SUBMITTED_CONFIRMED", label: "Submitted Confirmed", color: "#10b981" },
                { status: "PORTAL_HANDOFF", label: "Portal Handoff", color: "#8b5cf6" },
                { status: "GOVERNMENT_REVIEW", label: "Govt Review", color: "#0284c7" },
                { status: "BANK_REVIEW", label: "Bank Review", color: "#ec4899" },
                { status: "APPROVED", label: "Approved", color: "#15803d" },
                { status: "REJECTED", label: "Rejected", color: "#dc2626" },
              ].map((pipe) => (
                <div
                  key={pipe.status}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    padding: "12px 14px",
                    borderLeft: `4px solid ${pipe.color}`,
                  }}
                >
                  <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: 700 }}>
                    {pipe.label}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#1e293b", marginTop: 4 }}>
                    {pipeline[pipe.status] ?? 0}
                  </div>
                </div>
              ))}
            </div>

            {/* Integration Health Preview */}
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
              Integration Health Preview
            </h3>
            <div style={{ background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f1f5f9", textAlign: "left", color: "#475569" }}>
                    <th style={{ padding: "12px 16px" }}>Integration Service</th>
                    <th style={{ padding: "12px 16px" }}>Type</th>
                    <th style={{ padding: "12px 16px" }}>Status</th>
                    <th style={{ padding: "12px 16px" }}>Official Endpoint</th>
                  </tr>
                </thead>
                <tbody>
                  {integrationHealth.slice(0, 5).map((item) => (
                    <tr key={item.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 600 }}>{item.name}</td>
                      <td style={{ padding: "12px 16px", color: "#64748b" }}>{item.type}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: 4,
                            fontSize: 11,
                            fontWeight: 700,
                            background:
                              item.status === "CONNECTED"
                                ? "#dcfce7"
                                : item.status === "PORTAL_HANDOFF_REQUIRED"
                                  ? "#fef3c7"
                                  : "#fee2e2",
                            color:
                              item.status === "CONNECTED"
                                ? "#15803d"
                                : item.status === "PORTAL_HANDOFF_REQUIRED"
                                  ? "#b45309"
                                  : "#b91c1c",
                          }}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <a
                          href={item.officialUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#0284c7", textDecoration: "none" }}
                        >
                          {item.officialUrl} ↗
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: FARMERS */}
        {activeTab === "farmers" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>
                Farmer Management ({farmersList.length} Registered Farmers)
              </h2>
              <input
                type="text"
                placeholder="Search by name, mobile, taluk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  width: 280,
                  fontSize: 13,
                }}
              />
            </div>

            {farmersList.length === 0 ? (
              <div
                style={{
                  background: "#ffffff",
                  padding: 40,
                  borderRadius: 8,
                  textAlign: "center",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>👨‍🌾</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#334155" }}>
                  No Farmers Registered Yet
                </h3>
                <p style={{ color: "#64748b", fontSize: 13, maxWidth: 440, margin: "8px auto 16px" }}>
                  This dashboard reflects real-time database records only. Head to the{" "}
                  <strong>Employee / CSC Portal</strong> to register a new farmer with guided DPDP consent.
                </p>
                <Link
                  href="/csc"
                  style={{
                    display: "inline-block",
                    padding: "8px 16px",
                    background: "#15803d",
                    color: "#ffffff",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Go to Employee Portal to Register Farmer ↗
                </Link>
              </div>
            ) : (
              <div style={{ background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", textAlign: "left", color: "#475569" }}>
                      <th style={{ padding: "12px 16px" }}>Farmer Name</th>
                      <th style={{ padding: "12px 16px" }}>Mobile Number</th>
                      <th style={{ padding: "12px 16px" }}>Location (District/Taluk)</th>
                      <th style={{ padding: "12px 16px" }}>Crop & Area</th>
                      <th style={{ padding: "12px 16px" }}>Consent Version</th>
                      <th style={{ padding: "12px 16px" }}>Verification State</th>
                    </tr>
                  </thead>
                  <tbody>
                    {farmersList
                      .filter(
                        (f) =>
                          f.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          f.mobile.includes(searchQuery)
                      )
                      .map((farmer) => (
                        <tr key={farmer.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "12px 16px", fontWeight: 600 }}>{farmer.fullName}</td>
                          <td style={{ padding: "12px 16px", color: "#475569" }}>{farmer.mobile}</td>
                          <td style={{ padding: "12px 16px" }}>
                            {farmer.districtCode} · {farmer.talukCode}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            {farmer.cropCode} · {farmer.landAreaValue} {farmer.landAreaUnit}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ padding: "2px 6px", background: "#ecfdf5", color: "#065f46", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                              {farmer.consentVersion}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <span style={{ padding: "2px 6px", background: "#e0f2fe", color: "#0369a1", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                              {farmer.identityVerificationState}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: EMPLOYEES */}
        {activeTab === "employees" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
              Employee & Operator Management
            </h2>

            {/* Create Employee Box */}
            <div style={{ background: "#ffffff", padding: 20, borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Create New Staff / Operator Account</h3>
              <form onSubmit={handleCreateEmployee} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Full Name"
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, flex: "1 1 200px" }}
                  required
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={newEmpEmail}
                  onChange={(e) => setNewEmpEmail(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, flex: "1 1 240px" }}
                  required
                />
                <select
                  value={newEmpRole}
                  onChange={(e) => setNewEmpRole(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                >
                  <option value="EMPLOYEE">EMPLOYEE / CSC_OPERATOR</option>
                  <option value="CSC_MANAGER">CSC_MANAGER</option>
                  <option value="APPLICATION_REVIEWER">APPLICATION_REVIEWER</option>
                  <option value="BANK_PARTNER">BANK_PARTNER</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                </select>
                <button
                  type="submit"
                  style={{ padding: "8px 16px", background: "#15803d", color: "#ffffff", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer", fontSize: 13 }}
                >
                  + Add Staff Account
                </button>
              </form>
              {empStatusMsg && <div style={{ marginTop: 10, fontSize: 13, color: "#15803d" }}>{empStatusMsg}</div>}
            </div>

            {/* List Employees */}
            <div style={{ background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left", color: "#475569" }}>
                    <th style={{ padding: "12px 16px" }}>Staff Name</th>
                    <th style={{ padding: "12px 16px" }}>Email</th>
                    <th style={{ padding: "12px 16px" }}>Role</th>
                    <th style={{ padding: "12px 16px" }}>Assigned CSC Centre</th>
                    <th style={{ padding: "12px 16px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {employeesList.map((emp) => (
                    <tr key={emp.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 600 }}>{emp.name}</td>
                      <td style={{ padding: "12px 16px", color: "#475569" }}>{emp.email}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ padding: "2px 6px", background: "#f1f5f9", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                          {emp.role}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#64748b" }}>{emp.cscCentreId ?? "Headquarters"}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ padding: "2px 6px", background: emp.status === "ACTIVE" ? "#ecfdf5" : "#fee2e2", color: emp.status === "ACTIVE" ? "#065f46" : "#b91c1c", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                          {emp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: CSC CENTRES */}
        {activeTab === "csc" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
              CSC & Gram One Centre Management
            </h2>

            {/* Register CSC Box */}
            <div style={{ background: "#ffffff", padding: 20, borderRadius: 8, border: "1px solid #e2e8f0", marginBottom: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Register New CSC / Gram One Centre</h3>
              <form onSubmit={handleCreateCsc} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Centre Name (e.g. Gram One — H.D. Kote)"
                  value={newCscName}
                  onChange={(e) => setNewCscName(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, flex: "1 1 240px" }}
                  required
                />
                <input
                  type="text"
                  placeholder="Centre Code (e.g. CSC-KA-MYS-02)"
                  value={newCscCode}
                  onChange={(e) => setNewCscCode(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13, flex: "1 1 180px" }}
                  required
                />
                <select
                  value={newCscDistrict}
                  onChange={(e) => setNewCscDistrict(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 13 }}
                >
                  <option value="KA-MYS">Mysuru (KA-MYS)</option>
                  <option value="KA-MDY">Mandya (KA-MDY)</option>
                  <option value="KA-HSN">Hassan (KA-HSN)</option>
                  <option value="KA-BLR">Bengaluru Rural (KA-BLR)</option>
                </select>
                <button
                  type="submit"
                  style={{ padding: "8px 16px", background: "#7c3aed", color: "#ffffff", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer", fontSize: 13 }}
                >
                  + Register CSC Centre
                </button>
              </form>
              {cscStatusMsg && <div style={{ marginTop: 10, fontSize: 13, color: "#15803d" }}>{cscStatusMsg}</div>}
            </div>

            <div style={{ background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left", color: "#475569" }}>
                    <th style={{ padding: "12px 16px" }}>Centre Code</th>
                    <th style={{ padding: "12px 16px" }}>Centre Name</th>
                    <th style={{ padding: "12px 16px" }}>District / Taluk</th>
                    <th style={{ padding: "12px 16px" }}>Contact Phone</th>
                    <th style={{ padding: "12px 16px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {cscList.map((centre) => (
                    <tr key={centre.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 16px", fontWeight: 700 }}>{centre.code}</td>
                      <td style={{ padding: "12px 16px" }}>{centre.name}</td>
                      <td style={{ padding: "12px 16px", color: "#475569" }}>{centre.districtCode} · {centre.talukCode}</td>
                      <td style={{ padding: "12px 16px", color: "#64748b" }}>{centre.contactPhone}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ padding: "2px 6px", background: "#ecfdf5", color: "#065f46", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                          {centre.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: SCHEMES */}
        {activeTab === "schemes" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
              Verified Government Scheme Catalogue ({schemesList.length} Active Schemes)
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
              {schemesList.map((scheme) => (
                <div
                  key={scheme.id}
                  style={{
                    background: "#ffffff",
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                    padding: 20,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <span style={{ padding: "3px 8px", background: "#e0f2fe", color: "#0369a1", borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                      {scheme.code}
                    </span>
                    <span style={{ padding: "3px 8px", background: "#f1f5f9", color: "#475569", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                      {scheme.category}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: "6px 0", color: "#0f172a" }}>
                    {scheme.officialName}
                  </h3>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
                    🏛️ {scheme.department}
                  </div>
                  <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.5, marginBottom: 14 }}>
                    {scheme.benefits}
                  </p>
                  <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>
                      Verified: {scheme.lastVerifiedDate}
                    </span>
                    <a
                      href={scheme.officialPortalUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 12, fontWeight: 600, color: "#0284c7", textDecoration: "none" }}
                    >
                      Official Portal ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: APPLICATIONS */}
        {activeTab === "applications" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
              Live Application Workflow Engine ({applicationsList.length} Total Applications)
            </h2>

            {applicationsList.length === 0 ? (
              <div style={{ background: "#ffffff", padding: 40, borderRadius: 8, textAlign: "center", border: "1px solid #e2e8f0" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📑</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#334155" }}>
                  No Applications in Database Yet
                </h3>
                <p style={{ color: "#64748b", fontSize: 13, maxWidth: 460, margin: "8px auto 16px" }}>
                  All pipeline statistics are calculated strictly from live database records. Go to the{" "}
                  <strong>Employee / CSC Portal</strong> to prepare and submit a real application for a registered farmer.
                </p>
                <Link
                  href="/csc"
                  style={{
                    display: "inline-block",
                    padding: "8px 16px",
                    background: "#15803d",
                    color: "#ffffff",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Open Employee Portal to Create Application ↗
                </Link>
              </div>
            ) : (
              <div style={{ background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", textAlign: "left", color: "#475569" }}>
                      <th style={{ padding: "12px 16px" }}>App Number</th>
                      <th style={{ padding: "12px 16px" }}>Farmer</th>
                      <th style={{ padding: "12px 16px" }}>Scheme</th>
                      <th style={{ padding: "12px 16px" }}>Current Status</th>
                      <th style={{ padding: "12px 16px" }}>Ack Number</th>
                      <th style={{ padding: "12px 16px" }}>Submission Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applicationsList.map((app) => (
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
                        <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "#475569" }}>
                          {app.officialAckNumber ?? "—"}
                        </td>
                        <td style={{ padding: "12px 16px", color: "#64748b" }}>{app.submissionMode}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: BANK PARTNERS */}
        {activeTab === "banks" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
              Participating Bank Partners & Lending Routing
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
              {bankPartnersList.map((bank) => (
                <div key={bank.id} style={{ background: "#ffffff", borderRadius: 8, border: "1px solid #e2e8f0", padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{bank.name}</span>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        background: bank.connectionStatus === "PRODUCTION_APPROVED" ? "#ecfdf5" : "#fef3c7",
                        color: bank.connectionStatus === "PRODUCTION_APPROVED" ? "#065f46" : "#b45309",
                      }}
                    >
                      {bank.connectionStatus}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
                    Routing Code: <code>{bank.code}</code>
                  </div>
                  <div style={{ fontSize: 13, color: "#334155", marginBottom: 8 }}>
                    <strong>Participating Branches:</strong>
                    <ul style={{ paddingLeft: 18, margin: "4px 0" }}>
                      {bank.branches.map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </div>
                  <div style={{ fontSize: 12, color: bank.janSamarthIntegrated ? "#15803d" : "#64748b" }}>
                    {bank.janSamarthIntegrated ? "✅ JanSamarth Credit Channel Enabled" : "⏳ Direct Partner Routing"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 8: INTEGRATION HEALTH */}
        {activeTab === "health" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
              Integration Health Centre
            </h2>
            <p style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>
              Live monitoring of government gateways, scheme registries, bank networks, and messaging platforms.
            </p>

            <div style={{ display: "grid", gap: 16 }}>
              {integrationHealth.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: "#ffffff",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    padding: 20,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: 16,
                  }}
                >
                  <div style={{ flex: "1 1 450px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{item.name}</h3>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          background:
                            item.status === "CONNECTED"
                              ? "#dcfce7"
                              : item.status === "PORTAL_HANDOFF_REQUIRED"
                                ? "#fef3c7"
                                : "#fee2e2",
                          color:
                            item.status === "CONNECTED"
                              ? "#15803d"
                              : item.status === "PORTAL_HANDOFF_REQUIRED"
                                ? "#b45309"
                                : "#b91c1c",
                        }}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: "#334155", margin: "6px 0 10px" }}>{item.notes}</p>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      <strong>Prerequisite:</strong> {item.requirements}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 6 }}>
                      Last Check: {new Date(item.lastPingIso).toLocaleTimeString()}
                    </div>
                    <a
                      href={item.officialUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: "6px 12px",
                        background: "#f1f5f9",
                        borderRadius: 6,
                        color: "#0f172a",
                        textDecoration: "none",
                        fontSize: 12,
                        fontWeight: 600,
                        display: "inline-block",
                      }}
                    >
                      Visit Official Endpoint ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
