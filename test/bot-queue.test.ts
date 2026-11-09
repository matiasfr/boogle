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
const { acquireBotSlot, ahead, loadGate } = await import('../dev/look/bot-queue.ts');

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
  v: 2,
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
