import { type AlignedRow, alignBlocks } from "../diff/align";
import { diffBlockHtml } from "../diff/inline-diff";
import { parseBlocks } from "../markdown/blocks";
import type { SourceBlock } from "../markdown/types";
import type { ReviewThread, Side } from "../review/types";

export interface SplitCell {
  readonly block: SourceBlock;
  /** Rendered block, with `<ins>` / `<del>` highlights when the row is modified. */
  readonly html: string;
}

/** One aligned row, shown with base on the left and head on the right. */
export type SplitRow =
  | {
      readonly kind: "unchanged" | "modified";
      readonly base: SplitCell;
      readonly head: SplitCell;
    }
  | { readonly kind: "removed"; readonly base: SplitCell; readonly head: null }
  | { readonly kind: "added"; readonly base: null; readonly head: SplitCell };

export type RowThreads = Readonly<Record<Side, readonly ReviewThread[]>>;

export interface ThreadPlacement {
  /** Threads to show next to each row, index for index with the rows. */
  readonly byRow: readonly RowThreads[];
  /** Threads whose side has no block at all to show them by, e.g. the base of an added file. */
  readonly unplaced: readonly ReviewThread[];
}

function plainCell(block: SourceBlock): SplitCell {
  return { block, html: block.html };
}

/** Diagrams are compared whole: highlights inside their code would break the drawing. */
export function isComparedWhole(row: { readonly base: SourceBlock; readonly head: SourceBlock }) {
  return row.base.kind === "diagram" || row.head.kind === "diagram";
}

function toSplitRow(row: AlignedRow): SplitRow {
  switch (row.kind) {
    case "modified": {
      if (isComparedWhole(row))
        return { kind: row.kind, base: plainCell(row.base), head: plainCell(row.head) };
      const highlighted = diffBlockHtml(row.base.html, row.head.html);
      return {
        kind: row.kind,
        base: { block: row.base, html: highlighted.base },
        head: { block: row.head, html: highlighted.head },
      };
    }
    case "unchanged":
      return { kind: row.kind, base: plainCell(row.base), head: plainCell(row.head) };
    case "removed":
      return { kind: row.kind, base: plainCell(row.base), head: null };
    case "added":
      return { kind: row.kind, base: null, head: plainCell(row.head) };
  }
}

/**
 * Renders two versions of a Markdown document as aligned base / head rows. A version
 * that does not exist (`null`) has no blocks.
 */
export function buildSplitRows(baseSource: string | null, headSource: string | null): SplitRow[] {
  const blocksOf = (source: string | null) => (source === null ? [] : parseBlocks(source));
  return alignBlocks(blocksOf(baseSource), blocksOf(headSource)).map(toSplitRow);
}

/** Row whose block on `side` contains `line`, else the closest row above it, else the first row. */
function findAnchorRow(rows: readonly SplitRow[], side: Side, line: number): number | null {
  const lastAbove = rows.reduce<number | null>((found, row, index) => {
    const cell = row[side];
    return cell !== null && cell.block.lines.start <= line ? index : found;
  }, null);
  if (lastAbove !== null) return lastAbove;
  const first = rows.findIndex((row) => row[side] !== null);
  return first >= 0 ? first : null;
}

/** Decides which row (and side) each review thread is displayed next to. */
export function placeThreads(
  rows: readonly SplitRow[],
  threads: readonly ReviewThread[],
): ThreadPlacement {
  const anchors = threads.map((thread) => ({
    thread,
    rowIndex: findAnchorRow(rows, thread.side, thread.lines.start),
  }));
  const byRow = rows.map((_, index) => {
    const here = anchors
      .filter((anchor) => anchor.rowIndex === index)
      .map((anchor) => anchor.thread);
    return {
      base: here.filter((thread) => thread.side === "base"),
      head: here.filter((thread) => thread.side === "head"),
    };
  });
  const unplaced = anchors.filter((anchor) => anchor.rowIndex === null).map((a) => a.thread);
  return { byRow, unplaced };
}
