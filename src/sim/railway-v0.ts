// Frozen playable railway v0 at 3e37f124, only for the one server recovery migration.
// Keep load, replay, serialization and hash semantics unchanged; this is not a second live simulation.
import { FNV_SEED, foldStr } from './hash.ts';
import { MAX_PLAYERS, okPid } from './roster.ts';
import { RAILWAY_CATALOG, RAILWAY_SOURCES, RAILWAY_SUPPLY, RAILWAY_T1 as T1 } from './railway-layout.ts';

export const RAILWAY_OUTCOMES = 64;
export const RAILWAY_WINDOW = 8;
export const RAILWAY_PILES = 128;
export const RAILWAY_MAX_INT = 2147483647;
export const RAILWAY_MAX_MARKER = Number.MAX_SAFE_INTEGER;
export const RAILWAY_DURATION = T1.depositTicks + T1.feedTicks + T1.layTicks;
export type RailAccount = { pid: string; carry: number; epoch: number; request: number };
export type RailPile = { id: number; x: number; z: number; n: number; y?: number };
export type RailResult = {
  pid: string;
  epoch: number;
  request: number;
  status: 'accepted' | 'noop' | 'rejected' | 'snapshot-required';
  accepted: number;
};
export type Railway = {
  catalog: number;
  sources: number[];
  work: number[];
  accounts: RailAccount[];
  piles: RailPile[];
  outcomes: RailResult[];
  nextPile: number;
  awake: number;
  stock: number;
  allocation: number;
  used: number;
  delivered: number;
  start: number;
  elapsed: number;
  lastTick: number;
  resumeMarker: number;
  completion: number;
  /** Playable namespace only: accepted collision presentation, independent of material balances. */
  falls?: { yaw: number[]; collapsed: boolean[] };
};
export type RailRequest = { epoch: number; request: number };
export type RailwayJSON = Omit<Railway, 'accounts' | 'piles' | 'outcomes' | 'sources' | 'work' | 'falls'> & {
  sources: string;
  work: string;
  accounts: [pid: string | number, carry: number, epoch: string, request: string][];
  piles: [id: number, x: number, z: number, n: number, y?: number][];
  outcomes: [account: number, epoch: string, request: string, status: number, accepted: number][];
  falls?: { yaw: string; collapsed: string };
};
export type RailAction = RailRequest & {
  op: string;
  id?: number;
  n?: number;
  x?: number;
  z?: number;
  y?: number;
  yaw?: number;
  collapsed?: boolean;
};
export const railInt = (v: unknown, max = RAILWAY_MAX_INT, min = 0): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max && !Object.is(v, -0);
export const railYaw = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 6.283185307179586 && !Object.is(v, -0);
export function createRailway(playable = false): Railway {
  return {
    catalog: RAILWAY_CATALOG,
    sources: RAILWAY_SOURCES.map(() => T1.sourceYield),
    work: RAILWAY_SOURCES.map(() => 0),
    accounts: [],
    piles: [],
    outcomes: [],
    nextPile: 1,
    awake: -1,
    stock: 0,
    allocation: 0,
    used: 0,
    delivered: 0,
    start: -1,
    elapsed: 0,
    lastTick: 0,
    resumeMarker: 0,
    completion: 0,
    ...(playable ? { falls: { yaw: RAILWAY_SOURCES.map(() => 0), collapsed: RAILWAY_SOURCES.map(() => false) } } : {}),
  };
}
export const railAccount = (s: Railway, pid: string) => s.accounts.find((a) => a.pid === pid);
export const railSource = (id: number) => RAILWAY_SOURCES.findIndex((row) => row[0] === id);
export function railSession(s: Railway, pid: string, epoch: number): boolean {
  if (!okPid(pid) || !railInt(epoch, RAILWAY_MAX_INT, 1)) return false;
  const old = railAccount(s, pid);
  if (old) {
    if (epoch !== old.epoch + 1) return false;
    old.epoch = epoch;
    old.request = 0;
  } else {
    if (epoch !== 1 || s.accounts.length >= MAX_PLAYERS) return false;
    s.accounts.push({ pid, carry: 0, epoch, request: 0 });
  }
  return true;
}
export function railOutcome(s: Railway, pid: string, epoch: number, request: number): RailResult | null {
  const old = s.outcomes.find((r) => r.pid === pid && r.epoch === epoch && r.request === request);
  if (old) return { ...old };
  const a = railAccount(s, pid);
  if (!a || epoch !== a.epoch || request <= a.request)
    return { pid, epoch, request, status: 'snapshot-required', accepted: 0 };
  return null;
}
function remember(s: Railway, a: RailAccount, e: RailRequest, accepted: number, rejected = false): RailResult {
  a.request = e.request;
  const r: RailResult = {
    pid: a.pid,
    epoch: e.epoch,
    request: e.request,
    status: rejected ? 'rejected' : accepted ? 'accepted' : 'noop',
    accepted,
  };
  s.outcomes.push(r);
  if (s.outcomes.length > RAILWAY_OUTCOMES) s.outcomes.shift();
  return { ...r };
}
/** All transfers recheck capacity at application, after preceding edits in the same tick. */
export function railApply(s: Railway, pid: string, e: RailAction, tick: number): RailResult {
  const previous = railOutcome(s, pid, e.epoch, e.request);
  if (previous) return previous;
  const a = railAccount(s, pid)!;
  let n = 0;
  if (e.op === 'rail.wake' && s.awake < 0) {
    s.awake = tick;
    n = 1;
  }
  if (e.op === 'rail.chop' && s.awake >= 0 && tick >= s.awake + T1.wakeTicks) {
    const k = railSource(e.id!);
    if (k >= 0) {
      n = Math.min(T1.strokeYield, s.sources[k]!, T1.carry - a.carry);
      s.sources[k]! -= n;
      if (n) s.work[k] = Math.min(15, s.work[k]! + 3);
      if (n && s.sources[k] === 0 && s.falls) {
        s.falls.yaw[k] = e.yaw!;
        s.falls.collapsed[k] = e.collapsed!;
      }
      a.carry += n;
    }
  }
  if (e.op === 'rail.deposit' && s.awake >= 0 && tick >= s.awake + T1.wakeTicks && s.start < 0) {
    n = Math.min(e.n!, a.carry, T1.bill - s.stock);
    a.carry -= n;
    s.stock += n;
    s.delivered += n;
    if (s.stock === T1.bill) {
      s.stock = 0;
      s.allocation = T1.bill;
      s.start = s.lastTick = tick;
    }
  }
  if (e.op === 'rail.drop') {
    let pile = s.piles.find((p) => p.x === e.x && p.z === e.z && (!s.falls || p.y === e.y) && p.n < T1.carry);
    if (!pile && a.carry > 0 && s.piles.length < RAILWAY_PILES && s.nextPile < RAILWAY_MAX_INT) {
      pile = { id: s.nextPile++, x: e.x!, z: e.z!, n: 0, ...(s.falls ? { y: e.y! } : {}) };
      s.piles.push(pile);
    }
    if (pile) {
      n = Math.min(e.n!, a.carry, T1.carry - pile.n);
      pile.n += n;
      a.carry -= n;
      if (!pile.n) s.piles.splice(s.piles.indexOf(pile), 1);
    }
  }
  if (e.op === 'rail.take') {
    const pile = s.piles.find((p) => p.id === e.id);
    if (pile) {
      n = Math.min(pile.n, T1.carry - a.carry);
      a.carry += n;
      pile.n -= n;
      if (!pile.n) s.piles.splice(s.piles.indexOf(pile), 1);
    }
  }
  return remember(s, a, e, n, e.op === 'rail.reject');
}
export function railTick(s: Railway, tick: number): void {
  if (s.start < 0 || s.completion) return;
  s.elapsed = Math.min(RAILWAY_DURATION, s.elapsed + Math.max(0, tick - s.lastTick));
  s.lastTick = tick;
  const laying = Math.max(0, s.elapsed - T1.depositTicks - T1.feedTicks);
  s.used = Math.min(T1.bill, Math.floor((laying * T1.bill) / T1.layTicks));
  s.allocation = T1.bill - s.used;
  if (s.elapsed === RAILWAY_DURATION) s.completion = 1;
}
export function railResume(s: Railway, ticks: number, marker: number, tick: number): number {
  if (marker <= s.resumeMarker) return 0;
  s.resumeMarker = marker;
  if (s.start < 0 || s.completion) return 0;
  const n = Math.min(ticks, RAILWAY_DURATION - s.elapsed);
  s.elapsed += n;
  railTick(s, tick);
  return n;
}
export function railCounts(s: Railway) {
  const source = s.sources.reduce((a, b) => a + b, 0);
  const carry = s.accounts.reduce((a, b) => a + b.carry, 0);
  const loose = s.piles.reduce((a, b) => a + b.n, 0);
  return {
    source,
    carry,
    loose,
    stock: s.stock,
    allocation: s.allocation,
    used: s.used,
    total: source + carry + loose + s.stock + s.allocation + s.used,
    delivered: s.delivered,
    score: s.delivered * T1.deliveryScore + s.completion * T1.completionScore,
    completion: s.completion,
    starterRails: T1.starterRails,
  };
}
export function railPhase(
  s: Railway,
  tick = s.lastTick,
): 'asleep' | 'waking' | 'idle' | 'deposit' | 'feeding' | 'laying' | 'done' {
  if (s.completion) return 'done';
  if (s.start < 0) return s.awake < 0 ? 'asleep' : tick < s.awake + T1.wakeTicks ? 'waking' : 'idle';
  return s.elapsed < T1.depositTicks ? 'deposit' : s.elapsed < T1.depositTicks + T1.feedTicks ? 'feeding' : 'laying';
}
const TERMINAL = ['accepted', 'noop', 'rejected'] as const;
const counter = (s: unknown): number => {
  if (typeof s !== 'string' || !/^[0-9a-z]{1,6}$/.test(s)) return -1;
  const n = Number.parseInt(s, 36);
  return n.toString(36) === s ? n : -1;
};
// Exact IEEE754 bits avoid retuning tree direction or decimal-width growth. Big-endian is explicit on both ends.
const FALL_BYTES = RAILWAY_SOURCES.length * 8;
function encodeYaws(values: readonly number[]): string {
  const bytes = new Uint8Array(values.length * 8);
  const view = new DataView(bytes.buffer);
  for (let k = 0; k < values.length; k++) view.setFloat64(k * 8, values[k]!, false);
  return btoa(String.fromCharCode(...bytes));
}
function decodeYaws(text: string): number[] {
  const raw = atob(text);
  if (raw.length !== FALL_BYTES || btoa(raw) !== text) throw new Error('railway: noncanonical fall encoding');
  const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
  const view = new DataView(bytes.buffer);
  return RAILWAY_SOURCES.map((_, k) => view.getFloat64(k * 8, false));
}
export const serializeRailway = (s: Railway, rosterPids = s.accounts.map((a) => a.pid)): RailwayJSON => ({
  catalog: s.catalog,
  sources: s.sources.map((v) => v.toString(16)).join(''),
  work: s.work.map((v) => v.toString(16)).join(''),
  accounts: s.accounts.map(({ pid, carry, epoch, request }) => [
    s.falls ? rosterPids.indexOf(pid) : pid,
    carry,
    epoch.toString(36),
    request.toString(36),
  ]),
  piles: s.piles.map(({ id, x, z, n, y }) => (s.falls ? [id, x, z, n, y!] : [id, x, z, n])),
  outcomes: s.outcomes.map(({ pid, epoch, request, status, accepted }) => [
    s.accounts.findIndex((a) => a.pid === pid),
    epoch.toString(36),
    request.toString(36),
    TERMINAL.findIndex((v) => v === status),
    accepted,
  ]),
  nextPile: s.nextPile,
  awake: s.awake,
  stock: s.stock,
  allocation: s.allocation,
  used: s.used,
  delivered: s.delivered,
  start: s.start,
  elapsed: s.elapsed,
  lastTick: s.lastTick,
  resumeMarker: s.resumeMarker,
  completion: s.completion,
  ...(s.falls
    ? { falls: { yaw: encodeYaws(s.falls.yaw), collapsed: s.falls.collapsed.map((v) => (v ? '1' : '0')).join('') } }
    : {}),
});
export const hashRailway = (s: Railway, rosterPids?: string[]): number =>
  foldStr(FNV_SEED, JSON.stringify(serializeRailway(s, rosterPids)));
