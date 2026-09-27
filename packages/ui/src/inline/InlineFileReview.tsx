import type { ChangedFile, CommentMode, CommentTarget, ReviewBackend } from '@better-gh-md/core';
import { FileSplitReview } from '../file-review/FileSplitReview';
import { errorMessage } from '../format';
import { useThreadStore, type ThreadStore } from '../threads/thread-store';

export interface InlineFileReviewProps {
  readonly backend: ReviewBackend;
  readonly file: ChangedFile;
  readonly store: ThreadStore;
  /** Host-specific hint on how to submit a pending review, shown while one exists. */
  readonly pendingReviewNotice?: string;
}

/** Split review of a single file, meant to be embedded where the host shows that file's diff. */
export function InlineFileReview({ backend, file, store, pendingReviewNotice }: InlineFileReviewProps) {
  const { threads, error } = useThreadStore(store);
  const hasPendingReview = threads.some((thread) => thread.isPending);

  const submitComment = async (target: CommentTarget, body: string, mode: CommentMode) => {
    await backend.postComment(target, body, mode);
    await store.refresh();
  };

  return (
    <div class="bgm-root bgm-inline">
      {error !== null && <p class="bgm-message bgm-message--error">コメントを取得できません: {errorMessage(error)}</p>}
      {hasPendingReview && pendingReviewNotice && <p class="bgm-notice">{pendingReviewNotice}</p>}
      <FileSplitReview backend={backend} file={file} threads={threads} onSubmitComment={submitComment} />
    </div>
  );
}
