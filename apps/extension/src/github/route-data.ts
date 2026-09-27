import type { ChangedFile, FileChangeType, ReviewComment, ReviewThread, Side } from '@better-gh-md/core';
import { asArray, asRecord, asRecords, asString, pick, type JsonRecord } from './json';

export interface RouteData {
  readonly baseOid: string;
  readonly headOid: string;
  readonly files: readonly ChangedFile[];
  readonly threads: readonly ReviewThread[];
}

interface ThreadLocation {
  readonly id: string;
  readonly path: string;
  readonly side: Side;
  readonly line: number;
  readonly startLine: number | null;
}

const CHANGE_TYPES: readonly FileChangeType[] = ['ADDED', 'MODIFIED', 'REMOVED', 'RENAMED'];
const MARKER_KEY = /^([RL])(\d+)$/;

function toChangedFile(summary: JsonRecord): ChangedFile | null {
  const path = asString(summary['path']);
  if (!path) return null;
  const changeType = CHANGE_TYPES.find((type) => type === summary['changeType']) ?? 'MODIFIED';
  const previousPath = asString(summary['previousPath']) ?? asString(summary['oldPath']);
  return { path, previousPath: previousPath && previousPath !== path ? previousPath : null, changeType };
}

function markerLine(marker: string | null): number | null {
  const match = marker ? MARKER_KEY.exec(marker) : null;
  return match ? Number(match[2]) : null;
}

/** Thread positions come only from `markersMap` keys (`R12` = right side, line 12). */
function locateThreads(summary: JsonRecord): ThreadLocation[] {
  const path = asString(summary['path']);
  const markers = asRecord(summary['markersMap']);
  if (!path || !markers) return [];
  return Object.entries(markers).flatMap(([key, marker]) => {
    const match = MARKER_KEY.exec(key);
    if (!match) return [];
    const side: Side = match[1] === 'L' ? 'LEFT' : 'RIGHT';
    return asArray(pick(marker, 'threads')).flatMap((ref) => {
      const id = asString(pick(ref, 'id'));
      if (!id) return [];
      return [{ id, path, side, line: Number(match[2]), startLine: markerLine(asString(pick(ref, 'start'))) }];
    });
  });
}

function toComment(raw: unknown): ReviewComment | null {
  const comment = asRecord(raw);
  if (!comment) return null;
  return {
    id: asString(comment['databaseId']) ?? asString(comment['id']) ?? '',
    author: asString(pick(comment, 'author', 'login')) ?? 'unknown',
    avatarUrl: asString(pick(comment, 'author', 'avatarUrl')) ?? '',
    bodyHtml: asString(comment['bodyHTML']) ?? '',
    createdAt: asString(comment['createdAt']) ?? '',
    url: asString(comment['url']) ?? '',
  };
}

function toThread(location: ThreadLocation, raw: unknown): ReviewThread | null {
  const thread = asRecord(raw);
  if (!thread || thread['subjectType'] === 'FILE') return null;
  const comments = asArray(pick(thread, 'commentsData', 'comments')).flatMap((c) => toComment(c) ?? []);
  return {
    ...location,
    isResolved: thread['isResolved'] === true,
    isOutdated: thread['isOutdated'] === true,
    comments,
  };
}

/** Parses the JSON of `GET /:owner/:repo/pull/:n/changes` (GitHub's internal route data). */
export function parseRouteData(json: unknown): RouteData {
  const route = asRecord(pick(json, 'payload', 'pullRequestsChangesRoute'));
  const baseOid = asString(pick(route, 'comparison', 'fullDiff', 'baseOid'));
  const headOid = asString(pick(route, 'comparison', 'fullDiff', 'headOid'));
  if (!route || !baseOid || !headOid) {
    throw new Error('GitHubのpull requestデータを解釈できませんでした（内部仕様が変わった可能性があります）');
  }
  const summaries = asRecords(route['diffSummaries']);
  const threadsById = asRecord(pick(route, 'markers', 'threads')) ?? {};
  const seen = new Set<string>();
  const threads = summaries.flatMap(locateThreads).flatMap((location) => {
    if (seen.has(location.id)) return [];
    seen.add(location.id);
    return toThread(location, threadsById[location.id]) ?? [];
  });
  return { baseOid, headOid, files: summaries.flatMap((s) => toChangedFile(s) ?? []), threads };
}
