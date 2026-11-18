/**
 * Shared data for the Today, Tasks and Calendar tabs: active tasks, settings,
 * the working-time situation, and everything derived from them (priority
 * ranking, work plan, overload advice). Reloads whenever the screen comes into
 * view, when the app returns to the foreground, and every minute (which also
 * starts a fresh day's working hours after midnight).
 */

import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";

import { DEFAULT_SETTINGS, getSettings, type Settings } from "@/db/settings";
import { listActiveTasks, type Task } from "@/db/tasks";
import { workTime, type WorkTime } from "@/logic/capacity";
import { overloadAdvice, planWork, type OverloadAdvice, type Plan } from "@/logic/planner";
import { plannedWork, rankTasks, remainingWork, type Ranked } from "@/logic/priority";
import { loadWorkTime } from "@/services/taskService";

const REFRESH_INTERVAL_MS = 60 * 1000;

export type TaskWithWork = Task & { workTotal: number; workLeft: number };
export type RankedTask = Ranked<TaskWithWork>;

export interface TaskData {
  now: Date;
  settings: Settings;
  time: WorkTime;
  tasks: TaskWithWork[];
  /** Active tasks in priority order (urgent first, then overdue, then by score). */
  ranked: RankedTask[];
  plan: Plan;
  advice: OverloadAdvice[];
  titles: ReadonlyMap<number, string>;
  /** Ids of the active tasks marked as urgent. */
  urgentIds: ReadonlySet<number>;
  loaded: boolean;
  reload: () => Promise<void>;
}

export function useTaskData(): TaskData {
  const db = useSQLiteContext();
  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [now, setNow] = useState(() => new Date());
  const [time, setTime] = useState<WorkTime>(() => workTime(DEFAULT_SETTINGS.weekdayHours, new Date()));
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    const current = new Date();
    const [activeTasks, loadedSettings] = await Promise.all([listActiveTasks(db), getSettings(db)]);
    setRawTasks(activeTasks);
    setTime(await loadWorkTime(db, loadedSettings, current));
    setSettings(loadedSettings);
    setNow(current);
    setLoaded(true);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") reload();
    });
    const timer = setInterval(reload, REFRESH_INTERVAL_MS);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, [reload]);

  return useMemo(() => {
    const margin = settings.safetyMargin;
    const tasks = rawTasks.map((task) => ({
      ...task,
      workTotal: plannedWork(task.estimatedHours, margin),
      workLeft: remainingWork(task.estimatedHours, task.loggedHours, margin),
    }));
    const ranked = rankTasks(tasks, now, time);
    const plan = planWork(tasks, now, time);
    return {
      now,
      settings,
      time,
      tasks,
      ranked,
      plan,
      advice: overloadAdvice(plan, tasks),
      titles: new Map(tasks.map((task) => [task.id, task.title])),
      urgentIds: new Set(tasks.filter((task) => task.urgent).map((task) => task.id)),
      loaded,
      reload,
    };
  }, [rawTasks, settings, now, time, loaded, reload]);
}
