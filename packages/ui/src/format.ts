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

const RELATIVE_UNITS: readonly (readonly [Intl.RelativeTimeFormatUnit, number])[] = [
  ["year", 365 * 86400],
  ["month", 30 * 86400],
  ["week", 7 * 86400],
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

/** "3 minutes ago" / "3 分前", in the largest whole unit; the last minute is "now". */
export function formatRelativeTime(iso: string, now: Date, locale: string): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return "";
  const seconds = Math.round((now.getTime() - time) / 1000);
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const unit = RELATIVE_UNITS.find(([, size]) => Math.abs(seconds) >= size);
  if (!unit) return format.format(0, "second");
  const [name, size] = unit;
  return format.format(-Math.floor(seconds / size), name);
}
