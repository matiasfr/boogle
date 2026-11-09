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
const { acquireBotSlot, ahead, loadGate, mayStart } = await import('../dev/look/bot-queue.ts');

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
  v: 3,
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

const kind = (number: number, light: boolean, held = false) => ({ ...ticket(number, false, 0, held), light });

test('who may start: two light stills share; anything else runs alone and holds every slot', () => {
  const [l1, l2, l3, x] = [kind(1, true, true), kind(2, true, true), kind(3, true), kind(4, false)];
  assert.equal(mayStart(l3, [], 2), true);
  assert.equal(mayStart(l3, [l1], 2), true, 'a second light still beside a running one');
  assert.equal(mayStart(l3, [l1, l2], 2), false, 'two already running');
  assert.equal(mayStart(l3, [l1], 1), false, 'BOOGLE_BOT_CONCURRENCY=1 (anywhere): one at a time');
  assert.equal(mayStart(x, [l1], 2), false, 'an exclusive run waits for the light ones to finish');
  assert.equal(mayStart(x, [], 2), true);
  assert.equal(mayStart(l3, [kind(4, false, true)], 2), false, 'never beside a running exclusive run');
  assert.equal(mayStart(l3, [kind(2, false)], 2), false, 'nor past an exclusive run waiting ahead of it');
  assert.equal(mayStart(l3, [{ ...l1, number: 0 }], 2), false, 'someone still choosing a number');
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
  const first = await acquireBotSlot('first', undefined, false);
  const long = acquireBotSlot('long', undefined, true).then((lease) => (order.push('long'), lease));
  await new Promise((resolve) => setTimeout(resolve, 100));
  const short = acquireBotSlot('short', undefined, false).then((lease) => (order.push('short'), lease));
  await new Promise((resolve) => setTimeout(resolve, 900));
  assert.deepEqual(order, []);
  first.release();
  const shortLease = await short;
  assert.deepEqual(order, ['short']);
  shortLease.release();
  (await long).release();
  assert.deepEqual(order, ['short', 'long']);
});
