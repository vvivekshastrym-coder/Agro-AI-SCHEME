import type { EligibilityEvaluationResult } from "@agro/rules-engine";
import type { SupportedLanguage } from "@agro/shared";

// ============================================================================
// Provider Adapters (Section 2, 3, 4, 9)
// Every mock adapter explicitly sets isMock = true and sourceProvider = "mock-*"
// ============================================================================

export interface SmsSendResult {
  messageId: string;
  delivered: boolean;
  isMock: boolean;
  sourceProvider: string;
  sourceTimestamp: string;
}

export interface SmsProvider {
  sendOtp(phone: string, otp: string, lang: SupportedLanguage): Promise<SmsSendResult>;
}

export class MockSmsProvider implements SmsProvider {
  public readonly lastOtpByPhone = new Map<string, string>();

  async sendOtp(
    phone: string,
    otp: string,
    _lang: SupportedLanguage
  ): Promise<SmsSendResult> {
    this.lastOtpByPhone.set(phone, otp);
    return {
      messageId: `mock-sms-${Date.now()}`,
      delivered: true,
      isMock: true,
      sourceProvider: "mock-sms-console",
      sourceTimestamp: new Date().toISOString(),
    };
  }
}

export interface EmailSendResult {
  messageId: string;
  isMock: boolean;
  sourceProvider: string;
  sourceTimestamp: string;
}

export interface EmailProvider {
  sendMail(to: string, subject: string, bodyText: string): Promise<EmailSendResult>;
}

export class MockEmailProvider implements EmailProvider {
  public readonly outbox: Array<{
    to: string;
    subject: string;
    bodyText: string;
    sentAt: string;
  }> = [];

  async sendMail(
    to: string,
    subject: string,
    bodyText: string
  ): Promise<EmailSendResult> {
    const sentAt = new Date().toISOString();
    this.outbox.push({ to, subject, bodyText, sentAt });
    return {
      messageId: `mock-email-${Date.now()}`,
      isMock: true,
      sourceProvider: "mock-mailpit",
      sourceTimestamp: sentAt,
    };
  }
}

export interface LlmExplanationOutput {
  explanationText: string;
  language: SupportedLanguage;
  isMock: boolean;
  sourceProvider: string;
  sourceTimestamp: string;
  cached: boolean;
}

export interface LlmProvider {
  explainEligibility(params: {
    schemeVersionId: string;
    schemeTitle: string;
    sourceUrl: string;
    evaluation: EligibilityEvaluationResult;
    language: SupportedLanguage;
  }): Promise<LlmExplanationOutput>;
}

/**
 * Deterministic, source-bound LLM explanation service with per-(version, status, language) cache.
 * Can NEVER alter the eligibility status computed by @agro/rules-engine.
 */
export class CachedMockLlmProvider implements LlmProvider {
  private readonly cache = new Map<string, LlmExplanationOutput>();

  async explainEligibility(params: {
    schemeVersionId: string;
    schemeTitle: string;
    sourceUrl: string;
    evaluation: EligibilityEvaluationResult;
    language: SupportedLanguage;
  }): Promise<LlmExplanationOutput> {
    const cacheKey = `${params.schemeVersionId}:${params.evaluation.status}:${params.language}`;
    const existing = this.cache.get(cacheKey);
    if (existing) {
      return { ...existing, cached: true };
    }

    const { evaluation, language, schemeTitle, sourceUrl } = params;
    let explanationText: string;

    if (language === "kn") {
      const passedText = evaluation.passedRules
        .map((r) => r.descriptionKn)
        .join("; ");
      const missingText = evaluation.missingFacts
        .map((r) => r.descriptionKn)
        .join("; ");
      const failedText = evaluation.failedRules
        .map((r) => r.descriptionKn)
        .join("; ");

      explanationText =
        `[DEMO / AI ವಿವರಣೆ] "${schemeTitle}" ಯೋಜನೆಗೆ ನಿಮ್ಮ ಪ್ರಸ್ತುತ ಸ್ಥಿತಿ: ${evaluation.status}. ` +
        (passedText ? `ಪೂರೈಸಿದ ನಿಯಮಗಳು: ${passedText}. ` : "") +
        (failedText ? `ಪೂರೈಸದ ನಿಯಮಗಳು: ${failedText}. ` : "") +
        (missingText ? `ಬೇಕಾಗಿರುವ ಮಾಹಿತಿ: ${missingText}. ` : "") +
        `ಅಧಿಕೃತ ಮೂಲ: ${sourceUrl}`;
    } else {
      const passedText = evaluation.passedRules
        .map((r) => r.descriptionEn)
        .join("; ");
      const missingText = evaluation.missingFacts
        .map((r) => r.descriptionEn)
        .join("; ");
      const failedText = evaluation.failedRules
        .map((r) => r.descriptionEn)
        .join("; ");

      explanationText =
        `[DEMO / AI Summary] For "${schemeTitle}", deterministic rule status is ${evaluation.status}. ` +
        (passedText ? `Passed: ${passedText}. ` : "") +
        (failedText ? `Not met: ${failedText}. ` : "") +
        (missingText ? `Missing data to verify: ${missingText}. ` : "") +
        `Official source: ${sourceUrl}`;
    }

    const output: LlmExplanationOutput = {
      explanationText,
      language,
      isMock: true,
      sourceProvider: "mock-llm-explainer",
      sourceTimestamp: new Date().toISOString(),
      cached: false,
    };
    this.cache.set(cacheKey, output);
    return output;
  }
}

