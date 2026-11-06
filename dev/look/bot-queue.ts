// Machine-wide, process-owned tickets. Lamport's bakery ordering avoids a stale reaper deleting a new holder's lock.
// Every ticket has a unique name; dead owners can only lose their own ticket. No game/runtime imports.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

type Ticket = { pid: number; job: string; number: number; capacity: number; held: boolean };
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
  const ticket: Ticket = { pid: process.pid, job, number: 0, capacity, held: false };
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
    for (;;) {
      const all = scan();
      const lower = all.filter(
        (t) =>
          t.file !== file &&
          (t.number === 0 || t.number < ticket.number || (t.number === ticket.number && t.file < file)),
      );
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
