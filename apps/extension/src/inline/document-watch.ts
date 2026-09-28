/** GitHub mutates the page constantly; batch our reaction to it. */
const SYNC_DELAY_MS = 50;

function isPressedChange(record: MutationRecord): boolean {
  return record.type === "attributes" && record.attributeName === "aria-pressed";
}

/**
 * Calls `onChange` (debounced) whenever nodes are added to or removed from the page. A
 * button's pressed state changing (as when a file switches between source and rich diff)
 * is answered right away instead, since the reviewer is waiting for the view to switch.
 * Stopping also cancels a call already scheduled, so nothing runs after it.
 */
export function watchDocument(document: Document, onChange: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const cancel = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  };
  const observer = new MutationObserver((records) => {
    if (records.some(isPressedChange)) {
      cancel();
      onChange();
      return;
    }
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
    cancel();
  };
}
