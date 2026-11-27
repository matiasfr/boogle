// Machine-wide, process-owned tickets. Lamport's bakery ordering avoids a stale reaper deleting a new holder's lock.
// Every ticket has a unique name; dead owners can only lose their own ticket. No game/runtime imports.
// Short jobs (stills, scenarios, net tests) go ahead of waiting long playthroughs (`--long`, about half an hour each)
// until a long one has waited BOOGLE_BOT_YIELD_MS (20 minutes). A running job is never interrupted. Tickets from
// older checkouts carry an older `v` (or none); while one is queued everything stays first come, first served, which is
// what those checkouts do too, so both sides agree.
// BOOGLE_BOT_CONCURRENCY allows three runs by default, at most two timed. Still captures, net suites and
// untimed bot segments can use any free slot. Frame-time and perf readings wait for an empty queue and run alone.
// Among runs of the same length, a lower BOOGLE_BOT_RANK (1–3, default 2) goes first, then first come, first served;
// a run that has waited BOOGLE_BOT_RANK_WAIT_MS (30 minutes) counts as rank 1, so a P3 is never starved.
// Only timed and exclusive runs wait when the machine's load (machine-load.ts: 1-minute average, busy CPUs on Windows)
// exceeds BOOGLE_BOT_MAX_LOAD (30; 18 of HOTBOX's 20 busy CPUs; 0 disables the gate). The wait lasts up to
// BOOGLE_BOT_LOAD_WAIT_MS (20 minutes), then the run goes ahead. Every slot records its start load for the verdict.
// The gate applies at acquisition only. Shared runs take an eligible slot at any load.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { loadLimit, machineLoad } from './machine-load.ts';

export type BotClass = 'shared' | 'timed' | 'exclusive';
export const BOT_TICKET_VERSION = 4;

type Ticket = {
  pid: number;
  job: string;
  number: number;
  capacity: number;
  held: boolean;
  v?: number;
  long?: boolean;
  since?: number;
  /** Written with `held`, so a harness that inherits the lease stamps the broker's wait. */
  slot?: Slot;
  /** Older launchers see every new ticket as exclusive because it has no `light` field. */
  kind?: BotClass;
  /** 1–3 (P1 first); absent means 2. */
  rank?: number;
  /** Earlier ticket versions recorded overlap here. */
  shared?: boolean;
};
export function botClass(operation: string, args: readonly string[], long = args.includes('--long')): BotClass {
  if (args.includes('--hardware') || ['perf', 'hitches', 'bench', 'cold-start'].includes(operation)) return 'exclusive';
  const players = args.lastIndexOf('--players');
  const twoPlayers = players >= 0 && Number(args[players + 1]) === 2;
  if (
    long ||
    twoPlayers ||
    ['--real', '--video', '--curves', '--curves-vs', '--target'].some((flag) => args.includes(flag)) ||
    ['boot-time', 'cold-launch', 'clip'].includes(operation)
  )
    return 'timed';
  return 'shared';
}
/** How this process got its slot: what the verdict stamp reports. */
export type Slot = { queueWaitMs: number; loadAtStart: number; loadTimedOut: boolean };
const envNumber = (name: string, fallback: number) => {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value < 0) throw new Error(`${name} must be a number of at least 0`);
  return value;
};
/** BOOGLE_BOT_MAX_LOAD, written for 10 cores, in this machine's units (18 on HOTBOX's 20 logical CPUs): 0 turns the gate off. */
export const maxLoad = () => loadLimit(envNumber('BOOGLE_BOT_MAX_LOAD', 30));
const loadWaitMs = () => envNumber('BOOGLE_BOT_LOAD_WAIT_MS', 20 * 60_000);
/** May a free slot be taken at this load, after waiting `waitedMs` for it to fall? */
export function loadGate(load: number, limit: number, waitedMs: number, maxWaitMs: number) {
  if (limit <= 0 || load <= limit) return 'go';
  return waitedMs >= maxWaitMs ? 'timeout' : 'wait';
}
const loadText = (n: number) => (n >= 10 ? n.toFixed(0) : String(+n.toFixed(2)));
const span = (ms: number) => (ms < 60_000 ? `${Math.ceil(ms / 1000)} s` : `${Math.ceil(ms / 60_000)} min`);
let acquired: Slot | undefined;
let sharedHere = false;
let inheritedFile: string | undefined;
/** The first slot this process acquired (or inherited), if any. */
export const slotRecord = () => acquired;
/** Did another run hold a slot alongside this one? */
export const wasShared = () =>
  sharedHere || (!!inheritedFile && (fs.existsSync(inheritedFile + '.shared') || !!read(inheritedFile)?.shared));
type Filed = Ticket & { file: string };
const yieldMs = Number(process.env.BOOGLE_BOT_YIELD_MS ?? 20 * 60_000);
const rankWaitMs = () => envNumber('BOOGLE_BOT_RANK_WAIT_MS', 30 * 60_000);
/** A waiting long job younger than the yield window; `margin` keeps the two sides from disagreeing at its edge. */
const yielding = (t: Ticket, now: number, margin = 0) =>
  t.v === BOT_TICKET_VERSION && !!t.long && !t.held && now - (t.since ?? 0) < yieldMs - margin;
