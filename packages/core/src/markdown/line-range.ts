import type { LineRange } from "./types";

function isLineNumber(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 1;
}

/** Reads a line range from outside input; null unless both ends are line numbers in order. */
export function parseLineRange(start: unknown, end: unknown): LineRange | null {
  return isLineNumber(start) && isLineNumber(end) && start <= end ? { start, end } : null;
}
