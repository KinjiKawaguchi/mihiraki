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
  type ReviewThread,
} from "@mihiraki/core";
import type { DiffLayout } from "@mihiraki/ui";
import type { ThreadCreatedMessage } from "../host-sync/protocol";
import { buildCreateCommentPayload, buildReplyPayload } from "./comment-payload";
import {
  type FetchFn,
  fetchFileSource,
  fetchRouteData,
  guardRequests,
  postReviewComment,
  sendThreadResolution,
} from "./github-client";
import { isMarkdownPath } from "./markdown-path";
import type { PullRequestLocation } from "./pr-location";
import { settleRequest, toHostError, UnexpectedResponseError } from "./request-errors";
import type { RouteData } from "./route-data";

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

/** Whether `mode` still fits: the review may have been started in GitHub's own UI since our data was loaded. */
async function isModeAvailable(context: PostContext, mode: CommentMode): Promise<boolean> {
  if (mode !== "single") return true;
  const { hasPendingReview } = await context.refreshRoute();
  return availableCommentModes(hasPendingReview).includes(mode);
}

async function postComment(
  context: PostContext,
  target: CommentTarget,
  body: string,
  mode: CommentMode,
): Promise<Result<void, PostCommentError>> {
  if (!(await isModeAvailable(context, mode))) return err({ kind: "pendingReviewConflict" });
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

async function replyToThread(
  context: PostContext,
  thread: ReviewThread,
  body: string,
  mode: CommentMode,
): Promise<Result<void, PostCommentError>> {
  const lastCommentId = Number(thread.comments.at(-1)?.id);
  if (!Number.isSafeInteger(lastCommentId))
    throw new UnexpectedResponseError(`no database id for the last comment of thread ${thread.id}`);
  if (!(await isModeAvailable(context, mode))) return err({ kind: "pendingReviewConflict" });
  const payload = buildReplyPayload(thread, lastCommentId, body, mode);
  const posted = await postReviewComment(context.request, context.pr, payload);
  return posted.ok ? ok(undefined) : posted;
}

/** The ReviewBackend for GitHub, plus what only the Files changed page itself needs. */
export interface GitHubBackend extends ReviewBackend {
  /** The viewer's split / unified setting in the page data; null when it cannot be read. */
  diffLayout(): Promise<DiffLayout | null>;
}

/**
 * ReviewBackend for a github.com pull request. Uses the same internal endpoints and
 * session cookies as GitHub's own UI, so no token is needed and permissions match.
 */
export function createGitHubBackend(
  pr: PullRequestLocation,
  fetchFn: FetchFn = (input, init) => fetch(input, init),
  { onThreadCreated, timeoutMs = DEFAULT_TIMEOUT_MS }: GitHubBackendOptions = {},
): GitHubBackend {
  const request = guardRequests(fetchFn, timeoutMs);
  let cachedRoute: Promise<RouteData> | null = null;

  let latestRefresh: Promise<RouteData> | null = null;

  // A refresh replaces the cached route only once it succeeds, so reading files never
  // waits for one (the first load is shared, as there is nothing to read before it), and
  // only if no newer refresh has started meanwhile.
  const refreshRoute = (): Promise<RouteData> => {
    const pending = fetchRouteData(request, pr);
    latestRefresh = pending;
    cachedRoute ??= pending;
    pending.then(
      () => {
        if (latestRefresh === pending) cachedRoute = pending;
      },
      () => {
        if (cachedRoute === pending) cachedRoute = null;
      },
    );
    return pending;
  };
  const currentRoute = (): Promise<RouteData> => cachedRoute ?? refreshRoute();
  const postContext: PostContext = { request, pr, refreshRoute, onThreadCreated };

  return {
    listChangedMarkdownFiles: () =>
      settleRequest(async () =>
        (await currentRoute()).files.filter((file) => isMarkdownPath(file.path)),
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

    diffLayout: () =>
      currentRoute().then(
        (route) => route.diffLayout,
        () => null,
      ),

    postComment: (target, body, mode) =>
      postComment(postContext, target, body, mode).catch((error: unknown) =>
        err(toHostError(error)),
      ),

    replyToThread: (thread, body, mode) =>
      replyToThread(postContext, thread, body, mode).catch((error: unknown) =>
        err(toHostError(error)),
      ),

    setThreadResolved: (thread, isResolved) =>
      settleRequest(() => sendThreadResolution(request, pr, thread.id, isResolved)),
  };
}
