// T1's conserved accounts and bounded request history. Pure Lockstep; no presentation or wall clock.
import { FNV_SEED, foldStr } from './hash.ts';
import { MAX_PLAYERS, okPid } from './roster.ts';
import { RAILWAY_CATALOG, RAILWAY_SOURCES, RAILWAY_SUPPLY, RAILWAY_T1 as T1 } from './railway-layout.ts';
import {
  createRailLine,
  railLineApply,
  railLineTick,
  railJobs,
  railCurrentJob,
  railActiveStation,
  railMaxDuration,
  LINE_TIMING,
  type RailLine,
} from './railway-line.ts';
import {
  saveRailLine,
  loadRailLine,
  validateRailLine,
  packRailFlags,
  unpackRailFlags,
  packRailNibbles,
  unpackRailNibbles,
  packRailTiming,
  unpackRailTiming,
  type RailLineJSON,
} from './railway-line-code.ts';
import { lineSchedule, type LineTiming } from './railway-line-schedule.ts';
import { LINE1_CATALOG, LINE1_STATIONS } from './railway-line-layout.ts';
export {
  railJobs,
  railCurrentJob,
  railActiveJob,
  railActiveStation,
  railMaxDuration,
  railCarry,
  railAxeAvailable,
  railBeamRelease,
  railLineOpen,
  railPanelCount,
  railPanelStock,
} from './railway-line.ts';
import {
  createRailSupply,
  saveRailSupply,
  loadRailSupply,
  RECOVERY_MINUTES,
  type RailSupply,
  type RailSupplyJSON,
} from './railway-supply.ts';

export const RAILWAY_OUTCOMES = 64;
export const RAILWAY_WINDOW = 8;
export const RAILWAY_PILES = 128;
export const RAILWAY_MAX_INT = 2147483647;
export const RAILWAY_MAX_MARKER = Number.MAX_SAFE_INTEGER;
export const RAILWAY_DURATION = T1.depositTicks + T1.feedTicks + T1.layTicks;
export type RailAccount = { pid: string; carry: number; stone?: number; epoch: number; request: number };
export type RailPile = { id: number; x: number; z: number; n: number; kind?: number; y?: number; age?: number };
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
  timing?: LineTiming;
  stoneStock?: number;
  stoneAllocation?: number;
  stoneUsed?: number;
  stoneDelivered?: number;
  line?: RailLine;
  /** Playable namespace only: accepted collision presentation, independent of material balances. */
  falls?: { yaw: number[]; collapsed: boolean[] };
  supply?: RailSupply;
};
export type RailRequest = { epoch: number; request: number };
export type RailwayJSON = Omit<
  Railway,
  'accounts' | 'piles' | 'outcomes' | 'sources' | 'work' | 'falls' | 'supply' | 'line' | 'timing'
