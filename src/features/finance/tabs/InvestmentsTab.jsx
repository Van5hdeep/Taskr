import { useState } from "react";
import { Archive, LineChart, Pencil, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import Modal from "../../../components/ui/Modal";
import { useConfirm } from "../../../components/ui/ConfirmDialog";
import { useMoneyFormat } from "../../../lib/profile";
import { useFinance } from "../FinanceStore";
import { holdingGain, parseDay, sumAmounts, toDay } from "../calc";
import { HOLDING_KINDS } from "../defaults";
import { buttonGhost, buttonPrimary, Card, Donut, EmptyState, Field, inputClass, MoneyInput } from "../components/ui";

function nextSipDate(day) {
  const today = new Date();
  const candidate = new Date(today.getFullYear(), today.getMonth(), day);
  if (candidate < new Date(today.getFullYear(), today.getMonth(), today.getDate())) candidate.setMonth(candidate.getMonth() + 1);
  return toDay(candidate);
}

function HoldingForm({ holding, onClose }) {
  const { create, update, categories, recurring } = useFinance();
  const [form, setForm] = useState({
    name: holding?.name ?? "",
    kind: holding?.kind ?? "mutual_fund",
    units: holding?.units ?? "",
    invested_amount: holding ? String(holding.invested_amount) : "",
    current_value: holding ? String(holding.current_value) : "",
    sip_amount: holding?.sip_amount ? String(holding.sip_amount) : "",
    sip_day: holding?.sip_day ?? 5,
    maturity_date: holding?.maturity_date ?? "",
    notes: holding?.notes ?? "",
  });
  const hasSipBill = holding && recurring.some((item) => item.title === `SIP · ${holding.name}`);
  const [addSipBill, setAddSipBill] = useState(!hasSipBill);
  const [saving, setSaving] = useState(false);
  const set = (patch) => setForm((current) => ({ ...current, ...patch }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const invested = Number(form.invested_amount) || 0;
    const row = {
      name: form.name.trim(),
      kind: form.kind,
      units: form.units === "" ? null : Number(form.units),
      invested_amount: invested,
      current_value: form.current_value === "" ? invested : Number(form.current_value),
      value_updated_on: toDay(new Date()),
      sip_amount: form.sip_amount ? Number(form.sip_amount) : null,
      sip_day: form.sip_amount ? Number(form.sip_day) : null,
      maturity_date: form.maturity_date || null,
      notes: form.notes.trim() || null,
    };
    try {
      if (holding) await update("holdings", holding.id, row);
      else await create("holdings", row);
      // A SIP is money leaving every month, so it belongs with the bills.
      if (row.sip_amount && addSipBill && !hasSipBill) {
        await create("recurring", {
          title: `SIP · ${row.name}`,
          kind: "expense",
          amount: row.sip_amount,
          cadence: "monthly",
          next_due_on: nextSipDate(row.sip_day),
          category_id: categories.find((category) => category.kind === "expense" && category.name === "Investments")?.id ?? null,
        });
        toast.success("SIP added to Bills & subscriptions");
      }
      onClose();
    } catch { setSaving(false); }
  };

  return (
    <Modal title={holding ? "Edit investment" : "Add investment"} onClose={onClose} footer={<><button type="button" onClick={onClose} className={buttonGhost}>Cancel</button><button type="submit" form="holding-form" disabled={saving} className={buttonPrimary}>Save</button></>}>
      <form id="holding-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2"><input className={inputClass} value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Parag Parikh Flexi Cap, SBI FD, Sovereign Gold Bond…" required autoFocus /></Field>
        <Field label="Type"><select className={inputClass} value={form.kind} onChange={(e) => set({ kind: e.target.value })}>{HOLDING_KINDS.map((kind) => <option key={kind.id} value={kind.id}>{kind.label}</option>)}</select></Field>
        <Field label="Units (optional)"><input type="number" step="any" min="0" className={inputClass} value={form.units} onChange={(e) => set({ units: e.target.value })} /></Field>
        <Field label="Amount invested"><MoneyInput value={form.invested_amount} onChange={(invested_amount) => set({ invested_amount })} /></Field>
        <Field label="Current value" hint="Leave empty to use the invested amount."><MoneyInput value={form.current_value} onChange={(current_value) => set({ current_value })} /></Field>
        <Field label="Monthly SIP (optional)"><MoneyInput value={form.sip_amount} onChange={(sip_amount) => set({ sip_amount })} /></Field>
        <Field label="SIP date"><select className={inputClass} value={form.sip_day} onChange={(e) => set({ sip_day: Number(e.target.value) })} disabled={!form.sip_amount}>{Array.from({ length: 28 }, (_, i) => i + 1).map((day) => <option key={day} value={day}>{day}</option>)}</select></Field>
        {["fd", "rd", "nps", "epf_ppf", "other"].includes(form.kind) && (
          <Field label="Maturity date"><input type="date" className={inputClass} value={form.maturity_date} onChange={(e) => set({ maturity_date: e.target.value })} /></Field>
        )}
        <Field label="Notes" className="sm:col-span-2"><input className={inputClass} value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Folio number, platform, interest rate…" /></Field>
        {form.sip_amount && !hasSipBill && (
          <label className="sm:col-span-2 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><input type="checkbox" checked={addSipBill} onChange={(e) => setAddSipBill(e.target.checked)} className="accent-blue-600" /> Add the SIP to Bills so it counts in safe-to-spend and gets a reminder</label>
        )}
      </form>
    </Modal>
  );
}

function UpdateValueForm({ holding, onClose }) {
  const { updateHoldingValue } = useFinance();
  const [value, setValue] = useState(String(holding.current_value));
  const [saving, setSaving] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try { await updateHoldingValue(holding, Number(value) || 0); onClose(); } catch { setSaving(false); }
  };
  return (
    <Modal title={`Update ${holding.name}`} description="Today's value from your broker, app or statement." onClose={onClose} size="sm" footer={<><button type="button" onClick={onClose} className={buttonGhost}>Cancel</button><button type="submit" form="value-form" disabled={saving} className={buttonPrimary}>Save</button></>}>
      <form id="value-form" onSubmit={submit}><Field label="Current value"><MoneyInput value={value} onChange={setValue} autoFocus /></Field></form>
    </Modal>
  );
}

export default function InvestmentsTab() {
  const { holdings, update } = useFinance();
  const money = useMoneyFormat();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null);
  const [valuing, setValuing] = useState(null);
  const active = holdings.filter((holding) => !holding.archived_at);

  const invested = sumAmounts(active, (holding) => holding.invested_amount);
  const current = sumAmounts(active, (holding) => holding.current_value);
  const gain = current - invested;
  const monthlySip = sumAmounts(active.filter((holding) => holding.sip_amount), (holding) => holding.sip_amount);
  const slices = HOLDING_KINDS.map((kind) => ({ id: kind.id, label: kind.label, color: kind.color, value: sumAmounts(active.filter((holding) => holding.kind === kind.id), (holding) => holding.current_value) })).filter((slice) => slice.value > 0);

  const archive = async (holding) => {
    if (!(await confirm({ title: `Archive ${holding.name}?`, message: "Use this when you've sold or closed it.", confirmText: "Archive" }))) return;
    await update("holdings", holding.id, { archived_at: new Date().toISOString() });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        <Card><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Current value</p><p className="mt-1 text-xl font-extrabold tabular-nums text-slate-900 dark:text-white">{money(current)}</p></Card>
        <Card><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Invested</p><p className="mt-1 text-xl font-extrabold tabular-nums text-slate-900 dark:text-white">{money(invested)}</p></Card>
        <Card><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Gain / loss</p><p className={`mt-1 text-xl font-extrabold tabular-nums ${gain >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{gain >= 0 ? "+" : "−"}{money(Math.abs(gain))}{invested > 0 && <span className="ml-1 text-sm">({((gain / invested) * 100).toFixed(1)}%)</span>}</p></Card>
        <Card><p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Monthly SIPs</p><p className="mt-1 text-xl font-extrabold tabular-nums text-slate-900 dark:text-white">{money(monthlySip)}</p></Card>
      </div>

      <div className="flex justify-end"><button type="button" onClick={() => setEditing("new")} className={buttonPrimary}><Plus className="h-4 w-4" /> Add investment</button></div>

      {active.length ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0f1733]">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 dark:border-white/10"><tr><th className="px-4 py-3">Investment</th><th className="px-3 py-3 text-right">Invested</th><th className="px-3 py-3 text-right">Value</th><th className="px-3 py-3 text-right">Gain</th><th className="px-3 py-3" /></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {active.map((holding) => {
                  const { gain: g, pct } = holdingGain(holding);
                  const kind = HOLDING_KINDS.find((item) => item.id === holding.kind);
                  return (
                    <tr key={holding.id}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900 dark:text-white">{holding.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: kind?.color }} />{kind?.label}
                          {holding.sip_amount ? ` · SIP ${money(holding.sip_amount)} on day ${holding.sip_day}` : ""}
                          {holding.maturity_date ? ` · matures ${parseDay(holding.maturity_date).toLocaleDateString(undefined, { month: "short", year: "numeric" })}` : ""}
                          {` · updated ${parseDay(holding.value_updated_on).toLocaleDateString(undefined, { day: "numeric", month: "short" })}`}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">{money(holding.invested_amount)}</td>
                      <td className="px-3 py-3 text-right font-bold tabular-nums text-slate-900 dark:text-white">{money(holding.current_value)}</td>
                      <td className={`px-3 py-3 text-right tabular-nums ${g >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>{g >= 0 ? "+" : "−"}{money(Math.abs(g))}{pct != null && <span className="block text-[11px]">{(pct * 100).toFixed(1)}%</span>}</td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-1">
                          <button type="button" onClick={() => setValuing(holding)} title="Update value" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"><RefreshCw className="h-4 w-4" /></button>
                          <button type="button" onClick={() => setEditing(holding)} title="Edit" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"><Pencil className="h-4 w-4" /></button>
                          <button type="button" onClick={() => archive(holding)} title="Archive (sold/closed)" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"><Archive className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Card title="Allocation">
            <div className="flex flex-col items-center gap-4">
              <Donut slices={slices} centerLabel="Total" centerValue={money(current)} />
              <ul className="w-full space-y-1.5 text-xs">
                {slices.map((slice) => (
                  <li key={slice.id} className="flex justify-between"><span className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: slice.color }} />{slice.label}</span><span className="font-semibold tabular-nums text-slate-900 dark:text-white">{((slice.value / current) * 100).toFixed(1)}%</span></li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      ) : (
        <EmptyState icon={LineChart} title="No investments tracked" action={<button type="button" onClick={() => setEditing("new")} className={buttonPrimary}><Plus className="h-4 w-4" /> Add investment</button>}>
          Mutual funds, stocks, FDs, gold, EPF/PPF, NPS — add what you hold and update values when you check them.
        </EmptyState>
      )}

      {editing && <HoldingForm holding={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
      {valuing && <UpdateValueForm holding={valuing} onClose={() => setValuing(null)} />}
    </div>
  );
}
