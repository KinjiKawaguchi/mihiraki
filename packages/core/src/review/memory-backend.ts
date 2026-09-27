import { createMarkdownRenderer } from "../markdown/renderer";
import { err, ok } from "../result";
import type { ChangedFile, ReviewBackend } from "./backend";
import { availableCommentModes } from "./comment-modes";
import { commitId } from "./commit-id";
import type { CommentMode, CommentTarget, ReviewThread, Revision } from "./types";

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
  const hasPendingReview = () => threads.some((thread) => thread.isPending);

  const toThread = (target: CommentTarget, body: string, mode: CommentMode): ReviewThread => {
    const id = String(threads.length + 1);
    return {
      id,
      path: target.path,
      side: target.side,
      lines: target.lines,
      isResolved: false,
      isOutdated: false,
      isPending: mode === "review",
      comments: [
        {
          id,
          author: "you",
          avatarUrl: "",
          bodyHtml: md.render(body),
          createdAt: new Date().toISOString(),
          url: "",
        },
      ],
    };
  };

  return {
    listChangedMarkdownFiles: async () =>
      Object.entries(files).map(([path, file]) => toChangedFile(path, file)),
    loadFileVersions: async (file) => {
      const found = files[file.path];
      if (!found) throw new Error(`Unknown file: ${file.path}`);
      return { revision, base: found.base, head: found.head };
    },
    loadThreads: async () => ({ revision, threads, hasPendingReview: hasPendingReview() }),
    postComment: async (target, body, mode) => {
      if (!availableCommentModes(hasPendingReview()).includes(mode))
        return err({ kind: "pendingReviewConflict" });
      threads = [...threads, toThread(target, body, mode)];
      return ok(undefined);
    },
  };
}
