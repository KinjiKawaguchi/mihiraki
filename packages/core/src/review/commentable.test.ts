import { describe, expect, it } from 'vitest';
import { computeCommentableLines, resolveCommentTarget } from './commentable';

function lines(count: number, change?: { at: number; text: string }) {
  return Array.from({ length: count }, (_, i) => (change && change.at === i + 1 ? change.text : `line ${i + 1}`)).join('\n');
}

describe('computeCommentableLines', () => {
  it('is empty for identical files', () => {
    const text = lines(20);

    expect(computeCommentableLines(text, text)).toEqual({ LEFT: [], RIGHT: [] });
  });

  it('covers the changed line plus three lines of context on each side', () => {
    const result = computeCommentableLines(lines(20), lines(20, { at: 10, text: 'changed' }));

    expect(result).toEqual({ LEFT: [{ start: 7, end: 13 }], RIGHT: [{ start: 7, end: 13 }] });
  });

  it('makes every line of a new file commentable on the right only', () => {
    expect(computeCommentableLines('', 'a\nb\nc\n')).toEqual({ LEFT: [], RIGHT: [{ start: 1, end: 3 }] });
  });
});

describe('resolveCommentTarget', () => {
  const commentable = { LEFT: [], RIGHT: [{ start: 7, end: 13 }] };

  it('targets the whole block when it lies inside the diff', () => {
    const result = resolveCommentTarget('a.md', 'RIGHT', { start: 8, end: 10 }, commentable);

    expect(result).toEqual({ target: { path: 'a.md', side: 'RIGHT', line: 10, startLine: 8 }, isInsideDiff: true });
  });

  it('uses a single-line target for a one-line block', () => {
    const result = resolveCommentTarget('a.md', 'RIGHT', { start: 9, end: 9 }, commentable);

    expect(result.target).toEqual({ path: 'a.md', side: 'RIGHT', line: 9, startLine: null });
  });

  it('clamps a block that only partly overlaps the diff to the overlapping lines', () => {
    const result = resolveCommentTarget('a.md', 'RIGHT', { start: 3, end: 8 }, commentable);

    expect(result).toEqual({ target: { path: 'a.md', side: 'RIGHT', line: 8, startLine: 7 }, isInsideDiff: true });
  });

  it('flags a block outside the diff while still targeting its lines', () => {
    const result = resolveCommentTarget('a.md', 'LEFT', { start: 20, end: 22 }, commentable);

    expect(result).toEqual({ target: { path: 'a.md', side: 'LEFT', line: 22, startLine: 20 }, isInsideDiff: false });
  });
});
