import type { Locale } from "@mihiraki/ui";

/** Texts the extension adds to GitHub's page itself, next to the shared UI's. */
export interface InlineMessages {
  /**
   * Without host sync, GitHub's "Submit review" counter does not notice comments added
   * from here until the page is reloaded, although submitting still includes them.
   */
  readonly pendingReviewNotice: string;
  /** Shows the file in GitHub's own rich diff instead of the rendered view. */
  readonly showGitHubView: string;
  readonly showGitHubViewDescription: string;
}

export const INLINE_MESSAGES: Readonly<Record<Locale, InlineMessages>> = {
  ja: {
    pendingReviewNotice:
      "保留中のコメントは GitHub の「Submit review」から提出できます。件数に反映されていなければ再読み込みしてください。",
    showGitHubView: "GitHub の表示に戻す",
    showGitHubViewDescription:
      "このファイルを GitHub 本来の rich diff で表示します。ソース表示に切り替えてから rich diff に戻すと、Mihiraki の表示に戻ります。",
  },
  en: {
    pendingReviewNotice:
      "Submit pending comments with GitHub’s “Submit review”. Reload the page if its count does not include them.",
    showGitHubView: "Show GitHub’s view",
    showGitHubViewDescription:
      "Shows this file in GitHub’s own rich diff. Switch to the source diff and back to the rich diff to return to Mihiraki.",
  },
};
