import type { CommentMode, CommentTarget } from "@mihiraki/core";
import { useState } from "preact/hooks";
import { formatLineRange } from "../format";
import { CommentPreview } from "./CommentPreview";
import { useCommentDraft } from "./use-comment-draft";

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
function submitModes(
  hasPendingReview: boolean,
): readonly { readonly mode: CommentMode; readonly label: string }[] {
  return hasPendingReview
    ? [{ mode: "review", label: "レビューに追加" }]
    : [
        { mode: "single", label: "コメント" },
        { mode: "review", label: "レビューを開始" },
      ];
}

function EditorTabs({
  isPreview,
  onChange,
}: {
  readonly isPreview: boolean;
  readonly onChange: (isPreview: boolean) => void;
}) {
  return (
    <div class="mhr-form__tabs" role="tablist">
      <button type="button" role="tab" aria-selected={!isPreview} onClick={() => onChange(false)}>
        書く
      </button>
      <button type="button" role="tab" aria-selected={isPreview} onClick={() => onChange(true)}>
        プレビュー
      </button>
    </div>
  );
}

interface SubmitButtonsProps {
  readonly hasPendingReview: boolean;
  readonly canSubmit: boolean;
  readonly onSubmit: (mode: CommentMode) => void;
}

function SubmitButtons({ hasPendingReview, canSubmit, onSubmit }: SubmitButtonsProps) {
  return (
    <>
      {submitModes(hasPendingReview).map(({ mode, label }) => (
        <button
          key={mode}
          type="button"
          class={`mhr-button${mode === "review" ? " mhr-button--primary" : ""}`}
          disabled={!canSubmit}
          onClick={() => onSubmit(mode)}
        >
          {label}
        </button>
      ))}
    </>
  );
}

export function CommentForm({ target, hasPendingReview, onSubmit, onCancel }: CommentFormProps) {
  const draft = useCommentDraft(onSubmit);
  const [isPreview, setIsPreview] = useState(false);
  const shortcutMode: CommentMode = hasPendingReview ? "review" : "single";
  const lines = { start: target.startLine ?? target.line, end: target.line };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && !draft.isSubmitting) onCancel();
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void draft.submit(shortcutMode);
  };

  return (
    <form class="mhr-form" onSubmit={(event) => event.preventDefault()}>
      <div class="mhr-form__target">{formatLineRange(target.side, lines)} にコメント</div>
      <EditorTabs isPreview={isPreview} onChange={setIsPreview} />
      {isPreview ? (
        <CommentPreview body={draft.body} />
      ) : (
        <textarea
          class="mhr-form__body"
          value={draft.body}
          placeholder="コメントを書く（Markdown可、⌘/Ctrl+Enterで送信）"
          onInput={(event) => draft.setBody((event.target as HTMLTextAreaElement).value)}
          onKeyDown={handleKeyDown}
          // biome-ignore lint/a11y/noAutofocus: the form opens because the reviewer asked to write, as on GitHub
          autoFocus
        />
      )}
      {draft.error && <p class="mhr-form__error">{draft.error}</p>}
      <div class="mhr-form__actions">
        <button type="button" class="mhr-button" disabled={draft.isSubmitting} onClick={onCancel}>
          キャンセル
        </button>
        <SubmitButtons
          hasPendingReview={hasPendingReview}
          canSubmit={draft.canSubmit}
          onSubmit={(mode) => void draft.submit(mode)}
        />
      </div>
    </form>
  );
}
