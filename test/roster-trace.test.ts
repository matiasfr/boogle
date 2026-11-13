// Step 4 keeps every sequential roster rule/result; only command delivery and ownership move.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSync } from '../src/world/sync.ts';
import { createServerOps } from '../src/world/server-ops.ts';
import { createReplicator } from '../src/world/replicate-server.ts';
import { installServer } from '../src/world/rules/roster.ts';
import { CLASSIC_SCHEMAS, createRosterMirror, projectRoster } from '../src/world/classic-replicate.ts';
import { createMirror } from '../src/world/replicate-client.ts';
import { serializeRoster } from '../src/sim/roster.ts';
import { recordTrace, type TraceInput } from './helpers/classic-trace.ts';

test('roster server commands match frozen classic admission, results, normalization and ordinal order', () => {
  const who = (n: unknown, c: unknown, from = 'alice'): TraceInput => ({
    from,
    edit: { op: 'who.set', i: 0, j: 0, n, c },
  });
  const inputs = [
    who('', 0),
    who(null, 0),
    who('x'.repeat(65), 0),
    who('  A\u0000na  ', 2),
    who('Ana', 2),
    who('Ana', 3),
    who('Zoë', 7, 'bob'),
    who('x'.repeat(30), 0),
    who('x', -1),
    who('x', 8),
    who('x', 0.5),
    who('x', '2'),
    who('\ud800'.repeat(16), 0),
    who('Zero', -0),
  ];
  const trace = recordTrace(0x51a7e, inputs);
  const boundaries = trace.steps.flatMap((step, i) => (step.phase === 'admit' ? [i] : []));
  const sync = createSync();
  const ops = createServerOps();
  const replication = createReplicator();
  const api = installServer(sync, ops, replication);
  projectRoster(replication, api);
  const mirror = createMirror(CLASSIC_SCHEMAS);
  const read = createRosterMirror(mirror);
  replication.addClient('peer');
  inputs.forEach((input, i) => {
    const span = trace.steps.slice(boundaries[i]!, boundaries[i + 1] ?? trace.steps.length);
    const actual = ops.run(input.from, input.edit, {
      from: input.from,
      tick: span[0]!.tick,
      env: {},
      protoRoom: false,
      tuneController: () => false,
      actor: { reach: () => true, height: () => true, cadence: () => true },
    });
    assert.equal(actual.status === 'accepted', span[0]!.accepted, `admission ${i}`);
    assert.deepEqual(actual.result, span.find((s) => s.phase === 'apply')?.result ?? null, `result ${i}`);
    assert.equal(actual.durable, actual.status === 'accepted');
    assert.deepEqual(serializeRoster(api.roster), span.at(-1)!.state.roster, `roster ${i}`);
    replication.commit(i + 1);
    replication.flush(i + 1, (_, packet) => assert.equal(mirror.apply(packet), true));
    assert.deepEqual(serializeRoster(read.roster), serializeRoster(api.roster), `mirror ${i}`);
  });
});
