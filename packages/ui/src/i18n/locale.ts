/** Languages the UI is written in. */
export type Locale = "ja" | "en";

const SUPPORTED: readonly Locale[] = ["ja", "en"];

function isLocale(value: string): value is Locale {
  return SUPPORTED.some((locale) => locale === value);
}

/**
 * The first of the reader's preferred languages (e.g. `navigator.languages`) the UI is
 * written in, matched by primary subtag; English otherwise.
 */
export function resolveLocale(preferred: readonly string[]): Locale {
  return preferred.map((tag) => tag.toLowerCase().split("-")[0] ?? "").find(isLocale) ?? "en";
}
