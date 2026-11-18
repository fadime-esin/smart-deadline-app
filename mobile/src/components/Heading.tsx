import Ionicons from "@expo/vector-icons/Ionicons";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { fonts, radius, useColors } from "@/theme/colors";
import type { IconName } from "@/theme/icons";

interface Props {
  title: string;
  icon?: IconName;
  /** Optional content at the right end of the heading (e.g. a link). */
  right?: ReactNode;
  /** Text colour; defaults to the normal text colour. */
  color?: string;
}

/**
 * A handwritten heading with an optional icon on a highlighter mark,
 * used at the top of cards and sections.
 */
export function Heading({ title, icon, right, color }: Props) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      {icon && (
        <View style={[styles.mark, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name={icon} size={18} color={color ?? colors.accent} />
        </View>
      )}
      <Text style={[styles.title, { color: color ?? colors.text }]} accessibilityRole="header">
        {title}
      </Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  mark: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-4deg" }],
  },
  title: {
    flex: 1,
    fontSize: 22,
    lineHeight: 32,
    fontFamily: fonts.hand,
  },
});
