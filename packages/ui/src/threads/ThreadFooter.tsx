import type { ReviewThread } from "@mihiraki/core";
import { useEffect, useState } from "preact/hooks";
import { CommentForm, type TextInsertion } from "../comment-form/CommentForm";
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
  /** A comment quoted for a reply ("Quote reply"); opens the reply form. */
  readonly quote: TextInsertion | null;
  readonly onResolvedChange: (isResolved: boolean) => void;
}

/** Replying and resolving under a thread, where the view can write to the host. */
export function ThreadFooter(props: ThreadFooterProps) {
  const actions = useThreadActions();
  return actions ? <ThreadFooterBody {...props} actions={actions} /> : null;
}

/** Whether the reply form is open, and what to add to its draft. */
function useReplyForm(quote: TextInsertion | null) {
  const [isReplying, setIsReplying] = useState(false);
  const [insertion, setInsertion] = useState<TextInsertion | null>(null);
  useEffect(() => {
    if (!quote) return;
    setInsertion(quote);
    setIsReplying(true);
  }, [quote]);
  const close = () => {
    setIsReplying(false);
    setInsertion(null);
  };
  return { isReplying, insertion, open: () => setIsReplying(true), close };
}

function ThreadFooterBody({
  thread,
  quote,
  actions,
  onResolvedChange,
}: ThreadFooterProps & { readonly actions: ThreadActions }) {
  const t = useMessages();
  const replyForm = useReplyForm(quote);
  const resolution = useResolution({ thread, actions, onChanged: onResolvedChange });

  return (
    <div class="mhr-thread__footer">
      {replyForm.isReplying && (
        <CommentForm
          insertion={replyForm.insertion}
          hasPendingReview={actions.hasPendingReview}
          onSubmit={async (body, mode) => {
            const result = await actions.reply(thread, body, mode);
            if (result.ok) replyForm.close();
            return result;
          }}
          onCancel={replyForm.close}
        />
      )}
      {resolution.error && <p class="mhr-form__error">{resolution.error}</p>}
      <div class="mhr-thread__actions">
        {thread.canReply && !replyForm.isReplying && (
          <button type="button" class="mhr-button" onClick={replyForm.open}>
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
