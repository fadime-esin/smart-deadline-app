/**
 * Prioritization Engine (report, Section 5.2).
 *
 *   PS = (W_r * U_f) / max(T_a, epsilon)
 *
 *   W_r  remaining work in hours: the estimate (plus the optional safety
 *        margin) minus the hours already logged for the task
 *   U_f  importance factor = weight of the task's category
 *   T_a  working hours available until the deadline, according to the
 *        user's working hours per weekday and the hours already worked
 *        today (see capacity.ts)
 *
 * Task states, based on the load ratio R = W_r / T_a:
 *   deadline passed           -> "overdue"  (no score: the formula is not applied)
 *   R >= 1                    -> "critical" (the work no longer fits in the time left)
 *   R >= 0.5                  -> "atRisk"   (the work needs half or more of the time left)
 *   R < 0.5                   -> "normal"
 *
 * Urgent tasks (report, Section 5.2.4): the user can mark a task as urgent
 * ("drop everything"). The flag does not change the score or the state; it
 * only moves the task to the top of the ranking, before every other task.
 *
 * Scores are never stored; they are recalculated from the current time
 * every time the task list is displayed.
 *
 * These functions are pure (no database, no UI), so they can be unit-tested.
 */

import { availableHours, MS_PER_HOUR, type WorkTime } from "./capacity";

/**
 * Lower bound for T_a (0.01 h = 36 seconds), so the score stays finite when
 * almost no working time is left before the deadline.
 */
export const EPSILON_HOURS = 0.01;

/** A task is At Risk once its remaining work needs this share of the available time. */
export const AT_RISK_RATIO = 0.5;

export type UrgencyState = "overdue" | "critical" | "atRisk" | "normal";

export interface PriorityInput {
  deadline: Date;
  /** Remaining work W_r in hours (see remainingWork). */
  workLeft: number;
  /** Category weight (importance factor U_f), > 0. */
  weight: number;
  /** True if the user marked the task as urgent (ranked before everything else). */
  urgent?: boolean;
}

export interface PriorityResult {
  state: UrgencyState;
  /** Clock hours until the deadline; negative once the deadline has passed. */
  remainingHours: number;
  /** Working hours available until the deadline (T_a). */
  availableHours: number;
  /** R = W_r / T_a, or null for overdue tasks. */
  loadRatio: number | null;
  /** Priority Score, or null for overdue tasks. */
  score: number | null;
}

/** Planned workload: the estimate increased by the safety margin (0 = off, 0.2 = +20%). */
export function plannedWork(estimatedHours: number, safetyMargin = 0): number {
  return estimatedHours * (1 + safetyMargin);
}

/** Remaining work W_r: the planned workload minus the hours already logged. Never negative. */
export function remainingWork(estimatedHours: number, loggedHours: number, safetyMargin = 0): number {
  return Math.max(0, plannedWork(estimatedHours, safetyMargin) - loggedHours);
}

/** Clock hours from `now` until `deadline` (negative if the deadline has passed). */
export function hoursUntil(deadline: Date, now: Date): number {
  return (deadline.getTime() - now.getTime()) / MS_PER_HOUR;
}

/** Calculates the state and Priority Score of one task at the moment `now`. */
export function evaluatePriority(task: PriorityInput, now: Date, time: WorkTime): PriorityResult {
  const remaining = hoursUntil(task.deadline, now);

  if (remaining <= 0) {
    return { state: "overdue", remainingHours: remaining, availableHours: 0, loadRatio: null, score: null };
  }

  const available = availableHours(now, task.deadline, time);
  const denominator = Math.max(available, EPSILON_HOURS);
  const loadRatio = task.workLeft / denominator;
  const score = (task.workLeft * task.weight) / denominator;

  let state: UrgencyState = "normal";
  if (task.workLeft > 0) {
    if (loadRatio >= 1) state = "critical";
    else if (loadRatio >= AT_RISK_RATIO) state = "atRisk";
  }

  return { state, remainingHours: remaining, availableHours: available, loadRatio, score };
}

export type Ranked<T> = T & { priority: PriorityResult };

/**
 * Sorts tasks into the order shown on the dashboard:
 * 1. Urgent tasks first.
 * 2. Then overdue tasks, oldest deadline first.
 * 3. Then all other tasks by Priority Score, highest first
 *    (ties broken by the earlier deadline).
 * Inside the urgent group the same rules 2 and 3 apply.
 */
export function rankTasks<T extends PriorityInput>(
  tasks: readonly T[],
  now: Date,
  time: WorkTime,
): Ranked<T>[] {
  const evaluated = tasks.map((task) => ({ ...task, priority: evaluatePriority(task, now, time) }));

  return evaluated.sort((a, b) => {
    if (!!a.urgent !== !!b.urgent) return a.urgent ? -1 : 1;

    const aOverdue = a.priority.state === "overdue";
    const bOverdue = b.priority.state === "overdue";
    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;

    if (!aOverdue) {
      const byScore = (b.priority.score ?? 0) - (a.priority.score ?? 0);
      if (byScore !== 0) return byScore;
    }
    return a.deadline.getTime() - b.deadline.getTime();
  });
}
