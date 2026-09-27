import { describe, expect, it } from "vitest";
import { commitId } from "./commit-id";
import { isSameRevision } from "./revision";

const b = commitId("b1b1b1b");
const b2 = commitId("b2b2b2b");
const h = commitId("c1c1c1c");
const h2 = commitId("c2c2c2c");

describe("isSameRevision", () => {
  it("compares both commits", () => {
    expect(isSameRevision({ base: b, head: h }, { base: b, head: h })).toBe(true);
    expect(isSameRevision({ base: b, head: h }, { base: b, head: h2 })).toBe(false);
    expect(isSameRevision({ base: b, head: h }, { base: b2, head: h })).toBe(false);
  });
});
