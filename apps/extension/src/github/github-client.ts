import { type CommitId, err, ok, type PostCommentError, type Result } from "@mihiraki/core";
import { extractBlobSource, findBlobSource } from "./blob-source";
import { asRecord, asString, type JsonRecord, pick } from "./json";
import { type PullRequestLocation, pullRequestUrl } from "./pr-location";
import {
  HttpStatusError,
  NetworkError,
  RequestTimeoutError,
  UnexpectedResponseError,
} from "./request-errors";
import { parseRouteData, type RouteData } from "./route-data";

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

function isTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

/**
 * Adds a deadline to every request, so an unanswered request cannot leave the UI waiting
 * forever, and tells a request that timed out from one that could not be made at all.
 */
export function guardRequests(fetchFn: FetchFn, timeoutMs: number): FetchFn {
  return async (input, init) => {
    try {
      return await fetchFn(input, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    } catch (error) {
      throw isTimeout(error) ? new RequestTimeoutError(timeoutMs) : new NetworkError(error);
    }
  };
}

/** Headers GitHub's own UI sends to receive JSON from its page routes. */
const ROUTE_HEADERS = {
  Accept: "application/json",
  "X-Requested-With": "XMLHttpRequest",
  "GitHub-Verified-Fetch": "true",
} as const;

/** Seen when the compared commits are stale; GitHub itself accepts any line of a changed file. */
const LINE_NOT_RESOLVED = /line could not be resolved/i;
const RETRY_DELAY_MS = 400;

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function readErrorMessage(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  try {
    const body: unknown = JSON.parse(text);
    return asString(pick(body, "error")) ?? asString(pick(body, "message")) ?? text.slice(0, 200);
  } catch {
    return text.slice(0, 200);
  }
}

function toPostFailure(status: number, message: string): PostCommentError {
  if (status === 422 && LINE_NOT_RESOLVED.test(message)) return { kind: "lineNotResolved" };
  return { kind: "rejected", detail: `HTTP ${status}${message ? `: ${message}` : ""}` };
}

/** `GET /pull/:n/changes` as JSON: compared commits, changed files and review threads. */
export async function fetchRouteData(
  fetchFn: FetchFn,
  pr: PullRequestLocation,
): Promise<RouteData> {
  const response = await fetchFn(pullRequestUrl(pr, "changes"), {
    credentials: "include",
    headers: ROUTE_HEADERS,
  });
  if (!response.ok) throw new HttpStatusError(response.status);
  const json: unknown = await response.json().catch(() => {
    // e.g. the sign-in page when the session has expired.
    throw new UnexpectedResponseError("pull request route data is not JSON");
  });
  return parseRouteData(json);
}

function fileUrl(pr: PullRequestLocation, route: "blob" | "_styled", oid: CommitId, path: string) {
  return `https://github.com/${encodeURIComponent(pr.owner)}/${encodeURIComponent(pr.repo)}/${route}/${oid}/${encodePath(path)}`;
}

/** Source from the small JSON GitHub's code view loads for a file, or null if it has none. */
async function fetchStyledSource(fetchFn: FetchFn, url: string): Promise<string | null> {
  const response = await fetchFn(url, { credentials: "include", headers: ROUTE_HEADERS });
  if (!response.ok) return null;
  return findBlobSource(await response.json().catch(() => null));
}

/**
 * Raw file text at a commit. Read from the code view's JSON, which is several times
 * smaller and faster than the blob page; the blob page stays as the fallback.
 * (raw.githubusercontent.com rejects credentialed CORS.)
 */
export async function fetchFileSource(
  fetchFn: FetchFn,
  pr: PullRequestLocation,
  oid: CommitId,
  path: string,
): Promise<string> {
  const styled = await fetchStyledSource(fetchFn, fileUrl(pr, "_styled", oid, path));
  if (styled !== null) return styled;
  const response = await fetchFn(fileUrl(pr, "blob", oid, path), { credentials: "include" });
  if (!response.ok) throw new HttpStatusError(response.status);
  const source = extractBlobSource(await response.text());
  if (source === null) throw new UnexpectedResponseError(`no source in the blob page of ${path}`);
  return source;
}

async function sendReviewComment(fetchFn: FetchFn, pr: PullRequestLocation, payload: unknown) {
  const response = await fetchFn(pullRequestUrl(pr, "page_data/create_review_comment"), {
    method: "POST",
    credentials: "include",
    headers: { ...ROUTE_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok)
    return {
      status: response.status,
      isOk: false,
      message: await readErrorMessage(response),
      thread: null,
    };
  const body: unknown = await response.json().catch(() => null);
  return {
    status: response.status,
    isOk: true,
    message: "",
    thread: asRecord(pick(body, "thread")),
  };
}

/**
 * `POST /pull/:n/page_data/create_review_comment`, the endpoint behind GitHub's own "+"
 * button. Succeeds with the created `thread` object GitHub returns, if any.
 */
export async function postReviewComment(
  fetchFn: FetchFn,
  pr: PullRequestLocation,
  payload: unknown,
): Promise<Result<JsonRecord | null, PostCommentError>> {
  let result = await sendReviewComment(fetchFn, pr, payload);
  // GitHub's own UI occasionally gets a transient 422 and succeeds on a second attempt.
  if (result.status === 422 && !LINE_NOT_RESOLVED.test(result.message)) {
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    result = await sendReviewComment(fetchFn, pr, payload);
  }
  return result.isOk ? ok(result.thread) : err(toPostFailure(result.status, result.message));
}
