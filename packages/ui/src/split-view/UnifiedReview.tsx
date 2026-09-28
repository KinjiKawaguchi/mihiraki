import { buildSplitRows, placeThreads, unifiedCell } from "@mihiraki/core";
import { useMemo, useState } from "preact/hooks";
import { UnplacedThreads } from "../threads/ThreadList";
import { SplitCellView } from "./SplitCellView";
import type { SplitReviewProps } from "./SplitReview";
import { useCommentSelection } from "./use-comment-selection";

export type UnifiedReviewProps = SplitReviewProps;

/**
 * Rendered diff of one Markdown file in a single column: each block once, changed words
 * marked in place, removed blocks from the base version. Every block can be commented on.
 */
export function UnifiedReview({
  path,
  base,
  head,
  threads,
  revision,
  hasPendingReview = false,
  onSubmitComment,
}: UnifiedReviewProps) {
  const rows = useMemo(() => buildSplitRows(base, head), [base, head]);
  const cells = useMemo(() => rows.map(unifiedCell), [rows]);
  const placement = useMemo(() => placeThreads(rows, threads), [rows, threads]);
  const [activeRow, setActiveRow] = useState<number | null>(null);
  const comment = useCommentSelection({ path, revision, hasPendingReview, onSubmitComment });

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: ends a selection dragged from "+" (the window listener starts only after rendering)
    <div
      class={`mhr-split mhr-unified${comment.isDragging ? " mhr-split--selecting" : ""}`}
      onMouseUp={comment.selection.finish}
    >
      <UnplacedThreads threads={placement.unplaced} />
      {rows.map((row, rowIndex) => {
        const shown = cells[rowIndex];
        if (!shown) return null;
        const rowThreads = placement.byRow[rowIndex];
        return (
          <div class="mhr-row" key={rowIndex}>
            <SplitCellView
              side={shown.side}
              cell={shown.cell}
              kind={row.kind}
              threads={[...(rowThreads?.base ?? []), ...(rowThreads?.head ?? [])]}
              isActive={activeRow === rowIndex}
              onActivate={() => setActiveRow(rowIndex)}
              {...comment.cellProps(shown.side, rowIndex)}
            />
          </div>
        );
      })}
    </div>
  );
}
