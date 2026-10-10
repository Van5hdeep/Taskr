import { useState } from "react";
import { Archive, ArchiveRestore, ArrowLeftRight, Pencil, Plus, Scale, Wallet } from "lucide-react";
import Modal from "../../../components/ui/Modal";
import { useConfirm } from "../../../components/ui/ConfirmDialog";
import { useMoneyFormat } from "../../../lib/profile";
import { useFinance } from "../FinanceStore";
import { isLiability, netWorth, toDay, toMinor } from "../calc";
import { ACCOUNT_KINDS } from "../defaults";
import TransactionForm from "../components/TransactionForm";
import { buttonGhost, buttonPrimary, buttonSecondary, Card, EmptyState, Field, inputClass, MoneyInput } from "../components/ui";

function AccountForm({ account, onClose }) {
  const { create, update } = useFinance();
  const [form, setForm] = useState({
    name: account?.name ?? "",
    kind: account?.kind ?? "bank",
    opening_balance: account ? String(Math.abs(account.opening_balance)) : "0",
    owed: account ? Number(account.opening_balance) < 0 : false,
  });
  const [saving, setSaving] = useState(false);
  const liability = ["card", "loan"].includes(form.kind);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const amount = Number(form.opening_balance) || 0;
    // Money owed on a card or loan is stored as a negative opening balance.
    const opening = liability || form.owed ? -Math.abs(amount) : amount;
    const row = { name: form.name.trim(), kind: form.kind, opening_balance: opening };
    try {
      if (account) await update("accounts", account.id, row);
      else await create("accounts", row);
      onClose();
    } catch { setSaving(false); }
  };

  return (
    <Modal
      title={account ? "Edit account" : "New account"}
      onClose={onClose}
      footer={<><button type="button" onClick={onClose} className={buttonGhost}>Cancel</button><button type="submit" form="account-form" disabled={saving} className={buttonPrimary}>Save</button></>}
    >
      <form id="account-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2"><input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="HDFC savings, GPay wallet, Amex…" autoFocus required /></Field>
        <Field label="Type">
          <select className={inputClass} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>{ACCOUNT_KINDS.map((kind) => <option key={kind.id} value={kind.id}>{kind.label}</option>)}</select>
        </Field>
        <Field label={liability ? "Amount owed at start" : "Starting balance"} hint={account ? "Balance before the first transaction recorded here." : "What's in it today, before you add transactions."}>
          <MoneyInput value={form.opening_balance} onChange={(opening_balance) => setForm({ ...form, opening_balance })} />
        </Field>
      </form>
    </Modal>
  );
}

function ReconcileForm({ account, balance, onClose }) {
  const { create } = useFinance();
  const money = useMoneyFormat();
  const [actual, setActual] = useState(String(Math.abs(balance)));
  const [saving, setSaving] = useState(false);
  const liability = isLiability(account);
  const target = liability ? -Math.abs(Number(actual) || 0) : Number(actual) || 0;
  const difference = (toMinor(target) - toMinor(balance)) / 100;

  const submit = async (event) => {
    event.preventDefault();
    if (!difference) { onClose(); return; }
    setSaving(true);
    try {
      await create("transactions", {
        kind: difference > 0 ? "income" : "expense",
        amount: Math.abs(difference),
        title: "Balance adjustment",
        notes: "Reconciled to the actual balance",
        account_id: account.id,
        occurred_on: toDay(new Date()),
      });
      onClose();
    } catch { setSaving(false); }
  };

  return (
    <Modal
      title={`Reconcile ${account.name}`}
      description="Enter the real balance from your bank or app. TASKR records the difference as an adjustment."
      onClose={onClose}
      size="sm"
      footer={<><button type="button" onClick={onClose} className={buttonGhost}>Cancel</button><button type="submit" form="reconcile-form" disabled={saving} className={buttonPrimary}>Save</button></>}
    >
      <form id="reconcile-form" onSubmit={submit} className="space-y-3">
        <Field label={liability ? "Actual amount owed" : "Actual balance"}><MoneyInput value={actual} onChange={setActual} autoFocus /></Field>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          TASKR shows {money(Math.abs(balance))}{liability ? " owed" : ""}. {difference ? `An adjustment of ${difference > 0 ? "+" : "−"}${money(Math.abs(difference))} will be added.` : "Nothing to adjust."}
        </p>
      </form>
    </Modal>
  );
}

export default function AccountsTab() {
  const { accounts, balances, holdings, update } = useFinance();
  const money = useMoneyFormat();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null);
  const [reconciling, setReconciling] = useState(null);
  const [transferring, setTransferring] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const worth = netWorth(accounts, balances, holdings);
  const visible = accounts.filter((account) => showArchived || !account.is_archived);

  const toggleArchive = async (account) => {
    if (!account.is_archived && !(await confirm({ title: `Archive ${account.name}?`, message: "It's hidden from forms; its history stays in reports.", confirmText: "Archive" }))) return;
    await update("accounts", account.id, { is_archived: !account.is_archived });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        {[["Net worth", worth.total], ["Cash & accounts", worth.assets], ["Investments", worth.investments], ["Owed", worth.liabilities]].map(([label, value]) => (
          <Card key={label}><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p><p className="mt-1 text-xl font-extrabold tabular-nums text-slate-900 dark:text-white">{money(value)}</p></Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500"><input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="accent-blue-600" /> Show archived</label>
        <div className="flex gap-2">
          <button type="button" onClick={() => setTransferring(true)} disabled={accounts.filter((a) => !a.is_archived).length < 2} className={buttonSecondary}><ArrowLeftRight className="h-4 w-4" /> Transfer</button>
          <button type="button" onClick={() => setEditing("new")} className={buttonPrimary}><Plus className="h-4 w-4" /> Add account</button>
        </div>
      </div>

      {visible.length ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((account) => {
            const balance = balances[account.id] ?? 0;
            const owed = balance < 0;
            return (
              <Card key={account.id} className={account.is_archived ? "opacity-60" : ""}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{account.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{ACCOUNT_KINDS.find((kind) => kind.id === account.kind)?.label}</p>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => setReconciling(account)} title="Reconcile with actual balance" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5"><Scale className="h-4 w-4" /></button>
                    <button type="button" onClick={() => setEditing(account)} title="Edit" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5"><Pencil className="h-4 w-4" /></button>
                    <button type="button" onClick={() => toggleArchive(account)} title={account.is_archived ? "Restore" : "Archive"} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5">{account.is_archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}</button>
                  </div>
                </div>
                <p className={`mt-4 text-2xl font-extrabold tabular-nums ${owed ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"}`}>{money(Math.abs(balance))}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{owed ? "owed" : "available"}</p>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={Wallet} title="No accounts" action={<button type="button" onClick={() => setEditing("new")} className={buttonPrimary}><Plus className="h-4 w-4" /> Add account</button>}>Add your bank, cash, wallet, card or loan accounts.</EmptyState>
      )}

      {editing && <AccountForm account={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {reconciling && <ReconcileForm account={reconciling} balance={balances[reconciling.id] ?? 0} onClose={() => setReconciling(null)} />}
      {transferring && <TransactionForm initial={{ kind: "transfer" }} onClose={() => setTransferring(false)} />}
    </div>
  );
}
