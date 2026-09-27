import type { ReviewComment, ReviewThread } from "@mihiraki/core";
import { useMemo, useState } from "preact/hooks";
import { formatDateTime, formatLineRange } from "../format";
import { sanitizeHtml } from "../sanitize";

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
        {comment.url && (
          <a class="mhr-comment__link" href={comment.url} target="_blank" rel="noreferrer">
            GitHubで開く
          </a>
        )}
      </div>
      <div class="mhr-comment__body markdown-body" dangerouslySetInnerHTML={{ __html: safeBody }} />
    </div>
  );
}

function ThreadView({ thread }: { readonly thread: ReviewThread }) {
  const [isExpanded, setIsExpanded] = useState(!thread.isResolved);
  const lines = { start: thread.startLine ?? thread.line, end: thread.line };
  return (
    <div class={`mhr-thread${thread.isResolved ? " mhr-thread--resolved" : ""}`}>
      <button type="button" class="mhr-thread__header" onClick={() => setIsExpanded(!isExpanded)}>
        <span>{formatLineRange(thread.side, lines)}</span>
        <span>{thread.comments.length}件</span>
        {thread.isPending && <span class="mhr-badge mhr-badge--pending">保留中</span>}
        {thread.isResolved && <span class="mhr-badge">解決済み</span>}
        {thread.isOutdated && <span class="mhr-badge">古い差分</span>}
      </button>
      {isExpanded &&
        thread.comments.map((comment) => <CommentView key={comment.id} comment={comment} />)}
    </div>
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
