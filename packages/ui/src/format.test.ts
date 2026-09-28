import { describe, expect, it } from "vitest";
import { formatLineRange, formatRelativeTime } from "./format";

describe("formatLineRange", () => {
  it("prefixes lines with R for the head side and L for the base side, like GitHub", () => {
    expect(formatLineRange("head", { start: 194, end: 194 })).toBe("R194");
    expect(formatLineRange("base", { start: 4, end: 4 })).toBe("L4");
  });

  it("shows a range with both ends", () => {
    expect(formatLineRange("head", { start: 191, end: 193 })).toBe("R191〜R193");
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-09-28T12:00:00Z");
  const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000).toISOString();

  it("says how long ago, in the largest whole unit", () => {
    expect(formatRelativeTime(ago(180), now, "en")).toBe("3 minutes ago");
    expect(formatRelativeTime(ago(2 * 3600), now, "en")).toBe("2 hours ago");
    expect(formatRelativeTime(ago(3 * 86400), now, "en")).toBe("3 days ago");
  });

  it("speaks the given language", () => {
    expect(formatRelativeTime(ago(180), now, "ja")).toBe("3 分前");
  });

  it("calls the last minute now", () => {
    expect(formatRelativeTime(ago(20), now, "en")).toBe("now");
  });

  it("says nothing for a time it cannot read", () => {
    expect(formatRelativeTime("", now, "en")).toBe("");
  });
});
