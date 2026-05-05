"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal, Field, Input, Select, Textarea } from "./Modal";
import { Minus, Plus, Search, Trash2, Ticket, Sparkles } from "lucide-react";
import clsx from "clsx";
import { api } from "@dinova/lib/api";
import { useToast } from "./Toaster";

type MenuItem = {
  id: string;
  name: string;
  price: number;
  categoryId: string;
};
type Category = { id: string; name: string };
type Cart = Record<string, { item: MenuItem; qty: number; mods?: string[]; note?: string }>;

export function NewOrderModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const toast = useToast();
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCat, setActiveCat] = useState<string>("all");
  const [q, setQ] = useState("");
  const [channel, setChannel] = useState("Dine-in");
  const [tableCode, setTableCode] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [matchedCustomer, setMatchedCustomer] = useState<any | null>(null);
  const [suggestions, setSuggestions] = useState<
    { name: string; phone: string; email: string }[]
  >([]);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [cashOnDelivery, setCashOnDelivery] = useState(true);
  const [cart, setCart] = useState<Cart>({});
  const [saving, setSaving] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponStatus, setCouponStatus] = useState<{
    ok: boolean;
    reason?: string;
    discount?: number;
  } | null>(null);
  const [redeemPoints, setRedeemPoints] = useState(0);

  // When receptionist finishes typing a phone, look up the existing CRM record
  // and auto-fill name/email + show a loyalty chip.
  useEffect(() => {
    const p = customerPhone.trim();
    if (p.length < 7) {
      setMatchedCustomer(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await api.get<{ customer: any | null }>(
          `/api/customers/lookup?phone=${encodeURIComponent(p)}`
        );
        if (r.customer) {
          setMatchedCustomer(r.customer);
          if (!customerName && r.customer.name) setCustomerName(r.customer.name);
          if (!customerEmail && r.customer.email)
            setCustomerEmail(r.customer.email);
        } else {
          setMatchedCustomer(null);
        }
      } catch {}
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerPhone]);

  useEffect(() => {
    const source =
      customerPhone.trim().length >= 2
        ? { q: customerPhone.trim(), field: "phone" }
        : customerName.trim().length >= 2
        ? { q: customerName.trim(), field: "name" }
        : customerEmail.trim().length >= 2
        ? { q: customerEmail.trim(), field: "email" }
        : null;
    if (!source) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await api.get<{ suggestions: { name: string; phone: string; email: string }[] }>(
          `/api/customers/suggest?q=${encodeURIComponent(source.q)}&field=${source.field}`
        );
        setSuggestions(r.suggestions ?? []);
      } catch {
        setSuggestions([]);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [customerName, customerPhone, customerEmail]);
  const [tables, setTables] = useState<{ id: string; code: string; status: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      api.get("/api/menu/categories"),
      api.get("/api/menu/items?active=true"),
      api.get("/api/tables"),
    ]).then(([c, i, t]: any) => {
      setCats(c.categories ?? []);
      setItems(i.items ?? []);
      setTables(t.tables ?? []);
    });
    setCart({});
  }, [open]);

  const filtered = useMemo(() => {
    return items.filter(
      (it) =>
        (activeCat === "all" || it.categoryId === activeCat) &&
        it.name.toLowerCase().includes(q.toLowerCase())
    );
  }, [items, activeCat, q]);

  const cartItems = Object.values(cart);
  const subtotal = cartItems.reduce((s, c) => s + c.item.price * c.qty, 0);
  const couponDiscount = couponStatus?.ok ? couponStatus.discount ?? 0 : 0;
  const pointsDiscount = Math.min(
    redeemPoints,
    matchedCustomer?.points ?? 0,
    subtotal
  );
  const netBase = Math.max(0, subtotal - couponDiscount - pointsDiscount);
  const tax = Math.round(netBase * 0.16);
  const service = Math.round(netBase * 0.05);
  const total = netBase + tax + service;

  // Live coupon validation
  useEffect(() => {
    const code = couponCode.trim();
    if (!code || cartItems.length === 0) {
      setCouponStatus(null);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await api.post<any>("/api/promotions/validate", {
          code,
          channel,
          customerPhone: customerPhone || undefined,
          items: cartItems.map((c) => ({
            menuItemId: c.item.id,
            qty: c.qty,
          })),
        });
        setCouponStatus({
          ok: r.ok,
          reason: r.reason,
          discount: r.discountAmount,
        });
      } catch (e: any) {
        setCouponStatus({ ok: false, reason: e.message });
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [couponCode, subtotal, channel, customerPhone]);

  function addToCart(it: MenuItem) {
    setCart((c) => {
      const cur = c[it.id];
      return { ...c, [it.id]: { item: it, qty: (cur?.qty ?? 0) + 1 } };
    });
  }
  function changeQty(id: string, delta: number) {
    setCart((c) => {
      const cur = c[id];
      if (!cur) return c;
      const q = cur.qty + delta;
      if (q <= 0) {
        const n = { ...c };
        delete n[id];
        return n;
      }
      return { ...c, [id]: { ...cur, qty: q } };
    });
  }

  async function submit() {
    if (cartItems.length === 0) {
      toast("Add at least one item", "error");
      return;
    }
    if (channel === "Delivery" && !deliveryAddress.trim()) {
      toast("Delivery address is required", "error");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/orders", {
        channel,
        tableCode: channel === "Dine-in" ? tableCode || undefined : undefined,
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        customerEmail: customerEmail || undefined,
        deliveryAddress:
          channel === "Delivery" ? deliveryAddress.trim() : undefined,
        deliveryNote:
          channel === "Delivery" ? deliveryNote.trim() || undefined : undefined,
        cashOnDelivery: channel === "Delivery" ? cashOnDelivery : undefined,
        couponCode: couponStatus?.ok ? couponCode.trim() : undefined,
        redeemPoints: redeemPoints > 0 ? redeemPoints : undefined,
        items: cartItems.map((c) => ({
          menuItemId: c.item.id,
          qty: c.qty,
          mods: c.mods,
          note: c.note,
        })),
      });
      toast("Order placed · KDS notified", "success");
      onCreated?.();
      onClose();
    } catch (e: any) {
      toast(e.message ?? "Failed to place order", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New order"
      subtitle="Manual entry — mirrors customer menu · KOT prints to station"
      width="max-w-5xl"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={submit}
            disabled={saving || cartItems.length === 0}
          >
            {saving ? "Placing…" : `Place order · Rs ${total.toLocaleString()}`}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search items…"
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-ink-50 border border-ink-200 focus:bg-white focus:outline-none text-sm"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            <button
              onClick={() => setActiveCat("all")}
              className={`text-xs px-2.5 py-1 rounded-md font-medium ${
                activeCat === "all"
                  ? "bg-ink-900 text-white"
                  : "bg-ink-100 text-ink-600 hover:bg-ink-200"
              }`}
            >
              All
            </button>
            {cats.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                className={`text-xs px-2.5 py-1 rounded-md font-medium ${
                  activeCat === c.id
                    ? "bg-ink-900 text-white"
                    : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[420px] overflow-y-auto pr-1">
            {filtered.map((it) => (
              <button
                key={it.id}
                onClick={() => addToCart(it)}
                className="text-left p-3 rounded-lg border border-ink-200 hover:border-brand-400 hover:bg-brand-50/50 transition-colors"
              >
                <p className="font-semibold text-ink-900 text-sm truncate">
                  {it.name}
                </p>
                <p className="text-xs text-ink-500 mt-1 tabular-nums">
                  Rs {it.price.toLocaleString()}
                </p>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full py-10 text-center text-sm text-ink-500">
                No items match
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col">
          <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Field label="Channel">
              <Select value={channel} onChange={(e) => setChannel(e.target.value)}>
                <option>Dine-in</option>
                <option>Takeaway</option>
                <option>Delivery</option>
                <option>Phone</option>
              </Select>
            </Field>
            {channel === "Dine-in" && (
              <Field label="Table">
                <Select
                  value={tableCode}
                  onChange={(e) => setTableCode(e.target.value)}
                >
                  <option value="">—</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.code}>
                      {t.code} · {t.status}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>
          {channel !== "Dine-in" && (
            <div className="grid grid-cols-1 gap-2 mb-3">
              <Field label="Phone (lookup existing customers)">
                <Input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+92 300 0000000"
                  list="customer-phone-suggestions"
                />
              </Field>
              {matchedCustomer && (
                <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">
                    ⭐
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-emerald-900 truncate">
                      {matchedCustomer.name} · {matchedCustomer.tier} member
                    </p>
                    <p className="text-emerald-700">
                      {matchedCustomer.visits} visits · {matchedCustomer.points} pts
                      {matchedCustomer.favorite ? ` · likes ${matchedCustomer.favorite}` : ""}
                    </p>
                  </div>
                </div>
              )}
              <Field label="Customer name">
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Ayesha Khan"
                  list="customer-name-suggestions"
                />
              </Field>
              <Field label="Email (for digital receipt)">
                <Input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="ayesha@example.com"
                  list="customer-email-suggestions"
                />
              </Field>
              <datalist id="customer-name-suggestions">
                {suggestions
                  .filter((s) => s.name)
                  .map((s, i) => (
                    <option key={`n-${i}`} value={s.name} />
                  ))}
              </datalist>
              <datalist id="customer-phone-suggestions">
                {suggestions
                  .filter((s) => s.phone)
                  .map((s, i) => (
                    <option key={`p-${i}`} value={s.phone} />
                  ))}
              </datalist>
              <datalist id="customer-email-suggestions">
                {suggestions
                  .filter((s) => s.email)
                  .map((s, i) => (
                    <option key={`e-${i}`} value={s.email} />
                  ))}
              </datalist>
              {channel === "Delivery" && (
                <>
                  <Field label="Delivery address">
                    <Textarea
                      rows={2}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="House 45, Street 7, Johar Town · near Emporium Mall"
                    />
                  </Field>
                  <Field label="Delivery note (optional)">
                    <Input
                      value={deliveryNote}
                      onChange={(e) => setDeliveryNote(e.target.value)}
                      placeholder="Gate code, landmark, etc."
                    />
                  </Field>
                  <label className="flex items-center gap-2 text-xs text-ink-700 font-medium">
                    <input
                      type="checkbox"
                      checked={cashOnDelivery}
                      onChange={(e) => setCashOnDelivery(e.target.checked)}
                    />
                    Cash on delivery · rider collects payment
                  </label>
                </>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto border border-ink-100 rounded-lg p-3 max-h-64">
            {cartItems.length === 0 ? (
              <p className="text-center text-sm text-ink-400 py-10">
                Tap items to add to the bill
              </p>
            ) : (
              cartItems.map((c) => (
                <div
                  key={c.item.id}
                  className="flex items-center gap-2 py-2 border-b border-ink-100 last:border-b-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-900 truncate">
                      {c.item.name}
                    </p>
                    <p className="text-[11px] text-ink-500">
                      Rs {c.item.price.toLocaleString()} × {c.qty}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => changeQty(c.item.id, -1)}
                      className="w-6 h-6 rounded bg-ink-100 hover:bg-ink-200 flex items-center justify-center"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center text-sm font-semibold tabular-nums">
                      {c.qty}
                    </span>
                    <button
                      onClick={() => changeQty(c.item.id, 1)}
                      className="w-6 h-6 rounded bg-ink-100 hover:bg-ink-200 flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => changeQty(c.item.id, -c.qty)}
                      className="w-6 h-6 rounded text-rose-500 hover:bg-rose-50 flex items-center justify-center ml-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-3 space-y-2">
            <div className="relative">
              <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="Coupon code"
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-ink-200 bg-white text-sm font-mono focus:border-brand-400 focus:outline-none"
              />
              {couponCode && couponStatus && (
                <div
                  className={clsx(
                    "text-[11px] mt-1",
                    couponStatus.ok ? "text-emerald-600" : "text-rose-600"
                  )}
                >
                  {couponStatus.ok
                    ? `✓ Rs ${(couponStatus.discount ?? 0).toLocaleString()} off`
                    : `⚠ ${couponStatus.reason}`}
                </div>
              )}
            </div>
            {matchedCustomer && matchedCustomer.points > 0 && (
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-100">
                <label className="flex items-center gap-2 text-xs font-medium text-amber-900">
                  <Sparkles className="w-3 h-3" />
                  Redeem loyalty points ({matchedCustomer.points} available)
                </label>
                <input
                  type="range"
                  min={0}
                  max={Math.min(matchedCustomer.points, subtotal)}
                  value={redeemPoints}
                  onChange={(e) => setRedeemPoints(Number(e.target.value))}
                  className="w-full mt-2"
                />
                <p className="text-[11px] text-amber-800 tabular-nums">
                  {redeemPoints} pts = Rs {redeemPoints} off
                </p>
              </div>
            )}
          </div>

          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between text-ink-600">
              <span>Subtotal</span>
              <span className="tabular-nums">Rs {subtotal.toLocaleString()}</span>
            </div>
            {couponDiscount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Coupon {couponCode}</span>
                <span className="tabular-nums">
                  − Rs {couponDiscount.toLocaleString()}
                </span>
              </div>
            )}
            {pointsDiscount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Points redemption</span>
                <span className="tabular-nums">
                  − Rs {pointsDiscount.toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between text-ink-600">
              <span>Tax (16%)</span>
              <span className="tabular-nums">Rs {tax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-ink-600">
              <span>Service (5%)</span>
              <span className="tabular-nums">Rs {service.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-semibold text-ink-900 pt-2 border-t border-ink-100">
              <span>Total</span>
              <span className="tabular-nums">Rs {total.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
