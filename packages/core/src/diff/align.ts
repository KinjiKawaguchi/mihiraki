import { diffArrays } from 'diff';
import type { SourceBlock } from '../markdown/types';
import { blockSimilarity } from './similarity';

export type RowKind = 'unchanged' | 'modified' | 'added' | 'removed';

export interface AlignedRow {
  readonly kind: RowKind;
  readonly base?: SourceBlock;
  readonly head?: SourceBlock;
}

/** Minimum similarity for a removed and an added block to be shown as one edited block. */
const PAIRING_THRESHOLD = 0.5;

interface Pair {
  readonly baseIndex: number;
  readonly headIndex: number;
}

function blockKey(block: SourceBlock): string {
  const normalized = block.source
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n');
  return `${block.kind}\u0000${normalized}`;
}

function buildScoreTable(removed: readonly SourceBlock[], added: readonly SourceBlock[]): number[][] {
  const scores = Array.from({ length: removed.length + 1 }, () => new Array<number>(added.length + 1).fill(0));
  for (let i = 1; i <= removed.length; i += 1) {
    for (let j = 1; j <= added.length; j += 1) {
      const similarity = blockSimilarity(removed[i - 1] as SourceBlock, added[j - 1] as SourceBlock);
      const diagonal = similarity >= PAIRING_THRESHOLD ? (scores[i - 1]?.[j - 1] ?? 0) + similarity : -Infinity;
      scores[i]![j] = Math.max(scores[i - 1]?.[j] ?? 0, scores[i]?.[j - 1] ?? 0, diagonal);
    }
  }
  return scores;
}

/** Order-preserving pairing that maximises total similarity (a weighted LCS). */
function pairChangedBlocks(removed: readonly SourceBlock[], added: readonly SourceBlock[]): Pair[] {
  const scores = buildScoreTable(removed, added);
  const pairs: Pair[] = [];
  let i = removed.length;
  let j = added.length;
  while (i > 0 && j > 0) {
    const score = scores[i]?.[j] ?? 0;
    if (score === (scores[i - 1]?.[j] ?? 0)) {
      i -= 1;
    } else if (score === (scores[i]?.[j - 1] ?? 0)) {
      j -= 1;
    } else {
      pairs.unshift({ baseIndex: i - 1, headIndex: j - 1 });
      i -= 1;
      j -= 1;
    }
  }
  return pairs;
}

function alignChangedRegion(removed: readonly SourceBlock[], added: readonly SourceBlock[]): AlignedRow[] {
  const pairs = pairChangedBlocks(removed, added);
  const rows: AlignedRow[] = [];
  let nextBase = 0;
  let nextHead = 0;
  for (const pair of [...pairs, { baseIndex: removed.length, headIndex: added.length }]) {
    rows.push(...removed.slice(nextBase, pair.baseIndex).map((base) => ({ kind: 'removed' as const, base })));
    rows.push(...added.slice(nextHead, pair.headIndex).map((head) => ({ kind: 'added' as const, head })));
    const base = removed[pair.baseIndex];
    const head = added[pair.headIndex];
    if (base && head) rows.push({ kind: 'modified', base, head });
    nextBase = pair.baseIndex + 1;
    nextHead = pair.headIndex + 1;
  }
  return rows;
}

/**
 * Lines up the blocks of two versions of a document. Identical blocks anchor the
 * alignment; blocks between anchors are paired by similarity or left unmatched.
 */
export function alignBlocks(base: readonly SourceBlock[], head: readonly SourceBlock[]): AlignedRow[] {
  const changes = diffArrays(base.map(blockKey), head.map(blockKey));
  const rows: AlignedRow[] = [];
  let baseIndex = 0;
  let headIndex = 0;
  let pendingRemoved: SourceBlock[] = [];
  let pendingAdded: SourceBlock[] = [];

  for (const change of changes) {
    const count = change.value.length;
    if (change.removed) {
      pendingRemoved = [...pendingRemoved, ...base.slice(baseIndex, baseIndex + count)];
      baseIndex += count;
      continue;
    }
    if (change.added) {
      pendingAdded = [...pendingAdded, ...head.slice(headIndex, headIndex + count)];
      headIndex += count;
      continue;
    }
    rows.push(...alignChangedRegion(pendingRemoved, pendingAdded));
    pendingRemoved = [];
    pendingAdded = [];
    for (let k = 0; k < count; k += 1) {
      rows.push({ kind: 'unchanged', base: base[baseIndex + k], head: head[headIndex + k] });
    }
    baseIndex += count;
    headIndex += count;
  }
  rows.push(...alignChangedRegion(pendingRemoved, pendingAdded));
  return rows;
}
