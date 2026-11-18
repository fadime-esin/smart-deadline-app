import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Heading } from "@/components/Heading";
import { Page } from "@/components/Page";
import {
  DEFAULT_ENABLED_MARGIN,
  getBackgroundSetupDone,
  getSettings,
  MAX_NAME_LENGTH,
  SAFETY_MARGIN_OPTIONS,
  type Settings,
} from "@/db/settings";
import { applyLanguageSetting, useI18n, type LanguageSetting, type TranslationKey } from "@/i18n";
import { LANGUAGE_SETTINGS } from "@/i18n/translate";
import { VENDOR_LABELS } from "@/logic/backgroundSetup";
import { MAX_DAILY_HOURS, type WeekdayHours } from "@/logic/capacity";
import { currentVendor } from "@/services/backgroundSetup";
import { hapticSelection } from "@/services/haptics";
import {
  ensureNotificationPermission,
  getNotificationStatus,
  sendTestNotification,
  type NotificationStatus,
} from "@/services/notifications";
import { refreshAllReminders, updateSettings } from "@/services/taskService";
import { fonts, radius, useColors, type Palette } from "@/theme/colors";

/** Rows shown Monday first; values are Date.getDay() indexes (0 = Sunday). */
const DAYS: { index: number; name: TranslationKey }[] = [
  { index: 1, name: "weekday.long.1" },
  { index: 2, name: "weekday.long.2" },
  { index: 3, name: "weekday.long.3" },
  { index: 4, name: "weekday.long.4" },
  { index: 5, name: "weekday.long.5" },
  { index: 6, name: "weekday.long.6" },
  { index: 0, name: "weekday.long.0" },
];

const LANGUAGE_LABELS: Record<LanguageSetting, TranslationKey> = {
  system: "settings.language.system",
  tr: "settings.language.tr",
  en: "settings.language.en",
};

const STATUS_TEXT: Record<NotificationStatus, TranslationKey> = {
  granted: "settings.reminders.granted",
  undetermined: "settings.reminders.undetermined",
  denied: "settings.reminders.denied",
  unavailable: "settings.reminders.unavailable",
};

const STEP = 0.5;

/** How long to wait after the last change before saving. */
const SAVE_DELAY_MS = 600;

type SaveState = "idle" | "pending" | "saved" | "error";

/**
 * Settings: the optional name for the greeting, the language, how many hours
 * the user can work on each weekday, the optional safety margin (off by
 * default) and the state of the reminders.
 *
 * There is no save button: every change is saved automatically. Changes are
 * collected for a short moment (so typing a name or tapping + several times
 * leads to one save), then saved, which also reschedules all reminders. The
 * language is switched on screen immediately.
 */
