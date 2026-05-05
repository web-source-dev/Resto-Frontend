"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader, Card } from "@dinova/components/ui";
import { Shield, Search, Filter, RefreshCw, Download } from "lucide-react";
import { useApi } from "@dinova/lib/useApi";
import { api } from "@dinova/lib/api";
import clsx from "clsx";
import { downloadText, toCSV } from "@dinova/lib/export";

type AuditEntry = {
  id: string;
  action: string;
  userId?: string;
  userName?: string;
  targetType?: string;
  targetId?: string;
  before?: any;
  after?: any;
  at: string;
};

type StaffOpt = { id: string; name: string; role: string };

const ACTION_GROUPS: Record<string, string> = {
  "order.": "Orders",
  "menu.": "Menu",
  "inventory.": "Inventory",
  "outlet.": "Settings",
  "promotion.": "Promotions",
};

function groupOf(action: string) {
  for (const prefix in ACTION_GROUPS) {
    if (action.startsWith(prefix)) return ACTION_GROUPS[prefix];
  }
  return "Other";
}

function fmtDt(d: string) {
  return new Date(d).toLocaleString();
}

function jsonOneLine(v: any): string {
  if (v == null) return "";
  if (typeof v !== "object") return String(v);
  // Compact human-readable summary — strip nulls and very long fields.
  const parts: string[] = [];
  for (const [k, val] of Object.entries(v)) {
    if (val == null || val === "") continue;
    let s: string;
    if (Array.isArray(val)) {
      s = `${val.length} item${val.length === 1 ? "" : "s"}`;
    } else if (typeof val === "object") {
      s = JSON.stringify(val);
    } else {
      s = String(val);
    }
    if (s.length > 80) s = s.slice(0, 77) + "…";
    parts.push(`${k}=${s}`);
  }
  return parts.join(" · ");
}

export default function AuditPage() {
  const [actionFilter, setActionFilter] = useState<string>("");
  const [userFilter, setUserFilter] = useState<string>("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");

  const path = useMemo(() => {
    const p = new URLSearchParams();
    p.set("limit", "300");
    if (actionFilter) p.set("action", actionFilter);
    if (userFilter) p.set("userId", userFilter);
    if (from) p.set("from", new Date(from).toISOString());
    if (to) p.set("to", new Date(to).toISOString());
    return `/api/audit?${p.toString()}`;
  }, [actionFilter, userFilter, from, to]);

  const { data, refresh, loading } = useApi<{ items: AuditEntry[] }>(path);
  const [actions, setActions] = useState<string[]>([]);
  const [users, setUsers] = useState<StaffOpt[]>([]);

  useEffect(() => {
    api.get<{ actions: string[] }>("/api/audit/actions")
      .then((r) => setActions(r.actions ?? []))
      .catch(() => setActions([]));
    api.get<{ users: StaffOpt[] }>("/api/audit/users")
      .then((r) => setUsers(r.users ?? []))
      .catch(() => setUsers([]));
  }, []);

  const items = data?.items ?? [];
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((it) => {
      const blob = `${it.action} ${it.userName ?? ""} ${it.targetType ?? ""} ${jsonOneLine(it.before)} ${jsonOneLine(it.after)}`.toLowerCase();
      return blob.includes(needle);
    });
  }, [items, q]);

  function exportCSV() {
    const rows = filtered.map((it) => ({
      time: fmtDt(it.at),
      action: it.action,
      group: groupOf(it.action),
      user: it.userName ?? "",
      target: `${it.targetType ?? ""}${it.targetId ? `#${it.targetId.slice(-6)}` : ""}`,
      before: it.before ? jsonOneLine(it.before) : "",
      after: it.after ? jsonOneLine(it.after) : "",
    }));
    downloadText(`activity-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(rows, [
      { key: "time", header: "Time" },
      { key: "action", header: "Action" },
      { key: "group", header: "Group" },
      { key: "user", header: "User" },
      { key: "target", header: "Target" },
      { key: "before", header: "Before" },
      { key: "after", header: "After" },
    ]), "text/csv");
  }

  return (
    <>
      <PageHeader
        title="Activity Log"
        subtitle="Every staff action that touches money, stock, or the menu"
        right={
          <>
            <button className="btn-outline" onClick={exportCSV}>
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button className="btn-outline" onClick={refresh}>
              <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} /> Refresh
            </button>
          </>
        }
      />

      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
              Search
            </label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="action, user, target, value..."
                className="w-full rounded-lg border border-ink-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
              Action
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Any</option>
              {actions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
              Staff
            </label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Any</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:col-span-2 lg:col-span-1">
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                From
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-2 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                To
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="mt-1 w-full rounded-lg border border-ink-200 bg-white px-2 py-2 text-sm"
              />
            </div>
          </div>
        </div>
        {(actionFilter || userFilter || from || to || q) && (
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-ink-800"
            onClick={() => {
              setActionFilter("");
              setUserFilter("");
              setFrom("");
              setTo("");
              setQ("");
            }}
          >
            <Filter className="h-3 w-3" /> Clear filters
          </button>
        )}
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-ink-100 bg-ink-50/40 px-4 py-2 text-[11px] text-ink-500">
          {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
          {filtered.length !== items.length && ` (filtered from ${items.length})`}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-ink-50 text-left text-[10px] uppercase tracking-wider text-ink-500">
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">Who</th>
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Target</th>
                <th className="px-4 py-2">Before</th>
                <th className="px-4 py-2">After</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-ink-400">
                    No activity matches your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((it) => (
                  <tr key={it.id} className="border-t border-ink-100 align-top hover:bg-ink-50/30">
                    <td className="px-4 py-2 text-xs text-ink-600 tabular-nums whitespace-nowrap">
                      {fmtDt(it.at)}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      <div className="font-medium text-ink-900">
                        {it.userName ?? "system"}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <div className="text-xs font-mono text-ink-800">{it.action}</div>
                      <div className="text-[10px] text-ink-400">{groupOf(it.action)}</div>
                    </td>
                    <td className="px-4 py-2 text-xs text-ink-600">
                      {it.targetType}
                      {it.targetId && (
                        <div className="font-mono text-[10px] text-ink-400">
                          {it.targetId.slice(-8)}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 max-w-[20rem] text-[11px] text-ink-500 break-words">
                      {jsonOneLine(it.before) || "—"}
                    </td>
                    <td className="px-4 py-2 max-w-[28rem] text-[11px] text-ink-700 break-words">
                      {jsonOneLine(it.after) || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-3 flex items-center gap-2 text-[11px] text-ink-500">
        <Shield className="h-3 w-3" />
        <span>
          Admin only · {items.length === 300 && "showing latest 300 — narrow with filters"}
        </span>
      </div>
    </>
  );
}
