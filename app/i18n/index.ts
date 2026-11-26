import { en, type MessageKey, type Messages } from "./en";
import { catalogs } from "./catalogs";

export const SUPPORTED_LOCALES = [
  "en",
  "ar",
  "bg",
  "cs",
  "da",
  "de",
  "el",
  "es",
  "fi",
  "fr",
  "he",
  "hi",
  "hr",
  "hu",
  "id",
  "it",
  "ja",
  "ko",
  "lt",
  "ms",
  "nb",
  "nl",
  "pl",
  "pt-BR",
  "pt-PT",
  "ro",
  "ru",
  "sk",
  "sl",
  "sv",
  "th",
  "tr",
  "ur",
  "vi",
  "zh-CN",
  "zh-TW",
] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

const ALIASES: Record<string, AppLocale> = {
  en: "en",
  "en-us": "en",
  "en-gb": "en",
  es: "es",
  "es-es": "es",
  "es-mx": "es",
  "es-419": "es",
  fr: "fr",
  "fr-fr": "fr",
  "fr-ca": "fr",
  de: "de",
  "de-de": "de",
  it: "it",
  ja: "ja",
  ko: "ko",
  nl: "nl",
  da: "da",
  sv: "sv",
  fi: "fi",
  pl: "pl",
  cs: "cs",
  sk: "sk",
  sl: "sl",
  hr: "hr",
  hu: "hu",
  ro: "ro",
  bg: "bg",
  el: "el",
  tr: "tr",
  ar: "ar",
  he: "he",
  hi: "hi",
  ur: "ur",
  th: "th",
  vi: "vi",
  id: "id",
  ms: "ms",
  lt: "lt",
  nb: "nb",
  no: "nb",
  nn: "nb",
  "pt-br": "pt-BR",
  "pt-pt": "pt-PT",
  pt: "pt-BR",
  "zh-cn": "zh-CN",
  "zh-hans": "zh-CN",
  zh: "zh-CN",
  "zh-tw": "zh-TW",
  "zh-hant": "zh-TW",
};

export function localeFromRequest(request: Request): AppLocale {
  const url = new URL(request.url);
  return negotiateLocale(
    url.searchParams.get("locale") || url.searchParams.get("lang") || "en",
  );
}

export function negotiateLocale(raw: string | null | undefined): AppLocale {
  const value = String(raw || "en")
    .trim()
    .replace(/_/g, "-")
    .toLowerCase();
  if (!value) return "en";
  if (ALIASES[value]) return ALIASES[value];
  const prefix = value.split("-")[0] ?? "en";
  return ALIASES[prefix] ?? "en";
}

export function toBcp47(locale: AppLocale): string {
  return locale;
}

export function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.split(`{${key}}`).join(String(value));
  }
  return result;
}

export function messagesFor(locale: AppLocale): Messages {
  if (locale === "en") return en;
  const extra = catalogs[locale];
  if (!extra) return en;
  return { ...en, ...extra };
}

export function t(
  localeOrMessages: AppLocale | Messages,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const messages =
    typeof localeOrMessages === "string"
      ? messagesFor(localeOrMessages)
      : localeOrMessages;
  return interpolate(messages[key] ?? en[key] ?? key, vars);
}

export function plural(
  localeOrMessages: AppLocale | Messages,
  key: MessageKey,
  count: number,
  vars?: Record<string, string | number>,
): string {
  const otherKey = `${key}_other` as MessageKey;
  const chosen = count === 1 ? key : otherKey in en ? otherKey : key;
  return t(localeOrMessages, chosen, { count, ...vars });
}

export type { MessageKey, Messages };
export { en };
