/** GitHub mutates the page constantly; batch our reaction to it. */
const SYNC_DELAY_MS = 50;

/** Calls `onChange` (debounced) whenever nodes are added to or removed from the page. */
export function watchDocument(document: Document, onChange: () => void): () => void {
  let isScheduled = false;
  const observer = new MutationObserver(() => {
    if (isScheduled) return;
    isScheduled = true;
    setTimeout(() => {
      isScheduled = false;
      onChange();
    }, SYNC_DELAY_MS);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}
