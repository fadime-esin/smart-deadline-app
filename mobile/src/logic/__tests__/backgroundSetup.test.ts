import { AUTOSTART_SCREENS, detectVendor } from "../backgroundSetup";

describe("detectVendor", () => {
  it("recognises Xiaomi phones by manufacturer or by brand", () => {
    expect(detectVendor("Xiaomi", "Redmi")).toBe("xiaomi");
    expect(detectVendor("Xiaomi", "POCO")).toBe("xiaomi");
    expect(detectVendor(null, "redmi")).toBe("xiaomi");
  });

  it("recognises the other restrictive vendors", () => {
    expect(detectVendor("HUAWEI", "HONOR")).toBe("huawei");
    expect(detectVendor("realme", "realme")).toBe("oppo");
    expect(detectVendor("OnePlus", "OnePlus")).toBe("oppo");
    expect(detectVendor("vivo", "iQOO")).toBe("vivo");
    expect(detectVendor("samsung", "samsung")).toBe("samsung");
  });

  it("returns null for phones that keep reminders, and for unknown values", () => {
    expect(detectVendor("Google", "google")).toBeNull();
    expect(detectVendor("motorola", "motorola")).toBeNull();
    expect(detectVendor(undefined, undefined)).toBeNull();
    expect(detectVendor("", " ")).toBeNull();
  });
});

describe("AUTOSTART_SCREENS", () => {
  it("lists the Xiaomi Autostart screen", () => {
    expect(AUTOSTART_SCREENS.xiaomi[0].packageName).toBe("com.miui.securitycenter");
  });

  it("uses the app's own settings page for Samsung", () => {
    expect(AUTOSTART_SCREENS.samsung.length).toBe(0);
  });
});
