import { describe, expect, it } from "vitest";
import { uniqueTitle } from "./uniqueTitle";

describe("uniqueTitle", () => {
  it("keeps a free name", () => expect(uniqueTitle("xyz", ["abc"])).toBe("xyz"));
  it("numbers repeats without a warning", () => {
    expect(uniqueTitle("xyz", ["xyz"])).toBe("xyz(1)");
    expect(uniqueTitle("xyz", ["xyz", "xyz(1)"])).toBe("xyz(2)");
    expect(uniqueTitle("xyz", ["xyz", "xyz(2)"])).toBe("xyz(1)");
  });
  it("ignores case and spaces, and renumbers a typed suffix", () => {
    expect(uniqueTitle(" XYZ ", ["xyz"])).toBe("XYZ(1)");
    expect(uniqueTitle("xyz(1)", ["xyz", "xyz(1)"])).toBe("xyz(2)");
    expect(uniqueTitle("xyz(1)", ["xyz"])).toBe("xyz(1)");
  });
});
