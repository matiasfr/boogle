// The shared bot queue (dev/look/bot-queue.ts): short captures pass waiting long playthroughs, a long run that has
// waited out the yield window keeps its place, and a ticket from an older checkout turns the queue back to FIFO.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.BOOGLE_BOT_QUEUE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'boogle-bot-queue-'));
delete process.env.BOOGLE_BOT_LEASE;
process.env.BOOGLE_BOT_MAX_LOAD = '0'; // ordering only; this machine's load must not hold these tests
delete process.env.BOOGLE_BOT_LOAD_WAIT_MS;
const { acquireBotSlot, ahead, BOT_TICKET_VERSION, botClass, loadGate, mayStart } =
  await import('../dev/look/bot-queue.ts');
delete process.env.BOOGLE_BOT_CONCURRENCY;

test('load gate: wait while the load is above the limit, then go ahead under load; 0 turns it off', () => {
  assert.equal(loadGate(12, 30, 0, 1000), 'go');
  assert.equal(loadGate(30, 30, 0, 1000), 'go', 'at the limit is fine');
  assert.equal(loadGate(41, 30, 999, 1000), 'wait');
  assert.equal(loadGate(41, 30, 1000, 1000), 'timeout');
  assert.equal(loadGate(99, 0, 0, 1000), 'go');
});

const ticket = (number: number, long: boolean, since: number, held = false) => ({
  file: `t${number}`,
  pid: 1,
  job: '',
  number,
  capacity: 1,
  held,
  v: BOT_TICKET_VERSION,
  long,
  since,
});

test('order: short before a waiting long run, until the long run has waited 20 minutes', () => {
  const now = 100 * 60_000;
  const long = ticket(5, true, now - 60_000);
  const short = ticket(7, false, now);
  assert.equal(ahead(short, long, true, now), true);
  assert.equal(ahead(long, short, true, now), false);
  const aged = ticket(5, true, now - 21 * 60_000);
  assert.equal(ahead(short, aged, true, now), false);
  assert.equal(ahead(aged, short, true, now), true);
  // In the last two seconds of the window neither goes first; the long run then takes its turn.
  const edge = ticket(5, true, now - 20 * 60_000 + 1000);
  assert.equal(ahead(short, edge, true, now), true);
  assert.equal(ahead(edge, short, true, now), true);
  assert.equal(ahead(ticket(5, true, now, true), short, true, now), true, 'a running job is never passed');
  assert.equal(ahead(long, short, false, now), true, 'an older checkout in the queue: first come, first served');
  assert.equal(ahead(short, long, false, now), false);
  assert.equal(ahead(ticket(8, false, now), short, true, now), false, 'same kind: by number');
});

const job = (number: number, kind: ReturnType<typeof botClass>, held = false) => ({
  ...ticket(number, false, 0, held),
  kind,
});

test('three total slots and two timed slots, including reservations for earlier tickets', () => {
  const first = job(1, 'timed', true);
  const second = job(2, 'timed', true);
  const third = job(3, 'timed');
  const still = job(4, 'shared');
  assert.equal(mayStart(second, [first], 3), true);
  assert.equal(mayStart(third, [first, second], 3), false);
  assert.equal(mayStart(still, [first, second, third], 3), true, 'the waiting timed run cannot use slot three');
  assert.equal(mayStart(still, [first, second], 2), false, 'the configured limit can be smaller');
  assert.equal(mayStart(still, [first, second, job(3, 'shared', true)], 3), false);
  assert.equal(mayStart(third, [first, { ...second, held: false }], 3), false, 'reserve an earlier timed place');
  assert.equal(mayStart(still, [job(0, 'shared')], 3), false, 'someone is still choosing a number');
});

test('perf waits for an empty queue and blocks jobs behind it before and during its run', () => {
  const still = job(2, 'shared', true);
  const perf = job(3, 'exclusive');
  const timed = job(4, 'timed');
  assert.equal(mayStart(perf, [still], 3), false);
  assert.equal(mayStart(perf, [], 3), true);
  assert.equal(mayStart(timed, [perf], 3), false);
  assert.equal(mayStart(still, [{ ...perf, held: true }], 3), false);
  const older = { ...still, v: 3, light: true };
  assert.equal(mayStart(timed, [older], 3), false, 'old light tickets and current tickets take separate turns');
});

test('direct and broker operations use the same classification', () => {
  assert.equal(botClass('look', ['--rail-seed', 'awake']), 'shared');
  assert.equal(botClass('look', ['--real']), 'timed');
  assert.equal(botClass('look', ['--players', '2']), 'timed');
  assert.equal(botClass('look', ['--curves']), 'timed');
  assert.equal(botClass('playthrough', ['--long']), 'timed');
  assert.equal(botClass('playthrough', ['--to', 'wake']), 'shared');
  assert.equal(botClass('net', []), 'shared');
  assert.equal(botClass('ws-run', []), 'shared');
  assert.equal(botClass('perf', ['--render']), 'exclusive');
  assert.equal(botClass('perf', ['--hardware']), 'exclusive');
  assert.equal(botClass('hitches', []), 'exclusive');
});

test('review: look flags that turn motion curves (per-frame frame time) on are timed', () => {
  // dev/look/look.ts: --curves-vs and --target both set opt.curves; the broker accepts both (look-broker.ts VALUES).
  assert.equal(botClass('look', ['--curves-vs', '.look/old.csv']), 'timed');
  assert.equal(botClass('look', ['--target', 'glide']), 'timed');
});

