// Pure, deterministic sand-layer logic for dig, pile and flatten. No three.js, DOM or cannon: importable in Node tests.
// Units are centimetres (integers). Effective height = base + delta. Sand is conserved: the sum of all
// cell deltas plus all players' carried sand is always 0.

export const MIN_DELTA = -150; // deepest hole, cm below the base terrain
export const MAX_DELTA = 150; // tallest pile, cm above the base terrain
export const CARRY_MAX = 1600; // sand bucket size, cm-units: about 13 digs, so it never feels like a chore
export const FULL_MARGIN = 20; // a bucket with less room than this counts as full
export const CENTER_CM = 40; // sand moved from/to the target cell
export const RING_CM = 20; // sand moved from/to each of the 8 neighbours
export const RIM_CM = 5; // dig: sand pushed onto each of the 16 outer cells (the raised rim); pile: the soft skirt
export const RATE_TICKS = 2; // at least 2 ticks (200 ms) between a player's edits: 5 per second
export const EDIT_MIN_CM = -120; // base height range (cm) that counts as beach/shallows
export const EDIT_MAX_CM = 160;
export const FLATTEN_MIN_H = -300; // accepted target heights for flatten, cm
export const FLATTEN_MAX_H = 800;
const OPS = new Set(['dig', 'pile', 'flatten']);

// 5x5 brush in the fixed order cells are processed: centre, then the 3x3 ring, then the outer ring (di-major, dj-minor).
export const BRUSH = [{ di: 0, dj: 0, ring: 0, cm: CENTER_CM }];
for (const ring of [1, 2])
  for (let di = -2; di <= 2; di++)
    for (let dj = -2; dj <= 2; dj++)
      if (Math.max(Math.abs(di), Math.abs(dj)) === ring) BRUSH.push({ di, dj, ring, cm: ring === 1 ? RING_CM : RIM_CM });

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
  const roomOf = (p) => CARRY_MAX - getCarry(p);
  const playerIds = () => [...new Set([...carry.keys(), ...last.keys()])].sort();
  let lastCells = [];

  // Cells [index, signed cm] an op would change (positive adds sand to the cell), given current state. Never
  // mutates. The sum of the signed amounts is exactly the sand leaving the bucket.
  function plan(op, i, j, p, h) {
    const cells = [];
    const cellOf = (b) => {
      const ci = i + b.di,
        cj = j + b.dj;
      if (ci < 1 || cj < 1 || ci > n - 2 || cj > n - 2) return -1;
      const idx = ci * n + cj;
      return mask[idx] ? idx : -1;
    };
    if (op === 'dig') {
      let room = roomOf(p);
      let removed = 0;
      for (const b of BRUSH) {
        if (b.ring > 1) break;
        const idx = cellOf(b);
        if (idx < 0) continue;
        const amt = Math.min(b.cm, delta[idx] - MIN_DELTA, room);
        if (amt <= 0) continue;
        room -= amt;
        removed += amt;
        cells.push([idx, -amt]);
      }
      let budget = removed >> 1; // up to half of what was dug goes onto the rim, the rest into the bucket
      for (const b of BRUSH) {
        if (b.ring < 2 || budget <= 0) continue;
        const idx = cellOf(b);
        if (idx < 0) continue;
        const amt = Math.min(b.cm, MAX_DELTA - delta[idx], budget);
        if (amt <= 0) continue;
        budget -= amt;
        cells.push([idx, amt]);
      }
    } else if (op === 'pile') {
      let avail = getCarry(p);
      for (const b of BRUSH) {
        const idx = cellOf(b);
        if (idx < 0) continue;
        const amt = Math.min(b.cm, MAX_DELTA - delta[idx], avail);
        if (amt <= 0) continue;
        avail -= amt;
        cells.push([idx, amt]);
      }
    } else {
      // flatten: the 3x3 moves toward height h (cm). High cells give to the bucket first, then low cells take.
      let room = roomOf(p);
      let avail = getCarry(p);
      const low = [];
      for (const b of BRUSH) {
        if (b.ring > 1) break;
        const idx = cellOf(b);
        if (idx < 0) continue;
        const eff = base[idx] + delta[idx];
        if (eff > h) {
          const amt = Math.min(b.cm, eff - h, delta[idx] - MIN_DELTA, room);
          if (amt <= 0) continue;
          room -= amt;
          avail += amt;
          cells.push([idx, -amt]);
        } else if (eff < h) low.push([idx, b.cm, h - eff]);
      }
      for (const [idx, cm, gap] of low) {
        const amt = Math.min(cm, gap, MAX_DELTA - delta[idx], avail);
        if (amt <= 0) continue;
        avail -= amt;
        cells.push([idx, amt]);
      }
    }
    return cells;
  }

  // Returns null if the edit is acceptable, else a short reason. Host-side check.
  function check(edit, tick) {
    const { op, i, j, p, h } = edit;
    if (!OPS.has(op)) return 'op';
    if (!Number.isInteger(i) || !Number.isInteger(j)) return 'int';
    if (op === 'flatten' && !(Number.isInteger(h) && h >= FLATTEN_MIN_H && h <= FLATTEN_MAX_H)) return 'int';
    if (i < 1 || j < 1 || i > n - 2 || j > n - 2) return 'range';
    if (typeof p !== 'string' || !p || p.length > 64) return 'player';
    const c = i * n + j;
    if (!mask[c]) return 'not-sand';
    const lastTick = Math.max(last.get(p) ?? -1e9, pending.get(p) ?? -1e9);
    if (tick - lastTick < RATE_TICKS) return 'rate';
    if (op === 'dig' && roomOf(p) < FULL_MARGIN) return 'bucket-full';
    if (op === 'pile' && getCarry(p) <= 0) return 'no-carry';
    if (plan(op, i, j, p, h).length === 0) {
      if (op === 'dig' && delta[c] <= MIN_DELTA) return 'too-deep';
      if (op === 'pile' && delta[c] >= MAX_DELTA) return 'too-high';
      if (op === 'flatten' && getCarry(p) <= 0 && base[c] + delta[c] < h) return 'no-carry';
      return 'nothing-to-move';
    }
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
    // [index, signed cm] pairs changed by the most recent apply (a render/fx hook; not part of the synced state).
    lastCells: () => lastCells,
    // Host validation hook. Records the tick so two edits in one tick can't both pass.
    validate(edit, ctx) {
      if (check(edit, ctx.tick)) return false;
      pending.set(edit.p, ctx.tick);
      return true;
    },
    // Deterministic apply. Re-plans against current state so it never breaks conservation, even if
    // earlier queued edits changed the cells since validation. Returns the changed cell indices.
    apply(edit, tick) {
      const cells = plan(edit.op, edit.i, edit.j, edit.p, edit.h);
      let net = 0;
      for (const [idx, d] of cells) {
        delta[idx] += d;
        net += d;
      }
      carry.set(edit.p, getCarry(edit.p) - net);
      last.set(edit.p, tick);
      lastCells = cells;
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
