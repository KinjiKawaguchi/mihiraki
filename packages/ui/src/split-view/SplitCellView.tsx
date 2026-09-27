import type { LineRange, ReviewThread, Side, SplitRow } from '@better-gh-md/core';
import type { ComponentChild } from 'preact';
import { ThreadList } from '../threads/ThreadList';
import { RenderedBlock } from './RenderedBlock';

export interface SplitCellViewProps {
  readonly side: Side;
  readonly row: SplitRow;
  readonly rowIndex: number;
  readonly threads: readonly ReviewThread[];
  readonly isActive: boolean;
  readonly onActivate: () => void;
  readonly highlightedLines: LineRange | null;
  readonly formAfterLines: LineRange | null;
  readonly form: ComponentChild;
  readonly onSelectionStart: (lines: LineRange) => void;
  readonly onRequestComment: (lines: LineRange) => void;
}

/** One side of one aligned row: the rendered block (if that side has one) and its threads. */
export function SplitCellView({ side, row, rowIndex, threads, ...blockProps }: SplitCellViewProps) {
  const cell = side === 'LEFT' ? row.left : row.right;
  return (
    <div class={`bgm-cell bgm-cell--${cell ? row.kind : 'empty'}`} data-side={side} data-row-index={rowIndex}>
      {cell && <RenderedBlock html={cell.html} {...blockProps} />}
      <ThreadList threads={threads} />
    </div>
  );
}
