import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { Command } from "cmdk";
import {
  ArrowRight, FilePlus2, FileText, GitBranch, Keyboard, LayoutGrid, Loader2, LogOut, Monitor, Moon, PenTool, PieChart, Plus,
  Receipt, Search, Settings, StickyNote, Sun, Wallet,
} from "../lib/icons";
import { toast } from "sonner";
import { useAuth } from "../lib/auth/AuthProvider";
import { useAppTheme } from "../lib/theme";
import { formatSupabaseError } from "../lib/supabase";
import { searchItems } from "../features/links/api";
import { createDocument } from "../features/workspace/api";
import { createFlow } from "../features/flow/api";
import { openQuickCapture, openShortcuts } from "./globalEvents";

const GO = [
  { label: "Home", to: "/home", icon: LayoutGrid, keywords: "dashboard today" },
  { label: "Sticker board", to: "/sticker", icon: StickyNote, keywords: "tasks board stickers todo" },
  { label: "Done stickers", to: "/sticker?show=done", icon: StickyNote, keywords: "completed finished tasks" },
  { label: "Finance summary", to: "/finance", icon: PieChart, keywords: "money safe to spend overview" },
  { label: "Money in & out", to: "/finance/transactions", icon: Receipt, keywords: "finance transactions expenses income" },
  { label: "Budgets", to: "/finance/budgets", icon: Wallet, keywords: "finance" },
  { label: "Bills", to: "/finance/bills", icon: Wallet, keywords: "finance recurring subscriptions" },
  { label: "Savings goals", to: "/finance/goals", icon: Wallet, keywords: "finance savings" },
  { label: "Investments", to: "/finance/investments", icon: Wallet, keywords: "finance sip mutual fund" },
  { label: "Accounts", to: "/finance/accounts", icon: Wallet, keywords: "finance net worth" },
  { label: "Workspace documents", to: "/workspace", icon: PenTool, keywords: "notes notebook" },
  { label: "Flow diagrams", to: "/flow", icon: GitBranch, keywords: "diagram flowchart" },
  { label: "Settings", to: "/settings", icon: Settings, keywords: "profile user currency account" },
  { label: "Appearance", to: "/settings/appearance", icon: Sun, keywords: "theme dark light mode" },
  { label: "Help & support", to: "/help", icon: Settings, keywords: "help faq support how" },
  { label: "Privacy & my data", to: "/settings/privacy", icon: Settings, keywords: "export download privacy" },
  { label: "About taskr", to: "/settings/about", icon: Settings, keywords: "about version" },
];

const RESULT_ICONS = { task: StickyNote, document: FileText, flow: GitBranch, transaction: Receipt };
const RESULT_LABELS = { task: "Tasks", document: "Documents", flow: "Diagrams", transaction: "Transactions" };

function Item({ onSelect, icon: Icon, children, hint, value, keywords }) {
  return (
    <Command.Item value={value} keywords={keywords ? [keywords] : undefined} onSelect={onSelect} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-stone-700 aria-selected:bg-amber-50 aria-selected:text-amber-900 dark:text-stone-200 dark:aria-selected:bg-amber-500/15 dark:aria-selected:text-amber-200">
      {Icon && <Icon className="h-4 w-4 shrink-0 text-stone-400" />}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {hint && <span className="text-[11px] text-stone-400">{hint}</span>}
    </Command.Item>
  );
}

const groupClass = "px-1 pb-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-stone-400";

