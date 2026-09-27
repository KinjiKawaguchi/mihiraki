import type { Side } from "@mihiraki/core";

/** GitHub's names for the sides of a diff: LEFT is the base file, RIGHT the head file. */
export type DiffSide = "LEFT" | "RIGHT";

export const DIFF_SIDE: Readonly<Record<Side, DiffSide>> = { base: "LEFT", head: "RIGHT" };

/** A line as GitHub keys it, e.g. `L5` (line 5 of the base file) or `R20` (head file). */
export interface LineKey {
  readonly side: Side;
  readonly line: number;
}

const KEY_PREFIX: Readonly<Record<Side, string>> = { base: "L", head: "R" };
const LINE_KEY = /^([LR])(\d+)$/;

export function formatLineKey({ side, line }: LineKey): string {
  return `${KEY_PREFIX[side]}${line}`;
}

export function parseLineKey(value: string | null): LineKey | null {
  const match = value === null ? null : LINE_KEY.exec(value);
  if (!match) return null;
  return { side: match[1] === "L" ? "base" : "head", line: Number(match[2]) };
}
