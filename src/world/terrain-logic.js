// Pure, deterministic sand-layer logic for dig and pile. No three.js, DOM or cannon: importable in Node tests.
// Units are centimetres (integers). Effective height = base + delta. Sand is conserved: the sum of all
// cell deltas plus all players' carried sand is always 0.

export const MIN_DELTA = -150; // deepest hole, cm below the base terrain
export const MAX_DELTA = 150; // tallest pile, cm above the base terrain
export const CARRY_MAX = 200; // sand bucket size, cm-units
export const CENTER_CM = 20; // sand moved from/to the target cell
export const RING_CM = 10; // sand moved from/to each of the 8 neighbours
export const RATE_TICKS = 2; // at least 2 ticks (200 ms) between a player's edits: 5 per second
export const EDIT_MIN_CM = -120; // base height range (cm) that counts as beach/shallows
export const EDIT_MAX_CM = 160;

// Brush cells in the fixed order they are processed: centre first, then di-major, dj-minor.
export const BRUSH = [{ di: 0, dj: 0, cm: CENTER_CM }];
for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) if (di || dj) BRUSH.push({ di, dj, cm: RING_CM });

const mix = (h, x) => Math.imul(h ^ (x | 0), 16777619) >>> 0;
function hashStr(h, s) {
  for (let k = 0; k < s.length; k++) h = mix(h, s.charCodeAt(k));
  return mix(h, 0xff);
}

// base: Int16Array(n*n) of base heights in cm, index i*n+j. editable: optional Uint8Array(n*n) mask.
export function createTerrainState({ base, n, editable }) {
  const delta = new Int16Array(n * n);
  const carry = new Map(); // player -> cm-units in the bucket
  const last = new Map(); // player -> tick of their last applied edit
  const pending = new Map(); // host-only rate bookkeeping between validate and apply; never serialized
  const mask = editable ?? Uint8Array.from(base, (b) => (b >= EDIT_MIN_CM && b <= EDIT_MAX_CM ? 1 : 0));
  const getCarry = (p) => carry.get(p) ?? 0;
  const playerIds = () => [...new Set([...carry.keys(), ...last.keys()])].sort();

  // Cells [index, cm] that an op would change, given current state. Never mutates.
  function plan(op, i, j, p) {
    const cells = [];
    let room = op === 'dig' ? CARRY_MAX - getCarry(p) : getCarry(p);
    for (const b of BRUSH) {
      const ci = i + b.di,
        cj = j + b.dj;
      if (ci < 1 || cj < 1 || ci > n - 2 || cj > n - 2) continue;
      const idx = ci * n + cj;
      if (!mask[idx]) continue;
      const cap = op === 'dig' ? delta[idx] - MIN_DELTA : MAX_DELTA - delta[idx];
      const amt = Math.min(b.cm, cap, room);
      if (amt <= 0) continue;
      room -= amt;
      cells.push([idx, amt]);
    }
    return cells;
  }

  // Returns null if the edit is acceptable, else a short reason. Host-side check.
  function check(edit, tick) {
    const { op, i, j, p } = edit;
    if (op !== 'dig' && op !== 'pile') return 'op';
    if (!Number.isInteger(i) || !Number.isInteger(j)) return 'int';
    if (i < 1 || j < 1 || i > n - 2 || j > n - 2) return 'range';
    if (typeof p !== 'string' || !p || p.length > 64) return 'player';
    if (!mask[i * n + j]) return 'not-sand';
    const lastTick = Math.max(last.get(p) ?? -1e9, pending.get(p) ?? -1e9);
    if (tick - lastTick < RATE_TICKS) return 'rate';
    if (op === 'dig' && getCarry(p) >= CARRY_MAX) return 'bucket-full';
    if (op === 'pile' && getCarry(p) <= 0) return 'no-carry';
    if (plan(op, i, j, p).length === 0) return 'nothing-to-move';
    return null;
  }

  return {
    n,
    base,
    delta,
    mask,
    carryOf: getCarry,
    plan,
    check,
    // Host validation hook. Records the tick so two edits in one tick can't both pass.
    validate(edit, ctx) {
      if (check(edit, ctx.tick)) return false;
      pending.set(edit.p, ctx.tick);
      return true;
    },
    // Deterministic apply. Re-plans against current state so it never breaks conservation, even if
    // earlier queued edits changed the cells since validation. Returns the changed cell indices.
    apply(edit, tick) {
      const cells = plan(edit.op, edit.i, edit.j, edit.p);
      const sign = edit.op === 'dig' ? -1 : 1;
      let moved = 0;
      for (const [idx, amt] of cells) {
        delta[idx] += sign * amt;
        moved += amt;
      }
      carry.set(edit.p, getCarry(edit.p) - sign * moved);
      last.set(edit.p, tick);
      return cells.map((c) => c[0]);
    },
    // JSON-safe: non-zero cells as flat [idx, val, ...], players as sorted [id, carry, lastTick] rows.
    serialize() {
      const d = [];
      for (let k = 0; k < delta.length; k++) if (delta[k]) d.push(k, delta[k]);
      return { d, players: playerIds().map((p) => [p, getCarry(p), last.get(p) ?? -1]) };
    },
    // Replaces everything. Returns every cell index whose delta changed, for the render adapter.
    load(json) {
      const next = new Int16Array(n * n);
      const d = json?.d ?? [];
      for (let k = 0; k + 1 < d.length; k += 2) {
        const idx = d[k];
        if (Number.isInteger(idx) && idx >= 0 && idx < n * n) next[idx] = d[k + 1];
      }
      const changed = [];
      for (let k = 0; k < next.length; k++)
        if (next[k] !== delta[k]) {
          delta[k] = next[k];
          changed.push(k);
        }
      carry.clear();
      last.clear();
      pending.clear();
      for (const [p, c, t] of json?.players ?? []) {
        carry.set(p, c);
        if (t >= 0) last.set(p, t);
      }
      return changed;
    },
    // uint32, independent of Map insertion order and of how the snapshot was serialized.
    hash() {
      let h = 2166136261;
      for (let k = 0; k < delta.length; k++)
        if (delta[k]) {
          h = mix(h, k);
          h = mix(h, delta[k]);
        }
      for (const p of playerIds()) {
        h = hashStr(h, p);
        h = mix(h, getCarry(p));
        h = mix(h, last.get(p) ?? -1);
      }
      return h >>> 0;
    },
  };
}
