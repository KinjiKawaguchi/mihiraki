import type { LineRange, ReviewThread, RowKind, Side, SplitCell } from "@mihiraki/core";
import type { ComponentChild } from "preact";
import { ThreadList } from "../threads/ThreadList";
import { RenderedBlock } from "./RenderedBlock";

/** What a cell needs to take part in selecting blocks and commenting on them. */
export interface CommentCellProps {
  readonly highlightedLines: LineRange | null;
  readonly formAfterLines: LineRange | null;
  readonly form: ComponentChild;
  readonly onSelectionStart: (lines: LineRange) => void;
  readonly onRequestComment: (lines: LineRange) => void;
  readonly onPointerOverLines: (lines: LineRange) => void;
}

export interface SplitCellViewProps extends CommentCellProps {
  readonly side: Side;
  /** The block shown, or null where this side has none in a split view. */
  readonly cell: SplitCell | null;
  readonly kind: RowKind;
  readonly threads: readonly ReviewThread[];
  readonly isActive: boolean;
  readonly onActivate: () => void;
}

/** One cell of an aligned row: the rendered block (if there is one) and its threads. */
export function SplitCellView({ side, cell, kind, threads, ...blockProps }: SplitCellViewProps) {
  return (
    <div class={`mhr-cell mhr-cell--${cell ? kind : "empty"}`} data-side={side}>
      {cell && (
        <RenderedBlock html={cell.html} isDiagram={cell.block.kind === "diagram"} {...blockProps} />
      )}
      <ThreadList threads={threads} />
    </div>
  );
}
