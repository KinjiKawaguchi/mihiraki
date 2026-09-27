import { describe, expect, it } from "vitest";
import { resolveLocale } from "./locale";

describe("resolveLocale", () => {
  it("takes the first preferred language it supports", () => {
    expect(resolveLocale(["ja-JP", "en-US"])).toBe("ja");
    expect(resolveLocale(["fr-FR", "ja"])).toBe("ja");
    expect(resolveLocale(["en-GB", "ja"])).toBe("en");
  });

  it("falls back to English when none is supported", () => {
    expect(resolveLocale(["fr-FR"])).toBe("en");
    expect(resolveLocale([])).toBe("en");
  });
});
