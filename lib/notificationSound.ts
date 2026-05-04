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

export type NotificationLevel = "info" | "success" | "warn" | "error";

let lastBeepAt = 0;

/** Avoid double chirp when both socket + push fire for the same event. */
export async function playNotificationBeepDebounced(
  level: NotificationLevel = "info"
): Promise<void> {
  const now = Date.now();
  if (now - lastBeepAt < 450) return;
  lastBeepAt = now;
  await playNotificationBeep(level);
}

// Per-level voicing. Square waves cut through ambient noise better than sines —
// kitchens, dining rooms — but we keep `info` softer so the bell isn't fatiguing
// for low-stakes events.
const VOICING: Record<
  NotificationLevel,
  {
    tones: { freq: number; durMs: number }[]; // each tone plays in sequence
    repeats: number; // whole sequence is repeated this many times
    gapMs: number; // silence between repeats
    gain: number; // peak gain (0..1)
    wave: OscillatorType;
  }
> = {
  info: {
    tones: [{ freq: 920, durMs: 220 }],
    repeats: 1,
    gapMs: 0,
    gain: 0.18,
    wave: "sine",
  },
  success: {
    tones: [
      { freq: 740, durMs: 130 },
      { freq: 1100, durMs: 220 },
    ],
    repeats: 1,
    gapMs: 0,
    gain: 0.22,
    wave: "sine",
  },
  warn: {
    tones: [
      { freq: 1040, durMs: 180 },
      { freq: 780, durMs: 260 },
    ],
    repeats: 2,
    gapMs: 140,
    gain: 0.42,
    wave: "square",
  },
  error: {
    tones: [
      { freq: 1200, durMs: 160 },
      { freq: 880, durMs: 160 },
      { freq: 1200, durMs: 240 },
    ],
    repeats: 3,
    gapMs: 120,
    gain: 0.55,
    wave: "square",
  },
};

export async function playNotificationBeep(
  level: NotificationLevel = "info"
): Promise<void> {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") await ctx.resume();

    const v = VOICING[level] ?? VOICING.info;
    let cursor = ctx.currentTime;

    for (let i = 0; i < v.repeats; i++) {
      for (const tone of v.tones) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = v.wave;
        o.frequency.value = tone.freq;
        // Quick attack, exponential decay — avoids the click on hard cut-off
        // and gives the chime a more "alert" feel than a flat envelope.
        const dur = tone.durMs / 1000;
        g.gain.setValueAtTime(0.0001, cursor);
        g.gain.exponentialRampToValueAtTime(v.gain, cursor + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, cursor + dur);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(cursor);
        o.stop(cursor + dur);
        cursor += dur;
      }
      if (i < v.repeats - 1) cursor += v.gapMs / 1000;
    }
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
