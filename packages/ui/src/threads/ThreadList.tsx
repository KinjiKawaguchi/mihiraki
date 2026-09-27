import type { ReviewComment, ReviewThread } from "@mihiraki/core";
import { useMemo, useState } from "preact/hooks";
import { formatDateTime, formatLineRange } from "../format";
import { SafeHtml } from "../safe-html/SafeHtml";
import { sanitizeHtml } from "../safe-html/sanitize";

function CommentView({ comment }: { readonly comment: ReviewComment }) {
  const safeBody = useMemo(() => sanitizeHtml(comment.bodyHtml), [comment.bodyHtml]);
  return (
    <div class="mhr-comment">
      <div class="mhr-comment__meta">
        {comment.avatarUrl && (
          <img class="mhr-comment__avatar" src={comment.avatarUrl} alt="" width={20} height={20} />
        )}
        <strong>{comment.author}</strong>
        <span class="mhr-comment__time">{formatDateTime(comment.createdAt)}</span>
        {comment.isPending && <span class="mhr-badge mhr-badge--pending">保留中</span>}
        {comment.url && (
          <a class="mhr-comment__link" href={comment.url} target="_blank" rel="noreferrer">
            GitHubで開く
          </a>
        )}
      </div>
      <SafeHtml class="mhr-comment__body markdown-body" html={safeBody} />
    </div>
  );
}

function ThreadView({ thread }: { readonly thread: ReviewThread }) {
  const [isExpanded, setIsExpanded] = useState(!thread.isResolved);
  return (
    <div class={`mhr-thread${thread.isResolved ? " mhr-thread--resolved" : ""}`}>
      <button type="button" class="mhr-thread__header" onClick={() => setIsExpanded(!isExpanded)}>
        <span>{formatLineRange(thread.side, thread.lines)}</span>
        <span>{thread.comments.length}件</span>
        {thread.isResolved && <span class="mhr-badge">解決済み</span>}
        {thread.isOutdated && <span class="mhr-badge">古い差分</span>}
      </button>
      {isExpanded &&
        thread.comments.map((comment) => <CommentView key={comment.id} comment={comment} />)}
    </div>
  );
}

const UNPLACED_LABEL = "本文の横に表示できないコメント";

/** Threads that no rendered block can hold, e.g. base-side threads of an added file. */
export function UnplacedThreads({ threads }: { readonly threads: readonly ReviewThread[] }) {
  if (threads.length === 0) return null;
  return (
    <section class="mhr-unplaced" aria-label={UNPLACED_LABEL}>
      <p class="mhr-unplaced__title">{UNPLACED_LABEL}</p>
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
