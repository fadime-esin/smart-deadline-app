/**
 * User settings stored in the local database (report, Section 5.4):
 * the working hours per weekday, the optional safety margin, the optional
 * name used in the greeting and the language of the app.
 */

import type { SQLiteDatabase } from "expo-sqlite";

import { isLanguageSetting, type LanguageSetting } from "@/i18n/translate";
import { MAX_DAILY_HOURS, type WeekdayHours } from "@/logic/capacity";

export interface Settings {
  /** Hours available for work, indexed like Date.getDay() (0 = Sunday). */
  weekdayHours: WeekdayHours;
  /** Extra time added to every estimate, e.g. 0.2 = +20%. 0 = off (the default). */
  safetyMargin: number;
  /** Optional first name for the greeting ("Good evening, ..."); empty = no name. */
  userName: string;
  /** "system" follows the phone's language; "en" / "tr" fix the language. */
  language: LanguageSetting;
}

/** Longest name accepted for the greeting. */
export const MAX_NAME_LENGTH = 30;

/** Starting values; the user can change them on the Settings screen. */
export const DEFAULT_SETTINGS: Settings = {
  weekdayHours: [5, 3, 3, 3, 3, 3, 5],
  safetyMargin: 0,
  userName: "",
  language: "system",
};

/** Margins offered on the Settings screen once the safety margin is switched on. */
export const SAFETY_MARGIN_OPTIONS = [0.1, 0.2, 0.3, 0.5, 0.75, 1] as const;

/** Margin selected when the user first switches the safety margin on. */
export const DEFAULT_ENABLED_MARGIN = 0.2;

function isWeekdayHours(value: unknown): value is WeekdayHours {
  return (
    Array.isArray(value) &&
    value.length === 7 &&
    value.every((h) => typeof h === "number" && h >= 0 && h <= MAX_DAILY_HOURS)
  );
}

/** Reads the settings, falling back to the defaults for missing or damaged values. */
export async function getSettings(db: SQLiteDatabase): Promise<Settings> {
  const rows = await db.getAllAsync<{ key: string; value: string }>("SELECT key, value FROM settings");
  const values = new Map(rows.map((row) => [row.key, row.value]));

  const parse = (key: string): unknown => {
    try {
      const raw = values.get(key);
      return raw === undefined ? undefined : JSON.parse(raw);
    } catch {
      return undefined;
    }
  };

  const weekdayHours = parse("weekdayHours");
  const safetyMargin = parse("safetyMargin");
  const userName = parse("userName");
  const language = parse("language");
  return {
    weekdayHours: isWeekdayHours(weekdayHours) ? weekdayHours : DEFAULT_SETTINGS.weekdayHours,
    safetyMargin:
      typeof safetyMargin === "number" && safetyMargin >= 0 && safetyMargin <= 1
        ? safetyMargin
        : DEFAULT_SETTINGS.safetyMargin,
    userName: typeof userName === "string" ? userName.slice(0, MAX_NAME_LENGTH) : DEFAULT_SETTINGS.userName,
    language: isLanguageSetting(language) ? language : DEFAULT_SETTINGS.language,
  };
}

/**
 * Whether the user confirmed the background setup ("autostart") on phones
 * that need it. Stored on its own, not in Settings, so that saving the other
 * settings can never overwrite it.
 */
export async function getBackgroundSetupDone(db: SQLiteDatabase): Promise<boolean> {
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = ?", "backgroundSetupDone");
  return row?.value === "true";
}

export async function setBackgroundSetupDone(db: SQLiteDatabase, done: boolean): Promise<void> {
  await db.runAsync(
    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    "backgroundSetupDone",
    JSON.stringify(done),
  );
}

export async function saveSettings(db: SQLiteDatabase, settings: Settings): Promise<void> {
  await db.runAsync(
    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?), (?, ?), (?, ?), (?, ?)",
    "weekdayHours",
    JSON.stringify(settings.weekdayHours),
    "safetyMargin",
    JSON.stringify(settings.safetyMargin),
    "userName",
    JSON.stringify(settings.userName.trim().slice(0, MAX_NAME_LENGTH)),
    "language",
    JSON.stringify(settings.language),
  );
}
