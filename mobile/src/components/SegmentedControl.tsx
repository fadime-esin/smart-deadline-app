import { Pressable, StyleSheet, Text, View } from "react-native";

import { hapticSelection } from "@/services/haptics";
import { fonts, radius, useColors } from "@/theme/colors";

interface Props<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

/** Two or more mutually exclusive tabs, e.g. Active | Completed. The selected one is also marked with ✓. */
export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const colors = useColors();
  return (
    <View
      style={[styles.wrapper, { backgroundColor: colors.surfaceRaised, borderColor: colors.border }]}
      accessibilityRole="tablist"
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              hapticSelection();
              onChange(option.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[styles.segment, selected && { backgroundColor: colors.primary }]}
          >
            <Text
              style={[styles.label, { color: selected ? colors.primaryText : colors.text }, selected && styles.selected]}
              numberOfLines={1}
            >
              {selected ? "✓ " : ""}
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    borderWidth: 1.5,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: radius.sm,
  },
  label: {
    fontSize: 15,
    fontFamily: fonts.medium,
  },
  selected: {
    fontFamily: fonts.bold,
  },
});
