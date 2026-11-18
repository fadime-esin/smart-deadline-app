/**
 * Date helpers for the Tasks and Calendar screens (report, Section 6.2).
 * Weeks start on Monday. All functions are pure, so they can be unit-tested.
 */

import { startOfDay } from "./capacity";

/** "2026-10-27": a stable key for a calendar day (local time). */
export function dayKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

/** Midnight at the start of the Monday of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const day = startOfDay(date);
  const sinceMonday = (day.getDay() + 6) % 7; // Monday = 0 ... Sunday = 6
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() - sinceMonday);
}

/**
 * The days of a month arranged in weeks (Monday first), for a calendar grid.
 * Cells before the 1st and after the last day of the month are null.
 * `month` is 0-based, like Date.getMonth().
 */
export function monthGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leading = (first.getDay() + 6) % 7;

  const cells: (Date | null)[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export type DeadlineGroup = "overdue" | "thisWeek" | "nextWeek" | "later";

/** Which section of the Tasks screen a deadline belongs to, seen from `now`. */
export function deadlineGroup(deadline: Date, now: Date): DeadlineGroup {
  if (deadline.getTime() <= now.getTime()) return "overdue";
  const weekStart = startOfWeek(now);
  const nextWeek = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 7);
  const weekAfter = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 14);
  if (deadline.getTime() < nextWeek.getTime()) return "thisWeek";
  if (deadline.getTime() < weekAfter.getTime()) return "nextWeek";
  return "later";
}

/**
 * Groups tasks into Overdue / This week / Next week / Later, each sorted by
 * deadline (earliest first). Empty groups are left out. The group titles are
 * translated by the screen.
 */
export function groupByDeadline<T extends { deadline: Date }>(
  tasks: readonly T[],
  now: Date,
): { group: DeadlineGroup; data: T[] }[] {
  const order: DeadlineGroup[] = ["overdue", "thisWeek", "nextWeek", "later"];
  return order
    .map((group) => ({
      group,
      data: tasks
        .filter((task) => deadlineGroup(task.deadline, now) === group)
        .sort((a, b) => a.deadline.getTime() - b.deadline.getTime()),
    }))
    .filter((section) => section.data.length > 0);
}
