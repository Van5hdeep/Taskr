import { describe, expect, it } from "vitest";
import { detectMode, parseMoneyCapture } from "./parse";

const NOW = new Date(2026, 9, 11, 15, 0);

describe("detectMode", () => {
  it("reads prefixes", () => {
    expect(detectMode("e 450 lunch")).toEqual({ mode: "expense", rest: "450 lunch" });
    expect(detectMode("I 50000 salary")).toEqual({ mode: "income", rest: "50000 salary" });
    expect(detectMode("t call mom")).toEqual({ mode: "task", rest: "call mom" });
    expect(detectMode("tea 40")).toBeNull();
  });
});

describe("parseMoneyCapture", () => {
  it("parses rupee amounts, words and dates", () => {
    expect(parseMoneyCapture("₹450 lunch with Riya yesterday", NOW)).toEqual({ amount: 450, title: "lunch with Riya", date: "2026-10-10" });
    expect(parseMoneyCapture("Rs. 1,250.50 electricity bill", NOW)).toEqual({ amount: 1250.5, title: "electricity bill", date: "2026-10-11" });
    expect(parseMoneyCapture("rent 1,20,000", NOW).amount).toBe(120000);
    expect(parseMoneyCapture("freelance 2.5k", NOW).amount).toBe(2500);
    expect(parseMoneyCapture("spent 300 on books", NOW)).toEqual({ amount: 300, title: "books", date: "2026-10-11" });
  });
  it("handles a missing amount", () => {
    expect(parseMoneyCapture("coffee", NOW)).toEqual({ amount: null, title: "coffee", date: "2026-10-11" });
  });
});
