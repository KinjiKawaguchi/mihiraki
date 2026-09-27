import type { ComponentChildren } from "preact";
import { createContext } from "preact";
import { useContext } from "preact/hooks";
import { en } from "./en";
import { ja } from "./ja";
import type { Locale } from "./locale";
import type { Messages } from "./messages";

export const MESSAGES: Readonly<Record<Locale, Messages>> = { ja, en };

const MessagesContext = createContext<Messages>(en);

export function I18nProvider({
  locale,
  children,
}: {
  readonly locale: Locale;
  readonly children: ComponentChildren;
}) {
  return <MessagesContext.Provider value={MESSAGES[locale]}>{children}</MessagesContext.Provider>;
}

/** The texts of the language chosen by the nearest I18nProvider (English without one). */
export function useMessages(): Messages {
  return useContext(MessagesContext);
}
