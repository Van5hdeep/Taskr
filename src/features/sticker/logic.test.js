import { describe, expect, it } from "vitest";
import { flagsForQuadrant, nextOccurrence, normalizeSubTasks, parseCapture, quadrantOf, deadlineState, formatCountdown } from "./logic";

// Saturday 10 Oct 2026, 14:00 local time.
const NOW = new Date(2026, 9, 10, 14, 0, 0);

describe("parseCapture", () => {
  it("parses title, urgency, tag and a dated time", () => {
    const result = parseCapture("Pay rent tomorrow 9am ! #home", NOW);
    expect(result.title).toBe("Pay rent");
    expect(result.isUrgent).toBe(true);
    expect(result.isImportant).toBe(false);
    expect(result.tags).toEqual(["home"]);
    expect(result.deadline).toEqual(new Date(2026, 9, 11, 9, 0, 0));
  });

  it("defaults to 09:00 when only a day is given", () => {
    const result = parseCapture("Submit report by friday *", NOW);
    expect(result.title).toBe("Submit report");
    expect(result.isImportant).toBe(true);
    expect(result.deadline.getDay()).toBe(5);
    expect(result.deadline.getHours()).toBe(9);
    expect(result.deadline > NOW).toBe(true);
  });

  it("keeps plain text untouched", () => {
    const result = parseCapture("Buy milk", NOW);
    expect(result).toMatchObject({ title: "Buy milk", isUrgent: false, isImportant: false, tags: [], deadline: null });
  });

  it("does not treat ! inside words as a marker", () => {
    expect(parseCapture("Wow! great idea", NOW).isUrgent).toBe(false);
  });

  it("collects several unique tags", () => {
    expect(parseCapture("Plan trip #travel #Travel #family", NOW).tags).toEqual(["travel", "family"]);
  });
});

describe("quadrants", () => {
  it("maps flags to quadrants and back", () => {
    for (const id of ["do", "schedule", "delegate", "later"]) {
      expect(quadrantOf(flagsForQuadrant(id))).toBe(id);
    }
    expect(quadrantOf({ is_urgent: true, is_important: true })).toBe("do");
  });
});

describe("nextOccurrence", () => {
  it("skips weekends for weekdays", () => {
    const friday = new Date(2026, 9, 9, 9);
    expect(nextOccurrence(friday, "weekdays")).toEqual(new Date(2026, 9, 12, 9));
  });
  it("handles monthly and none", () => {
    expect(nextOccurrence(new Date(2026, 0, 31), "monthly")).toEqual(new Date(2026, 1, 28));
    expect(nextOccurrence(NOW, null)).toBeNull();
  });
});

describe("normalizeSubTasks", () => {
  it("accepts every legacy shape", () => {
    const result = normalizeSubTasks(["a", { text: "b", completed: true }, { id: "x", label: "c", done: false }, { text: "  " }, null]);
    expect(result.map((item) => [item.label, item.done])).toEqual([["a", false], ["b", true], ["c", false]]);
    expect(result[2].id).toBe("x");
  });
});

describe("deadline helpers", () => {
  it("classifies deadlines", () => {
    expect(deadlineState(null, NOW.getTime())).toBe("none");
    expect(deadlineState(new Date(2026, 9, 9), NOW.getTime())).toBe("overdue");
    expect(deadlineState(new Date(2026, 9, 10, 20), NOW.getTime())).toBe("soon");
    expect(formatCountdown(3_661_000)).toBe("01:01:01");
  });
});
