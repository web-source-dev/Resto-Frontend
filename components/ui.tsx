import clsx from "clsx";
import {
  ArrowDownRight,
  ArrowUpRight,
  LucideIcon,
} from "lucide-react";
import React from "react";

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-[22px] md:text-[26px] font-semibold tracking-tight text-ink-900">
          {title}
        </h1>
        {subtitle && <p className="text-sm text-ink-500 mt-1">{subtitle}</p>}
      </div>
      {right && (
        <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">
          {right}
        </div>
      )}
    </div>
  );
}

export function Kpi({
  label,
  value,
  delta,
  icon: Icon,
  tone = "brand",
  hint,
}: {
  label: string;
  value: string;
  delta?: number;
  icon?: LucideIcon;
  tone?: "brand" | "emerald" | "sky" | "violet" | "amber";
  hint?: string;
}) {
  const tones: Record<string, string> = {
    brand: "from-brand-50 text-brand-700",
    emerald: "from-emerald-50 text-emerald-700",
    sky: "from-sky-50 text-sky-700",
    violet: "from-violet-50 text-violet-700",
    amber: "from-amber-50 text-amber-700",
  };
  const up = (delta ?? 0) >= 0;
  return (
    <div className="card p-5 relative overflow-hidden">
      <div
        className={clsx(
          "absolute -top-10 -right-10 w-36 h-36 rounded-full bg-gradient-to-br opacity-70 blur-2xl",
          tones[tone]
        )}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="kpi-label">{label}</p>
          <p className="kpi-value mt-1.5">{value}</p>
          {hint && <p className="text-[11px] text-ink-400 mt-1">{hint}</p>}
        </div>
        {Icon && (
          <div
            className={clsx(
              "w-10 h-10 rounded-lg flex items-center justify-center bg-white border border-ink-200/70",
              tones[tone].split(" ")[1]
            )}
          >
            <Icon className="w-[18px] h-[18px]" />
          </div>
        )}
      </div>
      {typeof delta === "number" && (
        <div className="relative mt-3 flex items-center gap-1.5">
          <span
            className={clsx(
              "chip",
              up
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            )}
          >
            {up ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            {up ? "+" : ""}
            {delta}%
          </span>
          <span className="text-xs text-ink-500">vs last week</span>
        </div>
      )}
    </div>
  );
}

export function StatusBadge({
  status,
}: {
  status: string;
}) {
  const map: Record<string, string> = {
    Pending: "bg-amber-50 text-amber-700",
    Queued: "bg-ink-100 text-ink-700",
    "In Progress": "bg-sky-50 text-sky-700",
    Preparing: "bg-sky-50 text-sky-700",
    Ready: "bg-emerald-50 text-emerald-700",
    Served: "bg-emerald-50 text-emerald-700",
    Paid: "bg-emerald-50 text-emerald-700",
    Completed: "bg-emerald-50 text-emerald-700",
    Overdue: "bg-rose-50 text-rose-700",
    Cancelled: "bg-rose-50 text-rose-700",
    Free: "bg-emerald-50 text-emerald-700",
    Occupied: "bg-sky-50 text-sky-700",
    Reserved: "bg-violet-50 text-violet-700",
    Cleaning: "bg-amber-50 text-amber-700",
    Delivery: "bg-violet-50 text-violet-700",
    Takeaway: "bg-amber-50 text-amber-700",
    "Dine-in": "bg-sky-50 text-sky-700",
    Low: "bg-amber-50 text-amber-700",
    Out: "bg-rose-50 text-rose-700",
    OK: "bg-emerald-50 text-emerald-700",
    Active: "bg-emerald-50 text-emerald-700",
    Inactive: "bg-ink-100 text-ink-600",
  };
  return (
    <span
      className={clsx(
        "chip",
        map[status] ?? "bg-ink-100 text-ink-700"
      )}
    >
      <span
        className={clsx(
          "status-dot",
          status === "Ready" || status === "Free" || status === "OK" || status === "Paid" || status === "Active" || status === "Served" || status === "Completed"
            ? "bg-emerald-500"
            : status === "In Progress" || status === "Preparing" || status === "Occupied" || status === "Dine-in"
            ? "bg-sky-500"
            : status === "Overdue" || status === "Cancelled" || status === "Out"
            ? "bg-rose-500"
            : status === "Reserved" || status === "Delivery"
            ? "bg-violet-500"
            : status === "Pending" || status === "Cleaning" || status === "Low" || status === "Takeaway"
            ? "bg-amber-500 animate-pulseDot"
            : "bg-ink-400"
        )}
      />
      {status}
    </span>
  );
}

export function Card({
  title,
  subtitle,
  right,
  children,
  className,
  pad = true,
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <div className={clsx("card", className)}>
      {(title || right) && (
        <div className="flex flex-col gap-2 px-4 pb-3 pt-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:pt-5">
          <div>
            {title && <div className="section-title">{title}</div>}
            {subtitle && <div className="text-xs text-ink-500 mt-0.5">{subtitle}</div>}
          </div>
          {right}
        </div>
      )}
      <div className={clsx(pad && "px-5 pb-5")}>{children}</div>
    </div>
  );
}

export function Progress({ value, tone = "brand" }: { value: number; tone?: "brand" | "emerald" | "rose" | "amber" }) {
  const bg: Record<string, string> = {
    brand: "bg-brand-500",
    emerald: "bg-emerald-500",
    rose: "bg-rose-500",
    amber: "bg-amber-500",
  };
  return (
    <div className="w-full h-1.5 bg-ink-100 rounded-full overflow-hidden">
      <div
        className={clsx("h-full rounded-full", bg[tone])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
