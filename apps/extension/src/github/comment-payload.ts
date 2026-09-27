import type { CommentTarget } from '@better-gh-md/core';

export interface ComparedCommits {
  readonly baseOid: string;
  readonly headOid: string;
}

/**
 * Body for `POST /pull/:n/page_data/create_review_comment`, mirroring what GitHub's
 * own source-diff UI sends. Base-side comments are anchored to the base commit.
 */
export function buildCreateCommentPayload(target: CommentTarget, body: string, commits: ComparedCommits) {
  const { baseOid, headOid } = commits;
  const side = target.side === 'LEFT' ? 'left' : 'right';
  const sideOid = target.side === 'LEFT' ? baseOid : headOid;
  const common = {
    comparisonStartOid: baseOid,
    comparisonEndOid: headOid,
    path: target.path,
    line: target.line,
    side,
    submitBatch: true,
    text: body,
  };
  if (target.startLine === null) {
    return {
      ...common,
      subjectType: 'line',
      positioning: { type: 'line', baseCommitOid: baseOid, commitOid: sideOid, headCommitOid: headOid, line: target.line, path: target.path },
    };
  }
  return {
    ...common,
    startLine: target.startLine,
    startSide: side,
    subjectType: 'multiline',
    positioning: {
      type: 'multiline',
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
