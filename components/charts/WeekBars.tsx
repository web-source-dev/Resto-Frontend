"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function WeekBars({
  data,
}: {
  data: { d: string; dinein: number; delivery: number; takeaway: number }[];
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="#eef0f5" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="d" axisLine={false} tickLine={false} />
          <YAxis
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(v: any, name: string) => [
              `Rs ${Number(v).toLocaleString()}`,
              name === "dinein"
                ? "Dine-in"
                : name === "delivery"
                ? "Delivery"
                : "Takeaway",
            ]}
          />
          <Bar dataKey="dinein" stackId="a" fill="#0ea5e9" />
          <Bar dataKey="delivery" stackId="a" fill="#8b5cf6" />
          <Bar dataKey="takeaway" stackId="a" fill="#f59e0b" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
