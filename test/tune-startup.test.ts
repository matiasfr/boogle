// Owner-requested regression: delayed initial room snapshot must not consume URL intent.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createTuneStartup } from '../src/tunables/startup.ts';
import { createSync } from '../src/world/sync.ts';
import { makeNet, run } from './helpers/net.ts';

test('shared URL intent waits for the initial snapshot and never replays on reconnect', async () => {
  const net = makeNet();
  const host = { s: createSync(), p: net.add('host', true) };
  const client = { s: createSync(), p: net.add('client') };
  let submissions = 0;
  let accepted = 0;
  for (const peer of [host, client]) peer.s.registerOp('url-edit', { apply: () => accepted++ });
  const startup = createTuneStartup(
    () => {
      const status = client.s.worldStatus();
      return status.mode === 'client' && status.ready;
    },
    () => {
      submissions++;
      assert.equal(client.s.submitEdit({ op: 'url-edit', i: 0, j: 0 }), true);
    },
  );
  client.s.onSnapshot(startup.snapshot);
  startup.start(true);
  assert.equal(submissions, 0, 'local default ready is not room readiness');
  host.s.attachWorld(host.p.room, { host: true });
  client.s.attachWorld(client.p.room);
  for (let i = 0; i < 100; i++) client.s.updateWorld(0.05);
  assert.equal(submissions, 0, 'no snapshot delivered during the slow connection');
  await run(net, [host, client], 60);
  assert.equal(submissions, 1);
  assert.equal(accepted, 2, 'one edit applies on the host and client');
  net.setUp(client.p, false);
  net.setUp(client.p, true);
  await run(net, [host, client], 60);
  startup.start(true);
  assert.equal(submissions, 1, 'reconnect and repeated startup never resubmit');
  assert.equal(accepted, 2);
});

test('a snapshot received before appearance permits one submission; local-only queries need no room', () => {
  for (const shared of [true, false]) {
    let applied = 0;
    const startup = createTuneStartup(
      () => shared,
      () => applied++,
    );
    startup.snapshot();
    assert.equal(applied, 0, 'appearance restoration has not completed');
    startup.start(shared);
    startup.snapshot();
    startup.start(shared);
    assert.equal(applied, 1);
  }
});
