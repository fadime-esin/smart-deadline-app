import { StyleSheet, Text, View } from "react-native";

import { useI18n, type TranslationKey } from "@/i18n";
import { fonts, useColors } from "@/theme/colors";

interface Props {
  now: Date;
  /** Optional first name from Settings. */
  name: string;
  activeCount: number;
  overdueCount: number;
  urgentCount: number;
  /** Hours planned for the rest of today. */
  plannedToday: number;
}

function greetingKey(hour: number): TranslationKey {
  if (hour < 5) return "greeting.night";
  if (hour < 12) return "greeting.morning";
  if (hour < 18) return "greeting.afternoon";
  return "greeting.evening";
}

/**
 * Today header, written like the top of a notebook page: the date, the
 * greeting and a one-line summary of today.
 */
export function Greeting({ now, name, activeCount, overdueCount, urgentCount, plannedToday }: Props) {
  const colors = useColors();
  const { t, plural, f } = useI18n();
  const greeting = t(greetingKey(now.getHours())) + (name ? `, ${name}` : "");

  const parts = [plural(activeCount, "greeting.tasks.one", "greeting.tasks.other")];
  if (activeCount > 0) parts.push(t("greeting.planned", { duration: f.duration(plannedToday) }));

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.date, { color: colors.accent }]}>{f.shortDate(now)}</Text>
      <Text style={[styles.greeting, { color: colors.text }]} accessibilityRole="header">
        {greeting}
      </Text>
      <View style={[styles.underline, { backgroundColor: colors.accent }]} />
      <Text style={[styles.summary, { color: colors.textMuted }]}>{parts.join(" · ")}</Text>
      {urgentCount > 0 && (
        <Text style={[styles.summary, { color: colors.urgent, fontFamily: fonts.semibold }]}>
          ⚡ {t("greeting.urgent", { count: urgentCount })}
        </Text>
      )}
      {overdueCount > 0 && (
        <Text style={[styles.summary, { color: colors.overdue, fontFamily: fonts.semibold }]}>
          ⚠ {t("greeting.overdue", { count: overdueCount })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 2,
    marginBottom: 6,
  },
  date: {
    fontSize: 16,
    fontFamily: fonts.hand,
    alignSelf: "flex-end",
  },
  greeting: {
    fontSize: 32,
    lineHeight: 46,
    fontFamily: fonts.hand,
  },
  underline: {
    width: 120,
    height: 3,
    borderRadius: 2,
    marginBottom: 6,
    transform: [{ rotate: "-1deg" }],
  },
  summary: {
    fontSize: 14,
    fontFamily: fonts.regular,
  },
});
