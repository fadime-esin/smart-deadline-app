import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { Button } from "@/components/Button";
import { useI18n } from "@/i18n";
import { URGENT_ICON } from "@/theme/icons";

/**
 * The two buttons pinned to the bottom of a tab, above the tab bar:
 * "Urgent task" (a short form for a task that must be done before everything
 * else) and "Add task". `date` (YYYY-MM-DD) pre-fills the deadline of a
 * normal task, e.g. from the calendar.
 */
export function AddTaskButton({ date }: { date?: string }) {
  const { t } = useI18n();
  return (
    <View style={styles.bar} pointerEvents="box-none">
      <View style={styles.urgent}>
        <Button
          label={t("urgent.add")}
          icon={URGENT_ICON}
          variant="urgent"
          accessibilityLabel={t("urgent.add.a11y")}
          onPress={() => router.push("/task/urgent")}
        />
      </View>
      <View style={styles.add}>
        <Button
          label={t("task.add")}
          icon="add-circle-outline"
          variant="primary"
          onPress={() => router.push(date ? { pathname: "/task/new", params: { date } } : "/task/new")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 14,
    flexDirection: "row",
    gap: 10,
  },
  urgent: {
    flex: 2,
  },
  add: {
    flex: 3,
  },
});
