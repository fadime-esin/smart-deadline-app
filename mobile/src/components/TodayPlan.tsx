import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/Card";
import { Heading } from "@/components/Heading";
import { ProgressBar } from "@/components/ProgressBar";
import { UrgentBadge } from "@/components/UrgencyBadge";
import { useI18n } from "@/i18n";
import type { OverloadAdvice, PlanDay } from "@/logic/planner";
import { fonts, radius, useColors } from "@/theme/colors";

interface Props {
  /** Today's part of the plan. */
  today: PlanDay;
  /** Hours already logged today. */
  workedToday: number;
  /** Overload warnings for the whole plan (empty when everything fits). */
  advice: OverloadAdvice[];
  /** Task titles by id. */
  titles: ReadonlyMap<number, string>;
  /** Ids of the tasks marked as urgent. */
  urgentIds: ReadonlySet<number>;
  /** True if there is at least one active task. */
  hasTasks: boolean;
  onOpenTask: (taskId: number) => void;
  onOpenSettings: () => void;
}

/**
 * "Today's plan": what to work on today and for how long (urgent tasks first,
 * then Earliest Deadline First), plus a warning when the workload does not fit.
 */
export function TodayPlan({
  today,
  workedToday,
  advice,
  titles,
  urgentIds,
  hasTasks,
  onOpenTask,
  onOpenSettings,
}: Props) {
  const colors = useColors();
  const { t, f } = useI18n();
  const planned = today.allocations.reduce((sum, a) => sum + a.hours, 0);
  const title = (id: number) => titles.get(id) ?? t("task.fallbackTitle");
  const dayTotal = workedToday + planned;
  const dayProgress = dayTotal > 0 ? workedToday / dayTotal : 0;

  let emptyText: string | null = null;
  if (today.allocations.length === 0) {
    emptyText = today.capacity < 1 / 60 ? t("plan.empty.noTime") : t("plan.empty.onTrack");
  }

  if (!hasTasks) return null;

  return (
    <View style={styles.wrapper}>
      {advice.length > 0 && (
        <Card borderColor={colors.overdue} borderWidth={2} style={styles.warning}>
          <View accessibilityRole="alert" style={styles.gap}>
            <Heading icon="warning-outline" title={`⚠ ${t("overload.title")}`} color={colors.overdue} />
            {advice.map((item) => (
              <View key={item.taskId} style={styles.adviceItem}>
                <Text style={[styles.text, { color: colors.text }]}>
                  <Text style={styles.bold}>{title(item.taskId)}</Text>:{" "}
                  {t("overload.short", { hours: f.duration(item.hoursShort), deadline: f.dateTime(item.deadline) })}
                </Text>
                <Text style={[styles.small, { color: colors.textMuted }]}>
                  {item.behindUrgent ? `${t("overload.behindUrgent")} ` : ""}
                  {item.reduceFirst.length > 0
                    ? t("overload.reduce", { tasks: item.reduceFirst.map(title).join(", ") })
                    : t("overload.noReduce")}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      <Card tape>
        <Heading
          icon="easel-outline"
          title={t("plan.title")}
          right={
            <Pressable
              onPress={onOpenSettings}
              accessibilityRole="button"
              accessibilityLabel={t("plan.capacity.a11y", { duration: f.duration(today.capacity) })}
              hitSlop={8}
            >
              <Text style={[styles.small, { color: colors.accent, fontFamily: fonts.semibold }]}>
                {t("plan.capacity", { duration: f.duration(today.capacity) })} ›
              </Text>
            </Pressable>
          }
        />

        {dayTotal > 0 && (
          <View style={styles.gapSmall}>
            <ProgressBar
              value={dayProgress}
              accessibilityLabel={t("plan.progress.a11y", {
                done: f.duration(workedToday),
                todo: f.duration(planned),
              })}
            />
            <Text style={[styles.small, { color: colors.textMuted }]}>
              {t("plan.progress", { done: f.duration(workedToday), todo: f.duration(planned) })}
            </Text>
          </View>
        )}

        {emptyText !== null && <Text style={[styles.text, { color: colors.textMuted }]}>{emptyText}</Text>}

        {today.allocations.map((allocation, index) => {
          const urgent = urgentIds.has(allocation.taskId);
          return (
            <Pressable
              key={allocation.taskId}
              onPress={() => onOpenTask(allocation.taskId)}
              accessibilityRole="button"
              accessibilityLabel={t(urgent ? "plan.step.urgent.a11y" : "plan.step.a11y", {
                step: index + 1,
                duration: f.duration(allocation.hours),
                title: title(allocation.taskId),
              })}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: colors.surfaceRaised,
                  borderColor: urgent ? colors.urgent : colors.border,
                  borderWidth: urgent ? 2 : 1,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <View style={[styles.stepCircle, { borderColor: colors.primary }]}>
                <Text style={[styles.stepText, { color: colors.accent }]}>{index + 1}</Text>
              </View>
              <View style={styles.flex}>
                {urgent && <UrgentBadge compact />}
                <Text style={[styles.text, { color: colors.text }]} numberOfLines={2}>
                  {title(allocation.taskId)}
                </Text>
              </View>
              <Text style={[styles.text, styles.bold, { color: colors.text }]}>{f.duration(allocation.hours)}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          );
        })}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 14,
    marginBottom: 2,
  },
  warning: {
    borderStyle: "dashed",
  },
  gap: {
    gap: 8,
  },
  gapSmall: {
    gap: 6,
  },
  adviceItem: {
    gap: 3,
  },
  row: {
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
  text: {
    fontSize: 15,
    fontFamily: fonts.regular,
  },
  small: {
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  bold: {
    fontFamily: fonts.semibold,
  },
  flex: {
    flex: 1,
    gap: 3,
  },
});
