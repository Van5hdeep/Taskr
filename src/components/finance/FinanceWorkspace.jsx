import { useState, useEffect, useMemo } from "react";
import { 
  Wallet, TrendingUp, Plus, Search,
  PieChart as PieChartIcon, Trash2, Calendar,
  ArrowUpRight, ArrowDownRight, Receipt, Target, Pencil, WalletCards
} from "lucide-react";
import WorkspaceSaveModal from "../WorkspaceSaveModal";
import SaveButton from "../ui/SaveButton";
import Dropdown from "../ui/Dropdown";
import BudgetLineGraph from "./BudgetLineGraph";

const CATEGORIES = [
  { id: "food", label: "Food & Dining", color: "bg-orange-500" },
  { id: "transport", label: "Transportation", color: "bg-blue-500" },
  { id: "shopping", label: "Shopping", color: "bg-pink-500" },
  { id: "entertainment", label: "Entertainment", color: "bg-purple-500" },
  { id: "bills", label: "Bills & Utilities", color: "bg-red-500" },
  { id: "health", label: "Health", color: "bg-emerald-500" },
  { id: "education", label: "Education", color: "bg-indigo-500" },
  { id: "other", label: "Other", color: "bg-slate-500" },
];

const INCOME_TYPES = [
  { id: "salary", label: "Salary" },
  { id: "freelance", label: "Freelance" },
  { id: "bonus", label: "Bonus" },
  { id: "investment", label: "Investment" },
  { id: "other-income", label: "Other income" },
];

const financeKey = (userId, suffix) => `taskr_finance_${suffix}_${userId || "local"}`;

function readFinanceValue(userId, suffix, fallbackSuffix) {
  return localStorage.getItem(financeKey(userId, suffix)) ?? (fallbackSuffix ? localStorage.getItem(`taskr_finance_${fallbackSuffix}`) : null);
}

