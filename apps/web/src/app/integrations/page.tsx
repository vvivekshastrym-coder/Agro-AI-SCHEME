"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface IntegrationStatusItem {
  id: string;
  name: string;
  status: "LIVE" | "MANUAL_WORKFLOW" | "AWAITING_CREDENTIALS" | "AWAITING_APPROVAL";
  description: string;
  requiredToActivate: string;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const FALLBACK_INTEGRATIONS: IntegrationStatusItem[] = [
  {
    id: "rules_engine_and_db",
    name: "Deterministic Scheme Rules Engine & Real-Time Store",
    status: "LIVE",
    description:
      "Evaluates farmer profiles against versioned JSON DSL rules, persists profiles, plots, cases, reminders, and append-only audit logs in real time.",
    requiredToActivate: "Active and live now.",
  },
  {
    id: "web_speech_voice_io",
    name: "Voice-First Speech Recognition (STT) & Read-Aloud (TTS)",
    status: "LIVE",
    description:
      "Browser W3C Web Speech API (kn-IN & en-IN) for real-time microphone voice input and spoken responses with full text fallback.",
    requiredToActivate: "Active in supported browsers (Chrome/Edge/Android).",
  },
  {
    id: "private_doc_storage_malware_scan",
    name: "Consent-Gated Private Document Vault & Malware Scanner",
    status: "LIVE",
    description:
      "Validates file MIME/size, blocks .apk/.exe/EICAR payloads, and issues 5-minute HMAC-signed access URLs.",
    requiredToActivate: "Active and live now.",
  },
  {
    id: "openai_agro_gpt",
    name: "OpenAI API Server-Side Agro GPT Layer",
    status: "AWAITING_CREDENTIALS",
    description:
      "Grounded deterministic scheme assistant is active with confirmation-before-write gates. Set OPENAI_API_KEY on the server to enable live OpenAI LLM generation.",
    requiredToActivate:
      "Set OPENAI_API_KEY=sk-... in server environment variables (.env).",
  },
  {
    id: "status_tracker_portals",
    name: "Government Application & Claim Status Tracker",
    status: "MANUAL_WORKFLOW",
    description:
      "Uses audited manual updates (recording whether Farmer or CSC Operator entered the status and when). Never fabricates live portal status.",
    requiredToActivate:
      "Requires official state/central API credentials (FRUITS / Samrakshane / PMFBY authorized partner keys).",
  },
  {
    id: "whatsapp_business_cloud",
    name: "WhatsApp Business Platform Notifications & Bot",
    status: "AWAITING_APPROVAL",
    description:
      "Webhook HMAC verifier, wamid deduplication, 24h window guard, and STOP opt-out are implemented. Outbound WhatsApp delivery awaits approved Meta WABA credentials.",
    requiredToActivate:
      "Set WHATSAPP_ACCESS_TOKEN, WHATSAPP_APP_SECRET, and approved template names after Meta Business verification.",
  },
];

export default function IntegrationsStatusPage() {
  const [checkedAtIso, setCheckedAtIso] = useState<string>("");
  const [items, setItems] = useState<IntegrationStatusItem[]>(
    FALLBACK_INTEGRATIONS
  );
  const [apiConnected, setApiConnected] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/integrations/status`);
        if (res.ok) {
          const data = await res.json();
          setCheckedAtIso(data.checkedAtIso);
          if (Array.isArray(data.integrations)) {
            setItems(data.integrations);
          }
          setApiConnected(true);
        }
      } catch {
        setCheckedAtIso(new Date().toISOString());
      }
    })();
  }, []);

  function badgeClass(status: IntegrationStatusItem["status"]) {
    switch (status) {
      case "LIVE":
        return "chip ok";
      case "MANUAL_WORKFLOW":
        return "chip info";
      case "AWAITING_CREDENTIALS":
      case "AWAITING_APPROVAL":
        return "chip warn";
    }
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
      <div className="disclaimer-banner" role="region" aria-label="Integration Truthfulness Banner">
        <span>
          <strong>AGRO AI SCHEME — REAL-TIME INTEGRATION & RELEASE BOUNDARY STATUS</strong>{" "}
          • We never simulate a live external government or WhatsApp result when
          credentials/approvals are unconfigured.
        </span>
        <span className={apiConnected ? "chip ok" : "chip warn"}>
          {apiConnected ? "LIVE API PROBE (:4000)" : "OFFLINE PROBE"}
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
            Integration Status & Launch Readiness Matrix
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: "0.9rem", color: "#49564B" }}>
            Last probed: {checkedAtIso || "Checking..."}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/" className="btn btn-secondary">
            ← Farmer App
          </Link>
          <Link href="/csc" className="btn btn-secondary">
            CSC Workspace (/csc)
          </Link>
          <Link href="/reviewer" className="btn btn-secondary">
            Reviewer Studio (/reviewer)
          </Link>
          <Link href="/admin" className="btn btn-secondary">
            Admin Console (/admin)
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: 24 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 18,
          }}
        >
          {items.map((item) => (
            <article key={item.id} className="card">
              <div className="trust-strip">
                <span className={badgeClass(item.status)}>{item.status}</span>
                <span className="muted" style={{ fontSize: "0.8rem" }}>
                  <code>{item.id}</code>
                </span>
              </div>
              <h2 style={{ fontSize: "1.1rem", margin: "8px 0" }}>
                {item.name}
              </h2>
              <p style={{ margin: "0 0 12px", lineHeight: 1.5 }}>
                {item.description}
              </p>
              <div
                style={{
                  padding: 10,
                  borderRadius: 10,
                  background: "#EFECE4",
                  fontSize: "0.85rem",
                }}
              >
                <strong>Activation Requirement:</strong>{" "}
                {item.requiredToActivate}
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
