"use client";

import { PageHeader, Card, StatusBadge, Progress } from "@/components/ui";
import {
  Plus,
  Calendar,
  Download,
  Users,
  CalendarDays,
  ClipboardList,
  ArrowLeftRight,
  Check,
  X as XIcon,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import { useMemo, useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Modal, Field, Input, Select, Textarea } from "@/components/Modal";
import { useToast } from "@/components/Toaster";
import { downloadText, toCSV } from "@/lib/export";
import { useAuth } from "@/lib/AuthProvider";
import { canPerform } from "@/lib/roles";
import clsx from "clsx";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const LEAVE_TYPES = ["sick", "vacation", "personal", "emergency"];

function monday(d = new Date()) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}
function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export default function StaffPage() {
  const [tab, setTab] = useState<"roster" | "schedule" | "attendance" | "leave">(
    "roster"
  );
  const { user } = useAuth();
  const canManage = canPerform(user?.role, "staff.manage");

  const { data, refresh } = useApi<{ staff: any[] }>("/api/staff");
  const [adding, setAdding] = useState(false);
  const toast = useToast();

  const staff = data?.staff ?? [];
  const onShift = staff.filter((s: any) => s.clockedInAt).length;
  const avgRating =
    staff.length > 0
      ? (
          staff.reduce((s: number, u: any) => s + (u.rating ?? 0), 0) /
          staff.length
        ).toFixed(1)
      : "—";

  async function clock(id: string) {
    try {
      await api.post(`/api/staff/${id}/clock`);
      toast("Clock status updated", "success");
      refresh();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function downloadPayroll() {
    try {
      const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const to = new Date().toISOString().slice(0, 10);
      const r = await api.get<any>(
        `/api/attendance/payroll?from=${from}&to=${to}`
      );
      if (r.rows.length === 0) {
        toast("No attendance data in the last 7 days", "info");
        return;
      }
      const csv = toCSV(r.rows, [
        { key: "name", header: "Name" },
        { key: "role", header: "Role" },
        { key: "hours", header: "Hours" },
        { key: "hourlyRate", header: "Rate (Rs/hr)" },
        { key: "pay", header: "Pay (Rs)" },
        { key: "entries", header: "Clock-ins" },
      ]);
      downloadText(`payroll-${from}_to_${to}.csv`, csv);
      toast(
        `Exported ${r.rows.length} rows · total Rs ${r.totalPay.toLocaleString()}`,
        "success"
      );
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  return (
    <>
      <PageHeader
        title="Staff"
        subtitle="Roster · attendance · leave · payroll"
        right={
          <>
            <button className="btn-outline" onClick={downloadPayroll}>
              <Download className="w-4 h-4" /> Payroll CSV
            </button>
            {canManage && (
              <button className="btn-primary" onClick={() => setAdding(true)}>
                <Plus className="w-4 h-4" /> Add staff
              </button>
            )}
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5">
          <p className="kpi-label">On shift now</p>
          <p className="kpi-value mt-1.5">{onShift}</p>
          <p className="text-[11px] text-ink-500 mt-0.5">of {staff.length} total</p>
        </div>
        <div className="card p-5">
          <p className="kpi-label">Avg. rating</p>
          <p className="kpi-value mt-1.5">{avgRating} / 5</p>
          <p className="text-[11px] text-ink-500 mt-0.5">All roles</p>
        </div>
        <div className="card p-5">
          <p className="kpi-label">Waiters</p>
          <p className="kpi-value mt-1.5">
            {staff.filter((s: any) => s.role === "waiter").length}
          </p>
        </div>
        <div className="card p-5">
          <p className="kpi-label">Kitchen crew</p>
          <p className="kpi-value mt-1.5">
            {staff.filter((s: any) => s.role === "kitchen").length}
          </p>
        </div>
      </div>

      <div className="mb-4 inline-flex w-full flex-wrap items-center gap-1 rounded-lg border border-ink-200 bg-white p-1 sm:w-auto">
        {[
          { k: "roster", icon: Users, label: "Today's roster" },
          { k: "schedule", icon: CalendarDays, label: "Weekly schedule" },
          { k: "attendance", icon: ClipboardList, label: "Attendance log" },
          { k: "leave", icon: Calendar, label: "Leave" },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.k}
              onClick={() => setTab(t.k as any)}
              className={clsx(
                "flex-1 px-3.5 py-1.5 rounded-md text-sm font-semibold flex items-center justify-center gap-1.5 sm:flex-none",
                tab === t.k
                  ? "bg-ink-900 text-white"
                  : "text-ink-600 hover:bg-ink-100"
              )}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "roster" && (
        <Card title="Today's roster" subtitle="Clock-in via PIN/biometric" pad={false}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Staff</th>
                  <th className="table-th">Role</th>
                  <th className="table-th">Shift</th>
                  <th className="table-th">Clock-in</th>
                  <th className="table-th">Sales today</th>
                  <th className="table-th">Rating</th>
                  <th className="table-th">Status</th>
                  <th className="table-th"></th>
                </tr>
              </thead>
              <tbody>
                {staff.map((r: any) => (
                  <tr key={r.id} className="hover:bg-ink-50/60">
                    <td className="table-td">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 text-white text-xs font-semibold flex items-center justify-center">
                          {r.name?.split(" ").map((n: string) => n[0]).join("")}
                        </div>
                        <div>
                          <p className="font-medium text-ink-900">{r.name}</p>
                          <p className="text-[11px] text-ink-500">{r.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-td text-ink-600 capitalize">{r.role}</td>
                    <td className="table-td text-ink-500 text-xs">
                      {r.currentShift ?? "—"}
                    </td>
                    <td className="table-td text-ink-600 tabular-nums">
                      {r.clockedInAt
                        ? new Date(r.clockedInAt).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                    <td className="table-td font-medium">
                      {r.salesToday
                        ? `Rs ${r.salesToday.toLocaleString()}`
                        : "—"}
                    </td>
                    <td className="table-td font-semibold">⭐ {r.rating ?? "—"}</td>
                    <td className="table-td">
                      <StatusBadge
                        status={r.clockedInAt ? "Active" : "Inactive"}
                      />
                    </td>
                    <td className="table-td text-right">
                      <button
                        onClick={() => clock(r.id)}
                        className="text-xs font-medium text-brand-600 hover:text-brand-700"
                      >
                        {r.clockedInAt ? "Clock out" : "Clock in"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "schedule" && (
        <WeeklySchedule staff={staff} canManage={canManage} />
      )}

      {tab === "attendance" && <AttendanceLog />}

      {tab === "leave" && <LeavePanel staff={staff} canManage={canManage} />}

      <AddStaffModal
        open={adding}
        onClose={() => setAdding(false)}
        onSaved={refresh}
      />
    </>
  );
}

function WeeklySchedule({
  staff,
  canManage,
}: {
  staff: any[];
  canManage: boolean;
}) {
  const [weekStart, setWeekStart] = useState(monday());
  const dates = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  const from = ymd(dates[0]);
  const to = ymd(dates[6]);
  const { data, refresh } = useApi<{ shifts: any[] }>(
    `/api/shifts?from=${from}&to=${to}`,
    [from, to]
  );
  const toast = useToast();
  const [adding, setAdding] = useState<{ date: string; userId?: string } | null>(null);

  const shifts = data?.shifts ?? [];
  const byKey = useMemo(() => {
    const m = new Map<string, any[]>();
    for (const s of shifts) {
      const k = `${String(s.userId?._id ?? s.userId)}|${s.date}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(s);
    }
    return m;
  }, [shifts]);

  async function publishWeek() {
    try {
      const r = await api.post<{ published: number }>("/api/shifts/publish", {
        from,
        to,
      });
      toast(
        r.published === 0
          ? "Nothing new to publish"
          : `Published ${r.published} shift${r.published === 1 ? "" : "s"} · staff notified`,
        "success"
      );
      refresh();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function requestSwap(shiftId: string) {
    try {
      await api.post(`/api/shifts/${shiftId}/request-swap`);
      toast("Swap requested · manager notified", "success");
      refresh();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  return (
    <Card
      title={`Week of ${dates[0].toLocaleDateString("en-US", { day: "numeric", month: "short" })} — ${dates[6].toLocaleDateString("en-US", { day: "numeric", month: "short" })}`}
      subtitle={`${shifts.length} shifts · ${shifts.filter((s) => s.published).length} published`}
      right={
        <div className="flex flex-wrap items-center gap-1 sm:flex-nowrap">
          <button
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="btn-ghost text-xs"
          >
            ← Prev
          </button>
          <button
            onClick={() => setWeekStart(monday())}
            className="btn-ghost text-xs"
          >
            This week
          </button>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="btn-ghost text-xs"
          >
            Next →
          </button>
          {canManage && (
            <button onClick={publishWeek} className="btn-primary text-xs ml-2">
              Publish week
            </button>
          )}
        </div>
      }
      pad={false}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="table-th w-40">Staff</th>
              {dates.map((d, i) => (
                <th key={i} className="table-th text-center">
                  <div>{DAYS[i]}</div>
                  <div className="text-ink-400 font-medium">
                    {d.getDate()}/{d.getMonth() + 1}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staff.map((s: any) => (
              <tr key={s.id}>
                <td className="table-td">
                  <p className="font-semibold text-ink-900">{s.name}</p>
                  <p className="text-[10px] text-ink-500 capitalize">{s.role}</p>
                </td>
                {dates.map((d, i) => {
                  const dateStr = ymd(d);
                  const cellShifts = byKey.get(`${s.id}|${dateStr}`) ?? [];
                  return (
                    <td
                      key={i}
                      className="border-t border-ink-100 px-1 py-1 align-top min-w-[100px]"
                    >
                      {cellShifts.map((sh: any) => (
                        <div
                          key={sh._id ?? sh.id}
                          className={clsx(
                            "text-[10px] px-1.5 py-1 rounded mb-1 cursor-pointer",
                            sh.published
                              ? "bg-sky-50 text-sky-700 border border-sky-100"
                              : "bg-amber-50 text-amber-700 border border-amber-100",
                            sh.swapStatus === "requested" &&
                              "ring-1 ring-rose-300"
                          )}
                          onClick={() =>
                            !canManage &&
                            sh.published &&
                            requestSwap(sh._id ?? sh.id)
                          }
                          title={
                            sh.swapStatus === "requested"
                              ? "Swap requested"
                              : sh.published
                              ? "Published"
                              : "Draft"
                          }
                        >
                          {sh.startTime}–{sh.endTime}
                          {sh.swapStatus === "requested" && (
                            <ArrowLeftRight className="w-2.5 h-2.5 inline ml-0.5" />
                          )}
                        </div>
                      ))}
                      {canManage && (
                        <button
                          onClick={() =>
                            setAdding({ date: dateStr, userId: s.id })
                          }
                          className="text-[10px] text-ink-400 hover:text-brand-600 w-full text-left px-1"
                        >
                          + add
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adding && (
        <AddShiftModal
          staff={staff}
          preset={adding}
          onClose={() => setAdding(null)}
          onSaved={() => {
            setAdding(null);
            refresh();
          }}
        />
      )}
    </Card>
  );
}

function AddShiftModal({
  staff,
  preset,
  onClose,
  onSaved,
}: {
  staff: any[];
  preset: { date: string; userId?: string };
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    userId: preset.userId ?? staff[0]?.id,
    date: preset.date,
    startTime: "11:00",
    endTime: "17:00",
    role: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.userId) {
      toast("Pick a staff member", "error");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/shifts", form);
      toast("Shift added", "success");
      onSaved();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Add shift"
      subtitle={`${preset.date}`}
      width="max-w-md"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Add"}
          </button>
        </>
      }
    >
      <Field label="Staff">
        <Select
          value={form.userId}
          onChange={(e) => setForm({ ...form, userId: e.target.value })}
        >
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {s.role}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Start">
          <Input
            type="time"
            value={form.startTime}
            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
          />
        </Field>
        <Field label="End">
          <Input
            type="time"
            value={form.endTime}
            onChange={(e) => setForm({ ...form, endTime: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Role / station (optional)">
        <Input
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          placeholder="e.g. Grill · FOH · Delivery"
        />
      </Field>
    </Modal>
  );
}

function AttendanceLog() {
  const { data } = useApi<{ entries: any[] }>(
    "/api/attendance?limit=100"
  );
  const entries = data?.entries ?? [];
  return (
    <Card
      title="Attendance log"
      subtitle="Most recent clock-in/out events"
      pad={false}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-th">Staff</th>
              <th className="table-th">Clock-in</th>
              <th className="table-th">Clock-out</th>
              <th className="table-th">Hours</th>
              <th className="table-th">Break (min)</th>
              <th className="table-th">Rate</th>
              <th className="table-th">Pay</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e: any) => {
              const u = e.userId;
              const hrs = e.hours ?? 0;
              return (
                <tr key={e.id} className="hover:bg-ink-50/60">
                  <td className="table-td font-medium">{u?.name ?? "—"}</td>
                  <td className="table-td text-ink-600 text-xs">
                    {new Date(e.clockedInAt).toLocaleString()}
                  </td>
                  <td className="table-td text-ink-600 text-xs">
                    {e.clockedOutAt
                      ? new Date(e.clockedOutAt).toLocaleString()
                      : "— open —"}
                  </td>
                  <td className="table-td tabular-nums font-semibold">
                    {hrs.toFixed(2)}
                  </td>
                  <td className="table-td text-ink-600">{e.breakMinutes ?? 0}</td>
                  <td className="table-td text-ink-600">
                    Rs {u?.hourlyRate ?? 0}
                  </td>
                  <td className="table-td font-semibold tabular-nums">
                    Rs {Math.round(hrs * (u?.hourlyRate ?? 0)).toLocaleString()}
                  </td>
                </tr>
              );
            })}
            {entries.length === 0 && (
              <tr>
                <td colSpan={7} className="table-td text-center text-ink-500 py-10">
                  No attendance entries yet. Clock-in/out will appear here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function LeavePanel({
  staff,
  canManage,
}: {
  staff: any[];
  canManage: boolean;
}) {
  const { data, refresh } = useApi<{ items: any[] }>("/api/leave");
  const [requesting, setRequesting] = useState(false);
  const toast = useToast();
  const items = data?.items ?? [];

  async function decide(id: string, approve: boolean) {
    try {
      await api.post(`/api/leave/${id}/decide`, { approve });
      toast(approve ? "Leave approved" : "Leave rejected", "success");
      refresh();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  return (
    <Card
      title="Leave requests"
      subtitle="Sick / vacation / personal · manager approves"
      right={
        <button
          className="btn-primary text-xs"
          onClick={() => setRequesting(true)}
        >
          <Plus className="w-3.5 h-3.5" /> New request
        </button>
      }
      pad={false}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-th">Staff</th>
              <th className="table-th">Type</th>
              <th className="table-th">From</th>
              <th className="table-th">To</th>
              <th className="table-th">Days</th>
              <th className="table-th">Reason</th>
              <th className="table-th">Status</th>
              <th className="table-th"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((l: any) => (
              <tr key={l.id} className="hover:bg-ink-50/60">
                <td className="table-td font-medium">
                  {l.userName ?? l.userId?.name ?? "—"}
                </td>
                <td className="table-td capitalize">
                  <span className="chip bg-ink-100 text-ink-700">{l.type}</span>
                </td>
                <td className="table-td text-xs text-ink-600">
                  {new Date(l.from).toLocaleDateString()}
                </td>
                <td className="table-td text-xs text-ink-600">
                  {new Date(l.to).toLocaleDateString()}
                </td>
                <td className="table-td tabular-nums">{l.days}</td>
                <td className="table-td text-xs text-ink-500 max-w-[250px] truncate">
                  {l.reason ?? "—"}
                </td>
                <td className="table-td">
                  <StatusBadge
                    status={
                      l.status === "Approved"
                        ? "Completed"
                        : l.status === "Rejected"
                        ? "Cancelled"
                        : "Pending"
                    }
                  />
                </td>
                <td className="table-td text-right">
                  {l.status === "Pending" && canManage ? (
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => decide(l.id, true)}
                        className="text-emerald-600 hover:text-emerald-700"
                        title="Approve"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => decide(l.id, false)}
                        className="text-rose-600 hover:text-rose-700"
                        title="Reject"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-ink-400">
                      {l.decidedByName ?? ""}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={8} className="table-td text-center text-ink-500 py-10">
                  No leave requests yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {requesting && (
        <RequestLeaveModal
          staff={staff}
          canManage={canManage}
          onClose={() => setRequesting(false)}
          onSaved={() => {
            setRequesting(false);
            refresh();
          }}
        />
      )}
    </Card>
  );
}

function RequestLeaveModal({
  staff,
  canManage,
  onClose,
  onSaved,
}: {
  staff: any[];
  canManage: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<any>({
    type: "personal",
    from: new Date().toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try {
      await api.post("/api/leave", {
        ...form,
        from: new Date(form.from),
        to: new Date(form.to),
      });
      toast("Leave request submitted · manager notified", "success");
      onSaved();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Leave request"
      width="max-w-md"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Submit"}
          </button>
        </>
      }
    >
      {canManage && (
        <Field label="Staff (manager filing on behalf)">
          <Select
            value={form.userId ?? ""}
            onChange={(e) =>
              setForm({ ...form, userId: e.target.value || undefined })
            }
          >
            <option value="">Filing for myself</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Type">
        <Select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          {LEAVE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="From">
          <Input
            type="date"
            value={form.from}
            onChange={(e) => setForm({ ...form, from: e.target.value })}
          />
        </Field>
        <Field label="To">
          <Input
            type="date"
            value={form.to}
            onChange={(e) => setForm({ ...form, to: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Reason (optional)">
        <Textarea
          rows={3}
          value={form.reason ?? ""}
          onChange={(e) => setForm({ ...form, reason: e.target.value })}
        />
      </Field>
    </Modal>
  );
}

function AddStaffModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<any>({
    role: "waiter",
    password: "password",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({ role: "waiter", password: "password" });
  }, [open]);

  async function save() {
    if (!form.name || !form.email) {
      toast("Name and email required", "error");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/staff", form);
      toast("Staff added", "success");
      onSaved();
      onClose();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add staff"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Add"}
          </button>
        </>
      }
    >
      <Field label="Name">
        <Input
          value={form.name ?? ""}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </Field>
      <Field label="Email">
        <Input
          type="email"
          value={form.email ?? ""}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Role">
          <Select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            {[
              "admin",
              "manager",
              "receptionist",
              "waiter",
              "kitchen",
              "rider",
            ].map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Hourly rate (Rs)">
          <Input
            type="number"
            value={form.hourlyRate ?? 0}
            onChange={(e) =>
              setForm({ ...form, hourlyRate: Number(e.target.value) })
            }
          />
        </Field>
      </div>
      <Field label="Initial password" hint="Staff can change on first login">
        <Input
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
      </Field>
    </Modal>
  );
}
