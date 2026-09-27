import type { ChangedFile, ReviewBackend } from "@mihiraki/core";
import type { SubmitComment } from "../comment-form/submit-comment";
import { FileSplitReview } from "../file-review/FileSplitReview";
import { describeLoadFailure } from "../host-errors/describe";
import { I18nProvider, useMessages } from "../i18n/i18n";
import type { Locale } from "../i18n/locale";
import { type ThreadStore, useThreadStore } from "../threads/thread-store";

export interface InlineFileReviewProps {
  readonly backend: ReviewBackend;
  readonly file: ChangedFile;
  readonly store: ThreadStore;
  /** Host-specific hint on how to submit a pending review, shown while one exists. */
  readonly pendingReviewNotice?: string;
  /** Language of the UI; English by default. */
  readonly locale?: Locale;
}

function InlineFileReviewBody({
  backend,
  file,
  store,
  pendingReviewNotice,
}: Omit<InlineFileReviewProps, "locale">) {
  const t = useMessages();
  const { snapshot, error } = useThreadStore(store);

  const submitComment: SubmitComment = async (target, body, mode) => {
    const result = await backend.postComment(target, body, mode);
    // Also after a failure: the pending review or the revision may be what changed.
    await store.refresh();
    return result;
  };

  return (
    <div class="mhr-root mhr-inline">
      {error !== null && (
        <p class="mhr-message mhr-message--error">
          {describeLoadFailure(t, t.couldNotLoadComments, error)}
        </p>
      )}
      {snapshot?.hasPendingReview && pendingReviewNotice && (
        <p class="mhr-notice">{pendingReviewNotice}</p>
      )}
      <FileSplitReview
        backend={backend}
        file={file}
        threads={snapshot}
        onSubmitComment={submitComment}
      />
    </div>
  );
}

/** Split review of a single file, meant to be embedded where the host shows that file's diff. */
export function InlineFileReview({ locale = "en", ...props }: InlineFileReviewProps) {
  return (
    <I18nProvider locale={locale}>
      <InlineFileReviewBody {...props} />
    </I18nProvider>
  );
}
