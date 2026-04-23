"use client";

import { useEffect, useState } from "react";
import { Modal, Field, Input, Select, Textarea } from "./Modal";
import { api } from "@/lib/api";
import { useToast } from "./Toaster";
import { Plus, Trash2 } from "lucide-react";

type Line = {
  ingredientId: string;
  name: string;
  unit: string;
  qty: number;
  costPerUnit: number;
};

export function NewPOModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [ings, setIngs] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [expectedAt, setExpectedAt] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [addingIng, setAddingIng] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      api.get("/api/inventory"),
      api.get("/api/suppliers"),
    ]).then(([a, b]: any) => {
      setIngs(a.items ?? []);
      setSuppliers(b.suppliers ?? []);
    });
    setLines([]);
    setSupplierId("");
    setSupplierName("");
    setExpectedAt("");
    setNote("");
  }, [open]);

  function addLine() {
    if (!addingIng) return;
    const ing = ings.find((i) => i.id === addingIng);
    if (!ing) return;
    setLines((l) => [
      ...l,
      {
        ingredientId: ing.id,
        name: ing.name,
        unit: ing.unit,
        qty: Math.max(1, (ing.par ?? 0) - (ing.stock ?? 0)),
        costPerUnit: ing.costPerUnit ?? 0,
      },
    ]);
    setAddingIng("");
  }

  const total = lines.reduce((s, l) => s + l.qty * l.costPerUnit, 0);

  async function save() {
    if (lines.length === 0) {
      toast("Add at least one line", "error");
      return;
    }
    setSaving(true);
    try {
      let sName = supplierName;
      let sId = supplierId;
      if (!sId && sName) {
        const r = await api.post<{ supplier: any }>("/api/suppliers", {
          name: sName,
        });
        sId = r.supplier.id;
      } else if (sId) {
        sName = suppliers.find((s) => s.id === sId)?.name ?? "";
      }
      await api.post("/api/suppliers/po", {
        supplierId: sId || undefined,
        supplierName: sName,
        lines,
        expectedAt: expectedAt || undefined,
        note,
      });
      toast(`PO sent · Rs ${total.toLocaleString()}`, "success");
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
      title="New purchase order"
      subtitle="Supplier · lines · expected date"
      width="max-w-2xl"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : `Send PO · Rs ${total.toLocaleString()}`}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Supplier">
          <Select
            value={supplierId}
            onChange={(e) => {
              setSupplierId(e.target.value);
              setSupplierName("");
            }}
          >
            <option value="">New supplier…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Expected">
          <Input
            type="datetime-local"
            value={expectedAt}
            onChange={(e) => setExpectedAt(e.target.value)}
          />
        </Field>
      </div>
      {!supplierId && (
        <Field label="New supplier name">
          <Input
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            placeholder="e.g. FreshMart Wholesale"
          />
        </Field>
      )}

      <div className="mt-2 mb-1 text-xs font-semibold text-ink-700">Lines</div>
      <div className="border border-ink-200 rounded-lg divide-y divide-ink-100">
        {lines.length === 0 && (
          <p className="text-sm text-ink-400 text-center py-6">
            Add ingredients to purchase
          </p>
        )}
        {lines.map((l, i) => (
          <div key={i} className="flex items-center gap-2 p-2">
            <span className="flex-1 text-sm font-medium truncate">{l.name}</span>
            <input
              type="number"
              className="w-16 h-8 px-2 rounded border border-ink-200 text-sm text-right"
              value={l.qty}
              onChange={(e) => {
                const q = Number(e.target.value);
                setLines((ls) =>
                  ls.map((x, j) => (j === i ? { ...x, qty: q } : x))
                );
              }}
            />
            <span className="text-xs text-ink-500 w-8">{l.unit}</span>
            <span className="text-xs text-ink-500">@</span>
            <input
              type="number"
              className="w-20 h-8 px-2 rounded border border-ink-200 text-sm text-right"
              value={l.costPerUnit}
              onChange={(e) => {
                const c = Number(e.target.value);
                setLines((ls) =>
                  ls.map((x, j) => (j === i ? { ...x, costPerUnit: c } : x))
                );
              }}
            />
            <span className="text-xs tabular-nums text-ink-700 w-24 text-right font-semibold">
              Rs {(l.qty * l.costPerUnit).toLocaleString()}
            </span>
            <button
              onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
              className="text-rose-500 hover:text-rose-700 p-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-3">
        <Select
          value={addingIng}
          onChange={(e) => setAddingIng(e.target.value)}
          className="flex-1"
        >
          <option value="">Pick ingredient…</option>
          {ings
            .filter((i) => !lines.some((l) => l.ingredientId === i.id))
            .map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} · {i.stock} {i.unit} in stock
              </option>
            ))}
        </Select>
        <button onClick={addLine} className="btn-outline" disabled={!addingIng}>
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      <div className="mt-3">
        <Field label="Note">
          <Textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional instructions for supplier"
          />
        </Field>
      </div>

      <div className="mt-3 flex justify-end">
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-ink-500">
            Total
          </p>
          <p className="text-lg font-bold tabular-nums text-ink-900">
            Rs {total.toLocaleString()}
          </p>
        </div>
      </div>
    </Modal>
  );
}
