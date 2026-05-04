"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { qrApi } from "@/lib/qrApi";
import { SOCKET_URL } from "@/lib/config";
import { io, Socket } from "socket.io-client";
import { ReviewPromptCard } from "@/components/ReviewPromptCard";
import {
  Flame,
  CheckCircle2,
  ChefHat,
  Clock,
  Bell,
  Star,
  ReceiptText,
  Loader2,
  MessageSquare,
  Sparkles,
  ChevronLeft,
} from "lucide-react";
import clsx from "clsx";
import Link from "next/link";

const STEPS = [
  { key: "Queued", label: "Placed", icon: ReceiptText },
  { key: "In Progress", label: "In kitchen", icon: ChefHat },
  { key: "Ready", label: "Ready", icon: Bell },
  { key: "Served", label: "Served", icon: CheckCircle2 },
];

function LoyaltyStrip({ loyalty }: { loyalty: any }) {
  const tier = loyalty.tier ?? "Bronze";
  const points = loyalty.points ?? 0;
  const visits = loyalty.visits ?? 1;
  const isFirst = visits <= 1;
  const tierTone: Record<string, string> = {
    Gold: "from-amber-400 via-amber-500 to-orange-500",
    Silver: "from-slate-300 via-slate-400 to-slate-500",
    Bronze: "from-orange-300 via-orange-400 to-rose-400",
  };
  return (
    <div className="card overflow-hidden">
      <div
        className={`relative p-4 bg-gradient-to-br ${
          tierTone[tier] ?? tierTone.Bronze
        } text-white`}
      >
        <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/15 blur-2xl pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] font-bold text-white/80">
              {isFirst ? "Welcome to FlavorFlow loyalty" : `Welcome back, ${(loyalty.name ?? "guest").split(" ")[0]}`}
            </p>
            <p className="text-lg font-extrabold leading-tight">
              {tier} member · {points.toLocaleString()} pts
            </p>
            <p className="text-[11px] text-white/85 mt-0.5">
              {isFirst
                ? "Your points auto-track on every order — 1 point = Rs 1 off next time."
                : `Visit #${visits} · keep going, ${
                    tier === "Gold"
                      ? "you're at the top tier"
                      : "closer to the next tier"
                  }`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function emoji(n: string) {
  const s = n.toLowerCase();
  if (s.includes("burger")) return "🍔";
  if (s.includes("pizza")) return "🍕";
  if (s.includes("biryani") || s.includes("rice")) return "🍛";
  if (s.includes("fries")) return "🍟";
  if (s.includes("wing")) return "🍗";
  if (s.includes("salad")) return "🥗";
  if (s.includes("coffee")) return "☕";
  if (s.includes("margarita") || s.includes("juice")) return "🧃";
  if (s.includes("cola") || s.includes("7up")) return "🥤";
  if (s.includes("brownie") || s.includes("cake")) return "🍰";
  if (s.includes("shawarma") || s.includes("wrap")) return "🌯";
  return "🍽️";
}

export default function QROrderPage() {
  const params = useParams();
  const id = String(params?.id ?? "");
  const [order, setOrder] = useState<any>(null);
  const [loyalty, setLoyalty] = useState<any>(null);
  const [reviewed, setReviewed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [calling, setCalling] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewDismissed, setReviewDismissed] = useState(false);
  const [, setTick] = useState(0);
  const prevStatusRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(i);
  }, []);

  async function load() {
    try {
      const r = await qrApi.get<{
        order: any;
        reviewed?: boolean;
        loyalty?: any;
      }>(`/api/qr/order/${id}`);
      setOrder(r.order);
      setReviewed(!!r.reviewed);
      if (r.loyalty) setLoyalty(r.loyalty);
      try {
        if (r.order?.tableCode) {
          const key = `ff_qr_order_${r.order.tableCode}`;
          // Keep session pointer alive through Completed so a re-scan can still
          // bring them to the review prompt on the menu page.
          if (r.order.status === "Cancelled") {
            localStorage.removeItem(key);
          } else {
            localStorage.setItem(key, r.order.id);
          }
          if (r.reviewed) {
            localStorage.setItem(`ff_qr_reviewed_${r.order.id}`, "1");
          }
        }
      } catch {}
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => {
    load();
    const s: Socket = io(SOCKET_URL, { transports: ["websocket"] });
    s.on("order:update", (o: any) => {
      if (o?.id === id || o?._id === id) load();
    });
    const i = setInterval(load, 15000);
    return () => {
      s.disconnect();
      clearInterval(i);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Auto-open the review modal the moment status hits Served (or on fresh
  // page load if we arrive already at Served/Completed without a review).
  useEffect(() => {
    if (!order || reviewed || reviewDismissed) {
      prevStatusRef.current = order?.status;
      return;
    }
    const prev = prevStatusRef.current;
    const isReviewable =
      order.status === "Served" || order.status === "Completed";
    const transitionedToReviewable =
      prev !== undefined && prev !== order.status && isReviewable;
    const freshLoadAtReviewable = prev === undefined && isReviewable;
    if (transitionedToReviewable || freshLoadAtReviewable) {
      setReviewModalOpen(true);
    }
    prevStatusRef.current = order.status;
  }, [order, reviewed, reviewDismissed]);

  async function callWaiter() {
    setCalling(true);
    try {
      await qrApi.post(`/api/qr/order/${id}/call-waiter`, {
        reason: "Guest pressed 'Call waiter'",
      });
      setTimeout(() => setCalling(false), 2500);
    } catch {
      setCalling(false);
    }
  }

  async function submitReview() {
    if (!rating) return;
    try {
      await qrApi.post("/api/qr/reviews", {
        orderId: id,
        rating,
        text,
        customerName: order?.customerName,
      });
      setSubmitted(true);
      setReviewed(true);
      try {
        localStorage.setItem(`ff_qr_reviewed_${id}`, "1");
      } catch {}
    } catch (e: any) {
      alert(e.message);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-ink-50 to-white">
        <div className="max-w-sm text-center">
          <p className="text-rose-600 font-semibold">{error}</p>
        </div>
      </div>
    );
  }
  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f5f0] text-ink-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  const stepIdx = STEPS.findIndex((s) => s.key === order.status);
  const closed = ["Completed", "Cancelled"].includes(order.status);
  const elapsedMin = order.elapsedMin ?? 0;
  // Prefer the kitchen's committed ETA over a guess; fall back to SLA 18 min
  // if the kitchen hasn't accepted yet.
  const etaMs = order.eta
    ? new Date(order.eta).getTime() - Date.now()
    : null;
  const committedEta =
    etaMs !== null ? Math.max(0, Math.ceil(etaMs / 60000)) : null;
  const fallbackEta =
    stepIdx >= 1 && !closed ? Math.max(0, 18 - elapsedMin) : null;
  const eta = committedEta ?? fallbackEta;
  const etaOverdue = etaMs !== null && etaMs < 0;

  const statusPrimary =
    order.status === "Pending"
      ? "Sending your order through"
      : order.status === "Queued"
      ? "Kitchen will accept any moment"
      : order.status === "In Progress"
      ? committedEta !== null
        ? etaOverdue
          ? "Wrapping up now"
          : `Ready in ~${committedEta} min`
        : "Our kitchen is on it"
      : order.status === "Ready"
      ? "Your food is ready!"
      : order.status === "Served"
      ? "Enjoy your meal"
      : order.status === "Completed"
      ? "Thanks for visiting"
      : "Order update";

  const statusSub =
    order.status === "Pending"
      ? "Reception is reviewing · kitchen next"
      : order.status === "Queued"
      ? "The chef will set a prep time shortly"
      : order.status === "In Progress"
      ? committedEta !== null
        ? etaOverdue
          ? "Chef is plating — any moment now"
          : "Fresh ingredients on the grill"
        : "Fresh ingredients going to the grill"
      : order.status === "Ready"
      ? "A waiter will bring it to your table now"
      : order.status === "Served"
      ? "We hope it hits the spot"
      : order.status === "Completed"
      ? "Come back soon"
      : "";

  return (
    <div className="min-h-screen bg-[#f8f5f0] pb-20 relative">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-ink-900 via-ink-900 to-brand-900" />
        <div className="absolute inset-0 ff-grain opacity-90" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-brand-500/30 blur-3xl" />

        <div className="relative max-w-2xl mx-auto px-5 pt-5 pb-14 text-white">
          <Link
            href={`/qr/${encodeURIComponent(order.tableCode ?? "")}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-white/70 hover:text-white"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back to menu
          </Link>

          <div className="flex items-center gap-3 mt-4">
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center">
              <Flame className="w-5 h-5 text-brand-200" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-semibold">
                Live tracking · {order.code}
              </p>
              <h1 className="text-[22px] font-bold tracking-tight leading-tight">
                {statusPrimary}
              </h1>
              <p className="text-sm text-white/80 mt-0.5">{statusSub}</p>
            </div>
          </div>

          {order.status === "Ready" && (
            <div className="mt-4 p-3 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center gap-3 ff-bounce-in">
              <Bell className="w-5 h-5 text-amber-200 animate-pulseDot" />
              <p className="text-sm font-medium">
                Waiter notified · heads up to Table {order.tableCode}!
              </p>
            </div>
          )}
        </div>

        <div className="relative max-w-2xl mx-auto px-4 -mt-8">
          <div className="card p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center font-bold shrink-0">
                  {order.tableCode ?? "🥡"}
                </div>
                <div>
                  <p className="text-xs text-ink-500">
                    {order.tableCode
                      ? `Table ${order.tableCode}`
                      : order.channel}
                  </p>
                  <p className="font-bold text-ink-900">{order.code}</p>
                </div>
              </div>
              {!closed ? (
                <div className="text-left sm:text-right">
                  {committedEta !== null ? (
                    <>
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-ink-400">
                        Kitchen ETA
                      </p>
                      <p
                        className={clsx(
                          "text-2xl font-extrabold tabular-nums leading-none",
                          etaOverdue ? "text-rose-600" : "text-brand-600"
                        )}
                      >
                        {etaOverdue ? "any min" : committedEta}
                        {!etaOverdue && (
                          <span className="text-sm font-semibold text-ink-500">
                            {" "}
                            min
                          </span>
                        )}
                      </p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-ink-500 sm:justify-end">
                        <Clock className="w-3 h-3" /> {elapsedMin}m elapsed
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-ink-400">
                        Elapsed
                      </p>
                      <p className="text-2xl font-extrabold text-ink-900 tabular-nums leading-none">
                        {elapsedMin}
                        <span className="text-sm font-semibold text-ink-500">
                          {" "}
                          min
                        </span>
                      </p>
                      {fallbackEta !== null && (
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-brand-600 sm:justify-end">
                          <Clock className="w-3 h-3" /> ~{fallbackEta}m (est.)
                        </p>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <span className="chip bg-emerald-100 text-emerald-700">
                  <CheckCircle2 className="w-3 h-3" /> {order.status}
                </span>
              )}
            </div>

            {/* Timeline */}
            <div className="mt-5 relative">
              <div className="absolute top-5 left-5 right-5 h-0.5 bg-ink-100 rounded-full" />
              <div
                className="absolute top-5 left-5 h-0.5 bg-brand-500 rounded-full transition-all duration-500"
                style={{
                  width: `calc(${
                    closed
                      ? 100
                      : Math.max(
                          0,
                          Math.min(
                            100,
                            (stepIdx / (STEPS.length - 1)) * 100
                          )
                        )
                  }% - 10px)`,
                }}
              />
              <div className="relative flex justify-between">
                {STEPS.map((s, i) => {
                  const done = closed || i <= stepIdx;
                  const Icon = s.icon;
                  const current = !closed && i === stepIdx;
                  return (
                    <div key={s.key} className="flex flex-col items-center z-10">
                      <div
                        className={clsx(
                          "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                          done
                            ? "bg-brand-500 text-white"
                            : "bg-white border border-ink-200 text-ink-400",
                          current && "ring-4 ring-brand-200"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <p
                        className={clsx(
                          "text-[10px] mt-1.5 font-semibold",
                          done ? "text-ink-800" : "text-ink-400"
                        )}
                      >
                        {s.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 mt-5 space-y-4">
        {loyalty && <LoyaltyStrip loyalty={loyalty} />}

        {order.tableCode && !closed && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              onClick={callWaiter}
              disabled={calling}
              className={clsx(
                "h-12 rounded-2xl font-semibold flex items-center justify-center gap-2 border transition-colors",
                calling
                  ? "bg-emerald-500 text-white border-emerald-500"
                  : "bg-white border-ink-200 text-ink-900 hover:bg-ink-50"
              )}
            >
              {calling ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Waiter notified
                </>
              ) : (
                <>🙋 Call waiter</>
              )}
            </button>
            <a
              href={`/qr/${encodeURIComponent(order.tableCode)}`}
              className="h-12 rounded-2xl bg-white border border-ink-200 text-ink-900 font-semibold flex items-center justify-center gap-2 hover:bg-ink-50"
            >
              <Sparkles className="w-4 h-4" /> Add more items
            </a>
          </div>
        )}

        <div className="card overflow-hidden">
          <div className="px-5 pt-4 pb-2 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-ink-500" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
              Your items
            </span>
          </div>
          <div className="px-5 pb-4">
            {order.items?.map((i: any, idx: number) => {
              const isPending = i.status === "Pending";
              const itemEtaMin = i.eta
                ? Math.max(
                    0,
                    Math.ceil((new Date(i.eta).getTime() - Date.now()) / 60000)
                  )
                : null;
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-3 py-2 border-b border-ink-100 last:border-b-0 ${
                    isPending ? "opacity-80" : ""
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg text-2xl flex items-center justify-center shrink-0 ${
                      isPending
                        ? "bg-ink-100"
                        : "bg-gradient-to-br from-amber-100 to-orange-200"
                    }`}
                  >
                    {emoji(i.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-semibold text-ink-900">
                        {i.qty} × {i.name}
                      </p>
                      {itemEtaMin !== null && !isPending && (
                        <span className="text-[10px] font-semibold bg-brand-50 text-brand-700 px-1.5 py-0.5 rounded-full">
                          ETA {itemEtaMin}m
                        </span>
                      )}
                      {isPending && (
                        <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full">
                          Awaiting confirmation
                        </span>
                      )}
                      {i.addendum && !isPending && (
                        <span className="text-[10px] font-semibold bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full">
                          Added
                        </span>
                      )}
                    </div>
                    {i.mods?.length > 0 && (
                      <p className="text-[11px] text-brand-600">
                        {i.mods.join(" · ")}
                      </p>
                    )}
                    {i.note && (
                      <p className="text-[11px] text-amber-700 italic">
                        ⚡ {i.note}
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 text-sm tabular-nums font-bold text-ink-900">
                    Rs {(i.price * i.qty).toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-3 bg-ink-50/80 border-t border-ink-100 space-y-1 text-sm">
            <div className="flex justify-between text-ink-600">
              <span>Subtotal</span>
              <span className="tabular-nums">
                Rs {order.subtotal?.toLocaleString() ?? 0}
              </span>
            </div>
            <div className="flex justify-between text-ink-600">
              <span>Tax + service</span>
              <span className="tabular-nums">
                Rs{" "}
                {(
                  (order.tax ?? 0) + (order.service ?? 0)
                ).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between font-bold text-ink-900 pt-2 border-t border-ink-200">
              <span>Total</span>
              <span className="tabular-nums">
                Rs {order.total?.toLocaleString() ?? 0}
              </span>
            </div>
            <p className="text-[11px] text-ink-500 pt-1">
              Payment:{" "}
              <span className="font-semibold">{order.paymentStatus}</span>
              {order.paymentMethod
                ? ` · ${order.paymentMethod}`
                : " · pay at counter or digitally after"}
            </p>
          </div>
        </div>

        {(order.status === "Served" || order.status === "Completed") &&
          !submitted &&
          !reviewed && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-brand-500" />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
                  How was your meal?
                </p>
              </div>
              <p className="text-sm text-ink-700">
                Your honest rating helps our team improve every service.
              </p>
              <div className="flex gap-1 mt-3 justify-center">
                {[1, 2, 3, 4, 5].map((i) => (
                  <button key={i} onClick={() => setRating(i)}>
                    <Star
                      className={clsx(
                        "w-10 h-10 transition-transform active:scale-90",
                        i <= rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-ink-200 hover:text-ink-300"
                      )}
                    />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={3}
                    placeholder={
                      rating >= 4
                        ? "Anything you loved? (optional)"
                        : "What can we do better next time?"
                    }
                    className="w-full mt-3 px-3 py-2 rounded-xl border border-ink-200 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 focus:outline-none text-sm resize-none"
                  />
                  <button
                    onClick={submitReview}
                    className="btn-primary w-full mt-3 h-11 rounded-xl"
                  >
                    Submit {rating}★ review
                  </button>
                  {rating >= 4 && (
                    <p className="text-[11px] text-ink-500 text-center mt-2">
                      Enjoyed it? You&apos;ll get a Google review link next.
                    </p>
                  )}
                  {rating <= 3 && (
                    <p className="text-[11px] text-ink-500 text-center mt-2">
                      We&apos;ll route this privately to the manager for
                      follow-up.
                    </p>
                  )}
                </>
              )}
            </div>
          )}

        {submitted && (
          <div className="card p-5 text-center bg-gradient-to-br from-emerald-50 to-white border-emerald-200">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <p className="font-bold text-emerald-900">Thank you!</p>
            <p className="text-xs text-emerald-700 mt-1">
              {rating >= 4
                ? "Consider leaving us a Google review too — it really helps."
                : "The manager has been notified and will reach out shortly."}
            </p>
          </div>
        )}

        {!submitted && reviewed &&
          (order.status === "Served" || order.status === "Completed") && (
            <div className="card p-4 flex items-center gap-3 border-emerald-100 bg-emerald-50/60">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-sm text-emerald-900">
                Thanks — we&apos;ve recorded your review for this order.
              </p>
            </div>
          )}
      </main>

      {/* Prominent review modal — auto-opens when status becomes Served */}
      {reviewModalOpen && !reviewed && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm ff-fade-in"
          onClick={() => {
            setReviewDismissed(true);
            setReviewModalOpen(false);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl ff-slide-up"
          >
            <ReviewPromptCard
              order={order}
              onSubmitted={() => {
                setReviewed(true);
                setTimeout(() => setReviewModalOpen(false), 3200);
              }}
              onDismiss={() => {
                setReviewDismissed(true);
                setReviewModalOpen(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
