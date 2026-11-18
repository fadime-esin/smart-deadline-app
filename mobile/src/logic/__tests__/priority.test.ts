import { workTime } from "../capacity";
import { EPSILON_HOURS, evaluatePriority, hoursUntil, plannedWork, rankTasks, remainingWork } from "../priority";
import { plannedReminders } from "../reminders";
import { ALL_HOURS, at, FOUR_A_DAY, fresh, MONDAY_8AM, NO_TIME } from "../__fixtures__/time";

const task = (workLeft: number, deadline: Date, weight = 1) => ({ workLeft, deadline, weight });
const ALL = fresh(ALL_HOURS, MONDAY_8AM);

describe("remainingWork", () => {
  it("subtracts logged hours from the estimate", () => {
    expect(remainingWork(10, 0)).toBeCloseTo(10);
    expect(remainingWork(10, 3)).toBeCloseTo(7);
  });

  it("is never negative", () => {
    expect(remainingWork(10, 15)).toBe(0);
  });

  it("adds the optional safety margin before subtracting logged hours", () => {
    expect(remainingWork(10, 0, 0.2)).toBeCloseTo(12);
    expect(remainingWork(10, 3, 0.2)).toBeCloseTo(9);
    expect(plannedWork(10, 0)).toBeCloseTo(10);
  });
});

describe("evaluatePriority", () => {
  it("divides weighted remaining work by available working time", () => {
    // 8 working hours until 16:00; 4 h of work -> 0.5; weight 1.5 -> 0.75
    expect(evaluatePriority(task(4, at(2, 16)), MONDAY_8AM, ALL).score).toBeCloseTo(0.5);
    expect(evaluatePriority(task(4, at(2, 16), 1.5), MONDAY_8AM, ALL).score).toBeCloseTo(0.75);
  });

  it("doubles the score when the available time is halved", () => {
    const a = evaluatePriority(task(3, at(2, 20)), MONDAY_8AM, ALL);
    const b = evaluatePriority(task(3, at(2, 14)), MONDAY_8AM, ALL);
    expect(b.score! / a.score!).toBeCloseTo(2);
  });

  it("counts working hours, not clock hours", () => {
    // Due at the start of Wednesday with 4 h per day: 40 clock hours, but 4 + 4 = 8 working hours.
    const r = evaluatePriority(task(6, at(4, 0)), MONDAY_8AM, fresh(FOUR_A_DAY, MONDAY_8AM));
    expect(r.remainingHours).toBeCloseTo(40);
    expect(r.availableHours).toBeCloseTo(8);
    expect(r.state).toBe("atRisk");
  });

  it("becomes more urgent after work is logged on other tasks today", () => {
    const before = evaluatePriority(task(5, at(3, 0)), MONDAY_8AM, workTime(FOUR_A_DAY, MONDAY_8AM, 0));
    const after = evaluatePriority(task(5, at(3, 0)), MONDAY_8AM, workTime(FOUR_A_DAY, MONDAY_8AM, 2));
    expect(before.availableHours).toBeCloseTo(4);
    expect(after.availableHours).toBeCloseTo(2);
    expect(after.score!).toBeGreaterThan(before.score!);
  });

  it("classifies tasks by load ratio", () => {
    expect(evaluatePriority(task(2, at(2, 18)), MONDAY_8AM, ALL).state).toBe("normal"); // 0.2
    expect(evaluatePriority(task(5, at(2, 18)), MONDAY_8AM, ALL).state).toBe("atRisk"); // 0.5
    expect(evaluatePriority(task(10, at(2, 18)), MONDAY_8AM, ALL).state).toBe("critical"); // 1.0
    expect(evaluatePriority(task(12, at(2, 18)), MONDAY_8AM, ALL).state).toBe("critical"); // 1.2
  });

  it("treats a task with no work left as normal with score 0", () => {
    const r = evaluatePriority(task(0, at(2, 9)), MONDAY_8AM, ALL);
    expect(r.state).toBe("normal");
    expect(r.score).toBe(0);
  });

  it("marks a passed deadline as overdue without a score", () => {
    const r = evaluatePriority(task(1, at(2, 6)), MONDAY_8AM, ALL);
    expect(r.state).toBe("overdue");
    expect(r.score).toBeNull();
    expect(r.loadRatio).toBeNull();
    expect(r.remainingHours).toBeCloseTo(-2);
    expect(evaluatePriority(task(1, MONDAY_8AM), MONDAY_8AM, ALL).state).toBe("overdue");
  });

  it("keeps the score finite when no working time is left", () => {
    const r = evaluatePriority(task(1, at(3, 12)), MONDAY_8AM, fresh(NO_TIME, MONDAY_8AM));
    expect(r.state).toBe("critical");
    expect(r.score).toBeCloseTo(1 / EPSILON_HOURS);
  });

  it("hoursUntil is negative after the deadline", () => {
    expect(hoursUntil(at(2, 5), MONDAY_8AM)).toBeCloseTo(-3);
  });
});

