/**
 * Language support (report, Section 5.8): English and Turkish.
 *
 * This file is pure (no React, no device access), so it can be unit-tested.
 * Texts live in en.ts and tr.ts; a text can contain placeholders such as
 * "{title}", which `translate` fills in.
 */

import { en } from "./en";
import { tr } from "./tr";

export type Language = "en" | "tr";

/** What the user chose in Settings: follow the phone, or a fixed language. */
export type LanguageSetting = "system" | Language;

export const LANGUAGE_SETTINGS: readonly LanguageSetting[] = ["system", "tr", "en"];

export type TranslationKey = keyof typeof en;

/** Every language must provide every text (checked by TypeScript). */
export type Dictionary = Record<TranslationKey, string>;

const DICTIONARIES: Record<Language, Dictionary> = { en, tr };

export type Params = Record<string, string | number>;

/** Returns the text for `key` in `language`, with {placeholders} replaced. */
export function translate(language: Language, key: TranslationKey, params?: Params): string {
  const text = DICTIONARIES[language][key];
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

/**
 * The language to use: the user's fixed choice, or for "system" the phone's
 * language (Turkish phones get Turkish, every other language gets English).
 * `deviceLocale` looks like "tr-TR", "tr_TR" or "en-US".
 */
export function resolveLanguage(setting: LanguageSetting, deviceLocale: string): Language {
  if (setting === "en" || setting === "tr") return setting;
  return deviceLocale.toLowerCase().startsWith("tr") ? "tr" : "en";
}

export function isLanguageSetting(value: unknown): value is LanguageSetting {
  return value === "system" || value === "en" || value === "tr";
}
