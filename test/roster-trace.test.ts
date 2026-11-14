// Server roster semantics, canonical values and mirrored state.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSync } from '../src/world/sync.ts';
import { createServerOps } from '../src/world/server-ops.ts';
import { createReplicator } from '../src/world/replicate-server.ts';
import { installServer } from '../src/world/rules/roster.ts';
import { CLASSIC_SCHEMAS, createRosterMirror, projectRoster } from '../src/world/classic-replicate.ts';
import { createMirror } from '../src/world/replicate-client.ts';
import { serializeRoster, createRoster, cleanName, loadRoster, canSet, setWho, NAME_MAX } from '../src/sim/roster.ts';
type TraceInput = { from: string; edit: Record<string, unknown> };

test('roster server commands preserve admission, normalization and ordinal order', () => {
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
  const accepted = [false, false, false, true, false, true, true, true, false, false, false, false, true, true];
  const expected = createRoster();
  const sync = createSync();
  const ops = createServerOps();
  const replication = createReplicator();
  let now = 0;
  const api = installServer(sync, ops, replication, () => now);
  projectRoster(replication, api);
  const mirror = createMirror(CLASSIC_SCHEMAS);
  const read = createRosterMirror(mirror);
  replication.addClient('peer');
  inputs.forEach((input, i) => {
    now += 3000; // Compare sequential rule semantics outside the new server-only cadence bound.
    const actual = ops.run(input.from, input.edit, {
      from: input.from,
      tick: i,
      protoRoom: false,
      tuneController: () => false,
      actor: { reach: () => true, height: () => true, cadence: () => true },
    });
    assert.equal(actual.status === 'accepted', accepted[i], `admission ${i}`);
    const result = accepted[i]
      ? setWho(expected, input.from, input.edit.n as string, (input.edit.c as number) || 0)
      : null;
    assert.deepEqual(actual.result, result, `result ${i}`);
    assert.equal(actual.durable, actual.status === 'accepted');
    assert.deepEqual(serializeRoster(api.roster), serializeRoster(expected), `roster ${i}`);
    replication.commit(i + 1);
    replication.flush(i + 1, (_, packet) => assert.equal(mirror.apply(packet), true));
    assert.deepEqual(serializeRoster(read.roster), serializeRoster(api.roster), `mirror ${i}`);
  });
});

test('accepted roster names mirror exactly without repeated change records', () => {
  const sync = createSync(),
    ops = createServerOps(),
    replication = createReplicator();
  const api = installServer(sync, ops, replication, () => 0);
  projectRoster(replication, api);
  const mirror = createMirror(CLASSIC_SCHEMAS),
    read = createRosterMirror(mirror);
  let records = 0;
  read.onChange(() => records++);
  replication.addClient('peer');
  const out = ops.run(
    'alice',
    { op: 'who.set', n: 'abcdefghijklmno p', c: 2 },
    {
      from: 'alice',
      tick: 0,
      protoRoom: false,
      tuneController: () => false,
      actor: { reach: () => true, height: () => true, cadence: () => true },
    },
  );
  assert.equal(out.status, 'accepted');
  replication.commit(1);
  replication.flush(1, (_, packet) => assert.equal(mirror.apply(packet), true));
  mirror.apply({ t: 's', tk: 2 });
  mirror.apply({ t: 's', tk: 3 });
  assert.deepEqual(serializeRoster(read.roster), serializeRoster(api.roster));
  assert.equal(records, 1);
});

// Cartesian property cases deliberately put whitespace at either side of the UTF-16 cap.
test('canonical roster names are idempotent, admission-stable and unchanged by loading', () => {
  const spaces = ['', ' ', '  ', '\t\n', '\u00a0'];
  const cores = [
    '',
    '\u0000\u200d',
    'a',
    'abcdefghijklmno p',
    'abcdefghijklmn p',
    'abcdefghijklmnop q',
    'a   b',
    'Zoë',
    '🌈'.repeat(9),
    '\ud800'.repeat(17),
  ];
  for (const prefix of spaces)
    for (const core of cores)
      for (const suffix of spaces) {
        const input = prefix + core + suffix;
        const name = cleanName(input);
        assert.equal(cleanName(name), name, JSON.stringify(input));
        assert.equal(name.trim(), name);
        assert.ok(name.length <= NAME_MAX);
        const roster = createRoster();
        assert.equal(canSet(roster, 'alice', input, 2), name.length > 0);
        if (name) {
          setWho(roster, 'alice', input, 2);
          assert.equal(roster.names[0], name);
          assert.equal(canSet(roster, 'alice', input, 2), false);
          assert.equal(canSet(roster, 'alice', name, 2), false);
        }
        const loaded = createRoster();
        loadRoster(loaded, serializeRoster(roster));
        assert.deepEqual(serializeRoster(loaded), serializeRoster(roster));
        const mirror = createMirror(CLASSIC_SCHEMAS);
        const read = createRosterMirror(mirror);
        mirror.apply({
          t: 's',
          tk: 1,
          w: 1,
          c: serializeRoster(roster).map(([pid, name, color], i) => ['player', i, { pid, name, color }]),
        });
        assert.deepEqual(serializeRoster(read.roster), serializeRoster(roster));
      }
});
