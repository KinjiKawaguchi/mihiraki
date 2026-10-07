import { type Locale, resolveLocale } from "@mihiraki/ui";

/** The language the viewer chose for Mihiraki; "auto" follows the browser's languages. */
export type LanguageSetting = "auto" | Locale;

export const LANGUAGE_SETTINGS: readonly LanguageSetting[] = ["auto", "ja", "en"];

/** Stored values may come from another version of the extension; anything unknown follows the browser. */
export function parseLanguageSetting(value: unknown): LanguageSetting {
  return LANGUAGE_SETTINGS.find((setting) => setting === value) ?? "auto";
}

export function localeOf(setting: LanguageSetting, preferredLanguages: readonly string[]): Locale {
  return setting === "auto" ? resolveLocale(preferredLanguages) : setting;
}

/** Where the setting is kept, e.g. an item of the browser's synced extension storage. */
export interface LanguageSlot {
  getValue(): Promise<unknown>;
  setValue(value: LanguageSetting): Promise<void>;
  /** Calls `listener` with the new value whenever it changes, until the returned function is called. */
  watch(listener: (value: unknown) => void): () => void;
}

/** The language to show, from the stored setting. */
export async function readLocale(
  slot: LanguageSlot,
  preferredLanguages: readonly string[],
): Promise<Locale> {
  return localeOf(parseLanguageSetting(await slot.getValue()), preferredLanguages);
}

/** Calls `listener` with the language to show whenever the setting changes. */
export function watchLocale(
  slot: LanguageSlot,
  preferredLanguages: readonly string[],
  listener: (locale: Locale) => void,
): () => void {
  return slot.watch((value) => listener(localeOf(parseLanguageSetting(value), preferredLanguages)));
}
