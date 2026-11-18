/**
 * The app's current language (report, Section 5.8).
 *
 * The language is kept in one place and screens read it with `useI18n()`,
 * so every screen updates as soon as the language changes in Settings.
 * Code outside React (e.g. the notification texts) uses `getLanguage()`.
 */

import { useSyncExternalStore } from "react";
import { I18nManager } from "react-native";

import { formattersFor, type Formatters } from "@/logic/format";

import {
  resolveLanguage,
  translate,
  type Language,
  type LanguageSetting,
  type Params,
  type TranslationKey,
} from "./translate";

export type { Language, LanguageSetting, TranslationKey } from "./translate";

/** The phone's language, e.g. "tr_TR" or "en-US". */
function deviceLocale(): string {
  try {
    const constants = I18nManager.getConstants() as { localeIdentifier?: string | null };
    const identifier = constants.localeIdentifier;
    if (identifier) return identifier;
  } catch {
    // Fall through to Intl below.
  }
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return "en";
  }
}

let current: Language = resolveLanguage("system", deviceLocale());
const listeners = new Set<() => void>();

/** The language currently shown. */
export function getLanguage(): Language {
  return current;
}

/** Applies the language setting from Settings; screens update automatically. */
export function applyLanguageSetting(setting: LanguageSetting): void {
  const next = resolveLanguage(setting, deviceLocale());
  if (next === current) return;
  current = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Category names are stored in English in the database; this translates the known ones. */
const CATEGORY_KEYS: Record<string, TranslationKey> = {
  Exam: "category.exam",
  Assignment: "category.assignment",
  Project: "category.project",
  Personal: "category.personal",
};

export interface I18n {
  language: Language;
  /** Text for a key, with {placeholders} filled in. */
  t: (key: TranslationKey, params?: Params) => string;
  /** Picks the singular or plural text for a count (Turkish uses one form). */
  plural: (count: number, one: TranslationKey, other: TranslationKey, params?: Params) => string;
  /** Date, time and number formatting in the current language. */
  f: Formatters;
  /** Display name of a category. */
  category: (name: string) => string;
}

function build(language: Language): I18n {
  const t: I18n["t"] = (key, params) => translate(language, key, params);
  return {
    language,
    t,
    plural: (count, one, other, params) => t(count === 1 ? one : other, { count, ...params }),
    f: formattersFor(language),
    category: (name) => (name in CATEGORY_KEYS ? t(CATEGORY_KEYS[name]) : name),
  };
}

const BUNDLES: Record<Language, I18n> = { en: build("en"), tr: build("tr") };

/** Texts and formatters for a language, for code outside React. */
export function i18nFor(language: Language = current): I18n {
  return BUNDLES[language];
}

/** Texts and formatters in the current language; the screen updates when the language changes. */
export function useI18n(): I18n {
  const language = useSyncExternalStore(subscribe, getLanguage);
  return BUNDLES[language];
}
