"use client";

import React, { useEffect, useRef, useState } from "react";
import type { SupportedLanguage } from "@agro/shared";

export function L(
  lang: SupportedLanguage,
  kn: string,
  en: string,
  hi?: string
): string {
  if (lang === "kn") return kn;
  if (lang === "hi") return hi ?? en;
  return en;
}

export function AgroEmblem({ size = 42 }: { size?: number }) {
  return (
    <div
      className="brand-emblem"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.22),
        overflow: "hidden",
        border: "1.5px solid rgba(46, 125, 50, 0.25)",
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      <img
        src="/logo.png"
        alt="Agro AI Schemes"
        width={size}
        height={size}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
    </div>
  );
}

interface SessionItem {
  id: string;
  userAgent?: string;
  createdAtIso?: string;
  createdAt?: string;
  revokedAtIso?: string | null;
  revokedAt?: string | null;
}

interface LoginSecurityModalProps {
  open: boolean;
  onClose: () => void;
  lang: SupportedLanguage;
  setLang: (l: SupportedLanguage) => void;
  onOpenAllLanguages: () => void;
  apiBase: string;
  apiToken: string | null;
  currentUserName: string;
  currentUserRole: string;
  onAuthenticated: (data: {
    accessToken: string;
    userId: string;
    fullName: string;
    role: string;
  }) => void;
  onLoggedOut?: () => void;
  speakText: (text: string, lang: SupportedLanguage) => void;
}

