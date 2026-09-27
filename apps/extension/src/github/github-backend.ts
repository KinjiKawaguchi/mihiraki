import { basePathOf, type ChangedFile, headPathOf, type ReviewBackend } from "@mihiraki/core";
import type { ThreadCreatedMessage } from "../host-sync/protocol";
import { buildCreateCommentPayload } from "./comment-payload";
import {
  type FetchFn,
  fetchFileSource,
  fetchRouteData,
  postReviewComment,
  withTimeout,
} from "./github-client";
import type { PullRequestLocation } from "./pr-location";
import type { RouteData } from "./route-data";

const MARKDOWN_PATH = /\.(?:md|markdown)$/i;
const DEFAULT_TIMEOUT_MS = 20_000;

/** GitHub folds a single comment into the pending review and publishes all of it. */
const SINGLE_COMMENT_WHILE_PENDING =
  "保留中のレビューがあります。このまま単発で送ると保留中のコメントもまとめて公開されるため、「レビューに追加」を使ってください。";

export interface GitHubBackendOptions {
  /** Called after a comment is stored, e.g. to show the new thread in GitHub's own UI too. */
  readonly onThreadCreated?: (created: ThreadCreatedMessage) => unknown;
  readonly timeoutMs?: number;
}

/**
 * ReviewBackend for a github.com pull request. Uses the same internal endpoints and
 * session cookies as GitHub's own UI, so no token is needed and permissions match.
 */
export function createGitHubBackend(
  pr: PullRequestLocation,
  fetchFn: FetchFn = (input, init) => fetch(input, init),
  { onThreadCreated, timeoutMs = DEFAULT_TIMEOUT_MS }: GitHubBackendOptions = {},
): ReviewBackend {
  const request = withTimeout(fetchFn, timeoutMs);
  let cachedRoute: Promise<RouteData> | null = null;

  const refreshRoute = (): Promise<RouteData> => {
    const pending = fetchRouteData(request, pr);
    cachedRoute = pending;
    pending.catch(() => {
      if (cachedRoute === pending) cachedRoute = null;
    });
    return pending;
  };
  const currentRoute = (): Promise<RouteData> => cachedRoute ?? refreshRoute();

  return {
    listChangedMarkdownFiles: async () =>
      (await currentRoute()).files.filter((file) => MARKDOWN_PATH.test(file.path)),

    loadFileVersions: async (file: ChangedFile) => {
      const { revision } = await currentRoute();
      const basePath = basePathOf(file);
      const headPath = headPathOf(file);
      const [base, head] = await Promise.all([
        basePath === null ? null : fetchFileSource(request, pr, revision.base, basePath),
        headPath === null ? null : fetchFileSource(request, pr, revision.head, headPath),
      ]);
      return { revision, base, head };
    },

    // Always refetched so comments posted elsewhere (or just now) show up.
    loadThreads: async () => {
      const { revision, threads } = await refreshRoute();
      return { revision, threads };
    },

    postComment: async (target, body, mode) => {
      // The review may have been started in GitHub's own UI since our data was loaded.
      if (mode === "single" && (await refreshRoute()).hasPendingReview)
        throw new Error(SINGLE_COMMENT_WHILE_PENDING);
      // Lines were chosen in the text of target.revision; the payload anchors to exactly that.
      const payload = buildCreateCommentPayload(target, body, mode);
      const thread = await postReviewComment(request, pr, target, payload);
      if (!thread || !onThreadCreated) return;
      try {
        await onThreadCreated({ target, mode, thread });
      } catch {
        // The comment is stored; GitHub's own UI just stays stale until reloaded.
      }
    },
  };
}
