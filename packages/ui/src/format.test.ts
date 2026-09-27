import { describe, expect, it } from "vitest";
import { formatLineRange } from "./format";

describe("formatLineRange", () => {
  it("prefixes lines with R for the head side and L for the base side, like GitHub", () => {
    expect(formatLineRange("head", { start: 194, end: 194 })).toBe("R194");
    expect(formatLineRange("base", { start: 4, end: 4 })).toBe("L4");
  });

  it("shows a range with both ends", () => {
    expect(formatLineRange("head", { start: 191, end: 193 })).toBe("R191〜R193");
  });
});
