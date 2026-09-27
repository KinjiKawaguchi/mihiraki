import type { Locale } from "@mihiraki/ui";

/** Texts the extension adds to GitHub's page itself, next to the shared UI's. */
export interface InlineMessages {
  readonly toggle: string;
  readonly toggleTitle: string;
  /**
   * Without host sync, GitHub's "Submit review" counter does not notice comments added
   * from here until the page is reloaded, although submitting still includes them.
   */
  readonly pendingReviewNotice: string;
}

export const INLINE_MESSAGES: Readonly<Record<Locale, InlineMessages>> = {
  ja: {
    toggle: "分割",
    toggleTitle: "Markdownをレンダリングしたまま左右分割で表示",
    pendingReviewNotice:
      "保留中のコメントは GitHub の「Submit review」から提出できます。件数に反映されていなければ再読み込みしてください。",
  },
  en: {
    toggle: "Split",
    toggleTitle: "Show the rendered Markdown side by side",
    pendingReviewNotice:
      "Submit pending comments with GitHub’s “Submit review”. Reload the page if its count does not include them.",
  },
};
