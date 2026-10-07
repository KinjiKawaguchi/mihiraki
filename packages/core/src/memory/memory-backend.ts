import { createMarkdownRenderer } from "../markdown/renderer";
import { err, ok } from "../result";
import type { ChangedFile, ReviewBackend } from "../review/backend";
import { availableCommentModes } from "../review/comment-modes";
import { commitId } from "../review/commit-id";
import type {
  CommentMode,
  CommentTarget,
  ReviewComment,
  ReviewThread,
  Revision,
} from "../review/types";

export interface MemoryFile {
  /** null when the file does not exist in the base revision. */
  readonly base: string | null;
  /** null when the file does not exist in the head revision. */
  readonly head: string | null;
}

export interface MemoryBackendOptions {
  readonly revision?: Revision;
}

const DEFAULT_REVISION: Revision = {
  base: commitId("0".repeat(40)),
  head: commitId("1".repeat(40)),
};

function toChangedFile(path: string, file: MemoryFile): ChangedFile {
  if (file.base === null) return { path, changeType: "ADDED" };
  if (file.head === null) return { path, changeType: "REMOVED" };
  return { path, changeType: "MODIFIED" };
}

/**
 * Backend that keeps everything in memory. Used by tests and the playground, and as
 * the reference behaviour for real adapters.
 */
export function createMemoryBackend(
  files: Readonly<Record<string, MemoryFile>>,
  initialThreads: readonly ReviewThread[] = [],
  { revision = DEFAULT_REVISION }: MemoryBackendOptions = {},
): ReviewBackend {
  const md = createMarkdownRenderer();
  let threads = initialThreads;
  let posted = 0;
  const hasPendingReview = () =>
    threads.some((thread) => thread.comments.some((comment) => comment.isPending));
  /** An id no thread or comment has yet, so views can key by it. */
  const nextId = (): string => {
    posted += 1;
    const id = `memory-${posted}`;
    const isTaken = threads.some(
      (thread) => thread.id === id || thread.comments.some((comment) => comment.id === id),
    );
    return isTaken ? nextId() : id;
  };

  const toComment = (id: string, body: string, mode: CommentMode): ReviewComment => ({
    id,
    isPending: mode === "review",
    author: "you",
    avatarUrl: "",
    isByChangeAuthor: false,
    bodyHtml: md.render(body),
    bodyMarkdown: body,
    createdAt: new Date().toISOString(),
    url: "",
    reactions: [],
    newIssueUrl: null,
  });

  const toThread = (target: CommentTarget, body: string, mode: CommentMode): ReviewThread => {
    const id = nextId();
    return {
      id,
      path: target.path,
      side: target.side,
      lines: target.lines,
      isResolved: false,
      isOutdated: false,
      canReply: true,
      comments: [toComment(id, body, mode)],
    };
  };

  /** Replaces the thread with `id` by `change(thread)`; false when there is no such thread. */
  const updateThread = (id: string, change: (thread: ReviewThread) => ReviewThread): boolean => {
    if (!threads.some((thread) => thread.id === id)) return false;
    threads = threads.map((thread) => (thread.id === id ? change(thread) : thread));
    return true;
  };
  const noSuchThread = { kind: "rejected", detail: "No such thread" } as const;

  return {
    listChangedMarkdownFiles: async () =>
      ok(Object.entries(files).map(([path, file]) => toChangedFile(path, file))),
    loadFileVersions: async (file) => {
      const found = files[file.path];
      // Only files it listed are ever asked for.
      if (!found) throw new Error(`Unknown file: ${file.path}`);
      return ok({ revision, base: found.base, head: found.head });
    },
    loadThreads: async () => ok({ revision, threads, hasPendingReview: hasPendingReview() }),
    postComment: async (target, body, mode) => {
      if (!availableCommentModes(hasPendingReview()).includes(mode))
        return err({ kind: "pendingReviewConflict" });
      threads = [...threads, toThread(target, body, mode)];
      return ok(undefined);
    },
    replyToThread: async (thread, body, mode) => {
      if (!availableCommentModes(hasPendingReview()).includes(mode))
        return err({ kind: "pendingReviewConflict" });
      const comment = toComment(nextId(), body, mode);
      const isFound = updateThread(thread.id, (found) => ({
        ...found,
        comments: [...found.comments, comment],
      }));
      return isFound ? ok(undefined) : err(noSuchThread);
    },
    setThreadResolved: async (thread, isResolved) =>
      updateThread(thread.id, (found) => ({ ...found, isResolved }))
        ? ok(undefined)
        : err(noSuchThread),
  };
}
