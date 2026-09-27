import type { CommentTarget, CommitId } from "@mihiraki/core";
import { extractBlobSource } from "./blob-source";
import { asRecord, asString, type JsonRecord, pick } from "./json";
import { type PullRequestLocation, pullRequestUrl } from "./pr-location";
import { parseRouteData, type RouteData } from "./route-data";

export type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

function isTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

/** Adds a deadline to every request, so an unanswered request cannot leave the UI waiting forever. */
export function withTimeout(fetchFn: FetchFn, timeoutMs: number): FetchFn {
  return async (input, init) => {
    try {
      return await fetchFn(input, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    } catch (error) {
      if (!isTimeout(error)) throw error;
      throw new Error(
        `GitHubから${Math.round(timeoutMs / 1000)}秒以内に応答がありませんでした。時間をおいて再度お試しください。`,
      );
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

function describePostFailure(status: number, message: string, target: CommentTarget): Error {
  if (status === 422 && LINE_NOT_RESOLVED.test(message)) {
    return new Error(
      `${target.path} の${target.lines.end}行目をGitHubが解決できませんでした。ページを開いた後にPRが更新された可能性があるので、再読み込みしてください。`,
    );
  }
  return new Error(
    `コメントを投稿できませんでした (HTTP ${status}${message ? `: ${message}` : ""})`,
  );
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
  if (!response.ok)
    throw new Error(`pull requestの情報を取得できませんでした (HTTP ${response.status})`);
  return parseRouteData(await response.json());
}

/** Raw file text at a commit, read from the blob page (raw.githubusercontent.com rejects credentialed CORS). */
export async function fetchFileSource(
  fetchFn: FetchFn,
  pr: PullRequestLocation,
  oid: CommitId,
  path: string,
): Promise<string> {
  const url = `https://github.com/${encodeURIComponent(pr.owner)}/${encodeURIComponent(pr.repo)}/blob/${oid}/${encodePath(path)}`;
  const response = await fetchFn(url, { credentials: "include" });
  if (!response.ok) throw new Error(`${path} を取得できませんでした (HTTP ${response.status})`);
  const source = extractBlobSource(await response.text());
  if (source === null) throw new Error(`${path} の内容をページから読み取れませんでした`);
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
 * button. Resolves to the created `thread` object GitHub returns, if any.
 */
export async function postReviewComment(
  fetchFn: FetchFn,
  pr: PullRequestLocation,
  target: CommentTarget,
  payload: unknown,
): Promise<JsonRecord | null> {
  let result = await sendReviewComment(fetchFn, pr, payload);
  // GitHub's own UI occasionally gets a transient 422 and succeeds on a second attempt.
  if (result.status === 422 && !LINE_NOT_RESOLVED.test(result.message)) {
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    result = await sendReviewComment(fetchFn, pr, payload);
  }
  if (!result.isOk) throw describePostFailure(result.status, result.message, target);
  return result.thread;
}
