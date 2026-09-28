import { mergeBlockHtml } from "../diff/inline-diff";
import type { Side } from "../review/types";
import type { SplitCell, SplitRow } from "./split-document";

/** What one aligned row shows in a single-column view, and which version its lines are in. */
export interface UnifiedCell {
  readonly side: Side;
  readonly cell: SplitCell;
}

/**
 * A row as one block: removed blocks from the base version, everything else from the
 * head version, a modified block with its removed words put back in place.
 */
export function unifiedCell(row: SplitRow): UnifiedCell {
  switch (row.kind) {
    case "removed":
      return { side: "base", cell: row.base };
    case "added":
    case "unchanged":
      return { side: "head", cell: row.head };
    case "modified":
      return {
        side: "head",
        cell: {
          block: row.head.block,
          html: mergeBlockHtml(row.base.block.html, row.head.block.html),
        },
      };
  }
}
