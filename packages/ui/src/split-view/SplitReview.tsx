import {
  buildSplitRows,
  type CommentMode,
  type CommentTarget,
  groupThreadsByRow,
  type ReviewThread,
  type Side,
} from "@better-gh-md/core";
import { useMemo, useState } from "preact/hooks";
import { SIDE_LABEL } from "../format";
import { SplitCellView } from "./SplitCellView";
import { useCommentSelection } from "./use-comment-selection";

export interface SplitReviewProps {
  readonly path: string;
  readonly base: string;
  readonly head: string;
  readonly threads: readonly ReviewThread[];
  /** Whether the viewer already has an unsubmitted review on this pull request. */
  readonly hasPendingReview?: boolean;
  readonly onSubmitComment: (
    target: CommentTarget,
    body: string,
    mode: CommentMode,
  ) => Promise<void>;
}

const SIDES: readonly Side[] = ["LEFT", "RIGHT"];

/** Side-by-side rendered diff of one Markdown file with inline review comments. */
export function SplitReview({
  path,
  base,
  head,
  threads,
  hasPendingReview = false,
  onSubmitComment,
}: SplitReviewProps) {
  const rows = useMemo(() => buildSplitRows(base, head), [base, head]);
  const threadsByRow = useMemo(() => groupThreadsByRow(rows, threads), [rows, threads]);
  const [activeCell, setActiveCell] = useState<string | null>(null);
  const comment = useCommentSelection({ path, hasPendingReview, onSubmitComment });

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: tracks the pointer while dragging a selection from "+"
    <div
      class={`bgm-split${comment.isDragging ? " bgm-split--selecting" : ""}`}
      onMouseMove={comment.handleMouseMove}
      onMouseUp={comment.selection.finish}
    >
      <div class="bgm-split__header">
        <div>{SIDE_LABEL.LEFT}</div>
        <div>{SIDE_LABEL.RIGHT}</div>
      </div>
      {rows.map((row, rowIndex) => (
        <div class="bgm-row" key={rowIndex}>
          {SIDES.map((side) => {
            const cellKey = `${rowIndex}:${side}`;
            const isSelectionSide = comment.selectedSide === side;
            const rowThreads = threadsByRow[rowIndex];
            return (
              <SplitCellView
                key={side}
                side={side}
                row={row}
                rowIndex={rowIndex}
                threads={(side === "LEFT" ? rowThreads?.left : rowThreads?.right) ?? []}
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
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
