import { createMarkdownRenderer } from "../markdown/renderer";
import type { ChangedFile, FileChangeType, ReviewBackend } from "./backend";
import type { CommentMode, CommentTarget, ReviewThread, Revision } from "./types";

export interface MemoryFile {
  readonly base: string;
  readonly head: string;
}

export interface MemoryBackendOptions {
  readonly revision?: Revision;
}

const DEFAULT_REVISION: Revision = { base: "base", head: "head" };

function changeTypeOf(file: MemoryFile): FileChangeType {
  if (file.base === "") return "ADDED";
  if (file.head === "") return "REMOVED";
  return "MODIFIED";
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

  const toThread = (target: CommentTarget, body: string, mode: CommentMode): ReviewThread => {
    const id = String(threads.length + 1);
    return {
      id,
      path: target.path,
      side: target.side,
      line: target.line,
      startLine: target.startLine,
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
    listChangedMarkdownFiles: async (): Promise<ChangedFile[]> =>
      Object.entries(files).map(([path, file]) => ({
        path,
        previousPath: null,
        changeType: changeTypeOf(file),
      })),
    loadFileVersions: async (file) => {
      const found = files[file.path];
      if (!found) throw new Error(`Unknown file: ${file.path}`);
      return { revision, base: found.base, head: found.head };
    },
    loadThreads: async () => ({ revision, threads }),
    postComment: async (target, body, mode) => {
      threads = [...threads, toThread(target, body, mode)];
    },
  };
}
