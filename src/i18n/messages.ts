import { defaultLocale, locales, type LocaleCode } from "./config";
import zhHans from "./locales/zh-Hans.json";
import zhHant from "./locales/zh-Hant.json";
import en from "./locales/en.json";

export type { LocaleCode };

// MessageKey is derived from the default locale JSON — all keys must exist there.
export type MessageKey = keyof typeof zhHans;

type Messages = Record<MessageKey, string>;

const messageMap: Record<LocaleCode, Partial<Messages>> = {
  "zh-Hans": zhHans,
  "zh-Hant": zhHant,
  en,
};

const defaultMessages: Messages = zhHans;

export type LocaleConfig = {
  code: LocaleCode;
  label: string;
  shortLabel: string;
};

export const localeConfigs: LocaleConfig[] = [
  { code: "zh-Hans", label: "简体中文", shortLabel: "简" },
  { code: "zh-Hant", label: "繁體中文", shortLabel: "繁" },
  { code: "en", label: "English", shortLabel: "EN" },
];

export { locales };

export function makeTranslator(locale: LocaleCode) {
  const messages = messageMap[locale] ?? messageMap[defaultLocale];
  return (key: MessageKey, params?: Record<string, string | number>): string => {
    const template = messages[key] ?? defaultMessages[key];
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
  };
}
