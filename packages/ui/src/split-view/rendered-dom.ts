import type { LineRange } from '@better-gh-md/core';

/** Rendered elements carrying the source lines they came from (set by the core renderer). */
export const LINE_ELEMENT_SELECTOR = '[data-line-start]';
export const SELECTED_CLASS = 'bgm-selected';

export function readLines(element: Element): LineRange | null {
  const start = Number(element.getAttribute('data-line-start'));
  const end = Number(element.getAttribute('data-line-end'));
  return Number.isInteger(start) && start > 0 ? { start, end: Math.max(start, end) } : null;
}

function isWithin(inner: LineRange | null, outer: LineRange): boolean {
  return inner !== null && inner.start >= outer.start && inner.end <= outer.end;
}

/** Highlights the outermost elements lying entirely inside `range`, clearing everything else. */
export function markSelectedElements(container: Element, range: LineRange | null): void {
  for (const element of Array.from(container.querySelectorAll(LINE_ELEMENT_SELECTOR))) {
    const parent = element.parentElement?.closest(LINE_ELEMENT_SELECTOR);
    const isParentSelected = range !== null && parent != null && container.contains(parent) && isWithin(readLines(parent), range);
    element.classList.toggle(SELECTED_CLASS, range !== null && !isParentSelected && isWithin(readLines(element), range));
  }
}

/** The element for exactly `lines`; the innermost one when several share the same lines. */
function findElement(container: Element, lines: LineRange): Element | null {
  const matches = container.querySelectorAll(`[data-line-start="${lines.start}"][data-line-end="${lines.end}"]`);
  return matches[matches.length - 1] ?? null;
}

/**
 * Inserts an empty element right below the element for `lines`, where a comment form
 * can be rendered. List items get it inside (a `div` is not a valid `ul` child), table
 * rows after their table.
 */
export function insertSlotBelow(container: Element, lines: LineRange): HTMLElement | null {
  const target = findElement(container, lines);
  if (!target) return null;
  const slot = target.ownerDocument.createElement('div');
  slot.className = 'bgm-form-slot';
  const table = target.closest('table');
  if (target.matches('li')) target.append(slot);
  else if (table && container.contains(table)) table.after(slot);
  else target.after(slot);
  return slot;
}
