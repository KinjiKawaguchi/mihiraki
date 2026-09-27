import type { PostCommentError } from "@mihiraki/core";
import { describeHostFailure } from "../host-errors/describe";

/** What to tell the reviewer when a comment could not be posted. */
export function describePostCommentError(error: PostCommentError): string {
  switch (error.kind) {
    case "pendingReviewConflict":
      return "保留中のレビューがあります。単発で送ると保留中のコメントもまとめて公開されるため、「レビューに追加」を使ってください。";
    case "lineNotResolved":
      return "コメントする行を特定できませんでした。表示中の版の後に内容が更新された可能性があります。最新の版を読み込んでから、もう一度コメントしてください。";
    default:
      return describeHostFailure("コメントを投稿できませんでした", error);
  }
}
