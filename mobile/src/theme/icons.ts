/**
 * Icons (Ionicons from @expo/vector-icons). Icons are decoration only:
 * every icon is accompanied by text, so meaning never depends on the icon.
 */

import type Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";

export type IconName = ComponentProps<typeof Ionicons>["name"];

const CATEGORY_ICONS: Record<string, IconName> = {
  Exam: "school-outline",
  Assignment: "pencil-outline",
  Project: "flask-outline",
  Personal: "happy-outline",
};

/** Icon for a category (by its stored, English name). */
export function categoryIcon(categoryName: string): IconName {
  return CATEGORY_ICONS[categoryName] ?? "pricetag-outline";
}

/** Icon that marks urgent tasks (always next to the word "Urgent"). */
export const URGENT_ICON: IconName = "flash";