/** A waiting ticket's rank, 1 once it has waited the rank limit; `margin` as for `yielding`. */
const rankOf = (t: Ticket, now: number, margin = 0) =>
  now - (t.since ?? now) >= rankWaitMs() - margin ? 1 : (t.rank ?? 2);
/** Does `t` go before `me`? Both sides evaluate this from the same directory, so they agree: at an age edge each
 * side counts the other as aged first, so both wait for a moment rather than both going. */
export function ahead(t: Filed, me: Filed, allCurrent: boolean, now: number) {
  if (t.held || t.number === 0) return true;
  if (allCurrent && !t.long && yielding(me, now)) return true;
  if (allCurrent && !me.long && yielding(t, now, 2000)) return false;
  if (allCurrent && !!t.long === !!me.long) {
    const theirs = rankOf(t, now, 2000);
    const mine = rankOf(me, now);
    if (theirs !== mine) return theirs < mine;
  }
  return t.number < me.number || (t.number === me.number && t.file < me.file);
}
/** May `me` take a slot, given every ticket that goes before it and the smallest capacity anyone asked for? */
export function mayStart(me: Ticket, before: Ticket[], limit: number) {
  const kindOf = (t: Ticket) => (t.v === BOT_TICKET_VERSION ? t.kind : undefined) ?? 'exclusive';
  const kind = kindOf(me);
  if (kind === 'exclusive') return before.length === 0;
  if (before.some((t) => t.number === 0 || kindOf(t) === 'exclusive')) return false;
  const timed = before.filter((t) => kindOf(t) === 'timed');
  if (kind === 'timed') return timed.length < 2 && before.length < limit;
  // Reserve up to two places for earlier timed tickets. A surplus waiting timed ticket
  // cannot use the third slot, but any held ticket still occupies its slot.
  const surplus = Math.max(0, Math.min(timed.length - 2, timed.filter((t) => !t.held).length));
  return before.length - surplus < limit;
}
const directory = process.env.BOOGLE_BOT_QUEUE_DIR ?? `/tmp/boogle-bots-${process.getuid?.() ?? 'user'}`;
const pause = () => new Promise<void>((resolve) => setTimeout(resolve, 250));
function alive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}
function read(file: string): Ticket | undefined {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as Ticket;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }
}

// A concurrent reader can temporarily prevent atomic replace or removal on Windows.
const retrySignal = new Int32Array(new SharedArrayBuffer(4));
function ticketFileOp(action: () => void) {
  for (let attempt = 0; ; attempt++) {
    try {
      return action();
    } catch (error) {
      const { code } = error as NodeJS.ErrnoException;
      if (process.platform !== 'win32' || attempt === 10 || !['EPERM', 'EACCES', 'EBUSY'].includes(code ?? ''))
        throw error;
      Atomics.wait(retrySignal, 0, 0, 10);
    }
  }
}

function scan(dir = directory) {
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .flatMap((name) => {
      const file = path.join(dir, name);
      const ticket = read(file);
      if (!ticket) return [];
      if (!alive(ticket.pid)) {
        ticketFileOp(() => fs.rmSync(file, { force: true }));
        fs.rmSync(file + '.shared', { force: true });
        return [];
      }
      return [{ file, ...ticket }];
    });
}

function trackOverlap(file: string) {
  const dir = path.dirname(file);
  let shared = false;
  const check = () => {
    if (shared || !scan(dir).some((t) => path.basename(t.file) !== path.basename(file) && t.held)) return;
    // Leave the ticket untouched so a broker watcher cannot undo the child's PID handoff.
    fs.writeFileSync(file + '.shared', '');
    shared = sharedHere = true;
  };
  check();
  const watch = setInterval(check, 1000).unref();
  return { shared: () => shared, stop: () => clearInterval(watch) };
}

