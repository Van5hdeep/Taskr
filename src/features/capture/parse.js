import * as chrono from "chrono-node";
import { toDay } from "../finance/calc";

/** Quick-capture prefixes: "t " task, "e " expense, "i " income. */
export function detectMode(text) {
  const match = /^\s*([tei])\s+/i.exec(text);
  if (!match) return null;
  return { mode: { t: "task", e: "expense", i: "income" }[match[1].toLowerCase()], rest: text.slice(match[0].length) };
}

const AMOUNT = /(?:₹|rs\.?|inr|\$|€|£)?\s*(\d{1,3}(?:,\d{2,3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*(k)?(?:\s*(?:rs|rupees|inr))?/i;

/**
 * "₹450 lunch with Riya yesterday" → { amount: 450, title: "lunch with Riya", date: "<yesterday>" }
 * Takes the first number as the amount ("2.5k" = 2500), a natural date if
 * present, and the remaining words as the description.
 */
export function parseMoneyCapture(input, now = new Date()) {
  let text = ` ${String(input ?? "")} `;
  let date = toDay(now);
  const [dateResult] = chrono.parse(text, now, { forwardDate: false });
  if (dateResult) {
    date = toDay(dateResult.start.date());
    text = text.slice(0, dateResult.index) + text.slice(dateResult.index + dateResult.text.length);
  }
  let amount = null;
  const match = AMOUNT.exec(text);
  if (match) {
    amount = Number.parseFloat(match[1].replace(/,/g, "")) * (match[2] ? 1000 : 1);
    text = text.slice(0, match.index) + " " + text.slice(match.index + match[0].length);
  }
  const title = text.replace(/\s+(for|on|at)\s*$/i, "").replace(/^\s*(?:(?:for|on|spent|paid|got|received)\s+)+/i, "").replace(/\s+/g, " ").trim();
  return { amount: amount && amount > 0 ? Math.round(amount * 100) / 100 : null, title, date };
}
