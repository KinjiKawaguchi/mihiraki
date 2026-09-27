import type {
  ChangedFile,
  CommentMode,
  CommentTarget,
  ReviewBackend,
  ReviewThread,
} from "@better-gh-md/core";
import { useMemo } from "preact/hooks";
import { errorMessage } from "../format";
import { useAsync } from "../review-app/use-async";
import { SplitReview } from "../split-view/SplitReview";

export interface FileSplitReviewProps {
  readonly backend: ReviewBackend;
  readonly file: ChangedFile;
  /** Threads of the whole pull request; only this file's are shown. */
  readonly threads: readonly ReviewThread[];
  readonly onSubmitComment: (
    target: CommentTarget,
    body: string,
    mode: CommentMode,
  ) => Promise<void>;
}

/** Loads both versions of one file and shows them as a split review. */
export function FileSplitReview({ backend, file, threads, onSubmitComment }: FileSplitReviewProps) {
  const loaded = useAsync(
    async () => ({ path: file.path, versions: await backend.loadFileVersions(file) }),
    [backend, file.path],
  );
  const fileThreads = useMemo(
    () => threads.filter((thread) => thread.path === file.path),
    [threads, file.path],
  );
  const hasPendingReview = useMemo(() => threads.some((thread) => thread.isPending), [threads]);

  if (loaded.status === "error")
    return <p class="bgm-message bgm-message--error">{errorMessage(loaded.error)}</p>;
  if (!loaded.value || loaded.value.path !== file.path)
    return <p class="bgm-message">読み込み中…</p>;
  return (
    <SplitReview
      path={file.path}
      base={loaded.value.versions.base}
      head={loaded.value.versions.head}
      threads={fileThreads}
      hasPendingReview={hasPendingReview}
      onSubmitComment={onSubmitComment}
    />
  );
}
