import { addMonths, addWeeks, addYears, differenceInCalendarMonths, endOfMonth, startOfMonth } from "date-fns";

// Money is summed in integer paise/cents to avoid float drift, then returned
// as a plain number with 2 decimals.
export const toMinor = (amount) => Math.round((Number(amount) || 0) * 100);
export const fromMinor = (minor) => Math.round(minor) / 100;
export const sumAmounts = (items, pick = (item) => item.amount) => fromMinor(items.reduce((total, item) => total + toMinor(pick(item)), 0));

// ─── Calendar dates (YYYY-MM-DD, local) ────────────────────────────────────

export function parseDay(value) {
  if (!value) return null;
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toDay(date) {
  const value = date instanceof Date ? date : parseDay(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

export function monthRange(reference = new Date()) {
  return { start: toDay(startOfMonth(reference)), end: toDay(endOfMonth(reference)) };
}

export const inRange = (day, { start, end }) => day >= start && day <= end;

// ─── Accounts & net worth ──────────────────────────────────────────────────

export const LIABILITY_KINDS = ["card", "loan"];
export const isLiability = (account) => LIABILITY_KINDS.includes(account.kind);

/** Signed effect of one transaction on one account. */
export function effectOn(accountId, tx) {
  const minor = toMinor(tx.amount);
  if (tx.kind === "income" && tx.account_id === accountId) return minor;
  if (tx.kind === "expense" && tx.account_id === accountId) return -minor;
  if (tx.kind === "transfer" && tx.account_id === accountId) return -minor;
  if (tx.kind === "transfer" && tx.transfer_account_id === accountId) return minor;
  return 0;
}

/** account id → balance, from opening balances and transactions. */
export function accountBalances(accounts, transactions) {
  const balances = {};
  for (const account of accounts) {
    let minor = toMinor(account.opening_balance);
    for (const tx of transactions) minor += effectOn(account.id, tx);
    balances[account.id] = fromMinor(minor);
  }
  return balances;
}

/**
 * Net worth = every account balance (liabilities are negative balances) +
 * current value of investments.
 */
export function netWorth(accounts, balances, holdings) {
  let assets = 0;
  let liabilities = 0;
  for (const account of accounts) {
    if (account.is_archived) continue;
    // A card or loan carries a negative balance while money is owed; any
    // account below zero counts as a liability, anything above as an asset.
    const minor = toMinor(balances[account.id]);
    if (minor >= 0) assets += minor;
    else liabilities += -minor;
  }
  const investments = holdings.filter((holding) => !holding.archived_at).reduce((total, holding) => total + toMinor(holding.current_value), 0);
  return {
    assets: fromMinor(assets),
    investments: fromMinor(investments),
    liabilities: fromMinor(liabilities),
    total: fromMinor(assets + investments - liabilities),
  };
}

// ─── Recurring ─────────────────────────────────────────────────────────────

export const CADENCES = [
  { id: "weekly", label: "Weekly", perYear: 52 },
  { id: "monthly", label: "Monthly", perYear: 12 },
  { id: "quarterly", label: "Quarterly", perYear: 4 },
  { id: "yearly", label: "Yearly", perYear: 1 },
];

export function advanceDue(day, cadence, interval = 1) {
  const date = parseDay(day);
  const step = Math.max(1, Number(interval) || 1);
  if (cadence === "weekly") return toDay(addWeeks(date, step));
  if (cadence === "monthly") return toDay(addMonths(date, step));
  if (cadence === "quarterly") return toDay(addMonths(date, 3 * step));
  return toDay(addYears(date, step));
}

/** What a recurring item costs per month on average. */
export function monthlyEquivalent(item) {
  const cadence = CADENCES.find((entry) => entry.id === item.cadence) ?? CADENCES[1];
  const interval = Math.max(1, Number(item.interval_count) || 1);
  return fromMinor((toMinor(item.amount) * cadence.perYear) / 12 / interval);
}

/** Occurrences of an active recurring item that fall inside [start, end]. */
export function occurrencesBetween(item, start, end) {
  if (!item.is_active || !item.next_due_on) return [];
  const result = [];
  let due = toDay(item.next_due_on);
  let guard = 0;
  while (due <= end && guard < 400) {
    if (due >= start) result.push(due);
    due = advanceDue(due, item.cadence, item.interval_count);
    guard += 1;
  }
  return result;
}

// ─── Goals ─────────────────────────────────────────────────────────────────

export function goalSaved(goal, transactions) {
  return sumAmounts(transactions.filter((tx) => tx.goal_id === goal.id));
}

/** Monthly amount still needed to hit the target by its date (null without a date). */
export function goalMonthlyNeed(goal, saved, today = new Date()) {
  const remaining = Math.max(0, toMinor(goal.target_amount) - toMinor(saved));
  if (!remaining) return 0;
  if (!goal.target_date) return null;
  const months = Math.max(1, differenceInCalendarMonths(parseDay(goal.target_date), today) + 1);
  return fromMinor(Math.ceil(remaining / months));
}

// ─── Budgets ───────────────────────────────────────────────────────────────

export function spentByCategory(transactions, range) {
  const totals = {};
  for (const tx of transactions) {
    if (tx.kind !== "expense" || !inRange(tx.occurred_on, range)) continue;
    const key = tx.category_id ?? "uncategorized";
    totals[key] = (totals[key] ?? 0) + toMinor(tx.amount);
  }
  return Object.fromEntries(Object.entries(totals).map(([key, minor]) => [key, fromMinor(minor)]));
}

/**
 * Budget usage for the month of `reference`. Rollover adds last month's
 * unspent amount (never a negative carry).
 */
export function budgetUsage(budget, transactions, reference = new Date()) {
  const range = monthRange(reference);
  const matches = (tx) => tx.kind === "expense" && (budget.category_id == null || tx.category_id === budget.category_id);
  const spent = sumAmounts(transactions.filter((tx) => matches(tx) && inRange(tx.occurred_on, range)));
  let limit = Number(budget.amount) || 0;
  if (budget.rollover) {
    const previous = monthRange(addMonths(reference, -1));
    const lastSpent = sumAmounts(transactions.filter((tx) => matches(tx) && inRange(tx.occurred_on, previous)));
    limit = fromMinor(toMinor(limit) + Math.max(0, toMinor(budget.amount) - toMinor(lastSpent)));
  }
  const ratio = limit > 0 ? spent / limit : spent > 0 ? Infinity : 0;
  return { spent, limit, remaining: fromMinor(toMinor(limit) - toMinor(spent)), ratio };
}

// ─── Safe to spend ─────────────────────────────────────────────────────────

/**
 * What can still be spent this month without missing bills or goals.
 *   base  = income received this month (or the overall budget when no income yet)
 *   minus expenses so far, bills still due this month, and goal money still
 *   planned for this month.
 */
export function safeToSpend({ transactions, recurring, goals, overallBudget, today = new Date() }) {
  const range = monthRange(today);
  const todayDay = toDay(today);
  const thisMonth = transactions.filter((tx) => inRange(tx.occurred_on, range));

  const income = sumAmounts(thisMonth.filter((tx) => tx.kind === "income"));
  const spent = sumAmounts(thisMonth.filter((tx) => tx.kind === "expense"));

  let billsDue = 0;
  for (const item of recurring) {
    if (item.kind !== "expense") continue;
    billsDue += occurrencesBetween(item, todayDay, range.end).length * toMinor(item.amount);
  }

  let goalsPlanned = 0;
  for (const goal of goals) {
    if (goal.achieved_at || goal.archived_at) continue;
    const saved = goalSaved(goal, transactions);
    const need = goalMonthlyNeed(goal, saved, today);
    if (!need) continue;
    const contributedThisMonth = toMinor(sumAmounts(thisMonth.filter((tx) => tx.goal_id === goal.id)));
    goalsPlanned += Math.max(0, toMinor(need) - contributedThisMonth);
  }

  const usingBudget = income === 0 && Number(overallBudget) > 0;
  const base = usingBudget ? Number(overallBudget) : income;
  const amount = fromMinor(toMinor(base) - toMinor(spent) - billsDue - goalsPlanned);
  return { amount, base, basis: usingBudget ? "budget" : "income", income, spent, billsDue: fromMinor(billsDue), goalsPlanned: fromMinor(goalsPlanned) };
}

// ─── Investments ───────────────────────────────────────────────────────────

export function holdingGain(holding) {
  const gain = fromMinor(toMinor(holding.current_value) - toMinor(holding.invested_amount));
  const pct = Number(holding.invested_amount) > 0 ? gain / Number(holding.invested_amount) : null;
  return { gain, pct };
}

// ─── CSV import helpers ────────────────────────────────────────────────────

/** "₹1,23,456.50 Cr", "(450.00)", "-1,200", "1200 Dr" → signed number (credit +, debit −). */
export function parseAmount(raw) {
  if (raw == null) return null;
  let text = String(raw).trim();
  if (!text) return null;
  let sign = 1;
  if (/\(.*\)/.test(text)) sign = -1;
  if (/\bdr\.?$/i.test(text)) sign = -1;
  text = text.replace(/\b(cr|dr)\.?$/i, "").replace(/[^\d.-]/g, "");
  if (text.startsWith("-")) { sign = -sign; text = text.slice(1); }
  const value = Number.parseFloat(text);
  return Number.isFinite(value) ? sign * value : null;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Parses common bank date formats. dayFirst decides 03/04/2026 (3 Apr vs Mar 4). */
export function parseBankDate(raw, dayFirst = true) {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  let match = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (match) return safeDay(+match[1], +match[2], +match[3]);
  match = text.match(/^(\d{1,2})[-/. ]([A-Za-z]{3})[A-Za-z]*[-/. ,]+(\d{2,4})/);
  if (match) return safeDay(fullYear(+match[3]), MONTHS.indexOf(match[2].toLowerCase()) + 1, +match[1]);
  match = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (match) {
    const [a, b, y] = [+match[1], +match[2], fullYear(+match[3])];
    return dayFirst ? safeDay(y, b, a) : safeDay(y, a, b);
  }
  return null;
}

function fullYear(year) {
  return year < 100 ? 2000 + year : year;
}

function safeDay(y, m, d) {
  if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
  const date = new Date(y, m - 1, d);
  return date.getMonth() === m - 1 ? toDay(date) : null;
}

export function normalizeTitle(title) {
  return String(title ?? "").toLowerCase().replace(/\d{4,}/g, "").replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
}

/** Stable, short FNV-1a hash used to skip rows that were already imported. */
export function importHash({ date, amount, title, accountId, occurrence = 0 }) {
  const text = `${date}|${toMinor(amount)}|${normalizeTitle(title)}|${accountId}|${occurrence}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ code, 0x5bd1e995) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

/** Category used most recently for a similar title, from the user's own history. */
export function suggestCategory(title, transactions) {
  const key = normalizeTitle(title);
  if (!key) return null;
  const firstWord = key.split(" ")[0];
  let best = null;
  for (const tx of transactions) {
    if (!tx.category_id) continue;
    const other = normalizeTitle(tx.title);
    const score = other === key ? 2 : other.split(" ")[0] === firstWord && firstWord.length > 2 ? 1 : 0;
    if (score && (!best || score > best.score || (score === best.score && tx.occurred_on > best.date))) {
      best = { score, categoryId: tx.category_id, date: tx.occurred_on };
    }
  }
  return best?.categoryId ?? null;
}
