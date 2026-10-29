// Prototype flags: which experimental features are on, as a room-wide bitmask. Pure (no DOM), so it can be tested.
// The host's URL decides; the value travels in the `proto` state so every tab gates the same features.
//   ?proto=0          all off (vanilla Boogle)
//   ?off=feel,gulls   listed features off

// Append only: a flag's bit is its index.
export const FLAGS = ['feel', 'fish', 'gulls', 'fireflies', 'shadows'];
export const ALL = (1 << FLAGS.length) - 1;

export function parseFlags(search) {
  const q = new URLSearchParams(search);
  let mask = ALL;
  if (q.get('proto') === '0') mask = 0;
  for (const name of (q.get('off') ?? '').split(',')) {
    const k = FLAGS.indexOf(name.trim());
    if (k >= 0) mask &= ~(1 << k);
  }
  return { mask };
}

export const bit = (name) => 1 << FLAGS.indexOf(name);

export function createProtoState(init = { mask: ALL }) {
  const s = { mask: init.mask & ALL };
  return {
    s,
    on: (name) => (s.mask & bit(name)) !== 0,
    set(v) {
      s.mask = v.mask & ALL;
    },
    serialize: () => ({ m: s.mask }),
    load(json) {
      if (Number.isInteger(json?.m)) s.mask = json.m & ALL;
    },
    hash: () => Math.imul((s.mask + 1) ^ 0x9e3779b1, 16777619) >>> 0,
  };
}
