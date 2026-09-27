import { type ArrayChange, diffArrays } from "diff";
import type { SourceBlock } from "../markdown/types";
import { itemAt } from "../support/item-at";
import { blockSimilarity } from "./similarity";

/** A block of one version lined up with its counterpart in the other, if it has one. */
export type AlignedRow =
  | {
      readonly kind: "unchanged" | "modified";
      readonly base: SourceBlock;
      readonly head: SourceBlock;
    }
  | { readonly kind: "removed"; readonly base: SourceBlock; readonly head: null }
  | { readonly kind: "added"; readonly base: null; readonly head: SourceBlock };

export type RowKind = AlignedRow["kind"];

/** Minimum similarity for a removed and an added block to be shown as one edited block. */
const PAIRING_THRESHOLD = 0.5;

interface Pair {
  readonly baseIndex: number;
  readonly headIndex: number;
}

function blockKey(block: SourceBlock): string {
  const normalized = block.source
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n");
  return `${block.kind}\u0000${normalized}`;
}

/**
 * Best total similarity of order-preserving pairings (a weighted LCS): cell [i][j] covers
 * the first i removed and first j added blocks. The table is filled in place, but only
 * here; callers get it read-only.
 */
function buildScoreTable(
  removed: readonly SourceBlock[],
  added: readonly SourceBlock[],
): readonly (readonly number[])[] {
  const table: number[][] = [new Array<number>(added.length + 1).fill(0)];
  for (const removedBlock of removed) {
    const above = itemAt(table, table.length - 1);
    const row = [0];
    added.forEach((addedBlock, j) => {
      const similarity = blockSimilarity(removedBlock, addedBlock);
      const diagonal = similarity >= PAIRING_THRESHOLD ? itemAt(above, j) + similarity : -Infinity;
      row.push(Math.max(itemAt(above, j + 1), itemAt(row, j), diagonal));
    });
    table.push(row);
  }
  return table;
}

/** Order-preserving pairing that maximises total similarity, read back from the table. */
function pairChangedBlocks(removed: readonly SourceBlock[], added: readonly SourceBlock[]): Pair[] {
  const scores = buildScoreTable(removed, added);
  const score = (i: number, j: number) => itemAt(itemAt(scores, i), j);
  const reversed: Pair[] = [];
  let i = removed.length;
  let j = added.length;
  while (i > 0 && j > 0) {
    if (score(i, j) === score(i - 1, j)) {
      i -= 1;
    } else if (score(i, j) === score(i, j - 1)) {
      j -= 1;
    } else {
      reversed.push({ baseIndex: i - 1, headIndex: j - 1 });
      i -= 1;
      j -= 1;
    }
  }
  return reversed.reverse();
}

function removedRow(base: SourceBlock): AlignedRow {
  return { kind: "removed", base, head: null };
}

function addedRow(head: SourceBlock): AlignedRow {
  return { kind: "added", base: null, head };
}

/** Blocks between two anchors: paired ones as modified, the rest as removed or added. */
function alignChangedRegion(
  removed: readonly SourceBlock[],
  added: readonly SourceBlock[],
): AlignedRow[] {
  const pairs = pairChangedBlocks(removed, added);
  const end: Pair = { baseIndex: removed.length, headIndex: added.length };
  return [...pairs, end].flatMap((pair, k) => {
    const previous = k > 0 ? itemAt(pairs, k - 1) : null;
    const fromBase = previous ? previous.baseIndex + 1 : 0;
    const fromHead = previous ? previous.headIndex + 1 : 0;
    const modified: AlignedRow[] =
      pair === end
        ? []
        : [
            {
              kind: "modified",
              base: itemAt(removed, pair.baseIndex),
              head: itemAt(added, pair.headIndex),
            },
          ];
    return [
      ...removed.slice(fromBase, pair.baseIndex).map(removedRow),
      ...added.slice(fromHead, pair.headIndex).map(addedRow),
      ...modified,
    ];
  });
}

interface AlignState {
  readonly baseIndex: number;
  readonly headIndex: number;
  /** Changed blocks since the last identical one, aligned once the region ends. */
  readonly removed: readonly SourceBlock[];
  readonly added: readonly SourceBlock[];
  readonly rows: readonly AlignedRow[];
}

function step(
  base: readonly SourceBlock[],
  head: readonly SourceBlock[],
): (state: AlignState, change: ArrayChange<string>) => AlignState {
  return (state, change) => {
    const count = change.value.length;
    if (change.removed) {
      const blocks = base.slice(state.baseIndex, state.baseIndex + count);
      return {
        ...state,
        baseIndex: state.baseIndex + count,
        removed: [...state.removed, ...blocks],
      };
    }
    if (change.added) {
      const blocks = head.slice(state.headIndex, state.headIndex + count);
      return { ...state, headIndex: state.headIndex + count, added: [...state.added, ...blocks] };
    }
    const unchanged = base.slice(state.baseIndex, state.baseIndex + count).map(
      (block, k): AlignedRow => ({
        kind: "unchanged",
        base: block,
        head: itemAt(head, state.headIndex + k),
      }),
    );
    return {
      baseIndex: state.baseIndex + count,
      headIndex: state.headIndex + count,
      removed: [],
      added: [],
      rows: [...state.rows, ...alignChangedRegion(state.removed, state.added), ...unchanged],
    };
  };
}

/**
 * Lines up the blocks of two versions of a document. Identical blocks anchor the
 * alignment; blocks between anchors are paired by similarity or left unmatched.
 */
export function alignBlocks(
  base: readonly SourceBlock[],
  head: readonly SourceBlock[],
): AlignedRow[] {
  const changes = diffArrays(base.map(blockKey), head.map(blockKey));
  const initial: AlignState = { baseIndex: 0, headIndex: 0, removed: [], added: [], rows: [] };
  const last = changes.reduce(step(base, head), initial);
  return [...last.rows, ...alignChangedRegion(last.removed, last.added)];
}
