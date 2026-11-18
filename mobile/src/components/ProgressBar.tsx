import { StyleSheet, View } from "react-native";

import { radius, useColors } from "@/theme/colors";

interface Props {
  /** Progress between 0 and 1. */
  value: number;
  /** Spoken by the screen reader, e.g. "40% done". The visible text is shown next to the bar. */
  accessibilityLabel: string;
  height?: number;
}

const TICKS = [0.25, 0.5, 0.75];

/**
 * A progress bar drawn like a ruler: a filled part and marks at each quarter.
 * The value is always also written as text nearby.
 */
export function ProgressBar({ value, accessibilityLabel, height = 10 }: Props) {
  const colors = useColors();
  const clamped = Math.max(0, Math.min(1, value));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.track, { height, backgroundColor: colors.track, borderColor: colors.border }]}
    >
      <View style={[styles.fill, { width: `${clamped * 100}%` as const, backgroundColor: colors.primary }]} />
      {TICKS.map((tick) => (
        <View
          key={tick}
          style={[styles.tick, { left: `${tick * 100}%` as const, backgroundColor: colors.border }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    borderRadius: radius.sm,
    borderWidth: 1,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
  },
  tick: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
  },
});
