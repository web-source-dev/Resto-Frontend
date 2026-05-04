"use client";

import { PageHeader, Card, StatusBadge, Progress } from "@/components/ui";
import { Plus, Download, FileText, TrendingDown, Truck } from "lucide-react";
import { useApi } from "@/lib/useApi";
import { useCallback, useMemo, useState } from "react";
import { useSocketEvent } from "@/lib/SocketProvider";
import { api } from "@/lib/api";
import { Modal, Field, Input, Select } from "@/components/Modal";
import { useToast } from "@/components/Toaster";
import { NewPOModal } from "@/components/NewPOModal";
import { downloadText, toCSV } from "@/lib/export";
import { useAuth } from "@/lib/AuthProvider";
import { canPerform } from "@/lib/roles";

export default function InventoryPage() {
  const { data, refresh } = useApi<{ items: any[] }>("/api/inventory");
  const { data: summaryData, refresh: refreshSummary } = useApi<any>(
    "/api/inventory/summary"
  );
  const { data: poData, refresh: refreshPOs } = useApi<{ pos: any[] }>(
    "/api/suppliers/po"
  );
  const [adding, setAdding] = useState(false);
  const [adjust, setAdjust] = useState<any | null>(null);
  const [filter, setFilter] = useState("All");
  const [poOpen, setPoOpen] = useState(false);
  const toast = useToast();
  const { user } = useAuth();
  const canPO = canPerform(user?.role, "po.create");
  const canWriteInventory = canPerform(user?.role, "inventory.write");

  const onEvt = useCallback(() => {
    refresh();
    refreshSummary();
  }, [refresh, refreshSummary]);
  useSocketEvent("inventory:update", onEvt);

  const items = data?.items ?? [];
  const summary = summaryData ?? { value: 0, low: 0, out: 0, expiring: 0 };
  const pos = poData?.pos ?? [];

  const filtered = useMemo(() => {
    return items.filter((i: any) => {
      if (filter === "Low" && i.status !== "Low") return false;
      if (filter === "Out" && i.status !== "Out") return false;
      if (filter === "Expiring") {
        if (!i.expiresAt) return false;
        const d = new Date(i.expiresAt).getTime() - Date.now();
        if (d > 3 * 24 * 60 * 60 * 1000) return false;
      }
      return true;
    });
  }, [items, filter]);

  function exportStockTake() {
    const csv = toCSV(items, [
      { key: "sku", header: "SKU" },
      { key: "name", header: "Name" },
      { key: "category", header: "Category" },
      { key: "unit", header: "Unit" },
      { key: "stock", header: "System stock" },
      { key: "stock", header: "Counted", map: () => "" },
      { key: "par", header: "Par" },
      { key: "costPerUnit", header: "Rs / unit" },
      {
        key: "value",
        header: "Value",
        map: (_, r: any) => Math.round((r.stock ?? 0) * (r.costPerUnit ?? 0)),
      },
      { key: "status", header: "Status" },
      {
        key: "expiresAt",
        header: "Expires",
        map: (v) => (v ? new Date(v).toISOString().slice(0, 10) : ""),
      },
    ]);
    downloadText(`stocktake-${Date.now()}.csv`, csv);
    toast(`Stock-take sheet exported · ${items.length} SKUs`, "success");
  }

  async function receivePO(po: any) {
    try {
      await api.post(`/api/suppliers/po/${po.id}/receive`);
      toast(`${po.code} received · stock updated`, "success");
      refreshPOs();
      refresh();
      refreshSummary();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  return (
    <>
      <PageHeader
        title="Inventory"
        subtitle="Real-time stock · recipe-linked auto-deduction · FEFO batch tracking"
        right={
          <>
            <button className="btn-outline" onClick={exportStockTake}>
              <Download className="w-4 h-4" /> Stock-take sheet
            </button>
            {canPO && (
              <button className="btn-outline" onClick={() => setPoOpen(true)}>
                <FileText className="w-4 h-4" /> New PO
              </button>
            )}
            {canWriteInventory && (
              <button className="btn-primary" onClick={() => setAdding(true)}>
                <Plus className="w-4 h-4" /> Add ingredient
              </button>
            )}
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5">
          <p className="kpi-label">Inventory value</p>
          <p className="kpi-value mt-1.5">
            Rs {(summary.value ?? 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-ink-500 mt-0.5">
            {summary.total ?? 0} SKUs tracked
          </p>
        </div>
        <div className="card p-5">
          <p className="kpi-label">Low stock</p>
          <p className="kpi-value mt-1.5 text-amber-700">{summary.low ?? 0}</p>
          <p className="text-[11px] text-ink-500 mt-0.5">Below par level</p>
        </div>
        <div className="card p-5">
          <p className="kpi-label">Out of stock</p>
          <p className="kpi-value mt-1.5 text-rose-600">{summary.out ?? 0}</p>
          <p className="text-[11px] text-ink-500 mt-0.5">Needs reorder</p>
        </div>
        <div className="card p-5">
          <p className="kpi-label">Expiring ≤ 3 days</p>
          <p className="kpi-value mt-1.5">{summary.expiring ?? 0}</p>
          <p className="text-[11px] text-ink-500 mt-0.5">FEFO risk</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div className="xl:col-span-2">
          <Card
            title="Stock levels"
            subtitle="Auto-deducted per sold order via recipe BOM"
            right={
              <div className="flex flex-wrap gap-1 text-xs">
                {["All", "Low", "Out", "Expiring"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={
                      filter === f
                        ? "px-2.5 py-1 rounded-md bg-white border border-ink-200 font-medium"
                        : "px-2.5 py-1 rounded-md text-ink-500 hover:text-ink-800"
                    }
                  >
                    {f}
                  </button>
                ))}
              </div>
            }
            pad={false}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">SKU</th>
                    <th className="table-th">Ingredient</th>
                    <th className="table-th">Stock</th>
                    <th className="table-th">Par</th>
                    <th className="table-th">Value</th>
                    <th className="table-th">Expires</th>
                    <th className="table-th">Status</th>
                    <th className="table-th"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((i: any) => {
                    const pct = i.par ? (i.stock / i.par) * 100 : 0;
                    const tone =
                      i.status === "Out"
                        ? "rose"
                        : i.status === "Low"
                        ? "amber"
                        : "emerald";
                    return (
                      <tr key={i.id} className="hover:bg-ink-50/60">
                        <td className="table-td text-ink-500 font-mono text-[11px]">
                          {i.sku}
                        </td>
                        <td className="table-td">
                          <p className="font-medium text-ink-900">{i.name}</p>
                          <p className="text-[11px] text-ink-500">
                            {i.category} · Rs {i.costPerUnit}/{i.unit}
                          </p>
                        </td>
                        <td className="table-td">
                          <div className="flex items-center gap-2 w-36">
                            <span className="text-sm font-semibold tabular-nums w-16">
                              {i.stock} {i.unit}
                            </span>
                            <Progress value={pct} tone={tone as any} />
                          </div>
                        </td>
                        <td className="table-td text-ink-500 tabular-nums">
                          {i.par} {i.unit}
                        </td>
                        <td className="table-td font-medium">
                          Rs {(i.value ?? 0).toLocaleString()}
                        </td>
                        <td className="table-td text-ink-500 text-xs">
                          {i.expiresAt
                            ? new Date(i.expiresAt).toLocaleDateString("en-US", {
                                day: "numeric",
                                month: "short",
                              })
                            : "—"}
                        </td>
                        <td className="table-td">
                          <StatusBadge status={i.status} />
                        </td>
                        <td className="table-td text-right">
                          {canWriteInventory ? (
                            <button
                              onClick={() => setAdjust(i)}
                              className="text-xs font-medium text-brand-600 hover:text-brand-700"
                            >
                              Adjust
                            </button>
                          ) : (
                            <span className="text-xs text-ink-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="table-td text-center text-ink-500 py-10">
                        No ingredients match.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card
            title="Purchase orders"
            subtitle="Receive to add to stock"
            right={
              canPO && (
                <button
                  className="btn-ghost text-xs"
                  onClick={() => setPoOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5" /> New
                </button>
              )
            }
          >
            <div className="space-y-3">
              {pos.length === 0 && (
                <p className="text-sm text-ink-500 text-center py-6">
                  No POs yet — tap &ldquo;New PO&rdquo;
                </p>
              )}
              {pos.map((p: any) => (
                <div
                  key={p.id}
                  className="p-3 rounded-lg border border-ink-100 hover:bg-ink-50/60"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink-900">
                        {p.code}
                      </p>
                      <p className="text-[11px] text-ink-500 truncate">
                        {p.supplierName ?? "—"}
                      </p>
                    </div>
                    <StatusBadge
                      status={
                        p.status === "Received"
                          ? "Completed"
                          : p.status === "Sent"
                          ? "Pending"
                          : "In Progress"
                      }
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-ink-600">
                    <span>
                      {p.lines?.length} lines · Rs {p.total?.toLocaleString()}
                    </span>
                    {p.status !== "Received" && canPO && (
                      <button
                        onClick={() => receivePO(p)}
                        className="text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
                      >
                        <Truck className="w-3 h-3" /> Receive
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Variance alert" subtitle="Theoretical vs actual">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <TrendingDown className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-900">
                  Auto-variance detection
                </p>
                <p className="text-xs text-ink-500 mt-0.5">
                  Sales-implied consumption vs. physical stock takes
                </p>
                <p className="text-xs text-rose-600 mt-1 font-medium">
                  Needs a completed stock-take to compute
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <AdjustModal
        item={adjust}
        onClose={() => setAdjust(null)}
        onSaved={() => {
          refresh();
          refreshSummary();
        }}
      />

      <IngredientModal
        open={adding}
        onClose={() => setAdding(false)}
        onSaved={() => {
          refresh();
          refreshSummary();
        }}
      />

      <NewPOModal
        open={poOpen}
        onClose={() => setPoOpen(false)}
        onSaved={() => {
          refreshPOs();
          refresh();
        }}
      />
    </>
  );
}

function AdjustModal({
  item,
  onClose,
  onSaved,
}: {
  item: any | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [delta, setDelta] = useState(0);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!item) return;
    setSaving(true);
    try {
      await api.post(`/api/inventory/${item.id}/adjust`, { delta });
      toast(`Stock ${delta >= 0 ? "added" : "removed"}`, "success");
      setDelta(0);
      onSaved();
      onClose();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  if (!item) return null;

  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title={`Adjust — ${item.name}`}
      subtitle={`Current · ${item.stock} ${item.unit} · par ${item.par}`}
      width="max-w-md"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Apply"}
          </button>
        </>
      }
    >
      <Field label={`Delta (${item.unit})`} hint="Positive = receipt, negative = removal">
        <Input
          type="number"
          step="0.01"
          value={delta}
          onChange={(e) => setDelta(Number(e.target.value))}
        />
      </Field>
      <div className="mt-2 flex flex-wrap gap-2">
        {[-1, -0.5, 0.5, 1, 5].map((n) => (
          <button
            key={n}
            onClick={() => setDelta((d) => +(d + n).toFixed(2))}
            className="btn-outline text-xs px-2 py-1"
          >
            {n > 0 ? `+${n}` : n}
          </button>
        ))}
      </div>
      <p className="text-sm text-ink-600 mt-4">
        New stock:{" "}
        <span className="font-semibold">
          {(item.stock + delta).toFixed(2)} {item.unit}
        </span>
      </p>
    </Modal>
  );
}

function IngredientModal({
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
    unit: "kg",
    par: 0,
    stock: 0,
    costPerUnit: 0,
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.name || !form.sku) {
      toast("Name and SKU required", "error");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/inventory", form);
      toast("Ingredient added", "success");
      setForm({ unit: "kg", par: 0, stock: 0, costPerUnit: 0 });
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
      title="New ingredient"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Add"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="SKU">
          <Input
            value={form.sku ?? ""}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
          />
        </Field>
        <Field label="Category">
          <Input
            value={form.category ?? ""}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Name">
        <Input
          value={form.name ?? ""}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Unit">
          <Select
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
          >
            {["kg", "g", "L", "ml", "pcs"].map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Stock">
          <Input
            type="number"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
          />
        </Field>
        <Field label="Par">
          <Input
            type="number"
            value={form.par}
            onChange={(e) => setForm({ ...form, par: Number(e.target.value) })}
          />
        </Field>
      </div>
      <Field label="Cost per unit (Rs)">
        <Input
          type="number"
          value={form.costPerUnit}
          onChange={(e) =>
            setForm({ ...form, costPerUnit: Number(e.target.value) })
          }
        />
      </Field>
    </Modal>
  );
}
