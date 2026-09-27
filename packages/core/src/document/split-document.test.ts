import { describe, expect, it } from 'vitest';
import type { ReviewThread } from '../review/types';
import { buildSplitRows, groupThreadsByRow } from './split-document';

function thread(side: 'LEFT' | 'RIGHT', line: number, startLine: number | null = null): ReviewThread {
  return {
    id: `${side}${line}`,
    path: 'doc.md',
    side,
    line,
    startLine,
    isResolved: false,
    isOutdated: false,
    comments: [],
  };
}

describe('buildSplitRows', () => {
  it('shows unchanged blocks on both sides with their own rendering', () => {
    const [row] = buildSplitRows('same\n', 'same\n');

    expect(row?.kind).toBe('unchanged');
    expect(row?.left?.html).toContain('same');
    expect(row?.right?.html).toContain('same');
  });

  it('leaves the missing side empty for added and removed blocks', () => {
    const rows = buildSplitRows('# T\n\nold only\n', '# T\n\nnew only here\n\nand more\n');

    expect(rows.map((row) => [row.kind, row.left !== null, row.right !== null])).toEqual([
      ['unchanged', true, true],
      ['removed', true, false],
      ['added', false, true],
      ['added', false, true],
    ]);
  });

  it('highlights word changes inside modified blocks', () => {
    const [row] = buildSplitRows('ten minutes timeout\n', 'five minutes timeout\n');

    expect(row?.kind).toBe('modified');
    expect(row?.left?.html).toContain('<del class="bgm-del">ten</del>');
    expect(row?.right?.html).toContain('<ins class="bgm-ins">five</ins>');
  });
});

describe('groupThreadsByRow', () => {
  const base = '# Title\n\nold paragraph text here\n\nshared tail\n';
  const head = '# Title\n\nnew paragraph text here\nsecond line\n\nshared tail\n';
  const rows = buildSplitRows(base, head);

  it('attaches a right-side thread to the head block containing its line', () => {
    const grouped = groupThreadsByRow(rows, [thread('RIGHT', 4)]);

    expect(grouped[1]?.right.map((t) => t.id)).toEqual(['RIGHT4']);
    expect(grouped[1]?.left).toEqual([]);
  });

  it('attaches a left-side thread using base line numbers', () => {
    const grouped = groupThreadsByRow(rows, [thread('LEFT', 5)]);

    expect(grouped[2]?.left.map((t) => t.id)).toEqual(['LEFT5']);
  });

  it('anchors a multi-line thread at its first line', () => {
    const grouped = groupThreadsByRow(rows, [thread('RIGHT', 6, 1)]);

    expect(grouped[0]?.right.map((t) => t.id)).toEqual(['RIGHT6']);
  });

  it('attaches a thread on a blank line to the preceding block', () => {
    const grouped = groupThreadsByRow(rows, [thread('RIGHT', 5)]);

    expect(grouped[1]?.right.map((t) => t.id)).toEqual(['RIGHT5']);
  });

  it('returns one empty group per row when there are no threads', () => {
    expect(groupThreadsByRow(rows, [])).toEqual(rows.map(() => ({ left: [], right: [] })));
  });
});
