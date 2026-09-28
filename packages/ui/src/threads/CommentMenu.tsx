import type { ReviewComment } from "@mihiraki/core";
import { useEffect, useRef, useState } from "preact/hooks";
import { useMessages } from "../i18n/i18n";

function copy(text: string): void {
  void navigator.clipboard?.writeText(text);
}

/** Closes the menu when the pointer goes down outside it (the view lives in a shadow root). */
function useCloseOnOutsidePointer(isOpen: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current?.getRootNode();
    if (!isOpen || !root) return undefined;
    const onPointerDown = (event: Event) => {
      if (ref.current && !event.composedPath().includes(ref.current)) close();
    };
    root.addEventListener("pointerdown", onPointerDown);
    return () => root.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen]);
  return ref;
}

/** GitHub's "…" menu of a comment, for what can be done without changing it. */
export function CommentMenu({ comment }: { readonly comment: ReviewComment }) {
  const t = useMessages();
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);
  const ref = useCloseOnOutsidePointer(isOpen, close);
  const act = (action: () => void) => () => {
    action();
    close();
  };

  return (
    <div class="mhr-menu" ref={ref}>
      <button
        type="button"
        class="mhr-menu__button"
        aria-label={t.moreActions}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        …
      </button>
      {isOpen && (
        <div
          class="mhr-menu__list"
          role="menu"
          tabIndex={-1}
          onKeyDown={(event) => {
            if (event.key === "Escape") close();
          }}
        >
          {comment.url && (
            <button type="button" role="menuitem" onClick={act(() => copy(comment.url))}>
              {t.copyLink}
            </button>
          )}
          <button type="button" role="menuitem" onClick={act(() => copy(comment.bodyMarkdown))}>
            {t.copyMarkdown}
          </button>
          {comment.newIssueUrl && (
            <a
              role="menuitem"
              href={comment.newIssueUrl}
              target="_blank"
              rel="noreferrer"
              onClick={close}
            >
              {t.referenceInNewIssue}
            </a>
          )}
          {comment.url && (
            <a role="menuitem" href={comment.url} target="_blank" rel="noreferrer" onClick={close}>
              {t.openOnGitHub}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
