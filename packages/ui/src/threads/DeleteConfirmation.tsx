import type { ReviewComment, ReviewThread } from "@mihiraki/core";
import { useState } from "preact/hooks";
import { describeHostFailure } from "../host-errors/describe";
import { useMessages } from "../i18n/i18n";
import type { ThreadActions } from "./thread-actions";

interface DeleteConfirmationProps {
  readonly thread: ReviewThread;
  readonly comment: ReviewComment;
  readonly actions: ThreadActions;
  /** Called on Cancel and once the comment is deleted. */
  readonly onDone: () => void;
}

/** Asks before deleting a comment, as GitHub does; deletion cannot be undone. */
export function DeleteConfirmation({ thread, comment, actions, onDone }: DeleteConfirmationProps) {
  const t = useMessages();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setIsDeleting(true);
    setError(null);
    const result = await actions.deleteComment(thread, comment);
    if (result.ok) {
      onDone();
      return;
    }
    setError(describeHostFailure(t, t.couldNotDeleteComment, result.error));
    setIsDeleting(false);
  };

  return (
    <div class="mhr-confirm">
      <p class="mhr-confirm__question">{t.confirmDeleteComment}</p>
      {error && <p class="mhr-form__error">{error}</p>}
      <div class="mhr-form__actions">
        <button type="button" class="mhr-button" disabled={isDeleting} onClick={onDone}>
          {t.cancel}
        </button>
        <button
          type="button"
          class="mhr-button mhr-button--danger"
          disabled={isDeleting}
          onClick={() => void confirm()}
        >
          {t.confirmDelete}
        </button>
      </div>
    </div>
  );
}
