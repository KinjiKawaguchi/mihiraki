import type { Result } from "../result";
import type { EditCommentError } from "./edit-comment-error";
import type { HostError } from "./host-error";
import type { PostCommentError } from "./post-comment-error";
import type {
  CommentMode,
  CommentTarget,
  ReactionKind,
  ReviewComment,
  ReviewThread,
  Revision,
} from "./types";

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
  /**
   * Whether the viewer has started a review that is not submitted yet. Reported by the
   * host, since a pending review may exist without any pending thread.
   */
  readonly hasPendingReview: boolean;
}

/**
 * What a hosting platform (GitHub PR, local git refs, ...) must provide for a
 * rendered split review. Implemented by adapters, consumed by the UI.
 * Foreseeable failures are returned as values; a rejected promise means a bug.
 */
export interface ReviewBackend {
  listChangedMarkdownFiles(): Promise<Result<readonly ChangedFile[], HostError>>;
  loadFileVersions(file: ChangedFile): Promise<Result<FileVersions, HostError>>;
  loadThreads(): Promise<Result<ThreadSnapshot, HostError>>;
  postComment(
    target: CommentTarget,
    body: string,
    mode: CommentMode,
  ): Promise<Result<void, PostCommentError>>;
  /** Adds a comment at the end of a thread, posted now or added to the pending review. */
  replyToThread(
    thread: ReviewThread,
    body: string,
    mode: CommentMode,
  ): Promise<Result<void, PostCommentError>>;
  /** Marks a thread resolved, or opens it again. */
  setThreadResolved(thread: ReviewThread, isResolved: boolean): Promise<Result<void, HostError>>;
  /** Replaces a comment's text, unless it changed since `comment` was loaded. */
  editComment(
    thread: ReviewThread,
    comment: ReviewComment,
    body: string,
  ): Promise<Result<void, EditCommentError>>;
  /** Deletes a comment; a thread goes with its last comment. */
  deleteComment(thread: ReviewThread, comment: ReviewComment): Promise<Result<void, HostError>>;
  /** Adds or removes the viewer's reaction of `kind`. */
  setReaction(
    thread: ReviewThread,
    comment: ReviewComment,
    kind: ReactionKind,
    isOn: boolean,
  ): Promise<Result<void, HostError>>;
}
