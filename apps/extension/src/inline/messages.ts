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
  /** Shows the file in the rendered view again, from GitHub's own rich diff. */
  readonly showMihirakiView: string;
  readonly showMihirakiViewDescription: string;
}

export const INLINE_MESSAGES: Readonly<Record<Locale, InlineMessages>> = {
  ja: {
    pendingReviewNotice:
      "保留中のコメントは GitHub の「Submit review」から提出できます。件数に反映されていなければ再読み込みしてください。",
    showGitHubView: "GitHub の表示に戻す",
    showGitHubViewDescription:
      "このファイルを GitHub 本来の rich diff で表示します。上に出る「Mihiraki で表示」で戻せます。",
    showMihirakiView: "Mihiraki で表示",
    showMihirakiViewDescription: "このファイルを Mihiraki の左右分割の表示に戻します。",
  },
  en: {
    pendingReviewNotice:
      "Submit pending comments with GitHub’s “Submit review”. Reload the page if its count does not include them.",
    showGitHubView: "Show GitHub’s view",
    showGitHubViewDescription:
      "Shows this file in GitHub’s own rich diff. Use “Show in Mihiraki” above it to come back.",
    showMihirakiView: "Show in Mihiraki",
    showMihirakiViewDescription: "Shows this file in Mihiraki’s side-by-side view again.",
  },
};
