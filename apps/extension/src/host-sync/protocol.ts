import type { CommentMode, CommentTarget } from "@mihiraki/core";
import { asRecord, asString } from "../github/json";

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
} as const;

export interface ThreadCreatedMessage {
  readonly target: CommentTarget;
  readonly mode: CommentMode;
  /** The `thread` object GitHub returned from create_review_comment. */
  readonly thread: Readonly<Record<string, unknown>>;
}

/** GitHub's description of a thread's position (its `subject` / `positioning`). */
export function threadSubjectOf(target: CommentTarget) {
  return {
    path: target.path,
    startLine: target.startLine ?? target.line,
    startDiffSide: target.side,
    endLine: target.line,
    endDiffSide: target.side,
    isOutdated: false,
  };
}

/** GitHub keys threads by side and last line, e.g. `R20` or `L5`. */
export function diffLineKeyOf(target: CommentTarget): string {
  return `${target.side === "LEFT" ? "L" : "R"}${target.line}`;
}

function parseTarget(value: unknown): CommentTarget | null {
  const record = asRecord(value);
  const path = asString(record?.path);
  const side = record?.side;
  const line = record?.line;
  const startLine = record?.startLine;
  if (!path || (side !== "LEFT" && side !== "RIGHT") || !Number.isInteger(line)) return null;
  if (startLine !== null && !Number.isInteger(startLine)) return null;
  return { path, side, line: line as number, startLine: startLine as number | null };
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

/** Validates a message; page scripts can dispatch the same events, so nothing is trusted. */
export function toThreadCreatedMessage(value: unknown): ThreadCreatedMessage | null {
  const record = asRecord(value);
  const target = parseTarget(record?.target);
  const mode = record?.mode;
  const thread = asRecord(record?.thread);
  if (!target || (mode !== "single" && mode !== "review") || !thread || !asString(thread.id))
    return null;
  return { target, mode, thread };
}

export function parseThreadCreatedMessage(json: string): ThreadCreatedMessage | null {
  return toThreadCreatedMessage(parseJson(json));
}
