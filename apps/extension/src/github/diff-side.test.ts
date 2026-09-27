import { describe, expect, it } from "vitest";
import { formatLineKey, parseLineKey } from "./diff-side";

describe("GitHub line keys", () => {
  it("reads L as the base side and R as the head side", () => {
    expect(parseLineKey("L5")).toEqual({ side: "base", line: 5 });
    expect(parseLineKey("R20")).toEqual({ side: "head", line: 20 });
  });

  it("rejects anything else", () => {
    expect(parseLineKey("X5")).toBeNull();
    expect(parseLineKey("R")).toBeNull();
    expect(parseLineKey(null)).toBeNull();
  });

  it("writes keys back in the same notation", () => {
    expect(formatLineKey({ side: "base", line: 5 })).toBe("L5");
    expect(formatLineKey({ side: "head", line: 20 })).toBe("R20");
  });
});
