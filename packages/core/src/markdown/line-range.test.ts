import { describe, expect, it } from "vitest";
import { parseLineRange } from "./line-range";

describe("parseLineRange", () => {
  it("accepts a range of positive line numbers in order", () => {
    expect(parseLineRange(3, 3)).toEqual({ start: 3, end: 3 });
    expect(parseLineRange(1, 12)).toEqual({ start: 1, end: 12 });
  });

  it("rejects ranges that do not describe lines of a file", () => {
    expect(parseLineRange(0, 2)).toBeNull();
    expect(parseLineRange(5, 4)).toBeNull();
    expect(parseLineRange(1.5, 2)).toBeNull();
    expect(parseLineRange("1", 2)).toBeNull();
    expect(parseLineRange(1, null)).toBeNull();
    expect(parseLineRange(Number.NaN, 2)).toBeNull();
  });
});
