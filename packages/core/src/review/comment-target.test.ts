import { describe, expect, it } from "vitest";
import { toCommentTarget } from "./comment-target";

const revision = { base: "b1", head: "h1" };

describe("toCommentTarget", () => {
  it("uses a single-line target for a one-line selection", () => {
    expect(toCommentTarget("a.md", "RIGHT", { start: 9, end: 9 }, revision)).toEqual({
      path: "a.md",
      side: "RIGHT",
      line: 9,
      startLine: null,
      revision,
    });
  });

  it("keeps the selected range as is, even outside the changed hunks", () => {
    // GitHub accepts comments on any line of a changed file (verified on github.com, 2026-09).
    expect(toCommentTarget("a.md", "LEFT", { start: 50, end: 59 }, revision)).toEqual({
      path: "a.md",
      side: "LEFT",
      line: 59,
      startLine: 50,
      revision,
    });
  });
});
