import type { CommentMode, CommentTarget, ReviewThread, Revision } from "./types";

export type FileChangeType = "ADDED" | "MODIFIED" | "REMOVED" | "RENAMED";

export interface ChangedFile {
  readonly path: string;
  /** Path in the base revision when the file was renamed. */
  readonly previousPath: string | null;
  readonly changeType: FileChangeType;
}

export interface FileVersions {
  readonly revision: Revision;
  readonly base: string;
  readonly head: string;
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