export default function SettingsScreen() {
  const db = useSQLiteContext();
  const colors = useColors();
  const styles = makeStyles(colors);
  const { t, f } = useI18n();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [status, setStatus] = useState<NotificationStatus | null>(null);
  const [setupDone, setSetupDone] = useState(false);
  const vendor = currentVendor();

  /** Settings changed but not saved yet, and the timer that will save them. */
  const pending = useRef<Settings | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Saves run one after another, so two saves never reschedule reminders at the same time. */
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    getSettings(db).then(setSettings);
  }, [db]);

  /** Saves the pending change (if any) after the earlier saves have finished. */
  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const next = pending.current;
    if (!next) return;
    pending.current = null;
    queue.current = queue.current
      .then(() => updateSettings(db, next))
      .then(
        () => setSaveState(pending.current ? "pending" : "saved"),
        (e) => {
          console.warn("Could not save the settings", e);
          setSaveState("error");
        },
      );
  }, [db]);

  // A change made just before leaving the screen is still saved.
  useEffect(() => flush, [flush]);

  // The permission can change in the phone's settings, so it is re-read whenever this tab is shown.
  useFocusEffect(
    useCallback(() => {
      getNotificationStatus().then(setStatus);
      getBackgroundSetupDone(db).then(setSetupDone);
    }, [db]),
  );

  if (!settings) {
    return (
      <Page style={styles.center}>
        <ActivityIndicator accessibilityLabel={t("settings.loading")} />
      </Page>
    );
  }

  const current = settings;
  const weeklyTotal = current.weekdayHours.reduce((sum, h) => sum + h, 0);
  const marginOn = current.safetyMargin > 0;

  function changeDay(index: number, delta: number) {
    hapticSelection();
    const next = [...current.weekdayHours] as [number, number, number, number, number, number, number];
    next[index] = Math.min(MAX_DAILY_HOURS, Math.max(0, next[index] + delta));
    change({ ...current, weekdayHours: next as WeekdayHours });
  }

  /** Shows a change at once and saves it automatically shortly afterwards. */
  function change(next: Settings) {
    setSettings(next);
    setSaveState("pending");
    pending.current = next;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, SAVE_DELAY_MS);
  }

  /** Asks Android for the notification permission and schedules the reminders if it is given. */
  async function allowReminders() {
    hapticSelection();
    const granted = await ensureNotificationPermission();
    setStatus(await getNotificationStatus());
    if (granted) await refreshAllReminders(db);
  }

  return (
    <Page>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.autosave}>{t("settings.autosave")}</Text>

        <Card>
          <Heading icon="person-circle-outline" title={t("settings.name")} />
          <Text style={styles.help}>{t("settings.name.help")}</Text>
          <TextInput
            value={current.userName}
            onChangeText={(userName) => change({ ...current, userName })}
            placeholder={t("settings.name.placeholder")}
            placeholderTextColor={colors.textMuted}
            maxLength={MAX_NAME_LENGTH}
            autoCapitalize="words"
            accessibilityLabel={t("settings.name")}
            style={styles.input}
          />
        </Card>

        <Card>
          <Heading icon="language-outline" title={t("settings.language")} />
          <Text style={styles.help}>{t("settings.language.help")}</Text>
          <View style={styles.chips} accessibilityRole="radiogroup">
            {LANGUAGE_SETTINGS.map((language) => {
              const selected = language === current.language;
              return (
                <Chip
                  key={language}
                  label={t(LANGUAGE_LABELS[language])}
                  selected={selected}
                  onPress={() => {
                    // The screen switches language at once; the choice is saved like every other change.
                    applyLanguageSetting(language);
                    change({ ...current, language });
                  }}
                  styles={styles}
                />
              );
            })}
          </View>
        </Card>

        <Card>
          <Heading icon="time-outline" title={t("settings.hours")} />
          <Text style={styles.help}>{t("settings.hours.help")}</Text>

          {DAYS.map(({ index, name }) => {
            const hours = current.weekdayHours[index];
            const day = t(name);
            return (
              <View key={index} style={styles.dayRow}>
                <Text style={styles.dayName}>{day}</Text>
                <Stepper
                  label={t("settings.hours.fewer.a11y", { day })}
                  onPress={() => changeDay(index, -STEP)}
                  icon="remove"
                  disabled={hours <= 0}
                  colors={colors}
                />
                <Text style={styles.dayValue} accessibilityLabel={`${day}: ${f.hours(hours)}`}>
                  {hours === 0 ? t("settings.hours.off") : f.hours(hours)}
                </Text>
                <Stepper
                  label={t("settings.hours.more.a11y", { day })}
                  onPress={() => changeDay(index, STEP)}
                  icon="add"
                  disabled={hours >= MAX_DAILY_HOURS}
                  colors={colors}
                />
              </View>
            );
          })}
          <Text style={styles.total}>{t("settings.hours.total", { hours: f.hours(weeklyTotal) })}</Text>
        </Card>

        <Card>
          <Heading icon="shield-checkmark-outline" title={t("settings.margin")} />
          <Text style={styles.help}>{t("settings.margin.help")}</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{marginOn ? t("common.on") : t("common.off")}</Text>
            <Switch
              value={marginOn}
              onValueChange={(on) => {
                hapticSelection();
                change({ ...current, safetyMargin: on ? DEFAULT_ENABLED_MARGIN : 0 });
              }}
              accessibilityLabel={t("settings.margin")}
              trackColor={{ false: colors.track, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
          {marginOn && (
            <>
              <Text style={styles.help}>{t("settings.margin.question")}</Text>
              <View style={styles.chips} accessibilityRole="radiogroup">
                {SAFETY_MARGIN_OPTIONS.map((margin) => {
                  const label = `+${Math.round(margin * 100)}%`;
                  return (
                    <Chip
                      key={margin}
                      label={label}
                      a11y={t("settings.margin.option.a11y", { percent: label })}
                      selected={Math.abs(margin - current.safetyMargin) < 1e-9}
                      onPress={() => change({ ...current, safetyMargin: margin })}
                      styles={styles}
                    />
                  );
                })}
              </View>
              <Text style={styles.example}>
                {t("settings.margin.example", { hours: f.hours(10 * (1 + current.safetyMargin)) })}
              </Text>
            </>
          )}
        </Card>

        <Card>
          <Heading icon="notifications-outline" title={t("settings.reminders")} />
          <Text style={styles.help}>{t("settings.reminders.help")}</Text>
          {status !== null && (
            <Text style={styles.status} accessibilityLiveRegion="polite">
              {status === "granted" ? "✓ " : "✗ "}
              {t(STATUS_TEXT[status])}
            </Text>
          )}
          {status === "undetermined" && (
            <Button label={t("settings.reminders.allow")} icon="notifications-outline" onPress={allowReminders} />
          )}
          {status === "denied" && (
            <Button
              label={t("settings.reminders.openSettings")}
              icon="open-outline"
              onPress={() => void Linking.openSettings()}
            />
          )}

          {vendor !== null && status !== null && status !== "unavailable" && (
            <View style={styles.background}>
              <Text style={styles.backgroundTitle}>
                {setupDone ? "✓" : "⚠"} {t("settings.background.title")}
              </Text>
              <Text style={styles.help}>{t("settings.background.help", { brand: VENDOR_LABELS[vendor] })}</Text>
              {setupDone && <Text style={styles.status}>✓ {t("settings.background.done")}</Text>}
              <Button
                label={t("settings.background.open")}
                icon="construct-outline"
                onPress={() => router.push("/reminder-setup")}
              />
            </View>
          )}

          {/* TEMPORARY (testing only): remove this component and TestReminderButtons below when no longer needed. */}
          <TestReminderButtons styles={styles} onDone={() => getNotificationStatus().then(setStatus)} />
        </Card>

      </ScrollView>

      {saveState !== "idle" && (
        <View
          style={[styles.saveBar, saveState === "error" && styles.saveBarError]}
          pointerEvents="none"
          accessibilityLiveRegion="polite"
        >
          <Text style={[styles.saveText, saveState === "error" && styles.errorText]}>
            {saveState === "pending" && `… ${t("common.saving")}`}
            {saveState === "saved" && `✓ ${t("settings.saved")}`}
            {saveState === "error" && `✗ ${t("settings.error")}`}
          </Text>
        </View>
      )}
    </Page>
  );
}

