// The room's peer table (src/net/peer-table.ts): my own presence updates show in list() but aren't announced (they
// come 20 times a second and would re-render the roster for nothing); remote joins, updates and leaves are.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPeerTable } from '../src/net/peer-table.ts';
import type { PeersChange } from '../src/net/peer-table.ts';

const settle = () => new Promise((r) => setTimeout(r, 20));

test('my presence updates show in list() without firing onChange', async () => {
  const t = createPeerTable('me');
  const seen: PeersChange[] = [];
  t.onChange((c) => seen.push(c));
  for (let i = 0; i < 20; i++) t.setSelf({ n: 'Ana', t: i });
  await settle();
  assert.equal(seen.length, 0);
  assert.equal(t.list()[0].presence.t, 19);
  assert.equal(t.list()[0].sameTab, true);
  t.clear();
});

test('remote joins, updates and leaves are announced, with my latest presence in peers', async () => {
  const t = createPeerTable('me');
  const seen: PeersChange[] = [];
  t.onChange((c) => seen.push(c));
  t.setSelf({ n: 'Ana' });
  t.upsert('bo', { n: 'Bo' }, 1);
  await settle();
  assert.equal(seen.length, 1);
  assert.deepEqual(
    seen[0].joined.map((e) => e.peer),
    ['bo'],
  );
  assert.equal(seen[0].peers[0].presence.n, 'Ana');

  t.upsert('bo', { n: 'Bob' }, 2);
  t.setSelf({ n: 'Anna' });
  await settle();
  assert.equal(seen.length, 2);
  assert.deepEqual(
    seen[1].updated.map((e) => [e.peer, e.presence.n]),
    [['bo', 'Bob']],
  );
  assert.equal(seen[1].peers[0].presence.n, 'Anna');

  assert.equal(t.drop('bo', 3), true);
  await settle();
  assert.deepEqual(
    seen[2].left.map((e) => e.peer),
    ['bo'],
  );
  assert.equal(t.upsert('bo', { n: 'late' }, 2), false, 'a stale packet after leaving is ignored');
  t.clear();
});
