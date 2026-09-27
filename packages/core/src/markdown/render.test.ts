import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './render';

describe('renderMarkdown', () => {
  it('renders GitHub flavoured Markdown to HTML', () => {
    const html = renderMarkdown('**bold** and ~~gone~~\n\n- [ ] task');

    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<s>gone</s>');
    expect(html).toContain('type="checkbox"');
  });
});
