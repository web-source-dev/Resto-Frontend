"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  Clock,
  DollarSign,
  Flame,
  PackageOpen,
  Receipt,
  Star,
  TrendingUp,
  Users,
  Utensils,
} from "lucide-react";
import { Card, Kpi, PageHeader, Progress, StatusBadge } from "@dinova/components/ui";
import { RevenueChart } from "@dinova/components/charts/RevenueChart";
import { ChannelChart } from "@dinova/components/charts/ChannelChart";
import { WeekBars } from "@dinova/components/charts/WeekBars";
import { useApi } from "@dinova/lib/useApi";
import { useSocketEvent } from "@dinova/lib/SocketProvider";
import { useCallback } from "react";
import { useAuth } from "@dinova/lib/AuthProvider";
import { api } from "@dinova/lib/api";
import { downloadText, toCSV } from "@dinova/lib/export";
import { useToast } from "@dinova/components/Toaster";

type OverviewData = {
  kpis: {
    revenueToday: number;
    orders: number;
    aov: number;
    ots: string;
    foodCostPct: number;
    activeTables: string;
    freeTables: number;
    cleaningTables: number;
    activeStaff: number;
    avgRating: number;
    reviewsCount: number;
    lowStockCount: number;
    wastageToday: number;
  };
  hourly: { t: string; rev: number; ord: number }[];
  channelPct: Record<string, number>;
  weekChannels: { d: string; dinein: number; delivery: number; takeaway: number }[];
  activeOrders: any[];
  topItems: { name: string; sold: number; revenue: number; margin: number }[];
  alerts: { level: string; title: string; meta: string }[];
};