/**
 * TEMPORARY (testing only): buttons that send a test notification, so the
 * reminder system can be checked on the phone. To remove: delete this
 * function, its use above, `sendTestNotification` in services/notifications.ts
 * and the "settings.test.*" and "notify.test.*" texts in i18n/en.ts and tr.ts.
 */
function TestReminderButtons({ styles, onDone }: { styles: Styles; onDone: () => void }) {
  const { t } = useI18n();
  const [message, setMessage] = useState<string | null>(null);

  async function send(seconds: number, sentText: TranslationKey) {
    hapticSelection();
    try {
      const sent = await sendTestNotification(seconds);
      setMessage(sent ? `✓ ${t(sentText)}` : `✗ ${t("settings.test.failed")}`);
    } catch (e) {
      console.warn(e);
      setMessage(`✗ ${t("settings.test.failed")}`);
    }
    onDone();
  }

  return (
    <View style={styles.testBox}>
      <Text style={styles.testTitle}>{t("settings.test.title")}</Text>
      <Text style={styles.help}>{t("settings.test.help")}</Text>
      <Button label={t("settings.test.now")} icon="flask-outline" onPress={() => send(5, "settings.test.sent.now")} />
      <Button
        label={t("settings.test.minute")}
        icon="hourglass-outline"
        onPress={() => send(60, "settings.test.sent.minute")}
      />
      {message !== null && (
        <Text style={styles.status} accessibilityLiveRegion="polite">
          {message}
        </Text>
      )}
    </View>
  );
}

