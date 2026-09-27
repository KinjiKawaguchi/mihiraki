/** GitHub mutates the page constantly; batch our reaction to it. */
const SYNC_DELAY_MS = 50;

/**
 * Calls `onChange` (debounced) whenever nodes are added to or removed from the page.
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
  observer.observe(document.body, { childList: true, subtree: true });
  return () => {
    observer.disconnect();
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
}
