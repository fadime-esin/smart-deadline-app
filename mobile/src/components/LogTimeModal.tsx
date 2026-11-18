import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Button } from "@/components/Button";
import { useI18n } from "@/i18n";
import { parseHours } from "@/logic/format";
import { fonts, radius, useColors } from "@/theme/colors";

interface Props {
  /** The task being logged; the dialog is hidden when null. */
  taskTitle: string | null;
  onCancel: () => void;
  onSave: (hours: number) => Promise<void>;
}

const QUICK_CHOICES = [0.25, 0.5, 1, 2];

/** Small dialog for recording time spent on a task ("work session"). */
export function LogTimeModal({ taskTitle, onCancel, onSave }: Props) {
  const colors = useColors();
  const { t, f } = useI18n();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function close() {
    setText("");
    setError(null);
    onCancel();
  }

  async function save(hours: number | null) {
    if (hours === null) {
      setError(t("log.error.hours"));
      return;
    }
    setSaving(true);
    try {
      await onSave(hours);
      setText("");
      setError(null);
    } catch (e) {
      console.warn(e);
      setError(t("log.error.save"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={taskTitle !== null} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={[styles.dialog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.titleRow}>
            <View style={[styles.iconCircle, { backgroundColor: colors.accentSoft }]}>
              <Ionicons name="timer-outline" size={20} color={colors.accent} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{t("log.title")}</Text>
          </View>
          <Text style={[styles.body, { color: colors.textMuted }]} numberOfLines={2}>
            {t("log.question", { title: taskTitle ?? "" })}
          </Text>

          <View style={styles.quickRow}>
            {QUICK_CHOICES.map((hours) => (
              <Pressable
                key={hours}
                onPress={() => save(hours)}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel={t("log.quick.a11y", { hours: f.hours(hours) })}
                style={({ pressed }) => [
                  styles.chip,
                  { borderColor: colors.border, backgroundColor: colors.surfaceRaised, opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Text style={[styles.chipText, { color: colors.text }]}>{f.hours(hours)}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: colors.text }]}>{t("log.enter")}</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t("log.placeholder")}
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            accessibilityLabel={t("log.hours.a11y")}
            style={[
              styles.input,
              { color: colors.text, backgroundColor: colors.surfaceRaised, borderColor: colors.border },
            ]}
          />
          {error !== null && (
            <Text style={[styles.body, { color: colors.error, fontFamily: fonts.semibold }]} accessibilityLiveRegion="polite">
              ✗ {error}
            </Text>
          )}

          <View style={styles.actions}>
            <View style={styles.flex}>
              <Button label={t("common.cancel")} onPress={close} />
            </View>
            <View style={styles.flex}>
              <Button
                label={saving ? t("common.saving") : t("common.save")}
                icon="checkmark"
                variant="primary"
                disabled={saving}
                onPress={() => save(parseHours(text))}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(10, 18, 14, 0.65)",
  },
  dialog: {
    borderWidth: 1.5,
    borderRadius: radius.lg,
    padding: 20,
    gap: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    transform: [{ rotate: "-4deg" }],
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontFamily: fonts.hand,
  },
  body: {
    fontSize: 15,
    fontFamily: fonts.regular,
  },
  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  chipText: {
    fontSize: 15,
    fontFamily: fonts.semibold,
  },
  label: {
    fontSize: 15,
    fontFamily: fonts.semibold,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 16,
    fontFamily: fonts.regular,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  flex: {
    flex: 1,
  },
});
