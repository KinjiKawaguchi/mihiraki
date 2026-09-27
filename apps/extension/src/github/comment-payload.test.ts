import { commitId } from "@mihiraki/core";
import { describe, expect, it } from "vitest";
import { buildCreateCommentPayload } from "./comment-payload";

const BASE = "b".repeat(40);
const HEAD = "c".repeat(40);
const revision = { base: commitId(BASE), head: commitId(HEAD) };

describe("buildCreateCommentPayload", () => {
  it("builds a single-line comment on the head side", () => {
    const payload = buildCreateCommentPayload(
      { path: "a.md", side: "head", lines: { start: 9, end: 9 }, revision },
      "hi",
      "single",
    );

    expect(payload).toEqual({
      comparisonStartOid: BASE,
      comparisonEndOid: HEAD,
      path: "a.md",
      line: 9,
      side: "right",
      subjectType: "line",
      submitBatch: true,
      text: "hi",
      positioning: {
        type: "line",
        baseCommitOid: BASE,
        commitOid: HEAD,
        headCommitOid: HEAD,
        line: 9,
        path: "a.md",
      },
    });
  });

  it("anchors a base-side comment to the base commit", () => {
    const payload = buildCreateCommentPayload(
      { path: "a.md", side: "base", lines: { start: 4, end: 4 }, revision },
      "hi",
      "single",
    );

    expect(payload).toMatchObject({
      side: "left",
      line: 4,
      positioning: { commitOid: BASE, line: 4 },
    });
  });

  it("builds a multi-line comment with start and end positions", () => {
    const payload = buildCreateCommentPayload(
      { path: "a.md", side: "head", lines: { start: 57, end: 68 }, revision },
      "hi",
      "single",
    );

    expect(payload).toEqual({
      comparisonStartOid: BASE,
      comparisonEndOid: HEAD,
      path: "a.md",
      line: 68,
      side: "right",
      startLine: 57,
      startSide: "right",
      subjectType: "multiline",
      submitBatch: true,
      text: "hi",
      positioning: {
        type: "multiline",
        baseCommitOid: BASE,
        headCommitOid: HEAD,
        startPath: "a.md",
        startLine: 57,
        startCommitOid: HEAD,
        endPath: "a.md",
        endLine: 68,
        endCommitOid: HEAD,
      },
    });
  });

  it("adds the comment to the pending review instead of publishing it", () => {
    const payload = buildCreateCommentPayload(
      { path: "a.md", side: "head", lines: { start: 9, end: 9 }, revision },
      "hi",
      "review",
    );

    // Captured from GitHub's "Start a review" button: the only difference from "Comment".
    expect(payload).toMatchObject({ submitBatch: false });
  });
});
