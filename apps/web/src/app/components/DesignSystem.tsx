"use client";

import React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bookmark,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileCheck,
  FileText,
  Globe,
  HelpCircle,
  Home,
  Info,
  LandPlot,
  LifeBuoy,
  Lock,
  LogOut,
  Mic,
  PhoneCall,
  RefreshCw,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sprout,
  User,
  Volume2,
  Wallet,
  X,
} from "lucide-react";
import type { SupportedLanguage } from "@agro/shared";
import {
  resolveSingleTruthChip,
  type InternalTruthState,
  type SingleTruthChipOutput,
} from "@agro/ui";

export type NavTabId = "today" | "schemes" | "help" | "farm" | "papers";

/* ============================================================================
   1. ERROR BOUNDARY (Step 0: Friendly Retry UI instead of Blank Screen)
   ============================================================================ */
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackActionLabel?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const message =
      error instanceof Error ? error.message : "Unexpected rendering error";
    return { hasError: true, errorMessage: message };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            minHeight: "65dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            className="ds-card"
            style={{ maxWidth: 440, textAlign: "center", width: "100%" }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 999,
                background: "var(--warn-100)",
                color: "var(--warn-700)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <AlertTriangle size={24} strokeWidth={1.75} />
            </div>
            <h2 className="text-h2" style={{ marginBottom: 8 }}>
              {this.props.fallbackTitle ??
                "Something went wrong loading this screen"}
            </h2>
            <p className="text-caption" style={{ marginBottom: 16 }}>
              {this.state.errorMessage ||
                "Please tap Retry below to reload your farm workspace."}
            </p>
            <button
              type="button"
              className="btn"
              onClick={() => {
                this.setState({ hasError: false, errorMessage: "" });
                if (typeof window !== "undefined") {
                  window.location.reload();
                }
              }}
            >
              <RefreshCw size={18} strokeWidth={1.75} />
              {this.props.fallbackActionLabel ?? "Retry"}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ============================================================================
   2. SKELETON SHIMMER & EMPTY STATE
   ============================================================================ */
export function Skeleton({
  height = 120,
  label = "Loading your farm data...",
}: {
  height?: number;
  label?: string;
}) {
  return (
    <div aria-busy="true" aria-live="polite" style={{ width: "100%" }}>
      <p className="text-caption" style={{ marginBottom: 8 }}>
        {label}
      </p>
      <div
        className="skeleton-box"
        style={{ height, width: "100%", marginBottom: 12 }}
      />
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="ds-card" style={{ textAlign: "center", padding: 28 }}>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 999,
          background: "var(--green-100)",
          color: "var(--green-700)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
        }}
      >
        <Sprout size={22} strokeWidth={1.75} />
      </div>
      <h3 className="text-h3" style={{ marginBottom: 6 }}>
        {title}
      </h3>
      <p className="text-caption" style={{ marginBottom: actionLabel ? 16 : 0 }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <button type="button" className="btn ghost" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/* ============================================================================
   3. STATUS CHIP (Single Chip per Card) & INFO SHEET
   ============================================================================ */
export function StatusChip({
  states,
  isDemoData = false,
  isProviderConnected = false,
  verifiedDateText,
  sourceUrl,
  lang = "en",
  onInspect,
}: {
  states: InternalTruthState[];
  isDemoData?: boolean;
  isProviderConnected?: boolean;
  verifiedDateText?: string;
  sourceUrl?: string;
  lang?: SupportedLanguage;
  onInspect?: (chip: SingleTruthChipOutput) => void;
}) {
  const chip = resolveSingleTruthChip({
    states,
    isDemoData,
    isProviderConnected,
    verifiedDateText,
    sourceUrl,
    lang,
  });

  return (
    <button
      type="button"
      className={`status-chip ${chip.style}`}
      onClick={() => onInspect?.(chip)}
      title={chip.explanation}
    >
      <span>{chip.text}</span>
      <Info size={12} strokeWidth={1.75} />
    </button>
  );
}

export function InfoSheet({
  open,
  title,
  sourceLabel,
  lastCheckedLabel,
  explanation,
  officialUrl,
  lang,
  onClose,
}: {
  open: boolean;
  title: string;
  sourceLabel: string;
  lastCheckedLabel: string;
  explanation: string;
  officialUrl?: string;
  lang: SupportedLanguage;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true">
      <div className="sheet" style={{ maxWidth: 480 }}>
        <div className="ds-card-header">
          <h3 className="text-h2">{title}</h3>
          <button
            type="button"
            className="icon-pill-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
        <p className="text-body" style={{ marginBottom: 16 }}>
          {explanation}
        </p>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--r-sm)",
            padding: 14,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="text-caption">
              {lang === "kn" ? "ಮೂಲ" : lang === "hi" ? "स्रोत" : "Source"}
            </span>
            <strong style={{ fontSize: 14 }}>{sourceLabel}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="text-caption">
              {lang === "kn"
                ? "ಕೊನೆಯ ಪರಿಶೀಲನೆ"
                : lang === "hi"
                  ? "अंतिम जांच"
                  : "Last checked"}
            </span>
            <strong style={{ fontSize: 14 }}>{lastCheckedLabel}</strong>
          </div>
        </div>
        {officialUrl && (
          <a
            href={officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn ghost block"
            style={{ textDecoration: "none", marginBottom: 10 }}
          >
            <span>
              {lang === "kn"
                ? "ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ತೆರೆಯಿರಿ"
                : lang === "hi"
                  ? "आधिकारिक पोर्टल खोलें"
                  : "Open official portal"}
            </span>
            <ExternalLink size={16} strokeWidth={1.75} />
          </a>
        )}
        <button type="button" className="btn block" onClick={onClose}>
          {lang === "kn" ? "ಗೊತ್ತಾಯಿತು" : lang === "hi" ? "समझ गया" : "Got it"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================================
   4. APP BAR, DISCLAIMER STRIP, DEMO RIBBON, LANGUAGE SHEET & PROFILE MENU
   ============================================================================ */
export function AppBar({
  lang,
  isAuthenticated,
  onOpenLanguage,
  onOpenProfile,
}: {
  lang: SupportedLanguage;
  isAuthenticated: boolean;
  onOpenLanguage: () => void;
  onOpenProfile: () => void;
}) {
  const langCode = lang === "kn" ? "KN" : lang === "hi" ? "HI" : "EN";
  return (
    <header className="app-bar">
      <div className="app-bar-brand">
        <div className="app-bar-logo">
          <img src="/logo.png" alt="Agro AI Scheme Logo" width={32} height={32} />
        </div>
        <span className="app-bar-title">
          {lang === "kn"
            ? "ಆಗ್ರೋ ಎಐ ಸ್ಕೀಮ್"
            : lang === "hi"
              ? "एग्रो एआई स्कीम"
              : "Agro AI Scheme"}
        </span>
      </div>
      <div className="app-bar-actions">
        <Link
          href="/admin"
          className="icon-pill-btn"
          style={{
            textDecoration: "none",
            fontSize: 12,
            fontWeight: 700,
            color: "#166534",
            background: "#f0fdf4",
            border: "1px solid #86efac",
            padding: "4px 8px",
          }}
          title="Open Enterprise Portals (Super Admin, Employee/CSC, Bank Partner)"
        >
          <span>🛡️ Portals</span>
        </Link>
        <button
          type="button"
          className="icon-pill-btn"
          onClick={onOpenLanguage}
          aria-label="Select language"
        >
          <Globe size={18} strokeWidth={1.75} />
          <span>{langCode}</span>
        </button>
        <button
          type="button"
          className="avatar-btn"
          onClick={onOpenProfile}
          aria-label="Open profile and settings"
        >
          <User size={20} strokeWidth={1.75} />
          {isAuthenticated && (
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: "var(--green-500)",
                position: "absolute",
                marginLeft: 24,
                marginTop: -24,
              }}
            />
          )}
        </button>
      </div>
    </header>
  );
}

export function DisclaimerStrip({
  lang,
  onOpenInfo,
}: {
  lang: SupportedLanguage;
  onOpenInfo: () => void;
}) {
  return (
    <div className="disclaimer-strip" role="note">
      <span>
        {lang === "kn"
          ? "ಸ್ವತಂತ್ರ ರೈತ ಸಹಾಯಕ ಆಪ್ (ಸರ್ಕಾರಿ ಆಪ್ ಅಲ್ಲ). ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ದೃಢೀಕರಿಸಿ."
          : lang === "hi"
            ? "स्वतंत्र किसान सहायक ऐप, सरकारी ऐप नहीं। आधिकारिक पोर्टल पर जांचें।"
            : "Independent helper, not a government app. Verify on official portals."}
      </span>
      <button type="button" className="disclaimer-link" onClick={onOpenInfo}>
        {lang === "kn" ? "ಮಾಹಿತಿ" : lang === "hi" ? "जानकारी" : "Info"}
      </button>
    </div>
  );
}

export function DemoRibbon({
  lang,
  isDemoMode,
  onConnectAccounts,
}: {
  lang: SupportedLanguage;
  isDemoMode: boolean;
  onConnectAccounts: () => void;
}) {
  if (!isDemoMode) return null;
  return (
    <div className="demo-ribbon" role="status">
      <span>
        {lang === "kn"
          ? "ಮಾದರಿ ಮೋಡ್ — ಉದಾಹರಣೆ ಮಾಹಿತಿಯನ್ನು ತೋರಿಸಲಾಗುತ್ತಿದೆ."
          : lang === "hi"
            ? "डेमो मोड — उदाहरण डेटा दिखाया जा रहा है।"
            : "Demo mode — showing sample farm data."}
      </span>
      <button
        type="button"
        className="disclaimer-link"
        style={{ color: "var(--warn-700)" }}
        onClick={onConnectAccounts}
      >
        {lang === "kn"
          ? "ಖಾತೆ ಸಂಪರ್ಕಿಸಿ"
          : lang === "hi"
            ? "खाता जोड़ें"
            : "Connect real accounts"}
      </button>
    </div>
  );
}

export function LanguageSheet({
  open,
  lang,
  onSelectLanguage,
  onOpenAllLanguages,
  onClose,
}: {
  open: boolean;
  lang: SupportedLanguage;
  onSelectLanguage: (l: SupportedLanguage) => void;
  onOpenAllLanguages: () => void;
  onClose: () => void;
}) {
  if (!open) return null;
  const primaryLangs: Array<{
    code: SupportedLanguage;
    native: string;
    english: string;
  }> = [
    { code: "kn", native: "ಕನ್ನಡ", english: "Kannada" },
    { code: "en", native: "English", english: "English" },
    { code: "hi", native: "हिन्दी", english: "Hindi" },
  ];
  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true">
      <div className="sheet" style={{ maxWidth: 440 }}>
        <div className="ds-card-header">
          <h3 className="text-h2">
            {lang === "kn"
              ? "ಭಾಷೆ ಆಯ್ಕೆಮಾಡಿ"
              : lang === "hi"
                ? "भाषा चुनें"
                : "Choose language"}
          </h3>
          <button type="button" className="icon-pill-btn" onClick={onClose}>
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {primaryLangs.map((item) => {
            const active = lang === item.code;
            return (
              <button
                key={item.code}
                type="button"
                className="sos-action-row"
                style={{
                  borderColor: active ? "var(--green-700)" : "var(--line)",
                  background: active ? "var(--green-100)" : "var(--surface)",
                  marginBottom: 0,
                }}
                onClick={() => {
                  onSelectLanguage(item.code);
                  onClose();
                }}
              >
                <div>
                  <div className="text-h3">{item.native}</div>
                  <div className="text-caption">{item.english}</div>
                </div>
                {active && (
                  <Check
                    size={20}
                    strokeWidth={1.75}
                    color="var(--green-700)"
                  />
                )}
              </button>
            );
          })}
          <button
            type="button"
            className="btn ghost block"
            style={{ marginTop: 6 }}
            onClick={() => {
              onClose();
              onOpenAllLanguages();
            }}
          >
            <Globe size={18} strokeWidth={1.75} />
            <span>
              {lang === "kn"
                ? "ಇತರ ಭಾರತೀಯ ಭಾಷೆಗಳು (22+)"
                : lang === "hi"
                  ? "अन्य भारतीय भाषाएं (22+)"
                  : "More Indian languages (22+)"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProfileMenu({
  open,
  lang,
  easyMode,
  isAuthenticated,
  userPhone,
  onToggleEasyMode,
  onOpenAuthModal,
  onOpenIntro,
  onOpenHelp,
  onSignOut,
  onClose,
}: {
  open: boolean;
  lang: SupportedLanguage;
  easyMode: boolean;
  isAuthenticated: boolean;
  userPhone?: string;
  onToggleEasyMode: () => void;
  onOpenAuthModal: () => void;
  onOpenIntro: () => void;
  onOpenHelp: () => void;
  onSignOut: () => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true">
      <div className="sheet" style={{ maxWidth: 440 }}>
        <div className="ds-card-header">
          <h3 className="text-h2">
            {lang === "kn"
              ? "ಖಾತೆ ಮತ್ತು ಸೆಟ್ಟಿಂಗ್‌ಗಳು"
              : lang === "hi"
                ? "खाता और सेटिंग्स"
                : "Profile & settings"}
          </h3>
          <button type="button" className="icon-pill-btn" onClick={onClose}>
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            type="button"
            className="sos-action-row"
            style={{ marginBottom: 0 }}
            onClick={() => {
              onClose();
              onOpenAuthModal();
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <ShieldCheck
                size={22}
                strokeWidth={1.75}
                color="var(--green-700)"
              />
              <div>
                <div className="text-h3">
                  {isAuthenticated
                    ? lang === "kn"
                      ? `ಲಾಗಿನ್ ಆಗಿದೆ (${userPhone ?? ""})`
                      : lang === "hi"
                        ? `लॉगिन (${userPhone ?? ""})`
                        : `Signed in (${userPhone ?? ""})`
                    : lang === "kn"
                      ? "ಮೊಬೈಲ್ ಓಟಿಪಿ ಲಾಗಿನ್ ಮತ್ತು ಭದ್ರತೆ"
                      : lang === "hi"
                        ? "मोबाइल ओटीपी लॉगिन और सुरक्षा"
                        : "Account & OTP sign in"}
                </div>
                <div className="text-caption">
                  {lang === "kn"
                    ? "ನಿಮ್ಮ ಡೇಟಾ ಮತ್ತು ಒಪ್ಪಿಗೆ ನಿಯಂತ್ರಣ"
                    : lang === "hi"
                      ? "आपका डेटा और सहमति नियंत्रण"
                      : "Manage mobile login, PIN, and data consent"}
                </div>
              </div>
            </div>
            <ChevronRight size={18} strokeWidth={1.75} />
          </button>

          <button
            type="button"
            className="sos-action-row"
            style={{
              marginBottom: 0,
              borderColor: easyMode ? "var(--green-700)" : "var(--line)",
              background: easyMode ? "var(--green-100)" : "var(--surface)",
            }}
            onClick={onToggleEasyMode}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Sparkles size={22} strokeWidth={1.75} color="var(--green-700)" />
              <div>
                <div className="text-h3">
                  {lang === "kn"
                    ? "ಸರಳ ಓದು ಮೋಡ್ (Easy Mode)"
                    : lang === "hi"
                      ? "सरल मोड (Easy Mode)"
                      : "Easy reading mode"}
                </div>
                <div className="text-caption">
                  {lang === "kn"
                    ? "ದೊಡ್ಡ ಅಕ್ಷರಗಳು ಮತ್ತು ಕಡಿಮೆ ಆಯ್ಕೆಗಳು"
                    : lang === "hi"
                      ? "बड़े अक्षर और सरल बटन"
                      : "Larger 18px text and simpler cards"}
                </div>
              </div>
            </div>
            <span className={`status-chip ${easyMode ? "green" : "neutral"}`}>
              {easyMode ? "ON" : "OFF"}
            </span>
          </button>

          <button
            type="button"
            className="sos-action-row"
            style={{ marginBottom: 0 }}
            onClick={() => {
              onClose();
              onOpenIntro();
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Sprout size={22} strokeWidth={1.75} color="var(--green-700)" />
              <div>
                <div className="text-h3">
                  {lang === "kn"
                    ? "ಎಐ ಆಪ್ ಪರಿಚಯ ನೋಡಿ"
                    : lang === "hi"
                      ? "एआई ऐप परिचय देखें"
                      : "About Agro AI Prediction Mode"}
                </div>
                <div className="text-caption">
                  {lang === "kn"
                    ? "ಆಪ್ ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ ಎಂದು ತಿಳಿಯಿರಿ"
                    : lang === "hi"
                      ? "जानें कि ऐप कैसे काम करता है"
                      : "See how scheme matching and voice guidance work"}
                </div>
              </div>
            </div>
            <ChevronRight size={18} strokeWidth={1.75} />
          </button>

          <button
            type="button"
            className="sos-action-row"
            style={{ marginBottom: 0 }}
            onClick={() => {
              onClose();
              onOpenHelp();
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <HelpCircle
                size={22}
                strokeWidth={1.75}
                color="var(--warn-700)"
              />
              <div>
                <div className="text-h3">
                  {lang === "kn"
                    ? "ಸಹಾಯ ಮತ್ತು ದೂರು"
                    : lang === "hi"
                      ? "सहायता और शिकायत"
                      : "Help & emergency support"}
                </div>
                <div className="text-caption">
                  {lang === "kn"
                    ? "ಬೆಳೆ ಹಾನಿ, ಕಂತು ವಿಳಂಬ ಅಥವಾ ಸಿಎಸ್‌ಸಿ ಭೇಟಿ"
                    : lang === "hi"
                      ? "फसल नुकसान, भुगतान देरी या सीएससी"
                      : "Crop damage, delayed payment, or CSC visit"}
                </div>
              </div>
            </div>
            <ChevronRight size={18} strokeWidth={1.75} />
          </button>

          {isAuthenticated && (
            <button
              type="button"
              className="btn ghost block"
              style={{ color: "var(--danger-700)", marginTop: 4 }}
              onClick={() => {
                onSignOut();
                onClose();
              }}
            >
              <LogOut size={18} strokeWidth={1.75} />
              <span>
                {lang === "kn"
                  ? "ಲಾಗ್ ಔಟ್"
                  : lang === "hi"
                    ? "लॉग आउट"
                    : "Sign out"}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   5. NAVIGATION: BOTTOM NAV + SOS BUTTON (Mobile) & SIDE RAIL (Desktop)
   ============================================================================ */
export function SosButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div className="sos-center-slot">
      <button
        type="button"
        className="sos-circle-btn"
        aria-current={active ? "page" : undefined}
        aria-label={label}
        onClick={onClick}
      >
        <LifeBuoy size={24} strokeWidth={1.75} />
      </button>
      <span className="sos-label">{label}</span>
    </div>
  );
}

export function BottomNav({
  activeTab,
  lang,
  onSelectTab,
}: {
  activeTab: NavTabId;
  lang: SupportedLanguage;
  onSelectTab: (tab: NavTabId) => void;
}) {
  const labels = {
    today: lang === "kn" ? "ಇಂದು" : lang === "hi" ? "आज" : "Today",
    schemes: lang === "kn" ? "ಯೋಜನೆ" : lang === "hi" ? "योजनाएं" : "Schemes",
    sos: lang === "kn" ? "ಸಹಾಯ" : lang === "hi" ? "मदद" : "SOS",
    farm: lang === "kn" ? "ಜಮೀನು" : lang === "hi" ? "खेत" : "My Farm",
    papers: lang === "kn" ? "ದಾಖಲೆ" : lang === "hi" ? "दस्तावेज़" : "Papers",
  };

  return (
    <div className="bottom-nav-wrap">
      <nav className="bottom-nav" aria-label="Primary Bottom Navigation">
        <button
          type="button"
          className="bottom-nav-item"
          aria-current={activeTab === "today" ? "page" : undefined}
          onClick={() => onSelectTab("today")}
        >
          <Home size={20} strokeWidth={1.75} />
          <span>{labels.today}</span>
        </button>

        <button
          type="button"
          className="bottom-nav-item"
          aria-current={activeTab === "schemes" ? "page" : undefined}
          onClick={() => onSelectTab("schemes")}
        >
          <ScrollText size={20} strokeWidth={1.75} />
          <span>{labels.schemes}</span>
        </button>

        <SosButton
          label={labels.sos}
          active={activeTab === "help"}
          onClick={() => onSelectTab("help")}
        />

        <button
          type="button"
          className="bottom-nav-item"
          aria-current={activeTab === "farm" ? "page" : undefined}
          onClick={() => onSelectTab("farm")}
        >
          <LandPlot size={20} strokeWidth={1.75} />
          <span>{labels.farm}</span>
        </button>

        <button
          type="button"
          className="bottom-nav-item"
          aria-current={activeTab === "papers" ? "page" : undefined}
          onClick={() => onSelectTab("papers")}
        >
          <FileText size={20} strokeWidth={1.75} />
          <span>{labels.papers}</span>
        </button>
      </nav>
    </div>
  );
}

export function SideRail({
  activeTab,
  lang,
  onSelectTab,
  onOpenVoice,
}: {
  activeTab: NavTabId;
  lang: SupportedLanguage;
  onSelectTab: (tab: NavTabId) => void;
  onOpenVoice: () => void;
}) {
  const items: Array<{
    id: NavTabId;
    label: string;
    icon: React.ReactNode;
    isSos?: boolean;
  }> = [
    {
      id: "today",
      label: lang === "kn" ? "ಇಂದು (Today)" : lang === "hi" ? "आज (Today)" : "Today",
      icon: <Home size={20} strokeWidth={1.75} />,
    },
    {
      id: "schemes",
      label:
        lang === "kn"
          ? "ಯೋಜನೆಗಳು (Schemes)"
          : lang === "hi"
            ? "योजनाएं (Schemes)"
            : "Schemes",
      icon: <ScrollText size={20} strokeWidth={1.75} />,
    },
    {
      id: "farm",
      label:
        lang === "kn"
          ? "ನನ್ನ ಜಮೀನು (My Farm)"
          : lang === "hi"
            ? "मेरा खेत (My Farm)"
            : "My Farm",
      icon: <LandPlot size={20} strokeWidth={1.75} />,
    },
    {
      id: "papers",
      label:
        lang === "kn"
          ? "ದಾಖಲೆಗಳು (Papers)"
          : lang === "hi"
            ? "दस्तावेज़ (Papers)"
            : "Papers",
      icon: <FileText size={20} strokeWidth={1.75} />,
    },
    {
      id: "help",
      label:
        lang === "kn"
          ? "ತುರ್ತು ಸಹಾಯ (SOS)"
          : lang === "hi"
            ? "आपातकालीन मदद (SOS)"
            : "SOS Help",
      icon: <LifeBuoy size={20} strokeWidth={1.75} />,
      isSos: true,
    },
  ];

  return (
    <aside className="side-rail" aria-label="Desktop Navigation">
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "4px 8px",
          }}
        >
          <div className="app-bar-logo">
            <img src="/logo.png" alt="Agro AI Scheme Logo" width={32} height={32} />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: "var(--green-900)" }}>
              Agro AI Scheme
            </div>
            <div className="text-caption" style={{ fontSize: 12 }}>
              {lang === "kn"
                ? "ರೈತ ಸಹಾಯಕ"
                : lang === "hi"
                  ? "किसान सहायक"
                  : "Farmer Copilot"}
            </div>
          </div>
        </div>

        <nav className="side-rail-nav">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`side-rail-item ${item.isSos ? "sos-rail-btn" : ""}`}
              aria-current={activeTab === item.id ? "page" : undefined}
              onClick={() => onSelectTab(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <button
        type="button"
        className="btn block"
        onClick={onOpenVoice}
        style={{ background: "var(--green-900)" }}
      >
        <Mic size={18} strokeWidth={1.75} />
        <span>
          {lang === "kn"
            ? "ಧ್ವನಿ ಸಹಾಯಕ ಕೇಳಿ"
            : lang === "hi"
              ? "आवाज़ सहायक से पूछें"
              : "Ask Voice Copilot"}
        </span>
      </button>
    </aside>
  );
}

/* ============================================================================
   6. HERO ACTION CARD & PROGRESS RING (Today Screen)
   ============================================================================ */
export function ProgressRing({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  const size = 56;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = Math.min(1, Math.max(0, current / Math.max(1, total)));
  const offset = circumference - ratio * circumference;

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      aria-label={`${current} of ${total} complete`}
    >
      <svg width={size} height={size}>
        <circle
          stroke="rgba(255,255,255,0.22)"
          fill="transparent"
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          stroke="var(--gold-500)"
          fill="transparent"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span
        style={{
          position: "absolute",
          fontSize: 13,
          fontWeight: 700,
          color: "#FFFFFF",
        }}
      >
        {current}/{total}
      </span>
    </div>
  );
}

export function HeroActionCard({
  eyebrow,
  title,
  subtitle,
  ctaLabel,
  currentStep,
  totalSteps,
  onPrimaryAction,
  onSpeak,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  currentStep: number;
  totalSteps: number;
  onPrimaryAction: () => void;
  onSpeak: () => void;
}) {
  return (
    <section className="hero-action-card" aria-label={eyebrow}>
      <div className="hero-top-row">
        <span className="hero-eyebrow">{eyebrow}</span>
        <button
          type="button"
          className="speaker-round-btn"
          onClick={onSpeak}
          aria-label="Listen to this card"
        >
          <Volume2 size={20} strokeWidth={1.75} />
        </button>
      </div>

      <div className="hero-body-row">
        <div style={{ minWidth: 0 }}>
          <h2
            className="text-hero"
            style={{ color: "#FFFFFF", marginBottom: 6 }}
          >
            {title}
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 15,
              lineHeight: "22px",
              color: "rgba(255,255,255,0.88)",
            }}
          >
            {subtitle}
          </p>
        </div>
        <ProgressRing current={currentStep} total={totalSteps} />
      </div>

      <button type="button" className="hero-cta-btn" onClick={onPrimaryAction}>
        <Camera size={20} strokeWidth={1.75} />
        <span>{ctaLabel}</span>
      </button>
    </section>
  );
}

/* ============================================================================
   7. STAT TILE, DEADLINE CARD, SCHEME CARD, PLOT CARD & VERTICAL STEPPER
   ============================================================================ */
export function StatTile({
  icon,
  tone,
  valueText,
  label,
  hint,
  onClick,
}: {
  icon: React.ReactNode;
  tone: "green" | "warn" | "danger";
  valueText: string;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  const bgMap = {
    green: "var(--green-100)",
    warn: "var(--warn-100)",
    danger: "var(--danger-100)",
  };
  const colorMap = {
    green: "var(--green-700)",
    warn: "var(--warn-700)",
    danger: "var(--danger-700)",
  };

  return (
    <button type="button" className="stat-tile" onClick={onClick}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <span
          className="stat-tile-icon"
          style={{ background: bgMap[tone], color: colorMap[tone] }}
        >
          {icon}
        </span>
        <ChevronRight size={18} strokeWidth={1.75} color="var(--ink-400)" />
      </div>
      <div>
        <div className="text-h3" style={{ color: "var(--ink-900)" }}>
          {valueText}
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--ink-600)",
            marginTop: 2,
          }}
        >
          {label}
        </div>
        <div className="text-caption" style={{ marginTop: 4 }}>
          {hint}
        </div>
      </div>
    </button>
  );
}

export function DeadlineCard({
  title,
  items,
  lang,
  isDemoData,
  onInspectChip,
}: {
  title: string;
  items: Array<{
    id: string;
    name: string;
    countdownText: string;
    exactDateText: string;
    isVerified: boolean;
    officialUrl: string;
  }>;
  lang: SupportedLanguage;
  isDemoData: boolean;
  onInspectChip: (chip: SingleTruthChipOutput) => void;
}) {
  return (
    <section className="ds-card">
      <div className="ds-card-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Clock size={20} strokeWidth={1.75} color="var(--green-700)" />
          <h3 className="text-h2">{title}</h3>
        </div>
        <StatusChip
          states={[isDemoData ? "DEMO" : "OFFICIALLY_VERIFIED"]}
          isDemoData={isDemoData}
          lang={lang}
          onInspect={onInspectChip}
        />
      </div>

      <div className="vertical-timeline">
        {items.map((item) => (
          <div key={item.id} className="timeline-row">
            <div style={{ minWidth: 0 }}>
              <div className="text-h3">{item.name}</div>
              {item.isVerified ? (
                <div className="text-caption" style={{ marginTop: 2 }}>
                  <strong style={{ color: "var(--green-700)" }}>
                    {item.countdownText}
                  </strong>{" "}
                  · {item.exactDateText}
                </div>
              ) : (
                <div
                  className="text-caption"
                  style={{ color: "var(--warn-700)", marginTop: 2 }}
                >
                  {lang === "kn"
                    ? "ದಿನಾಂಕ ದೃಢೀಕರಿಸಲಾಗಿಲ್ಲ · ಅಧಿಕೃತ ಸೈಟ್ ಪರಿಶೀಲಿಸಿ"
                    : lang === "hi"
                      ? "तिथि की पुष्टि नहीं · आधिकारिक साइट देखें"
                      : "Date not confirmed · check official site"}
                </div>
              )}
            </div>
            <a
              href={item.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="icon-pill-btn"
              style={{ textDecoration: "none", flexShrink: 0 }}
            >
              <span>
                {lang === "kn"
                  ? "ಸೈಟ್"
                  : lang === "hi"
                    ? "साइट"
                    : "Official site"}
              </span>
              <ExternalLink size={14} strokeWidth={1.75} />
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SchemeCard({
  title,
  ministry,
  benefitSummary,
  whyYouMatch,
  docsReadyCount,
  docsTotalCount,
  deadlineText,
  sourceDomain,
  verifiedDateText,
  truthStates,
  isDemoData,
  isSaved,
  lang,
  onSpeak,
  onSeeDetails,
  onToggleSaved,
  onInspectTrace,
  onInspectChip,
}: {
  title: string;
  ministry: string;
  benefitSummary: string;
  whyYouMatch: string;
  docsReadyCount: number;
  docsTotalCount: number;
  deadlineText: string;
  sourceDomain: string;
  verifiedDateText: string;
  truthStates: InternalTruthState[];
  isDemoData: boolean;
  isSaved: boolean;
  lang: SupportedLanguage;
  onSpeak: () => void;
  onSeeDetails: () => void;
  onToggleSaved: () => void;
  onInspectTrace: () => void;
  onInspectChip: (chip: SingleTruthChipOutput) => void;
}) {
  return (
    <article className="ds-card">
      <div className="ds-card-header">
        <div style={{ minWidth: 0 }}>
          <div className="text-caption">{ministry}</div>
          <h3 className="text-h3" style={{ marginTop: 2 }}>
            {title}
          </h3>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <StatusChip
            states={truthStates}
            isDemoData={isDemoData}
            verifiedDateText={verifiedDateText}
            sourceUrl={sourceDomain}
            lang={lang}
            onInspect={onInspectChip}
          />
          <button
            type="button"
            className="speaker-round-btn light"
            onClick={onSpeak}
            aria-label="Read scheme aloud"
          >
            <Volume2 size={18} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <p
        style={{
          margin: "0 0 8px",
          fontWeight: 600,
          color: "var(--green-900)",
        }}
      >
        {benefitSummary}
      </p>

      <p
        style={{
          margin: "0 0 12px",
          padding: "8px 12px",
          borderRadius: "var(--r-sm)",
          background: "var(--cream-50)",
          border: "1px solid var(--line)",
          fontSize: 14,
        }}
      >
        {whyYouMatch}
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
        }}
      >
        <span className="text-caption">
          <FileCheck
            size={14}
            strokeWidth={1.75}
            style={{ verticalAlign: "text-bottom", marginRight: 4 }}
          />
          {lang === "kn"
            ? `${docsReadyCount}/${docsTotalCount} ದಾಖಲೆಗಳು ಸಿದ್ಧ`
            : lang === "hi"
              ? `${docsReadyCount}/${docsTotalCount} दस्तावेज़ तैयार`
              : `${docsReadyCount} of ${docsTotalCount} documents ready`}
        </span>
        <span className="text-caption">{deadlineText}</span>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn" onClick={onSeeDetails}>
          <span>
            {lang === "kn"
              ? "ವಿವರ ನೋಡಿ"
              : lang === "hi"
                ? "विवरण देखें"
                : "See details"}
          </span>
          <ArrowRight size={16} strokeWidth={1.75} />
        </button>
        <button type="button" className="btn ghost" onClick={onToggleSaved}>
          <Bookmark size={16} strokeWidth={1.75} />
          <span>
            {isSaved
              ? lang === "kn"
                ? "ಉಳಿಸಲಾಗಿದೆ"
                : lang === "hi"
                  ? "सहेजा गया"
                  : "Saved"
              : lang === "kn"
                ? "ಅರ್ಜಿ ಗುರುತಿಸಿ"
                : lang === "hi"
                  ? "आवेदन चिह्नित करें"
                  : "Mark applied"}
          </span>
        </button>
      </div>

      <div
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: "1px solid var(--line)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <span className="text-caption">
          {sourceDomain} · {verifiedDateText}
        </span>
        <button
          type="button"
          className="disclaimer-link"
          onClick={onInspectTrace}
        >
          {lang === "kn"
            ? "ಈ ಫಲಿತಾಂಶ ಏಕೆ?"
            : lang === "hi"
              ? "यह परिणाम क्यों?"
              : "Why this result?"}
        </button>
      </div>
    </article>
  );
}

export function PlotCard({
  name,
  cropName,
  stageText,
  progressPercent,
  areaAcres,
  ownershipText,
  surveyNumber,
  isInsured,
  isSelected,
  isDemoData,
  lang,
  onSelect,
  onSpeak,
  onInspectChip,
}: {
  name: string;
  cropName: string;
  stageText: string;
  progressPercent: number;
  areaAcres: number;
  ownershipText: string;
  surveyNumber: string;
  isInsured: boolean;
  isSelected: boolean;
  isDemoData: boolean;
  lang: SupportedLanguage;
  onSelect: () => void;
  onSpeak: () => void;
  onInspectChip: (chip: SingleTruthChipOutput) => void;
}) {
  return (
    <article
      className="ds-card"
      style={{
        borderColor: isSelected ? "var(--green-700)" : "var(--line)",
        borderWidth: isSelected ? 2 : 1,
      }}
    >
      <div className="ds-card-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Clean SVG Parcel Thumbnail */}
          <svg
            width={44}
            height={44}
            viewBox="0 0 44 44"
            aria-hidden="true"
            style={{
              borderRadius: 10,
              background: "var(--green-100)",
              border: "1px solid var(--line)",
              flexShrink: 0,
            }}
          >
            <polygon
              points="8,10 34,7 37,33 11,36"
              fill="rgba(63, 143, 79, 0.22)"
              stroke="var(--green-700)"
              strokeWidth="2"
            />
            <line
              x1="8"
              y1="22"
              x2="36"
              y2="20"
              stroke="var(--green-700)"
              strokeWidth="1.2"
              strokeDasharray="2 2"
            />
          </svg>
          <div>
            <h3 className="text-h3">{name}</h3>
            <div className="text-caption">
              {cropName} · {areaAcres} {lang === "kn" ? "ಎಕರೆ" : "acres"} ·{" "}
              {ownershipText}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <StatusChip
            states={[isInsured ? "MANUALLY_REPORTED" : "NEEDS_VERIFICATION"]}
            isDemoData={isDemoData}
            lang={lang}
            onInspect={onInspectChip}
          />
          <button
            type="button"
            className="speaker-round-btn light"
            onClick={onSpeak}
            aria-label="Listen to plot details"
          >
            <Volume2 size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 13,
            marginBottom: 4,
          }}
        >
          <span>{stageText}</span>
          <span>Survey {surveyNumber}</span>
        </div>
        <div
          style={{
            height: 8,
            borderRadius: 999,
            background: "var(--cream-100)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progressPercent}%`,
              height: "100%",
              background: "var(--green-500)",
            }}
          />
        </div>
      </div>

      <button type="button" className="btn ghost block" onClick={onSelect}>
        {isSelected
          ? lang === "kn"
            ? "ಆಯ್ಕೆಯಾದ ಜಮೀನು"
            : lang === "hi"
              ? "चुना गया खेत"
              : "Active plot"
          : lang === "kn"
            ? "ಈ ಜಮೀನು ಆಯ್ಕೆಮಾಡಿ"
            : lang === "hi"
              ? "यह खेत चुनें"
              : "Select plot"}
      </button>
    </article>
  );
}

export function StepperVertical({
  title,
  steps,
  isDemoData,
  lang,
  onInspectChip,
}: {
  title: string;
  steps: Array<{
    label: string;
    detail: string;
    state: "done" | "active" | "pending";
  }>;
  isDemoData: boolean;
  lang: SupportedLanguage;
  onInspectChip: (chip: SingleTruthChipOutput) => void;
}) {
  return (
    <section className="ds-card">
      <div className="ds-card-header">
        <h3 className="text-h2">{title}</h3>
        <StatusChip
          states={[isDemoData ? "DEMO" : "MANUALLY_REPORTED"]}
          isDemoData={isDemoData}
          lang={lang}
          onInspect={onInspectChip}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {steps.map((step, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              padding: "10px 12px",
              borderRadius: "var(--r-sm)",
              background:
                step.state === "active"
                  ? "var(--gold-100)"
                  : step.state === "done"
                    ? "var(--green-100)"
                    : "var(--cream-50)",
              border: "1px solid var(--line)",
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 999,
                background:
                  step.state === "done"
                    ? "var(--green-700)"
                    : step.state === "active"
                      ? "var(--gold-500)"
                      : "var(--line)",
                color: step.state === "done" ? "#FFFFFF" : "var(--ink-900)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {step.state === "done" ? (
                <Check size={14} strokeWidth={2} />
              ) : (
                index + 1
              )}
            </div>
            <div>
              <div className="text-h3">{step.label}</div>
              <div className="text-caption">{step.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ============================================================================
   8. CLAIM RESCUE ROOM (Full-Screen Signature Workspace)
   ============================================================================ */
export function ClaimRescueRoom({
  open,
  plotName,
  surveyNumber,
  cropName,
  capturedAngles,
  sharedLocationPin,
  deadlineSourceText,
  lang,
  onToggleAngle,
  onShareLocationPin,
  onSaveEvidencePack,
  onCallHelp,
  onClose,
}: {
  open: boolean;
  plotName: string;
  surveyNumber: string;
  cropName: string;
  capturedAngles: {
    wideField: boolean;
    closeUpLeaf: boolean;
    damagedPatch: boolean;
  };
  sharedLocationPin: string | null;
  deadlineSourceText: string;
  lang: SupportedLanguage;
  onToggleAngle: (key: "wideField" | "closeUpLeaf" | "damagedPatch") => void;
  onShareLocationPin: () => void;
  onSaveEvidencePack: () => void;
  onCallHelp: () => void;
  onClose: () => void;
}) {
  if (!open) return null;

  const capturedCount =
    (capturedAngles.wideField ? 1 : 0) +
    (capturedAngles.closeUpLeaf ? 1 : 0) +
    (capturedAngles.damagedPatch ? 1 : 0);
  const percentComplete = Math.round((capturedCount / 3) * 100);

  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true">
      <div className="sheet" style={{ maxWidth: 720 }}>
        {/* Header */}
        <div className="ds-card-header">
          <div>
            <div className="text-caption">
              {lang === "kn"
                ? "ಬೆಳೆ ಹಾನಿ ರಕ್ಷಣಾ ಕೊಠಡಿ"
                : "Claim Copilot & Evidence Workspace"}
            </div>
            <h2 className="text-h2">
              {lang === "kn"
                ? "ಬೆಳೆ ಹಾನಿ ರೆಸ್ಕ್ಯೂ ರೂಮ್"
                : "Claim Rescue Room"}
            </h2>
          </div>
          <button type="button" className="icon-pill-btn" onClick={onClose}>
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        {/* 1. Deadline & Route Source Banner */}
        <div
          style={{
            padding: "12px 14px",
            borderRadius: "var(--r-sm)",
            background: "var(--warn-100)",
            border: "1px solid #f2d9a0",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Clock size={18} strokeWidth={1.75} color="var(--warn-700)" />
            <strong style={{ fontSize: 14, color: "var(--warn-700)" }}>
              {lang === "kn"
                ? "ಅಧಿಕೃತ ವರದಿ ಗಡುವು ಮತ್ತು ಮಾರ್ಗ:"
                : "Official Reporting Route & Deadline:"}
            </strong>
          </div>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 13,
              color: "var(--ink-900)",
            }}
          >
            {deadlineSourceText}
          </p>
        </div>

        {/* 2. Evidence Completeness Meter */}
        <section
          className="ds-card"
          style={{
            background: "linear-gradient(145deg, var(--green-900) 0%, var(--green-700) 100%)",
            color: "#FFFFFF",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 13, color: "var(--gold-100)", fontWeight: 600 }}>
                {lang === "kn"
                  ? "ಸಾಕ್ಷ್ಯ ಪೂರ್ಣತೆಯ ಮೀಟರ್"
                  : "Evidence Completeness Meter"}
              </div>
              <h3 className="text-hero" style={{ color: "#FFFFFF", marginTop: 4 }}>
                {percentComplete}% {lang === "kn" ? "ಸಿದ್ಧವಾಗಿದೆ" : "Ready"}
              </h3>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>
                {plotName} · Survey {surveyNumber} · {cropName}
              </div>
            </div>
            <ProgressRing current={capturedCount} total={3} />
          </div>
        </section>

        {/* 3. Photo Proof Pack Gallery with Blur Check & Retake Guidance */}
        <section className="ds-card" style={{ marginBottom: 16 }}>
          <div className="ds-card-header">
            <div>
              <h3 className="text-h3">
                {lang === "kn"
                  ? "ಫೋಟೋ ಸಾಕ್ಷ್ಯ ಪ್ಯಾಕ್ (3 ಕೋನಗಳು)"
                  : "Damage Photo Proof Pack (3 Required Angles)"}
              </h3>
              <div className="text-caption">
                {lang === "kn"
                  ? "ಸ್ಪಷ್ಟತೆ ಪರೀಕ್ಷೆ ಮತ್ತು ಮರು-ಚಿತ್ರೀಕರಣ ಮಾರ್ಗದರ್ಶನ"
                  : "Includes sharpness check & guided retake instructions"}
              </div>
            </div>
            <span className="status-chip green">
              {capturedCount}/3 {lang === "kn" ? "ತೆಗೆಯಲಾಗಿದೆ" : "Captured"}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(
              [
                {
                  key: "wideField" as const,
                  title:
                    lang === "kn"
                      ? "1. ಇಡೀ ಜಮೀನಿನ ವಿಶಾಲ ನೋಟ"
                      : "1. Wide-field view from field edge",
                  desc:
                    lang === "kn"
                      ? "ತಾಕಿನ ಗಡಿಯಿಂದ ಸಂಪೂರ್ಣ ಬೆಳೆಯ ನೋಟ"
                      : "Shows field boundary and extent of damage",
                  tip:
                    lang === "kn"
                      ? "ಕ್ಯಾಮರಾವನ್ನು ನೇರವಾಗಿ ಹಿಡಿದುಕೊಳ್ಳಿ"
                      : "Hold camera steady at eye level",
                },
                {
                  key: "closeUpLeaf" as const,
                  title:
                    lang === "kn"
                      ? "2. ಹಾನಿಯಾದ ತೆನೆ / ಎಲೆಗಳ ಹತ್ತಿರದ ಫೋಟೋ"
                      : "2. Close-up of damaged crop / leaves",
                  desc:
                    lang === "kn"
                      ? "ರೋಗ ಅಥವಾ ಹಾನಿಯ ಲಕ್ಷಣಗಳು ಸ್ಪಷ್ಟವಾಗಿ ಕಾಣಿಸಬೇಕು"
                      : "Shows specific crop damage, pests, or hail impact",
                  tip:
                    lang === "kn"
                      ? "ಬೆಳಕು ಇರುವಾಗ ಬೆಳೆ ನರಗಳು ಕಾಣುವಂತೆ ಫೋಟೋ ತೆಗೆಯಿರಿ"
                      : "Focus on affected leaf veins in daylight",
                },
                {
                  key: "damagedPatch" as const,
                  title:
                    lang === "kn"
                      ? "3. ನೀರು ನಿಂತ / ತೀವ್ರ ಹಾನಿಯಾದ ಜಾಗ"
                      : "3. Waterlogged or affected patch",
                  desc:
                    lang === "kn"
                      ? "ಬೆಳೆ ಮುಳುಗಿರುವ ಅಥವಾ ಹಾನಿಗೊಳಗಾದ ನಿರ್ದಿಷ್ಟ ವಿಸ್ತೀರ್ಣ"
                      : "Shows standing water, lodging, or destroyed patch",
                  tip:
                    lang === "kn"
                      ? "ನೆಲದ ಮಟ್ಟದಿಂದ 45 ಡಿಗ್ರಿಯಲ್ಲಿ ಹಿಡಿದುಕೊಳ್ಳಿ"
                      : "Angle phone at 45 degrees towards ground",
                },
              ] as const
            ).map((item) => {
              const checked = capturedAngles[item.key];
              return (
                <div
                  key={item.key}
                  style={{
                    padding: 12,
                    borderRadius: "var(--r-sm)",
                    border: "1px solid var(--line)",
                    background: checked ? "var(--green-100)" : "var(--surface)",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      cursor: "pointer",
                      flex: 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleAngle(item.key)}
                      style={{ width: 20, height: 20, marginTop: 2 }}
                    />
                    <div>
                      <div className="text-h3">{item.title}</div>
                      <div className="text-caption">{item.desc}</div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--ink-600)",
                          marginTop: 4,
                          fontStyle: "italic",
                        }}
                      >
                        Tip: {item.tip}
                      </div>
                    </div>
                  </label>
                  <span className={`status-chip ${checked ? "green" : "warn"}`}>
                    {checked
                      ? lang === "kn"
                        ? "ಸ್ಪಷ್ಟತೆ ಪಾಸಾಗಿದೆ"
                        : "Clear · Passed"
                      : lang === "kn"
                        ? "ಬಾಕಿ ಇದೆ"
                        : "Pending"}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Location Pin */}
          <div
            style={{
              marginTop: 12,
              paddingTop: 10,
              borderTop: "1px solid var(--line)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <button
              type="button"
              className="icon-pill-btn"
              onClick={onShareLocationPin}
            >
              <LandPlot size={16} strokeWidth={1.75} />
              <span>
                {sharedLocationPin
                  ? lang === "kn"
                    ? "ಪಿನ್ ಉಳಿಸಲಾಗಿದೆ"
                    : "Location Pin Shared"
                  : lang === "kn"
                    ? "ಜಮೀನಿನ ಜಿಪಿಎಸ್ ಪಿನ್ ಸೇರಿಸಿ"
                    : "Record Field Location Pin"}
              </span>
            </button>
            {sharedLocationPin && (
              <span className="text-caption" style={{ color: "var(--green-700)" }}>
                {sharedLocationPin}
              </span>
            )}
          </div>
        </section>

        {/* 4. Missing Documents Checklist */}
        <section className="ds-card" style={{ marginBottom: 16 }}>
          <h3 className="text-h3" style={{ marginBottom: 8 }}>
            {lang === "kn"
              ? "ಕ್ಲೇಮ್ ಪರಿಶೀಲನಾ ದಾಖಲೆಗಳು"
              : "Claim Verification Checklist"}
          </h3>
          <div className="vertical-timeline">
            <div className="timeline-row">
              <div>
                <div className="text-h3">
                  {lang === "kn"
                    ? "ಪಹಣಿ / ಆರ್‌ಟಿಸಿ (RTC ಭೂ ದಾಖಲೆ)"
                    : "Pahani / RTC Land Record (Survey 142/2A)"}
                </div>
                <div className="text-caption">
                  {lang === "kn"
                    ? "ರೈತರ ಪ್ರೊಫೈಲ್‌ನಿಂದ ಸ್ವಯಂ ಜೋಡಿಸಲಾಗಿದೆ"
                    : "Auto-linked from your My Farm profile"}
                </div>
              </div>
              <span className="status-chip green">
                {lang === "kn" ? "ಸಿದ್ಧವಿದೆ" : "Ready"}
              </span>
            </div>
            <div className="timeline-row">
              <div>
                <div className="text-h3">
                  {lang === "kn"
                    ? "ಬಿತ್ತನೆ ಪ್ರಮಾಣಪತ್ರ (Sowing Certificate)"
                    : "Sowing Certificate / Declaration"}
                </div>
                <div className="text-caption">
                  {lang === "kn"
                    ? "ಗ್ರಾಮ ಲೆಕ್ಕಿಗರಿಂದ ಅಥವಾ ಸ್ವಯಂ ದೃಢೀಕರಣ"
                    : "Obtain from Village Accountant or RSK desk"}
                </div>
              </div>
              <span className="status-chip warn">
                {lang === "kn" ? "ಪರಿಶೀಲಿಸಿ" : "Check at RSK"}
              </span>
            </div>
          </div>
        </section>

        {/* 5. Incident Timeline */}
        <section className="ds-card" style={{ marginBottom: 16 }}>
          <h3 className="text-h3" style={{ marginBottom: 8 }}>
            {lang === "kn" ? "ಘಟನಾ ಕಾಲರೇಖೆ" : "Incident Timeline"}
          </h3>
          <div className="vertical-timeline">
            <div className="timeline-row">
              <div>
                <div className="text-h3">
                  {lang === "kn"
                    ? "ಬೆಳೆ ಹಾನಿ ಸಂಭವಿಸಿದೆ"
                    : "Crop Damage Event Recorded"}
                </div>
                <div className="text-caption">
                  {lang === "kn"
                    ? "2 ನವೆಂಬರ್ 2026 · ಅತಿವೃಷ್ಟಿ ಮತ್ತು ನೀರು ನಿಲ್ಲುವಿಕೆ"
                    : "2 Nov 2026 · Heavy rainfall and waterlogging"}
                </div>
              </div>
              <span className="status-chip info">
                {lang === "kn" ? "ದಾಖಲಾಗಿದೆ" : "Recorded"}
              </span>
            </div>
            <div className="timeline-row">
              <div>
                <div className="text-h3">
                  {lang === "kn"
                    ? "ಸಾಕ್ಷ್ಯ ಸಂಗ್ರಹಣೆ ಪ್ರಕ್ರಿಯೆ"
                    : "Photo Proof Pack in Progress"}
                </div>
                <div className="text-caption">
                  {lang === "kn"
                    ? "3 ನವೆಂಬರ್ 2026 · ರೈತರಿಂದ ನೇರ ಚಿತ್ರೀಕರಣ"
                    : "3 Nov 2026 · Field evidence captured by farmer"}
                </div>
              </div>
              <span className="status-chip green">
                {lang === "kn" ? "ಪ್ರಗತಿಯಲ್ಲಿದೆ" : "Active"}
              </span>
            </div>
          </div>
        </section>

        {/* 6. Action Buttons */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn gold"
            style={{ flex: 1, minWidth: 200 }}
            onClick={onSaveEvidencePack}
          >
            <Camera size={18} strokeWidth={1.75} />
            <span>
              {lang === "kn"
                ? "ಸಾಕ್ಷ್ಯ ಪ್ಯಾಕ್ ರಸೀದಿ ಉಳಿಸಿ"
                : "Save & Bundle Evidence Pack"}
            </span>
          </button>
          <button
            type="button"
            className="btn ghost"
            onClick={onCallHelp}
          >
            <PhoneCall size={18} strokeWidth={1.75} />
            <span>
              {lang === "kn"
                ? "RSK ಸಂಪರ್ಕಿಸಿ / ಸಹಾಯ"
                : "Call RSK / CSC Help"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   9. APPLICATION PREP MODAL (Prefilled Draft with NOT SUBMITTED Badge)
   ============================================================================ */
export function ApplicationPrepModal({
  open,
  schemeTitle,
  ministryName,
  farmerName,
  surveyNumber,
  landAreaText,
  cropName,
  requiredDocuments,
  officialPortalUrl,
  lang,
  onSaveReferenceNumber,
  onClose,
}: {
  open: boolean;
  schemeTitle: string;
  ministryName: string;
  farmerName: string;
  surveyNumber: string;
  landAreaText: string;
  cropName: string;
  requiredDocuments: string[];
  officialPortalUrl: string;
  lang: SupportedLanguage;
  onSaveReferenceNumber: (ref: string) => void;
  onClose: () => void;
}) {
  const [refInput, setRefInput] = React.useState("");

  if (!open) return null;

  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true">
      <div className="sheet" style={{ maxWidth: 640 }}>
        {/* Header */}
        <div className="ds-card-header">
          <div>
            <div className="text-caption">{ministryName}</div>
            <h2 className="text-h2">{schemeTitle}</h2>
          </div>
          <button type="button" className="icon-pill-btn" onClick={onClose}>
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        {/* Mandatory NOT SUBMITTED Badge */}
        <div
          style={{
            padding: "8px 14px",
            borderRadius: "var(--r-sm)",
            background: "var(--warn-100)",
            border: "1px solid #f2d9a0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 13, color: "var(--warn-700)" }}>
            {lang === "kn"
              ? "ಕರಡು ಪ್ರತಿ — ಇನ್ನೂ ಸಲ್ಲಿಸಲಾಗಿಲ್ಲ"
              : "DRAFT, NOT SUBMITTED"}
          </span>
          <span className="text-caption">
            {lang === "kn"
              ? "ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಸಲ್ಲಿಸಿ"
              : "Submit on official portal"}
          </span>
        </div>

        {/* Prefilled Profile Fields */}
        <section className="ds-card" style={{ marginBottom: 14 }}>
          <h3 className="text-h3" style={{ marginBottom: 10 }}>
            {lang === "kn"
              ? "ಪ್ರೊಫೈಲ್‌ನಿಂದ ತುಂಬಲಾದ ವಿವರಗಳು"
              : "Prefilled Details from Your Profile"}
          </h3>
          <div className="vertical-timeline">
            <div className="timeline-row">
              <span className="text-caption">{lang === "kn" ? "ರೈತರ ಹೆಸರು" : "Farmer name"}</span>
              <strong>{farmerName}</strong>
            </div>
            <div className="timeline-row">
              <span className="text-caption">{lang === "kn" ? "ಸರ್ವೆ ಸಂಖ್ಯೆ" : "Survey number"}</span>
              <strong>{surveyNumber}</strong>
            </div>
            <div className="timeline-row">
              <span className="text-caption">{lang === "kn" ? "ಭೂಮಿ ವಿಸ್ತೀರ್ಣ" : "Land area"}</span>
              <strong>{landAreaText}</strong>
            </div>
            <div className="timeline-row">
              <span className="text-caption">{lang === "kn" ? "ಬೆಳೆ" : "Crop"}</span>
              <strong>{cropName}</strong>
            </div>
          </div>
        </section>

        {/* Required Documents Checklist */}
        <section className="ds-card" style={{ marginBottom: 14 }}>
          <h3 className="text-h3" style={{ marginBottom: 8 }}>
            {lang === "kn"
              ? "ಅಗತ್ಯ ದಾಖಲೆಗಳ ಪಟ್ಟಿ"
              : "Required Documents Checklist"}
          </h3>
          <div className="vertical-timeline">
            {requiredDocuments.map((doc, idx) => (
              <div key={idx} className="timeline-row">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <FileCheck size={18} strokeWidth={1.75} color="var(--green-700)" />
                  <span className="text-h3" style={{ fontSize: 15 }}>{doc}</span>
                </div>
                <span className="status-chip green">
                  {lang === "kn" ? "ಸಿದ್ಧವಿದೆ" : "Ready"}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Step-by-Step Guide */}
        <section className="ds-card" style={{ marginBottom: 14 }}>
          <h3 className="text-h3" style={{ marginBottom: 6 }}>
            {lang === "kn" ? "ಅರ್ಜಿ ಸಲ್ಲಿಸುವ ಹಂತಗಳು" : "3-Step Submission Guide"}
          </h3>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: "22px" }}>
            <li>
              {lang === "kn"
                ? "ಮೇಲಿನ ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ"
                : "Review your prefilled draft details"}
            </li>
            <li>
              {lang === "kn"
                ? "ಕೆಳಗಿನ ಲಿಂಕ್ ಒತ್ತಿ ಅಧಿಕೃತ ಪೋರ್ಟಲ್ ತೆರೆಯಿರಿ"
                : "Open the official government portal below"}
            </li>
            <li>
              {lang === "kn"
                ? "ಅರ್ಜಿ ಸಲ್ಲಿಸಿದ ನಂತರ ಸಿಗುವ ಉಲ್ಲೇಖ ಸಂಖ್ಯೆಯನ್ನು ಇಲ್ಲಿ ನಮೂದಿಸಿ"
                : "Save your official acknowledgement reference number below"}
            </li>
          </ol>
        </section>

        {/* Official Portal Handoff Button */}
        <a
          href={officialPortalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn gold block"
          style={{ textDecoration: "none", marginBottom: 14 }}
        >
          <span>
            {lang === "kn"
              ? "ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ನಲ್ಲಿ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ"
              : "Open Official Portal to Submit"}
          </span>
          <ExternalLink size={16} strokeWidth={1.75} />
        </a>

        {/* Save Official Reference Number Form */}
        <div className="ds-card" style={{ marginBottom: 14 }}>
          <label>
            <strong>
              {lang === "kn"
                ? "ಅಧಿಕೃತ ಅರ್ಜಿ ಸಂಖ್ಯೆ ಬಂದಿದೆಯೇ? ಇಲ್ಲಿ ಉಳಿಸಿ:"
                : "Received your official reference number? Save it here:"}
            </strong>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <input
                className="input-field"
                style={{ margin: 0, flex: 1 }}
                placeholder="e.g. KA-DRIP-2026-9921"
                value={refInput}
                onChange={(e) => setRefInput(e.target.value)}
              />
              <button
                type="button"
                className="btn"
                onClick={() => {
                  if (refInput.trim()) {
                    onSaveReferenceNumber(refInput.trim());
                    setRefInput("");
                  }
                }}
              >
                {lang === "kn" ? "ಉಳಿಸಿ" : "Save"}
              </button>
            </div>
          </label>
        </div>

        <button type="button" className="btn ghost block" onClick={onClose}>
          {lang === "kn" ? "ಮುಚ್ಚಿ" : "Close"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================================
   10. INSURANCE HELPERS MODAL (Premium Calculator & Policy Card)
   ============================================================================ */
export function InsuranceHelperModal({
  open,
  plotName,
  surveyNumber,
  cropName,
  areaHectares,
  lang,
  onClose,
}: {
  open: boolean;
  plotName: string;
  surveyNumber: string;
  cropName: string;
  areaHectares: number;
  lang: SupportedLanguage;
  onClose: () => void;
}) {
  const [season, setSeason] = React.useState<"KHARIF" | "RABI" | "ANNUAL_COMMERCIAL">("KHARIF");
  const [sumInsuredPerHa, setSumInsuredPerHa] = React.useState(50000);

  if (!open) return null;

  const totalSumInsured = Math.round(areaHectares * sumInsuredPerHa);
  const farmerPercent =
    season === "ANNUAL_COMMERCIAL" ? 5.0 : season === "RABI" ? 1.5 : 2.0;
  const farmerPremium = Math.round((totalSumInsured * farmerPercent) / 100);
  const govtSubsidy = Math.round((totalSumInsured * (12.0 - farmerPercent)) / 100);

  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true">
      <div className="sheet" style={{ maxWidth: 640 }}>
        {/* Header */}
        <div className="ds-card-header">
          <div>
            <div className="text-caption">
              {lang === "kn"
                ? "ಬೆಳೆ ವಿಮೆ ಸಹಾಯಕಿ"
                : "Crop Insurance Helper & Policy Card"}
            </div>
            <h2 className="text-h2">
              {lang === "kn"
                ? "ವಿಮೆ ಪ್ರೀಮಿಯಂ ಮತ್ತು ಪಾಲಿಸಿ ಕಾರ್ಡ್"
                : "Insurance Calculator & Policy"}
            </h2>
          </div>
          <button type="button" className="icon-pill-btn" onClick={onClose}>
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        {/* Policy Card */}
        <section
          className="ds-card"
          style={{
            background: "linear-gradient(145deg, var(--green-900) 0%, var(--green-700) 100%)",
            color: "#FFFFFF",
            marginBottom: 16,
          }}
        >
          <div className="ds-card-header">
            <div>
              <div style={{ fontSize: 13, color: "var(--gold-100)", fontWeight: 600 }}>
                PMFBY Policy · Kharif 2026
              </div>
              <h3 className="text-h3" style={{ color: "#FFFFFF", marginTop: 2 }}>
                {plotName} ({cropName})
              </h3>
            </div>
            <span className="status-chip green">
              {lang === "kn" ? "ನೋಂದಾಯಿತ" : "Enrolled"}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 12,
              marginTop: 10,
              fontSize: 14,
            }}
          >
            <div>
              <div style={{ color: "rgba(255,255,255,0.8)" }}>Survey No</div>
              <strong>{surveyNumber}</strong>
            </div>
            <div>
              <div style={{ color: "rgba(255,255,255,0.8)" }}>Area</div>
              <strong>{areaHectares} ha ({(areaHectares * 2.471).toFixed(1)} acres)</strong>
            </div>
            <div>
              <div style={{ color: "rgba(255,255,255,0.8)" }}>Sum Insured</div>
              <strong>₹{totalSumInsured.toLocaleString("en-IN")}</strong>
            </div>
            <div>
              <div style={{ color: "rgba(255,255,255,0.8)" }}>Coverage Period</div>
              <strong>1 Jul – 31 Dec 2026</strong>
            </div>
          </div>
        </section>

        {/* Premium Calculator */}
        <section className="ds-card" style={{ marginBottom: 16 }}>
          <h3 className="text-h3" style={{ marginBottom: 12 }}>
            {lang === "kn"
              ? "ಪಿಎಂಎಫ್‌ಬಿವೈ ಪ್ರೀಮಿಯಂ ಲೆಕ್ಕಾಚಾರ"
              : "PMFBY Premium Calculator"}
          </h3>

          <div className="grid-2" style={{ marginBottom: 12 }}>
            <label>
              <strong>{lang === "kn" ? "ಹಂಗಾಮು" : "Season"}</strong>
              <select
                className="input-field"
                value={season}
                onChange={(e) =>
                  setSeason(
                    e.target.value as "KHARIF" | "RABI" | "ANNUAL_COMMERCIAL"
                  )
                }
              >
                <option value="KHARIF">Kharif (Capped 2.0%)</option>
                <option value="RABI">Rabi (Capped 1.5%)</option>
                <option value="ANNUAL_COMMERCIAL">Commercial / Horticultural (Capped 5.0%)</option>
              </select>
            </label>
            <label>
              <strong>
                {lang === "kn"
                  ? "ಪ್ರತಿ ಹೆಕ್ಟೇರ್ ವಿಮಾ ಮೊತ್ತ (₹)"
                  : "Sum Insured per Hectare (₹)"}
              </strong>
              <input
                type="number"
                step="5000"
                className="input-field"
                value={sumInsuredPerHa}
                onChange={(e) =>
                  setSumInsuredPerHa(parseInt(e.target.value, 10) || 50000)
                }
              />
            </label>
          </div>

          <div className="vertical-timeline">
            <div className="timeline-row">
              <span className="text-caption">
                {lang === "kn" ? "ರೈತರ ಪಾಲು" : "Farmer Premium Share"} ({farmerPercent}%)
              </span>
              <strong style={{ color: "var(--green-700)", fontSize: 16 }}>
                ₹{farmerPremium.toLocaleString("en-IN")}
              </strong>
            </div>
            <div className="timeline-row">
              <span className="text-caption">
                {lang === "kn" ? "ಸರ್ಕಾರದ ಸಹಾಯಧನ" : "Government Subsidy"} ({(12.0 - farmerPercent).toFixed(1)}%)
              </span>
              <strong>₹{govtSubsidy.toLocaleString("en-IN")}</strong>
            </div>
            <div className="timeline-row">
              <span className="text-caption">
                {lang === "kn" ? "ಒಟ್ಟು ವಿಮಾ ರಕ್ಷಣೆ" : "Total Sum Insured"}
              </span>
              <strong>₹{totalSumInsured.toLocaleString("en-IN")}</strong>
            </div>
          </div>

          <div className="text-caption" style={{ marginTop: 10 }}>
            Source: PMFBY Revised Operational Guidelines · Ministry of Agriculture & Farmers Welfare
          </div>
        </section>

        <button type="button" className="btn ghost block" onClick={onClose}>
          {lang === "kn" ? "ಮುಚ್ಚಿ" : "Close"}
        </button>
      </div>
    </div>
  );
}

/* ============================================================================
   11. REJECTION DOCTOR MODAL (Notice Reader & Fix Checklist)
   ============================================================================ */
export function RejectionDoctorModal({
  open,
  lang,
  onClose,
}: {
  open: boolean;
  lang: SupportedLanguage;
  onClose: () => void;
}) {
  const [noticeText, setNoticeText] = React.useState(
    "Application rejected: Survey number 142/2A declared on form does not match Pahani/RTC subdivision 142/2B in Bhoomi records."
  );
  const [isConfirmed, setIsConfirmed] = React.useState(true);

  if (!open) return null;

  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true">
      <div className="sheet" style={{ maxWidth: 640 }}>
        {/* Header */}
        <div className="ds-card-header">
          <div>
            <div className="text-caption">
              {lang === "kn"
                ? "ಅರ್ಜಿ ತಿರಸ್ಕಾರ ಪರಿಹಾರ"
                : "Application Rejection Diagnosis"}
            </div>
            <h2 className="text-h2">
              {lang === "kn"
                ? "ರಿಜೆಕ್ಷನ್ ಡಾಕ್ಟರ್"
                : "Rejection Doctor"}
            </h2>
          </div>
          <button type="button" className="icon-pill-btn" onClick={onClose}>
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        {/* Input */}
        <div className="ds-card" style={{ marginBottom: 14 }}>
          <label>
            <strong>
              {lang === "kn"
                ? "ತಿರಸ್ಕೃತ ಸಂದೇಶ ಅಥವಾ ಪತ್ರದ ಪಠ್ಯ:"
                : "Rejection notice text (SMS / Letter / OCR):"}
            </strong>
            <textarea
              rows={3}
              className="input-field"
              value={noticeText}
              onChange={(e) => setNoticeText(e.target.value)}
              style={{ marginTop: 6 }}
            />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <input
              type="checkbox"
              checked={isConfirmed}
              onChange={(e) => setIsConfirmed(e.target.checked)}
              style={{ width: 18, height: 18 }}
            />
            <span className="text-caption">
              {lang === "kn"
                ? "ನಾನು ಈ ಪಠ್ಯವನ್ನು ಪರಿಶೀಲಿಸಿ ದೃಢೀಕರಿಸಿದ್ದೇನೆ"
                : "Farmer confirms extracted rejection text is accurate"}
            </span>
          </label>
        </div>

        {/* Plain Language Diagnosis */}
        <section className="ds-card" style={{ marginBottom: 14 }}>
          <h3 className="text-h3" style={{ marginBottom: 6 }}>
            {lang === "kn"
              ? "ಸರಳ ಕನ್ನಡದಲ್ಲಿ ಕಾರಣ"
              : "Plain-Language Diagnosis"}
          </h3>
          <p style={{ margin: 0, fontSize: 14, color: "var(--danger-700)", fontWeight: 600 }}>
            {lang === "kn"
              ? "ಸರ್ವೆ ಸಂಖ್ಯೆ ಉಪವಿಭಾಗ ವ್ಯತ್ಯಾಸ: ಅರ್ಜಿಯಲ್ಲಿ 142/2A ನಮೂದಿಸಲಾಗಿದೆ, ಆದರೆ ಭೂಮಿ ಪಹಣಿಯಲ್ಲಿ 142/2B ಎಂದು ದಾಖಲಾಗಿದೆ."
              : "Survey subdivision mismatch: Survey number 142/2A on application does not match subdivision 142/2B in official Bhoomi records."}
          </p>
        </section>

        {/* Actionable Fix Checklist */}
        <section className="ds-card" style={{ marginBottom: 14 }}>
          <h3 className="text-h3" style={{ marginBottom: 8 }}>
            {lang === "kn"
              ? "ಸರಿಪಡಿಸಲು 3 ಕ್ರಮಗಳು"
              : "Actionable Fix Checklist"}
          </h3>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: "22px" }}>
            <li>
              {lang === "kn"
                ? "ನಾಡಕಚೇರಿ ಅಥವಾ ಭೂಮಿ ಪೋರ್ಟಲ್‌ನಿಂದ ಇತ್ತೀಚಿನ ಪಹಣಿ (RTC) ಪ್ರತಿ ಪಡೆಯಿರಿ"
                : "Obtain latest RTC/Pahani copy from Nadakacheri or Bhoomi portal"}
            </li>
            <li>
              {lang === "kn"
                ? "ನನ್ನ ಜಮೀನು ಪರದೆಯಲ್ಲಿ ಪಹಣಿಗೆ ಸರಿಹೊಂದುವಂತೆ ಹಿಸ್ಸಾ ಸಂಖ್ಯೆ ಅಪ್‌ಡೇಟ್ ಮಾಡಿ"
                : "Update plot subdivision in My Farm to match Bhoomi Hissa"}
            </li>
            <li>
              {lang === "kn"
                ? "ರಸೀದಿ ಉಲ್ಲೇಖದೊಂದಿಗೆ ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರಕ್ಕೆ ಭೇಟಿ ನೀಡಿ ಮರು-ಪರಿಶೀಲನೆಗೆ ನೀಡಿ"
                : "Visit Raitha Samparka Kendra with receipt reference for verification"}
            </li>
          </ol>
        </section>

        {/* Officer Call Script */}
        <div
          style={{
            padding: 14,
            borderRadius: "var(--r-sm)",
            background: "var(--cream-100)",
            border: "1px solid var(--line)",
            marginBottom: 14,
          }}
        >
          <div className="text-h3" style={{ fontSize: 14, marginBottom: 4 }}>
            {lang === "kn"
              ? "ಅಧಿಕಾರಿಗಳೊಂದಿಗೆ ಮಾತನಾಡಲು ಸ್ಕ್ರಿಪ್ಟ್"
              : "Officer Call Coach"}
          </div>
          <p style={{ margin: 0, fontSize: 13, fontStyle: "italic" }}>
            {lang === "kn"
              ? '"ನಮಸ್ಕಾರ ಸರ್, ನನ್ನ ಅರ್ಜಿ ಸಂಖ್ಯೆ KA-DRIP-2026-901 ಪಹಣಿ ಹಿಸ್ಸಾ ವ್ಯತ್ಯಾಸದಿಂದ ನಿಂತಿದೆ. ನಾನು ಇತ್ತೀಚಿನ ಪಹಣಿ ತಂದಿದ್ದೇನೆ, ದಯವಿಟ್ಟು ಮರುಪರಿಶೀಲನೆಗೆ ಮಾರ್ಗದರ್ಶನ ನೀಡಿ."'
              : '"Namaskara sir, my application reference KA-DRIP-2026-901 was paused due to RTC subdivision mismatch. I have obtained the latest Pahani copy for verification."'}
          </p>
        </div>

        <button type="button" className="btn ghost block" onClick={onClose}>
          {lang === "kn" ? "ಮುಚ್ಚಿ" : "Close"}
        </button>
      </div>
    </div>
  );
}

export function WhatsAppIcon({
  size = 20,
  className = "",
  style,
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.71 1.457h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

export {
  AlertTriangle,
  ArrowRight,
  Bookmark,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileCheck,
  FileText,
  HelpCircle,
  Home,
  Info,
  LandPlot,
  LifeBuoy,
  Lock,
  LogOut,
  Mic,
  PhoneCall,
  RefreshCw,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sprout,
  User,
  Volume2,
  Wallet,
  X,
};
