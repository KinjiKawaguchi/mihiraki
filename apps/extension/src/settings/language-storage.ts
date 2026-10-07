import { storage } from "wxt/utils/storage";
import type { LanguageSetting, LanguageSlot } from "./language-setting";

// Values are read back through parseLanguageSetting, so the stored type is not trusted.
const item = storage.defineItem<unknown>("sync:language");

/**
 * The language setting in the browser's synced extension storage, so it follows the viewer
 * to every browser they sign in to (and stays local when sync is off).
 */
export const languageSlot: LanguageSlot = {
  getValue: () => item.getValue(),
  setValue: (value: LanguageSetting) => item.setValue(value),
  watch: (listener) => item.watch((value) => listener(value)),
};
