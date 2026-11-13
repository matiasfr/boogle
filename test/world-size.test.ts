// The snapshot budget (brief 10 M9): with every state filled to its caps, a saved world stays within
// MAX_RECOVERY_BYTES (128 KB since 6 November), so snapshots stay quick to serve.
import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_RECOVERY_BYTES } from '../src/world/sync.ts';
import { serverWorld } from './helpers/server-world.ts';
import { setWho, MAX_PLAYERS } from '../src/sim/roster.ts';

const BUDGET = MAX_RECOVERY_BYTES;

test('a world filled to every cap serializes within the recovery budget', () => {
  const host = serverWorld();
  const s = host.sync;
  s.updateWorld(0.1);
  const r = host.roster.roster;
  for (let k = 0; k < MAX_PLAYERS; k++)
    setWho(r, `p${String(k).padStart(9, '0')}`, `Player name ${k}`.padEnd(16, 'x'), k % 8);
  s.world.tick = 99_999_999;
  const json = JSON.stringify(s.snapshot());
  const sizes = Object.fromEntries(Object.entries(s.snapshot().data).map(([k, v]) => [k, JSON.stringify(v).length]));
  assert.ok(json.length < BUDGET, `${json.length} chars: ${JSON.stringify(sizes)}`);
  assert.equal(r.pids.length, MAX_PLAYERS);
  console.log(`[world-size] ${json.length} chars at the caps: ${JSON.stringify(sizes)}`);
});
