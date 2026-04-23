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

const RANGES = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
];

export default function ReportsPage() {
  const [days, setDays] = useState(30);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [digestOpen, setDigestOpen] = useState(false);
  const toast = useToast();

  const { data: summary } = useApi<any>("/api/reports/summary", [days]);
  const { data: trend } = useApi<{ trend: any[] }>(
    `/api/reports/trend?days=${days}`,
    [days]
  );
  const { data: me } = useApi<{ items: any[] }>("/api/reports/menu-engineering");
  const { data: anom } = useApi<{ anomalies: any[] }>("/api/reports/anomalies");
  const { data: overview } = useApi<any>("/api/overview");

  const rangeLabel = RANGES.find((r) => r.days === days)?.label ?? `${days} days`;

  function exportAll() {
    const matrix = me?.items ?? [];
    const trendRows = trend?.trend ?? [];
    const csv =
      "Menu engineering (7d)\n" +
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
    downloadText(`reports-${days}d-${Date.now()}.csv`, csv);
    toast("Reports exported", "success");
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi
          label={`Revenue (${days}d)`}
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
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => {
                setDays(r.days);
                setRangeOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg border ${
                days === r.days
                  ? "bg-brand-50 text-brand-700 border-brand-300"
                  : "border-ink-200 hover:bg-ink-50"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </Modal>

      <ScheduleDigestModal
        open={digestOpen}
        onClose={() => setDigestOpen(false)}
      />
    </>
  );
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
  const [email, setEmail] = useState("gian.baio@premiumtransportgroup.com");
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
      <div className="grid grid-cols-2 gap-3">
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
