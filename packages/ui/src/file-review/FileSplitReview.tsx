import {
  type ChangedFile,
  isSameRevision,
  type ReviewBackend,
  type ThreadSnapshot,
} from "@mihiraki/core";
import { useMemo, useState } from "preact/hooks";
import type { SubmitComment } from "../comment-form/submit-comment";
import { describeLoadFailure } from "../host-errors/describe";
import { useAsync } from "../review-app/use-async";
import { SplitReview } from "../split-view/SplitReview";

export interface FileSplitReviewProps {
  readonly backend: ReviewBackend;
  readonly file: ChangedFile;
  /** Threads of the whole pull request (only this file's are shown); null until loaded. */
  readonly threads: ThreadSnapshot | null;
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

/**
 * Loads both versions of one file and shows them as a split review. Mount one per file
 * (keyed by its path), so a view never shows another file's text while loading.
 */
export function FileSplitReview({ backend, file, threads, onSubmitComment }: FileSplitReviewProps) {
  const [reloads, setReloads] = useState(0);
  const loaded = useAsync(() => backend.loadFileVersions(file), [backend, file, reloads]);
  const fileThreads = useMemo(
    () => threads?.threads.filter((thread) => thread.path === file.path) ?? [],
    [threads, file.path],
  );

  if (loaded.status === "failure")
    return (
      <p class="mhr-message mhr-message--error">
        {describeLoadFailure(`${file.path} を読み込めませんでした`, loaded.failure)}
      </p>
    );
  if (!loaded.value) return <p class="mhr-message">読み込み中…</p>;
  const versions = loaded.value;
  // Unknown until the threads are loaded; nothing is claimed about them before that.
  const isStale = threads !== null && !isSameRevision(threads.revision, versions.revision);
  return (
    <>
      {isStale && <StaleRevisionNotice onReload={() => setReloads((count) => count + 1)} />}
      <SplitReview
        path={file.path}
        base={versions.base}
        head={versions.head}
        threads={fileThreads}
        revision={versions.revision}
        hasPendingReview={threads?.hasPendingReview === true}
        onSubmitComment={onSubmitComment}
      />
    </>
  );
}
