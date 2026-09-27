import type { ChangedFile, ReviewBackend } from "@mihiraki/core";
import type { ThreadCreatedMessage } from "../host-sync/protocol";
import { buildCreateCommentPayload } from "./comment-payload";
import { type FetchFn, fetchFileSource, fetchRouteData, postReviewComment } from "./github-client";
import type { PullRequestLocation } from "./pr-location";
import type { RouteData } from "./route-data";

const MARKDOWN_PATH = /\.(?:md|markdown)$/i;

/** GitHub folds a single comment into the pending review and publishes all of it. */
const SINGLE_COMMENT_WHILE_PENDING =
  "保留中のレビューがあります。このまま単発で送ると保留中のコメントもまとめて公開されるため、「レビューに追加」を使ってください。";

export interface GitHubBackendOptions {
  /** Called after a comment is stored, e.g. to show the new thread in GitHub's own UI too. */
  readonly onThreadCreated?: (created: ThreadCreatedMessage) => unknown;
}

/**
 * ReviewBackend for a github.com pull request. Uses the same internal endpoints and
 * session cookies as GitHub's own UI, so no token is needed and permissions match.
 */
export function createGitHubBackend(
  pr: PullRequestLocation,
  fetchFn: FetchFn = (input, init) => fetch(input, init),
  { onThreadCreated }: GitHubBackendOptions = {},
): ReviewBackend {
  let cachedRoute: Promise<RouteData> | null = null;

  const refreshRoute = (): Promise<RouteData> => {
    const request = fetchRouteData(fetchFn, pr);
    cachedRoute = request;
    request.catch(() => {
      if (cachedRoute === request) cachedRoute = null;
    });
    return request;
  };
  const currentRoute = (): Promise<RouteData> => cachedRoute ?? refreshRoute();

  return {
    listChangedMarkdownFiles: async () =>
      (await currentRoute()).files.filter((file) => MARKDOWN_PATH.test(file.path)),

    loadFileVersions: async (file: ChangedFile) => {
      const { baseOid, headOid } = await currentRoute();
      const [base, head] = await Promise.all([
        file.changeType === "ADDED"
          ? ""
          : fetchFileSource(fetchFn, pr, baseOid, file.previousPath ?? file.path),
        file.changeType === "REMOVED" ? "" : fetchFileSource(fetchFn, pr, headOid, file.path),
      ]);
      return { base, head };
    },

    // Always refetched so comments posted elsewhere (or just now) show up.
    loadThreads: async () => (await refreshRoute()).threads,

    postComment: async (target, body, mode) => {
      // The review may have been started in GitHub's own UI since our data was loaded.
      const route = mode === "single" ? await refreshRoute() : await currentRoute();
      if (mode === "single" && route.hasPendingReview)
        throw new Error(SINGLE_COMMENT_WHILE_PENDING);
      const payload = buildCreateCommentPayload(target, body, route, mode);
      const thread = await postReviewComment(fetchFn, pr, target, payload);
      if (!thread || !onThreadCreated) return;
      try {
        await onThreadCreated({ target, mode, thread });
      } catch {
        // The comment is stored; GitHub's own UI just stays stale until reloaded.
      }
    },
  };
}
