import type { ReviewThread } from "@mihiraki/core";
import { useState } from "preact/hooks";
import { formatLineRange } from "../format";
import { useMessages } from "../i18n/i18n";
import { CommentView } from "./CommentView";
import { ThreadFooter } from "./ThreadFooter";

/** A thread, folded while resolved as on GitHub, with its comments and actions. */
export function ThreadView({ thread }: { readonly thread: ReviewThread }) {
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
      {isExpanded && (
        <>
          {thread.comments.map((comment) => (
            <CommentView key={comment.id} comment={comment} />
          ))}
          <ThreadFooter
            thread={thread}
            onResolvedChange={(isResolved) => setIsExpanded(!isResolved)}
          />
        </>
      )}
    </div>
  );
}
