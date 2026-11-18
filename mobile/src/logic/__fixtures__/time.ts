import { workTime, type WeekdayHours, type WorkTime } from "../capacity";

/**
 * Test helpers. Dates are built in local time so the tests give the same
 * result in every time zone. Week of Mon 2 Nov 2026 (no DST change).
 */
export const at = (day: number, hour: number, minute = 0) => new Date(2026, 10, day, hour, minute);

/** Mon 2 Nov 2026, 08:00. */
export const MONDAY_8AM = at(2, 8);

/** Every clock hour is working time, so available time = clock time. */
export const ALL_HOURS: WeekdayHours = [24, 24, 24, 24, 24, 24, 24];

/** 4 h of work every day. */
export const FOUR_A_DAY: WeekdayHours = [4, 4, 4, 4, 4, 4, 4];

export const NO_TIME: WeekdayHours = [0, 0, 0, 0, 0, 0, 0];

/** WorkTime for `now` with nothing worked yet today. */
export const fresh = (weekdayHours: WeekdayHours, now: Date): WorkTime => workTime(weekdayHours, now);
