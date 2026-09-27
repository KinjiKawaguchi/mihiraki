import type { PostCommentError } from "@mihiraki/core";

/** What to tell the reviewer when a comment could not be posted. */
export function describePostCommentError(error: PostCommentError): string {
  switch (error.kind) {
    case "pendingReviewConflict":
      return "保留中のレビューがあります。単発で送ると保留中のコメントもまとめて公開されるため、「レビューに追加」を使ってください。";
    case "lineNotResolved":
      return "コメントする行を特定できませんでした。表示中の版の後に内容が更新された可能性があります。最新の版を読み込んでから、もう一度コメントしてください。";
    case "rejected":
      return error.detail
        ? `コメントを投稿できませんでした（${error.detail}）`
        : "コメントを投稿できませんでした。";
    case "timeout":
      return "応答がありませんでした。時間をおいて再度お試しください。";
    case "network":
      return "通信できませんでした。ネットワーク接続を確認してください。";
    case "unexpectedResponse":
      return "応答を解釈できませんでした。拡張機能が対応していない変更が入った可能性があります。";
  }
}
