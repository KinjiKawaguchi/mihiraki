import type { CommentMode, CommentTarget, ReviewThread, Revision } from "./types";

export type ChangedFile =
  | { readonly changeType: "ADDED" | "MODIFIED" | "REMOVED"; readonly path: string }
  | {
      readonly changeType: "RENAMED";
      readonly path: string;
      /** Path in the base revision. */
      readonly previousPath: string;
    };

export type FileChangeType = ChangedFile["changeType"];

export interface FileVersions {
  readonly revision: Revision;
  /** Text in the base revision; null when the file does not exist there (it was added). */
  readonly base: string | null;
  /** Text in the head revision; null when the file does not exist there (it was removed). */
  readonly head: string | null;
}

export interface ThreadSnapshot {
  /** The revision the threads' line numbers refer to (the latest one, for a live host). */
  readonly revision: Revision;
  readonly threads: readonly ReviewThread[];
}

/**
 * What a hosting platform (GitHub PR, local git refs, ...) must provide for a
 * rendered split review. Implemented by adapters, consumed by the UI.
 */
export interface ReviewBackend {
  listChangedMarkdownFiles(): Promise<readonly ChangedFile[]>;
  loadFileVersions(file: ChangedFile): Promise<FileVersions>;
  loadThreads(): Promise<ThreadSnapshot>;
  postComment(target: CommentTarget, body: string, mode: CommentMode): Promise<void>;
}
