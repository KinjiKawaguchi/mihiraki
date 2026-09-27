import type { CommentMode, CommentTarget, ReviewThread } from "./types";

export type FileChangeType = "ADDED" | "MODIFIED" | "REMOVED" | "RENAMED";

export interface ChangedFile {
  readonly path: string;
  /** Path in the base revision when the file was renamed. */
  readonly previousPath: string | null;
  readonly changeType: FileChangeType;
}

export interface FileVersions {
  readonly base: string;
  readonly head: string;
}

/**
 * What a hosting platform (GitHub PR, local git refs, ...) must provide for a
 * rendered split review. Implemented by adapters, consumed by the UI.
 */
export interface ReviewBackend {
  listChangedMarkdownFiles(): Promise<readonly ChangedFile[]>;
  loadFileVersions(file: ChangedFile): Promise<FileVersions>;
  loadThreads(): Promise<readonly ReviewThread[]>;
  postComment(target: CommentTarget, body: string, mode: CommentMode): Promise<void>;
}
