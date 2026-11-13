// Review regression: other peers must record effective server tuning, not only their own command receipts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture } from './helpers/rail-tune.ts';
import { loadTunePanel } from './helpers/tune-panel.ts';

test('remote rail tuning records the effective configuration change', async (t) => {
  const f = await fixture(t);
  const a = f.join('alice');
  const b = f.join('bob');
  f.run(3);
  const { panel, records } = await loadTunePanel(t, b);
  records.length = 0;
  a.adapter.act('tune.commit', { key: 'railRegrowMinutes', v: 44, expectedRevision: 0, requestId: 'remote-change' });
  f.run();
  await f.settled();
  assert.equal(panel.tuneSnapshot().values.find((r) => r.id === 'railway.regrowMinutes')!.value, 44);
  assert.ok(
    records.some((r) => r.kind === 'tune.change' && r.fields.id === 'railway.regrowMinutes' && r.fields.value === 44),
    'Bob mirrors 44 but emits no tune.change or updated snapshot for his playtest recording',
  );
});

const id = 'railway.regrowMinutes';
type Panel = Awaited<ReturnType<typeof loadTunePanel>>;
const changes = (tab: Panel) => tab.records.filter((r) => r.kind === 'tune.change' && r.fields.id === id);
function lastSnapshot(tab: Panel) {
  const end = tab.records.findLast((r) => r.kind === 'tune.end');
  assert.ok(end, 'a complete recorded snapshot');
  const begin = tab.records.findLast((r) => r.kind === 'tune.begin' && r.fields.snapshot === end.fields.snapshot);
  const values = tab.records.filter((r) => r.kind === 'tune.value' && r.fields.snapshot === end.fields.snapshot);
  assert.equal(values.length, end.fields.count, 'record contains every declared snapshot row');
  assert.equal(begin?.fields.count, end.fields.count);
  return { revision: begin?.fields.revision, value: values.find((r) => r.fields.id === id)?.fields.value };
}

test('panel set records once per peer; late join records the tuned snapshot; unchanged packets stay quiet', async (t) => {
  const f = await fixture(t);
  const a = f.join('alice');
  const b = f.join('bob');
  f.run(3);
  const alice = await loadTunePanel(t, a);
  const bob = await loadTunePanel(t, b);
  alice.records.length = 0;
  bob.records.length = 0;

  const queued = await alice.panel.tool.run('set', { id, value: 44, expectedRevision: 0 });
  assert.equal(queued.ok, true);
  const request = queued.data as { requestId: string; status: string };
  assert.equal(request.status, 'pending');
  assert.equal(a.mirror.tune.get('railRegrowMinutes'), 31, 'panel does not simulate or claim its requested value');
  f.run();
  await f.settled();
  const status = await alice.panel.tool.run('status', { requestId: request.requestId });
  assert.equal(status.ok, true);
  assert.equal((status.data as { status: string }).status, 'applied');
  assert.equal(a.accepted.length, 1, 'the request still settles from its durable receipt');
  assert.equal(b.accepted.length, 0, 'the other peer has no local command receipt');
  for (const [tab, client] of [
    [alice, a],
    [bob, b],
  ] as const) {
    assert.equal(client.mirror.tune.get('railRegrowMinutes'), 44);
    assert.equal(tab.panel.tuneSnapshot().values.find((row) => row.id === id)?.value, 44);
    assert.equal(changes(tab).length, 1, 'one recorded value change, even on the submitting peer');
    assert.equal(changes(tab)[0]!.fields.value, 44);
    assert.equal(changes(tab)[0]!.fields.revision, 1);
    assert.equal(tab.records.filter((r) => r.kind === 'tune.begin').length, 1, 'one updated snapshot');
    assert.deepEqual(lastSnapshot(tab), { revision: 1, value: 44 });
  }

  const lengths = [alice.records.length, bob.records.length];
  a.hear(a.packets.at(-1)!);
  a.hear(a.packets.at(-1)!);
  b.hear(b.packets.at(-1)!);
  b.hear(b.packets.at(-1)!);
  f.run(120); // unchanged replication/hash packets do not re-emit the same effective configuration
  assert.deepEqual([alice.records.length, bob.records.length], lengths);

  const late = f.join('late');
  const latePanel = await loadTunePanel(t, late);
  latePanel.records.length = 0;
  f.run(3);
  assert.equal(late.mirror.tune.get('railRegrowMinutes'), 44);
  assert.deepEqual(lastSnapshot(latePanel), { revision: 1, value: 44 });
  assert.equal(latePanel.records.filter((r) => r.kind === 'tune.begin').length, 1, 'one late-join snapshot');

  // An accepted equal value still advances the authoritative revision. Record that new snapshot, not a fake change.
  alice.records.length = 0;
  bob.records.length = 0;
  const equal = await alice.panel.tool.run('set', { id, value: 44, expectedRevision: 1 });
  assert.equal(equal.ok, true);
  f.run();
  await f.settled();
  for (const tab of [alice, bob]) {
    assert.equal(changes(tab).length, 0);
    assert.equal(tab.records.filter((r) => r.kind === 'tune.begin').length, 1);
    assert.deepEqual(lastSnapshot(tab), { revision: 2, value: 44 });
  }

  b.disconnect();
  bob.records.length = 0;
  await alice.panel.tool.run('set', { id, value: 45, expectedRevision: 2 });
  f.run();
  await f.settled();
  assert.equal(bob.records.length, 0, 'disconnected peer has not observed the change');
  b.reconnect();
  f.run(3);
  assert.equal(changes(bob).length, 1, 'refill records the missed change once');
  assert.equal(bob.records.filter((r) => r.kind === 'tune.begin').length, 1, 'one changed refill snapshot');
  assert.deepEqual(lastSnapshot(bob), { revision: 3, value: 45 });
});
