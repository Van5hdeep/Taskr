import { NavLink, Navigate, useParams } from "react-router";
import { Loader2 } from "../../lib/icons";
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

// Plain-language names, each with one line saying what the tab is for.
const TABS = [
  { id: "overview", label: "Summary", about: "This month at a glance: what came in, what went out, and what you can still spend.", component: OverviewTab },
  { id: "transactions", label: "Money in & out", about: "Everything you earn or spend. Add one with the button, or import a bank statement (CSV).", component: TransactionsTab },
  { id: "budgets", label: "Budgets", about: "Set a monthly limit for a category (like Food) and see how much is left.", component: BudgetsTab },
  { id: "bills", label: "Bills", about: "Rent, subscriptions and EMIs that repeat. Mark them paid when they're paid.", component: BillsTab },
  { id: "goals", label: "Savings goals", about: "Something you're saving for. Set a target and taskr shows the monthly amount needed.", component: GoalsTab },
  { id: "investments", label: "Investments", about: "Mutual funds, stocks, FDs, gold… Type in today's value now and then to track growth.", component: InvestmentsTab },
  { id: "accounts", label: "Accounts", about: "Where your money sits: bank, cash, wallet, card. Add, edit, archive or delete any of them.", component: AccountsTab },
];

function FinanceContent({ tab }) {
  const { loading, error, reload } = useFinance();
  const Active = tab.component;
  if (loading) return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>;
  if (error) {
    return (
      <div>
        <StatusBanner message={error} />
        <button type="button" onClick={reload} className="text-sm font-semibold text-amber-700 hover:underline">Try again</button>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <p className="text-sm text-stone-500 dark:text-stone-400 print:hidden">{tab.about}</p>
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
        <header className="mb-5 print:hidden">
          <h1 className="font-brand text-2xl font-semibold tracking-[-0.03em] text-stone-900 dark:text-white">Finance</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400">Where your money is, what's coming, and what's safe to spend.</p>
        </header>
        <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-stone-200 dark:border-white/10 print:hidden" aria-label="Finance sections">
          {TABS.map((item) => (
            <NavLink
              key={item.id}
              to={item.id === "overview" ? "/finance" : `/finance/${item.id}`}
              end
              className={({ isActive }) => `whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${isActive ? "border-amber-600 text-amber-800 dark:text-amber-300" : "border-transparent text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"}`}
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
