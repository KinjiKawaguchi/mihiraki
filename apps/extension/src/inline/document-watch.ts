/** GitHub mutates the page constantly; batch our reaction to it. */
const SYNC_DELAY_MS = 50;

/**
 * Calls `onChange` (debounced) whenever nodes are added to or removed from the page, or
 * a button's pressed state changes (as when a file switches between source and rich diff).
 * Stopping also cancels a call already scheduled, so nothing runs after it.
 */
export function watchDocument(document: Document, onChange: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const observer = new MutationObserver(() => {
    if (timer !== null) return;
    timer = setTimeout(() => {
      timer = null;
      onChange();
    }, SYNC_DELAY_MS);
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["aria-pressed"],
  });
  return () => {
    observer.disconnect();
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
}
