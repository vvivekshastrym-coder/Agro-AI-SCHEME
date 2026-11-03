# Agro AI Scheme — Provider Integrations & Truth Labels

All external providers sit behind explicit TypeScript interfaces in [adapters.ts](file:///c:/Users/vivek/Downloads/New%20folder/apps/api/src/adapters.ts). Until live credentials are configured, every adapter sets `isMock: true` and renders a visible **DEMO / MOCK** badge in the UI.

| Adapter Interface | Local Implementation | Truth Label / Behaviour |
|---|---|---|
| `SmsProvider` | `MockSmsProvider` | `isMock: true`, `sourceProvider: "mock-sms-console"` |
| `EmailProvider` | `MockEmailProvider` | `isMock: true`, `sourceProvider: "mock-mailpit"` |
| `LlmProvider` | `CachedMockLlmProvider` | `isMock: true`, caches per `(schemeVersionId, status, language)`, strictly bound to deterministic `@agro/rules-engine` output |
| `SttProvider` | `MockBhashiniSttProvider` | `isMock: true`, `requiresFarmerConfirmation: true` |
