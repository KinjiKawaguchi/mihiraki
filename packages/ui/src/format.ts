import type { LineRange, Side } from "@mihiraki/core";

/** GitHub's notation: L for lines of the base (left) file, R for the head (right) file. */
const SIDE_PREFIX: Readonly<Record<Side, string>> = {
  base: "L",
  head: "R",
};

export function formatLineRange(side: Side, lines: LineRange): string {
  const prefix = SIDE_PREFIX[side];
  return lines.start === lines.end
    ? `${prefix}${lines.start}`
    : `${prefix}${lines.start}〜${prefix}${lines.end}`;
}

export function formatDateTime(iso: string, locale: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString(locale);
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