export async function acquireBotSlot(
  job = `${path.basename(process.cwd())}: ${process.argv.slice(1).join(' ')}`,
  queued: (message: string) => void = () => {},
  long = process.argv.includes('--long') || !!process.env.BOOGLE_BOT_LONG,
  {
    wait = pause,
    readLoad = machineLoad,
    kind = botClass(path.basename(process.argv[1] ?? '', '.ts'), process.argv.slice(2), long),
  } = {},
) {
  const inherited = process.env.BOOGLE_BOT_LEASE;
  if (inherited) {
    const ticket = read(inherited);
    if (!ticket?.held || !alive(ticket.pid)) throw new Error('Inherited bot lease has expired');
    // The harness owns the live browser. If its broker dies, this ticket must remain occupied until the harness dies.
    fs.writeFileSync(inherited + '.tmp', JSON.stringify({ ...ticket, pid: process.pid }));
    ticketFileOp(() => fs.renameSync(inherited + '.tmp', inherited));
    // A broker from before the load gate writes no slot: its wait is unknown, and the load is read now.
    acquired ??= ticket.slot ?? { queueWaitMs: 0, loadAtStart: readLoad(), loadTimedOut: false };
    inheritedFile = inherited;
    // A nightly runner can be blocked in spawnSync while the child holds the slot.
    return { file: inherited, waitedMs: 0, release: trackOverlap(inherited).stop };
  }
  const capacity = Number(process.env.BOOGLE_BOT_CONCURRENCY ?? 3);
  if (!Number.isInteger(capacity) || capacity < 1) throw new Error('BOOGLE_BOT_CONCURRENCY must be a positive integer');
  const rank = Number(process.env.BOOGLE_BOT_RANK ?? 2);
  if (![1, 2, 3].includes(rank)) throw new Error('BOOGLE_BOT_RANK must be 1, 2 or 3');
  const loadLimit = maxLoad();
  const loadPatience = loadWaitMs();
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const id = `${process.pid}-${randomUUID()}`;
  const file = path.join(directory, id + '.json');
  const ticket: Ticket = {
    pid: process.pid,
    job,
    number: 0,
    capacity,
    held: false,
    v: BOT_TICKET_VERSION,
    long,
    since: Date.now(),
    rank,
    kind,
  };
  const publish = () => {
    fs.writeFileSync(file + '.tmp', JSON.stringify(ticket));
    ticketFileOp(() => fs.renameSync(file + '.tmp', file));
  };
  let released = false;
  let overlap: ReturnType<typeof trackOverlap> | undefined;
  const release = () => {
    if (released) return;
    released = true;
    overlap?.stop();
    ticketFileOp(() => fs.rmSync(file, { force: true }));
    fs.rmSync(file + '.tmp', { force: true });
    fs.rmSync(file + '.shared', { force: true });
    process.off('exit', onExit);
    console.log(`bot queue: released ${job}`);
  };
  const onExit = () => {
    if (read(file)?.pid === process.pid) release();
  };
  process.once('exit', onExit);
  const start = Date.now();
  try {
    publish(); // choosing: anyone with a ticket must wait until this becomes numbered
    ticket.number = Math.max(0, ...scan().map((t) => t.number)) + 1;
    publish();
    let last = '';
    let loadSince: number | undefined, loadSaid: number | undefined;
    let loadTimedOut = false;
    let load: number;
    // A short job may pass a waiting long one, so it lets any long job that scanned before this ticket appeared
    // finish taking the slot (its scan and its `held` write are one synchronous step) before the first check.
    if (!long) for (let i = 0; i < 2; i++) await wait();
    for (;;) {
      // Sampling can block on Windows. Do it before scanning so an eligible ticket can publish promptly.
      load = readLoad();
      const all = scan();
      // FIFO with older tickets. We treat them as exclusive, and they see our missing `light` as exclusive too.
      const allCurrent = all.every((t) => t.v === BOT_TICKET_VERSION);
      const me = { file, ...ticket };
      const now = Date.now();
      const lower = all.filter((t) => t.file !== file && ahead(t, me, allCurrent, now));
      const limit = Math.min(capacity, ...all.filter((t) => t.v === BOT_TICKET_VERSION).map((t) => t.capacity));
      if (mayStart(me, lower, limit)) {
        if (kind !== 'timed' && kind !== 'exclusive') break;
        // The slot is free; the machine may not be. The patience clock starts at the front of the queue.
        loadSince ??= now;
        const gate = loadGate(load, loadLimit, now - loadSince, loadPatience);
        if (gate === 'timeout') {
          loadTimedOut = true;
          const message = `bot queue: load still ${loadText(load)} after ${span(loadPatience)}; going ahead, under load`;
          console.log(message);
          queued(message);
        }
        if (gate !== 'wait') break;
        if (loadSaid === undefined || now - loadSaid >= 60_000) {
          const left = span(loadPatience - (now - loadSince));
          const message = `bot queue: waiting for load ${loadText(load)} → ${loadText(loadLimit)} (goes ahead under load in ${left})`;
          console.log(message);
          queued(message);
          loadSaid = now;
        }
        last = '';
        await wait();
        continue;
      }
      loadSaid = undefined;
      const behind = lower.map((t) => `${t.job} (pid ${t.pid})`).join(', ');
      if (behind !== last) {
        const message = `bot queue: queued behind ${behind}`;
        console.log(message);
        queued(message);
      }
      last = behind;
      await wait();
    }
    const waitedMs = Date.now() - start;
    ticket.held = true;
    ticket.slot = { queueWaitMs: waitedMs, loadAtStart: load, loadTimedOut };
    acquired ??= ticket.slot;
    publish();
    overlap = trackOverlap(file);
    console.log(
      `bot queue: acquired ${job}; waited ${(waitedMs / 1000).toFixed(2)}s${overlap.shared() ? '; shared' : ''}`,
    );
    return { file, waitedMs, release };
  } catch (error) {
    release();
    throw error;
  }
}
