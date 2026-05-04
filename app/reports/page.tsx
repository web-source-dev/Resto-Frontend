"use client";

import { PageHeader, Card } from "@/components/ui";
import {
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  ChefHat,
  Users,
  AlertCircle,
  PiggyBank,
  Bike,
  Shield,
  Utensils,
} from "lucide-react";
import { ReportTrend } from "@/components/charts/ReportTrend";
import { useApi } from "@/lib/useApi";
import { useMemo, useState } from "react";
import { Modal, Field, Input, Select } from "@/components/Modal";
import { useToast } from "@/components/Toaster";
import { downloadText, toCSV } from "@/lib/export";
import clsx from "clsx";

// ── Range presets ────────────────────────────────────────────────────────
const RANGE_PRESETS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "Last 7 days" },
  { id: "last30", label: "Last 30 days" },
  { id: "last90", label: "Last 90 days" },
] as const;
type RangePreset = (typeof RANGE_PRESETS)[number]["id"] | "custom";

const TABS = [
  { id: "sales", label: "Sales", icon: TrendingUp },
  { id: "menu", label: "Menu", icon: Utensils },
  { id: "operations", label: "Operations", icon: AlertCircle },
  { id: "people", label: "People", icon: Users },
  { id: "cost", label: "Cost & P&L", icon: PiggyBank },
  { id: "delivery", label: "Delivery", icon: Bike },
  { id: "audit", label: "Audit", icon: Shield },
] as const;
type Tab = (typeof TABS)[number]["id"];

// ── Helpers ───────────────────────────────────────────────────────────────
function fmtMoney(n: number | null | undefined) {
  return `Rs ${(Number(n) || 0).toLocaleString()}`;
}
function fmtPct(n: number | null | undefined, opts?: { plus?: boolean }) {
  if (n == null) return "—";
  const sign = opts?.plus && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}
function fmtDt(d?: string | Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString();
}

// ── KPI tile with delta vs prior period ──────────────────────────────────
function Kpi({
  label,
  value,
  delta,
  invertDelta,
  hint,
}: {
  label: string;
  value: string;
  delta?: number | null;
  invertDelta?: boolean; // true for things where down is good (e.g. wastage)
  hint?: string;
}) {
  const direction =
    delta == null ? "flat" : delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  // For "down is good" metrics flip the colour mapping.
  const positive = invertDelta ? direction === "down" : direction === "up";
  const negative = invertDelta ? direction === "up" : direction === "down";
  const Arrow =
    direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;
  const tone = positive
    ? "text-emerald-600 bg-emerald-50"
    : negative
    ? "text-rose-600 bg-rose-50"
    : "text-ink-500 bg-ink-50";
  return (
    <div className="card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-ink-900 tabular-nums">{value}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        {delta == null ? (
          <span className="text-[11px] text-ink-400">no prior data</span>
        ) : (
          <span
            className={clsx(
              "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold",
              tone
            )}
          >
            <Arrow className="h-3 w-3" />
            {fmtPct(delta, { plus: true })}
          </span>
        )}
        {hint && <span className="text-[11px] text-ink-400">{hint}</span>}
      </div>
    </div>
  );
}

