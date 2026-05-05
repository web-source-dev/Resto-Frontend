"use client";

import { PageHeader, Card, StatusBadge } from "@dinova/components/ui";
import { useApi } from "@dinova/lib/useApi";
import { useCallback } from "react";
import { useSocketEvent } from "@dinova/lib/SocketProvider";
import { api } from "@dinova/lib/api";
import { useToast } from "@dinova/components/Toaster";
import { Bell, CheckCircle2, Timer, Users } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@dinova/lib/AuthProvider";

function elapsed(d?: string) {
  if (!d) return "";
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export default function WaiterPage() {
  const { user } = useAuth();
  const { data: tData, refresh: refreshTables } = useApi<{ tables: any[] }>(
    "/api/tables"
  );
  const { data: oData, refresh: refreshOrders } = useApi<{ orders: any[] }>(
    "/api/orders?active=true"
  );
  const toast = useToast();

  const onEvt = useCallback(() => {
    refreshTables();
    refreshOrders();
  }, [refreshTables, refreshOrders]);
  useSocketEvent("order:update", onEvt);
  useSocketEvent("order:new", onEvt);
  useSocketEvent("table:update", onEvt);

  const tables = tData?.tables ?? [];
  const orders = oData?.orders ?? [];
  const ready = orders.filter((o: any) => o.status === "Ready");

  async function markServed(id: string) {
    try {
      await api.post(`/api/orders/${id}/transition`, { to: "Served" });
      toast("Marked served", "success");
      onEvt();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function setTable(id: string, status: string) {
    try {
      await api.post(`/api/tables/${id}/status`, { status });
      toast(`Table → ${status}`, "success");
      refreshTables();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  return (
    <>
      <PageHeader
        title={`Hey ${user?.name?.split(" ")[0] ?? "waiter"} 👋`}
        subtitle="Your tables and assigned orders · live updates"
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5">
          <p className="kpi-label">Tables occupied</p>
          <p className="kpi-value mt-1.5">
            {tables.filter((t: any) => t.status === "Occupied").length}
          </p>
        </div>
        <div className="card p-5">
          <p className="kpi-label">Orders ready</p>
          <p className="kpi-value mt-1.5 text-emerald-600">{ready.length}</p>
          <p className="text-[11px] text-ink-500 mt-0.5">Needs pickup</p>
        </div>
        <div className="card p-5">
          <p className="kpi-label">In-progress</p>
          <p className="kpi-value mt-1.5">
            {orders.filter((o: any) => o.status === "In Progress").length}
          </p>
        </div>
        <div className="card p-5">
          <p className="kpi-label">Avg. wait</p>
          <p className="kpi-value mt-1.5">
            {orders.length
              ? Math.round(
                  orders.reduce(
                    (s: number, o: any) => s + (o.elapsedMin ?? 0),
                    0
                  ) / orders.length
                )
              : 0}
            m
          </p>
        </div>
      </div>

      {ready.length > 0 && (
        <Card
          title="⏰ Ready for pickup"
          subtitle="Deliver to table immediately"
          className="mb-6 border-emerald-200 bg-emerald-50/30"
        >
          <div className="space-y-2">
            {ready.map((o: any) => (
              <div
                key={o.id}
                className="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-white p-3 sm:flex-row sm:items-center sm:gap-3"
              >
                <Bell className="w-5 h-5 text-emerald-600 animate-pulseDot shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">
                    {o.code} · {o.tableCode ?? o.channel}
                  </p>
                  <p className="text-[11px] text-ink-500">
                    {o.items?.length} items · Rs {(o.total ?? 0).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => markServed(o.id)}
                  className="btn bg-emerald-500 text-white hover:bg-emerald-600"
                >
                  <CheckCircle2 className="w-4 h-4" /> Picked up
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title="Your tables" subtitle="Tap to update status">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {tables.map((t: any) => {
              const bg: Record<string, string> = {
                Free: "border-emerald-200 bg-emerald-50/60",
                Occupied: "border-sky-200 bg-sky-50/60",
                Reserved: "border-violet-200 bg-violet-50/60",
                Cleaning: "border-amber-200 bg-amber-50/60",
              };
              return (
                <div
                  key={t.id}
                  className={clsx(
                    "rounded-xl border-2 p-3 text-left",
                    bg[t.status] ?? "border-ink-200"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-ink-900">{t.code}</p>
                      <p className="text-[11px] text-ink-500">
                        <Users className="w-3 h-3 inline mr-0.5" />
                        {t.capacity} · {t.zone}
                      </p>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                  {t.status === "Occupied" && (
                    <p className="text-[11px] text-ink-500 mb-2">
                      <Timer className="w-3 h-3 inline mr-0.5" />
                      {elapsed(t.seatedAt)}
                    </p>
                  )}
                  <div className="flex gap-1">
                    {t.status === "Cleaning" && (
                      <button
                        onClick={() => setTable(t.id, "Free")}
                        className="text-[11px] flex-1 bg-white border border-ink-200 rounded px-1.5 py-1 font-medium hover:bg-ink-50"
                      >
                        Mark clean
                      </button>
                    )}
                    {t.status === "Occupied" && (
                      <button
                        onClick={() => setTable(t.id, "Cleaning")}
                        className="text-[11px] flex-1 bg-white border border-ink-200 rounded px-1.5 py-1 font-medium hover:bg-ink-50"
                      >
                        Needs cleaning
                      </button>
                    )}
                    {t.status === "Free" && (
                      <span className="text-[11px] text-ink-400">Ready to seat</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Active orders" subtitle="All channels" pad={false}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Order</th>
                  <th className="table-th">Table</th>
                  <th className="table-th">Items</th>
                  <th className="table-th">Status</th>
                  <th className="table-th">Elapsed</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o: any) => (
                  <tr key={o.id} className="hover:bg-ink-50/60">
                    <td className="table-td font-medium">{o.code}</td>
                    <td className="table-td">{o.tableCode ?? "—"}</td>
                    <td className="table-td text-ink-600">
                      {o.items?.length ?? 0}
                    </td>
                    <td className="table-td">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="table-td tabular-nums text-ink-500">
                      {o.elapsedMin ?? 0}m
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="table-td text-center text-ink-500 py-6">
                      No active orders.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
