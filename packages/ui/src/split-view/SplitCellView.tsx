import type { LineRange, ReviewThread, Side, SplitRow } from "@mihiraki/core";
import type { ComponentChild } from "preact";
import { ThreadList } from "../threads/ThreadList";
import { RenderedBlock } from "./RenderedBlock";

export interface SplitCellViewProps {
  readonly side: Side;
  readonly row: SplitRow;
  readonly threads: readonly ReviewThread[];
  readonly isActive: boolean;
  readonly onActivate: () => void;
  readonly highlightedLines: LineRange | null;
  readonly formAfterLines: LineRange | null;
  readonly form: ComponentChild;
  readonly onSelectionStart: (lines: LineRange) => void;
  readonly onRequestComment: (lines: LineRange) => void;
  readonly onPointerOverLines: (lines: LineRange) => void;
}

/** One side of one aligned row: the rendered block (if that side has one) and its threads. */
export function SplitCellView({ side, row, threads, ...blockProps }: SplitCellViewProps) {
  const cell = row[side];
  return (
    <div class={`mhr-cell mhr-cell--${cell ? row.kind : "empty"}`} data-side={side}>
      {cell && <RenderedBlock html={cell.html} {...blockProps} />}
      <ThreadList threads={threads} />
    </div>
  );
}