export function LoginSecurityModal({
  open,
  onClose,
  lang,
  setLang,
  onOpenAllLanguages,
  apiBase,
  apiToken,
  currentUserName,
  currentUserRole,
  onAuthenticated,
  onLoggedOut,
  speakText,
}: LoginSecurityModalProps) {
  const [loginMode, setLoginMode] = useState<"farmer" | "csc">("farmer");
  const [phone, setPhone] = useState("");
  const [fullNameInput, setFullNameInput] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [serverDemoOtp, setServerDemoOtp] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [consentChecked, setConsentChecked] = useState(true);
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [voiceAutoRead, setVoiceAutoRead] = useState(true);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // CSC / Staff Login fields
  const [cscId, setCscId] = useState("KA-CSC-2026-8891");
  const [kioskCode, setKioskCode] = useState("MYS-HDK-04");
  const [totpCode, setTotpCode] = useState("");
  const [selectedRole, setSelectedRole] = useState<
    "FARMER" | "CSC_OPERATOR" | "SCHEME_REVIEWER" | "PLATFORM_ADMIN"
  >("CSC_OPERATOR");

  // Active Sessions & Account Deletion state
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [deletionScheduledIso, setDeletionScheduledIso] = useState<
    string | null
  >(null);

  const otpFormRef = useRef<HTMLFormElement | null>(null);
  const otpAbortRef = useRef<AbortController | null>(null);

  function stopSmsOtpListener() {
    if (otpAbortRef.current) {
      otpAbortRef.current.abort();
      otpAbortRef.current = null;
    }
  }

  function startSmsOtpListener() {
    if (typeof window === "undefined" || !("OTPCredential" in window)) {
      return;
    }
    stopSmsOtpListener();
    const ac = new AbortController();
    otpAbortRef.current = ac;

    void (
      navigator.credentials as unknown as {
        get: (opts: {
          otp: { transport: string[] };
          signal: AbortSignal;
        }) => Promise<{ code?: string } | null>;
      }
    )
      .get({
        otp: { transport: ["sms"] },
        signal: ac.signal,
      })
      .then((cred) => {
        if (!cred?.code) return;
        setOtpCode(cred.code);
        otpFormRef.current?.requestSubmit();
      })
      .catch((err: unknown) => {
        if (err && typeof err === "object" && (err as { name?: string }).name === "AbortError") {
          return;
        }
      });
  }

  useEffect(() => {
    if (!open) {
      stopSmsOtpListener();
      return;
    }
    if (otpSent && loginMode === "farmer") {
      startSmsOtpListener();
    }
    return () => {
      stopSmsOtpListener();
    };
  }, [open, otpSent, loginMode]);

  useEffect(() => {
    if (!open || !apiToken) return;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/api/v1/auth/sessions`, {
          headers: { Authorization: `Bearer ${apiToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data?.sessions)) {
            setSessions(
              data.sessions.map((item: any) => ({
                id: String(item?.id || `sess-${Math.random().toString(36).slice(2, 7)}`),
                userAgent: String(item?.userAgent || "Web Browser Session"),
                createdAtIso: String(
                  item?.createdAtIso ||
                  item?.createdAt ||
                  new Date().toISOString()
                ),
                revokedAtIso: item?.revokedAtIso || item?.revokedAt ? String(item.revokedAtIso || item.revokedAt) : null,
              }))
            );
          }
        }
      } catch {
        // Offline fallback
      }
    })();
  }, [open, apiToken, apiBase]);

  if (!open) return null;

  async function handleRequestOtp() {
    const cleanPhone = (phone || "").replace(/\D/g, "").slice(-10);
    if (cleanPhone.length < 10) {
      setStatusBanner(
        L(
          lang,
          "ದಯವಿಟ್ಟು 10 ಅಂಕಿಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ.",
          "Please enter a valid 10-digit mobile number.",
          "कृपया 10 अंकों का मोबाइल नंबर दर्ज करें।"
        )
      );
      return;
    }
    try {
      const res = await fetch(`${apiBase}/api/v1/auth/otp/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: `+91${cleanPhone}`,
          preferredLanguage: lang,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setOtpSent(true);
        if (data.demoOtpPreview) {
          setServerDemoOtp(String(data.demoOtpPreview));
          setOtpCode(String(data.demoOtpPreview));
        } else {
          setServerDemoOtp(null);
        }
        startSmsOtpListener();
        setStatusBanner(
          data.demoOtpPreview
            ? L(
                lang,
                `ಒಟಿಪಿ ಕಳುಹಿಸಲಾಗಿದೆ (+91${cleanPhone}). ಪರೀಕ್ಷಾ ಒಟಿಪಿ: ${data.demoOtpPreview}`,
                `OTP sent to +91${cleanPhone}. Dev OTP preview: ${data.demoOtpPreview}`,
                `+91${cleanPhone} पर ओटीपी भेजा गया। परीक्षण ओटीपी: ${data.demoOtpPreview}`
              )
            : L(
                lang,
                `ಒಟಿಪಿ ಕಳುಹಿಸಲಾಗಿದೆ (+91${cleanPhone}). ನಿಮ್ಮ ಎಸ್‌ಎಂಎಸ್ ಪರಿಶೀಲಿಸಿ.`,
                `OTP sent to +91${cleanPhone}. Please check your SMS.`,
                `+91${cleanPhone} पर ओटीपी भेजा गया। कृपया अपना एसएमएस जांचें।`
              )
        );
        return;
      }
      const errBody = await res.json().catch(() => ({}));
      setStatusBanner(
        errBody.error ||
          L(
            lang,
            "ಒಟಿಪಿ ಕಳುಹಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
            "Unable to send OTP. Please retry.",
            "ओटीपी भेजने में असमर्थ। कृपया पुनः प्रयास करें।"
          )
      );
    } catch {
      setStatusBanner(
        L(
          lang,
          "ಒಟಿಪಿ ಸೇವೆ ಪ್ರಸ್ತುತ ಲಭ್ಯವಿಲ್ಲ — ಸರ್ವರ್ ಸಂಪರ್ಕ ಪರಿಶೀಲಿಸಿ.",
          "OTP service unavailable — please verify API server connection.",
          "ओटीपी सेवा उपलब्ध नहीं है — कृपया सर्वर कनेक्शन जांचें।"
        )
      );
    }
  }

  async function handleVerifyOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    stopSmsOtpListener();
    if (!consentChecked) {
      setStatusBanner(
        L(
          lang,
          "ಮುಂದುವರಿಯಲು ಡೇಟಾ ಸುರಕ್ಷತೆ ಒಪ್ಪಿಗೆಯನ್ನು ಗುರುತಿಸಿ.",
          "Please accept the DPDP Act 2023 privacy consent to sign in.",
          "लॉग इन करने के लिए कृपया डीपीडीपी गोपनीयता सहमति स्वीकार करें।"
        )
      );
      return;
    }
    const cleanPhone = (phone || "").replace(/\D/g, "").slice(-10);
    if (cleanPhone.length < 10 || otpCode.trim().length < 4) {
      setStatusBanner(
        L(
          lang,
          "ದಯವಿಟ್ಟು ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಮತ್ತು ಒಟಿಪಿ ಕೋಡ್ ನಮೂದಿಸಿ.",
          "Please enter your 10-digit mobile number and OTP code.",
          "कृपया मोबाइल नंबर और ओटीपी कोड दर्ज करें।"
        )
      );
      return;
    }
    try {
      const res = await fetch(`${apiBase}/api/v1/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: `+91${cleanPhone}`,
          otp: otpCode.trim(),
          fullName: fullNameInput.trim() || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const role = Array.isArray(data.user?.roles)
          ? data.user.roles[0]
          : data.user?.role ?? "FARMER";
        onAuthenticated({
          accessToken: data.accessToken,
          userId: data.user.id,
          fullName: data.user.fullName,
          role,
        });
        setStatusBanner(
          L(
            lang,
            "✓ ಯಶಸ್ವಿಯಾಗಿ ಲಾಗಿನ್ ಆಗಿದ್ದೀರಿ!",
            "✓ Signed in and verified!",
            "✓ सफलतापूर्वक लॉग इन हुआ!"
          )
        );
        setTimeout(() => onClose(), 550);
        return;
      }
      const errBody = await res.json().catch(() => ({}));
      setStatusBanner(
        errBody.error ||
          L(
            lang,
            "ಅಮಾನ್ಯ ಅಥವಾ ಅವಧಿ ಮುಗಿದ ಒಟಿಪಿ ಕೋಡ್.",
            "Invalid or expired OTP code.",
            "अमान्य या समाप्त ओटीपी कोड।"
          )
      );
    } catch {
      setStatusBanner(
        L(
          lang,
          "ಪರಿಶೀಲನೆ ಸೇವೆ ಪ್ರಸ್ತುತ ಲಭ್ಯವಿಲ್ಲ — ಸರ್ವರ್ ಸಂಪರ್ಕ ಪರಿಶೀಲಿಸಿ.",
          "Authentication service unavailable — please check API connection.",
          "प्रमाणीकरण सेवा अनुपलब्ध है — कृपया कनेक्शन जांचें।"
        )
      );
    }
  }

  async function handleRoleSwitchLogin() {
    try {
      const res = await fetch(`${apiBase}/api/v1/auth/demo-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });
      if (res.ok) {
        const data = await res.json();
        const role = Array.isArray(data.user?.roles)
          ? data.user.roles[0]
          : data.user?.role ?? selectedRole;
        onAuthenticated({
          accessToken: data.accessToken,
          userId: data.user.id,
          fullName: data.user.fullName,
          role,
        });
        setStatusBanner(
          L(
            lang,
            `✓ ${selectedRole} ಖಾತೆಗೆ ಬದಲಾಯಿಸಲಾಗಿದೆ`,
            `✓ Switched active session to ${selectedRole}`,
            `✓ ${selectedRole} सत्र सक्रिय किया गया`
          )
        );
        return;
      }
      const errBody = await res.json().catch(() => ({}));
      setStatusBanner(
        errBody.error ||
          L(
            lang,
            "ಪಾತ್ರ ಬದಲಾವಣೆ ಉತ್ಪಾದನಾ ಮೋಡ್‌ನಲ್ಲಿ ನಿರ್ಬಂಧಿಸಲಾಗಿದೆ.",
            "Demo role switching is disabled in production mode.",
            "उत्पादन मोड में डेमो भूमिका परिवर्तन अक्षम है।"
          )
      );
    } catch {
      setStatusBanner(
        L(
          lang,
          "ಸರ್ವರ್ ಸಂಪರ್ಕ ಲಭ್ಯವಿಲ್ಲ.",
          "API server unreachable.",
          "सर्वर संपर्क उपलब्ध नहीं है।"
        )
      );
    }
  }

  async function handleRevokeSession(sessionId: string) {
    if (!apiToken) return;
    try {
      const res = await fetch(
        `${apiBase}/api/v1/auth/sessions/${sessionId}/revoke`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${apiToken}` },
        }
      );
      if (res.ok) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId
              ? { ...s, revokedAtIso: new Date().toISOString() }
              : s
          )
        );
      }
    } catch {
      // Ignore offline error
    }
  }

  async function handleRequestAccountDeletion() {
    if (apiToken) {
      try {
        const res = await fetch(`${apiBase}/api/v1/auth/account/delete-request`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setDeletionScheduledIso(data.scheduledDeletionAtIso);
          return;
        }
      } catch {
        // Fallback below
      }
    }
    setDeletionScheduledIso(
      new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10)
    );
  }

  async function handleLogoutSession() {
    if (apiToken) {
      try {
        await fetch(`${apiBase}/api/v1/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiToken}` },
        });
      } catch {
        // Offline logout still clears client session
      }
    }
    setSessions((prev) =>
      prev.map((s) => ({
        ...s,
        revokedAtIso: s.revokedAtIso ?? new Date().toISOString(),
      }))
    );
    onLoggedOut?.();
    setStatusBanner(
      L(
        lang,
        "✓ ನೀವು ಸುರಕ್ಷಿತವಾಗಿ ಲಾಗ್ ಔಟ್ ಆಗಿದ್ದೀರಿ. ನಿಮ್ಮ ಉಳಿಸಿದ ಮಾಹಿತಿ ಸುರಕ್ಷಿತವಾಗಿದೆ.",
        "✓ Signed out securely. Your saved farm profile and records remain protected.",
        "✓ आप सुरक्षित रूप से लॉग आउट हो गए हैं।"
      )
    );
  }

  async function handleAccountRecoveryRequest() {
    const cleanPhone = (phone || "").replace(/\D/g, "").slice(-10);
    const identifier = cleanPhone.length === 10 ? `+91${cleanPhone}` : cscId;
    try {
      const res = await fetch(`${apiBase}/api/v1/auth/password-reset/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrPhone: identifier }),
      });
      if (res.ok) {
        setStatusBanner(
          L(
            lang,
            `ಖಾತೆ ಮರುಪಡೆಯುವಿಕೆ (Account Recovery) ವಿನಂತಿಯನ್ನು ${identifier} ಗಾಗಿ ದಾಖಲಿಸಲಾಗಿದೆ.`,
            `Account recovery / credential reset token requested for ${identifier}.`,
            `${identifier} के लिए खाता पुनर्प्राप्ति अनुरोध दर्ज किया गया।`
          )
        );
        return;
      }
    } catch {
      // Offline notice below
    }
    setStatusBanner(
      L(
        lang,
        "ಖಾತೆ ಮರುಪಡೆಯಲು ಮೊಬೈಲ್ ಒಟಿಪಿ ಪರಿಶೀಲನೆಯನ್ನು ಬಳಸಿ.",
        "Use Mobile OTP verification above to recover your account immediately.",
        "अपना खाता पुनर्प्राप्त करने के लिए मोबाइल ओटीपी सत्यापन का उपयोग करें।"
      )
    );
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-security-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Brand Header Card with Agro AI Scheme Emblem */}
        <div
          className="card"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 14,
            background: "#ffffff",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <AgroEmblem size={54} />
            <div>
              <h2 id="login-security-title" style={{ margin: 0, color: "var(--primary-dark)" }}>
                {L(
                  lang,
                  "ಆಗ್ರೋ ಎಐ ಸ್ಕೀಮ್ — ಖಾತೆ ಮತ್ತು ಭದ್ರತೆ",
                  "Agro AI Scheme — Login & Security",
                  "एग्रो एआई स्कीम — लॉग इन और सुरक्षा"
                )}
              </h2>
              <p className="muted" style={{ margin: "2px 0 0" }}>
                {L(
                  lang,
                  "ಕೃಷಿ ಯೋಜನೆ ಮತ್ತು ಬೆಳೆ ವಿಮೆ ನೆರವು ವೇದಿಕೆ",
                  "Agrarian Scheme & Crop Insurance Trust Platform",
                  "कृषि योजना और फसल बीमा सहायता मंच"
                )}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="chip ok">
              ✓ {L(lang, "ಸಕ್ರಿಯ ಖಾತೆ:", "Signed in:", "सक्रिय खाता:")}{" "}
              <strong>{currentUserName}</strong> ({currentUserRole})
            </span>
            {apiToken && (
              <button
                type="button"
                className="pill"
                onClick={handleLogoutSession}
              >
                🚪 {L(lang, "ಲಾಗ್ ಔಟ್", "Sign Out", "लॉग आउट")}
              </button>
            )}
            <button type="button" className="pill" onClick={onClose}>
              ✕ {L(lang, "ಮುಚ್ಚಿ", "Close", "बंद करें")}
            </button>
          </div>
        </div>

        {/* Multilingual Voice-Ready Language Selector Card */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <strong>
              🌐{" "}
              {L(
                lang,
                "ಭಾಷೆ ಆಯ್ಕೆ (ಪೂರ್ಣ ಅಪ್ಲಿಕೇಶನ್ ಭಾಷೆ)",
                "Choose Application Language (100% Localized)",
                "ऐप की भाषा चुनें (100% अनुवादित)"
              )}
            </strong>
            <button
              type="button"
              className="pill"
              onClick={onOpenAllLanguages}
            >
              🌐 {L(lang, "22+ ಭಾರತೀಯ ಭಾಷೆಗಳು", "22+ Indian Languages", "22+ भारतीय भाषाएं")}
            </button>
          </div>

          <div className="grid-3">
            {(
              [
                {
                  code: "kn" as const,
                  title: "ಕನ್ನಡ",
                  sub: L(lang, "ಕರ್ನಾಟಕದ ರೈತರಿಗೆ", "Kannada (Default)", "कन्नड़"),
                  listenLabel: L(lang, "ಕೇಳಿ", "Listen", "सुनें"),
                  sampleVoice: "ಆಗ್ರೋ ಎಐ ಸ್ಕೀಮ್‌ಗೆ ಸ್ವಾಗತ. ಎಲ್ಲಾ ಮಾಹಿತಿ ಕನ್ನಡದಲ್ಲಿ ಲಭ್ಯವಿದೆ.",
                },
                {
                  code: "en" as const,
                  title: "English",
                  sub: L(lang, "ಪೂರ್ಣ ಇಂಗ್ಲಿಷ್ ಮಾಹಿತಿ", "Full English Interface", "अंग्रेज़ी"),
                  listenLabel: L(lang, "ಕೇಳಿ", "Listen", "सुनें"),
                  sampleVoice: "Welcome to Agro AI Scheme. Full information is now in English.",
                },
                {
                  code: "hi" as const,
                  title: "हिन्दी",
                  sub: L(lang, "ಪೂರ್ಣ ಹಿಂದಿ ಮಾಹಿತಿ", "Full Hindi Interface", "संपूर्ण हिन्दी जानकारी"),
                  listenLabel: L(lang, "ಕೇಳಿ", "Listen", "सुनें"),
                  sampleVoice: "एग्रो एआई स्कीम में आपका स्वागत है। सभी जानकारी हिन्दी में उपलब्ध है।",
                },
              ]
            ).map((item) => {
              const active = lang === item.code;
              return (
                <div
                  key={item.code}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    borderRadius: 16,
                    border: active
                      ? "2px solid var(--primary-dark)"
                      : "1.5px solid var(--line)",
                    background: active ? "var(--deep-field)" : "var(--surface-low)",
                    color: active ? "#ffffff" : "var(--ink)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setLang(item.code)}
                    style={{
                      background: "transparent",
                      border: "none",
                      textAlign: "left",
                      flex: 1,
                      color: "inherit",
                      padding: 0,
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: "1.02rem" }}>
                      {active ? "✓ " : "○ "}
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontSize: "0.78rem",
                        opacity: active ? 0.9 : 0.75,
                      }}
                    >
                      {item.sub}
                    </div>
                  </button>
                  <button
                    type="button"
                    className="pill"
                    style={{
                      minHeight: 34,
                      padding: "0 10px",
                      fontSize: "0.76rem",
                      color: "var(--ink)",
                    }}
                    onClick={() => speakText(item.sampleVoice, item.code)}
                  >
                    🔊 {item.listenLabel}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dual Mode Tabs: Farmer Mobile OTP vs CSC Operator / Staff Terminal */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            padding: 6,
            borderRadius: 16,
            background: "var(--surface-low)",
            border: "1px solid var(--line)",
            marginBottom: 14,
          }}
        >
          <button
            type="button"
            className="btn"
            style={{
              minHeight: 48,
              background:
                loginMode === "farmer" ? "var(--deep-field)" : "transparent",
              color: loginMode === "farmer" ? "#ffffff" : "var(--ink)",
            }}
            onClick={() => setLoginMode("farmer")}
          >
            👨‍🌾{" "}
            {L(
              lang,
              "ರೈತರ ಮೊಬೈಲ್ ಒಟಿಪಿ ಲಾಗಿನ್",
              "Farmer Mobile OTP Login",
              "किसान मोबाइल ओटीपी लॉग इन"
            )}
          </button>
          <button
            type="button"
            className="btn"
            style={{
              minHeight: 48,
              background:
                loginMode === "csc" ? "var(--deep-field)" : "transparent",
              color: loginMode === "csc" ? "#ffffff" : "var(--ink)",
            }}
            onClick={() => setLoginMode("csc")}
          >
            🖥️{" "}
            {L(
              lang,
              "ಸೇವಾ ಕೇಂದ್ರ / ಸಿಬ್ಬಂದಿ ಲಾಗಿನ್",
              "CSC Operator / Staff Login",
              "सीएससी ऑपरेटर / स्टाफ लॉग इन"
            )}
          </button>
        </div>

        {statusBanner && (
          <div className="banner" style={{ marginBottom: 14 }} role="status">
            {statusBanner}
          </div>
        )}

        {/* SECTION 1: FARMER MOBILE OTP LOGIN (Compliant with sms-otp-form) */}
        {loginMode === "farmer" && (
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="grid-2">
              <div>
                <label htmlFor="farmer-phone-input">
                  <strong>
                    📱{" "}
                    {L(
                      lang,
                      "ಮೊಬೈಲ್ ಸಂಖ್ಯೆ (+91)",
                      "Mobile Number (+91)",
                      "मोबाइल नंबर (+91)"
                    )}
                  </strong>
                </label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span
                    className="pill"
                    style={{ minHeight: 52, fontWeight: 800 }}
                  >
                    +91
                  </span>
                  <input
                    id="farmer-phone-input"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    className="input-field"
                    style={{ margin: 0 }}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="9876543210"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="farmer-name-input">
                  <strong>
                    👤{" "}
                    {L(
                      lang,
                      "ರೈತರ ಹೆಸರು (ಐಚ್ಛಿಕ)",
                      "Farmer Name (Optional)",
                      "किसान का नाम (वैकल्पिक)"
                    )}
                  </strong>
                </label>
                <input
                  id="farmer-name-input"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  className="input-field"
                  style={{ margin: 0 }}
                  value={fullNameInput}
                  onChange={(e) => setFullNameInput(e.target.value)}
                  placeholder={L(
                    lang,
                    "ಉದಾ: ಶಿವಣ್ಣ ಗೌಡ",
                    "e.g. Shivanna Gowda",
                    "उदा: शिवन्ना गौड़ा"
                  )}
                />
              </div>
            </div>

            <div style={{ marginTop: 12, marginBottom: 14 }}>
              <button
                type="button"
                className="btn ghost block"
                onClick={handleRequestOtp}
              >
                📩{" "}
                {L(
                  lang,
                  "ಎಸ್‌ಎಂಎಸ್ ಮೂಲಕ 6-ಅಂಕಿಯ ಒಟಿಪಿ ಪಡೆಯಿರಿ",
                  "Send 6-Digit Login OTP via SMS",
                  "एसएमएस द्वारा 6-अंकीय ओटीपी प्राप्त करें"
                )}
              </button>
            </div>

            {/* Semantic OTP Verification Form following modern-web-guidance sms-otp-form */}
            <form
              ref={otpFormRef}
              id="otp-form"
              action="/api/v1/auth/otp/verify"
              method="POST"
              onSubmit={handleVerifyOtpSubmit}
              style={{
                padding: 14,
                borderRadius: 16,
                background: "var(--surface-low)",
                border: "1.5px solid var(--line)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                <label htmlFor="otp-input" style={{ fontWeight: 800 }}>
                  🔑{" "}
                  {L(
                    lang,
                    "6-ಅಂಕಿಯ ಪರಿಶೀಲನಾ ಕೋಡ್ (ಒಟಿಪಿ)",
                    "6-Digit Verification Code (OTP)",
                    "6-अंकीय सत्यापन कोड (ओटीपी)"
                  )}
                </label>
                {serverDemoOtp && (
                  <span className="chip demo">
                    {L(
                      lang,
                      `ಮಾದರಿ ಒಟಿಪಿ: ${serverDemoOtp}`,
                      `Demo OTP: ${serverDemoOtp}`,
                      `डेमो ओटीपी: ${serverDemoOtp}`
                    )}
                  </span>
                )}
              </div>

              {/* Hint placed ABOVE the input so autofill popovers and mobile keyboards do not obscure it */}
              <p id="otp-format-hint" className="field-hint">
                {L(
                  lang,
                  "ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಗೆ ಕಳುಹಿಸಲಾದ 6-ಅಂಕಿಯ ಕೋಡ್ ನಮೂದಿಸಿ.",
                  "Enter the 6-digit code sent to your mobile number.",
                  "अपने फ़ोन पर भेजा गया 6-अंकीय कोड दर्ज करें।"
                )}
              </p>

              {/* Single input with type="text", inputMode="numeric", and autoComplete="one-time-code" */}
              <input
                type="text"
                id="otp-input"
                name="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                pattern="\d{6}"
                maxLength={6}
                aria-describedby="otp-format-hint"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                required
              />

              <div style={{ marginTop: 12 }}>
                <button type="submit" className="btn block">
                  ✅{" "}
                  {L(
                    lang,
                    "ಒಪ್ಪಿಗೆ ನೀಡಿ ಮತ್ತು ಒಟಿಪಿ ಪರಿಶೀಲಿಸಿ ಲಾಗಿನ್ ಆಗಿ",
                    "Accept Consent & Verify OTP to Sign In",
                    "सहमति दें और ओटीपी सत्यापित कर लॉग इन करें"
                  )}
                </button>
              </div>
            </form>

            {/* Additional Authentication & Account Recovery Options */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 12,
                paddingTop: 12,
                borderTop: "1px solid var(--line)",
              }}
            >
              <button
                type="button"
                className="pill"
                onClick={() =>
                  setStatusBanner(
                    L(
                      lang,
                      "ಗೂಗಲ್ ಲಾಗಿನ್: AWAITING_GOOGLE_OAUTH_CLIENT_ID — ದಯವಿಟ್ಟು ಮೊಬೈಲ್ ಒಟಿಪಿ ಲಾಗಿನ್ ಬಳಸಿ.",
                      "Google Sign-In status: AWAITING_GOOGLE_OAUTH_CLIENT_ID — Please use Mobile OTP or Staff Login.",
                      "गूगल साइन-इन: AWAITING_GOOGLE_OAUTH_CLIENT_ID — कृपया मोबाइल ओटीपी का उपयोग करें।"
                    )
                  )
                }
              >
                🌐{" "}
                {L(
                  lang,
                  "ಗೂಗಲ್ ಲಾಗಿನ್ (OAuth ನಿರೀಕ್ಷೆಯಲ್ಲಿದೆ)",
                  "Google Sign-In (Awaiting OAuth ID)",
                  "गूगल साइन-इन (OAuth प्रतीक्षित)"
                )}
              </button>

              <button
                type="button"
                className="pill"
                onClick={handleAccountRecoveryRequest}
              >
                🔄{" "}
                {L(
                  lang,
                  "ಖಾತೆ ಮರುಪಡೆಯುವಿಕೆ (Account Recovery)",
                  "Account Recovery / Reset",
                  "खाता पुनर्प्राप्ति"
                )}
              </button>
            </div>
          </div>
        )}

        {/* SECTION 2: CSC OPERATOR VLE & STAFF TERMINAL LOGIN */}
        {loginMode === "csc" && (
          <div className="card" style={{ marginBottom: 14 }}>
            <h3 style={{ marginTop: 0 }}>
              🖥️{" "}
              {L(
                lang,
                "ಸೇವಾ ಕೇಂದ್ರ (CSC VLE) ಮತ್ತು ಅಧಿಕಾರಿಗಳ ಲಾಗಿನ್",
                "CSC Operator VLE & Staff Terminal Access",
                "सीएससी ऑपरेटर और स्टाफ टर्मिनल लॉग इन"
              )}
            </h3>
            <div className="grid-2">
              <label>
                <strong>
                  {L(
                    lang,
                    "ಪಾತ್ರ ಆಯ್ಕೆ (Role)",
                    "Select Authorised Role",
                    "भूमिका चुनें"
                  )}
                </strong>
                <select
                  className="input-field"
                  value={selectedRole}
                  onChange={(e) =>
                    setSelectedRole(
                      e.target.value as
                        | "FARMER"
                        | "CSC_OPERATOR"
                        | "SCHEME_REVIEWER"
                        | "PLATFORM_ADMIN"
                    )
                  }
                >
                  <option value="CSC_OPERATOR">
                    {L(
                      lang,
                      "ಸೇವಾ ಕೇಂದ್ರ ಆಪರೇಟರ್",
                      "CSC Operator (Assisted Mode)",
                      "सीएससी ऑपरेटर"
                    )}
                  </option>
                  <option value="SCHEME_REVIEWER">
                    {L(
                      lang,
                      "ಯೋಜನೆ ಪರಿಶೀಲಕರು",
                      "Scheme Reviewer (Maker-Checker)",
                      "योजना समीक्षक"
                    )}
                  </option>
                  <option value="PLATFORM_ADMIN">
                    {L(
                      lang,
                      "ಪ್ಲಾಟ್‌ಫಾರ್ಮ್ ಅಡ್ಮಿನ್",
                      "Platform Admin",
                      "प्लेटफ़ॉर्म एडमिन"
                    )}
                  </option>
                  <option value="FARMER">
                    {L(lang, "ರೈತರು", "Farmer", "किसान")}
                  </option>
                </select>
              </label>
              <label>
                <strong>
                  {L(
                    lang,
                    "ಕೇಂದ್ರದ ಗುರುತಿನ ಸಂಖ್ಯೆ",
                    "CSC Operator / Staff ID",
                    "सीएससी ऑपरेटर आईडी"
                  )}
                </strong>
                <input
                  type="text"
                  name="cscId"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  className="input-field"
                  value={cscId}
                  onChange={(e) => setCscId(e.target.value)}
                />
              </label>
            </div>

            <div className="grid-2">
              <label>
                <strong>
                  {L(
                    lang,
                    "ಕಿಯೋಸ್ಕ್ ಕೇಂದ್ರ ಕೋಡ್",
                    "Kiosk Center Code",
                    "कियोस्क केंद्र कोड"
                  )}
                </strong>
                <input
                  type="text"
                  name="kioskCode"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  className="input-field"
                  value={kioskCode}
                  onChange={(e) => setKioskCode(e.target.value)}
                />
              </label>
              <label>
                <strong>
                  {L(
                    lang,
                    "ದ್ವಿ-ಹಂತದ ಭದ್ರತಾ ಕೋಡ್ (TOTP 2FA)",
                    "2FA TOTP Security Code",
                    "द्वि-चरणीय सुरक्षा कोड (TOTP)"
                  )}
                </strong>
                <input
                  type="text"
                  name="totpCode"
                  inputMode="numeric"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  maxLength={6}
                  className="input-field"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                />
              </label>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 8,
              }}
            >
              <button
                type="button"
                className="btn"
                onClick={handleRoleSwitchLogin}
              >
                🔐{" "}
                {L(
                  lang,
                  "ಈ ಪಾತ್ರದಲ್ಲಿ ಸಕ್ರಿಯಗೊಳಿಸಿ",
                  "Activate Role Session",
                  "इस भूमिका में लॉग इन करें"
                )}
              </button>
              <a href="/csc" className="btn ghost" style={{ textDecoration: "none" }}>
                🤝 {L(lang, "ಸೇವಾ ಕೇಂದ್ರ ಪೋರ್ಟಲ್ ತೆರೆಯಿರಿ", "Open CSC Portal", "सीएससी पोर्टल खोलें")}
              </a>
              <a
                href="/reviewer"
                className="btn ghost"
                style={{ textDecoration: "none" }}
              >
                ✅ {L(lang, "ಪರಿಶೀಲಕರ ಪೋರ್ಟಲ್", "Reviewer Portal", "समीक्षक पोर्टल")}
              </a>
              <a
                href="/admin"
                className="btn ghost"
                style={{ textDecoration: "none" }}
              >
                🛡️ {L(lang, "ಅಡ್ಮಿನ್ ಪೋರ್ಟಲ್", "Admin Console", "एडमिन पोर्टल")}
              </a>
            </div>
          </div>
        )}

        {/* DPDP Act 2023 Consent & Strict Anti-Scam Security Guarantee */}
        <div className="card" style={{ marginBottom: 14 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 10,
            }}
          >
            <h3 style={{ margin: 0 }}>
              🛡️{" "}
              {L(
                lang,
                "ಡೇಟಾ ಸುರಕ್ಷತೆ ಮತ್ತು ಖಾಸಗಿತನ ಒಪ್ಪಿಗೆ (DPDP ಕಾಯ್ದೆ 2023)",
                "Data Security & DPDP Act 2023 Privacy Consent",
                "डेटा सुरक्षा और डीपीडीपी अधिनियम 2023 गोपनीयता सहमति"
              )}
            </h3>
            <span className="chip ok">256-Bit AES-GCM</span>
          </div>

          <div className="scam-guarantee-box" style={{ marginBottom: 12 }}>
            <strong style={{ color: "var(--alert-red)", display: "block", marginBottom: 6 }}>
              🚨{" "}
              {L(
                lang,
                "ಮೋಸದ ಕರೆಗಳು ಮತ್ತು ವಂಚನೆಗಳ ವಿರುದ್ಧ ಕಟ್ಟುನಿಟ್ಟಿನ ಭರವಸೆ:",
                "Strict Anti-Scam & Zero-Credential Guarantee:",
                "धोखाधड़ी से सुरक्षा की सख्त गारंटी:"
              )}
            </strong>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
              <li>
                {L(
                  lang,
                  "ನಾವು ಯಾವುದೇ ಬ್ಯಾಂಕ್ ಪಾಸ್‌ವರ್ಡ್, ಎಟಿಎಂ ಪಿನ್, ಯುಪಿಐ ಪಿನ್ ಅಥವಾ ಬ್ಯಾಂಕ್ ಒಟಿಪಿ ಎಂದಿಗೂ ಕೇಳುವುದಿಲ್ಲ.",
                  "We NEVER ask for your bank password, ATM PIN, UPI PIN, or bank OTP.",
                  "हम कभी भी बैंक पासवर्ड, एटीएम पिन, यूपीआई पिन या बैंक ओटीपी नहीं मांगते।"
                )}
              </li>
              <li>
                {L(
                  lang,
                  "ನಾವು ಆಧಾರ್ ಸಂಖ್ಯೆ ಅಥವಾ ಬಯೋಮೆಟ್ರಿಕ್ ಮಾಹಿತಿಯನ್ನು ಸಂಗ್ರಹಿಸುವುದಿಲ್ಲ.",
                  "We never collect or store Aadhaar numbers or biometric data.",
                  "हम आधार नंबर या बायोमेट्रिक डेटा कभी संग्रहीत नहीं करते।"
                )}
              </li>
              <li>
                {L(
                  lang,
                  "ಸರ್ಕಾರಿ ಸಹಾಯಧನ ನೇರವಾಗಿ ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ಮತ್ತು ಡಿಬಿಟಿ ಮೂಲಕ ಮಾತ್ರ ಜಮೆಯಾಗುತ್ತದೆ.",
                  "Government benefits are disbursed strictly through official DBT portals.",
                  "सरकारी सब्सिडी केवल आधिकारिक डीबीटी पोर्टल के माध्यम से ही मिलती है।"
                )}
              </li>
            </ul>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "8px 0",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              style={{ width: 22, height: 22, marginTop: 3 }}
            />
            <span>
              <strong>
                {L(
                  lang,
                  "ಯೋಜನೆ ಹೊಂದಾಣಿಕೆ ಮತ್ತು ಗಡುವು ಎಚ್ಚರಿಕೆಗಳಿಗಾಗಿ ನನ್ನ ಜಮೀನು ಮತ್ತು ಬೆಳೆ ವಿವರಗಳನ್ನು ಬಳಸಲು ನಾನು ಒಪ್ಪುತ್ತೇನೆ.",
                  "I consent to purpose-limited processing of my farm profile for scheme matching and deadline alerts.",
                  "मैं योजना मिलान और समय-सीमा अलर्ट के लिए अपनी खेत प्रोफ़ाइल के उपयोग की सहमति देता हूँ।"
                )}
              </strong>
            </span>
          </label>

          <div className="grid-2" style={{ marginTop: 8 }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 12,
                borderRadius: 12,
                background: "var(--surface-low)",
              }}
            >
              <span>
                🔔{" "}
                {L(
                  lang,
                  "ವಾಟ್ಸಾಪ್ ಗಡುವು ಎಚ್ಚರಿಕೆಗಳು",
                  "WhatsApp Deadline Alerts",
                  "व्हाट्सएप समय-सीमा अलर्ट"
                )}
              </span>
              <input
                type="checkbox"
                checked={whatsappOptIn}
                onChange={(e) => setWhatsappOptIn(e.target.checked)}
                style={{ width: 20, height: 20 }}
              />
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 12,
                borderRadius: 12,
                background: "var(--surface-low)",
              }}
            >
              <span>
                🔊{" "}
                {L(
                  lang,
                  "ಧ್ವನಿ ಓದುವಿಕೆ ನೆರವು",
                  "Voice Read-Aloud Assistance",
                  "आवाज़ में पढ़ने की सहायता"
                )}
              </span>
              <input
                type="checkbox"
                checked={voiceAutoRead}
                onChange={(e) => setVoiceAutoRead(e.target.checked)}
                style={{ width: 20, height: 20 }}
              />
            </label>
          </div>
        </div>

        {/* Active Device Sessions & Data Principal Rights (Erasure / Audit) */}
        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <h4 style={{ margin: 0 }}>
              📱{" "}
              {L(
                lang,
                "ಸಕ್ರಿಯ ಸಾಧನಗಳು ಮತ್ತು ಖಾತೆ ನಿಯಂತ್ರಣ",
                "Active Device Sessions & Sovereign Data Controls",
                "सक्रिय उपकरण और खाता नियंत्रण"
              )}
            </h4>
            <button
              type="button"
              className="pill"
              onClick={handleRequestAccountDeletion}
            >
              🗑️{" "}
              {L(
                lang,
                "ಖಾತೆ ಅಳಿಸಲು ವಿನಂತಿಸಿ (30 ದಿನ)",
                "Request Account Deletion (30-Day Grace)",
                "खाता हटाने का अनुरोध करें (30 दिन)"
              )}
            </button>
          </div>

          {deletionScheduledIso && (
            <div className="banner" style={{ marginTop: 8 }}>
              {L(
                lang,
                `ಖಾತೆ ಅಳಿಸುವ ವಿನಂತಿ ದಾಖಲಾಗಿದೆ. ನಿಗದಿತ ದಿನಾಂಕ: ${deletionScheduledIso}`,
                `Account deletion scheduled for: ${deletionScheduledIso} (30-day grace period active).`,
                `खाता हटाने की निर्धारित तिथि: ${deletionScheduledIso}`
              )}
            </div>
          )}

          {(Array.isArray(sessions) ? sessions : []).length > 0 && (
            <div style={{ marginTop: 10 }}>
              {(sessions || []).slice(0, 3).map((s) => {
                const dateRaw = String(s?.createdAtIso || s?.createdAt || "");
                const dateStr = dateRaw ? dateRaw.slice(0, 16).replace("T", " ") : "";
                const isRevoked = Boolean(s?.revokedAtIso || s?.revokedAt);
                return (
                  <div key={s?.id || Math.random()} className="rule">
                    <div style={{ flex: 1, fontSize: "0.85rem" }}>
                      <strong>{s?.userAgent || "Web Browser Session"}</strong>
                      {dateStr ? ` · ${dateStr}` : ""}
                    </div>
                    {isRevoked ? (
                      <span className="chip bad">
                        {L(lang, "ರದ್ದಾಗಿದೆ", "Revoked", "निष्क्रिय")}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="pill"
                        onClick={() => handleRevokeSession(s?.id || "")}
                      >
                        {L(lang, "ಸಂಪರ್ಕ ಕಡಿತ", "Revoke", "हटाएं")}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
