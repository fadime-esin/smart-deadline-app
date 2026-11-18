import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, SectionList, StyleSheet, Text, View } from "react-native";

import { AddTaskButton } from "@/components/AddTaskButton";
import { CompletedList } from "@/components/CompletedList";
import { Page } from "@/components/Page";
import { SegmentedControl } from "@/components/SegmentedControl";
import { TaskRow } from "@/components/TaskRow";
import { listCategories, type Category } from "@/db/tasks";
import { useTaskData } from "@/hooks/useTaskData";
import { useI18n, type TranslationKey } from "@/i18n";
import { groupByDeadline, type DeadlineGroup } from "@/logic/calendar";
import { hapticSelection } from "@/services/haptics";
import { fonts, radius, useColors } from "@/theme/colors";
import { categoryIcon } from "@/theme/icons";

type TasksView = "active" | "completed";

/** Section titles, already in capitals. */
const GROUP_TITLES: Record<DeadlineGroup, TranslationKey> = {
  overdue: "group.overdue",
  thisWeek: "group.thisWeek",
  nextWeek: "group.nextWeek",
  later: "group.later",
};

/**
 * Tasks tab: every task, organised. Active tasks are grouped by deadline
 * (Overdue, This week, Next week, Later) and can be filtered by category;
 * completed tasks (the history) are one tap away.
 */
export default function TasksScreen() {
  const db = useSQLiteContext();
  const colors = useColors();
  const { t, category: categoryLabel } = useI18n();
  const data = useTaskData();
  const [view, setView] = useState<TasksView>("active");
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState<number | null>(null);

  useEffect(() => {
    listCategories(db).then(setCategories);
  }, [db]);

  const visible = filter === null ? data.ranked : data.ranked.filter((task) => task.categoryId === filter);
  const sections = groupByDeadline(visible, data.now);
  const openTask = (id: number) => router.push({ pathname: "/task/[id]", params: { id: String(id) } });

  return (
    <Page>
      <View style={styles.top}>
        <SegmentedControl
          options={[
            { value: "active", label: t("tasks.active", { count: data.ranked.length }) },
            { value: "completed", label: t("tasks.completed") },
          ]}
          value={view}
          onChange={setView}
        />
      </View>

      {view === "completed" ? (
        <CompletedList />
      ) : (
        <>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filters}
            style={styles.filterBar}
            accessibilityRole="radiogroup"
          >
            <FilterChip
              label={t("tasks.all")}
              a11y={t("tasks.filter.all.a11y")}
              selected={filter === null}
              onPress={() => setFilter(null)}
            />
            {categories.map((category) => (
              <FilterChip
                key={category.id}
                label={categoryLabel(category.name)}
                a11y={t("tasks.filter.a11y", { category: categoryLabel(category.name) })}
                icon={categoryIcon(category.name)}
                selected={filter === category.id}
                onPress={() => setFilter(category.id)}
              />
            ))}
          </ScrollView>

          <SectionList
            sections={sections}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section }) => (
              <Text
                style={[
                  styles.sectionTitle,
                  { color: section.group === "overdue" ? colors.overdue : colors.accent },
                ]}
                accessibilityRole="header"
              >
                {section.group === "overdue" ? "⚠ " : ""}
                {t(GROUP_TITLES[section.group])} · {section.data.length}
              </Text>
            )}
            renderItem={({ item }) => <TaskRow task={item} onOpen={() => openTask(item.id)} />}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              data.loaded ? (
                <View style={styles.empty}>
                  <Ionicons name="clipboard-outline" size={36} color={colors.textMuted} />
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    {filter === null ? t("tasks.empty") : t("tasks.empty.category")}
                  </Text>
                </View>
              ) : undefined
            }
          />
          <AddTaskButton />
        </>
      )}
    </Page>
  );
}

function FilterChip({
  label,
  a11y,
  icon,
  selected,
  onPress,
}: {
  label: string;
  a11y: string;
  icon?: ReturnType<typeof categoryIcon>;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const fg = selected ? colors.primaryText : colors.text;
  return (
    <Pressable
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={a11y}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      {icon && <Ionicons name={selected ? "checkmark-circle" : icon} size={15} color={fg} />}
      <Text style={[styles.chipText, { color: fg, fontFamily: selected ? fonts.bold : fonts.medium }]}>
        {!icon && selected ? "✓ " : ""}
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  top: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterBar: {
    flexGrow: 0,
  },
  filters: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  chipText: {
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 96,
  },
  sectionTitle: {
    fontSize: 19,
    fontFamily: fonts.hand,
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 6,
  },
  separator: {
    height: 8,
  },
  empty: {
    marginTop: 56,
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: fonts.regular,
    textAlign: "center",
  },
});
