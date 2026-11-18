import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Heading } from "@/components/Heading";
import { Page } from "@/components/Page";
import { setBackgroundSetupDone } from "@/db/settings";
import { useI18n, type TranslationKey } from "@/i18n";
import { VENDOR_LABELS, type Vendor } from "@/logic/backgroundSetup";
import { currentVendor, openBackgroundSettings } from "@/services/backgroundSetup";
import { hapticSelection, hapticSuccess } from "@/services/haptics";
import { fonts, radius, useColors } from "@/theme/colors";

/** The vendor-specific instruction for step 2. */
const STEP_TWO: Record<Vendor, TranslationKey> = {
  xiaomi: "setup.step2.xiaomi",
  huawei: "setup.step2.huawei",
  oppo: "setup.step2.oppo",
  vivo: "setup.step2.vivo",
  samsung: "setup.step2.samsung",
};

/**
 * Background setup guide (report, Section 5.5.2). Shown once on phones whose
 * manufacturer deletes the reminders of closed apps (e.g. Xiaomi), and always
 * available from Settings. One button opens the right setting directly; the
 * app cannot check the setting itself, so the user confirms with "Done".
 */
export default function ReminderSetupScreen() {
  const db = useSQLiteContext();
  const colors = useColors();
  const { t } = useI18n();
  const vendor = currentVendor();

  async function open() {
    hapticSelection();
    if (vendor) await openBackgroundSettings(vendor);
    else await Linking.openSettings();
  }

  async function done() {
    hapticSuccess();
    await setBackgroundSetupDone(db, true);
    router.back();
  }

  const steps = [t("setup.step1"), t(vendor ? STEP_TWO[vendor] : "setup.step2.samsung"), t("setup.step3")];

  return (
    <Page>
      <ScrollView contentContainerStyle={styles.container}>
        <Card tape>
          <Heading icon="notifications-outline" title={t("setup.title")} />
          <Text style={[styles.text, { color: colors.text }]}>
            {t("setup.why", { brand: vendor ? VENDOR_LABELS[vendor] : t("setup.someBrands") })}
          </Text>
        </Card>

        <Card>
          {steps.map((step, index) => (
            <View key={index} style={styles.step}>
              <View style={[styles.number, { borderColor: colors.primary }]}>
                <Text style={[styles.numberText, { color: colors.accent }]}>{index + 1}</Text>
              </View>
              <Text style={[styles.text, styles.flex, { color: colors.text }]}>{step}</Text>
            </View>
          ))}
        </Card>

        <View style={styles.actions}>
          <Button label={t("setup.open")} icon="open-outline" variant="primary" onPress={open} />
          <Button label={t("setup.done")} icon="checkmark" onPress={done} />
          <Button label={t("setup.later")} icon="time-outline" onPress={() => router.back()} />
        </View>

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
          <Text style={[styles.small, styles.flex, { color: colors.textMuted }]}>{t("setup.note")}</Text>
        </View>
      </ScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: fonts.regular,
  },
  small: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: fonts.regular,
  },
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 4,
  },
  number: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  numberText: {
    fontSize: 18,
    lineHeight: 25,
    fontFamily: fonts.hand,
  },
  flex: {
    flex: 1,
  },
  actions: {
    gap: 10,
  },
  note: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
});
