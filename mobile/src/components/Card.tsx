import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { radius, useColors, useScheme } from "@/theme/colors";

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Border colour; defaults to the subtle border. */
  borderColor?: string;
  borderWidth?: number;
  /** Shows a strip of tape at the top, as if the card were stuck onto the page. */
  tape?: boolean;
}

/**
 * The surface used for all content blocks: an index card on the notebook page
 * (light mode) or a chalk-outlined panel on the board (dark mode).
 */
export function Card({ children, style, borderColor, borderWidth, tape }: Props) {
  const colors = useColors();
  const scheme = useScheme();
  return (
    <View
      style={[
        styles.card,
        scheme === "light" && styles.paperShadow,
        {
          backgroundColor: colors.surface,
          borderColor: borderColor ?? colors.border,
          borderWidth: borderWidth ?? (scheme === "dark" ? 1.5 : 1),
        },
        tape && styles.withTape,
        style,
      ]}
    >
      {tape && (
        <View
          style={[styles.tape, { backgroundColor: colors.tape }]}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    padding: 16,
    gap: 8,
  },
  paperShadow: {
    boxShadow: "2px 3px 0px rgba(70, 55, 20, 0.10)",
  },
  withTape: {
    marginTop: 8,
    paddingTop: 20,
  },
  tape: {
    position: "absolute",
    top: -9,
    alignSelf: "center",
    width: 76,
    height: 20,
    borderRadius: 2,
    transform: [{ rotate: "-2deg" }],
  },
});
