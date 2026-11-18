/**
 * Background restrictions of phone manufacturers (report, Section 5.5.2).
 *
 * Some manufacturers' Android versions stop an app completely when it is
 * swiped away from the recent apps list, and Android then deletes the app's
 * scheduled reminders. Only the user can prevent this, with a setting such as
 * Xiaomi's "Autostart". The app therefore recognises these phones and guides
 * the user to that setting once.
 *
 * This file is pure (no device access), so it can be unit-tested.
 */

export type Vendor = "xiaomi" | "huawei" | "oppo" | "vivo" | "samsung";

/** Names that appear as manufacturer or brand on each vendor's phones (lower case). */
const VENDOR_NAMES: Record<Vendor, readonly string[]> = {
  xiaomi: ["xiaomi", "redmi", "poco"],
  huawei: ["huawei", "honor"],
  oppo: ["oppo", "realme", "oneplus"],
  vivo: ["vivo", "iqoo"],
  samsung: ["samsung"],
};

/** Display name of each vendor, used in the guide's text. */
export const VENDOR_LABELS: Record<Vendor, string> = {
  xiaomi: "Xiaomi",
  huawei: "Huawei",
  oppo: "Oppo / Realme / OnePlus",
  vivo: "Vivo",
  samsung: "Samsung",
};

/**
 * The vendor whose background restrictions apply to this phone, or null for
 * phones that keep reminders when an app is closed (e.g. Google Pixel).
 */
export function detectVendor(manufacturer?: string | null, brand?: string | null): Vendor | null {
  const names = [manufacturer, brand].map((name) => (name ?? "").trim().toLowerCase()).filter(Boolean);
  for (const vendor of Object.keys(VENDOR_NAMES) as Vendor[]) {
    if (names.some((name) => VENDOR_NAMES[vendor].includes(name))) return vendor;
  }
  return null;
}

/** An Android settings screen, identified by its app package and screen class. */
export interface SettingsScreen {
  packageName: string;
  className: string;
}

/**
 * The manufacturer's own "autostart" screens, tried in order (the class names
 * differ between system versions). If none of them opens, the app's own page
 * in the phone's settings is opened instead. Samsung has no such screen: its
 * setting (Battery -> Unrestricted) is on the app's own settings page.
 */
export const AUTOSTART_SCREENS: Record<Vendor, readonly SettingsScreen[]> = {
  xiaomi: [
    { packageName: "com.miui.securitycenter", className: "com.miui.permcenter.autostart.AutoStartManagementActivity" },
  ],
  huawei: [
    {
      packageName: "com.huawei.systemmanager",
      className: "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity",
    },
    { packageName: "com.huawei.systemmanager", className: "com.huawei.systemmanager.optimize.process.ProtectActivity" },
  ],
  oppo: [
    { packageName: "com.coloros.safecenter", className: "com.coloros.safecenter.permission.startup.StartupAppListActivity" },
    { packageName: "com.coloros.safecenter", className: "com.coloros.safecenter.startupapp.StartupAppListActivity" },
    { packageName: "com.oppo.safe", className: "com.oppo.safe.permission.startup.StartupAppListActivity" },
  ],
  vivo: [
    { packageName: "com.vivo.permissionmanager", className: "com.vivo.permissionmanager.activity.BgStartUpManagerActivity" },
    { packageName: "com.iqoo.secure", className: "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity" },
  ],
  samsung: [],
};
