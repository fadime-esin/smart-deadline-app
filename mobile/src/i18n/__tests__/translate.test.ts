import { en } from "../en";
import { tr } from "../tr";
import { isLanguageSetting, resolveLanguage, translate, type TranslationKey } from "../translate";

const keys = Object.keys(en) as TranslationKey[];
const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();

describe("dictionaries", () => {
  it("have a non-empty Turkish text for every English text", () => {
    expect(Object.keys(tr).sort()).toEqual([...keys].sort());
    for (const key of keys) {
      expect(tr[key].trim().length).toBeGreaterThan(0);
    }
  });

  it("use the same placeholders in both languages", () => {
    for (const key of keys) {
      expect([key, placeholders(tr[key])]).toEqual([key, placeholders(en[key])]);
    }
  });
});

describe("translate", () => {
  it("returns the text in the requested language", () => {
    expect(translate("en", "tab.today")).toBe("Today");
    expect(translate("tr", "tab.today")).toBe("Bugün");
  });

  it("fills in placeholders and leaves unknown ones untouched", () => {
    expect(translate("en", "tasks.active", { count: 3 })).toBe("Active (3)");
    expect(translate("tr", "row.left", { hours: "2 sa" })).toBe("2 sa kaldı");
    expect(translate("en", "tasks.active", {})).toBe("Active ({count})");
  });
});

describe("resolveLanguage", () => {
  it("uses a fixed choice whatever the phone's language is", () => {
    expect(resolveLanguage("en", "tr-TR")).toBe("en");
    expect(resolveLanguage("tr", "en-US")).toBe("tr");
  });

  it("follows the phone's language for the system setting", () => {
    expect(resolveLanguage("system", "tr-TR")).toBe("tr");
    expect(resolveLanguage("system", "tr_TR")).toBe("tr");
    expect(resolveLanguage("system", "TR")).toBe("tr");
    expect(resolveLanguage("system", "en-US")).toBe("en");
    expect(resolveLanguage("system", "de-DE")).toBe("en");
    expect(resolveLanguage("system", "")).toBe("en");
  });
});

describe("isLanguageSetting", () => {
  it("accepts only the three known values", () => {
    expect(["system", "en", "tr"].every(isLanguageSetting)).toBe(true);
    expect(isLanguageSetting("de")).toBe(false);
    expect(isLanguageSetting(undefined)).toBe(false);
  });
});
