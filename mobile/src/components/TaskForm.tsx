import Ionicons from "@expo/vector-icons/Ionicons";
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";

import { Button } from "@/components/Button";
import { Page } from "@/components/Page";
import type { Category, TaskInput } from "@/db/tasks";
import { useI18n } from "@/i18n";
import { parseHours } from "@/logic/format";
import { hapticSelection } from "@/services/haptics";
import { fonts, radius, useColors, type Palette } from "@/theme/colors";
import { categoryIcon, URGENT_ICON } from "@/theme/icons";

interface Props {
  categories: Category[];
  initial?: TaskInput;
  /** Starting deadline for a new task (e.g. the day chosen in the calendar). */
  initialDeadline?: Date;
  /**
   * Short form for an urgent task: the task is always urgent, the description
   * is left out and a category is pre-selected, so only the title and the
   * hours have to be typed.
   */
  quickUrgent?: boolean;
  submitLabel: string;
  onSubmit: (input: TaskInput) => Promise<void>;
  /** Extra content shown above the form (e.g. progress on the edit screen). */
  header?: ReactNode;
  /** Extra buttons shown under the form (e.g. Complete / Delete on the edit screen). */
  footer?: ReactNode;
}

interface Errors {
  title?: string;
  category?: string;
  deadline?: string;
  hours?: string;
  save?: string;
}

/** Default deadline for a new task: tomorrow, on the hour. */
function defaultDeadline(): Date {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return date;
}

/**
 * The form used to create and edit tasks.
 * Problems are always written out as text with a "✗" symbol, never shown by colour alone.
 */
