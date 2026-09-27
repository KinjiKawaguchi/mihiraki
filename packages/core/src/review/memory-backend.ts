import { createMarkdownRenderer } from "../markdown/renderer";
import type { ChangedFile, FileChangeType, FileVersions, ReviewBackend } from "./backend";
import type { CommentMode, CommentTarget, ReviewThread } from "./types";

function changeTypeOf(versions: FileVersions): FileChangeType {
  if (versions.base === "") return "ADDED";
  if (versions.head === "") return "REMOVED";
  return "MODIFIED";
}

/**
 * Backend that keeps everything in memory. Used by tests and the playground, and as
 * the reference behaviour for real adapters.
 */
export function createMemoryBackend(
  files: Readonly<Record<string, FileVersions>>,
  initialThreads: readonly ReviewThread[] = [],
): ReviewBackend {
  const md = createMarkdownRenderer();
  let threads = initialThreads;

  const toThread = (target: CommentTarget, body: string, mode: CommentMode): ReviewThread => {
    const id = String(threads.length + 1);
    return {
      id,
      ...target,
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
      Object.entries(files).map(([path, versions]) => ({
        path,
        previousPath: null,
        changeType: changeTypeOf(versions),
      })),
    loadFileVersions: async (file) => {
      const versions = files[file.path];
      if (!versions) throw new Error(`Unknown file: ${file.path}`);
      return versions;
    },
    loadThreads: async () => threads,
    postComment: async (target, body, mode) => {
      threads = [...threads, toThread(target, body, mode)];
    },
  };
}
