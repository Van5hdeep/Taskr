export const ACCOUNT_KINDS = [
  { id: "cash", label: "Cash" },
  { id: "bank", label: "Bank account" },
  { id: "wallet", label: "Wallet / UPI" },
  { id: "card", label: "Credit card" },
  { id: "loan", label: "Loan" },
  { id: "other", label: "Other" },
];

export const HOLDING_KINDS = [
  { id: "mutual_fund", label: "Mutual fund", color: "#2563eb" },
  { id: "stock", label: "Stocks", color: "#7c3aed" },
  { id: "fd", label: "Fixed deposit", color: "#0891b2" },
  { id: "rd", label: "Recurring deposit", color: "#0d9488" },
  { id: "gold", label: "Gold", color: "#ca8a04" },
  { id: "epf_ppf", label: "EPF / PPF", color: "#16a34a" },
  { id: "nps", label: "NPS", color: "#65a30d" },
  { id: "crypto", label: "Crypto", color: "#ea580c" },
  { id: "real_estate", label: "Real estate", color: "#9333ea" },
  { id: "other", label: "Other", color: "#64748b" },
];

export const DEFAULT_CATEGORIES = [
  { name: "Food & Dining", kind: "expense", color: "#f97316", legacy: "food" },
  { name: "Transportation", kind: "expense", color: "#3b82f6", legacy: "transport" },
  { name: "Shopping", kind: "expense", color: "#ec4899", legacy: "shopping" },
  { name: "Entertainment", kind: "expense", color: "#a855f7", legacy: "entertainment" },
  { name: "Bills & Utilities", kind: "expense", color: "#ef4444", legacy: "bills" },
  { name: "Health", kind: "expense", color: "#10b981", legacy: "health" },
  { name: "Education", kind: "expense", color: "#6366f1", legacy: "education" },
  { name: "Rent & Housing", kind: "expense", color: "#0ea5e9" },
  { name: "Subscriptions", kind: "expense", color: "#14b8a6" },
  { name: "Investments", kind: "expense", color: "#22c55e" },
  { name: "Other", kind: "expense", color: "#64748b", legacy: "other" },
  { name: "Salary", kind: "income", color: "#16a34a", legacy: "salary" },
  { name: "Freelance", kind: "income", color: "#0891b2", legacy: "freelance" },
  { name: "Bonus", kind: "income", color: "#ca8a04", legacy: "bonus" },
  { name: "Investment income", kind: "income", color: "#7c3aed", legacy: "investment" },
  { name: "Other income", kind: "income", color: "#64748b", legacy: "other-income" },
];

export const CATEGORY_COLORS = ["#f97316", "#3b82f6", "#ec4899", "#a855f7", "#ef4444", "#10b981", "#6366f1", "#0ea5e9", "#14b8a6", "#22c55e", "#ca8a04", "#64748b"];
