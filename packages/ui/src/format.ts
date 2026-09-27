import type { LineRange, Side } from '@better-gh-md/core';

export const SIDE_LABEL: Readonly<Record<Side, string>> = {
  LEFT: '変更前',
  RIGHT: '変更後',
};

export function formatLineRange(lines: LineRange): string {
  return lines.start === lines.end ? `L${lines.start}` : `L${lines.start}–L${lines.end}`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString();
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
