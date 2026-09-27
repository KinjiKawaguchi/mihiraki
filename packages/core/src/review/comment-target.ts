import type { LineRange } from "../markdown/types";
import type { CommentTarget, Revision, Side } from "./types";

/** The review comment position for lines selected in the rendered view. */
export function toCommentTarget(
  path: string,
  side: Side,
  lines: LineRange,
  revision: Revision,
): CommentTarget {
  return {
    path,
    side,
    line: lines.end,
    startLine: lines.start === lines.end ? null : lines.start,
    revision,
  };
}
