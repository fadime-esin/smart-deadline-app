import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { Text, type ColorValue } from "react-native";

import { useI18n } from "@/i18n";
import { hapticSelection } from "@/services/haptics";
import { fonts, useColors } from "@/theme/colors";
import type { IconName } from "@/theme/icons";

/**
 * Bottom tab bar with the four main sections, drawn as the ledge under the
 * board. The selected tab is shown by colour, by a filled (instead of
 * outlined) icon and by a bold label, so it never depends on colour alone.
 */
export default function TabsLayout() {
  const colors = useColors();
  const { t } = useI18n();

  const icon = (outline: IconName, filled: IconName) =>
    function TabIcon({ focused, color, size }: { focused: boolean; color: ColorValue; size: number }) {
      return (
        <Ionicons
          name={focused ? filled : outline}
          size={size}
          color={typeof color === "string" ? color : focused ? colors.accent : colors.textMuted}
        />
      );
    };

  const label = (text: string) =>
    function TabLabel({ focused, color }: { focused: boolean; color: ColorValue }) {
      return (
        <Text style={{ color, fontSize: 12, fontFamily: focused ? fonts.bold : fonts.medium }} numberOfLines={1}>
          {text}
        </Text>
      );
    };

  const tab = (title: string, outline: IconName, filled: IconName) => ({
    title,
    tabBarIcon: icon(outline, filled),
    tabBarLabel: label(title),
    tabBarAccessibilityLabel: title,
  });

  return (
    <Tabs
      screenListeners={{ tabPress: () => hapticSelection() }}
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.hand, fontSize: 28 },
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.ledge,
          borderTopWidth: 4,
          height: 68,
          paddingTop: 6,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ ...tab(t("tab.today"), "easel-outline", "easel"), headerShown: false }} />
      <Tabs.Screen name="tasks" options={tab(t("tab.tasks"), "clipboard-outline", "clipboard")} />
      <Tabs.Screen name="calendar" options={tab(t("tab.calendar"), "calendar-outline", "calendar")} />
      <Tabs.Screen name="settings" options={tab(t("tab.settings"), "settings-outline", "settings")} />
    </Tabs>
  );
}
