import type { CommentMode } from "@mihiraki/core";
import { useState } from "preact/hooks";
import { errorMessage } from "../format";
import { useMessages } from "../i18n/i18n";
import { describePostCommentError } from "./post-error-message";
import type { SubmitComment } from "./submit-comment";

/** Posts the draft; expected failures come back as values. */
export type SubmitDraft = (body: string, mode: CommentMode) => ReturnType<SubmitComment>;

/** Text, submission state and error of a comment being written. */
export function useCommentDraft(onSubmit: SubmitDraft) {
  const t = useMessages();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = body.trim() !== "" && !isSubmitting;

  const submit = async (mode: CommentMode) => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    const failure = await onSubmit(body, mode).then(
      (result) => (result.ok ? null : describePostCommentError(t, result.error)),
      // A rejection is a bug, not a foreseeable failure; still keep the draft usable.
      (unexpected: unknown) => errorMessage(unexpected),
    );
    // On success the parent closes the form.
    if (failure === null) return;
    setError(failure);
    setIsSubmitting(false);
  };

  return { body, setBody, error, isSubmitting, canSubmit, submit };
}
