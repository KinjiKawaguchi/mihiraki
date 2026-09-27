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

/** GitHub's wording changes once a review is in progress; so do the defaults. */
function submitLabels(hasPendingReview: boolean): Readonly<Record<CommentMode, string>> {
  return hasPendingReview ? { single: '単発でコメント', review: 'レビューに追加' } : { single: 'コメント', review: 'レビューを開始' };
}

export function CommentForm({ target, hasPendingReview, onSubmit, onCancel }: CommentFormProps) {
  const draft = useCommentDraft(onSubmit);
  const [isPreview, setIsPreview] = useState(false);
  const labels = submitLabels(hasPendingReview);
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
        <button type="button" class="bgm-button" disabled={!draft.canSubmit} onClick={() => void draft.submit('single')}>
          {labels.single}
        </button>
        <button type="button" class="bgm-button bgm-button--primary" disabled={!draft.canSubmit} onClick={() => void draft.submit('review')}>
          {labels.review}
        </button>
      </div>
    </form>
  );
}
