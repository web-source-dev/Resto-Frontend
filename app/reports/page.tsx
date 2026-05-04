"use client";

import { PageHeader, Card, Kpi } from "@/components/ui";
import { Download, Calendar, FileSpreadsheet, Mail } from "lucide-react";
import { ReportTrend } from "@/components/charts/ReportTrend";
import { WeekBars } from "@/components/charts/WeekBars";
import { useApi } from "@/lib/useApi";
import { useEffect, useState } from "react";
import { Modal, Field, Input, Select } from "@/components/Modal";
import { useToast } from "@/components/Toaster";
import { downloadText, toCSV } from "@/lib/export";

const types: Record<string, { color: string }> = {
  Star: { color: "bg-emerald-100 text-emerald-700" },
  Plowhorse: { color: "bg-sky-100 text-sky-700" },
  Puzzle: { color: "bg-violet-100 text-violet-700" },
  Dog: { color: "bg-rose-100 text-rose-700" },
};

const RANGE_PRESETS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "Last 7 days" },
  { id: "last30", label: "Last 30 days" },
  { id: "last90", label: "Last 90 days" },
] as const;

type RangePreset = (typeof RANGE_PRESETS)[number]["id"] | "custom";

export default function ReportsPage() {
  const [preset, setPreset] = useState<RangePreset>("last30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [rangeOpen, setRangeOpen] = useState(false);
  const [digestOpen, setDigestOpen] = useState(false);
  const toast = useToast();

  const query = (() => {
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
  })();

  const { data: summary } = useApi<any>(`/api/reports/summary?${query}`, [query]);
  const { data: trend } = useApi<{ trend: any[] }>(`/api/reports/trend?${query}`, [query]);
  const { data: me } = useApi<{ items: any[] }>("/api/reports/menu-engineering");
  const { data: anom } = useApi<{ anomalies: any[] }>("/api/reports/anomalies");
  const { data: overview } = useApi<any>("/api/overview");

  const rangeLabel =
    preset === "custom" && customFrom && customTo
      ? `${customFrom} → ${customTo}`
      : RANGE_PRESETS.find((r) => r.id === preset)?.label ?? "Last 30 days";

  async function exportAll() {
    try {
      const exp = await fetchExportRows(query);
      const matrix = me?.items ?? [];
      const trendRows = trend?.trend ?? [];
      const csv =
        `Report range,${rangeLabel}\n\n` +
        "Orders\n" +
        toCSV(exp.orders, [
          { key: "code", header: "Order" },
          { key: "placedAt", header: "Placed at", map: (v) => new Date(v).toLocaleString() },
          { key: "channel", header: "Channel" },
          { key: "tableCode", header: "Table" },
          { key: "customerName", header: "Customer" },
          { key: "items", header: "Items" },
          { key: "subtotal", header: "Subtotal" },
          { key: "tax", header: "Tax" },
          { key: "service", header: "Service" },
          { key: "total", header: "Total" },
          { key: "status", header: "Status" },
          { key: "paymentStatus", header: "Payment" },
        ]) +
        "\n\n\nMenu engineering\n" +
        toCSV(matrix, [
          { key: "name", header: "Item" },
          { key: "qty", header: "Qty" },
          { key: "profit", header: "Margin %" },
          { key: "type", header: "Classification" },
        ]) +
        "\n\n\nDaily revenue trend\n" +
        toCSV(trendRows, [
          { key: "d", header: "Day" },
          { key: "rev", header: "Revenue" },
          { key: "prev", header: "Prev period" },
        ]);
      downloadText(`reports-${preset}-${Date.now()}.csv`, csv);
      toast("Reports exported", "success");
    } catch (e: any) {
      toast(e.message ?? "Failed to export reports", "error");
    }
  }

  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Drill-down · custom ranges · scheduled email digests"
        right={
          <>
            <button className="btn-outline" onClick={() => setRangeOpen(true)}>
              <Calendar className="w-4 h-4" /> {rangeLabel}
            </button>
            <button
              className="btn-outline"
              onClick={() => setDigestOpen(true)}
            >
              <Mail className="w-4 h-4" /> Schedule digest
            </button>
            <button className="btn-primary" onClick={exportAll}>
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label={`Revenue (${rangeLabel})`}
          value={summary ? `Rs ${(summary.revenue / 1000).toFixed(0)}k` : "—"}
          tone="brand"
          icon={FileSpreadsheet}
        />
        <Kpi
          label="Gross margin"
          value={summary ? `${summary.grossMargin}%` : "—"}
          tone="emerald"
        />
        <Kpi
          label="Food cost %"
          value={summary ? `${summary.foodCostPct}%` : "—"}
          tone="amber"
        />
        <Kpi
          label="Wastage %"
          value={summary ? `${summary.wastagePct}%` : "—"}
          tone="sky"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div className="xl:col-span-2">
          <Card
            title={`Revenue trend · ${rangeLabel}`}
            subtitle="Solid = current · dashed = synthetic prior"
          >
            <ReportTrend data={trend?.trend ?? []} />
          </Card>
        </div>
        <Card title="Anomaly alerts" subtitle="AI-surfaced deviations">
          <div className="space-y-3">
            {(anom?.anomalies ?? []).map((a, i) => (
              <Anomaly key={i} title={a.title} body={a.body} tone={a.tone} />
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <Card
          title="Menu engineering matrix"
          subtitle="Stars / Plowhorses / Puzzles / Dogs"
          pad={false}
          className="xl:col-span-2"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Item</th>
                  <th className="table-th">7-day qty</th>
                  <th className="table-th">Margin %</th>
                  <th className="table-th">Classification</th>
                  <th className="table-th">Recommended action</th>
                </tr>
              </thead>
              <tbody>
                {(me?.items ?? []).map((m: any) => (
                  <tr key={m.name} className="hover:bg-ink-50/60">
                    <td className="table-td font-medium">{m.name}</td>
                    <td className="table-td tabular-nums">{m.qty}</td>
                    <td className="table-td tabular-nums font-semibold">
                      {m.profit}%
                    </td>
                    <td className="table-td">
                      <span
                        className={`chip ${
                          types[m.type]?.color ?? "bg-ink-100 text-ink-700"
                        }`}
                      >
                        {m.type}
                      </span>
                    </td>
                    <td className="table-td text-ink-600 text-xs">
                      {m.type === "Star" && "Promote · protect margin · feature"}
                      {m.type === "Plowhorse" && "Re-price or reduce plate cost"}
                      {m.type === "Puzzle" && "Reposition on menu · up-sell cues"}
                      {m.type === "Dog" && "Candidate for removal · check 86-list"}
                    </td>
                  </tr>
                ))}
                {(me?.items?.length ?? 0) === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="table-td text-center text-ink-500 py-8"
                    >
                      Needs 7+ days of sales data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card
          title="Revenue by channel · week"
          subtitle="Stacked · dine-in, delivery, takeaway"
        >
          <WeekBars data={overview?.weekChannels ?? []} />
        </Card>
      </div>

      <Modal
        open={rangeOpen}
        onClose={() => setRangeOpen(false)}
        title="Select range"
        width="max-w-xs"
      >
        <div className="space-y-2">
          {RANGE_PRESETS.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setPreset(r.id);
                setRangeOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg border ${
                preset === r.id
                  ? "bg-brand-50 text-brand-700 border-brand-300"
                  : "border-ink-200 hover:bg-ink-50"
              }`}
            >
              {r.label}
            </button>
          ))}
          <div className="mt-3 rounded-lg border border-ink-200 p-3">
            <p className="mb-2 text-xs font-semibold text-ink-600">Custom range</p>
            <div className="grid grid-cols-1 gap-2">
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
              <Input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </div>
            <button
              className="btn-primary mt-2 w-full"
              disabled={!customFrom || !customTo}
              onClick={() => {
                setPreset("custom");
                setRangeOpen(false);
              }}
            >
              Apply custom range
            </button>
          </div>
        </div>
      </Modal>

      <ScheduleDigestModal
        open={digestOpen}
        onClose={() => setDigestOpen(false)}
      />
    </>
  );
}

async function fetchExportRows(query: string) {
  const { api } = await import("@/lib/api");
  return api.get<{ orders: any[] }>(`/api/reports/export?${query}`);
}

function Anomaly({
  title,
  body,
  tone,
}: {
  title: string;
  body: string;
  tone: string;
}) {
  const t: Record<string, string> = {
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    sky: "bg-sky-50 text-sky-700",
  };
  return (
    <div className="p-3 rounded-lg border border-ink-100">
      <div className="flex items-center gap-2">
        <span className={`chip ${t[tone] ?? "bg-ink-100 text-ink-700"}`}>
          alert
        </span>
        <p className="text-sm font-semibold text-ink-900">{title}</p>
      </div>
      <p className="text-xs text-ink-500 mt-1 leading-snug">{body}</p>
    </div>
  );
}

function ScheduleDigestModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const [cadence, setCadence] = useState<"daily" | "weekly">("daily");
  const [time, setTime] = useState("08:00");
  const [email, setEmail] = useState("");
  const STORAGE = "ff_digest_schedule";

  useEffect(() => {
    if (!open) return;
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const s = JSON.parse(raw);
        setCadence(s.cadence ?? "daily");
        setTime(s.time ?? "08:00");
        setEmail(s.email ?? "");
      }
    } catch {}
  }, [open]);

  function save() {
    try {
      localStorage.setItem(
        STORAGE,
        JSON.stringify({ cadence, time, email })
      );
    } catch {}
    toast(
      `Digest scheduled · ${cadence} @ ${time} → ${email}`,
      "success"
    );
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Schedule email digest"
      subtitle="Daily/weekly report summarized to your inbox"
      width="max-w-md"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save}>
            Save schedule
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Cadence">
          <Select
            value={cadence}
            onChange={(e) => setCadence(e.target.value as any)}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly (Mon)</option>
          </Select>
        </Field>
        <Field label="Time">
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Recipient email">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <p className="text-[11px] text-ink-500 mt-2">
        Stored locally for this session · backend worker ships in Phase 2.
      </p>
    </Modal>
  );
}
