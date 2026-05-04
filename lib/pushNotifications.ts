"use client";

import { api } from "./api";
import { unlockAudioOutput } from "./notificationSound";

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/**
 * Subscribe this browser to web push and register with the API.
 * Must be called from a user gesture for permission prompt to appear reliably.
 */
export async function subscribeToPushNotifications(): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) {
    return { ok: false, error: "Push is not supported in this browser" };
  }

  const perm = await Notification.requestPermission();
  if (perm !== "granted") {
    return { ok: false, error: "Notification permission denied" };
  }

  const reg = await navigator.serviceWorker.ready;
  const { key } = await api.get<{ key: string | null }>("/api/push/vapid-public-key");
  if (!key) {
    return { ok: false, error: "Push is not configured on the server (missing VAPID keys)" };
  }

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
  }

  await api.post("/api/push/subscribe", { subscription: sub.toJSON() });
  await unlockAudioOutput();
  return { ok: true };
}

/**
 * If permission is already granted (e.g. user enabled earlier), sync subscription to server.
 */
export async function syncPushSubscriptionIfGranted(): Promise<void> {
  if (!pushSupported()) return;
  if (Notification.permission !== "granted") return;

  try {
    const reg = await navigator.serviceWorker.ready;
    const { key } = await api.get<{ key: string | null }>("/api/push/vapid-public-key");
    if (!key) return;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
    }
    await api.post("/api/push/subscribe", { subscription: sub.toJSON() });
    await unlockAudioOutput();
  } catch {
    // ignore — user may be offline or token expired
  }
}
