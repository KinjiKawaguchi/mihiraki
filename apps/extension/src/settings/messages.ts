import type { Locale } from "@mihiraki/ui";

/** Texts of the toolbar popup. */
export interface PopupMessages {
  readonly language: string;
  /** The "auto" choice, naming the language the browser's settings give. */
  readonly followBrowser: (languageName: string) => string;
  readonly usage: string;
}

/** Each language is named in itself, so a reader can find their own whatever is shown. */
export const LANGUAGE_NAMES: Readonly<Record<Locale, string>> = { ja: "日本語", en: "English" };

export const POPUP_MESSAGES: Readonly<Record<Locale, PopupMessages>> = {
  ja: {
    language: "表示言語",
    followBrowser: (languageName) => `ブラウザの設定に合わせる（${languageName}）`,
    usage:
      "プルリクエストの Files changed で、Markdown ファイルを rich diff に切り替えると使えます。",
  },
  en: {
    language: "Display language",
    followBrowser: (languageName) => `Match the browser (${languageName})`,
    usage:
      "Switch a Markdown file to the rich diff on a pull request’s Files changed tab to use it.",
  },
};
