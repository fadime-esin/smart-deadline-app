/**
 * Work planner (report, Section 5.3): "What should I work on today?"
 *
 * The planner simulates the coming days using the Earliest Deadline First
 * (EDF) rule: each day's working hours are given to the unfinished task with
 * the nearest deadline, then to the next one, and so on. A task only receives
 * working time that lies before its own deadline.
 *
 * EDF is optimal for meeting deadlines on a single worker: if any order of
 * work can finish every task on time, the EDF order does too. Therefore, if
 * the EDF plan still leaves work unfinished at a deadline, the workload is
 * infeasible, and the planner reports the shortfall so the user can react
 * early (overload warning).
 *
 * Urgent tasks (report, Section 5.2.4) are the one exception to the EDF
 * order: a task the user marked as urgent is planned before all other tasks,
 * whatever their deadlines. The other tasks then share the time that is left,
 * again in EDF order, so the user immediately sees what the urgent task
 * pushes back or makes late.
 *
 * All functions are pure, so they can be unit-tested.
 */

import { availableHours, startOfDay, startOfNextDay, type WorkTime } from "./capacity";

/** Amounts of work below this (about 1 minute) are treated as zero. */
const MIN_HOURS = 1 / 60;

export interface PlanTask {
  id: number;
  deadline: Date;
  /** Remaining work in hours. */
  workLeft: number;
  /** Category weight, used for ties and for overload advice. */
  weight: number;
  /** True if the user marked the task as urgent (planned before everything else). */
  urgent?: boolean;
}

export interface Allocation {
  taskId: number;
  hours: number;
}

export interface PlanDay {
  /** Midnight at the start of the day (local time). */
  date: Date;
  /** Working hours still available on this day (from `now` on, for today). */
  capacity: number;
  allocations: Allocation[];
}

export interface Shortfall {
  taskId: number;
  deadline: Date;
  /** Hours of work that cannot be finished before the deadline. */
  hoursShort: number;
}

export interface Plan {
  days: PlanDay[];
  shortfalls: Shortfall[];
}

/** EDF order: earliest deadline first; ties go to the more important task. */
function edfOrder(a: PlanTask, b: PlanTask): number {
  return a.deadline.getTime() - b.deadline.getTime() || b.weight - a.weight || a.id - b.id;
}

/** Planning order: urgent tasks first, then EDF. */
function planOrder(a: PlanTask, b: PlanTask): number {
  if (!!a.urgent !== !!b.urgent) return a.urgent ? -1 : 1;
  return edfOrder(a, b);
}

/**
 * Plans the remaining work of all tasks from `now` until the last deadline.
 * Tasks whose deadline has already passed are not planned (they are shown
 * separately as Overdue).
 */
export function planWork(tasks: readonly PlanTask[], now: Date, time: WorkTime): Plan {
  const pending = tasks
    .filter((task) => task.deadline.getTime() > now.getTime() && task.workLeft >= MIN_HOURS)
    .sort(planOrder);
  const left = new Map(pending.map((task) => [task.id, task.workLeft]));

  const days: PlanDay[] = [];
  const lastDeadline = Math.max(now.getTime(), ...pending.map((task) => task.deadline.getTime()));

  // Always include today, then every day up to the last deadline.
  const today = startOfDay(now);
  for (let day = today; day === today || day.getTime() < lastDeadline; day = startOfNextDay(day)) {
    const from = new Date(Math.max(day.getTime(), now.getTime()));
    const dayEnd = startOfNextDay(day);
    const capacity = availableHours(from, dayEnd, time);

    const allocations: Allocation[] = [];
    let used = 0;
    for (const task of pending) {
      const remaining = left.get(task.id) ?? 0;
      if (remaining < MIN_HOURS || task.deadline.getTime() <= from.getTime()) continue;

      // Working time today that lies before this task's deadline, minus what
      // the tasks planned before it have already taken today.
      const end = new Date(Math.min(dayEnd.getTime(), task.deadline.getTime()));
      const limit = availableHours(from, end, time) - used;
      const hours = Math.min(remaining, limit);
      if (hours >= MIN_HOURS) {
        allocations.push({ taskId: task.id, hours });
        used += hours;
        left.set(task.id, remaining - hours);
      }
    }
    days.push({ date: day, capacity, allocations });
  }

  const shortfalls: Shortfall[] = pending
    .filter((task) => (left.get(task.id) ?? 0) >= MIN_HOURS)
    .map((task) => ({ taskId: task.id, deadline: task.deadline, hoursShort: left.get(task.id) ?? 0 }));

  return { days, shortfalls };
}

export interface OverloadAdvice extends Shortfall {
  /**
   * Less important tasks due no later than the late task, least important
   * first. Reducing or postponing them frees time for the late task.
   * Urgent tasks are never suggested. Empty if there are none; then only
   * more working hours or a later deadline can help.
   */
  reduceFirst: number[];
  /** True if an urgent task is planned ahead of the late task (one reason it is late). */
  behindUrgent: boolean;
}

/** Turns the shortfalls of a plan into advice the user can act on. */
export function overloadAdvice(plan: Plan, tasks: readonly PlanTask[]): OverloadAdvice[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  // Only tasks that actually take working time in the plan can make room.
  const planned = new Set(plan.days.flatMap((day) => day.allocations.map((a) => a.taskId)));

  const urgentPlanned = tasks.some((task) => task.urgent && planned.has(task.id));

  return plan.shortfalls.map((shortfall) => {
    const late = byId.get(shortfall.taskId);
    const reduceFirst = tasks
      .filter(
        (task) =>
          late !== undefined &&
          task.id !== late.id &&
          !task.urgent &&
          task.weight < late.weight &&
          planned.has(task.id) &&
          task.deadline.getTime() <= late.deadline.getTime(),
      )
      .sort((a, b) => a.weight - b.weight || edfOrder(a, b))
      .map((task) => task.id);
    return { ...shortfall, reduceFirst, behindUrgent: urgentPlanned && !late?.urgent };
  });
}
