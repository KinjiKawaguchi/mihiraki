import type { CommentTarget } from '@better-gh-md/core';
import { formatLineRange, SIDE_LABEL } from '../format';
import { useCommentDraft } from './use-comment-draft';

interface CommentFormProps {
  readonly target: CommentTarget;
  readonly isInsideDiff: boolean;
  /** Resolves once the comment is stored; the parent then closes the form. */
  readonly onSubmit: (body: string) => Promise<void>;
  readonly onCancel: () => void;
}

export function CommentForm({ target, isInsideDiff, onSubmit, onCancel }: CommentFormProps) {
  const draft = useCommentDraft(onSubmit);
  const lines = { start: target.startLine ?? target.line, end: target.line };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') onCancel();
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) void draft.submit();
  };

  return (
    <form
      class="bgm-form"
      onSubmit={(event) => {
        event.preventDefault();
        void draft.submit();
      }}
    >
      <div class="bgm-form__target">
        {SIDE_LABEL[target.side]} {formatLineRange(lines)} にコメント
      </div>
      {!isInsideDiff && (
        <p class="bgm-form__warning">この範囲は差分の外にあるため、GitHubに拒否される可能性があります。</p>
      )}
      <textarea
        class="bgm-form__body"
        value={draft.body}
        placeholder="コメントを書く（Markdown可、⌘/Ctrl+Enterで送信）"
        onInput={(event) => draft.setBody((event.target as HTMLTextAreaElement).value)}
        onKeyDown={handleKeyDown}
        autoFocus
      />
      {draft.error && <p class="bgm-form__error">{draft.error}</p>}
      <div class="bgm-form__actions">
        <button type="button" class="bgm-button" onClick={onCancel}>
          キャンセル
        </button>
        <button type="submit" class="bgm-button bgm-button--primary" disabled={!draft.canSubmit}>
          コメントする
        </button>
      </div>
    </form>
  );
}
