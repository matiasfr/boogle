// The roster: every player (pid) a room has seen, with the name and colour they last used, in order of first sight.
// A player's index here is how every other lockstep table stores them (stacks, plaques), so hashes stay integer folds
// and a plaque can still print "Ana" after Ana has gone home. Pure and deterministic (lockstep).

export const MAX_PLAYERS = 256;
export const NAME_MAX = 16;
export const N_COLORS = 8; // src/constants.js COLORS
const PID_RE = /^[a-z0-9]{1,32}$/;
const isInt = Number.isSafeInteger;

export const okPid = (u) => typeof u === 'string' && PID_RE.test(u);

// The lobby's own name rule (src/math.js sanitizeName): no control or format characters, one space at a time, 16 chars.
export function cleanName(s) {
  return String(s ?? '')
    .replace(/[\p{Cc}\p{Cf}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX);
}

export function createRoster() {
  return { pids: [], names: [], colors: [], index: new Map() };
}

export const indexOf = (r, pid) => r.index.get(pid) ?? -1;

// The player's index, adding them if they are new. -1 only when the roster is full (or the pid is malformed).
export function ensure(r, pid) {
  const k = indexOf(r, pid);
  if (k >= 0 || !okPid(pid) || r.pids.length >= MAX_PLAYERS) return k;
  r.pids.push(pid);
  r.names.push('');
  r.colors.push(0);
  r.index.set(pid, r.pids.length - 1);
  return r.pids.length - 1;
}

// Whether `who.set` from pid with this name and colour changes anything (and fits). Spam bound: an unchanged set is
// refused, so a stuck button can't flood the room with no-ops.
export function canSet(r, pid, n, c) {
  if (!okPid(pid) || typeof n !== 'string' || n.length > 64 || !isInt(c) || c < 0 || c >= N_COLORS) return false;
  const name = cleanName(n);
  if (!name) return false;
  const k = indexOf(r, pid);
  if (k < 0) return r.pids.length < MAX_PLAYERS;
  return r.names[k] !== name || r.colors[k] !== c;
}

export function setWho(r, pid, n, c) {
  const k = ensure(r, pid);
  if (k < 0) return null;
  r.names[k] = cleanName(n);
  r.colors[k] = c;
  return { idx: k };
}

// [[pid, name, colour], ...] in index order.
export const serializeRoster = (r) => r.pids.map((p, k) => [p, r.names[k], r.colors[k]]);

export function loadRoster(r, json) {
  if (!Array.isArray(json)) throw new Error('roster: not an array');
  const next = createRoster();
  for (const row of json.slice(0, MAX_PLAYERS)) {
    if (!Array.isArray(row) || !okPid(row[0]) || next.index.has(row[0])) throw new Error('roster: bad row');
    const k = ensure(next, row[0]);
    next.names[k] = cleanName(row[1]);
    next.colors[k] = isInt(row[2]) && row[2] >= 0 && row[2] < N_COLORS ? row[2] : 0;
  }
  Object.assign(r, next);
}

const fold = (h, v) => Math.imul(h ^ v, 16777619) >>> 0;
function foldStr(h, s) {
  for (let k = 0; k < s.length; k++) h = fold(h, s.charCodeAt(k));
  return fold(h, 0x1f);
}
export function hashRoster(r) {
  let h = fold(2166136261, r.pids.length);
  for (let k = 0; k < r.pids.length; k++) h = fold(foldStr(foldStr(h, r.pids[k]), r.names[k]), r.colors[k]);
  return h;
}
