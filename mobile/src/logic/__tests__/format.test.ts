import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatHours,
  formatNumber,
  formatRemaining,
  formatShortDate,
  formatTime,
  formattersFor,
  parseHours,
} from "../format";

describe("date formatting", () => {
  const date = new Date(2026, 9, 23, 9, 5); // Fri 23 Oct 2026, 09:05 local time

  it("formats dates, times and both together", () => {
    expect(formatDate(date)).toBe("Fri 23 Oct 2026");
    expect(formatTime(date)).toBe("09:05");
    expect(formatDateTime(date)).toBe("Fri 23 Oct 2026, 09:05");
  });
});

describe("formatDuration and formatRemaining", () => {
  it("chooses sensible units", () => {
    expect(formatDuration(0.75)).toBe("45 min");
    expect(formatDuration(3)).toBe("3 h");
    expect(formatDuration(3.5)).toBe("3 h 30 min");
    expect(formatDuration(48)).toBe("2 d");
    expect(formatDuration(53)).toBe("2 d 5 h");
  });

  it("describes time left and overdue time", () => {
    expect(formatRemaining(5)).toBe("5 h left");
    expect(formatRemaining(-2)).toBe("Overdue by 2 h");
  });
});

describe("formatHours", () => {
  it("shows minutes below one hour and hours otherwise", () => {
    expect(formatHours(0.5)).toBe("30 min");
    expect(formatHours(1.5)).toBe("1.5 h");
    expect(formatHours(4)).toBe("4 h");
  });
});

describe("parseHours", () => {
  it("accepts dot and comma decimals", () => {
    expect(parseHours("1.5")).toBe(1.5);
    expect(parseHours("1,5")).toBe(1.5);
    expect(parseHours(" 3 ")).toBe(3);
    expect(parseHours(".5")).toBe(0.5);
  });

  it("rejects zero, negatives, text and huge values", () => {
    expect(parseHours("0")).toBeNull();
    expect(parseHours("-2")).toBeNull();
    expect(parseHours("abc")).toBeNull();
    expect(parseHours("")).toBeNull();
    expect(parseHours("5000")).toBeNull();
  });
});

describe("Turkish formatting", () => {
  const date = new Date(2026, 9, 23, 9, 5); // Fri 23 Oct 2026, 09:05 local time

  it("formats dates in Turkish", () => {
    expect(formatDate(date, "tr")).toBe("23 Eki 2026 Cum");
    expect(formatShortDate(date, "tr")).toBe("23 Eki Cum");
    expect(formatShortDate(date)).toBe("Fri 23 Oct");
    expect(formatDateTime(date, "tr")).toBe("23 Eki 2026 Cum, 09:05");
  });

  it("formats durations and hours in Turkish, with a decimal comma", () => {
    expect(formatDuration(0.75, "tr")).toBe("45 dk");
    expect(formatDuration(3.5, "tr")).toBe("3 sa 30 dk");
    expect(formatDuration(53, "tr")).toBe("2 g 5 sa");
    expect(formatRemaining(5, "tr")).toBe("5 sa kaldı");
    expect(formatRemaining(-2, "tr")).toBe("2 sa gecikti");
    expect(formatHours(1.5, "tr")).toBe("1,5 sa");
    expect(formatHours(0.5, "tr")).toBe("30 dk");
    expect(formatNumber(0.754, 2, "tr")).toBe("0,75");
    expect(formatNumber(0.754, 2)).toBe("0.75");
  });

  it("offers the same functions bound to a language", () => {
    expect(formattersFor("tr").hours(2.5)).toBe("2,5 sa");
    expect(formattersFor("en").hours(2.5)).toBe("2.5 h");
    expect(formattersFor("tr")).toBe(formattersFor("tr"));
  });
});