export default function FinanceWorkspace({ t, dark, onSave, userId }) {
  const [balance, setBalance] = useState(() => {
    const saved = readFinanceValue(userId, "balance", "balance");
    return saved ? parseFloat(saved) : 0;
  });
  
  const [transactions, setTransactions] = useState(() => {
    const saved = readFinanceValue(userId, "transactions", "transactions");
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [budget, setBudget] = useState(() => {
    const saved = readFinanceValue(userId, "budget", "budget");
    return saved ? parseFloat(saved) : 10000;
  });

  const [recordPeriod, setRecordPeriod] = useState("month");

  // Inline Editing States
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState(balance.toString());
  
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(budget.toString());

  // Form states
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("food");
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");
  const [type, setType] = useState("expense"); 
  const [incomeType, setIncomeType] = useState("salary");

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [showSaveModal, setShowSaveModal] = useState(false);

  useEffect(() => {
    localStorage.setItem(financeKey(userId, "balance"), balance.toString());
  }, [balance, userId]);

  useEffect(() => {
    localStorage.setItem(financeKey(userId, "transactions"), JSON.stringify(transactions));
  }, [transactions, userId]);

  useEffect(() => {
    localStorage.setItem(financeKey(userId, "budget"), budget.toString());
  }, [budget, userId]);

  const handleAddTransaction = (e) => {
    e.preventDefault();
    if (!title || !amount) return;

    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;

    const newTx = {
      id: crypto.randomUUID(),
      title,
      amount: val,
      category: type === "income" ? incomeType : category,
      date,
      notes,
      type,
      createdAt: new Date().toISOString()
    };

    setTransactions(prev => [newTx, ...prev]);
    if (type === "expense") {
      setBalance(prev => prev - val);
    } else {
      setBalance(prev => prev + val);
    }

    setTitle("");
    setAmount("");
    setNotes("");
    setIncomeType("salary");
  };

  const handleDelete = (id) => {
    const tx = transactions.find(t => t.id === id);
    if (tx) {
      if (tx.type === "expense") setBalance(prev => prev + tx.amount);
      else setBalance(prev => prev - tx.amount);
      setTransactions(transactions.filter(t => t.id !== id));
    }
  };

  const handleSaveBalance = () => {
    const val = parseFloat(balanceInput);
    if (!isNaN(val)) setBalance(val);
    setIsEditingBalance(false);
  };

  const handleSaveBudget = () => {
    const val = parseFloat(budgetInput);
    if (!isNaN(val)) setBudget(val);
    setIsEditingBudget(false);
  };

  const handleExportPdf = () => {
    setShowSaveModal(false);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const currentPeriodTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter(t => {
      const d = new Date(t.date);
      if (recordPeriod === "week") {
        const diffTime = now - d;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7;
      } else if (recordPeriod === "month") {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      } else {
        return d.getFullYear() === now.getFullYear();
      }
    });
  }, [transactions, recordPeriod]);

  const filteredTransactions = useMemo(() => {
    let result = currentPeriodTransactions;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q));
    }
    if (categoryFilter === "income") {
      result = result.filter(t => t.type === "income");
    } else if (categoryFilter !== "all") {
      result = result.filter(t => t.type === "expense" && t.category === categoryFilter);
    }
    return result.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [currentPeriodTransactions, searchQuery, categoryFilter]);

  const currentPeriodExpenses = useMemo(() => {
    return currentPeriodTransactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
  }, [currentPeriodTransactions]);

  const currentPeriodIncome = useMemo(() => {
    return currentPeriodTransactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
  }, [currentPeriodTransactions]);

  const netCashFlow = currentPeriodIncome - currentPeriodExpenses;

  const categoryTotals = useMemo(() => {
    const totals = {};
    CATEGORIES.forEach(c => totals[c.id] = 0);
    currentPeriodTransactions.filter(t => t.type === "expense").forEach(t => {
      if (totals[t.category] !== undefined) totals[t.category] += t.amount;
    });
    return totals;
  }, [currentPeriodTransactions]);

  const periodText = useMemo(() => {
    const now = new Date();
    if (recordPeriod === "week") {
      const nextWeek = new Date(now);
      nextWeek.setDate(now.getDate() + 7);
      return `${now.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} → ${nextWeek.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
    } else if (recordPeriod === "month") {
      const nextMonth = new Date(now);
      nextMonth.setMonth(now.getMonth() + 1);
      return `${now.toLocaleDateString(undefined, { month: 'long' })} → ${nextMonth.toLocaleDateString(undefined, { month: 'long' })}`;
    } else {
      const nextYear = new Date(now);
      nextYear.setFullYear(now.getFullYear() + 1);
      return `${now.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })} → ${nextYear.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
  }, [recordPeriod]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const pieData = CATEGORIES.map(c => ({ ...c, value: categoryTotals[c.id] })).filter(c => c.value > 0);
  const totalPie = pieData.reduce((sum, c) => sum + c.value, 0);
  let cumulativePercent = 0;
  const pieSlices = pieData.map(slice => {
    const percent = (slice.value / totalPie) * 100;
    const dasharray = `${percent} 100`;
    const offset = -cumulativePercent;
    cumulativePercent += percent;
    return { ...slice, dasharray, offset };
  });

  const spendPercent = budget > 0 ? Math.min(100, (currentPeriodExpenses / budget) * 100) : 0;
  const isOverBudget = currentPeriodExpenses > budget;

  return (
    <>
      <div id="finance-workspace" className="mx-auto max-w-[1500px] space-y-6 px-4 py-5 pb-28 animate-fade-in sm:px-6 lg:px-8 print:hidden">
        {/* Finance overview */}
        <div className={`relative overflow-hidden rounded-[2rem] border p-6 shadow-sm sm:p-8 ${dark ? "border-blue-500/20 bg-[#0d1530]" : "border-slate-200 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950"}`}>
          <div className="relative z-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <div className="flex items-center gap-2">
                <WalletCards className="h-5 w-5 text-blue-300" />
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">Personal finance</span>
              </div>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Money overview</h1>
              <p className="mt-1 text-sm text-slate-300">Know what came in, what went out, and what is safe to spend.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <button type="button" onClick={handleExportPdf} className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-white/15">
                <Receipt className="h-4 w-4" /> Export receipt
              </button>
              <SaveButton onClick={() => setShowSaveModal(true)} className="border-0 bg-blue-500 text-white hover:bg-blue-400" />
            </div>
          </div>

          <div className="relative z-10 mt-7 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-300">Current balance</span>
                <Wallet className="h-4 w-4 text-blue-300" />
              </div>
              <div className="mt-2">
                {isEditingBalance ? (
                  <div className="flex items-center gap-2 max-w-xs no-print">
                    <input 
                      type="number" 
                      autoFocus
                      value={balanceInput}
                      onChange={(e) => setBalanceInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveBalance()}
                      className={`w-full rounded-xl border px-3 py-2 text-xl font-bold outline-none focus:ring-2 ${t.input}`}
                    />
                    <SaveButton onClick={handleSaveBalance} />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-black text-white print:text-black">{formatCurrency(balance)}</span>
                    <button 
                      onClick={() => { setBalanceInput(balance.toString()); setIsEditingBalance(true); }}
                      className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-blue-200 transition-colors hover:bg-white/20 no-print"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-300">Period budget</span>
                <Target className="h-4 w-4 text-amber-300" />
              </div>
              <div className="mt-2">
                {isEditingBudget ? (
                  <div className="flex items-center gap-2 max-w-xs no-print">
                    <input 
                      type="number" 
                      autoFocus
                      value={budgetInput}
                      onChange={(e) => setBudgetInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveBudget()}
                      className={`w-full rounded-xl border px-3 py-2 text-xl font-bold outline-none focus:ring-2 ${t.input}`}
                    />
                    <SaveButton onClick={handleSaveBudget} />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-black text-white print:text-black">{formatCurrency(budget)}</span>
                    <button 
                      onClick={() => { setBudgetInput(budget.toString()); setIsEditingBudget(true); }}
                      className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-blue-200 transition-colors hover:bg-white/20 no-print"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="relative z-10 mt-5 max-w-2xl">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>{isOverBudget ? "Budget exceeded" : "Budget used"}</span>
              <span>{Math.round(spendPercent)}% · {formatCurrency(Math.max(0, budget - currentPeriodExpenses))} left</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div className={`h-full rounded-full transition-all ${isOverBudget ? "bg-rose-400" : "bg-emerald-400"}`} style={{ width: `${spendPercent}%` }} />
            </div>
          </div>
        </div>

        {/* Record Period */}
        <div className={`w-full rounded-[2rem] p-6 shadow-sm border flex flex-col sm:flex-row items-center justify-center gap-6 no-print ${dark ? "bg-[#161f42]/60 border-blue-500/10" : "bg-white border-slate-200"}`}>
          <div className="flex items-center gap-3">
            <label className={`text-sm font-bold uppercase tracking-wider ${t.textMuted}`}>Record Period</label>
            <div className="w-32">
              <Dropdown 
                value={recordPeriod} 
                onChange={e => setRecordPeriod(e.target.value)}
                options={[
                  { value: "week", label: "Week" },
                  { value: "month", label: "Month" },
                  { value: "year", label: "Year" },
                ]}
              />
            </div>
          </div>
          <div className={`flex items-center justify-center gap-2 text-sm font-bold px-6 py-2.5 rounded-xl border ${dark ? "bg-[#0d1530] border-blue-500/20 text-slate-300" : "bg-slate-50 border-slate-200 text-slate-600"}`}>
            <Calendar className="h-4 w-4 text-blue-500" />
            {periodText}
          </div>
        </div>

        {/* Cash-flow summary */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 print:grid-cols-4 print:page-break-inside-avoid">
          {[
            { label: "Income", value: currentPeriodIncome, icon: ArrowUpRight, tone: "emerald", detail: "Money recorded in this period" },
            { label: "Expenses", value: currentPeriodExpenses, icon: ArrowDownRight, tone: "rose", detail: "Money spent in this period" },
            { label: "Net cash flow", value: netCashFlow, icon: TrendingUp, tone: netCashFlow >= 0 ? "blue" : "rose", detail: netCashFlow >= 0 ? "Positive movement" : "Spending is ahead of income" },
            { label: "Available budget", value: budget - currentPeriodExpenses, icon: Target, tone: budget - currentPeriodExpenses >= 0 ? "violet" : "rose", detail: isOverBudget ? "Budget needs attention" : "Safe to spend" },
          ].map((card) => {
            const Icon = card.icon;
            const toneClasses = {
              emerald: dark ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-50 text-emerald-600",
              rose: dark ? "bg-rose-500/15 text-rose-300" : "bg-rose-50 text-rose-600",
              blue: dark ? "bg-blue-500/15 text-blue-300" : "bg-blue-50 text-blue-600",
              violet: dark ? "bg-violet-500/15 text-violet-300" : "bg-violet-50 text-violet-600",
            };
            return (
              <div key={card.label} className={`rounded-2xl border p-5 shadow-sm ${dark ? "border-blue-500/10 bg-[#161f42]/60" : "border-slate-200 bg-white"}`}>
                <div className="flex items-start justify-between gap-3">
                  <span className={`text-xs font-bold uppercase tracking-[0.14em] ${t.textMuted}`}>{card.label}</span>
                  <span className={`rounded-xl p-2 ${toneClasses[card.tone]}`}><Icon className="h-4 w-4" /></span>
                </div>
                <p className={`mt-4 text-2xl font-black ${t.textPrimary}`}>{formatCurrency(card.value)}</p>
                <p className={`mt-1 text-xs ${t.textMuted}`}>{card.detail}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block">
          
          {/* Left Col: Add Transaction Form (Hidden on Print) */}
          <div className="lg:col-span-4 space-y-6 no-print">
            <section className={`rounded-3xl p-6 shadow-sm border ${t.card}`}>
              <h3 className={`text-base font-bold mb-1 flex items-center gap-2 ${t.textPrimary}`}>
                <Plus className="h-5 w-5 text-blue-500" /> Add to your ledger
              </h3>
              <p className={`mb-5 text-xs ${t.textMuted}`}>Record salary, income, bills, and everyday spending.</p>
              <form onSubmit={handleAddTransaction} className="space-y-4">
                <div className="flex gap-2 mb-4 w-full">
                  <button type="button" onClick={() => setType("expense")} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all shadow-md shadow-blue-500/10 ${type === "expense" ? "bg-blue-600 text-white hover:bg-blue-700" : dark ? "bg-blue-900/40 text-blue-300 hover:bg-blue-800/60" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}`}>Expense</button>
                  <button type="button" onClick={() => setType("income")} className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all shadow-md shadow-blue-500/10 ${type === "income" ? "bg-blue-600 text-white hover:bg-blue-700" : dark ? "bg-blue-900/40 text-blue-300 hover:bg-blue-800/60" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}`}>Income</button>
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase mb-1.5 ${t.textMuted}`}>Amount</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-slate-400">₹</span>
                    </div>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className={`w-full pl-8 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${t.input}`} required />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase mb-1.5 ${t.textMuted}`}>{type === "income" ? "Income source" : "Expense description"}</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={type === "income" ? "Salary, freelance, bonus..." : "Rent, groceries, subscription..."} className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${t.input}`} required />
                </div>

                {type === "income" ? (
                  <div>
                    <label className={`block text-xs font-bold uppercase mb-1.5 ${t.textMuted}`}>Income type</label>
                    <Dropdown
                      value={incomeType}
                      onChange={e => setIncomeType(e.target.value)}
                      options={INCOME_TYPES.map(item => ({ value: item.id, label: item.label }))}
                    />
                  </div>
                ) : (
                  <div>
                    <label className={`block text-xs font-bold uppercase mb-1.5 ${t.textMuted}`}>Category</label>
                    <Dropdown 
                      value={category} 
                      onChange={e => setCategory(e.target.value)} 
                      options={CATEGORIES.map(c => ({ value: c.id, label: c.label }))}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-xs font-bold uppercase mb-1.5 ${t.textMuted}`}>Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${t.input}`} required />
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase mb-1.5 ${t.textMuted}`}>Notes (Optional)</label>
                  <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional details..." className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${t.input}`} />
                </div>

                <button type="submit" className={`w-full py-3 rounded-xl font-bold text-sm text-white transition-colors ${type === "expense" ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
                  Add {type === "expense" ? "Expense" : "Income"}
                </button>
              </form>
            </section>
          </div>

          {/* Right Col: Transaction List */}
          <div className="lg:col-span-8 flex flex-col space-y-4 print:mt-8">
            <div className="flex flex-col sm:flex-row items-center gap-3 no-print">
              <div className="relative flex-1 w-full">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${t.textMuted}`} />
                <input 
                  type="text" 
                  placeholder="Search transactions..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 ${t.input}`}
                />
              </div>
              <div className="w-full sm:w-auto shrink-0 z-10">
                <Dropdown 
                  value={categoryFilter} 
                  onChange={e => setCategoryFilter(e.target.value)}
                  options={[
                    { value: "all", label: "All Categories" },
                    { value: "income", label: "Income" },
                    ...CATEGORIES.map(c => ({ value: c.id, label: c.label }))
                  ]}
                />
              </div>
            </div>

            <div className={`flex-1 rounded-3xl border overflow-hidden ${t.card} print:border-slate-300 print:shadow-none`}>
              {filteredTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-12 text-center">
                  <div className={`p-4 rounded-full mb-4 ${dark ? "bg-blue-500/10" : "bg-blue-50"}`}>
                    <PieChartIcon className={`h-8 w-8 ${dark ? "text-blue-400" : "text-blue-500"}`} />
                  </div>
                  <h3 className={`text-lg font-bold mb-1 ${t.textPrimary}`}>No transactions found</h3>
                  <p className={`text-sm ${t.textMuted}`}>Record your first expense or income event to get started.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className={`border-b text-xs uppercase tracking-wider ${dark ? "border-blue-500/10 text-slate-500" : "border-slate-200 text-slate-500 bg-slate-50/50"} print:bg-transparent print:border-slate-300 print:text-slate-600`}>
                        <th className="px-6 py-4 font-semibold">Purpose</th>
                        <th className="px-6 py-4 font-semibold">Category</th>
                        <th className="px-6 py-4 font-semibold">Date</th>
                        <th className="px-6 py-4 font-semibold text-right">Amount</th>
                        <th className="px-6 py-4 font-semibold text-center no-print">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-blue-500/10 print:divide-slate-200">
                      {filteredTransactions.map(tx => {
                        const cat = CATEGORIES.find(c => c.id === tx.category);
                        return (
                          <tr key={tx.id} className="transition-colors hover:bg-black/5 dark:hover:bg-white/5 print:hover:bg-transparent">
                            <td className="px-6 py-4">
                              <div>
                                <div className={`font-bold text-sm ${t.textPrimary} print:text-black`}>{tx.title}</div>
                                {tx.notes && <div className={`text-xs mt-0.5 line-clamp-1 ${t.textMuted} print:text-slate-500`}>{tx.notes}</div>}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {tx.type === "income" ? (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 print:bg-transparent print:text-emerald-600 print:border print:border-emerald-200`}>
                                  {INCOME_TYPES.find(item => item.id === tx.category)?.label || "Income"}
                                </span>
                              ) : (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300 print:bg-transparent print:text-slate-600 print:border print:border-slate-200`}>
                                  {cat?.label || "Other"}
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-xs font-medium text-slate-500 dark:text-slate-400 print:text-slate-600">
                              {new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className={`px-6 py-4 text-right font-bold text-sm ${tx.type === 'income' ? 'text-emerald-500' : t.textPrimary} print:text-black`}>
                              {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                            </td>
                            <td className="px-6 py-4 text-center no-print">
                              <button onClick={() => handleDelete(tx.id)} className={`p-1.5 rounded-lg transition-colors text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400`}>
                                <Trash2 className="h-4 w-4 mx-auto" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Charts Section below transactions */}
            <div className="grid grid-cols-1 gap-6 pt-6 print:page-break-before">
              {/* Analytics Pie Chart */}
              <div className={`rounded-3xl p-6 shadow-sm border ${dark ? "bg-[#161f42]/60 border-blue-500/10" : "bg-white border-slate-200"} print:shadow-none print:border-slate-300`}>
                <h3 className={`text-base font-bold mb-6 ${t.textPrimary} print:text-black`}>Category Breakdown</h3>
                {totalPie > 0 ? (
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="relative w-48 h-48 shrink-0 group">
                      <svg viewBox="0 0 32 32" className="w-full h-full -rotate-90 rounded-full">
                        {pieSlices.map((slice) => {
                          const colorMap = {
                            food: "#f97316", transport: "#3b82f6", shopping: "#ec4899",
                            entertainment: "#a855f7", bills: "#ef4444", health: "#10b981",
                            education: "#6366f1", other: "#64748b"
                          };
                          return (
                            <circle
                              key={slice.id}
                              r="16" cx="16" cy="16"
                              fill="transparent"
                              stroke={colorMap[slice.id] || "#3b82f6"}
                              strokeWidth="32"
                              strokeDasharray={slice.dasharray}
                              strokeDashoffset={slice.offset}
                              className="transition-opacity duration-200 hover:opacity-80 cursor-pointer"
                            >
                              <title>{slice.label}: {formatCurrency(slice.value)}</title>
                            </circle>
                          );
                        })}
                      </svg>
                      <div className={`absolute inset-0 m-auto w-24 h-24 rounded-full ${dark ? "bg-[#161f42]" : "bg-white"} flex items-center justify-center`}>
                        <div className="text-center">
                          <span className={`block text-xs ${t.textMuted}`}>Total</span>
                          <span className={`block text-sm font-bold ${t.textPrimary}`}>{formatCurrency(totalPie)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 w-full space-y-3">
                      {pieSlices.map(slice => {
                        const colorMap = {
                          food: "bg-orange-500", transport: "bg-blue-500", shopping: "bg-pink-500",
                          entertainment: "bg-purple-500", bills: "bg-red-500", health: "bg-emerald-500",
                          education: "bg-indigo-500", other: "bg-slate-500"
                        };
                        const pct = ((slice.value / totalPie) * 100).toFixed(1);
                        return (
                          <div key={slice.id} className="flex items-center justify-between text-sm group">
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full ${colorMap[slice.id]} print:border print:border-slate-300`} />
                              <span className={`${t.textPrimary} font-medium print:text-slate-700`}>{slice.label}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className={`font-bold ${t.textPrimary} print:text-black`}>{formatCurrency(slice.value)}</span>
                              <span className={`w-12 text-right text-xs ${t.textMuted}`}>{pct}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex w-full items-center justify-center py-12 text-slate-400 text-sm">No expenses in this period</div>
                )}
              </div>

              {/* Budget vs Spending Bar Graph */}
              <BudgetLineGraph 
                transactions={transactions} 
                budget={budget} 
                recordPeriod={recordPeriod} 
                dark={dark} 
                t={t} 
              />
            </div>

          </div>
        </div>
      </div>

      <section id="finance-receipt" className="mx-auto hidden max-w-3xl bg-white p-8 text-slate-900 print:block">
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">TASKR · Finance receipt</p>
            <h1 className="mt-2 text-2xl font-black">{periodText}</h1>
            <p className="mt-1 text-sm text-slate-500">Generated {new Date().toLocaleString()}</p>
          </div>
          <Receipt className="h-9 w-9" />
        </div>
        <div className="mt-6 grid grid-cols-4 gap-3 border-b border-slate-200 pb-6">
          <div><p className="text-xs text-slate-500">Balance</p><p className="mt-1 font-black">{formatCurrency(balance)}</p></div>
          <div><p className="text-xs text-slate-500">Income</p><p className="mt-1 font-black text-emerald-700">{formatCurrency(currentPeriodIncome)}</p></div>
          <div><p className="text-xs text-slate-500">Expenses</p><p className="mt-1 font-black text-rose-700">{formatCurrency(currentPeriodExpenses)}</p></div>
          <div><p className="text-xs text-slate-500">Budget left</p><p className="mt-1 font-black">{formatCurrency(budget - currentPeriodExpenses)}</p></div>
        </div>
        <table className="mt-6 w-full border-collapse text-left text-sm">
          <thead><tr className="border-b border-slate-900 text-xs uppercase tracking-wider"><th className="py-3">Description</th><th className="py-3">Type</th><th className="py-3">Date</th><th className="py-3 text-right">Amount</th></tr></thead>
          <tbody>
            {[...currentPeriodTransactions].sort((a, b) => new Date(b.date) - new Date(a.date)).map(tx => (
              <tr key={tx.id} className="border-b border-slate-200"><td className="py-3 font-semibold">{tx.title}</td><td className="py-3">{tx.type === "income" ? (INCOME_TYPES.find(item => item.id === tx.category)?.label || "Income") : (CATEGORIES.find(item => item.id === tx.category)?.label || "Expense")}</td><td className="py-3">{new Date(tx.date).toLocaleDateString()}</td><td className={`py-3 text-right font-bold ${tx.type === "income" ? "text-emerald-700" : "text-rose-700"}`}>{tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}</td></tr>
            ))}
          </tbody>
        </table>
        {!currentPeriodTransactions.length && <p className="py-10 text-center text-sm text-slate-500">No records for this period.</p>}
        <p className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500">This receipt is generated from your locally stored TASKR finance records.</p>
      </section>

      {showSaveModal && (
        <WorkspaceSaveModal
          t={t}
          dark={dark}
          defaultName=""
          onSave={(name) => {
            if (onSave) onSave(name);
            setShowSaveModal(false);
          }}
          onExportPdf={handleExportPdf}
          onCancel={() => setShowSaveModal(false)}
        />
      )}
    </>
  );
}
