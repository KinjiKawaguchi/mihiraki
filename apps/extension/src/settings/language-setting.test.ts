import { describe, expect, it } from "vitest";
import { localeOf, parseLanguageSetting } from "./language-setting";

describe("language setting", () => {
  it("reads the stored choice", () => {
    expect(parseLanguageSetting("ja")).toBe("ja");
    expect(parseLanguageSetting("en")).toBe("en");
    expect(parseLanguageSetting("auto")).toBe("auto");
  });

  it("follows the browser when nothing or something unknown is stored", () => {
    expect(parseLanguageSetting(undefined)).toBe("auto");
    expect(parseLanguageSetting("fr")).toBe("auto");
    expect(parseLanguageSetting(1)).toBe("auto");
  });

  it("uses the chosen language, or the browser's when following it", () => {
    expect(localeOf("ja", ["en-US"])).toBe("ja");
    expect(localeOf("en", ["ja"])).toBe("en");
    expect(localeOf("auto", ["fr-FR", "ja"])).toBe("ja");
    expect(localeOf("auto", ["fr-FR"])).toBe("en");
  });
});
