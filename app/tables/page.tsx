"use client";

import { PageHeader, StatusBadge, Card } from "@dinova/components/ui";
import {
  QrCode,
  Plus,
  RefreshCw,
  Layers,
  PowerOff,
  Users,
  Bell,
  X as XIcon,
  Pencil,
  Trash2,
} from "lucide-react";
import clsx from "clsx";
import { useApi } from "@dinova/lib/useApi";
import { useCallback, useEffect, useState } from "react";
import { useSocketEvent } from "@dinova/lib/SocketProvider";
import { api } from "@dinova/lib/api";
import { Modal, Field, Input, Select } from "@dinova/components/Modal";
import { useToast } from "@dinova/components/Toaster";
import { generateTableQRs } from "@dinova/lib/export";

const statuses = ["Free", "Occupied", "Reserved", "Cleaning"];

function elapsedFrom(d?: string) {
  if (!d) return "";
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function TableCard({
  t,
  onClick,
  onQuickFree,
}: {
  t: any;
  onClick: () => void;
  onQuickFree: () => void;
}) {
  const bg: Record<string, string> = {
    Free: "border-emerald-200 bg-emerald-50/60",
    Occupied: "border-sky-200 bg-sky-50/60",
    Reserved: "border-violet-200 bg-violet-50/60",
    Cleaning: "border-amber-200 bg-amber-50/60",
  };
  return (
    <div
      className={clsx(
        "rounded-xl border-2 p-4 relative min-h-[132px] flex flex-col justify-between transition-shadow hover:shadow-card",
        bg[t.status] ?? "border-ink-200 bg-white"
      )}
    >
      <button
        onClick={onClick}
        className="absolute inset-0 rounded-xl"
        aria-label={`Open ${t.code}`}
      />
      <div className="relative flex items-start justify-between pointer-events-none">
        <div>
          <p className="text-lg font-bold text-ink-900 tracking-tight">{t.code}</p>
          <p className="text-[11px] text-ink-500">
            Seats {t.capacity} · {t.zone}
          </p>
        </div>
        <StatusBadge status={t.status} />
      </div>
      <div className="relative mt-3 text-xs text-ink-600 space-y-0.5 pointer-events-none">
        {t.status === "Occupied" && (
          <div>
            👥 {t.guests ?? "—"} guests · ⏱ {elapsedFrom(t.seatedAt)}
          </div>
        )}
        {t.status === "Reserved" && (
          <div>
            Reserved ·{" "}
            {t.reservedFor
              ? new Date(t.reservedFor).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"}
          </div>
        )}
        {t.status === "Cleaning" && <div>Cleaning in progress</div>}
        {t.status === "Free" && <div>Ready to seat</div>}
      </div>
      {t.status !== "Free" && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onQuickFree();
          }}
          className="relative mt-3 w-full text-[11px] font-semibold py-1.5 rounded-md bg-white border border-ink-200 text-ink-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors"
        >
          ✓ Free table
        </button>
      )}
    </div>
  );
}

