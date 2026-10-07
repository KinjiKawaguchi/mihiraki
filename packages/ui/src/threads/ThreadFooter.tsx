import type { ReviewThread } from "@mihiraki/core";
import { useState } from "preact/hooks";
import { CommentForm } from "../comment-form/CommentForm";
import { describeHostFailure } from "../host-errors/describe";
import { useMessages } from "../i18n/i18n";
import { type ThreadActions, useThreadActions } from "./thread-actions";

interface ResolutionProps {
  readonly thread: ReviewThread;
  readonly actions: ThreadActions;
  /** Called once the host accepted the change. */
  readonly onChanged: (isResolved: boolean) => void;
}

/** Resolving a thread or opening it again, with why it failed if it did. */
function useResolution({ thread, actions, onChanged }: ResolutionProps) {
  const t = useMessages();
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    const isResolved = !thread.isResolved;
    setIsBusy(true);
    setError(null);
    const result = await actions.setResolved(thread, isResolved);
    setIsBusy(false);
    if (!result.ok) {
      const what = isResolved ? t.couldNotResolve : t.couldNotUnresolve;
      setError(describeHostFailure(t, what, result.error));
      return;
    }
    onChanged(isResolved);
  };

  return { isBusy, error, toggle };
}

interface ThreadFooterProps {
  readonly thread: ReviewThread;
  readonly onResolvedChange: (isResolved: boolean) => void;
}

/** Replying and resolving under a thread, where the view can write to the host. */
export function ThreadFooter({ thread, onResolvedChange }: ThreadFooterProps) {
  const actions = useThreadActions();
  return actions ? (
    <ThreadFooterBody thread={thread} actions={actions} onResolvedChange={onResolvedChange} />
  ) : null;
}

function ThreadFooterBody({
  thread,
  actions,
  onResolvedChange,
}: ThreadFooterProps & { readonly actions: ThreadActions }) {
  const t = useMessages();
  const [isReplying, setIsReplying] = useState(false);
  const resolution = useResolution({ thread, actions, onChanged: onResolvedChange });

  return (
    <div class="mhr-thread__footer">
      {isReplying && (
        <CommentForm
          hasPendingReview={actions.hasPendingReview}
          onSubmit={async (body, mode) => {
            const result = await actions.reply(thread, body, mode);
            if (result.ok) setIsReplying(false);
            return result;
          }}
          onCancel={() => setIsReplying(false)}
        />
      )}
      {resolution.error && <p class="mhr-form__error">{resolution.error}</p>}
      <div class="mhr-thread__actions">
        {thread.canReply && !isReplying && (
          <button type="button" class="mhr-button" onClick={() => setIsReplying(true)}>
            {t.reply}
          </button>
        )}
        <button
          type="button"
          class="mhr-button mhr-thread__resolve"
          disabled={resolution.isBusy}
          onClick={() => void resolution.toggle()}
        >
          {thread.isResolved ? t.unresolveConversation : t.resolveConversation}
        </button>
      </div>
    </div>
  );
}
