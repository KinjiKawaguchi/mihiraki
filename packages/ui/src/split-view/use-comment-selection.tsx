import type { CommentTarget, Revision } from "@mihiraki/core";
import { CommentForm } from "../comment-form/CommentForm";
import type { SubmitComment } from "../comment-form/submit-comment";
import { selectionEnd, selectionRange, useBlockSelection } from "./block-selection";

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

  return {
    selection,
    isDragging: current?.phase === "dragging",
    selectedSide: current?.side ?? null,
    range,
    formAt: current?.phase === "composing" ? selectionEnd(current) : null,
    form,
  };
}
