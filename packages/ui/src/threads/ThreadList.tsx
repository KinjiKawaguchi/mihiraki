import type { ReviewComment, ReviewThread } from "@mihiraki/core";
import { useMemo, useState } from "preact/hooks";
import { formatDateTime, formatLineRange } from "../format";
import { useMessages } from "../i18n/i18n";
import { SafeHtml } from "../safe-html/SafeHtml";
import { sanitizeHtml } from "../safe-html/sanitize";

function CommentView({ comment }: { readonly comment: ReviewComment }) {
  const t = useMessages();
  const safeBody = useMemo(() => sanitizeHtml(comment.bodyHtml), [comment.bodyHtml]);
  return (
    <div class="mhr-comment">
      <div class="mhr-comment__meta">
        {comment.avatarUrl && (
          <img class="mhr-comment__avatar" src={comment.avatarUrl} alt="" width={20} height={20} />
        )}
        <strong>{comment.author}</strong>
        <span class="mhr-comment__time">{formatDateTime(comment.createdAt, t.locale)}</span>
        {comment.isPending && <span class="mhr-badge mhr-badge--pending">{t.pending}</span>}
        {comment.url && (
          <a class="mhr-comment__link" href={comment.url} target="_blank" rel="noreferrer">
            {t.openOnGitHub}
          </a>
        )}
      </div>
      <SafeHtml class="mhr-comment__body markdown-body" html={safeBody} />
    </div>
  );
}

function ThreadView({ thread }: { readonly thread: ReviewThread }) {
  const t = useMessages();
  const [isExpanded, setIsExpanded] = useState(!thread.isResolved);
  return (
    <div class={`mhr-thread${thread.isResolved ? " mhr-thread--resolved" : ""}`}>
      <button type="button" class="mhr-thread__header" onClick={() => setIsExpanded(!isExpanded)}>
        <span>{formatLineRange(thread.side, thread.lines)}</span>
        <span>{t.commentCount(thread.comments.length)}</span>
        {thread.isResolved && <span class="mhr-badge">{t.resolved}</span>}
        {thread.isOutdated && <span class="mhr-badge">{t.outdated}</span>}
      </button>
      {isExpanded &&
        thread.comments.map((comment) => <CommentView key={comment.id} comment={comment} />)}
    </div>
  );
}

/** Threads that no rendered block can hold, e.g. base-side threads of an added file. */
export function UnplacedThreads({ threads }: { readonly threads: readonly ReviewThread[] }) {
  const t = useMessages();
  if (threads.length === 0) return null;
  return (
    <section class="mhr-unplaced" aria-label={t.unplacedThreads}>
      <p class="mhr-unplaced__title">{t.unplacedThreads}</p>
      <ThreadList threads={threads} />
    </section>
  );
}

export function ThreadList({ threads }: { readonly threads: readonly ReviewThread[] }) {
  if (threads.length === 0) return null;
  return (
    <div class="mhr-threads">
      {threads.map((thread) => (
        <ThreadView key={thread.id} thread={thread} />
      ))}
    </div>
  );
}
