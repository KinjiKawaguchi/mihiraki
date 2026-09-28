import type { ReviewComment } from "@mihiraki/core";
import { useMemo } from "preact/hooks";
import { formatDateTime, formatRelativeTime } from "../format";
import { useMessages } from "../i18n/i18n";
import { SafeHtml } from "../safe-html/SafeHtml";
import { sanitizeHtml } from "../safe-html/sanitize";
import { CommentMenu } from "./CommentMenu";
import { Reactions } from "./Reactions";

/** One comment of a thread, laid out as on GitHub. */
export function CommentView({ comment }: { readonly comment: ReviewComment }) {
  const t = useMessages();
  const safeBody = useMemo(() => sanitizeHtml(comment.bodyHtml), [comment.bodyHtml]);
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
          <CommentMenu comment={comment} />
        </span>
      </div>
      <SafeHtml class="mhr-comment__body markdown-body" html={safeBody} />
      <Reactions reactions={comment.reactions} />
    </div>
  );
}
