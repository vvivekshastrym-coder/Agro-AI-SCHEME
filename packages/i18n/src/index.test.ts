import { describe, it, expect } from "vitest";
import { getTranslations, enMessages, knMessages } from "./index.js";

describe("@agro/i18n translations completeness", () => {
  it("provides matching top-level and nested keys for English and Kannada", () => {
    expect(Object.keys(knMessages)).toEqual(Object.keys(enMessages));
    for (const section of Object.keys(enMessages) as Array<
      keyof typeof enMessages
    >) {
      expect(Object.keys(knMessages[section])).toEqual(
        Object.keys(enMessages[section])
      );
    }
  });

  it("returns Kannada dictionary for 'kn' and includes native Kannada script", () => {
    const t = getTranslations("kn");
    expect(t.profile.passportTitle).toContain("ರೈತ");
    expect(t.common.deadlineNotVerified).toContain(
      "ಪರಿಶೀಲಿಸಲಾಗಿಲ್ಲ"
    );
  });
});
