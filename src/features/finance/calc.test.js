import { describe, expect, it } from "vitest";
import {
  accountBalances, advanceDue, budgetUsage, goalMonthlyNeed, goalSaved, holdingGain, importHash,
  monthlyEquivalent, netWorth, occurrencesBetween, parseAmount, parseBankDate, safeToSpend, suggestCategory, sumAmounts,
} from "./calc";

const TODAY = new Date(2026, 9, 11); // 11 Oct 2026

const tx = (fields) => ({ kind: "expense", amount: 0, occurred_on: "2026-10-05", account_id: "cash", ...fields });

describe("money sums", () => {
  it("adds without float drift", () => {
    expect(sumAmounts([{ amount: 0.1 }, { amount: 0.2 }])).toBe(0.3);
  });
});

describe("balances and net worth", () => {
  const accounts = [
    { id: "cash", kind: "cash", opening_balance: 1000 },
    { id: "bank", kind: "bank", opening_balance: 50000 },
    { id: "card", kind: "card", opening_balance: 0 },
  ];
  const transactions = [
    tx({ kind: "income", amount: 30000, account_id: "bank" }),
    tx({ amount: 250.5, account_id: "cash" }),
    tx({ amount: 4000, account_id: "card" }),
    tx({ kind: "transfer", amount: 1500, account_id: "bank", transfer_account_id: "card" }),
  ];
  const balances = accountBalances(accounts, transactions);

  it("derives balances including transfers", () => {
    expect(balances).toEqual({ cash: 749.5, bank: 78500, card: -2500 });
  });

  it("treats negative balances as liabilities and adds investments", () => {
    const result = netWorth(accounts, balances, [{ current_value: 10000 }, { current_value: 999, archived_at: "x" }]);
    expect(result).toEqual({ assets: 79249.5, investments: 10000, liabilities: 2500, total: 86749.5 });
  });
});

describe("recurring", () => {
  it("advances by cadence and interval", () => {
    expect(advanceDue("2026-01-31", "monthly")).toBe("2026-02-28");
    expect(advanceDue("2026-10-01", "quarterly")).toBe("2027-01-01");
    expect(advanceDue("2026-10-01", "weekly", 2)).toBe("2026-10-15");
  });
  it("computes monthly equivalents", () => {
    expect(monthlyEquivalent({ amount: 1200, cadence: "yearly" })).toBe(100);
    expect(monthlyEquivalent({ amount: 100, cadence: "weekly" })).toBe(433.33);
  });
  it("lists occurrences in a window", () => {
    const item = { is_active: true, next_due_on: "2026-10-03", cadence: "weekly", interval_count: 1 };
    expect(occurrencesBetween(item, "2026-10-11", "2026-10-31")).toEqual(["2026-10-17", "2026-10-24", "2026-10-31"]);
  });
});

describe("goals", () => {
  it("sums contributions and spreads the rest across remaining months", () => {
    const goal = { id: "g", target_amount: 12000, target_date: "2027-03-31" };
    const saved = goalSaved(goal, [tx({ goal_id: "g", amount: 2000 }), tx({ amount: 5 })]);
    expect(saved).toBe(2000);
    expect(goalMonthlyNeed(goal, saved, TODAY)).toBe(1666.67); // 10000 over Oct..Mar = 6 months
    expect(goalMonthlyNeed({ ...goal, target_date: null }, saved, TODAY)).toBeNull();
    expect(goalMonthlyNeed(goal, 12000, TODAY)).toBe(0);
  });
});

describe("budgets", () => {
  it("measures spend and rollover", () => {
    const transactions = [
      tx({ category_id: "food", amount: 3000, occurred_on: "2026-10-02" }),
      tx({ category_id: "food", amount: 1000, occurred_on: "2026-09-10" }),
      tx({ category_id: "fun", amount: 500, occurred_on: "2026-10-03" }),
    ];
    expect(budgetUsage({ category_id: "food", amount: 4000 }, transactions, TODAY)).toMatchObject({ spent: 3000, limit: 4000, remaining: 1000 });
    expect(budgetUsage({ category_id: "food", amount: 4000, rollover: true }, transactions, TODAY).limit).toBe(7000);
    expect(budgetUsage({ category_id: null, amount: 5000 }, transactions, TODAY).spent).toBe(3500);
  });
});

describe("safe to spend", () => {
  it("subtracts spending, remaining bills and goal plans from income", () => {
    const result = safeToSpend({
      transactions: [tx({ kind: "income", amount: 50000, occurred_on: "2026-10-01" }), tx({ amount: 12000, occurred_on: "2026-10-04" })],
      recurring: [
        { kind: "expense", amount: 15000, is_active: true, next_due_on: "2026-10-20", cadence: "monthly" },
        { kind: "expense", amount: 999, is_active: true, next_due_on: "2026-11-02", cadence: "monthly" },
        { kind: "income", amount: 50000, is_active: true, next_due_on: "2026-10-30", cadence: "monthly" },
      ],
      goals: [{ id: "g", target_amount: 6000, target_date: "2026-12-31" }],
      overallBudget: 0,
      today: TODAY,
    });
    expect(result).toMatchObject({ basis: "income", income: 50000, spent: 12000, billsDue: 15000, goalsPlanned: 2000, amount: 21000 });
  });
  it("falls back to the overall budget before income arrives", () => {
    const result = safeToSpend({ transactions: [tx({ amount: 1000 })], recurring: [], goals: [], overallBudget: 20000, today: TODAY });
    expect(result).toMatchObject({ basis: "budget", amount: 19000 });
  });
});

describe("investments", () => {
  it("computes gain", () => {
    expect(holdingGain({ invested_amount: 10000, current_value: 11500 })).toEqual({ gain: 1500, pct: 0.15 });
  });
});

describe("csv helpers", () => {
  it("parses Indian and bank-style amounts", () => {
    expect(parseAmount("₹1,23,456.50")).toBe(123456.5);
    expect(parseAmount("(450.00)")).toBe(-450);
    expect(parseAmount("1,200.00 Dr")).toBe(-1200);
    expect(parseAmount("-75")).toBe(-75);
    expect(parseAmount("")).toBeNull();
  });
  it("parses common date formats", () => {
    expect(parseBankDate("03/04/2026", true)).toBe("2026-04-03");
    expect(parseBankDate("03/04/2026", false)).toBe("2026-03-04");
    expect(parseBankDate("2026-10-11")).toBe("2026-10-11");
    expect(parseBankDate("05-Oct-26")).toBe("2026-10-05");
    expect(parseBankDate("31/02/2026")).toBeNull();
  });
  it("hashes deterministically and distinguishes repeated rows", () => {
    const base = { date: "2026-10-05", amount: 120, title: "UPI/Coffee House/1234567", accountId: "cash" };
    expect(importHash(base)).toBe(importHash({ ...base, title: "upi coffee house 9999999" }));
    expect(importHash(base)).not.toBe(importHash({ ...base, occurrence: 1 }));
  });
  it("suggests a category from past titles", () => {
    const history = [tx({ title: "Swiggy order", category_id: "food", occurred_on: "2026-09-01" }), tx({ title: "Uber trip", category_id: "transport" })];
    expect(suggestCategory("SWIGGY ORDER 8812", history)).toBe("food");
    expect(suggestCategory("Uber 1234", history)).toBe("transport");
    expect(suggestCategory("Random shop", history)).toBeNull();
  });
});
