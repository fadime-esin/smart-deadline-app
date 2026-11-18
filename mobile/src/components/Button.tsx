import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text } from "react-native";

import { fonts, radius, useColors } from "@/theme/colors";
import type { IconName } from "@/theme/icons";

interface Props {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "urgent";
  icon?: IconName;
  disabled?: boolean;
  accessibilityLabel?: string;
}

/** A large, clearly labelled button used across the app. */
export function Button({ label, onPress, variant = "secondary", icon, disabled, accessibilityLabel }: Props) {
  const colors = useColors();
  const look = {
    primary: { text: colors.primaryText, border: colors.primary, background: colors.primary },
    secondary: { text: colors.text, border: colors.border, background: colors.surfaceRaised },
    danger: { text: colors.error, border: colors.error, background: colors.surfaceRaised },
    urgent: { text: colors.urgentText, border: colors.urgent, background: colors.urgent },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.button,
        { borderColor: look.border, backgroundColor: look.background },
        (pressed || disabled) && { opacity: 0.6 },
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      {icon && <Ionicons name={icon} size={19} color={look.text} />}
      <Text style={[styles.label, { color: look.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  label: {
    fontSize: 16,
    fontFamily: fonts.semibold,
    flexShrink: 1,
  },
});
