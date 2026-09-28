import type { ReviewThread } from "@mihiraki/core";
import { useState } from "preact/hooks";
import { formatLineRange } from "../format";
import { useMessages } from "../i18n/i18n";
import { CommentView } from "./CommentView";

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
