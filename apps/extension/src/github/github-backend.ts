import {
  availableCommentModes,
  basePathOf,
  type ChangedFile,
  type CommentMode,
  type CommentTarget,
  type CommitId,
  type EditCommentError,
  err,
  headPathOf,
  ok,
  type PostCommentError,
  type ReactionKind,
  type Result,
  type ReviewBackend,
  type ReviewComment,
  type ReviewThread,
} from "@mihiraki/core";
import type { DiffLayout } from "@mihiraki/ui";
import { type HostChange, parseEditedComment, type ThreadPosition } from "../host-sync/protocol";
import { buildCreateCommentPayload, buildReplyPayload } from "./comment-payload";
import {
  deleteReviewComment,
  type FetchFn,
  fetchFileSource,
  fetchRouteData,
  guardRequests,
  postReviewComment,
  sendCommentReaction,
  sendThreadResolution,
  updateReviewComment,
} from "./github-client";
import { isMarkdownPath } from "./markdown-path";
import type { PullRequestLocation } from "./pr-location";
import { settleRequest, toHostError, UnexpectedResponseError } from "./request-errors";
import { reactionContentOf } from "./route-comments";
import type { RouteData } from "./route-data";

const DEFAULT_TIMEOUT_MS = 20_000;

export interface GitHubBackendOptions {
  /** Called after a change is stored, e.g. to show it in GitHub's own UI too. */
  readonly onHostChanged?: (change: HostChange) => unknown;
  readonly timeoutMs?: number;
}

interface PostContext {
  readonly request: FetchFn;
  readonly pr: PullRequestLocation;
  readonly refreshRoute: () => Promise<RouteData>;
  readonly onHostChanged: GitHubBackendOptions["onHostChanged"];
}

function positionOf({ path, side, lines }: ReviewThread): ThreadPosition {
  return { path, side, lines };
}

async function notifyHost(context: PostContext, change: HostChange): Promise<void> {
  try {
    await context.onHostChanged?.(change);
  } catch {
    // The change is stored; GitHub's own UI just stays stale until reloaded.
  }
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
  if (posted.value)
    await notifyHost(context, { kind: "threadCreated", target, mode, thread: posted.value });
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
  if (!posted.ok) return posted;
  if (posted.value)
    await notifyHost(context, {
      kind: "threadReplied",
      target: positionOf(thread),
      mode,
      thread: posted.value,
    });
  return ok(undefined);
}

async function setThreadResolved(
  context: PostContext,
  thread: ReviewThread,
  isResolved: boolean,
): Promise<void> {
  await sendThreadResolution(context.request, context.pr, thread.id, isResolved);
  await notifyHost(context, {
    kind: "threadResolved",
    target: positionOf(thread),
    thread: { id: thread.id },
    isResolved,
  });
}

/** GitHub's endpoints name a comment by its database id, which is a comment's id here. */
function databaseIdOf(comment: ReviewComment): number {
  const id = Number(comment.id);
  if (!Number.isSafeInteger(id))
    throw new UnexpectedResponseError(`no database id for comment ${comment.id}`);
  return id;
}

function commentChangeOf(thread: ReviewThread, commentId: number) {
  return { target: positionOf(thread), thread: { id: thread.id }, commentId };
}

async function editComment(
  context: PostContext,
  thread: ReviewThread,
  comment: ReviewComment,
  body: string,
): Promise<Result<void, EditCommentError>> {
  const commentId = databaseIdOf(comment);
  const edit = { commentId, version: comment.version, body };
  const edited = await updateReviewComment(context.request, context.pr, edit);
  if (!edited.ok) return edited;
  const update = parseEditedComment(edited.value);
  if (update)
    await notifyHost(context, {
      kind: "commentEdited",
      ...commentChangeOf(thread, commentId),
      comment: update,
    });
  return ok(undefined);
}

async function deleteComment(
  context: PostContext,
  thread: ReviewThread,
  comment: ReviewComment,
): Promise<void> {
  const commentId = databaseIdOf(comment);
  await deleteReviewComment(context.request, context.pr, commentId);
  await notifyHost(context, { kind: "commentDeleted", ...commentChangeOf(thread, commentId) });
}

async function setReaction(
  context: PostContext,
  thread: ReviewThread,
  comment: ReviewComment,
  reaction: { readonly kind: ReactionKind; readonly isOn: boolean },
): Promise<void> {
  const commentId = databaseIdOf(comment);
  const content = reactionContentOf(reaction.kind);
  const reactionGroups = await sendCommentReaction(context.request, context.pr, {
    commentId,
    content,
    isOn: reaction.isOn,
  });
  await notifyHost(context, {
    kind: "reactionsChanged",
    ...commentChangeOf(thread, commentId),
    reactionGroups,
  });
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
  { onHostChanged, timeoutMs = DEFAULT_TIMEOUT_MS }: GitHubBackendOptions = {},
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
  const postContext: PostContext = { request, pr, refreshRoute, onHostChanged };

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

    replyToThread: (thread, body, mode) =>
      replyToThread(postContext, thread, body, mode).catch((error: unknown) =>
        err(toHostError(error)),
      ),

    setThreadResolved: (thread, isResolved) =>
      settleRequest(() => setThreadResolved(postContext, thread, isResolved)),

    editComment: (thread, comment, body) =>
      editComment(postContext, thread, comment, body).catch((error: unknown) =>
        err(toHostError(error)),
      ),

    deleteComment: (thread, comment) =>
      settleRequest(() => deleteComment(postContext, thread, comment)),

    setReaction: (thread, comment, kind, isOn) =>
      settleRequest(() => setReaction(postContext, thread, comment, { kind, isOn })),
  };
}