function ExportBtn({
  rows,
  filename,
}: {
  rows: any[];
  filename: string;
}) {
  return (
    <button
      type="button"
      onClick={() =>
        downloadText(filename, toCSV(rows ?? [], [
          { key: "date", header: "Date" },
          { key: "revenue", header: "Revenue" },
          { key: "orders", header: "Orders" },
          { key: "prev", header: "Prev" },
          { key: "dineIn", header: "Dine-in" },
          { key: "takeaway", header: "Takeaway" },
        ]), "text/csv")
      }
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink-500 hover:text-ink-800"
      disabled={!rows?.length}
    >
      <Download className="h-3 w-3" /> CSV
    </button>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("sales");
  const [preset, setPreset] = useState<RangePreset>("last30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [rangeOpen, setRangeOpen] = useState(false);
  const toast = useToast();

  const query = useMemo(() => {
    if (preset === "today") {
      const d = new Date().toISOString().slice(0, 10);
      return `from=${d}&to=${d}`;
    }
    if (preset === "yesterday") {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      const y = d.toISOString().slice(0, 10);
      return `from=${y}&to=${y}`;
    }
    if (preset === "last7") return "days=7";
    if (preset === "last90") return "days=90";
    if (preset === "custom" && customFrom && customTo) {
      return `from=${customFrom}&to=${customTo}`;
    }
    return "days=30";
  }, [preset, customFrom, customTo]);

  const presetLabel =
    preset === "custom" && customFrom && customTo
      ? `${customFrom} → ${customTo}`
      : RANGE_PRESETS.find((p) => p.id === preset)?.label ?? "Custom";

  return (
    <>
      <PageHeader
        title="Reports"
        subtitle="Sales, menu, ops, people, cost, delivery — every angle"
        right={
          <button
            className="btn-outline"
            onClick={() => setRangeOpen(true)}
          >
            <Calendar className="h-4 w-4" /> {presetLabel}
          </button>
        }
      />

      {/* Tab nav */}
      <div className="mb-5 flex items-center gap-1 overflow-x-auto rounded-xl border border-ink-100 bg-white p-1">
        {TABS.map((t) => {
          const I = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold",
                tab === t.id
                  ? "bg-ink-900 text-white"
                  : "text-ink-600 hover:bg-ink-50"
              )}
            >
              <I className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "sales" && <SalesTab query={query} />}
      {tab === "menu" && <MenuTab />}
      {tab === "operations" && <OperationsTab query={query} />}
      {tab === "people" && <PeopleTab query={query} />}
      {tab === "cost" && <CostTab query={query} />}
      {tab === "delivery" && <DeliveryTab query={query} />}
      {tab === "audit" && <AuditTab query={query} />}

      {/* Custom-range modal */}
      <Modal
        open={rangeOpen}
        onClose={() => setRangeOpen(false)}
        title="Date range"
        width="max-w-md"
        footer={
          <button
            type="button"
            className="btn-primary"
            onClick={() => setRangeOpen(false)}
          >
            Apply
          </button>
        }
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {RANGE_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPreset(p.id)}
                className={clsx(
                  "rounded-md border px-3 py-1.5 text-xs font-semibold",
                  preset === p.id
                    ? "border-ink-900 bg-ink-900 text-white"
                    : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
                )}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => setPreset("custom")}
              className={clsx(
                "rounded-md border px-3 py-1.5 text-xs font-semibold",
                preset === "custom"
                  ? "border-ink-900 bg-ink-900 text-white"
                  : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
              )}
            >
              Custom
            </button>
          </div>
          {preset === "custom" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="From">
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e: any) => setCustomFrom(e.target.value)}
                />
              </Field>
              <Field label="To">
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e: any) => setCustomTo(e.target.value)}
                />
              </Field>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}

