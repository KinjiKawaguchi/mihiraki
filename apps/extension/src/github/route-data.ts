import {
  type ChangedFile,
  type FileChangeType,
  type LineRange,
  parseCommitId,
  parseLineRange,
  type ReviewComment,
  type ReviewThread,
  type Revision,
  type Side,
} from "@mihiraki/core";
import { type LineKey, parseLineKey } from "./diff-side";
import { asArray, asRecord, asRecords, asString, type JsonRecord, pick } from "./json";
import { UnexpectedResponseError } from "./request-errors";

export interface RouteData {
  /** The commits compared on the page. */
  readonly revision: Revision;
  /** Whether the viewer has started a review that is not submitted yet. */
  readonly hasPendingReview: boolean;
  readonly files: readonly ChangedFile[];
  readonly threads: readonly ReviewThread[];
}

interface ThreadLocation {
  readonly id: string;
  readonly path: string;
  readonly side: Side;
  readonly lines: LineRange;
}

const CHANGE_TYPES: readonly FileChangeType[] = ["ADDED", "MODIFIED", "REMOVED", "RENAMED"];

function toChangedFile(summary: JsonRecord): ChangedFile | null {
  const path = asString(summary.path);
  if (!path) return null;
  const changeType = CHANGE_TYPES.find((type) => type === summary.changeType) ?? "MODIFIED";
  if (changeType !== "RENAMED") return { path, changeType };
  const previousPath = asString(summary.previousPath) ?? asString(summary.oldPath);
  // Without the previous path there is no base version to load; show the file as new.
  if (!previousPath) return { path, changeType: "ADDED" };
  return previousPath === path
    ? { path, changeType: "MODIFIED" }
    : { path, previousPath, changeType };
}

/**
 * Lines from the range's `start` key to its last line. Only the last line is kept when
 * the start is missing or does not fit: on the other side, or after the end.
 */
function threadLines(end: LineKey, startKey: string | null): LineRange | null {
  const start = parseLineKey(startKey);
  const range = start?.side === end.side ? parseLineRange(start.line, end.line) : null;
  return range ?? parseLineRange(end.line, end.line);
}

/** Thread positions come only from `markersMap` keys (`R12` = head side, line 12). */
function locateThreads(summary: JsonRecord): ThreadLocation[] {
  const path = asString(summary.path);
  const markers = asRecord(summary.markersMap);
  if (!path || !markers) return [];
  return Object.entries(markers).flatMap(([key, marker]) => {
    const end = parseLineKey(key);
    if (!end) return [];
    return asArray(pick(marker, "threads")).flatMap((ref) => {
      const id = asString(pick(ref, "id"));
      const lines = id ? threadLines(end, asString(pick(ref, "start"))) : null;
      return id && lines ? [{ id, path, side: end.side, lines }] : [];
    });
  });
}

function toComment(raw: unknown): ReviewComment | null {
  const comment = asRecord(raw);
  if (!comment) return null;
  return {
    id: asString(comment.databaseId) ?? asString(comment.id) ?? "",
    author: asString(pick(comment, "author", "login")) ?? "unknown",
    avatarUrl: asString(pick(comment, "author", "avatarUrl")) ?? "",
    bodyHtml: asString(comment.bodyHTML) ?? "",
    createdAt: asString(comment.createdAt) ?? "",
    url: asString(comment.url) ?? "",
  };
}

function toThread(location: ThreadLocation, raw: unknown): ReviewThread | null {
  const thread = asRecord(raw);
  if (!thread || thread.subjectType === "FILE") return null;
  const rawComments = asArray(pick(thread, "commentsData", "comments"));
  return {
    ...location,
    isResolved: thread.isResolved === true,
    isOutdated: thread.isOutdated === true,
    // Comments of an unsubmitted review are returned with `state: "pending"`.
    isPending: rawComments.some((comment) => pick(comment, "state") === "pending"),
    comments: rawComments.flatMap((comment) => toComment(comment) ?? []),
  };
}

/** Parses the JSON of `GET /:owner/:repo/pull/:n/changes` (GitHub's internal route data). */
export function parseRouteData(json: unknown): RouteData {
  const route = asRecord(pick(json, "payload", "pullRequestsChangesRoute"));
  const base = parseCommitId(pick(route, "comparison", "fullDiff", "baseOid"));
  const head = parseCommitId(pick(route, "comparison", "fullDiff", "headOid"));
  if (!route || !base || !head) {
    throw new UnexpectedResponseError("pull request route data without the compared commits");
  }
  const summaries = asRecords(route.diffSummaries);
  const threadsById = asRecord(pick(route, "markers", "threads")) ?? {};
  const seen = new Set<string>();
  const threads = summaries.flatMap(locateThreads).flatMap((location) => {
    if (seen.has(location.id)) return [];
    seen.add(location.id);
    return toThread(location, threadsById[location.id]) ?? [];
  });
  return {
    revision: { base, head },
    hasPendingReview: asString(pick(route, "viewerPendingReview", "id")) !== null,
    files: summaries.flatMap((s) => toChangedFile(s) ?? []),
    threads,
  };
}
