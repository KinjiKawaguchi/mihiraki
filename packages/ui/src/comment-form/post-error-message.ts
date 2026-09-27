import type { PostCommentError } from "@mihiraki/core";
import { describeHostFailure } from "../host-errors/describe";
import type { Messages } from "../i18n/messages";

/** What to tell the reviewer when a comment could not be posted. */
export function describePostCommentError(t: Messages, error: PostCommentError): string {
  switch (error.kind) {
    case "pendingReviewConflict":
      return t.pendingReviewConflict;
    case "lineNotResolved":
      return t.lineNotResolved;
    default:
      return describeHostFailure(t, t.couldNotPostComment, error);
  }
}
