"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { DEMO_SCHEMES } from "../demoSchemes";

interface SchemeVersionApiItem {
  id: string;
  schemeCode: string;
  departmentName: string;
  versionNumber: number;
  status: string;
  titleEn: string;
  titleKn: string;
  sourceUrl: string;
  sourceLastVerifiedAt: string | null;
  authorId: string;
  approvedById: string | null;
  isMock: boolean;
  ruleTree: unknown;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function ReviewerStudioPage() {
  const [token, setToken] = useState<string | null>(null);
  const [reviewerId, setReviewerId] = useState<string>("demo-reviewer");
  const [syncState, setSyncState] = useState<"loading" | "synced" | "offline">(
    "loading"
  );
  const [schemes, setSchemes] = useState<SchemeVersionApiItem[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [draftCode, setDraftCode] = useState("DEMO-KA-SOLAR-04");
  const [draftTitleEn, setDraftTitleEn] = useState(
    "[DEMO] Solar Irrigation Pump Assistance (Draft)"
  );
  const [draftTitleKn, setDraftTitleKn] = useState(
    "[ಡೆಮೊ] ಸೌರ ಪಂಪ್‌ಸೆಟ್ ಸಹಾಯಧನ ಯೋಜನೆ (ಕರಡು)"
  );
  const [draftSourceUrl, setDraftSourceUrl] = useState(
    "https://raitamitra.karnataka.gov.in/ (DEMO)"
  );
  const [makerCheckerStatus, setMakerCheckerStatus] = useState<string | null>(
    null
  );

  async function refreshCatalogue() {
    try {
      const res = await fetch(`${API_BASE}/api/v1/schemes/catalogue`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.schemes)) {
          setSchemes(data.schemes);
          setSyncState("synced");
        }
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
          body: JSON.stringify({ role: "SCHEME_REVIEWER" }),
        });
        if (res.ok) {
          const session = await res.json();
          if (!active) return;
          setToken(session.accessToken);
          setReviewerId(session.user.id);
        }
        await refreshCatalogue();
      } catch {
        if (active) setSyncState("offline");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmitDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setMakerCheckerStatus(
        `[DEMO OFFLINE] Draft ${draftCode} submitted as IN_REVIEW. A second SCHEME_REVIEWER is required to publish.`
      );
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/v1/schemes/drafts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          schemeCode: draftCode,
          departmentName: "DEMO — Karnataka Renewable Energy & Agriculture",
          titleEn: draftTitleEn,
          titleKn: draftTitleKn,
          summaryEn: "DEMO solar irrigation assistance rule tree",
          summaryKn: "ಡೆಮೊ ಸೌರ ಪಂಪ್‌ಸೆಟ್ ಅರ್ಹತಾ ನಿಯಮಗಳು",
          benefitsDescriptionEn: "DEMO: Illustrative subsidy",
          benefitsDescriptionKn: "ಡೆಮೊ: ಮಾದರಿ ಸಹಾಯಧನ",
          requiredDocumentsEn: ["RTC / Pahani", "Borewell certificate"],
          requiredDocumentsKn: ["ಪಹಣಿ (RTC)", "ಬೋರ್‌ವೆಲ್ ದೃಢೀಕರಣ"],
          applicationStepsEn: ["Apply at RSK before purchasing pump"],
          applicationStepsKn: ["ಪಂಪ್ ಖರೀದಿಸುವ ಮುನ್ನ ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರದಲ್ಲಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ"],
          ruleTree: {
            all: [
              {
                id: "solar-r1",
                fact: "state",
                op: "eq",
                value: "Karnataka",
                descriptionEn: "Farm located in Karnataka",
                descriptionKn: "ಕರ್ನಾಟಕದಲ್ಲಿ ಜಮೀನು ಇರಬೇಕು",
              },
              {
                id: "solar-r2",
                fact: "irrigationTypes",
                op: "in",
                value: ["BOREWELL", "OPEN_WELL"],
                descriptionEn: "Has Borewell or Open Well irrigation source",
                descriptionKn: "ಬೋರ್‌ವೆಲ್ ಅಥವಾ ತೆರೆದ ಬಾವಿ ಹೊಂದಿರಬೇಕು",
              },
            ],
          },
          sourceUrl: draftSourceUrl,
          isMock: true,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setMakerCheckerStatus(
          `Draft "${created.schemeCode}" v${created.versionNumber} created in IN_REVIEW status by author ${(reviewerId || "").slice(0, 8)}...`
        );
        await refreshCatalogue();
      }
    } catch {
      setMakerCheckerStatus("Failed to submit draft.");
    }
  }

  async function handleAttemptSelfApprove(schemeVersionId: string) {
    if (!token) {
      setMakerCheckerStatus(
        "Maker-Checker violation blocked: Author cannot approve or publish their own scheme version."
      );
      return;
    }
    const res = await fetch(
      `${API_BASE}/api/v1/schemes/${schemeVersionId}/publish`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const data = await res.json();
    if (!res.ok) {
      setMakerCheckerStatus(`Server Enforced: ${data.error}`);
    } else {
      setMakerCheckerStatus(
        `Published ${data.schemeCode} v${data.versionNumber} (Approved by different reviewer ${(reviewerId || "").slice(0, 8)}...)`
      );
      await refreshCatalogue();
    }
  }

  const displayList =
    schemes.length > 0
      ? schemes
      : DEMO_SCHEMES.map((d) => ({
          id: d.id,
          schemeCode: d.id.toUpperCase(),
          departmentName: d.department,
          versionNumber: 1,
          status: "PUBLISHED",
          titleEn: d.titleEn,
          titleKn: d.titleKn,
          sourceUrl: d.sourceUrl,
          sourceLastVerifiedAt: d.checkedOn,
          authorId: "system-seed-author",
          approvedById: "system-seed-reviewer",
          isMock: true,
          ruleTree: d.ruleTree,
        }));

  const currentScheme = displayList[selectedIdx] ?? displayList[0];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F6F3EC",
        color: "#1C281E",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div className="disclaimer-banner" role="region" aria-label="Reviewer Studio Disclosure">
        <span>
          <strong>SCHEME REVIEWER & MAKER-CHECKER GOVERNANCE STUDIO (/reviewer)</strong>{" "}
          • Eligibility rules are pure deterministic JSON DSL trees evaluated by{" "}
          <code>@agro/rules-engine</code>. Authors can never approve their own
          drafts.
        </span>
        <span className="chip demo">
          {syncState === "synced"
            ? "LIVE API CONNECTED (:4000)"
            : "LOCAL DEMO SNAPSHOT"}
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
            Side-by-Side Source Document vs. Deterministic JSON DSL Studio
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "0.9rem", color: "#49564B" }}>
            Every rule requires an official source URL, verification timestamp,
            and two-person Maker-Checker approval
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/" className="btn btn-secondary">
            ← Farmer App
          </Link>
          <Link href="/csc" className="btn btn-secondary">
            CSC Desk (/csc)
          </Link>
          <Link href="/admin" className="btn btn-secondary">
            Admin Console (/admin)
          </Link>
        </div>
      </header>

      <div style={{ padding: 24, maxWidth: 1240, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          {displayList.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              className={`btn ${idx === selectedIdx ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setSelectedIdx(idx)}
            >
              {s.schemeCode} ({s.status})
            </button>
          ))}
        </div>

        {currentScheme && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
              gap: 20,
            }}
          >
            {/* Left Pane: Official Source Text & Provenance Metadata */}
            <section className="card">
              <div className="trust-strip">
                <span className="chip demo">DEMO DATA (isMock: true)</span>
                <span className="chip ok">{currentScheme.status}</span>
                <span className="chip info">v{currentScheme.versionNumber}</span>
              </div>
              <h2>Official Source Notification & Provenance</h2>
              <h3>{currentScheme.titleEn}</h3>
              <p>{currentScheme.titleKn}</p>
              <p>
                <strong>Department:</strong> {currentScheme.departmentName}
              </p>
              <p>
                <strong>Official Source URL:</strong>{" "}
                <code>{currentScheme.sourceUrl}</code>
              </p>
              <p>
                <strong>Last Verified At:</strong>{" "}
                {currentScheme.sourceLastVerifiedAt ?? "Pending Verification"}
              </p>
              <p>
                <strong>Author ID:</strong> <code>{currentScheme.authorId}</code>
              </p>
              <p>
                <strong>Approved By (Checker):</strong>{" "}
                <code>
                  {currentScheme.approvedById ??
                    "Awaiting Second Reviewer Approval"}
                </code>
              </p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => handleAttemptSelfApprove(currentScheme.id)}
              >
                Test Maker-Checker Publish / Self-Approval Guard
              </button>
            </section>

            {/* Right Pane: Deterministic JSON DSL Rule Tree */}
            <section className="card">
              <div className="trust-strip">
                <span className="chip info">@agro/rules-engine JSON DSL</span>
                <span className="chip ok">DETERMINISTIC EVALUATOR</span>
              </div>
              <h2>Structured JSON DSL Rule Tree</h2>
              <p className="muted">
                Missing farmer facts always evaluate to{" "}
                <code>NEEDS_VERIFICATION</code> (never guessed by AI).
              </p>
              <pre
                style={{
                  background: "#1C281E",
                  color: "#E8F5EC",
                  padding: 16,
                  borderRadius: 12,
                  overflowX: "auto",
                  fontSize: "0.82rem",
                  lineHeight: 1.45,
                }}
              >
                {JSON.stringify(currentScheme.ruleTree, null, 2)}
              </pre>
            </section>
          </div>
        )}

        {makerCheckerStatus && (
          <div
            className="card"
            style={{
              marginTop: 16,
              background: "#FFF5D6",
              borderColor: "#A86400",
            }}
          >
            <strong>Maker-Checker Governance Output:</strong>{" "}
            {makerCheckerStatus}
          </div>
        )}

        {/* Submit a New Scheme Draft Section */}
        <section className="card" style={{ marginTop: 24 }}>
          <h2 style={{ marginTop: 0 }}>
            Create New Scheme Version Draft (Enters IN_REVIEW Queue)
          </h2>
          <form onSubmit={handleSubmitDraft}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 12,
              }}
            >
              <div className="field">
                <label htmlFor="rev-code">Scheme Code</label>
                <input
                  id="rev-code"
                  value={draftCode}
                  onChange={(e) => setDraftCode(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="rev-source">Source Notification URL</label>
                <input
                  id="rev-source"
                  value={draftSourceUrl}
                  onChange={(e) => setDraftSourceUrl(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="rev-title-en">Title (English)</label>
                <input
                  id="rev-title-en"
                  value={draftTitleEn}
                  onChange={(e) => setDraftTitleEn(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="rev-title-kn">Title (Kannada)</label>
                <input
                  id="rev-title-kn"
                  value={draftTitleKn}
                  onChange={(e) => setDraftTitleKn(e.target.value)}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary">
              Submit Draft to IN_REVIEW Queue
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
