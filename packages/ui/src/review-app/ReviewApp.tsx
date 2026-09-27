import type { ReviewBackend } from "@mihiraki/core";
import { useEffect, useMemo, useState } from "preact/hooks";
import type { SubmitComment } from "../comment-form/submit-comment";
import { FileSplitReview } from "../file-review/FileSplitReview";
import { describeLoadFailure } from "../host-errors/describe";
import { createThreadStore, useThreadStore } from "../threads/thread-store";
import { FileList } from "./FileList";
import { useAsync } from "./use-async";

export interface ReviewAppProps {
  readonly backend: ReviewBackend;
  readonly onClose?: () => void;
}

/** File picker plus split review for every changed Markdown file a backend exposes. */
export function ReviewApp({ backend, onClose }: ReviewAppProps) {
  const files = useAsync(() => backend.listChangedMarkdownFiles(), [backend]);
  const store = useMemo(() => createThreadStore(backend), [backend]);
  const threads = useThreadStore(store);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  useEffect(() => {
    void store.refresh();
  }, [store]);

  const fileList = files.value ?? [];
  const selected = fileList.find((file) => file.path === selectedPath) ?? fileList[0] ?? null;

  const submitComment: SubmitComment = async (target, body, mode) => {
    const result = await backend.postComment(target, body, mode);
    // Also after a failure: the pending review or the revision may be what changed.
    await store.refresh();
    return result;
  };

  const renderBody = () => {
    if (files.status === "failure")
      return (
        <p class="mhr-message mhr-message--error">
          {describeLoadFailure("変更されたファイルを読み込めませんでした", files.failure)}
        </p>
      );
    if (files.status === "loading") return <p class="mhr-message">読み込み中…</p>;
    if (!selected) return <p class="mhr-message">このPRにMarkdownファイルの変更はありません。</p>;
    return (
      <>
        {fileList.length > 1 && (
          <FileList files={fileList} selectedPath={selected.path} onSelect={setSelectedPath} />
        )}
        <main class="mhr-app__main">
          <FileSplitReview
            backend={backend}
            file={selected}
            threads={threads.threads}
            threadsRevision={threads.revision}
            hasPendingReview={threads.hasPendingReview}
            onSubmitComment={submitComment}
          />
        </main>
      </>
    );
  };

  return (
    <div class="mhr-root mhr-app">
      <header class="mhr-app__header">
        <span class="mhr-app__title">Markdown 分割レビュー</span>
        {selected && <code class="mhr-app__path">{selected.path}</code>}
        {threads.error !== null && (
          <span class="mhr-message--error">
            {describeLoadFailure("コメントを取得できませんでした", threads.error)}
          </span>
        )}
        {onClose && (
          <button
            type="button"
            class="mhr-button mhr-app__close"
            aria-label="閉じる"
            onClick={onClose}
          >
            ×
          </button>
        )}
      </header>
      <div class="mhr-app__body">{renderBody()}</div>
    </div>
  );
}
