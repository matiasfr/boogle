// Real accepted requests and maintenance stamps, with an injected host clock rather than a long wall wait.
import assert from 'node:assert/strict';
import { createStore } from '../../src/store.ts';
import { createRailwayWorldHost, type RailwayPosition } from '../../src/host/world-host.ts';
import { RAILWAY_SOURCES, RAILWAY_T1 as T1 } from '../../../src/sim/railway-layout.ts';
import { railCounts } from '../../../src/sim/railway-queries-line2.ts';
import { invariant, trees } from '../../../test/helpers/rail.ts';

export const SUPPLY_SOURCE = 5;
export async function supplyFixture(
  dataDir: string,
  roomId: string,
  recover = true,
  tuneController: (sid: string) => boolean = (sid) => sid === 'supplysession',
) {
  const store = createStore({ dataDir, maxRooms: 4 });
  await store.init();
  // Minute-aligned and fixed: a wall-clock remainder near a minute boundary can advance a stage on restart.
  let clock = 1793906400000;
  let position = { x: T1.x / 100, z: T1.z / 100, at: clock };
  let observers: (RailwayPosition | null)[] = [];
  const published: Record<string, unknown>[] = [];
  const create = () => {
    const host = createRailwayWorldHost({
      roomId,
      store,
      tick: false,
      saveMs: 1000000000,
      now: () => clock,
      pidOf: (sid) => (sid === 'supplysession' ? 'supplier' : null),
      tuneController,
      positions: () => observers,
    });
    host.onSend((message) => {
      if (message.t === 'w:edits' && Array.isArray(message.list))
        for (const item of message.list as { e: Record<string, unknown> }[]) published.push(item.e);
    });
    host.replication.addClient('supplysession');
    return host;
  };
  let host = create();
  await host.whenReady();
  async function ticks(n: number) {
    for (let k = 0; k < n; k++) {
      await host.sync.whenDurable();
      clock += 100;
      host.step(0.1);
    }
    await host.sync.whenDurable();
    assert.equal(invariant(host.rules.railway.world()), null);
  }
  let request = 0;
  async function action(fields: Record<string, unknown>) {
    position.at = clock;
    // A client action carries where its actor stands (cm) and its action clock (ms).
    const at = [Math.round(position.x * 100), 0, Math.round(position.z * 100)];
    const ms = clock - 1793906400000;
    host.deliver({ t: 'r:edit', e: { ...fields, epoch: 1, request: ++request, at, ms } }, 'supplysession');
    await ticks(3); // the cadence is judged on the action clock: swings 300 ms apart
    const result = host.rules.railway.outcome('supplier', 1, request);
    assert.equal(result?.status, 'accepted', `${fields.op}: ${JSON.stringify(result)}`);
  }
  host.deliver({ t: 'r:open' }, 'supplysession');
  await host.sync.whenDurable();
  await ticks(3);
  await action({ op: 'rail.wake' });
  await ticks(T1.wakeTicks);
  const source = RAILWAY_SOURCES[SUPPLY_SOURCE]!;
  position = { x: source[1] / 100, z: source[2] / 100, at: clock };
  for (let k = 0; k < 5; k++) {
    await action({ op: 'rail.chop', id: source[0], yaw: 0.5, collapsed: false });
    await action({ op: 'rail.drop', x: source[1], z: source[2], y: 3000, n: 2 });
  }
  assert.equal(trees(host.rules.railway.world())[SUPPLY_SOURCE]!.left, 0);
  assert.equal(railCounts(host.rules.railway.world()).loose, 10);
  const advance = (minutes: number) => {
    clock += minutes * 60000;
  };
  if (recover) {
    advance(21);
    await ticks(12);
    assert.equal(railCounts(host.rules.railway.world()).rack, 10);
    assert.equal(railCounts(host.rules.railway.world()).loose, 0);
  }
  const stage = () => trees(host.rules.railway.world())[SUPPLY_SOURCE]!.age;
  const toStage = async (target: number) => {
    for (let n = 0; n < 20 && stage() < target; n++) {
      advance(1);
      await ticks(4);
    }
    assert.equal(stage(), target);
  };
  return {
    get host() {
      return host;
    },
    store,
    ticks,
    advance,
    stage,
    toStage,
    published,
    now: () => clock,
    observe(people: (RailwayPosition | null)[]) {
      observers = people;
    },
    /** An orderly restart (a deploy): the room saves on close. A crash is crash(). */
    async restart() {
      await host.close({ save: true });
      host = create();
      await host.whenReady();
    },
    /** A crash: no save on the way down; the room comes back at its last checkpoint. */
    async crash() {
      await host.close({ save: false });
      host = create();
      await host.whenReady();
    },
  };
}