// ═══ SALES TAB ════════════════════════════════════════════════════════════
function SalesTab({ query }: { query: string }) {
  const { data: summary } = useApi<any>(`/api/reports/summary?${query}`, [query]);
  const { data: trend } = useApi<{ trend: any[]; prevAvailable: boolean }>(
    `/api/reports/trend?${query}`,
    [query]
  );
  const { data: channels } = useApi<{ channels: any[]; total: number }>(
    `/api/reports/channels?${query}`,
    [query]
  );
  const { data: heatmap } = useApi<{ grid: any[]; peak: any }>(
    `/api/reports/hour-heatmap?${query}`,
    [query]
  );
  const { data: topItems } = useApi<{ items: any[] }>(
    `/api/reports/top-items?${query}&limit=10`,
    [query]
  );
  const { data: pay } = useApi<{ methods: any[]; total: number }>(
    `/api/reports/payment-mix?${query}`,
    [query]
  );

  return (
    <div className="space-y-5">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi
          label="Revenue"
          value={fmtMoney(summary?.revenue)}
          delta={summary?.deltas?.revenue ?? null}
        />
        <Kpi
          label="Orders"
          value={String(summary?.orders ?? 0)}
          delta={summary?.deltas?.orders ?? null}
        />
        <Kpi
          label="AOV"
          value={fmtMoney(summary?.aov)}
          delta={summary?.deltas?.aov ?? null}
        />
        <Kpi
          label="Food cost"
          value={fmtPct(summary?.foodCostPct)}
          invertDelta
          hint={`Margin ${fmtPct(summary?.grossMargin)}`}
        />
        <Kpi
          label="Wastage"
          value={fmtMoney(summary?.wastageCost)}
          delta={summary?.deltas?.wastageCost ?? null}
          invertDelta
        />
        <Kpi
          label="Cancel rate"
          value={fmtPct(summary?.cancellationRate)}
          invertDelta
          hint={`${summary?.cancelled ?? 0} orders`}
        />
      </div>

      {/* Trend */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink-900">
              Revenue trend
            </h3>
            <p className="text-[11px] text-ink-500">
              Current vs prior equal-length period
            </p>
          </div>
          <ExportBtn
            rows={(trend?.trend ?? []).map((r) => ({
              date: r.date,
              revenue: r.rev,
              orders: r.count,
              prev: r.prev,
              dineIn: r.dineIn,
              takeaway: r.takeaway,
              delivery: r.delivery,
              phone: r.phone,
            }))}
            filename={`revenue-${new Date().toISOString().slice(0, 10)}.csv`}
          />
        </div>
        <ReportTrend
          data={(trend?.trend ?? []).map((r) => ({
            d: r.d,
            rev: r.rev,
            prev: r.prev ?? 0,
          }))}
        />
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Channel mix */}
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-ink-900">
            Revenue by channel
          </h3>
          {(channels?.channels ?? []).length === 0 ? (
            <p className="text-xs text-ink-400">No data in range.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-ink-500">
                  <th className="pb-2">Channel</th>
                  <th className="pb-2 text-right">Orders</th>
                  <th className="pb-2 text-right">Revenue</th>
                  <th className="pb-2 text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {(channels?.channels ?? []).map((c: any) => (
                  <tr key={c.channel} className="border-t border-ink-100">
                    <td className="py-2 font-medium">{c.channel}</td>
                    <td className="py-2 text-right tabular-nums">{c.orders}</td>
                    <td className="py-2 text-right tabular-nums">
                      {fmtMoney(c.revenue)}
                    </td>
                    <td className="py-2 text-right tabular-nums text-ink-500">
                      {fmtPct(c.share)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* Payment mix */}
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-ink-900">
            Payment methods
          </h3>
          {(pay?.methods ?? []).length === 0 ? (
            <p className="text-xs text-ink-400">No paid orders in range.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-ink-500">
                  <th className="pb-2">Method</th>
                  <th className="pb-2 text-right">Orders</th>
                  <th className="pb-2 text-right">Collected</th>
                  <th className="pb-2 text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {(pay?.methods ?? []).map((m: any) => (
                  <tr key={m.method} className="border-t border-ink-100">
                    <td className="py-2 font-medium">{m.method}</td>
                    <td className="py-2 text-right tabular-nums">{m.orders}</td>
                    <td className="py-2 text-right tabular-nums">
                      {fmtMoney(m.revenue)}
                    </td>
                    <td className="py-2 text-right tabular-nums text-ink-500">
                      {fmtPct(m.share)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* Hour heatmap */}
      <Card className="p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-ink-900">
            Orders by hour × day-of-week
          </h3>
          {heatmap?.peak && (heatmap.peak.orders ?? 0) > 0 && (
            <span className="text-[11px] text-ink-500">
              Peak:{" "}
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][heatmap.peak.dow]}{" "}
              · {heatmap.peak.hour}:00 ·{" "}
              <span className="font-semibold text-ink-800">
                {heatmap.peak.orders} orders
              </span>
            </span>
          )}
        </div>
        <Heatmap grid={heatmap?.grid ?? []} />
      </Card>

      {/* Top items */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-900">Top items</h3>
          <ExportBtn
            rows={topItems?.items ?? []}
            filename={`top-items-${new Date().toISOString().slice(0, 10)}.csv`}
          />
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-ink-500">
              <th className="pb-2">#</th>
              <th className="pb-2">Item</th>
              <th className="pb-2 text-right">Qty</th>
              <th className="pb-2 text-right">Revenue</th>
              <th className="pb-2 text-right">Orders</th>
            </tr>
          </thead>
          <tbody>
            {(topItems?.items ?? []).map((it: any, i: number) => (
              <tr key={String(it.menuItemId ?? i)} className="border-t border-ink-100">
                <td className="py-2 text-ink-400 tabular-nums">{i + 1}</td>
                <td className="py-2 font-medium">{it.name}</td>
                <td className="py-2 text-right tabular-nums">{it.qty}</td>
                <td className="py-2 text-right tabular-nums">{fmtMoney(it.revenue)}</td>
                <td className="py-2 text-right tabular-nums text-ink-500">{it.orders}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ═══ Hour heatmap ─────────────────────────────────────────────────────────
function Heatmap({
  grid,
}: {
  grid: { dow: number; hour: number; orders: number; revenue: number }[];
}) {
  const max = grid.reduce((m, c) => (c.orders > m ? c.orders : m), 0);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[660px]">
        <div className="grid grid-cols-[40px_repeat(24,1fr)] items-center gap-px">
          <div></div>
          {Array.from({ length: 24 }).map((_, h) => (
            <div
              key={h}
              className="text-center text-[9px] text-ink-400 tabular-nums"
            >
              {h}
            </div>
          ))}
          {days.map((dlabel, d) => (
            <Row
              key={d}
              dlabel={dlabel}
              cells={grid.filter((c) => c.dow === d)}
              max={max}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
function Row({
  dlabel,
  cells,
  max,
}: {
  dlabel: string;
  cells: { hour: number; orders: number }[];
  max: number;
}) {
  return (
    <>
      <div className="text-[10px] font-semibold text-ink-500">{dlabel}</div>
      {Array.from({ length: 24 }).map((_, h) => {
        const cell = cells.find((c) => c.hour === h);
        const orders = cell?.orders ?? 0;
        const intensity = max ? orders / max : 0;
        const bg = intensity === 0
          ? "bg-ink-100"
          : intensity < 0.25
          ? "bg-orange-100"
          : intensity < 0.5
          ? "bg-orange-300"
          : intensity < 0.75
          ? "bg-orange-400"
          : "bg-orange-500";
        return (
          <div
            key={h}
            title={`${dlabel} ${h}:00 — ${orders} orders`}
            className={clsx(
              "h-7 rounded-sm",
              bg,
              orders > 0 && "text-white text-[9px] font-bold flex items-center justify-center tabular-nums"
            )}
          >
            {intensity > 0.5 ? orders : ""}
          </div>
        );
      })}
    </>
  );
}

// ═══ MENU TAB ═════════════════════════════════════════════════════════════
function MenuTab() {
  const { data: me } = useApi<{ items: any[] }>("/api/reports/menu-engineering");
  const types: Record<string, { color: string; description: string }> = {
    Star: { color: "bg-emerald-100 text-emerald-700", description: "High qty, high margin — promote" },
    Plowhorse: { color: "bg-sky-100 text-sky-700", description: "High qty, low margin — reprice" },
    Puzzle: { color: "bg-violet-100 text-violet-700", description: "Low qty, high margin — feature" },
    Dog: { color: "bg-rose-100 text-rose-700", description: "Low both — drop or rework" },
  };
  const grouped = (me?.items ?? []).reduce<Record<string, any[]>>((acc, i) => {
    (acc[i.type] ??= []).push(i);
    return acc;
  }, {});
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="mb-2 text-sm font-semibold text-ink-900">
          Menu engineering matrix
        </h3>
        <p className="text-[11px] text-ink-500 mb-4">
          Items classified by 7-day quantity vs margin against the menu average.
        </p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Object.entries(types).map(([t, meta]) => (
            <div key={t} className="rounded-lg border border-ink-100 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={clsx(
                    "rounded-md px-2 py-0.5 text-xs font-bold",
                    meta.color
                  )}
                >
                  {t}
                </span>
                <span className="text-[11px] text-ink-500">
                  {grouped[t]?.length ?? 0} items
                </span>
              </div>
              <p className="text-[11px] text-ink-500 mb-2">{meta.description}</p>
              {grouped[t]?.length ? (
                <ul className="space-y-1 text-sm">
                  {grouped[t].map((it) => (
                    <li
                      key={String(it.id)}
                      className="flex items-center justify-between"
                    >
                      <span className="truncate">{it.name}</span>
                      <span className="text-[11px] text-ink-500 tabular-nums">
                        {it.sold7d}× · {it.margin}%
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[11px] text-ink-400">No items.</p>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ═══ OPERATIONS TAB ══════════════════════════════════════════════════════
function OperationsTab({ query }: { query: string }) {
  const { data } = useApi<any>(`/api/reports/cancellations?${query}`, [query]);
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Kpi
          label="Cancelled orders"
          value={String(data?.orders?.count ?? 0)}
          hint={fmtMoney(data?.orders?.value)}
          invertDelta
        />
        <Kpi
          label="Voided lines"
          value={String(data?.lines?.count ?? 0)}
          hint={fmtMoney(data?.lines?.value)}
          invertDelta
        />
        <Kpi
          label="Top voider"
          value={(data?.byUser?.[0]?.name ?? "—") as string}
          hint={`${data?.byUser?.[0]?.count ?? 0} voids`}
        />
        <Kpi
          label="Last void"
          value={fmtDt(data?.recent?.[0]?.at)}
          hint={data?.recent?.[0]?.userName ?? ""}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-ink-900">By staff</h3>
          {(data?.byUser ?? []).length === 0 ? (
            <p className="text-xs text-ink-400">No voids in range.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-ink-500">
                  <th className="pb-2">Staff</th>
                  <th className="pb-2 text-right">Voids</th>
                  <th className="pb-2 text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {(data?.byUser ?? []).map((u: any) => (
                  <tr key={u.name} className="border-t border-ink-100">
                    <td className="py-2 font-medium">{u.name}</td>
                    <td className="py-2 text-right tabular-nums">{u.count}</td>
                    <td className="py-2 text-right tabular-nums">{fmtMoney(u.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink-900">Recent voids</h3>
            <ExportBtn
              rows={data?.recent ?? []}
              filename={`voids-${new Date().toISOString().slice(0, 10)}.csv`}
            />
          </div>
          {(data?.recent ?? []).length === 0 ? (
            <p className="text-xs text-ink-400">No voids in range.</p>
          ) : (
            <ul className="divide-y divide-ink-100 text-sm">
              {(data?.recent ?? []).slice(0, 12).map((r: any, i: number) => (
                <li key={i} className="py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {r.qty}× {r.item}
                    </span>
                    <span className="tabular-nums text-ink-500">
                      {fmtMoney(r.value)}
                    </span>
                  </div>
                  <div className="text-[11px] text-ink-500">
                    {r.orderCode} · {r.userName} · {fmtDt(r.at)}
                    {r.reason ? ` · ${r.reason}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

// ═══ PEOPLE TAB ══════════════════════════════════════════════════════════
function PeopleTab({ query }: { query: string }) {
  const { data: waiters } = useApi<{ waiters: any[] }>(
    `/api/reports/sales-by-waiter?${query}`,
    [query]
  );
  const { data: customers } = useApi<{ customers: any[] }>(
    `/api/reports/top-customers?limit=25`
  );
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-900">
            Sales by waiter
          </h3>
          <ExportBtn
            rows={waiters?.waiters ?? []}
            filename={`waiters-${new Date().toISOString().slice(0, 10)}.csv`}
          />
        </div>
        {(waiters?.waiters ?? []).length === 0 ? (
          <p className="text-xs text-ink-400">No dine-in sales attributed in range.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-ink-500">
                <th className="pb-2">#</th>
                <th className="pb-2">Waiter</th>
                <th className="pb-2 text-right">Orders</th>
                <th className="pb-2 text-right">Covers</th>
                <th className="pb-2 text-right">Revenue</th>
                <th className="pb-2 text-right">AOV</th>
              </tr>
            </thead>
            <tbody>
              {(waiters?.waiters ?? []).map((w: any, i: number) => (
                <tr key={w.waiterId} className="border-t border-ink-100">
                  <td className="py-2 text-ink-400 tabular-nums">{i + 1}</td>
                  <td className="py-2 font-medium">{w.name}</td>
                  <td className="py-2 text-right tabular-nums">{w.orders}</td>
                  <td className="py-2 text-right tabular-nums">{w.covers}</td>
                  <td className="py-2 text-right tabular-nums">
                    {fmtMoney(w.revenue)}
                  </td>
                  <td className="py-2 text-right tabular-nums text-ink-500">
                    {fmtMoney(w.aov)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-900">Top customers</h3>
          <ExportBtn
            rows={customers?.customers ?? []}
            filename={`top-customers-${new Date().toISOString().slice(0, 10)}.csv`}
          />
        </div>
        {(customers?.customers ?? []).length === 0 ? (
          <p className="text-xs text-ink-400">No registered customers yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-ink-500">
                <th className="pb-2">#</th>
                <th className="pb-2">Customer</th>
                <th className="pb-2">Tier</th>
                <th className="pb-2 text-right">Visits</th>
                <th className="pb-2 text-right">LTV</th>
                <th className="pb-2 text-right">Last visit</th>
              </tr>
            </thead>
            <tbody>
              {(customers?.customers ?? []).map((c: any, i: number) => (
                <tr key={String(c.id)} className="border-t border-ink-100">
                  <td className="py-2 text-ink-400 tabular-nums">{i + 1}</td>
                  <td className="py-2">
                    <div className="font-medium">{c.name}</div>
                    {c.phone && (
                      <div className="text-[11px] text-ink-500">{c.phone}</div>
                    )}
                  </td>
                  <td className="py-2 text-xs">{c.tier}</td>
                  <td className="py-2 text-right tabular-nums">{c.visits}</td>
                  <td className="py-2 text-right tabular-nums font-semibold">
                    {fmtMoney(c.ltv)}
                  </td>
                  <td className="py-2 text-right tabular-nums text-ink-500">
                    {fmtDt(c.lastVisit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

// ═══ COST TAB ════════════════════════════════════════════════════════════
function CostTab({ query }: { query: string }) {
  const { data: pnl } = useApi<any>(`/api/reports/pnl?${query}`, [query]);
  const { data: wast } = useApi<any>(
    `/api/reports/wastage-analysis?${query}`,
    [query]
  );
  const { data: inv } = useApi<any>(`/api/reports/inventory-snapshot`);

  return (
    <div className="space-y-5">
      {/* P&L */}
      <Card className="p-5">
        <h3 className="mb-3 text-sm font-semibold text-ink-900">
          Profit &amp; Loss
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label="Revenue" value={fmtMoney(pnl?.revenue)} />
          <Kpi label="COGS" value={fmtMoney(pnl?.cogs)} invertDelta />
          <Kpi
            label="Gross profit"
            value={fmtMoney(pnl?.grossProfit)}
            hint={fmtPct(pnl?.grossMarginPct)}
          />
          <Kpi
            label="Operating profit"
            value={fmtMoney(pnl?.operatingProfit)}
            hint={fmtPct(pnl?.operatingMarginPct)}
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 text-sm">
          <Line label="Tax collected" value={fmtMoney(pnl?.tax)} />
          <Line label="Service charge" value={fmtMoney(pnl?.service)} />
          <Line
            label="Discounts given"
            value={fmtMoney(pnl?.discountAmount)}
          />
          <Line label="Wastage" value={fmtMoney(pnl?.wastageCost)} />
          <Line label="Supplies used" value={fmtMoney(pnl?.suppliesCost)} />
          <Line label="Operating expenses" value={fmtMoney(pnl?.expenseTotal)} />
        </div>
        {(pnl?.expenseByCategory ?? []).length > 0 && (
          <div className="mt-4 rounded-lg border border-ink-100 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500 mb-2">
              Expenses by category
            </p>
            <ul className="space-y-1 text-sm">
              {pnl.expenseByCategory.map((c: any) => (
                <li key={c.category} className="flex items-center justify-between">
                  <span>{c.category}</span>
                  <span className="tabular-nums">{fmtMoney(c.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {/* Wastage */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink-900">
              Wastage by reason
            </h3>
            <span className="text-[11px] text-ink-500">
              {wast?.totalEvents ?? 0} events · {fmtMoney(wast?.totalCost)}
            </span>
          </div>
          {(wast?.byReason ?? []).length === 0 ? (
            <p className="text-xs text-ink-400">No wastage in range.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wider text-ink-500">
                  <th className="pb-2">Reason</th>
                  <th className="pb-2 text-right">Events</th>
                  <th className="pb-2 text-right">Cost</th>
                  <th className="pb-2 text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {(wast?.byReason ?? []).map((r: any) => (
                  <tr key={r.reason} className="border-t border-ink-100">
                    <td className="py-2 font-medium">{r.reason}</td>
                    <td className="py-2 text-right tabular-nums">{r.count}</td>
                    <td className="py-2 text-right tabular-nums">
                      {fmtMoney(r.cost)}
                    </td>
                    <td className="py-2 text-right tabular-nums text-ink-500">
                      {fmtPct(r.share)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink-900">
              Top wasted ingredients
            </h3>
            <ExportBtn
              rows={wast?.byIngredient ?? []}
              filename={`wasted-ingredients-${new Date().toISOString().slice(0, 10)}.csv`}
            />
          </div>
          {(wast?.byIngredient ?? []).length === 0 ? (
            <p className="text-xs text-ink-400">No wastage in range.</p>
          ) : (
            <ul className="divide-y divide-ink-100 text-sm">
              {wast.byIngredient.slice(0, 10).map((r: any, i: number) => (
                <li
                  key={String(r.ingredientId ?? i)}
                  className="py-2 flex items-center justify-between"
                >
                  <span className="font-medium">{r.name}</span>
                  <span className="text-[11px] text-ink-500 tabular-nums">
                    {r.qty} · {r.count} events ·{" "}
                    <span className="text-ink-800 font-semibold">
                      {fmtMoney(r.cost)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Inventory snapshot */}
      <Card className="p-5">
        <h3 className="mb-3 text-sm font-semibold text-ink-900">
          Inventory value
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Kpi label="Total value" value={fmtMoney(inv?.value)} />
          <Kpi label="SKUs" value={String(inv?.total ?? 0)} />
          <Kpi label="Low stock" value={String(inv?.low ?? 0)} invertDelta />
          <Kpi label="Out of stock" value={String(inv?.out ?? 0)} invertDelta />
        </div>
        {(inv?.byCategory ?? []).length > 0 && (
          <div className="mt-4 rounded-lg border border-ink-100 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500 mb-2">
              By category
            </p>
            <ul className="space-y-1 text-sm">
              {inv.byCategory.map((c: any) => (
                <li
                  key={c.category}
                  className="flex items-center justify-between"
                >
                  <span>
                    {c.category}{" "}
                    <span className="text-[11px] text-ink-500">({c.count})</span>
                  </span>
                  <span className="tabular-nums">{fmtMoney(c.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-ink-50/50 px-3 py-2">
      <span className="text-ink-600">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}

// ═══ DELIVERY TAB ════════════════════════════════════════════════════════
function DeliveryTab({ query }: { query: string }) {
  const { data: perf } = useApi<any>(
    `/api/reports/delivery-performance?${query}`,
    [query]
  );
  const { data: riders } = useApi<any>(
    `/api/reports/rider-scorecard?${query}`,
    [query]
  );
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Delivered" value={String(perf?.delivered ?? 0)} />
        <Kpi
          label="Avg time"
          value={`${perf?.avgMinutes ?? 0}m`}
          invertDelta
        />
        <Kpi
          label="On-time %"
          value={fmtPct(perf?.onTimePct)}
        />
        <Kpi
          label="Failures"
          value={String(perf?.failed ?? 0)}
          invertDelta
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-ink-900">
            Failure reasons
          </h3>
          {(perf?.failureReasons ?? []).length === 0 ? (
            <p className="text-xs text-ink-400">No failed deliveries in range.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {perf.failureReasons.map((r: any) => (
                  <tr key={r.reason} className="border-b border-ink-100 last:border-b-0">
                    <td className="py-2">{r.reason}</td>
                    <td className="py-2 text-right tabular-nums">{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-ink-900">
            COD collection
          </h3>
          <Line
            label="COD orders"
            value={String(perf?.cod?.total ?? 0)}
          />
          <div className="h-2" />
          <Line
            label="Cash collected"
            value={fmtMoney(perf?.cod?.collected)}
          />
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink-900">Rider scorecard</h3>
          <ExportBtn
            rows={riders?.riders ?? []}
            filename={`riders-${new Date().toISOString().slice(0, 10)}.csv`}
          />
        </div>
        {(riders?.riders ?? []).length === 0 ? (
          <p className="text-xs text-ink-400">No rider activity in range.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-ink-500">
                <th className="pb-2">Rider</th>
                <th className="pb-2 text-right">Assigned</th>
                <th className="pb-2 text-right">Delivered</th>
                <th className="pb-2 text-right">Failed</th>
                <th className="pb-2 text-right">Avg min</th>
                <th className="pb-2 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {riders.riders.map((r: any) => (
                <tr key={r.riderId} className="border-t border-ink-100">
                  <td className="py-2 font-medium">{r.name}</td>
                  <td className="py-2 text-right tabular-nums">{r.assigned}</td>
                  <td className="py-2 text-right tabular-nums">{r.delivered}</td>
                  <td className="py-2 text-right tabular-nums">{r.failed}</td>
                  <td className="py-2 text-right tabular-nums">{r.avgMinutes}</td>
                  <td className="py-2 text-right tabular-nums">{fmtMoney(r.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

// ═══ AUDIT TAB ═══════════════════════════════════════════════════════════
function AuditTab({ query }: { query: string }) {
  const { data } = useApi<any>(`/api/reports/audit-summary?${query}`, [query]);
  const { data: anom } = useApi<{ anomalies: any[] }>(
    `/api/reports/anomalies?limit=20`
  );
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-ink-900">
            Activity by action
          </h3>
          {(data?.byAction ?? []).length === 0 ? (
            <p className="text-xs text-ink-400">No activity in range.</p>
          ) : (
            <ul className="divide-y divide-ink-100 text-sm">
              {(data?.byAction ?? []).slice(0, 15).map((a: any) => (
                <li
                  key={a.action}
                  className="py-2 flex items-center justify-between"
                >
                  <span className="font-mono text-xs">{a.action}</span>
                  <span className="font-semibold tabular-nums">{a.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 text-sm font-semibold text-ink-900">
            Activity by staff
          </h3>
          {(data?.byUser ?? []).length === 0 ? (
            <p className="text-xs text-ink-400">No activity in range.</p>
          ) : (
            <ul className="divide-y divide-ink-100 text-sm">
              {(data?.byUser ?? []).slice(0, 15).map((u: any, i: number) => (
                <li
                  key={i}
                  className="py-2 flex items-center justify-between"
                >
                  <span className="font-medium">{u.name}</span>
                  <span className="font-semibold tabular-nums">{u.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="mb-3 text-sm font-semibold text-ink-900">
          Recent anomalies
        </h3>
        {(anom?.anomalies ?? []).length === 0 ? (
          <p className="text-xs text-ink-400">No anomalies recorded.</p>
        ) : (
          <ul className="divide-y divide-ink-100 text-sm">
            {(anom?.anomalies ?? []).map((a: any, i: number) => (
              <li key={String(a._id ?? i)} className="py-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{a.title ?? a.kind ?? a.metric}</span>
                  <span className="text-[11px] text-ink-500">{fmtDt(a.at)}</span>
                </div>
                {a.detail && (
                  <p className="text-[11px] text-ink-500 mt-0.5">{a.detail}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
