import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated";

import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { UrgencyBadge, UrgentBadge, URGENCY_NAMES } from "@/components/UrgencyBadge";
import type { Task } from "@/db/tasks";
import { useI18n } from "@/i18n";
import type { PriorityResult } from "@/logic/priority";
import { fonts, radius, useColors } from "@/theme/colors";
import { categoryIcon } from "@/theme/icons";

interface Props {
  task: Task;
  priority: PriorityResult;
  /** Remaining work in hours (planned workload - logged). */
  workLeft: number;
  /** Total planned work in hours (estimate, plus the safety margin if enabled). */
  workTotal: number;
  onOpen: () => void;
  onComplete: () => void;
  onLog: () => void;
}

/** One task on the dashboard: tap to edit, "Log time" to record work, "Done" to complete. */
export function TaskCard({ task, priority, workLeft, workTotal, onOpen, onComplete, onLog }: Props) {
  const colors = useColors();
  const { t, f, category } = useI18n();
  const overdue = priority.state === "overdue";
  const done = workTotal > 0 ? Math.min(1, (workTotal - workLeft) / workTotal) : 0;
  const percent = Math.round(done * 100);
  const categoryName = category(task.categoryName);

  const timeLine = overdue
    ? f.remaining(priority.remainingHours)
    : `${f.remaining(priority.remainingHours)} · ${t("card.workTime", { hours: f.hours(priority.availableHours) })}`;
  const workLine =
    workLeft <= 0 ? t("card.workDone") : t("card.progress", { percent, hours: f.hours(workLeft) });

  // Urgent tasks get the urgent colour and a thick border; otherwise the border follows the urgency level.
  const borderColor = task.urgent ? colors.urgent : priority.state === "normal" ? undefined : colors[priority.state];
  const borderWidth = task.urgent ? 3 : priority.state === "normal" ? undefined : 2;

  return (
    <Animated.View entering={FadeInDown.duration(260)} exiting={FadeOut.duration(180)} layout={LinearTransition}>
      <Card borderColor={borderColor} borderWidth={borderWidth}>
        <Pressable
          onPress={onOpen}
          style={({ pressed }) => [styles.main, { opacity: pressed ? 0.7 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={t("card.a11y", {
            title: task.title,
            urgent: task.urgent ? `${t("urgent.badge")}, ` : "",
            level: t(URGENCY_NAMES[priority.state]),
            category: categoryName,
            deadline: f.dateTime(task.deadline),
            time: timeLine,
            work: workLine,
          })}
        >
          <View style={styles.headerRow}>
            <View style={styles.badges}>
              {task.urgent && <UrgentBadge />}
              <UrgencyBadge state={priority.state} />
            </View>
            <View style={styles.category}>
              <Ionicons name={categoryIcon(task.categoryName)} size={15} color={colors.textMuted} />
              <Text style={[styles.categoryText, { color: colors.textMuted }]}>{categoryName}</Text>
            </View>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{task.title}</Text>

          <View style={styles.line}>
            <Ionicons name="alarm-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.detail, { color: colors.text }]}>{f.dateTime(task.deadline)}</Text>
          </View>
          <View style={styles.line}>
            <Ionicons name="hourglass-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.detail, { color: colors.textMuted }]}>{timeLine}</Text>
          </View>

          <View style={styles.progress}>
            <ProgressBar value={done} accessibilityLabel={t("card.progress.a11y", { title: task.title, percent })} />
            <View style={styles.progressRow}>
              <Text style={[styles.small, styles.flexShrink, { color: colors.textMuted }]}>{workLine}</Text>
              {priority.score !== null && (
                <Text style={[styles.small, { color: colors.textMuted }]}>
                  {t("card.score", { score: f.number(priority.score, 2) })}
                </Text>
              )}
            </View>
          </View>
        </Pressable>

        <View style={styles.actions}>
          <SmallButton
            icon="timer-outline"
            label={t("log.title")}
            onPress={onLog}
            a11y={t("card.log.a11y", { title: task.title })}
          />
          <SmallButton
            icon="checkmark-circle-outline"
            label={t("card.done")}
            onPress={onComplete}
            a11y={t("card.done.a11y", { title: task.title })}
            primary
          />
        </View>
      </Card>
    </Animated.View>
  );
}

function SmallButton({
  icon,
  label,
  onPress,
  a11y,
  primary,
}: {
  icon: "timer-outline" | "checkmark-circle-outline";
  label: string;
  onPress: () => void;
  a11y: string;
  primary?: boolean;
}) {
  const colors = useColors();
  const fg = primary ? colors.primaryText : colors.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      hitSlop={4}
      style={({ pressed }) => [
        styles.smallButton,
        {
          backgroundColor: primary ? colors.primary : colors.surfaceRaised,
          borderColor: primary ? colors.primary : colors.border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={18} color={fg} />
      <Text style={[styles.smallButtonText, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  main: {
    gap: 6,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 2,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  category: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  categoryText: {
    fontSize: 13,
    fontFamily: fonts.medium,
  },
  title: {
    fontSize: 24,
    lineHeight: 34,
    fontFamily: fonts.hand,
  },
  line: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detail: {
    fontSize: 14,
    fontFamily: fonts.regular,
    flexShrink: 1,
  },
  progress: {
    gap: 6,
    marginTop: 4,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  small: {
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  flexShrink: {
    flexShrink: 1,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  smallButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  smallButtonText: {
    fontSize: 15,
    fontFamily: fonts.semibold,
    flexShrink: 1,
  },
});
