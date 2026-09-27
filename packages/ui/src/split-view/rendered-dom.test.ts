import { afterEach, describe, expect, it } from 'vitest';
import { lineElementAt } from './rendered-dom';

function place(element: Element, top: number, bottom: number) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    value: () => ({ top, bottom, left: 0, right: 100, width: 100, height: bottom - top, x: 0, y: top, toJSON: () => ({}) }),
  });
}

function renderList() {
  const root = document.createElement('div');
  root.innerHTML = `
    <p data-line-start="1" data-line-end="1">intro</p>
    <ul data-line-start="3" data-line-end="4">
      <li data-line-start="3" data-line-end="3">one</li>
      <li data-line-start="4" data-line-end="4">two</li>
    </ul>`;
  document.body.append(root);
  const [p, ul, first, second] = Array.from(root.querySelectorAll('[data-line-start]'));
  place(p as Element, 0, 20);
  place(ul as Element, 40, 80);
  place(first as Element, 40, 60);
  place(second as Element, 60, 80);
  return { root, p: p as Element, second: second as Element };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('lineElementAt', () => {
  it('uses the element under the pointer when there is one', () => {
    const { root, p } = renderList();

    expect(lineElementAt(root, p.firstChild, 70)).toBe(p);
  });

  it('finds the innermost element at the pointer height when the pointer is in the gutter', () => {
    const { root, second } = renderList();

    expect(lineElementAt(root, document.body, 70)).toBe(second);
  });

  it('finds nothing between elements', () => {
    const { root } = renderList();

    expect(lineElementAt(root, document.body, 30)).toBeNull();
  });
});
