"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { type GeoCoordinates, type ResolvedAddress, type LiveLocationSharingSession } from "@agro/shared";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function ShareLocationStandalonePage() {
  const [lang, setLang] = useState<"kn" | "en" | "hi">("kn");
  const [sessionId, setSessionId] = useState<string>("");
  const [session, setSession] = useState<LiveLocationSharingSession | null>(null);
  const [isGpsActive, setIsGpsActive] = useState<boolean>(false);
  const [currentCoords, setCurrentCoords] = useState<GeoCoordinates | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState<ResolvedAddress | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [secondsRemaining, setSecondsRemaining] = useState<number>(1800);
  const [durationChoice, setDurationChoice] = useState<number>(30);
  const watchIdRef = useRef<number | null>(null);

  // Initialize from URL params or default session
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const sid = urlParams.get("sessionId");
      if (sid) {
        setSessionId(sid);
        loadSession(sid);
      }
    }
  }, []);

  async function loadSession(sid: string) {
    try {
      const res = await fetch(`${API_BASE}/api/v1/location/share/${sid}`);
      if (res.ok) {
        const d = await res.json();
        if (d.session) {
          setSession(d.session);
          if (d.session.currentCoordinates) setCurrentCoords(d.session.currentCoordinates);
          if (d.session.resolvedAddress) setResolvedAddress(d.session.resolvedAddress);

          // Calculate remaining seconds
          const diffSec = Math.max(
            0,
            Math.floor((new Date(d.session.expiresAtIso).getTime() - Date.now()) / 1000)
          );
          setSecondsRemaining(diffSec);
          if (d.session.status === "ACTIVE") {
            startBrowserTracking(sid);
          }
        }
      }
    } catch {
      // offline or standalone mode
    }
  }

  // Countdown timer
  useEffect(() => {
    if (!session || session.status !== "ACTIVE" || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSessionExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [session, secondsRemaining]);

  function handleSessionExpired() {
    setIsGpsActive(false);
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    setStatusMsg(
      lang === "kn"
        ? "⏳ ಲೈವ್ ಹಂಚಿಕೆ ಅವಧಿ ಮುಕ್ತಾಯವಾಗಿದೆ."
        : "⏳ Live sharing duration has expired."
    );
  }

  async function handleStartNewSession() {
    setStatusMsg(
      lang === "kn" ? "ಜಿಪಿಎಸ್ ಅನುಮತಿ ಕೇಳಲಾಗುತ್ತಿದೆ..." : "Requesting GPS device permission..."
    );

    if (!navigator.geolocation) {
      setStatusMsg("❌ Geolocation is not supported on this device.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords: GeoCoordinates = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMeters: Math.round(pos.coords.accuracy),
          altitude: pos.coords.altitude ?? undefined,
          speed: pos.coords.speed ?? undefined,
          heading: pos.coords.heading ?? undefined,
          timestampIso: new Date(pos.timestamp).toISOString(),
        };
        setCurrentCoords(coords);

        // Reverse geocode
        try {
          const revRes = await fetch(`${API_BASE}/api/v1/location/reverse-geocode`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ latitude: coords.latitude, longitude: coords.longitude }),
          });
          let addr: ResolvedAddress | undefined;
          if (revRes.ok) {
            const data = await revRes.json();
            addr = data.resolvedAddress;
            setResolvedAddress(addr || null);
          }

          // Start session
          const startRes = await fetch(`${API_BASE}/api/v1/location/share/start`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              farmerId: "farmer-ka-mys-01",
              farmerName: "Ningappa Gowda",
              farmerMobile: "+91 98450 12345",
              assignedEmployeeId: "emp-csc-01",
              assignedEmployeeName: "Siddesh N. (CSC Operator)",
              cscCentreId: "csc-ka-mys-01",
              durationMinutes: durationChoice,
              initialCoordinates: coords,
              initialAddress: addr,
            }),
          });

          if (startRes.ok) {
            const startData = await startRes.json();
            setSession(startData.session);
            setSessionId(startData.session.sessionId);
            setSecondsRemaining(durationChoice * 60);
            setIsGpsActive(true);
            setStatusMsg("✅ Live location broadcasting active.");
            startBrowserTracking(startData.session.sessionId);
          }
        } catch {
          setStatusMsg("❌ Network error connecting to backend.");
        }
      },
      (err) => {
        setStatusMsg(`❌ GPS Error: ${err.message}. Please enable Location in browser.`);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  function startBrowserTracking(activeSessionId: string) {
    if (!navigator.geolocation) return;
    setIsGpsActive(true);

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const coords: GeoCoordinates = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMeters: Math.round(pos.coords.accuracy),
          speed: pos.coords.speed ?? undefined,
          timestampIso: new Date(pos.timestamp).toISOString(),
        };
        setCurrentCoords(coords);

        // Push updates to API
        try {
          await fetch(`${API_BASE}/api/v1/location/share/update`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: activeSessionId, coordinates: coords }),
          });
        } catch {
          // ignore transient offline
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }

  async function handleStopSharing() {
    if (!sessionId) return;
    try {
      await fetch(`${API_BASE}/api/v1/location/share/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, farmerId: "farmer-ka-mys-01" }),
      });

      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      setIsGpsActive(false);
      if (session) setSession({ ...session, status: "REVOKED" });
      setStatusMsg(
        lang === "kn"
          ? "🛑 ಲೈವ್ ಹಂಚಿಕೆ ನಿಲ್ಲಿಸಲಾಗಿದೆ. ಜಿಪಿಎಸ್ ಪ್ರಸಾರ ರದ್ದಾಗಿದೆ."
          : "🛑 Live sharing explicitly revoked. GPS broadcast stopped."
      );
    } catch {
      setStatusMsg("❌ Error revoking session.");
    }
  }

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "sans-serif", color: "#0f172a" }}>
      {/* Header */}
      <header
        style={{
          background: "#065f46",
          color: "#ffffff",
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src="/logo.png"
            alt="Agro AI Scheme Logo"
            style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover" }}
          />
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Agro AI · Live GPS Broadcast</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>WhatsApp & Mobile Assisted Sharing Desk</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          {(["kn", "en", "hi"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLang(l)}
              style={{
                padding: "4px 8px",
                borderRadius: 4,
                border: "none",
                background: lang === l ? "#ffffff" : "rgba(255,255,255,0.2)",
                color: lang === l ? "#065f46" : "#ffffff",
                fontWeight: 600,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: "24px auto", padding: "0 16px" }}>
        {/* DPDP Trust Notice */}
        <div
          style={{
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 20,
            fontSize: 12,
            color: "#065f46",
            lineHeight: 1.5,
          }}
        >
          🔒 <strong>DPDP Act 2023 Consent Guarantee:</strong> Live location sharing is voluntary,
          time-limited, encrypted, and only visible to your assigned CSC operator. Silent background
          tracking is never performed. You can stop sharing anytime.
        </div>

        {/* ACTIVE SESSION CARD */}
        {session && session.status === "ACTIVE" ? (
          <div
            style={{
              background: "#ffffff",
              border: "2px solid #10b981",
              borderRadius: 12,
              padding: 24,
              boxShadow: "0 4px 16px rgba(16,185,129,0.15)",
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            {/* Live Pulsing Beacon */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 14px",
                borderRadius: 20,
                background: "#dcfce7",
                color: "#15803d",
                fontWeight: 700,
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#22c55e",
                  boxShadow: "0 0 10px #22c55e",
                  display: "inline-block",
                }}
              />
              {lang === "kn" ? "ಲೈವ್ ಜಿಪಿಎಸ್ ಪ್ರಸಾರ ಚಾಲ್ತಿಯಲ್ಲಿದೆ" : "LIVE GPS BROADCASTING ACTIVE"}
            </div>

            {/* Countdown Clock */}
            <div style={{ fontSize: 44, fontWeight: 800, color: "#065f46", margin: "8px 0" }}>
              {formatTime(secondsRemaining)}
            </div>
            <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
              {lang === "kn" ? "ಉಳಿದಿರುವ ಸಮಯ (ಸ್ವಯಂ ರದ್ದತಿ)" : "Time remaining before automatic expiry"}
            </div>

            {/* Coordinates & Accuracy */}
            {currentCoords && (
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: 14,
                  fontSize: 13,
                  marginBottom: 20,
                  textAlign: "left",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "#64748b" }}>Latitude, Longitude:</span>
                  <strong>{currentCoords.latitude.toFixed(5)}, {currentCoords.longitude.toFixed(5)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "#64748b" }}>Accuracy Radius:</span>
                  <span style={{ color: "#16a34a", fontWeight: 600 }}>±{currentCoords.accuracyMeters ?? 4} meters</span>
                </div>
                {resolvedAddress && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #e2e8f0" }}>
                    <div style={{ color: "#64748b", fontSize: 11, marginBottom: 2 }}>Detected Village / Hobli:</div>
                    <strong>{resolvedAddress.formattedAddress}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Assigned Operator details */}
            <div style={{ fontSize: 13, color: "#475569", marginBottom: 20 }}>
              Shared with: <strong>{session.assignedEmployeeName}</strong> ({session.cscCentreId})
            </div>

            {/* Revoke Button */}
            <button
              type="button"
              onClick={handleStopSharing}
              style={{
                width: "100%",
                padding: "14px 20px",
                background: "#dc2626",
                color: "#ffffff",
                border: "none",
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(220,38,38,0.25)",
              }}
            >
              🛑 {lang === "kn" ? "ಲೈವ್ ಹಂಚಿಕೆ ತಕ್ಷಣ ನಿಲ್ಲಿಸಿ" : "STOP SHARING IMMEDIATELY"}
            </button>
          </div>
        ) : (
          /* START SHARING CONFIGURATION */
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: 24,
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              marginBottom: 24,
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>
              {lang === "kn" ? "ಅಧಿಕಾರಿಯೊಂದಿಗೆ ಲೈವ್ ಲೊಕೇಶನ್ ಹಂಚಿಕೊಳ್ಳಿ" : "Share Live Location with CSC Operator"}
            </h2>
            <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 20px" }}>
              {lang === "kn"
                ? "ಬೆಳೆ ಸಮೀಕ್ಷೆ, ವಿಮಾ ಪರಿಶೀಲನೆ ಅಥವಾ ಸಿಎಸ್‌ಸಿ ಅರ್ಜಿ ಸಹಾಯಕ್ಕಾಗಿ ನಿಮ್ಮ ಲೈವ್ ಜಿಪಿಎಸ್ ಅನ್ನು ತಾತ್ಕಾಲಿಕವಾಗಿ ಹಂಚಿಕೊಳ್ಳಿ."
                : "Help CSC operators navigate to your land for crop loss verification, insurance evidence, or application assistance."}
            </p>

            {/* Duration Selector */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                {lang === "kn" ? "ಹಂಚಿಕೆ ಅವಧಿ ಆಯ್ಕೆಮಾಡಿ:" : "Choose Sharing Duration:"}
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  { min: 15, label: "15 Min" },
                  { min: 30, label: "30 Min (Recommended)" },
                  { min: 60, label: "1 Hour" },
                ].map((d) => (
                  <button
                    key={d.min}
                    type="button"
                    onClick={() => setDurationChoice(d.min)}
                    style={{
                      padding: "10px 8px",
                      borderRadius: 6,
                      border: durationChoice === d.min ? "2px solid #065f46" : "1px solid #cbd5e1",
                      background: durationChoice === d.min ? "#ecfdf5" : "#ffffff",
                      color: durationChoice === d.min ? "#065f46" : "#0f172a",
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Share Button */}
            <button
              type="button"
              onClick={handleStartNewSession}
              style={{
                width: "100%",
                padding: "14px 20px",
                background: "#065f46",
                color: "#ffffff",
                border: "none",
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              📍 {lang === "kn" ? "ಲೈವ್ ಲೊಕೇಶನ್ ಹಂಚಿಕೊಳ್ಳಿ" : "SHARE LIVE LOCATION"}
            </button>
          </div>
        )}

        {/* Status Message */}
        {statusMsg && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 6,
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 20,
              textAlign: "center",
            }}
          >
            {statusMsg}
          </div>
        )}

        {/* Return Link */}
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Link
            href="/"
            style={{ color: "#065f46", fontSize: 14, fontWeight: 600, textDecoration: "none" }}
          >
            ← {lang === "kn" ? "ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ" : "Back to Agro AI Home"}
          </Link>
        </div>
      </main>
    </div>
  );
}
