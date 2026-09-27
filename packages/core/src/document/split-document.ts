import { type AlignedRow, alignBlocks, type RowKind } from "../diff/align";
import { diffBlockHtml } from "../diff/inline-diff";
import { parseBlocks } from "../markdown/blocks";
import type { SourceBlock } from "../markdown/types";
import type { ReviewThread, Side } from "../review/types";

export interface SplitCell {
  readonly block: SourceBlock;
  /** Rendered block, with `<ins>` / `<del>` highlights when the row is modified. */
  readonly html: string;
}

export interface SplitRow {
  readonly kind: RowKind;
  readonly left: SplitCell | null;
  readonly right: SplitCell | null;
}

export interface RowThreads {
  readonly left: readonly ReviewThread[];
  readonly right: readonly ReviewThread[];
}

function toSplitRow(row: AlignedRow): SplitRow {
  const { base, head } = row;
  if (row.kind === "modified" && base && head) {
    const highlighted = diffBlockHtml(base.html, head.html);
    return {
      kind: row.kind,
      left: { block: base, html: highlighted.base },
      right: { block: head, html: highlighted.head },
    };
  }
  return {
    kind: row.kind,
    left: base ? { block: base, html: base.html } : null,
    right: head ? { block: head, html: head.html } : null,
  };
}

/** Renders two versions of a Markdown document as aligned left (base) / right (head) rows. */
export function buildSplitRows(baseSource: string, headSource: string): SplitRow[] {
  return alignBlocks(parseBlocks(baseSource), parseBlocks(headSource)).map(toSplitRow);
}

function cellOn(row: SplitRow, side: Side): SplitCell | null {
  return side === "LEFT" ? row.left : row.right;
}

/** Row whose block on `side` contains `line`, else the closest row above it, else the first row. */
function findAnchorRow(rows: readonly SplitRow[], side: Side, line: number): number {
  let anchor = -1;
  rows.forEach((row, index) => {
    const cell = cellOn(row, side);
    if (cell && cell.block.lines.start <= line) anchor = index;
  });
  if (anchor >= 0) return anchor;
  return rows.findIndex((row) => cellOn(row, side) !== null);
}

/** Groups review threads by the row (and side) they should be displayed next to. */
export function groupThreadsByRow(
  rows: readonly SplitRow[],
  threads: readonly ReviewThread[],
): RowThreads[] {
  const anchors = threads.map((thread) => ({
    thread,
    rowIndex: findAnchorRow(rows, thread.side, thread.startLine ?? thread.line),
  }));
  return rows.map((_, index) => {
    const here = anchors
      .filter((anchor) => anchor.rowIndex === index)
      .map((anchor) => anchor.thread);
    return {
      left: here.filter((thread) => thread.side === "LEFT"),
      right: here.filter((thread) => thread.side === "RIGHT"),
    };
  });
}
