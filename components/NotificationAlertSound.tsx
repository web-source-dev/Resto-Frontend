"use client";

import { useEffect } from "react";
import { useSocketEvent } from "@dinova/lib/SocketProvider";
import {
  notificationSoundEnabled,
  playNotificationBeepDebounced,
  unlockAudioOutput,
  type NotificationLevel,
} from "@dinova/lib/notificationSound";

const VALID_LEVELS: ReadonlySet<NotificationLevel> = new Set([
  "info",
  "success",
  "warn",
  "error",
]);

function coerceLevel(v: unknown): NotificationLevel {
  return typeof v === "string" && VALID_LEVELS.has(v as NotificationLevel)
    ? (v as NotificationLevel)
    : "info";
}

/**
 * When the backend emits `notification:new`, play a short sound if the tab is open.
 * OS push + SW handles sound when the app is in background (silent: false on notification).
 */
export function NotificationAlertSound() {
  useEffect(() => {
    function prime() {
      void unlockAudioOutput();
    }
    window.addEventListener("pointerdown", prime, { passive: true });
    window.addEventListener("keydown", prime);
    return () => {
      window.removeEventListener("pointerdown", prime);
      window.removeEventListener("keydown", prime);
    };
  }, []);

  useEffect(() => {
    function onWindowMessage(e: MessageEvent) {
      if (e.data?.type !== "dinova-push-received") return;
      if (!notificationSoundEnabled()) return;
      void playNotificationBeepDebounced(coerceLevel(e.data?.level));
    }
    window.addEventListener("message", onWindowMessage);
    return () => window.removeEventListener("message", onWindowMessage);
  }, []);

  useSocketEvent<{ level?: string }>("notification:new", (payload) => {
    if (!notificationSoundEnabled()) return;
    if (typeof document !== "undefined" && document.hidden) return;
    void playNotificationBeepDebounced(coerceLevel(payload?.level));
  });

  return null;
}
