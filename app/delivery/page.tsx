"use client";

import { PageHeader, Card, StatusBadge } from "@dinova/components/ui";
import { useApi } from "@dinova/lib/useApi";
import { useCallback, useState } from "react";
import { useSocketEvent } from "@dinova/lib/SocketProvider";
import { api } from "@dinova/lib/api";
import { useToast } from "@dinova/components/Toaster";
import { useAuth } from "@dinova/lib/AuthProvider";
import {
  Bike,
  MapPin,
  Phone,
  Package,
  Coffee,
  CheckCircle2,
  XCircle,
  UserCheck,
  UserX,
  Navigation,
  Wallet,
  Clock,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { Modal, Field, Input, Textarea, Select } from "@dinova/components/Modal";
import clsx from "clsx";

export default function DeliveryPage() {
  const { user } = useAuth();
  const role = user?.role ?? "";
  const isRider = role === "rider";
  const isDispatcher = ["admin", "manager", "receptionist"].includes(role);

  if (isRider) return <RiderView />;
  if (isDispatcher) return <DispatchView />;
  return (
    <div className="p-10 text-center text-ink-500">
      You don&apos;t have access to delivery operations.
    </div>
  );
}

// ─── Rider view ───────────────────────────────────────────────────────────

function RiderView() {
  const { data, refresh } = useApi<{
    active: any | null;
    completedToday: any[];
    unassigned: any[];
    rider: { id: string; name: string; clockedInAt: string; onBreak: boolean };
  }>("/api/delivery/my-assignment");
  const toast = useToast();
  const [failOpen, setFailOpen] = useState<any | null>(null);

  const onEvt = useCallback(() => refresh(), [refresh]);
  useSocketEvent("order:new", onEvt);
  useSocketEvent("order:update", onEvt);
  useSocketEvent("notification:new", onEvt);

  const active = data?.active;
  const completed = data?.completedToday ?? [];
  const unassigned = data?.unassigned ?? [];
  const rider = data?.rider;
  const status = computeRiderStatus(rider, active);

  async function act(
    op: "pickup" | "delivered" | "claim",
    orderId: string,
    extra: any = {}
  ) {
    try {
      if (op === "claim") {
        await api.post("/api/delivery/claim", { orderId });
        toast("Claimed — head to the counter", "success");
      } else if (op === "pickup") {
        await api.post(`/api/delivery/orders/${orderId}/pickup`);
        toast("Picked up · en route", "success");
      } else if (op === "delivered") {
        await api.post(`/api/delivery/orders/${orderId}/delivered`, extra);
        toast("Delivered · nice work", "success");
      }
      refresh();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function toggleBreak() {
    try {
      await api.post("/api/delivery/break", { on: !rider?.onBreak });
      toast(rider?.onBreak ? "Back on the road" : "On break", "info");
      refresh();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  const firstName = rider?.name?.split(" ")[0] ?? "rider";
  const earningsEstimate = completed.reduce(
    (s: number, o: any) => s + (o.total ?? 0),
    0
  );

  return (
    <>
      <PageHeader
        title={`Hey ${firstName} 🛵`}
        subtitle="Your active delivery and today's runs"
        right={
          <button
            onClick={toggleBreak}
            className={clsx(
              "btn",
              rider?.onBreak
                ? "bg-emerald-500 text-white hover:bg-emerald-600"
                : "btn-outline"
            )}
          >
            <Coffee className="w-4 h-4" />
            {rider?.onBreak ? "End break" : "Take a break"}
          </button>
        }
      />

      {/* Rider status banner */}
      <div
        className={clsx(
          "card mb-6 flex flex-col gap-3 border-2 p-4 sm:flex-row sm:items-center",
          status === "Available" && "border-emerald-200 bg-emerald-50/60",
          status === "On delivery" && "border-sky-200 bg-sky-50/60",
          status === "Picking up" && "border-amber-200 bg-amber-50/60",
          status === "On break" && "border-violet-200 bg-violet-50/60",
          status === "Off shift" && "border-ink-200 bg-ink-50"
        )}
      >
        <div
          className={clsx(
            "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
            status === "Available" && "bg-emerald-500 text-white",
            status === "On delivery" && "bg-sky-500 text-white",
            status === "Picking up" && "bg-amber-500 text-white",
            status === "On break" && "bg-violet-500 text-white",
            status === "Off shift" && "bg-ink-400 text-white"
          )}
        >
          <Bike className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-ink-500">
            Your status
          </p>
          <p className="text-lg font-bold text-ink-900 leading-tight">
            {status}
          </p>
          <p className="text-[11px] text-ink-500">
            {status === "Available" && "Waiting for the next assignment"}
            {status === "Picking up" && "Head to the counter to grab the order"}
            {status === "On delivery" && "Keep going — customer is waiting"}
            {status === "On break" && "Take your time · tap 'End break' when ready"}
            {status === "Off shift" && "Clock in from the Staff page to start"}
          </p>
        </div>
        <div className="shrink-0 text-left sm:text-right">
          <p className="kpi-label">Today</p>
          <p className="text-xl font-bold tabular-nums">{completed.length}</p>
          <p className="text-[11px] text-ink-500">deliveries</p>
        </div>
      </div>

      {/* Active delivery card or empty state */}
      {active ? (
        <ActiveDeliveryCard
          order={active}
          onPickup={() => act("pickup", active.id)}
          onDelivered={(paid) =>
            act("delivered", active.id, { paymentCollected: paid })
          }
          onFail={() => setFailOpen(active)}
        />
      ) : (
        <EmptyActiveCard
          rider={rider}
          unassigned={unassigned}
          onClaim={(id) => act("claim", id)}
        />
      )}

      {/* Today's completed deliveries */}
      <Card
        title="Today's deliveries"
        subtitle={`${completed.length} runs · Rs ${earningsEstimate.toLocaleString()} handled`}
        pad={false}
        className="mt-6"
      >
        {completed.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-500">
            No completed deliveries today yet.
          </div>
        ) : (
          <div className="divide-y divide-ink-100">
            {completed.map((o: any) => (
              <div
                key={o.id}
                className="flex flex-col gap-2 px-5 py-3 hover:bg-ink-50/60 sm:flex-row sm:items-center sm:gap-3"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-900">
                    {o.code} · {o.customerName ?? "—"}
                  </p>
                  <p className="text-[11px] text-ink-500 truncate">
                    {o.deliveryAddress ?? "—"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm tabular-nums">
                    Rs {(o.total ?? 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-ink-500">
                    {new Date(o.deliveredAt ?? o.closedAt).toLocaleTimeString(
                      "en-US",
                      { hour: "2-digit", minute: "2-digit" }
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <FailDeliveryModal
        order={failOpen}
        onClose={() => setFailOpen(null)}
        onDone={() => {
          setFailOpen(null);
          refresh();
        }}
      />
    </>
  );
}

function ActiveDeliveryCard({
  order,
  onPickup,
  onDelivered,
  onFail,
}: {
  order: any;
  onPickup: () => void;
  onDelivered: (paymentCollected: boolean) => void;
  onFail: () => void;
}) {
  const phase = order.status === "Ready" ? "pickup" : "enroute";
  const [codConfirm, setCodConfirm] = useState(false);
  const elapsedSincePickup =
    order.pickedUpAt
      ? Math.round(
          (Date.now() - new Date(order.pickedUpAt).getTime()) / 60000
        )
      : null;

  const address = order.deliveryAddress ?? "";
  const phone = order.customerPhone ?? "";

  return (
    <div className="card overflow-hidden">
      <div
        className={clsx(
          "flex flex-col gap-2 px-5 py-3 text-white sm:flex-row sm:items-center sm:justify-between",
          phase === "pickup" ? "bg-amber-500" : "bg-sky-500"
        )}
      >
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4" />
          <span className="text-[11px] uppercase tracking-[0.2em] font-bold">
            {phase === "pickup" ? "Pick up from counter" : "En route to customer"}
          </span>
        </div>
        <span className="text-xs font-semibold">{order.code}</span>
      </div>

      <div className="p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xl font-bold tracking-tight text-ink-900">
              {order.customerName ?? "Customer"}
            </p>
            <p className="text-sm text-ink-500">
              {order.items?.length ?? 0} items · placed{" "}
              {new Date(order.placedAt).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[11px] uppercase tracking-wider text-ink-500 font-semibold">
              Bill total
            </p>
            <p className="text-2xl font-extrabold tabular-nums text-ink-900">
              Rs {(order.total ?? 0).toLocaleString()}
            </p>
            {order.cashOnDelivery ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 mt-1">
                <Wallet className="w-3 h-3" /> COD · collect cash
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 mt-1">
                <Wallet className="w-3 h-3" /> Prepaid
              </span>
            )}
          </div>
        </div>

        {/* Big contact actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {address && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                address
              )}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl bg-sky-50 border border-sky-200 hover:bg-sky-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-sky-500 text-white flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider font-bold text-sky-700">
                  Address · tap to navigate
                </p>
                <p className="text-sm font-semibold text-ink-900 leading-tight line-clamp-2">
                  {address}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-sky-500 shrink-0" />
            </a>
          )}
          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-700">
                  Customer · tap to call
                </p>
                <p className="text-sm font-semibold text-ink-900 font-mono tracking-tight">
                  {phone}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-emerald-500 shrink-0" />
            </a>
          )}
        </div>

        {order.deliveryNote && (
          <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-900">
            <AlertTriangle className="w-4 h-4 inline mr-1.5 text-amber-600" />
            <span className="font-medium">Note:</span> {order.deliveryNote}
          </div>
        )}

        {/* Items quick glance */}
        <div className="mt-4 pt-4 border-t border-ink-100">
          <p className="text-[11px] uppercase tracking-wider font-semibold text-ink-500 mb-2">
            Items
          </p>
          <div className="space-y-1.5">
            {order.items?.map((i: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center gap-3 text-sm"
              >
                <span className="w-6 h-6 rounded bg-ink-100 text-ink-700 text-xs font-bold flex items-center justify-center shrink-0">
                  {i.qty}
                </span>
                <span className="flex-1 min-w-0 truncate">{i.name}</span>
                {i.mods?.length > 0 && (
                  <span className="text-[11px] text-brand-600 truncate max-w-[140px]">
                    {i.mods.join(" · ")}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {phase === "enroute" && elapsedSincePickup !== null && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-ink-500">
            <Clock className="w-3 h-3" />
            {elapsedSincePickup} min on the road
          </div>
        )}
      </div>

      {/* Action footer */}
      <div className="border-t border-ink-100 bg-ink-50/60 p-4">
        {phase === "pickup" ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button onClick={onFail} className="btn-outline text-rose-600">
              <XCircle className="w-4 h-4" /> Can&apos;t deliver
            </button>
            <button
              onClick={onPickup}
              className="btn-primary flex-1 h-12 text-sm font-bold"
            >
              <Package className="w-4 h-4" />
              Picked up · start route
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {order.cashOnDelivery && (
              <label className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={codConfirm}
                  onChange={(e) => setCodConfirm(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-semibold text-amber-900">
                  Cash collected · Rs {(order.total ?? 0).toLocaleString()}
                </span>
              </label>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button onClick={onFail} className="btn-outline text-rose-600">
                <XCircle className="w-4 h-4" /> Failed
              </button>
              <button
                onClick={() =>
                  onDelivered(order.cashOnDelivery ? codConfirm : true)
                }
                disabled={order.cashOnDelivery && !codConfirm}
                className="btn flex-1 h-12 bg-emerald-500 text-white hover:bg-emerald-600 text-sm font-bold disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" /> Delivered
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyActiveCard({
  rider,
  unassigned,
  onClaim,
}: {
  rider: any;
  unassigned: any[];
  onClaim: (id: string) => void;
}) {
  const canClaim = rider?.clockedInAt && !rider?.onBreak;
  return (
    <>
      <Card title="No active delivery" subtitle="You're free to pick up the next run">
        <div className="py-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <Bike className="w-7 h-7" />
          </div>
          <p className="text-ink-700 font-medium">All caught up!</p>
          <p className="text-sm text-ink-500 mt-1">
            {canClaim
              ? "Grab one of the unassigned deliveries below, or wait for dispatch."
              : rider?.onBreak
              ? "You're on break. End break to start taking orders."
              : "Clock in from the Staff page to become available."}
          </p>
        </div>
      </Card>

      {unassigned.length > 0 && (
        <Card
          title="Unassigned · ready for pickup"
          subtitle="First-come first-served · tap Claim to take one"
          className="mt-4"
          pad={false}
        >
          <div className="divide-y divide-ink-100">
            {unassigned.map((o: any) => (
              <div
                key={o.id}
                className="flex flex-col gap-2 px-5 py-3 hover:bg-ink-50/60 sm:flex-row sm:items-center sm:gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Bike className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-ink-900">{o.code}</p>
                    {o.cashOnDelivery && (
                      <span className="chip bg-amber-100 text-amber-800">COD</span>
                    )}
                  </div>
                  <p className="text-[11px] text-ink-500 truncate">
                    {o.deliveryAddress ?? "—"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold tabular-nums">
                    Rs {(o.total ?? 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-ink-500">
                    {o.items?.length} items
                  </p>
                </div>
                <button
                  onClick={() => onClaim(o.id)}
                  disabled={!canClaim}
                  className="btn-primary text-xs disabled:opacity-50"
                >
                  Claim
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

function FailDeliveryModal({
  order,
  onClose,
  onDone,
}: {
  order: any | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  if (!order) return null;

  const quickReasons = [
    "Customer not reachable",
    "Wrong address",
    "Address not found",
    "Customer refused delivery",
    "Payment issue · couldn't collect",
    "Vehicle breakdown",
  ];

  async function submit() {
    const r = reason.trim();
    if (!r) {
      toast("Pick or type a reason", "error");
      return;
    }
    setSaving(true);
    try {
      await api.post(`/api/delivery/orders/${order.id}/fail`, { reason: r });
      toast("Flagged · manager notified", "success");
      onDone();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={!!order}
      onClose={onClose}
      title="Mark delivery as failed"
      subtitle={`${order.code} · ${order.deliveryAddress ?? ""}`}
      width="max-w-md"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="btn bg-rose-500 text-white hover:bg-rose-600"
          >
            {saving ? "Flagging…" : "Flag failure"}
          </button>
        </>
      }
    >
      <p className="text-sm text-ink-600 mb-3">
        Your manager will be alerted and can reassign or cancel.
      </p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {quickReasons.map((r) => (
          <button
            key={r}
            onClick={() => setReason(r)}
            className={clsx(
              "text-xs px-2.5 py-1.5 rounded-full font-medium",
              reason === r
                ? "bg-rose-500 text-white"
                : "bg-ink-100 text-ink-700 hover:bg-ink-200"
            )}
          >
            {r}
          </button>
        ))}
      </div>
      <Field label="Reason">
        <Textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What happened?"
        />
      </Field>
    </Modal>
  );
}

function computeRiderStatus(rider: any, active: any) {
  if (!rider) return "Off shift";
  if (!rider.clockedInAt) return "Off shift";
  if (active && active.status === "Ready") return "Picking up";
  if (active && active.status === "Served") return "On delivery";
  if (rider.onBreak) return "On break";
  return "Available";
}

// ─── Dispatcher view ──────────────────────────────────────────────────────

function DispatchView() {
  const { data: q, refresh: refreshQ } = useApi<{ orders: any[] }>(
    "/api/delivery/queue"
  );
  const { data: rd, refresh: refreshR } = useApi<{ riders: any[] }>(
    "/api/delivery/riders"
  );
  const toast = useToast();

  const onEvt = useCallback(() => {
    refreshQ();
    refreshR();
  }, [refreshQ, refreshR]);
  useSocketEvent("order:new", onEvt);
  useSocketEvent("order:update", onEvt);

  const orders = q?.orders ?? [];
  const riders = rd?.riders ?? [];

  const unassigned = orders.filter((o) => {
    if (o.riderId) return false;
    if (o.status === "Ready") return true;
    // Legacy: kitchen bumped "Served" before rider existed — still dispatchable
    if (
      o.channel === "Delivery" &&
      o.status === "Served" &&
      !o.pickedUpAt
    )
      return true;
    return false;
  });
  const assigned = orders.filter(
    (o) => o.riderId && ["Ready", "Served"].includes(o.status)
  );
  const awaitingKitchen = orders.filter((o) =>
    ["Pending", "Queued", "In Progress"].includes(o.status)
  );

  async function assign(orderId: string, riderId: string) {
    try {
      await api.post("/api/delivery/assign", { orderId, riderId });
      toast("Assigned", "success");
      onEvt();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function unassign(orderId: string) {
    try {
      await api.post("/api/delivery/unassign", { orderId });
      toast("Unassigned", "success");
      onEvt();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  const availableRiders = riders.filter(
    (r) => r.deliveryStatus === "Available"
  );

  return (
    <>
      <PageHeader
        title="Delivery Dispatch"
        subtitle="Assign Ready orders to available riders · track in-flight deliveries"
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-5">
          <p className="kpi-label">Ready to dispatch</p>
          <p className="kpi-value mt-1.5 text-amber-700">
            {unassigned.length}
          </p>
          <p className="text-[11px] text-ink-500 mt-0.5">Unassigned orders</p>
        </div>
        <div className="card p-5">
          <p className="kpi-label">En route</p>
          <p className="kpi-value mt-1.5 text-sky-600">
            {assigned.filter((o) => o.status === "Served").length}
          </p>
          <p className="text-[11px] text-ink-500 mt-0.5">In transit now</p>
        </div>
        <div className="card p-5">
          <p className="kpi-label">Available riders</p>
          <p className="kpi-value mt-1.5 text-emerald-600">
            {availableRiders.length}
          </p>
          <p className="text-[11px] text-ink-500 mt-0.5">
            {riders.filter((r) => r.clockedInAt).length} clocked in
          </p>
        </div>
        <div className="card p-5">
          <p className="kpi-label">In kitchen</p>
          <p className="kpi-value mt-1.5">{awaitingKitchen.length}</p>
          <p className="text-[11px] text-ink-500 mt-0.5">
            Not yet Ready for pickup
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          {/* Unassigned queue */}
          <Card
            title={`🛵 Ready to dispatch · ${unassigned.length}`}
            subtitle="Pick a rider and assign — rider gets notified instantly"
            pad={false}
          >
            {unassigned.length === 0 ? (
              <div className="p-10 text-center text-sm text-ink-500">
                No deliveries waiting for a rider.
              </div>
            ) : (
              <div className="divide-y divide-ink-100">
                {unassigned.map((o) => (
                  <DispatchRow
                    key={o.id}
                    o={o}
                    riders={riders}
                    onAssign={(riderId) => assign(o.id, riderId)}
                  />
                ))}
              </div>
            )}
          </Card>

          {/* In flight */}
          <Card
            title={`🏁 In-flight deliveries · ${assigned.length}`}
            subtitle="Assigned or en route"
            pad={false}
          >
            {assigned.length === 0 ? (
              <div className="p-8 text-center text-sm text-ink-500">
                No deliveries in flight.
              </div>
            ) : (
              <div className="divide-y divide-ink-100">
                {assigned.map((o) => (
                  <InFlightRow
                    key={o.id}
                    o={o}
                    onReassign={() => unassign(o.id)}
                  />
                ))}
              </div>
            )}
          </Card>

          {/* Awaiting kitchen */}
          {awaitingKitchen.length > 0 && (
            <Card
              title="⏳ Still cooking"
              subtitle="Delivery orders waiting on the kitchen"
              pad={false}
            >
              <div className="divide-y divide-ink-100">
                {awaitingKitchen.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center gap-3 px-5 py-3 text-sm"
                  >
                    <div className="w-8 h-8 rounded-lg bg-ink-100 flex items-center justify-center shrink-0">
                      <Bike className="w-4 h-4 text-ink-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ink-900">
                        {o.code} · {o.customerName ?? "—"}
                      </p>
                      <p className="text-[11px] text-ink-500 truncate">
                        {o.deliveryAddress ?? "—"}
                      </p>
                    </div>
                    <StatusBadge status={o.status} />
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Riders panel */}
        <Card title="Riders" subtitle={`${riders.length} on the roster`} pad={false}>
          <div className="divide-y divide-ink-100">
            {riders.map((r) => (
              <RiderRow key={r.id} r={r} />
            ))}
            {riders.length === 0 && (
              <div className="p-8 text-center text-sm text-ink-500">
                No riders on the team yet.
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

function DispatchRow({
  o,
  riders,
  onAssign,
}: {
  o: any;
  riders: any[];
  onAssign: (riderId: string) => void;
}) {
  const [rid, setRid] = useState("");
  const avail = riders.filter((r) => r.deliveryStatus === "Available");
  const elapsed = o.elapsedMin ?? 0;
  const warn = elapsed >= 5;
  return (
    <div className="px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <Bike className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-ink-900">{o.code}</p>
            <StatusBadge status={o.status} />
            {o.channel === "Delivery" &&
              o.status === "Served" &&
              !o.pickedUpAt && (
                <span className="chip bg-amber-50 text-amber-900 border border-amber-200">
                  Needs rider (was bumped early)
                </span>
              )}
            {o.cashOnDelivery && (
              <span className="chip bg-amber-100 text-amber-800">COD</span>
            )}
            <span
              className={clsx(
                "chip",
                warn ? "bg-rose-50 text-rose-700" : "bg-ink-100 text-ink-600"
              )}
            >
              <Clock className="w-3 h-3" /> {elapsed}m waiting
            </span>
          </div>
          <p className="text-sm text-ink-700 mt-1">
            <strong>{o.customerName ?? "—"}</strong>
            {o.customerPhone && (
              <span className="text-ink-500 font-mono text-[11px] ml-2">
                {o.customerPhone}
              </span>
            )}
          </p>
          <p className="text-[11px] text-ink-500 mt-0.5 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {o.deliveryAddress ?? "No address"}
          </p>
          {o.deliveryNote && (
            <p className="text-[11px] text-amber-700 mt-0.5">
              ⚡ {o.deliveryNote}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold tabular-nums">
            Rs {(o.total ?? 0).toLocaleString()}
          </p>
          <p className="text-[10px] text-ink-500">{o.items?.length} items</p>
        </div>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select
          value={rid}
          onChange={(e) => setRid(e.target.value)}
          className="flex-1"
        >
          <option value="">
            {avail.length === 0
              ? "No available riders"
              : `Pick rider (${avail.length} available)`}
          </option>
          {avail.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} · delivered {r.deliveredToday} today
            </option>
          ))}
          {riders
            .filter((r) => r.deliveryStatus !== "Available")
            .map((r) => (
              <option key={r.id} value={r.id} disabled>
                {r.name} · {r.deliveryStatus}
              </option>
            ))}
        </Select>
        <button
          onClick={() => rid && onAssign(rid)}
          disabled={!rid}
          className="btn-primary disabled:opacity-50"
        >
          <UserCheck className="w-4 h-4" /> Assign
        </button>
      </div>
    </div>
  );
}

function InFlightRow({ o, onReassign }: { o: any; onReassign: () => void }) {
  const isEnRoute = o.status === "Served";
  return (
    <div className="px-5 py-3">
      <div className="flex items-start gap-3">
        <div
          className={clsx(
            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
            isEnRoute
              ? "bg-sky-100 text-sky-700"
              : "bg-emerald-100 text-emerald-700"
          )}
        >
          <Bike className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-ink-900 text-sm">{o.code}</p>
            <span
              className={clsx(
                "chip",
                isEnRoute
                  ? "bg-sky-50 text-sky-700"
                  : "bg-amber-50 text-amber-700"
              )}
            >
              {isEnRoute ? "En route" : "Picking up"}
            </span>
            {o.failureReason && (
              <span className="chip bg-rose-50 text-rose-700">
                <AlertTriangle className="w-3 h-3" /> {o.failureReason}
              </span>
            )}
          </div>
          <p className="text-[11px] text-ink-500 mt-0.5">
            {o.riderName ?? "—"} · {o.customerName ?? "—"}
            {o.deliveryAddress ? ` · ${o.deliveryAddress}` : ""}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-sm tabular-nums">
            Rs {(o.total ?? 0).toLocaleString()}
          </p>
          {!isEnRoute && (
            <button
              onClick={onReassign}
              className="text-[11px] font-medium text-rose-600 hover:text-rose-700"
            >
              <UserX className="w-3 h-3 inline" /> Reassign
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function RiderRow({ r }: { r: any }) {
  const tone: Record<string, string> = {
    Available: "bg-emerald-500 text-white",
    "Picking up": "bg-amber-500 text-white",
    "En route": "bg-sky-500 text-white",
    "On break": "bg-violet-500 text-white",
    "Off shift": "bg-ink-300 text-white",
  };
  const init = r.name
    ?.split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-ink-400 to-ink-600 text-white flex items-center justify-center text-xs font-bold">
        {init}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-ink-900 truncate">
          {r.name}
        </p>
        <p className="text-[11px] text-ink-500">
          {r.deliveredToday} delivered today
        </p>
      </div>
      <span
        className={clsx(
          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
          tone[r.deliveryStatus] ?? "bg-ink-200 text-ink-700"
        )}
      >
        {r.deliveryStatus}
      </span>
    </div>
  );
}
