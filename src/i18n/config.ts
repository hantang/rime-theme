export const locales = ["zh-Hans", "zh-Hant", "en"] as const;
export type LocaleCode = (typeof locales)[number];
export const defaultLocale: LocaleCode = "zh-Hans";