/** Full-document validation happens in a temporary value; malformed accounts never partially replace live state. */
export function loadRailway(s: Railway, json: unknown, rosterPids: string[] = []): void {
  const j = json as RailwayJSON | null;
  const playable = !!s.falls;
  if (!j || typeof j !== 'object' || Array.isArray(j)) throw new Error('railway: document');
  if (
    typeof j.sources !== 'string' ||
    j.sources.length !== RAILWAY_SOURCES.length ||
    !/^[0-9a]+$/.test(j.sources) ||
    typeof j.work !== 'string' ||
    j.work.length !== RAILWAY_SOURCES.length ||
    !/^[0369cf]+$/.test(j.work)
  )
    throw new Error('railway: source encoding');
  if (
    !Array.isArray(j.accounts) ||
    j.accounts.length > MAX_PLAYERS ||
    j.accounts.some((a) => !Array.isArray(a) || a.length !== 4) ||
    !Array.isArray(j.piles) ||
    j.piles.length > RAILWAY_PILES ||
    j.piles.some((p) => !Array.isArray(p) || p.length !== (playable ? 5 : 4)) ||
    !Array.isArray(j.outcomes) ||
    j.outcomes.length > RAILWAY_OUTCOMES ||
    j.outcomes.some(
      (r) => !Array.isArray(r) || r.length !== 5 || !railInt(r[0], j.accounts.length - 1) || !railInt(r[3], 2),
    )
  )
    throw new Error('railway: rows');
  if (
    playable &&
    (!j.falls ||
      typeof j.falls !== 'object' ||
      Array.isArray(j.falls) ||
      Object.keys(j.falls).sort().join() !== 'collapsed,yaw' ||
      typeof j.falls.yaw !== 'string' ||
      j.falls.yaw.length !== Math.ceil(FALL_BYTES / 3) * 4 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(j.falls.yaw) ||
      typeof j.falls.collapsed !== 'string' ||
      j.falls.collapsed.length !== RAILWAY_SOURCES.length ||
      !/^[01]+$/.test(j.falls.collapsed))
  )
    throw new Error('railway: fall encoding');
  const pidOf = (value: string | number) => {
    if (playable) return railInt(value, rosterPids.length - 1) ? rosterPids[value]! : '';
    return typeof value === 'string' ? value : '';
  };
  const n: Railway = {
    ...j,
    // The temporary state receives decoded values only; no field of the live state is replaced before validation.
    falls: undefined,
    sources: [...j.sources].map((v) => Number.parseInt(v, 16)),
    work: [...j.work].map((v) => Number.parseInt(v, 16)),
    accounts: j.accounts.map(([pid, carry, epoch, request]) => ({
      pid: pidOf(pid),
      carry,
      epoch: counter(epoch),
      request: counter(request),
    })),
    piles: j.piles.map(([id, x, z, n, y]) => ({ id, x, z, n, ...(playable ? { y: y! } : {}) })),
    outcomes: j.outcomes.map(([account, epoch, request, status, accepted]) => ({
      pid: pidOf(j.accounts[account]![0]),
      epoch: counter(epoch),
      request: counter(request),
      status: TERMINAL[status]!,
      accepted,
    })),
  };
  if (playable) n.falls = { yaw: decodeYaws(j.falls!.yaw), collapsed: [...j.falls!.collapsed].map((v) => v === '1') };
  else delete n.falls;
  if (!playable && Object.hasOwn(j, 'falls')) throw new Error('railway: unexpected falls');
  const fresh = createRailway(playable);
  if (Object.keys(n).sort().join() !== Object.keys(fresh).sort().join()) throw new Error('railway: keys');
  if (
    n.catalog !== RAILWAY_CATALOG ||
    !Array.isArray(n.sources) ||
    n.sources.length !== RAILWAY_SOURCES.length ||
    n.sources.some((v) => !railInt(v, T1.sourceYield))
  )
    throw new Error('railway: catalog');
  if (
    !Array.isArray(n.work) ||
    n.work.length !== n.sources.length ||
    n.work.some(
      (v, k) =>
        !railInt(v, 15) ||
        v % 3 !== 0 ||
        T1.sourceYield - n.sources[k]! > (v / 3) * T1.strokeYield ||
        T1.sourceYield - n.sources[k]! < v / 3 ||
        (v === 0) !== (n.sources[k] === T1.sourceYield),
    )
  )
    throw new Error('railway: source work');
  if (
    n.falls &&
    n.falls.yaw.some((yaw, k) => !railYaw(yaw) || (n.sources[k] !== 0 && (yaw !== 0 || n.falls!.collapsed[k])))
  )
    throw new Error('railway: fall state');
  if (
    !Array.isArray(n.accounts) ||
    n.accounts.length > MAX_PLAYERS ||
    new Set(n.accounts.map((a) => a?.pid)).size !== n.accounts.length ||
    n.accounts.some(
      (a) =>
        !a ||
        !okPid(a.pid) ||
        !railInt(a.carry, T1.carry) ||
        !railInt(a.epoch, RAILWAY_MAX_INT, 1) ||
        !railInt(a.request),
    )
  )
    throw new Error('railway: accounts');
  if (
    !railInt(n.nextPile, RAILWAY_MAX_INT, 1) ||
    !Array.isArray(n.piles) ||
    n.piles.length > RAILWAY_PILES ||
    new Set(n.piles.map((p) => p?.id)).size !== n.piles.length ||
    n.piles.some(
      (p) =>
        !p ||
        !railInt(p.id, n.nextPile - 1, 1) ||
        !railInt(p.n, T1.carry, 1) ||
        !railInt(p.x, 200000, -200000) ||
        !railInt(p.z, 200000, -200000) ||
        (playable && !railInt(p.y, 200000, -200000)),
    )
  )
    throw new Error('railway: piles');
  for (const key of ['awake', 'start'] as const)
    if (!railInt(n[key], RAILWAY_MAX_INT, -1)) throw new Error('railway: tick');
  if (n.awake < 0 && n.work.some((v) => v > 0)) throw new Error('railway: sleeping harvest');
  if (!railInt(n.lastTick) || !railInt(n.resumeMarker, RAILWAY_MAX_MARKER)) throw new Error('railway: clock');
  for (const key of ['stock', 'allocation', 'used', 'delivered'] as const)
    if (!railInt(n[key], T1.bill)) throw new Error('railway: bill');
  if (!railInt(n.elapsed, RAILWAY_DURATION) || !railInt(n.completion, 1)) throw new Error('railway: job');
  if (
    n.start < 0
      ? n.allocation !== 0 ||
        n.used !== 0 ||
        n.elapsed !== 0 ||
        n.completion !== 0 ||
        n.stock !== n.delivered ||
        n.stock >= T1.bill
      : n.awake < 0 ||
        n.start < n.awake + T1.wakeTicks ||
        n.lastTick < n.start ||
        n.stock !== 0 ||
        n.delivered !== T1.bill ||
        n.allocation + n.used !== T1.bill ||
        n.used !==
          Math.min(
            T1.bill,
            Math.floor((Math.max(0, n.elapsed - T1.depositTicks - T1.feedTicks) * T1.bill) / T1.layTicks),
          ) ||
        n.completion !== Number(n.elapsed === RAILWAY_DURATION)
  )
    throw new Error('railway: phase');
  if (
    !Array.isArray(n.outcomes) ||
    n.outcomes.length > RAILWAY_OUTCOMES ||
    new Set(n.outcomes.map((r) => `${r?.pid}/${r?.epoch}/${r?.request}`)).size !== n.outcomes.length ||
    n.outcomes.some((r) => {
      const a = r && railAccount(n, r.pid);
      return (
        !a ||
        !railInt(r.epoch, a.epoch, 1) ||
        !railInt(r.request, RAILWAY_MAX_INT, 1) ||
        (r.epoch === a.epoch && r.request > a.request) ||
        !railInt(r.accepted, T1.carry) ||
        !['accepted', 'noop', 'rejected'].includes(r.status) ||
        (r.status === 'accepted') !== r.accepted > 0
      );
    })
  )
    throw new Error('railway: outcomes');
  if (railCounts(n).total !== RAILWAY_SUPPLY) throw new Error('railway: conservation');
  Object.assign(s, n, { sources: [...n.sources], work: [...n.work] });
}
export function railwayInvariant(s: Railway): string | null {
  try {
    const pids = s.accounts.map((a) => a.pid);
    loadRailway(createRailway(!!s.falls), serializeRailway(s, pids), pids);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'railway: invalid';
  }
}