/** Ctrl/Cmd+K: go anywhere, create anything, search everything. */
export default function CommandPalette({ onClose }) {
  const navigate = useNavigate();
  const theme = useAppTheme();
  const { signOut } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    setSearching(true);
    timer.current = setTimeout(() => {
      // Empty query → recent documents/diagrams; otherwise title search.
      searchItems(query, { types: query.trim() ? ["task", "document", "flow", "transaction"] : ["document", "flow"], limit: query.trim() ? 5 : 4 })
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, query.trim() ? 180 : 0);
    return () => clearTimeout(timer.current);
  }, [query]);

  useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const run = (action) => () => { onClose(); action(); };
  const go = (to) => run(() => navigate(to));

  const create = (kind) => run(async () => {
    try {
      if (kind === "document") navigate(`/workspace/${(await createDocument({})).id}`);
      if (kind === "flow") navigate(`/flow/${(await createFlow({})).id}`);
    } catch (err) { toast.error(formatSupabaseError(err)); }
  });

  const grouped = results.reduce((acc, item) => { (acc[item.type] ??= []).push(item); return acc; }, {});

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-start justify-center bg-stone-900/40 p-4 pt-[12vh] backdrop-blur-sm" onMouseDown={onClose}>
      <div onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-white/10 dark:bg-ink-900">
        <Command label="Command palette" loop>
          <div className="flex items-center gap-2 border-b border-stone-100 px-4 dark:border-white/10">
            {searching && query ? <Loader2 className="h-4 w-4 animate-spin text-stone-400" /> : <Search className="h-4 w-4 text-stone-400" />}
            <Command.Input autoFocus value={query} onValueChange={setQuery} placeholder="Search or type a command…" className="h-12 flex-1 bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-400 dark:text-white" />
            <kbd className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-bold text-stone-500 dark:bg-white/10">Esc</kbd>
          </div>
          <Command.List className="max-h-[60vh] overflow-y-auto py-1">
            <Command.Empty className="px-4 py-8 text-center text-sm text-stone-500">{searching ? "Searching…" : "No results."}</Command.Empty>

            {Object.entries(grouped).map(([type, items]) => (
              <Command.Group key={type} heading={query.trim() ? RESULT_LABELS[type] : `Recent ${RESULT_LABELS[type].toLowerCase()}`} className={groupClass}>
                {items.map((item) => (
                  <Item key={`${type}-${item.id}`} value={`${type} ${item.title} ${item.id}`} icon={RESULT_ICONS[type]} onSelect={go(item.href)} hint={type === "transaction" ? item.meta.occurred_on : undefined}>
                    <span className={item.done ? "line-through opacity-60" : ""}>{item.title}</span>
                  </Item>
                ))}
              </Command.Group>
            ))}

            <Command.Group heading="Create" className={groupClass}>
              <Item value="new sticker" keywords="add capture todo task" icon={Plus} onSelect={run(() => openQuickCapture("task"))} hint="Alt N">New sticker</Item>
              <Item value="new expense" keywords="add spend money" icon={Plus} onSelect={run(() => openQuickCapture("expense"))}>New expense</Item>
              <Item value="new income" keywords="add salary money" icon={Plus} onSelect={run(() => openQuickCapture("income"))}>New income</Item>
              <Item value="new document" keywords="create note workspace" icon={FilePlus2} onSelect={create("document")}>New document</Item>
              <Item value="new diagram" keywords="create flow flowchart" icon={GitBranch} onSelect={create("flow")}>New diagram</Item>
            </Command.Group>

            <Command.Group heading="Go to" className={groupClass}>
              {GO.map((item) => <Item key={item.to} value={`go ${item.label}`} keywords={item.keywords} icon={item.icon} onSelect={go(item.to)}>{item.label}</Item>)}
            </Command.Group>

            <Command.Group heading="Preferences" className={groupClass}>
              <Item value="theme light" icon={Sun} onSelect={run(() => theme.setPreference("light"))} hint={theme.preference === "light" ? "current" : undefined}>Light theme</Item>
              <Item value="theme dark" icon={Moon} onSelect={run(() => theme.setPreference("dark"))} hint={theme.preference === "dark" ? "current" : undefined}>Dark theme</Item>
              <Item value="theme system" icon={Monitor} onSelect={run(() => theme.setPreference("system"))} hint={theme.preference === "system" ? "current" : undefined}>Match system theme</Item>
              <Item value="keyboard shortcuts help" icon={Keyboard} onSelect={run(openShortcuts)} hint="?">Keyboard shortcuts</Item>
              <Item value="sign out log out" icon={LogOut} onSelect={run(async () => { await signOut(); navigate("/", { replace: true }); })}>Log out</Item>
            </Command.Group>
          </Command.List>
          <div className="flex items-center justify-between border-t border-stone-100 px-4 py-2 text-[11px] text-stone-400 dark:border-white/10">
            <span>↑↓ to move · Enter to open</span>
            <span className="inline-flex items-center gap-1">Search covers tasks, documents, diagrams and transactions <ArrowRight className="h-3 w-3" /></span>
          </div>
        </Command>
      </div>
    </div>,
    document.body
  );
}
