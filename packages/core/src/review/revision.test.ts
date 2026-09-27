import { describe, expect, it } from "vitest";
import { isSameRevision } from "./revision";

describe("isSameRevision", () => {
  it("compares both commits", () => {
    expect(isSameRevision({ base: "b", head: "h" }, { base: "b", head: "h" })).toBe(true);
    expect(isSameRevision({ base: "b", head: "h" }, { base: "b", head: "h2" })).toBe(false);
    expect(isSameRevision({ base: "b", head: "h" }, { base: "b2", head: "h" })).toBe(false);
  });
});
