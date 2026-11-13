// Maximum capped Server-kind checkpoint width; conservation is covered by railway-line-authority.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSync, MAX_RECOVERY_BYTES } from '../src/world/sync.ts';
import { installRailRules } from './helpers/rail-rules.ts';
import { install as installRailway } from '../src/world/railway-server.ts';
import { createReplicator } from '../src/world/replicate-server.ts';
import { homeLand } from './helpers/land.ts';
import { ensure } from '../src/sim/roster.ts';
import { TUNABLES } from '../src/sim/tune.ts';
import { railSession } from '../src/sim/railway-sys-core.ts';
import { Account, Outcome, Pile, RAIL_COMPONENTS } from '../src/sim/railway-components.ts';
test('line checkpoint width bound retains maximum railway state, tuning and roster', (t) => {
  // Deliberately combines mutually exclusive balances: a conservative byte bound, not a reachable state. The railway
  // saves its world's schema snapshot, so every row of every component is set to its widest value.
  const replication = createReplicator();
  const sync = createSync(),
    base = installRailRules(sync, homeLand(), replication),
    api = installRailway(sync, base, replication),
    w = api.world(),
    M = 2147483647;
  for (let k = 0; k < 256; k++) {
    const pid = `p${k}`.padEnd(32, 'x');
    const i = ensure(base.roster.roster, pid);
    base.roster.roster.names[i] = '木'.repeat(16);
    base.roster.roster.colors[i] = 7;
    railSession(w, pid, 1);
  }
  for (let k = 0; k < 64; k++) w.spawn([Outcome, { pid: w.get(Account, w.ids(Account)[k]!)!.pid }]);
  for (let k = 0; k < 128; k++) {
    w.reserve(M - 129 + k);
    w.spawn([Pile, {}]);
  }
  const widest = (type: string, field: string) =>
    type === 'f64' || type === 'f32'
      ? -6.123456789012345
      : type === 'bool'
        ? true
        : type === 'str'
          ? field === 'state'
            ? 'available'
            : 's'.repeat(32)
          : type === 'u8'
            ? 255
            : -M;
  for (const c of RAIL_COMPONENTS)
    for (const id of w.ids(c)) {
      const row = w.mut(c, id) as Record<string, unknown>;
      for (const f of c.names) if (f !== c.key) row[f] = widest(c.fields[f]!, f);
    }
  for (const t of TUNABLES) base.railTune.tune.v[t.key] = t.max;
  base.railTune.tune.revision = M;
  const snapshot = sync.snapshot();
  snapshot.tick = M;
  snapshot.epochMs = 1793850000000;
  const e = {
    version: 1,
    namespace: 'rail-v40-' + 'x'.repeat(22),
    catalog: '2',
    checkpoint: snapshot,
    hash: 4294967295,
    checksum: 4294967295,
  };
  const bytes = Buffer.byteLength(JSON.stringify(e));
  t.diagnostic(`${bytes}/${MAX_RECOVERY_BYTES} bytes`);
  assert.ok(bytes < MAX_RECOVERY_BYTES);
});
