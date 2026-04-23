"use client";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS: Record<string, string> = {
  "Dine-in": "#0ea5e9",
  Takeaway: "#f59e0b",
  Delivery: "#8b5cf6",
  Phone: "#64748b",
};

export function ChannelChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).map(([name, value]) => ({
    name,
    value,
    color: COLORS[name] ?? "#94a3b8",
  }));
  const hasAny = entries.some((e) => e.value > 0);

  return (
    <div className="h-56 w-full flex items-center">
      <div className="flex-1 h-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={hasAny ? entries : [{ name: "No data", value: 1, color: "#e2e8f0" }]}
              innerRadius={55}
              outerRadius={80}
              paddingAngle={hasAny ? 3 : 0}
              dataKey="value"
              stroke="none"
            >
              {(hasAny ? entries : [{ color: "#e2e8f0" }]).map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            {hasAny && <Tooltip formatter={(v: any) => [`${v}%`, "Share"]} />}
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-2 pr-2">
        {entries.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-sm">
            <span
              className="w-2.5 h-2.5 rounded-sm"
              style={{ background: d.color }}
            />
            <span className="text-ink-700 w-20">{d.name}</span>
            <span className="font-semibold text-ink-900 tabular-nums">
              {d.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
