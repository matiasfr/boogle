// Pure helpers for the cosmetic social messages (ping and honk): validation, per-sender rate limits, the honk
// pitch table and the "three honks within a second make a chord" detector. No DOM, no randomness, runs in Node tests.

export const PING_KINDS = { ball: 'Ball!', look: 'Look!' };
const BOUND = 255; // map half-size in metres (HALF in src/constants.js)

// Returns a clean { x, y, z, k } or null. Anything unexpected is rejected, never trusted.
export function validatePing(msg) {
  if (!msg || typeof msg !== 'object' || msg.t !== 'ping') return null;
  const { x, y, z, k } = msg;
  if (![x, y, z].every((n) => typeof n === 'number' && Number.isFinite(n))) return null;
  if (Math.abs(x) > BOUND || Math.abs(z) > BOUND || y < -30 || y > 80) return null;
  if (typeof k !== 'string' || !Object.hasOwn(PING_KINDS, k)) return null;
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, z: Math.round(z * 10) / 10, k };
}

// At most `max` events per sender within `windowMs`. allow() records the event when it passes.
export function createLimiter(max, windowMs) {
  const seen = new Map();
  return {
    allow(id, now) {
      const list = (seen.get(id) ?? []).filter((t) => now - t < windowMs);
      const ok = list.length < max;
      if (ok) list.push(now);
      seen.set(id, list);
      return ok;
    },
    forget(id) {
      seen.delete(id);
    },
  };
}

// Major pentatonic from C4 across the eight player colours (semitones 0 2 4 7 9 12 14 16): any mix of players sounds
// consonant. A table, not 2 ** (s / 12), so src/sim/ stays free of browser-rounded math.
const PENTATONIC_HZ = [261.63, 293.67, 329.63, 392.0, 440.01, 523.26, 587.34, 659.27];
export function honkFreq(colorIdx) {
  return PENTATONIC_HZ[Number.isInteger(colorIdx) ? ((colorIdx % 8) + 8) % 8 : 0];
}

// Feed every honk (ours and received) to add(id, now). When `min` different players honked within `windowMs`, it
// returns their ids once (then needs fresh honks and waits out a short cooldown); otherwise null.
export function createChordDetector({ windowMs = 1000, min = 3, cooldownMs = 1200 } = {}) {
  const last = new Map();
  let firedAt = -1e9;
  return {
    add(id, now) {
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
