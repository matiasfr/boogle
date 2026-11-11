// The trains and halts views (M10 a to c) read rows and queries through the read facade (`adapter.read`), and no view
// calls the adapter's inspection. What stays of that migration's proofs, after `inspect()` stopped being the oracle: a late
// joiner reads the server's rows, and the source check. The views need three.js and the DOM, so no test restates what
// a view reads; a plain read lives in the view, and a read with arithmetic in a query under src/sim.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { buildSeedWorld } from './helpers/rail.ts';
import { railRoom, replicatedRows } from './helpers/rail-room.ts';
import { account, trains } from '../src/sim/railway-rows.ts';
import { line2Completed } from '../src/sim/railway-queries-line2.ts';

test("a late joiner's rows are the server's, every frame from the whole state on, and its own account arrives after it", () => {
  const r = railRoom(buildSeedWorld('q6-done'), { served: true });
  r.join('a', 'a', 4);
  r.ready();
  r.run(10);
  const late = r.join('c', 'c', 6);
  // Before any state: the reads the views make find nothing and do not throw.
  assert.doesNotThrow(() => [trains(late.adapter.read.world()), account(late.adapter.read.world(), 'c')]);
  assert.equal(late.adapter.read.pid, 'c');
  let compared = 0,
    noAccount = 0;
  for (let k = 0; k < 80; k++)
    r.run(1, {
      each: (c) => {
        if (c !== late || !c.mirror.synced()) return;
        const w = c.adapter.read.world();
        if (!account(w, 'c')) noAccount++;
        // Nothing pending, so the world the views read is the confirmed one: the server's rows at the step it is current to.
        assert.equal(
          replicatedRows(w),
          r.served(c.mirror.step()),
          `frame ${k}: the server's rows at step ${c.mirror.step()}`,
        );
        compared++;
      },
    });
  assert.ok(compared > 20, 'the late joiner was compared from its whole state on');
  assert.ok(noAccount > 0, 'a synced world with no account for this pid was read (its session had not arrived)');
  const w = late.adapter.read.world();
  assert.ok(account(w, 'c'), 'the account came');
  assert.ok(line2Completed(w) >= 6, 'the room-wide line 2 is laid for the late joiner');
  assert.ok(trains(w).length > 0, 'the trains are in its world');
});

test("no view reads the adapter's inspect() or names its inspection type", () => {
  const dir = new URL('../src/entities/railway/', import.meta.url);
  // view.ts spreads the adapter's inspection into the view's own until M12e deletes it; state.ts holds the type.
  const allowed = { call: new Set(['view.ts']), type: new Set(['state.ts']) };
  const calls: string[] = [],
    types: string[] = [];
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
    const text = readFileSync(new URL(f, dir), 'utf8');
    if (/adapter\.inspect\(/.test(text)) calls.push(f);
    if (/RailwayInspection|\['inspect'\]/.test(text)) types.push(f);
  }
  assert.deepEqual(
    calls.filter((f) => !allowed.call.has(f)),
    [],
    'views reading the adapter inspection',
  );
  assert.deepEqual(
    types.filter((f) => !allowed.type.has(f)),
    [],
    'views naming the inspection type',
  );
});
