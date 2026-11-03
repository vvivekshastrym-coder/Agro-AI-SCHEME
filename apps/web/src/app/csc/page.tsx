"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface ConsentedFarmer {
  shareId: string;
  farmerId: string;
  farmerName: string;
  districtCode: string;
  scopes: string[];
  purpose: string;
  expiresAt: string;
  plotCount: number;
}

interface CscTokenItem {
  id: string;
  tokenCode: string;
  farmerId: string;
  farmerName: string;
  centreName: string;
  districtCode: string;
  purpose: string;
  checklistItems: string[];
  status: "BOOKED" | "IN_PROGRESS" | "COMPLETED";
  createdAt: string;
}

interface WhatsAppHandoffItem {
  wamid: string;
  inboundText: string;
  selectedOption: string;
  replyTextKn: string;
  createdAt: string;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function CscOperatorDeskPage() {
  const [token, setToken] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<"loading" | "synced" | "offline">(
    "loading"
  );
  const [consentedFarmers, setConsentedFarmers] = useState<ConsentedFarmer[]>([
    {
      shareId: "demo-share-1",
      farmerId: "demo-farmer-1",
      farmerName: "ಶಿವಣ್ಣ ಗೌಡ (Shivanna Gowda)",
      districtCode: "KA-MYS",
      scopes: [
        "profile:read",
        "plots:read",
        "plots:write",
        "schemes:read",
        "documents:read",
        "cases:read",
        "cases:write",
      ],
      purpose: "DEMO: Consented CSC assistance for scheme & claim filing",
      expiresAt: "2026-12-02T00:00:00.000Z",
      plotCount: 1,
    },
  ]);
  const [tokensQueue, setTokensQueue] = useState<CscTokenItem[]>([
    {
      id: "demo-tok-1",
      tokenCode: "KA-CSC-1001",
      farmerId: "demo-farmer-1",
      farmerName: "ಶಿವಣ್ಣ ಗೌಡ (Shivanna Gowda)",
      centreName: "Raitha Samparka Kendra / CSC — H.D. Kote (Mysuru)",
      districtCode: "KA-MYS",
      purpose: "RTC Pahani Verification & Micro-Irrigation Application",
      checklistItems: [
        "Original RTC / Pahani",
        "Bank Passbook (for portal reference only — never share PIN/OTP)",
        "Mobile phone for portal OTP",
      ],
      status: "BOOKED",
      createdAt: new Date().toISOString(),
    },
  ]);
  const [whatsappHandoffs, setWhatsappHandoffs] = useState<
    WhatsAppHandoffItem[]
  >([]);
  const [selectedFarmerIdx, setSelectedFarmerIdx] = useState(0);
  const [newPlotName, setNewPlotName] = useState("");
  const [newSurveyNo, setNewSurveyNo] = useState("");
  const [newAreaAcres, setNewAreaAcres] = useState("1.5");
  const [operatorActionMsg, setOperatorActionMsg] = useState<string | null>(
    null
  );

  async function refreshWorkspace(accessToken: string) {
    try {
      const res = await fetch(`${API_BASE}/api/v1/csc/workspace`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.consentedFarmers) && data.consentedFarmers.length > 0) {
          setConsentedFarmers(data.consentedFarmers);
        }
        if (Array.isArray(data.tokensQueue) && data.tokensQueue.length > 0) {
          setTokensQueue(data.tokensQueue);
        }
        if (Array.isArray(data.whatsappHandoffs)) {
          setWhatsappHandoffs(data.whatsappHandoffs);
        }
        setSyncState("synced");
      }
    } catch {
      setSyncState("offline");
    }
  }

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/auth/demo-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "CSC_OPERATOR" }),
        });
        if (!res.ok) throw new Error("Failed CSC session");
        const session = await res.json();
        if (!active) return;
        setToken(session.accessToken);
        await refreshWorkspace(session.accessToken);
      } catch {
        if (active) setSyncState("offline");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const activeFarmer = consentedFarmers[selectedFarmerIdx] ?? consentedFarmers[0];

  async function handleAddPlotOnBehalf(e: React.FormEvent) {
    e.preventDefault();
    if (!activeFarmer || !newPlotName.trim() || !newSurveyNo.trim()) return;
    if (token) {
      try {
        const res = await fetch(
          `${API_BASE}/api/v1/farmers/${activeFarmer.farmerId}/plots`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              plotName: newPlotName.trim(),
              surveyNumber: newSurveyNo.trim(),
              districtCode: activeFarmer.districtCode,
              talukCode: "KA-MYS-HDK",
              villageCode: "KA-MYS-HDK-001",
              areaValue: Number(newAreaAcres) || 1.5,
              areaUnit: "ACRE",
              ownershipType: "OWNER",
              irrigationType: "RAINFED",
              provenance: "CSC_ENTERED",
            }),
          }
        );
        if (res.ok) {
          setOperatorActionMsg(
            `Plot "${newPlotName}" added with provenance CSC_ENTERED and logged in farmer's audit trail.`
          );
          setNewPlotName("");
          setNewSurveyNo("");
          await refreshWorkspace(token);
          return;
        }
      } catch {
        // Fallback below
      }
    }
    setOperatorActionMsg(
      `[DEMO] Plot "${newPlotName}" (Sy.No ${newSurveyNo}) recorded under CSC_ENTERED provenance.`
    );
    setNewPlotName("");
    setNewSurveyNo("");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F6F3EC",
        color: "#1C281E",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div className="disclaimer-banner" role="region" aria-label="CSC Operator Disclosure">
        <span>
          <strong>CSC OPERATOR & RAITHA SAMPARKA KENDRA CASE DESK (/csc)</strong>{" "}
          • Operators can ONLY access farmer records with an active, time-bound,
          scoped <code>authorized_share</code> granted by the farmer.
        </span>
        <span className="chip demo">
          {syncState === "synced"
            ? "LIVE API CONNECTED (:4000)"
            : "LOCAL DEMO MODE"}
        </span>
      </div>

      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 24px",
          background: "#FFFFFF",
          borderBottom: "1px solid #D9D2C5",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.35rem" }}>
            3-Column CSC Assisted Filing & Token Desk
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "0.9rem", color: "#49564B" }}>
            Every CSC-entered fact is tagged <code>CSC_ENTERED</code> and
            recorded in <code>document_access_logs</code>
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/" className="btn btn-secondary">
            ← Farmer App
          </Link>
          <Link href="/reviewer" className="btn btn-secondary">
            Reviewer Studio (/reviewer)
          </Link>
          <Link href="/admin" className="btn btn-secondary">
            Admin Console (/admin)
          </Link>
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 20,
          padding: 24,
        }}
      >
        {/* Column 1: Digital Token Queue & WhatsApp Handoffs */}
        <section aria-label="Column 1: Token Queue">
          <h2 style={{ marginTop: 0 }}>1. Visit Tokens & WhatsApp Queue</h2>
          {tokensQueue.map((t) => (
            <article key={t.id} className="card">
              <div className="trust-strip">
                <span className="chip ok">{t.tokenCode}</span>
                <span className="chip demo">{t.status}</span>
              </div>
              <h3>{t.farmerName}</h3>
              <p style={{ margin: "4px 0" }}>
                <strong>Purpose:</strong> {t.purpose}
              </p>
              <p className="muted" style={{ fontSize: "0.85rem" }}>
                Centre: {t.centreName}
              </p>
              <ul style={{ paddingLeft: 18, fontSize: "0.88rem" }}>
                {t.checklistItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}

          <h3>WhatsApp Option 7 Handoff Inbox</h3>
          {whatsappHandoffs.length === 0 ? (
            <article className="card">
              <p className="muted">
                No pending WhatsApp escalations right now. (Send &ldquo;7&rdquo; in the
                WhatsApp Simulator to test instant CSC handoff.)
              </p>
            </article>
          ) : (
            whatsappHandoffs.map((w) => (
              <article key={w.wamid} className="card">
                <span className="chip warn">WHATSAPP HANDOFF</span>
                <p>{w.replyTextKn}</p>
                <small className="muted">wamid: {w.wamid}</small>
              </article>
            ))
          )}
        </section>

        {/* Column 2: Case Workspace (Assisted Plot/Claim Entry) */}
        <section aria-label="Column 2: Case Workspace">
          <h2 style={{ marginTop: 0 }}>2. Assisted Case Workspace</h2>
          {activeFarmer ? (
            <div className="card">
              <div className="trust-strip">
                <span className="chip ok">CONSENTED SHARE ACTIVE</span>
                <span className="chip info">PROVENANCE: CSC_ENTERED</span>
              </div>
              <h3>Assisting: {activeFarmer.farmerName}</h3>
              <p className="muted">
                Add a plot on behalf of the farmer using their RTC/Pahani. All
                entries are automatically tagged <code>CSC_ENTERED</code>.
              </p>
              <form onSubmit={handleAddPlotOnBehalf}>
                <div className="field">
                  <label htmlFor="csc-plot-name">Plot Name (Kannada/English)</label>
                  <input
                    id="csc-plot-name"
                    value={newPlotName}
                    onChange={(e) => setNewPlotName(e.target.value)}
                    placeholder="ಉದಾ: ದಕ್ಷಿಣ ತಾಕು / South Plot"
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="csc-survey-no">RTC Survey / Hissa Number</label>
                  <input
                    id="csc-survey-no"
                    value={newSurveyNo}
                    onChange={(e) => setNewSurveyNo(e.target.value)}
                    placeholder="145/1B"
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="csc-area">Area (Acres)</label>
                  <input
                    id="csc-area"
                    type="number"
                    step="0.1"
                    value={newAreaAcres}
                    onChange={(e) => setNewAreaAcres(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  Save Plot Under CSC_ENTERED Provenance
                </button>
              </form>
              {operatorActionMsg && (
                <p
                  style={{
                    marginTop: 12,
                    padding: 12,
                    background: "#E8F5EC",
                    borderRadius: 10,
                    color: "#1B6B3A",
                    fontWeight: 600,
                  }}
                >
                  {operatorActionMsg}
                </p>
              )}
            </div>
          ) : (
            <div className="card">
              <p>Select a consented farmer to begin assisted filing.</p>
            </div>
          )}
        </section>

        {/* Column 3: Consented Farmer Context & Scopes */}
        <section aria-label="Column 3: Consented Farmer Context">
          <h2 style={{ marginTop: 0 }}>3. Consented Farmer Share Scopes</h2>
          {consentedFarmers.map((f, idx) => (
            <article
              key={f.shareId}
              className="card"
              style={{
                border:
                  idx === selectedFarmerIdx
                    ? "2px solid #1E5631"
                    : "1px solid #D9D2C5",
              }}
            >
              <div className="trust-strip">
                <span className="chip ok">SCOPED SHARE</span>
                <span className="chip info">{f.plotCount} Plots</span>
              </div>
              <h3>{f.farmerName}</h3>
              <p style={{ fontSize: "0.88rem" }}>
                <strong>Purpose:</strong> {f.purpose}
              </p>
              <p className="muted" style={{ fontSize: "0.82rem" }}>
                Expires: {f.expiresAt ? f.expiresAt.slice(0, 10) : "N/A"}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {f.scopes.map((sc) => (
                  <span key={sc} className="chip demo">
                    {sc}
                  </span>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: 12, width: "100%" }}
                onClick={() => setSelectedFarmerIdx(idx)}
              >
                Select Farmer Context
              </button>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
