import { type CommentMode, type CommentTarget, parseLineRange } from "@mihiraki/core";
import { DIFF_SIDE, formatLineKey } from "../github/diff-side";
import { asRecord, asString } from "../github/json";

/** Where a thread sits; the bridge does not need to know which revision it was selected in. */
export type ThreadPosition = Omit<CommentTarget, "revision">;

/**
 * Events exchanged between the extension's isolated world and the bridge running in the
 * page's main world (only the latter can reach GitHub's React stores). Payloads are JSON
 * strings because objects do not cross the world boundary.
 */
export const HOST_SYNC_EVENTS = {
  ping: "mihiraki:host-ping",
  pong: "mihiraki:host-pong",
  threadCreated: "mihiraki:thread-created",
  threadRegistered: "mihiraki:thread-registered",
  hostThreadsChanged: "mihiraki:host-threads-changed",
  diffLayoutRequest: "mihiraki:diff-layout-request",
  diffLayout: "mihiraki:diff-layout",
} as const;

export interface ThreadCreatedMessage {
  readonly target: ThreadPosition;
  readonly mode: CommentMode;
  /** The `thread` object GitHub returned from create_review_comment. */
  readonly thread: Readonly<Record<string, unknown>>;
}

/** GitHub's description of a thread's position (its `subject` / `positioning`). */
export function threadSubjectOf(target: ThreadPosition) {
  const side = DIFF_SIDE[target.side];
  return {
    path: target.path,
    startLine: target.lines.start,
    startDiffSide: side,
    endLine: target.lines.end,
    endDiffSide: side,
    isOutdated: false,
  };
}

/** GitHub keys threads by side and last line, e.g. `R20` or `L5`. */
export function diffLineKeyOf(target: ThreadPosition): string {
  return formatLineKey({ side: target.side, line: target.lines.end });
}

function parseTarget(value: unknown): ThreadPosition | null {
  const record = asRecord(value);
  const path = asString(record?.path);
  const side = record?.side;
  const lines = asRecord(record?.lines);
  const range = parseLineRange(lines?.start, lines?.end);
  if (!path || (side !== "base" && side !== "head") || !range) return null;
  return { path, side, lines: range };
}

/** Parses an event payload; anything that is not JSON becomes null. */
export function parseJson(json: unknown): unknown {
  if (typeof json !== "string") return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** A ThreadCreatedMessage checked by the bridge, with the id GitHub's stores key threads by. */
export interface ThreadRegistration extends ThreadCreatedMessage {
  readonly threadId: number;
}

/** GitHub's stores use numeric thread ids; anything else (e.g. a node id) cannot be registered. */
function parseThreadId(value: unknown): number | null {
  const id = Number(asString(value));
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** Validates a message; page scripts can dispatch the same events, so nothing is trusted. */
export function toThreadRegistration(value: unknown): ThreadRegistration | null {
  const record = asRecord(value);
  const target = parseTarget(record?.target);
  const mode = record?.mode;
  const thread = asRecord(record?.thread);
  const threadId = parseThreadId(thread?.id);
  if (!target || (mode !== "single" && mode !== "review") || !thread || threadId === null)
    return null;
  return { target, mode, thread, threadId };
}

export function parseThreadCreatedMessage(json: string): ThreadRegistration | null {
  return toThreadRegistration(parseJson(json));
}
