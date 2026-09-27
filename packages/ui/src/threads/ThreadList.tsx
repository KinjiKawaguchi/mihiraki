import type { ReviewComment, ReviewThread } from '@better-gh-md/core';
import { useMemo, useState } from 'preact/hooks';
import { formatDateTime, formatLineRange } from '../format';
import { sanitizeHtml } from '../sanitize';

function CommentView({ comment }: { readonly comment: ReviewComment }) {
  const safeBody = useMemo(() => sanitizeHtml(comment.bodyHtml), [comment.bodyHtml]);
  return (
    <div class="bgm-comment">
      <div class="bgm-comment__meta">
        {comment.avatarUrl && <img class="bgm-comment__avatar" src={comment.avatarUrl} alt="" width={20} height={20} />}
        <strong>{comment.author}</strong>
        <span class="bgm-comment__time">{formatDateTime(comment.createdAt)}</span>
        {comment.url && (
          <a class="bgm-comment__link" href={comment.url} target="_blank" rel="noreferrer">
            GitHubで開く
          </a>
        )}
      </div>
      <div class="bgm-comment__body markdown-body" dangerouslySetInnerHTML={{ __html: safeBody }} />
    </div>
  );
}

function ThreadView({ thread }: { readonly thread: ReviewThread }) {
  const [isExpanded, setIsExpanded] = useState(!thread.isResolved);
  const lines = { start: thread.startLine ?? thread.line, end: thread.line };
  return (
    <div class={`bgm-thread${thread.isResolved ? ' bgm-thread--resolved' : ''}`}>
      <button type="button" class="bgm-thread__header" onClick={() => setIsExpanded(!isExpanded)}>
        <span>{formatLineRange(thread.side, lines)}</span>
        <span>{thread.comments.length}件</span>
        {thread.isPending && <span class="bgm-badge bgm-badge--pending">保留中</span>}
        {thread.isResolved && <span class="bgm-badge">解決済み</span>}
        {thread.isOutdated && <span class="bgm-badge">古い差分</span>}
      </button>
      {isExpanded && thread.comments.map((comment) => <CommentView key={comment.id} comment={comment} />)}
    </div>
  );
}

export function ThreadList({ threads }: { readonly threads: readonly ReviewThread[] }) {
  if (threads.length === 0) return null;
  return (
    <div class="bgm-threads">
      {threads.map((thread) => (
        <ThreadView key={thread.id} thread={thread} />
      ))}
    </div>
  );
}
