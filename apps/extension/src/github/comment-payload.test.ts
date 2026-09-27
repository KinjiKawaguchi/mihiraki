import { describe, expect, it } from 'vitest';
import { buildCreateCommentPayload } from './comment-payload';

const oids = { baseOid: 'base', headOid: 'head' };

describe('buildCreateCommentPayload', () => {
  it('builds a single-line comment on the head side', () => {
    const payload = buildCreateCommentPayload({ path: 'a.md', side: 'RIGHT', line: 9, startLine: null }, 'hi', oids);

    expect(payload).toEqual({
      comparisonStartOid: 'base',
      comparisonEndOid: 'head',
      path: 'a.md',
      line: 9,
      side: 'right',
      subjectType: 'line',
      submitBatch: true,
      text: 'hi',
      positioning: { type: 'line', baseCommitOid: 'base', commitOid: 'head', headCommitOid: 'head', line: 9, path: 'a.md' },
    });
  });

  it('anchors a base-side comment to the base commit', () => {
    const payload = buildCreateCommentPayload({ path: 'a.md', side: 'LEFT', line: 4, startLine: null }, 'hi', oids);

    expect(payload).toMatchObject({ side: 'left', line: 4, positioning: { commitOid: 'base', line: 4 } });
  });

  it('builds a multi-line comment with start and end positions', () => {
    const payload = buildCreateCommentPayload({ path: 'a.md', side: 'RIGHT', line: 68, startLine: 57 }, 'hi', oids);

    expect(payload).toEqual({
      comparisonStartOid: 'base',
      comparisonEndOid: 'head',
      path: 'a.md',
      line: 68,
      side: 'right',
      startLine: 57,
      startSide: 'right',
      subjectType: 'multiline',
      submitBatch: true,
      text: 'hi',
      positioning: {
        type: 'multiline',
        baseCommitOid: 'base',
        headCommitOid: 'head',
        startPath: 'a.md',
        startLine: 57,
        startCommitOid: 'head',
        endPath: 'a.md',
        endLine: 68,
        endCommitOid: 'head',
      },
    });
  });
});
