import { type CommentMode, type CommentTarget, type Side, toCommentTarget } from "@mihiraki/core";
import { CommentForm } from "../comment-form/CommentForm";
import { selectionEnd, selectionRange, useBlockSelection } from "./block-selection";
import { lineElementAt, readLines } from "./rendered-dom";

interface CommentSelectionOptions {
  readonly path: string;
  readonly hasPendingReview: boolean;
  readonly onSubmitComment: (
    target: CommentTarget,
    body: string,
    mode: CommentMode,
  ) => Promise<void>;
}

function isSide(value: string | null): value is Side {
  return value === "LEFT" || value === "RIGHT";
}

/** Selection of blocks to comment on, the form for it, and the drag handling that extends it. */
export function useCommentSelection({
  path,
  hasPendingReview,
  onSubmitComment,
}: CommentSelectionOptions) {
  const selection = useBlockSelection();
  const current = selection.selection;
  const range = current ? selectionRange(current) : null;
  const target = current && range ? toCommentTarget(path, current.side, range) : null;

  const form = target && (
    <CommentForm
      target={target}
      hasPendingReview={hasPendingReview}
      onSubmit={async (body, mode) => {
        await onSubmitComment(target, body, mode);
        selection.clear();
      }}
      onCancel={selection.clear}
    />
  );

  const handleMouseMove = (event: MouseEvent) => {
    if (!current?.isDragging) return;
    const cell = (event.target as Element | null)?.closest?.("[data-row-index]");
    const content = cell?.querySelector(".markdown-body");
    const element = content ? lineElementAt(content, event.target, event.clientY) : null;
    const lines = element ? readLines(element) : null;
    const side = cell?.getAttribute("data-side") ?? null;
    if (!cell || !lines || !isSide(side)) return;
    selection.extend(side, { rowIndex: Number(cell.getAttribute("data-row-index")), lines });
  };

  return {
    selection,
    isDragging: current?.isDragging === true,
    selectedSide: current?.side ?? null,
    range,
    formAt: current && !current.isDragging ? selectionEnd(current) : null,
    form,
    handleMouseMove,
  };
}
