import { describe, expect, it } from 'vitest';
import { tokenizeHtml } from './html-tokens';

describe('tokenizeHtml', () => {
  it('separates tags from words and whitespace', () => {
    const tokens = tokenizeHtml('<p>Hello big world</p>');

    expect(tokens.map((t) => [t.kind, t.value])).toEqual([
      ['tag', '<p>'],
      ['text', 'Hello'],
      ['text', ' '],
      ['text', 'big'],
      ['text', ' '],
      ['text', 'world'],
      ['tag', '</p>'],
    ]);
  });

  it('splits CJK text into single characters', () => {
    const tokens = tokenizeHtml('仕様を確認');

    expect(tokens.map((t) => t.value)).toEqual(['仕', '様', 'を', '確', '認']);
  });

  it('keeps html entities as one token', () => {
    const tokens = tokenizeHtml('a &amp; b');

    expect(tokens.map((t) => t.value)).toEqual(['a', ' ', '&amp;', ' ', 'b']);
  });

  it('ignores source line attributes when comparing tags', () => {
    const [base] = tokenizeHtml('<p data-line-start="3" data-line-end="4">');
    const [head] = tokenizeHtml('<p data-line-start="9" data-line-end="10">');

    expect(base?.key).toBe(head?.key);
    expect(base?.value).not.toBe(head?.value);
  });
});
