import type { Revision } from "./types";

export function isSameRevision(a: Revision, b: Revision): boolean {
  return a.base === b.base && a.head === b.head;
}
