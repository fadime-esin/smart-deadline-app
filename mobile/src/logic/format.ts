/**
 * Text helpers for dates, durations and numbers shown in the app, in English
 * and Turkish. Written without Intl so the output is identical on every device.
 *
 * Every function takes the language as its last argument (English by default).
 * Screens normally use the ready-made set from `formattersFor(language)`.
 */

import type { Language } from "../i18n/translate";

interface FormatTexts {
  weekdays: readonly string[];
  months: readonly string[];
  day: string;
  hour: string;
  minute: string;
  decimal: string;
  date: (weekday: string, day: number, month: string, year: number) => string;
  shortDate: (weekday: string, day: number, month: string) => string;
  left: (duration: string) => string;
  overdueBy: (duration: string) => string;
}

const TEXTS: Record<Language, FormatTexts> = {
  en: {
    weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    day: "d",
    hour: "h",
    minute: "min",
    decimal: ".",
    date: (weekday, day, month, year) => `${weekday} ${day} ${month} ${year}`,
    shortDate: (weekday, day, month) => `${weekday} ${day} ${month}`,
    left: (duration) => `${duration} left`,
    overdueBy: (duration) => `Overdue by ${duration}`,
  },
  tr: {
    weekdays: ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"],
    months: ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"],
    day: "g",
    hour: "sa",
    minute: "dk",
    decimal: ",",
    date: (weekday, day, month, year) => `${day} ${month} ${year} ${weekday}`,
    shortDate: (weekday, day, month) => `${day} ${month} ${weekday}`,
    left: (duration) => `${duration} kaldı`,
    overdueBy: (duration) => `${duration} gecikti`,
  },
};

const pad = (n: number) => String(n).padStart(2, "0");

/** "Fri 24 Oct 2026" / "24 Eki 2026 Cum" (local time). */
export function formatDate(date: Date, language: Language = "en"): string {
  const text = TEXTS[language];
  return text.date(text.weekdays[date.getDay()], date.getDate(), text.months[date.getMonth()], date.getFullYear());
}

/** The date without the year: "Fri 24 Oct" / "24 Eki Cum". */
export function formatShortDate(date: Date, language: Language = "en"): string {
  const text = TEXTS[language];
  return text.shortDate(text.weekdays[date.getDay()], date.getDate(), text.months[date.getMonth()]);
}

/** "14:30" (local time, 24-hour clock). */
export function formatTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** "Fri 24 Oct 2026, 14:30". */
export function formatDateTime(date: Date, language: Language = "en"): string {
  return `${formatDate(date, language)}, ${formatTime(date)}`;
}

/** A duration in hours as text, e.g. "45 min", "3 h 20 min", "2 d 5 h". */
export function formatDuration(hours: number, language: Language = "en"): string {
  const text = TEXTS[language];
  const totalMinutes = Math.max(0, Math.round(Math.abs(hours) * 60));
  const days = Math.floor(totalMinutes / (24 * 60));
  const h = Math.floor((totalMinutes % (24 * 60)) / 60);
  const m = totalMinutes % 60;

  if (days > 0) return h > 0 ? `${days} ${text.day} ${h} ${text.hour}` : `${days} ${text.day}`;
  if (h > 0) return m > 0 ? `${h} ${text.hour} ${m} ${text.minute}` : `${h} ${text.hour}`;
  return `${m} ${text.minute}`;
}

/** "5 h left" or "Overdue by 2 h". */
export function formatRemaining(remainingHours: number, language: Language = "en"): string {
  const text = TEXTS[language];
  const duration = formatDuration(remainingHours, language);
  return remainingHours > 0 ? text.left(duration) : text.overdueBy(duration);
}

/** Workload such as "1.5 h" or "30 min" (Turkish: "1,5 sa", "30 dk"). */
export function formatHours(hours: number, language: Language = "en"): string {
  const text = TEXTS[language];
  if (hours < 1) return `${Math.round(hours * 60)} ${text.minute}`;
  return `${String(Number(hours.toFixed(2))).replace(".", text.decimal)} ${text.hour}`;
}

/** A number with the language's decimal sign, e.g. 0.75 -> "0,75" in Turkish. */
export function formatNumber(value: number, digits: number, language: Language = "en"): string {
  return value.toFixed(digits).replace(".", TEXTS[language].decimal);
}

/**
 * Reads an hours value typed by the user. Accepts "1.5" and "1,5".
 * Returns null if it is not a number greater than 0 (or unreasonably large).
 */
export function parseHours(text: string): number | null {
  const normalized = text.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$|^\.\d+$/.test(normalized)) return null;
  const value = Number(normalized);
  return value > 0 && value <= 1000 ? value : null;
}

/** The formatting functions bound to one language. */
export interface Formatters {
  date: (date: Date) => string;
  shortDate: (date: Date) => string;
  time: (date: Date) => string;
  dateTime: (date: Date) => string;
  duration: (hours: number) => string;
  remaining: (remainingHours: number) => string;
  hours: (hours: number) => string;
  number: (value: number, digits: number) => string;
}

function build(language: Language): Formatters {
  return {
    date: (date) => formatDate(date, language),
    shortDate: (date) => formatShortDate(date, language),
    time: formatTime,
    dateTime: (date) => formatDateTime(date, language),
    duration: (hours) => formatDuration(hours, language),
    remaining: (hours) => formatRemaining(hours, language),
    hours: (hours) => formatHours(hours, language),
    number: (value, digits) => formatNumber(value, digits, language),
  };
}

const FORMATTERS: Record<Language, Formatters> = { en: build("en"), tr: build("tr") };

/** The formatters for a language (always the same object for the same language). */
export function formattersFor(language: Language): Formatters {
  return FORMATTERS[language];
}
