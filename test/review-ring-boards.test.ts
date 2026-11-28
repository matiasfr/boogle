import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three/webgpu';
import { sourceFunction } from '../dev/level/source.ts';
import { pickInteract } from '../src/sim/interact-pick.ts';
import { PLOT_KIND, TRADE } from '../src/sim/railway-trade-layout.ts';
import { RING_HANGOUT, ringAt } from '../src/sim/railway-ring-layout.ts';
import type { Interactable } from '../src/player/hands.ts';
import { advanceHold } from '../src/components/hold/view.ts';
import { FAR, ORIGIN } from '../src/place/layout.ts';
import { RING_CONES } from '../src/proto/greybox/ring-cones.ts';
import { createIslandGround } from '../src/entities/ring-island/ground.ts';

function boardView(money: number) {
  const ground = createIslandGround(RING_CONES, { x: FAR.x + ORIGIN.x, z: FAR.z + ORIGIN.z });
  const floor = RING_HANGOUT.floor / 100;
  function hangoutPoint(u: number, lat: number, y: number) {
    const p = ringAt(RING_HANGOUT.u + 100 * u, RING_HANGOUT.lat + 100 * lat);
    return new THREE.Vector3(p.x / 100, floor + y, p.z / 100);
  }
  const position = hangoutPoint(-0.12, 4, 0);
  position.y = ground.islandH(position.x, position.z) + 0.45;
  const bell = hangoutPoint(1.2, 4, 0);
  const ahead = bell.clone().sub(position).setY(0).normalize();
  const targets: Interactable[] = [];
  const pick = () => pickInteract(targets, position.x, position.z, ahead.x, ahead.z);
  let preview = 0,
    bought = 0;
  const plot = { at: -1, kind: 0 };
  const world = {
    lookup: () => 16,
    single: () => 0,
    get: (_: unknown, id: number) => (id === 16 ? plot : { boogles: money }),
  };
  const create = sourceFunction<(owner: unknown, terrain: unknown) => { update(ctx: { dt: number }): void }>(
    'src/entities/ring-island/town-plots.ts',
    'createRingPlot',
    {
      THREE,
      PLOT_KIND,
      TRADE,
      floor,
      yaw: 0,
      hangoutPoint,
      targets,
      me: { body: { position } },
      Till: {},
      Plot: {},
      advanceHold,
      plotsStaked: () => [0],
      plotPrice: () => 150,
      railwayWorldRead: () => ({ ready: () => true, world: () => world, tick: () => 100, trade: () => ({}) }),
      railwayCommands: () => ({
        buy: (_: number, kind: number) => {
          bought = kind;
        },
      }),
      interactTarget: pick,
      fixedTelescope: () => ({ stepBack() {} }),
      paintBoard() {},
      createHangoutBuilding: (_owner: unknown, _ground: unknown, tower: boolean) => ({
        construction: () => false,
        preview(on: boolean) {
          if (on) preview = tower ? PLOT_KIND.lookout : PLOT_KIND.bell;
        },
      }),
      instantiate: (_key: string, _placement: unknown, opts: { handlers: Record<string, () => Interactable[]> }) => ({
        setEnabled() {},
        relabel() {},
        targets: () => opts.handlers['town.plot-buy']!(),
      }),
    },
  );
  const view = create({ add() {}, cleanup() {} }, ground);
  view.update({ dt: 0 });
  return { position, targets, pick, view, preview: () => preview, bought: () => bought };
}

test('the building preview matches the permanent purchase when facing the other board', () => {
  const v = boardView(150);
  assert.equal(v.targets.length, 2);
  const preview = v.preview();
  v.pick()!.run!();
  for (let frame = 0; frame < 61; frame++) v.view.update({ dt: 1 / 60 });
  assert.equal(v.bought(), PLOT_KIND.bell);
  assert.equal(preview, v.bought());
});

test('an unaffordable Ring board yields Interact to a nearby runnable target', () => {
  const v = boardView(0);
  const talk = { at: v.position.clone().add(new THREE.Vector3(1.6, 0, 0)), id: 'talk', verb: 'Talk', run() {} };
  assert.ok(v.targets.every((t) => t.blocked));
  v.targets.push(talk);
  assert.equal(v.pick()?.id, talk.id);
});
