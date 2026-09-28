import type { DiffLayout } from "@mihiraki/ui";

/** GitHub's split / unified setting as it appears in its data ("split" or "unified"). */
export function parseDiffLayout(value: unknown): DiffLayout | null {
  return value === "split" || value === "unified" ? value : null;
}
