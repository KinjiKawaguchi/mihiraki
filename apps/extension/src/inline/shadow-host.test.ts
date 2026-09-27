import { afterEach, describe, expect, it, vi } from 'vitest';
import { createShadowHost } from './shadow-host';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('createShadowHost', () => {
  it('creates an isolated host carrying the given styles', () => {
    const { host, root } = createShadowHost(document, 'bgm-test', '.x { color: red; }');

    expect(host.tagName.toLowerCase()).toBe('bgm-test');
    expect(root.querySelector('style')?.textContent).toContain('.x { color: red; }');
    expect(root.querySelector('style')?.textContent).toContain('all: initial');
  });

  it('keeps keystrokes inside from reaching the page keyboard shortcuts', () => {
    const { host, root } = createShadowHost(document, 'bgm-test', '');
    document.body.append(host);
    const input = document.createElement('textarea');
    root.append(input);
    const pageShortcut = vi.fn();
    document.addEventListener('keydown', pageShortcut);

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true, composed: true }));

    expect(pageShortcut).not.toHaveBeenCalled();
    document.removeEventListener('keydown', pageShortcut);
  });
});
