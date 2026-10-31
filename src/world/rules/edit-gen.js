// Shared pieces of the rules modules' edit generators (`export const edits`), which feed the replay test
// (test/world-replay.test.mjs). Never used by the game. `r` is the test's seeded stream:
// { int(lo, hi) inclusive, pick(array), chance(p), next() in [0, 1) }.

// About a fifth of generated edits are junk, to prove validation holds and nothing throws or desyncs.
export const JUNK = 0.2;

// A malformed or out-of-range edit for `op`: wrong types, missing or absurd fields, cells off the grid, oversized
// payloads. JSON-safe (no NaN or Infinity), so it travels like any client's edit.
export function bad(r, op) {
  const i = r.int(-5, 5000),
    j = r.int(-5, 5000);
  switch (r.int(0, 6)) {
    case 0:
      return { op, i: i + 0.5, j };
    case 1:
      return { op, i: String(i), j };
    case 2:
      return { op, i, j: null };
    case 3:
      return { op, i: r.int(0, 408), j: r.int(0, 408) }; // op-specific fields missing
    case 4:
      return { op, i: r.int(0, 408), j: r.int(0, 408), pad: 'x'.repeat(r.int(900, 1200)) }; // over the size cap
    case 5: // every field an op might read, with junk values
      return {
        op,
        i: r.int(0, 408),
        j: r.int(0, 408),
        ...Object.fromEntries(['h', 't', 'd', 'id', 'k', 'y', 'n', 'amt'].map((f) => [f, r.int(-1e6, 1e6)])),
        l: r.chance(0.5) ? [1, 2, 3] : 'x',
      };
    default:
      return { op, i, j, p: 'someone-else', u: 'someone' }; // forged session and player ids (the host overwrites both)
  }
}
