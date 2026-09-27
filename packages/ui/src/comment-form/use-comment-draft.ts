import type { CommentMode } from "@mihiraki/core";
import { useState } from "preact/hooks";
import { errorMessage } from "../format";

/** Text, submission state and error of a comment being written. */
export function useCommentDraft(onSubmit: (body: string, mode: CommentMode) => Promise<void>) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = body.trim() !== "" && !isSubmitting;

  const submit = async (mode: CommentMode) => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(body, mode);
    } catch (submitError) {
      setError(errorMessage(submitError));
      setIsSubmitting(false);
    }
  };

  return { body, setBody, error, isSubmitting, canSubmit, submit };
}
