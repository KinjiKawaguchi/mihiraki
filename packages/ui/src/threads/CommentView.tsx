import type { ReviewComment, ReviewThread } from "@mihiraki/core";
import { useMemo, useState } from "preact/hooks";
import { formatDateTime, formatRelativeTime } from "../format";
import { describeHostFailure } from "../host-errors/describe";
import { useMessages } from "../i18n/i18n";
import { SafeHtml } from "../safe-html/SafeHtml";
import { sanitizeHtml } from "../safe-html/sanitize";
import { CommentEditor } from "./CommentEditor";
import { type CommentChanges, CommentMenu } from "./CommentMenu";
import { DeleteConfirmation } from "./DeleteConfirmation";
import { type ChangeReaction, Reactions } from "./Reactions";
import { type ThreadActions, useThreadActions } from "./thread-actions";

type Mode = "viewing" | "editing" | "deleting";

interface CommentViewProps {
  readonly thread: ReviewThread;
  readonly comment: ReviewComment;
  /** Starts a reply quoting `text`. */
  readonly onQuote?: (text: string) => void;
}

/** The changes the menu offers: only those the host allows, and only with a host to write to. */
function changesOf(
  { thread, comment, onQuote }: CommentViewProps,
  actions: ThreadActions | null,
  setMode: (mode: Mode) => void,
): CommentChanges {
  if (!actions) return {};
  return {
    onQuote: thread.canReply && onQuote ? () => onQuote(comment.bodyMarkdown) : undefined,
    onEdit: comment.canEdit ? () => setMode("editing") : undefined,
    onDelete: comment.canDelete ? () => setMode("deleting") : undefined,
  };
}

function useReactionChange(
  { thread, comment }: CommentViewProps,
  actions: ThreadActions | null,
): ChangeReaction | undefined {
  const t = useMessages();
  if (!actions || !comment.canReact) return undefined;
  return async (kind, isOn) => {
    const result = await actions.setReaction(thread, comment, kind, isOn);
    return result.ok ? null : describeHostFailure(t, t.couldNotReact, result.error);
  };
}

/** One comment of a thread, laid out as on GitHub. */
export function CommentView(props: CommentViewProps) {
  const { thread, comment } = props;
  const t = useMessages();
  const actions = useThreadActions();
  const [mode, setMode] = useState<Mode>("viewing");
  const safeBody = useMemo(() => sanitizeHtml(comment.bodyHtml), [comment.bodyHtml]);
  const changeReaction = useReactionChange(props, actions);
  const backToViewing = () => setMode("viewing");

  return (
    <div class="mhr-comment">
      <div class="mhr-comment__meta">
        {comment.avatarUrl && (
          <img class="mhr-comment__avatar" src={comment.avatarUrl} alt="" width={20} height={20} />
        )}
        <strong>{comment.author}</strong>
        <span class="mhr-comment__time" title={formatDateTime(comment.createdAt, t.locale)}>
          {formatRelativeTime(comment.createdAt, new Date(), t.locale)}
        </span>
        {comment.isPending && <span class="mhr-badge mhr-badge--pending">{t.pending}</span>}
        <span class="mhr-comment__trail">
          {comment.isByChangeAuthor && <span class="mhr-badge">{t.authorBadge}</span>}
          <CommentMenu comment={comment} changes={changesOf(props, actions, setMode)} />
        </span>
      </div>
      {mode === "editing" && actions ? (
        <CommentEditor thread={thread} comment={comment} actions={actions} onDone={backToViewing} />
      ) : (
        <SafeHtml class="mhr-comment__body markdown-body" html={safeBody} />
      )}
      {mode === "deleting" && actions && (
        <DeleteConfirmation
          thread={thread}
          comment={comment}
          actions={actions}
          onDone={backToViewing}
        />
      )}
      <Reactions reactions={comment.reactions} onChange={changeReaction} />
    </div>
  );
}
