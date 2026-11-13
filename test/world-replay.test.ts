// Server commands replay to identical state. Clients only consume the resulting replicas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { serverWorld } from './helpers/server-world.ts';
import { mulberry32 } from '../src/sim/rng.ts';
import { RAIL_TUNABLES, serializeTune } from '../src/sim/tune.ts';
import { serializeRoster } from '../src/sim/roster.ts';
import { RAIL_SCHEMAS } from '../src/world/railway-replicate.ts';
import { RAILWAY_SOURCES } from '../src/sim/railway-layout.ts';

function replay(seed: number) {
  const host = serverWorld();
  host.join('a');
  host.join('b');
  host.railway.session('alice', 1);
  host.railway.session('bob', 1);
  const requests = { alice: 0, bob: 0 };
  const random = mulberry32(seed);
  const history: unknown[] = [];
  const accepted = new Set<string>();
  const before = structuredClone(host.sync.snapshot().data.railway);
  for (let i = 0; i < 60; i++) {
    const pid = i % 2 ? 'alice' : 'bob';
    const action = i < 2 ? 'rail.wake' : 'rail.chop';
    const railResult = host.railway.act(
      pid,
      {
        op: action,
        epoch: 1,
        request: ++requests[pid],
        id: RAILWAY_SOURCES[i % RAILWAY_SOURCES.length]![0],
        yaw: 0,
        collapsed: false,
      },
      { reach: () => true, height: () => true, cadence: () => true },
    );
    if (railResult.status === 'accepted' && railResult.accepted > 0) accepted.add(action);
    const spec = RAIL_TUNABLES[Math.floor(random() * RAIL_TUNABLES.length)]!;
    const v = spec.min + Math.floor(random() * (spec.max - spec.min + 1));
    const result = host.run(
      i % 2 ? 'alice' : 'bob',
      i % 3 === 0
        ? { op: 'who.set', n: `Player ${i}`, c: i % 8 }
        : { op: 'tune.commit', key: spec.key, v, expectedRevision: host.railTune.tune.revision, requestId: `${i}` },
    );
    assert.equal(result.status, 'accepted');
    if (i === 20) host.join('late');
    if (i === 40) {
      host.replication.removeClient('b');
      host.join('b');
    }
    host.flush();
    for (const client of host.clients.values()) {
      assert.deepEqual(serializeRoster(client.roster.roster), serializeRoster(host.roster.roster));
      assert.deepEqual(serializeTune(client.tune.tune), serializeTune(host.railTune.tune));
      for (const schema of RAIL_SCHEMAS) {
        const world = host.railway.world();
        assert.deepEqual([...client.confirmed().ids(schema)], [...world.ids(schema)]);
        for (const id of world.ids(schema))
          assert.deepEqual(client.confirmed().get(schema, id), world.get(schema, id), `${i}: ${schema.kind} ${id}`);
      }
    }
    history.push(structuredClone({ result, railResult, state: host.sync.snapshot() }));
  }
  assert.deepEqual([...accepted].sort(), ['rail.chop', 'rail.wake'], 'the replay changes live railway gameplay state');
  assert.notDeepEqual(host.sync.snapshot().data.railway, before);
  const restored = serverWorld();
  assert.equal(restored.sync.loadSnapshot(structuredClone(host.sync.snapshot())), true);
  assert.deepEqual(restored.sync.snapshot(), host.sync.snapshot());
  for (let i = 0; i < 10; i++) {
    host.flush();
    restored.flush();
    assert.deepEqual(restored.sync.snapshot(), host.sync.snapshot(), 'restart continues the same server state');
  }
  return history;
}

test('server replay preserves state across two mirrors, late join, reconnect and checkpoint reload', () => {
  assert.deepEqual(replay(0xf091), replay(0xf091), 'the same commands and ticks produce the same state');
});
