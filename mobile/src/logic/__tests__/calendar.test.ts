import { dayKey, deadlineGroup, groupByDeadline, monthGrid, startOfWeek } from "../calendar";
import { at } from "../__fixtures__/time";

describe("calendar helpers", () => {
  it("builds a Monday-first month grid", () => {
    // November 2026 starts on a Sunday and has 30 days.
    const weeks = monthGrid(2026, 10);
    expect(weeks[0].slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(weeks[0][6]?.getDate()).toBe(1);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks.flat().filter((d) => d !== null).length).toBe(30);
  });

  it("finds the Monday of a week and makes stable day keys", () => {
    expect(dayKey(startOfWeek(at(5, 15)))).toBe("2026-11-02"); // Thursday -> Monday
    expect(dayKey(startOfWeek(at(8, 10)))).toBe("2026-11-02"); // Sunday -> same Monday
  });

  it("puts deadlines into Overdue, This week, Next week and Later", () => {
    const now = at(4, 12); // Wednesday 4 Nov
    expect(deadlineGroup(at(4, 9), now)).toBe("overdue");
    expect(deadlineGroup(at(8, 23), now)).toBe("thisWeek"); // Sunday
    expect(deadlineGroup(at(9, 9), now)).toBe("nextWeek"); // next Monday
    expect(deadlineGroup(at(16, 9), now)).toBe("later");
  });

  it("groups and sorts tasks, leaving out empty groups", () => {
    const now = at(4, 12);
    const tasks = [
      { id: "b", deadline: at(7, 9) },
      { id: "late", deadline: at(20, 9) },
      { id: "a", deadline: at(5, 9) },
    ];
    const sections = groupByDeadline(tasks, now);
    expect(sections.map((s) => s.group)).toEqual(["thisWeek", "later"]);
    expect(sections[0].data.map((t) => t.id)).toEqual(["a", "b"]);
  });
});
