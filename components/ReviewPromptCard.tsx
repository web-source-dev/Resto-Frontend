"use client";

import { useState } from "react";
import { qrApi } from "@dinova/lib/qrApi";
import {
  Star,
  CheckCircle2,
  Sparkles,
  Loader2,
  ChevronRight,
  X,
} from "lucide-react";
import clsx from "clsx";
import Link from "next/link";

type Props = {
  order: any;
  onSubmitted?: () => void;
  onDismiss?: () => void;
};

const REASONS = ["Quick service", "Great taste", "Value for money", "Clean & cozy", "Friendly staff"];

export function ReviewPromptCard({ order, onSubmitted, onDismiss }: Props) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  function toggle(r: string) {
    setPicked((p) => (p.includes(r) ? p.filter((x) => x !== r) : [...p, r]));
  }

  async function submit() {
    if (!rating) return;
    setSaving(true);
    try {
      const payload = {
        orderId: order.id,
        rating,
        text: [text, picked.join(" · ")].filter(Boolean).join(" — "),
        customerName: order.customerName,
      };
      await qrApi.post("/api/qr/reviews", payload);
      setDone(true);
      try {
        localStorage.setItem(`ff_qr_reviewed_${order.id}`, "1");
      } catch {}
      onSubmitted?.();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    const good = rating >= 4;
    return (
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div
          className={clsx(
            "relative overflow-hidden rounded-3xl p-6 text-center ff-bounce-in",
            good
              ? "bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 text-white"
              : "bg-gradient-to-br from-sky-500 via-sky-600 to-indigo-600 text-white"
          )}
        >
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/15 blur-2xl" />
          <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-extrabold tracking-tight">
              Thank you for the {rating}★ review!
            </h3>
            <p className="text-sm text-white/85 mt-1 max-w-sm mx-auto leading-relaxed">
              {good
                ? "If you have 30 seconds, dropping a public Google review helps us more than you know."
                : "We take this seriously — the manager has been notified and will follow up."}
            </p>
            {good && (
              <a
                href="https://www.google.com/search?q=Dinova+Gulberg"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2.5 rounded-full bg-white text-ink-900 font-semibold text-sm hover:bg-white/90"
              >
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                Leave a Google review
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4">
      <div className="relative overflow-hidden rounded-3xl shadow-pop">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500 via-brand-500 to-amber-400" />
        <div className="absolute inset-0 ff-grain opacity-60 pointer-events-none" />
        <div className="absolute -right-10 -bottom-16 w-48 h-48 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute -left-6 -top-6 w-40 h-40 rounded-full bg-white/15 blur-2xl" />

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/20 backdrop-blur text-white hover:bg-white/30 flex items-center justify-center"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="relative p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold bg-white/20 backdrop-blur px-2 py-0.5 rounded-full">
              Order {order.code}
            </span>
            <span className="text-[11px] text-white/80 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> 30 seconds
            </span>
          </div>
          <h2 className="text-2xl sm:text-[26px] font-extrabold tracking-tight leading-tight">
            How was your meal
            {order.customerName && order.customerName !== "Walk-in guest"
              ? `, ${order.customerName.split(" ")[0]}`
              : ""}
            ?
          </h2>
          <p className="text-sm text-white/90 mt-1.5 leading-relaxed">
            Your review helps us train the team and choose what to put on the
            menu. We read every single one.
          </p>

          <div className="mt-4 flex justify-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => {
              const active = n <= (hoverRating || rating);
              return (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform active:scale-90 hover:scale-110 p-1"
                  aria-label={`${n} star${n === 1 ? "" : "s"}`}
                >
                  <Star
                    className={clsx(
                      "w-11 h-11 sm:w-12 sm:h-12 transition-colors drop-shadow",
                      active
                        ? "fill-amber-300 text-amber-300"
                        : "text-white/40"
                    )}
                    strokeWidth={1.5}
                  />
                </button>
              );
            })}
          </div>

          {rating > 0 && (
            <div className="ff-fade-in mt-4 space-y-3">
              <div className="flex flex-wrap gap-1.5 justify-center">
                {REASONS.map((r) => {
                  const on = picked.includes(r);
                  return (
                    <button
                      key={r}
                      onClick={() => toggle(r)}
                      className={clsx(
                        "text-xs font-semibold px-3 py-1.5 rounded-full transition-colors",
                        on
                          ? "bg-white text-ink-900"
                          : "bg-white/15 backdrop-blur text-white hover:bg-white/25"
                      )}
                    >
                      {on && "✓ "}
                      {r}
                    </button>
                  );
                })}
              </div>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                placeholder={
                  rating >= 4
                    ? "Anything you loved?"
                    : "What can we do better next time?"
                }
                className="w-full px-3 py-2.5 rounded-xl bg-white/15 backdrop-blur border border-white/25 text-sm placeholder:text-white/70 text-white focus:border-white/60 focus:ring-2 focus:ring-white/30 focus:outline-none resize-none"
              />

              <button
                onClick={submit}
                disabled={saving}
                className="w-full h-12 rounded-2xl bg-white text-ink-900 font-bold flex items-center justify-center gap-2 hover:bg-white/95 active:scale-[0.99] transition-all disabled:opacity-70"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting…
                  </>
                ) : (
                  <>Submit {rating}★ review</>
                )}
              </button>
            </div>
          )}

          {rating === 0 && (
            <p className="text-center text-[11px] text-white/85 mt-4 font-medium">
              Tap a star to start · it takes 30 seconds
            </p>
          )}

          <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between text-[11px] text-white/85">
            <Link
              href={`/qr/order/${order.id}`}
              className="inline-flex items-center gap-0.5 hover:text-white"
            >
              View receipt
              <ChevronRight className="w-3 h-3" />
            </Link>
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="hover:text-white font-medium"
              >
                Maybe later
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
