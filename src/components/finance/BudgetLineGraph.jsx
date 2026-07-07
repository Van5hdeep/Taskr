import React, { useState, useMemo } from 'react';

export default function BudgetLineGraph({ transactions, budget, recordPeriod, dark, t }) {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const chartData = useMemo(() => {
    const now = new Date();
    let points = [];
    
    if (recordPeriod === "week") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday as start
      
      for (let i = 0; i < 7; i++) {
        const d = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        points.push({
          label: d.toLocaleDateString(undefined, { weekday: 'short' }),
          dateMatch: (txDate) => {
            const td = new Date(txDate);
            return td.getDate() === d.getDate() && td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
          }
        });
      }
    } else if (recordPeriod === "month") {
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      // Group by weeks or chunks of days to avoid 31 points (too cramped)
      // Let's do 6 points (every 5 days) for simplicity, or just 10 points
      const numPoints = 6;
      const step = Math.max(1, Math.floor(daysInMonth / numPoints));
      for (let i = 1; i <= daysInMonth; i += step) {
        points.push({
          label: `Day ${i}`,
          dateMatch: (txDate) => {
            const td = new Date(txDate);
            const d = td.getDate();
            return td.getMonth() === now.getMonth() && td.getFullYear() === now.getFullYear() && d >= i && d < i + step;
          }
        });
      }
    } else {
      // year
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), i, 1);
        points.push({
          label: d.toLocaleDateString(undefined, { month: 'short' }),
          dateMatch: (txDate) => {
            const td = new Date(txDate);
            return td.getMonth() === i && td.getFullYear() === now.getFullYear();
          }
        });
      }
    }

    let cumulativeExpense = 0;
    
    return points.map(pt => {
      // Actual expenses in this bucket
      const bucketExpenses = transactions.filter(tx => tx.type === "expense" && pt.dateMatch(tx.date)).reduce((s, tx) => s + tx.amount, 0);
      cumulativeExpense += bucketExpenses;
      
      return {
        label: pt.label,
        expense: cumulativeExpense,
        income: budget // Budget is static Income for this graph representation
      };
    });
  }, [transactions, budget, recordPeriod]);

  const maxVal = Math.max(
    ...chartData.map(d => Math.max(d.income, d.expense)), 
    budget * 1.2,
    100 // minimum scale
  );

  const isOverBudget = chartData[chartData.length - 1]?.expense > budget;
  const expenseColor = isOverBudget ? "#ef4444" : "#10b981"; // red-500 or emerald-500
  const incomeColor = "#3b82f6"; // blue-500

  // SVG dimensions
  const w = 600;
  const h = 250;
  const padX = 40;
  const padY = 30;

  const getX = (index) => padX + (index * ((w - padX * 2) / Math.max(1, chartData.length - 1)));
  const getY = (val) => h - padY - ((val / maxVal) * (h - padY * 2));

  // Generate bezier path for smoothness
  const generatePath = (data, key) => {
    if (data.length === 0) return "";
    let path = `M ${getX(0)} ${getY(data[0][key])}`;
    for (let i = 0; i < data.length - 1; i++) {
      const x1 = getX(i);
      const y1 = getY(data[i][key]);
      const x2 = getX(i + 1);
      const y2 = getY(data[i + 1][key]);
      
      const cx1 = x1 + (x2 - x1) / 3;
      const cx2 = x2 - (x2 - x1) / 3;
      
      path += ` C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`;
    }
    return path;
  };

  const expensePath = generatePath(chartData, 'expense');
  const incomePath = generatePath(chartData, 'income');

  return (
    <div className={`rounded-3xl p-6 shadow-sm border ${dark ? "bg-[#161f42]/60 border-blue-500/10" : "bg-white border-slate-200"} print:shadow-none print:border-slate-300 w-full`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-base font-bold ${t.textPrimary} print:text-black`}>Budget vs Spending</h3>
        <div className="flex gap-4 text-xs font-bold">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className={t.textMuted}>Budget (Income)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-full ${isOverBudget ? "bg-red-500" : "bg-emerald-500"}`} />
            <span className={t.textMuted}>Actual (Expenses)</span>
          </div>
        </div>
      </div>

      <div className="relative w-full overflow-hidden" style={{ aspectRatio: '600/250' }}>
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full overflow-visible">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(pct => {
            const y = h - padY - (pct * (h - padY * 2));
            return (
              <g key={pct}>
                <line x1={padX} y1={y} x2={w - padX} y2={y} stroke={dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} strokeWidth="1" strokeDasharray="4 4" />
                <text x={padX - 8} y={y + 4} textAnchor="end" fontSize="10" fill={dark ? "#64748b" : "#94a3b8"} className="font-medium">
                  {pct > 0 ? (maxVal * pct / 1000).toFixed(1) + 'k' : '0'}
                </text>
              </g>
            );
          })}
          
          {/* Income Line */}
          <path d={incomePath} fill="none" stroke={incomeColor} strokeWidth="3" className="transition-all duration-1000 ease-out" />
          
          {/* Expense Line */}
          <path d={expensePath} fill="none" stroke={expenseColor} strokeWidth="3" className="transition-all duration-1000 ease-out" />

          {/* X Axis Labels & Interactive Points */}
          {chartData.map((d, i) => {
            const x = getX(i);
            const ey = getY(d.expense);
            const iy = getY(d.income);
            const isHovered = hoveredPoint === i;

            return (
              <g key={i}>
                <text x={x} y={h - 10} textAnchor="middle" fontSize="10" fill={dark ? "#64748b" : "#94a3b8"} className="font-bold">
                  {d.label}
                </text>
                
                {/* Interactive Area */}
                <rect 
                  x={x - 20} y={0} width={40} height={h} fill="transparent" 
                  onMouseEnter={() => setHoveredPoint(i)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  className="cursor-crosshair"
                />

                {/* Points */}
                <circle cx={x} cy={iy} r={isHovered ? 6 : 4} fill={dark ? "#0f172a" : "#ffffff"} stroke={incomeColor} strokeWidth="2" className={`transition-all ${isHovered ? 'opacity-100' : 'opacity-0 sm:opacity-100'}`} pointerEvents="none" />
                <circle cx={x} cy={ey} r={isHovered ? 6 : 4} fill={dark ? "#0f172a" : "#ffffff"} stroke={expenseColor} strokeWidth="2" className={`transition-all ${isHovered ? 'opacity-100' : 'opacity-0 sm:opacity-100'}`} pointerEvents="none" />
                
                {/* Tooltip Line */}
                {isHovered && (
                  <line x1={x} y1={padY} x2={x} y2={h - padY} stroke={dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} strokeWidth="1" strokeDasharray="2 2" pointerEvents="none" />
                )}
              </g>
            );
          })}
        </svg>

        {/* HTML Tooltip for better text rendering */}
        {hoveredPoint !== null && (
          <div 
            className="absolute top-2 pointer-events-none rounded-lg p-3 shadow-xl backdrop-blur-md border text-xs font-bold z-10 min-w-[140px] transition-all"
            style={{ 
              left: `${Math.max(10, Math.min(90, (hoveredPoint / (chartData.length - 1)) * 100))}%`,
              transform: 'translateX(-50%)',
              backgroundColor: dark ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
              borderColor: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              color: dark ? '#f8fafc' : '#0f172a'
            }}
          >
            <div className="mb-2 pb-2 border-b border-slate-500/20 text-center opacity-80">{chartData[hoveredPoint].label}</div>
            <div className="flex justify-between items-center mb-1 gap-4">
              <span className="text-blue-500">Budget</span>
              <span>{formatCurrency(chartData[hoveredPoint].income)}</span>
            </div>
            <div className="flex justify-between items-center gap-4">
              <span className={expenseColor === "#ef4444" ? "text-red-500" : "text-emerald-500"}>Expense</span>
              <span>{formatCurrency(chartData[hoveredPoint].expense)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
