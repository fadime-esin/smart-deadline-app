import { availableHours, momentWithHoursLeft, workTime, type WeekdayHours } from "../capacity";
import { ALL_HOURS, at, FOUR_A_DAY, fresh, MONDAY_8AM } from "../__fixtures__/time";

describe("availableHours", () => {
  it("keeps all of today's hours available if nothing has been worked yet", () => {
    // Friday 16:42 with 3 h set for Fridays and nothing logged: all 3 h are left.
    const friday: WeekdayHours = [0, 0, 0, 0, 0, 3, 0];
    const now = at(6, 16, 42);
    expect(availableHours(now, at(7, 0), fresh(friday, now))).toBeCloseTo(3);
  });

  it("subtracts the hours already worked today", () => {
    const time = workTime(FOUR_A_DAY, MONDAY_8AM, 1.5);
    expect(availableHours(MONDAY_8AM, at(3, 0), time)).toBeCloseTo(2.5);
    // Tomorrow is not affected by today's work.
    expect(availableHours(at(3, 0), at(4, 0), time)).toBeCloseTo(4);
  });

  it("is limited by the clock hours left before midnight or the deadline", () => {
    const time = fresh(FOUR_A_DAY, MONDAY_8AM);
    expect(availableHours(at(2, 22), at(3, 0), time)).toBeCloseTo(2);
    expect(availableHours(at(2, 8), at(2, 9, 30), time)).toBeCloseTo(1.5);
  });

  it("adds up the hours of every weekday", () => {
    // index 0 = Sunday ... 6 = Saturday
    const week: WeekdayHours = [6, 3, 3, 3, 3, 3, 6];
    // Mon 2 Nov 00:00 -> Mon 9 Nov 00:00 covers every weekday once.
    expect(availableHours(at(2, 0), at(9, 0), fresh(week, at(2, 0)))).toBeCloseTo(27);
  });

  it("is zero when the end is not after the start", () => {
    const time = fresh(ALL_HOURS, MONDAY_8AM);
    expect(availableHours(at(2, 12), at(2, 12), time)).toBe(0);
    expect(availableHours(at(2, 12), at(2, 10), time)).toBe(0);
  });
});

describe("momentWithHoursLeft", () => {
  it("finds when only the given working time remains", () => {
    const moment = momentWithHoursLeft(at(2, 20), 4, MONDAY_8AM, fresh(ALL_HOURS, MONDAY_8AM));
    expect(Math.abs(moment!.getTime() - at(2, 16).getTime())).toBeLessThanOrEqual(60_000);
  });

  it("returns null when that moment has already passed", () => {
    expect(momentWithHoursLeft(at(2, 20), 4, at(2, 17), fresh(ALL_HOURS, at(2, 17)))).toBeNull();
  });
});
