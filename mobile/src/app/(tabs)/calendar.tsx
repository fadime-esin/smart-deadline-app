import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AddTaskButton } from "@/components/AddTaskButton";
import { Card } from "@/components/Card";
import { Heading } from "@/components/Heading";
import { Page } from "@/components/Page";
import { TaskRow } from "@/components/TaskRow";
import { UrgentBadge } from "@/components/UrgencyBadge";
import { useTaskData } from "@/hooks/useTaskData";
import { useI18n, type TranslationKey } from "@/i18n";
import { startOfDay } from "@/logic/capacity";
import { dayKey, monthGrid } from "@/logic/calendar";
import { hapticSelection } from "@/services/haptics";
import { fonts, radius, useColors } from "@/theme/colors";

const MONTHS: TranslationKey[] = [
  "month.1",
  "month.2",
  "month.3",
  "month.4",
  "month.5",
  "month.6",
  "month.7",
  "month.8",
  "month.9",
  "month.10",
  "month.11",
  "month.12",
];
/** Column headers, Monday first. */
const WEEKDAYS: TranslationKey[] = [
  "weekday.short.1",
  "weekday.short.2",
  "weekday.short.3",
  "weekday.short.4",
  "weekday.short.5",
  "weekday.short.6",
  "weekday.short.0",
];

/**
 * Calendar tab: a month view. Each day shows how many deadlines fall on it
 * (as a number). Selecting a day lists what is due and the work the planner
 * has scheduled for that day.
 */
