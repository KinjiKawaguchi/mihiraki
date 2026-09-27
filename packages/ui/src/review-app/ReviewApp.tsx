import type { ChangedFile, ReviewBackend, ThreadSnapshot } from "@mihiraki/core";
import { useEffect, useMemo, useState } from "preact/hooks";
import type { SubmitComment } from "../comment-form/submit-comment";
import { FileSplitReview } from "../file-review/FileSplitReview";
import { describeLoadFailure } from "../host-errors/describe";
import type { LoadFailure } from "../host-errors/load-failure";
import { I18nProvider, useMessages } from "../i18n/i18n";
import type { Locale } from "../i18n/locale";
import { createThreadStore, useThreadStore } from "../threads/thread-store";
import { FileList } from "./FileList";
import { type AsyncState, useAsync } from "./use-async";

export interface ReviewAppProps {
  readonly backend: ReviewBackend;
  readonly onClose?: () => void;
  /** Language of the UI; English by default. */
  readonly locale?: Locale;
}

interface AppHeaderProps {
  readonly path: string | null;
  readonly threadsFailure: LoadFailure | null;
  readonly onClose: (() => void) | undefined;
}

function AppHeader({ path, threadsFailure, onClose }: AppHeaderProps) {
  const t = useMessages();
  return (
    <header class="mhr-app__header">
      <span class="mhr-app__title">{t.appTitle}</span>
      {path && <code class="mhr-app__path">{path}</code>}
      {threadsFailure !== null && (
        <span class="mhr-message--error">
          {describeLoadFailure(t, t.couldNotLoadComments, threadsFailure)}
        </span>
      )}
      {onClose && (
        <button
          type="button"
          class="mhr-button mhr-app__close"
          aria-label={t.close}
          onClick={onClose}
        >
          ×
        </button>
      )}
    </header>
  );
}

interface AppBodyProps {
  readonly backend: ReviewBackend;
  readonly files: AsyncState<readonly ChangedFile[]>;
  readonly selected: ChangedFile | null;
  readonly onSelect: (path: string) => void;
  readonly threads: ThreadSnapshot | null;
  readonly onSubmitComment: SubmitComment;
}

function AppBody({ backend, files, selected, onSelect, threads, onSubmitComment }: AppBodyProps) {
  const t = useMessages();
  if (files.status === "failure")
    return (
      <p class="mhr-message mhr-message--error">
        {describeLoadFailure(t, t.couldNotLoadFiles, files.failure)}
      </p>
    );
  if (files.status === "loading") return <p class="mhr-message">{t.loading}</p>;
  if (!selected) return <p class="mhr-message">{t.noMarkdownChanges}</p>;
  return (
    <>
      {files.value.length > 1 && (
        <FileList files={files.value} selectedPath={selected.path} onSelect={onSelect} />
      )}
      <main class="mhr-app__main">
        <FileSplitReview
          key={selected.path}
          backend={backend}
          file={selected}
          threads={threads}
          onSubmitComment={onSubmitComment}
        />
      </main>
    </>
  );
}

function ReviewAppBody({ backend, onClose }: Omit<ReviewAppProps, "locale">) {
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

  return (
    <div class="mhr-root mhr-app">
      <AppHeader path={selected?.path ?? null} threadsFailure={threads.error} onClose={onClose} />
      <div class="mhr-app__body">
        <AppBody
          backend={backend}
          files={files}
          selected={selected}
          onSelect={setSelectedPath}
          threads={threads.snapshot}
          onSubmitComment={submitComment}
        />
      </div>
    </div>
  );
}

/** File picker plus split review for every changed Markdown file a backend exposes. */
export function ReviewApp({ locale = "en", ...props }: ReviewAppProps) {
  return (
    <I18nProvider locale={locale}>
      <ReviewAppBody {...props} />
    </I18nProvider>
  );
}
