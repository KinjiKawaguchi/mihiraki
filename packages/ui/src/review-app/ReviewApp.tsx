import type { CommentMode, CommentTarget, ReviewBackend } from '@better-gh-md/core';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { FileSplitReview } from '../file-review/FileSplitReview';
import { errorMessage } from '../format';
import { createThreadStore, useThreadStore } from '../threads/thread-store';
import { FileList } from './FileList';
import { useAsync } from './use-async';

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

  const submitComment = async (target: CommentTarget, body: string, mode: CommentMode) => {
    await backend.postComment(target, body, mode);
    await store.refresh();
  };

  const renderBody = () => {
    if (files.status === 'error') return <p class="bgm-message bgm-message--error">{errorMessage(files.error)}</p>;
    if (files.status === 'loading') return <p class="bgm-message">読み込み中…</p>;
    if (!selected) return <p class="bgm-message">このPRにMarkdownファイルの変更はありません。</p>;
    return (
      <>
        {fileList.length > 1 && <FileList files={fileList} selectedPath={selected.path} onSelect={setSelectedPath} />}
        <main class="bgm-app__main">
          <FileSplitReview backend={backend} file={selected} threads={threads.threads} onSubmitComment={submitComment} />
        </main>
      </>
    );
  };

  return (
    <div class="bgm-root bgm-app">
      <header class="bgm-app__header">
        <span class="bgm-app__title">Markdown 分割レビュー</span>
        {selected && <code class="bgm-app__path">{selected.path}</code>}
        {threads.error !== null && (
          <span class="bgm-message--error">コメントを取得できません: {errorMessage(threads.error)}</span>
        )}
        {onClose && (
          <button type="button" class="bgm-button bgm-app__close" aria-label="閉じる" onClick={onClose}>
            ×
          </button>
        )}
      </header>
      <div class="bgm-app__body">{renderBody()}</div>
    </div>
  );
}
