"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, X } from "lucide-react";
import { useAuth } from "@dinova/lib/AuthProvider";
import {
  pushSupported,
  subscribeToPushNotifications,
  syncPushSubscriptionIfGranted,
} from "@dinova/lib/pushNotifications";
import { useToast } from "./Toaster";

const DISMISS_KEY = "ff_push_banner_dismissed_session";

export function PushNotificationPrompt() {
  const { user } = useAuth();
  const toast = useToast();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const refreshState = useCallback(async () => {
    if (!pushSupported() || !user) {
      setVisible(false);
      return;
    }
    try {
      if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(DISMISS_KEY) === "1") {
        setVisible(false);
        return;
      }
      const perm = Notification.permission;
      await navigator.serviceWorker.ready;

      if (perm === "denied") {
        setVisible(false);
        return;
      }

      if (perm === "granted") {
        await syncPushSubscriptionIfGranted();
        setVisible(false);
        return;
      }

      // default — show banner until user enables or dismisses
      if (sessionStorage.getItem(DISMISS_KEY) !== "1") {
        setVisible(true);
      }
    } catch {
      setVisible(false);
    }
  }, [user]);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  async function enable() {
    setBusy(true);
    try {
      const res = await subscribeToPushNotifications();
      if (!res.ok) {
        toast(res.error ?? "Could not enable push", "error");
        return;
      }
      toast("Push alerts enabled — you’ll get notifications even when this tab is closed", "success");
      setVisible(false);
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "Push failed", "error");
    } finally {
      setBusy(false);
      refreshState();
    }
  }

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!user || !visible || !pushSupported()) return null;

  return (
    <div className="border-b border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-2.5">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-2 sm:items-center">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-amber-200/80">
            <Bell className="h-4 w-4 text-amber-700" />
          </span>
          <p className="text-sm text-ink-800">
            <span className="font-semibold text-ink-900">Turn on push alerts</span>
            {" · "}
            Get instant notifications with sound when orders or kitchen events happen — works even when Dinova is closed.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={enable}
            disabled={busy}
            className="rounded-lg bg-ink-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-ink-800 disabled:opacity-60"
          >
            {busy ? "Opening prompt…" : "Enable notifications"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex items-center gap-1 rounded-lg border border-ink-200/80 bg-white px-2 py-1.5 text-xs font-medium text-ink-600 hover:bg-ink-50"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
