import type { CommentMode, CommentTarget, Side } from "@mihiraki/core";

const PAYLOAD_SIDE: Readonly<Record<Side, "left" | "right">> = { base: "left", head: "right" };

/**
 * Body for `POST /pull/:n/page_data/create_review_comment`, mirroring what GitHub's
 * own source-diff UI sends, for the revision the lines were selected in. Base-side
 * comments are anchored to the base commit.
 * `submitBatch` is true for "Comment" and false for "Start a review" / "Add review comment".
 */
export function buildCreateCommentPayload(target: CommentTarget, body: string, mode: CommentMode) {
  const { base: baseOid, head: headOid } = target.revision;
  const side = PAYLOAD_SIDE[target.side];
  const sideOid = target.revision[target.side];
  const { start, end } = target.lines;
  const common = {
    comparisonStartOid: baseOid,
    comparisonEndOid: headOid,
    path: target.path,
    line: end,
    side,
    submitBatch: mode === "single",
    text: body,
  };
  if (start === end) {
    return {
      ...common,
      subjectType: "line",
      positioning: {
        type: "line",
        baseCommitOid: baseOid,
        commitOid: sideOid,
        headCommitOid: headOid,
        line: end,
        path: target.path,
      },
    };
  }
  return {
    ...common,
    startLine: start,
    startSide: side,
    subjectType: "multiline",
    positioning: {
      type: "multiline",
      baseCommitOid: baseOid,
      headCommitOid: headOid,
      startPath: target.path,
      startLine: start,
      startCommitOid: sideOid,
      endPath: target.path,
      endLine: end,
      endCommitOid: sideOid,
    },
  };
}