export default function Home() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, refresh } = useApi<OverviewData>("/api/overview");

  async function exportDaily() {
    try {
      const r = await api.get<{ orders: any[] }>("/api/orders?limit=500");
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todays = (r.orders ?? []).filter(
        (o) => new Date(o.placedAt) >= todayStart
      );
      const csv = toCSV(todays, [
        { key: "code", header: "Order" },
        {
          key: "placedAt",
          header: "Placed",
          map: (v) => new Date(v).toISOString(),
        },
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
      downloadText(`daily-${new Date().toISOString().slice(0, 10)}.csv`, csv);
      toast(`Daily report exported · ${todays.length} orders`, "success");
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  const onOrderEvent = useCallback(() => refresh(), [refresh]);
  useSocketEvent("order:new", onOrderEvent);
  useSocketEvent("order:update", onOrderEvent);
  useSocketEvent("inventory:update", onOrderEvent);
  useSocketEvent("table:update", onOrderEvent);

  const k = data?.kpis;
  const maxSold = Math.max(1, ...(data?.topItems.map((t) => t.sold) ?? [1]));
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <>
      <PageHeader
        title={`Good afternoon, ${firstName} 👋`}
        subtitle={`Here's what's happening at Gulberg Outlet — ${today}`}
        right={
          <>
            <a href="/reports" className="btn-outline">
              Full reports
            </a>
            <button className="btn-primary" onClick={exportDaily}>
              <TrendingUp className="w-4 h-4" /> Export daily report
            </button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Revenue today"
          value={k ? `Rs ${k.revenueToday.toLocaleString()}` : "—"}
          icon={DollarSign}
          tone="brand"
          hint={k ? `${k.orders} orders today` : undefined}
        />
        <Kpi
          label="Orders"
          value={k ? `${k.orders}` : "—"}
          icon={Receipt}
          tone="sky"
          hint={k ? `AOV · Rs ${k.aov.toLocaleString()}` : undefined}
        />
        <Kpi
          label="Order-to-serve"
          value={k?.ots ?? "—"}
          icon={Clock}
          tone="emerald"
          hint="SLA · ≤ 18 min"
        />
        <Kpi
          label="Food cost %"
          value={k ? `${k.foodCostPct}%` : "—"}
          icon={Flame}
          tone="amber"
          hint="Target · ≤ 32%"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div className="xl:col-span-2">
          <Card
            title="Revenue · Today"
            subtitle="Hourly sales, PKR"
            right={
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
                  Today
                </span>
                <a href="/reports" className="btn-ghost px-2 py-1 text-xs">
                  View full report
                </a>
              </div>
            }
          >
            <RevenueChart data={data?.hourly ?? []} />
            <div className="mt-2 -mx-5 -mb-5 grid grid-cols-1 divide-y divide-ink-100 border-t border-ink-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <Stat
                label="Peak hour"
                value={(() => {
                  if (!data?.hourly?.length) return "—";
                  const peak = data.hourly.reduce((a, b) => (b.rev > a.rev ? b : a));
                  const h = Number(peak.t);
                  return `${h < 12 ? h || 12 : h === 12 ? 12 : h - 12}${
                    h < 12 ? "am" : "pm"
                  }`;
                })()}
                sub={
                  data?.hourly?.length
                    ? `Rs ${Math.max(...data.hourly.map((h) => h.rev)).toLocaleString()}`
                    : "—"
                }
              />
              <Stat
                label="Active orders"
                value={`${data?.activeOrders?.length ?? 0}`}
                sub="Queued / In-progress / Ready"
              />
              <Stat
                label="Avg. rating"
                value={k ? `${k.avgRating} ⭐` : "—"}
                sub={k ? `${k.reviewsCount} reviews` : "—"}
              />
            </div>
          </Card>
        </div>

        <Card
          title="Channel mix"
          subtitle="Orders today by channel"
          right={
            <a href="/orders" className="text-xs text-ink-500 hover:text-ink-800 flex items-center gap-1">
              Details <ArrowUpRight className="w-3 h-3" />
            </a>
          }
        >
          <ChannelChart data={data?.channelPct ?? {}} />
          <div className="border-t border-ink-100 pt-3 mt-1 flex items-center justify-between text-sm">
            <span className="text-ink-500">Digital order adoption</span>
            <span className="font-semibold text-ink-900">
              {data?.channelPct
                ? `${(data.channelPct["Dine-in"] ?? 0) + (data.channelPct["Takeaway"] ?? 0) + (data.channelPct["Delivery"] ?? 0)}%`
                : "—"}
            </span>
          </div>
          <Progress
            value={
              data?.channelPct
                ? (data.channelPct["Dine-in"] ?? 0) +
                  (data.channelPct["Takeaway"] ?? 0) +
                  (data.channelPct["Delivery"] ?? 0)
                : 0
            }
            tone="brand"
          />
          <p className="text-[11px] text-ink-400 mt-1.5">Target ≥ 70% of dine-in</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div className="xl:col-span-2">
          <Card
            title="Live order queue"
            subtitle="Auto-refreshes via WebSocket"
            right={
              <div className="flex items-center gap-2 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulseDot" />
                Real-time
              </div>
            }
            pad={false}
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">Order</th>
                    <th className="table-th">Channel</th>
                    <th className="table-th">Table</th>
                    <th className="table-th">Items</th>
                    <th className="table-th">Total</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Elapsed</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.activeOrders ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={7} className="table-td text-center text-ink-500 py-8">
                        No active orders right now.
                      </td>
                    </tr>
                  ) : (
                    data!.activeOrders.map((o: any) => (
                      <tr key={o.id} className="hover:bg-ink-50/60">
                        <td className="table-td font-medium text-ink-900">{o.code}</td>
                        <td className="table-td">
                          <StatusBadge status={o.channel} />
                        </td>
                        <td className="table-td text-ink-600">{o.tableCode ?? "—"}</td>
                        <td className="table-td text-ink-600">{o.items?.length ?? 0}</td>
                        <td className="table-td font-medium">
                          Rs {(o.total ?? 0).toLocaleString()}
                        </td>
                        <td className="table-td">
                          <StatusBadge status={o.status} />
                        </td>
                        <td className="table-td text-ink-500 tabular-nums">
                          {o.elapsedMin ?? 0}m
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <Card
          title="Operational alerts"
          subtitle="Needs attention"
          right={
            <span className="chip bg-rose-50 text-rose-700">
              {data?.alerts?.length ?? 0} open
            </span>
          }
        >
          <div className="space-y-3">
            {(data?.alerts ?? []).length === 0 ? (
              <p className="text-sm text-ink-500 text-center py-6">
                All systems nominal.
              </p>
            ) : (
              data!.alerts.map((a, i) => {
                const color =
                  a.level === "high"
                    ? "bg-rose-50 text-rose-600"
                    : a.level === "med"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-sky-50 text-sky-700";
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-ink-50/60"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}
                    >
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-900 leading-snug">
                        {a.title}
                      </p>
                      <p className="text-xs text-ink-500 mt-0.5">{a.meta}</p>
                    </div>
                    <a
                      href="/inventory"
                      className="text-xs font-medium text-brand-600 hover:text-brand-700 shrink-0"
                    >
                      Open
                    </a>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div className="xl:col-span-2">
          <Card
            title="Weekly sales by channel"
            subtitle="Rolling 7 days · dine-in, takeaway, delivery"
          >
            <WeekBars data={data?.weekChannels ?? []} />
          </Card>
        </div>

        <Card title="Menu performance" subtitle="Top items · 7-day volume">
          <div className="space-y-3.5">
            {(data?.topItems ?? []).map((it, i) => (
              <div key={it.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-md bg-ink-100 text-ink-600 text-[11px] font-semibold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="font-medium text-ink-900 truncate">
                      {it.name}
                    </span>
                  </div>
                  <span className="text-ink-500 tabular-nums text-xs shrink-0 ml-2">
                    {it.sold} · Rs {it.revenue.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Progress
                    value={(it.sold / maxSold) * 100}
                    tone={it.margin >= 55 ? "emerald" : "amber"}
                  />
                  <span className="text-[11px] text-ink-500 tabular-nums shrink-0 w-12 text-right">
                    {it.margin}% GP
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Active tables"
          value={k?.activeTables ?? "—"}
          icon={Utensils}
          tone="sky"
          hint={k ? `${k.freeTables} free · ${k.cleaningTables} cleaning` : undefined}
        />
        <Kpi
          label="Low stock SKUs"
          value={k ? `${k.lowStockCount}` : "—"}
          icon={PackageOpen}
          tone="amber"
          hint="Below par or out"
        />
        <Kpi
          label="Avg. rating"
          value={k ? `${k.avgRating} / 5` : "—"}
          icon={Star}
          tone="amber"
          hint={k ? `${k.reviewsCount} reviews` : undefined}
        />
        <Kpi
          label="Active staff"
          value={k ? `${k.activeStaff}` : "—"}
          icon={Users}
          tone="violet"
          hint="Clocked-in today"
        />
      </div>
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="px-5 py-3">
      <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold">
        {label}
      </p>
      <p className="text-sm font-semibold text-ink-900 mt-0.5">{value}</p>
      <p className="text-[11px] text-ink-500">{sub}</p>
    </div>
  );
}
