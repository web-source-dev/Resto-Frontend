"use client";

import { PageHeader, Card } from "@/components/ui";
import { Plus, Send, Star } from "lucide-react";
import { useApi } from "@/lib/useApi";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Modal, Field, Input, Select, Textarea } from "@/components/Modal";
import { useToast } from "@/components/Toaster";
import { downloadText, toCSV } from "@/lib/export";
import { useAuth } from "@/lib/AuthProvider";
import { canPerform } from "@/lib/roles";
import { Download } from "lucide-react";

function TierBadge({ tier }: { tier: string }) {
  const m: Record<string, string> = {
    Gold: "bg-amber-100 text-amber-800",
    Silver: "bg-ink-200 text-ink-800",
    Bronze: "bg-orange-100 text-orange-800",
  };
  return (
    <span className={`chip ${m[tier] ?? "bg-ink-100 text-ink-700"}`}>
      ⭐ {tier}
    </span>
  );
}

export default function CustomersPage() {
  const { data, refresh } = useApi<{ customers: any[] }>("/api/customers");
  const { data: summaryData } = useApi<any>("/api/customers/summary");
  const { data: reviewsData, refresh: refreshReviews } = useApi<{
    reviews: any[];
  }>("/api/customers/reviews");
  const [adding, setAdding] = useState(false);
  const [campaignOpen, setCampaignOpen] = useState(false);
  const toast = useToast();
  const { user } = useAuth();
  const canCampaign = canPerform(user?.role, "campaigns.send");

  const customers = data?.customers ?? [];
  const summary = summaryData ?? {};
  const reviews = reviewsData?.reviews ?? [];
  const needsRecovery = reviews.filter((r: any) => r.recovery && !r.resolved);

  async function resolveReview(id: string) {
    try {
      await api.post(`/api/customers/reviews/${id}/resolve`);
      toast("Marked resolved", "success");
      refreshReviews();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  return (
    <>
      <PageHeader
        title="Customers"
        subtitle="Unified CRM · loyalty · feedback · automated service recovery"
        right={
          <>
            <button
              className="btn-outline"
              onClick={() => {
                const csv = toCSV(customers, [
                  { key: "name", header: "Name" },
                  { key: "phone", header: "Phone" },
                  { key: "email", header: "Email" },
                  { key: "tier", header: "Tier" },
                  { key: "visits", header: "Visits" },
                  { key: "ltv", header: "LTV" },
                  { key: "points", header: "Points" },
                  { key: "favorite", header: "Favorite" },
                  {
                    key: "lastVisitAt",
                    header: "Last visit",
                    map: (v) =>
                      v ? new Date(v).toISOString().slice(0, 10) : "",
                  },
                ]);
                downloadText(`customers-${Date.now()}.csv`, csv);
                toast(`Exported ${customers.length} customers`, "success");
              }}
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            {canCampaign && (
              <button
                className="btn-outline"
                onClick={() => setCampaignOpen(true)}
              >
                <Send className="w-4 h-4" /> New campaign
              </button>
            )}
            <button className="btn-primary" onClick={() => setAdding(true)}>
              <Plus className="w-4 h-4" /> Add customer
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card p-5">
          <p className="kpi-label">Total customers</p>
          <p className="kpi-value mt-1.5">{summary.total ?? 0}</p>
          <p className="text-[11px] text-ink-500 mt-0.5">In CRM</p>
        </div>
        <div className="card p-5">
          <p className="kpi-label">Avg. rating</p>
          <p className="kpi-value mt-1.5">{summary.avgRating ?? 0} ⭐</p>
          <p className="text-[11px] text-ink-500 mt-0.5">
            {summary.reviews ?? 0} reviews
          </p>
        </div>
        <div className="card p-5">
          <p className="kpi-label">Loyalty points issued</p>
          <p className="kpi-value mt-1.5">
            {(summary.pointsIssued ?? 0).toLocaleString()}
          </p>
          <p className="text-[11px] text-ink-500 mt-0.5">Lifetime</p>
        </div>
        <div className="card p-5">
          <p className="kpi-label">Service recovery</p>
          <p className="kpi-value mt-1.5 text-rose-600">
            {needsRecovery.length}
          </p>
          <p className="text-[11px] text-ink-500 mt-0.5">Reviews ≤ 3★ open</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <Card title="Top customers" subtitle="By lifetime value" pad={false}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-th">Customer</th>
                    <th className="table-th">Tier</th>
                    <th className="table-th">Visits</th>
                    <th className="table-th">LTV</th>
                    <th className="table-th">Points</th>
                    <th className="table-th">Last visit</th>
                    <th className="table-th">Favorite</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c: any) => (
                    <tr key={c.id} className="hover:bg-ink-50/60">
                      <td className="table-td">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 text-white text-xs font-semibold flex items-center justify-center">
                            {c.name
                              .split(" ")
                              .map((n: string) => n[0])
                              .join("")}
                          </div>
                          <div>
                            <p className="font-medium text-ink-900">{c.name}</p>
                            <p className="text-[11px] text-ink-500 font-mono">
                              {c.phone ?? c.email ?? "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="table-td">
                        <TierBadge tier={c.tier} />
                      </td>
                      <td className="table-td text-ink-600 tabular-nums">
                        {c.visits}
                      </td>
                      <td className="table-td font-medium">
                        Rs {(c.ltv ?? 0).toLocaleString()}
                      </td>
                      <td className="table-td tabular-nums">{c.points ?? 0}</td>
                      <td className="table-td text-ink-500 text-xs">
                        {c.lastVisitAt
                          ? new Date(c.lastVisitAt).toLocaleDateString("en-US", {
                              day: "numeric",
                              month: "short",
                            })
                          : "—"}
                      </td>
                      <td className="table-td text-ink-600 text-xs">
                        {c.favorite ?? "—"}
                      </td>
                    </tr>
                  ))}
                  {customers.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="table-td text-center text-ink-500 py-10"
                      >
                        No customers yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <Card
          title="Feedback & reviews"
          subtitle="Below 4★ routed to private recovery"
          right={
            needsRecovery.length > 0 && (
              <span className="chip bg-rose-50 text-rose-700">
                {needsRecovery.length} need recovery
              </span>
            )
          }
        >
          <div className="space-y-4">
            {reviews.length === 0 && (
              <p className="text-sm text-ink-500 text-center py-6">
                No reviews yet.
              </p>
            )}
            {reviews.slice(0, 6).map((r: any) => (
              <div
                key={r.id}
                className={`p-3 rounded-lg border ${
                  r.recovery && !r.resolved
                    ? "border-rose-200 bg-rose-50/40"
                    : "border-ink-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink-900">
                      {r.customerName ?? "Anonymous"}
                    </span>
                    <span className="chip bg-ink-100 text-ink-700">{r.channel}</span>
                  </div>
                  <span className="text-[11px] text-ink-500">
                    {new Date(r.createdAt).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 mt-1.5">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      className={`w-3.5 h-3.5 ${
                        idx < r.rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-ink-200"
                      }`}
                    />
                  ))}
                </div>
                {r.text && (
                  <p className="text-sm text-ink-700 mt-2 leading-snug">
                    {r.text}
                  </p>
                )}
                {r.recovery && !r.resolved && (
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => resolveReview(r.id)}
                      className="btn-primary text-xs py-1 px-2"
                    >
                      Mark resolved
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <AddCustomerModal
        open={adding}
        onClose={() => setAdding(false)}
        onSaved={refresh}
      />

      <CampaignModal
        open={campaignOpen}
        onClose={() => setCampaignOpen(false)}
      />
    </>
  );
}

function CampaignModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<any>({
    channel: "WhatsApp",
    segment: "All",
  });
  const [segments, setSegments] = useState<any>({});
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ channel: "WhatsApp", segment: "All" });
    api.get("/api/campaigns/segments").then(setSegments);
  }, [open]);

  const reach =
    form.segment === "All"
      ? segments.total
      : form.segment === "Gold"
      ? segments.gold
      : form.segment === "Silver"
      ? segments.silver
      : form.segment === "Bronze"
      ? segments.bronze
      : form.segment === "Lapsed"
      ? segments.lapsed
      : form.segment === "New"
      ? segments.new
      : 0;

  async function send(asDraft: boolean) {
    if (!form.name || !form.message) {
      toast("Name and message required", "error");
      return;
    }
    setSending(true);
    try {
      const r = await api.post<{ campaign: any; reach: number }>(
        "/api/campaigns",
        { ...form, send: !asDraft }
      );
      toast(
        asDraft
          ? "Campaign saved as draft"
          : `Sent to ${r.reach} customers`,
        "success"
      );
      onClose();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New marketing campaign"
      subtitle="Bulk WhatsApp / SMS / Email · segmented"
      width="max-w-lg"
      footer={
        <>
          <button
            className="btn-outline"
            onClick={() => send(true)}
            disabled={sending}
          >
            Save draft
          </button>
          <button
            className="btn-primary"
            onClick={() => send(false)}
            disabled={sending}
          >
            {sending ? "Sending…" : `Send now to ${reach ?? 0}`}
          </button>
        </>
      }
    >
      <Field label="Campaign name">
        <Input
          value={form.name ?? ""}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Ramadan Combo Offer"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Channel">
          <Select
            value={form.channel}
            onChange={(e) => setForm({ ...form, channel: e.target.value })}
          >
            {["WhatsApp", "SMS", "Email", "Push"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={`Segment · ${reach ?? 0} customers`}>
          <Select
            value={form.segment}
            onChange={(e) => setForm({ ...form, segment: e.target.value })}
          >
            {["All", "Gold", "Silver", "Bronze", "Lapsed", "New"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field
        label="Message"
        hint="Supports variables: {{name}}, {{tier}}, {{points}}"
      >
        <Textarea
          rows={4}
          value={form.message ?? ""}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="Hey {{name}}, enjoy 20% off all combos this weekend only 🎉"
        />
      </Field>
    </Modal>
  );
}

function AddCustomerModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<any>({ tier: "Bronze" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({ tier: "Bronze" });
  }, [open]);

  async function save() {
    if (!form.name) {
      toast("Name is required", "error");
      return;
    }
    setSaving(true);
    try {
      await api.post("/api/customers", form);
      toast("Customer added", "success");
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
      title="Add customer"
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
      <div className="grid grid-cols-2 gap-3">
        <Field label="Phone">
          <Input
            value={form.phone ?? ""}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={form.email ?? ""}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tier">
          <Select
            value={form.tier}
            onChange={(e) => setForm({ ...form, tier: e.target.value })}
          >
            {["Bronze", "Silver", "Gold"].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Favorite item">
          <Input
            value={form.favorite ?? ""}
            onChange={(e) => setForm({ ...form, favorite: e.target.value })}
          />
        </Field>
      </div>
    </Modal>
  );
}
