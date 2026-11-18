/**
 * Task operations used by the screens. Each one keeps the database and the
 * scheduled reminders in step: reminders depend on the remaining work, the
 * deadline, the user's working hours and the hours already worked today, so
 * they are rescheduled whenever any of these change, and cancelled when a
 * task is completed or deleted.
 *
 * A failure in the notification system never blocks saving data.
 */

import type { SQLiteDatabase } from "expo-sqlite";

import { deleteSessionRow, hoursLoggedSince, insertSession } from "@/db/sessions";
import { getSettings, saveSettings, type Settings } from "@/db/settings";
import {
  deleteTaskRow,
  getTask,
  insertTask,
  listActiveTasks,
  setNotificationIds,
  setStatus,
  updateTask,
  type Task,
  type TaskInput,
} from "@/db/tasks";
import { applyLanguageSetting } from "@/i18n";
import { startOfDay, workTime, type WorkTime } from "@/logic/capacity";
import { remainingWork } from "@/logic/priority";
import { cancelReminders, scheduleReminders } from "@/services/notifications";

/** The current working-time situation: weekday hours and hours worked today. */
export async function loadWorkTime(db: SQLiteDatabase, settings?: Settings, now = new Date()): Promise<WorkTime> {
  const { weekdayHours } = settings ?? (await getSettings(db));
  return workTime(weekdayHours, now, await hoursLoggedSince(db, startOfDay(now)));
}

async function safeCancel(notificationIds: readonly string[]): Promise<void> {
  try {
    await cancelReminders(notificationIds);
  } catch (error) {
    console.warn("Could not cancel reminders", error);
  }
}

/** Replaces a task's reminders with new ones based on its current state. */
async function reschedule(db: SQLiteDatabase, task: Task, time: WorkTime, safetyMargin: number): Promise<void> {
  await safeCancel(task.notificationIds);
  let ids: string[] = [];
  try {
    ids = await scheduleReminders(
      {
        id: task.id,
        title: task.title,
        deadline: task.deadline,
        workLeft: remainingWork(task.estimatedHours, task.loggedHours, safetyMargin),
        urgent: task.urgent,
      },
      time,
    );
  } catch (error) {
    console.warn("Could not schedule reminders", error);
  }
  await setNotificationIds(db, task.id, ids);
}

/** Reloads a task from the database and reschedules its reminders. */
async function refreshReminders(db: SQLiteDatabase, taskId: number): Promise<void> {
  const task = await getTask(db, taskId);
  if (task && task.status === "active") {
    const settings = await getSettings(db);
    await reschedule(db, task, await loadWorkTime(db, settings), settings.safetyMargin);
  }
}

/**
 * Reschedules the reminders of every active task. Needed after the available
 * time changed, and once at every app start: a new day brings fresh working
 * hours, and the permission may have been granted since the last time.
 */
export async function refreshAllReminders(db: SQLiteDatabase, settings?: Settings): Promise<void> {
  const current = settings ?? (await getSettings(db));
  const time = await loadWorkTime(db, current);
  for (const task of await listActiveTasks(db)) {
    await reschedule(db, task, time, current.safetyMargin);
  }
}

/** Creates a task (when `existing` is undefined) or updates it. Returns its id. */
export async function saveTask(db: SQLiteDatabase, input: TaskInput, existing?: Task): Promise<number> {
  let id: number;
  if (existing) {
    await updateTask(db, existing.id, input);
    id = existing.id;
  } else {
    id = await insertTask(db, input);
  }
  await refreshReminders(db, id);
  return id;
}

export async function completeTask(db: SQLiteDatabase, task: Task): Promise<void> {
  await setStatus(db, task.id, "completed");
  await safeCancel(task.notificationIds);
  await setNotificationIds(db, task.id, []);
}

/** Moves a completed task back to the active list. */
export async function restoreTask(db: SQLiteDatabase, task: Task): Promise<void> {
  await setStatus(db, task.id, "active");
  await refreshReminders(db, task.id);
}

export async function deleteTask(db: SQLiteDatabase, task: Task): Promise<void> {
  await safeCancel(task.notificationIds);
  await deleteTaskRow(db, task.id); // its work sessions are deleted with it (ON DELETE CASCADE)
}

/**
 * Records time spent on a task. This changes the task's remaining work and
 * also today's remaining working time for every task, so all reminders follow.
 */
export async function logWork(db: SQLiteDatabase, taskId: number, hours: number): Promise<void> {
  await insertSession(db, taskId, hours);
  await refreshAllReminders(db);
}

/** Removes a logged session (e.g. one entered by mistake). */
export async function removeSession(db: SQLiteDatabase, sessionId: number): Promise<void> {
  await deleteSessionRow(db, sessionId);
  await refreshAllReminders(db);
}

/**
 * Saves new settings, switches the language if it changed, and reschedules
 * every active task's reminders to match (their texts use the new language).
 */
export async function updateSettings(db: SQLiteDatabase, settings: Settings): Promise<void> {
  await saveSettings(db, settings);
  applyLanguageSetting(settings.language);
  await refreshAllReminders(db, settings);
}
