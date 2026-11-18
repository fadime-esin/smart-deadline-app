/**
 * Work sessions: the time a user has spent on a task (report, Section 5.4).
 * The sum of a task's sessions is subtracted from its estimate to give the
 * remaining work used by the Prioritization Engine and the planner.
 */

import type { SQLiteDatabase } from "expo-sqlite";

export interface WorkSession {
  id: number;
  taskId: number;
  hours: number;
  loggedAt: Date;
}

export async function listSessions(db: SQLiteDatabase, taskId: number): Promise<WorkSession[]> {
  const rows = await db.getAllAsync<{ id: number; task_id: number; hours: number; logged_at: string }>(
    "SELECT id, task_id, hours, logged_at FROM work_sessions WHERE task_id = ? ORDER BY logged_at DESC",
    taskId,
  );
  return rows.map((row) => ({
    id: row.id,
    taskId: row.task_id,
    hours: row.hours,
    loggedAt: new Date(row.logged_at),
  }));
}

/** Total hours logged on any task since `since` (e.g. the start of today). */
export async function hoursLoggedSince(db: SQLiteDatabase, since: Date): Promise<number> {
  const row = await db.getFirstAsync<{ total: number | null }>(
    "SELECT SUM(hours) AS total FROM work_sessions WHERE logged_at >= ?",
    since.toISOString(),
  );
  return row?.total ?? 0;
}

export async function insertSession(db: SQLiteDatabase, taskId: number, hours: number): Promise<void> {
  await db.runAsync("INSERT INTO work_sessions (task_id, hours) VALUES (?, ?)", taskId, hours);
}

export async function deleteSessionRow(db: SQLiteDatabase, sessionId: number): Promise<void> {
  await db.runAsync("DELETE FROM work_sessions WHERE id = ?", sessionId);
}
