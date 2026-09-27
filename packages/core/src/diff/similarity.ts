import type { SourceBlock } from '../markdown/types';
import { isWordUnit, splitTextUnits } from './text-units';

function countWords(text: string): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const word of splitTextUnits(text.toLowerCase()).filter(isWordUnit)) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return counts;
}

function totalCount(counts: ReadonlyMap<string, number>): number {
  return Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
}

/**
 * Dice coefficient over the multiset of words (0..1). Blocks of different kinds are
 * never considered similar, so a paragraph turned into a heading shows as remove + add.
 */
export function blockSimilarity(a: SourceBlock, b: SourceBlock): number {
  if (a.kind !== b.kind) return 0;
  const wordsA = countWords(a.source);
  const wordsB = countWords(b.source);
  const total = totalCount(wordsA) + totalCount(wordsB);
  if (total === 0) return a.source.trim() === b.source.trim() ? 1 : 0;
  const shared = Array.from(wordsA.entries()).reduce(
    (sum, [word, count]) => sum + Math.min(count, wordsB.get(word) ?? 0),
    0,
  );
  return (2 * shared) / total;
}
