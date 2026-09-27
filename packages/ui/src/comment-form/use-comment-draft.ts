import { useState } from 'preact/hooks';
import { errorMessage } from '../format';

/** Text, submission state and error of a comment being written. */
export function useCommentDraft(onSubmit: (body: string) => Promise<void>) {
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = body.trim() !== '' && !isSubmitting;

  const submit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(body);
    } catch (submitError) {
      setError(errorMessage(submitError));
      setIsSubmitting(false);
    }
  };

  return { body, setBody, error, canSubmit, submit };
}
