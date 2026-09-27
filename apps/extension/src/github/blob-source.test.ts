import { describe, expect, it } from 'vitest';
import { extractBlobSource } from './blob-source';

function page(json: unknown): string {
  const escaped = JSON.stringify(json).replace(/</g, '\\u003c');
  return `<html><body><script type="application/json" data-target="react-app.embeddedData">${escaped}</script></body></html>`;
}

describe('extractBlobSource', () => {
  it('joins rawLines found anywhere in the embedded page data', () => {
    const html = page({ payload: { blob: { rawLines: ['# Title', '', 'a <b> & c'] } } });

    expect(extractBlobSource(html)).toBe('# Title\n\na <b> & c');
  });

  it('falls back to rawBlob', () => {
    expect(extractBlobSource(page({ payload: { deep: { blob: { rawBlob: 'text\n' } } } }))).toBe('text\n');
  });

  it('returns null when the page has no source', () => {
    expect(extractBlobSource('<html><body>Not found</body></html>')).toBeNull();
  });
});
