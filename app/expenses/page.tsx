"use client";

import { PageHeader, Card, Kpi } from "@/components/ui";
import {
  Camera,
  Plus,
  Trash2,
  TrendingDown,
  Download,
  Receipt,
  Zap,
  Home,
  Utensils,
  Wrench,
  Sparkles,
  Package as PackageIcon,
  Megaphone,
  Truck,
  ShieldCheck,
  MoreHorizontal,
  Check,
  X as XIcon,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import { useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Modal, Field, Input, Select, Textarea } from "@/components/Modal";
import { useToast } from "@/components/Toaster";
import { downloadText, toCSV } from "@/lib/export";
import { useAuth } from "@/lib/AuthProvider";
import { canPerform } from "@/lib/roles";
import clsx from "clsx";

const WASTAGE_REASONS = [
  "Spoiled",
  "Dropped",
  "Overcooked",
  "Customer return",
  "Staff meal",
  "Complimentary",
  "Shift-end discard",
];

const EXPENSE_CATEGORIES = [
  "Utilities",
  "Rent",
  "Staff Meals",
  "Maintenance",
  "Supplies",
  "Packaging",
  "Marketing",
  "Transport",
  "Licenses & Insurance",
  "Other",
];

const CATEGORY_ICONS: Record<string, any> = {
  Utilities: Zap,
  Rent: Home,
  "Staff Meals": Utensils,
  Maintenance: Wrench,
  Supplies: Sparkles,
  Packaging: PackageIcon,
  Marketing: Megaphone,
  Transport: Truck,
  "Licenses & Insurance": ShieldCheck,
  Other: MoreHorizontal,
};

const CATEGORY_TONES: Record<string, string> = {
  Utilities: "bg-amber-100 text-amber-800",
  Rent: "bg-violet-100 text-violet-800",
  "Staff Meals": "bg-rose-100 text-rose-800",
  Maintenance: "bg-sky-100 text-sky-800",
  Supplies: "bg-emerald-100 text-emerald-800",
  Packaging: "bg-orange-100 text-orange-800",
  Marketing: "bg-pink-100 text-pink-800",
  Transport: "bg-indigo-100 text-indigo-800",
  "Licenses & Insurance": "bg-teal-100 text-teal-800",
  Other: "bg-ink-100 text-ink-800",
};

export default function ExpensesPage() {
  const [tab, setTab] = useState<"expenses" | "wastage">("expenses");
  const { user } = useAuth();
  const canApprove = canPerform(user?.role, "wastage.approve");

  const { data: expData, refresh: refreshExp } = useApi<{ items: any[] }>(
    "/api/expenses?limit=200"
  );
  const { data: expSummary, refresh: refreshExpSummary } = useApi<any>(
    "/api/expenses/summary"
  );
  const { data: wasteData, refresh: refreshWaste } = useApi<{ logs: any[] }>(
    "/api/wastage"
  );
  const { data: wasteSummary, refresh: refreshWasteSummary } = useApi<any>(
    "/api/wastage/summary"
  );

  const [loggingExpense, setLoggingExpense] = useState(false);
  const [loggingWastage, setLoggingWastage] = useState(false);
  const [withPhoto, setWithPhoto] = useState(false);
  const toast = useToast();

  const expenses = expData?.items ?? [];
  const logs = wasteData?.logs ?? [];
  const expSum = expSummary ?? { today: 0, month: 0, thirty: 0, pending: 0, byCategory: {} };
  const wSum = wasteSummary ?? { today: 0, weekCost: 0, byReason: {}, pendingApproval: 0 };

  const todayTotal = (expSum.today ?? 0) + (wSum.today ?? 0);

  async function approveWaste(id: string) {
    try {
      await api.post(`/api/wastage/${id}/approve`);
      toast("Wastage approved", "success");
      refreshWaste();
      refreshWasteSummary();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function approveExpense(id: string) {
    try {
      await api.post(`/api/expenses/${id}/approve`);
      toast("Expense approved", "success");
      refreshExp();
      refreshExpSummary();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function deleteExpense(e: any) {
    if (!confirm(`Delete this ${e.category} expense of Rs ${e.amount.toLocaleString()}?`)) return;
    try {
      await api.del(`/api/expenses/${e.id}`);
      toast("Expense deleted", "success");
      refreshExp();
      refreshExpSummary();
    } catch (err: any) {
      toast(err.message, "error");
    }
  }

  function exportExpensesCSV() {
    const csv = toCSV(expenses, [
      { key: "at", header: "Date", map: (v) => new Date(v).toISOString() },
      { key: "category", header: "Category" },
      { key: "subcategory", header: "Subcategory" },
      { key: "description", header: "Description" },
      { key: "amount", header: "Amount" },
      { key: "paymentMethod", header: "Payment method" },
      { key: "vendor", header: "Vendor" },
      { key: "loggedByName", header: "Logged by" },
      { key: "approved", header: "Approved" },
      { key: "recurring", header: "Recurring" },
    ]);
    downloadText(`expenses-${Date.now()}.csv`, csv);
    toast(`Exported ${expenses.length} expenses`, "success");
  }

  function exportWastageCSV() {
    const csv = toCSV(logs, [
      { key: "at", header: "At", map: (v) => new Date(v).toISOString() },
      { key: "itemName", header: "Item" },
      { key: "qty", header: "Qty" },
      { key: "unit", header: "Unit" },
      { key: "cost", header: "Cost" },
      { key: "reason", header: "Reason" },
      { key: "staffName", header: "Staff" },
      { key: "shift", header: "Shift" },
      { key: "approved", header: "Approved" },
    ]);
    downloadText(`wastage-${Date.now()}.csv`, csv);
    toast(`Exported ${logs.length} logs`, "success");
  }

  const topCategory = useMemo(() => {
    const map = expSum.byCategory ?? {};
    const entries = Object.entries(map) as [string, any][];
    if (entries.length === 0) return null;
    return entries.sort((a, b) => b[1].amount - a[1].amount)[0];
  }, [expSum]);

  return (
    <>
      <PageHeader
        title="Expenses & Wastage"
        subtitle="Every cost that touches the business — purchases, utilities, staff meals, and wasted stock"
        right={
          <>
            <button
              className="btn-outline"
              onClick={tab === "expenses" ? exportExpensesCSV : exportWastageCSV}
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            {tab === "wastage" ? (
              <>
                <button
                  className="btn-outline"
                  onClick={() => {
                    setWithPhoto(true);
                    setLoggingWastage(true);
                  }}
                >
                  <Camera className="w-4 h-4" /> With photo
                </button>
                <button
                  className="btn-primary"
                  onClick={() => {
                    setWithPhoto(false);
                    setLoggingWastage(true);
                  }}
                >
                  <Plus className="w-4 h-4" /> Log wastage
                </button>
              </>
            ) : (
              <button
                className="btn-primary"
                onClick={() => setLoggingExpense(true)}
              >
                <Plus className="w-4 h-4" /> Log expense
              </button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi
          label="Total cost today"
          value={`Rs ${todayTotal.toLocaleString()}`}
          tone="brand"
          icon={Receipt}
          hint={`Wastage Rs ${(wSum.today ?? 0).toLocaleString()} · Expenses Rs ${(expSum.today ?? 0).toLocaleString()}`}
        />
        <Kpi
          label="Expenses (30d)"
          value={`Rs ${(expSum.thirty ?? 0).toLocaleString()}`}
          tone="sky"
          icon={TrendingDown}
          hint={`This month Rs ${(expSum.month ?? 0).toLocaleString()}`}
        />
        <Kpi
          label="Wastage (7d)"
          value={`Rs ${(wSum.weekCost ?? 0).toLocaleString()}`}
          tone="amber"
          icon={Trash2}
          hint="Auto-deducted from inventory"
        />
        <div className="card p-5">
          <p className="kpi-label">Needs approval</p>
          <p className="kpi-value mt-1.5 text-amber-700">
            {(expSum.pending ?? 0) + (wSum.pendingApproval ?? 0)}
          </p>
          <p className="text-[11px] text-ink-500 mt-0.5">
            {expSum.pending ?? 0} expenses · {wSum.pendingApproval ?? 0} wastage
          </p>
        </div>
      </div>

      <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-white border border-ink-200 mb-4">
        <button
          onClick={() => setTab("expenses")}
          className={clsx(
            "px-4 py-1.5 rounded-md text-sm font-semibold",
            tab === "expenses"
              ? "bg-ink-900 text-white"
              : "text-ink-600 hover:bg-ink-100"
          )}
        >
          <Receipt className="w-3.5 h-3.5 inline mr-1.5" />
          Expenses · {expenses.length}
        </button>
        <button
          onClick={() => setTab("wastage")}
          className={clsx(
            "px-4 py-1.5 rounded-md text-sm font-semibold",
            tab === "wastage"
              ? "bg-ink-900 text-white"
              : "text-ink-600 hover:bg-ink-100"
          )}
        >
          <Trash2 className="w-3.5 h-3.5 inline mr-1.5" />
          Wastage · {logs.length}
        </button>
      </div>

      {tab === "expenses" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <Card title="Expense log" subtitle="Most recent first" pad={false}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="table-th">Date</th>
                      <th className="table-th">Category</th>
                      <th className="table-th">Description</th>
                      <th className="table-th">Vendor</th>
                      <th className="table-th">Amount</th>
                      <th className="table-th">Method</th>
                      <th className="table-th">Logged by</th>
                      <th className="table-th">Status</th>
                      <th className="table-th"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e: any) => {
                      const Icon = CATEGORY_ICONS[e.category] ?? MoreHorizontal;
                      const tone =
                        CATEGORY_TONES[e.category] ?? "bg-ink-100 text-ink-800";
                      return (
                        <tr key={e.id} className="hover:bg-ink-50/60">
                          <td className="table-td text-ink-500 tabular-nums text-xs">
                            {new Date(e.at).toLocaleDateString("en-US", {
                              day: "numeric",
                              month: "short",
                            })}
                          </td>
                          <td className="table-td">
                            <span
                              className={clsx(
                                "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full",
                                tone
                              )}
                            >
                              <Icon className="w-3 h-3" />
                              {e.category}
                            </span>
                            {e.recurring && (
                              <span className="ml-1.5 text-[10px] text-ink-500">
                                · recurring
                              </span>
                            )}
                          </td>
                          <td className="table-td">
                            <p className="font-medium">{e.subcategory ?? "—"}</p>
                            {e.description && (
                              <p className="text-[11px] text-ink-500 truncate max-w-[200px]">
                                {e.description}
                              </p>
                            )}
                          </td>
                          <td className="table-td text-ink-600">
                            {e.vendor ?? "—"}
                          </td>
                          <td className="table-td font-bold tabular-nums text-rose-600">
                            Rs {(e.amount ?? 0).toLocaleString()}
                          </td>
                          <td className="table-td text-ink-600 text-xs">
                            {e.paymentMethod ?? "Cash"}
                          </td>
                          <td className="table-td text-ink-600 text-xs">
                            {e.loggedByName ?? "—"}
                          </td>
                          <td className="table-td">
                            {e.approved ? (
                              <span className="chip bg-emerald-50 text-emerald-700">
                                Approved
                              </span>
                            ) : canApprove ? (
                              <button
                                onClick={() => approveExpense(e.id)}
                                className="chip bg-amber-50 text-amber-700 hover:bg-amber-100"
                              >
                                <Check className="w-3 h-3" /> Approve
                              </button>
                            ) : (
                              <span className="chip bg-amber-50 text-amber-700">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="table-td text-right">
                            {canApprove && (
                              <button
                                onClick={() => deleteExpense(e)}
                                className="text-rose-500 hover:text-rose-700"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {expenses.length === 0 && (
                      <tr>
                        <td
                          colSpan={9}
                          className="table-td text-center text-ink-500 py-10"
                        >
                          No expenses logged yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <Card
            title="By category · last 30 days"
            subtitle="Where the money went"
          >
            <div className="space-y-3">
              {Object.entries(expSum.byCategory ?? {}).length === 0 ? (
                <p className="text-sm text-ink-500">No expenses yet.</p>
              ) : (
                Object.entries(expSum.byCategory ?? {})
                  .sort((a: any, b: any) => b[1].amount - a[1].amount)
                  .map(([cat, v]: any) => {
                    const max =
                      topCategory?.[1]?.amount ?? v.amount;
                    const pct = (v.amount / (max || 1)) * 100;
                    const Icon = CATEGORY_ICONS[cat] ?? MoreHorizontal;
                    return (
                      <div key={cat}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1.5 font-medium text-ink-900">
                            <Icon className="w-3.5 h-3.5 text-ink-500" />
                            {cat}
                          </span>
                          <span className="text-ink-500 text-xs tabular-nums">
                            {v.count} · Rs {v.amount.toLocaleString()}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-sky-400 to-sky-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-ink-100">
              <p className="text-[11px] text-ink-500 leading-snug">
                Expenses above <strong>Rs 5,000</strong> need manager approval
                before they count as settled.
              </p>
            </div>
          </Card>
        </div>
      )}

      {tab === "wastage" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2">
            <Card title="Wastage log" subtitle="Latest entries" pad={false}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="table-th">Time</th>
                      <th className="table-th">Item</th>
                      <th className="table-th">Qty</th>
                      <th className="table-th">Cost</th>
                      <th className="table-th">Reason</th>
                      <th className="table-th">Staff</th>
                      <th className="table-th">Shift</th>
                      <th className="table-th">Approved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((l: any) => (
                      <tr key={l.id} className="hover:bg-ink-50/60">
                        <td className="table-td text-ink-500 tabular-nums">
                          {new Date(l.at).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="table-td font-medium">{l.itemName}</td>
                        <td className="table-td text-ink-600">
                          {l.qty} {l.unit}
                        </td>
                        <td className="table-td font-medium text-rose-600">
                          Rs {(l.cost ?? 0).toLocaleString()}
                        </td>
                        <td className="table-td">
                          <span className="chip bg-ink-100 text-ink-700">
                            {l.reason}
                          </span>
                        </td>
                        <td className="table-td text-ink-600">
                          {l.staffName ?? "—"}
                        </td>
                        <td className="table-td text-ink-500 text-xs">
                          {l.shift ?? "—"}
                        </td>
                        <td className="table-td">
                          {l.approved ? (
                            <span className="chip bg-emerald-50 text-emerald-700">
                              Approved
                            </span>
                          ) : canApprove ? (
                            <button
                              onClick={() => approveWaste(l.id)}
                              className="chip bg-amber-50 text-amber-700 hover:bg-amber-100"
                            >
                              Approve
                            </button>
                          ) : (
                            <span className="chip bg-amber-50 text-amber-700">
                              Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
                          className="table-td text-center text-ink-500 py-10"
                        >
                          No wastage logged yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <Card title="By reason · last 7 days" subtitle="Surface patterns">
            <div className="space-y-3">
              {Object.entries(wSum.byReason ?? {}).length === 0 && (
                <p className="text-sm text-ink-500">
                  No wastage this week.
                </p>
              )}
              {Object.entries(wSum.byReason ?? {})
                .sort((a: any, b: any) => b[1].cost - a[1].cost)
                .map(([r, v]: any) => {
                  const total = Object.values<any>(wSum.byReason).reduce(
                    (s: number, x: any) => s + (x.count ?? 0),
                    0
                  );
                  const pct = total ? (v.count / total) * 100 : 0;
                  return (
                    <div key={r}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{r}</span>
                        <span className="text-ink-500 text-xs tabular-nums">
                          {v.count} · Rs {v.cost.toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 bg-ink-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-400 to-amber-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </Card>
        </div>
      )}

      <LogExpenseModal
        open={loggingExpense}
        onClose={() => setLoggingExpense(false)}
        onSaved={() => {
          refreshExp();
          refreshExpSummary();
        }}
      />

      <LogWastageModal
        open={loggingWastage}
        onClose={() => setLoggingWastage(false)}
        withPhoto={withPhoto}
        onSaved={() => {
          refreshWaste();
          refreshWasteSummary();
        }}
      />
    </>
  );
}

function LogExpenseModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<any>({
    category: "Utilities",
    paymentMethod: "Cash",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.category || !form.amount) {
      toast("Category and amount are required", "error");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/expenses", {
        ...form,
        amount: Number(form.amount),
      });
      toast("Expense logged", "success");
      setForm({ category: "Utilities", paymentMethod: "Cash" });
      onSaved();
      onClose();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  const amount = Number(form.amount ?? 0);
  const needsApproval = amount >= 5000;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log an expense"
      subtitle="Utilities, rent, staff meals, supplies — anything the business pays for"
      width="max-w-lg"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : `Log Rs ${amount.toLocaleString()}`}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <Select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Amount (Rs)">
          <Input
            type="number"
            min={0}
            value={form.amount ?? ""}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="e.g. 12000"
          />
        </Field>
      </div>
      <Field
        label="Subcategory / short label"
        hint="e.g. Electricity · Apr bill, Weekly staff food"
      >
        <Input
          value={form.subcategory ?? ""}
          onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Vendor / paid to">
          <Input
            value={form.vendor ?? ""}
            onChange={(e) => setForm({ ...form, vendor: e.target.value })}
            placeholder="e.g. LESCO, HyClean Supplies"
          />
        </Field>
        <Field label="Payment method">
          <Select
            value={form.paymentMethod}
            onChange={(e) =>
              setForm({ ...form, paymentMethod: e.target.value })
            }
          >
            {["Cash", "Card", "BankTransfer", "JazzCash", "Easypaisa", "Other"].map(
              (m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              )
            )}
          </Select>
        </Field>
      </div>
      <Field label="Notes (optional)">
        <Textarea
          rows={2}
          value={form.description ?? ""}
          onChange={(e) =>
            setForm({ ...form, description: e.target.value })
          }
          placeholder="Invoice reference, extra context, etc."
        />
      </Field>
      <div className="flex items-center justify-between text-xs text-ink-500 mt-1">
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={!!form.recurring}
            onChange={(e) =>
              setForm({ ...form, recurring: e.target.checked })
            }
          />
          Recurring / monthly
        </label>
        {needsApproval && (
          <span className="text-amber-700 font-medium">
            ⚠ Needs manager approval (≥ Rs 5,000)
          </span>
        )}
      </div>
    </Modal>
  );
}

function LogWastageModal({
  open,
  onClose,
  onSaved,
  withPhoto,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  withPhoto?: boolean;
}) {
  const toast = useToast();
  const [form, setForm] = useState<any>({
    reason: "Spoiled",
    shift: "Lunch",
    qty: 0,
  });
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const { data: ingData } = useApi<{ items: any[] }>(open ? "/api/inventory" : null);

  async function save() {
    const ing = ingData?.items?.find((i: any) => i.id === form.ingredientId);
    if (!form.ingredientId || !form.qty) {
      toast("Select an ingredient and qty", "error");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/wastage", {
        ingredientId: form.ingredientId,
        itemName: ing?.name,
        unit: ing?.unit,
        qty: Number(form.qty),
        reason: form.reason,
        shift: form.shift,
        photo: photo ?? undefined,
      });
      toast("Wastage logged · stock deducted", "success");
      setForm({ reason: "Spoiled", shift: "Lunch", qty: 0 });
      setPhoto(null);
      onSaved();
      onClose();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log wastage"
      subtitle="Deducts from inventory · manager approval above Rs 500"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Log"}
          </button>
        </>
      }
    >
      <Field label="Ingredient">
        <Select
          value={form.ingredientId ?? ""}
          onChange={(e) => setForm({ ...form, ingredientId: e.target.value })}
        >
          <option value="">Select…</option>
          {(ingData?.items ?? []).map((i: any) => (
            <option key={i.id} value={i.id}>
              {i.name} · {i.stock} {i.unit} left
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Quantity">
          <Input
            type="number"
            step="0.01"
            value={form.qty}
            onChange={(e) => setForm({ ...form, qty: e.target.value })}
          />
        </Field>
        <Field label="Shift">
          <Select
            value={form.shift}
            onChange={(e) => setForm({ ...form, shift: e.target.value })}
          >
            {["Breakfast", "Lunch", "Dinner", "Late"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Reason">
        <Select
          value={form.reason}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
        >
          {WASTAGE_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Notes (optional)">
        <Textarea
          rows={2}
          value={form.note ?? ""}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
        />
      </Field>
      {withPhoto && (
        <Field label="Photo evidence">
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 2_000_000) {
                toast("Photo too large · max 2MB", "error");
                return;
              }
              const reader = new FileReader();
              reader.onload = () => setPhoto(String(reader.result));
              reader.readAsDataURL(f);
            }}
            className="block w-full text-xs"
          />
          {photo && (
            <div className="mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo}
                alt="Wastage"
                className="w-full max-h-40 object-cover rounded-lg border border-ink-200"
              />
            </div>
          )}
        </Field>
      )}
    </Modal>
  );
}
