"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@dinova/components/Modal";
import { api } from "@dinova/lib/api";
import { useToast } from "@dinova/components/Toaster";
import { Search, Minus, Plus } from "lucide-react";
import clsx from "clsx";

const SUPPLY_CATEGORIES = ["Packaging", "Disposables", "Condiments", "Cleaning"];

type Supply = {
  id: string;
  sku?: string;
  name: string;
  category?: string;
  unit?: string;
  stock?: number;
  costPerUnit?: number;
};

type Cart = Record<string, { item: Supply; qty: number }>;

export function UseSuppliesDialog({
  open,
  onClose,
  orderId,
  orderCode,
  onLogged,
}: {
  open: boolean;
  onClose: () => void;
  orderId: string | null;
  orderCode?: string;
  onLogged?: () => void;
}) {
  const toast = useToast();
  const [items, setItems] = useState<Supply[]>([]);
  const [q, setQ] = useState("");
  const [activeCat, setActiveCat] = useState<string>("All");
  const [cart, setCart] = useState<Cart>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !orderId) return;
    setCart({});
    setQ("");
    setActiveCat("All");
    api
      .get<{ items: Supply[] }>("/api/inventory")
      .then((r) => {
        const supplies = (r.items ?? []).filter((it) =>
          SUPPLY_CATEGORIES.includes(it.category ?? "")
        );
        setItems(supplies);
      })
      .catch(() => setItems([]));
  }, [open, orderId]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((it) => {
      if (activeCat !== "All" && it.category !== activeCat) return false;
      if (needle && !it.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [items, q, activeCat]);

  const cartLines = Object.values(cart);
  const cartCost = cartLines.reduce(
    (s, c) => s + (c.item.costPerUnit ?? 0) * c.qty,
    0
  );

  function addToCart(it: Supply) {
    setCart((c) => {
      const cur = c[it.id];
      return { ...c, [it.id]: { item: it, qty: (cur?.qty ?? 0) + 1 } };
    });
  }
  function step(id: string, delta: number) {
    setCart((c) => {
      const cur = c[id];
      if (!cur) return c;
      const next = cur.qty + delta;
      if (next <= 0) {
        const n = { ...c };
        delete n[id];
        return n;
      }
      return { ...c, [id]: { ...cur, qty: next } };
    });
  }

  async function submit() {
    if (!orderId) return;
    if (cartLines.length === 0) {
      toast("Pick at least one supply", "error");
      return;
    }
    setSaving(true);
    try {
      await api.post(`/api/orders/${orderId}/supplies`, {
        supplies: cartLines.map((c) => ({
          ingredientId: c.item.id,
          qty: c.qty,
        })),
      });
      toast(
        `Logged ${cartLines.length} suppl${cartLines.length === 1 ? "y" : "ies"} on ${
          orderCode ?? "order"
        }`,
        "success"
      );
      onLogged?.();
      onClose();
    } catch (e: any) {
      toast(e?.message ?? "Failed to log supplies", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Use supplies${orderCode ? ` · ${orderCode}` : ""}`}
      subtitle="Logged for cost tracking and inventory deduction"
      width="max-w-xl"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="text-sm">
            <span className="text-ink-500">
              {cartLines.length} item{cartLines.length === 1 ? "" : "s"}
            </span>
            {cartCost > 0 && (
              <span className="ml-3 font-semibold text-ink-900 tabular-nums">
                Rs {cartCost.toLocaleString()}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={submit}
              disabled={saving || cartLines.length === 0}
            >
              {saving ? "Logging..." : "Log usage"}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          {["All", ...SUPPLY_CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setActiveCat(c)}
              className={clsx(
                "shrink-0 rounded-md px-2.5 py-1 font-medium",
                activeCat === c
                  ? "bg-ink-900 text-white"
                  : "bg-ink-100 text-ink-700 hover:bg-ink-200"
              )}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search napkin, box, ketchup..."
            className="w-full rounded-lg border border-ink-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400"
          />
        </div>

        {cartLines.length > 0 && (
          <div className="space-y-1 rounded-lg border border-brand-100 bg-brand-50/40 p-2">
            {cartLines.map((c) => (
              <div key={c.item.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-ink-900">{c.item.name}</div>
                  <div className="text-[11px] text-ink-500 tabular-nums">
                    Rs {(c.item.costPerUnit ?? 0).toLocaleString()} / {c.item.unit ?? "pc"}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => step(c.item.id, -1)}
                    className="rounded-md border border-ink-200 bg-white p-1 hover:bg-ink-50"
                    aria-label="decrement"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold tabular-nums">
                    {c.qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => step(c.item.id, 1)}
                    className="rounded-md border border-ink-200 bg-white p-1 hover:bg-ink-50"
                    aria-label="increment"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="w-20 text-right text-sm font-semibold tabular-nums text-ink-900">
                  Rs {((c.item.costPerUnit ?? 0) * c.qty).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="max-h-[40vh] overflow-y-auto rounded-lg border border-ink-100">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-400">
              {items.length === 0
                ? "No supplies in inventory yet — add some via Inventory → New item with category Packaging / Disposables / Condiments."
                : "No items match your filter."}
            </p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {filtered.map((it) => {
                const lowStock = (it.stock ?? 0) <= 0;
                return (
                  <li
                    key={it.id}
                    className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-ink-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-ink-900">
                        {it.name}
                      </div>
                      <div className="text-[11px] text-ink-500 tabular-nums">
                        {it.category} · Rs {(it.costPerUnit ?? 0).toLocaleString()} ·{" "}
                        <span className={clsx(lowStock && "text-rose-600 font-semibold")}>
                          {it.stock ?? 0} {it.unit ?? "pc"} on hand
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => addToCart(it)}
                      disabled={lowStock}
                      className="rounded-md border border-ink-200 bg-white px-2 py-1 text-xs font-semibold text-ink-700 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-40"
                    >
                      Add
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
