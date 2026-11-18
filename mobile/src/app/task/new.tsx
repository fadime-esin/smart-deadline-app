import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";

import { TaskForm } from "@/components/TaskForm";
import { listCategories, type Category } from "@/db/tasks";
import { useI18n } from "@/i18n";
import { hapticSuccess } from "@/services/haptics";
import { saveTask } from "@/services/taskService";

/**
 * Reads an optional "YYYY-MM-DD" date (e.g. the day selected in the calendar)
 * and returns that day at 23:59, or undefined if it is missing, invalid or
 * already over.
 */
function deadlineFromParam(value: string | undefined): Date | undefined {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 23, 59);
  return date.getTime() > Date.now() ? date : undefined;
}

/** Screen for adding a new task. */
export default function NewTaskScreen() {
  const db = useSQLiteContext();
  const { t } = useI18n();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    listCategories(db).then(setCategories);
  }, [db]);

  return (
    <TaskForm
      categories={categories}
      initialDeadline={deadlineFromParam(date)}
      submitLabel={t("form.save")}
      onSubmit={async (input) => {
        await saveTask(db, input);
        hapticSuccess();
        router.back();
      }}
    />
  );
}