> & {
  sources: string;
  work: string;
  accounts: [pid: string | number, carry: number, epoch: string, request?: string][];
  piles: [id: number, x: number, z: number, n: number, y?: number, age?: number][];
  outcomes: [account: number, epoch: string, request: string, status: number, accepted: number][];
  falls?: { yaw: string; collapsed: string };
  supply?: RailSupplyJSON;
  line?: RailLineJSON;
  timing?: number[];
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
  kind?: number;
  station?: string;
  revision?: number;
};
export const railInt = (v: unknown, max = RAILWAY_MAX_INT, min = 0): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max && !Object.is(v, -0);
export const railYaw = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= 6.283185307179586 && !Object.is(v, -0);
export function createRailway(playable = false, line1 = false): Railway {
  return {
    catalog: line1 ? LINE1_CATALOG : RAILWAY_CATALOG,
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
    ...(playable ? { supply: createRailSupply() } : {}),
    ...(line1 ? { line: createRailLine(), timing: { ...LINE_TIMING } } : {}),
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
export function railApply(
  s: Railway,
  pid: string,
  e: RailAction,
  tick: number,
  timing: LineTiming = LINE_TIMING,
): RailResult {
  const previous = railOutcome(s, pid, e.epoch, e.request);
  if (previous) return previous;
  const a = railAccount(s, pid)!;
  if (s.line) return remember(s, a, e, railLineApply(s, a, e, tick, timing), e.op === 'rail.reject');
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
        s.supply!.ages[k] = 0;
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
      pile = { id: s.nextPile++, x: e.x!, z: e.z!, n: 0, ...(s.falls ? { y: e.y!, age: 0 } : {}) };
      s.piles.push(pile);
    }
    if (pile) {
      n = Math.min(e.n!, a.carry, T1.carry - pile.n);
      pile.n += n;
      a.carry -= n;
      if (n && s.supply) pile.age = 0;
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
  if (e.op === 'rail.rackTake' && s.supply) {
    n = Math.min(s.supply.rack, T1.carry - a.carry);
    s.supply.rack -= n;
    a.carry += n;
  }
  return remember(s, a, e, n, e.op === 'rail.reject');
}
export function railTick(s: Railway, tick: number): void {
  if (s.line) return railLineTick(s, tick);
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
  if (s.line) {
    const job = railCurrentJob(s);
    if (job.start < 0 || job.completion) return 0;
    const n = Math.min(ticks, railMaxDuration(s) - job.elapsed);
    job.elapsed += n;
    railLineTick(s, tick);
    return n;
  }
  if (s.start < 0 || s.completion) return 0;
  const n = Math.min(ticks, RAILWAY_DURATION - s.elapsed);
  s.elapsed += n;
  railTick(s, tick);
  return n;
}
export function railCounts(s: Railway) {
  const source = s.sources.reduce((a, b) => a + b, 0) + (s.line?.hardwood.reduce((a, b) => a + b, 0) ?? 0);
  const carry = s.accounts.reduce((a, b) => a + b.carry, 0);
  const loose = s.piles.reduce((a, b) => a + (b.kind === 1 ? 0 : b.n), 0);
  const jobs = railJobs(s);
  const stock = jobs.reduce((n, j) => n + j.stock, 0),
    allocation = jobs.reduce((n, j) => n + j.allocation, 0);
  const used = jobs.reduce((n, j) => n + j.used, 0),
    delivered = jobs.reduce((n, j) => n + j.delivered, 0);
  const completion = jobs.reduce((n, j) => n + j.completion, 0);
  const stone = {
    source: s.line?.rocks.reduce((a, b) => a + b, 0) ?? 0,
    carry: s.accounts.reduce((n, a) => n + (a.stone ?? 0), 0),
    loose: s.piles.reduce((n, p) => n + (p.kind === 1 ? p.n : 0), 0),
    stock: jobs.reduce((n, j) => n + (j.stoneStock ?? 0), 0),
    allocation: jobs.reduce((n, j) => n + (j.stoneAllocation ?? 0), 0),
    used: jobs.reduce((n, j) => n + (j.stoneUsed ?? 0), 0),
    rack: s.line?.stoneRack ?? 0,
    produced: s.line?.stoneProduced ?? 0,
    delivered: jobs.reduce((n, j) => n + (j.stoneDelivered ?? 0), 0),
    total: 0,
  };
  stone.total = stone.source + stone.carry + stone.loose + stone.stock + stone.allocation + stone.used + stone.rack;
  return {
    source,
    carry,
    loose,
    stock,
    allocation,
    used,
    rack: s.supply?.rack ?? 0,
    produced: s.supply?.produced ?? 0,
    total: source + carry + loose + stock + allocation + used + (s.supply?.rack ?? 0),
    delivered,
    score:
      delivered * T1.deliveryScore +
      completion * T1.completionScore +
      stone.delivered * 25 +
      (s.line?.beam.state === 'allocated' || s.line?.beam.state === 'used' ? 1500 : 0),
    completion,
    starterRails: T1.starterRails,
    ...(s.line ? { stone } : {}),
  };
}
export function railPhase(
  s: Railway,
  tick = s.lastTick,
): 'asleep' | 'waking' | 'idle' | 'deposit' | 'feeding' | 'laying' | 'done' {
  if (s.line) {
    const job = railCurrentJob(s);
    if (job.completion) return 'done';
    if (job.start < 0) return s.awake < 0 ? 'asleep' : tick < s.awake + T1.wakeTicks ? 'waking' : 'idle';
    const schedule = lineSchedule(LINE1_STATIONS[railActiveStation(s)]!, job.timing ?? LINE_TIMING);
    const feedEnd = schedule.depositTicks + schedule.feedTicks;
    return job.elapsed < Math.ceil((job.timing ?? LINE_TIMING).depositMs / 100)
      ? 'deposit'
      : job.elapsed < feedEnd
        ? 'feeding'
        : 'laying';
  }
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
  sources: s.line ? packRailNibbles(s.sources) : s.sources.map((v) => v.toString(16)).join(''),
  work: s.line ? packRailNibbles(s.work) : s.work.map((v) => v.toString(16)).join(''),
  accounts: s.accounts.map(({ pid, carry, stone, epoch, request }) =>
    s.line
      ? [rosterPids.indexOf(pid), carry + 9 * (stone ?? 0), `${epoch.toString(36)}.${request.toString(36)}`]
      : [s.falls ? rosterPids.indexOf(pid) : pid, carry, epoch.toString(36), request.toString(36)],
  ),
  piles: s.piles.map(({ id, x, z, n, kind, y, age }) =>
    s.falls ? [id, x, z, n + (s.line ? 9 * (kind ?? 0) : 0), y!, age ?? 0] : [id, x, z, n],
  ),
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
  ...(s.supply ? { supply: saveRailSupply(s.supply) } : {}),
  ...(s.line ? { line: saveRailLine(s.line, rosterPids), timing: packRailTiming(s.timing!) } : {}),
  ...(s.falls
    ? {
        falls: {
          yaw: encodeYaws(s.falls.yaw),
          collapsed: s.line ? packRailFlags(s.falls.collapsed) : s.falls.collapsed.map((v) => (v ? '1' : '0')).join(''),
        },
      }
    : {}),
});
export const hashRailway = (s: Railway, rosterPids?: string[]): number =>
  foldStr(FNV_SEED, JSON.stringify(serializeRailway(s, rosterPids)));
/** Full-document validation happens in a temporary value; malformed accounts never partially replace live state. */
export function loadRailway(s: Railway, json: unknown, rosterPids: string[] = []): void {
  const j = json as RailwayJSON | null;
  const playable = !!s.falls;
  const line1 = !!s.line;
  if (!j || typeof j !== 'object' || Array.isArray(j)) throw new Error('railway: document');
  if (
    typeof j.sources !== 'string' ||
    j.sources.length !== (line1 ? 260 : RAILWAY_SOURCES.length) ||
    !(line1 ? /^[A-Za-z0-9+/]+={0,2}$/ : /^[0-9a]+$/).test(j.sources) ||
    typeof j.work !== 'string' ||
    j.work.length !== (line1 ? 260 : RAILWAY_SOURCES.length) ||
    !(line1 ? /^[A-Za-z0-9+/]+={0,2}$/ : /^[0369cf]+$/).test(j.work)
  )
    throw new Error('railway: source encoding');
  if (
    !Array.isArray(j.accounts) ||
    j.accounts.length > MAX_PLAYERS ||
    j.accounts.some(
      (a) =>
        !Array.isArray(a) ||
        a.length !== (line1 ? 3 : 4) ||
        (line1 && (typeof a[2] !== 'string' || a[2].split('.').length !== 2)),
    ) ||
    !Array.isArray(j.piles) ||
    j.piles.length > RAILWAY_PILES ||
    j.piles.some((p) => !Array.isArray(p) || p.length !== (playable ? 6 : 4)) ||
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
      j.falls.collapsed.length !== (line1 ? 97 : RAILWAY_SOURCES.length) ||
      !(line1 ? /^[0-9a-f]+$/ : /^[01]+$/).test(j.falls.collapsed))
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
    supply: playable ? loadRailSupply(j.supply, line1) : undefined,
    line: line1 ? loadRailLine(j.line, rosterPids) : undefined,
    timing: line1 ? unpackRailTiming(j.timing) : undefined,
    sources: line1 ? unpackRailNibbles(j.sources) : [...j.sources].map((v) => Number.parseInt(v, 16)),
    work: line1 ? unpackRailNibbles(j.work) : [...j.work].map((v) => Number.parseInt(v, 16)),
    accounts: j.accounts.map(([pid, carry, epoch, request]) => ({
      pid: pidOf(pid),
      carry: line1 ? carry % 9 : carry,
      ...(line1 ? { stone: Math.floor(carry / 9) } : {}),
      epoch: counter(line1 ? epoch.split('.')[0]! : epoch),
      request: counter(line1 ? epoch.split('.')[1]! : request!),
    })),
    piles: j.piles.map(([id, x, z, n, y, age]) => ({
      id,
      x,
      z,
      n: line1 ? n % 9 : n,
      ...(line1 ? { kind: Math.floor(n / 9) } : {}),
      ...(playable ? { y: y!, age: age! } : {}),
    })),
    outcomes: j.outcomes.map(([account, epoch, request, status, accepted]) => ({
      pid: pidOf(j.accounts[account]![0]),
      epoch: counter(epoch),
      request: counter(request),
      status: TERMINAL[status]!,
      accepted,
    })),
  };
  if (playable)
    n.falls = {
      yaw: decodeYaws(j.falls!.yaw),
      collapsed: line1
        ? unpackRailFlags(j.falls!.collapsed, RAILWAY_SOURCES.length)
        : [...j.falls!.collapsed].map((v) => v === '1'),
    };
  else {
    delete n.falls;
    delete n.supply;
    if (Object.hasOwn(j, 'supply')) throw new Error('railway: unexpected supply');
  }
  if (!playable && Object.hasOwn(j, 'falls')) throw new Error('railway: unexpected falls');
  if (!line1) {
    if (Object.hasOwn(j, 'line')) throw new Error('railway: unexpected line');
    delete n.line;
    if (Object.hasOwn(j, 'timing')) throw new Error('railway: unexpected timing');
    delete n.timing;
  }
  const fresh = createRailway(playable, line1);
  if (Object.keys(n).sort().join() !== Object.keys(fresh).sort().join()) throw new Error('railway: keys');
  if (
    n.catalog !== (line1 ? LINE1_CATALOG : RAILWAY_CATALOG) ||
    !Array.isArray(n.sources) ||
    n.sources.length !== RAILWAY_SOURCES.length ||
    n.sources.some((v) => !railInt(v, line1 ? 15 : T1.sourceYield))
  )
    throw new Error('railway: catalog');
  if (
    !Array.isArray(n.work) ||
    n.work.length !== n.sources.length ||
    (!line1 &&
      n.work.some(
        (v, k) =>
          !railInt(v, 15) ||
          v % 3 !== 0 ||
          T1.sourceYield - n.sources[k]! > (v / 3) * T1.strokeYield ||
          T1.sourceYield - n.sources[k]! < v / 3 ||
          (v === 0) !== (n.sources[k] === T1.sourceYield),
      ))
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
        (line1 && (!railInt(a.stone, T1.carry) || a.carry + a.stone! > T1.carry)) ||
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
        (line1 && !railInt(p.kind, 1)) ||
        !railInt(p.x, 200000, -200000) ||
        !railInt(p.z, 200000, -200000) ||
        (playable && (!railInt(p.y, 200000, -200000) || !railInt(p.age, RECOVERY_MINUTES))),
    )
  )
    throw new Error('railway: piles');
  for (const key of ['awake', 'start'] as const)
    if (!railInt(n[key], RAILWAY_MAX_INT, -1)) throw new Error('railway: tick');
  if (n.awake < 0 && n.work.some((v) => v > 0)) throw new Error('railway: sleeping harvest');
  if (!railInt(n.lastTick) || !railInt(n.resumeMarker, RAILWAY_MAX_MARKER)) throw new Error('railway: clock');
  for (const key of ['stock', 'allocation', 'used', 'delivered'] as const)
    if (!railInt(n[key], T1.bill)) throw new Error('railway: bill');
  if (!railInt(n.elapsed, line1 ? 100000 : RAILWAY_DURATION) || !railInt(n.completion, 1))
    throw new Error('railway: job');
  if (
    !line1 &&
    (n.start < 0
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
        n.completion !== Number(n.elapsed === RAILWAY_DURATION))
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
  if (n.supply?.ages.some((age, k) => (n.sources[k] !== 0 ? age !== 0 && age !== 35 : age === 35)))
    throw new Error('railway: supply age');
  if (line1) validateRailLine(n);
  if (railCounts(n).total !== RAILWAY_SUPPLY + (line1 ? 30 : 0) + (n.supply?.produced ?? 0))
    throw new Error('railway: conservation');
  Object.assign(s, n, { sources: [...n.sources], work: [...n.work] });
}
export function railwayInvariant(s: Railway): string | null {
  try {
    const pids = s.accounts.map((a) => a.pid);
    loadRailway(createRailway(!!s.falls, !!s.line), serializeRailway(s, pids), pids);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'railway: invalid';
  }
}
