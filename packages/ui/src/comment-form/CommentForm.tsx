import type { CommentMode, CommentTarget } from '@better-gh-md/core';
import { useState } from 'preact/hooks';
import { formatLineRange } from '../format';
import { CommentPreview } from './CommentPreview';
import { useCommentDraft } from './use-comment-draft';

interface CommentFormProps {
  readonly target: CommentTarget;
  readonly hasPendingReview: boolean;
  /** Resolves once the comment is stored; the parent then closes the form. */
  readonly onSubmit: (body: string, mode: CommentMode) => Promise<void>;
  readonly onCancel: () => void;
}

/**
 * While a review is pending GitHub only offers "Add review comment": posting a single
 * comment then would publish the whole pending review along with it.
 */
function submitModes(hasPendingReview: boolean): readonly { readonly mode: CommentMode; readonly label: string }[] {
  return hasPendingReview
    ? [{ mode: 'review', label: 'レビューに追加' }]
    : [
        { mode: 'single', label: 'コメント' },
        { mode: 'review', label: 'レビューを開始' },
      ];
}

export function CommentForm({ target, hasPendingReview, onSubmit, onCancel }: CommentFormProps) {
  const draft = useCommentDraft(onSubmit);
  const [isPreview, setIsPreview] = useState(false);
  const modes = submitModes(hasPendingReview);
  const shortcutMode: CommentMode = hasPendingReview ? 'review' : 'single';
  const lines = { start: target.startLine ?? target.line, end: target.line };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') onCancel();
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) void draft.submit(shortcutMode);
  };

  return (
    <form class="bgm-form" onSubmit={(event) => event.preventDefault()}>
      <div class="bgm-form__target">{formatLineRange(target.side, lines)} にコメント</div>
      <div class="bgm-form__tabs" role="tablist">
        <button type="button" role="tab" aria-selected={!isPreview} onClick={() => setIsPreview(false)}>
          書く
        </button>
        <button type="button" role="tab" aria-selected={isPreview} onClick={() => setIsPreview(true)}>
          プレビュー
        </button>
      </div>
      {isPreview ? (
        <CommentPreview body={draft.body} />
      ) : (
        <textarea
          class="bgm-form__body"
          value={draft.body}
          placeholder="コメントを書く（Markdown可、⌘/Ctrl+Enterで送信）"
          onInput={(event) => draft.setBody((event.target as HTMLTextAreaElement).value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      )}
      {draft.error && <p class="bgm-form__error">{draft.error}</p>}
      <div class="bgm-form__actions">
        <button type="button" class="bgm-button" onClick={onCancel}>
          キャンセル
        </button>
        {modes.map(({ mode, label }) => (
          <button
            key={mode}
            type="button"
            class={`bgm-button${mode === 'review' ? ' bgm-button--primary' : ''}`}
            disabled={!draft.canSubmit}
            onClick={() => void draft.submit(mode)}
          >
            {label}
          </button>
        ))}
      </div>
    </form>
  );
}
