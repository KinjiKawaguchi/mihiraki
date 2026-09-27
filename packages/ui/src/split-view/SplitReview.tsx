import {
  buildSplitRows,
  computeCommentableLines,
  groupThreadsByRow,
  resolveCommentTarget,
  type CommentTarget,
  type LineRange,
  type ReviewThread,
  type Side,
  type SplitCell,
  type SplitRow,
} from '@better-gh-md/core';
import { useMemo, useState } from 'preact/hooks';
import { CommentForm } from '../comment-form/CommentForm';
import { SIDE_LABEL } from '../format';
import { ThreadList } from '../threads/ThreadList';
import { RenderedBlock } from './RenderedBlock';

export interface SplitReviewProps {
  readonly path: string;
  readonly base: string;
  readonly head: string;
  readonly threads: readonly ReviewThread[];
  readonly onSubmitComment: (target: CommentTarget, body: string) => Promise<void>;
}

interface Draft {
  readonly rowIndex: number;
  readonly side: Side;
  readonly lines: LineRange;
}

interface CellViewProps {
  readonly side: Side;
  readonly row: SplitRow;
  readonly threads: readonly ReviewThread[];
  readonly form: preact.ComponentChild;
  readonly isActive: boolean;
  readonly onActivate: () => void;
  readonly onRequestComment: (lines: LineRange) => void;
}

function CellView({ side, row, threads, form, isActive, onActivate, onRequestComment }: CellViewProps) {
  const cell: SplitCell | null = side === 'LEFT' ? row.left : row.right;
  const modifier = cell ? row.kind : 'empty';
  return (
    <div class={`bgm-cell bgm-cell--${modifier}`} data-side={side}>
      {cell && (
        <RenderedBlock html={cell.html} isActive={isActive} onActivate={onActivate} onRequestComment={onRequestComment} />
      )}
      <ThreadList threads={threads} />
      {form}
    </div>
  );
}

/** Side-by-side rendered diff of one Markdown file with inline review comments. */
export function SplitReview({ path, base, head, threads, onSubmitComment }: SplitReviewProps) {
  const rows = useMemo(() => buildSplitRows(base, head), [base, head]);
  const commentable = useMemo(() => computeCommentableLines(base, head), [base, head]);
  const threadsByRow = useMemo(() => groupThreadsByRow(rows, threads), [rows, threads]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [activeCell, setActiveCell] = useState<string | null>(null);

  const renderForm = (rowIndex: number, side: Side) => {
    if (!draft || draft.rowIndex !== rowIndex || draft.side !== side) return null;
    const resolved = resolveCommentTarget(path, side, draft.lines, commentable);
    const submit = async (body: string) => {
      await onSubmitComment(resolved.target, body);
      setDraft(null);
    };
    return (
      <CommentForm
        target={resolved.target}
        isInsideDiff={resolved.isInsideDiff}
        onSubmit={submit}
        onCancel={() => setDraft(null)}
      />
    );
  };

  return (
    <div class="bgm-split">
      <div class="bgm-split__header">
        <div>{SIDE_LABEL.LEFT}</div>
        <div>{SIDE_LABEL.RIGHT}</div>
      </div>
      {rows.map((row, rowIndex) => (
        <div class="bgm-row" key={rowIndex}>
          {(['LEFT', 'RIGHT'] as const).map((side) => (
            <CellView
              key={side}
              side={side}
              row={row}
              threads={side === 'LEFT' ? (threadsByRow[rowIndex]?.left ?? []) : (threadsByRow[rowIndex]?.right ?? [])}
              form={renderForm(rowIndex, side)}
              isActive={activeCell === `${rowIndex}:${side}`}
              onActivate={() => setActiveCell(`${rowIndex}:${side}`)}
              onRequestComment={(lines) => setDraft({ rowIndex, side, lines })}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
