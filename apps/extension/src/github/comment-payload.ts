import type { CommentMode, CommentTarget } from "@mihiraki/core";

/**
 * Body for `POST /pull/:n/page_data/create_review_comment`, mirroring what GitHub's
 * own source-diff UI sends, for the revision the lines were selected in. Base-side
 * comments are anchored to the base commit.
 * `submitBatch` is true for "Comment" and false for "Start a review" / "Add review comment".
 */
export function buildCreateCommentPayload(target: CommentTarget, body: string, mode: CommentMode) {
  const { base: baseOid, head: headOid } = target.revision;
  const side = target.side === "LEFT" ? "left" : "right";
  const sideOid = target.side === "LEFT" ? baseOid : headOid;
  const common = {
    comparisonStartOid: baseOid,
    comparisonEndOid: headOid,
    path: target.path,
    line: target.line,
    side,
    submitBatch: mode === "single",
    text: body,
  };
  if (target.startLine === null) {
    return {
      ...common,
      subjectType: "line",
      positioning: {
        type: "line",
        baseCommitOid: baseOid,
        commitOid: sideOid,
        headCommitOid: headOid,
        line: target.line,
        path: target.path,
      },
    };
  }
  return {
    ...common,
    startLine: target.startLine,
    startSide: side,
    subjectType: "multiline",
    positioning: {
      type: "multiline",
      baseCommitOid: baseOid,
      headCommitOid: headOid,
      startPath: target.path,
      startLine: target.startLine,
      startCommitOid: sideOid,
      endPath: target.path,
      endLine: target.line,
      endCommitOid: sideOid,
    },
  };
}
