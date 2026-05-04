"use client";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function RevenueChart({
  data,
}: {
  data: { t: string; rev: number; ord: number }[];
}) {
  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#eef0f5" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="t"
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => {
              const h = Number(v);
              if (isNaN(h)) return v;
              return h < 12 ? `${h || 12}a` : h === 12 ? "12p" : `${h - 12}p`;
            }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `Rs ${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            formatter={(v: any, k: string) =>
              k === "rev" ? [`Rs ${v.toLocaleString()}`, "Revenue"] : [v, "Orders"]
            }
            labelClassName="text-ink-500"
          />
          <Area
            type="monotone"
            dataKey="rev"
            stroke="#f97316"
            strokeWidth={2.5}
            fill="url(#rev)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
