import { NavLink, Navigate, useParams } from "react-router";
import { Loader2, WalletCards } from "lucide-react";
import StatusBanner from "../../components/ui/StatusBanner";
import { FinanceProvider, useFinance } from "./FinanceStore";
import LocalImportBanner from "./components/LocalImportBanner";
import OverviewTab from "./tabs/OverviewTab";
import TransactionsTab from "./tabs/TransactionsTab";
import BudgetsTab from "./tabs/BudgetsTab";
import BillsTab from "./tabs/BillsTab";
import GoalsTab from "./tabs/GoalsTab";
import InvestmentsTab from "./tabs/InvestmentsTab";
import AccountsTab from "./tabs/AccountsTab";

const TABS = [
  { id: "overview", label: "Overview", component: OverviewTab },
  { id: "transactions", label: "Transactions", component: TransactionsTab },
  { id: "budgets", label: "Budgets", component: BudgetsTab },
  { id: "bills", label: "Bills & subscriptions", component: BillsTab },
  { id: "goals", label: "Goals", component: GoalsTab },
  { id: "investments", label: "Investments", component: InvestmentsTab },
  { id: "accounts", label: "Accounts", component: AccountsTab },
];

function FinanceContent({ tab }) {
  const { loading, error, reload } = useFinance();
  const Active = tab.component;
  if (loading) return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>;
  if (error) {
    return (
      <div>
        <StatusBanner message={error} />
        <button type="button" onClick={reload} className="text-sm font-semibold text-blue-600 hover:underline">Try again</button>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <LocalImportBanner />
      <Active />
    </div>
  );
}

export default function FinancePage() {
  const { tab: tabId } = useParams();
  const tab = TABS.find((item) => item.id === (tabId ?? "overview"));
  if (!tab) return <Navigate to="/finance" replace />;

  return (
    <FinanceProvider>
      <main className="mx-auto w-full max-w-[1400px] px-4 py-6 pb-28 sm:px-6 lg:px-8">
        <header className="mb-5 flex items-center gap-3 print:hidden">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-300"><WalletCards className="h-5 w-5" /></span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Finance</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Where your money is, what's coming, and what's safe to spend.</p>
          </div>
        </header>
        <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-white/10 print:hidden" aria-label="Finance sections">
          {TABS.map((item) => (
            <NavLink
              key={item.id}
              to={item.id === "overview" ? "/finance" : `/finance/${item.id}`}
              end
              className={({ isActive }) => `whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${isActive ? "border-blue-600 text-blue-700 dark:text-blue-300" : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <FinanceContent tab={tab} />
      </main>
    </FinanceProvider>
  );
}
