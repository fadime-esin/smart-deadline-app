import { overloadAdvice, planWork } from "../planner";
import { workTime } from "../capacity";
import { ALL_HOURS, at, FOUR_A_DAY, fresh, MONDAY_8AM } from "../__fixtures__/time";

const ALL = fresh(ALL_HOURS, MONDAY_8AM);
const FOUR = fresh(FOUR_A_DAY, MONDAY_8AM);

const hoursFor = (plan: ReturnType<typeof planWork>, dayIndex: number) =>
  Object.fromEntries(plan.days[dayIndex].allocations.map((a) => [a.taskId, Number(a.hours.toFixed(2))]));

describe("planWork (Earliest Deadline First)", () => {
  it("plans the student example: small task due soon, big task due later", () => {
    // 4 h of work per day. Task 1: 2 h due in 2 days. Task 2: 15 h due in 5 days.
    const tasks = [
      { id: 2, deadline: at(7, 8), workLeft: 15, weight: 1.2 },
      { id: 1, deadline: at(4, 8), workLeft: 2, weight: 1.2 },
    ];
    const plan = planWork(tasks, MONDAY_8AM, FOUR);

    expect(hoursFor(plan, 0)).toEqual({ 1: 2, 2: 2 }); // today: finish task 1, start task 2
    expect(hoursFor(plan, 1)).toEqual({ 2: 4 });
    expect(hoursFor(plan, 2)).toEqual({ 2: 4 });
    expect(hoursFor(plan, 3)).toEqual({ 2: 4 });
    expect(hoursFor(plan, 4)).toEqual({ 2: 1 }); // done Friday, deadline Saturday
    expect(plan.shortfalls).toEqual([]);
  });

  it("detects that two 10-hour tasks do not fit into 15 working hours", () => {
    const tasks = [
      { id: 1, deadline: at(2, 23), workLeft: 10, weight: 1.5 },
      { id: 2, deadline: at(2, 23), workLeft: 10, weight: 1.0 },
    ];
    const plan = planWork(tasks, MONDAY_8AM, ALL);
    expect(plan.shortfalls.map((s) => [s.taskId, Number(s.hoursShort.toFixed(2))])).toEqual([[2, 5]]);
  });

  it("gives today only the hours not yet worked", () => {
    // 4 h a day, 1.5 h already logged today: today's plan has 2.5 h left.
    const tasks = [{ id: 1, deadline: at(5, 8), workLeft: 6, weight: 1 }];
    const plan = planWork(tasks, MONDAY_8AM, workTime(FOUR_A_DAY, MONDAY_8AM, 1.5));
    expect(plan.days[0].capacity).toBeCloseTo(2.5);
    expect(hoursFor(plan, 0)).toEqual({ 1: 2.5 });
    expect(hoursFor(plan, 1)).toEqual({ 1: 3.5 });
  });

  it("never plans work after a task's deadline", () => {
    const plan = planWork([{ id: 1, deadline: at(2, 10), workLeft: 5, weight: 1 }], MONDAY_8AM, ALL);
    expect(hoursFor(plan, 0)).toEqual({ 1: 2 });
    expect(Number(plan.shortfalls[0].hoursShort.toFixed(2))).toBe(3);
  });

  it("leaves out overdue and finished tasks but always includes today", () => {
    const plan = planWork(
      [
        { id: 1, deadline: at(2, 6), workLeft: 3, weight: 1 },
        { id: 2, deadline: at(3, 12), workLeft: 0, weight: 1 },
      ],
      MONDAY_8AM,
      ALL,
    );
    expect(plan.days.length).toBe(1);
    expect(plan.days[0].allocations).toEqual([]);
    expect(plan.days[0].capacity).toBeCloseTo(16);
  });
});

describe("planWork with urgent tasks", () => {
  it("plans an urgent task before tasks with earlier deadlines", () => {
    // 4 h per day. Task 1 is due first (end of Tuesday), but task 2 is urgent and is done first.
    const tasks = [
      { id: 1, deadline: at(4, 0), workLeft: 3, weight: 1.5 },
      { id: 2, deadline: at(7, 8), workLeft: 6, weight: 1.0, urgent: true },
    ];
    const plan = planWork(tasks, MONDAY_8AM, FOUR);

    expect(hoursFor(plan, 0)).toEqual({ 2: 4 }); // Monday: only the urgent task
    expect(hoursFor(plan, 1)).toEqual({ 2: 2, 1: 2 }); // Tuesday: urgent task finished, then task 1
    expect(plan.days[1].allocations[0].taskId).toBe(2);
    expect(plan.shortfalls.map((s) => [s.taskId, Number(s.hoursShort.toFixed(2))])).toEqual([[1, 1]]);
  });

  it("keeps the Earliest Deadline First order among several urgent tasks", () => {
    const tasks = [
      { id: 1, deadline: at(6, 8), workLeft: 2, weight: 1, urgent: true },
      { id: 2, deadline: at(5, 8), workLeft: 2, weight: 1, urgent: true },
      { id: 3, deadline: at(3, 8), workLeft: 2, weight: 1 },
    ];
    const plan = planWork(tasks, MONDAY_8AM, FOUR);
    expect(plan.days[0].allocations.map((a) => a.taskId)).toEqual([2, 1]);
    expect(hoursFor(plan, 1)).toEqual({ 3: 2 });
    expect(plan.shortfalls).toEqual([]);
  });

  it("explains a late task that is waiting behind an urgent one, and never suggests reducing the urgent task", () => {
    const tasks = [
      { id: 1, deadline: at(2, 20), workLeft: 8, weight: 1.5 },
      { id: 2, deadline: at(2, 18), workLeft: 8, weight: 1.0, urgent: true },
    ];
    const advice = overloadAdvice(planWork(tasks, MONDAY_8AM, ALL), tasks);
    expect(advice.length).toBe(1);
    expect(advice[0].taskId).toBe(1);
    expect(advice[0].behindUrgent).toBe(true);
    expect(advice[0].reduceFirst).toEqual([]);
  });
});

describe("overloadAdvice", () => {
  it("suggests reducing less important tasks that are due earlier", () => {
    const tasks = [
      { id: 1, deadline: at(2, 18), workLeft: 10, weight: 1.0 }, // personal, due first
      { id: 2, deadline: at(2, 23), workLeft: 10, weight: 1.5 }, // exam, gets only 5 h
    ];
    const plan = planWork(tasks, MONDAY_8AM, ALL);
    const advice = overloadAdvice(plan, tasks);
    expect(advice.length).toBe(1);
    expect(advice[0].taskId).toBe(2);
    expect(advice[0].reduceFirst).toEqual([1]);
  });

  it("has nothing to suggest when no less important task competes", () => {
    const tasks = [
      { id: 1, deadline: at(2, 23), workLeft: 10, weight: 1.5 },
      { id: 2, deadline: at(2, 23), workLeft: 10, weight: 1.0 },
    ];
    const advice = overloadAdvice(planWork(tasks, MONDAY_8AM, ALL), tasks);
    expect(advice[0].reduceFirst).toEqual([]);
  });
});
