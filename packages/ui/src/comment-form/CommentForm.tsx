import { availableCommentModes, type CommentMode } from "@mihiraki/core";
import { useState } from "preact/hooks";
import { useMessages } from "../i18n/i18n";
import type { Messages } from "../i18n/messages";
import { CommentPreview } from "./CommentPreview";
import { type SubmitDraft, useCommentDraft } from "./use-comment-draft";

interface CommentFormProps {
  /** What the comment is about, e.g. "Comment on R3"; a reply needs none. */
  readonly heading?: string;
  readonly hasPendingReview: boolean;
  /** On success the parent closes the form; a failure is shown in it. */
  readonly onSubmit: SubmitDraft;
  readonly onCancel: () => void;
}

function modeLabel(t: Messages, mode: CommentMode, hasPendingReview: boolean): string {
  if (mode === "single") return t.singleComment;
  return hasPendingReview ? t.addToReview : t.startReview;
}

function EditorTabs({
  isPreview,
  onChange,
}: {
  readonly isPreview: boolean;
  readonly onChange: (isPreview: boolean) => void;
}) {
  const t = useMessages();
  return (
    <div class="mhr-form__tabs" role="tablist">
      <button type="button" role="tab" aria-selected={!isPreview} onClick={() => onChange(false)}>
        {t.write}
      </button>
      <button type="button" role="tab" aria-selected={isPreview} onClick={() => onChange(true)}>
        {t.preview}
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
  const t = useMessages();
  return (
    <>
      {availableCommentModes(hasPendingReview).map((mode) => (
        <button
          key={mode}
          type="button"
          class={`mhr-button${mode === "review" ? " mhr-button--primary" : ""}`}
          disabled={!canSubmit}
          onClick={() => onSubmit(mode)}
        >
          {modeLabel(t, mode, hasPendingReview)}
        </button>
      ))}
    </>
  );
}

export function CommentForm({ heading, hasPendingReview, onSubmit, onCancel }: CommentFormProps) {
  const t = useMessages();
  const draft = useCommentDraft(onSubmit);
  const [isPreview, setIsPreview] = useState(false);
  // As in GitHub's own form, the shortcut keeps the comment for the review; publishing is a click.
  const shortcutMode: CommentMode = "review";

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && !draft.isSubmitting) onCancel();
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void draft.submit(shortcutMode);
  };

  return (
    <form class="mhr-form" onSubmit={(event) => event.preventDefault()}>
      {heading && <div class="mhr-form__target">{heading}</div>}
      <EditorTabs isPreview={isPreview} onChange={setIsPreview} />
      {isPreview ? (
        <CommentPreview body={draft.body} />
      ) : (
        <textarea
          class="mhr-form__body"
          value={draft.body}
          placeholder={t.bodyPlaceholder(modeLabel(t, shortcutMode, hasPendingReview))}
          onInput={(event) => draft.setBody((event.target as HTMLTextAreaElement).value)}
          onKeyDown={handleKeyDown}
          // biome-ignore lint/a11y/noAutofocus: the form opens because the reviewer asked to write, as on GitHub
          autoFocus
        />
      )}
      {draft.error && <p class="mhr-form__error">{draft.error}</p>}
      <div class="mhr-form__actions">
        <button type="button" class="mhr-button" disabled={draft.isSubmitting} onClick={onCancel}>
          {t.cancel}
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
