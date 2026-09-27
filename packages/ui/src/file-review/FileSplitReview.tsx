import {
  type ChangedFile,
  isSameRevision,
  type ReviewBackend,
  type ReviewThread,
  type Revision,
} from "@mihiraki/core";
import { useMemo, useState } from "preact/hooks";
import type { SubmitComment } from "../comment-form/submit-comment";
import { errorMessage } from "../format";
import { useAsync } from "../review-app/use-async";
import { SplitReview } from "../split-view/SplitReview";

export interface FileSplitReviewProps {
  readonly backend: ReviewBackend;
  readonly file: ChangedFile;
  /** Threads of the whole pull request; only this file's are shown. */
  readonly threads: readonly ReviewThread[];
  /** Revision the threads were loaded for; null while unknown. */
  readonly threadsRevision: Revision | null;
  /** Whether the viewer has an unsubmitted review on the pull request. */
  readonly hasPendingReview: boolean;
  readonly onSubmitComment: SubmitComment;
}

function StaleRevisionNotice({ onReload }: { readonly onReload: () => void }) {
  return (
    <p class="mhr-notice mhr-notice--stale">
      このPRは表示中の版から更新されています。コメントの位置は表示中の版に対して付きます。
      <button type="button" class="mhr-button" onClick={onReload}>
        最新の版を読み込む
      </button>
    </p>
  );
}

/** Loads both versions of one file and shows them as a split review. */
export function FileSplitReview({
  backend,
  file,
  threads,
  threadsRevision,
  hasPendingReview,
  onSubmitComment,
}: FileSplitReviewProps) {
  const [reloads, setReloads] = useState(0);
  const loaded = useAsync(
    async () => ({ path: file.path, versions: await backend.loadFileVersions(file) }),
    [backend, file.path, reloads],
  );
  const fileThreads = useMemo(
    () => threads.filter((thread) => thread.path === file.path),
    [threads, file.path],
  );

  if (loaded.status === "error")
    return <p class="mhr-message mhr-message--error">{errorMessage(loaded.error)}</p>;
  if (!loaded.value || loaded.value.path !== file.path)
    return <p class="mhr-message">読み込み中…</p>;
  const { versions } = loaded.value;
  const isStale = threadsRevision !== null && !isSameRevision(threadsRevision, versions.revision);
  return (
    <>
      {isStale && <StaleRevisionNotice onReload={() => setReloads((count) => count + 1)} />}
      <SplitReview
        path={file.path}
        base={versions.base}
        head={versions.head}
        threads={fileThreads}
        revision={versions.revision}
        hasPendingReview={hasPendingReview}
        onSubmitComment={onSubmitComment}
      />
    </>
  );
}