export default function TablesPage() {
  const tablesApi = useApi<{ tables: any[] }>("/api/tables");
  const { data, refresh } = tablesApi;
  const resApi = useApi<{ reservations: any[] }>(
    "/api/tables/reservations/upcoming"
  );
  const { data: resData, refresh: refreshRes } = resApi;
  const waitApi = useApi<{ items: any[] }>("/api/waitlist");
  const { data: waitData, refresh: refreshWait } = waitApi;
  const [waitAddOpen, setWaitAddOpen] = useState(false);
  const [seatFrom, setSeatFrom] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [resOpen, setResOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<any | null>(null);
  const toast = useToast();

  const onEvt = useCallback(() => {
    refresh();
    refreshWait();
  }, [refresh, refreshWait]);
  useSocketEvent("table:update", onEvt);
  useSocketEvent("order:update", onEvt);

  const tables = data?.tables ?? [];
  const total = tables.length;
  const occ = tables.filter((t) => t.status === "Occupied").length;
  const free = tables.filter((t) => t.status === "Free").length;

  async function setStatus(status: string) {
    if (!selected) return;
    try {
      await api.post(`/api/tables/${selected.id}/status`, { status });
      toast(`${selected.code} → ${status}`, "success");
      setSelected(null);
      refresh();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function markFree() {
    if (!selected) return;
    try {
      await api.post(`/api/tables/${selected.id}/free`);
      toast(`${selected.code} freed · session ended`, "success");
      setSelected(null);
      refresh();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function quickFree(t: any) {
    try {
      await api.post(`/api/tables/${t.id}/free`);
      toast(`${t.code} freed`, "success");
      refresh();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function freeAllNonFree() {
    const toFree = tables.filter((t: any) => t.status !== "Free" && t.status !== "Reserved");
    if (toFree.length === 0) {
      toast("Nothing to free", "info");
      return;
    }
    if (!confirm(`Free ${toFree.length} table${toFree.length === 1 ? "" : "s"}? This ends their sessions.`)) return;
    try {
      await Promise.all(
        toFree.map((t: any) => api.post(`/api/tables/${t.id}/free`))
      );
      toast(`Freed ${toFree.length} tables`, "success");
      refresh();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  function openCreateTable() {
    setEditingTable(null);
    setManageOpen(true);
  }

  function openEditTable(t: any) {
    setEditingTable(t);
    setManageOpen(true);
  }

  async function removeTable(t: any) {
    if (
      !confirm(
        `Remove ${t.code}? This cannot be undone and only Free tables can be removed.`
      )
    ) {
      return;
    }
    try {
      await api.del(`/api/tables/${t.id}`);
      toast(`${t.code} removed`, "success");
      setSelected(null);
      refresh();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  const zones = ["Indoor", "Outdoor", "VIP"].map((z: string) => {
    const zt = tables.filter((t: any) => t.zone === z);
    const zOcc = zt.filter((t: any) => t.status === "Occupied").length;
    return { zone: z, occ: zOcc, total: zt.length };
  });

  return (
    <>
      <PageHeader
        title="Tables & Floor"
        subtitle="Live floor view · color-coded by status"
        right={
          <>
            <button
              className="btn-outline"
              onClick={async () => {
                if (!tables.length) return;
                toast("Generating QR codes PDF…");
                await generateTableQRs(
                  tables.map((t: any) => ({ code: t.code, zone: t.zone })),
                  window.location.origin,
                  "Dinova · Gulberg"
                );
                toast("QR codes PDF downloaded", "success");
              }}
            >
              <QrCode className="w-4 h-4" /> Print QR codes
            </button>
            <button
              className="btn-outline"
              onClick={() =>
                toast(
                  "Floor plan editor: drag positions ship in Phase 2",
                  "info"
                )
              }
            >
              <Layers className="w-4 h-4" /> Floor plan editor
            </button>
            <button className="btn-outline" onClick={openCreateTable}>
              <Plus className="w-4 h-4" /> Add table
            </button>
            <button className="btn-primary" onClick={() => setResOpen(true)}>
              <Plus className="w-4 h-4" /> New reservation
            </button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
        <div className="card p-4">
          <p className="kpi-label">Occupancy</p>
          <p className="text-2xl font-semibold mt-1">
            {total ? Math.round((occ / total) * 100) : 0}%
          </p>
          <p className="text-[11px] text-ink-500 mt-0.5">
            {occ} of {total} tables
          </p>
        </div>
        <div className="card p-4">
          <p className="kpi-label">Free</p>
          <p className="text-2xl font-semibold mt-1">{free}</p>
          <p className="text-[11px] text-ink-500 mt-0.5">Ready to seat</p>
        </div>
        <div className="card p-4">
          <p className="kpi-label">Reservations upcoming</p>
          <p className="text-2xl font-semibold mt-1">
            {resData?.reservations?.length ?? 0}
          </p>
          <p className="text-[11px] text-ink-500 mt-0.5">Next 24h</p>
        </div>
        <div className="card p-4">
          <p className="kpi-label">Zones</p>
          <p className="text-2xl font-semibold mt-1">{zones.length}</p>
          <p className="text-[11px] text-ink-500 mt-0.5">Indoor, Outdoor, VIP</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <div className="xl:col-span-3">
          <Card
            title="Live floor"
            subtitle="Tap a table for details · tap ✓ Free to clear"
            right={
              <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                <button
                  onClick={freeAllNonFree}
                  className="btn-ghost text-xs text-emerald-700 hover:text-emerald-800"
                  title="End sessions for all non-free, non-reserved tables"
                >
                  Free all closed
                </button>
                <button
                  onClick={() => refresh()}
                  className="btn-ghost text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {tables.map((t: any) => (
                <TableCard
                  key={t.id}
                  t={t}
                  onClick={() => setSelected(t)}
                  onQuickFree={() => quickFree(t)}
                />
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
        <Card
          title={`🪑 Waitlist · ${waitData?.items?.length ?? 0}`}
          subtitle="Parties waiting · seat + notify"
          right={
            <button
              className="btn-ghost text-xs"
              onClick={() => setWaitAddOpen(true)}
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          }
          pad={false}
        >
          <div className="divide-y divide-ink-100">
            {(waitData?.items ?? []).length === 0 ? (
              <p className="text-sm text-ink-400 text-center py-6">
                No one waiting right now.
              </p>
            ) : (
              (waitData!.items ?? []).map((w: any) => (
                <div
                  key={w.id}
                className="px-4 py-2.5 flex flex-col items-start gap-2 sm:flex-row sm:items-center"
                >
                  <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink-900 truncate">
                      {w.customerName} · {w.party}
                    </p>
                    <p className="text-[11px] text-ink-500">
                      ⏱ {w.waitingMinutes}m waiting
                      {w.phone ? ` · ${w.phone}` : ""}
                      {w.notifiedAt ? " · notified ✓" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={async () => {
                        try {
                          await api.post(`/api/waitlist/${w.id}/notify`);
                          toast("SMS mock sent · see Notifications", "success");
                          refreshWait();
                        } catch (e: any) {
                          toast(e.message, "error");
                        }
                      }}
                      className="text-[11px] px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100"
                    >
                      <Bell className="w-3 h-3 inline" />
                    </button>
                    <button
                      onClick={() => setSeatFrom(w)}
                      className="text-[11px] px-2 py-1 rounded bg-brand-500 text-white font-semibold hover:bg-brand-600"
                    >
                      Seat
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await api.post(
                            `/api/waitlist/${w.id}/cancel`,
                            { left: true }
                          );
                          refreshWait();
                        } catch (e: any) {
                          toast(e.message, "error");
                        }
                      }}
                      className="text-[11px] w-6 h-6 rounded text-rose-600 hover:bg-rose-50 flex items-center justify-center"
                      title="Mark left"
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card title="Zone summary">
          <div className="space-y-4">
            {zones.map((z) => (
              <div key={z.zone}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-ink-900">{z.zone}</span>
                  <span className="text-ink-500 text-xs">
                    {z.occ}/{z.total} occupied
                  </span>
                </div>
                <div className="mt-1.5 flex gap-1">
                  {Array.from({ length: Math.max(1, z.total) }).map((_, i) => (
                    <span
                      key={i}
                      className={clsx(
                        "flex-1 h-2 rounded-full",
                        i < z.occ ? "bg-sky-500" : "bg-ink-100"
                      )}
                    />
                  ))}
                </div>
              </div>
            ))}

            <div className="pt-4 border-t border-ink-100">
              <p className="text-sm font-semibold text-ink-900 mb-2">
                Upcoming reservations
              </p>
              <div className="space-y-2.5">
                {(resData?.reservations ?? []).length === 0 ? (
                  <p className="text-xs text-ink-400">No upcoming reservations</p>
                ) : (
                  resData!.reservations.map((r: any) => (
                    <div key={r.id} className="flex items-center gap-3">
                      <div className="w-12 shrink-0 text-xs font-semibold text-ink-900 text-center tabular-nums">
                        {new Date(r.at).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink-900 truncate">
                          {r.customerName}
                        </p>
                        <p className="text-[11px] text-ink-500">
                          Party of {r.party}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </Card>
        </div>
      </div>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Table ${selected.code}` : ""}
        subtitle={
          selected
            ? `${selected.zone} · seats ${selected.capacity} · current ${selected.status}`
            : ""
        }
        width="max-w-sm"
      >
        {selected && selected.status !== "Free" && (
          <>
            <button
              onClick={markFree}
              className="w-full btn bg-emerald-500 text-white hover:bg-emerald-600 mb-3"
            >
              <PowerOff className="w-4 h-4" />
              Mark free &amp; end customer session
            </button>
            <p className="text-[11px] text-ink-500 mb-3">
              Closes any open orders and lets the next guest scan the QR with a
              fresh slate.
            </p>
          </>
        )}

        <p className="text-sm text-ink-600 mb-3">Or set a specific status</p>
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {statuses
            .filter((s) => s !== "Free")
            .map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className="btn-outline justify-start"
              >
                <StatusBadge status={s} />
              </button>
            ))}
        </div>
        {selected && (
          <div className="border-t border-ink-100 pt-4">
            <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-2">
              Manage table
            </p>
            <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                className="btn-outline justify-start"
                onClick={() => openEditTable(selected)}
              >
                <Pencil className="h-4 w-4" /> Edit details
              </button>
              <button
                className="btn-outline justify-start text-rose-700 hover:text-rose-800"
                onClick={() => removeTable(selected)}
              >
                <Trash2 className="h-4 w-4" /> Remove table
              </button>
            </div>
            <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold mb-2">
              Customer QR link
            </p>
            <a
              href={`/qr/${encodeURIComponent(selected.code)}`}
              target="_blank"
              rel="noreferrer"
              className="btn-outline w-full"
            >
              Open customer menu for {selected.code} ↗
            </a>
          </div>
        )}
      </Modal>

      <NewReservationModal
        open={resOpen}
        onClose={() => setResOpen(false)}
        tables={tables}
        onCreated={() => {
          refreshRes();
          refresh();
        }}
      />

      <ManageTableModal
        open={manageOpen}
        table={editingTable}
        onClose={() => {
          setManageOpen(false);
          setEditingTable(null);
        }}
        onSaved={() => {
          setManageOpen(false);
          setEditingTable(null);
          refresh();
        }}
      />

      <AddToWaitlistModal
        open={waitAddOpen}
        onClose={() => setWaitAddOpen(false)}
        onSaved={() => {
          setWaitAddOpen(false);
          refreshWait();
        }}
      />

      <SeatFromWaitlistModal
        waitlist={seatFrom}
        tables={tables}
        onClose={() => setSeatFrom(null)}
        onSeated={() => {
          setSeatFrom(null);
          refresh();
          refreshWait();
        }}
      />
    </>
  );
}

function ManageTableModal({
  open,
  table,
  onClose,
  onSaved,
}: {
  open: boolean;
  table: any | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<any>({
    code: "",
    capacity: 4,
    zone: "Indoor",
    status: "Free",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (table) {
      setForm({
        code: table.code ?? "",
        capacity: Number(table.capacity ?? 4),
        zone: table.zone ?? "Indoor",
        status: table.status ?? "Free",
      });
      return;
    }
    setForm({ code: "", capacity: 4, zone: "Indoor", status: "Free" });
  }, [open, table]);

  async function save() {
    const code = String(form.code ?? "").trim().toUpperCase();
    if (!code) {
      toast("Table code is required", "error");
      return;
    }
    if (!form.capacity || Number(form.capacity) < 1) {
      toast("Capacity must be at least 1", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        code,
        capacity: Number(form.capacity),
        zone: form.zone,
        status: form.status,
      };
      if (table) {
        await api.patch(`/api/tables/${table.id}`, payload);
        toast(`${code} updated`, "success");
      } else {
        await api.post("/api/tables", payload);
        toast(`${code} created`, "success");
      }
      onSaved();
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
      title={table ? `Edit table ${table.code}` : "Add table"}
      subtitle="Manage dining table details"
      width="max-w-md"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving..." : table ? "Save changes" : "Create table"}
          </button>
        </>
      }
    >
      <Field label="Table code">
        <Input
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          placeholder="e.g. T12"
        />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Capacity">
          <Input
            type="number"
            min={1}
            value={form.capacity}
            onChange={(e) =>
              setForm({ ...form, capacity: Number(e.target.value) || 0 })
            }
          />
        </Field>
        <Field label="Zone">
          <Select
            value={form.zone}
            onChange={(e) => setForm({ ...form, zone: e.target.value })}
          >
            <option value="Indoor">Indoor</option>
            <option value="Outdoor">Outdoor</option>
            <option value="VIP">VIP</option>
          </Select>
        </Field>
      </div>
      <Field label="Status">
        <Select
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value })}
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </Field>
    </Modal>
  );
}

function AddToWaitlistModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<any>({ party: 2 });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) setForm({ party: 2 });
  }, [open]);
  async function save() {
    if (!form.customerName) {
      toast("Guest name required", "error");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/waitlist", form);
      toast("Added to waitlist", "success");
      onSaved();
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
      title="Add to waitlist"
      width="max-w-md"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Adding…" : "Add"}
          </button>
        </>
      }
    >
      <Field label="Guest name">
        <Input
          value={form.customerName ?? ""}
          onChange={(e) => setForm({ ...form, customerName: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Phone (for SMS)">
          <Input
            value={form.phone ?? ""}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </Field>
        <Field label="Party size">
          <Input
            type="number"
            min={1}
            value={form.party}
            onChange={(e) =>
              setForm({ ...form, party: Number(e.target.value) })
            }
          />
        </Field>
      </div>
      <Field label="Quoted wait (minutes, optional)">
        <Input
          type="number"
          value={form.quotedMinutes ?? ""}
          onChange={(e) =>
            setForm({
              ...form,
              quotedMinutes: e.target.value
                ? Number(e.target.value)
                : undefined,
            })
          }
        />
      </Field>
    </Modal>
  );
}

function SeatFromWaitlistModal({
  waitlist,
  tables,
  onClose,
  onSeated,
}: {
  waitlist: any | null;
  tables: any[];
  onClose: () => void;
  onSeated: () => void;
}) {
  const toast = useToast();
  const [tableId, setTableId] = useState("");
  useEffect(() => {
    setTableId("");
  }, [waitlist]);
  if (!waitlist) return null;
  const free = tables.filter(
    (t: any) => t.status === "Free" && t.capacity >= waitlist.party
  );
  async function seat() {
    if (!tableId) {
      toast("Pick a table", "error");
      return;
    }
    try {
      await api.post(`/api/waitlist/${waitlist.id}/seat`, { tableId });
      toast(`${waitlist.customerName} seated`, "success");
      onSeated();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }
  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Seat · ${waitlist.customerName}`}
      subtitle={`Party of ${waitlist.party}`}
      width="max-w-md"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={seat}
            disabled={!tableId}
          >
            Seat
          </button>
        </>
      }
    >
      {free.length === 0 ? (
        <p className="text-sm text-rose-600">
          No Free tables with capacity {waitlist.party}+ right now.
        </p>
      ) : (
        <Field label="Pick a Free table">
          <Select value={tableId} onChange={(e) => setTableId(e.target.value)}>
            <option value="">— select —</option>
            {free.map((t: any) => (
              <option key={t.id} value={t.id}>
                {t.code} · {t.zone} · seats {t.capacity}
              </option>
            ))}
          </Select>
        </Field>
      )}
    </Modal>
  );
}

function NewReservationModal({
  open,
  onClose,
  tables,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  tables: any[];
  onCreated: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [party, setParty] = useState(2);
  const [at, setAt] = useState("");
  const [tableId, setTableId] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name || !at) {
      toast("Enter name and time", "error");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/tables/reservations", {
        customerName: name,
        phone,
        party: Number(party),
        at: new Date(at),
        tableId: tableId || undefined,
      });
      toast("Reservation booked", "success");
      setName("");
      setPhone("");
      setParty(2);
      setAt("");
      setTableId("");
      onCreated();
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
      title="New reservation"
      subtitle="Block a table at a future time"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Booking…" : "Book"}
          </button>
        </>
      }
    >
      <Field label="Guest name">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Phone">
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Party size">
          <Input
            type="number"
            min={1}
            value={party}
            onChange={(e) => setParty(Number(e.target.value))}
          />
        </Field>
        <Field label="When">
          <Input
            type="datetime-local"
            value={at}
            onChange={(e) => setAt(e.target.value)}
          />
        </Field>
      </div>
      <Field label="Table (optional)">
        <Select value={tableId} onChange={(e) => setTableId(e.target.value)}>
          <option value="">Any available</option>
          {tables.map((t) => (
            <option key={t.id} value={t.id}>
              {t.code} · {t.zone} · seats {t.capacity}
            </option>
          ))}
        </Select>
      </Field>
    </Modal>
  );
}
