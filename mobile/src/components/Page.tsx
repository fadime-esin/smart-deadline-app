import type { ReactNode } from "react";
import { StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from "react-native";

import { RULE_SPACING, useColors, useScheme } from "@/theme/colors";

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * The background of every screen. In light mode it is a notebook page with
 * ruled lines and a red margin line; in dark mode it is a plain chalkboard.
 * The lines are decoration only and are hidden from screen readers.
 */
export function Page({ children, style }: Props) {
  const colors = useColors();
  const scheme = useScheme();
  const { height } = useWindowDimensions();
  const lineCount = scheme === "light" ? Math.ceil(height / RULE_SPACING) : 0;

  return (
    <View style={[styles.page, { backgroundColor: colors.background }, style]}>
      {lineCount > 0 && (
        <View
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {Array.from({ length: lineCount }, (_, index) => (
            <View
              key={index}
              style={[styles.rule, { top: (index + 1) * RULE_SPACING, backgroundColor: colors.ruledLine }]}
            />
          ))}
          <View style={[styles.margin, { backgroundColor: colors.marginLine }]} />
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  rule: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
  },
  margin: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 8,
    width: 1.5,
  },
});
