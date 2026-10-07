import type { ReviewComment } from "@mihiraki/core";
import { useState } from "preact/hooks";
import { useMessages } from "../i18n/i18n";
import { usePopupPlacement } from "./popup-placement";
import { useCloseOnOutsidePointer } from "./use-close-on-outside-pointer";

function copy(text: string): void {
  void navigator.clipboard?.writeText(text);
}

/** What the reviewer may do to the comment here; each is absent where it is not allowed. */
export interface CommentChanges {
  readonly onQuote?: () => void;
  readonly onEdit?: () => void;
  readonly onDelete?: () => void;
}

interface CommentMenuProps {
  readonly comment: ReviewComment;
  readonly changes: CommentChanges;
}

/** GitHub's "…" menu of a comment. */
export function CommentMenu({ comment, changes }: CommentMenuProps) {
  const t = useMessages();
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);
  const ref = useCloseOnOutsidePointer(isOpen, close);
  const { popupRef, placement } = usePopupPlacement(isOpen, ref);
  const act = (action: () => void) => () => {
    action();
    close();
  };
  const { onQuote, onEdit, onDelete } = changes;

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
          ref={popupRef}
          data-placement={placement}
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
          {onQuote && (
            <button type="button" role="menuitem" onClick={act(onQuote)}>
              {t.quoteReply}
            </button>
          )}
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
          {(onEdit || onDelete) && <hr class="mhr-menu__divider" />}
          {onEdit && (
            <button type="button" role="menuitem" onClick={act(onEdit)}>
              {t.editComment}
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              role="menuitem"
              class="mhr-menu__item--danger"
              onClick={act(onDelete)}
            >
              {t.deleteComment}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
