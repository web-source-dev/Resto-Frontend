"use client";

import { PageHeader, Card, Progress } from "@/components/ui";
import {
  Plus,
  Ticket,
  Package,
  Clock,
  Percent,
  BadgeCheck,
  Pencil,
  Trash2,
  Calendar,
  Tag,
} from "lucide-react";
import { useApi } from "@/lib/useApi";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Modal, Field, Input, Select, Textarea } from "@/components/Modal";
import { useToast } from "@/components/Toaster";
import clsx from "clsx";

const PROMO_TYPES = [
  { value: "percent", label: "% off" },
  { value: "flat", label: "Flat Rs off" },
  { value: "bogo", label: "BOGO" },
  { value: "free-item", label: "Free item" },
  { value: "first-order", label: "First order %" },
];

const SEGMENTS = ["All", "Gold", "Silver", "Bronze", "New", "Lapsed"];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const RULE_TYPES = [
  { value: "happy-hour", label: "Happy hour (discount)", tone: "emerald" },
  { value: "weekend-surcharge", label: "Weekend surcharge", tone: "amber" },
  { value: "delivery-markup", label: "Delivery markup", tone: "violet" },
];

export default function PromotionsPage() {
  const [tab, setTab] = useState<"coupons" | "combos" | "rules">("coupons");
  const toast = useToast();

  const { data: promos, refresh: refreshPromos } = useApi<{ items: any[] }>(
    "/api/promotions"
  );
  const { data: rules, refresh: refreshRules } = useApi<{ items: any[] }>(
    "/api/promotions/rules"
  );
  const { data: menuData, refresh: refreshMenu } = useApi<{ items: any[] }>(
    "/api/menu/items"
  );

  const combos = (menuData?.items ?? []).filter((i: any) => i.isCombo);
  const nonCombos = (menuData?.items ?? []).filter((i: any) => !i.isCombo);

  const [editPromo, setEditPromo] = useState<any | null>(null);
  const [creatingPromo, setCreatingPromo] = useState(false);
  const [editRule, setEditRule] = useState<any | null>(null);
  const [creatingRule, setCreatingRule] = useState(false);
  const [editCombo, setEditCombo] = useState<any | null>(null);
  const [creatingCombo, setCreatingCombo] = useState(false);

  async function togglePromo(id: string) {
    try {
      await api.post(`/api/promotions/${id}/toggle`);
      refreshPromos();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }
  async function delPromo(p: any) {
    if (!confirm(`Delete coupon "${p.code}"?`)) return;
    try {
      await api.del(`/api/promotions/${p.id}`);
      refreshPromos();
      toast("Coupon deleted", "success");
    } catch (e: any) {
      toast(e.message, "error");
    }
  }
  async function toggleRule(id: string) {
    try {
      await api.post(`/api/promotions/rules/${id}/toggle`);
      refreshRules();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }
  async function delRule(r: any) {
    if (!confirm(`Delete rule "${r.name}"?`)) return;
    try {
      await api.del(`/api/promotions/rules/${r.id}`);
      refreshRules();
      toast("Rule deleted", "success");
    } catch (e: any) {
      toast(e.message, "error");
    }
  }
  async function delCombo(c: any) {
    if (!confirm(`Delete combo "${c.name}"?`)) return;
    try {
      await api.del(`/api/menu/items/${c.id}`);
      refreshMenu();
      toast("Combo deleted", "success");
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  return (
    <>
      <PageHeader
        title="Promotions"
        subtitle="Coupons, combos, happy-hour rules — levers for average order value"
        right={
          tab === "coupons" ? (
            <button className="btn-primary" onClick={() => setCreatingPromo(true)}>
              <Plus className="w-4 h-4" /> New coupon
            </button>
          ) : tab === "combos" ? (
            <button className="btn-primary" onClick={() => setCreatingCombo(true)}>
              <Plus className="w-4 h-4" /> New combo
            </button>
          ) : (
            <button className="btn-primary" onClick={() => setCreatingRule(true)}>
              <Plus className="w-4 h-4" /> New pricing rule
            </button>
          )
        }
      />

      <div className="mb-4 inline-flex w-full flex-wrap items-center gap-1 rounded-lg border border-ink-200 bg-white p-1 sm:w-auto">
        {[
          { k: "coupons", icon: Ticket, label: `Coupons · ${promos?.items?.length ?? 0}` },
          { k: "combos", icon: Package, label: `Combos · ${combos.length}` },
          { k: "rules", icon: Clock, label: `Pricing rules · ${rules?.items?.length ?? 0}` },
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

      {tab === "coupons" && (
        <Card title="Coupons" subtitle="Promo codes customers can redeem at checkout" pad={false}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Code</th>
                  <th className="table-th">Name</th>
                  <th className="table-th">Type</th>
                  <th className="table-th">Value</th>
                  <th className="table-th">Segment</th>
                  <th className="table-th">Validity</th>
                  <th className="table-th">Usage</th>
                  <th className="table-th">Status</th>
                  <th className="table-th"></th>
                </tr>
              </thead>
              <tbody>
                {(promos?.items ?? []).map((p: any) => (
                  <tr key={p.id} className="hover:bg-ink-50/60">
                    <td className="table-td font-mono text-sm font-bold text-ink-900">
                      {p.code}
                    </td>
                    <td className="table-td">{p.name}</td>
                    <td className="table-td">
                      <span className="chip bg-ink-100 text-ink-700">
                        {p.type}
                      </span>
                    </td>
                    <td className="table-td font-medium tabular-nums">
                      {p.type === "percent" || p.type === "first-order"
                        ? `${p.value}%`
                        : p.type === "flat"
                        ? `Rs ${p.value}`
                        : "—"}
                    </td>
                    <td className="table-td text-ink-600">{p.segment}</td>
                    <td className="table-td text-[11px] text-ink-500">
                      {p.validFrom
                        ? new Date(p.validFrom).toLocaleDateString()
                        : "—"}{" "}
                      →{" "}
                      {p.validTo
                        ? new Date(p.validTo).toLocaleDateString()
                        : "∞"}
                    </td>
                    <td className="table-td text-xs tabular-nums">
                      {p.redemptionLimit > 0 ? (
                        <div className="flex items-center gap-2 w-28">
                          <span className="shrink-0">
                            {p.usedCount}/{p.redemptionLimit}
                          </span>
                          <Progress
                            value={(p.usedCount / p.redemptionLimit) * 100}
                            tone={
                              p.usedCount >= p.redemptionLimit ? "rose" : "brand"
                            }
                          />
                        </div>
                      ) : (
                        <span>{p.usedCount} used</span>
                      )}
                    </td>
                    <td className="table-td">
                      <button
                        onClick={() => togglePromo(p.id)}
                        className={clsx(
                          "chip cursor-pointer",
                          p.active
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-ink-100 text-ink-500 hover:bg-ink-200"
                        )}
                      >
                        {p.active ? "Active" : "Paused"}
                      </button>
                    </td>
                    <td className="table-td text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditPromo(p)}
                          className="text-ink-500 hover:text-ink-800"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => delPromo(p)}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(promos?.items?.length ?? 0) === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="table-td text-center text-ink-500 py-10"
                    >
                      No coupons yet. Create one to drive repeat orders.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "combos" && (
        <Card
          title="Combos"
          subtitle="Bundle items at a discounted price to boost AOV"
          pad={false}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-5">
            {combos.map((c: any) => {
              const parts = c.comboItems ?? [];
              const partsTotal = parts.reduce((s: number, p: any) => {
                const ref = nonCombos.find((x: any) => x.id === p.menuItemId);
                return s + (ref?.price ?? 0) * (p.qty ?? 1);
              }, 0);
              const savings = Math.max(0, partsTotal - c.price);
              return (
                <div
                  key={c.id}
                  className="card p-4 border-2 border-brand-200 bg-brand-50/40"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-ink-900">{c.name}</p>
                      <p className="text-[11px] text-ink-500">
                        {parts.length} items bundled
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditCombo(c)}
                        className="text-ink-500 hover:text-ink-800"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => delCombo(c)}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <ul className="text-xs text-ink-600 space-y-0.5 my-3">
                    {parts.map((p: any, i: number) => {
                      const ref = nonCombos.find(
                        (x: any) => x.id === p.menuItemId
                      );
                      return (
                        <li key={i}>
                          {p.qty}× {ref?.name ?? "?"}
                        </li>
                      );
                    })}
                  </ul>
                  <div className="pt-2 border-t border-ink-100 flex items-end justify-between">
                    <div>
                      <p className="text-[11px] text-ink-500">Bundle price</p>
                      <p className="text-lg font-bold text-ink-900">
                        Rs {c.price?.toLocaleString?.()}
                      </p>
                    </div>
                    {savings > 0 && (
                      <div className="text-right">
                        <p className="text-[10px] text-ink-400 line-through">
                          Rs {partsTotal.toLocaleString()}
                        </p>
                        <p className="text-xs font-bold text-emerald-600">
                          Save Rs {savings.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {combos.length === 0 && (
              <div className="col-span-full text-center text-sm text-ink-500 py-10">
                No combos yet. Bundle popular items for discounted prices.
              </div>
            )}
          </div>
        </Card>
      )}

      {tab === "rules" && (
        <Card
          title="Pricing rules"
          subtitle="Happy hour, weekend surcharge, delivery markup — auto-applied"
          pad={false}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-th">Name</th>
                  <th className="table-th">Type</th>
                  <th className="table-th">Adjustment</th>
                  <th className="table-th">Days</th>
                  <th className="table-th">Time</th>
                  <th className="table-th">Channel</th>
                  <th className="table-th">Status</th>
                  <th className="table-th"></th>
                </tr>
              </thead>
              <tbody>
                {(rules?.items ?? []).map((r: any) => (
                  <tr key={r.id} className="hover:bg-ink-50/60">
                    <td className="table-td font-medium">{r.name}</td>
                    <td className="table-td">
                      <span className="chip bg-ink-100 text-ink-700">
                        {r.type}
                      </span>
                    </td>
                    <td className="table-td font-semibold tabular-nums">
                      {r.adjustmentPct > 0 ? "+" : ""}
                      {r.adjustmentPct}%
                    </td>
                    <td className="table-td text-xs text-ink-600">
                      {r.daysOfWeek?.length === 0
                        ? "Every day"
                        : r.daysOfWeek.map((d: number) => DAYS[d]).join(" ")}
                    </td>
                    <td className="table-td text-xs text-ink-600">
                      {r.startTime && r.endTime
                        ? `${r.startTime}–${r.endTime}`
                        : "All day"}
                    </td>
                    <td className="table-td text-xs">{r.channel ?? "Any"}</td>
                    <td className="table-td">
                      <button
                        onClick={() => toggleRule(r.id)}
                        className={clsx(
                          "chip cursor-pointer",
                          r.active
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-ink-100 text-ink-500 hover:bg-ink-200"
                        )}
                      >
                        {r.active ? "Active" : "Paused"}
                      </button>
                    </td>
                    <td className="table-td text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditRule(r)}
                          className="text-ink-500 hover:text-ink-800"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => delRule(r)}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(rules?.items?.length ?? 0) === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="table-td text-center text-ink-500 py-10"
                    >
                      No pricing rules yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <PromoModal
        open={creatingPromo || !!editPromo}
        promo={editPromo}
        menuItems={nonCombos}
        onClose={() => {
          setEditPromo(null);
          setCreatingPromo(false);
        }}
        onSaved={refreshPromos}
      />

      <RuleModal
        open={creatingRule || !!editRule}
        rule={editRule}
        onClose={() => {
          setEditRule(null);
          setCreatingRule(false);
        }}
        onSaved={refreshRules}
      />

      <ComboModal
        open={creatingCombo || !!editCombo}
        combo={editCombo}
        menuItems={nonCombos}
        onClose={() => {
          setEditCombo(null);
          setCreatingCombo(false);
        }}
        onSaved={refreshMenu}
      />
    </>
  );
}

function PromoModal({
  open,
  promo,
  menuItems,
  onClose,
  onSaved,
}: {
  open: boolean;
  promo: any | null;
  menuItems: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      promo
        ? {
            ...promo,
            validFrom: promo.validFrom
              ? new Date(promo.validFrom).toISOString().slice(0, 10)
              : "",
            validTo: promo.validTo
              ? new Date(promo.validTo).toISOString().slice(0, 10)
              : "",
          }
        : {
            type: "percent",
            segment: "All",
            value: 10,
            minBasket: 0,
            redemptionLimit: 0,
            active: true,
          }
    );
  }, [promo, open]);

  async function save() {
    if (!form.code || !form.name) {
      toast("Code and name are required", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        value: Number(form.value ?? 0),
        minBasket: Number(form.minBasket ?? 0),
        redemptionLimit: Number(form.redemptionLimit ?? 0),
        validFrom: form.validFrom ? new Date(form.validFrom) : undefined,
        validTo: form.validTo ? new Date(form.validTo) : undefined,
      };
      if (promo) {
        await api.patch(`/api/promotions/${promo.id}`, payload);
      } else {
        await api.post("/api/promotions", payload);
      }
      toast(promo ? "Coupon updated" : "Coupon created", "success");
      onSaved();
      onClose();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  const needsItem = ["bogo", "free-item"].includes(form.type ?? "");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={promo ? `Edit ${promo.code}` : "New coupon"}
      width="max-w-xl"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Code">
          <Input
            value={form.code ?? ""}
            onChange={(e) =>
              setForm({ ...form, code: e.target.value.toUpperCase() })
            }
            placeholder="WELCOME100"
            className="font-mono"
          />
        </Field>
        <Field label="Display name">
          <Input
            value={form.name ?? ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Welcome · first order"
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Type">
          <Select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            {PROMO_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={
            form.type === "percent" || form.type === "first-order"
              ? "Percent off"
              : form.type === "flat"
              ? "Rupees off"
              : "Value"
          }
        >
          <Input
            type="number"
            value={form.value ?? 0}
            onChange={(e) =>
              setForm({ ...form, value: Number(e.target.value) })
            }
          />
        </Field>
      </div>
      {needsItem && (
        <Field label="Target item">
          <Select
            value={form.targetItemId ?? ""}
            onChange={(e) =>
              setForm({ ...form, targetItemId: e.target.value || undefined })
            }
          >
            <option value="">— pick item —</option>
            {menuItems.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} · Rs {m.price}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Customer segment">
          <Select
            value={form.segment ?? "All"}
            onChange={(e) => setForm({ ...form, segment: e.target.value })}
          >
            {SEGMENTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Min basket (Rs)">
          <Input
            type="number"
            value={form.minBasket ?? 0}
            onChange={(e) =>
              setForm({ ...form, minBasket: Number(e.target.value) })
            }
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Valid from">
          <Input
            type="date"
            value={form.validFrom ?? ""}
            onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
          />
        </Field>
        <Field label="Valid until">
          <Input
            type="date"
            value={form.validTo ?? ""}
            onChange={(e) => setForm({ ...form, validTo: e.target.value })}
          />
        </Field>
        <Field label="Redemption cap">
          <Input
            type="number"
            value={form.redemptionLimit ?? 0}
            onChange={(e) =>
              setForm({
                ...form,
                redemptionLimit: Number(e.target.value),
              })
            }
            placeholder="0 = unlimited"
          />
        </Field>
      </div>
      <Field label="Internal description (optional)">
        <Textarea
          rows={2}
          value={form.description ?? ""}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </Field>
    </Modal>
  );
}

function RuleModal({
  open,
  rule,
  onClose,
  onSaved,
}: {
  open: boolean;
  rule: any | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      rule ?? {
        type: "happy-hour",
        adjustmentPct: -15,
        daysOfWeek: [1, 2, 3, 4, 5],
        startTime: "16:00",
        endTime: "19:00",
        active: true,
      }
    );
  }, [rule, open]);

  function toggleDay(d: number) {
    const cur = form.daysOfWeek ?? [];
    setForm({
      ...form,
      daysOfWeek: cur.includes(d)
        ? cur.filter((x: number) => x !== d)
        : [...cur, d].sort(),
    });
  }

  async function save() {
    if (!form.name || typeof form.adjustmentPct !== "number") {
      toast("Name and adjustment required", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        adjustmentPct: Number(form.adjustmentPct),
      };
      if (rule) {
        await api.patch(`/api/promotions/rules/${rule.id}`, payload);
      } else {
        await api.post("/api/promotions/rules", payload);
      }
      toast(rule ? "Rule updated" : "Rule created", "success");
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
      title={rule ? `Edit · ${rule.name}` : "New pricing rule"}
      width="max-w-lg"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <Field label="Name">
        <Input
          value={form.name ?? ""}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Weekday happy hour"
        />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Type">
          <Select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            {RULE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Adjustment % (negative = discount)">
          <Input
            type="number"
            value={form.adjustmentPct ?? 0}
            onChange={(e) =>
              setForm({ ...form, adjustmentPct: Number(e.target.value) })
            }
          />
        </Field>
      </div>
      <Field label="Days (leave blank = every day)">
        <div className="flex gap-1 flex-wrap">
          {DAYS.map((d, i) => {
            const on = form.daysOfWeek?.includes(i);
            return (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(i)}
                className={clsx(
                  "text-xs font-semibold px-2.5 py-1.5 rounded-md",
                  on
                    ? "bg-ink-900 text-white"
                    : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                )}
              >
                {d}
              </button>
            );
          })}
        </div>
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Start time">
          <Input
            type="time"
            value={form.startTime ?? ""}
            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
          />
        </Field>
        <Field label="End time">
          <Input
            type="time"
            value={form.endTime ?? ""}
            onChange={(e) => setForm({ ...form, endTime: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Channel (optional)">
        <Select
          value={form.channel ?? ""}
          onChange={(e) =>
            setForm({ ...form, channel: e.target.value || undefined })
          }
        >
          <option value="">Any channel</option>
          {["Dine-in", "Takeaway", "Delivery", "Phone"].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Field>
    </Modal>
  );
}

function ComboModal({
  open,
  combo,
  menuItems,
  onClose,
  onSaved,
}: {
  open: boolean;
  combo: any | null;
  menuItems: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      combo
        ? { ...combo, comboItems: combo.comboItems ?? [] }
        : {
            name: "",
            price: 0,
            station: "Grill",
            categoryId: "",
            comboItems: [],
            isCombo: true,
            active: true,
          }
    );
  }, [combo, open]);

  const { data: catsData } = useApi<{ categories: any[] }>(
    open ? "/api/menu/categories" : null
  );

  const partsTotal = (form.comboItems ?? []).reduce((s: number, c: any) => {
    const ref = menuItems.find((m) => m.id === c.menuItemId);
    return s + (ref?.price ?? 0) * (c.qty ?? 1);
  }, 0);
  const savings = Math.max(0, partsTotal - (form.price ?? 0));

  function addPart(itemId: string) {
    const cur = form.comboItems ?? [];
    if (cur.some((c: any) => c.menuItemId === itemId)) return;
    setForm({
      ...form,
      comboItems: [...cur, { menuItemId: itemId, qty: 1 }],
    });
  }
  function setQty(itemId: string, qty: number) {
    setForm({
      ...form,
      comboItems: (form.comboItems ?? []).map((c: any) =>
        c.menuItemId === itemId ? { ...c, qty } : c
      ),
    });
  }
  function removePart(itemId: string) {
    setForm({
      ...form,
      comboItems: (form.comboItems ?? []).filter(
        (c: any) => c.menuItemId !== itemId
      ),
    });
  }

  async function save() {
    if (!form.name || !form.price || (form.comboItems ?? []).length === 0) {
      toast("Name, price, and at least one item required", "error");
      return;
    }
    const cats = catsData?.categories ?? [];
    const defaultCat = form.categoryId || cats[0]?.id;
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        price: Number(form.price),
        plateCost: 0,
        station: form.station || "Grill",
        categoryId: defaultCat,
        isCombo: true,
        comboItems: form.comboItems,
        active: true,
      };
      if (combo) {
        await api.patch(`/api/menu/items/${combo.id}`, payload);
      } else {
        await api.post("/api/menu/items", payload);
      }
      toast(combo ? "Combo updated" : "Combo created", "success");
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
      title={combo ? `Edit · ${combo.name}` : "New combo"}
      width="max-w-2xl"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save combo"}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Combo name">
          <Input
            value={form.name ?? ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Zinger Combo"
          />
        </Field>
        <Field label="Bundle price (Rs)">
          <Input
            type="number"
            value={form.price ?? 0}
            onChange={(e) =>
              setForm({ ...form, price: Number(e.target.value) })
            }
          />
        </Field>
      </div>

      <div className="mt-2 mb-1 text-xs font-semibold text-ink-700">Items in combo</div>
      <div className="border border-ink-200 rounded-lg divide-y divide-ink-100 mb-2">
        {(form.comboItems ?? []).length === 0 && (
          <p className="text-sm text-ink-400 text-center py-6">
            Add items below
          </p>
        )}
        {(form.comboItems ?? []).map((c: any) => {
          const ref = menuItems.find((m) => m.id === c.menuItemId);
          return (
            <div key={c.menuItemId} className="flex items-center gap-2 p-2">
              <span className="flex-1 text-sm font-medium truncate">
                {ref?.name ?? "?"}
              </span>
              <input
                type="number"
                min={1}
                value={c.qty}
                onChange={(e) => setQty(c.menuItemId, Number(e.target.value))}
                className="w-14 h-8 px-2 rounded border border-ink-200 text-sm text-right"
              />
              <span className="text-xs text-ink-500 w-20 text-right">
                Rs {((ref?.price ?? 0) * c.qty).toLocaleString()}
              </span>
              <button
                onClick={() => removePart(c.menuItemId)}
                className="text-rose-500 hover:text-rose-700 p-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      <Select onChange={(e) => e.target.value && addPart(e.target.value)} value="">
        <option value="">Add an item…</option>
        {menuItems
          .filter(
            (m) => !(form.comboItems ?? []).some((c: any) => c.menuItemId === m.id)
          )
          .map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} · Rs {m.price}
            </option>
          ))}
      </Select>

      <div className="mt-4 flex flex-col gap-2 rounded-lg border border-ink-100 bg-ink-50 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-ink-500">Parts total</p>
          <p className="text-sm font-semibold line-through text-ink-400 tabular-nums">
            Rs {partsTotal.toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-500">Customer saves</p>
          <p
            className={clsx(
              "text-lg font-bold tabular-nums",
              savings > 0 ? "text-emerald-600" : "text-ink-400"
            )}
          >
            Rs {savings.toLocaleString()}
          </p>
        </div>
      </div>
    </Modal>
  );
}
