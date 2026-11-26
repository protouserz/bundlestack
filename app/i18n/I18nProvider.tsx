import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  messagesFor,
  negotiateLocale,
  t as translate,
  plural as pluralize,
  type AppLocale,
  type MessageKey,
  type Messages,
} from "./index";

type I18nValue = {
  locale: AppLocale;
  messages: Messages;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
  plural: (
    key: MessageKey,
    count: number,
    vars?: Record<string, string | number>,
  ) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  children,
}: {
  locale: string;
  children: ReactNode;
}) {
  const value = useMemo(() => {
    const resolved = negotiateLocale(locale);
    const messages = messagesFor(resolved);
    return {
      locale: resolved,
      messages,
      t: (key: MessageKey, vars?: Record<string, string | number>) =>
        translate(messages, key, vars),
      plural: (
        key: MessageKey,
        count: number,
        vars?: Record<string, string | number>,
      ) => pluralize(messages, key, count, vars),
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) {
    const messages = messagesFor("en");
    return {
      locale: "en",
      messages,
      t: (key, vars) => translate(messages, key, vars),
      plural: (key, count, vars) => pluralize(messages, key, count, vars),
    };
  }
  return value;
}