function Chip({
  label,
  a11y,
  selected,
  onPress,
  styles,
}: {
  label: string;
  a11y?: string;
  selected: boolean;
  onPress: () => void;
  styles: Styles;
}) {
  return (
    <Pressable
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={a11y ?? label}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {selected ? "✓ " : ""}
        {label}
      </Text>
    </Pressable>
  );
}

function Stepper({
  label,
  icon,
  onPress,
  disabled,
  colors,
}: {
  label: string;
  icon: "add" | "remove";
  onPress: () => void;
  disabled: boolean;
  colors: Palette;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: radius.md,
        borderWidth: 1.5,
        borderColor: colors.border,
        backgroundColor: colors.surfaceRaised,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.35 : pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name={icon} size={20} color={colors.text} />
    </Pressable>
  );
}

type Styles = ReturnType<typeof makeStyles>;

function makeStyles(colors: Palette) {
  return StyleSheet.create({
    center: {
      alignItems: "center",
      justifyContent: "center",
    },
    container: {
      paddingHorizontal: 16,
      paddingTop: 4,
      gap: 14,
      paddingBottom: 72,
    },
    autosave: {
      color: colors.textMuted,
      fontSize: 13,
      fontFamily: fonts.regular,
    },
    saveBar: {
      position: "absolute",
      left: 16,
      right: 16,
      bottom: 12,
      alignItems: "center",
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    saveBarError: {
      borderColor: colors.error,
      borderWidth: 2,
      borderStyle: "dashed",
    },
    saveText: {
      color: colors.text,
      fontSize: 14,
      fontFamily: fonts.semibold,
    },
    errorText: {
      color: colors.error,
    },
    help: {
      color: colors.textMuted,
      fontSize: 14,
      fontFamily: fonts.regular,
      lineHeight: 20,
    },
    input: {
      color: colors.text,
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.border,
      borderWidth: 1.5,
      borderRadius: radius.md,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 16,
      fontFamily: fonts.regular,
    },
    dayRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 2,
    },
    dayName: {
      flex: 1,
      color: colors.text,
      fontSize: 16,
      fontFamily: fonts.medium,
    },
    dayValue: {
      minWidth: 62,
      textAlign: "center",
      color: colors.text,
      fontSize: 16,
      fontFamily: fonts.bold,
    },
    total: {
      color: colors.text,
      fontSize: 14,
      fontFamily: fonts.semibold,
      marginTop: 4,
    },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    switchLabel: {
      color: colors.text,
      fontSize: 16,
      fontFamily: fonts.bold,
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: 14,
      paddingVertical: 9,
      backgroundColor: colors.surfaceRaised,
    },
    chipSelected: {
      borderWidth: 2,
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    chipText: {
      color: colors.text,
      fontSize: 15,
      fontFamily: fonts.medium,
    },
    chipTextSelected: {
      color: colors.primaryText,
      fontFamily: fonts.bold,
    },
    example: {
      color: colors.text,
      fontSize: 14,
      fontFamily: fonts.regular,
      fontStyle: "italic",
    },
    status: {
      color: colors.text,
      fontSize: 14,
      fontFamily: fonts.semibold,
      lineHeight: 20,
    },
    background: {
      gap: 8,
      marginTop: 6,
      padding: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      backgroundColor: colors.surfaceRaised,
    },
    backgroundTitle: {
      color: colors.text,
      fontSize: 15,
      fontFamily: fonts.bold,
    },
    testBox: {
      gap: 8,
      marginTop: 6,
      padding: 12,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: colors.border,
      borderRadius: radius.md,
    },
    testTitle: {
      color: colors.text,
      fontSize: 15,
      fontFamily: fonts.bold,
    },
  });
}
