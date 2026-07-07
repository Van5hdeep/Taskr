import { useState, useEffect, useMemo } from "react";
import { 
  Wallet, TrendingUp, TrendingDown, Plus, Search, 
  PieChart as PieChartIcon, Trash2, Save, X, FileText, Calendar
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

export default function FinanceWorkspace({ t, dark, onSave }) {
  const [balance, setBalance] = useState(() => {
    const saved = localStorage.getItem("taskr_finance_balance");
    return saved ? parseFloat(saved) : 0;
  });
  
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem("taskr_finance_transactions");
    return saved ? JSON.parse(saved) : [];
  });

  const [budget, setBudget] = useState(() => {
    const saved = localStorage.getItem("taskr_finance_budget");
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

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [showSaveModal, setShowSaveModal] = useState(false);

  useEffect(() => {
    localStorage.setItem("taskr_finance_balance", balance.toString());
  }, [balance]);

  useEffect(() => {
    localStorage.setItem("taskr_finance_transactions", JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem("taskr_finance_budget", budget.toString());
  }, [budget]);

  const handleAddTransaction = (e) => {
    e.preventDefault();
    if (!title || !amount) return;

    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;

    const newTx = {
      id: crypto.randomUUID(),
      title,
      amount: val,
      category: type === "income" ? "income" : category,
      date,
      notes,
      type,
      createdAt: new Date().toISOString()
    };

    setTransactions([newTx, ...transactions]);
    if (type === "expense") {
      setBalance(prev => prev - val);
    } else {
      setBalance(prev => prev + val);
    }

    setTitle("");
    setAmount("");
    setNotes("");
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
    if (categoryFilter !== "all") {
      result = result.filter(t => t.category === categoryFilter);
    }
    return result.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [currentPeriodTransactions, searchQuery, categoryFilter]);

  const currentPeriodExpenses = useMemo(() => {
    return currentPeriodTransactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
  }, [currentPeriodTransactions]);

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

  const spendPercent = Math.min(100, (currentPeriodExpenses / budget) * 100);
  const isOverBudget = currentPeriodExpenses > budget;

  return (
    <>
      <div id="finance-workspace" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6 pb-28 animate-fade-in print:p-0 print:pb-0">
        {/* Hero Section */}
        <div className={`relative overflow-hidden rounded-[2.5rem] p-8 sm:p-10 ${dark ? "bg-[#0d1530] border border-blue-500/20" : "bg-gradient-to-br from-blue-600 to-indigo-700"} shadow-xl print:bg-white print:border-slate-200 print:text-black print:shadow-none print:rounded-none`}>
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h1 className={`text-3xl font-bold tracking-tight ${dark ? "text-slate-100" : "text-white"} print:text-black`}>Plan Your Finance</h1>
              <p className={`${dark ? "text-slate-400" : "text-blue-100"} print:text-slate-600`}>Track your expenses and balance in real-time.</p>
            </div>
            <div className="flex items-center gap-4 print:hidden">
              <SaveButton 
                onClick={() => setShowSaveModal(true)}
                className="print:hidden"
              />
            </div>
          </div>
          
          <div className="mt-8 flex flex-col md:flex-row gap-6 print:mt-4">
            <div className={`flex-1 p-6 rounded-3xl backdrop-blur-md ${dark ? "bg-white/5 border border-white/10" : "bg-black/20"} print:border-slate-200 print:bg-slate-50`}>
              <span className={`text-sm font-medium uppercase tracking-wider ${dark ? "text-slate-400" : "text-blue-100"} print:text-slate-500`}>Current Balance</span>
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
                    <span className={`text-4xl font-black ${dark ? "text-white" : "text-white"} print:text-black`}>{formatCurrency(balance)}</span>
                    <button 
                      onClick={() => { setBalanceInput(balance.toString()); setIsEditingBalance(true); }}
                      className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors no-print ${dark ? "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30" : "bg-white/20 text-white hover:bg-white/30"}`}
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <div className={`flex-1 p-6 rounded-3xl backdrop-blur-md ${dark ? "bg-white/5 border border-white/10" : "bg-black/20"} print:border-slate-200 print:bg-slate-50`}>
              <span className={`text-sm font-medium uppercase tracking-wider ${dark ? "text-slate-400" : "text-blue-100"} print:text-slate-500`}>Current Budget</span>
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
                    <span className={`text-4xl font-black ${dark ? "text-white" : "text-white"} print:text-black`}>{formatCurrency(budget)}</span>
                    <button 
                      onClick={() => { setBudgetInput(budget.toString()); setIsEditingBudget(true); }}
                      className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors no-print ${dark ? "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30" : "bg-white/20 text-white hover:bg-white/30"}`}
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
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

        {/* Top Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:page-break-inside-avoid">
          {/* Spend Summary */}
          <div className={`rounded-3xl p-6 shadow-sm border ${dark ? "bg-[#161f42]/60 border-blue-500/10" : "bg-white border-slate-200"} print:shadow-none print:border-slate-300`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${dark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-600"} print:bg-transparent print:text-red-600 print:p-0`}>
                <TrendingDown className="h-6 w-6" />
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${t.textMuted} print:text-slate-500`}>Record Period</span>
            </div>
            <h3 className={`text-3xl font-bold ${t.textPrimary} print:text-black`}>{formatCurrency(currentPeriodExpenses)}</h3>
            <p className={`text-sm mt-2 font-medium ${t.textMuted}`}>
              {budget - currentPeriodExpenses >= 0 ? 
                <span className="text-emerald-500">{formatCurrency(budget - currentPeriodExpenses)} remaining</span> : 
                <span className="text-red-500">{formatCurrency(currentPeriodExpenses - budget)} over budget!</span>}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block">
          
          {/* Left Col: Add Transaction Form (Hidden on Print) */}
          <div className="lg:col-span-4 space-y-6 no-print">
            <section className={`rounded-3xl p-6 shadow-sm border ${t.card}`}>
              <h3 className={`text-base font-bold mb-5 flex items-center gap-2 ${t.textPrimary}`}>
                <Plus className="h-5 w-5 text-blue-500" /> Record Event
              </h3>
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
                  <label className={`block text-xs font-bold uppercase mb-1.5 ${t.textMuted}`}>Purpose</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="What is this for?" className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${t.input}`} required />
                </div>

                {type === "expense" && (
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
                                  Income
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
