import { describe, expect, it } from "vitest";
import { commitId, parseCommitId } from "./commit-id";

describe("parseCommitId", () => {
  it("accepts full and abbreviated hexadecimal commit hashes", () => {
    expect(parseCommitId("a".repeat(40))).toBe("a".repeat(40));
    expect(parseCommitId("0123abc")).toBe("0123abc");
    expect(parseCommitId("f".repeat(64))).toBe("f".repeat(64));
  });

  it("rejects values that cannot be a commit hash, such as a file path", () => {
    expect(parseCommitId("docs/a.md")).toBeNull();
    expect(parseCommitId("")).toBeNull();
    expect(parseCommitId("abc")).toBeNull();
    expect(parseCommitId("A".repeat(40))).toBeNull();
    expect(parseCommitId(40)).toBeNull();
  });
});

describe("commitId", () => {
  it("throws for a value known to be valid that is not", () => {
    expect(() => commitId("main")).toThrow(/main/);
  });
});
