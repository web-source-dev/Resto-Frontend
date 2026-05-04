"use client";

import { useEffect } from "react";
import { useSocketEvent } from "@/lib/SocketProvider";
import {
  notificationSoundEnabled,
  playNotificationBeepDebounced,
  unlockAudioOutput,
} from "@/lib/notificationSound";

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
      if (e.data?.type !== "ff-push-received") return;
      if (!notificationSoundEnabled()) return;
      void playNotificationBeepDebounced();
    }
    window.addEventListener("message", onWindowMessage);
    return () => window.removeEventListener("message", onWindowMessage);
  }, []);

  useSocketEvent("notification:new", () => {
    if (!notificationSoundEnabled()) return;
    if (typeof document !== "undefined" && document.hidden) return;
    void playNotificationBeepDebounced();
  });

  return null;
}
