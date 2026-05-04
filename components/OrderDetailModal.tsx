"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/Modal";
import { StatusBadge } from "@/components/ui";
import { AppendItemsDialog } from "@/components/AppendItemsDialog";
import { UseSuppliesDialog } from "@/components/UseSuppliesDialog";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toaster";
import { useSocketEvent } from "@/lib/SocketProvider";
import { Plus, X, Package } from "lucide-react";
import clsx from "clsx";

const APPEND_ROLES = new Set(["admin", "manager", "receptionist", "waiter"]);
const CANCEL_ROLES = new Set(["admin", "manager", "receptionist"]);
const CLOSED_STATUSES = new Set(["Completed", "Cancelled"]);

function fmtMoney(n: number | undefined) {
  return `Rs ${(n ?? 0).toLocaleString()}`;
}

function fmtDt(d: string | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString();
}

function lineKey(it: any, i: number) {
  return it?.id ?? it?._id ?? `line-${i}`;
}

export function OrderDetailModal({
  open,
  onClose,
  order,
  userRole,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  order: any | null;
  userRole?: string;
  onChanged?: () => void;
}) {
  const toast = useToast();
  const [appendOpen, setAppendOpen] = useState(false);
  const [suppliesOpen, setSuppliesOpen] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  // Render from a local copy so we can refresh in place after a mutation
  // without waiting for the parent to re-pick the order from its list.
  const [liveOrder, setLiveOrder] = useState<any | null>(order);

  const orderId = order?.id ?? order?._id ?? null;
  // When the parent opens a different order, swap the local copy. Compare by
  // id so a re-render with the same order doesn't blow away a fresh fetch.
  const lastIdRef = useRef<string | null>(null);
  useEffect(() => {
    const incomingId = order?.id ?? order?._id ?? null;
    if (incomingId !== lastIdRef.current) {
      lastIdRef.current = incomingId;
      setLiveOrder(order);
    }
  }, [order]);

  const refreshOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      const r = await api.get<{ order: any }>(`/api/orders/${orderId}`);
      if (r?.order) setLiveOrder(r.order);
    } catch {
      // Fall back to whatever the parent has — better than going blank.
    }
  }, [orderId]);

  // While the modal is open, any backend mutation that fans out a
  // `data:changed` hint should refetch THIS order — covers the case where
  // someone else (kitchen marking a line ready, the QR flow, etc.) changes
  // it underneath us.
  useSocketEvent<{ resource?: string }>("data:changed", (payload) => {
    if (!open) return;
    if (payload?.resource && payload.resource !== "orders") return;
    void refreshOrder();
  });

  const view = liveOrder ?? order;
  if (!view) return null;

  const items = view.items ?? [];
  const events = [...(view.events ?? [])].reverse().slice(0, 20);
  const discounts = view.discountLines ?? [];
  const balanceDue = Number(view.balanceDue ?? 0);
  const paidAmount = Number(view.paidAmount ?? 0);
  const isClosed = CLOSED_STATUSES.has(view.status);
  const canAppend = !!userRole && APPEND_ROLES.has(userRole) && !isClosed;
  const canCancelAny = !!userRole && CANCEL_ROLES.has(userRole) && !isClosed;

  async function cancelItem(item: any) {
    const itemId = item.id ?? item._id;
    if (!itemId || !orderId) return;
    if (!confirm(`Cancel "${item.name}"? This restores ingredient stock and notifies the kitchen.`)) {
      return;
    }
    setBusyItemId(String(itemId));
    try {
      await api.post(`/api/orders/${orderId}/items/${itemId}/cancel`, {
        reason: "voided by staff",
      });
      toast(`${item.name} cancelled`, "success");
      // Refresh in place AND tell the parent so the underlying list is fresh
      // when the user closes the modal.
      await refreshOrder();
      onChanged?.();
    } catch (e: any) {
      toast(e?.message ?? "Failed to cancel item", "error");
    } finally {
      setBusyItemId(null);
    }
  }

  async function handleAppended() {
    await refreshOrder();
    onChanged?.();
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={`Order ${view.code}`}
        subtitle={`${view.channel ?? ""}${
          view.tableCode ? ` · Table ${view.tableCode}` : ""
        }${view.priority && view.priority !== "Normal" ? ` · ${view.priority}` : ""}`}
        width="max-w-lg"
        footer={
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {canAppend && (
                <button
                  type="button"
                  className="btn-ghost flex items-center gap-1.5 text-brand-700"
                  onClick={() => setAppendOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add items
                </button>
              )}
              {canAppend && (
                <button
                  type="button"
                  className="btn-ghost flex items-center gap-1.5 text-ink-700"
                  onClick={() => setSuppliesOpen(true)}
                >
                  <Package className="h-4 w-4" />
                  Use supplies
                </button>
              )}
            </div>
            <button type="button" className="btn-primary" onClick={onClose}>
              Close
            </button>
          </div>
        }
      >
        <div className="space-y-5 max-h-[min(70vh,560px)] overflow-y-auto pr-1">
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={view.status} />
            <StatusBadge status={view.paymentStatus ?? "Pending"} />
            {view.channel && <StatusBadge status={view.channel} />}
            {view.source && (
              <span className="chip bg-ink-100 text-ink-700 text-xs">
                {view.source === "customer" ? "QR / guest" : "Staff"}
              </span>
            )}
          </div>

          {balanceDue > 0 && paidAmount > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-800">
                Bill reopened
              </p>
              <p className="text-ink-900">
                Rs {paidAmount.toLocaleString()} already paid · {" "}
                <span className="font-semibold text-amber-900">
                  Rs {balanceDue.toLocaleString()} outstanding
                </span>
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                Placed
              </p>
              <p className="text-ink-900">{fmtDt(view.placedAt)}</p>
            </div>
            {view.eta && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                  Order ETA
                </p>
                <p className="text-ink-900">{fmtDt(view.eta)}</p>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-ink-100 bg-ink-50/50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500 mb-1">
              Customer
            </p>
            <p className="font-medium text-ink-900">
              {view.customerName ?? "Walk-in / not provided"}
            </p>
            {(view.customerPhone || view.customerEmail) && (
              <p className="text-sm text-ink-600 mt-1">
                {[view.customerPhone, view.customerEmail].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>

          {view.channel === "Delivery" && (view.deliveryAddress || view.deliveryNote) && (
            <div className="rounded-lg border border-sky-100 bg-sky-50/40 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-800 mb-1">
                Delivery
              </p>
              {view.deliveryAddress && (
                <p className="text-sm text-ink-900">{view.deliveryAddress}</p>
              )}
              {view.deliveryNote && (
                <p className="text-xs text-ink-600 mt-1">{view.deliveryNote}</p>
              )}
              {view.cashOnDelivery && (
                <p className="text-xs font-semibold text-amber-800 mt-1">Cash on delivery</p>
              )}
            </div>
          )}

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500 mb-2">
              Line items ({items.length})
            </p>
            <div className="rounded-lg border border-ink-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-ink-50 text-left text-[10px] uppercase tracking-wider text-ink-500">
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2 text-right">Line</th>
                    {canCancelAny && <th className="px-2 py-2 w-8" />}
                  </tr>
                </thead>
                <tbody>
                  {items.map((it: any, i: number) => {
                    const isCancelled = it.status === "Cancelled";
                    // Once a line is Ready or already Cancelled it can't be cancelled
                    // from this UI — the backend rejects with 409 anyway.
                    // Block In Progress too — once the kitchen has started, the
                    // guest is told to order an addendum instead of wasting food.
                    const lineCancelable =
                      canCancelAny &&
                      !isCancelled &&
                      it.status !== "Ready" &&
                      it.status !== "In Progress";
                    const itemId = it.id ?? it._id;
                    const busy = busyItemId === String(itemId);
                    return (
                      <tr
                        key={lineKey(it, i)}
                        className={clsx(
                          "border-t border-ink-100",
                          isCancelled && "bg-ink-50/60 text-ink-400"
                        )}
                      >
                        <td className={clsx("px-3 py-2 tabular-nums font-medium", isCancelled && "line-through")}>
                          {it.qty}
                        </td>
                        <td className="px-3 py-2">
                          <div className={clsx("font-medium", isCancelled ? "text-ink-400 line-through" : "text-ink-900")}>
                            {it.name}
                          </div>
                          {it.station && (
                            <div className="text-[10px] text-ink-500">{it.station}</div>
                          )}
                          {it.mods?.length > 0 && (
                            <div className={clsx("text-xs", isCancelled ? "text-ink-400" : "text-brand-700")}>
                              {it.mods.join(" · ")}
                            </div>
                          )}
                          {it.note && (
                            <div className={clsx("text-xs italic", isCancelled ? "text-ink-400" : "text-amber-800")}>
                              Note: {it.note}
                            </div>
                          )}
                          {it.addendum && !isCancelled && (
                            <span className="inline-block mt-0.5 text-[9px] font-bold uppercase text-sky-600">
                              Add-on
                            </span>
                          )}
                          {isCancelled && it.cancelReason && (
                            <div className="text-[10px] text-ink-500 mt-0.5">
                              Reason: {it.cancelReason}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span className={clsx("text-xs font-medium", isCancelled ? "text-ink-400" : "text-ink-700")}>
                            {it.status}
                          </span>
                          {it.eta && !isCancelled && (
                            <div className="text-[10px] text-ink-500">
                              ETA {fmtDt(it.eta)}
                            </div>
                          )}
                        </td>
                        <td className={clsx("px-3 py-2 text-right tabular-nums", isCancelled ? "text-ink-400 line-through" : "text-ink-800")}>
                          {fmtMoney((it.price ?? 0) * (it.qty ?? 0))}
                        </td>
                        {canCancelAny && (
                          <td className="px-2 py-2 text-right">
                            {lineCancelable && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => cancelItem(it)}
                                title="Cancel this item"
                                aria-label={`Cancel ${it.name}`}
                                className="rounded-md p-1 text-ink-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {(view.supplies?.length ?? 0) > 0 && (
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                  Supplies used
                </p>
                {(view.suppliesCost ?? 0) > 0 && (
                  <p className="text-[10px] text-ink-500 tabular-nums">
                    Cost: {fmtMoney(view.suppliesCost)}
                  </p>
                )}
              </div>
              <ul className="text-xs space-y-1 rounded-lg border border-ink-100 bg-ink-50/40 p-2">
                {view.supplies.map((s: any, i: number) => (
                  <li key={s.id ?? s._id ?? i} className="flex justify-between gap-2 text-ink-700">
                    <span className="truncate">
                      <span className="tabular-nums font-medium">{s.qty}</span>{" "}
                      {s.unit ? `${s.unit} ` : ""}
                      {s.name}
                      {s.byName && (
                        <span className="text-[10px] text-ink-400"> · by {s.byName}</span>
                      )}
                      {s.reason && (
                        <span className="text-[10px] text-ink-500"> · {s.reason}</span>
                      )}
                    </span>
                    <span className="tabular-nums text-ink-500">
                      {fmtMoney((s.qty ?? 0) * (s.costPerUnit ?? 0))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {discounts.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500 mb-1">
                Adjustments
              </p>
              <ul className="text-sm space-y-1">
                {discounts.map((d: any, i: number) => (
                  <li key={i} className="flex justify-between text-ink-700">
                    <span>{d.label ?? d.source}</span>
                    <span className="tabular-nums">{fmtMoney(d.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-lg border border-ink-100 p-3 space-y-1 text-sm">
            <div className="flex justify-between text-ink-600">
              <span>Subtotal</span>
              <span className="tabular-nums">{fmtMoney(view.subtotal)}</span>
            </div>
            <div className="flex justify-between text-ink-600">
              <span>Tax</span>
              <span className="tabular-nums">{fmtMoney(view.tax)}</span>
            </div>
            <div className="flex justify-between text-ink-600">
              <span>Service</span>
              <span className="tabular-nums">{fmtMoney(view.service)}</span>
            </div>
            {(view.discountAmount ?? 0) !== 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discounts</span>
                <span className="tabular-nums">−{fmtMoney(Math.abs(view.discountAmount))}</span>
              </div>
            )}
            {(view.pointsRedeemed ?? 0) > 0 && (
              <div className="flex justify-between text-ink-600">
                <span>Points redeemed</span>
                <span className="tabular-nums">{view.pointsRedeemed} pts</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-ink-900 pt-2 border-t border-ink-100">
              <span>Total</span>
              <span className="tabular-nums">{fmtMoney(view.total)}</span>
            </div>
            {paidAmount > 0 && (
              <div className="flex justify-between text-ink-600">
                <span>Paid</span>
                <span className="tabular-nums">−{fmtMoney(paidAmount)}</span>
              </div>
            )}
            {balanceDue > 0 && paidAmount > 0 && (
              <div className="flex justify-between font-bold text-amber-800 pt-1">
                <span>Balance due</span>
                <span className="tabular-nums">{fmtMoney(balanceDue)}</span>
              </div>
            )}
            {view.paymentMethod && (
              <p className="text-xs text-ink-500 pt-1">
                Method: {view.paymentMethod}
              </p>
            )}
          </div>

          {view.couponCode && (
            <p className="text-xs text-ink-600">
              Coupon: <span className="font-mono font-semibold">{view.couponCode}</span>
            </p>
          )}

          {events.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500 mb-2">
                Recent activity
              </p>
              <ul className="space-y-2 text-xs text-ink-600 border-l-2 border-ink-200 pl-3">
                {events.map((ev: any, i: number) => (
                  <li key={i}>
                    <span className="text-ink-400 tabular-nums">{fmtDt(ev.at)}</span>
                    <span className="text-ink-800 ml-2">{ev.status}</span>
                    {ev.note && (
                      <span className="block text-ink-500 mt-0.5">{ev.note}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Modal>

      <AppendItemsDialog
        open={appendOpen}
        onClose={() => setAppendOpen(false)}
        orderId={orderId}
        orderCode={view.code}
        onAppended={handleAppended}
      />
      <UseSuppliesDialog
        open={suppliesOpen}
        onClose={() => setSuppliesOpen(false)}
        orderId={orderId}
        orderCode={view.code}
        onLogged={handleAppended}
      />
    </>
  );
}
