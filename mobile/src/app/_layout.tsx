import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { PatrickHand_400Regular } from "@expo-google-fonts/patrick-hand";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from "expo-sqlite";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { DATABASE_NAME, migrateDbIfNeeded } from "@/db/database";
import { getBackgroundSetupDone, getSettings } from "@/db/settings";
import { applyLanguageSetting, useI18n } from "@/i18n";
import {
  configureNotificationHandler,
  ensureNotificationPermission,
  isExpoGo,
  listenForReminderTaps,
} from "@/services/notifications";
import { currentVendor } from "@/services/backgroundSetup";
import { refreshAllReminders } from "@/services/taskService";
import { fonts, useColors, useScheme } from "@/theme/colors";

void configureNotificationHandler();
// Keep the splash screen visible until the fonts are loaded.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Prepares the database and applies the saved language before any screen is shown. */
async function initDatabase(db: SQLiteDatabase): Promise<void> {
  await migrateDbIfNeeded(db);
  applyLanguageSetting((await getSettings(db)).language);
}

/**
 * Root of the app: loads the fonts, opens (and if needed creates or
 * upgrades) the local database before any screen is shown, and defines
 * the screens: the four tabs (see (tabs)/_layout.tsx) and the task screens,
 * which open on top of the tabs.
 */
export default function RootLayout() {
  const scheme = useScheme();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PatrickHand_400Regular,
  });
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) return null;

  return (
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={initDatabase}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Reminders />
      <Screens />
    </SQLiteProvider>
  );
}

/**
 * Keeps the reminders working: asks for the notification permission as soon
 * as the app opens (reminders are a core feature, so the question should not
 * wait until the first reminder is scheduled), reschedules the reminders at
 * every app start (a new day brings fresh working hours), shows the
 * background setup guide on phones that need it (until the user confirms it)
 * and opens the task when a reminder is tapped.
 */
function Reminders() {
  const db = useSQLiteContext();

  useEffect(() => {
    // Android only shows the permission question while the user has not refused it for good.
    ensureNotificationPermission()
      .catch((error) => {
        console.warn("Could not ask for the notification permission", error);
        return false;
      })
      .then(async (granted) => {
        await refreshAllReminders(db);
        // The guide is pointless without the permission, and inside Expo Go (no reminders there).
        if (granted && !isExpoGo && currentVendor() !== null && !(await getBackgroundSetupDone(db))) {
          setTimeout(() => router.push("/reminder-setup"), 500);
        }
      })
      .catch((error) => console.warn("Could not refresh reminders", error));

    let stop: (() => void) | undefined;
    let cancelled = false;
    listenForReminderTaps((taskId) => {
      // A short delay lets the screens finish loading when the tap started the app.
      setTimeout(() => router.push({ pathname: "/task/[id]", params: { id: String(taskId) } }), 300);
    }).then((unsubscribe) => {
      if (cancelled) unsubscribe();
      else stop = unsubscribe;
    });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [db]);

  return null;
}

function Screens() {
  const colors = useColors();
  const { t } = useI18n();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.hand, fontSize: 24 },
        contentStyle: { backgroundColor: colors.background },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false, title: t("app.name") }} />
      <Stack.Screen name="task/new" options={{ title: t("screen.newTask") }} />
      <Stack.Screen name="task/urgent" options={{ title: t("screen.urgentTask") }} />
      <Stack.Screen name="task/[id]" options={{ title: t("screen.editTask") }} />
      <Stack.Screen name="reminder-setup" options={{ title: t("setup.screenTitle"), presentation: "modal" }} />
    </Stack>
  );
}
