const CJK = '\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}';

const TEXT_UNIT_PATTERN = new RegExp(
  ['&[#a-zA-Z0-9]+;', `[${CJK}]`, `(?:(?![${CJK}])[\\p{L}\\p{N}_])+`, '\\s+', '.'].join('|'),
  'gsu',
);
const WORD_UNIT_PATTERN = /^[\p{L}\p{N}_]+$/u;

/**
 * Splits text into diff units: words for space-separated scripts, single characters
 * for CJK (which has no word separators), whitespace runs, entities and punctuation.
 */
export function splitTextUnits(text: string): string[] {
  return Array.from(text.matchAll(TEXT_UNIT_PATTERN), ([unit]) => unit);
}

export function isWordUnit(unit: string): boolean {
  return WORD_UNIT_PATTERN.test(unit);
}
