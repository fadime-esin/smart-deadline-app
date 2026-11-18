import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AddTaskButton } from "@/components/AddTaskButton";
import { Card } from "@/components/Card";
import { Greeting } from "@/components/Greeting";
import { Heading } from "@/components/Heading";
import { LogTimeModal } from "@/components/LogTimeModal";
import { Page } from "@/components/Page";
import { TaskCard } from "@/components/TaskCard";
import { TodayPlan } from "@/components/TodayPlan";
import type { Task } from "@/db/tasks";
import { useTaskData } from "@/hooks/useTaskData";
import { useI18n } from "@/i18n";
import { hapticLight, hapticSuccess } from "@/services/haptics";
import { completeTask, logWork } from "@/services/taskService";
import { fonts, radius, useColors } from "@/theme/colors";

/** When nothing needs attention, the Today tab still shows this many top tasks. */
const TOP_TASKS = 3;

/**
 * Today tab: only what matters now - the greeting, today's plan (urgent tasks
 * first, then Earliest Deadline First), and the tasks that need attention
 * (Urgent, Overdue, Critical, At Risk). The full list lives in the Tasks tab.
 */
export default function TodayScreen() {
  const db = useSQLiteContext();
  const colors = useColors();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const data = useTaskData();
  const [logging, setLogging] = useState<Task | null>(null);

  const { ranked, plan } = data;
  const attention = ranked.filter((task) => task.urgent || task.priority.state !== "normal");
  const shown = attention.length > 0 ? attention : ranked.slice(0, TOP_TASKS);
  const plannedToday = plan.days[0].allocations.reduce((sum, a) => sum + a.hours, 0);
  const overdueCount = ranked.filter((task) => task.priority.state === "overdue").length;

  const openTask = (id: number) => router.push({ pathname: "/task/[id]", params: { id: String(id) } });

  async function handleComplete(task: Task) {
    hapticSuccess();
    await completeTask(db, task);
    await data.reload();
  }

  return (
    <Page>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}>
        <Greeting
          now={data.now}
          name={data.settings.userName}
          activeCount={ranked.length}
          overdueCount={overdueCount}
          urgentCount={data.urgentIds.size}
          plannedToday={plannedToday}
        />

        {data.loaded && ranked.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="school-outline" size={36} color={colors.accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t("today.empty.title")}</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>{t("today.empty.text")}</Text>
          </View>
        ) : (
          <>
            <TodayPlan
              today={plan.days[0]}
              workedToday={data.time.workedToday}
              advice={data.advice}
              titles={data.titles}
              urgentIds={data.urgentIds}
              hasTasks={ranked.length > 0}
              onOpenTask={openTask}
              onOpenSettings={() => router.push("/settings")}
            />

            <View style={styles.sectionHeader}>
              <Heading
                title={attention.length > 0 ? t("today.attention") : t("today.top")}
                right={
                  <Pressable onPress={() => router.push("/tasks")} accessibilityRole="button" hitSlop={8}>
                    <Text style={[styles.link, { color: colors.accent }]}>
                      {t("today.all", { count: ranked.length })} ›
                    </Text>
                  </Pressable>
                }
              />
            </View>

            {attention.length === 0 && ranked.length > 0 && (
              <Card style={styles.allGood}>
                <Ionicons name="ribbon-outline" size={22} color={colors.accent} />
                <Text style={[styles.allGoodText, { color: colors.text }]}>✓ {t("today.onTrack")}</Text>
              </Card>
            )}

            {shown.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                priority={task.priority}
                workLeft={task.workLeft}
                workTotal={task.workTotal}
                onOpen={() => openTask(task.id)}
                onComplete={() => handleComplete(task)}
                onLog={() => setLogging(task)}
              />
            ))}
          </>
        )}
      </ScrollView>

      <AddTaskButton />

      <LogTimeModal
        taskTitle={logging?.title ?? null}
        onCancel={() => setLogging(null)}
        onSave={async (hours) => {
          if (!logging) return;
          hapticLight();
          await logWork(db, logging.id, hours);
          setLogging(null);
          await data.reload();
        }}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingBottom: 96,
    gap: 14,
  },
  sectionHeader: {
    marginTop: 4,
  },
  link: {
    fontSize: 14,
    fontFamily: fonts.semibold,
  },
  allGood: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  allGoodText: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.medium,
  },
  empty: {
    marginTop: 48,
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    transform: [{ rotate: "-4deg" }],
  },
  emptyTitle: {
    fontSize: 28,
    fontFamily: fonts.hand,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: fonts.regular,
    textAlign: "center",
    lineHeight: 21,
  },
});