export interface SttTranscriptionResult {
  transcript: string;
  language: SupportedLanguage;
  confidence: number;
  requiresFarmerConfirmation: true;
  isMock: boolean;
  sourceProvider: string;
  sourceTimestamp: string;
}

export interface SttProvider {
  transcribeVoiceStub(
    fieldHint: string,
    language: SupportedLanguage
  ): Promise<SttTranscriptionResult>;
}

export class MockBhashiniSttProvider implements SttProvider {
  async transcribeVoiceStub(
    fieldHint: string,
    language: SupportedLanguage
  ): Promise<SttTranscriptionResult> {
    const sampleKn: Record<string, string> = {
      plotName: "ಉತ್ತರ ಬೋರ್‌ವೆಲ್ ಜಮೀನು",
      surveyNumber: "142/2A",
      crop: "ರಾಗಿ (Ragi)",
    };
    const sampleEn: Record<string, string> = {
      plotName: "North Borewell Plot",
      surveyNumber: "142/2A",
      crop: "Ragi (Finger Millet)",
    };
    const dict = language === "kn" ? sampleKn : sampleEn;
    return {
      transcript: dict[fieldHint] ?? (language === "kn" ? "ಮಾದರಿ ಧ್ವನಿ ಪಠ್ಯ" : "Sample voice input"),
      language,
      confidence: 0.92,
      requiresFarmerConfirmation: true,
      isMock: true,
      sourceProvider: "mock-bhashini-stt",
      sourceTimestamp: new Date().toISOString(),
    };
  }
}

// ============================================================================
// Twilio & Direct WhatsApp Integration Adapters
// ============================================================================

export interface WhatsAppSendResult {
  messageSid: string;
  status: "queued" | "sent" | "delivered" | "failed" | "mock_delivered";
  isMock: boolean;
  provider: "twilio" | "mock_direct";
  to: string;
  from: string;
  sentAt: string;
  directWhatsAppUrl: string;
}

export interface WhatsAppProvider {
  sendWhatsAppReport(params: {
    toPhone: string;
    bodyText: string;
    mediaUrl?: string;
  }): Promise<WhatsAppSendResult>;
}

export class TwilioWhatsAppProvider implements WhatsAppProvider {
  constructor(
    private readonly accountSid?: string,
    private readonly authToken?: string,
    private readonly fromNumber: string = "whatsapp:+14155238886"
  ) {}

  public isConfigured(): boolean {
    return Boolean(this.accountSid && this.authToken);
  }

  async sendWhatsAppReport(params: {
    toPhone: string;
    bodyText: string;
    mediaUrl?: string;
  }): Promise<WhatsAppSendResult> {
    const cleanPhone = (params.toPhone || "").replace(/\D/g, "").slice(-10) || "9876543210";
    const toFormatted = `whatsapp:+91${cleanPhone}`;
    const directUrl = `https://api.whatsapp.com/send?phone=91${cleanPhone}&text=${encodeURIComponent(params.bodyText)}`;

    if (!this.accountSid || !this.authToken) {
      // Graceful fallback with valid direct wa.me link
      return {
        messageSid: `SM_mock_${Date.now()}_${cleanPhone}`,
        status: "mock_delivered",
        isMock: true,
        provider: "mock_direct",
        to: toFormatted,
        from: this.fromNumber,
        sentAt: new Date().toISOString(),
        directWhatsAppUrl: directUrl,
      };
    }

    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const basicAuth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");

    const formData = new URLSearchParams();
    formData.append("From", this.fromNumber);
    formData.append("To", toFormatted);
    formData.append("Body", params.bodyText);
    if (params.mediaUrl) {
      formData.append("MediaUrl", params.mediaUrl);
    }

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.warn(`[TwilioWhatsApp] API error ${res.status}: ${errorText}`);
        return {
          messageSid: `SM_err_${Date.now()}`,
          status: "failed",
          isMock: false,
          provider: "twilio",
          to: toFormatted,
          from: this.fromNumber,
          sentAt: new Date().toISOString(),
          directWhatsAppUrl: directUrl,
        };
      }

      const data = (await res.json()) as any;
      return {
        messageSid: data.sid || `SM_${Date.now()}`,
        status: data.status || "queued",
        isMock: false,
        provider: "twilio",
        to: toFormatted,
        from: this.fromNumber,
        sentAt: new Date().toISOString(),
        directWhatsAppUrl: directUrl,
      };
    } catch (err: any) {
      console.warn(`[TwilioWhatsApp] Request failed: ${err.message}`);
      return {
        messageSid: `SM_network_err_${Date.now()}`,
        status: "failed",
        isMock: false,
        provider: "twilio",
        to: toFormatted,
        from: this.fromNumber,
        sentAt: new Date().toISOString(),
        directWhatsAppUrl: directUrl,
      };
    }
  }
}
