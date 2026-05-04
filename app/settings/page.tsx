"use client";

import { PageHeader, Card, StatusBadge } from "@/components/ui";
import {
  Building2,
  Receipt,
  CreditCard,
  Bell,
  Printer,
  ShieldCheck,
  Languages,
  Webhook,
  ChevronRight,
  Check,
  X as XIcon,
  Plus,
  Trash2,
  Pencil,
  Send,
  FileText,
  KeyRound,
  Clock,
  Cloud,
  Database,
  Plug,
  Copy,
  RefreshCw,
  Download,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/AuthProvider";
import { useApi } from "@/lib/useApi";
import { api, getToken } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { Modal, Field, Input, Select, Textarea } from "@/components/Modal";
import { useToast } from "@/components/Toaster";
import clsx from "clsx";

type Panel =
  | "outlet"
  | "tax"
  | "localization"
  | "payments"
  | "printers"
  | "integrations"
  | "templates"
  | "roles"
  | "audit"
  | "hours"
  | "receipt"
  | "security"
  | "webhooks"
  | "apiKeys"
  | "backup"
  | null;

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [panel, setPanel] = useState<Panel>(null);
  const { data, refresh } = useApi<{ outlet: any }>("/api/outlets/current");
  const outlet = data?.outlet;

  const canWrite = user?.role === "admin" || user?.role === "manager";

  const groups: {
    title: string;
    items: {
      key: Panel;
      icon: any;
      name: string;
      desc: (o: any) => string;
      phase3?: boolean;
    }[];
  }[] = [
    {
      title: "Business",
      items: [
        {
          key: "outlet",
          icon: Building2,
          name: "Outlet & branding",
          desc: (o) =>
            o ? `${o.name}${o.address ? " · " + o.address : ""}` : "Loading…",
        },
        {
          key: "tax",
          icon: Receipt,
          name: "Taxes & service charge",
          desc: (o) =>
            o
              ? `Tax ${Math.round((o.taxRate ?? 0) * 100)}% · Service ${Math.round((o.serviceRate ?? 0) * 100)}% · Tipping ${o.acceptsTips ? "on" : "off"}`
              : "—",
        },
        {
          key: "localization",
          icon: Languages,
          name: "Localization",
          desc: (o) =>
            o ? `${o.language?.toUpperCase() ?? "EN"} · ${o.currency ?? "PKR"} · ${o.timezone ?? "Asia/Karachi"}` : "—",
        },
        {
          key: "hours",
          icon: Clock,
          name: "Business hours",
          desc: (o) => {
            const h = (o?.businessHours ?? []) as any[];
            const open = h.filter((d) => !d.closed).length;
            return h.length
              ? `${open} of 7 days open · edit weekly schedule`
              : "Not configured · click to set hours";
          },
        },
        {
          key: "receipt",
          icon: FileText,
          name: "Receipt customization",
          desc: (o) =>
            o
              ? `Footer: "${(o.receiptFooter ?? "").slice(0, 40) || "—"}"${
                  o.receiptShowLogo ? " · logo on" : ""
                }`
              : "—",
        },
      ],
    },
    {
      title: "Payments & hardware",
      items: [
        {
          key: "payments",
          icon: CreditCard,
          name: "Payment methods",
          desc: (o) =>
            o ? (o.paymentMethods ?? []).join(" · ") || "Cash only" : "—",
        },
        {
          key: "printers",
          icon: Printer,
          name: "Printers & stations",
          desc: () => "ESC/POS thermal printers · test print from here",
        },
        {
          key: "integrations",
          icon: Plug,
          name: "Integrations & providers",
          desc: (o) => {
            if (!o) return "—";
            const on = [];
            if (o.smsEnabled ?? true) on.push("SMS");
            if (o.whatsappEnabled) on.push("WhatsApp");
            if (o.emailEnabled) on.push("Email");
            if (o.stripeEnabled) on.push("Stripe");
            if (o.googleReviewsEnabled) on.push("Reviews");
            return on.length ? on.join(" · ") : "None enabled";
          },
        },
      ],
    },
    {
      title: "Messaging",
      items: [
        {
          key: "templates",
          icon: Bell,
          name: "Notification templates",
          desc: () => "SMS · WhatsApp · Email · Push · variables",
        }
      ],
    },
    {
      title: "Security & compliance",
      items: [
        {
          key: "roles",
          icon: ShieldCheck,
          name: "Roles & permissions",
          desc: () => "6 roles · scoped access matrix",
        },
        {
          key: "security",
          icon: ShieldCheck,
          name: "Security policy",
          desc: (o) =>
            o
              ? `Session ${o.sessionTimeoutMinutes ?? 720}m · min pw ${o.passwordMinLength ?? 8}${
                  o.requireMfa ? " · MFA required" : ""
                }`
              : "—",
        }
      ],
    },
  ];

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Outlet configuration · messaging · security"
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <div className="xl:col-span-2 space-y-4">
          {groups.map((g) => (
            <Card key={g.title} title={g.title} pad={false}>
              <div className="divide-y divide-ink-100">
                {g.items.map((it) => {
                  const Icon = it.icon;
                  return (
                    <button
                      key={it.name}
                      onClick={() => setPanel(it.key)}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-ink-50/60 text-left transition-colors"
                    >
                      <div className="w-10 h-10 rounded-lg bg-ink-100 text-ink-700 flex items-center justify-center shrink-0">
                        <Icon className="w-[18px] h-[18px]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-ink-900">
                            {it.name}
                          </p>
                          {it.phase3 && (
                            <span className="chip bg-ink-100 text-ink-500 text-[10px]">
                              Phase 3
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-ink-500 mt-0.5 truncate">
                          {it.desc(outlet)}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-ink-400" />
                    </button>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <Card title="Your account" subtitle="Signed in as">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white flex items-center justify-center font-semibold">
                {user?.name?.split(" ").map((n) => n[0]).join("")}
              </div>
              <div>
                <p className="font-semibold text-ink-900">{user?.name}</p>
                <p className="text-xs text-ink-500">{user?.email}</p>
                <p className="text-[11px] text-ink-400 capitalize mt-0.5">
                  {user?.role} role
                </p>
              </div>
            </div>
            <button onClick={logout} className="btn-outline w-full">
              Sign out
            </button>
          </Card>
        </div>
      </div>

      <OutletEditor
        open={panel === "outlet"}
        outlet={outlet}
        canWrite={canWrite}
        onClose={() => setPanel(null)}
        onSaved={refresh}
      />
      <TaxEditor
        open={panel === "tax"}
        outlet={outlet}
        canWrite={canWrite}
        onClose={() => setPanel(null)}
        onSaved={refresh}
      />
      <LocalizationEditor
        open={panel === "localization"}
        outlet={outlet}
        canWrite={canWrite}
        onClose={() => setPanel(null)}
        onSaved={refresh}
      />
      <PaymentMethodsEditor
        open={panel === "payments"}
        outlet={outlet}
        canWrite={canWrite}
        onClose={() => setPanel(null)}
        onSaved={refresh}
      />
      <PrintersPanel
        open={panel === "printers"}
        canWrite={canWrite}
        onClose={() => setPanel(null)}
      />
      <IntegrationsEditor
        open={panel === "integrations"}
        outlet={outlet}
        canWrite={canWrite}
        onClose={() => setPanel(null)}
        onSaved={refresh}
      />
      <TemplatesPanel
        open={panel === "templates"}
        canWrite={canWrite}
        onClose={() => setPanel(null)}
      />
      <RolesMatrix
        open={panel === "roles"}
        onClose={() => setPanel(null)}
      />
      <AuditPanel
        open={panel === "audit"}
        onClose={() => setPanel(null)}
      />
      <BusinessHoursEditor
        open={panel === "hours"}
        outlet={outlet}
        canWrite={canWrite}
        onClose={() => setPanel(null)}
        onSaved={refresh}
      />
      <ReceiptEditor
        open={panel === "receipt"}
        outlet={outlet}
        canWrite={canWrite}
        onClose={() => setPanel(null)}
        onSaved={refresh}
      />
      <SecurityPanel
        open={panel === "security"}
        outlet={outlet}
        canWrite={canWrite}
        onClose={() => setPanel(null)}
        onSaved={refresh}
      />
      <WebhooksPanel
        open={panel === "webhooks"}
        canWrite={canWrite}
        onClose={() => setPanel(null)}
      />
      <ApiKeysPanel
        open={panel === "apiKeys"}
        canWrite={canWrite}
        onClose={() => setPanel(null)}
      />
      <BackupPanel
        open={panel === "backup"}
        outlet={outlet}
        canWrite={user?.role === "admin"}
        onClose={() => setPanel(null)}
        onSaved={refresh}
      />
    </>
  );
}

function Phase({
  label,
  progress,
  done,
}: {
  label: string;
  progress: number;
  done?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="font-medium text-ink-900">{label}</span>
        <span
          className={`text-xs font-semibold ${
            done ? "text-emerald-600" : "text-ink-500"
          }`}
        >
          {done ? "Shipped" : `${progress}%`}
        </span>
      </div>
      <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${
            done ? "bg-emerald-500" : "bg-brand-500"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ─── Editors ────────────────────────────────────────────────────────────

function useOutletSaver(outlet: any, onSaved: () => void) {
  const toast = useToast();
  return async (patch: any) => {
    if (!outlet?.id && !outlet?._id)
      throw new Error("No outlet loaded");
    const id = outlet.id ?? outlet._id;
    try {
      await api.patch(`/api/outlets/${id}`, patch);
      toast("Saved", "success");
      onSaved();
    } catch (e: any) {
      toast(e.message, "error");
      throw e;
    }
  };
}

function OutletEditor({
  open,
  outlet,
  canWrite,
  onClose,
  onSaved,
}: {
  open: boolean;
  outlet: any;
  canWrite: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const save = useOutletSaver(outlet, onSaved);

  useEffect(() => {
    if (open && outlet) setForm({ ...outlet });
  }, [outlet, open]);

  async function doSave() {
    setSaving(true);
    try {
      await save({
        name: form.name,
        address: form.address,
        phone: form.phone,
        email: form.email,
        taxId: form.taxId,
        logoUrl: form.logoUrl,
      });
      onClose();
    } catch {} finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Outlet & branding"
      subtitle="Business info that appears on receipts, QR pages and notifications"
      width="max-w-xl"
      footer={
        canWrite ? (
          <>
            <button className="btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" onClick={doSave} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </>
        ) : (
          <button className="btn-outline" onClick={onClose}>Close</button>
        )
      }
    >
      <Field label="Outlet name">
        <Input
          value={form.name ?? ""}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          disabled={!canWrite}
        />
      </Field>
      <Field label="Address">
        <Textarea
          rows={2}
          value={form.address ?? ""}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          disabled={!canWrite}
        />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Phone">
          <Input
            value={form.phone ?? ""}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            disabled={!canWrite}
          />
        </Field>
        <Field label="Business email">
          <Input
            type="email"
            value={form.email ?? ""}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            disabled={!canWrite}
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Tax ID / NTN">
          <Input
            value={form.taxId ?? ""}
            onChange={(e) => setForm({ ...form, taxId: e.target.value })}
            disabled={!canWrite}
          />
        </Field>
        <Field label="Logo URL (optional)">
          <Input
            value={form.logoUrl ?? ""}
            onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
            placeholder="https://…"
            disabled={!canWrite}
          />
        </Field>
      </div>
    </Modal>
  );
}

function TaxEditor({
  open,
  outlet,
  canWrite,
  onClose,
  onSaved,
}: {
  open: boolean;
  outlet: any;
  canWrite: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const save = useOutletSaver(outlet, onSaved);
  useEffect(() => {
    if (open && outlet)
      setForm({
        taxRate: Math.round((outlet.taxRate ?? 0) * 1000) / 10,
        serviceRate: Math.round((outlet.serviceRate ?? 0) * 1000) / 10,
        acceptsTips: outlet.acceptsTips ?? true,
      });
  }, [outlet, open]);
  async function doSave() {
    setSaving(true);
    try {
      await save({
        taxRate: Number(form.taxRate) / 100,
        serviceRate: Number(form.serviceRate) / 100,
        acceptsTips: !!form.acceptsTips,
      });
      onClose();
    } catch {} finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Taxes & service charge"
      subtitle="Applied to every order after discounts"
      width="max-w-md"
      footer={
        canWrite ? (
          <>
            <button className="btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" onClick={doSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </>
        ) : (
          <button className="btn-outline" onClick={onClose}>Close</button>
        )
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Tax rate (%)">
          <Input
            type="number"
            step="0.01"
            value={form.taxRate ?? 0}
            onChange={(e) =>
              setForm({ ...form, taxRate: Number(e.target.value) })
            }
            disabled={!canWrite}
          />
        </Field>
        <Field label="Service charge (%)">
          <Input
            type="number"
            step="0.01"
            value={form.serviceRate ?? 0}
            onChange={(e) =>
              setForm({ ...form, serviceRate: Number(e.target.value) })
            }
            disabled={!canWrite}
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 mt-2">
        <input
          type="checkbox"
          checked={!!form.acceptsTips}
          onChange={(e) => setForm({ ...form, acceptsTips: e.target.checked })}
          disabled={!canWrite}
        />
        <span className="text-sm text-ink-700">
          Enable tipping UI on customer bill
        </span>
      </label>
      <div className="mt-4 p-3 rounded-lg bg-ink-50 border border-ink-100 text-xs text-ink-600">
        Sample on Rs 1,000 order: subtotal Rs 1,000 + tax Rs{" "}
        {Math.round(1000 * (Number(form.taxRate) / 100))} + service Rs{" "}
        {Math.round(1000 * (Number(form.serviceRate) / 100))} = Rs{" "}
        {1000 +
          Math.round(1000 * (Number(form.taxRate) / 100)) +
          Math.round(1000 * (Number(form.serviceRate) / 100))}
      </div>
    </Modal>
  );
}

function LocalizationEditor({
  open,
  outlet,
  canWrite,
  onClose,
  onSaved,
}: {
  open: boolean;
  outlet: any;
  canWrite: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const save = useOutletSaver(outlet, onSaved);
  useEffect(() => {
    if (open && outlet)
      setForm({
        timezone: outlet.timezone ?? "Asia/Karachi",
        currency: outlet.currency ?? "PKR",
        language: outlet.language ?? "en",
      });
  }, [outlet, open]);
  async function doSave() {
    setSaving(true);
    try {
      await save({
        timezone: form.timezone,
        currency: form.currency,
        language: form.language,
      });
      onClose();
    } catch {} finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Localization"
      subtitle="Timezone, currency, language"
      width="max-w-md"
      footer={
        canWrite ? (
          <>
            <button className="btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" onClick={doSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </>
        ) : (
          <button className="btn-outline" onClick={onClose}>Close</button>
        )
      }
    >
      <Field label="Timezone">
        <Select
          value={form.timezone ?? "Asia/Karachi"}
          onChange={(e) => setForm({ ...form, timezone: e.target.value })}
          disabled={!canWrite}
        >
          {[
            "Asia/Karachi",
            "Asia/Dubai",
            "Asia/Kolkata",
            "Asia/Riyadh",
            "Asia/Singapore",
            "Europe/London",
            "America/New_York",
          ].map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Currency">
          <Select
            value={form.currency ?? "PKR"}
            onChange={(e) => setForm({ ...form, currency: e.target.value })}
            disabled={!canWrite}
          >
            {["PKR", "USD", "AED", "INR", "GBP", "EUR", "SAR"].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Language">
          <Select
            value={form.language ?? "en"}
            onChange={(e) => setForm({ ...form, language: e.target.value })}
            disabled={!canWrite}
          >
            {[
              { v: "en", l: "English" },
              { v: "ur", l: "اردو · Urdu (RTL)" },
              { v: "ar", l: "العربية · Arabic (RTL)" },
            ].map((o) => (
              <option key={o.v} value={o.v}>{o.l}</option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

const ALL_PAYMENT_METHODS = [
  { v: "Cash", hint: "Always available" },
  { v: "Card", hint: "Terminal or hosted checkout" },
  { v: "JazzCash", hint: "Mobile wallet" },
  { v: "Easypaisa", hint: "Mobile wallet" },
  { v: "Stripe", hint: "International cards" },
  { v: "BankTransfer", hint: "IBAN / direct transfer" },
];

function PaymentMethodsEditor({
  open,
  outlet,
  canWrite,
  onClose,
  onSaved,
}: {
  open: boolean;
  outlet: any;
  canWrite: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [methods, setMethods] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const save = useOutletSaver(outlet, onSaved);
  useEffect(() => {
    if (open && outlet) setMethods(outlet.paymentMethods ?? []);
  }, [outlet, open]);
  function toggle(m: string) {
    setMethods((cur) =>
      cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]
    );
  }
  async function doSave() {
    setSaving(true);
    try {
      await save({ paymentMethods: methods });
      onClose();
    } catch {} finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Payment methods"
      subtitle="Toggle which methods are accepted at this outlet"
      width="max-w-md"
      footer={
        canWrite ? (
          <>
            <button className="btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" onClick={doSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </>
        ) : (
          <button className="btn-outline" onClick={onClose}>Close</button>
        )
      }
    >
      <div className="space-y-2">
        {ALL_PAYMENT_METHODS.map((pm) => {
          const on = methods.includes(pm.v);
          return (
            <button
              key={pm.v}
              onClick={() => canWrite && toggle(pm.v)}
              disabled={!canWrite}
              className={clsx(
                "w-full flex items-center gap-3 p-3 rounded-lg border transition-colors",
                on
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-white border-ink-200"
              )}
            >
              <div
                className={clsx(
                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                  on ? "bg-emerald-500 text-white" : "bg-ink-100 text-ink-500"
                )}
              >
                {on ? <Check className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-sm">{pm.v}</p>
                <p className="text-[11px] text-ink-500">{pm.hint}</p>
              </div>
              <span
                className={clsx(
                  "text-[10px] font-bold uppercase tracking-wider",
                  on ? "text-emerald-700" : "text-ink-400"
                )}
              >
                {on ? "Enabled" : "Off"}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-ink-400 mt-3">
        Gateway credentials wire in Phase 3. Today these just enable the method
        in checkout UI.
      </p>
    </Modal>
  );
}

function IntegrationsEditor({
  open,
  outlet,
  canWrite,
  onClose,
  onSaved,
}: {
  open: boolean;
  outlet: any;
  canWrite: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [providers, setProviders] = useState<any>(null);
  const [testOpen, setTestOpen] = useState<string | null>(null);
  const [testTo, setTestTo] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const save = useOutletSaver(outlet, onSaved);

  useEffect(() => {
    if (open && outlet)
      setForm({
        smsEnabled: outlet.smsEnabled ?? true,
        whatsappEnabled: !!outlet.whatsappEnabled,
        emailEnabled: !!outlet.emailEnabled,
        stripeEnabled: !!outlet.stripeEnabled,
        googleReviewsEnabled: !!outlet.googleReviewsEnabled,
      });
  }, [outlet, open]);

  async function refreshProviders() {
    try {
      const r = await api.get<{ providers: any }>("/api/settings/providers");
      setProviders(r.providers);
    } catch (e: any) {
      toast(e.message, "error");
    }
  }
  useEffect(() => {
    if (open) refreshProviders();
  }, [open]);

  async function doSave() {
    setSaving(true);
    try {
      await save(form);
      onClose();
    } catch {} finally {
      setSaving(false);
    }
  }

  async function doTest(id: string) {
    setBusyId(id);
    try {
      const body: any = {};
      if (["sms", "whatsapp", "email"].includes(id)) {
        if (!testTo.trim()) {
          toast("Enter a recipient first", "info");
          setBusyId(null);
          return;
        }
        body.to = testTo.trim();
        if (id === "email") body.subject = "FlavorFlow test";
      }
      const r = await api.post<any>(`/api/settings/providers/${id}/test`, body);
      if (r.ok === false) toast(r.error ?? "Failed", "error");
      else
        toast(
          r.provider === "mock"
            ? "Sent (mock — configure env to go live)"
            : `Sent via ${r.provider ?? "provider"}`,
          "success"
        );
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusyId(null);
    }
  }

  const toggle = (k: string) => setForm({ ...form, [k]: !form[k] });
  const integrations = [
    { k: "smsEnabled", providerId: "sms", label: "SMS (Twilio)", hint: "Order-ready alerts · OTP · review asks" },
    { k: "whatsappEnabled", providerId: "whatsapp", label: "WhatsApp (Twilio)", hint: "Rich order confirmations · review asks" },
    { k: "emailEnabled", providerId: "email", label: "Email (SMTP)", hint: "Digital receipts · scheduled digests" },
    { k: "stripeEnabled", providerId: "stripe", label: "Stripe Payments", hint: "Card payments · online checkout · refunds" },
    { k: "googleReviewsEnabled", providerId: "google-reviews", label: "Google Reviews", hint: "Deep-link customers to your GMB page" },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Integrations & providers"
      subtitle="Enable features · credentials live in backend .env · click Test to verify"
      width="max-w-2xl"
      footer={
        canWrite ? (
          <>
            <button className="btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={doSave} disabled={saving}>
              {saving ? "Saving…" : "Save feature toggles"}
            </button>
          </>
        ) : (
          <button className="btn-outline" onClick={onClose}>Close</button>
        )
      }
    >
      <div className="space-y-2">
        {integrations.map((it) => {
          const status = providers?.[it.providerId];
          const live = status?.configured;
          return (
            <div
              key={it.k}
              className="p-3 rounded-lg border border-ink-200 hover:bg-ink-50/60"
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={!!form[it.k]}
                  onChange={() => canWrite && toggle(it.k)}
                  disabled={!canWrite}
                  className="mt-1 w-4 h-4"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{it.label}</p>
                    {live ? (
                      <span className="chip bg-emerald-100 text-emerald-700 text-[10px]">
                        live
                      </span>
                    ) : (
                      <span className="chip bg-amber-100 text-amber-700 text-[10px]">
                        mock · env not set
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-ink-500 mt-0.5">{it.hint}</p>
                  {status?.requiredEnv && (
                    <p className="text-[10px] text-ink-400 font-mono mt-1 break-all">
                      {status.requiredEnv.join(" · ")}
                    </p>
                  )}
                </div>
                {it.providerId !== "google-reviews" && (
                  <button
                    className="btn-outline text-xs"
                    onClick={() =>
                      setTestOpen(testOpen === it.providerId ? null : it.providerId)
                    }
                  >
                    Test
                  </button>
                )}
              </div>
              {testOpen === it.providerId && (
                <div className="mt-3 flex items-center gap-2">
                  {["sms", "whatsapp"].includes(it.providerId) && (
                    <input
                      className="input text-xs flex-1"
                      placeholder="+92 300 1234567"
                      value={testTo}
                      onChange={(e) => setTestTo(e.target.value)}
                    />
                  )}
                  {it.providerId === "email" && (
                    <input
                      className="input text-xs flex-1"
                      placeholder="you@domain.com"
                      value={testTo}
                      onChange={(e) => setTestTo(e.target.value)}
                    />
                  )}
                  {it.providerId === "maps" && (
                    <input
                      className="input text-xs flex-1"
                      placeholder="Address to geocode"
                      value={testTo}
                      onChange={(e) => setTestTo(e.target.value)}
                    />
                  )}
                  <button
                    className="btn-primary text-xs"
                    disabled={busyId === it.providerId}
                    onClick={() => doTest(it.providerId)}
                  >
                    {busyId === it.providerId ? "Sending…" : "Send test"}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Extra provider cards that aren't mapped to a feature toggle */}
        {providers?.maps && (
          <div className="p-3 rounded-lg border border-ink-200">
            <div className="flex items-start gap-3">
              <div className="mt-1 w-4 h-4" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">Google Maps</p>
                  {providers.maps.configured ? (
                    <span className="chip bg-emerald-100 text-emerald-700 text-[10px]">live</span>
                  ) : (
                    <span className="chip bg-amber-100 text-amber-700 text-[10px]">mock · env not set</span>
                  )}
                </div>
                <p className="text-[11px] text-ink-500">
                  Address autocomplete · delivery distance matrix
                </p>
                <p className="text-[10px] text-ink-400 font-mono mt-1">
                  {providers.maps.requiredEnv.join(" · ")}
                </p>
              </div>
              <button
                className="btn-outline text-xs"
                onClick={() => setTestOpen(testOpen === "maps" ? null : "maps")}
              >
                Test
              </button>
            </div>
            {testOpen === "maps" && (
              <div className="mt-3 flex items-center gap-2">
                <input
                  className="input text-xs flex-1"
                  placeholder="Address to geocode"
                  value={testTo}
                  onChange={(e) => setTestTo(e.target.value)}
                />
                <button
                  className="btn-primary text-xs"
                  disabled={busyId === "maps"}
                  onClick={async () => {
                    setBusyId("maps");
                    try {
                      const r = await api.post<any>("/api/settings/providers/maps/test", {
                        address: testTo.trim() || "Karachi, Pakistan",
                      });
                      if (r.ok === false) toast(r.error ?? "Failed", "error");
                      else
                        toast(
                          `${r.provider}: ${r.formatted ?? ""} (${r.lat?.toFixed(3)}, ${r.lng?.toFixed(3)})`,
                          "success"
                        );
                    } catch (e: any) {
                      toast(e.message, "error");
                    } finally {
                      setBusyId(null);
                    }
                  }}
                >
                  {busyId === "maps" ? "Checking…" : "Geocode"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <p className="text-[11px] text-ink-400 mt-4 leading-snug">
        Fill in the matching keys in <span className="font-mono">backend/.env</span>, restart the
        API and these badges flip to <span className="font-semibold text-emerald-700">live</span>. Until
        then, calls succeed in mock mode so dev flows don't break.
      </p>
    </Modal>
  );
}

function PrintersPanel({
  open,
  onClose,
  canWrite,
}: {
  open: boolean;
  onClose: () => void;
  canWrite: boolean;
}) {
  const toast = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      const r = await api.get<{ items: any[]; types: string[] }>(
        "/api/settings/printers"
      );
      setItems(r.items);
      setTypes(r.types);
    } catch (e: any) {
      toast(e.message, "error");
    }
  }
  useEffect(() => {
    if (open) load();
  }, [open]);

  async function testPrint(id: string) {
    setBusyId(id);
    try {
      const r = await api.post<any>(`/api/settings/printers/${id}/test`, {});
      if (r.ok) toast("Test ticket sent", "success");
      else toast(r.error ?? "Print failed", "error");
      load();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusyId(null);
    }
  }

  async function removeOne(id: string) {
    if (!confirm("Remove this printer?")) return;
    try {
      await api.del(`/api/settings/printers/${id}`); 
      toast("Removed", "success");
      load();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  return (
    <>
      <Modal
        open={open && !editing}
        onClose={onClose}
        title="Printers & stations"
        subtitle="ESC/POS network printers — test connection from here"
        width="max-w-xl"
        footer={
          <>
            <button className="btn-outline" onClick={onClose}>Close</button>
            {canWrite && (
              <button
                className="btn-primary"
                onClick={() =>
                  setEditing({
                    name: "",
                    type: "receipt",
                    host: "",
                    port: 9100,
                    station: "",
                    active: true,
                  })
                }
              >
                <Plus className="w-4 h-4 mr-1" /> Add printer
              </button>
            )}
          </>
        }
      >
        {items.length === 0 ? (
          <div className="text-sm text-ink-500 text-center py-6">
            No printers configured yet. Click Add printer to register one by IP.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((p) => (
              <div
                key={p._id}
                className="flex items-center gap-3 p-3 rounded-lg border border-ink-200"
              >
                <Printer className="w-5 h-5 text-ink-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold truncate">{p.name}</p>
                    <span className="chip bg-ink-100 text-ink-600 text-[10px] capitalize">
                      {p.type}
                    </span>
                    {p.station && (
                      <span className="chip bg-brand-50 text-brand-700 text-[10px]">
                        {p.station}
                      </span>
                    )}
                    {p.lastTestOk === true && (
                      <span className="chip bg-emerald-100 text-emerald-700 text-[10px]">
                        last test ok
                      </span>
                    )}
                    {p.lastTestOk === false && (
                      <span className="chip bg-rose-100 text-rose-700 text-[10px]">
                        failed · {String(p.lastTestError ?? "").slice(0, 30)}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-ink-500 font-mono mt-0.5">
                    {p.host}:{p.port ?? 9100}
                  </p>
                </div>
                {canWrite && (
                  <>
                    <button
                      className="btn-outline text-xs"
                      onClick={() => testPrint(p._id)}
                      disabled={busyId === p._id}
                    >
                      {busyId === p._id ? "…" : "Test"}
                    </button>
                    <button className="btn-outline text-xs" onClick={() => setEditing(p)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="btn-outline text-xs text-rose-600"
                      onClick={() => removeOne(p._id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-ink-400 mt-4 leading-snug">
          Printers are on your LAN — API server must be able to reach the IP on the
          given port (default 9100). Raw ESC/POS is sent over TCP; no driver needed.
        </p>
      </Modal>

      <PrinterEditor
        open={!!editing}
        types={types}
        initial={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    </>
  );
}

function PrinterEditor({
  open,
  initial,
  types,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: any;
  types: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open && initial) setForm({ ...initial });
  }, [open, initial]);

  async function save() {
    if (!form.name || !form.host) {
      toast("Name and host are required", "error");
      return;
    }
    setSaving(true);
    try {
      if (form._id) {
        await api.patch(`/api/settings/printers/${form._id}`, form);
      } else {
        await api.post("/api/settings/printers", form);
      }
      toast("Saved", "success");
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
      title={form._id ? "Edit printer" : "Add printer"}
      width="max-w-md"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>Cancel</button>
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
          placeholder="Kitchen · Grill"
        />
      </Field>
      <Field label="Type">
        <Select
          value={form.type ?? "receipt"}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
        >
          {types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Host / IP">
          <Input
            className="col-span-2"
            value={form.host ?? ""}
            onChange={(e) => setForm({ ...form, host: e.target.value })}
            placeholder="192.168.1.51"
          />
        </Field>
        <Field label="Port">
          <Input
            type="number"
            value={form.port ?? 9100}
            onChange={(e) => setForm({ ...form, port: Number(e.target.value) })}
          />
        </Field>
      </div>
      <Field label="Station (optional)">
        <Input
          value={form.station ?? ""}
          onChange={(e) => setForm({ ...form, station: e.target.value })}
          placeholder="Grill"
        />
      </Field>
      <label className="flex items-center gap-2 text-sm mt-2">
        <input
          type="checkbox"
          checked={!!form.active}
          onChange={(e) => setForm({ ...form, active: e.target.checked })}
          className="w-4 h-4"
        />
        Active — route tickets here
      </label>
    </Modal>
  );
}

// ─── Notification templates ────────────────────────────────────────────

function TemplatesPanel({
  open,
  canWrite,
  onClose,
}: {
  open: boolean;
  canWrite: boolean;
  onClose: () => void;
}) {
  const { data, refresh } = useApi<{
    items: any[];
    channels: string[];
    events: string[];
  }>(open ? "/api/settings/templates" : null);
  const toast = useToast();
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);

  async function del(t: any) {
    if (!confirm(`Delete "${t.name}"?`)) return;
    try {
      await api.del(`/api/settings/templates/${t.id}`);
      toast("Deleted", "success");
      refresh();
    } catch (e: any) {
      toast(e.message, "error");
    }
  }
  async function test(t: any) {
    try {
      const r = await api.post<{ rendered: string; channel: string }>(
        `/api/settings/templates/${t.id}/test`
      );
      toast(`Test ${r.channel} · check Notifications`, "success");
    } catch (e: any) {
      toast(e.message, "error");
    }
  }

  return (
    <>
      <Modal
        open={open && !editing && !creating}
        onClose={onClose}
        title="Notification templates"
        subtitle="SMS / WhatsApp / Email / Push with {{variable}} merging"
        width="max-w-2xl"
        footer={
          <>
            <button className="btn-outline" onClick={onClose}>
              Close
            </button>
            {canWrite && (
              <button
                className="btn-primary"
                onClick={() => setCreating(true)}
              >
                <Plus className="w-4 h-4" /> New template
              </button>
            )}
          </>
        }
      >
        <div className="space-y-2">
          {(data?.items ?? []).length === 0 && (
            <p className="text-sm text-ink-500 text-center py-8">
              No templates yet. Create one to pre-compose messages.
            </p>
          )}
          {(data?.items ?? []).map((t: any) => (
            <div
              key={t.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-ink-200"
            >
              <div className="w-9 h-9 rounded-lg bg-ink-100 text-ink-700 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm">{t.name}</p>
                  <span className="chip bg-ink-100 text-ink-700">
                    {t.channel}
                  </span>
                  <span className="chip bg-sky-50 text-sky-700">
                    {t.event}
                  </span>
                  {!t.active && (
                    <span className="chip bg-ink-100 text-ink-500">
                      Paused
                    </span>
                  )}
                </div>
                {t.subject && (
                  <p className="text-[11px] text-ink-600 mt-1 font-semibold">
                    {t.subject}
                  </p>
                )}
                <p className="text-xs text-ink-600 mt-1 line-clamp-2 whitespace-pre-wrap">
                  {t.body}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => test(t)}
                  className="text-ink-500 hover:text-emerald-600"
                  title="Send test"
                >
                  <Send className="w-4 h-4" />
                </button>
                {canWrite && (
                  <>
                    <button
                      onClick={() => setEditing(t)}
                      className="text-ink-500 hover:text-ink-800"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => del(t)}
                      className="text-rose-500 hover:text-rose-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </Modal>

      <TemplateEditor
        open={!!editing || creating}
        template={editing}
        channels={data?.channels ?? []}
        events={data?.events ?? []}
        onClose={() => {
          setEditing(null);
          setCreating(false);
        }}
        onSaved={refresh}
      />
    </>
  );
}

function TemplateEditor({
  open,
  template,
  channels,
  events,
  onClose,
  onSaved,
}: {
  open: boolean;
  template: any | null;
  channels: string[];
  events: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    setForm(
      template ?? {
        name: "",
        channel: "SMS",
        event: "custom",
        body: "",
        active: true,
      }
    );
  }, [template, open]);
  async function save() {
    if (!form.name || !form.body) {
      toast("Name and body required", "error");
      return;
    }
    setSaving(true);
    try {
      if (template) {
        await api.patch(`/api/settings/templates/${template.id}`, form);
      } else {
        await api.post("/api/settings/templates", form);
      }
      toast("Saved", "success");
      onSaved();
      onClose();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }
  const isEmail = form.channel === "Email";
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={template ? `Edit · ${template.name}` : "New template"}
      width="max-w-lg"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>Cancel</button>
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
        />
      </Field>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Channel">
          <Select
            value={form.channel}
            onChange={(e) => setForm({ ...form, channel: e.target.value })}
          >
            {channels.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Event">
          <Select
            value={form.event}
            onChange={(e) => setForm({ ...form, event: e.target.value })}
          >
            {events.map((ev) => (
              <option key={ev} value={ev}>{ev}</option>
            ))}
          </Select>
        </Field>
      </div>
      {isEmail && (
        <Field label="Subject line">
          <Input
            value={form.subject ?? ""}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
        </Field>
      )}
      <Field
        label="Body"
        hint="Variables: {{customerName}} · {{orderCode}} · {{total}} · {{tableCode}}"
      >
        <Textarea
          rows={6}
          value={form.body ?? ""}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          placeholder="Hey {{customerName}}, your order {{orderCode}} is ready!"
        />
      </Field>
      <label className="flex items-center gap-2 mt-2 text-sm">
        <input
          type="checkbox"
          checked={!!form.active}
          onChange={(e) => setForm({ ...form, active: e.target.checked })}
        />
        Active — pause to stop using this template
      </label>
    </Modal>
  );
}

// ─── Roles matrix ─────────────────────────────────────────────────────

function RolesMatrix({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const rows: {
    area: string;
    admin: boolean;
    manager: boolean;
    receptionist: boolean;
    waiter: boolean;
    kitchen: boolean;
    rider: boolean;
  }[] = [
    { area: "Overview / Reports", admin: true, manager: true, receptionist: false, waiter: false, kitchen: false, rider: false },
    { area: "Orders · read", admin: true, manager: true, receptionist: true, waiter: true, kitchen: true, rider: true },
    { area: "Orders · create", admin: true, manager: true, receptionist: true, waiter: false, kitchen: false, rider: false },
    { area: "Orders · forward to kitchen", admin: true, manager: true, receptionist: true, waiter: false, kitchen: false, rider: false },
    { area: "KDS · transitions + ETA", admin: true, manager: true, receptionist: false, waiter: false, kitchen: true, rider: false },
    { area: "Tables · set status", admin: true, manager: true, receptionist: true, waiter: true, kitchen: false, rider: false },
    { area: "Waitlist · seat/notify", admin: true, manager: true, receptionist: true, waiter: true, kitchen: false, rider: false },
    { area: "Menu · write/delete", admin: true, manager: true, receptionist: false, waiter: false, kitchen: false, rider: false },
    { area: "Inventory · adjust", admin: true, manager: true, receptionist: true, waiter: false, kitchen: true, rider: false },
    { area: "Wastage · approve", admin: true, manager: true, receptionist: false, waiter: false, kitchen: false, rider: false },
    { area: "Expenses · approve", admin: true, manager: true, receptionist: false, waiter: false, kitchen: false, rider: false },
    { area: "Promotions · write", admin: true, manager: true, receptionist: false, waiter: false, kitchen: false, rider: false },
    { area: "Shifts · publish/approve swap", admin: true, manager: true, receptionist: false, waiter: false, kitchen: false, rider: false },
    { area: "Leave · decide", admin: true, manager: true, receptionist: false, waiter: false, kitchen: false, rider: false },
    { area: "PO · receive + supplier mgmt", admin: true, manager: true, receptionist: false, waiter: false, kitchen: false, rider: false },
    { area: "Delivery · dispatch", admin: true, manager: true, receptionist: true, waiter: false, kitchen: false, rider: false },
    { area: "Delivery · rider actions", admin: true, manager: true, receptionist: false, waiter: false, kitchen: false, rider: true },
    { area: "Staff · hire/edit", admin: true, manager: true, receptionist: false, waiter: false, kitchen: false, rider: false },
    { area: "Customers CRM + campaigns", admin: true, manager: true, receptionist: true, waiter: false, kitchen: false, rider: false },
    { area: "Outlets · create/switch", admin: true, manager: false, receptionist: false, waiter: false, kitchen: false, rider: false },
    { area: "Settings · edit outlet + templates", admin: true, manager: true, receptionist: false, waiter: false, kitchen: false, rider: false },
    { area: "Audit log · view", admin: true, manager: true, receptionist: false, waiter: false, kitchen: false, rider: false },
  ];
  const roles = ["admin", "manager", "receptionist", "waiter", "kitchen", "rider"] as const;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Roles & permissions"
      subtitle="Read-only · backend enforces via requireRole() + targetRoles"
      width="max-w-4xl"
      footer={<button className="btn-outline" onClick={onClose}>Close</button>}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="table-th">Capability</th>
              {roles.map((r) => (
                <th key={r} className="table-th text-center capitalize">
                  {r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.area} className="hover:bg-ink-50/60">
                <td className="table-td text-ink-800">{row.area}</td>
                {roles.map((r) => {
                  const on = (row as any)[r];
                  return (
                    <td key={r} className="table-td text-center">
                      {on ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600 mx-auto" />
                      ) : (
                        <XIcon className="w-3 h-3 text-ink-300 mx-auto" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-ink-400 mt-3">
        Edit roles under Staff → user profile. Adding custom roles ships in Phase 3.
      </p>
    </Modal>
  );
}

// ─── Audit log ──────────────────────────────────────────────────────

function AuditPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { data } = useApi<{ items: any[] }>(open ? "/api/settings/audit" : null);
  const items = data?.items ?? [];
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Audit log"
      subtitle="Every privileged action · immutable · admin + manager only"
      width="max-w-3xl"
      footer={<button className="btn-outline" onClick={onClose}>Close</button>}
    >
      {items.length === 0 ? (
        <p className="text-sm text-ink-500 text-center py-8">
          No entries yet. Settings changes and voids will appear here.
        </p>
      ) : (
        <div className="divide-y divide-ink-100">
          {items.map((e: any) => (
            <div key={e.id} className="py-3 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="chip bg-ink-900 text-white font-mono">
                    {e.action}
                  </span>
                  {e.targetType && (
                    <span className="chip bg-ink-100 text-ink-700">
                      {e.targetType}
                    </span>
                  )}
                  <span className="text-[11px] text-ink-500">
                    by {e.userName ?? "system"}
                  </span>
                </div>
                {(e.before || e.after) && (
                  <div className="mt-1 text-[11px] font-mono text-ink-600">
                    {e.before && (
                      <div className="text-rose-600 truncate">
                        − {JSON.stringify(e.before).slice(0, 200)}
                      </div>
                    )}
                    {e.after && (
                      <div className="text-emerald-700 truncate">
                        + {JSON.stringify(e.after).slice(0, 200)}
                      </div>
                    )}
                  </div>
                )}
                <p className="text-[10px] text-ink-400 mt-1">
                  {new Date(e.at ?? e.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ─── Business hours ─────────────────────────────────────────────────────

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function BusinessHoursEditor({
  open,
  outlet,
  canWrite,
  onClose,
  onSaved,
}: {
  open: boolean;
  outlet: any;
  canWrite: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !outlet) return;
    const existing = (outlet.businessHours ?? []) as any[];
    const map = new Map(existing.map((h) => [h.day, h]));
    const full = Array.from({ length: 7 }, (_, d) =>
      map.get(d) ?? { day: d, closed: d === 0, openTime: "10:00", closeTime: "23:00" }
    );
    setRows(full);
  }, [open, outlet]);

  async function save() {
    setSaving(true);
    try {
      await api.patch("/api/settings/hours", { businessHours: rows });
      toast("Hours saved", "success");
      onSaved();
      onClose();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setSaving(false);
    }
  }

  function setRow(d: number, patch: any) {
    setRows((r) => r.map((row) => (row.day === d ? { ...row, ...patch } : row)));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Business hours"
      subtitle="Weekly schedule · used for accepting orders and delivery cut-offs"
      width="max-w-lg"
      footer={
        canWrite ? (
          <>
            <button className="btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </>
        ) : (
          <button className="btn-outline" onClick={onClose}>Close</button>
        )
      }
    >
      <div className="space-y-1">
        {rows.map((row) => (
          <div
            key={row.day}
            className="flex items-center gap-3 py-2 border-b border-ink-100 last:border-0"
          >
            <span className="w-12 text-sm font-semibold text-ink-700">
              {WEEKDAYS[row.day]}
            </span>
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={!row.closed}
                disabled={!canWrite}
                onChange={(e) => setRow(row.day, { closed: !e.target.checked })}
                className="w-3.5 h-3.5"
              />
              Open
            </label>
            <input
              type="time"
              value={row.openTime ?? "10:00"}
              disabled={!canWrite || row.closed}
              onChange={(e) => setRow(row.day, { openTime: e.target.value })}
              className="input text-xs w-28"
            />
            <span className="text-ink-400 text-sm">–</span>
            <input
              type="time"
              value={row.closeTime ?? "23:00"}
              disabled={!canWrite || row.closed}
              onChange={(e) => setRow(row.day, { closeTime: e.target.value })}
              className="input text-xs w-28"
            />
            {row.closed && (
              <span className="chip bg-ink-100 text-ink-500 text-[10px]">
                Closed
              </span>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ─── Receipt customization ──────────────────────────────────────────────

function ReceiptEditor({
  open,
  outlet,
  canWrite,
  onClose,
  onSaved,
}: {
  open: boolean;
  outlet: any;
  canWrite: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const save = useOutletSaver(outlet, onSaved);
  useEffect(() => {
    if (open && outlet)
      setForm({
        receiptHeader: outlet.receiptHeader ?? "",
        receiptFooter: outlet.receiptFooter ?? "",
        receiptLegalText: outlet.receiptLegalText ?? "",
        receiptShowLogo: outlet.receiptShowLogo !== false,
        receiptShowTaxBreakdown: outlet.receiptShowTaxBreakdown !== false,
        qrBrandColor: outlet.qrBrandColor ?? "#0ea5e9",
        qrBrandLogoUrl: outlet.qrBrandLogoUrl ?? "",
      });
  }, [open, outlet]);

  async function doSave() {
    setSaving(true);
    try {
      await save(form);
      onClose();
    } catch {} finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Receipt & QR customization"
      subtitle="What guests see on printed and digital receipts"
      width="max-w-xl"
      footer={
        canWrite ? (
          <>
            <button className="btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={doSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </>
        ) : (
          <button className="btn-outline" onClick={onClose}>Close</button>
        )
      }
    >
      <Field label="Receipt header (above items)">
        <Textarea
          value={form.receiptHeader ?? ""}
          onChange={(e) => setForm({ ...form, receiptHeader: e.target.value })}
          placeholder="Welcome to FlavorFlow!"
          rows={2}
        />
      </Field>
      <Field label="Receipt footer (thank-you line)">
        <Textarea
          value={form.receiptFooter ?? ""}
          onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
          placeholder="Thank you for dining with us!"
          rows={2}
        />
      </Field>
      <Field label="Legal / disclaimer text">
        <Textarea
          value={form.receiptLegalText ?? ""}
          onChange={(e) => setForm({ ...form, receiptLegalText: e.target.value })}
          placeholder="All taxes included. No refunds after 24h."
          rows={2}
        />
      </Field>
      <div className="flex items-center gap-4 mt-1">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!form.receiptShowLogo}
            disabled={!canWrite}
            onChange={(e) =>
              setForm({ ...form, receiptShowLogo: e.target.checked })
            }
            className="w-4 h-4"
          />
          Show logo
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!form.receiptShowTaxBreakdown}
            disabled={!canWrite}
            onChange={(e) =>
              setForm({ ...form, receiptShowTaxBreakdown: e.target.checked })
            }
            className="w-4 h-4"
          />
          Show tax + service breakdown
        </label>
      </div>
      <div className="mt-4 pt-4 border-t border-ink-100">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-2">
          QR page branding
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Brand color">
            <Input
              type="color"
              value={form.qrBrandColor ?? "#0ea5e9"}
              onChange={(e) =>
                setForm({ ...form, qrBrandColor: e.target.value })
              }
            />
          </Field>
          <Field label="Brand logo URL">
            <Input
              value={form.qrBrandLogoUrl ?? ""}
              onChange={(e) =>
                setForm({ ...form, qrBrandLogoUrl: e.target.value })
              }
              placeholder="https://…"
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

// ─── Security policy ────────────────────────────────────────────────────

function SecurityPanel({
  open,
  outlet,
  canWrite,
  onClose,
  onSaved,
}: {
  open: boolean;
  outlet: any;
  canWrite: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const save = useOutletSaver(outlet, onSaved);
  useEffect(() => {
    if (open && outlet)
      setForm({
        sessionTimeoutMinutes: outlet.sessionTimeoutMinutes ?? 720,
        passwordMinLength: outlet.passwordMinLength ?? 8,
        requireMfa: !!outlet.requireMfa,
      });
  }, [open, outlet]);

  async function doSave() {
    setSaving(true);
    try {
      await save(form);
      onClose();
    } catch {} finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Security policy"
      subtitle="Session and password rules for every user in this outlet"
      width="max-w-md"
      footer={
        canWrite ? (
          <>
            <button className="btn-outline" onClick={onClose}>Cancel</button>
            <button className="btn-primary" onClick={doSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </>
        ) : (
          <button className="btn-outline" onClick={onClose}>Close</button>
        )
      }
    >
      <Field label="Session timeout (minutes)">
        <Input
          type="number"
          min={30}
          max={10080}
          value={form.sessionTimeoutMinutes ?? 720}
          onChange={(e) =>
            setForm({ ...form, sessionTimeoutMinutes: Number(e.target.value) })
          }
        />
      </Field>
      <Field label="Minimum password length">
        <Input
          type="number"
          min={6}
          max={64}
          value={form.passwordMinLength ?? 8}
          onChange={(e) =>
            setForm({ ...form, passwordMinLength: Number(e.target.value) })
          }
        />
      </Field>
      <label className="flex items-center gap-2 text-sm mt-2">
        <input
          type="checkbox"
          checked={!!form.requireMfa}
          disabled={!canWrite}
          onChange={(e) => setForm({ ...form, requireMfa: e.target.checked })}
          className="w-4 h-4"
        />
        Require multi-factor authentication (admin + manager)
      </label>
      <p className="text-[11px] text-ink-400 mt-3 leading-snug">
        MFA enrollment flow activates when an MFA provider is configured. Password
        policy applies at next password change.
      </p>
    </Modal>
  );
}

// ─── Webhooks CRUD ──────────────────────────────────────────────────────

function WebhooksPanel({
  open,
  canWrite,
  onClose,
}: {
  open: boolean;
  canWrite: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      const r = await api.get<{ items: any[]; events: string[] }>(
        "/api/settings/webhooks"
      );
      setItems(r.items);
      setEvents(r.events);
    } catch (e: any) {
      toast(e.message, "error");
    }
  }
  useEffect(() => {
    if (open) load();
  }, [open]);

  async function testOne(id: string) {
    setBusyId(id);
    try {
      const r = await api.post<any>(`/api/settings/webhooks/${id}/test`, {});
      if (r.ok) toast(`Delivered · HTTP ${r.status}`, "success");
      else toast(r.error ?? `Failed · ${r.status ?? "no response"}`, "error");
      load();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusyId(null);
    }
  }
  async function removeOne(id: string) {
    if (!confirm("Delete this webhook?")) return;
    await api.del(`/api/settings/webhooks/${id}`);
    load();
  }

  return (
    <>
      <Modal
        open={open && !editing}
        onClose={onClose}
        title="Outbound webhooks"
        subtitle="Forward key events to external systems · HMAC-SHA256 signed"
        width="max-w-2xl"
        footer={
          <>
            <button className="btn-outline" onClick={onClose}>Close</button>
            {canWrite && (
              <button
                className="btn-primary"
                onClick={() =>
                  setEditing({ name: "", url: "", events: [], active: true })
                }
              >
                <Plus className="w-4 h-4 mr-1" /> Add webhook
              </button>
            )}
          </>
        }
      >
        {items.length === 0 ? (
          <div className="text-sm text-ink-500 text-center py-6">
            No webhooks configured. Add one to receive events in Slack, Zapier,
            Make, or your own backend.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((h) => (
              <div
                key={h._id}
                className="p-3 rounded-lg border border-ink-200"
              >
                <div className="flex items-start gap-3">
                  <Webhook className="w-5 h-5 text-ink-500 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold truncate">{h.name}</p>
                      {h.active ? (
                        <span className="chip bg-emerald-100 text-emerald-700 text-[10px]">
                          active
                        </span>
                      ) : (
                        <span className="chip bg-ink-100 text-ink-500 text-[10px]">
                          paused
                        </span>
                      )}
                      {h.lastStatus && (
                        <span
                          className={`chip text-[10px] ${
                            h.lastStatus >= 200 && h.lastStatus < 300
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          last {h.lastStatus}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-ink-500 font-mono truncate mt-0.5">
                      {h.url}
                    </p>
                    <p className="text-[10px] text-ink-400 mt-1">
                      {(h.events ?? []).join(" · ") || "No events"}
                      {typeof h.successCount === "number" &&
                        ` · ${h.successCount} ok · ${h.failureCount ?? 0} failed`}
                    </p>
                  </div>
                  {canWrite && (
                    <>
                      <button
                        className="btn-outline text-xs"
                        disabled={busyId === h._id}
                        onClick={() => testOne(h._id)}
                      >
                        {busyId === h._id ? "…" : "Test"}
                      </button>
                      <button
                        className="btn-outline text-xs"
                        onClick={() => setEditing(h)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="btn-outline text-xs text-rose-600"
                        onClick={() => removeOne(h._id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-ink-400 mt-4 leading-snug">
          Each delivery carries <span className="font-mono">X-FlavorFlow-Signature</span>
          {" "}— verify by computing <span className="font-mono">HMAC-SHA256(secret, timestamp + "." + body)</span>.
        </p>
      </Modal>

      <WebhookEditor
        open={!!editing}
        initial={editing}
        events={events}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
        }}
      />
    </>
  );
}

function WebhookEditor({
  open,
  initial,
  events,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: any;
  events: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open && initial) setForm({ ...initial });
  }, [open, initial]);
  const toggleEvent = (ev: string) => {
    const has = (form.events ?? []).includes(ev);
    setForm({
      ...form,
      events: has
        ? form.events.filter((e: string) => e !== ev)
        : [...(form.events ?? []), ev],
    });
  };
  async function save() {
    if (!form.name || !form.url) {
      toast("Name and URL are required", "error");
      return;
    }
    setSaving(true);
    try {
      if (form._id) await api.patch(`/api/settings/webhooks/${form._id}`, form);
      else await api.post("/api/settings/webhooks", form);
      toast("Saved", "success");
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
      title={form._id ? "Edit webhook" : "Add webhook"}
      width="max-w-lg"
      footer={
        <>
          <button className="btn-outline" onClick={onClose}>Cancel</button>
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
          placeholder="Slack · #orders"
        />
      </Field>
      <Field label="URL">
        <Input
          value={form.url ?? ""}
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          placeholder="https://hooks.slack.com/..."
        />
      </Field>
      <Field label="Signing secret (optional override)">
        <Input
          value={form.secret ?? ""}
          onChange={(e) => setForm({ ...form, secret: e.target.value })}
          placeholder="leave empty to use WEBHOOK_SIGNING_SECRET"
        />
      </Field>
      <div>
        <p className="text-xs font-semibold text-ink-700 mb-1.5">Events</p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {events.map((ev) => (
            <label
              key={ev}
              className="flex items-center gap-2 text-xs p-2 rounded border border-ink-100 hover:bg-ink-50"
            >
              <input
                type="checkbox"
                checked={(form.events ?? []).includes(ev)}
                onChange={() => toggleEvent(ev)}
                className="w-3.5 h-3.5"
              />
              <span className="font-mono">{ev}</span>
            </label>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm mt-3">
        <input
          type="checkbox"
          checked={!!form.active}
          onChange={(e) => setForm({ ...form, active: e.target.checked })}
          className="w-4 h-4"
        />
        Active
      </label>
    </Modal>
  );
}

// ─── API keys ───────────────────────────────────────────────────────────

function ApiKeysPanel({
  open,
  canWrite,
  onClose,
}: {
  open: boolean;
  canWrite: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [scopes, setScopes] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [newScopes, setNewScopes] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [revealed, setRevealed] = useState<{ prefix: string; key: string } | null>(null);

  async function load() {
    try {
      const r = await api.get<{ items: any[]; scopes: string[] }>(
        "/api/settings/api-keys"
      );
      setItems(r.items);
      setScopes(r.scopes);
    } catch (e: any) {
      toast(e.message, "error");
    }
  }
  useEffect(() => {
    if (open) {
      load();
      setRevealed(null);
      setNewName("");
      setNewScopes([]);
    }
  }, [open]);

  async function create() {
    if (!newName.trim()) {
      toast("Name the key first", "error");
      return;
    }
    setCreating(true);
    try {
      const r = await api.post<any>("/api/settings/api-keys", {
        name: newName.trim(),
        scopes: newScopes,
      });
      setRevealed({ prefix: r.item.prefix, key: r.rawKey });
      setNewName("");
      setNewScopes([]);
      load();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setCreating(false);
    }
  }
  async function revoke(id: string) {
    if (!confirm("Revoke this key? Third parties will lose access.")) return;
    await api.del(`/api/settings/api-keys/${id}`);
    load();
  }

  const toggleScope = (s: string) =>
    setNewScopes((list) =>
      list.includes(s) ? list.filter((x) => x !== s) : [...list, s]
    );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="API keys"
      subtitle="Personal access tokens · scoped · hashed at rest"
      width="max-w-xl"
      footer={<button className="btn-outline" onClick={onClose}>Close</button>}
    >
      {revealed && (
        <div className="mb-4 p-3 rounded-lg border border-emerald-200 bg-emerald-50">
          <p className="text-xs font-semibold text-emerald-800 mb-1">
            Key created — copy it now, it won't be shown again
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono bg-white border border-emerald-200 rounded px-2 py-1 break-all">
              {revealed.key}
            </code>
            <button
              className="btn-outline text-xs"
              onClick={() => {
                navigator.clipboard.writeText(revealed.key);
                toast("Copied", "success");
              }}
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {canWrite && (
        <div className="mb-4 p-3 rounded-lg border border-ink-200">
          <Field label="New key name">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Mobile owner app"
            />
          </Field>
          <p className="text-xs font-semibold text-ink-700 mt-2 mb-1.5">Scopes</p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {scopes.map((s) => (
              <label
                key={s}
                className="flex items-center gap-2 text-xs p-1.5 rounded border border-ink-100 hover:bg-ink-50"
              >
                <input
                  type="checkbox"
                  checked={newScopes.includes(s)}
                  onChange={() => toggleScope(s)}
                  className="w-3.5 h-3.5"
                />
                <span className="font-mono">{s}</span>
              </label>
            ))}
          </div>
          <button
            className="btn-primary text-sm mt-3"
            onClick={create}
            disabled={creating}
          >
            <Plus className="w-4 h-4 mr-1" />
            {creating ? "Creating…" : "Create key"}
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-ink-500 text-center py-4">
          No keys yet. Create one above to access FlavorFlow programmatically.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((k) => (
            <div
              key={k._id}
              className="flex items-center gap-3 p-3 rounded-lg border border-ink-200"
            >
              <KeyRound className="w-5 h-5 text-ink-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold truncate">{k.name}</p>
                  {k.revokedAt ? (
                    <span className="chip bg-rose-100 text-rose-700 text-[10px]">
                      revoked
                    </span>
                  ) : (
                    <span className="chip bg-emerald-100 text-emerald-700 text-[10px]">
                      active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-ink-500 font-mono mt-0.5">
                  {k.prefix}…
                </p>
                <p className="text-[10px] text-ink-400 mt-0.5">
                  {(k.scopes ?? []).join(" · ") || "no scopes"}
                </p>
              </div>
              {canWrite && !k.revokedAt && (
                <button
                  className="btn-outline text-xs text-rose-600"
                  onClick={() => revoke(k._id)}
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ─── Backups & retention ────────────────────────────────────────────────

function BackupPanel({
  open,
  outlet,
  canWrite,
  onClose,
  onSaved,
}: {
  open: boolean;
  outlet: any;
  canWrite: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [jobs, setJobs] = useState<any[]>([]);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const save = useOutletSaver(outlet, onSaved);

  useEffect(() => {
    if (open && outlet)
      setForm({
        retainOrderHistoryDays: outlet.retainOrderHistoryDays ?? 365,
        retainAuditLogDays: outlet.retainAuditLogDays ?? 180,
      });
  }, [open, outlet]);

  async function loadJobs() {
    try {
      const r = await api.get<{ items: any[] }>("/api/settings/backups");
      setJobs(r.items);
    } catch {}
  }
  useEffect(() => {
    if (open && canWrite) loadJobs();
  }, [open, canWrite]);

  async function saveRetention() {
    setSaving(true);
    try {
      await save(form);
    } catch {} finally {
      setSaving(false);
    }
  }

  async function download() {
    setDownloading(true);
    try {
      const res = await fetch(`${API_URL}/api/settings/backups`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken() ?? ""}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `flavorflow-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast("Backup downloaded", "success");
      loadJobs();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Backups & data retention"
      subtitle="Download a full outlet dump · set record retention windows"
      width="max-w-xl"
      footer={<button className="btn-outline" onClick={onClose}>Close</button>}
    >
      {canWrite && (
        <div className="mb-4 p-3 rounded-lg border border-ink-200">
          <p className="text-sm font-semibold mb-2">Full backup</p>
          <p className="text-xs text-ink-500 mb-3">
            Snapshots orders, menu, customers, ingredients, and tables for this
            outlet as a single downloadable JSON file.
          </p>
          <button
            className="btn-primary text-sm"
            onClick={download}
            disabled={downloading}
          >
            <Download className="w-4 h-4 mr-1" />
            {downloading ? "Preparing…" : "Download backup"}
          </button>
        </div>
      )}

      <div className="mb-4 p-3 rounded-lg border border-ink-200">
        <p className="text-sm font-semibold mb-2">Data retention</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Order history (days)">
            <Input
              type="number"
              min={30}
              max={3650}
              value={form.retainOrderHistoryDays ?? 365}
              disabled={!canWrite}
              onChange={(e) =>
                setForm({
                  ...form,
                  retainOrderHistoryDays: Number(e.target.value),
                })
              }
            />
          </Field>
          <Field label="Audit log (days)">
            <Input
              type="number"
              min={30}
              max={3650}
              value={form.retainAuditLogDays ?? 180}
              disabled={!canWrite}
              onChange={(e) =>
                setForm({
                  ...form,
                  retainAuditLogDays: Number(e.target.value),
                })
              }
            />
          </Field>
        </div>
        {canWrite && (
          <button
            className="btn-outline text-xs mt-3"
            onClick={saveRetention}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save retention"}
          </button>
        )}
      </div>

      {canWrite && (
        <div>
          <p className="text-xs font-semibold text-ink-700 mb-2">Recent jobs</p>
          {jobs.length === 0 ? (
            <p className="text-xs text-ink-500">No backups yet.</p>
          ) : (
            <div className="space-y-1">
              {jobs.map((j) => (
                <div
                  key={j._id}
                  className="flex items-center gap-3 p-2 rounded border border-ink-100 text-xs"
                >
                  <Database className="w-4 h-4 text-ink-400" />
                  <span className="flex-1">
                    {new Date(j.startedAt).toLocaleString()}
                  </span>
                  <span className="chip bg-ink-100 text-ink-600 text-[10px] capitalize">
                    {j.status}
                  </span>
                  <span className="text-ink-500">
                    {j.recordCount} rec · {Math.round((j.sizeBytes ?? 0) / 1024)} KB
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
