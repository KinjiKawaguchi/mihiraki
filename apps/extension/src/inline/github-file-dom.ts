/**
 * Everything this extension assumes about the DOM of GitHub's Files changed page.
 * Class names there are hashed per build, so only ids, roles and data / aria attributes are used.
 */

export const REVIEW_VIEW_TAG = "mhr-review";
/** The strip that leads back to the rendered view while a file shows GitHub's own rich diff. */
export const RETURN_BAR_TAG = "mhr-return";

const HEADER_SELECTOR = "[data-diff-header-wrapper]";
const VIEW_SWITCHER_SELECTOR = `${HEADER_SELECTOR} [data-component="SegmentedControl"]`;
const VIEW_ATTR = "data-mhr-view";
const PAGE_STYLE_ATTR = "data-mhr-page-style";

/** A button's accessible name; GitHub labels these by pointing at their tooltip. */
function labelOf(button: Element): string {
  const id = button.getAttribute("aria-labelledby");
  const tooltip = id ? button.ownerDocument.getElementById(id) : null;
  return tooltip?.textContent ?? button.getAttribute("aria-label") ?? "";
}

/**
 * Whether the file header's "source diff / rich diff" switcher has rich diff pressed:
 * the button labelled as the rich diff, or else the second one.
 */
export function isRichDiffShown(container: Element): boolean {
  const buttons = Array.from(
    container.querySelectorAll(`${VIEW_SWITCHER_SELECTOR} button[aria-pressed]`),
  );
  const rich = buttons.find((button) => /rich diff/i.test(labelOf(button))) ?? buttons[1];
  return rich?.getAttribute("aria-pressed") === "true";
}

/**
 * Files showing the rendered view are marked with an attribute rather than by styling
 * GitHub's nodes directly, so React re-renders cannot undo it and removing it leaves no trace.
 */
export function setRenderedViewActive(container: Element, isActive: boolean): void {
  if (isActive) container.setAttribute(VIEW_ATTR, "");
  else container.removeAttribute(VIEW_ATTR);
}

export function isRenderedViewActive(container: Element): boolean {
  return container.hasAttribute(VIEW_ATTR);
}

/** Puts `element` right under the file's header, where it is seen however long the file is. */
export function insertBelowHeader(container: Element, element: Element): void {
  const header = container.querySelector(`:scope > ${HEADER_SELECTOR}`);
  if (header) header.after(element);
  else container.prepend(element);
}

const PAGE_STYLE = `
[${VIEW_ATTR}] > :not(${HEADER_SELECTOR}):not(${REVIEW_VIEW_TAG}) { display: none !important; }
${REVIEW_VIEW_TAG}, ${RETURN_BAR_TAG} { display: block; }
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
