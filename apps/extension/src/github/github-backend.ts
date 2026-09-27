import {
  availableCommentModes,
  basePathOf,
  type ChangedFile,
  type CommentMode,
  type CommentTarget,
  err,
  headPathOf,
  ok,
  type PostCommentError,
  type Result,
  type ReviewBackend,
} from "@mihiraki/core";
import type { ThreadCreatedMessage } from "../host-sync/protocol";
import { buildCreateCommentPayload } from "./comment-payload";
import {
  type FetchFn,
  fetchFileSource,
  fetchRouteData,
  guardRequests,
  postReviewComment,
} from "./github-client";
import type { PullRequestLocation } from "./pr-location";
import { settleRequest, toHostError } from "./request-errors";
import type { RouteData } from "./route-data";

const MARKDOWN_PATH = /\.(?:md|markdown)$/i;
const DEFAULT_TIMEOUT_MS = 20_000;

export interface GitHubBackendOptions {
  /** Called after a comment is stored, e.g. to show the new thread in GitHub's own UI too. */
  readonly onThreadCreated?: (created: ThreadCreatedMessage) => unknown;
  readonly timeoutMs?: number;
}

interface PostContext {
  readonly request: FetchFn;
  readonly pr: PullRequestLocation;
  readonly refreshRoute: () => Promise<RouteData>;
  readonly onThreadCreated: GitHubBackendOptions["onThreadCreated"];
}

async function postComment(
  context: PostContext,
  target: CommentTarget,
  body: string,
  mode: CommentMode,
): Promise<Result<void, PostCommentError>> {
  // The review may have been started in GitHub's own UI since our data was loaded.
  if (mode === "single") {
    const { hasPendingReview } = await context.refreshRoute();
    if (!availableCommentModes(hasPendingReview).includes(mode))
      return err({ kind: "pendingReviewConflict" });
  }
  // Lines were chosen in the text of target.revision; the payload anchors to exactly that.
  const payload = buildCreateCommentPayload(target, body, mode);
  const posted = await postReviewComment(context.request, context.pr, payload);
  if (!posted.ok) return posted;
  if (posted.value && context.onThreadCreated) {
    try {
      await context.onThreadCreated({ target, mode, thread: posted.value });
    } catch {
      // The comment is stored; GitHub's own UI just stays stale until reloaded.
    }
  }
  return ok(undefined);
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
  const request = guardRequests(fetchFn, timeoutMs);
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
  const postContext: PostContext = { request, pr, refreshRoute, onThreadCreated };

  return {
    listChangedMarkdownFiles: () =>
      settleRequest(async () =>
        (await currentRoute()).files.filter((file) => MARKDOWN_PATH.test(file.path)),
      ),

    loadFileVersions: (file: ChangedFile) =>
      settleRequest(async () => {
        const { revision } = await currentRoute();
        const basePath = basePathOf(file);
        const headPath = headPathOf(file);
        const [base, head] = await Promise.all([
          basePath === null ? null : fetchFileSource(request, pr, revision.base, basePath),
          headPath === null ? null : fetchFileSource(request, pr, revision.head, headPath),
        ]);
        return { revision, base, head };
      }),

    // Always refetched so comments posted elsewhere (or just now) show up.
    loadThreads: () =>
      settleRequest(async () => {
        const { revision, threads, hasPendingReview } = await refreshRoute();
        return { revision, threads, hasPendingReview };
      }),

    postComment: (target, body, mode) =>
      postComment(postContext, target, body, mode).catch((error: unknown) =>
        err(toHostError(error)),
      ),
  };
}
