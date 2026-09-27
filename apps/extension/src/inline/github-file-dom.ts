/**
 * Everything this extension assumes about the DOM of GitHub's Files changed page.
 * Class names there are hashed per build, so only ids, roles and data attributes are used.
 */

export const SPLIT_VIEW_TAG = "bgm-split-view";
export const SPLIT_TOGGLE_TAG = "bgm-split-toggle";

const HEADER_SELECTOR = "[data-diff-header-wrapper]";
const VIEW_SWITCHER_SELECTOR = `${HEADER_SELECTOR} [data-component="SegmentedControl"]`;
const SPLIT_ATTR = "data-bgm-split";
const PAGE_STYLE_ATTR = "data-bgm-page-style";

/** GitHub's own "source diff / rich diff" switcher in a file header. */
export function findViewSwitcher(container: Element): Element | null {
  return container.querySelector(VIEW_SWITCHER_SELECTOR);
}

export function findHeader(container: Element): Element | null {
  return container.querySelector(HEADER_SELECTOR);
}

/**
 * Split files are marked with an attribute rather than by styling GitHub's nodes
 * directly, so React re-renders cannot undo it and switching back leaves no trace.
 */
export function setSplitActive(container: Element, isActive: boolean): void {
  if (isActive) container.setAttribute(SPLIT_ATTR, "");
  else container.removeAttribute(SPLIT_ATTR);
}

export function isSplitActive(container: Element): boolean {
  return container.hasAttribute(SPLIT_ATTR);
}

const PAGE_STYLE = `
[${SPLIT_ATTR}] > :not(${HEADER_SELECTOR}):not(${SPLIT_VIEW_TAG}) { display: none !important; }
${SPLIT_TOGGLE_TAG} { display: inline-flex; margin-left: 8px; vertical-align: middle; }
${SPLIT_VIEW_TAG} { display: block; }
`;

export function installPageStyle(document: Document): void {
  if (document.head.querySelector(`style[${PAGE_STYLE_ATTR}]`)) return;
  const style = document.createElement("style");
  style.setAttribute(PAGE_STYLE_ATTR, "");
  style.textContent = PAGE_STYLE;
  document.head.append(style);
}

export function removePageStyle(document: Document): void {
  document.head.querySelector(`style[${PAGE_STYLE_ATTR}]`)?.remove();
}
