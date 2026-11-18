import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Heading } from "@/components/Heading";
import { LogTimeModal } from "@/components/LogTimeModal";
import { Page } from "@/components/Page";
import { ProgressBar } from "@/components/ProgressBar";
import { TaskForm } from "@/components/TaskForm";
import { listSessions, type WorkSession } from "@/db/sessions";
import { getSettings } from "@/db/settings";
import { getTask, listCategories, type Category, type Task } from "@/db/tasks";
import { useI18n } from "@/i18n";
import { plannedWork, remainingWork } from "@/logic/priority";
import { completeTask, deleteTask, logWork, removeSession, saveTask } from "@/services/taskService";
import { hapticLight, hapticSuccess } from "@/services/haptics";
import { fonts, useColors, type Palette } from "@/theme/colors";

/** Screen for editing a task, logging time on it, completing or deleting it. */
export default function EditTaskScreen() {
  const db = useSQLiteContext();
  const colors = useColors();
  const { t, f } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [task, setTask] = useState<Task | null | undefined>(undefined);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [logging, setLogging] = useState(false);
  const [margin, setMargin] = useState(0);

  const load = useCallback(async () => {
    const taskId = Number(id);
    const [loadedTask, loadedSessions, settings] = await Promise.all([
      getTask(db, taskId),
      listSessions(db, taskId),
      getSettings(db),
    ]);
    setTask(loadedTask);
    setSessions(loadedSessions);
    setMargin(settings.safetyMargin);
  }, [db, id]);

  useEffect(() => {
    load();
    listCategories(db).then(setCategories);
  }, [db, load]);

  if (task === undefined) {
    return (
      <Page style={styles.center}>
        <ActivityIndicator accessibilityLabel={t("edit.loading")} />
      </Page>
    );
  }

  if (task === null) {
    return (
      <Page style={styles.center}>
        <Text style={{ color: colors.text, fontFamily: fonts.regular }}>{t("edit.missing")}</Text>
      </Page>
    );
  }

  const current = task;

  function confirmDelete() {
    Alert.alert(t("delete.title"), t("delete.body.withTime", { title: current.title }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          await deleteTask(db, current);
          router.back();
        },
      },
    ]);
  }

  function confirmRemoveSession(session: WorkSession) {
    Alert.alert(
      t("edit.removeSession.title"),
      t("edit.removeSession.body", { hours: f.hours(session.hours), date: f.dateTime(session.loggedAt) }),
      [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("edit.remove"),
        style: "destructive",
        onPress: async () => {
          await removeSession(db, session.id);
          await load();
        },
      },
      ],
    );
  }

  return (
    <>
      <TaskForm
        key={current.id}
        categories={categories}
        initial={{
          title: current.title,
          description: current.description,
          categoryId: current.categoryId,
          deadline: current.deadline,
          estimatedHours: current.estimatedHours,
          urgent: current.urgent,
        }}
        submitLabel={t("edit.save")}
        onSubmit={async (input) => {
          await saveTask(db, input, current);
          hapticSuccess();
          router.back();
        }}
        header={
          current.status === "active" ? (
            <Progress
              task={current}
              sessions={sessions}
              margin={margin}
              colors={colors}
              onLog={() => setLogging(true)}
              onRemove={confirmRemoveSession}
            />
          ) : undefined
        }
        footer={
          <>
            <Button
              label={t("edit.markDone")}
              icon="checkmark-circle-outline"
              onPress={async () => {
                hapticSuccess();
                await completeTask(db, current);
                router.back();
              }}
            />
            <Button label={`✗ ${t("edit.delete")}`} icon="trash-outline" variant="danger" onPress={confirmDelete} />
          </>
        }
      />
      <LogTimeModal
        taskTitle={logging ? current.title : null}
        onCancel={() => setLogging(false)}
        onSave={async (hours) => {
          hapticLight();
          await logWork(db, current.id, hours);
          setLogging(false);
          await load();
        }}
      />
    </>
  );
}

/** Progress box: logged time, remaining work and the list of work sessions. */
function Progress({
  task,
  sessions,
  margin,
  colors,
  onLog,
  onRemove,
}: {
  task: Task;
  sessions: WorkSession[];
  margin: number;
  colors: Palette;
  onLog: () => void;
  onRemove: (session: WorkSession) => void;
}) {
  const { t, f } = useI18n();
  const total = plannedWork(task.estimatedHours, margin);
  const left = remainingWork(task.estimatedHours, task.loggedHours, margin);
  const marginNote =
    margin > 0
      ? ` (${t("edit.marginNote", { hours: f.hours(task.estimatedHours), percent: Math.round(margin * 100) })})`
      : "";
  const done = total > 0 ? Math.min(1, task.loggedHours / total) : 0;
  const percent = Math.round(done * 100);

  return (
    <Card style={styles.progress}>
      <Heading icon="stats-chart-outline" title={t("edit.progress", { percent })} />
      <ProgressBar value={done} accessibilityLabel={t("edit.progress", { percent })} height={12} />
      <Text style={[styles.text, { color: colors.textMuted }]}>
        {t("edit.logged", { logged: f.hours(task.loggedHours), total: f.hours(total) })}
        {marginNote}.
      </Text>
      <Text style={[styles.text, { color: colors.text, fontFamily: fonts.semibold }]}>
        {left > 0 ? t("edit.workLeft", { hours: f.hours(left) }) : `✓ ${t("edit.workDone")}`}
      </Text>
      <Button label={t("log.title")} icon="timer-outline" onPress={onLog} />

      {sessions.length > 0 && (
        <View style={styles.sessions}>
          <Text style={[styles.text, { color: colors.textMuted, fontFamily: fonts.semibold }]}>{t("edit.sessions")}</Text>
          {sessions.map((session) => (
            <View key={session.id} style={[styles.sessionRow, { borderColor: colors.border }]}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.text, { color: colors.text, flex: 1 }]}>
                {f.dateTime(session.loggedAt)} · {f.hours(session.hours)}
              </Text>
              <Pressable
                onPress={() => onRemove(session)}
                accessibilityRole="button"
                accessibilityLabel={t("edit.remove.a11y", {
                  hours: f.hours(session.hours),
                  date: f.dateTime(session.loggedAt),
                })}
                hitSlop={10}
              >
                <Text style={[styles.text, { color: colors.error, fontFamily: fonts.semibold }]}>✗ {t("edit.remove")}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  progress: {
    marginBottom: 4,
  },
  text: {
    fontSize: 14,
    fontFamily: fonts.regular,
  },
  sessions: {
    gap: 6,
    marginTop: 4,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 8,
  },
});
