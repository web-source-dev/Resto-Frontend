"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toaster";
import { Search, Minus, Plus } from "lucide-react";

type MenuItem = {
  id: string;
  name: string;
  price: number;
  categoryId?: string;
  active?: boolean;
};

type Cart = Record<string, { item: MenuItem; qty: number; note?: string }>;

export function AppendItemsDialog({
  open,
  onClose,
  orderId,
  orderCode,
  onAppended,
}: {
  open: boolean;
  onClose: () => void;
  orderId: string | null;
  orderCode?: string;
  onAppended?: () => void;
}) {
  const toast = useToast();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<Cart>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !orderId) return;
    setCart({});
    setQ("");
    api
      .get<{ items: MenuItem[] }>("/api/menu/items?active=true")
      .then((r) => setItems(r.items ?? []))
      .catch(() => setItems([]));
  }, [open, orderId]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((it) => it.name.toLowerCase().includes(needle));
  }, [items, q]);

  const cartLines = Object.values(cart);
  const cartSubtotal = cartLines.reduce(
    (s, c) => s + c.item.price * c.qty,
    0
  );

  function addToCart(it: MenuItem) {
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
      toast("Add at least one item", "error");
      return;
    }
    setSaving(true);
    try {
      await api.post(`/api/orders/${orderId}/append`, {
        items: cartLines.map((c) => ({
          menuItemId: c.item.id,
          qty: c.qty,
          note: c.note,
        })),
      });
      toast(
        `Added ${cartLines.length} line${
          cartLines.length === 1 ? "" : "s"
        } to ${orderCode ?? "order"}`,
        "success"
      );
      onAppended?.();
      onClose();
    } catch (e: any) {
      // Server returns 409 with the offending ingredient name on stock-out.
      toast(e?.message ?? "Failed to add items", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Add items${orderCode ? ` · ${orderCode}` : ""}`}
      subtitle="Items go straight to the kitchen — no review queue"
      width="max-w-xl"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="text-sm">
            <span className="text-ink-500">{cartLines.length} line{cartLines.length === 1 ? "" : "s"}</span>
            {cartSubtotal > 0 && (
              <span className="ml-3 font-semibold text-ink-900 tabular-nums">
                Rs {cartSubtotal.toLocaleString()}
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
              {saving ? "Adding..." : "Add to order"}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search menu..."
            className="w-full rounded-lg border border-ink-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400"
          />
        </div>

        {cartLines.length > 0 && (
          <div className="rounded-lg border border-brand-100 bg-brand-50/40 p-2 space-y-1">
            {cartLines.map((c) => (
              <div key={c.item.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-ink-900">{c.item.name}</div>
                  <div className="text-[11px] text-ink-500 tabular-nums">
                    Rs {c.item.price.toLocaleString()} ea
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
                  <span className="w-6 text-center text-sm font-semibold tabular-nums">{c.qty}</span>
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
                  Rs {(c.item.price * c.qty).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="max-h-[40vh] overflow-y-auto rounded-lg border border-ink-100">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-400">
              {items.length === 0 ? "Loading menu..." : "No items match your search."}
            </p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {filtered.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-ink-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-ink-900">{it.name}</div>
                    <div className="text-[11px] text-ink-500 tabular-nums">
                      Rs {it.price.toLocaleString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => addToCart(it)}
                    className="rounded-md border border-ink-200 bg-white px-2 py-1 text-xs font-semibold text-ink-700 hover:bg-brand-50 hover:text-brand-700"
                  >
                    Add
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