export function TaskForm({
  categories,
  initial,
  initialDeadline,
  quickUrgent,
  submitLabel,
  onSubmit,
  header,
  footer,
}: Props) {
  const colors = useColors();
  const styles = makeStyles(colors);
  const { t, f, category: categoryLabel } = useI18n();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [chosenCategoryId, setCategoryId] = useState<number | null>(initial?.categoryId ?? null);
  const [deadline, setDeadline] = useState<Date>(initial?.deadline ?? initialDeadline ?? defaultDeadline());
  const [hoursText, setHoursText] = useState(initial ? String(initial.estimatedHours) : "");
  const [urgent, setUrgent] = useState(quickUrgent || (initial?.urgent ?? false));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  // In the short urgent form a category is pre-selected (Personal, or the first one).
  const quickCategory = quickUrgent
    ? (categories.find((category) => category.name === "Personal") ?? categories[0])
    : undefined;
  const categoryId = chosenCategoryId ?? quickCategory?.id ?? null;

  const deadlineChanged = !initial || initial.deadline.getTime() !== deadline.getTime();

  function pickDate() {
    DateTimePickerAndroid.open({
      value: deadline,
      mode: "date",
      minimumDate: new Date(),
      onValueChange: (_event, selected) => {
        const next = new Date(deadline);
        next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
        setDeadline(next);
      },
    });
  }

  function pickTime() {
    DateTimePickerAndroid.open({
      value: deadline,
      mode: "time",
      is24Hour: true,
      onValueChange: (_event, selected) => {
        const next = new Date(deadline);
        next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
        setDeadline(next);
      },
    });
  }

  async function handleSubmit() {
    const hours = parseHours(hoursText);
    const found: Errors = {
      title: title.trim() ? undefined : t("form.error.title"),
      category: categoryId !== null ? undefined : t("form.error.category"),
      deadline: deadlineChanged && deadline.getTime() <= Date.now() ? t("form.error.deadline") : undefined,
      hours: hours !== null ? undefined : t("form.error.hours"),
    };
    setErrors(found);
    if (found.title || found.category || found.deadline || found.hours || hours === null || categoryId === null) {
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        categoryId,
        deadline,
        estimatedHours: hours,
        urgent,
      });
    } catch (error) {
      console.warn(error);
      setErrors({ save: t("form.error.save") });
      setSaving(false);
    }
  }

  return (
    <Page>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {header}
        {!!errors.save && <ErrorText text={errors.save!} colors={colors} />}

        <Text style={styles.label}>{t("form.title")}</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={t(quickUrgent ? "form.title.urgentPlaceholder" : "form.title.placeholder")}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, !!errors.title && styles.inputError]}
          maxLength={200}
          autoFocus={quickUrgent}
          accessibilityLabel={t("form.title")}
        />
        {!!errors.title && <ErrorText text={errors.title!} colors={colors} />}

        <Text style={styles.label}>{t("form.hours")}</Text>
        <TextInput
          value={hoursText}
          onChangeText={setHoursText}
          placeholder={t("form.hours.placeholder")}
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          style={[styles.input, !!errors.hours && styles.inputError]}
          accessibilityLabel={t("form.hours.a11y")}
        />
        {!!errors.hours && <ErrorText text={errors.hours!} colors={colors} />}

        <Text style={styles.label}>{t("form.deadline")}</Text>
        <View style={styles.row}>
          <View style={styles.flex}>
            <Button
              label={f.date(deadline)}
              icon="calendar-outline"
              onPress={pickDate}
              accessibilityLabel={t("form.deadline.date.a11y", { date: f.date(deadline) })}
            />
          </View>
          <Button
            label={f.time(deadline)}
            icon="time-outline"
            onPress={pickTime}
            accessibilityLabel={t("form.deadline.time.a11y", { time: f.time(deadline) })}
          />
        </View>
        {!!errors.deadline && <ErrorText text={errors.deadline!} colors={colors} />}

        <Text style={styles.label}>{t("form.category")}</Text>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {categories.map((category) => {
            const selected = category.id === categoryId;
            return (
              <Pressable
                key={category.id}
                onPress={() => {
                  hapticSelection();
                  setCategoryId(category.id);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Ionicons
                  name={selected ? "checkmark-circle" : categoryIcon(category.name)}
                  size={17}
                  color={selected ? colors.primaryText : colors.textMuted}
                />
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {selected ? "✓ " : ""}
                  {categoryLabel(category.name)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {!!errors.category && <ErrorText text={errors.category!} colors={colors} />}

        {!quickUrgent && (
          <>
            <View style={[styles.urgentRow, urgent && styles.urgentRowOn]}>
              <Ionicons name={URGENT_ICON} size={20} color={colors.urgent} />
              <View style={styles.flex}>
                <Text style={styles.urgentTitle}>
                  {t("form.urgent")}: {urgent ? t("common.on") : t("common.off")}
                </Text>
                <Text style={styles.help}>{t("form.urgent.help")}</Text>
              </View>
              <Switch
                value={urgent}
                onValueChange={(on) => {
                  hapticSelection();
                  setUrgent(on);
                }}
                accessibilityLabel={t("form.urgent")}
                trackColor={{ false: colors.track, true: colors.urgent }}
                thumbColor={colors.surface}
              />
            </View>

            <Text style={styles.label}>{t("form.description")}</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t("form.description.placeholder")}
              placeholderTextColor={colors.textMuted}
              multiline
              style={[styles.input, styles.multiline]}
              accessibilityLabel={t("form.description.a11y")}
            />
          </>
        )}

        <View style={styles.actions}>
          <Button
            label={saving ? t("common.saving") : submitLabel}
            icon={quickUrgent ? URGENT_ICON : "checkmark"}
            onPress={handleSubmit}
            variant={quickUrgent ? "urgent" : "primary"}
            disabled={saving}
          />
          {footer}
        </View>
      </ScrollView>
    </Page>
  );
}

function ErrorText({ text, colors }: { text: string; colors: Palette }) {
  return (
    <Text style={{ color: colors.error, fontFamily: fonts.semibold, marginTop: 4 }} accessibilityLiveRegion="polite">
      ✗ {text}
    </Text>
  );
}

function makeStyles(colors: Palette) {
  return StyleSheet.create({
    container: {
      padding: 16,
      gap: 8,
      paddingBottom: 40,
    },
    label: {
      color: colors.text,
      fontFamily: fonts.hand,
      fontSize: 19,
      marginTop: 10,
    },
    help: {
      color: colors.textMuted,
      fontFamily: fonts.regular,
      fontSize: 13,
      lineHeight: 18,
    },
    input: {
      color: colors.text,
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1.5,
      borderRadius: radius.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 16,
      fontFamily: fonts.regular,
    },
    inputError: {
      borderColor: colors.error,
      borderWidth: 2,
      borderStyle: "dashed",
    },
    multiline: {
      minHeight: 90,
      textAlignVertical: "top",
    },
    chips: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: 13,
      paddingVertical: 9,
      backgroundColor: colors.surface,
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
    urgentRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginTop: 14,
      padding: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
    },
    urgentRowOn: {
      borderWidth: 3,
      borderColor: colors.urgent,
    },
    urgentTitle: {
      color: colors.text,
      fontFamily: fonts.semibold,
      fontSize: 15,
    },
    row: {
      flexDirection: "row",
      gap: 8,
    },
    flex: {
      flex: 1,
    },
    actions: {
      marginTop: 24,
      gap: 12,
    },
  });
}
