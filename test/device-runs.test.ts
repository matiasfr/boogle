import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PlaySession } from '../server/src/playdata.ts';
import { STALE_MS, WAIT_MS, planPull, waitForRun, type WaitEnv } from '../dev/device/runs.ts';

const T0 = Date.parse('2026-11-10T10:00:00Z');
const iso = (ms: number) => new Date(ms).toISOString();
const ID = 'dv-abcdefghijklmnopqrstuvwxyz';
const sess = (id: string, state: string, firstAt: number, lastAt: number, card = 'device'): PlaySession => ({
  id,
  card,
  bytes: 1,
  first: iso(firstAt),
  last: iso(lastAt),
  meta: { state },
});

/** A fake clock: sleeping advances it, nothing really waits. */
function fake(listAt: (elapsed: number) => PlaySession[] | Error) {
  let t = T0;
  const polls: number[] = [];
  const env: WaitEnv = {
    now: () => t,
    sleep: async (ms) => {
      t += ms;
    },
    list: async () => {
      polls.push(t - T0);
      const r = listAt(t - T0);
      if (r instanceof Error) throw r;
      return r;
    },
  };
  return { env, polls, elapsed: () => t - T0 };
}

test('wait polls every 10 s and returns the run the moment it is done', async () => {
  const f = fake((e) =>
    e < 25_000 ? [] : e < 55_000 ? [sess(ID, 'started', T0 + 25_000, T0 + e)] : [sess(ID, 'done', T0 + 25_000, T0 + e)],
  );
  const res = await waitForRun(ID, f.env);
  assert.equal(res.status, 'done');
  assert.deepEqual(f.polls, [0, 10_000, 20_000, 30_000, 40_000, 50_000, 60_000]);
});

test('wait ignores other runs and sessions that are not device cards', async () => {
  const f = fake((e) => [
    sess('dv-other00000000000000000000', 'done', T0, T0),
    sess(ID, 'done', T0, T0 + e, 'play'),
    ...(e >= 20_000 ? [sess(ID, 'done', T0, T0 + e)] : []),
  ]);
  assert.equal((await waitForRun(ID, f.env)).status, 'done');
  assert.equal(f.polls.length, 3);
});

test('wait gives up at the limit with nothing, after the last poll that fits', async () => {
  const f = fake(() => []);
  assert.equal((await waitForRun(ID, f.env)).status, 'timeout');
  assert.ok(f.elapsed() <= WAIT_MS && f.elapsed() > WAIT_MS - 10_000);
  assert.equal(f.polls.length, WAIT_MS / 10_000 + 1); // the poll at the limit itself counts
});

test('wait ends early on a run that started and went quiet, instead of holding for 30 minutes', async () => {
  const f = fake((e) => [sess(ID, 'started', T0, T0 + Math.min(e, 60_000))]);
  const res = await waitForRun(ID, f.env);
  assert.equal(res.status, 'cut-off');
  assert.ok(f.elapsed() > 60_000 + STALE_MS - 10_000 && f.elapsed() < 60_000 + STALE_MS + 10_000);
});

test('wait survives one dropped request and stops after six in a row', async () => {
  let n = 0;
  const once = fake((e) => (n++ === 1 ? new Error('502') : e >= 30_000 ? [sess(ID, 'done', T0, T0 + e)] : []));
  assert.equal((await waitForRun(ID, once.env)).status, 'done');
  const down = fake(() => new Error('GET /playdata: 503'));
  const res = await waitForRun(ID, down.env);
  assert.deepEqual(res, { status: 'error', error: 'GET /playdata: 503' });
  assert.equal(down.polls.length, 6);
});

test('wait reports each poll to a progress callback', async () => {
  const seen: string[] = [];
  const f = fake((e) => (e < 10_000 ? [] : [sess(ID, e < 20_000 ? 'started' : 'done', T0, T0 + e)]));
  await waitForRun(ID, { ...f.env, tick: (s) => seen.push(s) });
  assert.deepEqual(seen, ['none', 'started', 'done']);
});

const none = () => ({ pulled: false, complete: false });
const never = () => 0;

test('pull --new takes finished runs not on disk, oldest first, and skips what is complete locally', () => {
  const now = T0 + 3_600_000;
  const rows = [
    sess('dv-newer00000000000000000000', 'done', T0 + 2000, T0 + 3000),
    sess('dv-older00000000000000000000', 'done', T0 + 1000, T0 + 2000),
    sess('dv-have000000000000000000000', 'done', T0, T0 + 500),
    sess('play-session-a', 'done', T0, T0, 'play'),
  ];
  const plan = planPull(
    rows,
    (id) => (id.startsWith('dv-have') ? { pulled: true, complete: true } : none()),
    never,
    now,
  );
  assert.deepEqual(
    plan.pull.map((s) => s.id.slice(3, 9)),
    ['older0', 'newer0'],
  );
  assert.equal(plan.running.length, 0);
});

test('pull --new leaves a run that is still sending, and takes it as cut off once it has gone quiet', () => {
  const live = sess(ID, 'started', T0, T0 + 60_000);
  assert.deepEqual(planPull([live], none, never, T0 + 90_000).running, [live]);
  assert.equal(planPull([live], none, never, T0 + 90_000).pull.length, 0);
  const plan = planPull([live], none, never, T0 + 60_000 + STALE_MS + 1);
  assert.equal(plan.pull.length, 1);
  assert.equal(plan.running.length, 0);
});

test('a cut-off copy is pulled again only when the server has more of the run', () => {
  const quiet = sess(ID, 'started', T0, T0 + 60_000);
  const now = T0 + 3_600_000;
  const cut = () => ({ pulled: true, complete: false });
  assert.equal(planPull([quiet], cut, () => T0 + 120_000, now).pull.length, 0); // copy newer than the last event
  assert.equal(planPull([quiet], cut, () => T0 + 30_000, now).pull.length, 1); // server has events the copy lacks
  const done = sess(ID, 'done', T0, T0 + 60_000);
  assert.equal(planPull([done], cut, () => T0 + 120_000, now).pull.length, 1); // finished since: always
});
