import type { ReviewThread } from "@mihiraki/core";
import { useState } from "preact/hooks";
import type { TextInsertion } from "../comment-form/CommentForm";
import { formatLineRange } from "../format";
import { useMessages } from "../i18n/i18n";
import { CommentView } from "./CommentView";
import { ThreadFooter } from "./ThreadFooter";

/** Markdown quoting `text`, followed by a blank line to write the reply after. */
function quoteOf(text: string): string {
  const quoted = text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
  return `${quoted}\n\n`;
}

/** A thread, folded while resolved as on GitHub, with its comments and actions. */
export function ThreadView({ thread }: { readonly thread: ReviewThread }) {
  const t = useMessages();
  const [isExpanded, setIsExpanded] = useState(!thread.isResolved);
  const [quote, setQuote] = useState<TextInsertion | null>(null);
  // Folding drops the reply form, and with it any quote waiting for it.
  const setExpanded = (isOpen: boolean) => {
    setIsExpanded(isOpen);
    if (!isOpen) setQuote(null);
  };
  return (
    <div class={`mhr-thread${thread.isResolved ? " mhr-thread--resolved" : ""}`}>
      <button type="button" class="mhr-thread__header" onClick={() => setExpanded(!isExpanded)}>
        <span>{formatLineRange(thread.side, thread.lines)}</span>
        <span>{t.commentCount(thread.comments.length)}</span>
        {thread.isResolved && <span class="mhr-badge">{t.resolved}</span>}
        {thread.isOutdated && <span class="mhr-badge">{t.outdated}</span>}
      </button>
      {isExpanded && (
        <>
          {thread.comments.map((comment) => (
            <CommentView
              key={comment.id}
              thread={thread}
              comment={comment}
              onQuote={(text) => setQuote({ text: quoteOf(text) })}
            />
          ))}
          <ThreadFooter
            thread={thread}
            quote={quote}
            onResolvedChange={(isResolved) => setExpanded(!isResolved)}
          />
        </>
      )}
    </div>
  );
}
