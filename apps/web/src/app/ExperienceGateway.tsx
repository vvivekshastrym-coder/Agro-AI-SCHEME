"use client";

import React, { useState } from "react";
import type { SupportedLanguage } from "@agro/shared";
import { L } from "./LoginSecurityModal";

export type ExperienceMode = "AI_PREDICTION";

interface ExperienceGatewayProps {
  lang: SupportedLanguage;
  setLang: (l: SupportedLanguage) => void;
  onContinueToApp: (openLoginImmediately: boolean) => void;
  speakText: (text: string, lang: SupportedLanguage) => void;
}

export function ExperienceGateway({
  lang,
  setLang,
  onContinueToApp,
  speakText,
}: ExperienceGatewayProps) {
  const [step, setStep] = useState<"ai_overview" | "brand_reveal">(
    "ai_overview"
  );

  const aiFeatures = [
    {
      icon: "🌾",
      text: L(
        lang,
        "ಎಐ ಬೆಳೆ ಭವಿಷ್ಯ ಮತ್ತು ಶಿಫಾರಸುಗಳು",
        "AI crop prediction & recommendations",
        "एआई फसल पूर्वानुमान और सिफारिशें"
      ),
      status: L(lang, "ಸಕ್ರಿಯ", "LIVE", "सक्रिय"),
      live: true,
    },
    {
      icon: "🍃",
      text: L(
        lang,
        "ಎಐ ಎಲೆ ರೋಗ ಪತ್ತೆ",
        "AI leaf disease detection",
        "एआई पत्ती रोग पहचान"
      ),
      status: L(
        lang,
        "ವಿಷನ್ API ನಿರೀಕ್ಷೆಯಲ್ಲಿದೆ",
        "AWAITING_VISION_API",
        "विज़न API प्रतीक्षित"
      ),
      live: false,
    },
    {
      icon: "🐛",
      text: L(
        lang,
        "ಕೀಟ ಮತ್ತು ರೋಗ ಮಾಹಿತಿ",
        "Pest & disease intelligence",
        "कीट और रोग बुद्धिमत्ता"
      ),
      status: L(lang, "ಸಕ್ರಿಯ", "LIVE", "सक्रिय"),
      live: true,
    },
    {
      icon: "🌦️",
      text: L(
        lang,
        "ಸ್ಥಳೀಯ ಹವಾಮಾನ ಮುನ್ಸೂಚನೆ",
        "Hyperlocal weather intelligence",
        "हाइपरलोकल मौसम बुद्धिमत्ता"
      ),
      status: L(
        lang,
        "IMD API ನಿರೀಕ್ಷೆಯಲ್ಲಿದೆ",
        "AWAITING_IMD_API",
        "IMD API प्रतीक्षित"
      ),
      live: false,
    },
    {
      icon: "📈",
      text: L(
        lang,
        "ಮಂಡಿ ಬೆಲೆ ವಿಶ್ಲೇಷಣೆ ಮತ್ತು ಮುನ್ಸೂಚನೆ",
        "Mandi price analysis & forecasts",
        "मंडी मूल्य विश्लेषण और पूर्वानुमान"
      ),
      status: L(
        lang,
        "Agmarknet API ನಿರೀಕ್ಷೆಯಲ್ಲಿದೆ",
        "AWAITING_AGMARKNET_API",
        "Agmarknet API प्रतीक्षित"
      ),
      live: false,
    },
    {
      icon: "🏛️",
      text: L(
        lang,
        "ಸರ್ಕಾರಿ ಯೋಜನೆ ಶಿಫಾರಸುಗಳು",
        "Government scheme recommendations",
        "सरकारी योजना सिफारिशें"
      ),
      status: L(lang, "ಸಕ್ರಿಯ", "LIVE", "सक्रिय"),
      live: true,
    },
    {
      icon: "🛡️",
      text: L(
        lang,
        "ಬೆಳೆ ವಿಮೆ ಮತ್ತು ಕ್ಲೇಮ್ ನೆರವು",
        "Crop insurance & claim assistance",
        "फसल बीमा और दावा सहायता"
      ),
      status: L(lang, "ಸಕ್ರಿಯ", "LIVE", "सक्रिय"),
      live: true,
    },
    {
      icon: "🎙️",
      text: L(
        lang,
        "ಆಗ್ರೋ ಜಿಪಿಟಿ ಧ್ವನಿ ಸಹಾಯಕ",
        "Agro GPT voice assistant",
        "एग्रो जीपीटी वॉइस असिस्टेंट"
      ),
      status: L(lang, "ಸಕ್ರಿಯ", "LIVE", "सक्रिय"),
      live: true,
    },
    {
      icon: "⚡",
      text: L(
        lang,
        "ವೈಯಕ್ತಿಕ ಕೃಷಿ ಒಳನೋಟಗಳು",
        "Personalized farming insights",
        "व्यक्तिगत कृषि अंतर्दृष्टि"
      ),
      status: L(lang, "ಸಕ್ರಿಯ", "LIVE", "सक्रिय"),
      live: true,
    },
  ];

  return (
    <div
      className="experience-gateway"
      role="region"
      aria-label={L(
        lang,
        "ಎಐ ಪ್ರಿಡಿಕ್ಷನ್ ಆಪ್",
        "AI Prediction App",
        "एआई प्रेडिक्शन ऐप"
      )}
    >
      <div className="experience-container" style={{ maxWidth: 680 }}>
        {/* Top Language & Voice Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 16,
          }}
        >
          <div
            className="lang-segmented"
            role="group"
            aria-label={L(
              lang,
              "ಭಾಷೆ ಆಯ್ಕೆಮಾಡಿ",
              "Select Language",
              "भाषा चुनें"
            )}
          >
            <button
              type="button"
              className="lang-seg-btn"
              aria-pressed={lang === "kn"}
              onClick={() => setLang("kn")}
            >
              ಕನ್ನಡ
            </button>
            <button
              type="button"
              className="lang-seg-btn"
              aria-pressed={lang === "en"}
              onClick={() => setLang("en")}
            >
              English
            </button>
            <button
              type="button"
              className="lang-seg-btn"
              aria-pressed={lang === "hi"}
              onClick={() => setLang("hi")}
            >
              हिन्दी
            </button>
          </div>

          <button
            type="button"
            className="pill"
            onClick={() =>
              speakText(
                L(
                  lang,
                  "ಎಐ ಪ್ರಿಡಿಕ್ಷನ್ ಆಪ್: ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ ಆಧಾರಿತ ಸ್ಮಾರ್ಟ್ ಕೃಷಿ ಅನುಭವ. ಬೆಳೆ ಭವಿಷ್ಯ, ರೋಗ ಪತ್ತೆ, ಹವಾಮಾನ, ಮಂಡಿ ಬೆಲೆ, ಸರ್ಕಾರಿ ಯೋಜನೆ ಹೊಂದಾಣಿಕೆ ಮತ್ತು ಧ್ವನಿ ಸಹಾಯಕ.",
                  "AI Prediction App: An intelligent farming experience powered by AI. Crop predictions, disease detection, weather intelligence, mandi forecasts, government scheme matching, voice AI and personalized recommendations.",
                  "एआई प्रेडिक्शन ऐप: एआई द्वारा संचालित एक स्मार्ट कृषि अनुभव। फसल पूर्वानुमान, रोग पहचान, मौसम, मंडी भाव, सरकारी योजना मिलान और वॉइस एआई।"
                ),
                lang
              )
            }
          >
            🔊{" "}
            {L(
              lang,
              "ಧ್ವನಿಯಲ್ಲಿ ಕೇಳಿ",
              "Listen",
              "आवाज़ में सुनें"
            )}
          </button>
        </div>

        {/* ================================================================
            STAGE 1: AI PREDICTION APP LAUNCH SCREEN (BEFORE LOGO & LOGIN)
            ================================================================ */}
        {step === "ai_overview" && (
          <article
            className="exp-card-primary"
            aria-label={L(
              lang,
              "ಎಐ ಪ್ರಿಡಿಕ್ಷನ್ ಆಪ್",
              "AI Prediction App",
              "एआई प्रेडिक्शन ऐप"
            )}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <span
                  className="chip"
                  style={{
                    background: "var(--harvest-gold)",
                    color: "#1e2b24",
                    fontWeight: 800,
                    border: "none",
                  }}
                >
                  ★{" "}
                  {L(
                    lang,
                    "ಶಿಫಾರಸು ಮಾಡಲಾಗಿದೆ · ಮುಖ್ಯ ಮೋಡ್",
                    "Recommended · Primary mode",
                    "अनुशंसित · मुख्य मोड"
                  )}
                </span>
                <span
                  className="chip"
                  style={{
                    background: "rgba(255,255,255,0.16)",
                    color: "#ffffff",
                    border: "1px solid rgba(255,255,255,0.3)",
                  }}
                >
                  🤖 AI Copilot
                </span>
              </div>

              <h1
                style={{
                  margin: "0 0 8px",
                  fontSize: "1.65rem",
                  color: "#ffffff",
                }}
              >
                {L(
                  lang,
                  "ಎಐ ಪ್ರಿಡಿಕ್ಷನ್ ಆಪ್",
                  "AI Prediction App",
                  "एआई प्रेडिक्शन ऐप"
                )}
              </h1>
              <p
                style={{
                  margin: "0 0 14px",
                  color: "rgba(255, 255, 255, 0.92)",
                  fontSize: "0.98rem",
                }}
              >
                {L(
                  lang,
                  "ಕೃತಕ ಬುದ್ಧಿಮತ್ತೆ (AI) ಆಧಾರಿತ ಸ್ಮಾರ್ಟ್ ಕೃಷಿ ಅನುಭವ. ಬೆಳೆ ಭವಿಷ್ಯ, ರೋಗ ಪತ್ತೆ, ಹವಾಮಾನ, ಮಂಡಿ ಬೆಲೆ, ಸರ್ಕಾರಿ ಯೋಜನೆ ಹೊಂದಾಣಿಕೆ, ಬೆಳೆ ವಿಮೆ ನೆರವು ಮತ್ತು ಧ್ವನಿ ಸಹಾಯಕ.",
                  "An intelligent farming experience powered by AI. Crop predictions, disease detection, weather intelligence, mandi forecasts, government scheme matching, voice AI and personalized recommendations.",
                  "एआई द्वारा संचालित एक स्मार्ट कृषि अनुभव। फसल पूर्वानुमान, रोग पहचान, मौसम, मंडी भाव, सरकारी योजना मिलान और वॉइस एआई।"
                )}
              </p>

              <ul className="exp-feature-list">
                {aiFeatures.map((f, idx) => (
                  <li key={idx} className="exp-feature-item">
                    <span aria-hidden="true">{f.icon}</span>
                    <span style={{ flex: 1 }}>{f.text}</span>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        padding: "2px 7px",
                        borderRadius: 999,
                        fontWeight: 700,
                        background: f.live
                          ? "rgba(145, 248, 181, 0.22)"
                          : "rgba(255, 222, 171, 0.2)",
                        color: f.live ? "#91f8b5" : "#ffdeab",
                        border: f.live
                          ? "1px solid rgba(145, 248, 181, 0.45)"
                          : "1px solid rgba(255, 222, 171, 0.4)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {f.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <button
                type="button"
                className="btn gold block"
                style={{ fontSize: "1.05rem", minHeight: 54 }}
                onClick={() => setStep("brand_reveal")}
              >
                🚀{" "}
                {L(
                  lang,
                  "ಎಐ ಕೃಷಿ ಅನುಭವವನ್ನು ಪ್ರಾರಂಭಿಸಿ →",
                  "Explore AI-powered farming →",
                  "एआई-संचालित खेती शुरू करें →"
                )}
              </button>
            </div>
          </article>
        )}

        {/* ================================================================
            STAGE 2: ANIMATED AGRO AI BRAND REVEAL & LOGIN GATEWAY
            ================================================================ */}
        {step === "brand_reveal" && (
          <div className="brand-reveal-stage" aria-live="polite">
            <div className="brand-emblem-hero">
              <img
                src="/emblem.png"
                alt="Agro AI Scheme Official Emblem"
                width={92}
                height={92}
              />
            </div>

            <span className="chip ok">
              ★{" "}
              {L(
                lang,
                "ಎಐ ಪ್ರಿಡಿಕ್ಷನ್ ಆಪ್ ಸಕ್ರಿಯವಾಗಿದೆ",
                "AI Prediction App Active",
                "एआई प्रेडिक्शन ऐप सक्रिय"
              )}
            </span>

            <h1
              style={{
                margin: "12px 0 4px",
                fontSize: "1.85rem",
                color: "var(--primary-dark)",
              }}
            >
              {L(
                lang,
                "ಆಗ್ರೋ ಎಐ ಸ್ಕೀಮ್",
                "Agro AI Scheme",
                "एग्रो एआई स्कीम"
              )}
            </h1>
            <p
              style={{
                margin: "0 0 14px",
                fontWeight: 700,
                color: "var(--deep-field)",
                fontSize: "1.02rem",
              }}
            >
              {L(
                lang,
                "ಕೃಷಿ ಯೋಜನೆ, ಬೆಳೆ ವಿಮೆ ಮತ್ತು ರೈತರ ಸುರಕ್ಷತಾ ವೇದಿಕೆ",
                "Agrarian Scheme, Crop Insurance & Farmer Trust Copilot",
                "कृषि योजना, फसल बीमा और किसान सुरक्षा मंच"
              )}
            </p>

            <div
              className="banner"
              style={{ textAlign: "left", marginBottom: 18 }}
            >
              <strong>
                🔒{" "}
                {L(
                  lang,
                  "ರೈತ ಖಾತೆ ಮತ್ತು ಡೇಟಾ ಪ್ರಾಮಾಣಿಕತೆ:",
                  "Farmer Account & Honest Data Guarantee:",
                  "किसान खाता और डेटा प्रामाणिकता:"
                )}
              </strong>
              <p style={{ margin: "4px 0 0", fontSize: "0.86rem" }}>
                {L(
                  lang,
                  "ಮೊಬೈಲ್ ಒಟಿಪಿ ಮೂಲಕ ಸುರಕ್ಷಿತವಾಗಿ ಲಾಗಿನ್ ಮಾಡಿ. ಪರಿಶೀಲಿಸಿದ ಸರ್ಕಾರಿ ಮೂಲಗಳನ್ನೇ ಬಳಸಲಾಗುತ್ತದೆ ಮತ್ತು ಯಾವುದೇ ಕಾಲ್ಪನಿಕ ಮಾರುಕಟ್ಟೆ ಬೆಲೆ ಅಥವಾ ನಕಲಿ ಮುನ್ಸೂಚನೆಗಳನ್ನು ತೋರಿಸಲಾಗುವುದಿಲ್ಲ.",
                  "Sign in securely via Mobile OTP. Only verified scheme sources are used, and we never fabricate market prices or weather forecasts.",
                  "मोबाइल ओटीपी के माध्यम से सुरक्षित रूप से लॉग इन करें। हम कभी भी काल्पनिक मंडी भाव या मौसम पूर्वानुमान नहीं दिखाते।"
                )}
              </p>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <button
                type="button"
                className="btn gold block"
                style={{ minHeight: 54, fontSize: "1.02rem" }}
                onClick={() => onContinueToApp(true)}
              >
                🔐{" "}
                {L(
                  lang,
                  "ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಮತ್ತು ಒಟಿಪಿ ಮೂಲಕ ಲಾಗಿನ್ ಮಾಡಿ",
                  "Sign In with Mobile Number + OTP / Staff Login",
                  "मोबाइल नंबर और ओटीपी के साथ लॉग इन करें"
                )}
              </button>

              <button
                type="button"
                className="btn block"
                style={{ minHeight: 52 }}
                onClick={() => onContinueToApp(false)}
              >
                🌾{" "}
                {L(
                  lang,
                  "ಎಐ ಪ್ರಿಡಿಕ್ಷನ್ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ತೆರೆಯಿರಿ →",
                  "Continue to AI Prediction Workspace →",
                  "एआई प्रेडिक्शन कार्यक्षेत्र खोलें →"
                )}
              </button>

              <button
                type="button"
                className="pill"
                style={{ margin: "4px auto 0" }}
                onClick={() => setStep("ai_overview")}
              >
                ←{" "}
                {L(
                  lang,
                  "ಹಿಂದೆ",
                  "Back",
                  "वापस जाएं"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