export default function CalendarScreen() {
  const colors = useColors();
  const { t, plural, f } = useI18n();
  const data = useTaskData();
  const today = startOfDay(data.now);
  const [month, setMonth] = useState(() => ({ year: today.getFullYear(), month: today.getMonth() }));
  const [selected, setSelected] = useState<Date>(today);

  // Deadlines per day.
  const dueByDay = new Map<string, typeof data.ranked>();
  for (const task of data.ranked) {
    const key = dayKey(task.deadline);
    dueByDay.set(key, [...(dueByDay.get(key) ?? []), task]);
  }
  // Planned work per day (from the EDF plan).
  const planByDay = new Map(data.plan.days.map((day) => [dayKey(day.date), day]));

  const selectedKey = dayKey(selected);
  const dueOnSelected = [...(dueByDay.get(selectedKey) ?? [])].sort(
    (a, b) => a.deadline.getTime() - b.deadline.getTime(),
  );
  const planOnSelected = planByDay.get(selectedKey);
  const plannedHours = planOnSelected?.allocations.reduce((sum, a) => sum + a.hours, 0) ?? 0;
  const isPast = selected.getTime() < today.getTime();

  function shiftMonth(delta: number) {
    hapticSelection();
    setMonth(({ year, month: m }) => {
      const next = new Date(year, m + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  function goToToday() {
    hapticSelection();
    setMonth({ year: today.getFullYear(), month: today.getMonth() });
    setSelected(today);
  }

  const openTask = (id: number) => router.push({ pathname: "/task/[id]", params: { id: String(id) } });

  return (
    <Page>
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.monthRow}>
            <NavButton icon="chevron-back" label={t("calendar.previous")} onPress={() => shiftMonth(-1)} />
            <Text style={[styles.monthTitle, { color: colors.text }]} accessibilityRole="header">
              {t(MONTHS[month.month])} {month.year}
            </Text>
            <NavButton icon="chevron-forward" label={t("calendar.next")} onPress={() => shiftMonth(1)} />
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((key) => (
              <Text key={key} style={[styles.weekday, { color: colors.textMuted }]}>
                {t(key)}
              </Text>
            ))}
          </View>

          {monthGrid(month.year, month.month).map((week, w) => (
            <View key={w} style={styles.weekRow}>
              {week.map((day, d) => {
                if (!day) return <View key={d} style={styles.cell} />;
                const key = dayKey(day);
                const count = dueByDay.get(key)?.length ?? 0;
                const isToday = key === dayKey(today);
                const isSelected = key === selectedKey;
                return (
                  <Pressable
                    key={d}
                    onPress={() => {
                      hapticSelection();
                      setSelected(day);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${f.date(day)}${isToday ? `, ${t("calendar.today")}` : ""}, ${plural(
                      count,
                      "calendar.deadlines.one",
                      "calendar.deadlines.other",
                    )}`}
                    style={[
                      styles.cell,
                      styles.day,
                      isSelected && { backgroundColor: colors.primary },
                      { borderColor: colors.border },
                      !isSelected && isToday && { borderWidth: 2.5, borderColor: colors.accent },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        { color: isSelected ? colors.primaryText : colors.text },
                        (isSelected || isToday) && { fontFamily: fonts.bold },
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                    {count > 0 && (
                      <View
                        style={[
                          styles.countBadge,
                          { backgroundColor: isSelected ? colors.primaryText : colors.accentSoft },
                        ]}
                      >
                        <Text style={[styles.countText, { color: isSelected ? colors.primary : colors.accent }]}>
                          {count}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}

          <View style={styles.legendRow}>
            <Text style={[styles.legend, { color: colors.textMuted }]}>{t("calendar.legend")}</Text>
            <Pressable onPress={goToToday} accessibilityRole="button" hitSlop={8}>
              <Text style={[styles.link, { color: colors.accent }]}>{t("calendar.goToday")}</Text>
            </Pressable>
          </View>
        </Card>

        <Text style={[styles.dayTitle, { color: colors.text }]} accessibilityRole="header">
          {f.date(selected)}
          {selectedKey === dayKey(today) ? ` · ${t("calendar.goToday")}` : ""}
        </Text>

        <Card>
          <Heading icon="flag-outline" title={t("calendar.due", { count: dueOnSelected.length })} />
          {dueOnSelected.length === 0 ? (
            <Text style={[styles.muted, { color: colors.textMuted }]}>{t("calendar.due.empty")}</Text>
          ) : (
            <View style={styles.list}>
              {dueOnSelected.map((task) => (
                <TaskRow key={task.id} task={task} onOpen={() => openTask(task.id)} timeOnly />
              ))}
            </View>
          )}
        </Card>

        {!isPast && (
          <Card>
            <Heading
              icon="time-outline"
              title={t("calendar.planned") + (plannedHours > 0 ? ` (${f.duration(plannedHours)})` : "")}
            />
            {!planOnSelected || planOnSelected.allocations.length === 0 ? (
              <Text style={[styles.muted, { color: colors.textMuted }]}>{t("calendar.planned.empty")}</Text>
            ) : (
              planOnSelected.allocations.map((allocation, index) => (
                <Pressable
                  key={allocation.taskId}
                  onPress={() => openTask(allocation.taskId)}
                  accessibilityRole="button"
                  accessibilityLabel={t(
                    data.urgentIds.has(allocation.taskId) ? "plan.step.urgent.a11y" : "plan.step.a11y",
                    {
                      step: index + 1,
                      duration: f.duration(allocation.hours),
                      title: data.titles.get(allocation.taskId) ?? t("task.fallbackTitle"),
                    },
                  )}
                  style={({ pressed }) => [
                    styles.planRow,
                    {
                      backgroundColor: colors.surfaceRaised,
                      borderColor: data.urgentIds.has(allocation.taskId) ? colors.urgent : colors.border,
                      borderWidth: data.urgentIds.has(allocation.taskId) ? 2 : 1,
                      opacity: pressed ? 0.6 : 1,
                    },
                  ]}
                >
                  <View style={[styles.stepCircle, { borderColor: colors.primary }]}>
                    <Text style={[styles.stepText, { color: colors.accent }]}>{index + 1}</Text>
                  </View>
                  {data.urgentIds.has(allocation.taskId) && <UrgentBadge compact />}
                  <Text style={[styles.planTitle, { color: colors.text }]} numberOfLines={1}>
                    {data.titles.get(allocation.taskId) ?? t("task.fallbackTitle")}
                  </Text>
                  <Text style={[styles.planHours, { color: colors.text }]}>{f.duration(allocation.hours)}</Text>
                </Pressable>
              ))
            )}
          </Card>
        )}
      </ScrollView>

      <AddTaskButton date={isPast ? undefined : selectedKey} />
    </Page>
  );
}

function NavButton({
  icon,
  label,
  onPress,
}: {
  icon: "chevron-back" | "chevron-forward";
  label: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [
        styles.navButton,
        { backgroundColor: colors.surfaceRaised, borderColor: colors.border, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Ionicons name={icon} size={20} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 96,
    gap: 14,
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  monthTitle: {
    fontSize: 26,
    fontFamily: fonts.hand,
  },
  navButton: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  weekRow: {
    flexDirection: "row",
  },
  weekday: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontFamily: fonts.semibold,
    paddingVertical: 4,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    margin: 2,
  },
  day: {
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    fontSize: 15,
    fontFamily: fonts.medium,
  },
  countBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    fontSize: 10.5,
    fontFamily: fonts.bold,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    gap: 8,
  },
  legend: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  link: {
    fontSize: 14,
    fontFamily: fonts.semibold,
  },
  dayTitle: {
    fontSize: 24,
    fontFamily: fonts.hand,
    marginTop: 2,
  },
  muted: {
    fontSize: 14,
    fontFamily: fonts.regular,
  },
  list: {
    gap: 8,
  },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    fontSize: 17,
    lineHeight: 24,
    fontFamily: fonts.hand,
  },
  planTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.regular,
  },
  planHours: {
    fontSize: 15,
    fontFamily: fonts.semibold,
  },
});
