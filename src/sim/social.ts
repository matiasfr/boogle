// Pure helpers for the cosmetic social messages (ping and honk): validation, per-sender rate limits, the honk
// pitch table and the "three honks within a second make a chord" detector. No DOM, no randomness, runs in Node tests.

export const PING_KINDS = { ball: 'Ball!', look: 'Look!' };
const BOUND = 255; // map half-size in metres (HALF in src/constants.js)

// Returns a clean { x, y, z, k } or null. Anything unexpected is rejected, never trusted.
export type Ping = { x: number; y: number; z: number; k: keyof typeof PING_KINDS };
export function validatePing(msg: unknown): Ping | null {
  if (!msg || typeof msg !== 'object' || (msg as { t?: unknown }).t !== 'ping') return null;
  const { x, y, z, k } = msg as Record<string, unknown>;
  if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') return null;
  if (![x, y, z].every((n) => Number.isFinite(n))) return null;
  if (Math.abs(x) > BOUND || Math.abs(z) > BOUND || y < -30 || y > 80) return null;
  if (typeof k !== 'string' || !Object.hasOwn(PING_KINDS, k)) return null;
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, z: Math.round(z * 10) / 10, k: k as Ping['k'] };
}

// At most `max` events per sender within `windowMs`. allow() records the event when it passes.
export function createLimiter(max: number, windowMs: number) {
  const seen = new Map<string, number[]>();
  return {
    allow(id: string, now: number) {
      const list = (seen.get(id) ?? []).filter((t) => now - t < windowMs);
      const ok = list.length < max;
      if (ok) list.push(now);
      seen.set(id, list);
      return ok;
    },
  };
}

// Major pentatonic from C4 across the eight player colours (semitones 0 2 4 7 9 12 14 16): any mix of players sounds
// consonant. A table, not 2 ** (s / 12), so src/sim/ stays free of browser-rounded math.
const PENTATONIC_HZ = [261.63, 293.67, 329.63, 392.0, 440.01, 523.26, 587.34, 659.27];
export function honkFreq(colorIdx: number) {
  return PENTATONIC_HZ[Number.isInteger(colorIdx) ? ((colorIdx % 8) + 8) % 8 : 0];
}

// Feed every honk (ours and received) to add(id, now). When `min` different players honked within `windowMs`, it
// returns their ids once (then needs fresh honks and waits out a short cooldown); otherwise null.
export function createChordDetector({ windowMs = 1000, min = 3, cooldownMs = 1200 } = {}) {
  const last = new Map<string, number>();
  let firedAt = -1e9;
  return {
    add(id: string, now: number) {
      last.set(id, now);
      for (const [k, t] of last) if (now - t > windowMs) last.delete(k);
      if (last.size < min || now - firedAt < cooldownMs) return null;
      const ids = [...last.keys()];
      last.clear();
      firedAt = now;
      return ids;
    },
  };
}
