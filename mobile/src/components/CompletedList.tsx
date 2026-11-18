import Ionicons from "@expo/vector-icons/Ionicons";
import { useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOut, LinearTransition } from "react-native-reanimated";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { listCompletedTasks, type Task } from "@/db/tasks";
import { useI18n } from "@/i18n";
import { hapticLight } from "@/services/haptics";
import { deleteTask, restoreTask } from "@/services/taskService";
import { fonts, radius, useColors } from "@/theme/colors";
import { categoryIcon } from "@/theme/icons";

/** History of completed tasks, newest first. Tasks can be restored or deleted. */
export function CompletedList() {
  const db = useSQLiteContext();
  const colors = useColors();
  const { t, f, category } = useI18n();
  const [tasks, setTasks] = useState<Task[]>([]);

  const load = useCallback(async () => {
    setTasks(await listCompletedTasks(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function confirmDelete(task: Task) {
    Alert.alert(t("delete.title"), t("delete.body", { title: task.title }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          await deleteTask(db, task);
          await load();
        },
      },
    ]);
  }

  return (
    <FlatList
      data={tasks}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name="trophy-outline" size={32} color={colors.accent} />
          </View>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {t("completed.empty")}
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <Animated.View entering={FadeInDown.duration(240)} exiting={FadeOut.duration(180)} layout={LinearTransition}>
          <Card>
            <View style={styles.doneRow}>
              <Ionicons name="checkmark-circle" size={18} color={colors.accent} />
              <Text style={[styles.done, { color: colors.textMuted }]}>
                {item.completedAt
                  ? t("completed.at", { date: f.dateTime(item.completedAt) })
                  : t("completed.label")}
              </Text>
            </View>
            <Text style={[styles.title, styles.struck, { color: colors.text }]}>{item.title}</Text>
            <View style={styles.doneRow}>
              <Ionicons name={categoryIcon(item.categoryName)} size={15} color={colors.textMuted} />
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                {category(item.categoryName)} · {t("completed.deadline", { date: f.dateTime(item.deadline) })}
              </Text>
            </View>
            <View style={styles.actions}>
              <View style={styles.flex}>
                <Button
                  label={t("completed.restore")}
                  icon="arrow-undo-outline"
                  accessibilityLabel={t("completed.restore.a11y", { title: item.title })}
                  onPress={async () => {
                    hapticLight();
                    await restoreTask(db, item);
                    await load();
                  }}
                />
              </View>
              <View style={styles.flex}>
                <Button
                  label={`✗ ${t("common.delete")}`}
                  icon="trash-outline"
                  variant="danger"
                  accessibilityLabel={t("completed.delete.a11y", { title: item.title })}
                  onPress={() => confirmDelete(item)}
                />
              </View>
            </View>
          </Card>
        </Animated.View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 32,
    gap: 14,
  },
  empty: {
    marginTop: 64,
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: radius.md,
    transform: [{ rotate: "-4deg" }],
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 15,
    fontFamily: fonts.regular,
  },
  doneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  done: {
    fontSize: 13,
    fontFamily: fonts.semibold,
  },
  title: {
    fontSize: 23,
    lineHeight: 33,
    fontFamily: fonts.hand,
  },
  struck: {
    textDecorationLine: "line-through",
  },
  meta: {
    fontSize: 14,
    fontFamily: fonts.regular,
    flexShrink: 1,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  flex: {
    flex: 1,
  },
});
