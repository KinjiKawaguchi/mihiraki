import type { CommentTarget, Revision, Side } from "@mihiraki/core";
import { CommentForm } from "../comment-form/CommentForm";
import type { SubmitComment } from "../comment-form/submit-comment";
import { selectionEnd, selectionRange, useBlockSelection } from "./block-selection";
import type { CommentCellProps } from "./SplitCellView";

interface CommentSelectionOptions {
  readonly path: string;
  /** Revision of the text being shown, which the selected lines refer to. */
  readonly revision: Revision;
  readonly hasPendingReview: boolean;
  readonly onSubmitComment: SubmitComment;
}

/** Selection of blocks to comment on and the form for it. */
export function useCommentSelection({
  path,
  revision,
  hasPendingReview,
  onSubmitComment,
}: CommentSelectionOptions) {
  const selection = useBlockSelection();
  const current = selection.selection;
  const range = current ? selectionRange(current) : null;
  const target: CommentTarget | null =
    current && range ? { path, side: current.side, lines: range, revision } : null;

  const form = current && target && (
    <CommentForm
      key={current.serial}
      target={target}
      hasPendingReview={hasPendingReview}
      onSubmit={async (body, mode) => {
        const result = await onSubmitComment(target, body, mode);
        if (result.ok) selection.clearIfCurrent(current.serial);
        return result;
      }}
      onCancel={selection.clear}
    />
  );

  const formAt = current?.phase === "composing" ? selectionEnd(current) : null;

  /** How the cell for `side` in row `rowIndex` shows and extends the selection. */
  const cellProps = (side: Side, rowIndex: number): CommentCellProps => {
    const isSelectionSide = current?.side === side;
    return {
      highlightedLines: isSelectionSide ? range : null,
      formAfterLines: isSelectionSide && formAt?.rowIndex === rowIndex ? formAt.lines : null,
      form,
      onSelectionStart: (lines) => selection.start(side, { rowIndex, lines }),
      onRequestComment: (lines) => selection.open(side, { rowIndex, lines }),
      onPointerOverLines: (lines) => selection.extend(side, { rowIndex, lines }),
    };
  };

  return { selection, isDragging: current?.phase === "dragging", cellProps };
}
