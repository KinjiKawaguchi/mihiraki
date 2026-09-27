import { structuredPatch } from 'diff';
import type { LineRange } from '../markdown/types';
import type { CommentableLines, CommentTarget, Side } from './types';

/** GitHub renders (and accepts comments on) three lines of context around each change. */
const DIFF_CONTEXT_LINES = 3;

function rangeOf(start: number, count: number): LineRange[] {
  return count > 0 ? [{ start, end: start + count - 1 }] : [];
}

/**
 * Lines GitHub is expected to accept review comments on: the hunks of the unified
 * diff between the two versions. Computed locally, so it can differ from GitHub's
 * own diff at the edges of a hunk.
 */
export function computeCommentableLines(baseSource: string, headSource: string): CommentableLines {
  const patch = structuredPatch('base', 'head', baseSource, headSource, '', '', { context: DIFF_CONTEXT_LINES });
  return {
    LEFT: patch.hunks.flatMap((hunk) => rangeOf(hunk.oldStart, hunk.oldLines)),
    RIGHT: patch.hunks.flatMap((hunk) => rangeOf(hunk.newStart, hunk.newLines)),
  };
}

function intersect(a: LineRange, b: LineRange): LineRange | null {
  const start = Math.max(a.start, b.start);
  const end = Math.min(a.end, b.end);
  return start <= end ? { start, end } : null;
}

function toTarget(path: string, side: Side, lines: LineRange): CommentTarget {
  return { path, side, line: lines.end, startLine: lines.start === lines.end ? null : lines.start };
}

export interface ResolvedCommentTarget {
  readonly target: CommentTarget;
  /** False when GitHub will probably reject the comment because the lines are outside every hunk. */
  readonly isInsideDiff: boolean;
}

/** Chooses which source lines a comment on a rendered block should be attached to. */
export function resolveCommentTarget(
  path: string,
  side: Side,
  blockLines: LineRange,
  commentable: CommentableLines,
): ResolvedCommentTarget {
  const overlap = commentable[side]
    .map((range) => intersect(range, blockLines))
    .find((range): range is LineRange => range !== null);
  return overlap
    ? { target: toTarget(path, side, overlap), isInsideDiff: true }
    : { target: toTarget(path, side, blockLines), isInsideDiff: false };
}
