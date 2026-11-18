/**
 * When deadline reminders are sent (report, Section 5.5).
 *
 * Each active task with work left gets up to three reminders:
 *   1. "atRisk"   - when the available working time falls to twice the remaining work;
 *   2. "critical" - when the available working time falls to the remaining work;
 *   3. "lastHour" - one clock hour before the deadline, as a final warning.
 * The first two follow the task's state changes. The third is fixed, so even a
 * task that is already Critical when it is saved (e.g. an urgent task due
 * today) still gets a reminder.
 * Moments that have already passed are skipped, so a task saved late only
 * receives the reminders that still lie in the future.
 */

import { momentWithHoursLeft, MS_PER_HOUR, type WorkTime } from "./capacity";
import { AT_RISK_RATIO } from "./priority";

export type ReminderKind = "atRisk" | "critical" | "lastHour";

/** The final reminder is sent this many clock hours before the deadline. */
export const LAST_REMINDER_HOURS = 1;

export interface PlannedReminder {
  kind: ReminderKind;
  at: Date;
}

/** The reminders of a task that still lie in the future, earliest first. */
export function plannedReminders(
  deadline: Date,
  workLeft: number,
  now: Date,
  time: WorkTime,
): PlannedReminder[] {
  if (workLeft <= 0) return [];

  const reminders: PlannedReminder[] = [];
  const atRisk = momentWithHoursLeft(deadline, workLeft / AT_RISK_RATIO, now, time);
  if (atRisk) reminders.push({ kind: "atRisk", at: atRisk });
  const critical = momentWithHoursLeft(deadline, workLeft, now, time);
  if (critical) reminders.push({ kind: "critical", at: critical });
  const lastHour = new Date(deadline.getTime() - LAST_REMINDER_HOURS * MS_PER_HOUR);
  if (lastHour.getTime() > now.getTime()) reminders.push({ kind: "lastHour", at: lastHour });

  // Sorting is stable, so reminders due at the same moment keep the order above.
  return reminders.sort((a, b) => a.at.getTime() - b.at.getTime());
}
