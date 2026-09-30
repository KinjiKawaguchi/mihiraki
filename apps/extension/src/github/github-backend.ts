import {
  availableCommentModes,
  basePathOf,
  type ChangedFile,
  type CommentMode,
  type CommentTarget,
  type CommitId,
  err,
  headPathOf,
  ok,
  type PostCommentError,
  type Result,
  type ReviewBackend,
} from "@mihiraki/core";
import type { DiffLayout } from "@mihiraki/ui";
import type { ThreadCreatedMessage } from "../host-sync/protocol";
import { buildCreateCommentPayload } from "./comment-payload";
import {
  type FetchFn,
  fetchFileSource,
  fetchRouteData,
  guardRequests,
  postReviewComment,
} from "./github-client";
import { isMarkdownPath } from "./markdown-path";
import type { PullRequestLocation } from "./pr-location";
import { settleRequest, toHostError } from "./request-errors";
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

  // The text of a file at a commit never changes, so each version is fetched once per page
  // (a failed fetch is forgotten, so the next attempt asks again).
  let sources: ReadonlyMap<string, Promise<string>> = new Map();
  const sourceAt = (oid: CommitId, path: string): Promise<string> => {
    const key = `${oid}:${path}`;
    const cached = sources.get(key);
    if (cached) return cached;
    const pending = fetchFileSource(request, pr, oid, path);
    sources = new Map([...sources, [key, pending]]);
    pending.catch(() => {
      if (sources.get(key) === pending) sources = new Map([...sources].filter(([k]) => k !== key));
    });
    return pending;
  };
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
          basePath === null ? null : sourceAt(revision.base, basePath),
          headPath === null ? null : sourceAt(revision.head, headPath),
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
  };
}