test('a fresh queue grants three shared leases above the load limit and records their start load', async () => {
  const leases: Awaited<ReturnType<typeof acquireBotSlot>>[] = [];
  process.env.BOOGLE_BOT_MAX_LOAD = '30';
  try {
    for (const name of ['still', 'net', 'segment']) {
      let polls = 0;
      const wait = () => {
        assert.ok(++polls <= 2, `${name} should acquire after the initial two polls`);
        return Promise.resolve();
      };
      leases.push(await acquireBotSlot(name, undefined, false, { wait, readLoad: () => 100, kind: 'shared' }));
    }
    for (const { file, waitedMs } of leases) {
      const { held, slot } = JSON.parse(fs.readFileSync(file, 'utf8'));
      assert.equal(held, true);
      assert.deepEqual(slot, { queueWaitMs: waitedMs, loadAtStart: 100, loadTimedOut: false });
    }
  } finally {
    process.env.BOOGLE_BOT_MAX_LOAD = '0';
    for (const lease of leases) lease.release();
  }
});

test('timed and exclusive leases wait for load to fall before taking a free slot', async () => {
  process.env.BOOGLE_BOT_MAX_LOAD = '30';
  try {
    for (const kind of ['timed', 'exclusive'] as const) {
      let polls = 0;
      const wait = () => {
        assert.ok(++polls <= 3, `${kind} should acquire once load falls`);
        return Promise.resolve();
      };
      const readLoad = () => (polls < 3 ? 100 : 0);
      const lease = await acquireBotSlot(kind, undefined, false, { wait, readLoad, kind });
      try {
        assert.equal(polls, 3);
        const { slot } = JSON.parse(fs.readFileSync(lease.file, 'utf8'));
        assert.deepEqual(slot, { queueWaitMs: lease.waitedMs, loadAtStart: 0, loadTimedOut: false });
      } finally {
        lease.release();
      }
    }
  } finally {
    process.env.BOOGLE_BOT_MAX_LOAD = '0';
  }
});

test('rank: P1 before P2 before P3 among waiting runs of the same length; a P3 waits at most 30 minutes', () => {
  const now = 100 * 60_000;
  const ranked = (number: number, rank: number, since = now, long = false) => ({
    ...ticket(number, long, since),
    rank,
  });
  const p3 = ranked(1, 3);
  const p1 = ranked(9, 1);
  assert.equal(ahead(p1, p3, true, now), true, 'a later P1 goes first');
  assert.equal(ahead(p3, p1, true, now), false);
  assert.equal(ahead(ranked(9, 2), ranked(1, 2), true, now), false, 'same rank: by number');
  assert.equal(ahead(ranked(1, 3), { ...ranked(9, 2), rank: undefined }, true, now), false, 'no rank is P2');
  const aged = ranked(1, 3, now - 31 * 60_000);
  assert.equal(ahead(aged, p1, true, now), true, 'a P3 that has waited 30 minutes keeps its place');
  assert.equal(ahead(p1, aged, true, now), false);
  const edge = ranked(1, 3, now - 30 * 60_000 + 1000);
  assert.equal(ahead(edge, p1, true, now) && ahead(p1, edge, true, now), true, 'at the edge both wait, neither goes');
  assert.equal(ahead(ranked(9, 1, now, true), p3, true, now), false, 'a long P1 still yields to a short P3');
  assert.equal(ahead(p1, p3, false, now), false, 'an older checkout queued: first come, first served');
});

test('a short job queued after a long one takes the freed slot first', async () => {
  const order: string[] = [];
  const polls: (() => void)[] = [];
  const timing = { wait: () => new Promise<void>((resolve) => polls.push(resolve)), readLoad: () => 0 };
  const poll = async () => {
    assert.ok(polls.length, 'a job is waiting to poll');
    for (const resume of polls.splice(0)) resume();
    await Promise.resolve();
  };
  const firstJob = acquireBotSlot('first', undefined, false, { ...timing, kind: 'exclusive' });
  await poll();
  await poll();
  const first = await firstJob;
  // Each acquisition publishes its numbered ticket before its first wait.
  const long = acquireBotSlot('long', undefined, true, { ...timing, kind: 'exclusive' }).then(
    (lease) => (order.push('long'), lease),
  );
  const short = acquireBotSlot('short', undefined, false, timing).then((lease) => (order.push('short'), lease));
  await poll();
  await poll();
  assert.deepEqual(order, []);
  first.release();
  await poll();
  const shortLease = await short;
  assert.deepEqual(order, ['short']);
  shortLease.release();
  await poll();
  (await long).release();
  assert.deepEqual(order, ['short', 'long']);
});

test('load limits: unchanged off Windows whatever the core count, scaled and capped on Windows', async () => {
  const { loadLimit } = await import('../dev/look/machine-load.ts');
  // The Mac (10 cores) and Linux (a 4-vCPU ubuntu-latest runner, a 64-core box) keep the bot gate's 30 and quiet's 6.
  for (const cores of [10, 4, 64]) {
    assert.equal(loadLimit(30, cores, false), 30, `bot gate off Windows on ${cores} cores`);
    assert.equal(loadLimit(6, cores, false), 6, `quiet check off Windows on ${cores} cores`);
  }
  assert.equal(loadLimit(30, 20, true), 18);
  assert.equal(loadLimit(6, 20, true), 12);
  assert.equal(loadLimit(0, 20, true), 0);
});
