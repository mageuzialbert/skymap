// Lightweight notification chime synthesized with the Web Audio API - no audio
// asset to ship. Plays a short, pleasant two-tone "ding".

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    if (!audioCtx) audioCtx = new Ctor();
    return audioCtx;
  } catch {
    return null;
  }
}

function tone(ctx: AudioContext, freq: number, start: number, duration: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(ctx.destination);

  const t0 = ctx.currentTime + start;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(0.18, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.start(t0);
  osc.stop(t0 + duration);
}

/** Play the incoming-message chime. Safe to call anytime; no-op if unsupported. */
export function playChime() {
  const ctx = getCtx();
  if (!ctx) return;
  // Browsers may start the context suspended until a user gesture.
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  tone(ctx, 880, 0, 0.18); // A5
  tone(ctx, 1320, 0.12, 0.22); // E6
}
