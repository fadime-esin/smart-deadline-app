import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { UrgentBadge, URGENCY_NAMES, URGENCY_SYMBOLS, URGENCY_WORDS } from "@/components/UrgencyBadge";
import type { RankedTask } from "@/hooks/useTaskData";
import { useI18n } from "@/i18n";
import { fonts, radius, useColors } from "@/theme/colors";
import { categoryIcon } from "@/theme/icons";

interface Props {
  task: RankedTask;
  onOpen: () => void;
  /** Show the time only (e.g. in the calendar, where the day is already known). */
  timeOnly?: boolean;
}

/**
 * A compact, one-glance task row for long lists (Tasks tab, Calendar).
 * Urgency is shown as symbol + word, never by colour alone.
 */
export function TaskRow({ task, onOpen, timeOnly }: Props) {
  const colors = useColors();
  const { t, f, category } = useI18n();
  const state = task.priority.state;
  const percent =
    task.workTotal > 0 ? Math.round(Math.min(1, (task.workTotal - task.workLeft) / task.workTotal) * 100) : 0;
  const due = timeOnly ? f.time(task.deadline) : f.dateTime(task.deadline);
  const stateWord = state === "normal" ? "" : `${t(URGENCY_WORDS[state])} · `;
  const work = task.workLeft > 0 ? t("row.left", { hours: f.hours(task.workLeft) }) : t("row.workDone");

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={t("row.a11y", {
        title: task.title,
        urgent: task.urgent ? `${t("urgent.badge")}, ` : "",
        level: t(URGENCY_NAMES[state]),
        category: category(task.categoryName),
        deadline: f.dateTime(task.deadline),
        percent,
      })}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.surface,
          borderColor: task.urgent ? colors.urgent : state === "normal" ? colors.border : colors[state],
          borderWidth: task.urgent ? 3 : state === "normal" ? 1 : 2,
          opacity: pressed ? 0.7 : 1,
        },
        !task.urgent && state === "atRisk" && { borderStyle: "dashed" },
      ]}
    >
      <View style={[styles.symbol, { backgroundColor: colors.surfaceRaised, borderColor: colors[state] }]}>
        <Text style={[styles.symbolText, { color: colors[state] }]}>{URGENCY_SYMBOLS[state]}</Text>
      </View>
      <View style={styles.flex}>
        <View style={styles.titleRow}>
          {task.urgent && <UrgentBadge compact />}
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {task.title}
          </Text>
        </View>
        <View style={styles.meta}>
          <Ionicons name={categoryIcon(task.categoryName)} size={13} color={colors.textMuted} />
          <Text style={[styles.metaText, { color: colors.textMuted }]} numberOfLines={1}>
            {stateWord}
            {due} · {work}
          </Text>
        </View>
      </View>
      <Text style={[styles.percent, { color: colors.textMuted }]}>{percent}%</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: radius.md,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  symbol: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  symbolText: {
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  flex: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  title: {
    flexShrink: 1,
    fontSize: 15,
    fontFamily: fonts.semibold,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    fontSize: 12.5,
    fontFamily: fonts.regular,
    flexShrink: 1,
  },
  percent: {
    fontSize: 13,
    fontFamily: fonts.semibold,
  },
});
