/**
 * Working-time model (report, Section 5.2.1).
 *
 * The user sets how many hours they can work on each day of the week.
 * The working time available on a day is:
 *
 *   min(daily hours - hours already worked that day, clock hours left that day)
 *
 * So the daily hours are not used up just because time passes: at 16:00 on a
 * 3-hour day with nothing worked yet, all 3 hours are still available. They
 * shrink only when the user logs work, or when fewer clock hours remain
 * before midnight (or before the deadline) than the hours still to work.
 *
 * Only today can have hours already worked; for future days the full daily
 * hours are available.
 *
 * All functions are pure, so they can be unit-tested.
 */

export const MS_PER_HOUR = 60 * 60 * 1000;

/** Upper limit for a single day's working hours. */
export const MAX_DAILY_HOURS = 16;

/**
 * Hours available for work on each weekday, indexed like Date.getDay():
 * 0 = Sunday, 1 = Monday, ..., 6 = Saturday.
 */
export type WeekdayHours = readonly [number, number, number, number, number, number, number];

/** Everything needed to calculate available working time. */
export interface WorkTime {
  weekdayHours: WeekdayHours;
  /** Midnight at the start of today (local time). */
  today: Date;
  /** Hours already worked (logged) today. */
  workedToday: number;
}

/** Midnight at the start of the day containing `date` (local time). */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Midnight at the start of the following day (local time, DST-safe). */
export function startOfNextDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
}

/** Builds a WorkTime for the day containing `now`. */
export function workTime(weekdayHours: WeekdayHours, now: Date, workedToday = 0): WorkTime {
  return { weekdayHours, today: startOfDay(now), workedToday };
}

/** Working hours still to be done on the day starting at `dayStart`. */
function hoursLeftOnDay(dayStart: Date, time: WorkTime): number {
  const daily = time.weekdayHours[dayStart.getDay()];
  const worked = dayStart.getTime() === time.today.getTime() ? time.workedToday : 0;
  return Math.max(0, daily - worked);
}

/** Working hours available between `from` and `to` (0 if `to` is not after `from`). */
export function availableHours(from: Date, to: Date, time: WorkTime): number {
  if (to.getTime() <= from.getTime()) return 0;

  let total = 0;
  for (let day = startOfDay(from); day.getTime() < to.getTime(); day = startOfNextDay(day)) {
    const start = Math.max(day.getTime(), from.getTime());
    const end = Math.min(startOfNextDay(day).getTime(), to.getTime());
    const clockHours = (end - start) / MS_PER_HOUR;
    total += Math.min(hoursLeftOnDay(day, time), clockHours);
  }
  return total;
}

/**
 * The latest moment t (after `now`) such that `hours` of working time are
 * still available between t and `deadline`. Returns null if no more than
 * `hours` of working time is left already (the moment has passed).
 *
 * Used to find when a task changes state (e.g. becomes Critical), which is
 * when its reminder should be delivered.
 */
export function momentWithHoursLeft(deadline: Date, hours: number, now: Date, time: WorkTime): Date | null {
  if (availableHours(now, deadline, time) <= hours) return null;

  // availableHours(t, deadline) never increases as t moves towards the
  // deadline, so a binary search finds the moment to within one minute.
  let low = now.getTime(); // more than `hours` available from here
  let high = deadline.getTime(); // 0 available from here
  while (high - low > 60 * 1000) {
    const mid = Math.floor((low + high) / 2);
    if (availableHours(new Date(mid), deadline, time) > hours) low = mid;
    else high = mid;
  }
  return new Date(high);
}
