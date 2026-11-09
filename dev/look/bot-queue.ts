// Machine-wide, process-owned tickets. Lamport's bakery ordering avoids a stale reaper deleting a new holder's lock.
// Every ticket has a unique name; dead owners can only lose their own ticket. No game/runtime imports.
// Short jobs (stills, scenarios, net tests) go ahead of waiting long playthroughs (`--long`, about half an hour each)
// until a long one has waited BOOGLE_BOT_YIELD_MS (20 minutes). A running job is never interrupted. Tickets from
// older checkouts carry no `v`; while one is queued everything stays first come, first served.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

type Ticket = {
  pid: number;
  job: string;
  number: number;
  capacity: number;
  held: boolean;
  v?: number;
  long?: boolean;
  since?: number;
};
type Filed = Ticket & { file: string };
const yieldMs = Number(process.env.BOOGLE_BOT_YIELD_MS ?? 20 * 60_000);
/** A waiting long job younger than the yield window; `margin` keeps the two sides from disagreeing at its edge. */
const yielding = (t: Ticket, now: number, margin = 0) =>
  t.v === 2 && !!t.long && !t.held && now - (t.since ?? 0) < yieldMs - margin;
/** Does `t` go before `me`? Both sides evaluate this from the same directory, so they agree. */
export function ahead(t: Filed, me: Filed, allCurrent: boolean, now: number) {
  if (t.held || t.number === 0) return true;
  if (allCurrent && !t.long && yielding(me, now)) return true;
  if (allCurrent && !me.long && yielding(t, now, 2000)) return false;
  return t.number < me.number || (t.number === me.number && t.file < me.file);
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

export async function acquireBotSlot(
  job = `${path.basename(process.cwd())}: ${process.argv.slice(1).join(' ')}`,
  queued: (message: string) => void = () => {},
  long = process.argv.includes('--long') || !!process.env.BOOGLE_BOT_LONG,
) {
  const inherited = process.env.BOOGLE_BOT_LEASE;
  if (inherited) {
    const ticket = read(inherited);
    if (!ticket?.held || !alive(ticket.pid)) throw new Error('Inherited bot lease has expired');
    // The harness owns the live browser. If its broker dies, this ticket must remain occupied until the harness dies.
    fs.writeFileSync(inherited + '.tmp', JSON.stringify({ ...ticket, pid: process.pid }));
    fs.renameSync(inherited + '.tmp', inherited);
    return { file: inherited, waitedMs: 0, release() {} };
  }
  const capacity = Number(process.env.BOOGLE_BOT_CONCURRENCY ?? 1);
  if (!Number.isInteger(capacity) || capacity < 1) throw new Error('BOOGLE_BOT_CONCURRENCY must be a positive integer');
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const id = `${process.pid}-${randomUUID()}`;
  const file = path.join(directory, id + '.json');
  const ticket: Ticket = { pid: process.pid, job, number: 0, capacity, held: false, v: 2, long, since: Date.now() };
  const publish = () => {
    fs.writeFileSync(file + '.tmp', JSON.stringify(ticket));
    fs.renameSync(file + '.tmp', file);
  };
  const scan = () =>
    fs
      .readdirSync(directory)
      .filter((name) => name.endsWith('.json'))
      .flatMap((name) => {
        const other = path.join(directory, name);
        const t = read(other);
        if (!t) return [];
        if (!alive(t.pid)) {
          fs.rmSync(other, { force: true });
          return [];
        }
        return [{ file: other, ...t }];
      });
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    fs.rmSync(file, { force: true });
    fs.rmSync(file + '.tmp', { force: true });
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
    // A short job may pass a waiting long one, so it lets any long job that scanned before this ticket appeared
    // finish taking the slot (its scan and its `held` write are one synchronous step) before the first check.
    if (!long) for (let i = 0; i < 2; i++) await pause();
    for (;;) {
      const all = scan();
      const allCurrent = all.every((t) => t.v === 2);
      const me = { file, ...ticket };
      const now = Date.now();
      const lower = all.filter((t) => t.file !== file && ahead(t, me, allCurrent, now));
      const limit = Math.min(capacity, ...all.map((t) => t.capacity));
      if (!lower.some((t) => t.number === 0) && lower.length < limit) break;
      const behind = lower.map((t) => `${t.job} (pid ${t.pid})`).join(', ');
      if (behind !== last) {
        const message = `bot queue: queued behind ${behind}`;
        console.log(message);
        queued(message);
      }
      last = behind;
      await pause();
    }
    ticket.held = true;
    publish();
    const waitedMs = Date.now() - start;
    console.log(`bot queue: acquired ${job}; waited ${(waitedMs / 1000).toFixed(2)}s`);
    return { file, waitedMs, release };
  } catch (error) {
    release();
    throw error;
  }
}
