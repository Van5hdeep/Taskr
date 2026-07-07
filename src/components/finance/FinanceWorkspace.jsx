import { useState, useEffect, useMemo } from "react";
import { 
  Wallet, TrendingUp, TrendingDown, Plus, Search, 
  PieChart as PieChartIcon, Trash2, Save, X, FileText
} from "lucide-react";

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

  // Save Modal
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [docName, setDocName] = useState(() => {
    return localStorage.getItem("taskr_finance_doc_name") || "My Finance Plan";
  });

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

  const handleSaveDocument = () => {
    if (onSave && docName.trim()) {
      onSave(docName.trim());
    }
    setShowSaveModal(false);
  };

  const handleExportPdf = () => {
    setShowSaveModal(false);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const filteredTransactions = useMemo(() => {
    let result = transactions;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q));
    }
    if (categoryFilter !== "all") {
      result = result.filter(t => t.category === categoryFilter);
    }
    return result.sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, searchQuery, categoryFilter]);

  const currentMonthExpenses = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    return transactions
      .filter(t => t.type === "expense")
      .filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const categoryTotals = useMemo(() => {
    const totals = {};
    CATEGORIES.forEach(c => totals[c.id] = 0);
    transactions.filter(t => t.type === "expense").forEach(t => {
      if (totals[t.category] !== undefined) totals[t.category] += t.amount;
    });
    return totals;
  }, [transactions]);

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
              <button 
                onClick={() => setShowSaveModal(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${dark ? "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30" : "bg-white/20 text-white hover:bg-white/30"}`}
              >
                <Save className="h-4 w-4" /> Save Plan
              </button>
            </div>
          </div>
          
          <div className="mt-8 flex flex-col md:flex-row gap-6 print:mt-4">
            {/* Current Balance Inline Editor */}
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
                    <button onClick={handleSaveBalance} className="px-3 py-2 bg-emerald-500 text-white rounded-xl font-bold text-sm">Save</button>
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
            
            {/* Monthly Budget Inline Editor */}
            <div className={`flex-1 p-6 rounded-3xl backdrop-blur-md ${dark ? "bg-white/5 border border-white/10" : "bg-black/20"} print:border-slate-200 print:bg-slate-50`}>
              <span className={`text-sm font-medium uppercase tracking-wider ${dark ? "text-slate-400" : "text-blue-100"} print:text-slate-500`}>Monthly Budget</span>
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
                    <button onClick={handleSaveBudget} className="px-3 py-2 bg-emerald-500 text-white rounded-xl font-bold text-sm">Save</button>
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

        {/* Top Summary & Chart */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:page-break-inside-avoid">
          {/* Monthly Spend Summary */}
          <div className={`rounded-3xl p-6 shadow-sm border ${dark ? "bg-[#161f42]/60 border-blue-500/10" : "bg-white border-slate-200"} print:shadow-none print:border-slate-300`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl ${dark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-600"} print:bg-transparent print:text-red-600 print:p-0`}>
                <TrendingDown className="h-6 w-6" />
              </div>
              <span className={`text-xs font-bold uppercase tracking-wider ${t.textMuted} print:text-slate-500`}>Monthly Spend</span>
            </div>
            <h3 className={`text-3xl font-bold ${t.textPrimary} print:text-black`}>{formatCurrency(currentMonthExpenses)}</h3>
            <p className={`text-sm mt-2 font-medium ${t.textMuted}`}>
              {budget - currentMonthExpenses >= 0 ? 
                <span className="text-emerald-500">{formatCurrency(budget - currentMonthExpenses)} remaining</span> : 
                <span className="text-red-500">{formatCurrency(currentMonthExpenses - budget)} over budget!</span>}
            </p>
          </div>

          {/* Analytics Pie Chart */}
          <div className={`rounded-3xl p-6 shadow-sm border flex items-center justify-between gap-6 ${dark ? "bg-[#161f42]/60 border-blue-500/10" : "bg-white border-slate-200"} print:shadow-none print:border-slate-300`}>
            {totalPie > 0 ? (
              <>
                <div className="flex-1 space-y-2">
                  <h3 className={`text-sm font-bold mb-4 ${t.textPrimary} print:text-black`}>Category Breakdown</h3>
                  {pieSlices.slice(0, 4).map(slice => (
                    <div key={slice.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${slice.color} print:border print:border-slate-300`} />
                        <span className={`${t.textMuted} print:text-slate-600`}>{slice.label}</span>
                      </div>
                      <span className={`font-bold ${t.textPrimary} print:text-black`}>{formatCurrency(slice.value)}</span>
                    </div>
                  ))}
                  {pieSlices.length > 4 && (
                    <div className="text-xs text-slate-500 mt-2 italic">+ {pieSlices.length - 4} more</div>
                  )}
                </div>
                <div className="relative w-32 h-32 shrink-0">
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
                        />
                      );
                    })}
                  </svg>
                  <div className={`absolute inset-0 m-auto w-16 h-16 rounded-full ${dark ? "bg-[#161f42]" : "bg-white"}`} />
                </div>
              </>
            ) : (
              <div className="flex w-full items-center justify-center text-slate-400 text-sm">No expenses this month</div>
            )}
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
                <div className="flex gap-2 p-1 rounded-xl bg-slate-100 dark:bg-black/20 mb-4">
                  <button type="button" onClick={() => setType("expense")} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${type === "expense" ? "bg-white dark:bg-[#161f42] shadow shadow-sm text-red-500" : "text-slate-500"}`}>Expense</button>
                  <button type="button" onClick={() => setType("income")} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${type === "income" ? "bg-white dark:bg-[#161f42] shadow shadow-sm text-emerald-500" : "text-slate-500"}`}>Income</button>
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
                    <select value={category} onChange={e => setCategory(e.target.value)} className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 ${t.input}`}>
                      {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
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
              <select 
                value={categoryFilter} 
                onChange={e => setCategoryFilter(e.target.value)}
                className={`w-full sm:w-auto rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 ${t.input}`}
              >
                <option value="all">All Categories</option>
                <option value="income">Income</option>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
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
          </div>
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 no-print">
          <div className={`w-full max-w-md rounded-3xl p-6 shadow-2xl ${t.card}`}>
            <h3 className={`text-xl font-bold mb-4 ${t.textPrimary}`}>Save Finance Plan</h3>
            <p className={`text-sm mb-4 ${t.textMuted}`}>Give this document a name so you can quickly access it from your dashboard.</p>
            
            <div className="mb-6">
              <label className={`block text-xs font-bold uppercase mb-2 ${t.textMuted}`}>Document Name</label>
              <input 
                type="text" 
                value={docName} 
                onChange={e => setDocName(e.target.value)} 
                placeholder="e.g. 2026 Budget Plan" 
                className={`w-full rounded-xl border px-4 py-3 text-sm outline-none focus:ring-2 ${t.input}`}
                autoFocus
              />
            </div>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleSaveDocument}
                disabled={!docName.trim()}
                className="w-full py-3 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Save Document
              </button>
              
              <button 
                onClick={handleExportPdf}
                className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border transition-colors ${dark ? "bg-white/5 border-white/10 text-white hover:bg-white/10" : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"}`}
              >
                <FileText className="h-4 w-4" />
                Export as PDF
              </button>
              
              <button 
                onClick={() => setShowSaveModal(false)}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${dark ? "text-slate-400 hover:bg-white/5" : "text-slate-500 hover:bg-slate-100"}`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
