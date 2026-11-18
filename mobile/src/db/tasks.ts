/**
 * Reading and writing categories and tasks in the local database.
 * Dates are stored as ISO 8601 text in UTC and converted to Date objects here.
 */

import type { SQLiteDatabase } from "expo-sqlite";

export interface Category {
  id: number;
  name: string;
  weight: number;
}

export type TaskStatus = "active" | "completed";

export interface Task {
  id: number;
  categoryId: number;
  categoryName: string;
  /** Category weight (importance factor U_f). */
  weight: number;
  title: string;
  description: string | null;
  deadline: Date;
  estimatedHours: number;
  /** True if the user marked the task as urgent: it is ranked and planned before all others. */
  urgent: boolean;
  /** Total hours logged in work sessions for this task. */
  loggedHours: number;
  status: TaskStatus;
  completedAt: Date | null;
  /** Identifiers of the scheduled reminders (empty when none). */
  notificationIds: string[];
}

/** The values a user enters in the task form. */
export interface TaskInput {
  title: string;
  description: string | null;
  categoryId: number;
  deadline: Date;
  estimatedHours: number;
  urgent: boolean;
}

interface TaskRow {
  id: number;
  category_id: number;
  category_name: string;
  weight: number;
  title: string;
  description: string | null;
  deadline: string;
  estimated_hours: number;
  is_urgent: number;
  logged_hours: number;
  status: TaskStatus;
  completed_at: string | null;
  notification_ids: string | null;
}

const TASK_SELECT = `
  SELECT t.id, t.category_id, c.name AS category_name, c.weight, t.title, t.description,
         t.deadline, t.estimated_hours, t.is_urgent, t.status, t.completed_at, t.notification_ids,
         COALESCE((SELECT SUM(s.hours) FROM work_sessions s WHERE s.task_id = t.id), 0) AS logged_hours
  FROM tasks t
  JOIN categories c ON c.id = t.category_id
`;

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name,
    weight: row.weight,
    title: row.title,
    description: row.description,
    deadline: new Date(row.deadline),
    estimatedHours: row.estimated_hours,
    urgent: row.is_urgent === 1,
    loggedHours: row.logged_hours,
    status: row.status,
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    notificationIds: parseIds(row.notification_ids),
  };
}

const nowIso = () => new Date().toISOString();

/** Reminder identifiers are stored as a JSON array in one text column. */
function parseIds(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export async function listCategories(db: SQLiteDatabase): Promise<Category[]> {
  return db.getAllAsync<Category>("SELECT id, name, weight FROM categories ORDER BY id");
}

export async function listActiveTasks(db: SQLiteDatabase): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(`${TASK_SELECT} WHERE t.status = 'active'`);
  return rows.map(toTask);
}

export async function listCompletedTasks(db: SQLiteDatabase): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(
    `${TASK_SELECT} WHERE t.status = 'completed' ORDER BY t.completed_at DESC`,
  );
  return rows.map(toTask);
}

export async function getTask(db: SQLiteDatabase, id: number): Promise<Task | null> {
  const row = await db.getFirstAsync<TaskRow>(`${TASK_SELECT} WHERE t.id = ?`, id);
  return row ? toTask(row) : null;
}

/** Inserts a new active task and returns its id. */
export async function insertTask(db: SQLiteDatabase, input: TaskInput): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO tasks (category_id, title, description, deadline, estimated_hours, is_urgent)
     VALUES (?, ?, ?, ?, ?, ?)`,
    input.categoryId,
    input.title,
    input.description,
    input.deadline.toISOString(),
    input.estimatedHours,
    input.urgent ? 1 : 0,
  );
  return result.lastInsertRowId;
}

export async function updateTask(db: SQLiteDatabase, id: number, input: TaskInput): Promise<void> {
  await db.runAsync(
    `UPDATE tasks
     SET category_id = ?, title = ?, description = ?, deadline = ?, estimated_hours = ?, is_urgent = ?,
         updated_at = ?
     WHERE id = ?`,
    input.categoryId,
    input.title,
    input.description,
    input.deadline.toISOString(),
    input.estimatedHours,
    input.urgent ? 1 : 0,
    nowIso(),
    id,
  );
}

export async function setNotificationIds(
  db: SQLiteDatabase,
  id: number,
  notificationIds: readonly string[],
): Promise<void> {
  const value = notificationIds.length > 0 ? JSON.stringify(notificationIds) : null;
  await db.runAsync("UPDATE tasks SET notification_ids = ? WHERE id = ?", value, id);
}

export async function setStatus(db: SQLiteDatabase, id: number, status: TaskStatus): Promise<void> {
  const completedAt = status === "completed" ? nowIso() : null;
  await db.runAsync(
    "UPDATE tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?",
    status,
    completedAt,
    nowIso(),
    id,
  );
}

export async function deleteTaskRow(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync("DELETE FROM tasks WHERE id = ?", id);
}
