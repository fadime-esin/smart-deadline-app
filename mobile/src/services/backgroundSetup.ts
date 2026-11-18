/**
 * Device side of the background setup guide (report, Section 5.5.2):
 * recognises the phone's manufacturer and opens its "autostart" setting.
 */

import * as Device from "expo-device";
import { Linking, Platform } from "react-native";

import { AUTOSTART_SCREENS, detectVendor, type Vendor } from "@/logic/backgroundSetup";

type IntentLauncherModule = typeof import("expo-intent-launcher");

/** The vendor whose background restrictions apply to this phone, or null if none apply. */
export function currentVendor(): Vendor | null {
  if (Platform.OS !== "android") return null;
  return detectVendor(Device.manufacturer, Device.brand);
}

/** Loads expo-intent-launcher, or resolves to null where it is unavailable. */
async function loadIntentLauncher(): Promise<IntentLauncherModule | null> {
  try {
    const module = await import("expo-intent-launcher");
    return typeof module.startActivityAsync === "function" ? module : null;
  } catch (error) {
    console.warn("Intent launcher is unavailable:", error);
    return null;
  }
}

/**
 * Opens the manufacturer's autostart screen. If the phone does not have any
 * of the known screens (or they cannot be opened), the app's own page in the
 * phone's settings is opened instead, where the same setting can be found.
 */
export async function openBackgroundSettings(vendor: Vendor): Promise<void> {
  const launcher = await loadIntentLauncher();
  if (launcher) {
    for (const screen of AUTOSTART_SCREENS[vendor]) {
      try {
        await launcher.startActivityAsync("android.intent.action.MAIN", {
          packageName: screen.packageName,
          className: screen.className,
        });
        return;
      } catch {
        // This screen does not exist on this system version; try the next one.
      }
    }
  }
  await Linking.openSettings();
}
