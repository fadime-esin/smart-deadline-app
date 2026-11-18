/**
 * Deadline reminders as local notifications (report, Section 5.5).
 * The Android system delivers them at the scheduled time, even when the app
 * is closed; no server or internet connection is involved.
 *
 * Expo Go note: recent versions of Expo Go no longer contain every native part
 * of expo-notifications, so simply importing the library crashes the app there.
 * The library is therefore loaded lazily and only outside Expo Go. Inside Expo
 * Go the app works normally but schedules no reminders; in the installed APK
 * (built with EAS Build) reminders work as designed.
 */

import { isRunningInExpoGo } from "expo";
import { Platform } from "react-native";

import { i18nFor } from "@/i18n";
import type { WorkTime } from "@/logic/capacity";
import { plannedReminders, type ReminderKind } from "@/logic/reminders";

type NotificationsModule = typeof import("expo-notifications");

const CHANNEL_ID = "deadline-reminders";

/** True when the app is running inside the Expo Go client. */
export const isExpoGo = isRunningInExpoGo();

let modulePromise: Promise<NotificationsModule | null> | null = null;

/** Loads expo-notifications once, or resolves to null where it is unavailable. */
function loadNotifications(): Promise<NotificationsModule | null> {
  if (!modulePromise) {
    modulePromise = isExpoGo
      ? Promise.resolve(null)
      : import("expo-notifications")
          .then((module) =>
            // Guard against a partially loaded module (missing native parts).
            typeof module.scheduleNotificationAsync === "function" ? module : null,
          )
          .catch((error) => {
            console.warn("Notifications are unavailable:", error);
            return null;
          });
  }
  return modulePromise;
}

/** How notifications behave while the app is open. Called once at startup. */
export async function configureNotificationHandler(): Promise<void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Creates (or renames, after a language change) the Android notification channel. */
async function ensureChannel(Notifications: NotificationsModule): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: i18nFor().t("notify.channel"),
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 200, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

/**
 * Whether reminders can be delivered:
 *   "unavailable"  - not supported here (inside Expo Go);
 *   "granted"      - allowed;
 *   "denied"       - refused, and Android will not ask again (only the phone's settings can change it);
 *   "undetermined" - not asked yet, or refused once (the app may ask again).
 */
export type NotificationStatus = "unavailable" | "granted" | "denied" | "undetermined";

export async function getNotificationStatus(): Promise<NotificationStatus> {
  const Notifications = await loadNotifications();
  if (!Notifications) return "unavailable";
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return "granted";
  return current.canAskAgain ? "undetermined" : "denied";
}

/**
 * Creates the Android notification channel and asks for permission if needed.
 * Returns true if reminders are allowed. If the user refuses (or notifications
 * are unavailable), the rest of the app keeps working normally.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;

  // On Android 13+ the permission question can only appear once a channel exists.
  await ensureChannel(Notifications);

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export interface ReminderTask {
  id: number;
  title: string;
  deadline: Date;
  /** Remaining work in hours (estimate - logged hours). */
  workLeft: number;
  urgent?: boolean;
}

/** Notification text for each reminder kind (symbol + word, never colour alone). */
function reminderContent(kind: ReminderKind, task: ReminderTask) {
  const { t, f } = i18nFor();
  const params = { title: task.title, work: f.hours(task.workLeft), deadline: f.dateTime(task.deadline) };
  const prefix = task.urgent ? `${t("notify.urgentPrefix")} ` : "";
  return {
    title: prefix + t(`notify.${kind}.title`, params),
    body: t(`notify.${kind}.body`, params),
  };
}

/**
 * Schedules the reminders of a task and returns their identifiers.
 * Returns an empty list if no reminder is needed or notifications are not allowed.
 */
export async function scheduleReminders(
  task: ReminderTask,
  time: WorkTime,
  now = new Date(),
): Promise<string[]> {
  const planned = plannedReminders(task.deadline, task.workLeft, now, time);
  if (planned.length === 0) return [];

  const Notifications = await loadNotifications();
  if (!Notifications) return [];
  if (!(await ensureNotificationPermission())) return [];

  const ids: string[] = [];
  for (const reminder of planned) {
    ids.push(
      await Notifications.scheduleNotificationAsync({
        content: { ...reminderContent(reminder.kind, task), sound: true, data: { taskId: task.id } },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminder.at,
          channelId: CHANNEL_ID,
        },
      }),
    );
  }
  return ids;
}

export async function cancelReminders(notificationIds: readonly string[]): Promise<void> {
  if (notificationIds.length === 0) return;
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  for (const id of notificationIds) {
    await Notifications.cancelScheduledNotificationAsync(id);
  }
}

/**
 * Sends a test notification a few seconds from now, so the user can check
 * that reminders reach them. Returns false if notifications are not allowed.
 */
export async function sendTestNotification(delaySeconds = 5): Promise<boolean> {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;
  if (!(await ensureNotificationPermission())) return false;

  const { t } = i18nFor();
  await Notifications.scheduleNotificationAsync({
    content: { title: t("notify.test.title"), body: t("notify.test.body"), sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: delaySeconds,
      channelId: CHANNEL_ID,
    },
  });
  return true;
}

/** Reads the task id stored in a reminder, if any. */
function taskIdOf(data: unknown): number | null {
  const id = (data as { taskId?: unknown } | null | undefined)?.taskId;
  return typeof id === "number" ? id : null;
}

/**
 * Calls `onOpen` with the task id when the user taps a reminder, including
 * the reminder that started the app. Returns a function that stops listening.
 */
export async function listenForReminderTaps(onOpen: (taskId: number) => void): Promise<() => void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return () => undefined;

  try {
    // The tap that opened the app (if the app was closed). The function for
    // this has had two names across library versions, so both are tried.
    type Response = { notification: { request: { content: { data?: unknown } } } } | null | undefined;
    const api = Notifications as unknown as {
      getLastNotificationResponse?: () => Response;
      getLastNotificationResponseAsync?: () => Promise<Response>;
    };
    const last = api.getLastNotificationResponse
      ? api.getLastNotificationResponse()
      : await api.getLastNotificationResponseAsync?.();
    const id = taskIdOf(last?.notification.request.content.data);
    if (id !== null) onOpen(id);
  } catch (error) {
    console.warn("Could not read the last notification response", error);
  }

  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const id = taskIdOf(response.notification.request.content.data);
    if (id !== null) onOpen(id);
  });
  return () => subscription.remove();
}
