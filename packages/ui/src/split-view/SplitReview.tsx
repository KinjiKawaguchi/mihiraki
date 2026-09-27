import {
  buildSplitRows,
  type CommentMode,
  type CommentTarget,
  placeThreads,
  type ReviewThread,
  type Revision,
  type Side,
} from "@mihiraki/core";
import { useMemo, useState } from "preact/hooks";
import { SIDE_LABEL } from "../format";
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
  readonly onSubmitComment: (
    target: CommentTarget,
    body: string,
    mode: CommentMode,
  ) => Promise<void>;
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
          <div key={side}>{SIDE_LABEL[side]}</div>
        ))}
      </div>
      {rows.map((row, rowIndex) => (
        <div class="mhr-row" key={rowIndex}>
          {SIDES.map((side) => {
            const cellKey = `${rowIndex}:${side}`;
            const isSelectionSide = comment.selectedSide === side;
            return (
              <SplitCellView
                key={side}
                side={side}
                row={row}
                threads={placement.byRow[rowIndex]?.[side] ?? []}
                isActive={activeCell === cellKey}
                onActivate={() => setActiveCell(cellKey)}
                highlightedLines={isSelectionSide ? comment.range : null}
                formAfterLines={
                  isSelectionSide && comment.formAt?.rowIndex === rowIndex
                    ? comment.formAt.lines
                    : null
                }
                form={comment.form}
                onSelectionStart={(lines) => comment.selection.start(side, { rowIndex, lines })}
                onRequestComment={(lines) => comment.selection.open(side, { rowIndex, lines })}
                onPointerOverLines={(lines) => comment.selection.extend(side, { rowIndex, lines })}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
