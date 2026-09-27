import type { CommentMode } from "./types";

/**
 * How a new comment can be posted. While a review is pending only adding to it is
 * possible: a single comment would publish the whole pending review along with it.
 */
export function availableCommentModes(hasPendingReview: boolean): readonly CommentMode[] {
  return hasPendingReview ? ["review"] : ["single", "review"];
}
