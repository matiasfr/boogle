// Maximum capped checkpoint plus durable-tail width; conservation is covered by railway-line-authority.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSync, MAX_RECOVERY_BYTES } from '../src/world/sync.ts';
import { installPlayableRailwayRules } from '../src/world/rules/railway-index.ts';
import { homeLand } from './helpers/land.ts';
import { ensure } from '../src/sim/roster.ts';
import { TUNABLES } from '../src/sim/tune.ts';
import { railSession } from '../src/sim/railway.ts';
import { railwayRequestEdit } from '../server/src/host/railway-requests.ts';
test('line recovery width bound retains sixty-four worst material stamps and maximum roster', (t) => {
  // Deliberately combines mutually exclusive balances: a conservative byte bound, not a reachable state.
  const sync = createSync(),
    base = installPlayableRailwayRules(sync, homeLand()),
    s = base.railway.railway,
    M = 2147483647;
  for (let k = 0; k < 256; k++) {
    const pid = `p${k}`.padEnd(32, 'x');
    const i = ensure(base.roster.roster, pid);
    base.roster.roster.names[i] = '木'.repeat(16);
    base.roster.roster.colors[i] = 7;
    railSession(s, pid, 1);
    // Eight rails is the widest account code (8 * 81 = 648).
    Object.assign(s.accounts[k]!, { carry: 0, stone: 0, rails: 8, epoch: M, request: M });
  }
  s.outcomes = s.accounts.slice(-64).map((a) => ({ pid: a.pid, epoch: M, request: M, status: 'noop', accepted: 0 }));
  s.piles = Array.from({ length: 128 }, (_, i) => ({
    id: M - 128 + i,
    x: 200000,
    y: -200000,
    z: -200000,
    n: 8,
    kind: 1,
    age: 21,
  }));
  s.nextPile = M;
  s.awake = M;
  s.lastTick = M;
  s.resumeMarker = Number.MAX_SAFE_INTEGER;
  s.supply!.marker = Number.MAX_SAFE_INTEGER;
  s.supply!.produced = 2147479735;
  s.supply!.rack = M;
  s.line!.stoneProduced = 2147483616;
  s.line!.stoneRack = M;
  s.falls!.yaw.fill(6.123456789012345);
  s.line!.beam.revision = M;
  s.line!.beam.epoch = M;
  s.line!.beam.holder = s.accounts[255]!.pid;
  for (const j of s.line!.jobs) {
    j.start = M;
    j.lastTick = M;
    j.elapsed = 100000;
  }
  for (const t of TUNABLES) base.tune.tune.v[t.key] = t.max;
  base.tune.tune.revision = M;
  s.timing!.feedIntervalMs = 1000;
  s.timing!.cruiseCmPerTick = 200;
  s.timing!.departureTicks = 100;
  for (const j of s.line!.jobs) {
    j.timing.feedIntervalMs = 1000;
    j.timing.cruiseCmPerTick = 200;
    j.timing.departureTicks = 100;
    j.delivered = 40;
    j.used = 40;
    j.stoneDelivered = 8;
    j.stoneUsed = 8;
  }
  s.stock = 24;
  s.delivered = 24;
  s.used = 24;
  s.start = M;
  s.elapsed = 100000;
  s.completion = 1;
  s.line!.rockAge.fill(31);
  s.line!.beam.x = -200000;
  s.line!.beam.y = -200000;
  s.line!.beam.z = -200000;
  s.line!.beam.age = 0;
  s.line!.beam.work = 12;
  // Line two at its load bounds: widest clocks, rack and depot, and the widest pinned stretch timing.
  const l2 = s.line2!;
  Object.assign(l2.forge, { used: 56, lit: M, rack: 4096, poured: M, lastPour: M });
  for (const j of l2.jobs) {
    Object.assign(j, { stock: 0, railStock: 0, start: M, elapsed: 1000000, lastTick: M });
    j.timing = {
      depositMs: 60000,
      feedIntervalMs: 60000,
      logFlightMs: 60000,
      stoneFlightMs: 60000,
      beamFlightMs: 60000,
      cruiseCmPerTick: 10000,
      departureTicks: 60000,
    };
  }
  Object.assign(l2, { depot: 64, depotLast: M, depotOut: [16, 24, 16], depotProduced: 56, lever: true, hook: true });
  const snapshot = sync.snapshot();
  snapshot.tick = M;
  snapshot.epochMs = 1793850000000;
  const common = { p: 's'.repeat(32), u: s.accounts[255]!.pid };
  // The widest request a client may send, actor facts included; the tail holds what the real cleaner stamps.
  const facts = { at: [-200000, -200000, -200000], ms: 2147483647, junk: 'x'.repeat(900) };
  for (const body of [
    { op: 'rail.chop', id: 399, yaw: -0.0000010000000000000002, collapsed: false },
    { op: 'rail.beamDrop', revision: M, x: -200000, y: -200000, z: -200000 },
  ]) {
    const tail: { tick: number; seq: number; e: Record<string, unknown> }[] = Array.from({ length: 64 }, (_, i) => ({
      tick: M,
      seq: M - 64 + i,
      e: { ...railwayRequestEdit({ ...body, ...facts }, M, M, { falls: true, line: true }), ...common },
    }));
    assert.ok(!('at' in tail[1]!.e) && !('ms' in tail[1]!.e), 'actor facts never enter the tail');
    tail[0]!.e = {
      op: 'rail.supply',
      i: 0,
      j: 0,
      p: common.p,
      u: common.u,
      marker: Number.MAX_SAFE_INTEGER,
      grow: 'f'.repeat(97),
      recover: [M],
      beam: M,
    };
    const e = {
      version: 1,
      namespace: 'rail-v09-' + 'x'.repeat(22),
      catalog: '2',
      checkpoint: snapshot,
      hash: 4294967295,
      tail,
      seq: M,
      checksum: 4294967295,
    };
    const bytes = Buffer.byteLength(JSON.stringify(e));
    t.diagnostic(`${body.op}: ${bytes}/${MAX_RECOVERY_BYTES} bytes`);
    assert.ok(bytes < MAX_RECOVERY_BYTES);
  }
});
