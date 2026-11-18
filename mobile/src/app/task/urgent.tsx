import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";

import { Card } from "@/components/Card";
import { Heading } from "@/components/Heading";
import { TaskForm } from "@/components/TaskForm";
import { listCategories, type Category } from "@/db/tasks";
import { useI18n } from "@/i18n";
import { hapticSuccess } from "@/services/haptics";
import { saveTask } from "@/services/taskService";
import { fonts, useColors } from "@/theme/colors";
import { URGENT_ICON } from "@/theme/icons";

/** A deadline less than this far away is moved to the end of the next day. */
const MIN_LEAD_MS = 60 * 1000;

/** Default deadline of an urgent task: today at 23:59 (or tomorrow, in the last minute of the day). */
function endOfToday(): Date {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59);
  if (end.getTime() - now.getTime() < MIN_LEAD_MS) end.setDate(end.getDate() + 1);
  return end;
}

/**
 * Short form for an urgent task (report, Section 5.2.4): something that came
 * up and must be done before everything already planned. Only the title and
 * the hours have to be typed; the deadline starts at the end of today.
 */
export default function UrgentTaskScreen() {
  const db = useSQLiteContext();
  const colors = useColors();
  const { t } = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);
  const [deadline] = useState(endOfToday);

  useEffect(() => {
    listCategories(db).then(setCategories);
  }, [db]);

  return (
    <TaskForm
      quickUrgent
      categories={categories}
      initialDeadline={deadline}
      submitLabel={t("urgent.save")}
      onSubmit={async (input) => {
        await saveTask(db, input);
        hapticSuccess();
        router.back();
      }}
      header={
        <Card borderColor={colors.urgent} borderWidth={3}>
          <Heading icon={URGENT_ICON} title={t("urgent.intro.title")} color={colors.urgent} />
          <Text style={[styles.text, { color: colors.text }]}>{t("urgent.intro.text")}</Text>
        </Card>
      }
    />
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.regular,
  },
});
