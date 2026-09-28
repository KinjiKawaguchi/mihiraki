import {
  buildSplitRows,
  placeThreads,
  type ReviewThread,
  type Revision,
  type Side,
} from "@mihiraki/core";
import { useMemo, useState } from "preact/hooks";
import type { SubmitComment } from "../comment-form/submit-comment";
import { useMessages } from "../i18n/i18n";
import { UnplacedThreads } from "../threads/ThreadList";
import { SplitCellView } from "./SplitCellView";
import { useCommentSelection } from "./use-comment-selection";

export interface SplitReviewProps {
  readonly path: string;
  /** Text of the base version; null when the file does not exist there. */
  readonly base: string | null;
  /** Text of the head version; null when the file does not exist there. */
  readonly head: string | null;
  readonly threads: readonly ReviewThread[];
  /** Revision of `base` / `head`; comments are anchored to it. */
  readonly revision: Revision;
  /** Whether the viewer already has an unsubmitted review on this pull request. */
  readonly hasPendingReview?: boolean;
  readonly onSubmitComment: SubmitComment;
}

/** Base on the left, head on the right, as in GitHub's split diff. */
const SIDES: readonly Side[] = ["base", "head"];

/** Side-by-side rendered diff of one Markdown file with inline review comments. */
export function SplitReview({
  path,
  base,
  head,
  threads,
  revision,
  hasPendingReview = false,
  onSubmitComment,
}: SplitReviewProps) {
  const t = useMessages();
  const rows = useMemo(() => buildSplitRows(base, head), [base, head]);
  const placement = useMemo(() => placeThreads(rows, threads), [rows, threads]);
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const comment = useCommentSelection({ path, revision, hasPendingReview, onSubmitComment });

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: ends a selection dragged from "+" (the window listener starts only after rendering)
    <div
      class={`mhr-split${comment.isDragging ? " mhr-split--selecting" : ""}`}
      onMouseUp={comment.selection.finish}
    >
      <UnplacedThreads threads={placement.unplaced} />
      <div class="mhr-split__header">
        {SIDES.map((side) => (
          <div key={side}>{t.sideLabel[side]}</div>
        ))}
      </div>
      {rows.map((row, rowIndex) => (
        <div class="mhr-row" key={rowIndex}>
          {SIDES.map((side) => {
            const cellKey = `${rowIndex}:${side}`;
            return (
              <SplitCellView
                key={side}
                side={side}
                cell={row[side]}
                kind={row.kind}
                threads={placement.byRow[rowIndex]?.[side] ?? []}
                isActive={activeCell === cellKey}
                onActivate={() => setActiveCell(cellKey)}
                {...comment.cellProps(side, rowIndex)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
