/**
 * Local SQLite database (report, Section 5.4).
 *
 * Four tables: categories and tasks (one category -> many tasks),
 * work_sessions (one task -> many logged sessions) and settings.
 * The schema is versioned with SQLite's built-in `user_version` setting:
 * each numbered migration step runs once, so an existing database on the
 * phone is upgraded without losing the user's tasks.
 */

import type { SQLiteDatabase } from "expo-sqlite";

import { DEFAULT_SETTINGS } from "./settings";

export const DATABASE_NAME = "smart-deadline.db";
const DATABASE_VERSION = 5;

/**
 * The fixed set of categories and their importance weights (U_f),
 * graded by academic stakes (report, Section 5.2).
 */
export const INITIAL_CATEGORIES: readonly { name: string; weight: number }[] = [
  { name: "Exam", weight: 1.5 },
  { name: "Assignment", weight: 1.2 },
  { name: "Project", weight: 1.3 },
  { name: "Personal", weight: 1.0 },
];

/** Runs when the app opens (SQLiteProvider onInit), before any screen is shown. */
export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  // Settings that apply to every connection.
  await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");

  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  let currentVersion = row?.user_version ?? 0;
  if (currentVersion >= DATABASE_VERSION) return;

  if (currentVersion === 0) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE categories (
          id     INTEGER PRIMARY KEY NOT NULL,
          name   TEXT    NOT NULL UNIQUE,
          weight REAL    NOT NULL CHECK (weight > 0)
        );

        CREATE TABLE tasks (
          id              INTEGER PRIMARY KEY NOT NULL,
          category_id     INTEGER NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
          title           TEXT    NOT NULL CHECK (length(trim(title)) > 0),
          description     TEXT,
          deadline        TEXT    NOT NULL,
          estimated_hours REAL    NOT NULL CHECK (estimated_hours > 0),
          status          TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
          completed_at    TEXT,
          notification_id TEXT,
          created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
          updated_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        );

        CREATE INDEX ix_tasks_status ON tasks (status);
      `);

      for (const category of INITIAL_CATEGORIES) {
        await db.runAsync(
          "INSERT INTO categories (name, weight) VALUES (?, ?)",
          category.name,
          category.weight,
        );
      }
    });
    currentVersion = 1;
  }

  if (currentVersion === 1) {
    // Version 2: a task can now have several reminders (At Risk and Critical),
    // and the category weights are set to their final values.
    await db.withTransactionAsync(async () => {
      await db.execAsync("ALTER TABLE tasks RENAME COLUMN notification_id TO notification_ids;");
      // Any single reminder id from version 1 becomes a one-element JSON list.
      await db.execAsync(
        "UPDATE tasks SET notification_ids = json_array(notification_ids) WHERE notification_ids IS NOT NULL;",
      );
      for (const category of INITIAL_CATEGORIES) {
        await db.runAsync("UPDATE categories SET weight = ? WHERE name = ?", category.weight, category.name);
      }
    });
    currentVersion = 2;
  }

  if (currentVersion === 2) {
    // Version 3: progress tracking (work sessions) and user settings
    // (working hours per weekday).
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE work_sessions (
          id        INTEGER PRIMARY KEY NOT NULL,
          task_id   INTEGER NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
          hours     REAL    NOT NULL CHECK (hours > 0),
          logged_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        );

        CREATE INDEX ix_work_sessions_task ON work_sessions (task_id);

        CREATE TABLE settings (
          key   TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL
        );
      `);
      await db.runAsync(
        "INSERT INTO settings (key, value) VALUES (?, ?)",
        "weekdayHours",
        JSON.stringify(DEFAULT_SETTINGS.weekdayHours),
      );
    });
    currentVersion = 3;
  }

  if (currentVersion === 3) {
    // Version 4: clears the safety margin stored by version 3 (it then defaulted
    // to +20%); the margin is now off unless the user switches it on.
    await db.execAsync("DELETE FROM settings WHERE key = 'safetyMargin';");
    currentVersion = 4;
  }

  if (currentVersion === 4) {
    // Version 5: a task can be marked as urgent (planned before everything else).
    await db.execAsync("ALTER TABLE tasks ADD COLUMN is_urgent INTEGER NOT NULL DEFAULT 0;");
    currentVersion = 5;
  }

  // Future schema changes go here as: if (currentVersion === 5) { ...; currentVersion = 6; }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
