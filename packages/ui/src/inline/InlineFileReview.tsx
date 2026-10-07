import type { ChangedFile, ReviewBackend } from "@mihiraki/core";
import { useMemo } from "preact/hooks";
import type { SubmitComment } from "../comment-form/submit-comment";
import { type DiagramRenderer, DiagramRendererContext } from "../diagrams/diagrams";
import { FileSplitReview } from "../file-review/FileSplitReview";
import { describeLoadFailure } from "../host-errors/describe";
import { I18nProvider, useMessages } from "../i18n/i18n";
import type { Locale } from "../i18n/locale";
import type { DiffLayout } from "../split-view/layout";
import { createThreadActions, ThreadActionsContext } from "../threads/thread-actions";
import { type ThreadStore, useThreadStore } from "../threads/thread-store";

export interface InlineFileReviewProps {
  readonly backend: ReviewBackend;
  readonly file: ChangedFile;
  readonly store: ThreadStore;
  /** Host-specific hint on how to submit a pending review, shown while one exists. */
  readonly pendingReviewNotice?: string;
  /** Language of the UI; English by default. */
  readonly locale?: Locale;
  /** Two columns (base | head) or one, as the host shows diffs; split by default. */
  readonly layout?: DiffLayout;
  /** Draws diagrams as the host does; without it they stay code blocks. */
  readonly renderDiagram?: DiagramRenderer;
}

function InlineFileReviewBody({
  backend,
  file,
  store,
  pendingReviewNotice,
  layout,
}: Omit<InlineFileReviewProps, "locale" | "renderDiagram">) {
  const t = useMessages();
  const { snapshot, error } = useThreadStore(store);
  const hasPendingReview = snapshot?.hasPendingReview === true;
  const threadActions = useMemo(
    () => createThreadActions(backend, store, hasPendingReview),
    [backend, store, hasPendingReview],
  );

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
      {hasPendingReview && pendingReviewNotice && <p class="mhr-notice">{pendingReviewNotice}</p>}
      <ThreadActionsContext.Provider value={threadActions}>
        <FileSplitReview
          backend={backend}
          file={file}
          threads={snapshot}
          layout={layout}
          onSubmitComment={submitComment}
        />
      </ThreadActionsContext.Provider>
    </div>
  );
}

/** Split review of a single file, meant to be embedded where the host shows that file's diff. */
export function InlineFileReview({
  locale = "en",
  renderDiagram,
  ...props
}: InlineFileReviewProps) {
  return (
    <I18nProvider locale={locale}>
      <DiagramRendererContext.Provider value={renderDiagram ?? null}>
        <InlineFileReviewBody {...props} />
      </DiagramRendererContext.Provider>
    </I18nProvider>
  );
}
