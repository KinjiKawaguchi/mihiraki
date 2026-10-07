import type { EditCommentError, ReviewComment, ReviewThread } from "@mihiraki/core";
import { useState } from "preact/hooks";
import { CommentPreview } from "../comment-form/CommentPreview";
import { EditorTabs } from "../comment-form/EditorTabs";
import { errorMessage } from "../format";
import { describeHostFailure } from "../host-errors/describe";
import { useMessages } from "../i18n/i18n";
import type { Messages } from "../i18n/messages";
import type { ThreadActions } from "./thread-actions";

function describeEditError(t: Messages, error: EditCommentError): string {
  return error.kind === "editConflict"
    ? t.editConflict
    : describeHostFailure(t, t.couldNotEditComment, error);
}

interface CommentEditorProps {
  readonly thread: ReviewThread;
  readonly comment: ReviewComment;
  readonly actions: ThreadActions;
  /** Called on Cancel and once the edit is saved. */
  readonly onDone: () => void;
}

/**
 * The comment's text, edited in place of the comment as on GitHub. The edit is based on the
 * version it started from, so a change that arrives meanwhile (hidden behind the editor) is
 * not overwritten silently; once the reviewer has been told, saving again overwrites it.
 */
function useCommentEdit({ thread, comment, actions, onDone }: CommentEditorProps) {
  const t = useMessages();
  const [body, setBody] = useState(comment.bodyMarkdown);
  const [startVersion] = useState(comment.version);
  const [isOverwriting, setIsOverwriting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const canSave = body.trim() !== "" && !isSaving;

  const save = async () => {
    if (!canSave) return;
    setIsSaving(true);
    setError(null);
    const base = { ...comment, version: isOverwriting ? comment.version : startVersion };
    try {
      const result = await actions.editComment(thread, base, body);
      if (result.ok) {
        onDone();
        return;
      }
      setIsOverwriting(result.error.kind === "editConflict");
      setError(describeEditError(t, result.error));
    } catch (unexpected) {
      // A rejection is a bug, not a foreseeable failure; still keep the draft usable.
      setError(errorMessage(unexpected));
    }
    setIsSaving(false);
  };

  return { body, setBody, error, isSaving, canSave, save };
}

export function CommentEditor(props: CommentEditorProps) {
  const t = useMessages();
  const edit = useCommentEdit(props);
  const [isPreview, setIsPreview] = useState(false);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && !edit.isSaving) props.onDone();
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) void edit.save();
  };

  return (
    <form class="mhr-form mhr-form--edit" onSubmit={(event) => event.preventDefault()}>
      <EditorTabs isPreview={isPreview} onChange={setIsPreview} />
      {isPreview ? (
        <CommentPreview body={edit.body} />
      ) : (
        <textarea
          class="mhr-form__body"
          value={edit.body}
          onInput={(event) => edit.setBody((event.target as HTMLTextAreaElement).value)}
          onKeyDown={handleKeyDown}
          // biome-ignore lint/a11y/noAutofocus: the editor opens because the reviewer chose Edit, as on GitHub
          autoFocus
        />
      )}
      {edit.error && <p class="mhr-form__error">{edit.error}</p>}
      <div class="mhr-form__actions">
        <button type="button" class="mhr-button" disabled={edit.isSaving} onClick={props.onDone}>
          {t.cancel}
        </button>
        <button
          type="button"
          class="mhr-button mhr-button--primary"
          disabled={!edit.canSave}
          onClick={() => void edit.save()}
        >
          {t.updateComment}
        </button>
      </div>
    </form>
  );
}