describe("rankTasks", () => {
  it("puts overdue tasks first, then sorts by score", () => {
    const tasks = [
      { id: "relaxed", ...task(1, at(2, 23)) },
      { id: "urgent", ...task(4, at(2, 13)) },
      { id: "late", ...task(1, at(2, 7)) },
      { id: "very-late", ...task(1, at(2, 1)) },
      { id: "medium", ...task(2, at(2, 18)) },
    ];
    expect(rankTasks(tasks, MONDAY_8AM, ALL).map((t) => t.id)).toEqual([
      "very-late",
      "late",
      "urgent",
      "medium",
      "relaxed",
    ]);
  });

  it("puts tasks marked as urgent before everything else", () => {
    const tasks = [
      { id: "high-score", ...task(4, at(2, 13)) },
      { id: "late", ...task(1, at(2, 7)) },
      { id: "urgent-relaxed", ...task(1, at(3, 23)), urgent: true },
      { id: "urgent-late", ...task(1, at(2, 6)), urgent: true },
    ];
    expect(rankTasks(tasks, MONDAY_8AM, ALL).map((t) => t.id)).toEqual([
      "urgent-late",
      "urgent-relaxed",
      "late",
      "high-score",
    ]);
  });

  it("does not change the score or the state of an urgent task", () => {
    const plain = evaluatePriority(task(4, at(2, 16)), MONDAY_8AM, ALL);
    const urgent = evaluatePriority({ ...task(4, at(2, 16)), urgent: true }, MONDAY_8AM, ALL);
    expect(urgent).toEqual(plain);
  });

  it("breaks score ties with the earlier deadline", () => {
    const tasks = [
      { id: "later", ...task(2, at(2, 20)) },
      { id: "sooner", ...task(1, at(2, 14)) },
    ];
    expect(rankTasks(tasks, MONDAY_8AM, ALL).map((t) => t.id)).toEqual(["sooner", "later"]);
  });

  it("does not change the input array", () => {
    const tasks = [task(1, at(4, 12)), task(1, at(2, 12))];
    const copy = [...tasks];
    rankTasks(tasks, MONDAY_8AM, ALL);
    expect(tasks).toEqual(copy);
  });
});

describe("plannedReminders", () => {
  const near = (date: Date | undefined, expected: Date) =>
    expect(Math.abs(date!.getTime() - expected.getTime())).toBeLessThanOrEqual(60_000);

  it("plans At Risk and Critical reminders at the state changes, and a last one an hour before the deadline", () => {
    // 3 h of work due 20:00: At Risk when 6 h remain (14:00), Critical at 3 h (17:00), last hour at 19:00.
    const planned = plannedReminders(at(2, 20), 3, MONDAY_8AM, ALL);
    expect(planned.map((r) => r.kind)).toEqual(["atRisk", "critical", "lastHour"]);
    near(planned[0].at, at(2, 14));
    near(planned[1].at, at(2, 17));
    expect(planned[2].at.getTime()).toBe(at(2, 19).getTime());
  });

  it("skips moments that have already passed", () => {
    expect(plannedReminders(at(2, 20), 3, at(2, 15), fresh(ALL_HOURS, at(2, 15))).map((r) => r.kind)).toEqual([
      "critical",
      "lastHour",
    ]);
    // Already Critical when saved: only the last-hour reminder is left.
    expect(plannedReminders(at(2, 20), 3, at(2, 18), fresh(ALL_HOURS, at(2, 18))).map((r) => r.kind)).toEqual([
      "lastHour",
    ]);
    // Less than an hour before the deadline: nothing is left to send.
    expect(plannedReminders(at(2, 20), 3, at(2, 19, 30), fresh(ALL_HOURS, at(2, 19, 30)))).toEqual([]);
  });

  it("returns the reminders in the order they are sent", () => {
    // 20 min of work: the last-hour reminder (19:00) comes before At Risk (19:20) and Critical (19:40).
    const planned = plannedReminders(at(2, 20), 1 / 3, MONDAY_8AM, ALL);
    expect(planned.map((r) => r.kind)).toEqual(["lastHour", "atRisk", "critical"]);
    for (let i = 1; i < planned.length; i++) {
      expect(planned[i].at.getTime()).toBeGreaterThanOrEqual(planned[i - 1].at.getTime());
    }
  });

  it("plans nothing when no work is left", () => {
    expect(plannedReminders(at(2, 20), 0, MONDAY_8AM, ALL)).toEqual([]);
  });
});
