"use client";

import { PageHeader, Card, StatusBadge } from "@dinova/components/ui";
import {
  Filter,
  Download,
  Plus,
  Search,
  Printer,
  X as XIcon,
  ChefHat,
  Inbox,
  Eye,
} from "lucide-react";
import { useApi } from "@dinova/lib/useApi";
import { useCallback, useMemo, useState } from "react";
import { useSocketEvent } from "@dinova/lib/SocketProvider";
import { NewOrderModal } from "@dinova/components/NewOrderModal";
import { api } from "@dinova/lib/api";
import { useToast } from "@dinova/components/Toaster";
import { useAuth } from "@dinova/lib/AuthProvider";
import { canPerform } from "@dinova/lib/roles";
import { Modal, Field, Input, Select } from "@dinova/components/Modal";
import { downloadText, toCSV, generatePdfReceipt } from "@dinova/lib/export";
import { OrderDetailModal } from "@dinova/components/OrderDetailModal";

const PAGE_SIZE = 25;

export default function OrdersPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, refresh } = useApi<{ orders: any[] }>("/api/orders?limit=500");
  const canForward = ["admin", "manager", "receptionist"].includes(
    user?.role ?? ""
  );
  const [filter, setFilter] = useState("All");
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<any | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [advFilter, setAdvFilter] = useState<{
    fromDate?: string;
    toDate?: string;
    channel?: string;
    payment?: string;
    status?: string;
  }>({});

  const onEvt = useCallback(() => refresh(), [refresh]);
  useSocketEvent("order:new", onEvt);
  useSocketEvent("order:update", onEvt);

  const orders = data?.orders ?? [];
  // Pending inbox = new orders + existing orders with pending addendum items
  const pendingOrders = orders.filter(
    (o) =>
      o.status === "Pending" ||
      (o.items ?? []).some((i: any) => i.status === "Pending")
  );
  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (filter !== "All") {
        if (filter === "Pending" && o.status !== "Pending") return false;
        else if (filter === "Overdue") {
          if (!["Queued", "In Progress"].includes(o.status)) return false;
          if ((o.elapsedMin ?? 0) < 18) return false;
        } else if (filter === "Ready" && o.status !== "Ready") return false;
        else if (filter === "Completed" && o.status !== "Completed") return false;
        else if (
          ["Dine-in", "Takeaway", "Delivery"].includes(filter) &&
          o.channel !== filter
        )
          return false;
      }
      if (q) {
        const hay = `${o.code} ${o.customerName ?? ""} ${o.tableCode ?? ""}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      if (advFilter.channel && o.channel !== advFilter.channel) return false;
      if (advFilter.payment && o.paymentStatus !== advFilter.payment) return false;
      if (advFilter.status && o.status !== advFilter.status) return false;
      if (advFilter.fromDate && new Date(o.placedAt) < new Date(advFilter.fromDate))
        return false;
      if (advFilter.toDate && new Date(o.placedAt) > new Date(advFilter.toDate))
        return false;
      return true;
    });
  }, [orders, filter, q, advFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = useMemo(() => {
    const pending = orders.filter((o) => o.status === "Pending").length;
    const open = orders.filter((o) =>
      ["Queued", "In Progress", "Ready"].includes(o.status)
    ).length;
    const overdue = orders.filter(
      (o) =>
        ["Queued", "In Progress"].includes(o.status) && (o.elapsedMin ?? 0) >= 18
    ).length;
    const ready = orders.filter((o) => o.status === "Ready").length;
    const completed = orders.filter((o) =>
      ["Completed", "Served"].includes(o.status)
    ).length;
    return [
      { label: "Pending review", value: pending, tone: "amber" },
      { label: "In kitchen", value: open, tone: "sky" },
      { label: "Overdue", value: overdue, tone: "rose" },
      { label: "Completed", value: completed, tone: "ink" },
    ];
  }, [orders]);

  async function pay(o: any) {
    try {
      await api.post(`/api/orders/${o.id}/pay`, { method: "Cash" });
      toast("Payment recorded", "success");
      refresh();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function forward(o: any) {
    try {
      const isAddendum =
        o.status !== "Pending" &&
        (o.items ?? []).some((i: any) => i.status === "Pending");
      const endpoint = isAddendum
        ? `/api/orders/${o.id}/forward-addendum`
        : `/api/orders/${o.id}/forward`;
      await api.post(endpoint);
      toast(
        isAddendum
          ? `${o.code} addendum forwarded to kitchen`
          : `${o.code} forwarded to kitchen`,
        "success"
      );
      refresh();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function transition(o: any, to: string) {
    try {
      await api.post(`/api/orders/${o.id}/transition`, { to });
      toast(`Order ${to.toLowerCase()}`, "success");
      refresh();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  function exportCSV() {
    const csv = toCSV(filtered, [
      { key: "code", header: "Order" },
      { key: "placedAt", header: "Placed at", map: (v) => new Date(v).toISOString() },
      { key: "channel", header: "Channel" },
      { key: "tableCode", header: "Table" },
      { key: "customerName", header: "Customer" },
      { key: "items", header: "Items", map: (v: any[]) => v?.length ?? 0 },
      { key: "subtotal", header: "Subtotal" },
      { key: "tax", header: "Tax" },
      { key: "service", header: "Service" },
      { key: "total", header: "Total" },
      { key: "status", header: "Status" },
      { key: "paymentStatus", header: "Payment" },
      { key: "paymentMethod", header: "Method" },
    ]);
    downloadText(`orders-${Date.now()}.csv`, csv);
    toast(`Exported ${filtered.length} orders`, "success");
  }

  const filterCount = Object.values(advFilter).filter(Boolean).length;

  // Waiters only work the floor — strip non-dine-in channel chips and the
  // channel select from advanced filters. The backend enforces this too.
  const isWaiter = user?.role === "waiter";
  const filterChips = isWaiter
    ? ["All", "Pending", "Overdue", "Ready", "Completed"]
    : ["All", "Pending", "Dine-in", "Takeaway", "Delivery", "Overdue", "Ready", "Completed"];

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle={
          isWaiter
            ? "Dine-in floor · your tables"
            : "All channels · dine-in, takeaway, delivery, phone"
        }
        right={
          <>
            <button className="btn-outline" onClick={exportCSV}>
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button className="btn-primary" onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4" /> New order
            </button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
        {stats.map((s) => {
          const toneMap: Record<string, string> = {
            amber: "text-amber-700",
            sky: "text-sky-700",
            rose: "text-rose-600",
            ink: "text-ink-900",
          };
          return (
            <div key={s.label} className="card p-4">
              <p className="kpi-label">{s.label}</p>
              <p
                className={`text-2xl font-semibold mt-1 tabular-nums ${
                  toneMap[s.tone as string] ?? "text-ink-900"
                }`}
              >
                {s.value}
              </p>
            </div>
          );
        })}
      </div>

      {pendingOrders.length > 0 && (
        <Card
          className="mb-5 border-amber-200 bg-amber-50/40"
          title={`🛎️ ${pendingOrders.length} order${
            pendingOrders.length === 1 ? "" : "s"
          } awaiting review`}
          subtitle="New QR orders + addendum items added by guests · forward after a quick check"
          right={
            canForward && (
              <span className="chip bg-amber-100 text-amber-800">
                Your action
              </span>
            )
          }
        >
          <div className="space-y-2">
            {pendingOrders.map((o) => (
              <PendingRow
                key={o.id}
                o={o}
                canForward={canForward}
                onForward={() => forward(o)}
                onVoid={() => transition(o, "Cancelled")}
                onView={() => setDetailOrder(o)}
              />
            ))}
          </div>
        </Card>
      )}

      <Card
        title="All orders"
        subtitle={`${filtered.length} match`}
        right={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
            <div className="relative w-full sm:w-auto">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                placeholder="Order #, customer…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-full rounded-lg border border-ink-200/60 bg-ink-50 pl-9 pr-3 text-sm focus:bg-white focus:outline-none sm:w-56"
              />
            </div>
            <button
              onClick={() => setFiltersOpen(true)}
              className="btn-outline relative"
            >
              <Filter className="w-4 h-4" /> Filters
              {filterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-brand-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {filterCount}
                </span>
              )}
            </button>
          </div>
        }
        pad={false}
      >
        <div className="flex items-center gap-2 overflow-x-auto px-5 py-3 border-t border-ink-100 bg-ink-50/40 text-xs">
          {filterChips.map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFilter(f);
                  setPage(1);
                }}
                className={`shrink-0 px-2.5 py-1 rounded-md font-medium ${
                  filter === f
                    ? "bg-white border border-ink-200 text-ink-900 shadow-sm"
                    : "text-ink-500 hover:text-ink-800"
                }`}
              >
                {f}
              </button>
            )
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-th">Order</th>
                <th className="table-th">Time</th>
                <th className="table-th">Channel</th>
                <th className="table-th">Table</th>
                <th className="table-th">Customer</th>
                <th className="table-th">Items</th>
                <th className="table-th">Total</th>
                <th className="table-th">Status</th>
                <th className="table-th">Payment</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody>
              {paged.map((o: any) => (
                <tr
                  key={o.id}
                  className={`hover:bg-ink-50/60 ${
                    (o.elapsedMin ?? 999) <= 2
                      ? "bg-emerald-50/60"
                      : (o.elapsedMin ?? 999) <= 5
                      ? "bg-sky-50/40"
                      : ""
                  }`}
                >
                  <td className="table-td font-medium text-ink-900">
                    <div className="flex items-center gap-1.5">
                      <span>{o.code}</span>
                      {(o.elapsedMin ?? 999) <= 2 ? (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                          New
                        </span>
                      ) : (o.elapsedMin ?? 999) <= 5 ? (
                        <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sky-700">
                          Recent
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="table-td text-ink-600 tabular-nums">
                    {new Date(o.placedAt).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="table-td">
                    <StatusBadge status={o.channel} />
                  </td>
                  <td className="table-td text-ink-600">{o.tableCode ?? "—"}</td>
                  <td className="table-td text-ink-800">
                    {o.customerName ?? "Walk-in"}
                  </td>
                  <td className="table-td text-ink-600">{o.items?.length ?? 0}</td>
                  <td className="table-td font-medium tabular-nums">
                    Rs {(o.total ?? 0).toLocaleString()}
                  </td>
                  <td className="table-td">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="table-td">
                    <StatusBadge status={o.paymentStatus} />
                  </td>
                  <td className="table-td text-right">
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setDetailOrder(o)}
                        className="text-xs font-medium text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                      <button
                        type="button"
                        onClick={() => generatePdfReceipt(o)}
                        className="text-xs text-ink-500 hover:text-ink-800"
                        title="Print receipt"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      {o.paymentStatus === "Pending" && (
                        <button
                          type="button"
                          onClick={() => pay(o)}
                          className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                        >
                          Pay
                        </button>
                      )}
                      {o.status === "Served" && (
                        <button
                          type="button"
                          onClick={() => transition(o, "Completed")}
                          className="text-xs font-medium text-brand-600 hover:text-brand-700"
                        >
                          Close
                        </button>
                      )}
                      {canPerform(user?.role, "order.void") &&
                        ["Queued", "In Progress"].includes(o.status) && (
                          <button
                            type="button"
                            onClick={() => transition(o, "Cancelled")}
                            className="text-xs font-medium text-rose-600 hover:text-rose-700"
                          >
                            Void
                          </button>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="table-td text-center text-ink-500 py-10"
                  >
                    No orders match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-2 px-5 py-3 border-t border-ink-100 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Page {page} of {totalPages} · showing {paged.length} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-ghost px-2 py-1 text-xs disabled:opacity-40"
            >
              Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn-ghost px-2 py-1 text-xs disabled:opacity-40"
            >
              Next
            </button>
            <button
              onClick={() => refresh()}
              className="btn-ghost px-2 py-1 text-xs"
            >
              Refresh
            </button>
          </div>
        </div>
      </Card>

      <Modal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        subtitle="Refine the order list"
        footer={
          <>
            <button
              className="btn-outline"
              onClick={() => {
                setAdvFilter({});
                setFiltersOpen(false);
                setPage(1);
              }}
            >
              <XIcon className="w-3.5 h-3.5" /> Clear
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                setFiltersOpen(false);
                setPage(1);
              }}
            >
              Apply
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="From">
            <Input
              type="datetime-local"
              value={advFilter.fromDate ?? ""}
              onChange={(e) =>
                setAdvFilter({ ...advFilter, fromDate: e.target.value })
              }
            />
          </Field>
          <Field label="To">
            <Input
              type="datetime-local"
              value={advFilter.toDate ?? ""}
              onChange={(e) =>
                setAdvFilter({ ...advFilter, toDate: e.target.value })
              }
            />
          </Field>
        </div>
        {!isWaiter && (
          <Field label="Channel">
            <Select
              value={advFilter.channel ?? ""}
              onChange={(e) =>
                setAdvFilter({ ...advFilter, channel: e.target.value || undefined })
              }
            >
              <option value="">Any</option>
              {["Dine-in", "Takeaway", "Delivery", "Phone"].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Status">
          <Select
            value={advFilter.status ?? ""}
            onChange={(e) =>
              setAdvFilter({ ...advFilter, status: e.target.value || undefined })
            }
          >
            <option value="">Any</option>
            {[
              "Queued",
              "In Progress",
              "Ready",
              "Served",
              "Completed",
              "Cancelled",
            ].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Payment">
          <Select
            value={advFilter.payment ?? ""}
            onChange={(e) =>
              setAdvFilter({ ...advFilter, payment: e.target.value || undefined })
            }
          >
            <option value="">Any</option>
            {["Pending", "Paid", "Refunded"].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </Field>
      </Modal>

      <NewOrderModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={refresh}
      />

      <OrderDetailModal
        open={!!detailOrder}
        order={detailOrder}
        onClose={() => setDetailOrder(null)}
        userRole={user?.role}
        onChanged={refresh}
      />
    </>
  );
}

function PendingRow({
  o,
  canForward,
  onForward,
  onVoid,
  onView,
}: {
  o: any;
  canForward: boolean;
  onForward: () => void;
  onVoid: () => void;
  onView: () => void;
}) {
  const pendingItems = (o.items ?? []).filter(
    (i: any) => i.status === "Pending"
  );
  const isAddendum = o.status !== "Pending" && pendingItems.length > 0;
  const waitingMin = o.elapsedMin ?? 0;
  const isFresh = waitingMin <= 2;
  const isRecent = waitingMin <= 5;
  const warn = waitingMin >= 3;
  const ringTone = isAddendum
    ? "bg-sky-50 border-sky-200"
    : "bg-white border-amber-100";
  const iconTone = isAddendum
    ? "bg-sky-100 text-sky-700"
    : "bg-amber-100 text-amber-700";
  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border p-3 shadow-sm sm:flex-row sm:items-center ${ringTone} ${
        isFresh ? "ring-2 ring-emerald-100" : isRecent ? "ring-1 ring-sky-100" : ""
      }`}
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconTone}`}
      >
        <Inbox className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-bold text-ink-900 truncate">{o.code}</p>
          {isAddendum ? (
            <span className="chip bg-sky-100 text-sky-700 font-semibold">
              +{pendingItems.length} new item
              {pendingItems.length === 1 ? "" : "s"}
            </span>
          ) : (
            <StatusBadge status={o.channel} />
          )}
          {o.tableCode && (
            <span className="chip bg-ink-100 text-ink-700">
              {o.tableCode}
            </span>
          )}
          {!isAddendum && (
            <span
              className={`chip ${
                warn ? "bg-rose-50 text-rose-700" : "bg-ink-100 text-ink-600"
              }`}
            >
              ⏱ {waitingMin}m waiting
            </span>
          )}
          {isFresh && (
            <span className="chip bg-emerald-100 text-emerald-700 font-semibold">
              Just arrived
            </span>
          )}
          {!isFresh && isRecent && (
            <span className="chip bg-sky-100 text-sky-700 font-semibold">
              New
            </span>
          )}
          {isAddendum && (
            <span className="chip bg-ink-100 text-ink-600">
              Order {o.status}
            </span>
          )}
        </div>
        <p className="text-xs text-ink-500 mt-1 truncate">
          {o.customerName ?? "Walk-in"} ·{" "}
          {(isAddendum ? pendingItems : o.items)
            ?.map((i: any) => `${i.qty}× ${i.name}`)
            .slice(0, 3)
            .join(" · ")}
          {(isAddendum ? pendingItems.length : o.items?.length) > 3 ? " …" : ""}
        </p>
      </div>
      <div className="shrink-0 text-left sm:text-right">
        <p className="font-bold tabular-nums">
          Rs {(o.total ?? 0).toLocaleString()}
        </p>
        <p className="text-[10px] text-ink-500">
          {isAddendum
            ? `${pendingItems.length} new / ${o.items?.length} total`
            : `${o.items?.length} items`}
        </p>
      </div>
      <div className="flex flex-col items-stretch gap-2 shrink-0 self-start sm:self-auto sm:items-end">
        <button
          type="button"
          onClick={onView}
          className="btn-outline text-xs inline-flex items-center justify-center gap-1"
        >
          <Eye className="w-3.5 h-3.5" /> View details
        </button>
        {canForward && (
          <div className="flex items-center gap-1">
            {!isAddendum && (
              <button
                type="button"
                onClick={onVoid}
                className="btn-ghost text-xs text-rose-600 hover:text-rose-700"
              >
                Void
              </button>
            )}
            <button
              type="button"
              onClick={onForward}
              className="btn-primary text-xs"
            >
              <ChefHat className="w-3.5 h-3.5" />{" "}
              {isAddendum ? "Forward addendum" : "Forward to kitchen"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
