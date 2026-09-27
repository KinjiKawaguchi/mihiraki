import type { ChangedFile, CommentTarget, ReviewBackend } from '@better-gh-md/core';
import { FileSplitReview } from '../file-review/FileSplitReview';
import { errorMessage } from '../format';
import { useThreadStore, type ThreadStore } from '../threads/thread-store';

export interface InlineFileReviewProps {
  readonly backend: ReviewBackend;
  readonly file: ChangedFile;
  readonly store: ThreadStore;
}

/** Split review of a single file, meant to be embedded where the host shows that file's diff. */
export function InlineFileReview({ backend, file, store }: InlineFileReviewProps) {
  const { threads, error } = useThreadStore(store);

  const submitComment = async (target: CommentTarget, body: string) => {
    await backend.postComment(target, body);
    await store.refresh();
  };

  return (
    <div class="bgm-root bgm-inline">
      {error !== null && <p class="bgm-message bgm-message--error">コメントを取得できません: {errorMessage(error)}</p>}
      <FileSplitReview backend={backend} file={file} threads={threads} onSubmitComment={submitComment} />
    </div>
  );
}
