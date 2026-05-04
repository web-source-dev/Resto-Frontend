"use client";

import { PageHeader } from "@/components/ui";
import {
  Clock,
  Flame,
  AlertTriangle,
  CheckCircle2,
  ChefHat,
  Volume2,
  VolumeX,
  BookOpen,
  FileText,
  Package,
} from "lucide-react";
import clsx from "clsx";
import { useApi } from "@/lib/useApi";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSocketEvent } from "@/lib/SocketProvider";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toaster";
import { Modal } from "@/components/Modal";
import { OrderDetailModal } from "@/components/OrderDetailModal";

const stationList = ["All", "Grill", "Fryer", "Cold", "Drinks", "Oven"];

const AUDIO_KEY = "ff_kds_audio";

/** API JSON uses `id` (global mongoose transform strips nested `_id`). */
function lineItemKey(it: any) {
  return it?.id ?? it?._id ?? "";
}

function beep() {
  try {
    const AC = (window.AudioContext || (window as any).webkitAudioContext);
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 880;
    o.type = "sine";
    g.gain.setValueAtTime(0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    o.start();
    o.stop(ctx.currentTime + 0.25);
  } catch {}
}

function TicketCard({
  o,
  onAction,
  onRecipes,
  onViewDetails,
  onAdjustItemEta,
  tick,
}: {
  o: any;
  onAction: (id: string, to: string, etaMinutes?: number) => void;
  onRecipes: (o: any) => void;
  onViewDetails: (o: any) => void;
  onAdjustItemEta: (orderId: string, itemId: string, addMinutes: number) => void;
  tick: number;
}) {
  const [etaPanelLine, setEtaPanelLine] = useState<string | null>(null);
  const elapsed = o.elapsedMin ?? 0;

  // Live ETA countdown — ticks via the parent's interval state so cards refresh
  // every 30s without polling the server.
  void tick;
  const etaMs = o.eta ? new Date(o.eta).getTime() - Date.now() : null;
  const etaMin =
    etaMs !== null ? Math.max(0, Math.ceil(etaMs / 60000)) : null;
  const etaOverdue = etaMs !== null && etaMs < 0;

  const aging =
    etaOverdue
      ? "overdue"
      : etaMs !== null && etaMs < 3 * 60 * 1000
      ? "warn"
      : elapsed >= 18
      ? "overdue"
      : elapsed >= 12
      ? "warn"
      : "ok";
  const headerTone =
    aging === "overdue"
      ? "bg-rose-500"
      : aging === "warn"
      ? "bg-amber-500"
      : o.status === "Ready"
      ? "bg-emerald-500"
      : "bg-ink-700";
  const opened = new Date(o.placedAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const ageMin = Math.max(
    0,
    Math.floor((Date.now() - new Date(o.placedAt).getTime()) / 60000)
  );
  const isFresh = ageMin <= 2;
  const isRecent = ageMin <= 5;
  return (
    <div
      className={clsx(
        "card overflow-hidden flex flex-col border",
        isFresh
          ? "border-emerald-300 ring-2 ring-emerald-100"
          : isRecent
          ? "border-sky-200"
          : "border-ink-200/70"
      )}
    >
      <div
        className={clsx(
          "px-4 py-2.5 flex items-center justify-between text-white",
          headerTone
        )}
      >
        <div className="flex items-center gap-2">
          <ChefHat className="w-4 h-4" />
          <span className="font-semibold text-sm">{o.code}</span>
          {o.tableCode && (
            <span className="text-white/80 text-xs">· {o.tableCode}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          {isFresh && (
            <span className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
              Just in
            </span>
          )}
          {!isFresh && isRecent && (
            <span className="rounded bg-white/25 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              New
            </span>
          )}
          <span className="flex items-center gap-1 bg-white/20 px-1.5 py-0.5 rounded">
            <Clock className="w-3 h-3" />
            {elapsed}m
          </span>
          {etaMin !== null && (
            <span
              className={clsx(
                "flex items-center gap-1 px-1.5 py-0.5 rounded font-semibold",
                etaOverdue
                  ? "bg-white/90 text-rose-700"
                  : "bg-white/25"
              )}
            >
              {etaOverdue ? "overdue" : `ETA ${etaMin}m`}
            </span>
          )}
          {o.priority && o.priority !== "Normal" && (
            <span className="bg-white/90 text-rose-700 font-semibold px-1.5 py-0.5 rounded text-[10px]">
              {o.priority}
            </span>
          )}
        </div>
      </div>
      <div className="px-4 py-3 border-b border-ink-100 flex items-center justify-between gap-2 text-[11px]">
        <span className="text-ink-500 min-w-0">
          Opened {opened}
          {o.items?.[0]?.station ? ` · ${o.items[0].station}` : ""}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onViewDetails(o)}
            className="text-xs font-medium text-ink-700 hover:text-ink-900 flex items-center gap-1"
          >
            <FileText className="w-3 h-3" /> Details
          </button>
          <button
            type="button"
            onClick={() => onRecipes(o)}
            className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
          >
            <BookOpen className="w-3 h-3" /> Recipes
          </button>
        </div>
      </div>
      <div className="p-4 flex-1 space-y-2.5">
        {o.items
          ?.filter((it: any) => it.status !== "Pending")
          .map((it: any, i: number) => {
            const rawLineId = String(lineItemKey(it) || "");
            const lineKey = rawLineId || `idx-${i}`;
            return (
            <div key={lineKey} className="flex items-start gap-2">
              <span className="w-6 h-6 text-xs font-bold text-ink-900 bg-ink-100 rounded flex items-center justify-center shrink-0">
                {it.qty}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-ink-900 leading-tight">
                    {it.name}
                  </p>
                  {it.eta && (
                    <span className="text-[10px] font-semibold bg-ink-100 text-ink-700 px-1.5 py-0.5 rounded">
                      ETA{" "}
                      {Math.max(
                        0,
                        Math.ceil((new Date(it.eta).getTime() - Date.now()) / 60000)
                      )}
                      m
                    </span>
                  )}
                  {it.addendum && (
                    <span className="text-[9px] font-extrabold bg-sky-500 text-white px-1.5 py-0.5 rounded tracking-wider animate-pulseDot">
                      NEW
                    </span>
                  )}
                </div>
                {it.mods?.length > 0 && (
                  <p className="text-xs text-brand-600 mt-0.5">
                    {it.mods.join(" · ")}
                  </p>
                )}
                {it.note && (
                  <p className="text-xs text-amber-700 italic mt-0.5">⚡ {it.note}</p>
                )}
                {it.status !== "Ready" && (
                  <div className="mt-1.5 space-y-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setEtaPanelLine((k) => (k === lineKey ? null : lineKey))
                      }
                      className="rounded-md border border-ink-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-ink-700 hover:bg-ink-50"
                    >
                      {it.eta ? "Adjust ETA" : "Set ETA"}
                    </button>
                    {etaPanelLine === lineKey && (
                      <div className="flex flex-wrap gap-1">
                        {(it.eta ? [2, 5, 10] : [5, 10, 15, 20, 30]).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              onAdjustItemEta(o.id, rawLineId, m);
                              setEtaPanelLine(null);
                            }}
                            className="rounded-md border border-ink-200 px-1.5 py-0.5 text-[10px] font-semibold text-ink-600 hover:bg-ink-100"
                          >
                            {it.eta ? `+${m}m` : `${m}m`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            );
          })}
      </div>
      <div className="px-4 py-3 border-t border-ink-100 bg-ink-50/40 flex flex-col gap-2">
        {o.status === "Queued" ? (
          <button
            type="button"
            onClick={() => onAction(o.id, "In Progress")}
            className="btn-primary w-full"
          >
            Accept
          </button>
        ) : o.status === "Ready" ? (
          o.channel === "Delivery" ? (
            <div className="w-full rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-center text-[11px] leading-snug text-sky-950">
              <Package className="w-4 h-4 inline-block align-text-bottom text-sky-600 mr-1" />
              <strong>Delivery</strong> — leave on{" "}
              <strong className="text-sky-900">Ready</strong>. Dispatch assigns a rider;
              the rider marks pickup on the Delivery page.
            </div>
          ) : (
            <button
              onClick={() => onAction(o.id, "Served")}
              className="flex-1 btn bg-emerald-500 text-white hover:bg-emerald-600"
            >
              <CheckCircle2 className="w-4 h-4" /> Bump · Served
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={() => onAction(o.id, "Ready")}
            className="w-full btn bg-emerald-500 text-white hover:bg-emerald-600"
          >
            <CheckCircle2 className="w-4 h-4" /> Mark Ready
          </button>
        )}
      </div>
    </div>
  );
}

export default function KdsPage() {
  const { data, refresh } = useApi<{ orders: any[] }>(
    "/api/orders?active=true&limit=50"
  );
  const [station, setStation] = useState("All");
  const [audio, setAudio] = useState(false);
  const [eightySixOpen, setEightySixOpen] = useState(false);
  const [recipesOpen, setRecipesOpen] = useState<any | null>(null);
  const [detailOrder, setDetailOrder] = useState<any | null>(null);
  const [tick, setTick] = useState(0);
  const toast = useToast();

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    try {
      setAudio(localStorage.getItem(AUDIO_KEY) === "1");
    } catch {}
  }, []);

  const onEvt = useCallback(() => refresh(), [refresh]);
  useSocketEvent("order:new", (o: any) => {
    refresh();
    if (o?.code) toast(`New order ${o.code}`, "info");
    if (audio) beep();
  });
  useSocketEvent("order:update", onEvt);

  async function action(id: string, to: string, etaMinutes?: number) {
    try {
      await api.post(`/api/orders/${id}/transition`, { to, etaMinutes });
      if (to === "In Progress") {
        toast("Accepted — set ETA per line; ticket ETA is the longest line", "success");
      } else {
        toast(`Order marked ${to}`, "success");
      }
      refresh();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  async function extendItemEta(orderId: string, itemId: string, addMinutes: number) {
    try {
      await api.post(`/api/orders/${orderId}/items/${itemId}/eta`, { addMinutes });
      toast("ETA updated", "success");
      refresh();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  const visible = useMemo(() => {
    const list = data?.orders ?? [];
    if (station === "All") return list;
    return list.filter((o: any) =>
      o.items?.some?.((it: any) => it.station === station)
    );
  }, [data, station]);

  return (
    <>
      <PageHeader
        title="Kitchen Display"
        subtitle="Tablet-first · auto-refresh · station-routed"
        right={
          <>
            <button
              className="btn-outline"
              onClick={() => {
                const next = !audio;
                setAudio(next);
                try {
                  localStorage.setItem(AUDIO_KEY, next ? "1" : "0");
                } catch {}
                if (next) beep();
                toast(
                  next ? "Audio alerts on" : "Audio alerts off",
                  "info"
                );
              }}
            >
              {audio ? (
                <>
                  <Volume2 className="w-4 h-4" /> Alerts on
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4" /> Alerts off
                </>
              )}
            </button>
            <button
              className="btn-outline"
              onClick={() => setEightySixOpen(true)}
            >
              <AlertTriangle className="w-4 h-4" /> 86-list
            </button>
            <button
              className="btn-primary"
              onClick={() =>
                setRecipesOpen({ code: "All recipes", items: [] })
              }
            >
              <Flame className="w-4 h-4" /> Recipe cards
            </button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex w-full gap-1 overflow-x-auto rounded-lg border border-ink-200 bg-white p-1 md:w-auto">
          {stationList.map((s) => (
            <button
              key={s}
              onClick={() => setStation(s)}
              className={clsx(
                "whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium",
                station === s
                  ? "bg-ink-900 text-white"
                  : "text-ink-600 hover:bg-ink-100"
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <Legend color="bg-ink-500" label="Queued" />
          <Legend color="bg-sky-500" label="In Progress" />
          <Legend color="bg-emerald-500" label="Ready" />
          <Legend color="bg-amber-500" label="Warn ≥ 12m" />
          <Legend color="bg-rose-500" label="Overdue ≥ 18m" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {visible.map((o: any) => (
          <TicketCard
            key={o.id}
            o={o}
            tick={tick}
            onAction={action}
            onAdjustItemEta={extendItemEta}
            onRecipes={setRecipesOpen}
            onViewDetails={setDetailOrder}
          />
        ))}
        {visible.length === 0 && (
          <div className="col-span-full card p-12 text-center text-ink-500">
            🎉 Kitchen is clear. No active tickets.
          </div>
        )}
      </div>

      <EightySixModal
        open={eightySixOpen}
        onClose={() => setEightySixOpen(false)}
      />
      <RecipesModal
        item={recipesOpen}
        onClose={() => setRecipesOpen(null)}
      />
      <OrderDetailModal
        open={!!detailOrder}
        order={detailOrder}
        onClose={() => setDetailOrder(null)}
      />
    </>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-ink-500">
      <span className={clsx("w-2 h-2 rounded-full", color)} />
      {label}
    </span>
  );
}

function EightySixModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, refresh } = useApi<{ items: any[] }>(open ? "/api/menu/items" : null);
  const toast = useToast();
  const items = data?.items ?? [];

  async function toggle(it: any, flag: "Out" | "OK") {
    try {
      await api.patch(`/api/menu/items/${it.id}`, { stockStatus: flag });
      toast(`${it.name} ${flag === "Out" ? "86'd" : "restored"}`, "success");
      refresh();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="86-list · out-of-stock menu items"
      subtitle="Hidden from customers instantly · manager notified"
      width="max-w-lg"
    >
      <div className="max-h-[50vh] overflow-y-auto">
        {items.map((it: any) => (
          <div
            key={it.id}
            className="flex items-center gap-3 py-2 border-b border-ink-100 last:border-b-0"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{it.name}</p>
              <p className="text-[11px] text-ink-500">
                Rs {it.price} · {it.station}
              </p>
            </div>
            {it.stockStatus === "Out" ? (
              <button
                onClick={() => toggle(it, "OK")}
                className="btn-outline text-xs py-1 px-2"
              >
                Restore
              </button>
            ) : (
              <button
                onClick={() => toggle(it, "Out")}
                className="text-xs font-medium text-rose-600 hover:text-rose-700 px-2"
              >
                86 this item
              </button>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}

function RecipesModal({ item, onClose }: { item: any | null; onClose: () => void }) {
  const { data: menuData } = useApi<{ items: any[] }>(
    item ? "/api/menu/items" : null
  );
  const { data: ingData } = useApi<{ items: any[] }>(
    item ? "/api/inventory" : null
  );

  if (!item) return null;
  const items = menuData?.items ?? [];
  const ings = ingData?.items ?? [];
  const ingMap = new Map(ings.map((i: any) => [i.id, i]));

  const selected =
    item.items?.length > 0
      ? items.filter((m: any) =>
          item.items.some((oi: any) => oi.menuItemId === m.id)
        )
      : items.filter((m: any) => (m.recipe ?? []).length > 0);

  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title="Recipe cards"
      subtitle={
        item.code && item.code !== "All recipes"
          ? `For order ${item.code}`
          : "Standardized BOM for each item"
      }
      width="max-w-2xl"
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {selected.map((m: any) => (
          <div key={m.id} className="border border-ink-100 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-ink-900">{m.name}</p>
                <p className="text-[11px] text-ink-500">
                  {m.station} · plate cost Rs {m.plateCost} · margin {m.margin}%
                </p>
              </div>
            </div>
            {(m.recipe ?? []).length === 0 ? (
              <p className="text-sm text-ink-500 italic">
                No recipe defined yet.
              </p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {m.recipe.map((r: any, i: number) => {
                    const ing: any = ingMap.get(r.ingredientId);
                    return (
                      <tr key={i} className="border-t border-ink-100 first:border-t-0">
                        <td className="py-1.5 text-ink-700">{ing?.name ?? "—"}</td>
                        <td className="py-1.5 tabular-nums text-ink-600">
                          {r.qty} {ing?.unit}
                        </td>
                        <td className="py-1.5 tabular-nums text-xs text-ink-500 text-right">
                          Rs {Math.round((ing?.costPerUnit ?? 0) * r.qty)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        ))}
        {selected.length === 0 && (
          <p className="text-sm text-ink-500 text-center py-10">
            No recipes to show.
          </p>
        )}
      </div>
    </Modal>
  );
}
