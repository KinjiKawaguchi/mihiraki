import { resolveLocale } from "@mihiraki/ui";
import { useEffect, useState } from "preact/hooks";
import {
  LANGUAGE_SETTINGS,
  type LanguageSetting,
  type LanguageSlot,
  localeOf,
  parseLanguageSetting,
} from "./language-setting";
import { LANGUAGE_NAMES, POPUP_MESSAGES } from "./messages";

export interface SettingsPopupProps {
  readonly slot: LanguageSlot;
  /** The browser's languages, e.g. `navigator.languages`. */
  readonly preferredLanguages: readonly string[];
}

/** The stored setting, kept current while the popup is open; null until read. */
function useLanguageSetting(slot: LanguageSlot) {
  const [setting, setSetting] = useState<LanguageSetting | null>(null);
  useEffect(() => {
    let isCurrent = true;
    void slot.getValue().then((value) => {
      if (isCurrent) setSetting(parseLanguageSetting(value));
    });
    const stopWatching = slot.watch((value) => setSetting(parseLanguageSetting(value)));
    return () => {
      isCurrent = false;
      stopWatching();
    };
  }, [slot]);

  const choose = (next: LanguageSetting) => {
    const previous = setting;
    setSetting(next);
    // The choice is shown at once; if it cannot be stored, show what is still in effect.
    slot.setValue(next).catch(() => setSetting(previous));
  };
  return { setting, choose };
}

/** The toolbar popup: the display language, and a reminder of where Mihiraki appears. */
export function SettingsPopup({ slot, preferredLanguages }: SettingsPopupProps) {
  const { setting, choose } = useLanguageSetting(slot);
  if (setting === null) return null;
  const locale = localeOf(setting, preferredLanguages);
  const t = POPUP_MESSAGES[locale];
  const browserLanguage = LANGUAGE_NAMES[resolveLocale(preferredLanguages)];
  return (
    <main class="popup" lang={locale}>
      <h1 class="popup__title">Mihiraki for GitHub</h1>
      <fieldset class="popup__field">
        <legend>{t.language}</legend>
        {LANGUAGE_SETTINGS.map((option) => (
          <label key={option} class="popup__choice">
            <input
              type="radio"
              name="language"
              value={option}
              checked={option === setting}
              onChange={() => choose(option)}
            />
            {option === "auto" ? t.followBrowser(browserLanguage) : LANGUAGE_NAMES[option]}
          </label>
        ))}
      </fieldset>
      <p class="popup__usage">{t.usage}</p>
    </main>
  );
}
