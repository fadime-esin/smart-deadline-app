import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";

import { useI18n, type TranslationKey } from "@/i18n";
import type { UrgencyState } from "@/logic/priority";
import { fonts, radius, useColors } from "@/theme/colors";
import { URGENT_ICON } from "@/theme/icons";

/** Symbol for each urgency level; it is always shown together with the word. */
export const URGENCY_SYMBOLS: Record<UrgencyState, string> = {
  overdue: "⚠",
  critical: "‼",
  atRisk: "▲",
  normal: "●",
};

/** Translation key of the word for each urgency level, in capitals as on the badge. */
export const URGENCY_WORDS: Record<UrgencyState, TranslationKey> = {
  overdue: "urgency.overdue",
  critical: "urgency.critical",
  atRisk: "urgency.atRisk",
  normal: "urgency.normal",
};

/** The same words in lower case, for sentences read by the screen reader. */
export const URGENCY_NAMES: Record<UrgencyState, TranslationKey> = {
  overdue: "urgencyName.overdue",
  critical: "urgencyName.critical",
  atRisk: "urgencyName.atRisk",
  normal: "urgencyName.normal",
};

/**
 * Urgency badge, drawn like a rubber stamp. Besides colour and the
 * symbol + word, the outline differs too: overdue is filled, critical has a
 * thick border, at risk a dashed border.
 */
export function UrgencyBadge({ state }: { state: UrgencyState }) {
  const colors = useColors();
  const { t } = useI18n();
  const color = colors[state];
  const filled = state === "overdue";

  return (
    <View
      style={[
        styles.badge,
        { borderColor: color, borderWidth: state === "normal" ? 1 : 2 },
        state === "atRisk" && { borderStyle: "dashed" },
        filled ? { backgroundColor: color } : { backgroundColor: colors.surfaceRaised },
      ]}
      accessible
      accessibilityLabel={t("urgency.a11y", { level: t(URGENCY_NAMES[state]) })}
    >
      <Text style={[styles.text, { color: filled ? colors.surface : color }]}>
        {URGENCY_SYMBOLS[state]} {t(URGENCY_WORDS[state])}
      </Text>
    </View>
  );
}

/** Badge for tasks the user marked as urgent: lightning icon + the word, on a filled background. */
export function UrgentBadge({ compact }: { compact?: boolean }) {
  const colors = useColors();
  const { t } = useI18n();
  const word = t("urgent.badge");

  return (
    <View
      style={[styles.badge, styles.urgent, compact && styles.compact, { backgroundColor: colors.urgent, borderColor: colors.urgent }]}
      accessible
      accessibilityLabel={word}
    >
      <Ionicons name={URGENT_ICON} size={compact ? 11 : 13} color={colors.urgentText} />
      <Text style={[styles.text, compact && styles.compactText, { color: colors.urgentText }]}>{word}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.sm,
    transform: [{ rotate: "-2deg" }],
  },
  urgent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 2,
    transform: [{ rotate: "2deg" }],
  },
  compact: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    transform: [],
  },
  text: {
    fontSize: 12,
    fontFamily: fonts.bold,
    letterSpacing: 0.6,
  },
  compactText: {
    fontSize: 10.5,
  },
});
