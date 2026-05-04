"use client";

import { Modal } from "@/components/Modal";
import { StatusBadge } from "@/components/ui";

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
}: {
  open: boolean;
  onClose: () => void;
  order: any | null;
}) {
  if (!order) return null;

  const items = order.items ?? [];
  const events = [...(order.events ?? [])].reverse().slice(0, 20);
  const discounts = order.discountLines ?? [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Order ${order.code}`}
      subtitle={`${order.channel ?? ""}${
        order.tableCode ? ` · Table ${order.tableCode}` : ""
      }${order.priority && order.priority !== "Normal" ? ` · ${order.priority}` : ""}`}
      width="max-w-lg"
      footer={
        <button type="button" className="btn-primary" onClick={onClose}>
          Close
        </button>
      }
    >
      <div className="space-y-5 max-h-[min(70vh,560px)] overflow-y-auto pr-1">
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={order.status} />
          <StatusBadge status={order.paymentStatus ?? "Pending"} />
          {order.channel && <StatusBadge status={order.channel} />}
          {order.source && (
            <span className="chip bg-ink-100 text-ink-700 text-xs">
              {order.source === "customer" ? "QR / guest" : "Staff"}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
              Placed
            </p>
            <p className="text-ink-900">{fmtDt(order.placedAt)}</p>
          </div>
          {order.eta && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                Order ETA
              </p>
              <p className="text-ink-900">{fmtDt(order.eta)}</p>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-ink-100 bg-ink-50/50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500 mb-1">
            Customer
          </p>
          <p className="font-medium text-ink-900">
            {order.customerName ?? "Walk-in / not provided"}
          </p>
          {(order.customerPhone || order.customerEmail) && (
            <p className="text-sm text-ink-600 mt-1">
              {[order.customerPhone, order.customerEmail].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        {order.channel === "Delivery" && (order.deliveryAddress || order.deliveryNote) && (
          <div className="rounded-lg border border-sky-100 bg-sky-50/40 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-800 mb-1">
              Delivery
            </p>
            {order.deliveryAddress && (
              <p className="text-sm text-ink-900">{order.deliveryAddress}</p>
            )}
            {order.deliveryNote && (
              <p className="text-xs text-ink-600 mt-1">{order.deliveryNote}</p>
            )}
            {order.cashOnDelivery && (
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
                </tr>
              </thead>
              <tbody>
                {items.map((it: any, i: number) => (
                  <tr key={lineKey(it, i)} className="border-t border-ink-100">
                    <td className="px-3 py-2 tabular-nums font-medium">{it.qty}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-ink-900">{it.name}</div>
                      {it.station && (
                        <div className="text-[10px] text-ink-500">{it.station}</div>
                      )}
                      {it.mods?.length > 0 && (
                        <div className="text-xs text-brand-700">{it.mods.join(" · ")}</div>
                      )}
                      {it.note && (
                        <div className="text-xs text-amber-800 italic">Note: {it.note}</div>
                      )}
                      {it.addendum && (
                        <span className="inline-block mt-0.5 text-[9px] font-bold uppercase text-sky-600">
                          Add-on
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className="text-xs font-medium text-ink-700">{it.status}</span>
                      {it.eta && (
                        <div className="text-[10px] text-ink-500">
                          ETA {fmtDt(it.eta)}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink-800">
                      {fmtMoney((it.price ?? 0) * (it.qty ?? 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

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
            <span className="tabular-nums">{fmtMoney(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-ink-600">
            <span>Tax</span>
            <span className="tabular-nums">{fmtMoney(order.tax)}</span>
          </div>
          <div className="flex justify-between text-ink-600">
            <span>Service</span>
            <span className="tabular-nums">{fmtMoney(order.service)}</span>
          </div>
          {(order.discountAmount ?? 0) !== 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Discounts</span>
              <span className="tabular-nums">−{fmtMoney(Math.abs(order.discountAmount))}</span>
            </div>
          )}
          {(order.pointsRedeemed ?? 0) > 0 && (
            <div className="flex justify-between text-ink-600">
              <span>Points redeemed</span>
              <span className="tabular-nums">{order.pointsRedeemed} pts</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-ink-900 pt-2 border-t border-ink-100">
            <span>Total</span>
            <span className="tabular-nums">{fmtMoney(order.total)}</span>
          </div>
          {order.paymentMethod && (
            <p className="text-xs text-ink-500 pt-1">
              Method: {order.paymentMethod}
            </p>
          )}
        </div>

        {order.couponCode && (
          <p className="text-xs text-ink-600">
            Coupon: <span className="font-mono font-semibold">{order.couponCode}</span>
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
  );
}
