"use client";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function ReportTrend({
  data,
}: {
  data: { d: string; rev: number; prev: number }[];
}) {
  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="#eef0f5" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="d" axisLine={false} tickLine={false} />
          <YAxis
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip formatter={(v: any) => `Rs ${Number(v).toLocaleString()}`} />
          <Line type="monotone" dataKey="prev" stroke="#cbd5e1" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="rev" stroke="#f97316" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
