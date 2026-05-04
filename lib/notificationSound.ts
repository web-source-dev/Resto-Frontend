"use client";

let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (sharedCtx) return sharedCtx;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  sharedCtx = new AC();
  return sharedCtx;
}

/** Call once after a user gesture (e.g. enabled push / any click) so beeps can play later. */
export async function unlockAudioOutput(): Promise<void> {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") await ctx.resume();
  } catch {
    /* autoplay policy */
  }
}

/** Short beep when a notification arrives while the app tab is open (socket). */
let lastBeepAt = 0;

/** Avoid double chirp when both socket + push fire for the same event. */
export async function playNotificationBeepDebounced(): Promise<void> {
  const now = Date.now();
  if (now - lastBeepAt < 450) return;
  lastBeepAt = now;
  await playNotificationBeep();
}

export async function playNotificationBeep(): Promise<void> {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") await ctx.resume();

    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 920;
    o.type = "sine";
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
    o.start();
    o.stop(ctx.currentTime + 0.22);
  } catch {
    /* unsupported / blocked */
  }
}

const STORAGE_KEY = "ff_notification_sound";

export function notificationSoundEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}

export function setNotificationSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}
